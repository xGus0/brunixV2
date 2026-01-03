// ╔═══════════════════════════════════════════════════════════════════╗
// ║                Node Disconnect Event (lavalink-client)              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default {
    name: 'nodeReconnecting',

    async execute(client, node) {
        Logger.warn(`Lavalink node "${node.id}" reconnecting...`);
    }
};
