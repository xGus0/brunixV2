import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Builds the player control buttons (Pause, Skip, Loop, etc.)
 * @param {Object} player - The Lavalink player instance
 * @param {boolean} isFavorited - Whether the current track is favorited by the user
 * @returns {ActionRowBuilder[]} Array of ActionRows containing the buttons
 */
export function buildControls(player, isFavorited = false) {
    const isPaused = player.paused;
    const loopMode = player.repeatMode || 'off';
    const isAutoplay = player.autoplay || false;
    const isShuffled = player.shuffled || false;

    // ═══════════════════════════════════════════════════════════════
    // DYNAMIC BUTTON COLORS BY STATE
    // ═══════════════════════════════════════════════════════════════
    // Pause: Green (paused), Secondary (playing) - green indicates paused state
    // Loop: Primary/Blue (track), Success/Green (queue), Secondary (off)
    // Autoplay: Green (active), Secondary (inactive)
    // Shuffle: Green (active), Secondary (inactive)
    // Favorite: Danger (favorited), Secondary (not favorited)
    // ═══════════════════════════════════════════════════════════════

    const getLoopStyle = () => {
        if (loopMode === 'track') return ButtonStyle.Primary;  // Azul para track
        if (loopMode === 'queue') return ButtonStyle.Success;  // Verde para queue
        return ButtonStyle.Secondary;                          // Cinza para off
    };

    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('player_pause')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('player_loop')
                .setEmoji(loopMode === 'track' ? '🔂' : '🔁')
                .setStyle(getLoopStyle()),
            new ButtonBuilder()
                .setCustomId('player_autoplay')
                .setEmoji('📻')
                .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('player_favorite')
                .setEmoji(isFavorited ? '💖' : '🤍')
                .setStyle(isFavorited ? ButtonStyle.Danger : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_addplaylist')
                .setEmoji('📁')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_shuffle')
                .setEmoji('🔀')
                .setStyle(isShuffled ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_queue')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('player_lyrics')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary)
        );
    return [controlRow, actionRow];
}
