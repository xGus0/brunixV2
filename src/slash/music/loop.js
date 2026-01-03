// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /loop Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('[MUSIC] 🔁 Sets repeat mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Repeat mode')
                .setRequired(true)
                .addChoices(
                    { name: '❌ Desativado', value: 'off' },
                    { name: '🔂 Música Atual', value: 'track' },
                    { name: '🔁 Fila Completa', value: 'queue' }
                )
        ),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        const mode = interaction.options.getString('mode');

        player.setRepeatMode(mode);

        const messages = {
            off: '❌ Repetição desativada!',
            track: '🔂 Repetindo a música atual!',
            queue: '🔁 Repetindo toda a fila!'
        };

        await interaction.reply({
            embeds: [Embed.success(messages[mode])]
        });
    }
};
