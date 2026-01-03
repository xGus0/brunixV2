// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        skip Command                                 ║
// ║         Smart Skip with Autoplay Check & Queue Validation           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';
import { truncate } from '../../utils/formatters.js';
import { checkMusicPermission } from '../../utils/musicPermission.js';

export default {
    name: 'skip',
    aliases: ['s', 'pular', 'next'],
    description: 'Pula para a próxima música',
    category: 'music',
    cooldown: 2,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        // Check permission to control the player
        const hasPermission = await checkMusicPermission(player, message.member, message, 'skip');
        if (!hasPermission) {
            return; // Permission was denied or timed out
        }

        const current = player.queue.current;
        const queueSize = player.queue.tracks.length;
        const hasNextTrack = queueSize > 0;

        // BLOCK skip if no next track AND autoplay is disabled
        if (!hasNextTrack && !player.autoplay) {
            return message.reply({
                embeds: [Embed.error('❌ Não há próxima música na fila!\n\n💡 **Dica:** Ative o autoplay clicando no botão 🔄 no player para continuar tocando automaticamente.')]
            });
        }

        // Get next track info before skipping (for message)
        const nextTrack = player.queue.tracks[0];

        // Execute skip
        await player.skip();

        // Send feedback
        const currentTitle = current?.info?.title || 'Música atual';
        if (hasNextTrack && nextTrack) {
            await message.reply({
                embeds: [Embed.success(`⏭️ Pulando **${truncate(currentTitle, 35)}**\n▶️ Próxima: **${truncate(nextTrack.info?.title || 'Próxima', 35)}**`)]
            });
        } else if (player.autoplay) {
            await message.reply({
                embeds: [Embed.success(`⏭️ Pulando **${truncate(currentTitle, 35)}**\n🔄 Autoplay ativado, buscando próxima...`)]
            });
        }
    }
};
