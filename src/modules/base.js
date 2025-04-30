import { generateText } from 'ai';
import { log } from '../utils/logger.js';

export class BaseAIProvider {
    constructor(providerName, modelName, options = {}) {
        this.providerName = providerName;
        this.modelName = modelName;
        this.options = options;
    }

    validateConfig() {
        if (!process.env[`${this.providerName.toUpperCase()}_API_KEY`]) {
            throw new Error(`${this.providerName.toUpperCase()} API key is not configured`);
        }
    }

    getModel() {
        throw new Error('getModel must be implemented by provider');
    }

    /**
     * Stream chat completions using the provider's model and the Vercel AI SDK.
     * @param {Array} messages - Array of message objects [{role, content}, ...]
     * @param {Object} options - Additional options (system, temperature, maxTokens, etc)
     */
    async *streamChat(messages, options = {}) {
        this.validateConfig();
        const model = this.getModel();

        try {
            // Ensure system message is at the start
            const systemMessage = messages.find(m => m.role === 'system');
            const otherMessages = messages.filter(m => m.role !== 'system');
            const orderedMessages = systemMessage
                ? [systemMessage, ...otherMessages]
                : messages;

            const { text, data } = await generateText({
                model,
                messages: orderedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    name: msg.name
                })),
                ...options
            });

            // If we have streaming data, use it
            if (data) {
                for await (const chunk of data) {
                    if (chunk.text) {
                        yield chunk.text;
                    }
                }
            } else {
                // Otherwise yield the complete text
                yield text;
            }
        } catch (error) {
            log(`Error in ${this.providerName} stream: ${error.message}`, 'error');
            log(`Error details: ${JSON.stringify(error, null, 2)}`, 'error');
            if (error.response) {
                log(`Provider response: ${JSON.stringify(error.response, null, 2)}`, 'error');
            }
            throw new Error(`AI Provider Error (${this.providerName}): ${error.message}`);
        }
    }
}