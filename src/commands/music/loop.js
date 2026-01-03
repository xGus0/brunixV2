// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        loop Command                                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Embed from '../../utils/embed.js';
import { checkSameChannel } from '../../utils/permissions.js';

export default {
    name: 'loop',
    aliases: ['repeat', 'repetir', 'lp'],
    description: 'Configura o modo de repetição',
    usage: '[off|track|queue]',
    category: 'music',
    cooldown: 2,

    async execute(client, message, args) {
        const player = client.lavalink.players.get(message.guild.id);

        const check = checkSameChannel(message.member, player);
        if (!check.sameChannel) {
            return message.reply({ embeds: [Embed.error(check.error)] });
        }

        const mode = args[0]?.toLowerCase();

        // Toggle if no mode specified
        if (!mode) {
            const modes = ['off', 'track', 'queue'];
            const current = modes.indexOf(player.repeatMode || 'off');
            const next = modes[(current + 1) % 3];
            await player.setRepeatMode(next);

            // Disable autoplay when loop is enabled (avoid conflicts)
            let autoplayNote = '';
            if (next !== 'off' && player.autoplay) {
                player.autoplay = false;
                autoplayNote = '\n📻 Autoplay desativado automaticamente.';
            }

            const messages = {
                'off': '➡️ Repetição **desativada**',
                'track': '🔂 Repetindo **música atual**',
                'queue': '🔁 Repetindo **toda a fila**'
            };

            return message.reply({ embeds: [Embed.success(messages[next] + autoplayNote)] });
        }

        // Set specific mode
        let loopMode, responseMessage;

        switch (mode) {
            case 'off':
            case 'none':
            case 'desativar':
                loopMode = 'off';
                responseMessage = '➡️ Repetição **desativada**';
                break;
            case 'track':
            case 'musica':
            case 'música':
            case 'single':
                loopMode = 'track';
                responseMessage = '🔂 Repetindo **música atual**';
                break;
            case 'queue':
            case 'fila':
            case 'all':
                loopMode = 'queue';
                responseMessage = '🔁 Repetindo **toda a fila**';
                break;
            default:
                return message.reply({
                    embeds: [Embed.error('Modo inválido. Use: `off`, `track` ou `queue`')]
                });
        }

        await player.setRepeatMode(loopMode);

        // Disable autoplay when loop is enabled (avoid conflicts)
        if (loopMode !== 'off' && player.autoplay) {
            player.autoplay = false;
            responseMessage += '\n📻 Autoplay desativado automaticamente.';
        }

        await message.reply({ embeds: [Embed.success(responseMessage)] });
    }
};
