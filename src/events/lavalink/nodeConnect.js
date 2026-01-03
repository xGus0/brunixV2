// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Node Connect Event (lavalink-client)              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default {
    name: 'nodeConnect',

    async execute(client, node) {
        Logger.success(`Lavalink node "${node.id}" connected!`);
    }
};
