import { readdirSync } from "fs";
import { log } from "../utils/logger.js";

/**
 * Loads a command module.
 * @param {import('discord.js').Client} client - The client instance.
 * @param {string} importPath - The path to the module file.
 * @param {string} type - The type of command to load.
 * @returns {Promise<void>}
 * @example
 * loadCommandModules(client, './src/commands/ready.js', 'slash');
 */
const loadCommandModules = async (client, importPath, type) => {
    let module = await import(importPath);

    module = module.default;

    if (!module) return;

    if (!module.structure?.name || !module.run) {
        log(`[${type}] Command ${module.structure?.name} is missing a required "name" or "run" property.`, 'error');
        return;
    }

    if (['slash', 'context', 'private'].includes(type)) {
        client[type].set(module.structure.name, module)
        log(`Loaded ${type} command: ${module.structure.name}`, 'success');
    } else {
        log(`[${type}] Command ${module.structure.name} is not a valid command type.`, 'error');
    }
}

/**
 * Loads an interaction module.
 * @param {import('discord.js').Client} client - The client instance.
 * @param {string} importFilePath - The path to the module file.
 * @param {string} type - The type of interaction to load.
 * @returns {Promise<void>}
 * @example
 * loadInteractionModules(client, './src/interactions/ready.js', 'buttonInteractions');
 */
const loadInteractionModules = async (client, importFilePath, type) => {
    let module = await import(importFilePath);

    module = module.default;

    if (!module) return;

    const attr = type === 'autoCompleteInteraction' ? 'commandName' : 'customId';

    if (!module[attr] || !module.run) {
        log(`[${type}] Interaction ${module[attr]} is missing a required "commandName" or "customId" property.`, 'error');
        return;
    }

    if (['buttonInteractions', 'selectInteractions', 'modalInteractions', 'autoCompleteInteractions'].includes(type)) {
        client[type].set(module[attr], module);
        log(`Loaded ${type} interaction: ${module[attr]}`, 'success');
    } else {
        log(`[${type}] Interaction ${module[attr]} is not a valid interaction type.`, 'error');
    }
}

/**
 * Loads a trigger module.
 * @param {import('discord.js').Client} client - The client instance.
 * @param {string} importFilePath - The path to the module file.
 * @returns {Promise<void>}
 * @example
 * loadTriggerModules(client, './src/triggers/ready.js');
 */
const loadTriggerModules = async (client, importFilePath) => {
    let module = await import(importFilePath);

    module = module.default;

    if (!module) return;

    client.triggers.set(module.name, module);

    log(`Loaded trigger: ${module.name}`, 'success');
}

/**
 * Loads an event module.
 * @param {import('discord.js').Client} client - The client instance.
 * @param {string} importFilePath - The path to the module file.
 * @returns {Promise<void>}
 * @example
 * loadEventModules(client, './src/events/ready.js');
 */
const loadEventModules = async (client, importFilePath) => {
    let module = await import(importFilePath);

    module = module.default;

    if (!module) return;

    if (!module.event || !module.run) {
        log(`[Event] ${module.event} is missing a required "event" or "run" property.`, 'error');
        return;
    }

    log(`Loaded event: ${module.event}`, 'success');

    if (module.once) client.once(module.event, (...args) => module.run(client, ...args));
    else client.on(module.event, async (...args) => await module.run(client, ...args));
}

/**
 * Loads all modules in the given directory.
 * @param {import('discord.js').Client} client - The client instance.
 * @param {string} path - The path to the directory containing the modules.
 * @param {string} type - The type of modules to load.
 * @returns {Promise<void>}
 * @example
 * loadModule(client, './src/commands', 'slash');
 * loadModule(client, './src/interactions', 'buttonInteractions');
 * loadModule(client, './src/triggers', 'triggers');
 * loadModule(client, './src/events', 'events');
 */
export const loadModule = async (client, path, type) => {
    
    let importModule = loadCommandModules;

    if (type.endsWith('Interactions')) importModule = loadInteractionModules;
    else if (type.endsWith('Triggers')) importModule = loadTriggerModules;
    else if (type.endsWith('Events')) importModule = loadEventModules;

    const modulesDir = readdirSync(path);

    for (const module of modulesDir) {
        if (module.startsWith('.md')) continue;
        
        if (module.endsWith('.js')) {
            await importModule(client, `${path.replace('./src/', '../')}${module}`, type);
            continue;
        }

        const submodFiles = readdirSync(`${path}${module}`).filter(file => file.endsWith('.js'))

        for (const subModule of submodFiles) {
            await importModule(client, `${path.replace('./src/', '../')}${module}/${subModule}`, type)
        }
    }
}