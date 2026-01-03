// ╔═══════════════════════════════════════════════════════════════════╗
// ║                        Queue Card Canvas                            ║
// ║                    Premium Queue Display                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas } from '@napi-rs/canvas';
import {
    CANVAS_THEME,
    drawRoundedRect,
    truncateText,
    loadImageSafe,
    getFont,
    formatDuration
} from '../utils/canvasHelper.js';
import { CANVAS } from '../../config/constants.js';

const WIDTH = CANVAS.QUEUE.WIDTH;
const HEIGHT = CANVAS.QUEUE.HEIGHT;

export default class QueueCard {
    /**
     * Generate queue card
     */
    static async generate(data) {
        const { current, tracks, page = 1, totalPages = 1, totalTracks = 0 } = data;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = CANVAS_THEME.BG_PRIMARY;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Top accent
        ctx.fillStyle = CANVAS_THEME.ACCENT;
        ctx.fillRect(0, 0, WIDTH, 3);

        // Header
        ctx.fillStyle = CANVAS_THEME.TEXT_PRIMARY;
        ctx.font = getFont('Bold', 24);
        ctx.fillText('📋 Fila de Músicas', 30, 50);

        // Current track section
        if (current) {
            ctx.fillStyle = CANVAS_THEME.BG_SECONDARY;
            drawRoundedRect(ctx, 30, 70, WIDTH - 60, 80, 12);

            // Now playing badge
            ctx.fillStyle = CANVAS_THEME.ACCENT;
            ctx.font = getFont('Bold', 10);
            ctx.fillText('TOCANDO AGORA', 50, 95);

            // Track info
            ctx.fillStyle = CANVAS_THEME.TEXT_PRIMARY;
            ctx.font = getFont('Bold', 16);
            const currentTitle = truncateText(ctx, current.title || 'Unknown', WIDTH - 200);
            ctx.fillText(currentTitle, 50, 120);

            ctx.fillStyle = CANVAS_THEME.TEXT_SECONDARY;
            ctx.font = getFont('Regular', 13);
            ctx.fillText(`${current.author || 'Unknown'} • ${formatDuration(current.length)}`, 50, 140);

            // Duration on the right
            ctx.textAlign = 'right';
            ctx.fillStyle = CANVAS_THEME.TEXT_MUTED;
            ctx.font = getFont('Regular', 12);
            ctx.fillText(`Pedido por ${current.requester?.username || 'Unknown'}`, WIDTH - 50, 120);
            ctx.textAlign = 'left';
        }

        // Queue list
        const startY = 170;
        const itemHeight = 50;

        if (tracks.length === 0) {
            ctx.fillStyle = CANVAS_THEME.TEXT_MUTED;
            ctx.font = getFont('Regular', 14);
            ctx.textAlign = 'center';
            ctx.fillText('Fila vazia', WIDTH / 2, startY + 50);
            ctx.textAlign = 'left';
        } else {
            tracks.slice(0, 6).forEach((track, index) => {
                const y = startY + (index * itemHeight);

                // Alternating background
                if (index % 2 === 0) {
                    ctx.fillStyle = 'rgba(45, 45, 45, 0.3)';
                    drawRoundedRect(ctx, 30, y, WIDTH - 60, itemHeight - 5, 8);
                }

                // Position number
                ctx.fillStyle = CANVAS_THEME.TEXT_MUTED;
                ctx.font = getFont('Bold', 14);
                const position = ((page - 1) * 10) + index + 1;
                ctx.fillText(position.toString().padStart(2, '0'), 50, y + 30);

                // Track title
                ctx.fillStyle = CANVAS_THEME.TEXT_PRIMARY;
                ctx.font = getFont('Medium', 14);
                const title = truncateText(ctx, track.title || 'Unknown', WIDTH - 250);
                ctx.fillText(title, 90, y + 25);

                // Artist
                ctx.fillStyle = CANVAS_THEME.TEXT_MUTED;
                ctx.font = getFont('Regular', 11);
                ctx.fillText(truncateText(ctx, track.author || 'Unknown', 200), 90, y + 42);

                // Duration
                ctx.textAlign = 'right';
                ctx.fillStyle = CANVAS_THEME.TEXT_SECONDARY;
                ctx.font = getFont('Regular', 12);
                ctx.fillText(formatDuration(track.length), WIDTH - 50, y + 30);
                ctx.textAlign = 'left';
            });
        }

        // Footer
        ctx.fillStyle = CANVAS_THEME.BG_SECONDARY;
        ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);

        ctx.fillStyle = CANVAS_THEME.TEXT_MUTED;
        ctx.font = getFont('Regular', 12);
        ctx.fillText(`Página ${page}/${totalPages}`, 30, HEIGHT - 20);

        ctx.textAlign = 'right';
        ctx.fillText(`${totalTracks + 1} músicas na fila`, WIDTH - 30, HEIGHT - 20);

        return canvas.toBuffer('image/png');
    }
}
