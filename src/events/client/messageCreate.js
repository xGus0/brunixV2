// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Message Create Event                              ║
// ║                  (Prefix Command Handler)                           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, Collection } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

export default {
    name: 'messageCreate',
    once: false,

    async execute(client, message) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // Get guild prefix
        const prefix = await client.getPrefix(message.guild.id);

        // Check if message starts with prefix
        if (!message.content.startsWith(prefix)) return;

        // Parse command and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Get command (by name or alias)
        const command = client.commands.get(commandName)
            || client.commands.get(client.aliases.get(commandName));

        if (!command) return;

        // Cooldown check
        const cooldownKey = `${message.author.id}-${command.name}`;
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (client.cooldowns.has(cooldownKey)) {
            const expirationTime = client.cooldowns.get(cooldownKey) + cooldownAmount;

            if (Date.now() < expirationTime) {
                const timeLeft = ((expirationTime - Date.now()) / 1000).toFixed(1);
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.EMBED_WARNING)
                            .setDescription(`${EMOJIS.WARNING} Aguarde **${timeLeft}s** antes de usar este comando novamente.`)
                    ]
                }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
        }

        client.cooldowns.set(cooldownKey, Date.now());
        setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownAmount);

        // Execute command
        try {
            await command.execute(client, message, args);
        } catch (error) {
            Logger.error(`Error executing command ${command.name}:`, error);

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.EMBED_ERROR)
                        .setDescription(`${EMOJIS.ERROR} Ocorreu um erro ao executar este comando.`)
                ]
            }).catch(() => { });
        }
    }
};
