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
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                flags: 64 // Ephemeral
            });
        }

        const currentMode = player.repeatMode || 'off';

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setAuthor({ name: '🔁 Modo de Repetição', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Escolha o modo de repetição:')
            .addFields(
                {
                    name: '❌ Desativado',
                    value: 'Toca a fila normalmente sem repetir',
                    inline: true
                },
                {
                    name: '🔂 Música Atual',
                    value: 'Repete apenas a música atual',
                    inline: true
                },
                {
                    name: '🔁 Fila Completa',
                    value: 'Repete toda a fila desde o início',
                    inline: true
                }
            )
            .setFooter({ text: `Modo Atual: ${getModeText(currentMode)}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loop_off')
                .setLabel('Desativado')
                .setEmoji('❌')
                .setStyle(currentMode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_track')
                .setLabel('Música')
                .setEmoji('🔂')
                .setStyle(currentMode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_queue')
                .setLabel('Fila')
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
                off: '✅ Repetição desativada!',
                track: '✅ Repetindo a música atual!',
                queue: '✅ Repetindo toda a fila!'
            };

            // Update embed
            embed.setFooter({ text: `Modo Atual: ${getModeText(mode)}` });

            // Update buttons
            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('loop_off')
                    .setLabel('Desativado')
                    .setEmoji('❌')
                    .setStyle(mode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_track')
                    .setLabel('Música')
                    .setEmoji('🔂')
                    .setStyle(mode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_queue')
                    .setLabel('Fila')
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
        off: '❌ Desativado',
        track: '🔂 Música Atual',
        queue: '🔁 Fila Completa'
    };
    return modes[mode] || '❌ Desativado';
}
