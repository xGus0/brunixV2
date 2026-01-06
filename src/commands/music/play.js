// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        play Command                                 ║
// ║   Spotify Metadata + YouTube Music Audio (Dual Search System)       ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';
import { checkVoiceChannel, canJoinChannel } from '../../utils/permissions.js';
import { isURL } from '../../utils/validators.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import Logger from '../../utils/logger.js';
import PlayCard from '../../canvas/templates/PlayCard.js';

// ═══════════════════════════════════════════════════════════════════
// SEARCH STRATEGY:
// 1. Use spsearch (Spotify) to get clean metadata (title, artist, thumbnail)
// 2. Use ytmsearch (YouTube Music) to get playable audio
// 3. Display "Via Spotify" on canvas when original search was Spotify
// ═══════════════════════════════════════════════════════════════════

const METADATA_SOURCE = 'spsearch';  // For getting clean metadata
const AUDIO_SOURCE = 'ytmsearch';    // For getting playable audio

export default {
    name: 'play',
    aliases: ['p', 'tocar'],
    category: 'music',
    description: 'Toca uma música ou playlist',
    usage: '<nome ou URL>',

    async execute(client, message, args) {
        const query = args.join(' ');
        if (!query) {
            return message.reply({
                embeds: [Embed.error('Você precisa fornecer o nome de uma música ou URL.')]
            });
        }

        // Voice channel check
        const voiceCheck = checkVoiceChannel(message.member);
        if (!voiceCheck.inChannel) {
            return message.reply({ embeds: [Embed.error(voiceCheck.error)] });
        }

        const permCheck = canJoinChannel(voiceCheck.channel);
        if (!permCheck.canJoin) {
            return message.reply({ embeds: [Embed.error(permCheck.error)] });
        }

        const voiceChannel = voiceCheck.channel;

        try {
            const isLink = isURL(query);
            let searchQuery = query;

            // Get or create player
            let player = client.lavalink.players.get(message.guild.id);

            if (!player) {
                player = await client.lavalink.createPlayer({
                    guildId: message.guild.id,
                    voiceChannelId: voiceChannel.id,
                    textChannelId: message.channel.id,
                    selfDeaf: true,
                    volume: 80
                });
                await player.connect();
            }

            // Save original search query for autoplay anti-repeat
            player.originalSearchQuery = query;

            // ═══════════════════════════════════════════════════════════════
            // DUAL SEARCH SYSTEM
            // ═══════════════════════════════════════════════════════════════

            if (isLink) {
                // Direct URL handling
                return await this.handleDirectURL(client, message, query, voiceChannel, player);
            }

            // Text search: Spotify metadata → YouTube Music audio
            Logger.music(`Play: Searching "${searchQuery}" - Getting Spotify metadata...`);

            // Step 1: Get Spotify metadata
            const spotifyResult = await player.search(
                { query: searchQuery, source: METADATA_SOURCE },
                message.author
            );

            if (spotifyResult.tracks?.length > 0) {
                // Found on Spotify - use metadata to search on YouTube Music
                const tracks = spotifyResult.tracks.slice(0, 10);
                await this.showSearchResults(client, message, tracks, query, voiceChannel, player, 'Spotify', 0);
            } else {
                // Fallback to YouTube Music directly
                Logger.music(`Play: Spotify search failed, trying YouTube Music directly...`);
                await this.handleYouTubeMusicSearch(client, message, query, voiceChannel, player);
            }

        } catch (error) {
            Logger.error('Play command error:', error);
            await message.reply({
                embeds: [Embed.error('Erro ao processar sua solicitação.')]
            });
        }
    },

    /**
     * Handle direct URL (Spotify, YouTube, etc)
     */
    async handleDirectURL(client, message, url, voiceChannel, player) {
        let displaySource = 'YouTube Music';

        // Detect source from URL
        if (url.includes('spotify.com')) {
            displaySource = 'Spotify';
        }

        Logger.music(`Play: Loading URL directly: ${url}`);

        const result = await player.search({ query: url }, message.author);

        if (!result.tracks?.length) {
            return message.reply({
                embeds: [Embed.error('Não foi possível carregar esta URL.')]
            });
        }

        // For Spotify URLs, we need to resolve each track to YouTube Music
        if (displaySource === 'Spotify') {
            return await this.resolveSpotifyToYouTube(client, message, result, voiceChannel, player);
        }

        // For other URLs, add directly
        return await this.addTracksToQueue(client, message, result.tracks, voiceChannel, player, displaySource, result.loadType === 'playlist', result.playlist?.name);
    },

    /**
     * Resolve Spotify tracks to YouTube Music for playable audio
     */
    async resolveSpotifyToYouTube(client, message, spotifyResult, voiceChannel, player) {
        const isPlaylist = spotifyResult.loadType === 'playlist';
        const spotifyTracks = isPlaylist ? spotifyResult.tracks : [spotifyResult.tracks[0]];

        const loadingMsg = await message.reply({
            embeds: [Embed.info(`🔄 Resolvendo ${spotifyTracks.length} música(s) do Spotify...`)]
        });

        const resolvedTracks = [];
        let failed = 0;

        for (const spTrack of spotifyTracks.slice(0, 50)) { // Limit to 50 tracks
            try {
                const searchQuery = `${spTrack.info.author} ${spTrack.info.title}`;
                const ytResult = await player.search(
                    { query: searchQuery, source: AUDIO_SOURCE },
                    message.author
                );

                if (ytResult.tracks?.length > 0) {
                    const ytTrack = ytResult.tracks[0];
                    // Preserve Spotify metadata but use YouTube audio
                    ytTrack.spotifyMetadata = {
                        title: spTrack.info.title,
                        author: spTrack.info.author,
                        artworkUrl: spTrack.info.artworkUrl,
                        duration: spTrack.info.duration
                    };
                    ytTrack.searchSource = 'Spotify';
                    ytTrack.requester = message.author;
                    resolvedTracks.push(ytTrack);
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        await loadingMsg.delete().catch(() => { });

        if (resolvedTracks.length === 0) {
            return message.reply({
                embeds: [Embed.error('Não foi possível resolver nenhuma música.')]
            });
        }

        await this.addTracksToQueue(client, message, resolvedTracks, voiceChannel, player, 'Spotify', isPlaylist, spotifyResult.playlist?.name);

        if (failed > 0) {
            message.channel.send({
                embeds: [Embed.warning(`⚠️ ${failed} música(s) não puderam ser resolvidas.`)]
            }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
        }
    },

    /**
     * Search directly on YouTube Music (fallback)
     */
    async handleYouTubeMusicSearch(client, message, query, voiceChannel, player) {
        const result = await player.search(
            { query, source: AUDIO_SOURCE },
            message.author
        );

        if (!result.tracks?.length) {
            return message.reply({
                embeds: [Embed.error(`Nenhum resultado encontrado para: **${query}**`)]
            });
        }

        const tracks = result.tracks.slice(0, 10);
        await this.showSearchResults(client, message, tracks, query, voiceChannel, player, 'YouTube Music', 0, true);
    },

    /**
     * Show search results with select menu
     * @param {boolean} isDirectYT - If true, tracks are already from YouTube Music
     */
    async showSearchResults(client, message, tracks, query, voiceChannel, player, displaySource, attemptIndex, isDirectYT = false) {
        const options = tracks.map((track, index) => ({
            label: truncate(track.info.title, 90),
            description: `${truncate(track.info.author, 35)} • ${formatDuration(track.info.duration)}`,
            value: index.toString(),
            emoji: displaySource === 'Spotify' ? '🟢' : '🟥'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('play_select')
            .setPlaceholder('🎵 Selecione uma música...')
            .addOptions(options);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Switch source button
        const alternateSource = displaySource === 'Spotify' ? 'YouTube Music' : 'Spotify';
        const alternateEmoji = displaySource === 'Spotify' ? '🟥' : '🟢';

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('play_retry')
                .setLabel(`Buscar em ${alternateSource}`)
                .setEmoji(alternateEmoji)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('play_cancel')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setColor(displaySource === 'Spotify' ? 0x1DB954 : 0xFF0000)
            .setAuthor({ name: `🎵 Resultados via ${displaySource}` });

        const reply = await message.reply({
            embeds: [embed],
            components: [selectRow, buttonRow]
        });

        // Collector
        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            // Cancel
            if (interaction.customId === 'play_cancel') {
                collector.stop('cancelled');
                return interaction.update({
                    embeds: [Embed.warning('Busca cancelada.')],
                    components: []
                });
            }

            // Retry with different source
            if (interaction.customId === 'play_retry') {
                await interaction.deferUpdate();
                collector.stop('retry');

                if (displaySource === 'Spotify') {
                    // Switch to YouTube Music
                    await this.handleYouTubeMusicSearch(client, message, query, voiceChannel, player);
                    await reply.delete().catch(() => { });
                } else {
                    // Switch to Spotify
                    const spResult = await player.search(
                        { query, source: METADATA_SOURCE },
                        message.author
                    );
                    if (spResult.tracks?.length > 0) {
                        await reply.delete().catch(() => { });
                        await this.showSearchResults(client, message, spResult.tracks.slice(0, 10), query, voiceChannel, player, 'Spotify', 0);
                    } else {
                        await interaction.editReply({ content: '❌ Nada encontrado no Spotify.' });
                    }
                }
                return;
            }

            // Song selection
            if (interaction.customId === 'play_select') {
                await interaction.deferUpdate().catch(() => { });

                const selectedIndex = parseInt(interaction.values[0]);
                const selectedTrack = tracks[selectedIndex];

                if (!selectedTrack) {
                    return interaction.editReply({
                        embeds: [Embed.error('Seleção inválida.')],
                        components: []
                    });
                }

                collector.stop('selected');

                // If from Spotify metadata, resolve to YouTube Music for audio
                if (displaySource === 'Spotify' && !isDirectYT) {
                    const searchQuery = `${selectedTrack.info.author} ${selectedTrack.info.title}`;
                    Logger.music(`Play: Resolving Spotify to YouTube Music: "${searchQuery}"`);

                    const ytResult = await player.search(
                        { query: searchQuery, source: AUDIO_SOURCE },
                        message.author
                    );

                    if (!ytResult.tracks?.length) {
                        return interaction.editReply({
                            embeds: [Embed.error('Não foi possível encontrar o áudio desta música.')],
                            components: []
                        });
                    }

                    const ytTrack = ytResult.tracks[0];
                    // Preserve Spotify metadata
                    ytTrack.spotifyMetadata = {
                        title: selectedTrack.info.title,
                        author: selectedTrack.info.author,
                        artworkUrl: selectedTrack.info.artworkUrl,
                        duration: selectedTrack.info.duration
                    };
                    ytTrack.searchSource = 'Spotify';
                    ytTrack.requester = message.author;

                    await this.addSingleTrack(client, interaction, ytTrack, voiceChannel, player, 'Spotify');
                } else {
                    // Already from YouTube Music
                    selectedTrack.searchSource = displaySource;
                    selectedTrack.requester = message.author;
                    await this.addSingleTrack(client, interaction, selectedTrack, voiceChannel, player, displaySource);
                }
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({
                    embeds: [Embed.warning('Tempo de seleção expirado.')],
                    components: []
                }).catch(() => { });
            }
        });
    },

    /**
     * Add a single track to queue
     */
    async addSingleTrack(client, interaction, track, voiceChannel, player, displaySource) {
        const isQueued = player.playing;
        player.queue.add(track);

        // Use Spotify metadata if available, otherwise use track info
        const metadata = track.spotifyMetadata || track.info;
        const trackInfo = {
            title: metadata.title,
            author: metadata.author,
            thumbnail: metadata.artworkUrl || track.info.artworkUrl,
            length: metadata.duration || track.info.duration
        };

        // Add to user's history (only manually searched tracks)
        try {
            const HistoryRepository = (await import('../../database/repositories/HistoryRepository.js')).default;
            const historyRepo = new HistoryRepository(client.db);
            await historyRepo.add(track.requester.id, {
                title: trackInfo.title,
                author: trackInfo.author,
                uri: track.info.uri,
                thumbnail: trackInfo.thumbnail
            });
        } catch (err) {
            Logger.error('Failed to add to history:', err);
        }

        if (!isQueued) {
            // Starting playback
            await interaction.editReply({
                content: `⏱️ Iniciando **${truncate(trackInfo.title, 35)}**...`,
                embeds: [],
                components: [],
                files: []
            }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        } else {
            // Generate Canvas Card for Queue
            try {
                const cardBuffer = await PlayCard.generate({
                    title: truncate(trackInfo.title, 25),
                    author: trackInfo.author,
                    thumbnail: trackInfo.thumbnail,
                    currentTime: 0,
                    duration: trackInfo.length || 0,
                    requester: track.requester?.username || 'Sistema',
                    source: displaySource, // Display "Spotify" even though audio is from YouTube
                    isQueued: true,
                    explicit: false
                });

                const attachment = new AttachmentBuilder(cardBuffer, { name: 'selection.png' });
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_INFO)
                    .setFooter({ text: `📋 Posição na fila: #${player.queue.tracks.length}` });

                await interaction.editReply({
                    embeds: [embed],
                    files: [attachment],
                    components: []
                });

            } catch (canvasError) {
                Logger.error('Play selection canvas error:', canvasError);
                await interaction.editReply({
                    embeds: [Embed.success(`📋 Na fila: **${truncate(trackInfo.title, 45)}**\n└ Via ${displaySource}`)],
                    components: []
                });
            }
        }

        if (!player.playing && !player.paused) {
            await player.play();
        }
    },

    /**
     * Add multiple tracks to queue
     */
    async addTracksToQueue(client, message, tracks, voiceChannel, player, displaySource, isPlaylist, playlistName) {
        // Add to user's history (only first track to avoid spam)
        if (tracks.length > 0) {
            try {
                const HistoryRepository = (await import('../../database/repositories/HistoryRepository.js')).default;
                const historyRepo = new HistoryRepository(client.db);
                const firstTrack = tracks[0];
                const metadata = firstTrack.spotifyMetadata || firstTrack.info;

                await historyRepo.add(message.author.id, {
                    title: metadata.title,
                    author: metadata.author,
                    uri: firstTrack.info.uri,
                    thumbnail: metadata.artworkUrl || firstTrack.info.artworkUrl
                });
            } catch (err) {
                Logger.error('Failed to add to history:', err);
            }
        }

        for (const track of tracks) {
            if (!track.searchSource) track.searchSource = displaySource;
            if (!track.requester) track.requester = message.author;
            player.queue.add(track);
        }

        const firstTrack = tracks[0];
        const metadata = firstTrack.spotifyMetadata || firstTrack.info;

        if (isPlaylist) {
            const embed = new EmbedBuilder()
                .setColor(displaySource === 'Spotify' ? 0x1DB954 : 0xFF0000)
                .setAuthor({ name: `${displaySource === 'Spotify' ? '🟢' : '🟥'} Playlist Adicionada` })
                .setTitle(truncate(playlistName || 'Playlist', 60))
                .setDescription(`**${tracks.length}** músicas adicionadas à fila`)
                .setThumbnail(metadata.artworkUrl || firstTrack.info.artworkUrl)
                .setFooter({ text: `Solicitado por ${message.author.username} • Via ${displaySource}`, iconURL: message.author.displayAvatarURL() });

            await message.reply({ embeds: [embed] });
        } else {
            try {
                const cardBuffer = await PlayCard.generate({
                    title: truncate(metadata.title, 25),
                    author: metadata.author,
                    thumbnail: metadata.artworkUrl || firstTrack.info.artworkUrl,
                    currentTime: 0,
                    duration: metadata.duration || firstTrack.info.duration || 0,
                    requester: message.author.username,
                    source: displaySource,
                    isQueued: player.playing,
                    explicit: false
                });

                const attachment = new AttachmentBuilder(cardBuffer, { name: 'track.png' });
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_SUCCESS)
                    .setImage('attachment://track.png');

                await message.reply({ embeds: [embed], files: [attachment] });
            } catch {
                await message.reply({
                    embeds: [Embed.success(`${displaySource === 'Spotify' ? '🟢' : '🟥'} Adicionado: **${truncate(metadata.title, 50)}**`)]
                });
            }
        }

        if (!player.playing && !player.paused) {
            await player.play();
        }
    }
};
