// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Music Permission Guard                            ║
// ║        Protects player controls from unauthorized users             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../config/constants.js';

/**
 * Check if user has permission to control the player
 * @param {Object} player - The music player
 * @param {Object} member - The member trying to control
 * @param {Object} message - The message object
 * @param {string} action - The action being performed (skip, stop, disconnect, etc)
 * @returns {Promise<boolean>} - True if allowed, false if denied
 */
export async function checkMusicPermission(player, member, message, action) {
    // Get current track
    const currentTrack = player.queue?.current;
    if (!currentTrack) return true; // No track playing, allow

    const trackOwner = currentTrack.requester;
    if (!trackOwner) return true; // No requester set, allow

    // Check if the user IS the track owner
    if (member.id === trackOwner.id) {
        return true; // Owner can always control
    }

    // Check if user has DJ role or admin permissions
    if (member.permissions.has('Administrator') ||
        member.permissions.has('ManageGuild') ||
        member.roles.cache.some(role => role.name.toLowerCase().includes('dj'))) {
        return true; // Admins and DJs can alsmways control
    }

    // Check if user is alone in voice channel with bot
    const voiceChannel = member.voice.channel;
    if (voiceChannel) {
        const membersInChannel = voiceChannel.members.filter(m => !m.user.bot);
        if (membersInChannel.size === 1 && membersInChannel.has(member.id)) {
            return true; // Only user in channel, allow
        }
    }

    // User doesn't have permission - ask the track owner
    return await requestPermission(player, member, trackOwner, message, action);
}

/**
 * Request permission from the track owner
 */
async function requestPermission(player, requester, trackOwner, message, action) {
    const actionLabels = {
        skip: 'pular a música',
        stop: 'parar o player',
        disconnect: 'desconectar o bot',
        pause: 'pausar a música',
        clear: 'limpar a fila',
        shuffle: 'embaralhar a fila'
    };

    const actionLabel = actionLabels[action] || action;

    const embed = new EmbedBuilder()
        .setColor(COLORS.EMBED_WARNING)
        .setTitle('🔒 Permissão Necessária')
        .setDescription(
            `**${requester.user.username}** quer **${actionLabel}**.\n\n` +
            `${trackOwner}, você permite?`
        )
        .setFooter({ text: 'Responda em 30 segundos' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_perm_allow')
            .setLabel('Permitir')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('music_perm_deny')
            .setLabel('Negar')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)
    );

    const permMsg = await message.channel.send({
        content: `<@${trackOwner.id}>`,
        embeds: [embed],
        components: [row]
    });

    return new Promise((resolve) => {
        const collector = permMsg.createMessageComponentCollector({
            filter: i => i.user.id === trackOwner.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'music_perm_allow') {
                await interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.EMBED_SUCCESS)
                            .setDescription(`✅ **${trackOwner.username}** permitiu que **${requester.user.username}** ${actionLabel}.`)
                    ],
                    components: [],
                    content: null
                });
                setTimeout(() => permMsg.delete().catch(() => { }), 5000);
                resolve(true);
            } else {
                await interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.EMBED_ERROR)
                            .setDescription(`❌ **${trackOwner.username}** negou a solicitação.`)
                    ],
                    components: [],
                    content: null
                });
                setTimeout(() => permMsg.delete().catch(() => { }), 5000);
                resolve(false);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                permMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x808080)
                            .setDescription('⏰ Tempo esgotado. Ação negada.')
                    ],
                    components: [],
                    content: null
                }).catch(() => { });
                setTimeout(() => permMsg.delete().catch(() => { }), 3000);
                resolve(false);
            }
        });
    });
}

/**
 * Quick check without asking - just returns if user can control
 */
export function canControlPlayer(player, member) {
    const currentTrack = player.queue?.current;
    if (!currentTrack) return true;

    const trackOwner = currentTrack.requester;
    if (!trackOwner) return true;

    // Owner check
    if (member.id === trackOwner.id) return true;

    // Admin/DJ check
    if (member.permissions.has('Administrator') ||
        member.permissions.has('ManageGuild') ||
        member.roles.cache.some(role => role.name.toLowerCase().includes('dj'))) {
        return true;
    }

    // Alone in voice channel
    const voiceChannel = member.voice.channel;
    if (voiceChannel) {
        const membersInChannel = voiceChannel.members.filter(m => !m.user.bot);
        if (membersInChannel.size === 1) return true;
    }

    return false;
}

export default { checkMusicPermission, canControlPlayer };
