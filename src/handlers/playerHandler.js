// ╔═══════════════════════════════════════════════════════════════════╗
// ║               Player Handler (lavalink-client Edition)              ║
// ║              Manages Lavalink events with lavalink-client           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class PlayerHandler {
    constructor(client) {
        this.client = client;
        this.eventsPath = join(__dirname, '../events/lavalink');
    }

    async load() {
        if (!this.client.lavalink) {
            Logger.warn('LavalinkManager not initialized, skipping player events');
            return;
        }

        const eventFiles = readdirSync(this.eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const { default: event } = await import(`file://${join(this.eventsPath, file)}`);

                if (!event.name || !event.execute) {
                    Logger.warn(`Lavalink event ${file} is missing required properties`);
                    continue;
                }

                // All events go through LavalinkManager now
                this.client.lavalink.on(event.name, (...args) =>
                    event.execute(this.client, ...args)
                );

                Logger.info(`Loaded Lavalink event: ${event.name}`);
            } catch (error) {
                Logger.error(`Failed to load Lavalink event ${file}:`, error);
            }
        }

        Logger.success(`Player handler loaded with ${eventFiles.length} events`);
    }
}
