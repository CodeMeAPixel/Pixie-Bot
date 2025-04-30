import { AIClient } from '../../modules/index.js';
import { GuildModel } from '../../models/guild.js';
import { PermissionManager } from '../../utils/permissions.js';
import { log } from '../../utils/logger.js';
import { BotLogModel } from '../../models/botLog.js';

export async function handleGuildMessage(message, user) {
    const botLog = new BotLogModel();
    let typingInterval;

    try {
        await botLog.createLog('info', 'Guild message received', {
            userId: user.id,
            channelId: message.channel.id
        });

        // Check if message is a ping or reply to the bot
        const botMentioned = message.mentions.users.has(message.client.user.id);
        const isReplyToBot = message.reference?.messageId &&
            (await message.channel.messages.fetch(message.reference.messageId))?.author.id === message.client.user.id;

        if (!botMentioned && !isReplyToBot) {
            log('Message not directed at bot, ignoring', 'debug');
            return;
        }

        // Check if guild is banned
        const guildModel = new GuildModel();
        const guild = await guildModel.findByDiscordId(message.guild.id);

        if (guild?.isBanned) {
            await botLog.createLog('warning', 'Banned guild attempted access', {
                guildId: message.guild.id,
                reason: guild.banReason?.substring(0, 100)
            });
            clearInterval(typingInterval);
            return message.reply({
                embeds: [{
                    title: 'Access Denied',
                    description: banText,
                    color: 0xFF0000,
                    thumbnail: { url: message.client.logo }
                }]
            });
        }

        const settings = await guildModel.getSettings(message.guild.id);
        log(`Guild AI settings: ${JSON.stringify({
            model: settings.aiModel,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            provider: settings.aiProvider
        })}`, 'debug');

        // Check if AI is enabled for this guild
        if (!settings?.aiEnabled) {
            await message.reply('AI features are currently disabled in this server. Please contact a server administrator to enable them.');
            return;
        }

        // Check if channel is allowed
        const allowedChannels = JSON.parse(settings.allowedChannels || '[]');
        if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id) && !allowedChannels.includes('*')) {
            await message.reply(`I'm not allowed to respond in this channel. Please use one of the allowed channels or contact a server administrator to add this channel to the allowed list.`);
            return;
        }

        // Check if user has permission to use AI
        try {
            await PermissionManager.requirePermission(message.author.id, message.guild.id, 'use_ai');
        } catch (error) {
            await message.reply('You do not have permission to use AI features in this server.');
            return;
        }

        // All checks passed, start typing
        message.channel.sendTyping();
        typingInterval = setInterval(() => {
            message.channel.sendTyping().catch(() => { });
        }, 9000);

        // Initialize AI client with guild settings
        const aiClient = new AIClient(
            settings.aiProvider || 'openai',
            settings.aiModel,
            {
                temperature: settings.temperature,
                maxTokens: settings.maxTokens
            }
        );

        let searchMessage = null;

        // Set up search listeners BEFORE we call handleMessage
        aiClient.once('searchStart', async () => {
            searchMessage = await message.reply({
                content: "🔍 Searching online sources for relevant information...",
                failIfNotExists: false
            });
        });

        aiClient.once('searchResults', async (results) => {
            if (searchMessage) {
                await searchMessage.edit({
                    content: "💭 Analyzing online information...",
                    failIfNotExists: false
                });
            }
        });

        const response = await aiClient.handleMessage(message, user, guild, {
            enableWebSearch: settings.enableWebSearch,
            searchMessage,
            userContext: {
                username: message.author.username,
                id: message.author.id,
                discriminator: message.author.discriminator,
                avatar: message.author.avatar,
                bot: message.author.bot,
                roles: message.member?.roles.cache.map(role => ({
                    name: role.name,
                    id: role.id,
                    color: role.color
                })) || [],
                channel: {
                    name: message.channel.name,
                    id: message.channel.id,
                    type: message.channel.type,
                    topic: message.channel.topic,
                    nsfw: message.channel.nsfw
                },
                guild: {
                    name: message.guild.name,
                    id: message.guild.id,
                    memberCount: message.guild.memberCount,
                    channels: message.guild.channels.cache.size,
                    description: message.guild.description,
                    features: message.guild.features
                }
            }
        });

        // If we got a response, either update search message or send new one
        if (response?.trim()) {
            if (searchMessage) {  // If we used search, update that message
                await searchMessage.edit({
                    content: response,
                    failIfNotExists: false
                });
            } else {  // Otherwise send as new message
                await message.reply({
                    content: response,
                    failIfNotExists: false
                });
            }
            clearInterval(typingInterval); // Clear typing after sending response
        }
    } catch (error) {
        await botLog.createLog('error', `Error in guild message handler`, {
            userId: user.id,
            channelId: message.channel.id,
            error: error.message?.substring(0, 100)
        });
        clearInterval(typingInterval);
        throw error;
    }
}