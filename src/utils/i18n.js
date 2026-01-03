// ╔═══════════════════════════════════════════════════════════════════╗
// ║                      i18n System                                    ║
// ║        Internationalization with Dynamic Language Loading           ║
// ╚═══════════════════════════════════════════════════════════════════╝

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_PATH = path.resolve(__dirname, '../locales');

class I18n {
    constructor() {
        this.languages = new Map();
        this.defaultLang = 'pt-BR';
        this.availableLanguages = [];
        this.loadLanguages();
    }

    /**
     * Load all language files from locales folder
     */
    loadLanguages() {
        try {
            const files = fs.readdirSync(LOCALES_PATH).filter(f => f.endsWith('.json'));

            for (const file of files) {
                const langCode = file.replace('.json', '');
                const filePath = path.join(LOCALES_PATH, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                this.languages.set(langCode, data);
                this.availableLanguages.push({
                    code: langCode,
                    name: this.getLanguageName(langCode),
                    emoji: this.getLanguageEmoji(langCode)
                });
            }

            console.log(`[i18n] Loaded ${this.languages.size} languages: ${this.availableLanguages.map(l => l.code).join(', ')}`);
        } catch (error) {
            console.error('[i18n] Error loading languages:', error);
        }
    }

    /**
     * Get language display name
     */
    getLanguageName(code) {
        const names = {
            'pt-BR': 'Português (Brasil)',
            'en-US': 'English (US)',
            'es-ES': 'Español',
            'fr-FR': 'Français',
            'de-DE': 'Deutsch',
            'ja-JP': '日本語',
            'ko-KR': '한국어'
        };
        return names[code] || code;
    }

    /**
     * Get language emoji flag
     */
    getLanguageEmoji(code) {
        const emojis = {
            'pt-BR': '🇧🇷',
            'en-US': '🇺🇸',
            'es-ES': '🇪🇸',
            'fr-FR': '🇫🇷',
            'de-DE': '🇩🇪',
            'ja-JP': '🇯🇵',
            'ko-KR': '🇰🇷'
        };
        return emojis[code] || '🌐';
    }

    /**
     * Get a translation string
     * @param {string} lang - Language code (e.g., 'pt-BR')
     * @param {string} key - Dot-notation key (e.g., 'commands.play.responses.added_to_queue')
     * @param {object} replacements - Object with {placeholder: value} pairs
     * @returns {string} Translated string or key if not found
     */
    t(lang, key, replacements = {}) {
        const langData = this.languages.get(lang) || this.languages.get(this.defaultLang);
        if (!langData) return key;

        // Navigate through nested keys
        const keys = key.split('.');
        let value = langData;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to default language
                const defaultData = this.languages.get(this.defaultLang);
                value = this.getNestedValue(defaultData, keys);
                break;
            }
        }

        if (typeof value !== 'string') return key;

        // Replace placeholders {name} with values
        return value.replace(/\{(\w+)\}/g, (match, placeholder) => {
            return replacements[placeholder] !== undefined ? replacements[placeholder] : match;
        });
    }

    /**
     * Helper to get nested value
     */
    getNestedValue(obj, keys) {
        let value = obj;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        return value;
    }

    /**
     * Get available languages for select menu
     */
    getLanguageOptions() {
        return this.availableLanguages.map(lang => ({
            label: lang.name,
            value: lang.code,
            emoji: lang.emoji
        }));
    }

    /**
     * Check if language exists
     */
    hasLanguage(code) {
        return this.languages.has(code);
    }
}

// Export singleton instance
export default new I18n();
