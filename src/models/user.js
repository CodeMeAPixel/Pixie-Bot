import { BaseModel } from './base.js';
import { log } from '../utils/logger.js';
import { Validator } from '../utils/validator.js';

export class UserModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'user';
    }

    async findByDiscordId(discordId, relations = []) {
        try {
            Validator.validateDiscordId(discordId);
            return await this.findWithRelations({ discordId }, relations);
        } catch (error) {
            log(`Error finding user: ${error}`, 'error');
            throw error;
        }
    }

    async createOrUpdate(discordId, data) {
        try {
            const validDiscordId = String(discordId);

            return await this.model.upsert({
                where: { discordId: validDiscordId },
                create: {
                    discordId: validDiscordId,
                    username: data.username,
                    discriminator: data.discriminator,
                    avatar: data.avatar,
                    isBotAdmin: data.isBotAdmin || false,
                    isBanned: false
                },
                update: {
                    username: data.username,
                    discriminator: data.discriminator,
                    avatar: data.avatar,
                    ...(typeof data.isBotAdmin === 'boolean' && { isBotAdmin: data.isBotAdmin })
                }
            });
        } catch (error) {
            log(`Error in createOrUpdate user: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Update ban status of a user
     * @param {string} discordId - Discord user ID
     * @param {boolean} isBanned - Ban status
     * @param {string|null} reason - Ban reason
     * @param {Date|null} expiresAt - Ban expiration date
     */
    async updateBanStatus(discordId, isBanned, reason = null, expiresAt = null) {
        try {
            Validator.validateDiscordId(discordId);
            const banData = { isBanned, banReason: reason, banExpiresAt: expiresAt };
            const errors = Validator.validateBanData(banData);
            if (errors.length) throw new Error(errors.join(', '));

            return await this.model.update({
                where: { discordId },
                data: banData
            });
        } catch (error) {
            log(`Error updating ban status: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Ban a user
     * @param {string} discordId - Discord user ID
     * @param {string} reason - Ban reason
     * @param {Date|null} expiresAt - Ban expiration date
     */
    async banUser(discordId, reason, expiresAt = null) {
        try {
            Validator.validateDiscordId(discordId);
            const banData = { isBanned: true, banReason: reason, banExpiresAt: expiresAt };
            const errors = Validator.validateBanData(banData);
            if (errors.length) throw new Error(errors.join(', '));

            return await this.model.update({
                where: { discordId },
                data: banData
            });
        } catch (error) {
            log(`Error banning user: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Unban a user
     * @param {string} discordId - Discord user ID
     */
    async unbanUser(discordId) {
        try {
            Validator.validateDiscordId(discordId);
            return await this.model.update({
                where: { discordId },
                data: {
                    isBanned: false,
                    banReason: null,
                    banExpiresAt: null
                }
            });
        } catch (error) {
            log(`Error unbanning user: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Set admin status for a user
     * @param {string} discordId - Discord user ID
     * @param {boolean} isAdmin - Admin status
     */
    async setAdmin(discordId, isAdmin) {
        try {
            Validator.validateDiscordId(discordId);
            return await this.model.update({
                where: { discordId },
                data: { isAdmin }
            });
        } catch (error) {
            log(`Error setting admin status: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Get user conversations
     * @param {string} discordId - Discord user ID
     */
    async getUserConversations(discordId) {
        try {
            Validator.validateDiscordId(discordId);
            return await this.model.findUnique({
                where: { discordId },
                include: { conversations: true }
            });
        } catch (error) {
            log(`Error getting user conversations: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Delete user and all related data
     */
    async deleteUser(discordId) {
        return this.transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { discordId },
                include: { conversations: true }
            });

            if (!user) throw new Error('User not found');

            // Delete all messages in user's conversations
            await tx.message.deleteMany({
                where: {
                    conversationId: {
                        in: user.conversations.map(c => c.id)
                    }
                }
            });

            // Delete all conversations
            await tx.conversation.deleteMany({
                where: { userId: user.id }
            });

            // Delete guild memberships
            await tx.guildMember.deleteMany({
                where: { userId: user.id }
            });

            // Finally delete the user
            return tx.user.delete({
                where: { id: user.id }
            });
        });
    }
}