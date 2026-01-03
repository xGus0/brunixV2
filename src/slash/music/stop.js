// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /stop Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('[MUSIC] ⏹️ Stops playback and disconnects'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                embeds: [Embed.info('📭 Não estou conectado em nenhum canal de voz.')],
                ephemeral: true
            });
        }

        // Clean up
        if (player.nowPlayingMessage) {
            try { await player.nowPlayingMessage.delete(); } catch { }
        }

        if (player.updateInterval) {
            clearInterval(player.updateInterval);
        }

        await player.destroy();

        await interaction.reply({
            embeds: [Embed.success('⏹️ Reprodução finalizada! Até mais! 👋')]
        });
    }
};
