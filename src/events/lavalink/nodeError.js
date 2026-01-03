// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Node Error Event (lavalink-client)                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default {
    name: 'nodeError',

    async execute(client, node, error) {
        Logger.error(`Lavalink node "${node.id}" error:`, error?.message || error);
    }
};
