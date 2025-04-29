import { Events } from "discord.js";
import { log } from "../../utils/logger.js";
import { GuildModel } from "../../models/guild.js";
import { PermissionModel } from "../../models/permission.js";
import { UserModel } from "../../models/user.js";
import { GuildMemberModel } from "../../models/guildMember.js";
import { ChannelModel } from "../../models/channel.js";
import { PermissionManager } from "../../utils/permissions.js";
import { Validator } from "../../utils/validator.js";

export default {
    event: Events.GuildCreate,

    run: async (client, guild) => {
        try {
            log(`Initializing guild ${guild.name} (${guild.id})`, 'info');

            // Ensure guild.id is a string
            const guildId = guild.id?.toString();
            if (!guildId) {
                throw new Error('Invalid guild ID received');
            }

            // Validate guild ID before proceeding
            Validator.validateDiscordId(guildId);

            const guildModel = new GuildModel();
            const guildData = {
                name: guild.name || 'Unknown Guild',
                icon: guild.iconURL() || null
            };

            log(`Creating/updating guild with data: ${JSON.stringify(guildData)}`, 'debug');
            const createdGuild = await guildModel.createOrUpdate(guildId, guildData);

            // Wait for guild settings to be updated
            await guildModel.updateSettings(guildId, {
                aiEnabled: true,
                aiModel: 'gpt-4o-mini',
                maxTokens: 2000,
                temperature: 0.7,
                maxConversationLength: 10,
                allowedChannels: '[]',
                enableReasoning: true
            });

            // Verify guild exists in DB before creating channels
            const verifiedGuild = await guildModel.findByDiscordId(guildId);
            if (!verifiedGuild) {
                throw new Error('Failed to create guild in database');
            }

            // Now create channels using verified guild
            const channelModel = new ChannelModel();
            const textChannels = guild.channels.cache.filter(channel => channel.type === 0); // 0 is GUILD_TEXT
            for (const channel of textChannels.values()) {
                const channelData = {
                    name: channel.name || 'Unnamed Channel',
                    type: 'text',
                    isNSFW: channel.nsfw || false
                };

                log(`Creating/updating channel ${channel.name} (${channel.id})`, 'debug');
                await channelModel.createOrUpdate(channel.id, guildId, channelData);
            }

            const permModel = new PermissionModel();
            const permissions = {};

            // Initialize default permissions first
            try {
                await PermissionManager.initializePermissions();
            } catch (error) {
                log(`Error initializing default permissions: ${error}`, 'error');
                throw error;
            }

            // Get or create permissions
            if (!PermissionManager.defaultPermissions || !Array.isArray(PermissionManager.defaultPermissions)) {
                throw new Error('Default permissions are not properly defined');
            }

            for (const defaultPerm of PermissionManager.defaultPermissions) {
                if (!defaultPerm || typeof defaultPerm !== 'object') {
                    log(`Invalid permission object: ${JSON.stringify(defaultPerm)}`, 'error');
                    continue;
                }

                try {
                    let perm = await permModel.getByName(defaultPerm.name);
                    if (!perm) {
                        perm = await permModel.createPermission(defaultPerm);
                        log(`Created permission: ${defaultPerm.name}`, 'info');
                    }
                    permissions[perm.name] = perm;
                } catch (error) {
                    log(`Error processing permission ${defaultPerm?.name || 'Unknown'}: ${error}`, 'error');
                }
            }

            if (Object.keys(permissions).length === 0) {
                throw new Error('Failed to initialize permissions');
            }

            const owner = await guild.fetchOwner();
            const members = await guild.members.fetch();
            const admins = members.filter(member =>
                (member.permissions.has('Administrator') ||
                    member.permissions.has('ManageGuild') ||
                    member.permissions.has('ManageRoles') ||
                    member.permissions.has('ManageChannels')) &&
                !member.user.bot
            );

            const userModel = new UserModel();
            const guildMemberModel = new GuildMemberModel();

            const ownerUser = await userModel.createOrUpdate(owner.id, {
                username: owner.user.username,
                discriminator: owner.user.discriminator,
                avatar: owner.user.avatarURL()
            });

            const ownerMember = await guildMemberModel.createOrUpdate(owner.id, guildId, {
                isGuildAdmin: true
            });

            for (const permission of Object.values(permissions)) {
                await permModel.assignToEntity(permission.id, 'guildMember', ownerMember.id);
            }

            for (const admin of admins.values()) {
                if (admin.id === owner.id) continue;
                const adminMember = await guildMemberModel.createOrUpdate(admin.id, guildId, {
                    isGuildAdmin: true
                });

                await permModel.assignToEntity(permissions.use_ai.id, 'guildMember', adminMember.id);
                await permModel.assignToEntity(permissions.manage_ai.id, 'guildMember', adminMember.id);
            }

            for (const member of members.values()) {
                if (member.user.bot) continue;
                if (member.id === owner.id) continue;
                if (admins.has(member.id)) continue;

                const memberRecord = await guildMemberModel.createOrUpdate(member.id, guildId, {
                    isGuildAdmin: false
                });

                await permModel.assignToEntity(permissions.use_ai.id, 'guildMember', memberRecord.id);
            }

            log(`Initialized guild ${guild.name} with default settings and permissions`, 'success');
        } catch (error) {
            log(`Error initializing guild ${guild?.name || 'Unknown'} (${guild?.id || 'Unknown'}): ${error}`, 'error');
            log(`Stack trace: ${error.stack}`, 'debug');
        }
    }
};