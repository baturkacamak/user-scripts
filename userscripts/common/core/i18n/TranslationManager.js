/**
 * TranslationManager - Handles internationalization of UI text
 * Supports multiple languages, fallbacks, and loading/saving preferences
 */
class TranslationManager {
    static availableLanguages = {};
    static currentLanguage = 'en'; // Default language
    static translations = {};
    static storageKey = 'userscript-language';

    /**
     * Initialize the TranslationManager
     * @param {Object} config - Configuration object
     * @param {Object} config.languages - Available languages mapping (code -> name)
     * @param {Object} config.translations - Translations for each language
     * @param {string} config.defaultLanguage - Default language code
     * @param {string} config.storageKey - Local storage key for saving preferences
     */
    static init(config) {
        if (config.languages) {
            this.availableLanguages = config.languages;
        }

        if (config.translations) {
            this.translations = config.translations;
        }

        if (config.defaultLanguage) {
            this.currentLanguage = config.defaultLanguage;
        }

        if (config.storageKey) {
            this.storageKey = config.storageKey;
        }

        // Load saved preference
        this.loadLanguagePreference();
    }

    /**
     * Get translated text for a key
     * @param {string} key - The translation key
     * @param {Object} params - Parameters to replace in the text
     * @returns {string} - The translated text or the key if not found
     */
    static getText(key, params = {}) {
        const lang = this.currentLanguage;

        // Try current language
        let text = this.translations[lang]?.[key];

        // Fallback to English
        if (text === undefined && lang !== 'en') {
            text = this.translations['en']?.[key];
        }

        // If still not found, return the key itself
        if (text === undefined) {
            return key;
        }

        // Replace parameters if any
        if (params && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`{${paramKey}}`, 'g'), value);
            });
        }

        return text;
    }

    /**
     * Save language preference to localStorage
     * @returns {boolean} - Success state
     */
    static saveLanguagePreference() {
        try {
            localStorage.setItem(this.storageKey, this.currentLanguage);
            return true;
        } catch (error) {
            console.error("Error saving language preference:", error);
            return false;
        }
    }

    /**
     * Load language preference from localStorage
     * @returns {string} - The loaded language code
     */
    static loadLanguagePreference() {
        try {
            const savedLanguage = localStorage.getItem(this.storageKey);

            if (savedLanguage && this.availableLanguages[savedLanguage]) {
                this.currentLanguage = savedLanguage;
                return savedLanguage;
            }

            // Try to detect language from browser
            const browserLang = navigator.language.split('-')[0];
            if (this.availableLanguages[browserLang]) {
                this.currentLanguage = browserLang;
                return browserLang;
            }
        } catch (error) {
            console.error("Error loading language preference:", error);
        }

        return this.currentLanguage;
    }

    /**
     * Set the current language
     * @param {string} lang - Language code
     * @returns {boolean} - True if language was changed, false otherwise
     */
    static setLanguage(lang) {
        if (this.availableLanguages[lang]) {
            this.currentLanguage = lang;
            this.saveLanguagePreference();
            return true;
        }
        return false;
    }

    /**
     * Get all available languages
     * @returns {Object} - Language code -> name mapping
     */
    static getAvailableLanguages() {
        return {...this.availableLanguages};
    }
}

export default TranslationManager;