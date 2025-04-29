import { PermissionModel } from '../models/permission.js';
import { UserModel } from '../models/user.js';
import { GuildModel } from '../models/guild.js';
import { GuildMemberModel } from '../models/guildMember.js';
import { log } from './logger.js';

export class PermissionManager {
    static defaultPermissions = [
        {
            name: 'use_ai',
            description: 'Allows users to interact with the AI'
        },
        {
            name: 'manage_ai',
            description: 'Allows users to manage AI settings'
        },
        {
            name: 'manage_guild',
            description: 'Allows users to manage guild settings'
        },
        {
            name: 'manage_users',
            description: 'Allows users to manage user permissions'
        }
    ];

    /**
     * Initialize default permissions if they don't exist
     */
    static async initializePermissions() {
        try {
            const permModel = new PermissionModel();
            const existingPerms = await permModel.getAllPermissions();

            // Create map of existing permissions
            const existingPermMap = new Map(
                existingPerms.map(p => [p.name, p])
            );

            // Only create permissions that don't exist
            for (const perm of this.defaultPermissions) {
                if (!existingPermMap.has(perm.name)) {
                    await permModel.createPermission(perm);
                    log(`Created permission: ${perm.name}`, 'info');
                }
            }
        } catch (error) {
            log(`Error initializing permissions: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Check if a user has a specific permission
     * @param {string} userId - Discord or internal user ID
     * @param {string} guildId - Discord or internal guild ID
     * @param {string} permissionName - Name of the permission to check
     * @returns {Promise<boolean>}
     */
    static async hasPermission(userId, guildId, permissionName) {
        try {
            log(`Checking permission ${permissionName} for user ${userId} in guild ${guildId}`, 'debug');

            const userModel = new UserModel();
            const guildModel = new GuildModel();
            const guildMemberModel = new GuildMemberModel();
            const permModel = new PermissionModel();

            // Get user and guild records
            const user = userId.startsWith('cm9t')
                ? await userModel.findById(userId)
                : await userModel.findByDiscordId(userId);

            const guild = guildId.startsWith('cm9t')
                ? await guildModel.findById(guildId)
                : await guildModel.findByDiscordId(guildId);

            if (!user || !guild) {
                log(`User or guild not found`, 'debug');
                return false;
            }

            // Check if user is bot admin
            if (user.isBotAdmin) {
                log(`User is bot admin, granting permission`, 'debug');
                return true;
            }

            // Get guild member and check admin status
            const member = await guildMemberModel.getGuildMember(user.id, guild.id);
            if (!member) {
                log(`User is not a member of the guild`, 'debug');
                return false;
            }

            if (member.isGuildAdmin) {
                log(`User is guild admin, granting permission`, 'debug');
                return true;
            }

            // Check permissions in order: user -> guild -> member
            const [userPerm, guildPerm, memberPerm] = await Promise.all([
                permModel.checkPermission('user', user.id, permissionName),
                permModel.checkPermission('guild', guild.id, permissionName),
                permModel.checkPermission('guildMember', member.id, permissionName)
            ]);

            log(`Permission check results - User: ${userPerm}, Guild: ${guildPerm}, Member: ${memberPerm}`, 'debug');
            return userPerm || guildPerm || memberPerm;

        } catch (error) {
            log(`Error checking permission: ${error}`, 'error');
            return false;
        }
    }

    /**
     * Require a specific permission (throws if not present)
     */
    static async requirePermission(userId, guildId, permissionName) {
        const hasPermission = await this.hasPermission(userId, guildId, permissionName);
        if (!hasPermission) {
            throw new Error(`Permission denied: ${permissionName}`);
        }
        return true;
    }

    /**
     * Check if user is a bot admin
     */
    static async isBotAdmin(userId) {
        try {
            const userModel = new UserModel();
            const user = userId.startsWith('cm9t')
                ? await userModel.findById(userId)
                : await userModel.findByDiscordId(userId);

            return user?.isBotAdmin || false;
        } catch (error) {
            log(`Error checking bot admin status: ${error}`, 'error');
            return false;
        }
    }

    /**
     * Check if user is a guild admin
     */
    static async isGuildAdmin(userId, guildId) {
        try {
            const guildMemberModel = new GuildMemberModel();
            const member = await guildMemberModel.getGuildMember(userId, guildId);
            return member?.isGuildAdmin || false;
        } catch (error) {
            log(`Error checking guild admin status: ${error}`, 'error');
            return false;
        }
    }
}