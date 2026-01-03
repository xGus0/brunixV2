// ╔═══════════════════════════════════════════════════════════════════╗
// ║                     Last.fm Service                                 ║
// ║            Similar Tracks API - Fallback for Spotify                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.json');

class LastFmService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://ws.audioscrobbler.com/2.0/';
        this.loadConfig();
    }

    loadConfig() {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.apiKey = config.LASTFM_API_KEY;
        } catch (error) {
            Logger.error('Failed to load Last.fm API key:', error);
        }
    }

    /**
     * Get similar tracks based on artist and track name
     * @param {string} artist - Artist name
     * @param {string} track - Track name
     * @returns {object|null} Similar track { name, artist } or null
     */
    async getSimilarTrack(artist, track) {
        const tracks = await this.getSimilarTracks(artist, track, 5);
        if (tracks && tracks.length > 0) {
            const randomIndex = Math.floor(Math.random() * tracks.length);
            return tracks[randomIndex];
        }
        return null;
    }

    /**
     * Get multiple similar tracks based on artist and track name
     * @param {string} artist - Artist name
     * @param {string} track - Track name
     * @param {number} limit - Max number of tracks to return
     * @returns {Array<{name: string, artist: string}>} Array of similar tracks
     */
    async getSimilarTracks(artist, track, limit = 10) {
        if (!this.apiKey) {
            Logger.error('Last.fm API key not configured');
            return [];
        }

        if (!artist || !track) {
            Logger.warn('Last.fm: Missing artist or track name');
            return [];
        }

        try {
            const url = `${this.baseUrl}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${this.apiKey}&format=json&limit=${limit}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.similartracks?.track?.length > 0) {
                const tracks = data.similartracks.track.map(t => ({
                    name: t.name,
                    artist: t.artist.name
                }));

                Logger.music(`Last.fm: Found ${tracks.length} similar tracks for "${artist} - ${track}"`);
                return tracks;
            }

            // Fallback: try to get top tracks by the same artist
            return await this.getArtistTopTracks(artist, limit);

        } catch (error) {
            Logger.error('Last.fm getSimilarTracks error:', error.message);
            return [];
        }
    }

    /**
     * Get top tracks by artist (fallback)
     * @param {string} artist - Artist name
     * @param {number} limit - Max number of tracks
     * @returns {Array<{name: string, artist: string}>} Array of top tracks
     */
    async getArtistTopTracks(artist, limit = 10) {
        if (!this.apiKey || !artist) return [];

        try {
            const url = `${this.baseUrl}?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${this.apiKey}&format=json&limit=${limit}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.toptracks?.track?.length > 0) {
                const tracks = data.toptracks.track.map(t => ({
                    name: t.name,
                    artist: t.artist.name
                }));

                Logger.music(`Last.fm: Found ${tracks.length} top tracks for artist "${artist}"`);
                return tracks;
            }

            return [];
        } catch (error) {
            Logger.error('Last.fm getArtistTopTracks error:', error.message);
            return [];
        }
    }
}

export default new LastFmService();
