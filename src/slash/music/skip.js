// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /skip Slash Command                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../config/constants.js';
import Embed from '../../utils/embed.js';
import { truncate } from '../../utils/formatters.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('[MUSIC] ⏭️ Skips to the next song'),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        const current = player.queue.current;
        const hasNext = player.queue.tracks.length > 0;

        await player.skip();

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setDescription(`⏭️ Pulando: **${truncate(current.info.title, 40)}**`);

        if (hasNext) {
            const next = player.queue.tracks[0];
            embed.addFields({
                name: 'Próxima',
                value: `${truncate(next.info.title, 40)} - ${next.info.author}`
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
