// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Track Start Event (lavalink-client)                ║
// ║    Premium Now Playing + Dynamic Progress (Live Updates)            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import PlayCard from '../../canvas/templates/PlayCard.js';
import UserRepository from '../../database/repositories/UserRepository.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import HistoryRepository from '../../database/repositories/HistoryRepository.js';
import ArtistRepository from '../../database/repositories/ArtistRepository.js';
import SpotifyService from '../../services/SpotifyService.js';
import Logger from '../../utils/logger.js';
import { canControlPlayer } from '../../utils/musicPermission.js';
import { buildControls } from '../../utils/playerControls.js';

export default {
    name: 'trackStart',

    async execute(client, player, track) {
        Logger.music(`Now playing: ${track.info.title}`);

        const channel = client.channels.cache.get(player.textChannelId);
        if (!channel) return;

        // Skip now playing message for radio mode - radio has its own card
        if (player.radioMode) {
            Logger.info('Skipping Now Playing message (Radio Mode active)');
            return;
        }

        // Initialize states
        if (player.autoplay === undefined) player.autoplay = false;
        if (!player.playHistory) player.playHistory = [];

        // Clear previous update interval unconditionally
        this.clearUpdateInterval(player);

        // Check if play command already handled the message
        if (player.skipTrackStartMessage) {
            Logger.info('Skipping duplicate "Now Playing" message (handled by /play)');
            player.skipTrackStartMessage = false;

            // Still need to update states but we don't delete/send message
            // We assume play.js set values correctly, but we need to ensure enrichement handled later?
            // Actually, play.js sets 'nowPlayingMessage'. We should use it.
        } else {
            // Delete previous now playing message
            if (player.nowPlayingMessage) {
                try {
                    await player.nowPlayingMessage.delete();
                } catch { }
            }
        }

        // Get track info (lavalink-client uses track.info)
        const trackInfo = {
            title: track.info.title,
            author: track.info.author,
            uri: track.info.uri,
            thumbnail: track.info.artworkUrl,
            length: track.info.duration,
            requester: track.requester
        };

        // Save previous track to history
        if (player.data?.previousTrack?.title) {
            const lastInHistory = player.playHistory[player.playHistory.length - 1];
            if (!lastInHistory || lastInHistory.uri !== player.data.previousTrack.uri) {
                player.playHistory.push(player.data.previousTrack);
                if (player.playHistory.length > 20) {
                    player.playHistory.shift();
                }
            }
        }

        // Save current track for autoplay reference
        if (!player.data) player.data = {};
        player.data.previousTrack = {
            title: trackInfo.title,
            author: trackInfo.author,
            uri: trackInfo.uri,
            thumbnail: trackInfo.thumbnail,
            length: trackInfo.length,
            searchSource: track.searchSource || null,
            requester: track.requester || null
        };

        // Save original search source for autoplay
        if (track.searchSource && !player.originalSearchSource) {
            player.originalSearchSource = track.searchSource;
            Logger.info(`Player: Set original search source to "${track.searchSource}"`);
        }

        // Save original requester for autoplay
        if (track.requester && !player.originalRequester) {
            player.originalRequester = track.requester;
            Logger.info(`Player: Set original requester to "${track.requester.username}"`);
        }

        // ═══════════════════════════════════════════════════════════════
        // ENRICH TRACK WITH SPOTIFY METADATA
        // ═══════════════════════════════════════════════════════════════
        let enrichedData = null;
        try {
            enrichedData = await SpotifyService.enrichTrackMetadata(trackInfo.title, trackInfo.author);
            if (enrichedData) {
                trackInfo.cleanTitle = enrichedData.name;
                trackInfo.cleanAuthor = enrichedData.artist;
                trackInfo.album = enrichedData.album;
                trackInfo.spotifyThumbnail = enrichedData.albumArt;
                trackInfo.explicit = enrichedData.explicit;
                trackInfo.popularity = enrichedData.popularity;

                Logger.info(`Spotify: Enriched "${trackInfo.title}" -> "${enrichedData.name}" by ${enrichedData.artist}`);
            }
        } catch (err) {
            Logger.warn(`Spotify enrichment failed for "${trackInfo.title}": ${err.message}`);
        }

        // Check favorite status
        let isFavorited = false;
        if (track.requester?.id) {
            try {
                const favoriteRepo = new FavoriteRepository(client.db);
                isFavorited = await favoriteRepo.exists(track.requester.id, trackInfo.uri);
            } catch { }
        }

        try {
            // Use spotifyMetadata if available (from play.js dual search system)
            // Otherwise use enriched data from SpotifyService, or raw track info
            const spMeta = track.spotifyMetadata;
            const displayTitle = spMeta?.title || trackInfo.cleanTitle || trackInfo.title;
            const displayAuthor = spMeta?.author || trackInfo.cleanAuthor || trackInfo.author;
            const displayThumbnail = spMeta?.artworkUrl || trackInfo.spotifyThumbnail || trackInfo.thumbnail;
            const displayAlbum = trackInfo.album || null;

            // Determine display source
            // Priority: searchSource on track > originalSearchSource on player > default
            const displaySource = track.searchSource || player.originalSearchSource || 'Spotify';

            // Generate Canvas
            const canvas = await PlayCard.generate({
                title: displayTitle,
                author: displayAuthor,
                album: displayAlbum,
                duration: trackInfo.length,
                currentTime: 0,
                thumbnail: displayThumbnail,
                requester: track.requester?.username || 'Sistema',
                source: displaySource,
                isQueued: false,
                explicit: trackInfo.explicit || false
            });

            const attachment = new AttachmentBuilder(canvas, { name: 'nowplaying.png' });
            const components = buildControls(player, isFavorited);

            let message;

            if (player.skipTrackStartMessage) {
                // Message already sent by play.js
                message = player.nowPlayingMessage;
                player.skipTrackStartMessage = false; // Reset flag
            } else {
                message = await channel.send({
                    files: [attachment],
                    components
                });
            }

            player.nowPlayingMessage = message;
            player.currentTrackFavorited = isFavorited;
            player.currentTrackInfo = {
                ...trackInfo,
                displayTitle,
                displayAuthor,
                displayThumbnail,
                source: displaySource
            };

            // Start Progress Update Loop
            this.startUpdateInterval(player, trackInfo);

            // Note: Button interactions are handled globally by interactionCreate.js

        } catch (error) {
            Logger.error('Track start error:', error);
            const message = await channel.send({
                embeds: [
                    new EmbedBuilder().setTitle(truncate(trackInfo.title, 50)).setColor(COLORS.EMBED_MUSIC)
                ]
            });
            player.nowPlayingMessage = message;
        }

        // Stats & History
        try {
            const userRepo = new UserRepository(client.db);
            const historyRepo = new HistoryRepository(client.db);
            const artistRepo = new ArtistRepository(client.db);

            if (track.requester?.id) {
                const userId = track.requester.id;

                await userRepo.incrementStats(userId, 1, trackInfo.length);

                await historyRepo.add(userId, {
                    title: trackInfo.title,
                    author: trackInfo.author,
                    uri: trackInfo.uri,
                    thumbnail: trackInfo.thumbnail
                });

                (async () => {
                    try {
                        const existingArtist = await artistRepo.getByName(trackInfo.author);
                        if (!existingArtist) {
                            const spotifyArtist = await SpotifyService.searchArtist(trackInfo.author);
                            if (spotifyArtist?.images?.length > 0) {
                                await artistRepo.save(trackInfo.author, spotifyArtist.images[0].url, spotifyArtist.id);
                                Logger.db(`Saved artist image for ${trackInfo.author}`);
                            } else {
                                await artistRepo.save(trackInfo.author, null, null);
                            }
                        }
                    } catch (err) {
                        Logger.warn(`Failed to update artist cache for ${trackInfo.author}: ${err.message}`);
                    }
                })();
            }
        } catch { }
    },

    startUpdateInterval(player, trackInfo) {
        player.updateInterval = setInterval(async () => {
            if (!player.playing || player.paused || !player.nowPlayingMessage) return;
            const currentPosition = player.position;
            if (trackInfo.length && (trackInfo.length - currentPosition) < 5000) return;

            await this.updateNowPlaying(player, trackInfo);
        }, 15000);
    },

    async updateNowPlaying(player, trackInfo) {
        if (!player.nowPlayingMessage) return;
        try {
            const displayTitle = trackInfo.cleanTitle || trackInfo.title;
            const displayAuthor = trackInfo.cleanAuthor || trackInfo.author;
            const displayThumbnail = trackInfo.spotifyThumbnail || trackInfo.thumbnail;
            const displayAlbum = trackInfo.album || null;

            const canvas = await PlayCard.generate({
                title: displayTitle,
                author: displayAuthor,
                album: displayAlbum,
                duration: trackInfo.length,
                currentTime: player.position,
                thumbnail: displayThumbnail,
                requester: trackInfo.requester?.username || 'Sistema',
                source: player.currentTrackInfo?.searchSource || 'Spotify',
                isQueued: false,
                isPaused: player.paused,
                explicit: trackInfo.explicit || false
            });
            const attachment = new AttachmentBuilder(canvas, { name: 'nowplaying.png' });
            const components = buildControls(player, player.currentTrackFavorited);

            await player.nowPlayingMessage.edit({
                files: [attachment],
                components
            });
        } catch (error) {
            this.clearUpdateInterval(player);
        }
    },

    clearUpdateInterval(player) {
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }
    },



    async updateButtons(player, isFavorited) {
        if (!player.nowPlayingMessage) return;
        try {
            const components = buildControls(player, isFavorited);
            await player.nowPlayingMessage.edit({ components });
        } catch { }
    },

    async handleInteraction(client, interaction, player, trackInfo) {
        const currentPlayer = client.lavalink.players.get(interaction.guildId);
        if (!currentPlayer) return interaction.reply({ content: '❌ Player inativo.', ephemeral: true });

        const customId = interaction.customId;

        const protectedActions = ['player_pause', 'player_skip', 'player_stop', 'player_shuffle'];

        if (protectedActions.includes(customId)) {
            if (!canControlPlayer(currentPlayer, interaction.member)) {
                const trackOwner = currentPlayer.queue.current?.requester;
                return interaction.reply({
                    content: `🔒 Apenas <@${trackOwner?.id}>, admins ou DJs podem usar este controle.`,
                    ephemeral: true
                });
            }
        }

        try {
            switch (customId) {
                case 'player_pause':
                    await interaction.deferUpdate();
                    const wasPaused = currentPlayer.paused;

                    if (wasPaused) {
                        await currentPlayer.resume();
                    } else {
                        await currentPlayer.pause();
                    }

                    await this.updateNowPlaying(currentPlayer, currentPlayer.currentTrackInfo || trackInfo);
                    await this.updateButtons(currentPlayer, currentPlayer.currentTrackFavorited);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `${!wasPaused ? '⏸️' : '▶️'} **${interaction.user.username}** ${!wasPaused ? 'pausou' : 'retomou'} a música.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_skip':
                    await currentPlayer.skip();
                    await interaction.reply({ content: '⏭️ Skipped!', ephemeral: true });
                    this.clearUpdateInterval(currentPlayer);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_SUCCESS).setDescription(
                            `⏭️ **${interaction.user.username}** pulou a música.`
                        )]
                    });
                    break;

                case 'player_stop':
                    this.clearUpdateInterval(currentPlayer);
                    await currentPlayer.destroy();
                    await interaction.reply({ content: '⏹️ Stopped!', ephemeral: true });

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_WARNING).setDescription(
                            `⏹️ **${interaction.user.username}** parou a música e limpou a fila.`
                        )]
                    });
                    break;

                case 'player_loop':
                    const modes = ['off', 'track', 'queue'];
                    const currentMode = currentPlayer.repeatMode || 'off';
                    const nextMode = modes[(modes.indexOf(currentMode) + 1) % 3];
                    await currentPlayer.setRepeatMode(nextMode);

                    const loopEmoji = nextMode === 'track' ? '🔂' : (nextMode === 'queue' ? '🔁' : '➡️');
                    const loopText = nextMode === 'track' ? 'Loop Música' : (nextMode === 'queue' ? 'Loop Fila' : 'Loop Desativado');

                    await interaction.reply({ content: `Mode: ${nextMode}`, ephemeral: true });
                    await this.updateButtons(currentPlayer, currentPlayer.currentTrackFavorited);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `${loopEmoji} **${interaction.user.username}** alterou o modo para: **${loopText}**`
                        )]
                    });
                    break;

                case 'player_autoplay':
                    currentPlayer.autoplay = !currentPlayer.autoplay;

                    // Clear history when disabling autoplay
                    if (!currentPlayer.autoplay) {
                        currentPlayer.autoplayHistory = new Set();
                        Logger.info('Autoplay: History cleared');
                    } else {
                        Logger.info('Autoplay: Enabled (will use last played track as reference)');
                    }

                    await interaction.reply({ content: `Autoplay: ${currentPlayer.autoplay ? 'ON' : 'OFF'}`, ephemeral: true });
                    await this.updateButtons(currentPlayer, currentPlayer.currentTrackFavorited);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `📻 **${interaction.user.username}** ${currentPlayer.autoplay ? 'ativou' : 'desativou'} o Autoplay.`
                        )]
                    });
                    break;

                case 'player_favorite':
                    await this.handleFavorite(client, interaction, currentPlayer, trackInfo);
                    break;

                case 'player_lyrics':
                    await this.handleLyrics(client, interaction, trackInfo);
                    break;

                case 'player_shuffle':
                    currentPlayer.queue.shuffle();
                    currentPlayer.shuffled = !currentPlayer.shuffled;  // Toggle shuffle state
                    await interaction.reply({ content: `🔀 Shuffle: ${currentPlayer.shuffled ? 'Ativado' : 'Desativado'}`, ephemeral: true });
                    await this.updateButtons(currentPlayer, currentPlayer.currentTrackFavorited);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `🔀 **${interaction.user.username}** ${currentPlayer.shuffled ? 'ativou o shuffle' : 'embaralhou a fila'}.`
                        )]
                    });
                    break;

                case 'player_queue':
                    await interaction.reply({ content: 'Use o comando !queue para ver a fila completa.', ephemeral: true });
                    break;

                case 'player_addplaylist':
                    await this.handleAddToPlaylist(client, interaction, trackInfo);
                    break;
            }
        } catch (error) {
            if (!interaction.replied) interaction.reply({ content: '❌ Error', ephemeral: true });
        }
    },

    async handleFavorite(client, interaction, player, trackInfo) {
        const favoriteRepo = new FavoriteRepository(client.db);
        const exists = await favoriteRepo.exists(interaction.user.id, trackInfo.uri);

        if (exists) {
            await favoriteRepo.remove(interaction.user.id, trackInfo.uri);
            player.currentTrackFavorited = false;
            await interaction.reply({ content: '🤍 Removido dos favoritos', ephemeral: true });
        } else {
            await favoriteRepo.add(interaction.user.id, {
                title: trackInfo.title,
                author: trackInfo.author,
                uri: trackInfo.uri,
                thumbnail: trackInfo.thumbnail,
                duration: trackInfo.length
            });
            player.currentTrackFavorited = true;
            await interaction.reply({ content: '💖 Adicionado aos favoritos', ephemeral: true });
        }
        await this.updateButtons(player, player.currentTrackFavorited);
    },

    async handleAddToPlaylist(client, interaction, trackInfo) {
        const PlaylistRepository = (await import('../../database/repositories/PlaylistRepository.js')).default;
        const playlistRepo = new PlaylistRepository(client.db);
        const playlists = await playlistRepo.getUserPlaylists(interaction.user.id);

        if (playlists.length === 0) return interaction.reply({ content: '❌ Sem playlists. Crie uma com !playlist', ephemeral: true });

        await interaction.reply({ content: 'Use !playlist add para adicionar esta música.', ephemeral: true });
    },

    async handleLyrics(client, interaction, trackInfo) {
        await interaction.deferReply({ ephemeral: true });
        try {
            const cleanText = (text) => {
                if (!text) return '';
                return text
                    .replace(/\(.*?\)|\[.*?\]/g, '')
                    .replace(/official\s*(video|audio|music\s*video|mv|lyric\s*video)?/gi, '')
                    .replace(/lyrics?\s*(video)?/gi, '')
                    .replace(/\b(hd|hq|4k|8k|remastered|remaster|live|acoustic|remix)\b/gi, '')
                    .replace(/\bft\.?\s*|\bfeat\.?\s*|\bfeaturing\s*/gi, '')
                    .replace(/\s*[-–]\s*Topic$/i, '')
                    .replace(/VEVO$/i, '')
                    .replace(/[|\\\/]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            const artist = cleanText(trackInfo.author);
            const title = cleanText(trackInfo.title);

            if (!artist || !title) {
                return interaction.editReply({ content: '❌ Não foi possível extrair artista/título.' });
            }

            const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
            let res = await fetch(url);

            if (!res.ok) {
                const altUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`;
                res = await fetch(altUrl);
            }

            if (!res.ok) {
                return interaction.editReply({ content: `❌ Letra não encontrada para: **${artist} - ${title}**` });
            }

            const data = await res.json();
            if (!data.lyrics) return interaction.editReply({ content: '❌ Letra não encontrada' });

            await this.sendPaginatedLyrics(interaction, trackInfo, data.lyrics);
        } catch {
            await interaction.editReply({ content: '❌ Erro ao buscar letra.' });
        }
    },

    async sendPaginatedLyrics(interaction, trackInfo, lyrics) {
        const LINES_PER_PAGE = 15;

        lyrics = lyrics.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        const lines = lyrics.split('\n');

        const pages = [];
        for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
            pages.push(lines.slice(i, i + LINES_PER_PAGE).join('\n'));
        }

        const displayTitle = truncate(trackInfo.title, 50);

        if (pages.length === 1) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.EMBED_DEFAULT)
                        .setAuthor({ name: `📝 ${displayTitle}` })
                        .setDescription(pages[0])
                        .setFooter({ text: 'Powered by Lyrics.ovh' })
                ],
                components: []
            });
        }

        let currentPage = 0;

        const buildEmbed = (page) => {
            return new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setAuthor({ name: `📝 ${displayTitle}` })
                .setDescription(pages[page])
                .setFooter({ text: `Página ${page + 1}/${pages.length} • Powered by Lyrics.ovh` });
        };

        const buildButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lyrics_first')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('lyrics_prev')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('lyrics_page')
                    .setLabel(`${page + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('lyrics_next')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('lyrics_last')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === pages.length - 1)
            );
        };

        await interaction.editReply({
            embeds: [buildEmbed(currentPage)],
            components: [buildButtons(currentPage)]
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        collector.on('collect', async (btnInteraction) => {
            switch (btnInteraction.customId) {
                case 'lyrics_first': currentPage = 0; break;
                case 'lyrics_prev': currentPage = Math.max(0, currentPage - 1); break;
                case 'lyrics_next': currentPage = Math.min(pages.length - 1, currentPage + 1); break;
                case 'lyrics_last': currentPage = pages.length - 1; break;
            }

            await btnInteraction.update({
                embeds: [buildEmbed(currentPage)],
                components: [buildButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            interaction.editReply({
                embeds: [buildEmbed(currentPage).setFooter({ text: `Página ${currentPage + 1}/${pages.length} • Expirado` })],
                components: []
            }).catch(() => { });
        });
    }
};
