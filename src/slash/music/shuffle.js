// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /shuffle Slash Command                           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('[MUSIC] 🔀 Shuffles the music queue'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        if (player.queue.tracks.length === 0) {
            return interaction.reply({
                embeds: [Embed.error('A fila está vazia!')],
                ephemeral: true
            });
        }

        player.queue.shuffle();

        await interaction.reply({
            embeds: [Embed.success(`🔀 Fila embaralhada com sucesso! **${player.queue.tracks.length}** músicas reorganizadas.`)]
        });
    }
};
