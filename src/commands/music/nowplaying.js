// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     nowplaying Command                              ║
// ║              Using PlayCard (same as play.js)                       ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Embed from '../../utils/embed.js';
import { formatDuration, truncate, createProgressBar } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import PlayCard from '../../canvas/templates/PlayCard.js';
import Logger from '../../utils/logger.js';

export default {
    name: 'nowplaying',
    aliases: ['np', 'tocando', 'playing', 'current'],
    description: 'Mostra a música atual com controles',
    category: 'music',
    cooldown: 3,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        if (!player || !player.queue.current) {
            return message.reply({
                embeds: [Embed.error('Não há música tocando!')]
            });
        }

        const track = player.queue.current;
        const trackInfo = track.info || {};
        const position = player.position;

        try {
            // Use PlayCard (same as play.js)
            const canvas = await PlayCard.generate({
                title: trackInfo.title,
                author: trackInfo.author,
                duration: trackInfo.duration,
                currentTime: position,
                thumbnail: trackInfo.artworkUrl,
                requester: track.requester?.username || 'Sistema',
                source: track.searchSource || 'Spotify',
                isQueued: false,
                isPaused: player.paused,
                explicit: false
            });

            const attachment = new AttachmentBuilder(canvas, { name: 'nowplaying.png' });

            // Player controls (same style as trackStart)
            const isPaused = player.paused;
            const loopMode = player.repeatMode || 'off';
            const isAutoplay = player.autoplay || false;
            const isFavorited = player.currentTrackFavorited || false;

            const getLoopStyle = () => {
                if (loopMode === 'track') return ButtonStyle.Primary;
                if (loopMode === 'queue') return ButtonStyle.Success;
                return ButtonStyle.Secondary;
            };

            const controlRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('player_pause')
                        .setEmoji(isPaused ? '▶️' : '⏸️')
                        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('player_loop')
                        .setEmoji(loopMode === 'track' ? '🔂' : '🔁')
                        .setStyle(getLoopStyle()),
                    new ButtonBuilder()
                        .setCustomId('player_autoplay')
                        .setEmoji('📻')
                        .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('player_favorite')
                        .setEmoji(isFavorited ? '💖' : '🤍')
                        .setStyle(isFavorited ? ButtonStyle.Danger : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_addplaylist')
                        .setEmoji('📁')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_queue')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('player_lyrics')
                        .setEmoji('📝')
                        .setStyle(ButtonStyle.Secondary)
                );

            await message.reply({
                files: [attachment],
                components: [controlRow, actionRow]
            });

        } catch (error) {
            Logger.error('Now playing error:', error);

            const progress = createProgressBar(position, trackInfo.duration);

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.EMBED_MUSIC)
                        .setAuthor({ name: '🎵 Tocando Agora' })
                        .setTitle(trackInfo.title)
                        .setURL(trackInfo.uri)
                        .setThumbnail(trackInfo.artworkUrl)
                        .addFields(
                            { name: 'Artista', value: trackInfo.author || 'Desconhecido', inline: true },
                            { name: 'Duração', value: `${formatDuration(position)} / ${formatDuration(trackInfo.duration)}`, inline: true }
                        )
                        .setDescription(progress)
                ]
            });
        }
    }
};

