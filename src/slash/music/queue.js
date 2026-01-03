// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /queue Slash Command                             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('[MUSIC] 📋 Shows the music queue'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        const current = player.queue.current;
        const queue = player.queue.tracks;

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setAuthor({ name: '📋 Fila de Músicas', iconURL: interaction.guild.iconURL() })
            .setDescription(`**Tocando Agora:**\n🎵 ${truncate(current.info.title, 40)}\n└ ${current.info.author} • ${formatDuration(current.info.duration)}`);

        if (queue.length > 0) {
            const queueList = queue.slice(0, 10).map((track, i) =>
                `\`${i + 1}.\` ${truncate(track.info.title, 35)} - ${truncate(track.info.author, 20)}`
            ).join('\n');

            embed.addFields({
                name: `Próximas (${queue.length})`,
                value: queueList + (queue.length > 10 ? `\n\n*...e mais ${queue.length - 10} músicas*` : '')
            });
        } else {
            embed.addFields({ name: 'Fila', value: '*Vazia*' });
        }

        embed.setFooter({ text: `Total: ${queue.length + 1} música(s) • Loop: ${player.repeatMode || 'off'}` });

        await interaction.reply({ embeds: [embed] });
    }
};
