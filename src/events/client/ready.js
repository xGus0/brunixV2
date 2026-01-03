// ╔═══════════════════════════════════════════════════════════════════╗
// ║                         Ready Event                                 ║
// ║                    Bot Presence + Player Handler                    ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { ActivityType } from 'discord.js';
import Logger from '../../utils/logger.js';

export default {
    name: 'ready',
    once: true,

    async execute(client) {
        Logger.success(`Logged in as ${client.user.tag}`);
        Logger.info(`Serving ${client.guilds.cache.size} guilds`);
        Logger.info(`Default prefix: ${client.defaultPrefix}`);

        // Set bot presence
        client.user.setPresence({
            activities: [{
                name: `${client.defaultPrefix}help | Música`,
                type: ActivityType.Listening
            }],
            status: 'online'
        });

        // Initialize Lavalink connection
        try {
            await client.initLavalinkConnection();
        } catch (error) {
            Logger.error('Failed to initialize Lavalink:', error);
        }

        // Load Player Handler (lavalink-client events)
        try {
            await client.playerHandler.load();
            Logger.success('Player Handler initialized!');
        } catch (error) {
            Logger.error('Failed to load Player Handler:', error);
        }
    }
};
