// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /botinfo Slash Command                           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import prettyMs from 'pretty-ms';

export default {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('[UTILITY] ℹ Bot information'),

    async execute(interaction) {
        const client = interaction.client;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalCommands = client.slashCommands.size + client.commands.size;

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_PREMIUM)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setDescription('Professional music bot with premium interface')
            .addFields(
                { name: '📊 Servers', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '👥 Users', value: `\`${totalUsers.toLocaleString()}\``, inline: true },
                { name: '⚡ Commands', value: `\`${totalCommands}\``, inline: true },
                { name: '⏱️ Uptime', value: `\`${prettyMs(client.uptime)}\``, inline: true },
                { name: '💾 Memory', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
                { name: '📚 Version', value: '`2.0.0`', inline: true },
                { name: '🔧 Framework', value: 'Discord.js v14', inline: true },
                { name: '🎵 Player', value: 'Lavalink Client', inline: true },
                { name: '🏓 Ping', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
            )
            .setFooter({ text: 'Brunix 2.0 • Music Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
