import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';
import { ChannelModel } from './channel.js';

export class ConversationModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'conversation';
    }

    /**
     * Get conversation with messages
     */
    async findByUserAndChannel(userId, channelId) {
        try {
            return await this.model.findUnique({
                where: {
                    userId_channelId: { userId, channelId } // Use compound unique constraint
                },
                include: {
                    messages: true
                }
            });
        } catch (error) {
            log(`Error finding conversation with userId: ${userId} and channelId: ${channelId}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Add message to conversation
     */
    async addMessage(conversationId, role, content) {
        return this.db.message.create({
            data: { conversationId, role, content }
        });
    }

    /**
     * Get recent messages
     */
    async getRecentMessages(userId, channelId, limit = 10) {
        try {
            const conversation = await this.findByUserAndChannel(userId, channelId);
            const allMessages = conversation?.messages || [];

            // Sort messages by timestamp to ensure correct order
            const sortedMessages = allMessages.sort((a, b) => a.createdAt - b.createdAt);

            // Get more historical context
            const contextSize = Math.min(limit * 2, sortedMessages.length);
            const contextMessages = sortedMessages.slice(-contextSize);

            // Group messages by topic/context if possible
            const messageGroups = [];
            let currentGroup = [];

            for (const msg of contextMessages) {
                if (this._isNewContext(currentGroup[currentGroup.length - 1], msg)) {
                    if (currentGroup.length > 0) {
                        messageGroups.push(currentGroup);
                    }
                    currentGroup = [msg];
                } else {
                    currentGroup.push(msg);
                }
            }
            if (currentGroup.length > 0) {
                messageGroups.push(currentGroup);
            }

            // Create summary of older context
            const recentMessages = messageGroups.slice(-3).flat();
            if (messageGroups.length > 3) {
                const olderContext = messageGroups.slice(0, -3).flat();
                const summary = {
                    role: 'system',
                    content: `Previous conversation context: ${this._summarizeMessages(olderContext)}`
                };
                return [summary, ...recentMessages];
            }

            return recentMessages;
        } catch (error) {
            log(`Error getting recent messages: ${error}`, 'error');
            return [];
        }
    }

    _isNewContext(prevMsg, currMsg) {
        if (!prevMsg) return true;

        // Check time gap (30 minutes)
        const timeGap = currMsg.createdAt - prevMsg.createdAt;
        if (timeGap > 30 * 60 * 1000) return true;

        return false;
    }

    _summarizeMessages(messages) {
        const topics = new Set();
        const keyPoints = [];

        messages.forEach(msg => {
            // Extract key topics (this is a basic implementation)
            const words = msg.content.split(' ');
            const importantWords = words.filter(w => w.length > 5).slice(0, 3);
            importantWords.forEach(w => topics.add(w));

            // Keep track of questions
            if (msg.content.includes('?')) {
                keyPoints.push(msg.content.substring(0, 100));
            }
        });

        return `Topics discussed: ${Array.from(topics).join(', ')}. ` +
            `Key questions: ${keyPoints.slice(-2).join('; ')}. ` +
            `Total messages: ${messages.length}`;
    }

    async clearConversation(conversationId) {
        try {
            await this.db.message.deleteMany({
                where: {
                    conversationId
                }
            });
        } catch (error) {
            log(`Error clearing conversation: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Create or update conversation with messages
     * @param {string} userId - User ID
     * @param {string} channelId - Channel ID
     * @param {Array} messages - Conversation messages
     * @param {string} guildDiscordId - Optional guild ID
     */
    async createOrUpdateConversation(userId, channelId, messages, guildDiscordId = null) {
        try {
            const validMessages = messages.filter(msg =>
                msg &&
                msg.role &&
                ['user', 'assistant'].includes(msg.role) &&
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.trim().length > 0
            );

            if (validMessages.length === 0) {
                log('No valid messages to store', 'debug');
                return null;
            }

            return await this.transaction(async (tx) => {
                // Find or create channel
                let channel = await tx.channel.findFirst({
                    where: {
                        discordId: channelId,
                        ...(guildDiscordId ? { guild: { discordId: guildDiscordId } } : { guildId: null })
                    }
                });

                if (!channel) {
                    // Create channel data
                    const channelData = {
                        discordId: channelId,
                        name: guildDiscordId ? `Channel-${channelId}` : `DM-${channelId}`,
                        type: guildDiscordId ? 'text' : 'DM'
                    };

                    // Only include guild connection if guildDiscordId is provided
                    if (guildDiscordId) {
                        const guild = await tx.guild.findUnique({
                            where: { discordId: guildDiscordId }
                        });

                        if (!guild) {
                            log(`Guild ${guildDiscordId} not found, creating channel without guild`, 'debug');
                            // Create channel without guild association
                            channel = await tx.channel.create({
                                data: channelData
                            });
                        } else {
                            channelData.guildId = guild.id;
                            channel = await tx.channel.create({
                                data: channelData
                            });
                        }
                    } else {
                        // Create DM channel
                        channel = await tx.channel.create({
                            data: channelData
                        });
                    }
                }

                // Now create/update the conversation with the confirmed channel
                return await tx.conversation.upsert({
                    where: {
                        userId_channelId: {
                            userId,
                            channelId: channel.id
                        }
                    },
                    create: {
                        user: { connect: { id: userId } },
                        channel: { connect: { id: channel.id } },
                        messages: {
                            create: validMessages
                        }
                    },
                    update: {
                        messages: {
                            create: validMessages
                        }
                    },
                    include: { messages: true }
                });
            });
        } catch (error) {
            log(`Error in conversation operation: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Delete conversation and all related messages
     */
    async deleteConversation(conversationId) {
        return this.transaction(async (tx) => {
            // Delete all messages first
            await tx.message.deleteMany({
                where: { conversationId }
            });

            // Then delete the conversation
            return tx.conversation.delete({
                where: { id: conversationId }
            });
        });
    }

    /**
     * Delete all conversations for a user
     */
    async deleteUserConversations(userId) {
        return this.transaction(async (tx) => {
            const conversations = await tx.conversation.findMany({
                where: { userId }
            });

            // Delete all messages first
            await tx.message.deleteMany({
                where: {
                    conversationId: {
                        in: conversations.map(c => c.id)
                    }
                }
            });

            // Then delete the conversations
            return tx.conversation.deleteMany({
                where: { userId }
            });
        });
    }

    /**
     * Delete all conversations in a channel
     */
    async deleteChannelConversations(channelId) {
        return this.transaction(async (tx) => {
            const conversations = await tx.conversation.findMany({
                where: { channelId }
            });

            // Delete all messages first
            await tx.message.deleteMany({
                where: {
                    conversationId: {
                        in: conversations.map(c => c.id)
                    }
                }
            });

            // Then delete the conversations
            return tx.conversation.deleteMany({
                where: { channelId }
            });
        });
    }

    /**
     * Message-related operations
     */
    async createMessage(conversationId, role, content) {
        return this.dbOperation(
            'create',
            'Error creating message',
            () => this.db.message.create({
                data: { conversationId, role, content }
            })
        );
    }

    async getMessagesByConversation(conversationId, limit = 10) {
        return this.dbOperation(
            'find',
            'Error fetching messages',
            () => this.db.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: limit
            })
        );
    }

    async deleteMessage(messageId) {
        return this.dbOperation(
            'delete',
            'Error deleting message',
            () => this.db.message.delete({
                where: { id: messageId }
            })
        );
    }
}