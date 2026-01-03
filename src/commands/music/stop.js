// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        stop Command                                 ║
// ║         Protected Disconnect - Full Reset                          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { PermissionFlagsBits } from 'discord.js';
import Embed from '../../utils/embed.js';
import { checkVoiceChannel } from '../../utils/permissions.js';
import { checkMusicPermission } from '../../utils/musicPermission.js';

export default {
    name: 'stop',
    aliases: ['parar', 'dc', 'disconnect', 'leave', 'sair'],
    description: 'Para a música, desconecta e reseta todas as configurações',
    category: 'music',
    cooldown: 3,

    async execute(client, message, args) {
        // Check if user is in a voice channel
        const voiceCheck = checkVoiceChannel(message.member);
        if (!voiceCheck.inChannel) {
            return message.reply({ embeds: [Embed.error(voiceCheck.error)] });
        }

        const player = client.lavalink.players.get(message.guild.id);

        // If no player exists, just confirm and return
        if (!player) {
            return message.reply({
                embeds: [Embed.info('📭 Não estou conectado em nenhum canal de voz neste servidor.')]
            });
        }

        // Check if user is in the same channel as bot
        if (message.member.voice.channelId !== player.voiceChannelId) {
            return message.reply({
                embeds: [Embed.error('Você precisa estar no mesmo canal de voz que eu!')]
            });
        }

        // Check permission to control the player
        const hasPermission = await checkMusicPermission(player, message.member, message, 'disconnect');
        if (!hasPermission) {
            return; // Permission was denied or timed out
        }

        // ════════════════════════════════════════════════════════════
        // FULL RESET - Clear everything
        // ════════════════════════════════════════════════════════════

        // Clean up now playing message
        if (player.nowPlayingMessage) {
            try { await player.nowPlayingMessage.delete(); } catch { }
        }

        // Stop canvas update interval
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }

        // Destroy player (this clears everything: queue, effects, etc)
        await player.destroy();

        await message.reply({
            embeds: [Embed.success('⏹️ **Reprodução finalizada!** Até mais! 👋')]
        });
    }
};
