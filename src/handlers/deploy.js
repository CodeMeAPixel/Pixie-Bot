import { REST, Routes } from "discord.js";
import { log } from "../utils/logger.js";

const deploy = async (client) => {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {
        
        log ('Initializing application (/) commands...', 'info');

        const commandJsonData = [
            ...Array.from(client.slash.values()).map(c => c.structure)
        ]

        if (client.private.size > 0) {
            
            log('Initializing guild only (/) commands...', 'info');

            await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), {
                body: Array.from(client.private.values()).map(c => c.structure)
            });
        }

        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
            body: commandJsonData
        });

        log('Successfully deployed application (/) commands!', 'success');
    
    } catch(error) {

        log(`Failed to deploy application (/) commands: ${error}`, 'error');
        log(`Stack trace: ${error.stack}`, 'error');
    }
}

export default deploy;