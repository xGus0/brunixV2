// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      profile Command                                ║
// ║                Premium Profile without Loading                      ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatNumber } from '../../utils/formatters.js';
import { EMOJIS, COLORS } from '../../config/constants.js';
import ProfileCard from '../../canvas/templates/ProfileCard.js';
import UserRepository from '../../database/repositories/UserRepository.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import HistoryRepository from '../../database/repositories/HistoryRepository.js';
import ArtistRepository from '../../database/repositories/ArtistRepository.js';
import Logger from '../../utils/logger.js';

export default {
    name: 'profile',
    aliases: ['perfil', 'me', 'stats'],
    description: 'Visualiza o perfil de música de um usuário',
    usage: '[@usuário]',
    category: 'user',
    cooldown: 5,

    async execute(client, message, args) {
        const targetUser = message.mentions.users.first() || message.author;

        const generateProfilePayload = async () => {
            const userRepo = new UserRepository(client.db);
            const favoriteRepo = new FavoriteRepository(client.db);
            const playlistRepo = new PlaylistRepository(client.db);
            const historyRepo = new HistoryRepository(client.db);
            const artistRepo = new ArtistRepository(client.db);

            // Get all data in parallel
            const [profile, stats, favoriteCount, playlistCount, topArtistData, recents] = await Promise.all([
                userRepo.getOrCreate(targetUser),
                userRepo.getStats(targetUser.id),
                favoriteRepo.count(targetUser.id),
                playlistRepo.countUserPlaylists(targetUser.id),
                historyRepo.getTopArtist(targetUser.id),
                historyRepo.getRecents(targetUser.id, 4)
            ]);

            // Get Artist Image if Top Artist exists
            let artistImg = null;
            if (topArtistData) {
                const artistInfo = await artistRepo.getByName(topArtistData.name);
                artistImg = artistInfo?.image_url || null;
            }

            // Generate canvas
            const canvas = await ProfileCard.generate({
                user: targetUser,
                stats: {
                    totalPlayed: stats?.total_played || 0,
                    totalTime: stats?.total_time_listened || 0,
                    rank: stats?.rank || 0,
                    favorites: favoriteCount,
                    playlists: playlistCount,
                    topArtist: topArtistData ? topArtistData.name : 'Vários Artistas',
                    topArtistImg: artistImg,
                    recentCovers: recents.map(r => r.thumbnail).filter(t => t)
                }
            });

            return new AttachmentBuilder(canvas, { name: 'profile.png' });
        };

        try {
            const attachment = await generateProfilePayload();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('profile_like')
                        .setLabel('Curtir')
                        .setEmoji('❤️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('profile_refresh')
                        .setLabel('Atualizar')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary)
                );

            const response = await message.reply({
                content: `> **Perfil de ${targetUser.username}**`, // Minimal content header
                files: [attachment],
                components: [row]
            });

            // Create Collector
            const collector = response.createMessageComponentCollector({
                time: 60000 // 1 minute active
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: '❌ Apenas quem chamou o comando pode interagir.', ephemeral: true });
                }

                if (i.customId === 'profile_like') {
                    await i.reply({ content: `❤️ **Você curtiu o perfil de ${targetUser.username}!**`, ephemeral: true });
                    // Here we could add logic to increment a "likes" counter in DB
                }

                if (i.customId === 'profile_refresh') {
                    await i.deferUpdate();
                    try {
                        const newAttachment = await generateProfilePayload();
                        await i.editReply({ files: [newAttachment] });
                    } catch (e) {
                        // Ignore errors on refresh
                    }
                }
            });

            collector.on('end', () => {
                // Disable buttons on timeout
                const disabledRow = ActionRowBuilder.from(row);
                disabledRow.components.forEach(c => c.setDisabled(true));
                response.edit({ components: [disabledRow] }).catch(() => { });
            });

        } catch (error) {
            Logger.error('Profile command error:', error);
            await message.reply({ content: '❌ Erro ao gerar perfil.' });
        }
    }
};
