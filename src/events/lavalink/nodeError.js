// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Node Error Event (lavalink-client)                ║
// ║              Notifies users when Lavalink has errors                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'nodeError',

    async execute(client, node, error) {
        Logger.error(`Lavalink node "${node.id}" error:`, error?.message || error);

        // Notify all active players about the error
        const players = client.lavalink.players.getAll();

        for (const player of players) {
            try {
                const channel = client.channels.cache.get(player.textChannelId);
                if (!channel) continue;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_ERROR)
                    .setTitle('⚠️ Erro no Sistema de Áudio')
                    .setDescription(
                        `Ocorreu um erro no sistema de áudio. A reprodução pode ser interrompida.\n\n` +
                        `**Erro:** ${error?.message || 'Erro desconhecido'}\n\n` +
                        `Por favor, aguarde enquanto tentamos reconectar...`
                    )
                    .setFooter({ text: 'Se o problema persistir, tente novamente em alguns minutos' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (err) {
                Logger.error(`Failed to notify channel about node error:`, err);
            }
        }
    }
};
