// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /favorite Slash Command                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { formatDuration, truncate } from '../../utils/formatters.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('favorite')
        .setDescription('[USER] 💖 Manages your favorite songs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('[USER] Adds currentplaying song to favorites')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('[USER] Removes a song from favorites')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Song number in favorites list')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('[USER] Shows your favorites list')
        ),

    async execute(interaction) {
        const favoriteRepo = new FavoriteRepository(interaction.client.db);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const player = interaction.client.lavalink.players.get(interaction.guild.id);

            if (!player || !player.queue.current) {
                return interaction.reply({
                    embeds: [Embed.error('Nenhuma música está tocando!')],
                    ephemeral: true
                });
            }

            const track = player.queue.current;

            try {
                await favoriteRepo.addFavorite(
                    interaction.user.id,
                    track.info.title,
                    track.info.author,
                    track.info.uri,
                    track.info.duration,
                    track.info.artworkUrl
                );

                await interaction.reply({
                    embeds: [Embed.success(`💖 **${truncate(track.info.title, 40)}** adicionada aos favoritos!`)]
                });

            } catch (error) {
                if (error.message?.includes('duplicate')) {
                    return interaction.reply({
                        embeds: [Embed.error('Esta música já está nos seus favoritos!')],
                        ephemeral: true
                    });
                }
                throw error;
            }
        }

        else if (subcommand === 'remove') {
            const number = interaction.options.getInteger('number');

            try {
                const favorites = await favoriteRepo.getUserFavorites(interaction.user.id);

                if (!favorites.length) {
                    return interaction.reply({
                        embeds: [Embed.error('Você não tem músicas favoritas!')],
                        ephemeral: true
                    });
                }

                if (number < 1 || number > favorites.length) {
                    return interaction.reply({
                        embeds: [Embed.error(`Número inválido! Use 1-${favorites.length}`)],
                        ephemeral: true
                    });
                }

                const favorite = favorites[number - 1];
                await favoriteRepo.removeFavoriteById(favorite.id);

                await interaction.reply({
                    embeds: [Embed.success(`💔 **${truncate(favorite.title, 40)}** removida dos favoritos!`)]
                });

            } catch (error) {
                console.error('Remove favorite error:', error);
                return interaction.reply({
                    embeds: [Embed.error('Erro ao remover favorito.')],
                    ephemeral: true
                });
            }
        }

        else if (subcommand === 'list') {
            try {
                const favorites = await favoriteRepo.getUserFavorites(interaction.user.id);

                if (!favorites.length) {
                    return interaction.reply({
                        embeds: [Embed.info('💔 Você ainda não tem músicas favoritas!\nUse `/favorite add` enquanto uma música toca.')],
                        ephemeral: true
                    });
                }

                const favoriteList = favorites.slice(0, 15).map((fav, i) =>
                    `\`${i + 1}.\` **${truncate(fav.title, 35)}**\n└ ${fav.artist} • ${formatDuration(fav.duration)}`
                ).join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({
                        name: `💖 Favoritos de ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setDescription(favoriteList)
                    .setFooter({
                        text: favorites.length > 15
                            ? `Mostrando 15 de ${favorites.length} favoritos`
                            : `Total: ${favorites.length} favorito(s)`
                    });

                await interaction.reply({ embeds: [embed] });

            } catch (error) {
                console.error('List favorites error:', error);
                return interaction.reply({
                    embeds: [Embed.error('Erro ao carregar favoritos.')],
                    ephemeral: true
                });
            }
        }
    }
};
