// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Slash Command Handler                            ║
// ║              Loads and manages slash commands                       ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { readdirSync } from 'fs';
import { Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class SlashHandler {
    constructor(client) {
        this.client = client;
        this.client.slashCommands = new Collection();
    }

    async load() {
        const slashPath = join(__dirname, '../slash');
        const categories = readdirSync(slashPath);

        let totalLoaded = 0;

        for (const category of categories) {
            const categoryPath = join(slashPath, category);
            const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const command = await import(`file:///${categoryPath}/${file}`);
                    const cmd = command.default;

                    if (!cmd.data || !cmd.execute) {
                        Logger.warn(`Slash command ${file} missing data or execute function`);
                        continue;
                    }

                    this.client.slashCommands.set(cmd.data.name, cmd);
                    Logger.info(`Loaded slash command: ${cmd.data.name}`);
                    totalLoaded++;

                } catch (error) {
                    Logger.error(`Failed to load slash command ${file}:`, error);
                }
            }
        }

        Logger.success(`Loaded ${totalLoaded} slash commands`);
    }
}
