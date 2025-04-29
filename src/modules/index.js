import EventEmitter from 'events';
import { WebSearch } from './tools/webSearch.js';
import OpenAIProvider from './openai/index.js';
import GroqProvider from './groq/index.js';
import { ConversationModel } from '../models/conversation.js';
import { GuildModel } from '../models/guild.js';
import { BotLogModel } from '../models/botLog.js';
import { log } from '../utils/logger.js';
import { generateSystemPrompt } from './prompts/index.js';

// Provider configurations with detailed model settings
export const AI_PROVIDERS = {
    openai: {
        provider: OpenAIProvider,
        models: {
            'gpt-4.1': {
                name: 'gpt-4.1',
                maxTokens: 8192,
                temperature: 0.7
            },
            'gpt-4.1-mini': {
                name: 'gpt-4.1-mini',
                maxTokens: 4096,
                temperature: 0.7
            },
            'gpt-4.1-nano': {
                name: 'gpt-4.1-nano',
                maxTokens: 2048,
                temperature: 0.7
            },
            'gpt-4o': {
                name: 'gpt-4o',
                maxTokens: 8192,
                temperature: 0.7
            },
            'gpt-4o-mini': {
                name: 'gpt-4o-mini',
                maxTokens: 4096,
                temperature: 0.7
            },
            'gpt-4-turbo': {
                name: 'gpt-4-turbo',
                maxTokens: 4096,
                temperature: 0.7
            },
            'gpt-4': {
                name: 'gpt-4',
                maxTokens: 8192,
                temperature: 0.7
            },
            'o1': {
                name: 'o1',
                maxTokens: 8192,
                temperature: 0.7
            },
            'o1-mini': {
                name: 'o1-mini',
                maxTokens: 4096,
                temperature: 0.7
            },
            'o1-preview': {
                name: 'o1-preview',
                maxTokens: 4096,
                temperature: 0.7
            }
        },
        defaultModel: 'gpt-4-turbo'
    },
    groq: {
        provider: GroqProvider,
        models: {
            'meta-llama/llama-4-scout-17b-16e-instruct': {
                name: 'meta-llama/llama-4-scout-17b-16e-instruct',
                maxTokens: 32768,
                temperature: 0.7
            },
            'deepseek-r1-distill-llama-70b': {
                name: 'deepseek-r1-distill-llama-70b',
                maxTokens: 32768,
                temperature: 0.7
            },
            'llama-3.3-70b-versatile': {
                name: 'llama-3.3-70b-versatile',
                maxTokens: 32768,
                temperature: 0.7
            },
            'llama-3.1-8b-instant': {
                name: 'llama-3.1-8b-instant',
                maxTokens: 32768,
                temperature: 0.7
            },
            'mistral-saba-24b': {
                name: 'mistral-saba-24b',
                maxTokens: 32768,
                temperature: 0.7
            },
            'qwen-qwq-32b': {
                name: 'qwen-qwq-32b',
                maxTokens: 32768,
                temperature: 0.7
            },
            'mixtral-8x7b-32768': {
                name: 'mixtral-8x7b-32768',
                maxTokens: 32768,
                temperature: 0.7
            },
            'gemma2-9b-it': {
                name: 'gemma2-9b-it',
                maxTokens: 32768,
                temperature: 0.7
            }
        },
        defaultModel: 'mixtral-8x7b-32768'
    }
};

/**
 * Unified AI client for seamless interaction with different providers
 */
export class AIClient extends EventEmitter {
    constructor(providerName = 'openai', modelName = null, options = {}) {
        super();
        this.providerName = providerName;
        this.modelName = modelName || AI_PROVIDERS[providerName].defaultModel;
        this.options = options;
        this.conversationModel = new ConversationModel();
        this.guildModel = new GuildModel();
        this.webSearch = new WebSearch();
        this.botLog = new BotLogModel();
        this.validateProvider();
        this.initializeProvider();
    }

    validateProvider() {
        if (!AI_PROVIDERS[this.providerName]) {
            throw new Error(`Invalid provider: ${this.providerName}`);
        }

        const model = AI_PROVIDERS[this.providerName].models[this.modelName];
        if (!model) {
            throw new Error(`Invalid model ${this.modelName} for provider ${this.providerName}`);
        }
    }

    initializeProvider() {
        const provider = AI_PROVIDERS[this.providerName];
        this.provider = new provider.provider(this.modelName, this.options);
    }

    cleanResponse(text) {
        if (!text) return '';

        // Protect special names
        const protectedPatterns = [
            { pattern: /Code\s*Me\s*APixel/gi, replacement: 'CodeMeAPixel' },
            { pattern: /Pixelated/gi, replacement: 'CodeMeAPixel' }
        ];

        // Apply protected patterns
        for (const { pattern, replacement } of protectedPatterns) {
            text = text.replace(pattern, replacement);
        }

        return text.trim();
    }

    async *streamResponse(messages, options = {}) {
        try {
            const providerOptions = {
                temperature: options.temperature || 0.7,
                maxTokens: options.maxTokens || 1000,
                system: this.getSystemPrompt(options.userContext),
                stream: true
            };

            for await (const content of this.provider.streamChat(messages, providerOptions)) {
                const cleaned = this.cleanResponse(content);
                if (cleaned) {
                    yield cleaned;
                }
            }
        } catch (error) {
            log(`Error in streamResponse: ${error.message}`, 'error');
            log(`Stack trace: ${error.stack}`, 'error');
            throw error;
        }
    }

