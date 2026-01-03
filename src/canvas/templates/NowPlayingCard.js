// ╔═══════════════════════════════════════════════════════════════════╗
// ║                   Now Playing Card Canvas                           ║
// ║        Full HD Premium 1920x1080 with Dynamic Colors                ║
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

const WIDTH = 1920;
const HEIGHT = 1080;

export default class NowPlayingCard {
    /**
     * Generate Full HD Now Playing card with dynamic colors
     */
    static async generate(data) {
        const { title, author, duration, position = 0, thumbnail, requester, source = 'youtube' } = data;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Load thumbnail and extract colors
        let dominantColor = { r: 45, g: 45, b: 55 };
        let accentColor = { r: 80, g: 80, b: 100 };
        let thumbImage = null;

        try {
            thumbImage = await loadImageSafe(thumbnail);
            if (thumbImage) {
                const colors = this.extractColors(ctx, thumbImage);
                dominantColor = colors.dominant;
                accentColor = colors.accent;
            }
        } catch { }

        // Dynamic gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        bgGradient.addColorStop(0, `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`);
        bgGradient.addColorStop(0.5, this.darken(dominantColor, 0.4));
        bgGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Overlay for readability
        const overlay = ctx.createLinearGradient(0, 0, WIDTH, 0);
        overlay.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
        overlay.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Decorative elements - large accent lines
        ctx.fillStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.5)`;
        ctx.fillRect(0, 0, 15, HEIGHT);

        // Subtle grain texture effect
        this.addNoiseTexture(ctx, WIDTH, HEIGHT, 0.03);

        // --- LAYOUT CONSTANTS (1920x1080) ---
        const artSize = 700;
        const artX = 150;
        const artY = (HEIGHT - artSize) / 2;

        const contentX = 950;
        const contentWidth = 850;

        // --- ALBUM ART (Left Side) ---
        ctx.shadowColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.5)`;
        ctx.shadowBlur = 80;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;

        if (thumbImage) {
            // Draw rounded album art
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(artX, artY, artSize, artSize, 40);
            ctx.clip();
            ctx.drawImage(thumbImage, artX, artY, artSize, artSize);
            ctx.restore();

            // Art border glow
            ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(artX, artY, artSize, artSize, 40);
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            drawRoundedRect(ctx, artX, artY, artSize, artSize, 40);
        }

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // --- CONTENT (Right Side) ---

        // Provider Badge
        const providerLabel = this.getProviderLabel(source);
        ctx.font = getFont('Bold', 24);
        const badgeWidth = ctx.measureText(providerLabel).width + 60;
        const badgeY = artY + 20;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        drawRoundedRect(ctx, contentX, badgeY, badgeWidth, 50, 25);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(providerLabel, contentX + 30, badgeY + 34);

        // Title
        const titleY = badgeY + 140;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = getFont('Bold', 85); // Huge font
        const truncatedTitle = truncateText(ctx, title || 'Unknown', contentWidth);
        ctx.fillText(truncatedTitle, contentX, titleY);

        // Artist
        const artistY = titleY + 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = getFont('Medium', 55); // Large font
        const truncatedArtist = truncateText(ctx, author || 'Unknown Artist', contentWidth);
        ctx.fillText(truncatedArtist, contentX, artistY);

        // Progress Bar
        const progressY = artistY + 150;
        const progressHeight = 16;
        const progressWidth = contentWidth;
        const progress = duration > 0 ? Math.min(1, position / duration) : 0;

        // Background Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(ctx, contentX, progressY, progressWidth, progressHeight, 8);

        // Fill Bar
        if (progress > 0) {
            const progressGradient = ctx.createLinearGradient(contentX, 0, contentX + progressWidth, 0);
            progressGradient.addColorStop(0, `rgb(${accentColor.r}, ${accentColor.g}, ${accentColor.b})`);
            progressGradient.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = progressGradient;

            const fillWidth = Math.max(16, progressWidth * progress);
            drawRoundedRect(ctx, contentX, progressY, fillWidth, progressHeight, 8);

            // Dot
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(contentX + fillWidth, progressY + (progressHeight / 2), 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Timestamps
        const timeY = progressY + 70;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = getFont('Regular', 32);
        ctx.textAlign = 'left';
        ctx.fillText(formatDuration(position), contentX, timeY);
        ctx.textAlign = 'right';
        ctx.fillText(formatDuration(duration), contentX + progressWidth, timeY);

        // Requester
        if (requester) {
            const reqY = HEIGHT - 100;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = getFont('Regular', 30);
            ctx.textAlign = 'left';
            ctx.fillText(`Pedido por ${requester.username || 'Unknown'}`, contentX, reqY);
        }

        // Branding
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = getFont('Bold', 30);
        ctx.textAlign = 'right';
        ctx.fillText('BRUNIX 2.0', WIDTH - 60, HEIGHT - 50);

        return canvas.toBuffer('image/png');
    }

    /**
     * Extract dominant colors from image (Helper)
     */
    static extractColors(ctx, image) {
        const sampleSize = 100;
        const tempCanvas = createCanvas(sampleSize, sampleSize);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image, 0, 0, sampleSize, sampleSize);
        const imageData = tempCtx.getImageData(0, 0, sampleSize, sampleSize).data;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        let rSum2 = 0, gSum2 = 0, bSum2 = 0, count2 = 0;

        for (let i = 0; i < imageData.length; i += 16) {
            const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
            const luminance = (r + g + b) / 3;
            if (luminance > 30 && luminance < 220) {
                rSum += r; gSum += g; bSum += b; count++;
            }
            if (i > imageData.length / 2 && luminance > 50 && luminance < 200) {
                rSum2 += r; gSum2 += g; bSum2 += b; count2++;
            }
        }

        const dominant = count > 0 ? { r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) } : { r: 60, g: 60, b: 80 };
        const accent = count2 > 0 ? { r: Math.round(rSum2 / count2), g: Math.round(gSum2 / count2), b: Math.round(bSum2 / count2) } : dominant;
        return { dominant, accent };
    }

    static darken(color, factor) {
        return `rgb(${Math.round(color.r * factor)}, ${Math.round(color.g * factor)}, ${Math.round(color.b * factor)})`;
    }

    static addNoiseTexture(ctx, width, height, opacity) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * opacity;
            data[i] += noise; data[i + 1] += noise; data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);
    }

    static getProviderLabel(source) {
        const providers = {
            'youtube': 'YOUTUBE MUSIC',
            'youtube_music': 'YOUTUBE MUSIC',
            'spotify': 'SPOTIFY',
            'soundcloud': 'SOUNDCLOUD',
            'deezer': 'DEEZER',
            'apple': 'APPLE MUSIC'
        };
        return providers[source?.toLowerCase()] || 'STREAMING';
    }
}
