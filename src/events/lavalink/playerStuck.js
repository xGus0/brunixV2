// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Player Stuck Event (lavalink-client)               ║
// ║         Notifies users when a player gets stuck/frozen              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'playerStuck',

    async execute(client, player, track, thresholdMs) {
        Logger.warn(`Player stuck in guild ${player.guildId} - Threshold: ${thresholdMs}ms`);

        try {
            const channel = client.channels.cache.get(player.textChannelId);
            if (!channel) return;

            const trackTitle = track?.info?.title || 'Música desconhecida';

            const embed = new EmbedBuilder()
                .setColor(COLORS.EMBED_WARNING)
                .setTitle('⏸️ Reprodução Travada')
                .setDescription(
                    `A reprodução de **${trackTitle}** travou.\n\n` +
                    `⏭️ Pulando para a próxima música...`
                )
                .setFooter({ text: 'Se isso acontecer frequentemente, pode haver problemas de conexão' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Auto-skip to next track
            setTimeout(() => {
                player.skip().catch(() => { });
            }, 1000);
        } catch (err) {
            Logger.error(`Failed to handle player stuck:`, err);
        }
    }
};
