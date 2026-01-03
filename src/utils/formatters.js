// ╔═══════════════════════════════════════════════════════════════════╗
// ║                         Formatters                                  ║
// ╚═══════════════════════════════════════════════════════════════════╝

/**
 * Format milliseconds to human readable duration (HH:MM:SS or MM:SS)
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
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
 * Format large numbers with abbreviations (K, M, B)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create a progress bar string
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} length - Bar length (default 15)
 * @returns {string} Progress bar
 */
export function createProgressBar(current, total, length = 15) {
    const progress = Math.round((current / total) * length);
    const empty = length - progress;

    const filled = '▓'.repeat(progress);
    const blank = '░'.repeat(empty);

    return `${filled}${blank}`;
}

/**
 * Format bytes to human readable size
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted size
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format timestamp to relative time
 * @param {Date|number} date - Date or timestamp
 * @returns {string} Relative time string
 */
export function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    const intervals = {
        ano: 31536000,
        mês: 2592000,
        semana: 604800,
        dia: 86400,
        hora: 3600,
        minuto: 60
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} atrás`;
        }
    }

    return 'agora mesmo';
}
