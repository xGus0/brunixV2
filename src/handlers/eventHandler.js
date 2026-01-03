// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Event Handler                                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class EventHandler {
    constructor(client) {
        this.client = client;
        this.eventsPath = join(__dirname, '../events/client');
    }

    async load() {
        const eventFiles = readdirSync(this.eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const { default: event } = await import(`file://${join(this.eventsPath, file)}`);

                if (!event.name || !event.execute) {
                    Logger.warn(`Event ${file} is missing required properties`);
                    continue;
                }

                if (event.once) {
                    this.client.once(event.name, (...args) => event.execute(this.client, ...args));
                } else {
                    this.client.on(event.name, (...args) => event.execute(this.client, ...args));
                }

                Logger.info(`Loaded event: ${event.name}`);
            } catch (error) {
                Logger.error(`Failed to load event ${file}:`, error);
            }
        }
    }
}
