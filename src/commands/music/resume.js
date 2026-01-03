// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       resume Command                                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';

export default {
    name: 'resume',
    aliases: ['continuar', 'unpause', 'r'],
    description: 'Retoma a música pausada',
    category: 'music',
    cooldown: 2,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        if (!player.paused) {
            return message.reply({
                embeds: [Embed.warning('A música não está pausada!')]
            });
        }

        await player.resume();
        await message.reply({ embeds: [Embed.success('▶️ Reprodução retomada!')] });
    }
};
