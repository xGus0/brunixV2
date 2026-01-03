// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /playlist Slash Command                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { truncate } from '../../utils/formatters.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('[USER] 📁 Manages your custom playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('[USER] Creates a new playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('[USER] Deletes a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('[USER] Shows your playlists')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('[USER] Shows songs in a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const playlistRepo = new PlaylistRepository(interaction.client.db);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const name = interaction.options.getString('name');

            try {
                await playlistRepo.createPlaylist(interaction.user.id, name);

                await interaction.reply({
                    embeds: [Embed.success(`📁 Playlist **${name}** criada com sucesso!`)]
                });

            } catch (error) {
                if (error.message?.includes('duplicate')) {
                    return interaction.reply({
                        embeds: [Embed.error('Você já tem uma playlist com esse nome!')],
                        ephemeral: true
                    });
                }
                throw error;
            }
        }

        else if (subcommand === 'delete') {
            const name = interaction.options.getString('name');

            try {
                const playlists = await playlistRepo.getUserPlaylists(interaction.user.id);
                const playlist = playlists.find(p => p.name.toLowerCase() === name.toLowerCase());

                if (!playlist) {
                    return interaction.reply({
                        embeds: [Embed.error('Playlist não encontrada!')],
                        ephemeral: true
                    });
                }

                await playlistRepo.deletePlaylist(playlist.id);

                await interaction.reply({
                    embeds: [Embed.success(`🗑️ Playlist **${name}** deletada!`)]
                });

            } catch (error) {
                console.error('Delete playlist error:', error);
                return interaction.reply({
                    embeds: [Embed.error('Erro ao deletar playlist.')],
                    ephemeral: true
                });
            }
        }

        else if (subcommand === 'list') {
            try {
                const playlists = await playlistRepo.getUserPlaylists(interaction.user.id);

                if (!playlists.length) {
                    return interaction.reply({
                        embeds: [Embed.info('📁 Você ainda não tem playlists!\nUse `/playlist create <nome>` para criar uma.')],
                        ephemeral: true
                    });
                }

                const playlistList = playlists.map((pl, i) =>
                    `\`${i + 1}.\` **${pl.name}**\n└ ${pl.song_count || 0} música(s)`
                ).join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({
                        name: `📁 Playlists de ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setDescription(playlistList)
                    .setFooter({ text: `Total: ${playlists.length} playlist(s)` });

                await interaction.reply({ embeds: [embed] });

            } catch (error) {
                console.error('List playlists error:', error);
                return interaction.reply({
                    embeds: [Embed.error('Erro ao carregar playlists.')],
                    ephemeral: true
                });
            }
        }

        else if (subcommand === 'view') {
            const name = interaction.options.getString('name');

            try {
                const playlists = await playlistRepo.getUserPlaylists(interaction.user.id);
                const playlist = playlists.find(p => p.name.toLowerCase() === name.toLowerCase());

                if (!playlist) {
                    return interaction.reply({
                        embeds: [Embed.error('Playlist não encontrada!')],
                        ephemeral: true
                    });
                }

                const songs = await playlistRepo.getPlaylistSongs(playlist.id);

                if (!songs.length) {
                    return interaction.reply({
                        embeds: [Embed.info(`📁 **${playlist.name}** está vazia!\nUse o botão ➕ enquanto uma música toca para adicionar.`)],
                        ephemeral: true
                    });
                }

                const songList = songs.slice(0, 10).map((song, i) =>
                    `\`${i + 1}.\` **${truncate(song.title, 35)}**\n└ ${song.artist}`
                ).join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({ name: `📁 ${playlist.name}` })
                    .setDescription(songList)
                    .setFooter({
                        text: songs.length > 10
                            ? `Mostrando 10 de ${songs.length} músicas`
                            : `Total: ${songs.length} música(s)`
                    });

                await interaction.reply({ embeds: [embed] });

            } catch (error) {
                console.error('View playlist error:', error);
                return interaction.reply({
                    embeds: [Embed.error('Erro ao carregar playlist.')],
                    ephemeral: true
                });
            }
        }
    }
};
