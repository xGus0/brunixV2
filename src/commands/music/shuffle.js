// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       shuffle Command                               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';
import { checkMusicPermission } from '../../utils/musicPermission.js';

export default {
    name: 'shuffle',
    aliases: ['embaralhar', 'random', 'aleatorio'],
    description: 'Embaralha a fila',
    category: 'music',
    cooldown: 3,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        // Check permission to control the player
        const hasPermission = await checkMusicPermission(player, message.member, message, 'shuffle');
        if (!hasPermission) {
            return; // Permission was denied or timed out
        }

        if (player.queue.tracks.length < 2) {
            return message.reply({
                embeds: [Embed.warning('Precisa de pelo menos 2 músicas na fila!')]
            });
        }

        player.queue.shuffle();
        await message.reply({
            embeds: [Embed.success(`🔀 Fila embaralhada! (${player.queue.tracks.length} músicas)`)]
        });
    }
};
