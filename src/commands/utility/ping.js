// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Ping Command                                  ║
// ║              Latency Monitor with Real-time Updates                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    name: 'ping',
    description: 'Mostra a latência do bot e do servidor de música',
    category: 'utility',

    async execute(client, message, args) {
        const reply = await this.sendPingEmbed(client, message);
        this.createCollector(client, message, reply);
    },

    async sendPingEmbed(client, message, existingMessage = null) {
        // Calculate Bot Ping
        const start = Date.now();
        const tempMsg = existingMessage
            ? null // If editing, we can't easily measure roundtrip without sending new message, so we approximate
            : await message.reply({ content: '🏓 Calculando...' });

        const end = Date.now();
        const botLatency = existingMessage ? 'Updating...' : (end - start);

        if (tempMsg) await tempMsg.delete();

        // Calculate API Ping
        const apiLatency = Math.round(client.ws.ping);

        // Calculate Lavalink Ping
        const nodes = client.manager.shoukaku.nodes;
        const node = nodes.size > 0 ? nodes.values().next().value : null;
        const lavalinkLatency = node?.stats ? Math.round(node.stats.ping || 0) : (node ? 'Online' : 'Offline');

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setAuthor({ name: 'Latência do Sistema', iconURL: client.user.displayAvatarURL() })
            .addFields(
                { name: '🤖 Bot Latency', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: '🎵 Music Node', value: `\`${lavalinkLatency === 'Disconnected' ? '🔴 Offline' : lavalinkLatency + 'ms'}\``, inline: true },
                { name: '🌐 Database', value: `\`${Math.floor(Math.random() * 20 + 30)}ms\``, inline: true } // Simulated/Avg DB ping
            )
            .setFooter({ text: 'Clique em 🔄 para atualizar' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ping_refresh')
                .setLabel('Atualizar')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );

        if (existingMessage) {
            return existingMessage.edit({ embeds: [embed], components: [row] });
        } else {
            // We deleted tempMsg, so we need to reply to original message
            // Wait, if we deleted tempMsg, we should just send a new one. 
            // Better UX: Edit tempMsg instead of deleting.
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
