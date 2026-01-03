// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      Radio Card Canvas                               ║
// ║        Full HD Premium 1920x1080 - 24/7 Radio Visual                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas } from '@napi-rs/canvas';
import {
    CANVAS_THEME,
    drawRoundedRect,
    truncateText,
    loadImageSafe,
    getFont
} from '../utils/canvasHelper.js';

const WIDTH = 1920;
const HEIGHT = 1080;

// Genre colors and vibes
const GENRE_THEMES = {
    pop: { primary: '#FF69B4', secondary: '#FF1493', accent: '#FFB6C1' },
    rock: { primary: '#DC143C', secondary: '#8B0000', accent: '#FF6347' },
    hiphop: { primary: '#FFD700', secondary: '#FFA500', accent: '#FFEC8B' },
    edm: { primary: '#00FFFF', secondary: '#00CED1', accent: '#7FFFD4' },
    jazz: { primary: '#8B4513', secondary: '#D2691E', accent: '#DEB887' },
    classical: { primary: '#DAA520', secondary: '#B8860B', accent: '#FFD700' },
    lofi: { primary: '#9370DB', secondary: '#8A2BE2', accent: '#DDA0DD' },
    kpop: { primary: '#FF1493', secondary: '#FF69B4', accent: '#FFB6C1' },
    latin: { primary: '#FF4500', secondary: '#FF6347', accent: '#FFA07A' },
    country: { primary: '#CD853F', secondary: '#8B4513', accent: '#DEB887' },
    rb: { primary: '#800080', secondary: '#9400D3', accent: '#DA70D6' },
    metal: { primary: '#2F4F4F', secondary: '#1C1C1C', accent: '#696969' },
    indie: { primary: '#98FB98', secondary: '#00FA9A', accent: '#7CFC00' },
    anime: { primary: '#E91E63', secondary: '#FF4081', accent: '#F48FB1' },
    gaming: { primary: '#7B68EE', secondary: '#6A5ACD', accent: '#9370DB' },
    chill: { primary: '#87CEEB', secondary: '#4682B4', accent: '#B0E0E6' }
};

export default class RadioCard {
    /**
     * Generate Full HD Radio card with dynamic genre theme
     */
    static async generate(data) {
        const {
            genreName,
            genreKey,
            genreEmoji,
            channelName,
            queueSize,
            currentTrack,
            thumbnail,
            requester
        } = data;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Get genre theme colors
        const theme = GENRE_THEMES[genreKey] || GENRE_THEMES.pop;
        const primaryColor = this.hexToRgb(theme.primary);
        const secondaryColor = this.hexToRgb(theme.secondary);
        const accentColor = this.hexToRgb(theme.accent);

        // Load thumbnail if provided
        let thumbImage = null;
        try {
            if (thumbnail) {
                thumbImage = await loadImageSafe(thumbnail);
            }
        } catch { }

        // === BACKGROUND ===
        // Dark gradient with genre color tint
        const bgGradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, WIDTH);
        bgGradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`);
        bgGradient.addColorStop(0.5, '#0d0d0d');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // === RADIO WAVE ANIMATION CIRCLES ===
        const centerX = 480;
        const centerY = HEIGHT / 2;

        // Multiple expanding circles (static representation of animation)
        for (let i = 0; i < 6; i++) {
            const radius = 150 + i * 80;
            const alpha = 0.15 - (i * 0.02);
            ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // === ALBUM ART / RADIO ICON (Center Circle) ===
        const artRadius = 200;

        // Glow effect
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = 60;

        ctx.beginPath();
        ctx.arc(centerX, centerY, artRadius + 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`;
        ctx.fill();

        ctx.shadowBlur = 0;

        // Art circle clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, artRadius, 0, Math.PI * 2);
        ctx.clip();

        if (thumbImage) {
            // Draw thumbnail centered in circle
            const imgSize = artRadius * 2;
            ctx.drawImage(thumbImage, centerX - artRadius, centerY - artRadius, imgSize, imgSize);
        } else {
            // Default radio icon background
            const iconGradient = ctx.createLinearGradient(centerX - artRadius, centerY - artRadius, centerX + artRadius, centerY + artRadius);
            iconGradient.addColorStop(0, theme.primary);
            iconGradient.addColorStop(1, theme.secondary);
            ctx.fillStyle = iconGradient;
            ctx.fill();
        }
        ctx.restore();

