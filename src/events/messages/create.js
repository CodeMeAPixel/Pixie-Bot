import { Events } from "discord.js";
import { log } from "../../utils/logger.js";
import { UserModel } from "../../models/user.js";
import { handleGuildMessage } from '../../functions/chat/guild.js';
import { handleDM } from '../../functions/chat/dm.js';

export default {
    event: Events.MessageCreate,

    run: async (client, message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        let typingInterval;

        try {
            // Debug logging
            log(`Message received in channel: ${message.channel.id}`, 'debug');
            log(`Message guild: ${message.guild?.id || 'none'}`, 'debug');
            log(`Message type: ${message.channel.type}`, 'debug');

            // Get or create user
            const userModel = new UserModel();
            const user = await userModel.createOrUpdate(message.author.id, {
                username: message.author.username,
                discriminator: message.author.discriminator,
                avatar: message.author.avatarURL()
            });

            // Check if user is banned
            if (user.isBanned) {
                const banText = user.banExpiresAt
                    ? `You are banned until ${user.banExpiresAt.toLocaleString()}\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`
                    : `You are permanently banned.\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`;

                return message.reply({
                    embeds: [{
                        title: 'Access Denied',
                        description: banText,
                        color: 0xFF0000,
                        thumbnail: { url: client.logo }
                    }]
                });
            }

            // Handle DM messages
            if (message.channel.type === 1) {
                log('Handling DM message', 'debug');
                return handleDM(message, user);
            }

            // Handle guild messages
            log('Handling guild message', 'debug');
            return handleGuildMessage(message, user);

        } catch (error) {
            log(`Error in message handler: ${error}`, 'error');
            log(`Stack trace: ${error.stack}`, 'error');
            clearInterval(typingInterval);
            await message.reply({
                content: 'An unexpected error occurred. Please try again later.',
                failIfNotExists: false
            });
        }
    }
};
