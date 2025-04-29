import { groq, createGroq } from '@ai-sdk/groq';
import { BaseAIProvider } from '../base.js';

// GroqProvider for Vercel AI SDK Providers
// https://sdk.vercel.ai/providers/ai-sdk-providers

export class GroqProvider extends BaseAIProvider {
    constructor(modelName, options = {}) {
        super('groq', modelName, options);

        // Initialize custom Groq instance if needed
        const groqOptions = {
            apiKey: process.env.GROQ_API_KEY,
            compatibility: 'strict',
            ...options
        };

        this.groqInstance = options.baseURL || options.headers || options.fetch
            ? createGroq(groqOptions)
            : groq;
    }

    getModel() {
        // Return a model instance with streaming enabled
        return this.groqInstance(this.modelName, {
            stream: true,
            format: 'text'
        });
    }
}

export default GroqProvider;
