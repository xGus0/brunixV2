// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        radio Command                                ║
// ║     24/7 Radio Mode with Genre Selection + Voice Channel Menu       ║
// ║                    lavalink-client Edition                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import Embed from '../../utils/embed.js';
import { truncate, formatDuration } from '../../utils/formatters.js';
import { COLORS } from '../../config/constants.js';
import Logger from '../../utils/logger.js';

// Radio Genres with search queries and emojis
const RADIO_GENRES = {
    pop: {
        name: 'Pop',
        emoji: '🎤',
        queries: ['top pop hits 2024', 'pop music mix', 'best pop songs', 'pop playlist'],
        color: 0xFF69B4
    },
    rock: {
        name: 'Rock',
        emoji: '🎸',
        queries: ['rock classics mix', 'best rock songs', 'rock music playlist', 'alternative rock'],
        color: 0xDC143C
    },
    hiphop: {
        name: 'Hip-Hop',
        emoji: '🎧',
        queries: ['hip hop mix 2024', 'best rap songs', 'hip hop playlist', 'trap music'],
        color: 0xFFD700
    },
    edm: {
        name: 'EDM',
        emoji: '🎹',
        queries: ['edm mix 2024', 'electronic dance music', 'house music mix', 'best edm songs'],
        color: 0x00FFFF
    },
    jazz: {
        name: 'Jazz',
        emoji: '🎷',
        queries: ['jazz music mix', 'smooth jazz playlist', 'jazz classics', 'relaxing jazz'],
        color: 0x8B4513
    },
    classical: {
        name: 'Clássica',
        emoji: '🎻',
        queries: ['classical music mix', 'piano classical', 'orchestra music', 'beethoven mozart'],
        color: 0xDAA520
    },
    lofi: {
        name: 'Lo-Fi',
        emoji: '☕',
        queries: ['lofi hip hop radio', 'lofi beats to study', 'chill lofi mix', 'lofi sleep'],
        color: 0x9370DB
    },
    kpop: {
        name: 'K-Pop',
        emoji: '🇰🇷',
        queries: ['kpop mix 2024', 'best kpop songs', 'kpop playlist', 'bts blackpink twice'],
        color: 0xFF1493
    },
    latin: {
        name: 'Latin',
        emoji: '💃',
        queries: ['reggaeton mix 2024', 'latin music hits', 'spanish songs', 'bad bunny mix'],
        color: 0xFF4500
    },
    country: {
        name: 'Country',
        emoji: '🤠',
        queries: ['country music mix', 'country songs playlist', 'best country hits', 'country 2024'],
        color: 0xCD853F
    },
    rb: {
        name: 'R&B',
        emoji: '🎤',
        queries: ['rnb mix 2024', 'r&b soul music', 'best r&b songs', 'romantic r&b'],
        color: 0x800080
    },
    metal: {
        name: 'Metal',
        emoji: '🤘',
        queries: ['metal music mix', 'heavy metal playlist', 'metalcore songs', 'rock metal'],
        color: 0x2F4F4F
    },
    indie: {
        name: 'Indie',
        emoji: '🌈',
        queries: ['indie music mix', 'indie pop playlist', 'alternative indie', 'indie rock'],
        color: 0x98FB98
    },
    anime: {
        name: 'Anime',
        emoji: '🎌',
        queries: ['anime openings mix', 'best anime songs', 'anime ost playlist', 'japanese anime music'],
        color: 0xE91E63
    },
    gaming: {
        name: 'Gaming',
        emoji: '🎮',
        queries: ['gaming music mix', 'video game ost', 'gaming playlist', 'epic gaming music'],
        color: 0x7B68EE
    },
    chill: {
        name: 'Chill',
        emoji: '🌊',
        queries: ['chill music mix', 'relaxing music', 'chill vibes playlist', 'calm music'],
        color: 0x87CEEB
    },
    random: {
        name: 'Aleatório',
        emoji: '🎲',
        queries: null, // Will pick random genre
        color: 0xFFFFFF
    }
};

