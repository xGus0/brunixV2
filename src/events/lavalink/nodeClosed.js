// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Node Closed Event (lavalink-client)                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default {
    name: 'nodeDisconnect',

    async execute(client, node, reason) {
        Logger.warn(`Lavalink node "${node.id}" closed - Reason: ${reason || 'Unknown'}`);
    }
};
