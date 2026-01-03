// ╔═══════════════════════════════════════════════════════════════════╗
// ║                    Global Constants                                 ║
// ║                   Brunix 2.0 - Premium                              ║
// ╚═══════════════════════════════════════════════════════════════════╝

// 🎨 Premium Color Palette - Silver/Platinum Theme
export const COLORS = {
    // Main Theme (Silver/Platinum)
    PRIMARY: '#C0C0C0',          // Silver
    SECONDARY: '#B8B8B8',        // Light Silver
    ACCENT: '#E8E8E8',           // Platinum

    // Embed Colors
    EMBED_DEFAULT: '#B0B0B0',    // Silver Gray
    EMBED_SUCCESS: '#98D8AA',    // Mint Green
    EMBED_ERROR: '#FF6B6B',      // Coral Red
    EMBED_WARNING: '#FFD93D',    // Golden Yellow
    EMBED_INFO: '#A8A8A8',       // Neutral Gray
    EMBED_MUSIC: '#C0C0C0',      // Silver
    EMBED_PREMIUM: '#D4AF37',    // Gold Accent

    // Dark Theme
    BACKGROUND: '#0D0D0D',
    SURFACE: '#1A1A1A',
    SURFACE_LIGHT: '#2D2D2D'
};

// 🎭 Modern Emojis
export const EMOJIS = {
    // Status
    SUCCESS: '✓',
    ERROR: '✗',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',

    // Music
    MUSIC: '🎵',
    PLAY: '▶️',
    PAUSE: '⏸️',
    STOP: '⏹️',
    SKIP: '⏭️',
    PREVIOUS: '⏮️',
    LOOP: '🔁',
    LOOP_TRACK: '🔂',
    SHUFFLE: '🔀',
    VOLUME_HIGH: '🔊',
    VOLUME_LOW: '🔉',
    VOLUME_MUTE: '🔇',
    QUEUE: '📋',
    LYRICS: '📝',

    // User
    PROFILE: '👤',
    FAVORITE: '❤️',
    PLAYLIST: '📁',
    CROWN: '👑',
    TIME: '⏱️',

    // Actions
    ADD: '➕',
    REMOVE: '➖',
    SEARCH: '🔍'
};

// 📏 Limits - Premium
export const LIMITS = {
    QUEUE_MAX: 500,
    PLAYLIST_MAX: 100,          // 100 músicas por playlist
    PLAYLISTS_MAX: 99,          // 99 playlists por usuário
    FAVORITES_MAX: 500,
    SEARCH_RESULTS: 5,          // 5 resultados de busca
    VOLUME_MIN: 0,
    VOLUME_MAX: 150,
    INACTIVITY_TIMEOUT: 5 * 60 * 1000
};

// 📐 Canvas Dimensions - LARGER
export const CANVAS = {
    NOWPLAYING: {
        WIDTH: 600,              // Mais largo
        HEIGHT: 700              // Mais alto para acomodar
    },
    PROFILE: {
        WIDTH: 800,
        HEIGHT: 400
    },
    QUEUE: {
        WIDTH: 800,
        HEIGHT: 500
    }
};

// 🎨 Canvas Theme
export const CANVAS_THEME = {
    BG_PRIMARY: '#0D0D0D',
    BG_SECONDARY: '#1A1A1A',
    BG_TERTIARY: '#2D2D2D',
    ACCENT: '#C0C0C0',
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_SECONDARY: '#B0B0B0',
    TEXT_MUTED: '#707070',
    PROGRESS_BG: '#404040',
    PROGRESS_FILL: '#C0C0C0',
    BORDER: '#3D3D3D',
    GLOW: 'rgba(192, 192, 192, 0.3)'
};
