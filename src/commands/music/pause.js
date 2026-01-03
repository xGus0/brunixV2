// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        pause Command                                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';
import { checkMusicPermission } from '../../utils/musicPermission.js';

export default {
    name: 'pause',
    aliases: ['pausar'],
    description: 'Pausa a música atual',
    category: 'music',
    cooldown: 2,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        // Check permission to control the player
        const hasPermission = await checkMusicPermission(player, message.member, message, 'pause');
        if (!hasPermission) {
            return; // Permission was denied or timed out
        }

        if (player.paused) {
            return message.reply({
                embeds: [Embed.warning('A música já está pausada! Use `!resume` para continuar.')]
            });
        }

        await player.pause();
        await message.reply({ embeds: [Embed.success('⏸️ Música pausada!')] });
    }
};
