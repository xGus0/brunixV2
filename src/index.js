// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        BRUNIX 2.0                                   ║
// ║              Professional Discord Music Bot                         ║
// ╚═══════════════════════════════════════════════════════════════════╝

import BrunixClient from './client.js';
import Logger from './utils/logger.js';

const client = new BrunixClient();

// Graceful shutdown
process.on('SIGINT', () => {
    Logger.warn('Received SIGINT. Gracefully shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    Logger.warn('Received SIGTERM. Gracefully shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception:', error);

    // Don't exit on Lavalink connection errors - they are recoverable
    if (error.code === 'ERR_UNHANDLED_ERROR' && error.context?.NodeManager) {
        Logger.warn('Lavalink node error - bot will attempt to reconnect...');
        return;
    }

    // Exit on other critical errors
    process.exit(1);
});

// Start the bot
client.start();
