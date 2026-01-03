// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Track End Event (lavalink-client)                  ║
// ║         Smart Loop Detection & Elegant Notifications                ║
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

        // Check loop mode
        const isLooping = player.repeatMode !== 'off';
        const isTrackLoop = player.repeatMode === 'track';
        const isQueueLoop = player.repeatMode === 'queue';

        // Check next track
        const nextTrack = player.queue.tracks[0];
        const hasNextTrack = player.queue.tracks.length > 0;

        // Determine action
        const wasSkipped = reason === 'replaced' || reason === 'stopped';

        try {
            let embed;

            // ═══════════════════════════════════════════════════════════
            // LOOP MODES - Mensagens sofisticadas
            // ═══════════════════════════════════════════════════════════
            if (isTrackLoop && !wasSkipped) {
                // Loop de música única
                embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_INFO)
                    .setAuthor({
                        name: '🔂 Repetindo Música',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(`**${truncate(trackInfo.title, 50)}**\n${trackInfo.author}`)
                    .setThumbnail(trackInfo.thumbnail)
                    .addFields({
                        name: '♾️ Modo Loop',
                        value: '*Esta música será repetida indefinidamente*\n└ Use **Loop Off** para desativar',
                        inline: false
                    })
                    .setFooter({ text: '🔁 Loop de Música Ativo' })
                    .setTimestamp();

            } else if (isQueueLoop && !wasSkipped && !hasNextTrack) {
                // Loop de fila (voltando ao início)
                embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_INFO)
                    .setAuthor({
                        name: '🔁 Reiniciando Fila',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setDescription(`**${truncate(trackInfo.title, 50)}**\n${trackInfo.author}`)
                    .setThumbnail(trackInfo.thumbnail)
                    .addFields({
                        name: '♾️ Loop de Fila',
                        value: '*A fila será repetida desde o início*\n└ Use **Loop Off** para desativar',
                        inline: false
                    })
                    .setFooter({ text: '🔁 Loop de Fila Ativo' })
                    .setTimestamp();

                // ═══════════════════════════════════════════════════════════
                // NORMAL MODES - Mensagens padrão
                // ═══════════════════════════════════════════════════════════
            } else {
                const emoji = wasSkipped ? '⏭️' : '✅';
                const action = wasSkipped ? 'Pulada' : 'Finalizada';

                embed = new EmbedBuilder()
                    .setColor(wasSkipped ? COLORS.EMBED_WARNING : COLORS.EMBED_SUCCESS)
                    .setAuthor({ name: `${emoji} Música ${action}` })
                    .setDescription(`**${truncate(trackInfo.title, 50)}**\n${trackInfo.author}`)
                    .setThumbnail(trackInfo.thumbnail)
                    .setTimestamp();

                // Próxima música ou autoplay
                if (hasNextTrack && nextTrack) {
                    embed.addFields({
                        name: '⏭️ Próxima na Fila',
                        value: `**${truncate(nextTrack.info?.title || 'Unknown', 45)}**\n└ ${nextTrack.info?.author || 'Unknown'} • ${formatDuration(nextTrack.info?.duration || 0)}`,
                        inline: false
                    });
                } else if (player.autoplay) {
                    embed.addFields({
                        name: '🔄 Autoplay Ativo',
                        value: '*Buscando músicas similares...*',
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: '📋 Fila Vazia',
                        value: 'Use `!play` para adicionar mais músicas',
                        inline: false
                    });
                }
            }

            await channel.send({ embeds: [embed] });

        } catch (error) {
            Logger.error('TrackEnd event error:', error);
        }
    }
};
