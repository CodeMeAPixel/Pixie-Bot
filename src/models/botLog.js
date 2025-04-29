import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';

export class BotLogModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'botLog';
    }

    /**
     * Create a new log entry
     * @param {string} level - Log level (info, warning, error)
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async createLog(level, message, metadata = null) {
        try {
            return await this.create({
                level,
                message,
                metadata: metadata ? JSON.stringify(metadata) : null
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
