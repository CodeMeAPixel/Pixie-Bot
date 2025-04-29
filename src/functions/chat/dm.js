import { AIClient, AI_PROVIDERS } from '../../modules/index.js';
import { log } from '../../utils/logger.js';
import { BotLogModel } from '../../models/botLog.js';

export async function handleDM(message, user) {
    const botLog = new BotLogModel();
    // Start typing immediately
    message.channel.sendTyping();
    const typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => { });
    }, 9000); // Discord typing lasts 10s, so refresh every 9s

    try {
        await botLog.createLog('info', 'DM message received', {
            userId: user.id,
            channelId: message.channel.id
        });

        const aiClient = new AIClient('openai', AI_PROVIDERS.openai.defaultModel);
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

        const response = await aiClient.handleMessage(message, user, null, {
            enableWebSearch: true,
            searchMessage,
            userContext: {
                username: message.author.username,
                id: message.author.id,
                discriminator: message.author.discriminator,
                avatar: message.author.avatar,
                bot: message.author.bot,
                roles: [],
                channel: {
                    name: 'DM',
                    id: message.channel.id,
                    type: 'DM',
                    topic: null,
                    nsfw: false
                },
                message: {
                    id: message.id,
                    createdTimestamp: message.createdTimestamp,
                    type: message.type,
                    pinned: message.pinned
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
        }
    } catch (error) {
        await botLog.createLog('error', `Error in DM handler: ${error.message}`, {
            userId: user.id,
            channelId: message.channel.id,
            stack: error.stack
        });
        await message.reply('An error occurred while processing your message.');
        return;
    } finally {
        clearInterval(typingInterval);
    }
}