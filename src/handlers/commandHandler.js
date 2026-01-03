// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Command Handler (Prefix)                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commandsPath = join(__dirname, '../commands');
    }

    async load() {
        const categories = readdirSync(this.commandsPath);

        for (const category of categories) {
            const categoryPath = join(this.commandsPath, category);
            const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const { default: command } = await import(`file://${join(categoryPath, file)}`);

                    if (!command.name || !command.execute) {
                        Logger.warn(`Command ${file} is missing required properties`);
                        continue;
                    }

                    // Register command
                    this.client.commands.set(command.name, command);

                    // Register aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            this.client.aliases.set(alias, command.name);
                        }
                    }

                    Logger.info(`Loaded command: ${command.name}`);
                } catch (error) {
                    Logger.error(`Failed to load command ${file}:`, error);
                }
            }
        }

        Logger.success(`Loaded ${this.client.commands.size} commands`);
    }
}
