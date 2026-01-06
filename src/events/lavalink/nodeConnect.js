// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Node Connect Event (lavalink-client)              ║
// ║         Notifies users when Lavalink successfully connects          ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'nodeConnect',

    async execute(client, node) {
        Logger.success(`Lavalink node "${node.id}" connected!`);

        // Track if this is a reconnection (not initial connection)
        if (!node.isFirstConnect) {
            node.isFirstConnect = true;
            return; // Don't notify on first connection
        }

        // Notify all active players about successful reconnection
        const players = client.lavalink.players.getAll();

        if (players.length === 0) return; // No active players to notify

        for (const player of players) {
            try {
                const channel = client.channels.cache.get(player.textChannelId);
                if (!channel) continue;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_SUCCESS)
                    .setTitle('✅ Sistema de Áudio Reconectado')
                    .setDescription(
                        `A conexão com o sistema de áudio foi restabelecida!\n\n` +
                        `🎵 Você pode retomar a reprodução usando \`/play\``
                    )
                    .setFooter({ text: 'Desculpe pela interrupção' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (err) {
                Logger.error(`Failed to notify channel about node reconnect:`, err);
            }
        }
    }
};
