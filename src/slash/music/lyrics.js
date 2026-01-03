// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /lyrics Slash Command                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { truncate } from '../../utils/formatters.js';
import Embed from '../../utils/embed.js';
import LyricsService from '../../services/LyricsService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('[MUSIC] 📝 Shows song lyrics')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name (optional - uses current song)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const player = interaction.client.lavalink.players.get(interaction.guild.id);
        const customSong = interaction.options.getString('song');

        let searchQuery;

        if (customSong) {
            searchQuery = customSong;
        } else {
            if (!player || !player.queue.current) {
                return interaction.editReply({
                    embeds: [Embed.error('Nenhuma música está tocando. Use: `/lyrics <música>`')]
                });
            }

            const track = player.queue.current;
            searchQuery = `${track.info.author} ${track.info.title}`;
        }

        try {
            const lyricsData = await LyricsService.search(searchQuery);

            if (!lyricsData || !lyricsData.lyrics) {
                return interaction.editReply({
                    embeds: [Embed.error(`Letra não encontrada para: **${truncate(searchQuery, 50)}**`)]
                });
            }

            const lyrics = lyricsData.lyrics;
            const maxLength = 4000;

            // Split lyrics into pages
            const pages = [];
            let currentPage = '';

            lyrics.split('\n').forEach(line => {
                if ((currentPage + line + '\n').length > maxLength) {
                    pages.push(currentPage);
                    currentPage = line + '\n';
                } else {
                    currentPage += line + '\n';
                }
            });

            if (currentPage) pages.push(currentPage);

            let currentPageIndex = 0;

            const createEmbed = (pageIndex) => {
                return new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setAuthor({ name: '📝 Letra da Música' })
                    .setTitle(truncate(lyricsData.title || searchQuery, 50))
                    .setDescription(pages[pageIndex])
                    .setFooter({
                        text: pages.length > 1
                            ? `Página ${pageIndex + 1}/${pages.length} • ${lyricsData.artist || 'Artista desconhecido'}`
                            : lyricsData.artist || 'Artista desconhecido'
                    });
            };

            if (pages.length === 1) {
                return interaction.editReply({ embeds: [createEmbed(0)] });
            }

            // Multiple pages - add navigation
            const createButtons = (disabled = false) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lyrics_prev')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || currentPageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('lyrics_next')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || currentPageIndex === pages.length - 1)
                );
            };

            const message = await interaction.editReply({
                embeds: [createEmbed(currentPageIndex)],
                components: [createButtons()]
            });

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 120000
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'lyrics_prev') {
                    currentPageIndex = Math.max(0, currentPageIndex - 1);
                } else if (i.customId === 'lyrics_next') {
                    currentPageIndex = Math.min(pages.length - 1, currentPageIndex + 1);
                }

                await i.update({
                    embeds: [createEmbed(currentPageIndex)],
                    components: [createButtons()]
                });
            });

            collector.on('end', () => {
                message.edit({ components: [createButtons(true)] }).catch(() => { });
            });

        } catch (error) {
            console.error('Lyrics error:', error);
            await interaction.editReply({
                embeds: [Embed.error('Erro ao buscar a letra da música.')]
            });
        }
    }
};
