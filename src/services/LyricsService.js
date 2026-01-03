// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      Lyrics Service                                  ║
// ║            Handles Lyrics Fetching from Lyrics.ovh API               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../utils/logger.js';

class LyricsService {
    constructor() {
        this.baseUrl = 'https://api.lyrics.ovh/v1';
        this.cache = new Map();
        this.cacheTimeout = 1800000; // 30 minutes
    }

    /**
     * Clean text for better API matching
     * Removes common YouTube/streaming garbage from titles
     * @param {string} text - Raw text to clean
     * @returns {string} - Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\(.*?\)|\[.*?\]/g, '')
            .replace(/official\s*(video|audio|music\s*video|mv|lyric\s*video)?/gi, '')
            .replace(/lyrics?\s*(video)?/gi, '')
            .replace(/\b(hd|hq|4k|8k|remastered|remaster|live|acoustic|remix|visualizer)\b/gi, '')
            .replace(/\bft\.?\s*|\bfeat\.?\s*|\bfeaturing\s*/gi, '')
            .replace(/\s*[-–]\s*Topic$/i, '')
            .replace(/VEVO$/i, '')
            .replace(/Official$/i, '')
            .replace(/[|\\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Generate cache key from artist and title
     * @param {string} artist 
     * @param {string} title 
     * @returns {string}
     */
    getCacheKey(artist, title) {
        return `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
    }

    /**
     * Get lyrics from cache if available and not expired
     * @param {string} artist 
     * @param {string} title 
     * @returns {string|null}
     */
    getFromCache(artist, title) {
        const key = this.getCacheKey(artist, title);
        const cached = this.cache.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            Logger.info(`LyricsService: Cache hit for "${artist} - ${title}"`);
            return cached.lyrics;
        }

        // Clean expired entry
        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    /**
     * Store lyrics in cache
     * @param {string} artist 
     * @param {string} title 
     * @param {string} lyrics 
     */
    setCache(artist, title, lyrics) {
        const key = this.getCacheKey(artist, title);
        this.cache.set(key, {
            lyrics,
            expiresAt: Date.now() + this.cacheTimeout
        });
    }

    /**
     * Fetch lyrics from Lyrics.ovh API
     * @param {string} artist - Artist name
     * @param {string} title - Track title
     * @returns {Promise<{ lyrics: string|null, error: string|null }>}
     */
    async fetchLyrics(artist, title) {
        // Clean inputs
        const cleanArtist = this.cleanText(artist);
        const cleanTitle = this.cleanText(title);

        if (!cleanArtist || !cleanTitle) {
            return { lyrics: null, error: 'INVALID_INPUT' };
        }

        // Check cache first
        const cached = this.getFromCache(cleanArtist, cleanTitle);
        if (cached) {
            return { lyrics: cached, error: null };
        }

        try {
            // Primary attempt: artist/title
            const url = `${this.baseUrl}/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
            Logger.info(`LyricsService: Fetching from ${url}`);

            let response = await fetch(url);

            // Fallback: swap artist/title (some APIs work better this way)
            if (!response.ok) {
                const altUrl = `${this.baseUrl}/${encodeURIComponent(cleanTitle)}/${encodeURIComponent(cleanArtist)}`;
                Logger.info(`LyricsService: Primary failed, trying alternate ${altUrl}`);
                response = await fetch(altUrl);
            }

            if (!response.ok) {
                Logger.warn(`LyricsService: API returned ${response.status} for "${cleanArtist} - ${cleanTitle}"`);
                return { lyrics: null, error: 'NOT_FOUND' };
            }

            const data = await response.json();

            if (!data.lyrics || data.lyrics.trim() === '') {
                return { lyrics: null, error: 'EMPTY_LYRICS' };
            }

            // Normalize lyrics
            const normalizedLyrics = this.normalizeLyrics(data.lyrics);

            // Cache the result
            this.setCache(cleanArtist, cleanTitle, normalizedLyrics);

            Logger.info(`LyricsService: Successfully fetched lyrics for "${cleanArtist} - ${cleanTitle}"`);
            return { lyrics: normalizedLyrics, error: null };

        } catch (error) {
            Logger.error('LyricsService: Fetch error:', error);
            return { lyrics: null, error: 'FETCH_ERROR' };
        }
    }

    /**
     * Normalize lyrics formatting
     * - Standardize line breaks
     * - Remove excessive blank lines
     * @param {string} lyrics 
     * @returns {string}
     */
    normalizeLyrics(lyrics) {
        return lyrics
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Get lyrics with automatic artist/title extraction from track info
     * @param {object} trackInfo - Track info object from lavalink-client
     * @returns {Promise<{ lyrics: string|null, error: string|null, query: string }>}
     */
    async getLyricsFromTrack(trackInfo) {
        const artist = trackInfo.author || trackInfo.artist || '';
        const title = trackInfo.title || '';

        const result = await this.fetchLyrics(artist, title);
        return {
            ...result,
            query: `${artist} - ${title}`
        };
    }

    /**
     * Parse user query into artist/title
     * Handles "artist - title" format or treats as both
     * @param {string} query - User input
     * @returns {{ artist: string, title: string }}
     */
    parseQuery(query) {
        if (query.includes(' - ')) {
            const parts = query.split(' - ');
            return {
                artist: parts[0].trim(),
                title: parts.slice(1).join(' - ').trim()
            };
        }

        // If no separator, use query as both artist and title
        return {
            artist: query,
            title: query
        };
    }

    /**
     * Split lyrics into pages for pagination
     * @param {string} lyrics - Full lyrics text
     * @param {number} linesPerPage - Lines per page (default: 15)
     * @returns {string[]} - Array of page contents
     */
    paginateLyrics(lyrics, linesPerPage = 15) {
        const lines = lyrics.split('\n');
        const pages = [];

        for (let i = 0; i < lines.length; i += linesPerPage) {
            pages.push(lines.slice(i, i + linesPerPage).join('\n'));
        }

        return pages;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        let cleared = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now >= value.expiresAt) {
                this.cache.delete(key);
                cleared++;
            }
        }

        if (cleared > 0) {
            Logger.info(`LyricsService: Cleared ${cleared} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     * @returns {{ size: number, memoryEstimate: string }}
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            memoryEstimate: `~${Math.round(this.cache.size * 2)}KB`
        };
    }
}

export default new LyricsService();
