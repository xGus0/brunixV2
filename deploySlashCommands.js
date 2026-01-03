// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Slash Commands Deployer                            ║
// ║           Registers all slash commands to Discord API               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { REST, Routes } from 'discord.js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));

const commands = [];
const slashPath = join(__dirname, 'src/slash');
const categories = readdirSync(slashPath);

console.log('📦 Loading slash commands...\n');

// Load all slash commands
for (const category of categories) {
    const categoryPath = join(slashPath, category);
    const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const command = await import(`file:///${categoryPath}/${file}`);
            const cmd = command.default;

            if (cmd.data) {
                commands.push(cmd.data.toJSON());
                console.log(`✓ ${category}/${file.replace('.js', '')}`);
            }
        } catch (error) {
            console.error(`✗ ${category}/${file}: ${error.message}`);
        }
    }
}

console.log(`\n🚀 Deploying ${commands.length} slash command(s)...\n`);

// Deploy to Discord
const rest = new REST().setToken(config.DISCORD_TOKEN);

try {
    const data = await rest.put(
        Routes.applicationCommands(config.DISCORD_CLIENT_ID),
        { body: commands }
    );

    console.log(`✅ Successfully deployed ${data.length} slash commands globally!\n`);
    console.log('Commands deployed:');
    data.forEach(cmd => console.log(`  • /${cmd.name} - ${cmd.description}`));

} catch (error) {
    console.error('\n❌ Deploy error:', error);
}
