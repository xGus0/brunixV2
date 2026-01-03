// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Favorite Repository                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';
import { LIMITS } from '../../config/constants.js';

export default class FavoriteRepository {
    constructor(supabase) {
        this.db = supabase;
    }

    /**
     * Add a track to favorites
     */
    async add(userId, track) {
        try {
            // Check if already exists
            const exists = await this.exists(userId, track.uri);
            if (exists) {
                return { success: false, error: 'Esta música já está nos favoritos!' };
            }

            // Check limit
            const count = await this.count(userId);
            if (count >= LIMITS.FAVORITES_MAX) {
                return { success: false, error: `Limite de ${LIMITS.FAVORITES_MAX} favoritos atingido!` };
            }

            const { data, error } = await this.db
                .from('favorites')
                .insert({
                    user_id: userId,
                    title: track.title,
                    author: track.author || '',
                    uri: track.uri,
                    thumbnail: track.thumbnail,
                    duration: track.duration || track.length || 0
                })
                .select()
                .single();

            if (error) throw error;

            Logger.db(`Favorite added for user ${userId}`);
            return { success: true, data };

        } catch (error) {
            Logger.error('FavoriteRepository.add error:', error);
            return { success: false, error: 'Erro ao adicionar favorito.' };
        }
    }

    /**
     * Remove a track from favorites
     */
    async remove(userId, trackUri) {
        try {
            const { error } = await this.db
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('uri', trackUri);

            if (error) throw error;
            return { success: true };

        } catch (error) {
            Logger.error('FavoriteRepository.remove error:', error);
            return { success: false, error: 'Erro ao remover favorito.' };
        }
    }

    /**
     * Get all favorites for a user
     */
    async getAll(userId, limit = 100) {
        try {
            const { data, error } = await this.db
                .from('favorites')
                .select('*')
                .eq('user_id', userId)
                .order('added_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];

        } catch (error) {
            Logger.error('FavoriteRepository.getAll error:', error);
            return [];
        }
    }

    /**
     * Check if a track is favorited
     */
    async exists(userId, trackUri) {
        try {
            const { data } = await this.db
                .from('favorites')
                .select('id')
                .eq('user_id', userId)
                .eq('uri', trackUri)
                .single();

            return !!data;
        } catch {
            return false;
        }
    }

    /**
     * Count favorites for user
     */
    async count(userId) {
        try {
            const { count } = await this.db
                .from('favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            return count || 0;
        } catch {
            return 0;
        }
    }
}
