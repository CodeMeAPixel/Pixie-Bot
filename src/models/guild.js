import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';

export class GuildModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'guild';
    }

    static defaultSettings = {
        aiEnabled: true,
        aiModel: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.7,
        maxConversationLength: 10,
        allowedChannels: '[]',
        enableReasoning: true
    };

    // Core Guild Methods
    async findByDiscordId(discordId, relations = ['settings', 'members', 'channels']) {
        try {
            Validator.validateDiscordId(discordId);
            return await this.findWithRelations({ discordId }, relations);
        } catch (error) {
            log(`Error finding guild: ${error}`, 'error');
            throw error;
        }
    }

    async createOrUpdate(discordId, guildData) {
        try {
            const validDiscordId = String(discordId);
            const validData = {
                name: guildData?.name || 'Unknown Guild',
                icon: guildData?.iconURL || null
            };

            // First, try to find existing guild
            const existingGuild = await this.model.findUnique({
                where: { discordId: validDiscordId },
                include: { settings: true }
            });

            if (existingGuild) {
                // Update existing guild and return full guild object
                return await this.model.update({
                    where: { discordId: validDiscordId },
                    data: {
                        name: validData.name,
                        icon: validData.icon
                    },
                    include: {
                        settings: true,
                        channels: true,
                        members: true
                    }
                });
            }

            log(`Creating/updating guild with ID: ${validDiscordId}`, 'debug');
            log(`Guild data: ${JSON.stringify(validData)}`, 'debug');

            // Create new guild
            const newGuild = await this.model.create({
                data: {
                    discordId: validDiscordId,
                    name: validData.name,
                    icon: validData.icon,
                    settings: {
                        create: GuildModel.defaultSettings
                    }
                },
                include: { settings: true }
            });

            return newGuild;
        } catch (error) {
            log(`Error in createOrUpdate guild: ${error}`, 'error');
            throw error;
        }
    }

    // Settings Management
    async getSettings(discordId) {
        try {
            Validator.validateDiscordId(discordId);
            const guild = await this.model.findUnique({
                where: { discordId },
                include: { settings: true }
            });

            if (!guild?.settings) {
                return await this.updateSettings(discordId, GuildModel.defaultSettings);
            }

            return guild.settings;
        } catch (error) {
            log(`Error getting guild settings: ${error}`, 'error');
            throw error;
        }
    }

    async updateSettings(discordId, settings) {
        try {
            const errors = Validator.validateGuildSettings(settings);
            if (errors.length > 0) {
                throw new Error(`Invalid settings: ${errors.join(', ')}`);
            }

            return await this.transaction(async (tx) => {
                const guild = await tx.guild.findUnique({
                    where: { discordId }
                });

                if (!guild) throw new Error('Guild not found');

                return await tx.guildSettings.upsert({
                    where: { guildId: guild.id },
                    create: {
                        guildId: guild.id,
                        ...settings
                    },
                    update: settings
                });
            });
        } catch (error) {
            log(`Error updating guild settings: ${error}`, 'error');
            throw error;
        }
    }

    // Member Management
    async getGuildMembers(discordId) {
        return await this.db.guildMember.findMany({
            where: { guild: { discordId } },
            include: { user: true }
        });
    }

    async addGuildMember(discordId, userId, isAdmin = false) {
        return await this.db.guildMember.create({
            data: {
                guild: { connect: { discordId } },
                user: { connect: { discordId: userId } },
                isAdmin
            }
        });
    }

    async removeGuildMember(discordId, userId) {
        return await this.db.guildMember.delete({
            where: {
                userId_guildId: {
                    userId,
                    guildId: discordId
                }
            }
        });
    }

    async setMemberAdmin(discordId, userId, isAdmin) {
        return await this.db.guildMember.update({
            where: {
                userId_guildId: {
                    userId,
                    guildId: discordId
                }
            },
            data: { isAdmin }
        });
    }

    // Channel Management
    async createOrUpdateChannel(guildId, discordId, data) {
        const guild = await this.getByDiscordId(guildId);
        if (!guild) throw new Error('Guild not found');

        const channelData = {
            ...data,
            type: data.type.toString()
        };

        return this.db.channel.upsert({
            where: {
                discordId_guildId: {
                    discordId,
                    guildId: guild.id
                }
            },
            create: {
                discordId,
                guildId: guild.id,
                ...channelData
            },
            update: channelData
        });
    }

    // Ban Management
    async banGuild(guildId, reason, expiresAt = null) {
        return await this.model.update({
            where: { discordId: guildId },
            data: {
                isBanned: true,
                banReason: reason,
                banExpiresAt: expiresAt
            }
        });
    }

    async unbanGuild(guildId) {
        return await this.model.update({
            where: { discordId: guildId },
            data: {
                isBanned: false,
                banReason: null,
                banExpiresAt: null
            }
        });
    }

    // Cleanup
    async deleteGuild(discordId) {
        return this.transaction(async (tx) => {
            const guild = await tx.guild.findUnique({
                where: { discordId },
                include: { channels: true }
            });

            if (!guild) throw new Error('Guild not found');

            // Delete all conversations and messages in guild channels
            await Promise.all(guild.channels.map(async (channel) => {
                const conversations = await tx.conversation.findMany({
                    where: { channelId: channel.id }
                });

                await tx.message.deleteMany({
                    where: {
                        conversationId: {
                            in: conversations.map(c => c.id)
                        }
                    }
                });

                await tx.conversation.deleteMany({
                    where: { channelId: channel.id }
                });
            }));

            // Delete related data in order
            await tx.guildSettings.delete({
                where: { guildId: guild.id }
            });

            await tx.channel.deleteMany({
                where: { guildId: guild.id }
            });

            await tx.guildMember.deleteMany({
                where: { guildId: guild.id }
            });

            // Finally delete the guild
            return tx.guild.delete({
                where: { id: guild.id }
            });
        });
    }
}