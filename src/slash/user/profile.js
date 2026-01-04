// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /profile Slash Command                           ║
// ║                   Perfil do Usuário Brunix                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import UserRepository from '../../database/repositories/UserRepository.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import ProfileCard from '../../canvas/templates/ProfileCard.js';

export default {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('[USER] 👤 Mostra o perfil do usuário')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Usuário para ver perfil (padrão: você)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Initialize repositories
            const userRepo = new UserRepository(interaction.client.db);
            const favoriteRepo = new FavoriteRepository(interaction.client.db);
            const playlistRepo = new PlaylistRepository(interaction.client.db);

            // Get user data - pass Discord user object, not separate params
            const userData = await userRepo.getOrCreate(targetUser);

            // Get favorites count
            let favoriteCount = 0;
            try {
                const favorites = await favoriteRepo.getAll(targetUser.id);
                favoriteCount = Array.isArray(favorites) ? favorites.length : 0;
            } catch { }

            // Get playlists count
            let playlistCount = 0;
            try {
                const playlists = await playlistRepo.getUserPlaylists(targetUser.id);
                playlistCount = Array.isArray(playlists) ? playlists.length : 0;
            } catch { }

            // Try to generate profile card
            try {
                const cardBuffer = await ProfileCard.generate({
                    username: targetUser.username,
                    avatar: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                    totalSongs: userData?.total_played || 0,
                    totalTime: userData?.total_time_listened || 0,
                    favoriteCount: favoriteCount,
                    playlistCount: playlistCount,
                    isPremium: false
                });

                const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile.png' });
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setImage('attachment://profile.png');

                await interaction.editReply({ embeds: [embed], files: [attachment] });

            } catch (cardError) {
                // Fallback to embed if canvas fails
                console.error('ProfileCard error:', cardError);
                await sendFallbackEmbed(interaction, targetUser, userData, favoriteCount, playlistCount);
            }

        } catch (error) {
            console.error('Profile error:', error);
            await sendFallbackEmbed(interaction, targetUser, null, 0, 0);
        }
    }
};

/**
 * Send fallback embed when canvas fails
 */
async function sendFallbackEmbed(interaction, targetUser, userData, favoriteCount, playlistCount) {
    const totalSongs = userData?.total_played || 0;
    const totalTime = userData?.total_time_listened || 0;

    // Format listening time
    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const embed = new EmbedBuilder()
        .setColor(COLORS.EMBED_DEFAULT)
        .setAuthor({
            name: `${targetUser.username}'s Profile`,
            iconURL: targetUser.displayAvatarURL()
        })
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
            {
                name: '🎵 Songs Played',
                value: `\`${totalSongs.toLocaleString()}\``,
                inline: true
            },
            {
                name: '⏱️ Listening Time',
                value: `\`${timeFormatted}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: '💖 Favorites',
                value: `\`${favoriteCount}\``,
                inline: true
            },
            {
                name: '📋 Playlists',
                value: `\`${playlistCount}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        )
        .setFooter({
            text: 'Keep using Brunix to build your stats!',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
