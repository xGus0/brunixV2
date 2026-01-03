// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        Embed Utility                                ║
// ║                    Premium Silver Theme                             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../config/constants.js';

export default class Embed {
    /**
     * Base embed with silver theme
     */
    static base() {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setTimestamp();
    }

    /**
     * Success embed
     */
    static success(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_SUCCESS)
            .setDescription(`✓ ${message}`);
    }

    /**
     * Error embed
     */
    static error(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_ERROR)
            .setDescription(`✗ ${message}`);
    }

    /**
     * Warning embed
     */
    static warning(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_WARNING)
            .setDescription(`${EMOJIS.WARNING} ${message}`);
    }

    /**
     * Info embed
     */
    static info(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setDescription(`${EMOJIS.INFO} ${message}`);
    }

    /**
     * Music embed - Premium silver style
     */
    static music(title = null) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_MUSIC);

        if (title) {
            embed.setAuthor({ name: `${EMOJIS.MUSIC} ${title}` });
        }

        return embed;
    }

    /**
     * Minimal embed for clean UI
     */
    static minimal(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_DEFAULT)
            .setDescription(message);
    }

    /**
     * Premium embed with gold accent
     */
    static premium(message) {
        return new EmbedBuilder()
            .setColor(COLORS.EMBED_PREMIUM)
            .setDescription(`${EMOJIS.CROWN} ${message}`);
    }
}
