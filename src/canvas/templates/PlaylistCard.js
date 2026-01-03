// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Playlist Card Canvas                            ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas } from '@napi-rs/canvas';
import {
    CANVAS_COLORS,
    drawRoundedRect,
    drawCircularImage,
    truncateText,
    loadImageSafe,
    getFont,
    formatDuration
} from '../utils/canvasHelper.js';

const WIDTH = 800;
const HEIGHT = 500;

export default class PlaylistCard {
    /**
     * Generate Playlist card
     * @param {Object} data - Playlist data
     * @returns {Buffer} PNG buffer
     */
    static async generate(data) {
        const { playlist, tracks, owner } = data;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Background
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, '#1e1e2f');
        gradient.addColorStop(1, '#0d0d15');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Header section
        ctx.fillStyle = 'rgba(88, 101, 242, 0.1)';
        drawRoundedRect(ctx, 20, 20, WIDTH - 40, 120, 15);

        // Playlist icon/cover
        const coverSize = 80;
        ctx.fillStyle = CANVAS_COLORS.ACCENT;
        drawRoundedRect(ctx, 40, 40, coverSize, coverSize, 10);
        ctx.fillStyle = '#FFF';
        ctx.font = getFont('Bold', 36);
        ctx.textAlign = 'center';
        ctx.fillText('📁', 40 + coverSize / 2, 40 + coverSize / 2 + 12);

        // Playlist name
        ctx.fillStyle = CANVAS_COLORS.TEXT_PRIMARY;
        ctx.font = getFont('Bold', 24);
        ctx.textAlign = 'left';
        const truncatedName = truncateText(ctx, playlist.name || 'Playlist', 450);
        ctx.fillText(truncatedName, 140, 70);

        // Description
        if (playlist.description) {
            ctx.fillStyle = CANVAS_COLORS.TEXT_SECONDARY;
            ctx.font = getFont('Regular', 14);
            const truncatedDesc = truncateText(ctx, playlist.description, 450);
            ctx.fillText(truncatedDesc, 140, 95);
        }

        // Stats
        ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
        ctx.font = getFont('Regular', 12);

        const totalDuration = tracks.reduce((acc, t) => acc + (t.track_duration || 0), 0);
        ctx.fillText(`${tracks.length} músicas • ${this.formatTotalTime(totalDuration)}`, 140, 120);

        // Owner (by)
        if (owner) {
            ctx.textAlign = 'right';
            ctx.fillText(`por ${owner.username}`, WIDTH - 40, 120);
        }

        // Track list header
        ctx.fillStyle = CANVAS_COLORS.TEXT_SECONDARY;
        ctx.font = getFont('Bold', 12);
        ctx.textAlign = 'left';
        ctx.fillText('#', 40, 170);
        ctx.fillText('TÍTULO', 80, 170);
        ctx.fillText('ARTISTA', 450, 170);
        ctx.textAlign = 'right';
        ctx.fillText('DURAÇÃO', WIDTH - 40, 170);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 180);
        ctx.lineTo(WIDTH - 30, 180);
        ctx.stroke();

        // Track list
        const startY = 195;
        const trackHeight = 32;

        const displayTracks = tracks.slice(0, 8);

        if (displayTracks.length === 0) {
            ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
            ctx.font = getFont('Regular', 16);
            ctx.textAlign = 'center';
            ctx.fillText('Playlist vazia', WIDTH / 2, startY + 50);
            ctx.font = getFont('Regular', 12);
            ctx.fillText('Use !pl add para adicionar músicas', WIDTH / 2, startY + 75);
        } else {
            for (let i = 0; i < displayTracks.length; i++) {
                const track = displayTracks[i];
                const y = startY + (i * trackHeight);

                // Row hover effect
                if (i % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                    drawRoundedRect(ctx, 25, y, WIDTH - 50, trackHeight - 2, 4);
                }

                // Position
                ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
                ctx.font = getFont('Regular', 13);
                ctx.textAlign = 'center';
                ctx.fillText(`${i + 1}`, 50, y + 20);

                // Title
                ctx.fillStyle = CANVAS_COLORS.TEXT_PRIMARY;
                ctx.font = getFont('Regular', 13);
                ctx.textAlign = 'left';
                const truncatedTitle = truncateText(ctx, track.track_title || 'Unknown', 340);
                ctx.fillText(truncatedTitle, 80, y + 20);

                // Author
                ctx.fillStyle = CANVAS_COLORS.TEXT_SECONDARY;
                ctx.font = getFont('Regular', 12);
                const truncatedAuthor = truncateText(ctx, track.track_author || '', 150);
                ctx.fillText(truncatedAuthor, 450, y + 20);

                // Duration
                ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
                ctx.textAlign = 'right';
                ctx.fillText(formatDuration(track.track_duration), WIDTH - 40, y + 20);
            }
        }

        // Show more indicator
        if (tracks.length > 8) {
            ctx.fillStyle = CANVAS_COLORS.TEXT_MUTED;
            ctx.font = getFont('Regular', 12);
            ctx.textAlign = 'center';
            ctx.fillText(`...e mais ${tracks.length - 8} músicas`, WIDTH / 2, HEIGHT - 25);
        }

        return canvas.toBuffer('image/png');
    }

    /**
     * Format total playlist time
     */
    static formatTotalTime(ms) {
        if (!ms) return '0 min';

        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours} hr ${minutes} min`;
        }
        return `${minutes} min`;
    }
}
