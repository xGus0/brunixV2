// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /ping Slash Command                              ║
// ║                   System Latency (i18n)                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import i18n from '../../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('[UTILITY] 🏓 Shows bot, API and Lavalink latency'),

    async execute(interaction) {
        const reply = await this.sendPingEmbed(interaction);
        this.createCollector(interaction, reply);
    },

    async sendPingEmbed(interaction, existingMessage = null) {
        // Get language
        const lang = await getGuildLanguage(interaction.client, interaction.guild.id);
        const t = (key) => i18n.t(lang, `commands.ping.responses.embed.${key}`);

        // Calculate Bot Ping (Roundtrip)
        const start = Date.now();

        if (!existingMessage) {
            await interaction.reply({ content: `🏓 ${i18n.t(lang, 'common.loading')}`, fetchReply: true });
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
                        let nodePing = node.ping || node.stats?.ping || node.rest?.ping;

                        // socket.ping é uma função, não um valor
                        if (!nodePing && typeof node.socket?.ping === 'function') {
                            try {
                                nodePing = node.socket.ping();
                            } catch (e) {
                                // Ignore se falhar
                            }
                        }

                        lavalinkInfo.ping = nodePing && nodePing > 0 ? `${Math.round(nodePing)}ms` : 'N/A';

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
                        lavalinkInfo.status = '🟡 Connecting...';
                    }
                }
            }
        } catch (error) {
            console.error('[PING] Error fetching Lavalink info:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setAuthor({ name: t('title'), iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(t('description'))
            .addFields(
                {
                    name: `🤖 ${t('bot_label')}`,
                    value: `\`${botLatency}ms\`\n*${t('bot_desc')}*`,
                    inline: true
                },
                {
                    name: `🌐 ${t('api_label')}`,
                    value: `\`${typeof apiLatency === 'number' ? apiLatency + 'ms' : apiLatency}\`\n*${t('api_desc')}*`,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: true
                },
                {
                    name: `🎵 ${t('lavalink_status')}`,
                    value: lavalinkInfo.status,
                    inline: true
                },
                {
                    name: `⚡ ${t('lavalink_ping')}`,
                    value: `\`${lavalinkInfo.ping}\``,
                    inline: true
                },
                {
                    name: `⏱️ ${t('uptime')}`,
                    value: `\`${lavalinkInfo.uptime}\``,
                    inline: true
                },
                {
                    name: `🎧 ${t('active_players')}`,
                    value: `\`${lavalinkInfo.players}\``,
                    inline: true
                }
            )
            .setFooter({ text: t('footer') })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ping_refresh')
                .setLabel(t('refresh'))
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

async function getGuildLanguage(client, guildId) {
    try {
        const { data } = await client.db.from('guild_configs').select('language').eq('guild_id', guildId).single();
        return data?.language || 'pt-BR';
    } catch {
        return 'pt-BR';
    }
}
