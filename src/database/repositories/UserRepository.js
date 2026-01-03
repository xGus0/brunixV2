// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      User Repository                                ║
// ╚═══════════════════════════════════════════════════════════════════╝

import Logger from '../../utils/logger.js';

export default class UserRepository {
    constructor(supabase) {
        this.db = supabase;
    }

    /**
     * Get or create a user
     */
    async getOrCreate(discordUser) {
        try {
            // Try to find existing user
            const { data: existing } = await this.db
                .from('users')
                .select('*')
                .eq('user_id', discordUser.id)
                .single();

            if (existing) {
                // Update username/avatar if changed
                if (existing.username !== discordUser.username) {
                    await this.db
                        .from('users')
                        .update({
                            username: discordUser.username,
                            avatar_url: discordUser.displayAvatarURL?.({ size: 256 }) || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', discordUser.id);
                }
                return existing;
            }

            // Create new user
            const { data, error } = await this.db
                .from('users')
                .insert({
                    user_id: discordUser.id,
                    username: discordUser.username,
                    avatar_url: discordUser.displayAvatarURL?.({ size: 256 }) || null
                })
                .select()
                .single();

            if (error) throw error;

            Logger.db(`Created new user: ${discordUser.username}`);
            return data;

        } catch (error) {
            Logger.error('UserRepository.getOrCreate error:', error);
            return null;
        }
    }

    /**
     * Get user by Discord ID
     */
    async getById(userId) {
        try {
            const { data } = await this.db
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            return data;
        } catch {
            return null;
        }
    }

    /**
     * Update user stats
     */
    async incrementStats(userId, playCount = 1, timeListened = 0) {
        try {
            const user = await this.getById(userId);
            if (!user) return;

            await this.db
                .from('users')
                .update({
                    total_played: (user.total_played || 0) + playCount,
                    total_time_listened: (user.total_time_listened || 0) + timeListened,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

        } catch (error) {
            Logger.error('UserRepository.incrementStats error:', error);
        }
    }

    /**
     * Get user stats with ranking
     */
    async getStats(userId) {
        try {
            const { data } = await this.db
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (!data) return null;

            // Get rank
            const { count } = await this.db
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gt('total_played', data.total_played || 0);

            return {
                ...data,
                rank: (count || 0) + 1
            };
        } catch (error) {
            Logger.error('UserRepository.getStats error:', error);
            return null;
        }
    }
}
