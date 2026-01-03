// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Play Card Canvas                                 ║
// ║           Neo-Brutalism Design - Bold & Stylish                    ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas, loadImage } from '@napi-rs/canvas';
import Logger from '../../utils/logger.js';

// Neo-Brutalism Configuration
const CONFIG = {
    width: 1000,
    height: 350,
    colors: {
        bg: '#ffffff',
        border: '#000000',
        shadow: '#000000',
        accent: '#a855f7',        // Purple progress bar
        accentSecondary: '#facc15', // Yellow (album bg)
        badge: '#ef4444',         // Red "PLAYING NOW"
        badgeQueued: '#3b82f6',   // Blue "IN QUEUE"
        badgePaused: '#f97316',   // Orange "PAUSED"
        text: '#000000',
        textSecondary: '#6b7280'
    },
    strokeWidth: 5,
    shadowOffset: 12
};

export default class PlayCard {
    /**
     * Generate a Neo-Brutalism style music card
     * @param {object} data - { title, author, thumbnail, currentTime, duration, requester, source, isQueued, isPaused }
     */
    static async generate(data) {
        try {
            const canvas = createCanvas(CONFIG.width, CONFIG.height);
            const ctx = canvas.getContext('2d');

            const margin = 20;
            const cardW = CONFIG.width - (margin * 2) - CONFIG.shadowOffset;
            const cardH = CONFIG.height - (margin * 2) - CONFIG.shadowOffset;

            // Draw Base Card (White with black border)
            this.drawBrutalistRect(ctx, margin, margin, cardW, cardH, CONFIG.colors.bg);

            // ==========================================
            // ALBUM ART
            // ==========================================
            const artSize = 220;
            const artX = margin + 40;
            const artY = margin + (cardH - artSize) / 2;

            try {
                const coverImg = await loadImage(data.thumbnail || 'https://i.imgur.com/4M34hi2.png');

                // Yellow decorative background behind cover
                this.drawBrutalistRect(ctx, artX, artY, artSize, artSize, CONFIG.colors.accentSecondary);

                // Calculate aspect ratio for COVER mode (fill entire square, crop excess)
                const imgWidth = coverImg.width;
                const imgHeight = coverImg.height;
                const imgAspect = imgWidth / imgHeight;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect >= 1) {
                    // Image is wider than tall - scale by height, crop width
                    drawHeight = artSize;
                    drawWidth = artSize * imgAspect;
                    drawX = artX - (drawWidth - artSize) / 2; // Center horizontally (crop sides)
                    drawY = artY;
                } else {
                    // Image is taller than wide - scale by width, crop height
                    drawWidth = artSize;
                    drawHeight = artSize / imgAspect;
                    drawX = artX;
                    drawY = artY - (drawHeight - artSize) / 2; // Center vertically (crop top/bottom)
                }

                // Clip to the art area to avoid overflow
                ctx.save();
                ctx.beginPath();
                ctx.rect(artX, artY, artSize, artSize);
                ctx.clip();

                // Draw image maintaining original proportions, centered
                ctx.drawImage(coverImg, drawX, drawY, drawWidth, drawHeight);

                ctx.restore();

                // Redraw border on top of image
                ctx.lineWidth = CONFIG.strokeWidth;
                ctx.strokeStyle = CONFIG.colors.border;
                ctx.strokeRect(artX, artY, artSize, artSize);

            } catch (e) {
                // Fallback if image fails
                this.drawBrutalistRect(ctx, artX, artY, artSize, artSize, '#333');
            }

            // ==========================================
            // BADGE (Rotated)
            // ==========================================
            ctx.save();
            ctx.translate(margin + cardW - 220, margin + 25);
            ctx.rotate(5 * Math.PI / 180);

            const badgeW = 180;
            const badgeH = 40;

            let badgeText = 'PLAYING NOW';
            let badgeColor = CONFIG.colors.badge;

            if (data.isQueued) {
                badgeText = 'IN QUEUE';
                badgeColor = CONFIG.colors.badgeQueued;
            } else if (data.isPaused) {
                badgeText = 'PAUSED';
                badgeColor = CONFIG.colors.badgePaused;
            }

            // Badge shadow
            ctx.fillStyle = CONFIG.colors.border;
            ctx.fillRect(4, 4, badgeW, badgeH);

            // Badge background
            ctx.fillStyle = badgeColor;
            ctx.fillRect(0, 0, badgeW, badgeH);
            ctx.lineWidth = 3;
            ctx.strokeStyle = CONFIG.colors.border;
            ctx.strokeRect(0, 0, badgeW, badgeH);

            // Badge text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, badgeW / 2, badgeH / 2);

            ctx.restore();

            // ==========================================
            // TEXT (TITLE & ARTIST)
            // ==========================================
            const textX = artX + artSize + 40;
            const textY = margin + 80;
            const maxTextW = cardW - artSize - 120;

            // Title
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = '900 55px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';

            // Truncate title to max 10 characters (user request)
            const rawTitle = data.title || 'Unknown';
            const title = rawTitle.length > 10 ? rawTitle.substring(0, 10) + '...' : rawTitle;
            ctx.fillText(title, textX, textY);

            // Artist
            ctx.fillStyle = CONFIG.colors.textSecondary;
            ctx.font = 'bold 32px sans-serif';
            const artist = this.truncateText(ctx, data.author || 'Unknown Artist', maxTextW);
            ctx.fillText(artist, textX, textY + 50);

            // Decorative underline below artist
            const artistWidth = Math.min(ctx.measureText(artist).width, maxTextW - 50);
            ctx.lineWidth = 3;
            ctx.strokeStyle = CONFIG.colors.border;
            ctx.beginPath();
            ctx.moveTo(textX, textY + 60);
            ctx.lineTo(textX + artistWidth, textY + 60);
            ctx.stroke();

            // ==========================================
            // PROGRESS BAR (Brutalist Style)
            // ==========================================
            const barX = textX;
            const barY = textY + 110;
            const barW = maxTextW - 20;
            const barH = 35;

            const currentMs = data.currentTime || 0;
            const totalMs = (data.duration && data.duration > 0) ? data.duration : 1000; // Default to 1s to prevent division by zero
            // Ensure no NaN
            const progress = Math.min(Math.max(currentMs / totalMs, 0), 1) || 0;

            // Bar background (Light gray)
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.lineWidth = CONFIG.strokeWidth;
            ctx.strokeStyle = CONFIG.colors.border;
            ctx.strokeRect(barX, barY, barW, barH);

            // Progress fill with stripes
            if (progress > 0) {
                const fillW = barW * progress;

                // Create stripe pattern
                const pattern = ctx.createPattern(this.createStripePattern(), 'repeat');
                ctx.fillStyle = pattern;
                ctx.fillRect(barX, barY, fillW, barH);

                // Right border of filled area
                ctx.beginPath();
                ctx.moveTo(barX + fillW, barY);
                ctx.lineTo(barX + fillW, barY + barH);
                ctx.stroke();
            }

            // Time display
            const timeText = `${this.formatTime(currentMs)} / ${this.formatTime(totalMs)}`;
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(timeText, barX + barW, barY - 10);

            // ==========================================
            // SOURCE & REQUESTER INFO
            // ==========================================
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = CONFIG.colors.textSecondary;
            ctx.textAlign = 'left';

            if (data.source) {
                ctx.fillText(`Via ${data.source}`, textX, barY + barH + 30);
            }

            if (data.requester) {
                ctx.textAlign = 'right';
                ctx.fillText(`Pedido por ${data.requester}`, barX + barW, barY + barH + 30);
            }

            // Removed Branding as requested

            return canvas.toBuffer('image/png');

        } catch (error) {
            Logger.error('PlayCard generation error:', error);
            throw error;
        }
    }

    /**
     * Draw a brutalist rectangle with hard shadow
     */
    static drawBrutalistRect(ctx, x, y, w, h, color) {
        // Hard shadow (offset)
        ctx.fillStyle = CONFIG.colors.shadow;
        ctx.fillRect(x + CONFIG.shadowOffset, y + CONFIG.shadowOffset, w, h);

        // Main rectangle
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        // Thick border
        ctx.lineWidth = CONFIG.strokeWidth;
        ctx.strokeStyle = CONFIG.colors.border;
        ctx.strokeRect(x, y, w, h);
    }

    /**
     * Create stripe pattern for progress bar
     */
    static createStripePattern() {
        const size = 20;
        const patternCanvas = createCanvas(size, size);
        const pCtx = patternCanvas.getContext('2d');

        pCtx.fillStyle = CONFIG.colors.accent;
        pCtx.fillRect(0, 0, size, size);

        // Semi-transparent stripe
        pCtx.strokeStyle = 'rgba(0,0,0,0.15)';
        pCtx.lineWidth = 4;
        pCtx.beginPath();
        pCtx.moveTo(0, size);
        pCtx.lineTo(size, 0);
        pCtx.stroke();

        // Corner stripes for seamless loop
        pCtx.beginPath();
        pCtx.moveTo(-5, 5);
        pCtx.lineTo(5, -5);
        pCtx.stroke();

        pCtx.beginPath();
        pCtx.moveTo(size - 5, size + 5);
        pCtx.lineTo(size + 5, size - 5);
        pCtx.stroke();

        return patternCanvas;
    }

    /**
     * Format milliseconds to MM:SS
     */
    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * Truncate text to fit within width
     */
    static truncateText(ctx, text, maxWidth) {
        if (!text) return '';
        let truncated = text;
        while (ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -4) + '...';
        }
        return truncated;
    }
}
