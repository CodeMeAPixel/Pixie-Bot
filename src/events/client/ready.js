import { Events } from "discord.js";
import { log } from "../../utils/logger.js";

export default {
    event: Events.ClientReady,
    once: true,

    run: async (_, client) => {
        log(`Starting ${client.user.username}...`, 'info');

        try {

            await client.rpc.presence(client);

            log(`${client.user.username} is ready!`, 'done');
        } catch (error) {
            log(`Error setting presence: ${error}`, 'error');
        }
    }
}