import { loadModule } from "./moduleLoader.js";

const commands = async (client) => {
    await loadModule(client, './src/commands/public/', 'slash');
    //await loadModule(client, './src/commands/private/', 'private');
}

export default commands;