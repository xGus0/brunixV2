// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /search Slash Command                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import { checkVoiceChannel, canJoinChannel } from '../../utils/permissions.js';
import Embed from '../../utils/embed.js';
import PlayCard from '../../canvas/templates/PlayCard.js';

const METADATA_SOURCE = 'spsearch';
const AUDIO_SOURCE = 'ytmsearch';

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('[MUSIC] 🔍 Search songs with interactive results')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song or artist name')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Search source')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Spotify', value: 'spotify' },
                    { name: '🟥 YouTube Music', value: 'youtube' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const sourceChoice = interaction.options.getString('source') || 'spotify';
        const source = sourceChoice === 'spotify' ? METADATA_SOURCE : AUDIO_SOURCE;
        const sourceName = sourceChoice === 'spotify' ? 'Spotify' : 'YouTube Music';
        const sourceEmoji = sourceChoice === 'spotify' ? '🟢' : '🟥';

        try {
            const node = interaction.client.lavalink.nodeManager.leastUsedNodes()[0];
            if (!node) {
                return interaction.editReply({
                    embeds: [Embed.error('Nenhum servidor de música disponível no momento.')]
                });
            }

            const result = await node.search({ query, source }, interaction.user);

            if (!result.tracks?.length) {
                return interaction.editReply({
                    embeds: [Embed.error(`Nenhum resultado encontrado para: **${query}**`)]
                });
            }

            const tracks = result.tracks.slice(0, 10);

            // Create select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('search_select')
                .setPlaceholder('🎵 Selecione uma música...')
                .addOptions(
                    tracks.map((track, index) => ({
                        label: truncate(track.info.title, 95),
                        description: `${truncate(track.info.author, 40)} • ${formatDuration(track.info.duration)}`,
                        value: index.toString(),
                        emoji: sourceEmoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const trackList = tracks.map((track, i) =>
                `\`${i + 1}.\` **${truncate(track.info.title, 40)}**\n└ ${track.info.author} • ${formatDuration(track.info.duration)}`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setAuthor({ name: `${sourceEmoji} ${sourceName} • ${truncate(query, 30)}` })
                .setDescription(trackList)
                .setFooter({ text: `${tracks.length} resultados • Selecione uma música para tocar` });

            const message = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.customId !== 'search_select') return;

                const selectedIndex = parseInt(i.values[0]);
                const selectedTrack = tracks[selectedIndex];

                // Voice check
                const voiceCheck = checkVoiceChannel(i.member);
                if (!voiceCheck.inChannel) {
                    return i.reply({
                        content: '❌ Você precisa estar em um canal de voz!',
                        ephemeral: true
                    });
                }

                const permCheck = canJoinChannel(voiceCheck.channel);
                if (!permCheck.canJoin) {
                    return i.reply({ content: `❌ ${permCheck.error}`, ephemeral: true });
                }

                let player = interaction.client.lavalink.players.get(interaction.guild.id);

                if (!player) {
                    player = await interaction.client.lavalink.createPlayer({
                        guildId: interaction.guild.id,
                        voiceChannelId: voiceCheck.channel.id,
                        textChannelId: interaction.channel.id,
                        selfDeaf: true,
                        volume: 80
                    });
                    await player.connect();
                }

                // Dual search for Spotify
                let trackToAdd = selectedTrack;

                if (sourceChoice === 'spotify') {
                    const ytQuery = `${selectedTrack.info.author} ${selectedTrack.info.title}`;
                    const ytResult = await player.search({ query: ytQuery, source: AUDIO_SOURCE }, i.user);

                    if (ytResult.tracks?.length > 0) {
                        trackToAdd = ytResult.tracks[0];
                        trackToAdd.spotifyMetadata = {
                            title: selectedTrack.info.title,
                            author: selectedTrack.info.author,
                            artworkUrl: selectedTrack.info.artworkUrl,
                            duration: selectedTrack.info.duration
                        };
                    }
                }

                trackToAdd.searchSource = sourceName;
                trackToAdd.requester = i.user;

                const isQueued = player.playing;
                player.queue.add(trackToAdd);

                const metadata = trackToAdd.spotifyMetadata || trackToAdd.info;

                try {
                    const cardBuffer = await PlayCard.generate({
                        title: truncate(metadata.title, 30),
                        author: metadata.author,
                        thumbnail: metadata.artworkUrl,
                        currentTime: 0,
                        duration: metadata.duration,
                        requester: i.user.username,
                        source: sourceName,
                        isQueued: isQueued
                    });

                    const attachment = new AttachmentBuilder(cardBuffer, { name: 'search.png' });

                    await i.update({ files: [attachment], components: [] });

                } catch (error) {
                    const resultEmbed = new EmbedBuilder()
                        .setColor(COLORS.EMBED_SUCCESS)
                        .setDescription(`✓ **${truncate(metadata.title, 45)}**\n└ ${metadata.author} • Via ${sourceName}`);

                    await i.update({ embeds: [resultEmbed], components: [] });
                }

                if (!player.playing && !player.paused) {
                    await player.play();
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    message.edit({
                        embeds: [Embed.info('⏰ Busca expirada.')],
                        components: []
                    }).catch(() => { });
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            await interaction.editReply({
                embeds: [Embed.error('Erro ao buscar músicas.')]
            });
        }
    }
};
