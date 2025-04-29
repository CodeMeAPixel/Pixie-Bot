import { AI_PROVIDERS } from '../../../modules/index.js';

export default {
    structure: {
        name: 'models',
        category: 'info',
        description: 'View a list of my supported LLM models and providers.',
        handlers: {
            cooldown: 15000,
            permissions: []
        }
    },

    run: async (client, interaction) => {
        // Emojis for providers (customize as you wish)
        const providerEmojis = {
            openai: '🤖',
            groq: '⚡',
            anthropic: '🦉',
            default: '✨'
        };
        // Emojis for model types (customize as you wish)
        const modelEmojis = {
            gpt: '🧠',
            turbo: '🚀',
            nano: '🔬',
            mini: '📦',
            o1: '🌟',
            default: '💡'
        };
        // Helper to pick model emoji by key
        function getModelEmoji(modelKey) {
            if (/gpt/i.test(modelKey)) return modelEmojis.gpt;
            if (/turbo/i.test(modelKey)) return modelEmojis.turbo;
            if (/nano/i.test(modelKey)) return modelEmojis.nano;
            if (/mini/i.test(modelKey)) return modelEmojis.mini;
            if (/o1/i.test(modelKey)) return modelEmojis.o1;
            return modelEmojis.default;
        }

        const fields = [];
        for (const [providerKey, providerData] of Object.entries(AI_PROVIDERS)) {
            const emoji = providerEmojis[providerKey] || providerEmojis.default;
            // Build a table-like code block for models
            let table = 'Model                | Max Tokens | Temp\n';
            table += '---------------------|------------|------\n';
            for (const [modelKey, modelConfig] of Object.entries(providerData.models)) {
                let modelName = modelConfig.name || modelKey;
                // Show only last segment after slash if present
                if (modelName.includes('/')) {
                    modelName = modelName.split('/').pop();
                }
                // Truncate if too long
                if (modelName.length > 16) {
                    modelName = modelName.slice(0, 15) + '…';
                }
                const maxTokens = modelConfig.maxTokens !== undefined ? modelConfig.maxTokens : '-';
                const temperature = modelConfig.temperature !== undefined ? modelConfig.temperature : '-';
                table += `${modelName.padEnd(17)} | ${String(maxTokens).padEnd(10)} | ${String(temperature).padEnd(4)}\n`;
            }
            fields.push({
                name: `${emoji} ${providerKey.charAt(0).toUpperCase() + providerKey.slice(1)}`,
                value: '```ansi\n' + table + '```',
                inline: false
            });
        }

        return interaction.reply({
            embeds: [
                new client.Gateway.EmbedBuilder()
                    .setTitle('🌐 Supported AI Providers & Models')
                    .setThumbnail(client.logo)
                    .setDescription('Curious about my AI brainpower? Here are all the **providers** and **models** I can use right now:\n\n')
                    .setColor(client.colors.primary)
                    .addFields(fields)
                    .setFooter({ text: 'Want to see more models? Let us know!' })
            ]
        });
    }
}