export default {
    name: 'radio',
    aliases: ['24/7', 'station', 'fm', 'estacao'],
    description: 'Inicia rádio 24/7 com gênero selecionado',
    usage: '[gênero]',
    category: 'music',
    cooldown: 5,

    async execute(client, message, args) {
        const member = message.member;
        const voiceChannel = member.voice.channel;

        // If user is not in a voice channel, show channel selector
        if (!voiceChannel) {
            return await this.showChannelSelector(client, message);
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(client.user);
        if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            return message.reply({
                embeds: [Embed.error('Não tenho permissão para conectar/falar neste canal!')]
            });
        }

        // If genre provided as argument, start directly
        const genreArg = args[0]?.toLowerCase();
        if (genreArg && RADIO_GENRES[genreArg]) {
            return await this.startRadio(client, message, voiceChannel, genreArg);
        }

        // Otherwise show genre selector
        await this.showGenreSelector(client, message, voiceChannel);
    },

    /**
     * Show voice channel selector when user is not in a channel
     */
    async showChannelSelector(client, message) {
        const voiceChannels = message.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildVoice)
            .filter(c => {
                const perms = c.permissionsFor(client.user);
                return perms.has(PermissionFlagsBits.Connect) && perms.has(PermissionFlagsBits.Speak);
            })
            .first(25); // Discord limit

        if (voiceChannels.length === 0) {
            return message.reply({
                embeds: [Embed.error('Não encontrei canais de voz disponíveis!')]
            });
        }

        const channelOptions = voiceChannels.map(channel => ({
            label: truncate(channel.name, 50),
            description: `${channel.members.size} membro(s) conectado(s)`,
            value: channel.id,
            emoji: '🔊'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('radio_channel_select')
            .setPlaceholder('🔊 Selecione um canal de voz...')
            .addOptions(channelOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTitle('📻 Rádio Brunix')
            .setDescription('Você não está em um canal de voz.\n\n**Selecione um canal para iniciar a rádio:**')
            .setFooter({ text: 'A rádio tocará 24/7 no canal selecionado' });

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            const channelId = interaction.values[0];
            const selectedChannel = message.guild.channels.cache.get(channelId);

            if (!selectedChannel) {
                return interaction.update({
                    embeds: [Embed.error('Canal não encontrado!')],
                    components: []
                });
            }

            await interaction.deferUpdate();
            await reply.delete().catch(() => { });
            await this.showGenreSelector(client, message, selectedChannel);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                reply.edit({
                    embeds: [Embed.warning('⏰ Tempo esgotado. Use `!radio` novamente.')],
                    components: []
                }).catch(() => { });
            }
        });
    },

    /**
     * Show genre selector
     */
    async showGenreSelector(client, message, voiceChannel) {
        const genreOptions = Object.entries(RADIO_GENRES).map(([key, genre]) => ({
            label: genre.name,
            value: key,
            emoji: genre.emoji,
            description: key === 'random' ? 'Gênero surpresa a cada música' : `Músicas de ${genre.name}`
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('radio_genre_select')
            .setPlaceholder('🎵 Selecione um gênero...')
            .addOptions(genreOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTitle('📻 Rádio Brunix - Selecionar Gênero')
            .setDescription(`**Canal:** 🔊 ${voiceChannel.name}\n\n**Escolha um gênero musical:**\nA rádio tocará músicas 24/7 sem parar!`)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: '🎵 Modo 24/7 ativo • Não desconecta automaticamente' });

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            const selectedGenre = interaction.values[0];
            await interaction.deferUpdate();
            await reply.delete().catch(() => { });
            await this.startRadio(client, message, voiceChannel, selectedGenre);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                reply.edit({
                    embeds: [Embed.warning('⏰ Tempo esgotado. Use `!radio` novamente.')],
                    components: []
                }).catch(() => { });
            }
        });
    },

    /**
     * Start the radio with selected genre
     */
    async startRadio(client, message, voiceChannel, genreKey) {
        let genre = RADIO_GENRES[genreKey];

        // Handle random genre
        if (genreKey === 'random') {
            const genreKeys = Object.keys(RADIO_GENRES).filter(k => k !== 'random');
            const randomKey = genreKeys[Math.floor(Math.random() * genreKeys.length)];
            genre = RADIO_GENRES[randomKey];
            genreKey = randomKey;
        }

        const loadingEmbed = new EmbedBuilder()
            .setColor(genre.color)
            .setTitle(`${genre.emoji} Iniciando Rádio ${genre.name}...`)
            .setDescription('🔄 Buscando músicas...');

        const loadingMsg = await message.channel.send({ embeds: [loadingEmbed] });

        try {
            // Create or get player
            let player = client.lavalink.players.get(message.guild.id);

            if (!player) {
                player = await client.lavalink.createPlayer({
                    guildId: message.guild.id,
                    voiceChannelId: voiceChannel.id,
                    textChannelId: message.channel.id,
                    selfDeaf: true,
                    volume: 60
                });
                await player.connect();
            } else {
                // Update voice channel if different
                if (player.voiceChannelId !== voiceChannel.id) {
                    await player.connect();
                }
            }

            // Enable radio mode (24/7)
            player.radioMode = true;
            player.radioGenre = genreKey;
            player.radioGenreData = genre;
            player.autoplay = true; // Enable autoplay for continuous play

            // Clear existing queue
            if (player.queue.tracks.length > 0) {
                await player.queue.splice(0, player.queue.tracks.length);
            }

            // Search for initial tracks (use YouTube Music for actual playable audio)
            const query = genre.queries[Math.floor(Math.random() * genre.queries.length)];
            const result = await player.search({ query, source: 'ytmsearch' }, message.author);

            if (!result.tracks?.length) {
                await loadingMsg.edit({
                    embeds: [Embed.error(`Não encontrei músicas para o gênero ${genre.name}`)]
                });
                return;
            }

            // Add 5-10 random tracks from results
            const shuffled = result.tracks.sort(() => Math.random() - 0.5);
            const tracksToAdd = shuffled.slice(0, Math.min(10, shuffled.length));

            for (const track of tracksToAdd) {
                track.searchSource = `Rádio ${genre.name}`;
                player.queue.add(track);
            }

            // Start playing if not already
            if (!player.playing && !player.paused) {
                await player.play();
            }

            // Save original requester
            player.originalRequester = message.author;
            player.originalSearchSource = `Rádio ${genre.name}`;

            // Build radio control panel with simple embed
            const currentTrack = tracksToAdd[0];

            const radioEmbed = new EmbedBuilder()
                .setColor(genre.color)
                .setAuthor({ name: '📻 Rádio Brunix', iconURL: client.user.displayAvatarURL() })
                .setTitle(`${genre.emoji} ${genre.name}`)
                .setDescription(
                    `**🔊 Canal:** ${voiceChannel.name}\n` +
                    `**📋 Na fila:** ${player.queue.tracks.length} músicas\n\n` +
                    (currentTrack ? `**🎵 Tocando:** ${truncate(currentTrack.info?.title, 40)}\n└ ${currentTrack.info?.author}` : '*Iniciando...*')
                )
                .setThumbnail(currentTrack?.info?.artworkUrl || client.user.displayAvatarURL())
                .setFooter({ text: `Solicitado por ${message.author.username} • Modo 24/7`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('radio_change_genre')
                    .setLabel('Trocar Gênero')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('radio_skip')
                    .setLabel('Pular')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('radio_pause')
                    .setEmoji('⏸️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('radio_stop')
                    .setLabel('Parar Rádio')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

            await loadingMsg.edit({
                embeds: [radioEmbed],
                components: [controlRow]
            });

            // Handle button interactions
            const collector = loadingMsg.createMessageComponentCollector({
                time: 3600000 // 1 hour
            });

            collector.on('collect', async (interaction) => {
                const currentPlayer = client.lavalink.players.get(message.guild.id);
                if (!currentPlayer) {
                    collector.stop();
                    return interaction.update({
                        embeds: [Embed.info('📻 Rádio desligada.')],
                        components: []
                    });
                }

                switch (interaction.customId) {
                    case 'radio_change_genre':
                        await this.handleChangeGenre(client, interaction, currentPlayer, loadingMsg);
                        break;

                    case 'radio_skip':
                        await currentPlayer.skip();
                        await interaction.reply({
                            content: '⏭️ Música pulada!',
                            ephemeral: true
                        });
                        break;

                    case 'radio_pause':
                        if (currentPlayer.paused) {
                            await currentPlayer.resume();
                        } else {
                            await currentPlayer.pause();
                        }
                        await interaction.reply({
                            content: currentPlayer.paused ? '⏸️ Pausado' : '▶️ Retomado',
                            ephemeral: true
                        });
                        break;

                    case 'radio_stop':
                        currentPlayer.radioMode = false;
                        await currentPlayer.destroy();
                        collector.stop();
                        await interaction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0x808080)
                                    .setTitle('📻 Rádio Desligada')
                                    .setDescription(`**${interaction.user.username}** desligou a rádio.`)
                                    .setTimestamp()
                            ],
                            components: []
                        });
                        break;
                }
            });

            Logger.music(`Radio started: ${genre.name} in ${voiceChannel.name} (${message.guild.name})`);

        } catch (error) {
            Logger.error('Radio start error:', error);
            await loadingMsg.edit({
                embeds: [Embed.error('Erro ao iniciar a rádio. Tente novamente.')]
            });
        }
    },

    /**
     * Handle genre change
     */
    async handleChangeGenre(client, interaction, player, originalMessage) {
        const genreOptions = Object.entries(RADIO_GENRES)
            .filter(([key]) => key !== 'random')
            .map(([key, genre]) => ({
                label: genre.name,
                value: key,
                emoji: genre.emoji
            }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('radio_new_genre')
            .setPlaceholder('🎵 Novo gênero...')
            .addOptions(genreOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.EMBED_INFO)
                    .setDescription('🔄 **Selecione o novo gênero:**')
            ],
            components: [row],
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id && i.customId === 'radio_new_genre';

        try {
            const selection = await interaction.channel.awaitMessageComponent({
                filter,
                time: 30000
            });

            const newGenreKey = selection.values[0];
            const newGenre = RADIO_GENRES[newGenreKey];

            // Update player settings
            player.radioGenre = newGenreKey;
            player.radioGenreData = newGenre;
            player.originalSearchSource = `Rádio ${newGenre.name}`;

            // Clear queue and add new tracks
            if (player.queue.tracks.length > 0) {
                await player.queue.splice(0, player.queue.tracks.length);
            }

            const query = newGenre.queries[Math.floor(Math.random() * newGenre.queries.length)];
            const result = await player.search({ query, source: 'ytmsearch' }, player.originalRequester || interaction.user);

            if (result.tracks?.length > 0) {
                const shuffled = result.tracks.sort(() => Math.random() - 0.5);
                const tracksToAdd = shuffled.slice(0, Math.min(10, shuffled.length));

                for (const track of tracksToAdd) {
                    track.searchSource = `Rádio ${newGenre.name}`;
                    player.queue.add(track);
                }
            }

            // Skip current track to start new genre
            await player.skip();

            await selection.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(newGenre.color)
                        .setDescription(`${newGenre.emoji} Gênero alterado para **${newGenre.name}**!`)
                ],
                components: []
            });

            // Update original message with simple embed
            const voiceChannel = client.channels.cache.get(player.voiceChannelId);
            const currentTrack = player.queue.current || player.queue.tracks[0];

            const radioEmbed = new EmbedBuilder()
                .setColor(newGenre.color)
                .setAuthor({ name: '📻 Rádio Brunix' })
                .setTitle(`${newGenre.emoji} ${newGenre.name}`)
                .setDescription(
                    `**🔊 Canal:** ${voiceChannel?.name || 'Desconhecido'}\n` +
                    `**📋 Na fila:** ${player.queue.tracks.length} músicas\n\n` +
                    (currentTrack ? `**🎵 Tocando:** ${truncate(currentTrack.info?.title, 40)}\n└ ${currentTrack.info?.author}` : '*Carregando...*')
                )
                .setThumbnail(currentTrack?.info?.artworkUrl)
                .setFooter({ text: `Gênero alterado • Modo 24/7` })
                .setTimestamp();

            await originalMessage.edit({
                embeds: [radioEmbed]
            }).catch(() => { });

            Logger.music(`Radio genre changed to: ${newGenre.name}`);

        } catch (e) {
            // Timeout or error
        }
    }
};
