// ╔═══════════════════════════════════════════════════════════════════╗
// ║                       Profile Card Canvas                           ║
// ║                Soft Pop Design - Vibrant & Modern                   ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { createCanvas } from '@napi-rs/canvas';
import { loadImageSafe, getFont } from '../utils/canvasHelper.js';

// Configuration for "Soft Pop" style
const CONFIG = {
    width: 850,
    height: 500,
    colors: {
        bg: '#fdfbf7',
        dots: '#e5e7eb',
        shadow: 'rgba(0, 0, 0, 0.1)', // Soft shadow
        cardShadow: '#000000',        // Hard shadow
        border: '#000000',            // Black border
        textMain: '#1f2937',
        textSoft: '#6b7280',

        // Card Colors
        cardProfile: '#ffffff',
        cardTotal: '#eff6ff',    // Light Blue
        cardRepeat: '#fdf2f8',   // Light Pink
        cardArtist: '#fefce8'    // Light Yellow
    }
};

export default class ProfileCard {
    /**
     * Generate "Soft Pop" profile card
     * @param {object} data - User profile data
     */
    static async generate(data, texts = {}) {
        const { user, stats } = data;

        // Default texts/Fallbacks
        const t = {
            songs_listened: texts.songs_listened || 'MÚSICAS OUVIDAS',
            recent: texts.recent || 'RECENTES 🔁',
            top_artist: texts.top_artist || 'TOP ARTISTA',
            hours_listened: texts.hours_listened || 'horas ouvidas',
            various_artists: texts.various_artists || 'Vários Artistas',
            music_lover: texts.music_lover || 'Music Lover',
            verified: texts.verified || 'Verified',
            level: texts.level || 'LVL'
        };

        // Map input data to template structure
        const userData = {
            username: user.username,
            avatar: user.displayAvatarURL({ extension: 'png', size: 256 }),
            level: this.calculateLevel(stats.totalPlayed || 0),
            totalSongs: this.formatNumber(stats.totalPlayed || 0),
            topArtist: stats.topArtist || t.various_artists,
            topArtistImg: stats.topArtistImg || null, // Will use placeholder if null
            recentCovers: stats.recentCovers || [],    // Array of URLs
            hoursListened: Math.floor((stats.totalTime || 0) / (1000 * 60 * 60))
        };

        const canvas = createCanvas(CONFIG.width, CONFIG.height);
        const ctx = canvas.getContext('2d');

        // ==========================================
        // 1. BACKGROUND WITH DOT PATTERN
        // ==========================================
        ctx.fillStyle = CONFIG.colors.bg;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        // Draw dots (Grid Pattern)
        ctx.fillStyle = CONFIG.colors.dots;
        const dotSize = 2;
        const spacing = 20;
        for (let x = 0; x < CONFIG.width; x += spacing) {
            for (let y = 0; y < CONFIG.height; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ==========================================
        // 2. DECORATIVE BLOBS
        // ==========================================
        // Pink Blob (Top Right)
        const gradPink = ctx.createRadialGradient(CONFIG.width, 0, 0, CONFIG.width, 0, 300);
        gradPink.addColorStop(0, 'rgba(251, 207, 232, 0.5)'); // pink-200
        gradPink.addColorStop(1, 'rgba(251, 207, 232, 0)');
        ctx.fillStyle = gradPink;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        // Yellow Blob (Bottom Left)
        const gradYellow = ctx.createRadialGradient(0, CONFIG.height, 0, 0, CONFIG.height, 300);
        gradYellow.addColorStop(0, 'rgba(254, 240, 138, 0.5)'); // yellow-200
        gradYellow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = gradYellow;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        // ==========================================
        // 3. HEADER (MY MUSIC VIBE)
        // ==========================================
        const headerText = "✨ MY MUSIC VIBE";
        ctx.font = getFont('Bold', 16);
        const headerW = ctx.measureText(headerText).width + 40;
        const headerX = (CONFIG.width - headerW) / 2;
        const headerY = 30;

        // Badge Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.roundRect(headerX + 4, headerY + 4, headerW, 30, 15);
        ctx.fill();

        // Badge Black
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(headerX, headerY, headerW, 30, 15);
        ctx.fill();

        // Header Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(headerText, CONFIG.width / 2, headerY + 15);


        // ==========================================
        // 4. CARD 1: MAIN PROFILE (Large Left)
        // ==========================================
        const pX = 40, pY = 80, pW = 500, pH = 180;
        this.drawPopCard(ctx, pX, pY, pW, pH, CONFIG.colors.cardProfile);

        ctx.save();
        // Avatar
        const avaSize = 100;
        const avaX = pX + 30;
        const avaY = pY + (pH - avaSize) / 2;

        // Draw Avatar Circle with thick white border
        ctx.save();
        ctx.beginPath();
        ctx.arc(avaX + avaSize / 2, avaY + avaSize / 2, avaSize / 2, 0, Math.PI * 2);
        ctx.clip();
        try {
            const avatarImg = await loadImageSafe(userData.avatar);
            if (avatarImg) {
                ctx.drawImage(avatarImg, avaX, avaY, avaSize, avaSize);
            } else {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(avaX, avaY, avaSize, avaSize);
            }
        } catch (e) {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(avaX, avaY, avaSize, avaSize);
        }
        ctx.restore();

        // Avatar Border
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(); // Inner white border
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke(); // Subtle shadow for border

        // Level Badge (bubbly & moved slightly)
        ctx.save();
        ctx.translate(avaX + avaSize - 10, avaY + avaSize - 10);
        ctx.rotate(10 * Math.PI / 180);

        ctx.fillStyle = '#fde047'; // Strong Yellow
        ctx.beginPath();
        ctx.roundRect(-20, -10, 60, 24, 8);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = getFont('Bold', 12);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${t.level} ${userData.level}`, -12, 6);
        ctx.restore();

        // Name and Tags
        const textStartX = avaX + avaSize + 30;
        ctx.fillStyle = CONFIG.colors.textMain;
        ctx.textAlign = 'left';
        ctx.font = getFont('Bold', 35); // Thick font matching "900" but using registered bold
        // Centering text block vertically with avatar
        // Avatar Center Y = 170 (pY + pH/2 = 80 + 90 = 170)
        // Move Name down slightly to pY + 75
        ctx.fillText(this.truncateText(ctx, userData.username, 280), textStartX, pY + 75);

        // Colorful Tags
        const drawTag = (text, tx, ty, bg, color) => {
            ctx.font = getFont('Bold', 12);
            const tm = ctx.measureText(text);
            const pad = 10;

            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.roundRect(tx, ty, tm.width + pad * 2, 24, 8);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.fillText(text, tx + pad, ty + 16);
            return tx + tm.width + pad * 2 + 10; // Return next X position
        };

        let tagX = textStartX;
        // Move tags down to pY + 95 to avoid overlap and center block
        tagX = drawTag(t.music_lover, tagX, pY + 95, '#f3e8ff', '#7e22ce'); // Purple
        tagX = drawTag(t.verified, tagX, pY + 95, '#dcfce7', '#15803d');   // Green
        ctx.restore();


        // ==========================================
        // 5. CARD 2: TOTAL STATS (Top Right)
        // Rotated slightly for dynamism
        // ==========================================
        const tX = 560, tY = 80, tW = 250, tH = 180;
        this.drawPopCard(ctx, tX, tY, tW, tH, CONFIG.colors.cardTotal, 2); // 2 degree rotation

        ctx.save();
        // Adjust coordinates for rotated card
        const tCx = tX + tW / 2;
        const tCy = tY + tH / 2;
        ctx.translate(tCx, tCy);
        ctx.rotate(2 * Math.PI / 180);
        ctx.translate(-tCx, -tCy);

        // Content
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.textAlign = 'center';
        ctx.font = getFont('Bold', 50);
        ctx.fillText(userData.totalSongs, tX + tW / 2, tY + 80);

        ctx.fillStyle = CONFIG.colors.textSoft;
        ctx.font = getFont('Bold', 14);
        ctx.fillText(t.songs_listened, tX + tW / 2, tY + 110);

        // Fake Progress Bar
        const barW = 150;
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(tX + (tW - barW) / 2, tY + 130, barW, 12, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#60a5fa'; // Light Blue
        ctx.beginPath();
        ctx.roundRect(tX + (tW - barW) / 2, tY + 130, barW * 0.7, 12, 6); // Fixed 70% fill for visual
        ctx.fill();
        ctx.restore();


        // ==========================================
        // 6. CARD 3: ON REPEAT (Bottom Left)
        // ==========================================
        const rX = 40, rY = 280, rW = 250, rH = 180;
        this.drawPopCard(ctx, rX, rY, rW, rH, CONFIG.colors.cardRepeat);

        ctx.save();
        ctx.fillStyle = '#db2777'; // Strong Pink
        ctx.textAlign = 'center';
        ctx.font = getFont('Bold', 14);
        ctx.fillText(t.recent, rX + rW / 2, rY + 25);

        // Cover Grid (2x2)
        const gridPad = 10;
        const imgSize = 60;
        const startImgX = rX + (rW - (imgSize * 2 + gridPad)) / 2;
        const startImgY = rY + 45;

        // Draw up to 3 covers + 1 button, or just fill with what we have
        const covers = userData.recentCovers || [];
        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const curX = startImgX + col * (imgSize + gridPad);
            const curY = startImgY + row * (imgSize + gridPad);

            ctx.save();
            // Shadow & Border for covers
            ctx.beginPath();
            ctx.roundRect(curX, curY, imgSize, imgSize, 8);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000';
            ctx.stroke();
            ctx.clip();

            if (i < 3 && covers[i]) {
                try {
                    const cover = await loadImageSafe(covers[i]);
                    if (cover) {
                        ctx.drawImage(cover, curX, curY, imgSize, imgSize);
                    } else {
                        // Fallback colored rect
                        ctx.fillStyle = '#fce7f3';
                        ctx.fillRect(curX, curY, imgSize, imgSize);
                    }
                } catch (e) {
                    ctx.fillStyle = '#fce7f3';
                    ctx.fillRect(curX, curY, imgSize, imgSize);
                }
            } else {
                // Last one is "+" button or empty slots
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(curX, curY, imgSize, imgSize);
                if (i === 3) {
                    ctx.fillStyle = '#d1d5db';
                    ctx.font = getFont('Bold', 30);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('+', curX + imgSize / 2, curY + imgSize / 2);
                }
            }
            ctx.restore();
        }
        ctx.restore();


        // ==========================================
        // 7. CARD 4: TOP ARTIST (Bottom Right)
        // ==========================================
        const aX = 310, aY = 280, aW = 500, aH = 180;
        this.drawPopCard(ctx, aX, aY, aW, aH, CONFIG.colors.cardArtist);

        ctx.save();
        // Text Left
        const txtAreaX = aX + 30;
        ctx.fillStyle = CONFIG.colors.textSoft;
        ctx.textAlign = 'left';
        ctx.font = getFont('Bold', 12);
        ctx.fillText(t.top_artist, txtAreaX, aY + 60);

        ctx.fillStyle = CONFIG.colors.textMain;
        // REDUCED FONT SIZE from 40px to 32px to fit larger names
        ctx.font = getFont('Bold', 32);
        const artistName = this.truncateText(ctx, userData.topArtist, 280);
        ctx.fillText(artistName, txtAreaX, aY + 100);

        ctx.fillStyle = '#ca8a04'; // Dark Yellow
        ctx.font = getFont('Bold', 14);
        ctx.fillText(`${userData.hoursListened} ${t.hours_listened}`, txtAreaX, aY + 125);

        // Artist Image (Giant Circle Right)
        const artSize = 140;
        const artImgX = aX + aW - artSize - 30;
        const artImgY = aY + (aH - artSize) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(artImgX + artSize / 2, artImgY + artSize / 2, artSize / 2, 0, Math.PI * 2);
        ctx.clip();

        if (userData.topArtistImg) {
            try {
                const artistImg = await loadImageSafe(userData.topArtistImg);
                if (artistImg) {
                    ctx.drawImage(artistImg, artImgX, artImgY, artSize, artSize);
                    // Yellow overlay for style
                    ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
                    ctx.fillRect(artImgX, artImgY, artSize, artSize);
                } else {
                    ctx.fillStyle = '#fde047'; ctx.fillRect(artImgX, artImgY, artSize, artSize);
                }
            } catch (e) {
                ctx.fillStyle = '#fde047'; ctx.fillRect(artImgX, artImgY, artSize, artSize);
            }
        } else {
            // If no artist image, draw a colored circle with initial
            ctx.fillStyle = '#fde047';
            ctx.fillRect(artImgX, artImgY, artSize, artSize);
            ctx.fillStyle = '#ca8a04';
            ctx.font = getFont('Bold', 60);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(userData.topArtist.charAt(0).toUpperCase(), artImgX + artSize / 2, artImgY + artSize / 2);
        }

        ctx.restore();

        // Artist Border
        ctx.beginPath();
        ctx.arc(artImgX + artSize / 2, artImgY + artSize / 2, artSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        ctx.restore();

        // ==========================================
        // 8. FOOTER (By Brunix)
        // ==========================================
        ctx.save();
        ctx.font = getFont('Bold', 12);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.6)'; // Soft gray with transparency
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('By Brunix ✨', CONFIG.width - 20, CONFIG.height - 12);
        ctx.restore();

        return canvas.toBuffer('image/png');
    }

    /**
     * Draw "Pop" style card with offset shadow
     */
    static drawPopCard(ctx, x, y, w, h, color, rotateDeg = 0) {
        ctx.save();

        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(rotateDeg * Math.PI / 180);
        ctx.translate(-cx, -cy);

        // 1. Hard Shadow (Offset 8px)
        ctx.fillStyle = CONFIG.colors.cardShadow;
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.roundRect(x + 8, y + 8, w, h, 24);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // 2. Card Background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 24);
        ctx.fill();

        // 3. Black Border
        ctx.lineWidth = 2;
        ctx.strokeStyle = CONFIG.colors.border;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Calculate level from songs played
     */
    static calculateLevel(songsPlayed) {
        return Math.floor(Math.sqrt(songsPlayed / 5)) + 1;
    }

    static formatNumber(num) {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    static truncateText(ctx, text, maxWidth) {
        if (!text) return '';
        let truncated = text;
        while (ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
            truncated = truncated.slice(0, -4) + '...';
        }
        return truncated;
    }
}
