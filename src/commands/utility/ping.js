// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Ping Command - DEBUG VERSION                  ║
// ║              Latency Monitor with Real-time Updates                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'ping',
    description: 'Mostra a latência do bot, API e Sistema de Áudio',
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

        // Calculate Audio System Ping
        let audioSystemInfo = {
            status: '🔴 Offline',
            ping: 'N/A',
            uptime: 'N/A',
            players: 0
        };

        try {
            if (client.lavalink && client.lavalink.nodeManager) {
                const nodes = Array.from(client.lavalink.nodeManager.nodes.values());

                if (nodes.length > 0) {
                    const node = nodes[0];

                    if (node.connected) {
                        audioSystemInfo.status = '🟢 Online';

                        // Calculate ping from heartbeat timestamps
                        let nodePing = null;
                        if (node.heartBeatPongTimestamp && node.heartBeatPingTimestamp) {
                            nodePing = node.heartBeatPongTimestamp - node.heartBeatPingTimestamp;
                        }

                        audioSystemInfo.ping = nodePing && nodePing > 0 ? `${Math.round(nodePing)}ms` : 'N/A';

                        // Uptime do node
                        if (node.stats?.uptime) {
                            const uptimeSeconds = Math.floor(node.stats.uptime / 1000);
                            const hours = Math.floor(uptimeSeconds / 3600);
                            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                            audioSystemInfo.uptime = `${hours}h ${minutes}m`;
                        }

                        // Players ativos
                        audioSystemInfo.players = node.stats?.playingPlayers || 0;
                    } else {
                        audioSystemInfo.status = '🟡 Conectando...';
                    }
                }
            }
        } catch (error) {
            console.error('[PING] Error fetching audio system info:', error);
        }

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
                    name: '🎵 Sistema de Áudio',
                    value: audioSystemInfo.status,
                    inline: true
                },
                {
                    name: '⚡ Ping do Áudio',
                    value: `\`${audioSystemInfo.ping}\``,
                    inline: true
                },
                {
                    name: '⏱️ Uptime',
                    value: `\`${audioSystemInfo.uptime}\``,
                    inline: true
                },
                {
                    name: '🎧 Players Ativos',
                    value: `\`${audioSystemInfo.players}\``,
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
