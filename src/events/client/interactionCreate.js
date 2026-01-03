// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Interaction Create Event                        ║
// ║           Handle Buttons, Select Menus and Modals                   ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import { truncate } from '../../utils/formatters.js';

export default {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {
        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                Logger.error(`Autocomplete error for ${interaction.commandName}:`, error);
            }
            return;
        }

        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                Logger.error(`Slash command error for ${interaction.commandName}:`, error);

                const errorMsg = {
                    embeds: [{
                        color: 0xFF0000,
                        description: '❌ Erro ao executar o comando.'
                    }],
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMsg);
                } else {
                    await interaction.reply(errorMsg);
                }
            }
            return;
        }

        // Handle modals
        if (interaction.isModalSubmit()) {
            await this.handleModal(client, interaction);
            return;
        }

        // Handle select menus for playlist add
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('pl_addto')) {
                await this.handlePlaylistAdd(client, interaction);
            }
            return;
        }

        // Handle player control buttons
        if (interaction.isButton()) {
            const playerButtons = [
                'player_pause', 'player_skip', 'player_stop',
                'player_loop', 'player_autoplay', 'player_shuffle',
                'player_queue', 'player_favorite', 'player_addplaylist', 'player_lyrics'
            ];

            if (playerButtons.includes(interaction.customId)) {
                await this.handlePlayerButton(client, interaction);
                return;
            }
        }
    },

    /**
     * Handle player control buttons
     */
    async handlePlayerButton(client, interaction) {
        const { EmbedBuilder } = await import('discord.js');
        const { canControlPlayer } = await import('../../utils/musicPermission.js');

        const player = client.lavalink.players.get(interaction.guildId);
        if (!player) {
            return interaction.reply({ content: '❌ Player inativo.', ephemeral: true });
        }

        const customId = interaction.customId;
        const protectedActions = ['player_pause', 'player_skip', 'player_stop', 'player_shuffle'];

        // Permission check for protected actions
        if (protectedActions.includes(customId)) {
            if (!canControlPlayer(player, interaction.member)) {
                const trackOwner = player.queue.current?.requester;
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
                    const wasPaused = player.paused;

                    if (wasPaused) {
                        await player.resume();
                    } else {
                        await player.pause();
                    }

                    // Update buttons to reflect new state
                    await this.updatePlayerButtons(player);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `${!wasPaused ? '⏸️' : '▶️'} **${interaction.user.username}** ${!wasPaused ? 'pausou' : 'retomou'} a música.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_skip':
                    // Check if there's a next track or autoplay
                    const hasNextTrack = player.queue.tracks.length > 0;

                    if (!hasNextTrack && !player.autoplay) {
                        return interaction.reply({
                            content: '❌ Não há próxima música na fila! Ative o autoplay para continuar.',
                            ephemeral: true
                        });
                    }

                    try {
                        if (hasNextTrack) {
                            // Normal skip if there's a next track
                            await player.skip();
                        } else {
                            // If autoplay is on but queue is empty, stop current track
                            // This will trigger queueEnd which will add autoplay tracks
                            await player.stopPlaying();
                        }
                        await interaction.reply({ content: '⏭️ Pulando música!', ephemeral: true });
                    } catch (skipError) {
                        Logger.warn(`Skip error: ${skipError.message}`);
                        // Fallback: try stopPlaying
                        try {
                            await player.stopPlaying();
                            await interaction.reply({ content: '⏭️ Pulando música!', ephemeral: true });
                        } catch {
                            return interaction.reply({ content: '❌ Não foi possível pular.', ephemeral: true });
                        }
                    }

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_SUCCESS).setDescription(
                            `⏭️ **${interaction.user.username}** pulou a música.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_stop':
                    if (player.updateInterval) {
                        clearInterval(player.updateInterval);
                        player.updateInterval = null;
                    }
                    await player.destroy();
                    await interaction.reply({ content: '⏹️ Player parado!', ephemeral: true });

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_WARNING).setDescription(
                            `⏹️ **${interaction.user.username}** parou a música e limpou a fila.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_loop':
                    const modes = ['off', 'track', 'queue'];
                    const currentMode = player.repeatMode || 'off';
                    const nextMode = modes[(modes.indexOf(currentMode) + 1) % 3];
                    await player.setRepeatMode(nextMode);

                    const loopEmoji = nextMode === 'track' ? '🔂' : (nextMode === 'queue' ? '🔁' : '➡️');
                    const loopText = nextMode === 'track' ? 'Loop Música' : (nextMode === 'queue' ? 'Loop Fila' : 'Loop Desativado');

                    await interaction.reply({ content: `${loopEmoji} Modo: ${loopText}`, ephemeral: true });

                    // Update buttons to reflect new state
                    await this.updatePlayerButtons(player);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `${loopEmoji} **${interaction.user.username}** alterou o modo para: **${loopText}**`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_autoplay':
                    player.autoplay = !player.autoplay;

                    // Clear history when disabling autoplay
                    if (!player.autoplay) {
                        player.autoplayHistory = new Set();
                        Logger.info('Autoplay: History cleared');
                    } else {
                        Logger.info('Autoplay: Enabled (will use last played track as reference)');
                    }

                    await interaction.reply({ content: `📻 Autoplay: ${player.autoplay ? 'Ativado' : 'Desativado'}`, ephemeral: true });

                    // Update buttons to reflect new state
                    await this.updatePlayerButtons(player);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `📻 **${interaction.user.username}** ${player.autoplay ? 'ativou' : 'desativou'} o Autoplay.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_shuffle':
                    player.queue.shuffle();
                    player.shuffled = !player.shuffled; // Toggle shuffle state
                    await interaction.reply({ content: `🔀 ${player.shuffled ? 'Shuffle ativado!' : 'Fila embaralhada!'}`, ephemeral: true });

                    // Update buttons to reflect new state
                    await this.updatePlayerButtons(player);

                    interaction.channel.send({
                        embeds: [new EmbedBuilder().setColor(COLORS.EMBED_INFO).setDescription(
                            `🔀 **${interaction.user.username}** ${player.shuffled ? 'ativou o shuffle' : 'embaralhou a fila'}.`
                        )]
                    }).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
                    break;

                case 'player_queue':
                    await interaction.reply({ content: '📋 Use o comando `!queue` para ver a fila completa.', ephemeral: true });
                    break;

                case 'player_favorite':
                    await this.handleFavoriteButton(client, interaction, player);
                    break;

                case 'player_addplaylist':
                    await interaction.reply({
                        content: '📁 Use o comando `!playlist add` para adicionar a música atual a uma playlist.',
                        ephemeral: true
                    });
                    break;

                case 'player_lyrics':
                    await this.handleLyricsButton(client, interaction, player);
                    break;
            }
        } catch (error) {
            Logger.error('Player button error:', error.message);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Erro ao processar.', ephemeral: true }).catch(() => { });
                }
            } catch { }
        }
    },

    /**
     * Update player buttons to reflect current state
     */
    async updatePlayerButtons(player) {
        if (!player.nowPlayingMessage) return;

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

        const isPaused = player.paused;
        const loopMode = player.repeatMode || 'off';
        const isAutoplay = player.autoplay || false;
        const isShuffled = player.shuffled || false;
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
                    .setStyle(isShuffled ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('player_queue')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('player_lyrics')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Secondary)
            );

        try {
            await player.nowPlayingMessage.edit({ components: [controlRow, actionRow] });
        } catch {
            // Message may have been deleted
        }
    },

    /**
     * Handle favorite button
     */
    async handleFavoriteButton(client, interaction, player) {
        const FavoriteRepository = (await import('../../database/repositories/FavoriteRepository.js')).default;
        const favoriteRepo = new FavoriteRepository(client.db);

        const trackInfo = player.currentTrackInfo || {};
        const track = player.queue.current;

        if (!track) {
            return interaction.reply({ content: '❌ Nenhuma música tocando.', ephemeral: true });
        }

        const trackData = {
            title: trackInfo.title || track.info?.title,
            author: trackInfo.author || track.info?.author,
            uri: trackInfo.uri || track.info?.uri,
            thumbnail: trackInfo.thumbnail || track.info?.artworkUrl,
            length: trackInfo.length || track.info?.duration
        };

        const exists = await favoriteRepo.exists(interaction.user.id, trackData.uri);

        if (exists) {
            await favoriteRepo.remove(interaction.user.id, trackData.uri);
            player.currentTrackFavorited = false;
            await interaction.reply({ content: '🤍 Removido dos favoritos', ephemeral: true });
        } else {
            await favoriteRepo.add(interaction.user.id, trackData);
            player.currentTrackFavorited = true;
            await interaction.reply({ content: '💖 Adicionado aos favoritos', ephemeral: true });
        }

        // Update buttons to reflect new favorite state
        await this.updatePlayerButtons(player);
    },

    /**
     * Handle lyrics button with pagination
     */
    async handleLyricsButton(client, interaction, player) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        const LyricsService = (await import('../../services/LyricsService.js')).default;

        const track = player.queue.current;
        if (!track) {
            return interaction.reply({ content: '❌ Nenhuma música tocando.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const trackInfo = track.info || {};
        const result = await LyricsService.fetchLyrics(trackInfo.author, trackInfo.title);

        if (result.error || !result.lyrics) {
            const errorMessages = {
                'INVALID_INPUT': 'Não foi possível extrair artista/título.',
                'NOT_FOUND': `Letra não encontrada para: **${truncate(trackInfo.title, 40)}**`,
                'EMPTY_LYRICS': `Letra vazia para: **${truncate(trackInfo.title, 40)}**`,
                'FETCH_ERROR': 'Erro ao buscar a letra. Tente novamente.'
            };

            return interaction.editReply({
                content: `❌ ${errorMessages[result.error] || 'Letra não encontrada.'}`
            });
        }

        // Paginate lyrics
        const LINES_PER_PAGE = 15;
        const pages = LyricsService.paginateLyrics(result.lyrics, LINES_PER_PAGE);
        const displayTitle = truncate(trackInfo.title, 50);

        // If only 1 page, show without buttons
        if (pages.length === 1) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x1DB954)
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
                .setColor(0x1DB954)
                .setAuthor({ name: `📝 ${displayTitle}` })
                .setDescription(pages[page])
                .setFooter({ text: `Página ${page + 1}/${pages.length} • Powered by Lyrics.ovh` });
        };

        const buildButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('eph_lyrics_first')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('eph_lyrics_prev')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('eph_lyrics_page')
                    .setLabel(`${page + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('eph_lyrics_next')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('eph_lyrics_last')
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
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (btnInteraction) => {
            switch (btnInteraction.customId) {
                case 'eph_lyrics_first': currentPage = 0; break;
                case 'eph_lyrics_prev': currentPage = Math.max(0, currentPage - 1); break;
                case 'eph_lyrics_next': currentPage = Math.min(pages.length - 1, currentPage + 1); break;
                case 'eph_lyrics_last': currentPage = pages.length - 1; break;
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
    },

    /**
     * Handle modal submissions
     */
    async handleModal(client, interaction) {
        const modalId = interaction.customId;

        try {
            switch (modalId) {
                case 'modal_pl_create':
                    await this.handleCreatePlaylist(client, interaction);
                    break;

                case 'modal_pl_rename':
                    await this.handleRenamePlaylist(client, interaction);
                    break;
            }
        } catch (error) {
            Logger.error('Modal error:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Erro ao processar.', ephemeral: true });
            }
        }
    },

    /**
     * Create playlist from modal
     */
    async handleCreatePlaylist(client, interaction) {
        const name = interaction.fields.getTextInputValue('playlist_name');
        const description = interaction.fields.getTextInputValue('playlist_desc') || null;

        if (!name || name.trim().length < 2) {
            return interaction.reply({ content: '❌ Nome muito curto.', ephemeral: true });
        }

        const playlistRepo = new PlaylistRepository(client.db);
        const result = await playlistRepo.create(interaction.user.id, name.trim(), description);

        if (result.success) {
            await interaction.reply({
                content: `✓ Playlist **${name}** criada com sucesso!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
        }
    },

    /**
     * Rename playlist from modal
     */
    async handleRenamePlaylist(client, interaction) {
        const newName = interaction.fields.getTextInputValue('new_name');
        const playlistId = client.currentPlaylist?.get(interaction.user.id);

        if (!playlistId) {
            return interaction.reply({ content: '❌ Playlist não encontrada.', ephemeral: true });
        }

        if (!newName || newName.trim().length < 2) {
            return interaction.reply({ content: '❌ Nome muito curto.', ephemeral: true });
        }

        try {
            const { error } = await client.db
                .from('playlists')
                .update({ name: newName.trim(), updated_at: new Date().toISOString() })
                .eq('id', playlistId)
                .eq('user_id', interaction.user.id);

            if (error) throw error;

            await interaction.reply({
                content: `✓ Playlist renomeada para **${newName}**!`,
                ephemeral: true
            });

        } catch (error) {
            Logger.error('Rename playlist error:', error);
            await interaction.reply({ content: '❌ Erro ao renomear.', ephemeral: true });
        }
    },

    /**
     * Add track to playlist from select
     */
    async handlePlaylistAdd(client, interaction) {
        const savedTrack = client.pendingPlaylistAdd?.get(interaction.user.id);
        if (!savedTrack) {
            return interaction.update({ content: '❌ Sessão expirada.', components: [] });
        }

        const playlistId = interaction.values[0];
        const playlistRepo = new PlaylistRepository(client.db);

        const result = await playlistRepo.addTrack(playlistId, interaction.user.id, {
            title: savedTrack.title,
            author: savedTrack.author,
            uri: savedTrack.uri,
            thumbnail: savedTrack.thumbnail,
            length: savedTrack.length
        });

        client.pendingPlaylistAdd.delete(interaction.user.id);

        if (result.success) {
            await interaction.update({
                content: `✓ **${truncate(savedTrack.title, 40)}** adicionada à playlist!`,
                components: []
            });
        } else {
            await interaction.update({ content: `❌ ${result.error}`, components: [] });
        }
    }
};
