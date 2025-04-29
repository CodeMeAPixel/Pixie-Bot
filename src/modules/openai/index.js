import { openai, createOpenAI } from '@ai-sdk/openai';
import { BaseAIProvider } from '../base.js';

// OpenAIProvider for Vercel AI SDK Providers
// https://sdk.vercel.ai/providers/ai-sdk-providers

export class OpenAIProvider extends BaseAIProvider {
    constructor(modelName, options = {}) {
        super('openai', modelName, options);

        // Initialize custom OpenAI instance if needed
        const openaiOptions = {
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORGANIZATION,
            compatibility: 'strict',
            ...options
        };

        this.openaiInstance = options.baseURL || options.headers || options.fetch
            ? createOpenAI(openaiOptions)
            : openai;
    }

    getModel() {
        // Return a model instance with streaming enabled
        return this.openaiInstance.chat(this.modelName, {
            stream: true,
            format: 'text'
        });
    }
}

export default OpenAIProvider;
