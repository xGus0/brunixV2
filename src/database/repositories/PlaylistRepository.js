// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Playlist Repository                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';
import { LIMITS } from '../../config/constants.js';

export default class PlaylistRepository {
    constructor(supabase) {
        this.db = supabase;
    }

    /**
     * Create a new playlist
     */
    async create(userId, name, description = null) {
        try {
            // Check user playlist count
            const count = await this.countUserPlaylists(userId);
            if (count >= LIMITS.PLAYLISTS_MAX) {
                return { success: false, error: `Você atingiu o limite de ${LIMITS.PLAYLISTS_MAX} playlists!` };
            }

            // Check if name already exists for user
            const exists = await this.existsByName(userId, name);
            if (exists) {
                return { success: false, error: 'Você já tem uma playlist com este nome!' };
            }

            const { data, error } = await this.db
                .from('playlists')
                .insert({
                    user_id: userId,
                    name,
                    description
                })
                .select()
                .single();

            if (error) throw error;

            Logger.db(`Playlist created: ${name} by ${userId}`);
            return { success: true, data };

        } catch (error) {
            Logger.error('PlaylistRepository.create error:', error);
            return { success: false, error: 'Erro ao criar playlist.' };
        }
    }

    /**
     * Delete a playlist
     */
    async delete(playlistId, userId) {
        try {
            const { error } = await this.db
                .from('playlists')
                .delete()
                .eq('id', playlistId)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };

        } catch (error) {
            Logger.error('PlaylistRepository.delete error:', error);
            return { success: false, error: 'Erro ao deletar playlist.' };
        }
    }

    /**
     * Add track to playlist
     */
    async addTrack(playlistId, userId, track) {
        try {
            // Verify ownership
            const playlist = await this.getById(playlistId);
            if (!playlist || playlist.user_id !== userId) {
                return { success: false, error: 'Playlist não encontrada ou você não é o dono!' };
            }

            // Check track count
            const trackCount = await this.countTracks(playlistId);
            if (trackCount >= LIMITS.PLAYLIST_MAX) {
                return { success: false, error: `Limite de ${LIMITS.PLAYLIST_MAX} músicas por playlist atingido!` };
            }

            const { error } = await this.db
                .from('playlist_tracks')
                .insert({
                    playlist_id: playlistId,
                    title: track.title,
                    author: track.author,
                    uri: track.uri,
                    thumbnail: track.thumbnail,
                    duration: track.length || track.duration || 0,
                    position: trackCount + 1
                });

            if (error) throw error;

            // Update playlist timestamp
            await this.db
                .from('playlists')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', playlistId);

            return { success: true };

        } catch (error) {
            Logger.error('PlaylistRepository.addTrack error:', error);
            return { success: false, error: 'Erro ao adicionar música.' };
        }
    }

    /**
     * Remove track from playlist
     */
    async removeTrack(playlistId, userId, position) {
        try {
            // Verify ownership
            const playlist = await this.getById(playlistId);
            if (!playlist || playlist.user_id !== userId) {
                return { success: false, error: 'Playlist não encontrada ou você não é o dono!' };
            }

            const { error } = await this.db
                .from('playlist_tracks')
                .delete()
                .eq('playlist_id', playlistId)
                .eq('position', position);

            if (error) throw error;

            return { success: true };

        } catch (error) {
            Logger.error('PlaylistRepository.removeTrack error:', error);
            return { success: false, error: 'Erro ao remover música.' };
        }
    }

    /**
     * Get all playlists for user
     */
    async getUserPlaylists(userId) {
        try {
            const { data, error } = await this.db
                .from('playlists')
                .select(`
                    *,
                    track_count:playlist_tracks(count)
                `)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];

        } catch (error) {
            Logger.error('PlaylistRepository.getUserPlaylists error:', error);
            return [];
        }
    }

    /**
     * Get playlist by ID
     */
    async getById(playlistId) {
        try {
            const { data, error } = await this.db
                .from('playlists')
                .select('*')
                .eq('id', playlistId)
                .single();

            if (error) return null;
            return data;
        } catch {
            return null;
        }
    }

    /**
     * Get playlist tracks
     */
    async getTracks(playlistId) {
        try {
            const { data, error } = await this.db
                .from('playlist_tracks')
                .select('*')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true });

            if (error) throw error;

            // Map to expected format
            return (data || []).map(t => ({
                track_title: t.title,
                track_author: t.author,
                track_uri: t.uri,
                track_thumbnail: t.thumbnail,
                track_duration: t.duration,
                position: t.position
            }));

        } catch (error) {
            Logger.error('PlaylistRepository.getTracks error:', error);
            return [];
        }
    }

    /**
     * Check if playlist name exists for user
     */
    async existsByName(userId, name) {
        try {
            const { data } = await this.db
                .from('playlists')
                .select('id')
                .eq('user_id', userId)
                .ilike('name', name)
                .single();

            return !!data;
        } catch {
            return false;
        }
    }

    /**
     * Count user playlists
     */
    async countUserPlaylists(userId) {
        try {
            const { count } = await this.db
                .from('playlists')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            return count || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Count tracks in playlist
     */
    async countTracks(playlistId) {
        try {
            const { count } = await this.db
                .from('playlist_tracks')
                .select('*', { count: 'exact', head: true })
                .eq('playlist_id', playlistId);

            return count || 0;
        } catch {
            return 0;
        }
    }
}