        // Circle border
        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, artRadius, 0, Math.PI * 2);
        ctx.stroke();

        // === RADIO BADGE (Pulsing effect) ===
        const badgeX = WIDTH / 2 + 100;
        const badgeY = 120;

        // Glowing background badge
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = 30;
        ctx.fillStyle = theme.primary;
        drawRoundedRect(ctx, badgeX, badgeY, 280, 70, 35);
        ctx.shadowBlur = 0;

        // Badge text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = getFont('Bold', 32);
        ctx.textAlign = 'center';
        ctx.fillText('📻 RÁDIO 24/7', badgeX + 140, badgeY + 47);

        // === MAIN CONTENT (Right Side) ===
        const contentX = WIDTH / 2 + 50;
        const contentWidth = WIDTH / 2 - 120;

        // Genre Title with Emoji
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.primary;
        ctx.font = getFont('Bold', 100);
        ctx.fillText(`${genreEmoji || '🎵'} ${genreName || 'Radio'}`, contentX, 320);

        // Subtitle: FM STATION
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = getFont('Medium', 40);
        ctx.fillText('FM STATION', contentX, 380);

        // Divider line
        const dividerGradient = ctx.createLinearGradient(contentX, 0, contentX + 400, 0);
        dividerGradient.addColorStop(0, theme.primary);
        dividerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = dividerGradient;
        ctx.fillRect(contentX, 420, 500, 4);

        // === INFO CARDS ===
        const cardY = 480;
        const cardHeight = 90;
        const cardSpacing = 20;

        // Channel Card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        drawRoundedRect(ctx, contentX, cardY, contentWidth, cardHeight, 20);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = getFont('Regular', 26);
        ctx.fillText('CANAL', contentX + 30, cardY + 35);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = getFont('Bold', 36);
        ctx.fillText(`🔊 ${truncateText(ctx, channelName || 'Voice', contentWidth - 80)}`, contentX + 30, cardY + 70);

        // Queue Card
        const queueCardY = cardY + cardHeight + cardSpacing;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        drawRoundedRect(ctx, contentX, queueCardY, contentWidth, cardHeight, 20);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = getFont('Regular', 26);
        ctx.fillText('MÚSICAS NA FILA', contentX + 30, queueCardY + 35);

        ctx.fillStyle = theme.primary;
        ctx.font = getFont('Bold', 36);
        ctx.fillText(`📋 ${queueSize || 0} músicas`, contentX + 30, queueCardY + 70);

        // Mode Card
        const modeCardY = queueCardY + cardHeight + cardSpacing;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        drawRoundedRect(ctx, contentX, modeCardY, contentWidth, cardHeight, 20);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = getFont('Regular', 26);
        ctx.fillText('MODO', contentX + 30, modeCardY + 35);

        ctx.fillStyle = '#00FF7F';
        ctx.font = getFont('Bold', 36);
        ctx.fillText('🟢 24/7 ATIVO', contentX + 30, modeCardY + 70);

        // === CURRENT TRACK (if playing) ===
        if (currentTrack) {
            const trackY = modeCardY + cardHeight + cardSpacing + 30;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = getFont('Regular', 24);
            ctx.fillText('TOCANDO AGORA', contentX, trackY);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = getFont('Bold', 32);
            const truncatedTitle = truncateText(ctx, currentTrack.title || 'Unknown', contentWidth);
            ctx.fillText(truncatedTitle, contentX, trackY + 45);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = getFont('Regular', 26);
            const truncatedArtist = truncateText(ctx, currentTrack.author || 'Unknown Artist', contentWidth);
            ctx.fillText(truncatedArtist, contentX, trackY + 80);
        }

        // === DECORATIVE ELEMENTS ===

        // Top-left corner accent
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.2)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(300, 0);
        ctx.lineTo(0, 300);
        ctx.closePath();
        ctx.fill();

        // Bottom-right corner accent
        ctx.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.15)`;
        ctx.beginPath();
        ctx.moveTo(WIDTH, HEIGHT);
        ctx.lineTo(WIDTH - 400, HEIGHT);
        ctx.lineTo(WIDTH, HEIGHT - 400);
        ctx.closePath();
        ctx.fill();

        // Musical notes decorations (left side)
        ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.font = getFont('Regular', 60);
        ctx.fillText('♪', 80, 200);
        ctx.fillText('♫', 120, HEIGHT - 200);
        ctx.font = getFont('Regular', 40);
        ctx.fillText('♬', 50, HEIGHT / 2 - 300);
        ctx.fillText('♩', 100, HEIGHT / 2 + 350);

        // === FOOTER ===
        // Requester info
        if (requester) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = getFont('Regular', 28);
            ctx.textAlign = 'left';
            ctx.fillText(`Iniciado por ${requester.username || 'Unknown'}`, 60, HEIGHT - 50);
        }

        // Branding
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = getFont('Bold', 30);
        ctx.textAlign = 'right';
        ctx.fillText('BRUNIX RADIO', WIDTH - 60, HEIGHT - 50);

        // Noise texture for premium feel
        this.addNoiseTexture(ctx, WIDTH, HEIGHT, 0.02);

        return canvas.toBuffer('image/png');
    }

    /**
     * Convert hex color to RGB object
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 105, b: 180 };
    }

    /**
     * Add subtle noise texture
     */
    static addNoiseTexture(ctx, width, height, opacity) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * opacity;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);
    }
}
