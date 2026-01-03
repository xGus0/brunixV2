// ╔═══════════════════════════════════════════════════════════════════╗
// ║                  Queue End Event (lavalink-client)                  ║
// ║    PRO Autoplay: Spotify Metadata → YouTube Music Audio             ║
// ╚═══════════════════════════════════════════════════════════════════╝

import { EmbedBuilder } from 'discord.js';
import Logger from '../../utils/logger.js';
import { COLORS, LIMITS } from '../../config/constants.js';
import { truncate } from '../../utils/formatters.js';
import SpotifyService from '../../services/SpotifyService.js';
import LastFmService from '../../services/LastFmService.js';

// ═══════════════════════════════════════════════════════════════════
// AUTOPLAY STRATEGY:
// Use YouTube Music for actual playback (reliable audio)
// Use Spotify/Last.fm for recommendations only
// ═══════════════════════════════════════════════════════════════════
const AUDIO_SOURCE = 'ytmsearch'; // YouTube Music for playable audio

export default {
    name: 'queueEnd',

    async execute(client, player) {
        // Stop canvas updates
        if (player.updateInterval) {
            clearInterval(player.updateInterval);
            player.updateInterval = null;
        }

        Logger.music(`Queue ended in guild ${player.guildId}`);

        const channel = client.channels.cache.get(player.textChannelId);
        if (!channel) return;

        // Check Radio Mode
        if (player.radioMode && player.radioGenreData) {
            await this.handleRadioMode(client, player, channel);
            return;
        }

        // Check Autoplay
        if (player.autoplay) {
            // ALWAYS use the last played track as reference (like Spotify/YouTube Music)
            const referenceTrack = this.getPreviousTrack(player);

            if (referenceTrack?.title) {
                await this.handleAutoplay(client, player, channel, referenceTrack);
                return;
            } else {
                Logger.music('Autoplay: No valid reference track found');
            }
        }

        // Auto-disconnect Logic
        if (player.nowPlayingMessage) {
            try { await player.nowPlayingMessage.delete(); } catch { }
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.EMBED_INFO)
            .setAuthor({ name: '📋 Fila Finalizada' })
            .setDescription('Todas as músicas foram reproduzidas!\n\nUse `!play` para adicionar mais músicas.')
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        // Auto-disconnect after timeout
        setTimeout(() => {
            const currentPlayer = client.lavalink.players.get(player.guildId);
            if (currentPlayer && !currentPlayer.playing && currentPlayer.queue.tracks.length === 0) {
                currentPlayer.destroy();
                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.EMBED_WARNING)
                            .setAuthor({ name: '👋 Desconectado' })
                            .setDescription('Bot desconectado por inatividade.\n\nUse `!play` para me chamar de volta!')
                            .setTimestamp()
                    ]
                }).catch(() => { });
            }
        }, LIMITS.INACTIVITY_TIMEOUT);
    },

    /**
     * Get previous track from player
     */
    getPreviousTrack(player) {
        const sources = [
            player.queue.previous?.[0],
            player.data?.previousTrack,
            player.previousTrack,
            player.lastTrack
        ];

        for (const track of sources) {
            if (track) {
                const title = track.title || track.info?.title;
                if (title) {
                    return {
                        title: title,
                        author: track.author || track.info?.author || '',
                        uri: track.uri || track.info?.uri || '',
                        searchSource: track.searchSource || player.originalSearchSource || null,
                        requester: track.requester || player.originalRequester || null
                    };
                }
            }
        }

        return null;
    },

    /**
     * PRO Autoplay Logic - Last.fm Primary + Spotify Fallback + Smart Anti-Repeat
     */
    async handleAutoplay(client, player, channel, referenceTrack) {
        try {
            Logger.music(`Autoplay: Processing reference "${referenceTrack.title}" by "${referenceTrack.author}"`);

            // Initialize robust autoplay history (stores normalized keys)
            if (!player.autoplayHistory) {
                player.autoplayHistory = new Set();
            }
            // Convert old array to Set if needed
            if (Array.isArray(player.autoplayHistory)) {
                player.autoplayHistory = new Set(player.autoplayHistory);
            }

            // Add reference track to history immediately
            const refKey = this.normalizeTrackKey(referenceTrack.title, referenceTrack.author);
            player.autoplayHistory.add(refKey);

            // Clean title and artist
            const { cleanTitle, cleanArtist } = this.parseTrackInfo(referenceTrack.title, referenceTrack.author);

            if (!cleanTitle) {
                Logger.music('Autoplay: Failed to extract clean title');
                return;
            }

            Logger.music(`Autoplay: Parsed -> Artist: "${cleanArtist}" | Title: "${cleanTitle}"`);

            // ═══════════════════════════════════════════════════════════════
            // SAME TRACK/ARTIST CHECK - Prevent repeating user's input
            // ═══════════════════════════════════════════════════════════════
            const isSameTrackOrArtist = (trackTitle, trackArtist, userInput) => {
                if (!userInput) return false;
                const inputNorm = (userInput || '').toLowerCase().trim();
                const titleNorm = (trackTitle || '').toLowerCase().trim();
                const artistNorm = (trackArtist || '').toLowerCase().trim();

                // Check if title matches user input
                if (titleNorm === inputNorm || titleNorm.includes(inputNorm) || inputNorm.includes(titleNorm)) {
                    return true;
                }
                // Check if artist matches user input
                if (artistNorm === inputNorm || artistNorm.includes(inputNorm) || inputNorm.includes(artistNorm)) {
                    return true;
                }
                return false;
            };

            // Get user's original search query (if available)
            const userOriginalInput = player.originalSearchQuery || referenceTrack.title;

            let recommendations = [];
            let source = '';

            // ═══════════════════════════════════════════════════════════════
            // ATTEMPT 1: LAST.FM (Primary - More stable API)
            // ═══════════════════════════════════════════════════════════════
            if (cleanArtist) {
                try {
                    const lastFmResults = await LastFmService.getSimilarTracks(cleanArtist, cleanTitle, 20); // Increased from 10 to 20

                    if (lastFmResults?.length > 0) {
                        // Filter out tracks already in history AND same as user input
                        for (const track of lastFmResults) {
                            const trackKey = this.normalizeTrackKey(track.name, track.artist);
                            if (!player.autoplayHistory.has(trackKey) &&
                                !isSameTrackOrArtist(track.name, track.artist, userOriginalInput)) {
                                recommendations.push({
                                    query: `${track.artist} ${track.name}`,
                                    title: track.name,
                                    artist: track.artist
                                });
                            }
                        }
                        if (recommendations.length > 0) {
                            source = 'Last.fm';
                            Logger.music(`Autoplay: Last.fm found ${recommendations.length} unique recommendations`);
                        }
                    }
                } catch (err) {
                    Logger.music(`Autoplay: Last.fm failed: ${err.message}`);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // ATTEMPT 2: SPOTIFY (Fallback)
            // ═══════════════════════════════════════════════════════════════
            if (recommendations.length === 0) {
                try {
                    const searchQuery = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
                    const spotifyTrack = await SpotifyService.searchTrack(searchQuery);

                    if (spotifyTrack?.id) {
                        Logger.music(`Autoplay: Spotify found ID -> ${spotifyTrack.id}`);

                        const spotifyRecs = await SpotifyService.getRecommendations(spotifyTrack.id);

                        if (spotifyRecs?.length > 0) {
                            for (const rec of spotifyRecs) {
                                const artist = rec.artists[0]?.name || '';
                                const trackKey = this.normalizeTrackKey(rec.name, artist);

                                if (!player.autoplayHistory.has(trackKey) &&
                                    !isSameTrackOrArtist(rec.name, artist, userOriginalInput)) {
                                    recommendations.push({
                                        query: `${artist} ${rec.name}`,
                                        title: rec.name,
                                        artist: artist
                                    });
                                }
                            }
                            if (recommendations.length > 0) {
                                source = 'Spotify';
                                Logger.music(`Autoplay: Spotify found ${recommendations.length} unique recommendations`);
                            }
                        }
                    }
                } catch (err) {
                    Logger.music(`Autoplay: Spotify failed: ${err.message}`);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // ATTEMPT 3: ARTIST RADIO (Final fallback - search by artist)
            // ═══════════════════════════════════════════════════════════════
            if (recommendations.length === 0) {
                const fallbackQuery = cleanArtist
                    ? `${cleanArtist} top songs`
                    : `${cleanTitle} similar`;
                recommendations.push({
                    query: fallbackQuery,
                    title: 'Artist Radio',
                    artist: cleanArtist || cleanTitle
                });
                source = 'Artist Radio';
                Logger.music(`Autoplay: Using fallback -> ${fallbackQuery}`);
            }

            // ═══════════════════════════════════════════════════════════════
            // EXECUTE: Search and add tracks (max 5 unique tracks per cycle)
            // ═══════════════════════════════════════════════════════════════
            const originalRequester = referenceTrack.requester || player.originalRequester || client.user;
            const addedTracks = [];
            const MAX_TRACKS = 5; // Increased from 3 to allow longer sessions

            // Shuffle recommendations to add variety (modern music app behavior)
            const shuffledRecs = recommendations.sort(() => Math.random() - 0.5);

            for (const rec of shuffledRecs.slice(0, 10)) { // Process up to 10 recommendations
                if (addedTracks.length >= MAX_TRACKS) break;

                try {
                    // Build search query based on recommendation type
                    let searchQuery;
                    if (rec.title === 'Artist Radio' || rec.title === 'Fallback') {
                        // For fallback, use the query directly
                        searchQuery = rec.query;
                    } else {
                        // For real recommendations, use exact format
                        searchQuery = `${rec.artist} - ${rec.title}`;
                    }

                    // Always use YouTube Music for playable audio
                    let res = await player.search({ query: searchQuery, source: AUDIO_SOURCE }, originalRequester);

                    // Try simpler format if no results
                    if (!res.tracks?.length && rec.title !== 'Artist Radio') {
                        res = await player.search({ query: `${rec.artist} ${rec.title}`, source: AUDIO_SOURCE }, originalRequester);
                    }

                    if (res.tracks?.length > 0) {
                        // Find the best matching track (not just the first one)
                        const matchedTrack = this.findBestMatch(res.tracks, rec.title, rec.artist, player.autoplayHistory);

                        if (matchedTrack) {
                            // Extra check: Skip if same as user's original input
                            if (isSameTrackOrArtist(matchedTrack.info.title, matchedTrack.info.author, userOriginalInput)) {
                                Logger.music(`Autoplay: Skipping "${matchedTrack.info.title}" - matches user input`);
                                continue;
                            }

                            const trackKey = this.normalizeTrackKey(matchedTrack.info.title, matchedTrack.info.author);

                            // Add to history BEFORE adding to queue
                            player.autoplayHistory.add(trackKey);

                            // Limit history size (increased to 100 for longer sessions)
                            if (player.autoplayHistory.size > 100) {
                                const firstKey = player.autoplayHistory.values().next().value;
                                player.autoplayHistory.delete(firstKey);
                            }

                            // Set display source based on recommendation source
                            // Note: Audio is always from YouTube Music, but we display recommendation source
                            matchedTrack.searchSource = source === 'Last.fm' ? 'Last.fm' :
                                source === 'Spotify' ? 'Spotify' : 'YouTube Music';
                            matchedTrack.isAutoplay = true;
                            matchedTrack.requester = originalRequester;

                            // Store recommendation metadata if available
                            if (rec.title !== 'Artist Radio' && rec.title !== 'Fallback') {
                                matchedTrack.recommendedAs = {
                                    title: rec.title,
                                    artist: rec.artist
                                };
                            }

                            player.queue.add(matchedTrack);
                            addedTracks.push(matchedTrack);

                            Logger.music(`Autoplay: Added "${matchedTrack.info.title}" by "${matchedTrack.info.author}" (via ${matchedTrack.searchSource})`);
                        }
                    }
                } catch (err) {
                    Logger.warn(`Autoplay: Failed to search "${rec.query}": ${err.message}`);
                }
            }

            if (addedTracks.length > 0) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.EMBED_DEFAULT)
                    .setTitle('📻 Autoplay')
                    .setDescription(
                        `Adicionadas **${addedTracks.length}** músicas:\n\n` +
                        addedTracks.map((t, i) => `\`${i + 1}.\` ${truncate(t.info.title, 45)}`).join('\n')
                    )
                    .setFooter({ text: `Referência: ${truncate(referenceTrack.title, 30)} • Via ${source}` });

                const msg = await channel.send({ embeds: [embed] });
                setTimeout(() => msg.delete().catch(() => { }), 15000);

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                Logger.music(`Autoplay: Added ${addedTracks.length} tracks to queue (history size: ${player.autoplayHistory.size})`);
            } else {
                Logger.music('Autoplay: No unique results found from any source');
                channel.send('📻 Autoplay: Não encontrei músicas novas. Tente com outra música!').then(m => setTimeout(() => m.delete().catch(() => { }), 5000));
            }

        } catch (error) {
            Logger.error('Autoplay error:', error);
        }
    },

    /**
     * Normalize track key for anti-repeat comparison
     */
    normalizeTrackKey(title, artist) {
        const cleanStr = (s) => (s || '')
            .toLowerCase()
            .replace(/\(.*?\)|\[.*?\]/g, '')
            .replace(/official|video|audio|lyrics|hd|hq|remaster(ed)?|live|acoustic|remix/gi, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 25);

        return `${cleanStr(artist)}:${cleanStr(title)}`;
    },

    /**
     * Find the best matching track from search results
     * @param {Array} tracks - Search results from Lavalink
     * @param {string} targetTitle - The title we're looking for
     * @param {string} targetArtist - The artist we're looking for
     * @param {Set} history - Autoplay history to avoid repeats
     * @returns {object|null} Best matching track or null
     */
    findBestMatch(tracks, targetTitle, targetArtist, history) {
        if (!tracks?.length) return null;

        const normalize = (s) => (s || '')
            .toLowerCase()
            .replace(/\(.*?\)|\[.*?\]/g, '')
            .replace(/official|video|audio|lyrics|hd|hq|remaster(ed)?|live|acoustic|remix|ft\.?|feat\.?/gi, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const targetTitleNorm = normalize(targetTitle);
        const targetArtistNorm = normalize(targetArtist);

        // Score each track based on similarity
        const scoredTracks = tracks.map(track => {
            const titleNorm = normalize(track.info.title);
            const artistNorm = normalize(track.info.author);

            let score = 0;

            // Check if already in history
            const trackKey = this.normalizeTrackKey(track.info.title, track.info.author);
            if (history?.has(trackKey)) {
                return { track, score: -1 }; // Exclude from results
            }

            // Title match scoring
            if (titleNorm.includes(targetTitleNorm) || targetTitleNorm.includes(titleNorm)) {
                score += 50;
            }
            // Partial word match
            const titleWords = targetTitleNorm.split(' ').filter(w => w.length > 2);
            const matchedTitleWords = titleWords.filter(w => titleNorm.includes(w));
            score += (matchedTitleWords.length / Math.max(titleWords.length, 1)) * 30;

            // Artist match scoring
            if (artistNorm.includes(targetArtistNorm) || targetArtistNorm.includes(artistNorm)) {
                score += 40;
            }
            // Partial artist word match
            const artistWords = targetArtistNorm.split(' ').filter(w => w.length > 2);
            const matchedArtistWords = artistWords.filter(w => artistNorm.includes(w));
            score += (matchedArtistWords.length / Math.max(artistWords.length, 1)) * 20;

            // Penalize very long titles (likely compilations/mixes)
            if (track.info.duration > 600000) { // > 10 min
                score -= 20;
            }

            return { track, score };
        });

        // Sort by score descending and get best match
        scoredTracks.sort((a, b) => b.score - a.score);

        // Return best match if score is reasonable (> 30 means at least partial match)
        const best = scoredTracks[0];
        if (best && best.score > 30) {
            Logger.music(`Autoplay: Best match "${best.track.info.title}" (score: ${best.score.toFixed(0)})`);
            return best.track;
        }

        // If no good match, return first track not in history
        for (const { track, score } of scoredTracks) {
            if (score >= 0) {
                Logger.music(`Autoplay: Fallback to "${track.info.title}" (score: ${score.toFixed(0)})`);
                return track;
            }
        }

        return null;
    },

    /**
     * Parse track info
     */
    parseTrackInfo(rawTitle, rawAuthor) {
        if (!rawTitle) return { cleanTitle: '', cleanArtist: '' };

        let cleanTitle = rawTitle;
        let cleanArtist = rawAuthor || '';

        const hyphenMatch = rawTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (hyphenMatch) {
            cleanArtist = hyphenMatch[1].trim();
            cleanTitle = hyphenMatch[2].trim();
        }

        cleanTitle = cleanTitle
            .replace(/\(.*?\)|\[.*?\]/g, '')
            .replace(/official\s*(video|audio|music\s*video|mv|lyric\s*video)?/gi, '')
            .replace(/lyrics?\s*(video)?/gi, '')
            .replace(/\b(hd|hq|4k|8k|remastered|remaster|live|acoustic|remix)\b/gi, '')
            .replace(/\bft\.?\s*|\bfeat\.?\s*|\bfeaturing\s*/gi, '')
            .replace(/[|\\\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        cleanArtist = cleanArtist
            .replace(/\s*[-–]\s*Topic$/i, '')
            .replace(/VEVO$/i, '')
            .replace(/Official$/i, '')
            .trim();

        return { cleanTitle, cleanArtist };
    },

    /**
     * Handle Radio Mode - 24/7 continuous playback
     */
    async handleRadioMode(client, player, channel) {
        try {
            const genre = player.radioGenreData;
            Logger.music(`Radio Mode: Loading more ${genre.name} tracks...`);

            const query = genre.queries[Math.floor(Math.random() * genre.queries.length)];

            const result = await player.search({ query, source: 'ytmsearch' }, player.originalRequester || client.user);

            if (!result.tracks?.length) {
                Logger.warn(`Radio Mode: No tracks found for query "${query}"`);
                return;
            }

            const shuffled = result.tracks.sort(() => Math.random() - 0.5);

            if (!player.autoplayHistory) player.autoplayHistory = [];

            const filtered = shuffled.filter(t => {
                const key = t.info.title.toLowerCase().substring(0, 30);
                return !player.autoplayHistory.includes(key);
            });

            const tracksToAdd = (filtered.length > 0 ? filtered : shuffled).slice(0, 5);

            for (const track of tracksToAdd) {
                track.searchSource = `Rádio ${genre.name}`;
                track.requester = player.originalRequester || client.user;
                player.queue.add(track);

                const trackKey = track.info.title.toLowerCase().substring(0, 30);
                if (!player.autoplayHistory.includes(trackKey)) {
                    player.autoplayHistory.push(trackKey);
                    if (player.autoplayHistory.length > 20) {
                        player.autoplayHistory.shift();
                    }
                }
            }

            if (!player.playing && !player.paused) {
                await player.play();
            }

            Logger.music(`Radio Mode: Added ${tracksToAdd.length} tracks from ${genre.name}`);

        } catch (error) {
            Logger.error('Radio Mode error:', error);
        }
    }
};
