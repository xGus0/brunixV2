// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Ping Command - DEBUG VERSION                  ║
// ║              Latency Monitor with Real-time Updates                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'ping',
    description: 'Mostra a latência do bot, API e Lavalink',
    category: 'utility',

    async execute(client, message, args) {
        const reply = await this.sendPingEmbed(client, message);
        this.createCollector(client, message, reply);
    },

    async sendPingEmbed(client, message, existingMessage = null) {
        // Calculate Bot Ping (Roundtrip) - sempre calcular
        const start = Date.now();
        const tempMsg = existingMessage ? null : await message.channel.send({ content: '🏓' });
        const end = Date.now();
        const botLatency = end - start;

        // Calculate API Ping (WebSocket) - garantir valor válido
        const apiLatency = client.ws.ping > 0 ? Math.round(client.ws.ping) : 'N/A';

        console.log('═══════════════════════════════════════');
        console.log('[PING DEBUG] Bot Latency:', botLatency);
        console.log('[PING DEBUG] API Latency:', apiLatency, '(from client.ws.ping:', client.ws.ping, ')');

        // Calculate Lavalink Ping
        let lavalinkInfo = {
            status: '🔴 Offline',
            ping: 'N/A',
            uptime: 'N/A',
            players: 0
        };

        try {
            if (client.lavalink && client.lavalink.nodeManager) {
                const nodes = Array.from(client.lavalink.nodeManager.nodes.values());
                console.log('[PING DEBUG] Number of nodes:', nodes.length);

                if (nodes.length > 0) {
                    const node = nodes[0];
                    console.log('[PING DEBUG] Node connected:', node.connected);
                    console.log('[PING DEBUG] Node ID:', node.id);

                    // Log ALL properties of the node
                    console.log('[PING DEBUG] All node properties:', Object.keys(node));

                    // Log nested objects
                    console.log('[PING DEBUG] node.stats keys:', node.stats ? Object.keys(node.stats) : 'null');
                    console.log('[PING DEBUG] node.rest keys:', node.rest ? Object.keys(node.rest) : 'null');
                    console.log('[PING DEBUG] node.socket keys:', node.socket ? Object.keys(node.socket) : 'null');

                    // Log full stats object
                    console.log('[PING DEBUG] Full node.stats:', JSON.stringify(node.stats, null, 2));

                    if (node.connected) {
                        lavalinkInfo.status = '🟢 Online';

                        // Tentar pegar ping de múltiplas fontes
                        console.log('[PING DEBUG] node.ping:', node.ping);
                        console.log('[PING DEBUG] node.stats?.ping:', node.stats?.ping);
                        console.log('[PING DEBUG] node.rest?.ping:', node.rest?.ping);
                        console.log('[PING DEBUG] node.socket?.ping type:', typeof node.socket?.ping);
                        console.log('[PING DEBUG] node.socket?.latency:', node.socket?.latency);
                        console.log('[PING DEBUG] node.socket?._ws?.ping:', node.socket?._ws?.ping);

                        let nodePing = node.ping || node.stats?.ping || node.rest?.ping || node.socket?.latency;
                        console.log('[PING DEBUG] nodePing after direct properties:', nodePing);

                        // socket.ping é uma função
                        if (!nodePing && typeof node.socket?.ping === 'function') {
                            console.log('[PING DEBUG] Calling node.socket.ping()...');
                            try {
                                nodePing = node.socket.ping();
                                console.log('[PING DEBUG] Result from socket.ping():', nodePing);
                                console.log('[PING DEBUG] Type of result:', typeof nodePing);
                            } catch (e) {
                                console.log('[PING DEBUG] ERROR calling socket.ping():', e);
                            }
                        }

                        console.log('[PING DEBUG] FINAL nodePing value:', nodePing);
                        console.log('[PING DEBUG] nodePing > 0?', nodePing > 0);

                        lavalinkInfo.ping = nodePing && nodePing > 0 ? `${Math.round(nodePing)}ms` : 'N/A';
                        console.log('[PING DEBUG] FINAL lavalinkInfo.ping:', lavalinkInfo.ping);

                        // Uptime do node
                        if (node.stats?.uptime) {
                            const uptimeSeconds = Math.floor(node.stats.uptime / 1000);
                            const hours = Math.floor(uptimeSeconds / 3600);
                            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                            lavalinkInfo.uptime = `${hours}h ${minutes}m`;
                        }

                        // Players ativos
                        lavalinkInfo.players = node.stats?.playingPlayers || 0;
                    } else {
                        lavalinkInfo.status = '🟡 Conectando...';
                    }
                }
            }
        } catch (error) {
            console.error('[PING] Error fetching Lavalink info:', error);
        }

        console.log('═══════════════════════════════════════');

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setAuthor({ name: '📊 Latência do Sistema', iconURL: client.user.displayAvatarURL() })
            .setDescription('Monitoramento em tempo real dos serviços')
            .addFields(
                {
                    name: '🤖 Bot Latency',
                    value: `\`${botLatency}ms\`\n*Tempo de resposta do bot*`,
                    inline: true
                },
                {
                    name: '🌐 API Latency',
                    value: `\`${typeof apiLatency === 'number' ? apiLatency + 'ms' : apiLatency}\`\n*WebSocket do Discord*`,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: true
                },
                {
                    name: '🎵 Lavalink Status',
                    value: lavalinkInfo.status,
                    inline: true
                },
                {
                    name: '⚡ Lavalink Ping',
                    value: `\`${lavalinkInfo.ping}\``,
                    inline: true
                },
                {
                    name: '⏱️ Uptime',
                    value: `\`${lavalinkInfo.uptime}\``,
                    inline: true
                },
                {
                    name: '🎧 Players Ativos',
                    value: `\`${lavalinkInfo.players}\``,
                    inline: true
                }
            )
            .setFooter({ text: 'Clique em 🔄 para atualizar • Atualiza automaticamente a cada 60s' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ping_refresh')
                .setLabel('Atualizar')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );

        if (tempMsg && !existingMessage) {
            await tempMsg.delete();
        }

        if (existingMessage) {
            return existingMessage.edit({ embeds: [embed], components: [row] });
        } else {
            return message.channel.send({ embeds: [embed], components: [row] });
        }
    },

    createCollector(client, message, replyMessage) {
        const collector = replyMessage.createMessageComponentCollector({
            filter: i => i.customId === 'ping_refresh' && !i.user.bot,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();
            await this.sendPingEmbed(client, interaction, replyMessage);
        });

        collector.on('end', () => {
            try {
                const disabledRow = ActionRowBuilder.from(replyMessage.components[0]);
                disabledRow.components.forEach(c => c.setDisabled(true));
                replyMessage.edit({ components: [disabledRow] });
            } catch { }
        });
    }
};
