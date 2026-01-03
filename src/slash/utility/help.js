// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /help Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('[UTILITY] 📚 Shows all available commands'),

    async execute(interaction) {
        const commands = interaction.client.slashCommands;

        const categories = {
            MUSIC: { emoji: '🎵', cmds: [] },
            UTILITY: { emoji: '⚙️', cmds: [] },
            USER: { emoji: '👤', cmds: [] }
        };

        commands.forEach(cmd => {
            const desc = cmd.data.description;
            if (desc.startsWith('[MUSIC]')) categories.MUSIC.cmds.push(cmd);
            else if (desc.startsWith('[UTILITY]')) categories.UTILITY.cmds.push(cmd);
            else if (desc.startsWith('[USER]')) categories.USER.cmds.push(cmd);
        });

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setAuthor({
                name: `${interaction.client.user.username} • Help Center`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription(`Available Slash Commands. Use \`/command\` to execute.\n\n**Total:** ${commands.size} commands`)
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

        Object.entries(categories).forEach(([name, data]) => {
            if (data.cmds.length > 0) {
                const cmdList = data.cmds.map(cmd => {
                    const cleanDesc = cmd.data.description.replace(/\[.*?\]\s*/, '');
                    return `\`/${cmd.data.name}\` ${cleanDesc}`;
                }).join('\n');

                embed.addFields({
                    name: `${data.emoji} ${name}`,
                    value: cmdList,
                    inline: false
                });
            }
        });

        embed.setFooter({ text: 'Use slash commands by typing /' });

        await interaction.reply({ embeds: [embed] });
    }
};
