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
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();

        // Don't autocomplete URLs
        if (focusedValue.startsWith('http')) {
            return interaction.respond([]);
        }

        // Minimum 2 characters
        if (focusedValue.length < 2) {
            return interaction.respond([
                { name: '🔍 Type at least 2 characters...', value: 'waiting...' }
            ]);
        }

        try {
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
                const title = truncate(track.info.title, 45);
                const artist = truncate(track.info.author, 25);
                const duration = formatDuration(track.info.duration);

                return {
                    name: `${title} - ${artist} (${duration})`,
                    value: `${track.info.author} - ${track.info.title}` // Exact search
                };
            });

            await interaction.respond(choices);

        } catch (error) {
            Logger.error('Autocomplete error:', error);
            return interaction.respond([
                { name: '❌ Search error', value: focusedValue }
            ]);
        }
    },

    /**
     * Execute - Handle the /play command
     */
    async execute(interaction) {
        const query = interaction.options.getString('query');

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
                const track = spotifyResult.tracks[0]; // Auto-select first result

                // Step 2: Resolve to YouTube Music
                const ytQuery = `${track.info.author} ${track.info.title}`;
                const ytResult = await player.search(
                    { query: ytQuery, source: AUDIO_SOURCE },
                    interaction.user
                );

                if (!ytResult.tracks?.length) {
                    return interaction.editReply({
                        embeds: [Embed.error('Não foi possível encontrar o áudio desta música.')]
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

                await interaction.editReply({ files: [attachment] });

                if (!player.playing && !player.paused) {
                    await player.play();
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
