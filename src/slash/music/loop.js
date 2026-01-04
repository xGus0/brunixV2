// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /loop Slash Command                              ║
// ║                  Interactive Button Controls (i18n)                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import Embed from '../../utils/embed.js';
import i18n from '../../utils/i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('[MUSIC] 🔁 Sets repeat mode with interactive buttons'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);
        const lang = await getGuildLanguage(interaction.client, interaction.guild.id);
        const t = (key, args) => i18n.t(lang, `commands.loop.responses.${key}`, args);
        // Helper to get mode name from locale
        const getModeName = (mode) => {
            const map = {
                off: t('embed.off_name'),
                track: t('embed.track_name'),
                queue: t('embed.queue_name')
            };
            return map[mode] || t('embed.off_name');
        };

        if (!player) {
            return interaction.reply({
                embeds: [Embed.error(i18n.t(lang, 'errors.no_player'))],
                flags: 64 // Ephemeral
            });
        }

        const currentMode = player.repeatMode || 'off';

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setAuthor({ name: t('embed.title'), iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(t('embed.description'))
            .addFields(
                {
                    name: t('embed.off_name'),
                    value: t('embed.off_value'),
                    inline: true
                },
                {
                    name: t('embed.track_name'),
                    value: t('embed.track_value'),
                    inline: true
                },
                {
                    name: t('embed.queue_name'),
                    value: t('embed.queue_value'),
                    inline: true
                }
            )
            .setFooter({ text: t('embed.current_mode', { mode: getModeName(currentMode) }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loop_off')
                .setLabel(t('modes.none') || 'Off')
                .setEmoji('❌')
                .setStyle(currentMode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_track')
                .setLabel(t('modes.track') || 'Track')
                .setEmoji('🔂')
                .setStyle(currentMode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop_queue')
                .setLabel(t('modes.queue') || 'Queue')
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
                off: t('none'),
                track: t('track'),
                queue: t('queue')
            };

            // Update embed with new language state (though language doesn't change mid-interaction usually)
            embed.setFooter({ text: t('embed.current_mode', { mode: getModeName(mode) }) });

            // Update buttons
            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('loop_off')
                    .setLabel(t('modes.none') || 'Off')
                    .setEmoji('❌')
                    .setStyle(mode === 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_track')
                    .setLabel(t('modes.track') || 'Track')
                    .setEmoji('🔂')
                    .setStyle(mode === 'track' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_queue')
                    .setLabel(t('modes.queue') || 'Queue')
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

async function getGuildLanguage(client, guildId) {
    try {
        const { data } = await client.db.from('guild_configs').select('language').eq('guild_id', guildId).single();
        return data?.language || 'pt-BR';
    } catch {
        return 'pt-BR';
    }
}
