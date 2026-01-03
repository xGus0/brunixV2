// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Extended Discord Client                         ║
// ║               lavalink-client (Official) Integration                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import CommandHandler from './handlers/commandHandler.js';
import EventHandler from './handlers/eventHandler.js';
import PlayerHandler from './handlers/playerHandler.js';
import SlashHandler from './handlers/slashHandler.js';
import Logger from './utils/logger.js';
import { COLORS } from './config/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf-8'));

export default class BrunixClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel, Partials.Message],
            allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
        });

        // Collections
        this.commands = new Collection();
        this.aliases = new Collection();
        this.cooldowns = new Collection();
        this.prefixes = new Collection();

        // Default prefix
        this.defaultPrefix = '!';

        // Configuration
        this.config = config;
        this.colors = COLORS;

        // Supabase Client
        this.db = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

        // Handlers
        this.commandHandler = new CommandHandler(this);
        this.slashHandler = new SlashHandler(this);
        this.eventHandler = new EventHandler(this);
        this.playerHandler = new PlayerHandler(this);

        // Initialize LavalinkManager (BEFORE login)
        this.lavalink = this.initializeLavalink();
    }

    /**
     * Initialize Lavalink Manager (lavalink-client)
     */
    initializeLavalink() {
        const nodeConfig = {
            id: 'Brunix-Node',
            host: this.config.LAVALINK_HOST,
            port: parseInt(this.config.LAVALINK_PORT),
            authorization: this.config.LAVALINK_PASSWORD,
            secure: this.config.LAVALINK_SECURE === true
        };

        Logger.info(`Lavalink Node: ${nodeConfig.host}:${nodeConfig.port} (secure: ${nodeConfig.secure})`);

        const manager = new LavalinkManager({
            nodes: [nodeConfig],
            sendToShard: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },
            autoSkip: true,
            client: {
                id: this.config.DISCORD_CLIENT_ID || 'unknown',
                username: 'Brunix'
            },
            playerOptions: {
                defaultSearchPlatform: 'ytmsearch', // YouTube Music for reliable audio
                onDisconnect: {
                    autoReconnect: true,
                    destroyOnNoEventsAfterMs: 30000
                },
                onEmptyQueue: {
                    destroyAfterMs: 120000
                }
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // CRITICAL: Handle NodeManager errors to prevent ERR_UNHANDLED_ERROR crash
        // ═══════════════════════════════════════════════════════════════
        manager.nodeManager.on('error', (node, error) => {
            Logger.error(`[NodeManager] Node "${node?.id || 'unknown'}" error:`, error?.message || error);
        });

        manager.nodeManager.on('disconnect', (node, code, reason) => {
            Logger.warn(`[NodeManager] Node "${node?.id}" disconnected (code: ${code}). Reason: ${reason || 'Unknown'}`);
        });

        manager.nodeManager.on('reconnecting', (node) => {
            Logger.info(`[NodeManager] Node "${node?.id}" reconnecting...`);
        });

        // Handle raw events for voice state updates
        this.on('raw', (d) => manager.sendRawData(d));

        Logger.info('LavalinkManager initialized');
        return manager;
    }

    /**
     * Get prefix for a guild
     */
    async getPrefix(guildId) {
        if (this.prefixes.has(guildId)) {
            return this.prefixes.get(guildId);
        }

        try {
            const { data } = await this.db
                .from('guild_configs')
                .select('prefix')
                .eq('guild_id', guildId)
                .single();

            const prefix = data?.prefix || this.defaultPrefix;
            this.prefixes.set(guildId, prefix);
            return prefix;
        } catch {
            return this.defaultPrefix;
        }
    }

    async start() {
        try {
            Logger.info('Starting Brunix 2.0 (lavalink-client Edition)...');

            // Load command and event handlers
            await this.commandHandler.load();
            await this.slashHandler.load();
            await this.eventHandler.load();

            // Login to Discord (lavalink init happens in ready event)
            await this.login(this.config.DISCORD_TOKEN);

        } catch (error) {
            Logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    /**
     * Initialize Lavalink connection (call from ready event)
     */
    async initLavalinkConnection() {
        try {
            await this.lavalink.init({ id: this.user.id, username: this.user.username });
            Logger.success('Lavalink connection initialized');
        } catch (error) {
            Logger.error('Failed to initialize Lavalink:', error);
        }
    }
}
