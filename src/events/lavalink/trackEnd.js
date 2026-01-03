// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Track End Event (lavalink-client)                  ║
// ║           Notification when track ends or is skipped               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';
import { truncate, formatDuration } from '../../utils/formatters.js';

export default {
    name: 'trackEnd',

    async execute(client, player, track, payload) {
        const reason = payload?.reason || 'FINISHED';
        Logger.music(`Track ended in guild ${player.guildId} - Reason: ${reason}`);

        // Clear update interval
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }

        const channel = client.channels.cache.get(player.textChannelId);
        if (!channel || !track) return;

        // Get track info
        const trackInfo = {
            title: track.info?.title || 'Unknown',
            author: track.info?.author || 'Unknown',
            thumbnail: track.info?.artworkUrl || null
        };

        // Check next track
        const nextTrack = player.queue.tracks[0];
        const hasNextTrack = player.queue.tracks.length > 0;

        // Determine action
        const wasSkipped = reason === 'replaced' || reason === 'stopped';
        const emoji = wasSkipped ? '⏭️' : '✅';
        const action = wasSkipped ? 'Pulada' : 'Finalizada';

        try {
            const embed = new EmbedBuilder()
                .setColor(wasSkipped ? COLORS.EMBED_WARNING : COLORS.EMBED_SUCCESS)
                .setAuthor({ name: `${emoji} Música ${action}` })
                .setDescription(`**${truncate(trackInfo.title, 50)}**\n${trackInfo.author}`)
                .setThumbnail(trackInfo.thumbnail)
                .setTimestamp();

            if (hasNextTrack && nextTrack) {
                embed.addFields({
                    name: '⏭️ Próxima na Fila',
                    value: `**${truncate(nextTrack.info?.title || 'Unknown', 45)}**\n└ ${nextTrack.info?.author || 'Unknown'} • ${formatDuration(nextTrack.info?.duration || 0)}`,
                    inline: false
                });
            } else if (player.autoplay) {
                embed.addFields({
                    name: '🔄 Autoplay',
                    value: 'Buscando música similar...',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📋 Fila',
                    value: 'Vazia - use `!play` para adicionar mais músicas',
                    inline: false
                });
            }

            await channel.send({ embeds: [embed] });

        } catch (error) {
            Logger.error('TrackEnd event error:', error);
        }
    }
};
