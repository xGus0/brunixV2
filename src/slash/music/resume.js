// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /resume Slash Command                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('[MUSIC] ▶️ Resumes the paused song'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        if (!player.paused) {
            return interaction.reply({
                embeds: [Embed.error('A música não está pausada!')],
                ephemeral: true
            });
        }

        await player.resume();
        await interaction.reply({
            embeds: [Embed.success('▶️ Reprodução retomada!')]
        });
    }
};
