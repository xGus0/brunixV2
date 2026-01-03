// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /ping Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('[UTILITY] 🏓 Mostra a latência do bot, API e Lavalink'),

    async execute(interaction) {
        const reply = await this.sendPingEmbed(interaction);
        this.createCollector(interaction, reply);
    },

    async sendPingEmbed(interaction, existingMessage = null) {
        // Calculate Bot Ping (Roundtrip)
        const start = Date.now();

        if (!existingMessage) {
            await interaction.reply({ content: '🏓 Calculando...', fetchReply: true });
        }

        const end = Date.now();
        const botLatency = end - start;

        // Calculate API Ping (WebSocket) - garantir valor válido
        const apiLatency = interaction.client.ws.ping > 0 ? Math.round(interaction.client.ws.ping) : 'N/A';

        // Calculate Lavalink Ping
        let lavalinkInfo = {
            status: '🔴 Offline',
            ping: 'N/A',
            uptime: 'N/A',
            players: 0
        };

        try {
            const client = interaction.client;
            if (client.lavalink && client.lavalink.nodeManager) {
                const nodes = Array.from(client.lavalink.nodeManager.nodes.values());

                if (nodes.length > 0) {
                    const node = nodes[0]; // Pega o primeiro node

                    if (node.connected) {
                        lavalinkInfo.status = '🟢 Online';

                        // Tentar pegar ping de múltiplas fontes
                        const nodePing = node.ping || node.stats?.ping || node.rest?.ping;
                        lavalinkInfo.ping = nodePing && nodePing > 0 ? `${Math.round(nodePing)}ms` : 'Conectado';

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

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setAuthor({ name: '📊 Latência do Sistema', iconURL: interaction.client.user.displayAvatarURL() })
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

        if (existingMessage) {
            return interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            return interaction.editReply({ content: null, embeds: [embed], components: [row] });
        }
    },

    createCollector(interaction, replyMessage) {
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'ping_refresh' && i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            await this.sendPingEmbed(i, true);
        });

        collector.on('end', async () => {
            try {
                const msg = await interaction.fetchReply();
                const disabledRow = ActionRowBuilder.from(msg.components[0]);
                disabledRow.components.forEach(c => c.setDisabled(true));
                await interaction.editReply({ components: [disabledRow] });
            } catch { }
        });
    }
};
