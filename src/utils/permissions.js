// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Permission Checker                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { PermissionFlagsBits } from 'discord.js';

/**
 * Check if user has required permissions
 * @param {GuildMember} member - Guild member to check
 * @param {Array<bigint>} permissions - Required permissions
 * @returns {boolean}
 */
export function hasPermissions(member, permissions) {
    return permissions.every(perm => member.permissions.has(perm));
}

/**
 * Check if user is in a voice channel
 * @param {GuildMember} member - Guild member to check
 * @returns {{ inChannel: boolean, channel?: VoiceChannel, success?: boolean }}
 */
export function checkVoiceChannel(member) {
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return { inChannel: false, success: false, error: 'Você precisa estar em um canal de voz!' };
    }

    return { inChannel: true, success: true, channel: voiceChannel };
}

/**
 * Check if bot can join voice channel
 * @param {VoiceChannel} channel - Voice channel to check
 * @param {Client} client - Bot client
 * @returns {{ canJoin: boolean, success?: boolean, error?: string }}
 */
export function canJoinChannel(channel, client) {
    const permissions = channel.permissionsFor(channel.guild.members.me);

    if (!permissions.has(PermissionFlagsBits.Connect)) {
        return { canJoin: false, success: false, error: 'Não tenho permissão para conectar neste canal!' };
    }

    if (!permissions.has(PermissionFlagsBits.Speak)) {
        return { canJoin: false, success: false, error: 'Não tenho permissão para falar neste canal!' };
    }

    if (channel.full && !permissions.has(PermissionFlagsBits.MoveMembers)) {
        return { canJoin: false, success: false, error: 'O canal de voz está cheio!' };
    }

    return { canJoin: true, success: true };
}

/**
 * Check if user is in same voice channel as bot
 * @param {GuildMember} member - Guild member
 * @param {Player} player - Music player (lavalink-client)
 * @returns {{ sameChannel: boolean, error?: string }}
 */
export function checkSameChannel(member, player) {
    if (!player) {
        return { sameChannel: false, error: 'Não há nenhuma música tocando!' };
    }

    // lavalink-client uses voiceChannelId
    const playerVoiceId = player.voiceChannelId || player.voiceId;

    if (member.voice.channelId !== playerVoiceId) {
        return { sameChannel: false, error: 'Você precisa estar no mesmo canal de voz que eu!' };
    }

    return { sameChannel: true };
}
