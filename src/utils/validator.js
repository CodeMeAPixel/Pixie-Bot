/**
 * Input validation utility
 */
export class Validator {
    static validateDiscordId(id) {
        // Convert any input to string and clean it
        const stringId = String(id).trim();

        if (!stringId) {
            throw new Error('Discord ID cannot be empty');
        }

        // Validate the format after conversion
        if (!/^\d{17,20}$/.test(stringId)) {
            throw new Error('Invalid Discord ID format');
        }

        return stringId;
    }

    static validateMessage(message) {
        if (!message || typeof message.content !== 'string') {
            throw new Error('Invalid message format');
        }

        if (message.content.length > 2000) {
            throw new Error('Message content too long');
        }

        return message;
    }

    static validateGuildSettings(settings) {
        const errors = [];

        const validModels = [
            // OpenAI models
            'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
            'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4',
            'o1', 'o1-mini', 'o1-preview',
            // Groq models
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'deepseek-r1-distill-llama-70b',
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'mistral-saba-24b',
            'qwen-qwq-32b',
            'mixtral-8x7b-32768',
            'gemma2-9b-it'
        ];

        if (settings.aiModel && !validModels.includes(settings.aiModel)) {
            errors.push(`Invalid AI model. Must be one of: ${validModels.join(', ')}`);
        }

        if (settings.maxTokens && (settings.maxTokens < 1 || settings.maxTokens > 4096)) {
            errors.push('Max tokens must be between 1 and 4096');
        }

        if (settings.temperature && (settings.temperature < 0 || settings.temperature > 2)) {
            errors.push('Temperature must be between 0 and 2');
        }

        if (settings.allowedChannels) {
            try {
                const parsed = JSON.parse(settings.allowedChannels);
                if (!Array.isArray(parsed)) {
                    errors.push('Allowed channels must be a valid JSON array string');
                }
            } catch (e) {
                errors.push('Allowed channels must be a valid JSON array string');
            }
        }

        if (settings.banExpiresAt && isNaN(new Date(settings.banExpiresAt).getTime())) {
            errors.push('Invalid ban expiration date');
        }

        return errors;
    }

    static validateId(id) {
        if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9]+$/.test(id)) {
            throw new Error('Invalid ID format');
        }
        return id;
    }

    static validateBanData(data) {
        const errors = [];

        if (data.isBanned && !data.banReason) {
            errors.push('Ban reason is required when banning');
        }

        if (data.banExpiresAt) {
            const expiryDate = new Date(data.banExpiresAt);
            if (isNaN(expiryDate.getTime())) {
                errors.push('Invalid ban expiration date');
            } else if (expiryDate < new Date()) {
                errors.push('Ban expiration date must be in the future');
            }
        }

        return errors;
    }

    static validatePermissionData(data) {
        const errors = [];

        if (!data.name || typeof data.name !== 'string') {
            errors.push('Permission name is required');
        }

        if (!data.description || typeof data.description !== 'string') {
            errors.push('Permission description is required');
        }

        return errors;
    }

    static validateChannelData(data) {
        const errors = [];

        if (!data) {
            errors.push('Channel data is required');
            return errors;
        }

        if (!data.name || typeof data.name !== 'string') {
            errors.push('Channel name is required');
        }

        if (!data.type || !['text', 'voice', 'DM'].includes(data.type)) {
            errors.push('Invalid channel type');
        }

        return errors;
    }

    static validateConversationData(data) {
        const errors = [];

        if (!Array.isArray(data.messages)) {
            errors.push('Messages must be an array');
        } else {
            data.messages.forEach((msg, index) => {
                if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
                    errors.push(`Invalid message role at index ${index}`);
                }
                if (!msg.content || typeof msg.content !== 'string') {
                    errors.push(`Invalid message content at index ${index}`);
                }
            });
        }

        return errors;
    }
}
