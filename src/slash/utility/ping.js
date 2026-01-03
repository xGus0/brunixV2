// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /ping Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('[UTILITY] 🏓 Shows bot latency'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: '🏓 Pong!', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Latency', value: `\`${latency}ms\``, inline: true },
                { name: '💻 API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
