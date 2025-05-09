import { ActivityType } from "discord.js";

export const setClientPresence = async client => {
    const presences = [{
        name: "Conversing with the world!",
        type: ActivityType.Custom
    }]

    client.user.setStatus('idle');

    setInterval(() => {
        const presence = presences[Math.floor(Math.random() * presences.length)];

        client.user.setActivity({
            name: presence.name,
            type: presence.type
        })
    }, 15000);
}