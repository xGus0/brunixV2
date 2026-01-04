// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    !profile Command                                  ║
// ║                   User Profile (Canvas & i18n)                       ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import UserRepository from '../../database/repositories/UserRepository.js';
import FavoriteRepository from '../../database/repositories/FavoriteRepository.js';
import PlaylistRepository from '../../database/repositories/PlaylistRepository.js';
import HistoryRepository from '../../database/repositories/HistoryRepository.js';
import ProfileCard from '../../canvas/templates/ProfileCard.js';
import i18n from '../../utils/i18n.js';

export default {
    name: 'profile',
    aliases: ['p', 'user', 'me', 'perfil'],
    description: 'Shows user profile',
    category: 'user',

    async execute(client, message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        let processingMsg = null;

        try {
            // Get guild language
            const lang = await getGuildLanguage(client, message.guild.id);
            const t = (key) => i18n.t(lang, `commands.profile.responses.${key}`);
            const tCard = (key) => i18n.t(lang, `commands.profile.responses.card.${key}`);

            processingMsg = await message.reply(`⏳ ${i18n.t(lang, 'common.loading')}`);

            // Initialize repositories
            const userRepo = new UserRepository(client.db);
            const favoriteRepo = new FavoriteRepository(client.db);
            const playlistRepo = new PlaylistRepository(client.db);
            const historyRepo = new HistoryRepository(client.db);

            // Get user data - pass Discord user object
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

            // Get additional stats for card
            const recents = await historyRepo.getRecents(targetUser.id, 4);
            const topArtistData = await historyRepo.getTopArtist(targetUser.id);

            // Try to find an image for the top artist from recents
            let topArtistImg = null;
            if (topArtistData) {
                const track = recents.find(r => r.author === topArtistData.name) ||
                    (await historyRepo.getRecents(targetUser.id, 20)).find(r => r.author === topArtistData.name);
                if (track) topArtistImg = track.thumbnail;
            }

            // Prepare texts for canvas
            const cardTexts = {
                songs_listened: tCard('songs_listened'),
                recent: tCard('recent'),
                top_artist: tCard('top_artist'),
                hours_listened: tCard('hours_listened'),
                various_artists: tCard('various_artists'),
                music_lover: tCard('music_lover'),
                verified: tCard('verified'),
                level: tCard('level')
            };

            // Try to generate profile card
            try {
                const cardBuffer = await ProfileCard.generate({
                    user: targetUser,
                    stats: {
                        totalPlayed: userData?.total_played || 0,
                        totalTime: userData?.total_time_listened || 0,
                        topArtist: topArtistData?.name,
                        topArtistImg: topArtistImg,
                        recentCovers: recents.map(r => r.thumbnail).filter(t => t)
                    }
                }, cardTexts);

                const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile.png' });

                await processingMsg.delete().catch(() => { });
                await message.reply({ files: [attachment] });

            } catch (cardError) {
                // Fallback to embed if canvas fails
                console.error('ProfileCard error:', cardError);
                await processingMsg.delete().catch(() => { });
                await sendFallbackEmbed(message, targetUser, userData, favoriteCount, playlistCount, t);
            }

        } catch (error) {
            console.error('Profile error:', error);
            if (processingMsg) await processingMsg.delete().catch(() => { });
            await message.reply('❌ An error occurred while fetching profile.');
        }
    }
};

/**
 * Get guild language from database (Helper)
 */
async function getGuildLanguage(client, guildId) {
    try {
        const { data } = await client.db.from('guild_configs').select('language').eq('guild_id', guildId).single();
        return data?.language || 'pt-BR';
    } catch {
        return 'pt-BR';
    }
}

/**
 * Send fallback embed when canvas fails
 */
async function sendFallbackEmbed(message, targetUser, userData, favoriteCount, playlistCount, t) {
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
                name: `🎵 ${t('total_songs')}`,
                value: `\`${totalSongs.toLocaleString()}\``,
                inline: true
            },
            {
                name: `⏱️ ${t('total_time')}`,
                value: `\`${timeFormatted}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: `💖 ${t('favorites')}`,
                value: `\`${favoriteCount}\``,
                inline: true
            },
            {
                name: `📋 ${t('playlists')}`,
                value: `\`${playlistCount}\``,
                inline: true
            }
        )
        .setFooter({
            text: 'Brunix Music',
            iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
