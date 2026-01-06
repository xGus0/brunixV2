// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Node Closed Event (lavalink-client)                ║
// ║           Notifies users when Lavalink connection closes            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'nodeDisconnect',

    async execute(client, node, reason) {
        Logger.warn(`Lavalink node "${node.id}" disconnected - Reason: ${reason || 'Unknown'}`);

        // Notify all active players about the disconnection
        const players = client.lavalink.players.getAll();

        for (const player of players) {
            try {
                const channel = client.channels.cache.get(player.textChannelId);
                if (!channel) continue;

                // Clear update intervals
                if (player.updateInterval) {
                    clearInterval(player.updateInterval);
                    player.updateInterval = null;
                }

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_WARNING)
                    .setTitle('🔌 Sistema de Áudio Desconectado')
                    .setDescription(
                        `A conexão com o sistema de áudio foi perdida. A reprodução foi interrompida.\n\n` +
                        `**Motivo:** ${reason || 'Desconhecido'}\n\n` +
                        `⏳ Tentando reconectar automaticamente...`
                    )
                    .setFooter({ text: 'Use /play para retomar quando a conexão for restabelecida' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (err) {
                Logger.error(`Failed to notify channel about node disconnect:`, err);
            }
        }
    }
};
