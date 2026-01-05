// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /play Slash Command                              ║
// ║       Spotify Metadata + YouTube Audio + Smart Autocomplete         ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { checkVoiceChannel, canJoinChannel } from '../../utils/permissions.js';
import { isURL } from '../../utils/validators.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import Logger from '../../utils/logger.js';
import PlayCard from '../../canvas/templates/PlayCard.js';
import Embed from '../../utils/embed.js';
import HistoryRepository from '../../database/repositories/HistoryRepository.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import { buildControls } from '../../utils/playerControls.js';

const METADATA_SOURCE = 'spsearch';  // Spotify for metadata
const AUDIO_SOURCE = 'ytmsearch';    // YouTube Music for audio

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('[MUSIC] 🎵 Plays a song or playlist')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, artist or URL')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    /**
     * Autocomplete - Real-time song search as user types
     * Shows recent tracks and favorites when empty, search results when typing
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().trim();

        // Don't autocomplete URLs
        if (focusedValue.startsWith('http')) {
            return interaction.respond([]);
        }

        try {
            // Show recent tracks and favorites when empty or minimal input
            if (focusedValue.length < 2) {
                const choices = await this.getRecentAndFavorites(interaction);
                return interaction.respond(choices);
            }

            // Search with Lavalink
            const node = interaction.client.lavalink.nodeManager.leastUsedNodes()[0];
            if (!node) {
                return interaction.respond([
                    { name: '❌ Music server offline', value: focusedValue }
                ]);
            }

            // Search with Spotify for clean metadata
            const result = await node.search(
                { query: focusedValue, source: METADATA_SOURCE },
                interaction.user
            );

            if (!result.tracks?.length) {
                return interaction.respond([
                    { name: `❌ No results for "${truncate(focusedValue, 50)}"`, value: focusedValue }
                ]);
            }

            // Top 25 results (Discord limit)
            const choices = result.tracks.slice(0, 25).map(track => {
                const title = track.info.title;
                const artist = track.info.author;
                const duration = formatDuration(track.info.duration);

                // Construir o valor (max 100 caracteres)
                const fullValue = `${artist} - ${title}`;
                const value = truncate(fullValue, 100);

                // Construir o nome (max 100 caracteres para display)
                const displayTitle = truncate(title, 40);
                const displayArtist = truncate(artist, 25);
                const name = `${displayTitle} - ${displayArtist} (${duration})`;

                return {
                    name: truncate(name, 100),
                    value: value
                };
            });

            await interaction.respond(choices);

        } catch (error) {
            Logger.error('Autocomplete error:', error);
            return interaction.respond([
                { name: '❌ Search error', value: focusedValue || 'error' }
            ]);
        }
    },

    /**
     * Get recent tracks and favorites for autocomplete suggestions
     */
    async getRecentAndFavorites(interaction) {
        const choices = [];
        const userId = interaction.user.id;

        try {
            // Get recent tracks from history
            if (interaction.client.db) {
                const historyRepo = new HistoryRepository(interaction.client.db);
                const favoriteRepo = new FavoriteRepository(interaction.client.db);

                // Get recent tracks (last 5)
                const recents = await historyRepo.getRecents(userId, 5);
                if (recents.length > 0) {
                    choices.push({
                        name: '📂 ── Recently Played ──',
                        value: 'section_recents'
                    });

                    recents.forEach(track => {
                        const displayName = `🕐 ${truncate(track.title, 35)} - ${truncate(track.author, 20)}`;
                        const value = `${track.author} - ${track.title}`;
                        choices.push({
                            name: truncate(displayName, 100),
                            value: truncate(value, 100)
                        });
                    });
                }

                // Get favorites (top 5)
                const favorites = await favoriteRepo.getAll(userId, 5);
                if (favorites.length > 0) {
                    choices.push({
                        name: '💖 ── Favorites ──',
                        value: 'section_favorites'
                    });

                    favorites.forEach(track => {
                        const displayName = `❤️ ${truncate(track.title, 35)} - ${truncate(track.author, 20)}`;
                        const value = `${track.author} - ${track.title}`;
                        choices.push({
                            name: truncate(displayName, 100),
                            value: truncate(value, 100)
                        });
                    });
                }
            }

            // If no history or favorites, show hint
            if (choices.length === 0) {
                choices.push({
                    name: '🔍 Type 2+ characters to search...',
                    value: 'waiting'
                });
            }

        } catch (error) {
            Logger.error('getRecentAndFavorites error:', error);
            choices.push({
                name: '🔍 Type 2+ characters to search...',
                value: 'waiting'
            });
        }

        return choices.slice(0, 25); // Discord limit
    },

    /**
     * Execute - Handle the /play command
     */
    async execute(interaction) {
        const query = interaction.options.getString('query');

        // Ignore placeholder values
        if (query === 'waiting' || query === 'section_recents' || query === 'section_favorites') {
            return interaction.reply({
                embeds: [Embed.error('Please select a song or type a search query.')],
                ephemeral: true
            });
        }

        // Voice channel validation
        const voiceCheck = checkVoiceChannel(interaction.member);
        if (!voiceCheck.inChannel) {
            return interaction.reply({
                embeds: [Embed.error(voiceCheck.error)],
                ephemeral: true
            });
        }

        const permCheck = canJoinChannel(voiceCheck.channel);
        if (!permCheck.canJoin) {
            return interaction.reply({
                embeds: [Embed.error(permCheck.error)],
                ephemeral: true
            });
        }

        const voiceChannel = voiceCheck.channel;

        try {
            // Defer reply for processing
            await interaction.deferReply();

            // Get or create player
            let player = interaction.client.lavalink.players.get(interaction.guild.id);

            if (!player) {
                player = await interaction.client.lavalink.createPlayer({
                    guildId: interaction.guild.id,
                    voiceChannelId: voiceChannel.id,
                    textChannelId: interaction.channel.id,
                    selfDeaf: true,
                    volume: 80
                });
                await player.connect();
            }

            player.originalSearchQuery = query;

            const isLink = isURL(query);

            // Handle URL
            if (isLink) {
                return await this.handleURL(interaction, player, query);
            }

            // Handle text search with dual system
            Logger.music(`Slash Play: Searching "${query}"`);

            // Step 1: Spotify metadata
            const spotifyResult = await player.search(
                { query, source: METADATA_SOURCE },
                interaction.user
            );

            if (spotifyResult.tracks?.length > 0) {
                const track = spotifyResult.tracks[0];

                // Step 2: Resolve to YouTube Music
                const ytQuery = `${track.info.author} ${track.info.title}`;
                const ytResult = await player.search(
                    { query: ytQuery, source: AUDIO_SOURCE },
                    interaction.user
                );

                if (!ytResult.tracks?.length) {
                    return interaction.editReply({
                        embeds: [Embed.error('Could not find audio for this track.')]
                    });
                }

                const ytTrack = ytResult.tracks[0];

                // Preserve Spotify metadata
                ytTrack.spotifyMetadata = {
                    title: track.info.title,
                    author: track.info.author,
                    artworkUrl: track.info.artworkUrl,
                    duration: track.info.duration
                };
                ytTrack.searchSource = 'Spotify';
                ytTrack.requester = interaction.user;

                // Add to queue
                const isQueued = player.playing;
                player.queue.add(ytTrack);

                // Generate canvas
                const metadata = ytTrack.spotifyMetadata;
                const cardBuffer = await PlayCard.generate({
                    title: truncate(metadata.title, 30),
                    author: metadata.author,
                    thumbnail: metadata.artworkUrl,
                    currentTime: 0,
                    duration: metadata.duration,
                    requester: interaction.user.username,
                    source: 'Spotify',
                    isQueued: isQueued,
                    explicit: false
                });

                const attachment = new AttachmentBuilder(cardBuffer, { name: 'play.png' });

                if (!player.playing && !player.paused) {
                    // ═══════════════════════════════════════════════════════════════
                    // STARTING PLAYBACK IMMEDIATELY
                    // ═══════════════════════════════════════════════════════════════

                    // Cleanup previous message
                    if (player.nowPlayingMessage) {
                        try { await player.nowPlayingMessage.delete(); } catch { }
                    }

                    // Check favorite status
                    let isFavorited = false;
                    try {
                        const favoriteRepo = new FavoriteRepository(interaction.client.db);
                        isFavorited = await favoriteRepo.exists(interaction.user.id, ytTrack.info.uri);
                    } catch { }

                    // Build controls
                    const components = buildControls(player, isFavorited);

                    // Send message with controls
                    const message = await interaction.editReply({
                        files: [attachment],
                        components: components
                    });

                    // Set player state so trackStart knows to skip sending a new message
                    player.nowPlayingMessage = message;
                    player.skipTrackStartMessage = true;
                    player.currentTrackFavorited = isFavorited; // Pre-set this

                    // Set currentTrackInfo for update interval
                    player.currentTrackInfo = {
                        title: ytTrack.info.title,
                        author: ytTrack.info.author,
                        uri: ytTrack.info.uri,
                        thumbnail: metadata.artworkUrl,
                        length: metadata.duration,
                        requester: interaction.user,
                        displayTitle: metadata.title,
                        displayAuthor: metadata.author,
                        displayThumbnail: metadata.artworkUrl,
                        source: 'Spotify'
                    };

                    await player.play();
                } else {
                    // Just adding to queue
                    await interaction.editReply({ files: [attachment] });
                }

            } else {
                // Fallback to YouTube Music
                const ytResult = await player.search(
                    { query, source: AUDIO_SOURCE },
                    interaction.user
                );

                if (!ytResult.tracks?.length) {
                    return interaction.editReply({
                        embeds: [Embed.error(`Nenhum resultado encontrado para: **${query}**`)]
                    });
                }

                const track = ytResult.tracks[0];
                track.searchSource = 'YouTube Music';
                track.requester = interaction.user;

                const isQueued = player.playing;
                player.queue.add(track);

                const embed = new EmbedBuilder()
                    .setColor(isQueued ? COLORS.EMBED_INFO : COLORS.EMBED_SUCCESS)
                    .setDescription(`${isQueued ? '📋 Adicionado' : '▶️ Tocando'}: **${truncate(track.info.title, 50)}**\n└ ${track.info.author} • Via YouTube Music`);

                await interaction.editReply({ embeds: [embed] });

                if (!player.playing && !player.paused) {
                    await player.play();
                }
            }

        } catch (error) {
            Logger.error('Slash play error:', error);

            const reply = {
                embeds: [Embed.error('Erro ao processar sua solicitação.')]
            };

            if (interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply({ ...reply, ephemeral: true });
            }
        }
    },

    async handleURL(interaction, player, url) {
        const result = await player.search({ query: url }, interaction.user);

        if (!result.tracks?.length) {
            return interaction.editReply({
                embeds: [Embed.error('URL inválida ou sem resultados.')]
            });
        }

        const displaySource = url.includes('spotify.com') ? 'Spotify' : 'YouTube Music';
        const isPlaylist = result.loadType === 'playlist';

        if (isPlaylist) {
            for (const track of result.tracks) {
                track.searchSource = displaySource;
                track.requester = interaction.user;
                player.queue.add(track);
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_SUCCESS)
                .setDescription(`📋 **${result.tracks.length}** músicas adicionadas da playlist **${result.playlist?.name || 'Playlist'}**\n└ Via ${displaySource}`);

            await interaction.editReply({ embeds: [embed] });
        } else {
            const track = result.tracks[0];
            track.searchSource = displaySource;
            track.requester = interaction.user;

            const isQueued = player.playing;
            player.queue.add(track);

            const embed = new EmbedBuilder()
                .setColor(isQueued ? COLORS.EMBED_INFO : COLORS.EMBED_SUCCESS)
                .setDescription(`${isQueued ? '📋 Adicionado' : '▶️ Tocando'}: **${truncate(track.info.title, 50)}**\n└ ${track.info.author} • Via ${displaySource}`);

            await interaction.editReply({ embeds: [embed] });
        }

        if (!player.playing && !player.paused) {
            await player.play();
        }
    }
};
