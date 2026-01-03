// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      Canvas Helper Utilities                        ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import Logger from '../../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsPath = join(__dirname, '../../../assets');

// Register fonts
const fontsPath = join(assetsPath, 'fonts');
if (existsSync(fontsPath)) {
    try {
        GlobalFonts.registerFromPath(join(fontsPath, 'Poppins-Bold.ttf'), 'Poppins Bold');
        GlobalFonts.registerFromPath(join(fontsPath, 'Poppins-Medium.ttf'), 'Poppins Medium');
        GlobalFonts.registerFromPath(join(fontsPath, 'Poppins-Regular.ttf'), 'Poppins Regular');
        Logger.info('Custom fonts loaded');
    } catch {
        Logger.warn('Could not load custom fonts, using fallback');
    }
}

// Premium Canvas Theme
export const CANVAS_THEME = {
    BG_PRIMARY: '#0D0D0D',
    BG_SECONDARY: '#1A1A1A',
    BG_TERTIARY: '#2D2D2D',
    ACCENT: '#C0C0C0',
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_SECONDARY: '#B0B0B0',
    TEXT_MUTED: '#707070',
    PROGRESS_BG: '#404040',
    PROGRESS_FILL: '#C0C0C0',
    BORDER: '#3D3D3D',
    GLOW: 'rgba(192, 192, 192, 0.3)'
};

/**
 * Create rounded rectangle path
 */
export function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw rounded rectangle with fill/stroke
 */
export function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    roundRect(ctx, x, y, width, height, radius);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

/**
 * Draw circular image (for avatars)
 */
export function drawCircularImage(ctx, image, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
}

/**
 * Draw progress bar
 */
export function drawProgressBar(ctx, x, y, width, height, progress, bgColor = CANVAS_THEME.PROGRESS_BG, fillColor = CANVAS_THEME.PROGRESS_FILL) {
    ctx.fillStyle = bgColor;
    drawRoundedRect(ctx, x, y, width, height, height / 2);

    const fillWidth = Math.max(height, width * Math.min(1, progress));
    ctx.fillStyle = fillColor;
    drawRoundedRect(ctx, x, y, fillWidth, height, height / 2);
}

/**
 * Truncate text to fit width
 */
export function truncateText(ctx, text, maxWidth) {
    if (!text) return '';

    let truncated = text;
    let width = ctx.measureText(truncated).width;

    while (width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        width = ctx.measureText(truncated + '...').width;
    }

    return truncated.length < text.length ? truncated + '...' : text;
}

/**
 * Load image with fallback
 */
export async function loadImageSafe(url, fallbackPath = null) {
    try {
        if (url) {
            return await loadImage(url);
        }
    } catch (error) {
        Logger.warn(`Failed to load image: ${url}`);
    }

    if (fallbackPath && existsSync(fallbackPath)) {
        try {
            return await loadImage(fallbackPath);
        } catch {
            Logger.warn('Failed to load fallback image');
        }
    }

    return null;
}

/**
 * Get font family with fallback
 */
export function getFont(weight = 'Regular', size = 16) {
    const fonts = {
        'Bold': 'Poppins Bold',
        'Medium': 'Poppins Medium',
        'Regular': 'Poppins Regular'
    };

    const fontFamily = fonts[weight] || 'Poppins Regular';
    return `${size}px "${fontFamily}", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI", Arial, sans-serif`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '0:00';

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create gradient background
 */
export function createGradientBackground(ctx, width, height, colors = [CANVAS_THEME.BG_PRIMARY, CANVAS_THEME.BG_SECONDARY]) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}
