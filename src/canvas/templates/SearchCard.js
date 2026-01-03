// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Search Card Canvas                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas } from '@napi-rs/canvas';
import {
    CANVAS_COLORS,
    drawRoundedRect,
    truncateText,
    loadImageSafe,
    getFont,
    formatDuration
} from '../utils/canvasHelper.js';

const WIDTH = 900;
const HEIGHT = 500;

export default class SearchCard {
    /**
     * Generate Search Results card
     * @param {Object} data - Search data
     * @returns {Buffer} PNG buffer
     */
    static async generate(data) {
        const { query, tracks, requester } = data;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, '#0d1117');
        gradient.addColorStop(1, '#161b22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Title bar
        ctx.fillStyle = 'rgba(88, 101, 242, 0.1)';
        drawRoundedRect(ctx, 20, 15, WIDTH - 40, 50, 10);

        // Search icon and query
        ctx.fillStyle = CANVAS_COLORS.ACCENT;
        ctx.font = getFont('Bold', 18);
        ctx.textAlign = 'left';
        ctx.fillText('🔍', 35, 48);

        ctx.fillStyle = CANVAS_COLORS.TEXT_PRIMARY;
        ctx.font = getFont('Bold', 18);
        const truncatedQuery = truncateText(ctx, `Resultados para: "${query}"`, WIDTH - 150);
        ctx.fillText(truncatedQuery, 65, 48);

        // Results count
        ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
        ctx.font = getFont('Regular', 14);
        ctx.textAlign = 'right';
        ctx.fillText(`${tracks.length} resultados`, WIDTH - 35, 48);

        // Track list
        const startY = 85;
        const trackHeight = 40;
        const trackPadding = 5;

        for (let i = 0; i < Math.min(tracks.length, 10); i++) {
            const track = tracks[i];
            const y = startY + (i * (trackHeight + trackPadding));

            // Row background
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
            drawRoundedRect(ctx, 20, y, WIDTH - 40, trackHeight, 5);

            // Index
            ctx.fillStyle = CANVAS_COLORS.ACCENT;
            ctx.font = getFont('Bold', 16);
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}`, 50, y + 26);

            // Track title
            ctx.fillStyle = CANVAS_COLORS.TEXT_PRIMARY;
            ctx.font = getFont('Medium', 15);
            ctx.textAlign = 'left';
            const truncatedTitle = truncateText(ctx, track.title || 'Unknown', 450);
            ctx.fillText(truncatedTitle, 80, y + 26);

            // Author
            ctx.fillStyle = CANVAS_COLORS.TEXT_SECONDARY;
            ctx.font = getFont('Regular', 13);
            const truncatedAuthor = truncateText(ctx, track.author || 'Unknown', 200);
            ctx.fillText(truncatedAuthor, 550, y + 26);

            // Duration
            ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
            ctx.font = getFont('Regular', 13);
            ctx.textAlign = 'right';
            ctx.fillText(formatDuration(track.length), WIDTH - 35, y + 26);
        }

        // Footer
        const footerY = HEIGHT - 35;
        ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
        ctx.font = getFont('Regular', 12);
        ctx.textAlign = 'left';
        ctx.fillText('Use o menu abaixo para selecionar uma música', 30, footerY);

        if (requester) {
            ctx.textAlign = 'right';
            ctx.fillText(`Solicitado por ${requester.username}`, WIDTH - 30, footerY);
        }

        return canvas.toBuffer('image/png');
    }
}
