// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /radio Slash Command                             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import { checkVoiceChannel, canJoinChannel } from '../../utils/permissions.js';
import Embed from '../../utils/embed.js';

const RADIO_GENRES = {
    pop: { name: 'Pop', emoji: '🎤', queries: ['top pop hits 2024', 'pop music mix', 'best pop songs'], color: 0xFF69B4 },
    rock: { name: 'Rock', emoji: '🎸', queries: ['rock classics mix', 'best rock songs', 'rock music playlist'], color: 0xDC143C },
    hiphop: { name: 'Hip-Hop', emoji: '🎧', queries: ['hip hop mix 2024', 'best rap songs', 'hip hop playlist'], color: 0xFFD700 },
    edm: { name: 'EDM', emoji: '🎹', queries: ['edm mix 2024', 'electronic dance music', 'house music mix'], color: 0x00FFFF },
    jazz: { name: 'Jazz', emoji: '🎷', queries: ['jazz music mix', 'smooth jazz playlist', 'jazz classics'], color: 0x8B4513 },
    lofi: { name: 'Lo-Fi', emoji: '🌙', queries: ['lofi hip hop', 'chill beats', 'study music lofi'], color: 0x9370DB },
    random: { name: 'Aleatório', emoji: '🎲', queries: ['popular music mix', 'top hits', 'trending music'], color: 0x7289DA }
};

export default {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('[MUSIC] 📻 Starts 24/7 radio mode with music genre')
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('Music genre')
                .setRequired(true)
                .addChoices(
                    ...Object.entries(RADIO_GENRES).map(([key, data]) => ({
                        name: `${data.emoji} ${data.name}`,
                        value: key
                    }))
                )
        ),

    async execute(interaction) {
        const genreKey = interaction.options.getString('genre');
        const genre = RADIO_GENRES[genreKey];

        // Voice check
        const voiceCheck = checkVoiceChannel(interaction.member);
        if (!voiceCheck.inChannel) {
            return interaction.reply({
                embeds: [Embed.error(voiceCheck.error)],
                ephemeral: true
            });
        }

        const permCheck = canJoinChannel(voiceCheck.channel);
        if (!permCheck.canJoin) {
            return interaction.reply({
                embeds: [Embed.error(permCheck.error)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            let player = interaction.client.lavalink.players.get(interaction.guild.id);

            if (!player) {
                player = await interaction.client.lavalink.createPlayer({
                    guildId: interaction.guild.id,
                    voiceChannelId: voiceCheck.channel.id,
                    textChannelId: interaction.channel.id,
                    selfDeaf: true,
                    volume: 60
                });
                await player.connect();
            }

            // Enable radio mode
            player.radioMode = true;
            player.radioGenre = genreKey;
            player.radioGenreData = genre;
            player.autoplay = true;

            // Clear queue
            if (player.queue.tracks.length > 0) {
                await player.queue.splice(0, player.queue.tracks.length);
            }

            // Search initial tracks
            const query = genre.queries[Math.floor(Math.random() * genre.queries.length)];
            const result = await player.search({ query, source: 'ytmsearch' }, interaction.user);

            if (!result.tracks?.length) {
                return interaction.editReply({
                    embeds: [Embed.error(`Não encontrei músicas para o gênero ${genre.name}`)]
                });
            }

            const shuffled = result.tracks.sort(() => Math.random() - 0.5);
            const tracksToAdd = shuffled.slice(0, Math.min(10, shuffled.length));

            for (const track of tracksToAdd) {
                track.searchSource = `Rádio ${genre.name}`;
                player.queue.add(track);
            }

            const embed = new EmbedBuilder()
                .setColor(genre.color)
                .setAuthor({ name: `📻 Rádio ${genre.name}`, iconURL: interaction.guild.iconURL() })
                .setDescription(`${genre.emoji} Modo rádio 24/7 ativado!\n\n**Gênero:** ${genre.name}\n**Músicas na fila:** ${tracksToAdd.length}\n**Autoplay:** Ativado`)
                .setFooter({ text: 'O rádio tocará continuamente até você usar /stop' });

            await interaction.editReply({ embeds: [embed] });

            if (!player.playing && !player.paused) {
                await player.play();
            }

        } catch (error) {
            console.error('Radio error:', error);
            await interaction.editReply({
                embeds: [Embed.error('Erro ao iniciar o rádio.')]
            });
        }
    }
};
