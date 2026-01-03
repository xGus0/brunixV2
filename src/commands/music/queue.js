// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        queue Command                                ║
// ║             Simple Embed Queue (No Canvas)                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';

export default {
    name: 'queue',
    aliases: ['q', 'fila', 'list'],
    description: 'Mostra a fila de músicas',
    usage: '[página]',
    category: 'music',
    cooldown: 3,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        if (!player || !player.queue.current) {
            return message.reply({
                embeds: [Embed.error('Não há músicas na fila!')]
            });
        }

        const pageSize = 10;
        let currentPage = Math.max(1, parseInt(args[0]) || 1);

        const generateQueueMessage = async (page) => {
            const queue = player.queue;
            const totalPages = Math.ceil(queue.tracks.length / pageSize) || 1;
            page = Math.min(page, totalPages);

            // Get history (previous tracks played)
            const history = player.playHistory || [];
            const hasPrevious = history.length > 0 || queue.previous?.length > 0;

            // Get current track info
            const currentTrack = queue.current;
            const currentInfo = {
                title: currentTrack?.info?.title || 'Unknown',
                author: currentTrack?.info?.author || 'Unknown',
                thumbnail: currentTrack?.info?.artworkUrl,
                length: currentTrack?.info?.duration || 0
            };

            // Calculate total duration
            const totalDuration = queue.tracks.reduce((acc, t) => acc + (t.info?.duration || 0), 0) + currentInfo.length;

            // Build embed description
            let description = '';

            // Current track (highlighted)
            description += `**🎵 Tocando Agora:**\n`;
            description += `[${truncate(currentInfo.title, 45)}](${currentTrack?.info?.uri || '#'}) - \`${formatDuration(currentInfo.length)}\`\n`;
            description += `└ 👤 **${truncate(currentInfo.author, 30)}**\n\n`;

            // History info
            if (history.length > 0) {
                description += `📜 **Histórico:** ${history.length} músicas anteriores\n\n`;
            }

            // Queue tracks
            if (queue.tracks.length > 0) {
                description += `**📋 Próximas (${queue.tracks.length}):**\n`;
                const start = (page - 1) * pageSize;
                queue.tracks.slice(start, start + pageSize).forEach((track, i) => {
                    const info = track.info || {};
                    const isAutoplay = track.isAutoplay ? ' `🔄`' : '';
                    description += `\`${start + i + 1}.\` ${truncate(info.title || 'Unknown', 40)} - \`${formatDuration(info.duration || 0)}\`${isAutoplay}\n`;
                });
            } else {
                description += `**📋 Fila vazia**\n_Use \`!play\` para adicionar músicas_`;
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setAuthor({
                    name: `Fila de ${message.guild.name}`,
                    iconURL: message.guild.iconURL()
                })
                .setDescription(description)
                .setThumbnail(currentInfo.thumbnail)
                .setFooter({
                    text: `Página ${page}/${totalPages} • ${queue.tracks.length + 1} músicas • Duração: ${formatDuration(totalDuration)}`
                });

            // Control buttons row
            const controlRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('queue_previous_track')
                        .setEmoji('⏮️')
                        .setLabel('Anterior')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!hasPrevious),
                    new ButtonBuilder()
                        .setCustomId('queue_shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(queue.tracks.length < 2),
                    new ButtonBuilder()
                        .setCustomId('queue_clear')
                        .setEmoji('🗑️')
                        .setLabel('Limpar')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(queue.tracks.length === 0)
                );

            // Pagination row
            const navRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('queue_first')
                        .setEmoji('⏪')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('queue_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('queue_page')
                        .setLabel(`${page}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('queue_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages),
                    new ButtonBuilder()
                        .setCustomId('queue_last')
                        .setEmoji('⏩')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages)
                );

            // Action buttons row (Favorite / Playlist)
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('queue_fav_current')
                        .setEmoji('💖')
                        .setLabel('Favoritar Atual')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('queue_playlist_current')
                        .setEmoji('📁')
                        .setLabel('Add Playlist')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Build components array based on total pages
            const components = [controlRow, actionRow];
            if (totalPages > 1) {
                components.push(navRow);
            }

            return {
                embeds: [embed],
                components,
                page,
                totalPages
            };
        };

        const initialData = await generateQueueMessage(currentPage);
        currentPage = initialData.page;

        const reply = await message.reply(initialData);

        // Create collector for button interactions
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000 // 2 minutes
        });

        collector.on('collect', async (interaction) => {
            const currentPlayer = client.lavalink.players.get(message.guild.id);
            if (!currentPlayer) {
                return interaction.reply({ content: '❌ Player não está ativo.', ephemeral: true });
            }

            switch (interaction.customId) {
                case 'queue_first':
                    currentPage = 1;
                    break;
                case 'queue_prev':
                    currentPage = Math.max(1, currentPage - 1);
                    break;
                case 'queue_next':
                    currentPage++;
                    break;
                case 'queue_last':
                    currentPage = Math.ceil(currentPlayer.queue.tracks.length / pageSize) || 1;
                    break;
                case 'queue_previous_track':
                    // Go back to previous track
                    const history = currentPlayer.playHistory || [];
                    if (history.length > 0) {
                        const previousTrack = history.pop();
                        // Add current to front of queue
                        if (currentPlayer.queue.current) {
                            currentPlayer.queue.add(currentPlayer.queue.current, 0);
                        }
                        // Add previous track and play
                        currentPlayer.queue.add(previousTrack, 0);
                        await currentPlayer.skip();
                        await interaction.reply({ content: `⏮️ Voltando para: **${truncate(previousTrack.title || previousTrack.info?.title, 40)}**`, ephemeral: true });
                    } else if (currentPlayer.queue.previous?.length > 0) {
                        const prev = currentPlayer.queue.previous[0];
                        currentPlayer.queue.add(prev, 0);
                        await currentPlayer.skip();
                        await interaction.reply({ content: `⏮️ Voltando para: **${truncate(prev.info?.title || 'Anterior', 40)}**`, ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Não há música anterior.', ephemeral: true });
                    }
                    return;
                case 'queue_shuffle':
                    currentPlayer.queue.shuffle();
                    await interaction.reply({ content: '🔀 Fila embaralhada!', ephemeral: true });
                    break;
                case 'queue_clear':
                    currentPlayer.queue.clear();
                    await interaction.reply({ content: '🗑️ Fila limpa!', ephemeral: true });
                    currentPage = 1;
                    break;
                case 'queue_fav_current':
                    // Add current track to favorites
                    const currentTrack = currentPlayer.queue.current;
                    if (currentTrack) {
                        const trackInfo = currentTrack.info || {};
                        const favRepo = new FavoriteRepository(client.db);
                        const exists = await favRepo.exists(interaction.user.id, trackInfo.uri);
                        if (exists) {
                            await favRepo.remove(interaction.user.id, trackInfo.uri);
                            await interaction.reply({ content: `🤍 **${truncate(trackInfo.title, 40)}** removida dos favoritos.`, ephemeral: true });
                        } else {
                            await favRepo.add(interaction.user.id, {
                                title: trackInfo.title,
                                author: trackInfo.author,
                                uri: trackInfo.uri,
                                thumbnail: trackInfo.artworkUrl,
                                duration: trackInfo.duration
                            });
                            await interaction.reply({ content: `💖 **${truncate(trackInfo.title, 40)}** adicionada aos favoritos!`, ephemeral: true });
                        }
                    } else {
                        await interaction.reply({ content: '❌ Nenhuma música tocando.', ephemeral: true });
                    }
                    return;
                case 'queue_playlist_current':
                    // Show playlist selector
                    const playlistRepo = new PlaylistRepository(client.db);
                    const playlists = await playlistRepo.getUserPlaylists(interaction.user.id);

                    if (playlists.length === 0) {
                        await interaction.reply({ content: '❌ Você não tem playlists. Crie uma com `!playlist create <nome>`', ephemeral: true });
                        return;
                    }

                    const track = currentPlayer.queue.current;
                    if (!track) {
                        await interaction.reply({ content: '❌ Nenhuma música tocando.', ephemeral: true });
                        return;
                    }

                    const tInfo = track.info || {};

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('queue_playlist_select')
                        .setPlaceholder('Selecione uma playlist')
                        .addOptions(playlists.slice(0, 25).map(p => ({
                            label: truncate(p.name, 50),
                            value: p.id,
                            description: `${p.track_count || 0} músicas`
                        })));

                    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

                    const selectMsg = await interaction.reply({
                        content: `📁 Adicionar **${truncate(tInfo.title, 40)}** em qual playlist?`,
                        components: [selectRow],
                        ephemeral: true,
                        fetchReply: true
                    });

                    // Collector for playlist selection
                    const selectCollector = selectMsg.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 30000,
                        max: 1
                    });

                    selectCollector.on('collect', async (selectInteraction) => {
                        const playlistId = selectInteraction.values[0];
                        try {
                            await playlistRepo.addTrack(playlistId, {
                                title: tInfo.title,
                                author: tInfo.author,
                                uri: tInfo.uri,
                                thumbnail: tInfo.artworkUrl,
                                duration: tInfo.duration
                            });
                            const playlist = playlists.find(p => p.id === playlistId);
                            await selectInteraction.update({
                                content: `✅ **${truncate(tInfo.title, 40)}** adicionada à playlist **${playlist?.name || 'Playlist'}**!`,
                                components: []
                            });
                        } catch (err) {
                            await selectInteraction.update({
                                content: '❌ Erro ao adicionar à playlist.',
                                components: []
                            });
                        }
                    });
                    return;
            }

            // Update the queue display
            try {
                const newData = await generateQueueMessage(currentPage);
                currentPage = newData.page;
                await interaction.update(newData);
            } catch {
                if (!interaction.replied) {
                    await interaction.deferUpdate();
                }
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
