// ╔═══════════════════════════════════════════════════════════════════╗
// ║                          Validators                                 ║
// ╚═══════════════════════════════════════════════════════════════════╝

/**
 * Check if string is a valid URL
 * @param {string} string - String to validate
 * @returns {boolean}
 */
export function isURL(string) {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if URL is from YouTube
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isYouTubeURL(url) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/,
        /^(https?:\/\/)?(music\.)?youtube\.com/
    ];
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Check if URL is from Spotify
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isSpotifyURL(url) {
    return /^(https?:\/\/)?(open\.)?spotify\.com/.test(url);
}

/**
 * Check if URL is from SoundCloud
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isSoundCloudURL(url) {
    return /^(https?:\/\/)?(www\.)?(soundcloud\.com|snd\.sc)/.test(url);
}

/**
 * Detect source from URL
 * @param {string} url - URL to analyze
 * @returns {string} Source name
 */
export function detectSource(url) {
    if (isYouTubeURL(url)) return 'youtube';
    if (isSpotifyURL(url)) return 'spotify';
    if (isSoundCloudURL(url)) return 'soundcloud';
    return 'unknown';
}

/**
 * Validate playlist name
 * @param {string} name - Playlist name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlaylistName(name) {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Nome da playlist não pode ser vazio' };
    }
    if (name.length > 50) {
        return { valid: false, error: 'Nome da playlist deve ter no máximo 50 caracteres' };
    }
    if (!/^[a-zA-Z0-9\s\-_áàâãéèêíìîóòôõúùûç]+$/i.test(name)) {
        return { valid: false, error: 'Nome contém caracteres inválidos' };
    }
    return { valid: true };
}
