// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Artist Repository                                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default class ArtistRepository {
    constructor(supabase) {
        this.db = supabase;
    }

    /**
     * Get artist by name
     */
    async getByName(name) {
        try {
            const { data } = await this.db
                .from('artists')
                .select('*')
                .ilike('name', name) // Case insensitive
                .single();

            return data;
        } catch {
            return null;
        }
    }

    /**
     * Save or Update artist
     */
    async save(name, imageUrl, spotifyId = null) {
        try {
            // Check if exists first to handle upsert logic cleanly or just use upsert
            const { error } = await this.db
                .from('artists')
                .upsert({
                    name: name,
                    image_url: imageUrl,
                    spotify_id: spotifyId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'name' });

            if (error) throw error;
            return true;
        } catch (error) {
            Logger.error('ArtistRepository.save error:', error);
            return false;
        }
    }
}
