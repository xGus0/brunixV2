// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       lyrics Command                                ║
// ║                   Paginated Lyrics Display                          ║
// ║                    lavalink-client Edition                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Embed from '../../utils/embed.js';
import { truncate } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import LyricsService from '../../services/LyricsService.js';

const LINES_PER_PAGE = 15; // Lines per page

export default {
    name: 'lyrics',
    aliases: ['letra', 'letras', 'lyric'],
    description: 'Busca a letra da música (com paginação)',
    usage: '[música]',
    category: 'music',
    cooldown: 5,

    async execute(client, message, args) {
        let artist = '';
        let title = '';
        let displayQuery = '';

        // If no args, use current playing track
        if (!args.length) {
            const player = client.lavalink.players.get(message.guild.id);

            if (!player?.queue?.current) {
                return message.reply({
                    embeds: [Embed.error('Especifique uma música ou toque algo primeiro!\n\nUso: `!lyrics <artista> - <música>` ou apenas `!lyrics` enquanto toca algo.')]
                });
            }

            const current = player.queue.current;
            const trackInfo = current.info || {};
            artist = trackInfo.author || '';
            title = trackInfo.title || '';
            displayQuery = `${artist} - ${title}`;
        } else {
            const query = args.join(' ');
            displayQuery = query;

            // Use service parser
            const parsed = LyricsService.parseQuery(query);
            artist = parsed.artist;
            title = parsed.title;
        }

        if (!artist || !title) {
            return message.reply({
                embeds: [Embed.error('Não foi possível extrair artista/título.\n\nTente usar: `!lyrics <artista> - <música>`')]
            });
        }

        const loadingMsg = await message.reply({
            embeds: [Embed.info(`🔍 Buscando letra de **${truncate(displayQuery, 50)}**...`)]
        });

        // Use LyricsService to fetch lyrics
        const result = await LyricsService.fetchLyrics(artist, title);

        if (result.error || !result.lyrics) {
            const errorMessages = {
                'INVALID_INPUT': 'Não foi possível extrair artista/título.',
                'NOT_FOUND': `Letra não encontrada para: **${truncate(displayQuery, 40)}**\n\nTente: \`!lyrics Artista - Música\``,
                'EMPTY_LYRICS': `Letra vazia para: **${truncate(displayQuery, 40)}**`,
                'FETCH_ERROR': 'Erro ao buscar a letra. Tente novamente.'
            };

            return loadingMsg.edit({
                embeds: [Embed.warning(errorMessages[result.error] || 'Letra não encontrada.')]
            });
        }

        await this.sendPaginatedLyrics(loadingMsg, message.author.id, displayQuery, result.lyrics);
    },

    async sendPaginatedLyrics(message, userId, query, lyrics) {
        // Clean and split lyrics into lines
        lyrics = lyrics.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        const lines = lyrics.split('\n');

        // Create pages (LINES_PER_PAGE lines each)
        const pages = [];
        for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
            pages.push(lines.slice(i, i + LINES_PER_PAGE).join('\n'));
        }

        // If only 1 page, show without buttons
        if (pages.length === 1) {
            return message.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.EMBED_DEFAULT)
                        .setAuthor({ name: `📝 ${truncate(query, 50)}` })
                        .setDescription(pages[0])
                        .setFooter({ text: 'Powered by Lyrics.ovh' })
                ],
                components: []
            });
        }

        let currentPage = 0;

        const buildEmbed = (page) => {
            return new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setAuthor({ name: `📝 ${truncate(query, 50)}` })
                .setDescription(pages[page])
                .setFooter({ text: `Página ${page + 1}/${pages.length} • Powered by Lyrics.ovh` });
        };

        const buildButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lyrics_first')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('lyrics_prev')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('lyrics_page')
                    .setLabel(`${page + 1}/${pages.length}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('lyrics_next')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('lyrics_last')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === pages.length - 1)
            );
        };

        await message.edit({
            embeds: [buildEmbed(currentPage)],
            components: [buildButtons(currentPage)]
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (interaction) => {
            switch (interaction.customId) {
                case 'lyrics_first':
                    currentPage = 0;
                    break;
                case 'lyrics_prev':
                    currentPage = Math.max(0, currentPage - 1);
                    break;
                case 'lyrics_next':
                    currentPage = Math.min(pages.length - 1, currentPage + 1);
                    break;
                case 'lyrics_last':
                    currentPage = pages.length - 1;
                    break;
            }

            await interaction.update({
                embeds: [buildEmbed(currentPage)],
                components: [buildButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            message.edit({
                embeds: [buildEmbed(currentPage).setFooter({ text: `Página ${currentPage + 1}/${pages.length} • Expirado` })],
                components: []
            }).catch(() => { });
        });
    }
};
