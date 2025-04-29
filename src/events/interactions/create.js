import { Events } from "discord.js";
import { log } from "../../utils/logger.js";
import { UserModel } from "../../models/user.js";
import { GuildMemberModel } from "../../models/guildMember.js";
import { GuildModel } from "../../models/guild.js";

export default {
    event: Events.InteractionCreate,

    run: async (client, interaction) => {
        // Only handle slash commands and context menus
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

        const command = client.slash.get(interaction.commandName) || 
                       client.private.get(interaction.commandName);

        if (!command) return;

        try {
            // Check if user is registered
            const userModel = new UserModel();
            const user = await userModel.findByDiscordId(interaction.user.id);

            if (!user) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [{
                        title: 'Error: User Not Registered',
                        description: 'You need to be registered in the system to use this command.',
                        color: 0xFF0000,
                        thumbnail: { url: client.logo }
                    }]
                });
            }

            // Check if user is banned
            if (user.isBanned) {
                const banText = user.banExpiresAt 
                    ? `You are banned until ${user.banExpiresAt.toLocaleString()}\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`
                    : `You are permanently banned.\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`;

                return interaction.reply({
                    ephemeral: true,
                    embeds: [{
                        title: 'Access Denied',
                        description: banText,
                        color: 0xFF0000,
                        thumbnail: { url: client.logo }
                    }]
                });
            }

            // Check if guild is banned (for guild commands)
            if (interaction.guildId) {
                const guildModel = new GuildModel();
                const guild = await guildModel.findByDiscordId(interaction.guildId);

                if (guild?.isBanned) {
                    const banText = guild.banExpiresAt
                        ? `This server is banned until ${guild.banExpiresAt.toLocaleString()}\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`
                        : `This server is permanently banned.\n\nIf you believe this is a mistake, please join our support server: ${process.env.DISCORD_GUILD_INVITE}`;

                    return interaction.reply({
                        ephemeral: true,
                        embeds: [{
                            title: 'Access Denied',
                            description: banText,
                            color: 0xFF0000,
                            thumbnail: { url: client.logo }
                        }]
                    });
                }
            }

            // Check permissions if command requires them
            if (command.permissions?.length > 0) {
                const guildMemberModel = new GuildMemberModel();
                const member = await guildMemberModel.getGuildMember(
                    interaction.user.id,
                    interaction.guildId
                );

                if (!member) {
                    return interaction.reply({
                        ephemeral: true,
                        embeds: [{
                            title: 'Error: Missing Permissions',
                            description: 'You do not have the required permissions to use this command.',
                            color: 0xFF0000,
                            thumbnail: { url: client.logo }
                        }]
                    });
                }

                const hasPermission = command.permissions.some(permission => 
                    member.permissions.some(p => p.name === permission)
                );

                if (!hasPermission) {
                    return interaction.reply({
                        ephemeral: true,
                        embeds: [{
                            title: 'Error: Missing Permissions',
                            description: 'You do not have the required permissions to use this command.',
                            fields: [{
                                name: 'Required Permissions',
                                value: command.permissions.join(', ')
                            }],
                            color: 0xFF0000,
                            thumbnail: { url: client.logo }
                        }]
                    });
                }
            }

            // Handle cooldowns
            if (command.cooldown) {
                const cooldownKey = `${interaction.user.id}-${command.name}`;
                const cooldown = client.cooldowns.get(cooldownKey);

                if (cooldown) {
                    const timeLeft = (cooldown - Date.now()) / 1000;
                    if (timeLeft > 0) {
                        return interaction.reply({
                            ephemeral: true,
                            embeds: [{
                                title: 'Command on Cooldown',
                                description: `Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`,
                                color: 0xFFA500,
                                thumbnail: { url: client.logo }
                            }]
                        });
                    }
                }

                client.cooldowns.set(cooldownKey, Date.now() + command.cooldown);
                setTimeout(() => client.cooldowns.delete(cooldownKey), command.cooldown);
            }

            // Execute the command
            await command.run(client, interaction);

        } catch (error) {
            log(`Error executing command ${interaction.commandName}: ${error}`, 'error');
            
            return interaction.reply({
                ephemeral: true,
                embeds: [{
                    title: 'Error',
                    description: 'An error occurred while executing this command.',
                    color: 0xFF0000,
                    thumbnail: { url: client.logo }
                }]
            });
        }
    }
};
