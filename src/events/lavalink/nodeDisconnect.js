// ╔═══════════════════════════════════════════════════════════════════╗
// ║                Node Reconnecting Event (lavalink-client)            ║
// ║            Notifies users when Lavalink is reconnecting             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'nodeReconnecting',

    async execute(client, node) {
        Logger.warn(`Lavalink node "${node.id}" reconnecting...`);

        // Notify all active players about reconnection attempt
        const players = client.lavalink.players.getAll();

        for (const player of players) {
            try {
                const channel = client.channels.cache.get(player.textChannelId);
                if (!channel) continue;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_INFO)
                    .setTitle('🔄 Reconectando ao Servidor de Música')
                    .setDescription(
                        `Estamos reconectando ao servidor de música...\n\n` +
                        `⏳ Por favor, aguarde alguns segundos.`
                    )
                    .setFooter({ text: 'A música será retomada automaticamente quando possível' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (err) {
                Logger.error(`Failed to notify channel about node reconnecting:`, err);
            }
        }
    }
};
