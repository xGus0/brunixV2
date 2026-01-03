// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Spotify Service                                 ║
// ║        Handles Authentication and Recommendations API               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

class SpotifyService {
    constructor() {
        this.token = null;
        this.tokenExpiresAt = 0;
        this.clientId = null;
        this.clientSecret = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.clientId = config.SPOTIFY_CLIENT_ID;
            this.clientSecret = config.SPOTIFY_CLIENT_SECRET;
        } catch (error) {
            Logger.error('Failed to load Spotify credentials:', error);
        }
    }

    /**
     * Get a valid access token (Client Credentials Flow)
     */
    async getAccessToken() {
        if (this.token && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }

        if (!this.clientId || !this.clientSecret) {
            Logger.error('Spotify credentials missing');
            return null;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials'
                })
            });

            const data = await response.json();

            if (data.access_token) {
                this.token = data.access_token;
                // Expire slightly before actual time (usually 3600s)
                this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;
                // Logger.info('New Spotify access token generated');
                return this.token;
            } else {
                Logger.error('Failed to get Spotify token:', data);
                return null;
            }
        } catch (error) {
            Logger.error('Spotify auth error:', error);
            return null;
        }
    }

    /**
     * Search for a track to get its ID (Step 3)
     */
    async searchTrack(query) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            // Clean query handled by caller, but ensure it's uri encoded
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.tracks && data.tracks.items.length > 0) {
                return data.tracks.items[0]; // Object: { id, name, artists: [...] }
            }
            return null;
        } catch (error) {
            Logger.error('Spotify search error:', error);
            return null;
        }
    }

    /**
     * Search for an artist to get metadata (image)
     */
    async searchArtist(name) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.artists && data.artists.items.length > 0) {
                return data.artists.items[0]; // { id, name, images: [{url, ...}] }
            }
            return null;
        } catch (error) {
            Logger.error('Spotify artist search error:', error);
            return null;
        }
    }

    /**
     * Get recommendations based on seed track ID (Step 4)
     */
    async getRecommendations(seedTrackId) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackId}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Check if response is OK before parsing
            if (!response.ok) {
                // 404 is common for some tracks, not a critical error
                Logger.warn(`Spotify recommendations API: ${response.status} ${response.statusText}`);
                return null;
            }

            // Get text first to avoid JSON parse errors on empty responses
            const text = await response.text();
            if (!text || text.trim() === '') {
                Logger.error('Spotify recommendations: Empty response body');
                return null;
            }

            const data = JSON.parse(text);
            if (data.tracks && data.tracks.length > 0) {
                return data.tracks; // Return array of tracks for anti-repeat logic
            }
            return null;
        } catch (error) {
            Logger.error('Spotify recommendations error:', error);
            return null;
        }
    }

    /**
     * Extract track ID from Spotify URL
     */
    extractTrackId(url) {
        // More flexible regex: handles /intl-XX/, query params, etc
        // Examples: 
        //   open.spotify.com/track/ID
        //   open.spotify.com/intl-pt/track/ID?si=xxx
        const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i);
        if (match) {
            Logger.music(`Spotify: Extracted track ID -> ${match[1]}`);
        }
        return match ? match[1] : null;
    }

    /**
     * Extract playlist ID from Spotify URL
     */
    extractPlaylistId(url) {
        const match = url.match(/spotify\.com(?:\/intl-[a-z]{2})?\/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Extract album ID from Spotify URL
     */
    extractAlbumId(url) {
        const match = url.match(/spotify\.com(?:\/intl-[a-z]{2})?\/album\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get track details by ID (for resolving Spotify links)
     */
    async getTrackById(trackId) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data && data.name) {
                return {
                    name: data.name,
                    artist: data.artists[0]?.name || 'Unknown',
                    artists: data.artists.map(a => a.name),
                    album: data.album?.name,
                    duration: data.duration_ms,
                    thumbnail: data.album?.images[0]?.url
                };
            }
            return null;
        } catch (error) {
            Logger.error('Spotify getTrackById error:', error);
            return null;
        }
    }

    /**
     * Get playlist tracks
     */
    async getPlaylistTracks(playlistId, limit = 50) {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data && data.items) {
                return data.items
                    .filter(item => item.track)
                    .map(item => ({
                        name: item.track.name,
                        artist: item.track.artists[0]?.name || 'Unknown',
                        duration: item.track.duration_ms
                    }));
            }
            return null;
        } catch (error) {
            Logger.error('Spotify getPlaylistTracks error:', error);
            return null;
        }
    }

    /**
     * Enrich track with Spotify metadata (better title, artist, thumbnail, etc)
     * @param {string} title - Original track title
     * @param {string} artist - Original artist name
     * @returns {Promise<object|null>} - Enriched track data or null
     */
    async enrichTrackMetadata(title, artist) {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            // Clean the title for better search
            const cleanTitle = this.cleanSearchQuery(title);
            const cleanArtist = this.cleanSearchQuery(artist);

            // Build search query
            const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;

            // Fetch multiple results for intelligent matching
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!data.tracks || !data.tracks.items.length) return null;

            // Find best matching track instead of just taking first result
            const bestMatch = this.findBestMatchingTrack(data.tracks.items, cleanTitle, cleanArtist);

            if (!bestMatch) return null;

            return {
                name: bestMatch.name,
                artist: bestMatch.artists[0]?.name || artist,
                artists: bestMatch.artists.map(a => a.name),
                album: bestMatch.album?.name,
                albumArt: bestMatch.album?.images[0]?.url, // Highest quality
                albumArtMedium: bestMatch.album?.images[1]?.url || bestMatch.album?.images[0]?.url,
                duration: bestMatch.duration_ms,
                spotifyId: bestMatch.id,
                spotifyUrl: bestMatch.external_urls?.spotify,
                releaseDate: bestMatch.album?.release_date,
                popularity: bestMatch.popularity,
                explicit: bestMatch.explicit,
                previewUrl: bestMatch.preview_url
            };
        } catch (error) {
            Logger.error('Spotify enrichTrackMetadata error:', error);
            return null;
        }
    }

    /**
     * Find the best matching track from Spotify search results
     * Uses similarity scoring to ensure we get the right track
     * @param {Array} tracks - Array of Spotify track objects
     * @param {string} targetTitle - Original title to match
     * @param {string} targetArtist - Original artist to match
     * @returns {object|null} - Best matching track or null
     */
    findBestMatchingTrack(tracks, targetTitle, targetArtist) {
        if (!tracks?.length) return null;

        const normalize = (s) => (s || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const targetTitleNorm = normalize(targetTitle);
        const targetArtistNorm = normalize(targetArtist);

        let bestTrack = null;
        let bestScore = -1;

        for (const track of tracks) {
            const trackTitle = normalize(track.name);
            const trackArtist = normalize(track.artists[0]?.name || '');

            let score = 0;

            // Exact title match = high score
            if (trackTitle === targetTitleNorm) {
                score += 100;
            } else if (trackTitle.includes(targetTitleNorm) || targetTitleNorm.includes(trackTitle)) {
                // Partial title match
                score += 50;
            } else {
                // Word-based matching
                const targetWords = targetTitleNorm.split(' ').filter(w => w.length > 2);
                const matchedWords = targetWords.filter(w => trackTitle.includes(w));
                score += (matchedWords.length / Math.max(targetWords.length, 1)) * 40;
            }

            // Artist matching
            if (targetArtistNorm) {
                if (trackArtist === targetArtistNorm) {
                    score += 50;
                } else if (trackArtist.includes(targetArtistNorm) || targetArtistNorm.includes(trackArtist)) {
                    score += 30;
                } else {
                    const artistWords = targetArtistNorm.split(' ').filter(w => w.length > 2);
                    const matchedArtistWords = artistWords.filter(w => trackArtist.includes(w));
                    score += (matchedArtistWords.length / Math.max(artistWords.length, 1)) * 20;
                }
            }

            // Boost for higher popularity (tiebreaker)
            score += (track.popularity || 0) / 100 * 5;

            if (score > bestScore) {
                bestScore = score;
                bestTrack = track;
            }
        }

        // Only return if we have a reasonable match (at least 30 points)
        if (bestScore >= 30) {
            return bestTrack;
        }

        // Fallback to first result if no good match (better than nothing for thumbnails)
        return tracks[0];
    }

    /**
     * Get detailed track info by searching
     * @param {string} query - Search query (artist - title format preferred)
     */
    async getTrackMetadata(query) {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!data.tracks || !data.tracks.items.length) return null;

            // Return array of tracks with enriched data
            return data.tracks.items.map(track => ({
                name: track.name,
                artist: track.artists[0]?.name,
                artists: track.artists.map(a => a.name).join(', '),
                album: track.album?.name,
                thumbnail: track.album?.images[0]?.url,
                duration: track.duration_ms,
                spotifyId: track.id,
                spotifyUrl: track.external_urls?.spotify,
                popularity: track.popularity,
                explicit: track.explicit
            }));
        } catch (error) {
            Logger.error('Spotify getTrackMetadata error:', error);
            return null;
        }
    }

    /**
     * Clean search query removing YouTube garbage
     */
    cleanSearchQuery(text) {
        if (!text) return '';
        return text
            .replace(/\(.*?\)|\[.*?\]/g, '')
            .replace(/official\s*(video|audio|music\s*video|mv|lyric\s*video)?/gi, '')
            .replace(/lyrics?\s*(video)?/gi, '')
            .replace(/\b(hd|hq|4k|8k|remastered|remaster|live|acoustic|remix|visualizer)\b/gi, '')
            .replace(/\bft\.?\s*|\bfeat\.?\s*|\bfeaturing\s*/gi, '')
            .replace(/\s*-\s*Topic$/i, '')
            .replace(/VEVO$/i, '')
            .replace(/[|\\\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get artist info with image
     */
    async getArtistInfo(artistName) {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!data.artists || !data.artists.items.length) return null;

            const artist = data.artists.items[0];
            return {
                name: artist.name,
                id: artist.id,
                image: artist.images[0]?.url,
                imageMedium: artist.images[1]?.url || artist.images[0]?.url,
                followers: artist.followers?.total,
                genres: artist.genres,
                popularity: artist.popularity,
                spotifyUrl: artist.external_urls?.spotify
            };
        } catch (error) {
            Logger.error('Spotify getArtistInfo error:', error);
            return null;
        }
    }
}

export default new SpotifyService();
