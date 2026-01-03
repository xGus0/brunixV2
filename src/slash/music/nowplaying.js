// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /nowplaying Slash Command                        ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('[MUSIC] 🎶 Shows currently playing song'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        const track = player.queue.current;
        const position = player.position;
        const duration = track.info.duration;

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_MUSIC)
            .setAuthor({ name: '🎶 Tocando Agora' })
            .setTitle(truncate(track.info.title, 50))
            .setURL(track.info.uri || null)
            .setDescription(`**Artista:** ${track.info.author}\n**Duração:** ${formatDuration(position)} / ${formatDuration(duration)}`)
            .setThumbnail(track.info.artworkUrl || null)
            .setFooter({ text: `Solicitado por ${track.requester?.username || 'Sistema'}` });

        await interaction.reply({ embeds: [embed] });
    }
};
