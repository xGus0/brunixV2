// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Playlist Command                              ║
// ║          Complete Management System with Search                     ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import { COLORS, LIMITS } from '../../config/constants.js';
import { truncate, formatDuration } from '../../utils/formatters.js';

export default {
    name: 'playlist',
    aliases: ['pl', 'list'],
    description: 'Gerencia suas playlists',
    usage: 'create <nome> | add <playlist> <música> | list | play <playlist>',
    category: 'user',

    async execute(client, message, args) {
        const repo = new PlaylistRepository(client.db);
        const subCmd = args[0]?.toLowerCase();

        if (subCmd === 'create') {
            const name = args.slice(1).join(' ');
            if (!name) return message.reply('Nome da playlist?');
            const res = await repo.create(message.author.id, name);
            return message.reply(res.success ? `✅ Playlist **${name}** criada!` : `❌ ${res.error}`);
        }

        if (subCmd === 'delete') {
            // Simple delete logic
            const name = args.slice(1).join(' ');
            // Need playlist ID usually, hard to do by name unless searched.
            // Keeping it simple for now or using Panel.
            return message.reply('Use o painel para deletar.');
        }

        if (subCmd === 'add' && args.length > 2) {
            // !pl add <playlist_name> <query>
            // This is tricky parsing names with spaces. 
            // Better to use Panel.
            return message.reply('Para adicionar, recomendo usar o painel interativo (apenas `!playlist`).');
        }

        // Default: Show Panel
        await this.showPanel(client, message, repo);
    },

    async showPanel(client, message, repo) {
        const playlists = await repo.getUserPlaylists(message.author.id);

        if (playlists.length === 0) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pl_create_btn').setLabel('Criar Playlist').setEmoji('➕').setStyle(ButtonStyle.Primary)
            );

            const msg = await message.reply({
                embeds: [new EmbedBuilder().setColor(COLORS.EMBED_DEFAULT).setDescription('Você não tem playlists.')],
                components: [row]
            });
            this.handleInteractions(client, msg, message, repo);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_PREMIUM)
            .setAuthor({ name: 'Minhas Playlists', iconURL: message.author.displayAvatarURL() })
            .setDescription('Selecione uma playlist abaixo para gerenciar ou tocar.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('pl_select')
            .setPlaceholder('Escolha uma playlist...')
            .addOptions(playlists.map(pl => ({
                label: truncate(pl.name, 50),
                description: `${pl.track_count?.[0]?.count || 0} músicas`,
                value: pl.id,
                emoji: '📁'
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pl_create_btn').setLabel('Nova Playlist').setEmoji('➕').setStyle(ButtonStyle.Success)
        );

        const msg = await message.reply({ embeds: [embed], components: [row, btnRow] });
        this.handleInteractions(client, msg, message, repo);
    },

    handleInteractions(client, msg, originalMsg, repo) {
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === originalMsg.author.id,
            time: 120000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'pl_create_btn') {
                await i.reply({ content: 'Nome da nova playlist? (30s)', ephemeral: true });
                const filter = m => m.author.id === i.user.id;
                const collected = await originalMsg.channel.awaitMessages({ filter, max: 1, time: 30000 });
                const name = collected.first()?.content;
                if (name) {
                    await repo.create(i.user.id, name);
                    await i.followUp({ content: `✅ Playlist **${name}** criada! Reabra o menu para ver.`, ephemeral: true });
                    collected.first().delete().catch(() => { });
                }
            }

            if (i.customId === 'pl_select') {
                const playlistId = i.values[0];
                const playlist = await repo.getPlaylist(playlistId);

                // Show playlist details panel
                const detailEmbed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setTitle(`📁 ${playlist.name}`)
                    .setDescription(`**${playlist.tracks?.length || 0} músicas**\n\nClique em 'Adicionar' para buscar músicas.`);

                const detailRows = [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`pl_play_${playlistId}`).setLabel('Tocar').setEmoji('▶️').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`pl_add_${playlistId}`).setLabel('Adicionar Música').setEmoji('➕').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`pl_delete_${playlistId}`).setLabel('Excluir Playlist').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('pl_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
                    )
                ];

                await i.update({ embeds: [detailEmbed], components: detailRows });
            }

            if (i.customId.startsWith('pl_add_')) {
                const playlistId = i.customId.replace('pl_add_', '');
                await i.reply({ content: '🎵 Digite o nome da música para adicionar:', ephemeral: true });

                const filter = m => m.author.id === i.user.id;
                const collected = await originalMsg.channel.awaitMessages({ filter, max: 1, time: 30000 });
                const query = collected.first()?.content;

                if (query) {
                    collected.first().delete().catch(() => { });
                    const res = await client.manager.search(query, { requester: i.user });
                    if (res.tracks.length) {
                        const track = res.tracks[0];
                        await repo.addTrack(playlistId, i.user.id, {
                            title: track.title,
                            author: track.author,
                            uri: track.uri,
                            thumbnail: track.thumbnail,
                            length: track.length
                        });
                        await i.followUp({ content: `✅ **${track.title}** adicionada!`, ephemeral: true });
                    } else {
                        await i.followUp({ content: '❌ Nada encontrado.', ephemeral: true });
                    }
                }
            }

            if (i.customId.startsWith('pl_play_')) {
                const playlistId = i.customId.replace('pl_play_', '');
                const tracks = await repo.getPlaylistTracks(playlistId);

                if (!tracks.length) return i.reply({ content: 'Playlist vazia.', ephemeral: true });

                await i.reply({ content: `▶️ Carregando ${tracks.length} músicas...`, ephemeral: true });

                const player = await client.manager.createPlayer({
                    guildId: originalMsg.guild.id,
                    textId: originalMsg.channel.id,
                    voiceId: originalMsg.member.voice.channel.id,
                    volume: 80
                });
                if (player.state !== 'CONNECTED') player.connect();

                for (const t of tracks) {
                    const res = await client.manager.search(t.uri, { requester: i.user });
                    if (res.tracks[0]) player.queue.add(res.tracks[0]);
                }
                if (!player.playing) player.play();
            }

            if (i.customId === 'pl_back') {
                // Re-show main panel logic (simplified by just asking user to execute command again effectively, or re-render)
                // Ideally re-call showPanel logic logic adapted for update
                await i.update({ content: 'Use !playlist para voltar ao menu principal.', embeds: [], components: [] });
            }
        });
    }
};
