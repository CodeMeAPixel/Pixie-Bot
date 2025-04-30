import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';

export class BotLogModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'botLog';
    }

    /**
     * Truncate metadata object to fit in database
     * @private
     */
    _sanitizeMetadata(metadata) {
        if (!metadata) return null;

        // Keep only essential fields
        const sanitized = {
            userId: metadata.userId,
            channelId: metadata.channelId,
            guildId: metadata.guildId
        };

        // Add truncated error if present
        if (metadata.error) {
            sanitized.error = metadata.error.substring(0, 100);
        }

        // Add truncated reason if present
        if (metadata.reason) {
            sanitized.reason = metadata.reason.substring(0, 100);
        }

        const stringified = JSON.stringify(sanitized);
        if (stringified.length > 255) { // Strict limit for VARCHAR(255)
            return JSON.stringify({
                truncated: true,
                userId: metadata.userId
            });
        }
        return stringified;
    }

    async createLog(level, message, metadata = null) {
        try {
            return await this.create({
                level,
                message,
                metadata: this._sanitizeMetadata(metadata)
            });
        } catch (error) {
            log(`Error creating bot log: ${error}`, 'error');
            throw error;
        }
    }

    async getLogs(options = {}) {
        try {
            return await this.findMany({}, {
                orderBy: { createdAt: 'desc' },
                ...options
            });
        } catch (error) {
            log(`Error fetching logs: ${error}`, 'error');
            throw error;
        }
    }
}
