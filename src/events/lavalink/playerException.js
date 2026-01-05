// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Player Error Event (lavalink-client)               ║
// ║          Notifies users when a player encounters an error           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'playerException',

    async execute(client, player, track, exception) {
        Logger.error(`Player exception in guild ${player.guildId}:`, exception?.message || exception);

        try {
            const channel = client.channels.cache.get(player.textChannelId);
            if (!channel) return;

            // Determine error type and message
            let errorTitle = '⚠️ Erro na Reprodução';
            let errorDescription = 'Ocorreu um erro ao reproduzir a música.';
            let suggestion = 'Tente novamente ou escolha outra música.';

            if (exception?.message) {
                const msg = exception.message.toLowerCase();

                if (msg.includes('video unavailable') || msg.includes('not available')) {
                    errorTitle = '🚫 Vídeo Indisponível';
                    errorDescription = 'Esta música não está disponível no momento.';
                    suggestion = 'Pode estar bloqueada na sua região ou foi removida.';
                } else if (msg.includes('age restricted')) {
                    errorTitle = '🔞 Conteúdo Restrito';
                    errorDescription = 'Esta música tem restrição de idade.';
                    suggestion = 'Não é possível reproduzir conteúdo com restrição de idade.';
                } else if (msg.includes('copyright')) {
                    errorTitle = '©️ Bloqueio de Direitos Autorais';
                    errorDescription = 'Esta música está bloqueada por direitos autorais.';
                    suggestion = 'Tente procurar por uma versão alternativa.';
                } else if (msg.includes('private')) {
                    errorTitle = '🔒 Vídeo Privado';
                    errorDescription = 'Este vídeo é privado e não pode ser reproduzido.';
                    suggestion = 'Escolha uma música pública.';
                } else if (msg.includes('timeout') || msg.includes('timed out')) {
                    errorTitle = '⏱️ Tempo Esgotado';
                    errorDescription = 'A solicitação demorou muito para responder.';
                    suggestion = 'Tente novamente em alguns segundos.';
                }
            }

            const trackTitle = track?.info?.title || 'Música desconhecida';
            const trackAuthor = track?.info?.author || 'Artista desconhecido';

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_ERROR)
                .setTitle(errorTitle)
                .setDescription(
                    `**Música:** ${trackTitle}\n` +
                    `**Artista:** ${trackAuthor}\n\n` +
                    `${errorDescription}\n\n` +
                    `💡 **Sugestão:** ${suggestion}`
                )
                .setFooter({ text: 'Pulando para a próxima música...' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Auto-skip to next track if available
            if (player.queue.tracks.length > 0) {
                setTimeout(() => {
                    player.skip().catch(() => { });
                }, 2000);
            }
        } catch (err) {
            Logger.error(`Failed to handle player exception:`, err);
        }
    }
};
