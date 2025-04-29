import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';

export class GuildMemberModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'guildMember';
    }

    /**
     * Get a guild member
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     */
    async getGuildMember(userId, guildId) {
        try {
            // Support both internal and Discord IDs
            const isInternalId = userId.startsWith('cm9t');
            let query = {};

            if (isInternalId) {
                query = { userId, guildId };
            } else {
                const user = await this.db.user.findUnique({
                    where: { discordId: userId }
                });
                const guild = await this.db.guild.findUnique({
                    where: { discordId: guildId }
                });

                if (!user || !guild) return null;
                query = { userId: user.id, guildId: guild.id };
            }

            return await this.model.findUnique({
                where: {
                    userId_guildId: query
                },
                include: {
                    user: true,
                    guild: true,
                    permissions: true
                }
            });
        } catch (error) {
            log(`Error getting guild member: ${error}`, 'error');
            throw error;
        }
    }

    async createOrUpdate(discordUserId, discordGuildId, data) {
        try {
            const user = await this.db.user.findUnique({
                where: { discordId: discordUserId }
            });

            const guild = await this.db.guild.findUnique({
                where: { discordId: discordGuildId }
            });

            if (!user || !guild) {
                throw new Error('User or guild not found');
            }

            // Ensure isGuildAdmin is always included in the update
            const updateData = {
                ...data,
                isGuildAdmin: data.isGuildAdmin ?? false
            };

            return await this.model.upsert({
                where: {
                    userId_guildId: {
                        userId: user.id,
                        guildId: guild.id
                    }
                },
                create: {
                    userId: user.id,
                    guildId: guild.id,
                    ...updateData
                },
                update: updateData,
                include: {
                    user: true,
                    guild: true,
                    permissions: true
                }
            });
        } catch (error) {
            log(`Error creating/updating guild member: ${error}`, 'error');
            throw error;
        }
    }

    async delete(userId, guildId) {
        try {
            const user = await this.db.user.findUnique({
                where: { discordId: userId }
            });

            const guild = await this.db.guild.findUnique({
                where: { discordId: guildId }
            });

            if (!user || !guild) {
                throw new Error('User or guild not found');
            }

            await this.model.delete({
                where: {
                    userId_guildId: {
                        userId: user.id,
                        guildId: guild.id
                    }
                }
            });
        } catch (error) {
            log(`Error deleting guild member: ${error}`, 'error');
            throw error;
        }
    }

    async setAdmin(userId, guildId, isAdmin) {
        try {
            const user = await this.db.user.findUnique({
                where: { discordId: userId }
            });

            const guild = await this.db.guild.findUnique({
                where: { discordId: guildId }
            });

            if (!user || !guild) {
                throw new Error('User or guild not found');
            }

            return await this.model.update({
                where: {
                    userId_guildId: {
                        userId: user.id,
                        guildId: guild.id
                    }
                },
                data: {
                    isGuildAdmin: isAdmin
                }
            });
        } catch (error) {
            log(`Error setting guild member admin status: ${error}`, 'error');
            throw error;
        }
    }

    async ban(userId, guildId, reason, expiresAt = null) {
        try {
            const user = await this.db.user.findUnique({
                where: { discordId: userId }
            });

            const guild = await this.db.guild.findUnique({
                where: { discordId: guildId }
            });

            if (!user || !guild) {
                throw new Error('User or guild not found');
            }

            return await this.model.update({
                where: {
                    userId_guildId: {
                        userId: user.id,
                        guildId: guild.id
                    }
                },
                data: {
                    isBanned: true,
                    banReason: reason,
                    banExpiresAt: expiresAt
                }
            });
        } catch (error) {
            log(`Error banning guild member: ${error}`, 'error');
            throw error;
        }
    }

    async unban(userId, guildId) {
        try {
            const user = await this.db.user.findUnique({
                where: { discordId: userId }
            });

            const guild = await this.db.guild.findUnique({
                where: { discordId: guildId }
            });

            if (!user || !guild) {
                throw new Error('User or guild not found');
            }

            return await this.model.update({
                where: {
                    userId_guildId: {
                        userId: user.id,
                        guildId: guild.id
                    }
                },
                data: {
                    isBanned: false,
                    banReason: null,
                    banExpiresAt: null
                }
            });
        } catch (error) {
            log(`Error unbanning guild member: ${error}`, 'error');
            throw error;
        }
    }
}