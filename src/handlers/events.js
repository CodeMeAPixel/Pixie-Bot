import { readdirSync } from "fs";
import { loadModule } from "./moduleLoader.js";

const events = async client => {
    for (const dir of readdirSync('./src/events')) {
        await loadModule(client, `./src/events/${dir}/`, 'Events');
    }
}

export default events;