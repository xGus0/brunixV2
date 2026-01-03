// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    /volume Slash Command                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { SlashCommandBuilder } from 'discord.js';
import Embed from '../../utils/embed.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('[MUSIC] 🔊 Adjusts playback volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const player = interaction.client.lavalink.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                embeds: [Embed.error('Não há nenhuma música tocando!')],
                ephemeral: true
            });
        }

        const newVolume = interaction.options.getInteger('level');
        const oldVolume = player.volume;

        await player.setVolume(newVolume);

        await interaction.reply({
            embeds: [Embed.success(`🔊 Volume alterado de **${oldVolume}%** para **${newVolume}%**`)]
        });
    }
};
