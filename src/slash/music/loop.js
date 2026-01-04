// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /loop Slash Command                              ║
// ║                  Interactive Button Controls                         ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('[MUSIC] 🔁 Sets repeat mode with interactive buttons'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                embeds: [Embed.error('No music is currently playing!')],
                flags: 64 // Ephemeral
            });
        }

        const currentMode = player.repeatMode || 'off';

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setAuthor({ name: '🔁 Repeat Mode', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Choose the repeat mode:')
            .addFields(
                {
                    name: '❌ Off',
                    value: 'Plays the queue normally without repeating',
                    inline: true
                },
                {
                    name: '🔂 Current Track',
                    value: 'Repeats the current track only',
                    inline: true
                },
                {
                    name: '🔁 Queue',
                    value: 'Repeats the entire queue from start',
                    inline: true
                }
            )
            .setFooter({ text: `Current Mode: ${getModeText(currentMode)}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loop_off')
                .setLabel('Off')
                .setEmoji('❌')
                .setStyle(currentMode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_track')
                .setLabel('Track')
                .setEmoji('🔂')
                .setStyle(currentMode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_queue')
                .setLabel('Queue')
                .setEmoji('🔁')
                .setStyle(currentMode === 'queue' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // Create collector for buttons
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            const mode = i.customId.replace('loop_', '');

            player.setRepeatMode(mode);

            const messages = {
                off: '✅ Repeat disabled!',
                track: '✅ Repeating current track!',
                queue: '✅ Repeating entire queue!'
            };

            // Update embed
            embed.setFooter({ text: `Current Mode: ${getModeText(mode)}` });

            // Update buttons
            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('loop_off')
                    .setLabel('Off')
                    .setEmoji('❌')
                    .setStyle(mode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_track')
                    .setLabel('Track')
                    .setEmoji('🔂')
                    .setStyle(mode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_queue')
                    .setLabel('Queue')
                    .setEmoji('🔁')
                    .setStyle(mode === 'queue' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

            await i.update({
                embeds: [embed],
                components: [updatedRow]
            });

            // Send confirmation
            await i.followUp({
                embeds: [Embed.success(messages[mode])],
                flags: 64 // Ephemeral
            });
        });

        collector.on('end', () => {
            try {
                const disabledRow = ActionRowBuilder.from(reply.components[0]);
                disabledRow.components.forEach(c => c.setDisabled(true));
                reply.edit({ components: [disabledRow] }).catch(() => { });
            } catch { }
        });
    }
};

function getModeText(mode) {
    const modes = {
        off: '❌ Off',
        track: '🔂 Current Track',
        queue: '🔁 Queue'
    };
    return modes[mode] || '❌ Off';
}
