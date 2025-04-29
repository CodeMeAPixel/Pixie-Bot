import { BaseModel } from './base.js';
import { Validator } from '../utils/validator.js';
import { GuildModel } from './guild.js';
import { log } from '../utils/logger.js';

export class ChannelModel extends BaseModel {
    constructor() {
        super();
        this.modelName = 'channel';
    }

    async findByDiscordId(discordId, guildId) {
        const where = {
            discordId_guildId: {
                discordId,
                guildId
            }
        };
        return this.findWithRelations(where);
    }

    async createOrUpdate(discordId, guildDiscordId, data) {
        const errors = Validator.validateChannelData(data);
        if (errors.length) throw new Error(errors.join(', '));

        // First get the internal guild ID
        const guildModel = new GuildModel();
        const guild = await guildModel.findByDiscordId(guildDiscordId);

        if (!guild) {
            log(`Guild not found for discordId: ${guildDiscordId}`, 'error');
            throw new Error(`Guild with discordId ${guildDiscordId} must exist before creating channels`);
        }

        log(`Found guild with ID: ${guild.id} for discordId: ${guildDiscordId}`, 'debug');

        const where = {
            discordId_guildId: {
                discordId,
                guildId: guild.id // Use internal ID
            }
        };

        const channelData = {
            discordId,
            guildId: guild.id, // Use internal ID
            ...data
        };

        log(`Creating/updating channel with data: ${JSON.stringify(channelData)}`, 'debug');
        return super.createOrUpdate(where, channelData);
    }

    /**
     * Delete channel and all related conversations
     */
    async deleteChannel(discordId, guildId) {
        return this.transaction(async (tx) => {
            const channel = await tx.channel.findUnique({
                where: {
                    discordId_guildId: {
                        discordId,
                        guildId
                    }
                }
            });

            if (!channel) throw new Error('Channel not found');

            // Delete all messages in channel conversations
            await tx.message.deleteMany({
                where: {
                    conversation: {
                        channelId: channel.id
                    }
                }
            });

            // Delete all conversations
            await tx.conversation.deleteMany({
                where: { channelId: channel.id }
            });

            // Finally delete the channel
            return tx.channel.delete({
                where: { id: channel.id }
            });
        });
    }
}
