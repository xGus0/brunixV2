// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    History Repository                               ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default class HistoryRepository {
    constructor(supabase) {
        this.db = supabase;
    }

    /**
     * Add a track to history
     */
    async add(userId, track) {
        try {
            const { error } = await this.db
                .from('listening_history')
                .insert({
                    user_id: userId,
                    title: track.title,
                    author: track.author,
                    uri: track.uri,
                    thumbnail: track.thumbnail
                });

            if (error) throw error;
            return true;
        } catch (error) {
            Logger.error('HistoryRepository.add error:', error);
            return false;
        }
    }

    /**
     * Get recent tracks for user
     */
    async getRecents(userId, limit = 4) {
        try {
            const { data, error } = await this.db
                .from('listening_history')
                .select('*')
                .eq('user_id', userId)
                .order('played_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            Logger.error('HistoryRepository.getRecents error:', error);
            return [];
        }
    }

    /**
     * Get top artist for user
     */
    async getTopArtist(userId) {
        try {
            // Supabase doesn't support complex aggregation easily via JS client in one go without RPC
            // But for small scale, we can fetch last N tracks and calculate, OR create a view/RPC.
            // Let's assume we fetch a reasonable amount of history or use a rpc if possible.
            // For now, let's fetch last 100 tracks and calculate top.

            const { data, error } = await this.db
                .from('listening_history')
                .select('author')
                .eq('user_id', userId)
                .limit(200);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const counts = {};
            data.forEach(t => {
                counts[t.author] = (counts[t.author] || 0) + 1;
            });

            // Find key with max value
            const topArtist = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

            return {
                name: topArtist,
                count: counts[topArtist]
            };

        } catch (error) {
            Logger.error('HistoryRepository.getTopArtist error:', error);
            return null;
        }
    }
}
