// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       volume Command                                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';
import { LIMITS } from '../../config/constants.js';

export default {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Ajusta o volume',
    usage: '<0-150>',
    category: 'music',
    cooldown: 2,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        if (!args.length) {
            const emoji = this.getVolumeEmoji(player.volume);
            return message.reply({
                embeds: [Embed.info(`${emoji} Volume: **${player.volume}%**`)]
            });
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume) || volume < LIMITS.VOLUME_MIN || volume > LIMITS.VOLUME_MAX) {
            return message.reply({
                embeds: [Embed.error(`Volume deve ser entre ${LIMITS.VOLUME_MIN} e ${LIMITS.VOLUME_MAX}`)]
            });
        }

        const oldVolume = player.volume;
        await player.setVolume(volume);

        const emoji = this.getVolumeEmoji(volume);
        await message.reply({
            embeds: [Embed.success(`${emoji} Volume: **${oldVolume}%** → **${volume}%**`)]
        });
    },

    getVolumeEmoji(volume) {
        if (volume === 0) return '🔇';
        if (volume < 30) return '🔈';
        if (volume < 70) return '🔉';
        return '🔊';
    }
};
