// ╔═══════════════════════════════════════════════════════════════════╗
// ║                Player Destroy Event (lavalink-client)               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default {
    name: 'playerDestroy',

    async execute(client, player, reason) {
        Logger.music(`Player destroyed in guild ${player.guildId} - Reason: ${reason || 'Manual'}`);

        // Clear update interval
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }

        // Clear now playing message
        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete();
            } catch { }
        }
    }
};
