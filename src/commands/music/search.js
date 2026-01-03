// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       search Command                                ║
// ║   Spotify Metadata + YouTube Music Audio (Dual Search System)       ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';
import { checkVoiceChannel, canJoinChannel } from '../../utils/permissions.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import Logger from '../../utils/logger.js';
import PlayCard from '../../canvas/templates/PlayCard.js';

// ═══════════════════════════════════════════════════════════════════
// SEARCH STRATEGY:
// 1. Use spsearch (Spotify) to get clean metadata
// 2. When playing, resolve to ytmsearch (YouTube Music) for audio
// ═══════════════════════════════════════════════════════════════════
const SOURCES = {
    sp: { source: 'spsearch', name: 'Spotify', emoji: '🟢' },
    ytm: { source: 'ytmsearch', name: 'YouTube Music', emoji: '🟥' }
};

const DEFAULT_SOURCE = SOURCES.sp; // Spotify as default for better metadata
const AUDIO_SOURCE = 'ytmsearch'; // YouTube Music for reliable audio

export default {
    name: 'search',
    aliases: ['buscar', 'find', 'procurar'],
    description: 'Busca músicas no Spotify ou YouTube Music',
    usage: '[fonte:] <música>',
    category: 'music',
    cooldown: 3,

    async execute(client, message, args) {
        if (!args.length) {
            return message.reply({
                embeds: [
                    Embed.info(
                        `**💿 Uso:** \`!search <música>\`\n\n` +
                        `**Fontes disponíveis:**\n` +
                        `\`sp:\` ${SOURCES.sp.emoji} Spotify (padrão - melhores metadados)\n` +
                        `\`ytm:\` ${SOURCES.ytm.emoji} YouTube Music\n\n` +
                        `**Exemplo:** \`!search sp:Mariposa\``
                    )
                ]
            });
        }

        // Check voice channel (optional for search, required for play)
        const voiceCheck = checkVoiceChannel(message.member);
        const inVoice = voiceCheck.inChannel;

        // Parse engine prefix
        let query = args.join(' ');
        let selectedSource = DEFAULT_SOURCE;

        for (const [key, src] of Object.entries(SOURCES)) {
            if (query.toLowerCase().startsWith(`${key}:`)) {
                selectedSource = src;
                query = query.substring(key.length + 1).trim();
                break;
            }
        }

        if (!query) {
            return message.reply({ embeds: [Embed.error('Especifique uma música para buscar.')] });
        }

        try {
            Logger.music(`Search: Using source "${selectedSource.source}" for "${query}"`);

            // Get or create temporary player for search
            let player = client.lavalink.players.get(message.guild.id);

            if (!player && inVoice) {
                player = await client.lavalink.createPlayer({
                    guildId: message.guild.id,
                    voiceChannelId: voiceCheck.channel.id,
                    textChannelId: message.channel.id,
                    selfDeaf: true,
                    volume: 80
                });
            }

            // Use player.search if available, otherwise use node search
            let result;
            if (player) {
                result = await player.search({ query, source: selectedSource.source }, message.author);
            } else {
                // Search without player (just for display)
                const node = client.lavalink.nodeManager.leastUsedNodes()[0];
                if (!node) {
                    return message.reply({ embeds: [Embed.error('Nenhum node Lavalink disponível.')] });
                }
                result = await node.search({ query, source: selectedSource.source }, message.author);
            }

            if (!result.tracks?.length) {
                // Try fallback source
                const fallbackSource = selectedSource === SOURCES.sp ? SOURCES.ytm : SOURCES.sp;

                Logger.music(`Search: No results on ${selectedSource.name}, trying ${fallbackSource.name}`);

                let fallbackResult;
                if (player) {
                    fallbackResult = await player.search({ query, source: fallbackSource.source }, message.author);
                } else {
                    const node = client.lavalink.nodeManager.leastUsedNodes()[0];
                    fallbackResult = await node.search({ query, source: fallbackSource.source }, message.author);
                }

                if (!fallbackResult.tracks?.length) {
                    return message.reply({
                        embeds: [Embed.error(`Nenhum resultado encontrado para: **${query}**`)]
                    });
                }

                // Use fallback results
                return await this.displayResults(client, message, fallbackResult.tracks.slice(0, 10), query, fallbackSource, inVoice);
            }

            // Display results
            await this.displayResults(client, message, result.tracks.slice(0, 10), query, selectedSource, inVoice);

        } catch (error) {
            Logger.error('Search error:', error);
            await message.reply({ embeds: [Embed.error('Erro na busca.')] });
        }
    },

    /**
     * Display search results with select menu and provider switch
     */
    async displayResults(client, message, tracks, query, source, inVoice) {
        // Create select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('search_select')
            .setPlaceholder('🎵 Selecione uma música...')
            .addOptions(
                tracks.map((track, index) => ({
                    label: truncate(track.info?.title || 'Unknown', 95),
                    description: `${truncate(track.info?.author || 'Unknown', 40)} • ${formatDuration(track.info?.duration || 0)}`,
                    value: index.toString(),
                    emoji: source.emoji
                }))
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create provider switch button
        const alternativeSource = source === SOURCES.sp ? SOURCES.ytm : SOURCES.sp;

        const switchButton = new ButtonBuilder()
            .setCustomId(`search_switch_${alternativeSource === SOURCES.sp ? 'sp' : 'ytm'}`)
            .setLabel(`Buscar em ${alternativeSource.name}`)
            .setEmoji(alternativeSource.emoji)
            .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder().addComponents(switchButton);

        // Track list for embed
        const trackList = tracks.map((track, i) =>
            `\`${i + 1}.\` **${truncate(track.info?.title || 'Unknown', 40)}**\n└ ${track.info?.author || 'Unknown'} • ${formatDuration(track.info?.duration || 0)}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setAuthor({ name: `${source.emoji} ${source.name} • ${truncate(query, 30)}` })
            .setDescription(trackList)
            .setFooter({
                text: inVoice
                    ? `${tracks.length} resultados • Selecione para tocar`
                    : `${tracks.length} resultados • Entre em um canal de voz para tocar`
            });

        const reply = await message.reply({
            embeds: [embed],
            components: [selectRow, buttonRow]
        });

        // Store tracks for later use
        let cachedTracks = [...tracks];
        const cachedQuery = query;
        let currentSource = source;

        // Handle interactions
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            try {
                // Provider switch
                if (interaction.customId.startsWith('search_switch_')) {
                    const newSourceKey = interaction.customId.split('_')[2];
                    const newSource = SOURCES[newSourceKey];

                    await interaction.deferUpdate();

                    let player = client.lavalink.players.get(message.guild.id);
                    let newResult;

                    if (player) {
                        newResult = await player.search({ query: cachedQuery, source: newSource.source }, message.author);
                    } else {
                        const node = client.lavalink.nodeManager.leastUsedNodes()[0];
                        newResult = await node.search({ query: cachedQuery, source: newSource.source }, message.author);
                    }

                    if (!newResult.tracks?.length) {
                        return interaction.followUp({
                            content: `❌ Nenhum resultado em ${newSource.name}.`,
                            ephemeral: true
                        });
                    }

                    // Update with new results
                    const newTracks = newResult.tracks.slice(0, 10);
                    cachedTracks = [...newTracks];
                    currentSource = newSource;

                    const newSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('search_select')
                        .setPlaceholder('🎵 Selecione uma música...')
                        .addOptions(
                            newTracks.map((track, index) => ({
                                label: truncate(track.info?.title || 'Unknown', 95),
                                description: `${truncate(track.info?.author || 'Unknown', 40)} • ${formatDuration(track.info?.duration || 0)}`,
                                value: index.toString(),
                                emoji: newSource.emoji
                            }))
                        );

                    const newSelectRow = new ActionRowBuilder().addComponents(newSelectMenu);

                    const switchBackSource = newSource === SOURCES.sp ? SOURCES.ytm : SOURCES.sp;
                    const newSwitchButton = new ButtonBuilder()
                        .setCustomId(`search_switch_${switchBackSource === SOURCES.sp ? 'sp' : 'ytm'}`)
                        .setLabel(`Buscar em ${switchBackSource.name}`)
                        .setEmoji(switchBackSource.emoji)
                        .setStyle(ButtonStyle.Secondary);

                    const newButtonRow = new ActionRowBuilder().addComponents(newSwitchButton);

                    const newTrackList = newTracks.map((track, i) =>
                        `\`${i + 1}.\` **${truncate(track.info?.title || 'Unknown', 40)}**\n└ ${track.info?.author || 'Unknown'} • ${formatDuration(track.info?.duration || 0)}`
                    ).join('\n\n');

                    const newEmbed = new EmbedBuilder()
                        .setColor(COLORS.EMBED_DEFAULT)
                        .setAuthor({ name: `${newSource.emoji} ${newSource.name} • ${truncate(cachedQuery, 30)}` })
                        .setDescription(newTrackList)
                        .setFooter({ text: `${newTracks.length} resultados • Selecione para tocar` });

                    await reply.edit({
                        embeds: [newEmbed],
                        components: [newSelectRow, newButtonRow]
                    });

                    return;
                }

                // Song selection
                if (interaction.customId === 'search_select') {
                    const selectedTrack = cachedTracks[parseInt(interaction.values[0])];

                    if (!selectedTrack) {
                        return interaction.update({
                            embeds: [Embed.error('Seleção inválida.')],
                            components: []
                        });
                    }

                    // Check voice channel
                    const currentVoiceCheck = checkVoiceChannel(interaction.member);
                    if (!currentVoiceCheck.inChannel) {
                        return interaction.reply({
                            content: '❌ Você precisa estar em um canal de voz para tocar músicas!',
                            ephemeral: true
                        });
                    }

                    const permCheck = canJoinChannel(currentVoiceCheck.channel, client);
                    if (!permCheck.canJoin) {
                        return interaction.reply({ content: `❌ ${permCheck.error}`, ephemeral: true });
                    }

                    let player = client.lavalink.players.get(message.guild.id);

                    if (!player) {
                        player = await client.lavalink.createPlayer({
                            guildId: message.guild.id,
                            voiceChannelId: currentVoiceCheck.channel.id,
                            textChannelId: message.channel.id,
                            selfDeaf: true,
                            volume: 80
                        });
                        await player.connect();
                    }

                    const trackInfo = selectedTrack.info || {};
                    const isQueued = player.playing;

                    // ═══════════════════════════════════════════════════════════════
                    // DUAL SEARCH: If from Spotify, resolve to YouTube Music for audio
                    // ═══════════════════════════════════════════════════════════════
                    let trackToAdd = selectedTrack;
                    let displaySource = currentSource.name;

                    if (currentSource === SOURCES.sp) {
                        // Spotify track - resolve to YouTube Music for audio
                        const searchQuery = `${trackInfo.author} ${trackInfo.title}`;
                        Logger.music(`Search: Resolving Spotify to YouTube Music: "${searchQuery}"`);

                        const ytResult = await player.search({ query: searchQuery, source: AUDIO_SOURCE }, message.author);

                        if (ytResult.tracks?.length > 0) {
                            trackToAdd = ytResult.tracks[0];
                            // Preserve Spotify metadata
                            trackToAdd.spotifyMetadata = {
                                title: trackInfo.title,
                                author: trackInfo.author,
                                artworkUrl: trackInfo.artworkUrl,
                                duration: trackInfo.duration
                            };
                            displaySource = 'Spotify'; // Display as Spotify even though audio is YouTube
                        } else {
                            // Fallback: use original track (may not play correctly)
                            Logger.warn('Search: Could not resolve to YouTube Music, using Spotify track');
                            displaySource = 'YouTube Music'; // Changed because we're using fallback
                        }
                    }

                    trackToAdd.searchSource = displaySource;
                    trackToAdd.requester = message.author;
                    player.queue.add(trackToAdd);

                    // Use Spotify metadata for display if available
                    const displayInfo = trackToAdd.spotifyMetadata || trackInfo;

                    // Generate canvas card
                    try {
                        const cardBuffer = await PlayCard.generate({
                            title: displayInfo.title,
                            author: displayInfo.author,
                            thumbnail: displayInfo.artworkUrl || trackInfo.artworkUrl,
                            currentTime: 0,
                            duration: displayInfo.duration || trackInfo.duration,
                            requester: message.author.username,
                            source: displaySource,
                            isQueued: isQueued
                        });

                        const attachment = new AttachmentBuilder(cardBuffer, { name: 'search_result.png' });
                        const resultEmbed = new EmbedBuilder()
                            .setColor(isQueued ? COLORS.EMBED_INFO : COLORS.EMBED_SUCCESS);

                        if (isQueued) {
                            resultEmbed.setFooter({ text: `📋 Posição na fila: #${player.queue.tracks.length}` });
                        } else {
                            resultEmbed.setDescription('▶️ **Tocando Agora**');
                        }

                        await interaction.update({
                            embeds: [resultEmbed],
                            files: [attachment],
                            components: []
                        });

                    } catch (canvasError) {
                        Logger.error('Search canvas error:', canvasError);
                        await interaction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(COLORS.EMBED_SUCCESS)
                                    .setDescription(`✓ **${truncate(displayInfo.title, 45)}**\n└ ${displayInfo.author} • Via ${displaySource}`)
                            ],
                            components: []
                        });
                    }

                    if (!player.playing && !player.paused) {
                        await player.play();
                    }
                }

            } catch (error) {
                Logger.error('Search selection error:', error);
                await interaction.update({
                    embeds: [Embed.error('Erro ao processar.')],
                    components: []
                }).catch(() => { });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                reply.edit({
                    embeds: [Embed.info('⏰ Busca expirada.')],
                    components: []
                }).catch(() => { });
            }
        });
    }
};
