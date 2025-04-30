import { AIClient, AI_PROVIDERS } from '../../modules/index.js';
import { log } from '../../utils/logger.js';
import { BotLogModel } from '../../models/botLog.js';

export async function handleDM(message, user) {
    const botLog = new BotLogModel();
    let typingInterval;

    try {
        await botLog.createLog('info', 'DM message received', {
            userId: user.id,
            channelId: message.channel.id
        });

        // Only start typing after we know we'll process the message
        message.channel.sendTyping();
        typingInterval = setInterval(() => {
            message.channel.sendTyping().catch(() => { });
        }, 9000);

        const aiClient = new AIClient('openai', AI_PROVIDERS.openai.defaultModel, {
            weatherEnabled: true // Always enable weather in DMs
        });

        let searchMessage = null;
        let weatherMessage = null;

        // Add weather listener
        aiClient.once('weatherStart', async () => {
            weatherMessage = await message.reply({
                content: "🌤️ Checking weather conditions...",
                failIfNotExists: false
            });
        });

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
            enableWeather: true,
            searchMessage,
            weatherMessage,
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
                },
                weather: {
                    enabled: true
                }
            }
        });

        // Update response handling
        if (response?.trim()) {
            if (weatherMessage) {
                await weatherMessage.edit({
                    content: response,
                    failIfNotExists: false
                });
            } else if (searchMessage) {
                // If we used search, update that message
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
            clearInterval(typingInterval);
        }
    } catch (error) {
        await botLog.createLog('error', `Error in DM handler`, {
            userId: user.id,
            channelId: message.channel.id,
            error: error.message?.substring(0, 100)
        });
        await message.reply('An error occurred while processing your message.');
        clearInterval(typingInterval);
        return;
    }
}