    async handleMessage(message, user, guild, options = {}) {
        try {
            let settings = guild
                ? await this.guildModel.getSettings(guild.discordId)
                : { enableWebSearch: options.enableWebSearch };

            const history = await this.conversationModel.getRecentMessages(
                user.id,
                message.channel.id,
                settings.maxConversationLength || 10
            );

            let messages = [...history];
            const userQuery = message.content.replace(new RegExp(`<@!?${message.client.user.id}>\\s*`, 'g'), '').trim();

            // First, ask the AI if we need web search for this query
            const needsSearchResponse = await this.provider.streamChat([
                {
                    role: 'system',
                    content: 'Your task is to determine if a web search is needed to properly answer the user query. Respond with "YES" or "NO". Only respond YES if the question requires current or real-time information.'
                },
                {
                    role: 'user',
                    content: userQuery
                }
            ], { temperature: 0.1, maxTokens: 10 });

            let searchNeeded = false;
            for await (const chunk of needsSearchResponse) {
                if (chunk.toLowerCase().includes('yes')) {
                    searchNeeded = true;
                    break;
                }
            }

            // Only perform web search if both enabled AND needed
            if (settings.enableWebSearch === true && searchNeeded) {
                await this.botLog.createLog('info', 'Web search started', {
                    userId: user.id,
                    guildId: guild?.id,
                    channelId: message.channel.id,
                    query: userQuery
                });

                const searchResults = await this.webSearch.search(userQuery);

                if (searchResults && searchResults.length > 0) {
                    await this.botLog.createLog('info', 'Web search completed', {
                        userId: user.id,
                        guildId: guild?.id,
                        channelId: message.channel.id,
                        resultsCount: searchResults.length
                    });

                    this.emit('searchStart');

                    messages.push({
                        role: 'system',
                        content: `Recent web search results: ${searchResults.map(r => `\n\n${r.title}\n${r.snippet}`).join('\n')}\n\nUse this information to provide an accurate, up-to-date answer. Do not mention that you used web search unless explicitly asked.`
                    });

                    // Make sure to emit searchResults before getting AI response
                    this.emit('searchResults', searchResults);

                    messages.push({
                        role: 'user',
                        content: userQuery
                    });

                    // Get response with search results
                    const response = await this.streamResponse(messages, {
                        temperature: settings.temperature || this.options.temperature,
                        maxTokens: settings.maxTokens || this.options.maxTokens,
                        userContext: options.userContext
                    });

                    let currentContent = '';
                    for await (const chunk of response) {
                        currentContent += chunk;
                    }

                    // Update search message with final response
                    if (options.searchMessage) {
                        await options.searchMessage.edit({
                            content: currentContent,
                            failIfNotExists: false
                        });
                    }

                    // Save conversation
                    await this.conversationModel.createOrUpdateConversation(
                        user.id,
                        message.channel.id,
                        [
                            { role: 'user', content: userQuery },
                            { role: 'assistant', content: currentContent }
                        ],
                        guild?.discordId || null
                    );

                    return currentContent;
                }
            }

            messages.push({
                role: 'user',
                content: userQuery
            });

            // Get response
            const response = await this.streamResponse(messages, {
                temperature: settings.temperature || this.options.temperature,
                maxTokens: settings.maxTokens || this.options.maxTokens,
                userContext: options.userContext
            });

            let currentContent = '';
            for await (const chunk of response) {
                currentContent += chunk;
            }

            // If we have a search message, update it with the response
            if (options.searchMessage) {
                await options.searchMessage.edit({
                    content: currentContent,
                    failIfNotExists: false
                });
            }

            // Save conversation and return
            await this.conversationModel.createOrUpdateConversation(
                user.id,
                message.channel.id,
                [
                    { role: 'user', content: userQuery },
                    { role: 'assistant', content: currentContent }
                ],
                guild?.discordId || null
            );

            return currentContent;
        } catch (error) {
            await this.botLog.createLog('error', `Error in handleMessage: ${error.message}`, {
                userId: user.id,
                guildId: guild?.id,
                channelId: message.channel.id,
                stack: error.stack
            });
            throw error;
        }
    }

    async cleanupOldConversations(userId, channelId, daysOld = 7) {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - daysOld);

            const conversation = await this.conversationModel.findByUserAndChannel(userId, channelId);
            if (conversation?.createdAt < cutoff) {
                await this.clearConversation(userId, channelId);
                log(`Cleaned up old conversation for user ${userId} in channel ${channelId}`, 'debug');
            }
        } catch (error) {
            log(`Error in conversation cleanup: ${error}`, 'error');
        }
    }

    getSystemPrompt(userContext = {}) {
        return generateSystemPrompt(userContext);
    }

    async clearConversation(userId, channelId) {
        try {
            const conversation = await this.conversationModel.findByUserAndChannel(userId, channelId);
            if (conversation) {
                await this.conversationModel.clearConversation(conversation.id);
            }
        } catch (error) {
            log(`Error clearing conversation: ${error}`, 'error');
            throw error;
        }
    }
}