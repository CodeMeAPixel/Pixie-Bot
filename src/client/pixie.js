import Discord, { Client, Collection, Partials, GatewayIntentBits } from "discord.js";
import { setClientPresence } from "../handlers/rpc.js";
import deploy from "../handlers/deploy.js";
import commands from "../handlers/commands.js";
import events from "../handlers/events.js";
import { db } from "./database.js";
import { PermissionManager } from '../utils/permissions.js';

class Pixie extends Client {
    slash = new Collection();
    private = new Collection();
    select = new Collection();
    modal = new Collection();
    button = new Collection();
    autocomplete = new Collection();
    context = new Collection();
    cooldowns = new Collection();
    triggers = new Collection();
    applicationCommandsArray = [];

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping
            ],
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction,
                Partials.User
            ],
            allowedMentions: {
                parse: ['users', 'roles', 'everyone'],
                repliedUser: true
            }
        });

        this.Gateway = Discord;

        this.db = db.getInstance();
        this.rpc = { presence: setClientPresence };

        this.logo = process.env.BOT_LOGO;
        this.banner = process.env.BOT_BANNER;
        this.footer = '© 2025 - ByteBrush Studios';

        this.colors = {
            primary: 0xDB8F55,  // Converted from #DB8F55
            error: 0xFF0000,    // Converted from #FF0000
            success: 0x00FF00,  // Converted from #00FF00
            warning: 0xFFFF00   // Converted from #FFFF00
        };

        this.aiModels = {
            'gpt-4.1': {
                maxTokens: 8192,
                temperature: 0.7
            },
            'gpt-4.1-mini': {
                maxTokens: 4096,
                temperature: 0.7
            },
            'gpt-4.1-nano': {
                maxTokens: 2048,
                temperature: 0.7
            },
            'gpt-4o': {
                maxTokens: 8192,
                temperature: 0.7
            },
            'gpt-4o-mini': {
                maxTokens: 4096,
                temperature: 0.7
            },
            'gpt-4-turbo': {
                maxTokens: 4096,
                temperature: 0.7
            }
        };

        this.defaultAIModel = 'gpt-4-turbo';
    }

    start = async () => {
        // Initialize default permissions
        await PermissionManager.initializePermissions();

        await events(this);
        await commands(this);
        await deploy(this);

        await this.login(process.env.DISCORD_TOKEN);
    }
}

export default Pixie;
