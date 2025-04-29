import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';

export class PermissionModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'permission';
    }

    /**
     * Create a new permission
     */
    async createPermission(data) {
        const errors = Validator.validatePermissionData(data);
        if (errors.length) throw new Error(errors.join(', '));

        return this.create(data);
    }

    /**
     * Get permission by ID
     */
    async getById(id) {
        return this.findById(id);
    }

    /**
     * Get permission by name
     */
    async getByName(name) {
        try {
            return await this.model.findFirst({
                where: { name },
                include: {
                    users: true,
                    guilds: true,
                    guildMembers: true
                }
            });
        } catch (error) {
            log(`Error finding permission by name: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Get all permissions
     */
    async getAllPermissions() {
        return this.findMany();
    }

    /**
     * Update permission
     */
    async updatePermission(id, data) {
        const errors = Validator.validatePermissionData(data);
        if (errors.length) throw new Error(errors.join(', '));

        return this.update(id, data);
    }

    /**
     * Delete permission
     */
    async deletePermission(id) {
        return this.delete(id);
    }

    /**
     * Assign permission to user/guild/member
     */
    async assignToEntity(permissionId, entityType, entityId) {
        return this.dbOperation(
            'assign',
            `Error assigning permission to ${entityType}`,
            async () => {
                switch (entityType) {
                    case 'user':
                        return this.db.user.update({
                            where: { id: entityId },
                            data: {
                                permissions: { connect: { id: permissionId } }
                            }
                        });
                    case 'guild':
                        return this.db.guild.update({
                            where: { id: entityId },
                            data: {
                                permissions: { connect: { id: permissionId } }
                            }
                        });
                    case 'guildMember':
                        return this.db.guildMember.update({
                            where: { id: entityId },
                            data: {
                                permissions: { connect: { id: permissionId } }
                            }
                        });
                    default:
                        throw new Error(`Invalid entity type: ${entityType}`);
                }
            }
        );
    }

    /**
     * Remove permission from user/guild/member
     */
    async removeFromEntity(permissionId, entityType, entityId) {
        return this.dbOperation(
            'remove',
            `Error removing permission from ${entityType}`,
            async () => {
                switch (entityType) {
                    case 'user':
                        return this.db.user.update({
                            where: { id: entityId },
                            data: {
                                permissions: { disconnect: { id: permissionId } }
                            }
                        });
                    case 'guild':
                        return this.db.guild.update({
                            where: { id: entityId },
                            data: {
                                permissions: { disconnect: { id: permissionId } }
                            }
                        });
                    case 'guildMember':
                        return this.db.guildMember.update({
                            where: { id: entityId },
                            data: {
                                permissions: { disconnect: { id: permissionId } }
                            }
                        });
                    default:
                        throw new Error(`Invalid entity type: ${entityType}`);
                }
            }
        );
    }

    /**
     * Check permission for user/guild/member
     */
    async checkPermission(entityType, entityId, permissionName) {
        return this.dbOperation(
            'check',
            `Error checking permission for ${entityType}`,
            async () => {
                switch (entityType) {
                    case 'user':
                        const user = await this.db.user.findUnique({
                            where: { id: entityId },
                            include: {
                                permissions: true
                            }
                        });
                        return user?.permissions.some(p => p.name === permissionName) || false;

                    case 'guild':
                        const guild = await this.db.guild.findUnique({
                            where: { id: entityId },
                            include: {
                                permissions: true
                            }
                        });
                        return guild?.permissions.some(p => p.name === permissionName) || false;

                    case 'guildMember':
                        const member = await this.db.guildMember.findUnique({
                            where: { id: entityId },
                            include: {
                                permissions: true,
                                user: true,
                                guild: true
                            }
                        });

                        if (!member) return false;
                        if (member.isGuildAdmin) return true;

                        return member.permissions.some(p => p.name === permissionName);

                    default:
                        throw new Error(`Invalid entity type: ${entityType}`);
                }
            }
        );
    }
}