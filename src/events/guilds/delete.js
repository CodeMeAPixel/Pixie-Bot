import { Events } from "discord.js";
import { log } from "../../utils/logger.js";
import { GuildModel } from "../../models/guild.js";

export default {
    event: Events.GuildDelete,

    run: async (client, guild) => {
        try {
            const guildModel = new GuildModel();

            const existingGuild = await guildModel.findByDiscordId(guild.id);

            if (!existingGuild) {
                log(`Guild ${guild.name} (${guild.id}) not found in database, skipping cleanup`, 'info');
                return;
            }

            await guildModel.deleteGuild(guild.id);
            log(`Successfully cleaned up guild ${guild.name} (${guild.id})`, 'info');

        } catch (error) {
            log(`Failed to clean up guild ${guild.name} (${guild.id}): ${error}`, 'error');
        }
    }
}