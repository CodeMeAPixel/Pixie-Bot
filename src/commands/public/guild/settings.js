import { cmdTypes } from '../../../consts/cmdTypes.js';
import { GuildModel } from '../../../models/guild.js';

export default {
    structure: {
        name: 'settings',
        category: 'guild',
        description: 'View and manage your server settings',
        handlers: {
            cooldown: 15000,
            permissions: []
        },
        options: [
            {
                name: 'view',
                description: 'View this server\'s settings',
                type: cmdTypes.SUB_COMMAND,
                permissions: ['MANAGE_GUILD']
            }
        ]
    },

    run: async (client, interaction) => {

        switch (interaction.options.getSubcommand()) {

            case 'view': {
                const guild = await client.guilds.fetch(interaction.guild.id);
                const guildModel = new GuildModel();
                const settings = await guildModel.getSettings(guild.id);

                const embed = {
                    title: 'Server Settings',
                    color: client.colors.primary,
                    description: `Settings for ${guild.name}`,
                    thumbnail: {
                        url: guild.iconURL({ dynamic: true }) || client.logo
                    },
                    fields: [
                        { name: 'AI Status', value: settings.aiEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'AI Provider', value: settings.aiProvider, inline: true },
                        { name: 'AI Model', value: settings.aiModel, inline: true },
                        { name: 'Max Tokens', value: settings.maxTokens.toString(), inline: true },
                        { name: 'Temperature', value: settings.temperature.toString(), inline: true },
                        { name: 'History Length', value: settings.maxConversationLength.toString(), inline: true },
                        { name: 'Allowed Channels', value: settings.allowedChannels === '[]' ? 'All Channels' : JSON.parse(settings.allowedChannels).join(', ') || 'None', inline: true },
                        { name: 'Reasoning', value: settings.enableReasoning ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Web Search', value: settings.enableWebSearch ? '✅ Enabled' : '❌ Disabled', inline: true }
                    ]
                };

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'default': {
                await interaction.reply({ content: 'Please specify a subcommand.', ephemeral: true });
                break;
            }
        }
    }
}