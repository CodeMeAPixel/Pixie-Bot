export default {
    structure: {
        name: 'invite',
        category: 'info',
        description: 'Get the invite link for the bot',
        handlers: {
            cooldown: 15000,
            permissions: []
        }
    },

    run: async (client, interaction) => {
        
        return interaction.reply({
            embeds: [
                new client.Gateway.EmbedBuilder()
                .setTitle('Woah, you want to invite me?')
                .setDescription('Hey there, thanks for wanting to invite me to your server!')
                .setColor(client.colors.primary)
                .addFields({
                    name: 'Invite Link',
                    value: `[Click here to invite me to your server](${process.env.BOT_INVITE})`,
                    inline: true
                })
            ]
        })
    }
}