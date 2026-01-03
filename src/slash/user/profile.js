// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /profile Slash Command                           ║
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
        .setDescription('[USER] 👤 Shows user profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile (default: you)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const userRepo = new UserRepository(interaction.client.db);
            const favoriteRepo = new FavoriteRepository(interaction.client.db);
            const playlistRepo = new PlaylistRepository(interaction.client.db);

            const userData = await userRepo.getOrCreate(targetUser.id, targetUser.username);
            const favorites = await favoriteRepo.getUserFavorites(targetUser.id);
            const playlists = await playlistRepo.getUserPlaylists(targetUser.id);

            // Generate profile card
            const cardBuffer = await ProfileCard.generate({
                username: targetUser.username,
                avatar: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                totalSongs: userData.total_songs_played || 0,
                totalTime: userData.total_listening_time || 0,
                favoriteCount: favorites.length,
                playlistCount: playlists.length,
                isPremium: false
            });

            const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile.png' });
            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setImage('attachment://profile.png');

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Profile error:', error);

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_DEFAULT)
                .setAuthor({ name: `👤 Perfil de ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '📊 Estatísticas', value: 'Em breve...', inline: false }
                )
                .setFooter({ text: 'Use o bot para acumular estatísticas!' });

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
