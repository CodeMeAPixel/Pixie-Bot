import { db } from '../client/database.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';

export class BaseModel {
    constructor() {
        this.db = db.getInstance().prisma;
    }

    get model() {
        if (!this.modelName) {
            throw new Error('Model name not set in child class');
        }
        return this.db[this.modelName];
    }

    /**
     * Common database operations with standardized error handling
     */
    async dbOperation(operation, errorMessage, callback) {
        try {
            return await callback();
        } catch (error) {
            log(`${errorMessage}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Execute database operations within a transaction
     */
    async transaction(callback) {
        try {
            return await this.db.$transaction(callback);
        } catch (error) {
            log(`Transaction failed in ${this.modelName}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Enhanced createOrUpdate with relation support
     */
    async createOrUpdate(where, createData = {}, updateData = {}, options = {}) {
        if (!where) {
            throw new Error('Where condition is required for createOrUpdate');
        }

        if (!createData || typeof createData !== 'object') {
            throw new Error('Create data must be an object');
        }

        if (!updateData || typeof updateData !== 'object') {
            updateData = {};
        }

        log(`Creating/updating ${this.modelName} with where: ${JSON.stringify(where)}`, 'debug');
        log(`Create data: ${JSON.stringify(createData)}`, 'debug');
        log(`Update data: ${JSON.stringify(updateData)}`, 'debug');

        return this.dbOperation(
            'upsert',
            `Error in createOrUpdate ${this.modelName}`,
            () => this.model.upsert({
                where,
                create: createData,
                update: updateData,
                ...options
            })
        );
    }

    /**
     * Enhanced findWithRelations
     */
    async findWithRelations(where, relations = []) {
        return this.dbOperation(
            'find',
            `Error finding ${this.modelName} with relations`,
            () => this.model.findUnique({
                where,
                include: relations.reduce((acc, rel) => ({ ...acc, [rel]: true }), {})
            })
        );
    }

    /**
     * Safely delete a record and its relations
     */
    async safeDelete(where, relations = []) {
        try {
            await this.transaction(async (tx) => {
                // Delete related records first
                for (const relation of relations) {
                    await tx[relation].deleteMany({
                        where: { [this.modelName]: where }
                    });
                }
                // Delete the main record
                await tx[this.modelName].delete({ where });
            });
        } catch (error) {
            log(`Error safely deleting ${this.modelName}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Find a record by ID
     * @param {string} id - Record ID
     * @param {Object} options - Query options (include, select, etc)
     */
    async findById(id, options = {}) {
        try {
            Validator.validateId(id);
            return await this.model.findUnique({
                where: { id },
                ...options
            });
        } catch (error) {
            log(`Error finding ${this.modelName} by ID: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Create a new record
     * @param {Object} data - Record data
     * @param {Object} options - Create options
     */
    async create(data, options = {}) {
        try {
            return await this.model.create({
                data,
                ...options
            });
        } catch (error) {
            log(`Error creating ${this.modelName}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Update a record
     * @param {string} id - Record ID
     * @param {Object} data - Update data
     * @param {Object} options - Update options
     */
    async update(id, data, options = {}) {
        try {
            Validator.validateId(id);
            return await this.model.update({
                where: { id },
                data,
                ...options
            });
        } catch (error) {
            log(`Error updating ${this.modelName}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Delete a record
     * @param {string} id - Record ID
     * @param {Object} options - Delete options
     */
    async delete(id, options = {}) {
        try {
            Validator.validateId(id);
            return await this.model.delete({
                where: { id },
                ...options
            });
        } catch (error) {
            log(`Error deleting ${this.modelName}: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Find many records
     * @param {Object} where - Where conditions
     * @param {Object} options - Query options
     */
    async findMany(where = {}, options = {}) {
        try {
            return await this.model.findMany({
                where,
                ...options
            });
        } catch (error) {
            log(`Error finding ${this.modelName} records: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Check if a record exists
     * @param {Object} where - Where conditions
     */
    async exists(where) {
        try {
            const count = await this.model.count({ where });
            return count > 0;
        } catch (error) {
            log(`Error checking ${this.modelName} existence: ${error}`, 'error');
            throw error;
        }
    }
}