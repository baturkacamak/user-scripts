// ==UserScript==
// @name        wallapop-enhanced-tools
// @description Comprehensive Wallapop enhancement suite: expand formatted descriptions, copy/export listings, filter unwanted items, and multi-language support
// @namespace   https://github.com/baturkacamak/userscripts
// @version     1.5.0
// @author      Batur Kacamak
// @homepage    https://github.com/baturkacamak/user-scripts/tree/master/wallapop-enhanced-tools#readme
// @homepageURL https://github.com/baturkacamak/user-scripts/tree/master/wallapop-enhanced-tools#readme
// @downloadURL https://github.com/baturkacamak/user-scripts/raw/master/wallapop-enhanced-tools/wallapop-enhanced-tools.user.js
// @updateURL   https://github.com/baturkacamak/user-scripts/raw/master/wallapop-enhanced-tools/wallapop-enhanced-tools.user.js
// @match       https://*.wallapop.com/*
// @icon        https://es.wallapop.com/favicon.ico
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @grant       GM_download
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Logger - A utility for consistent logging
     * Provides debug, log, error, and toggling capabilities
     */
    class Logger {
        static DEBUG = true;
        static PREFIX = "Userscript";

        /**
         * Sets the prefix used in log messages
         * @param {string} prefix - The prefix to use
         */
        static setPrefix(prefix) {
            this.PREFIX = prefix;
        }

        /**
         * Log a debug message (only when debug mode is enabled)
         * @param {...any} args - Arguments to log
         */
        static log(...args) {
            if (this.DEBUG) {
                console.log(`${this.PREFIX} Debug:`, ...args);
            }
        }

        /**
         * Log an error message with context
         * @param {Error} error - The error object
         * @param {string} context - Context description where the error occurred
         */
        static error(error, context) {
            console.error(`${this.PREFIX} Error (${context}):`, error);
        }

        /**
         * Log HTML content with a title
         * @param {string} title - Title describing the content
         * @param {string} htmlContent - The HTML content to log
         */
        static logHtml(title, htmlContent) {
            if (this.DEBUG) {
                console.log(`${this.PREFIX} [${title}]:`);
                console.log(htmlContent.substring(0, 1500) + "...");

                // Show HTML in expandable format for easier inspection
                console.groupCollapsed(`HTML Details (${title})`);
                console.log("Complete HTML:", htmlContent);
                console.groupEnd();
            }
        }

        /**
         * Toggle debug mode on/off
         * @returns {boolean} The new debug state
         */
        static toggleDebug() {
            this.DEBUG = !this.DEBUG;
            console.log(`${this.PREFIX}: Debug mode ${this.DEBUG ? 'enabled' : 'disabled'}`);
            return this.DEBUG;
        }
    }

    /**
     * HTMLUtils - Utilities for HTML manipulation
     * Provides functions for escaping HTML, encoding/decoding entities, etc.
     */
    class HTMLUtils {
      /**
         * Escape special HTML characters to prevent XSS
         * @param {string} str - The string to escape
         * @return {string} - The escaped string
         */
      static escapeHTML(str) {
        const escapeMap = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '\'': '&#39;',
          '"': '&quot;',
        };
        return str.replace(/[&<>'"]/g, (tag) => escapeMap[tag] || tag);
      }

      /**
         * Escape XML special characters
         * @param {string} str - The string to escape
         * @return {string} - The escaped string
         */
      static escapeXML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
      }

      /**
         * Convert a plain text string to sanitized HTML
         * @param {string} text - The text to convert
         * @return {string} - HTML with line breaks and links
         */
      static textToHtml(text) {
        if (!text) return '';

        // First escape HTML
        let html = this.escapeHTML(text);

        // Convert line breaks to <br>
        html = html.replace(/\n/g, '<br>');

        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        html = html.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

        return html;
      }

      /**
         * Wait for an element to be present in the DOM
         * @param {string} selector - CSS selector to wait for
         * @param {number} timeout - Timeout in milliseconds
         * @param {Document|Element} root - Root element to search from
         * @return {Promise<Element>} - The found element
         */
      static waitForElement(selector, timeout = 10000, root = document) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();

          function checkElement() {
            const element = root.querySelector(selector);
            if (element) {
              resolve(element);
              return;
            }

            if (Date.now() - startTime > timeout) {
              reject(new Error(`Timeout waiting for element: ${selector}`));
              return;
            }

            requestAnimationFrame(checkElement);
          }

          checkElement();
        });
      }
    }

    /**
     * StyleManager - Utility for CSS style management
     * Handles adding and removing styles, theme variables, etc.
     */
    class StyleManager {
        static styleElements = new Map();

        /**
         * Add CSS styles to the document
         * @param {string} css - CSS string to add
         * @param {string} id - Optional ID for the style element
         * @returns {HTMLStyleElement} - The created style element
         */
        static addStyles(css, id = null) {
            const style = document.createElement('style');
            style.textContent = css;

            if (id) {
                style.id = id;
                // Remove any existing style with the same ID
                if (this.styleElements.has(id)) {
                    this.removeStyles(id);
                }
                this.styleElements.set(id, style);
            }

            document.head.appendChild(style);
            return style;
        }

        /**
         * Remove styles by ID
         * @param {string} id - ID of the style element to remove
         * @returns {boolean} - True if styles were removed, false otherwise
         */
        static removeStyles(id) {
            if (!this.styleElements.has(id)) return false;

            const styleElement = this.styleElements.get(id);
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }

            this.styleElements.delete(id);
            return true;
        }

        /**
         * Apply CSS variables for theming
         * @param {Object} variables - Object with variable names and values
         * @param {string} selector - CSS selector to apply variables to (default: :root)
         */
        static applyThemeVariables(variables, selector = ':root') {
            let css = `${selector} {\n`;

            Object.entries(variables).forEach(([name, value]) => {
                // Ensure variable names start with --
                const varName = name.startsWith('--') ? name : `--${name}`;
                css += `  ${varName}: ${value};\n`;
            });

            css += `}\n`;

            this.addStyles(css, 'theme-variables');
        }

        /**
         * Add styles to handle animations
         * @param {Object} animations - Key-value pairs of animation name and keyframes
         */
        static addAnimations(animations) {
            let css = '';

            Object.entries(animations).forEach(([name, keyframes]) => {
                css += `@keyframes ${name} {\n${keyframes}\n}\n\n`;
            });

            this.addStyles(css, 'animations');
        }
    }

    /**
     * GMFunctions - Provides fallback implementations for Greasemonkey/Tampermonkey functions
     * Ensures compatibility across different userscript managers and direct browser execution
     */
    class GMFunctions {
      /**
         * Initialize fallbacks for missing GM functions
         * @return {Object} Object containing references to all GM functions (either native or polyfilled)
         */
      static initialize() {
        // Create fallbacks for common GM functions
        this.setupAddStyle();
        this.setupXmlHttpRequest();
        this.setupSetClipboard();
        this.setupDownload();
        this.setupGetValue();
        this.setupSetValue();

        // Return references to all functions (either native or polyfilled)
        return {
          GM_addStyle: window.GM_addStyle,
          GM_xmlhttpRequest: window.GM_xmlhttpRequest,
          GM_setClipboard: window.GM_setClipboard,
          GM_download: window.GM_download,
          GM_getValue: window.GM_getValue,
          GM_setValue: window.GM_setValue,
        };
      }

      /**
         * Set up GM_addStyle fallback
         */
      static setupAddStyle() {
        if ('undefined' === typeof GM_addStyle) {
          window.GM_addStyle = function(css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            return style;
          };
        }
      }

      /**
         * Set up GM_xmlhttpRequest fallback
         */
      static setupXmlHttpRequest() {
        if ('undefined' === typeof GM_xmlhttpRequest) {
          window.GM_xmlhttpRequest = function(details) {
            const xhr = new XMLHttpRequest();
            xhr.open(details.method, details.url);

            if (details.headers) {
              Object.keys(details.headers).forEach((key) => {
                xhr.setRequestHeader(key, details.headers[key]);
              });
            }

            xhr.onload = function() {
              if (details.onload) {
                details.onload({
                  responseText: xhr.responseText,
                  response: xhr.response,
                  status: xhr.status,
                  statusText: xhr.statusText,
                  readyState: xhr.readyState,
                });
              }
            };

            xhr.onerror = function() {
              if (details.onerror) {
                details.onerror(xhr);
              }
            };

            xhr.send(details.data);
            return xhr;
          };
        }
      }

      /**
         * Set up GM_setClipboard fallback
         */
      static setupSetClipboard() {
        if ('undefined' === typeof GM_setClipboard) {
          window.GM_setClipboard = function(text) {
            // Create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = text;

            // Make the textarea not visible
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';

            document.body.appendChild(textarea);
            textarea.select();

            // Try to copy the text
            let success = false;
            try {
              success = document.execCommand('copy');
              console.log('Clipboard copy ' + (success ? 'successful' : 'unsuccessful'));
            } catch (err) {
              console.error('Error copying to clipboard:', err);
            }

            // Clean up
            document.body.removeChild(textarea);
            return success;
          };
        }
      }

      /**
         * Set up GM_download fallback
         */
      static setupDownload() {
        if ('undefined' === typeof GM_download) {
          window.GM_download = function(options) {
            try {
              const {url, name, onload, onerror} = options;

              // Create download link
              const downloadLink = document.createElement('a');
              downloadLink.href = url;
              downloadLink.download = name || 'download';
              downloadLink.style.display = 'none';

              // Add to document, click, and remove
              document.body.appendChild(downloadLink);
              downloadLink.click();

              // Clean up
              setTimeout(() => {
                document.body.removeChild(downloadLink);
                if (onload) onload();
              }, 100);

              return true;
            } catch (err) {
              console.error('Error downloading file:', err);
              if (options.onerror) options.onerror(err);
              return false;
            }
          };
        }
      }

      /**
         * Set up GM_getValue fallback using localStorage
         */
      static setupGetValue() {
        if ('undefined' === typeof GM_getValue) {
          window.GM_getValue = function(key, defaultValue) {
            try {
              const value = localStorage.getItem(`GM_${key}`);
              if (null === value) return defaultValue;

              // Try to parse JSON
              try {
                return JSON.parse(value);
              } catch (e) {
                return value;
              }
            } catch (e) {
              console.error('Error in GM_getValue:', e);
              return defaultValue;
            }
          };
        }
      }

      /**
         * Set up GM_setValue fallback using localStorage
         */
      static setupSetValue() {
        if ('undefined' === typeof GM_setValue) {
          window.GM_setValue = function(key, value) {
            try {
              // Convert non-string values to JSON
              const valueToStore = 'string' === typeof value ? value : JSON.stringify(value);
              localStorage.setItem(`GM_${key}`, valueToStore);
              return true;
            } catch (e) {
              console.error('Error in GM_setValue:', e);
              return false;
            }
          };
        }
      }
    }

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

    /**
     * SectionToggler - A reusable UI component for expandable/collapsible sections
     * Creates customizable, accessible toggleable sections with various options and callbacks
     */

    class SectionToggler {
      /**
         * Returns the unique base CSS class for the SectionToggler component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for section togglers.
         */
      static get BASE_SECTION_CLASS() {
        return 'userscripts-section';
      }
      /**
         * Returns the CSS variable prefix used for theming the SectionToggler component.
         * This prefix scopes all custom CSS variables (e.g., colors) related to the section toggler.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-section-';
      }
      /**
         * Initialize styles for all section togglers.
         * These styles reference the CSS variables with our defined prefix.
         */
      static initStyles() {
        if (SectionToggler.stylesInitialized) return;
        StyleManager.addStyles(`
      /* Scoped styles for Userscripts SectionToggler Component */
      .${SectionToggler.BASE_SECTION_CLASS} {
        width: 100%;
        margin-bottom: 0.5rem;
        border-radius: 0.375rem;
        border: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color, #e5e7eb);
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}bg, #ffffff);
        overflow: hidden;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}header-bg, #f9fafb);
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid transparent;
        transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__header:hover {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}header-hover-bg, #f3f4f6);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__title {
        font-weight: 500;
        font-size: 0.875rem;
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color, #374151);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__icon {
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease-in-out;
        color: var(${SectionToggler.CSS_VAR_PREFIX}icon-color, #9ca3af);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__icon svg {
        width: 100%;
        height: 100%;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__header:hover .${SectionToggler.BASE_SECTION_CLASS}__icon {
        color: var(${SectionToggler.CSS_VAR_PREFIX}icon-hover-color, #6b7280);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}__content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out, opacity 0.3s ease-in-out;
        opacity: 0;
        padding: 0 1rem;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}content-bg, #ffffff);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--expanded .${SectionToggler.BASE_SECTION_CLASS}__content {
        max-height: var(${SectionToggler.CSS_VAR_PREFIX}content-max-height, 500px);
        padding: 1rem;
        opacity: 1;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--expanded .${SectionToggler.BASE_SECTION_CLASS}__header {
        border-bottom: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color, #e5e7eb);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--expanded .${SectionToggler.BASE_SECTION_CLASS}__icon {
        transform: rotate(180deg);
      }
      
      /* Section sizes */
      .${SectionToggler.BASE_SECTION_CLASS}--small .${SectionToggler.BASE_SECTION_CLASS}__header {
        padding: 0.5rem 0.75rem;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--small .${SectionToggler.BASE_SECTION_CLASS}__title {
        font-size: 0.75rem;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--large .${SectionToggler.BASE_SECTION_CLASS}__header {
        padding: 1rem 1.25rem;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--large .${SectionToggler.BASE_SECTION_CLASS}__title {
        font-size: 1rem;
      }
      
      /* Themes */
      .${SectionToggler.BASE_SECTION_CLASS}--primary .${SectionToggler.BASE_SECTION_CLASS}__header {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}primary-header-bg, #eff6ff);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--primary .${SectionToggler.BASE_SECTION_CLASS}__title {
        color: var(${SectionToggler.CSS_VAR_PREFIX}primary-title-color, #2563eb);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--primary .${SectionToggler.BASE_SECTION_CLASS}__icon {
        color: var(${SectionToggler.CSS_VAR_PREFIX}primary-icon-color, #3b82f6);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--success .${SectionToggler.BASE_SECTION_CLASS}__header {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}success-header-bg, #ecfdf5);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--success .${SectionToggler.BASE_SECTION_CLASS}__title {
        color: var(${SectionToggler.CSS_VAR_PREFIX}success-title-color, #059669);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--success .${SectionToggler.BASE_SECTION_CLASS}__icon {
        color: var(${SectionToggler.CSS_VAR_PREFIX}success-icon-color, #10b981);
      }
      
      /* Badge for counters or status indicators */
      .${SectionToggler.BASE_SECTION_CLASS}__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}badge-bg, #e5e7eb);
        color: var(${SectionToggler.CSS_VAR_PREFIX}badge-color, #4b5563);
        font-size: 0.75rem;
        line-height: 1;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        margin-left: 0.5rem;
        font-weight: 500;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--disabled {
        opacity: 0.6;
        pointer-events: none;
      }
      
      /* For improved accessibility */
      @media (prefers-reduced-motion: reduce) {
        .${SectionToggler.BASE_SECTION_CLASS}__content,
        .${SectionToggler.BASE_SECTION_CLASS}__icon {
          transition: none;
        }
      }
    `, 'userscripts-section-toggler-styles');

        SectionToggler.stylesInitialized = true;
      }
      /**
         * Inject default color variables for the SectionToggler component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
      static useDefaultColors() {
        const styleId = 'userscripts-section-toggler-default-colors';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
        :root {
          /* Base colors */
          ${SectionToggler.CSS_VAR_PREFIX}bg: #ffffff;
          ${SectionToggler.CSS_VAR_PREFIX}border-color: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}header-bg: #f9fafb;
          ${SectionToggler.CSS_VAR_PREFIX}header-hover-bg: #f3f4f6;
          ${SectionToggler.CSS_VAR_PREFIX}title-color: #374151;
          ${SectionToggler.CSS_VAR_PREFIX}icon-color: #9ca3af;
          ${SectionToggler.CSS_VAR_PREFIX}icon-hover-color: #6b7280;
          ${SectionToggler.CSS_VAR_PREFIX}content-bg: #ffffff;
          ${SectionToggler.CSS_VAR_PREFIX}content-max-height: 500px;
          
          /* Primary theme */
          ${SectionToggler.CSS_VAR_PREFIX}primary-header-bg: #eff6ff;
          ${SectionToggler.CSS_VAR_PREFIX}primary-title-color: #2563eb;
          ${SectionToggler.CSS_VAR_PREFIX}primary-icon-color: #3b82f6;
          
          /* Success theme */
          ${SectionToggler.CSS_VAR_PREFIX}success-header-bg: #ecfdf5;
          ${SectionToggler.CSS_VAR_PREFIX}success-title-color: #059669;
          ${SectionToggler.CSS_VAR_PREFIX}success-icon-color: #10b981;
          
          /* Badge */
          ${SectionToggler.CSS_VAR_PREFIX}badge-bg: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}badge-color: #4b5563;
        }
      `;
          document.head.appendChild(style);
        }
      }
      /**
         * Create a new SectionToggler.
         * @param {Object} options - Configuration options.
         * @param {string} options.title - The section title.
         * @param {boolean} [options.isExpanded=false] - Whether the section should be expanded initially.
         * @param {HTMLElement} [options.container] - Container to append the section to.
         * @param {string} [options.className] - Additional custom CSS class.
         * @param {Function} [options.onToggle] - Callback when section is toggled.
         * @param {Function} [options.contentCreator] - Function to create content dynamically.
         * @param {HTMLElement} [options.content] - Existing content element to use.
         * @param {string} [options.theme='default'] - Theme name (default, primary, success).
         * @param {string} [options.size='medium'] - Size name (small, medium, large).
         * @param {boolean} [options.disabled=false] - Whether the section is disabled.
         * @param {string|number} [options.badge] - Optional badge text or count.
         * @param {string} [options.id] - Optional ID for the section element.
         * @param {string} [options.icon='▼'] - Icon to use for toggle indicator.
         */
      constructor(options) {
        this.title = options.title || '';
        this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : false;
        this.container = options.container;
        this.customClassName = options.className || '';
        this.onToggle = options.onToggle;
        this.contentCreator = options.contentCreator;
        this.existingContent = options.content;
        this.theme = options.theme || 'default';
        this.size = options.size || 'medium';
        this.disabled = options.disabled || false;
        this.badge = options.badge;
        this.id = options.id;
        this.icon = options.icon || '▼';

        // DOM element references
        this.sectionElement = null;
        this.headerElement = null;
        this.contentElement = null;
        this.titleElement = null;
        this.iconElement = null;
        this.badgeElement = null;

        // Initialize styles
        SectionToggler.initStyles();
        this.create();
      }


      /**
         * Create the section toggler element.
         * @return {HTMLElement} The created section element.
         */
      create() {
        // Create main section container
        this.sectionElement = document.createElement('div');
        this.sectionElement.className = `${SectionToggler.BASE_SECTION_CLASS}`;

        if ('medium' !== this.size) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${this.size}`);
        }

        if ('default' !== this.theme) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);
        }

        if (this.isExpanded) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);
        }

        if (this.disabled) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
        }

        if (this.customClassName) {
          this.sectionElement.classList.add(this.customClassName);
        }

        if (this.id) {
          this.sectionElement.id = this.id;
        }

        // Create header
        this.headerElement = document.createElement('div');
        this.headerElement.className = `${SectionToggler.BASE_SECTION_CLASS}__header`;
        this.headerElement.setAttribute('role', 'button');
        this.headerElement.setAttribute('tabindex', '0');
        this.headerElement.setAttribute('aria-expanded', this.isExpanded.toString());

        // Create title
        this.titleElement = document.createElement('div');
        this.titleElement.className = `${SectionToggler.BASE_SECTION_CLASS}__title`;
        this.titleElement.textContent = this.title;

        // Add badge if provided
        if (this.badge !== undefined) {
          this.badgeElement = document.createElement('span');
          this.badgeElement.className = `${SectionToggler.BASE_SECTION_CLASS}__badge`;
          this.badgeElement.textContent = this.badge;
          this.titleElement.appendChild(this.badgeElement);
        }

        this.headerElement.appendChild(this.titleElement);

        // Create icon
        this.iconElement = document.createElement('div');
        this.iconElement.className = `${SectionToggler.BASE_SECTION_CLASS}__icon`;

        // Support for text icons or SVG
        if (this.icon.startsWith('<svg') || this.icon.startsWith('<img')) {
          this.iconElement.innerHTML = this.icon;
        } else {
          this.iconElement.textContent = this.icon;
        }

        this.headerElement.appendChild(this.iconElement);

        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = `${SectionToggler.BASE_SECTION_CLASS}__content`;

        // Add content if provided or use content creator
        if (this.existingContent) {
          this.contentElement.appendChild(this.existingContent);
        } else if (this.contentCreator) {
          this.contentCreator(this.contentElement);
        }

        // Add event listeners
        this.headerElement.addEventListener('click', () => this.toggle());
        this.headerElement.addEventListener('keydown', (e) => {
          if ('Enter' === e.key || ' ' === e.key) {
            e.preventDefault();
            this.toggle();
          }
        });

        // Assemble the elements
        this.sectionElement.appendChild(this.headerElement);
        this.sectionElement.appendChild(this.contentElement);

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.sectionElement);
        }

        // Store instance reference on the DOM element
        this.sectionElement._togglerInstance = this;

        return this.sectionElement;
      }

      /**
         * Toggle the expanded state of the section.
         * @return {boolean} The new expanded state.
         */
      toggle() {
        if (this.disabled) return this.isExpanded;

        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);
        } else {
          this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);
        }

        this.headerElement.setAttribute('aria-expanded', this.isExpanded.toString());

        if (this.onToggle) {
          this.onToggle(this.isExpanded);
        }

        return this.isExpanded;
      }

      /**
         * Expand the section.
         */
      expand() {
        if (!this.isExpanded) {
          this.toggle();
        }
      }

      /**
         * Collapse the section.
         */
      collapse() {
        if (this.isExpanded) {
          this.toggle();
        }
      }

      /**
         * Set the section title.
         * @param {string} title - The new title.
         */
      setTitle(title) {
        this.title = title;
        if (this.titleElement) {
          // Preserve the badge if it exists
          const badge = this.titleElement.querySelector(`.${SectionToggler.BASE_SECTION_CLASS}__badge`);
          this.titleElement.textContent = title;
          if (badge) {
            this.titleElement.appendChild(badge);
          }
        }
      }

      /**
         * Set the badge text/count.
         * @param {string|number} badge - The badge text or count.
         */
      setBadge(badge) {
        this.badge = badge;

        if (!this.badgeElement && badge !== undefined) {
          // Create badge if it doesn't exist
          this.badgeElement = document.createElement('span');
          this.badgeElement.className = `${SectionToggler.BASE_SECTION_CLASS}__badge`;
          this.titleElement.appendChild(this.badgeElement);
        }

        if (this.badgeElement) {
          if (badge === undefined) {
            // Remove badge if set to undefined
            this.badgeElement.remove();
            this.badgeElement = null;
          } else {
            // Update badge text
            this.badgeElement.textContent = badge;
          }
        }
      }

      /**
         * Enable or disable the section toggler.
         * @param {boolean} disabled - Whether the toggler should be disabled.
         */
      setDisabled(disabled) {
        this.disabled = disabled;

        if (disabled) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
        } else {
          this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
        }

        this.headerElement.setAttribute('tabindex', disabled ? '-1' : '0');
      }

      /**
         * Set the theme of the section.
         * @param {string} theme - The theme name.
         */
      setTheme(theme) {
        // Remove current theme
        this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);

        // Set new theme
        this.theme = theme;

        // Add new theme class if not default
        if ('default' !== theme) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${theme}`);
        }
      }

      /**
         * Set the size of the section.
         * @param {string} size - The size name.
         */
      setSize(size) {
        // Remove current size
        this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--${this.size}`);

        // Set new size
        this.size = size;

        // Add new size class if not medium
        if ('medium' !== size) {
          this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${size}`);
        }
      }

      /**
         * Set a custom content max height.
         * @param {string} height - CSS height value (e.g., "300px", "50vh").
         */
      setContentMaxHeight(height) {
        if (this.contentElement) {
          this.contentElement.style.setProperty(`${SectionToggler.CSS_VAR_PREFIX}content-max-height`, height);
        }
      }

      /**
         * Get the current expanded state.
         * @return {boolean} Whether the section is expanded.
         */
      isExpanded() {
        return this.isExpanded;
      }

      /**
         * Apply a custom CSS class to the section.
         * @param {string} className - The custom class name.
         */
      setCustomClass(className) {
        if (this.customClassName) {
          this.sectionElement.classList.remove(this.customClassName);
        }
        this.customClassName = className;
        if (className) {
          this.sectionElement.classList.add(className);
        }
      }

      /**
         * Replace the section content.
         * @param {HTMLElement|string} content - New content element or HTML string.
         */
      setContent(content) {
        if (this.contentElement) {
          // Clear current content
          this.contentElement.innerHTML = '';

          // Add new content
          if ('string' === typeof content) {
            this.contentElement.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            this.contentElement.appendChild(content);
          }
        }
      }
    }

    // Static property to track if styles have been initialized
    SectionToggler.stylesInitialized = false;

    /**
     * SelectBox - A rich UI component for dropdown selects.
     * Creates customizable, accessible dropdown selects with categories and configurable options.
     */

    class SelectBox {
      /**
         * Returns the unique base CSS class for the SelectBox component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for select boxes.
         */
      static get BASE_SELECT_CLASS() {
        return 'userscripts-select';
      }
      /**
         * Returns the CSS variable prefix used for theming the SelectBox component.
         * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the select box.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-select-';
      }
      /**
         * Initialize styles for all select boxes.
         * These styles reference CSS variables using our defined prefix.
         */
      static initStyles() {
        if (SelectBox.stylesInitialized) return;

        StyleManager.addStyles(`
      /* Base container styles */
      .${SelectBox.BASE_SELECT_CLASS}-container {
        position: relative;
        width: 100%;
      }
      
      /* Select trigger button */
      .${SelectBox.BASE_SELECT_CLASS}-trigger {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0.5rem 0.75rem;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}bg, #ffffff);
        border: 1px solid var(${SelectBox.CSS_VAR_PREFIX}border, #d1d5db);
        border-radius: 0.375rem;
        font-family: inherit;
        font-size: 0.875rem;
        color: var(${SelectBox.CSS_VAR_PREFIX}color, #374151);
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger:hover {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-hover, #9ca3af);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger:focus {
        outline: none;
        border-color: var(${SelectBox.CSS_VAR_PREFIX}focus-border, #3b82f6);
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow, rgba(59, 130, 246, 0.25));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger-icon {
        margin-left: 0.5rem;
        transition: transform 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger-icon.open {
        transform: rotate(180deg);
      }
      
      /* Dropdown styles */
      .${SelectBox.BASE_SELECT_CLASS}-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 10;
        width: 100%;
        max-height: 0;
        overflow: hidden;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}dropdown-bg, #ffffff);
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
        opacity: 0;
        transform: translateY(-10px);
        margin-top: 0.25rem;
        border: 1px solid var(${SelectBox.CSS_VAR_PREFIX}border, #d1d5db);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-dropdown.open {
        max-height: 300px;
        opacity: 1;
        transform: translateY(0);
        overflow-y: auto;
      }
      
      /* Categories */
      .${SelectBox.BASE_SELECT_CLASS}-category {
        border-bottom: 1px solid var(${SelectBox.CSS_VAR_PREFIX}category-border, #e5e7eb);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-category:last-child {
        border-bottom: none;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-category-label {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(${SelectBox.CSS_VAR_PREFIX}category-color, #6b7280);
        text-transform: uppercase;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}category-bg, #f9fafb);
      }
      
      /* Items */
      .${SelectBox.BASE_SELECT_CLASS}-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        color: var(${SelectBox.CSS_VAR_PREFIX}item-color, #374151);
        cursor: pointer;
        transition: background-color 0.1s ease;
        position: relative;
        display: flex;
        align-items: center;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item:hover {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}item-hover-bg, #f3f4f6);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}selected-bg, #EFF6FF);
        color: var(${SelectBox.CSS_VAR_PREFIX}selected-color, #2563EB);
        font-weight: 500;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}selected-indicator, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Item options */
      .${SelectBox.BASE_SELECT_CLASS}-item-options {
        padding: 0.25rem 0.75rem 0.5rem 1.75rem;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}options-bg, #f9fafb);
        font-size: 0.8125rem;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item-options.open {
        max-height: 200px;
        opacity: 1;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-row {
        display: flex;
        align-items: center;
        margin: 0.25rem 0;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-checkbox {
        margin-right: 0.5rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-label {
        color: var(${SelectBox.CSS_VAR_PREFIX}option-label-color, #4b5563);
      }
      
      /* Icon for options toggle */
      .${SelectBox.BASE_SELECT_CLASS}-option-toggle {
        margin-left: auto;
        padding: 0.25rem;
        background: none;
        border: none;
        cursor: pointer;
        color: var(${SelectBox.CSS_VAR_PREFIX}toggle-color, #9ca3af);
        font-size: 0.75rem;
        border-radius: 0.25rem;
        transition: background-color 0.1s ease, color 0.1s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-toggle:hover {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}toggle-hover-bg, #e5e7eb);
        color: var(${SelectBox.CSS_VAR_PREFIX}toggle-hover-color, #4b5563);
      }
      
      /* Size variations */
      .${SelectBox.BASE_SELECT_CLASS}-container--small .${SelectBox.BASE_SELECT_CLASS}-trigger {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--large .${SelectBox.BASE_SELECT_CLASS}-trigger {
        padding: 0.75rem 1rem;
        font-size: 1rem;
      }
      
      /* Theme variations */
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}primary-border, #3b82f6);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}primary-selected-bg, #EFF6FF);
        color: var(${SelectBox.CSS_VAR_PREFIX}primary-selected-color, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}primary-indicator, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}success-border, #10b981);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}success-selected-bg, #ECFDF5);
        color: var(${SelectBox.CSS_VAR_PREFIX}success-selected-color, #059669);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}success-indicator, #10b981);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}danger-border, #ef4444);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}danger-selected-bg, #FEF2F2);
        color: var(${SelectBox.CSS_VAR_PREFIX}danger-selected-color, #DC2626);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}danger-indicator, #ef4444);
      }
      
      /* Placeholder for empty state */
      .${SelectBox.BASE_SELECT_CLASS}-placeholder {
        color: var(${SelectBox.CSS_VAR_PREFIX}placeholder-color, #9ca3af);
        font-style: italic;
      }
      
      /* Label */
      .${SelectBox.BASE_SELECT_CLASS}-label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${SelectBox.CSS_VAR_PREFIX}label-color, #374151);
      }
      
      /* Original select for accessibility and form submission */
      .${SelectBox.BASE_SELECT_CLASS}-native {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `, 'userscripts-enhanced-select-styles');

        SelectBox.stylesInitialized = true;
      }
      /**
         * Create a new select box.
         * @param {Object} options - Configuration options.
         * @param {Array} options.items - Array of items or item categories.
         * @param {string} options.name - Name attribute for the select element.
         * @param {string} options.id - ID attribute for the select element.
         * @param {Function} options.onChange - Callback when selection changes.
         * @param {string} options.placeholder - Placeholder text when no selection.
         * @param {HTMLElement} options.container - Optional container to append the select box.
         * @param {Object} options.attributes - Additional HTML attributes for the select element.
         * @param {string} options.theme - Theme name (default, primary, etc.).
         * @param {string} options.size - Size name (small, medium, large).
         * @param {boolean} options.useCategorizedUI - Whether to use the rich category UI (default: false).
         */
      constructor(options) {
        this.items = options.items || [];
        this.name = options.name || '';
        this.id = options.id || `select-${Math.random().toString(36).substring(2, 9)}`;
        this.onChange = options.onChange;
        this.placeholder = options.placeholder || 'Select an option';
        this.container = options.container;
        this.attributes = options.attributes || {};
        this.theme = options.theme || 'default';
        this.size = options.size || 'medium';
        this.useCategorizedUI = options.useCategorizedUI || false;

        // Detect if items are categorized or flat
        this.isCategorized = this.detectCategorizedItems();

        // DOM elements
        this.containerElement = null;
        this.selectElement = null; // Native select element (hidden)
        this.triggerElement = null; // Button to open dropdown
        this.dropdownElement = null; // Custom dropdown
        this.selectedValue = ''; // Current selected value
        this.selectedLabel = ''; // Current selected label

        // Ensure styles are initialized
        SelectBox.initStyles();

        // Create the select component
        this.create();
      }


      /**
         * Detect if items are categorized
         * @return {boolean} True if items are categorized
         */
      detectCategorizedItems() {
        // If useCategorizedUI is explicitly set, respect it
        if (this.useCategorizedUI !== undefined) return this.useCategorizedUI;

        // Otherwise, try to auto-detect based on items structure
        if (!this.items || 0 === this.items.length) return false;

        // Check if any item has a categories property
        return this.items.some((item) => item.category !== undefined || item.items !== undefined);
      }

      /**
         * Create the enhanced select box
         * @return {HTMLElement} The container element
         */
      create() {
        // Create main container
        this.containerElement = document.createElement('div');
        this.containerElement.className = `${SelectBox.BASE_SELECT_CLASS}-container ${SelectBox.BASE_SELECT_CLASS}-container--${this.theme} ${SelectBox.BASE_SELECT_CLASS}-container--${this.size}`;

        // Create native select element for form submission and accessibility
        this.createNativeSelect();

        // Create custom select UI
        if (this.isCategorized) {
          this.createCategorizedSelect();
        } else {
          this.createFlatSelect();
        }

        // Add event listeners
        this.addEventListeners();

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.containerElement);
        }

        return this.containerElement;
      }

      /**
         * Create the hidden native select element
         */
      createNativeSelect() {
        this.selectElement = document.createElement('select');
        this.selectElement.name = this.name;
        this.selectElement.id = this.id;
        this.selectElement.className = `${SelectBox.BASE_SELECT_CLASS}-native`;

        // Apply additional attributes
        Object.entries(this.attributes).forEach(([key, value]) => {
          this.selectElement.setAttribute(key, value);
        });

        // Add placeholder option if needed
        if (this.placeholder) {
          const placeholderOption = document.createElement('option');
          placeholderOption.value = '';
          placeholderOption.textContent = this.placeholder;
          placeholderOption.disabled = true;
          placeholderOption.selected = !this.hasSelectedItem();
          this.selectElement.appendChild(placeholderOption);
        }

        // Add options
        this.addOptionsToNativeSelect();

        // Add to container
        this.containerElement.appendChild(this.selectElement);
      }

      /**
         * Add options to the native select element
         */
      addOptionsToNativeSelect() {
        // Helper function to add a single option
        const addOption = (item) => {
          const option = document.createElement('option');
          option.value = item.value;
          option.textContent = item.label;

          if (item.selected) {
            option.selected = true;
            this.selectedValue = item.value;
            this.selectedLabel = item.label;
          }

          if (item.disabled) {
            option.disabled = true;
          }

          this.selectElement.appendChild(option);
        };

        // For categorized items
        if (this.isCategorized) {
          this.items.forEach((category) => {
            if (category.items && Array.isArray(category.items)) {
              // Add optgroup if this is a category with a label
              if (category.label) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category.label;

                category.items.forEach((item) => {
                  const option = document.createElement('option');
                  option.value = item.value;
                  option.textContent = item.label;

                  if (item.selected) {
                    option.selected = true;
                    this.selectedValue = item.value;
                    this.selectedLabel = item.label;
                  }

                  if (item.disabled) {
                    option.disabled = true;
                  }

                  optgroup.appendChild(option);
                });

                this.selectElement.appendChild(optgroup);
              } else {
                // No category label, just add the items
                category.items.forEach(addOption);
              }
            } else {
              // This is a flat item, not a category
              addOption(category);
            }
          });
        } else {
          // For flat items
          this.items.forEach(addOption);
        }
      }

      /**
         * Create a categorized select UI
         */
      createCategorizedSelect() {
        // Create trigger button
        this.triggerElement = document.createElement('button');
        this.triggerElement.type = 'button';
        this.triggerElement.className = `${SelectBox.BASE_SELECT_CLASS}-trigger`;

        // Set initial text
        const triggerText = document.createElement('span');
        triggerText.textContent = this.selectedLabel || this.placeholder;
        if (!this.selectedLabel) {
          triggerText.className = `${SelectBox.BASE_SELECT_CLASS}-placeholder`;
        }
        this.triggerElement.appendChild(triggerText);

        // Add dropdown icon
        const triggerIcon = document.createElement('span');
        triggerIcon.className = `${SelectBox.BASE_SELECT_CLASS}-trigger-icon`;
        triggerIcon.innerHTML = '▼';
        this.triggerElement.appendChild(triggerIcon);

        // Create dropdown
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.className = `${SelectBox.BASE_SELECT_CLASS}-dropdown`;

        // Add categories and items
        this.items.forEach((category) => {
          // Check if this is a category with items
          if (category.items && Array.isArray(category.items)) {
            const categoryElement = document.createElement('div');
            categoryElement.className = `${SelectBox.BASE_SELECT_CLASS}-category`;

            // Add category label if it exists
            if (category.label) {
              const categoryLabel = document.createElement('div');
              categoryLabel.className = `${SelectBox.BASE_SELECT_CLASS}-category-label`;
              categoryLabel.textContent = category.label;
              categoryElement.appendChild(categoryLabel);
            }

            // Add items list
            const itemsList = document.createElement('ul');
            itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

            // Add items
            category.items.forEach((item) => {
              const itemElement = this.createItemElement(item);
              itemsList.appendChild(itemElement);
            });

            categoryElement.appendChild(itemsList);
            this.dropdownElement.appendChild(categoryElement);
          } else {
            // This is a flat item, not a category
            const itemsList = document.createElement('ul');
            itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

            const itemElement = this.createItemElement(category);
            itemsList.appendChild(itemElement);

            this.dropdownElement.appendChild(itemsList);
          }
        });

        // Add elements to container
        this.containerElement.appendChild(this.triggerElement);
        this.containerElement.appendChild(this.dropdownElement);
      }

      /**
         * Create a flat select UI (simpler version)
         */
      createFlatSelect() {
        // Create trigger button
        this.triggerElement = document.createElement('button');
        this.triggerElement.type = 'button';
        this.triggerElement.className = `${SelectBox.BASE_SELECT_CLASS}-trigger`;

        // Set initial text
        const triggerText = document.createElement('span');
        triggerText.textContent = this.selectedLabel || this.placeholder;
        if (!this.selectedLabel) {
          triggerText.className = `${SelectBox.BASE_SELECT_CLASS}-placeholder`;
        }
        this.triggerElement.appendChild(triggerText);

        // Add dropdown icon
        const triggerIcon = document.createElement('span');
        triggerIcon.className = `${SelectBox.BASE_SELECT_CLASS}-trigger-icon`;
        triggerIcon.innerHTML = '▼';
        this.triggerElement.appendChild(triggerIcon);

        // Create dropdown
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.className = `${SelectBox.BASE_SELECT_CLASS}-dropdown`;

        // Add items list
        const itemsList = document.createElement('ul');
        itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

        // Add items
        this.items.forEach((item) => {
          const itemElement = this.createItemElement(item);
          itemsList.appendChild(itemElement);
        });

        this.dropdownElement.appendChild(itemsList);

        // Add elements to container
        this.containerElement.appendChild(this.triggerElement);
        this.containerElement.appendChild(this.dropdownElement);
      }

      /**
         * Create an item element
         * @param {Object} item - The item data
         * @return {HTMLElement} The item element
         */
      createItemElement(item) {
        const itemElement = document.createElement('li');
        itemElement.className = `${SelectBox.BASE_SELECT_CLASS}-item`;
        itemElement.dataset.value = item.value;
        itemElement.textContent = item.label;

        if (item.selected) {
          itemElement.classList.add('selected');
        }

        if (item.disabled) {
          itemElement.classList.add('disabled');
        }

        // Handle item selection
        itemElement.addEventListener('click', (e) => {
          if (item.disabled) return;

          this.selectItem(item.value, item.label);
          this.closeDropdown();

          // Trigger onChange callback
          if (this.onChange) {
            this.onChange(item.value, e);
          }
        });

        // Add options if available
        if (item.options && 0 < item.options.length) {
          // Add options toggle button
          const toggleButton = document.createElement('button');
          toggleButton.type = 'button';
          toggleButton.className = `${SelectBox.BASE_SELECT_CLASS}-option-toggle`;
          toggleButton.innerHTML = '⚙️';
          toggleButton.title = 'Options';

          itemElement.appendChild(toggleButton);

          // Create options container
          const optionsContainer = document.createElement('div');
          optionsContainer.className = `${SelectBox.BASE_SELECT_CLASS}-item-options`;

          // Add options
          item.options.forEach((option) => {
            const optionRow = document.createElement('div');
            optionRow.className = `${SelectBox.BASE_SELECT_CLASS}-option-row`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${this.id}-option-${item.value}-${option.id}`;
            checkbox.className = `${SelectBox.BASE_SELECT_CLASS}-option-checkbox`;
            checkbox.checked = option.defaultValue || false;

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.className = `${SelectBox.BASE_SELECT_CLASS}-option-label`;
            label.textContent = option.label;

            if (option.description) {
              label.title = option.description;
            }

            // Handle option change
            checkbox.addEventListener('change', (e) => {
              // Update option value
              if (item.optionValues) {
                item.optionValues[option.id] = e.target.checked;
              }

              // Stop propagation to prevent selecting the item
              e.stopPropagation();
            });

            optionRow.appendChild(checkbox);
            optionRow.appendChild(label);
            optionsContainer.appendChild(optionRow);
          });

          // Add click handler for toggle button
          toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent item selection
            optionsContainer.classList.toggle('open');
          });

          // Add options container after the item
          itemElement.insertAdjacentElement('afterend', optionsContainer);
        }

        return itemElement;
      }

      /**
         * Add event listeners
         */
      addEventListeners() {
        // Toggle dropdown on trigger click
        this.triggerElement.addEventListener('click', () => {
          this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!this.containerElement.contains(e.target)) {
            this.closeDropdown();
          }
        });

        // Close dropdown on Escape key
        document.addEventListener('keydown', (e) => {
          if ('Escape' === e.key) {
            this.closeDropdown();
          }
        });

        // Sync with native select
        this.selectElement.addEventListener('change', (e) => {
          this.selectItemFromNative();
        });
      }

      /**
         * Toggle dropdown visibility
         */
      toggleDropdown() {
        const isOpen = this.dropdownElement.classList.contains('open');

        if (isOpen) {
          this.closeDropdown();
        } else {
          this.openDropdown();
        }
      }

      /**
         * Open the dropdown
         */
      openDropdown() {
        this.dropdownElement.classList.add('open');
        this.triggerElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-trigger-icon`).classList.add('open');

        // Ensure the selected item is visible
        const selectedItem = this.dropdownElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-item.selected`);
        if (selectedItem) {
          selectedItem.scrollIntoView({block: 'nearest'});
        }
      }

      /**
         * Close the dropdown
         */
      closeDropdown() {
        this.dropdownElement.classList.remove('open');
        this.triggerElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-trigger-icon`).classList.remove('open');

        // Close any open options
        const openOptions = this.dropdownElement.querySelectorAll(`.${SelectBox.BASE_SELECT_CLASS}-item-options.open`);
        openOptions.forEach((option) => {
          option.classList.remove('open');
        });
      }

      /**
         * Select an item
         * @param {string} value - The value to select
         * @param {string} label - The label text
         */
      selectItem(value, label) {
        // Update native select
        this.selectElement.value = value;

        // Update selected value and label
        this.selectedValue = value;
        this.selectedLabel = label;

        // Update trigger text
        const triggerText = this.triggerElement.querySelector('span:first-child');
        triggerText.textContent = label;
        triggerText.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-placeholder`);

        // Update item classes
        const items = this.dropdownElement.querySelectorAll(`.${SelectBox.BASE_SELECT_CLASS}-item`);
        items.forEach((item) => {
          if (item.dataset.value === value) {
            item.classList.add('selected');
          } else {
            item.classList.remove('selected');
          }
        });
      }

      /**
         * Select item based on native select value
         */
      selectItemFromNative() {
        const value = this.selectElement.value;
        const selectedOption = this.selectElement.options[this.selectElement.selectedIndex];
        const label = selectedOption ? selectedOption.textContent : '';

        if (value && label) {
          this.selectItem(value, label);
        }
      }

      /**
         * Check if any item is selected
         * @return {boolean} True if at least one item is selected
         */
      hasSelectedItem() {
        if (this.isCategorized) {
          // For categorized items
          return this.items.some((category) => {
            if (category.items && Array.isArray(category.items)) {
              return category.items.some((item) => item.selected);
            }
            return category.selected;
          });
        }

        // For flat items
        return this.items.some((item) => item.selected);
      }

      /**
         * Get the currently selected value
         * @return {string} The value of the selected option
         */
      getValue() {
        return this.selectedValue;
      }

      /**
         * Set the selected value
         * @param {string} value - The value to select
         * @param {boolean} [triggerChange=false] - Whether to trigger the onChange event
         */
      setValue(value, triggerChange = false) {
        // Find the item with the given value
        let found = false;
        let label = '';

        const findInItems = (items) => {
          for (const item of items) {
            if (item.value === value) {
              found = true;
              label = item.label;
              return true;
            }
          }
          return false;
        };

        if (this.isCategorized) {
          // Search in categorized items
          for (const category of this.items) {
            if (category.items && Array.isArray(category.items)) {
              if (findInItems(category.items)) {
                break;
              }
            } else if (category.value === value) {
              found = true;
              label = category.label;
              break;
            }
          }
        } else {
          // Search in flat items
          findInItems(this.items);
        }

        if (found) {
          // Update the native select
          this.selectElement.value = value;

          // Update the custom UI
          this.selectItem(value, label);

          // Trigger change event if requested
          if (triggerChange && this.onChange) {
            const event = new Event('change');
            this.selectElement.dispatchEvent(event);
          }
        }
      }

      /**
         * Add a new option
         * @param {Object} item - An object with {value: string, label: string, selected: boolean}
         * @param {string} [categoryId] - Optional category ID to add the item to
         */
      addOption(item, categoryId) {
        if (this.isCategorized && categoryId) {
          // Add to specific category
          const categoryIndex = this.items.findIndex((category) =>
            category.id === categoryId || category.value === categoryId,
          );

          if (0 <= categoryIndex) {
            const category = this.items[categoryIndex];

            if (!category.items) {
              category.items = [];
            }

            category.items.push(item);
          } else {
            // Category not found, add as flat item
            this.items.push(item);
          }
        } else {
          // Add to flat items
          this.items.push(item);
        }

        // Update the native select
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;

        if (item.selected) {
          option.selected = true;
          this.selectedValue = item.value;
          this.selectedLabel = item.label;
        }

        if (item.disabled) {
          option.disabled = true;
        }

        this.selectElement.appendChild(option);

        // If using custom UI, we need to rebuild it
        this.rebuild();
      }

      /**
         * Remove an option by value
         * @param {string} value - The value of the option to remove
         */
      removeOption(value) {
        // Helper function to remove from an array of items
        const removeFromItems = (items) => {
          const index = items.findIndex((item) => item.value === value);
          if (0 <= index) {
            items.splice(index, 1);
            return true;
          }
          return false;
        };

        // Remove from the items array
        if (this.isCategorized) {

          for (const category of this.items) {
            if (category.items && Array.isArray(category.items)) {
              if (removeFromItems(category.items)) {
                break;
              }
            } else if (category.value === value) {
              const index = this.items.indexOf(category);
              this.items.splice(index, 1);
              break;
            }
          }
        } else {
          // Remove from flat items
          removeFromItems(this.items);
        }

        // Remove from the native select
        const option = this.selectElement.querySelector(`option[value="${value}"]`);
        if (option) {
          option.remove();
        }

        // If it was the selected option, update selected value
        if (this.selectedValue === value) {
          this.selectedValue = '';
          this.selectedLabel = '';

          // Update trigger text to placeholder
          const triggerText = this.triggerElement.querySelector('span:first-child');
          triggerText.textContent = this.placeholder;
          triggerText.classList.add(`${SelectBox.BASE_SELECT_CLASS}-placeholder`);
        }

        // If using custom UI, we need to rebuild it
        this.rebuild();
      }

      /**
         * Update the options in the select box
         * @param {Array} items - New array of items
         * @param {boolean} [reset=false] - Whether to completely reset the options
         */
      updateOptions(items, reset = false) {
        if (reset) {
          // Clear all options in native select
          while (0 < this.selectElement.options.length) {
            this.selectElement.options[0].remove();
          }

          // Reset items array
          this.items = [];

          // Reset selected value
          this.selectedValue = '';
          this.selectedLabel = '';
        }

        // Add new items
        this.items = items;

        // Re-detect if categorized
        this.isCategorized = this.detectCategorizedItems();

        // Add to native select
        this.addOptionsToNativeSelect();

        // Rebuild the UI
        this.rebuild();
      }

      /**
         * Rebuild the custom UI
         */
      rebuild() {
        // Remove existing trigger and dropdown
        if (this.triggerElement) {
          this.triggerElement.remove();
        }

        if (this.dropdownElement) {
          this.dropdownElement.remove();
        }

        // Recreate the UI
        if (this.isCategorized) {
          this.createCategorizedSelect();
        } else {
          this.createFlatSelect();
        }

        // Re-add event listeners
        this.addEventListeners();
      }

      /**
         * Disable the select box
         * @param {boolean} disabled - Whether the select should be disabled
         */
      setDisabled(disabled) {
        // Update native select
        this.selectElement.disabled = disabled;

        // Update custom UI
        if (disabled) {
          this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--disabled`);
          this.triggerElement.disabled = true;
        } else {
          this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--disabled`);
          this.triggerElement.disabled = false;
        }
      }

      /**
         * Set the theme of the select box
         * @param {string} theme - The new theme name
         */
      setTheme(theme) {
        this.theme = theme;

        // Update container class
        const themeClasses = ['default', 'primary', 'success', 'danger'];
        themeClasses.forEach((themeClass) => {
          this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--${themeClass}`);
        });

        this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--${theme}`);
      }

      /**
         * Set the size of the select box
         * @param {string} size - The new size (e.g., "small", "medium", "large")
         */
      setSize(size) {
        this.size = size;

        // Update container class
        const sizeClasses = ['small', 'medium', 'large'];
        sizeClasses.forEach((sizeClass) => {
          this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--${sizeClass}`);
        });

        this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--${size}`);
      }
    }

    /**
     * Button - A reusable UI component for buttons.
     * Creates customizable, accessible buttons with various states and callbacks.
     */

    /**
     * A reusable UI component for creating accessible, customizable buttons.
     */
    class Button {
      /**
         * Returns the unique base CSS class for the Button component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for buttons.
         */
      static get BASE_BUTTON_CLASS() {
        return 'userscripts-button';
      }
      /**
         * Returns the CSS variable prefix used for theming and styling the Button component.
         * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the button.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-button-';
      }
      /**
         * Initialize styles for all buttons.
         * These styles reference the CSS variables with our defined prefix.
         */
      static initStyles() {
        if (Button.stylesInitialized) return;
        StyleManager.addStyles(`
      /* Scoped styles for Userscripts Button Component */
      .${Button.BASE_BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        text-align: center;
        background-color: var(${Button.CSS_VAR_PREFIX}bg);
        color: var(${Button.CSS_VAR_PREFIX}color);
        border-color: var(${Button.CSS_VAR_PREFIX}border);
      }
      
      /* Button sizes */
      .${Button.BASE_BUTTON_CLASS}--small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      .${Button.BASE_BUTTON_CLASS}--medium {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
      }
      .${Button.BASE_BUTTON_CLASS}--large {
        font-size: 1rem;
        padding: 0.75rem 1.5rem;
        min-height: 2.75rem;
      }
      
      /* Button themes using CSS variables */
      .${Button.BASE_BUTTON_CLASS}--default {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-default);
        color: var(${Button.CSS_VAR_PREFIX}color-default);
        border-color: var(${Button.CSS_VAR_PREFIX}border-default);
      }
      .${Button.BASE_BUTTON_CLASS}--default:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-default-hover);
      }
      
      .${Button.BASE_BUTTON_CLASS}--primary {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-primary);
        color: var(${Button.CSS_VAR_PREFIX}color-primary);
        border-color: var(${Button.CSS_VAR_PREFIX}border-primary);
      }
      .${Button.BASE_BUTTON_CLASS}--primary:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-primary-hover);
        border-color: var(${Button.CSS_VAR_PREFIX}border-primary-hover);
      }
      
      .${Button.BASE_BUTTON_CLASS}--secondary {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-secondary);
        color: var(${Button.CSS_VAR_PREFIX}color-secondary);
        border-color: var(${Button.CSS_VAR_PREFIX}border-secondary);
      }
      .${Button.BASE_BUTTON_CLASS}--secondary:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-secondary-hover);
        border-color: var(${Button.CSS_VAR_PREFIX}border-secondary-hover);
      }
      
      .${Button.BASE_BUTTON_CLASS}--success {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-success);
        color: var(${Button.CSS_VAR_PREFIX}color-success);
        border-color: var(${Button.CSS_VAR_PREFIX}border-success);
      }
      .${Button.BASE_BUTTON_CLASS}--success:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-success-hover);
        border-color: var(${Button.CSS_VAR_PREFIX}border-success-hover);
      }
      
      .${Button.BASE_BUTTON_CLASS}--danger {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-danger);
        color: var(${Button.CSS_VAR_PREFIX}color-danger);
        border-color: var(${Button.CSS_VAR_PREFIX}border-danger);
      }
      .${Button.BASE_BUTTON_CLASS}--danger:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-danger-hover);
        border-color: var(${Button.CSS_VAR_PREFIX}border-danger-hover);
      }
      
      /* Generic state styles */
      .${Button.BASE_BUTTON_CLASS}:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      .${Button.BASE_BUTTON_CLASS}:focus {
        outline: none;
        box-shadow: 0 0 0 3px var(${Button.CSS_VAR_PREFIX}focus-shadow);
      }
      
      /* Generic pseudo-class rules */
      .${Button.BASE_BUTTON_CLASS}:hover:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-hover);
      }
      .${Button.BASE_BUTTON_CLASS}:active:not(:disabled) {
        background-color: var(${Button.CSS_VAR_PREFIX}bg-active);
      }
      
      /* Button content */
      .${Button.BASE_BUTTON_CLASS}__icon {
        display: inline-flex;
        margin-right: 0.5rem;
      }
      .${Button.BASE_BUTTON_CLASS}__text {
        display: inline-block;
      }
    `, 'userscripts-button-styles');

        Button.stylesInitialized = true;
      }
      /**
         * Inject default color variables for the button component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
      static useDefaultColors() {
        const styleId = 'userscripts-button-default-colors';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
        :root {
          ${Button.CSS_VAR_PREFIX}bg-default: #f3f4f6;
          ${Button.CSS_VAR_PREFIX}color-default: #374151;
          ${Button.CSS_VAR_PREFIX}border-default: #d1d5db;
          ${Button.CSS_VAR_PREFIX}bg-default-hover: #e5e7eb;
          
          ${Button.CSS_VAR_PREFIX}bg-primary: #3b82f6;
          ${Button.CSS_VAR_PREFIX}color-primary: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-primary: #3b82f6;
          ${Button.CSS_VAR_PREFIX}bg-primary-hover: #2563eb;
          ${Button.CSS_VAR_PREFIX}border-primary-hover: #2563eb;
          
          ${Button.CSS_VAR_PREFIX}bg-secondary: #6b7280;
          ${Button.CSS_VAR_PREFIX}color-secondary: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-secondary: #6b7280;
          ${Button.CSS_VAR_PREFIX}bg-secondary-hover: #4b5563;
          ${Button.CSS_VAR_PREFIX}border-secondary-hover: #4b5563;
          
          ${Button.CSS_VAR_PREFIX}bg-success: #10b981;
          ${Button.CSS_VAR_PREFIX}color-success: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-success: #10b981;
          ${Button.CSS_VAR_PREFIX}bg-success-hover: #059669;
          ${Button.CSS_VAR_PREFIX}border-success-hover: #059669;
          
          ${Button.CSS_VAR_PREFIX}bg-danger: #ef4444;
          ${Button.CSS_VAR_PREFIX}color-danger: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-danger: #ef4444;
          ${Button.CSS_VAR_PREFIX}bg-danger-hover: #dc2626;
          ${Button.CSS_VAR_PREFIX}border-danger-hover: #dc2626;
          
          ${Button.CSS_VAR_PREFIX}bg-hover: #e0e0e0;
          ${Button.CSS_VAR_PREFIX}bg-active: #d0d0d0;
          
          ${Button.CSS_VAR_PREFIX}focus-shadow: rgba(59, 130, 246, 0.3);
        }
      `;
          document.head.appendChild(style);
        }
      }
      /**
         * Create a new Button.
         * @param {Object} options - Configuration options.
         * @param {String} options.text - Button text.
         * @param {String} [options.type="button"] - Button type.
         * @param {String} [options.className] - Additional custom CSS class.
         * @param {Function} options.onClick - Click event handler.
         * @param {String} [options.id] - Button ID.
         * @param {HTMLElement} [options.container] - Container to append the button to.
         * @param {Object} [options.attributes={}] - Additional HTML attributes.
         * @param {String} [options.theme="default"] - Button theme.
         * @param {String} [options.size="medium"] - Button size.
         * @param {Boolean} [options.disabled=false] - Disabled state.
         * @param {String} [options.icon] - Optional icon HTML.
         * @param {String} [options.successText] - Success state text.
         * @param {Number} [options.successDuration=1500] - Success state duration (ms).
         */
      constructor(options) {
        this.text = options.text || '';
        this.type = options.type || 'button';
        this.customClassName = options.className || '';
        this.onClick = options.onClick;
        this.id = options.id;
        this.container = options.container;
        this.attributes = options.attributes || {};
        this.theme = options.theme;
        this.size = options.size || 'medium';
        this.disabled = options.disabled || false;
        this.icon = options.icon || null;
        this.successText = options.successText || null;
        this.successDuration = options.successDuration || 1500;
        this.originalText = this.text;

        // These properties will refer to the DOM elements.
        this.button = null;
        this.textElement = null;

        Button.initStyles();
        this.create();
      }


      /**
         * Create the button element and, if a container is provided, append it.
         * @return {HTMLButtonElement} The created button element.
         */
      create() {
        this.button = document.createElement('button');
        this.button.type = this.type;
        this.button.disabled = this.disabled;
        if (this.id) this.button.id = this.id;
        this.button._buttonInstance = this;
        this.updateButtonClasses();
        this.updateContent();
        if (this.onClick) this.button.addEventListener('click', (e) => this.handleClick(e));
        Object.entries(this.attributes).forEach(([key, value]) => {
          this.button.setAttribute(key, value);
        });
        if (this.container) this.container.appendChild(this.button);
        return this.button;
      }

      /**
         * Update the classes on the button element based on theme, size, and custom classes.
         */
      updateButtonClasses() {
        const classNames = [Button.BASE_BUTTON_CLASS];
        classNames.push(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
        classNames.push(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
        if (this.customClassName) classNames.push(this.customClassName);
        this.button.className = classNames.join(' ');
      }

      /**
         * Update the button content (icon and text).
         */
      updateContent() {
        this.button.innerHTML = '';
        if (this.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = `${Button.BASE_BUTTON_CLASS}__icon`;
          iconSpan.innerHTML = this.icon;
          this.button.appendChild(iconSpan);
        }
        this.textElement = document.createElement('span');
        this.textElement.className = `${Button.BASE_BUTTON_CLASS}__text`;
        this.textElement.textContent = this.text;
        this.button.appendChild(this.textElement);
      }

      /**
         * Handle click events on the button.
         * @param {Event} e - The click event.
         */
      handleClick(e) {
        if (this.disabled) return;
        const result = this.onClick(e);
        if (this.successText && false !== result) {
          this.showSuccessState();
        }
      }

      /**
         * Show a success state by temporarily changing the button's text and theme.
         */
      showSuccessState() {
        const originalText = this.text;
        const originalTheme = this.theme;
        this.setText(this.successText);
        this.setTheme('success');
        setTimeout(() => {
          this.setText(originalText);
          this.setTheme(originalTheme);
        }, this.successDuration);
      }

      /**
         * Set the button's text.
         * @param {String} text - The new text to display.
         */
      setText(text) {
        this.text = text;
        if (this.textElement) {
          this.textElement.textContent = text;
        } else {
          this.updateContent();
        }
      }

      /**
         * Reset the button's text to its original value.
         */
      resetText() {
        this.setText(this.originalText);
      }

      /**
         * Set an icon for the button.
         * @param {String} iconHtml - The HTML string for the icon.
         */
      setIcon(iconHtml) {
        this.icon = iconHtml;
        this.updateContent();
      }

      /**
         * Enable or disable the button.
         * @param {Boolean} disabled - Whether the button should be disabled.
         */
      setDisabled(disabled) {
        this.disabled = disabled;
        this.button.disabled = disabled;
      }

      /**
         * Toggle the disabled state of the button.
         * @return {Boolean} The new disabled state.
         */
      toggleDisabled() {
        this.setDisabled(!this.disabled);
        return this.disabled;
      }

      /**
         * Change the button's theme.
         * @param {String} theme - The new theme (e.g., "default", "primary", etc.).
         */
      setTheme(theme) {
        this.button.classList.remove(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
        this.theme = theme;
        this.button.classList.add(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
      }

      /**
         * Change the button's size.
         * @param {String} size - The new size (e.g., "small", "medium", "large").
         */
      setSize(size) {
        this.button.classList.remove(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
        this.size = size;
        this.button.classList.add(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
      }

      /**
         * Apply a custom CSS class to the button.
         * @param {String} className - The custom class name.
         */
      setCustomClass(className) {
        if (this.customClassName) {
          this.button.classList.remove(this.customClassName);
        }
        this.customClassName = className;
        if (className) {
          this.button.classList.add(className);
        }
      }
    }

    // Static property to track if styles have been initialized.
    Button.stylesInitialized = false;
    Button.initStyles();

    /**
     * Slider - A reusable UI component for range inputs
     * Creates customizable, accessible sliders with various states and callbacks
     */

    class Slider {
      /**
         * Returns the unique base CSS class for the Slider component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for sliders.
         */
      static get BASE_SLIDER_CLASS() {
        return 'userscripts-slider';
      }
      /**
         * Returns the CSS variable prefix used for theming the Slider component.
         * This prefix scopes all custom CSS variables (e.g., colors) related to the slider.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-slider-';
      }
      /**
         * Initialize styles for all sliders.
         * These styles reference the CSS variables with our defined prefix.
         */
      static initStyles() {
        if (Slider.stylesInitialized) return;

        StyleManager.addStyles(`
      /* Scoped styles for Userscripts Slider Component */
      .${Slider.BASE_SLIDER_CLASS} {
        width: 100%;
        margin: 15px 0;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${Slider.CSS_VAR_PREFIX}label-color);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input {
        -webkit-appearance: none;
        width: 100%;
        height: var(${Slider.CSS_VAR_PREFIX}track-height);
        border-radius: 3px;
        background-color: var(${Slider.CSS_VAR_PREFIX}track-bg);
        outline: none;
        transition: background-color 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        border-radius: 50%;
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-bg);
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        border-radius: 50%;
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-bg);
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb:hover {
        transform: scale(1.1);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-value {
        display: block;
        margin-top: 6px;
        font-size: 0.875rem;
        color: var(${Slider.CSS_VAR_PREFIX}value-color);
        text-align: center;
      }
      
      /* Themes */
      .${Slider.BASE_SLIDER_CLASS}--default .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-default);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--default .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-default);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--primary .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-primary);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--primary .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-primary);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--success .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-success);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--success .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-success);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--danger .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-danger);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--danger .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-danger);
      }
      
      /* Sizes */
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input {
        height: var(${Slider.CSS_VAR_PREFIX}track-height-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input {
        height: var(${Slider.CSS_VAR_PREFIX}track-height-large);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
      }
      
      /* Disabled state */
      .${Slider.BASE_SLIDER_CLASS}-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input:disabled::-webkit-slider-thumb {
        cursor: not-allowed;
        transform: none;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input:disabled::-moz-range-thumb {
        cursor: not-allowed;
        transform: none;
      }
    `, 'userscripts-slider-styles');

        Slider.stylesInitialized = true;
      }
      /**
         * Injects default color variables for the Slider component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
      static useDefaultColors() {
        const styleId = 'userscripts-slider-default-colors';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
        :root {
          /* Base colors */
          ${Slider.CSS_VAR_PREFIX}label-color: #374151;
          ${Slider.CSS_VAR_PREFIX}track-bg: #e5e7eb;
          ${Slider.CSS_VAR_PREFIX}value-color: #4b5563;
          
          /* Theme colors */
          ${Slider.CSS_VAR_PREFIX}thumb-default: #6b7280;
          ${Slider.CSS_VAR_PREFIX}thumb-primary: #3b82f6;
          ${Slider.CSS_VAR_PREFIX}thumb-success: #10b981;
          ${Slider.CSS_VAR_PREFIX}thumb-danger: #ef4444;
          
          /* Sizing variables */
          ${Slider.CSS_VAR_PREFIX}track-height: 6px;
          ${Slider.CSS_VAR_PREFIX}track-height-small: 4px;
          ${Slider.CSS_VAR_PREFIX}track-height-large: 8px;
          
          ${Slider.CSS_VAR_PREFIX}thumb-size: 18px;
          ${Slider.CSS_VAR_PREFIX}thumb-size-small: 14px;
          ${Slider.CSS_VAR_PREFIX}thumb-size-large: 22px;
        }
      `;
          document.head.appendChild(style);
        }
      }
      /**
         * Create a new slider
         * @param {Object} options - Configuration options
         * @param {Number} [options.min=0] - Minimum value
         * @param {Number} [options.max=100] - Maximum value
         * @param {Number} [options.value] - Initial value
         * @param {Number} [options.step=1] - Step increment
         * @param {String} [options.className] - Additional CSS class for styling
         * @param {Function} [options.onChange] - Callback when value changes
         * @param {Function} [options.onInput] - Callback during input (before change is finalized)
         * @param {String} [options.id] - ID attribute
         * @param {HTMLElement} [options.container] - Container to append to
         * @param {Boolean} [options.showValue=true] - Whether to show the current value
         * @param {String} [options.label] - Label text
         * @param {String} [options.theme='default'] - Theme (default, primary, etc.)
         * @param {String} [options.size='medium'] - Size (small, medium, large)
         * @param {String} [options.valuePrefix] - Text to show before the value
         * @param {String} [options.valueSuffix] - Text to show after the value
         */
      constructor(options = {}) {
        this.min = options.min !== undefined ? options.min : 0;
        this.max = options.max !== undefined ? options.max : 100;
        this.value = options.value !== undefined ? options.value : this.min;
        this.step = options.step !== undefined ? options.step : 1;
        this.customClassName = options.className || '';
        this.onChange = options.onChange;
        this.onInput = options.onInput;
        this.id = options.id || `slider-${Math.random().toString(36).substring(2, 9)}`;
        this.container = options.container;
        this.showValue = options.showValue !== undefined ? options.showValue : true;
        this.label = options.label || '';
        this.theme = options.theme || 'default';
        this.size = options.size || 'medium';
        this.valuePrefix = options.valuePrefix || '';
        this.valueSuffix = options.valueSuffix || '';

        this.sliderElement = null;
        this.inputElement = null;
        this.valueElement = null;
        this.labelElement = null;

        Slider.initStyles();
        this.create();
      }


      /**
         * Create the slider element.
         * @return {HTMLElement} The slider container element.
         */
      create() {
        // Create the slider container
        this.sliderElement = document.createElement('div');
        this.updateSliderClasses(); // Sets the appropriate classes based on theme, size, and custom classes

        // If a label is provided, create and append the label element
        if (this.label) {
          this.labelElement = document.createElement('label');
          this.labelElement.className = `${Slider.BASE_SLIDER_CLASS}-label`;
          this.labelElement.htmlFor = this.id;
          this.labelElement.textContent = this.label;
          this.sliderElement.appendChild(this.labelElement);
        }

        // Create the input element of type range
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'range';
        this.inputElement.className = `${Slider.BASE_SLIDER_CLASS}-input`;
        this.inputElement.id = this.id;
        this.inputElement.min = this.min;
        this.inputElement.max = this.max;
        this.inputElement.step = this.step;
        this.inputElement.value = this.value;

        // Cancel any ongoing smooth transition animation when the user initiates a drag.
        // Using "pointerdown" covers both mouse and touch events.
        this.inputElement.addEventListener('pointerdown', () => {
          if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
          }
        });

        // Listen for input events to update the value and display
        this.inputElement.addEventListener('input', (e) => {
          // Update the slider's value
          this.value = parseFloat(e.target.value);
          this.updateValue();
          if (this.onInput) {
            this.onInput(this.value, e);
          }
        });

        // Listen for change events (when value change is finalized)
        this.inputElement.addEventListener('change', (e) => {
          if (this.onChange) {
            this.onChange(this.value, e);
          }
        });

        // Append the input element to the slider container
        this.sliderElement.appendChild(this.inputElement);

        // Optionally create and append a value display element
        if (this.showValue) {
          this.valueElement = document.createElement('span');
          this.valueElement.className = `${Slider.BASE_SLIDER_CLASS}-value`;
          this.updateValue();
          this.sliderElement.appendChild(this.valueElement);
        }

        // Append the slider container to the provided container, if one was specified
        if (this.container) {
          this.container.appendChild(this.sliderElement);
        }

        return this.sliderElement;
      }


      /**
         * Update the classes on the slider element based on theme, size, and custom classes.
         */
      updateSliderClasses() {
        const classNames = [Slider.BASE_SLIDER_CLASS];

        // Add theme class
        if ('medium' !== this.theme) {
          classNames.push(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
        }

        // Add size class if not the default
        if ('medium' !== this.size) {
          classNames.push(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
        }

        // Add custom class if specified
        if (this.customClassName) {
          classNames.push(this.customClassName);
        }

        this.sliderElement.className = classNames.join(' ');
      }

      /**
         * Update the displayed value
         */
      updateValue() {
        if (this.showValue && this.valueElement) {
          this.valueElement.textContent = `${this.valuePrefix}${this.value}${this.valueSuffix}`;
        }
      }

      /**
         * Get the current value
         * @return {Number} The current value
         */
      getValue() {
        return this.value;
      }

      /**
         * Set the slider value
         * @param {Number} value - The new value
         * @param {Boolean} [triggerEvent=false] - Whether to trigger the onChange event
         * @return {Number} The new value (clamped to min/max)
         */
      setValue(value, triggerEvent = false) {
        // Ensure value is within min/max bounds
        this.value = Math.min(Math.max(value, this.min), this.max);

        // Update input element
        if (this.inputElement) {
          this.inputElement.value = this.value;
        }

        // Update displayed value
        this.updateValue();

        // Trigger event if requested
        if (triggerEvent && this.onChange) {
          this.onChange(this.value);
        }

        return this.value;
      }

      /**
         * Set the theme of the slider
         * @param {String} theme - Theme name
         */
      setTheme(theme) {
        // Remove current theme class
        if (this.sliderElement) {
          this.sliderElement.classList.remove(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
        }

        // Update theme and add new theme class
        this.theme = theme;

        if (this.sliderElement) {
          this.sliderElement.classList.add(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
        }
      }

      /**
         * Set the size of the slider
         * @param {String} size - Size name (small, medium, large)
         */
      setSize(size) {
        // Remove current size class
        if (this.sliderElement) {
          this.sliderElement.classList.remove(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
        }

        // Update size and add new size class
        this.size = size;

        if (this.sliderElement && 'medium' !== size) {
          this.sliderElement.classList.add(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
        }
      }

      /**
         * Set a custom CSS class for the slider
         * @param {String} className - The custom class name
         */
      setCustomClass(className) {
        if (this.customClassName && this.sliderElement) {
          this.sliderElement.classList.remove(this.customClassName);
        }

        this.customClassName = className;

        if (className && this.sliderElement) {
          this.sliderElement.classList.add(className);
        }
      }

      /**
         * Enable or disable the slider
         * @param {Boolean} disabled - Whether the slider should be disabled
         */
      setDisabled(disabled) {
        if (this.inputElement) {
          this.inputElement.disabled = disabled;
        }
      }

      /**
         * Set the label text
         * @param {String} label - New label text
         */
      setLabel(label) {
        this.label = label;

        if (this.labelElement) {
          this.labelElement.textContent = label;
        } else if (label && this.sliderElement) {
          // Create label if it doesn't exist but is now needed
          this.labelElement = document.createElement('label');
          this.labelElement.className = `${Slider.BASE_SLIDER_CLASS}-label`;
          this.labelElement.htmlFor = this.id;
          this.labelElement.textContent = label;
          this.sliderElement.insertBefore(this.labelElement, this.sliderElement.firstChild);
        }
      }

      /**
         * Snap a given value to the nearest valid step increment within [this.min, this.max].
         * @param {number} val - The raw floating-point value to snap.
         * @return {number} The stepped value, clamped to min/max.
         */
      snapValueToStep(val) {
        // Constrain into [min, max] first
        const clamped = Math.max(this.min, Math.min(this.max, val));

        // Compute how many steps from this.min
        const stepsFromMin = Math.round((clamped - this.min) / this.step);
        // Snap back to [min, max]
        return this.min + (stepsFromMin * this.step);
      }

      /**
         * Animate the slider from its current value to a target value
         * with snapping to steps at each frame.
         *
         * @param {number} rawTargetValue - The raw target (e.g. from click).
         * @param {number} [duration=300] - The animation duration in ms.
         */
      animateToValue(rawTargetValue, duration = 300) {
        // Snap the final target to a valid step before we start animating:
        const targetValue = this.snapValueToStep(rawTargetValue);

        // Cancel any existing animation frame
        if (this._animationFrame) {
          cancelAnimationFrame(this._animationFrame);
          this._animationFrame = null;
        }

        const startValue = this.value; // Current slider value
        const startTime = performance.now();
        const range = targetValue - startValue;

        const step = (now) => {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / duration, 1); // interpolation factor [0..1]
          // Compute new float value
          const newFloatValue = startValue + t * range;

          // Snap each intermediate to the nearest step:
          const snapped = this.snapValueToStep(newFloatValue);

          // Update the slider's value without a final change event
          this.setValue(snapped, false);

          if (1 > t) {
            this._animationFrame = requestAnimationFrame(step);
          } else {
            // End exactly on the snapped target, triggering an onChange if desired
            this._animationFrame = null;
            this.setValue(targetValue, true);
          }
        };

        this._animationFrame = requestAnimationFrame(step);
      }

      /**
         * Set the value prefix and suffix
         * @param {String} prefix - Text to show before the value
         * @param {String} suffix - Text to show after the value
         */
      setValueFormat(prefix, suffix) {
        this.valuePrefix = prefix || '';
        this.valueSuffix = suffix || '';
        this.updateValue();
      }

      /**
         * Show or hide the value display
         * @param {Boolean} show - Whether to show the value
         */
      setShowValue(show) {
        this.showValue = show;

        if (show && !this.valueElement && this.sliderElement) {
          // Create value element if it doesn't exist but is now needed
          this.valueElement = document.createElement('span');
          this.valueElement.className = `${Slider.BASE_SLIDER_CLASS}-value`;
          this.updateValue();
          this.sliderElement.appendChild(this.valueElement);
        } else if (!show && this.valueElement) {
          // Remove value element if it exists but is no longer needed
          this.valueElement.remove();
          this.valueElement = null;
        }
      }

      /**
         * Destroys the slider and removes it from the DOM.
         */
      destroy() {
        if (this.sliderElement && this.sliderElement.parentNode) {
          this.sliderElement.parentNode.removeChild(this.sliderElement);
        }

        this.sliderElement = null;
        this.inputElement = null;
        this.valueElement = null;
        this.labelElement = null;
      }
    }

    // Static property to track if styles have been initialized
    Slider.stylesInitialized = false;

    /**
     * Enhanced version of the ProgressBar core component with Eksi-style UI
     * This replaces the existing ProgressBar.js file in the core/ui directory
     */

    class ProgressBar {
      /**
         * Returns the unique base CSS class for the ProgressBar component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for progress bars.
         */
      static get BASE_PROGRESS_CLASS() {
        return 'userscripts-progress';
      }
      /**
         * Returns the CSS variable prefix used for theming the ProgressBar component.
         * This prefix scopes all custom CSS variables (e.g., colors) related to the progress bar.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-progress-';
      }
      /**
         * Initialize styles for all progress bars.
         * These styles reference the CSS variables with our defined prefix.
         */
      static initStyles() {
        if (ProgressBar.stylesInitialized) return;
        StyleManager.addStyles(`
      /* Scoped styles for Userscripts ProgressBar Component */
      .${ProgressBar.BASE_PROGRESS_CLASS} {
        width: 100%;
        margin: 10px 0;
        position: relative;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-label {
        font-size: 0.875rem;
        margin-bottom: 4px;
        display: block;
        color: var(${ProgressBar.CSS_VAR_PREFIX}label-color, #555);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 20px;
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}bar-bg, #f3f3f3);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        height: 100%;
        width: 0%;
        border-radius: 10px;
        transition: width 0.5s ease;
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}fill-bg)), 
          var(${ProgressBar.CSS_VAR_PREFIX}fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}fill-bg))
        );
        position: relative;
        overflow: hidden;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-fill::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.1) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 255, 255, 0.1) 75%,
          transparent 75%,
          transparent 100%
        );
        background-size: 30px 30px;
        animation: ${ProgressBar.BASE_PROGRESS_CLASS}-stripes 1s linear infinite;
      }
      
      @keyframes ${ProgressBar.BASE_PROGRESS_CLASS}-stripes {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 30px 0;
        }
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-text {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 10px;
        font-size: 0.75rem;
        color: var(${ProgressBar.CSS_VAR_PREFIX}text-color, #333);
        font-weight: bold;
        text-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);
        z-index: 1;
      }
      
      /* Themes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--default .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}default-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}default-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--primary .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--success .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}success-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}success-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--danger .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--warning .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg))
        );
      }
      
      /* Sizes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--small .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 8px;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--large .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 24px;
      }
    `, 'userscripts-progress-styles');
        ProgressBar.stylesInitialized = true;
      }
      /**
         * Injects default color variables for the ProgressBar component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
      static useDefaultColors() {
        const styleId = 'userscripts-progress-default-colors';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
        :root {
          /* Base colors */
          ${ProgressBar.CSS_VAR_PREFIX}label-color: #555;
          ${ProgressBar.CSS_VAR_PREFIX}bar-bg: #f3f3f3;
          ${ProgressBar.CSS_VAR_PREFIX}fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}text-color: #333;
          
          /* Theme colors with gradients */
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-start: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-end: #4b5563;
          
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg: #3b82f6;
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-start: #3b82f6;
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-end: #2563eb;
          
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-bg: #10b981;
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-start: #10b981;
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-end: #059669;
          
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg: #ef4444;
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-start: #ef4444;
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-end: #dc2626;
          
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg: #f59e0b;
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-start: #f59e0b;
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-end: #d97706;
        }
      `;
          document.head.appendChild(style);
        }
      }
      /**
         * Create a new progress bar.
         * @param {Object} options - Configuration options.
         * @param {number} options.initialValue - Initial progress value (0-100).
         * @param {string} [options.className='userscripts-progress'] - CSS class for styling.
         * @param {HTMLElement} options.container - Container element to which the progress bar will be appended.
         * @param {boolean} [options.showText=true] - Whether to display the progress text.
         * @param {boolean} [options.showLabel=false] - Whether to display a label above the progress bar.
         * @param {string} [options.label=''] - Label text to display if showLabel is true.
         * @param {string} [options.theme='default'] - Theme for the progress bar (e.g., "default", "primary", "success").
         * @param {string} [options.size='normal'] - Size of the progress bar ('small', 'normal', 'large').
         */
      constructor(options) {
        this.value = options.initialValue || 0;
        this.className = options.className || ProgressBar.BASE_PROGRESS_CLASS;
        this.container = options.container;
        this.showText = options.showText !== undefined ? options.showText : true;
        this.showLabel = options.showLabel || false;
        this.label = options.label || '';
        this.theme = options.theme || 'default';
        this.size = options.size || 'normal';

        this.progressElement = null;
        this.progressBarElement = null;
        this.progressFillElement = null;
        this.progressTextElement = null;
        this.labelElement = null;

        ProgressBar.initStyles();
        this.create();
      }


      /**
         * Creates the progress bar elements and appends them to the container if provided.
         * @return {HTMLElement} The created progress bar container element.
         */
      create() {
        // Create the progress bar container
        this.progressElement = document.createElement('div');
        this.progressElement.className = `${this.className} ${this.className}--${this.theme}`;

        if ('normal' !== this.size) {
          this.progressElement.classList.add(`${this.className}--${this.size}`);
        }

        // Add a label if requested
        if (this.showLabel) {
          this.labelElement = document.createElement('span');
          this.labelElement.className = `${this.className}-label`;
          this.labelElement.textContent = this.label;
          this.progressElement.appendChild(this.labelElement);
        }

        // Create the progress bar and its fill
        this.progressBarElement = document.createElement('div');
        this.progressBarElement.className = `${this.className}-bar`;

        this.progressFillElement = document.createElement('div');
        this.progressFillElement.className = `${this.className}-fill`;
        this.progressFillElement.style.width = `${this.value}%`;

        this.progressBarElement.appendChild(this.progressFillElement);
        this.progressElement.appendChild(this.progressBarElement);

        // Add progress text as absolute positioned element
        if (this.showText) {
          this.progressTextElement = document.createElement('div');
          this.progressTextElement.className = `${this.className}-text`;
          this.progressTextElement.textContent = `${this.value}%`;
          this.progressBarElement.appendChild(this.progressTextElement);
        }

        // Append the entire progress element to the container, if one was provided
        if (this.container) {
          this.container.appendChild(this.progressElement);
        }
        return this.progressElement;
      }

      /**
         * Updates the progress value and (optionally) the display text.
         * @param {number} value - The new progress value (between 0 and 100).
         * @param {string} [text] - Optional custom text to display.
         * @return {number} The updated progress value.
         */
      setValue(value, text) {
        this.value = Math.min(100, Math.max(0, value));
        if (this.progressFillElement) {
          this.progressFillElement.style.width = `${this.value}%`;
        }
        if (this.showText && this.progressTextElement) {
          this.progressTextElement.textContent = text || `${this.value}%`;
        }
        return this.value;
      }

      /**
         * Changes the progress bar theme by updating the theme class.
         * @param {string} theme - The new theme (e.g., "default", "primary", "success", etc.).
         */
      setTheme(theme) {
        this.theme = theme;
        if (this.progressElement) {
          // Remove any existing theme class (assumed to be in the format `${this.className}--<theme>`)
          const classes = this.progressElement.className.split(' ');
          const nonThemeClasses = classes.filter((cls) =>
            !cls.startsWith(`${this.className}--`) ||
                    cls === `${this.className}--${this.size}`, // Keep size class
          );
          this.progressElement.className = `${nonThemeClasses.join(' ')} ${this.className}--${this.theme}`;
        }
      }

      /**
         * Changes the progress bar size.
         * @param {string} size - The new size ('small', 'normal', 'large').
         */
      setSize(size) {
        this.size = size;
        if (this.progressElement) {
          // Remove size classes
          this.progressElement.classList.remove(`${this.className}--small`);
          this.progressElement.classList.remove(`${this.className}--large`);

          // Add new size class if not normal
          if ('normal' !== size) {
            this.progressElement.classList.add(`${this.className}--${size}`);
          }
        }
      }

      /**
         * Sets the label text for the progress bar.
         * @param {string} label - The new label text.
         */
      setLabel(label) {
        this.label = label;
        if (this.labelElement) {
          this.labelElement.textContent = label;
        }
      }

      /**
         * Shows or hides the entire progress bar.
         * @param {boolean} visible - True to show, false to hide.
         */
      setVisible(visible) {
        if (this.progressElement) {
          this.progressElement.style.display = visible ? '' : 'none';
        }
      }

      /**
         * Destroys the progress bar and removes it from the DOM.
         */
      destroy() {
        if (this.progressElement && this.progressElement.parentNode) {
          this.progressElement.parentNode.removeChild(this.progressElement);
        }
        this.progressElement = null;
        this.progressBarElement = null;
        this.progressFillElement = null;
        this.progressTextElement = null;
        this.labelElement = null;
      }
    }

    // Static property to track if styles have been initialized.
    ProgressBar.stylesInitialized = false;

    // Initialize styles when imported.
    ProgressBar.initStyles();

    /**
     * Checkbox - A reusable UI component for checkboxes.
     * Creates customizable, accessible checkboxes with various states and callbacks.
     */

    /**
     * A reusable UI component for creating accessible, customizable checkboxes.
     */
    class Checkbox {
      /**
         * Returns the unique base CSS class for the Checkbox component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for checkboxes.
         */
      static get BASE_CHECKBOX_CLASS() {
        return 'userscripts-checkbox';
      }
      /**
         * Returns the CSS variable prefix used for theming and styling the Checkbox component.
         * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the checkbox.
         *
         * @return {string} The CSS variable prefix.
         */
      static get CSS_VAR_PREFIX() {
        return '--userscripts-checkbox-';
      }
      /**
         * Initialize styles for all checkboxes.
         * These styles reference the CSS variables with our defined prefix.
         */
      static initStyles() {
        if (Checkbox.stylesInitialized) return;
        StyleManager.addStyles(`
      /* Scoped styles for Userscripts Checkbox Component */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container {
        display: inline-flex;
        align-items: center;
        position: relative;
        cursor: pointer;
        user-select: none;
        font-family: inherit;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      
      /* Hide native checkbox */
      .${Checkbox.BASE_CHECKBOX_CLASS}-native {
        position: absolute;
        opacity: 0;
        height: 0;
        width: 0;
      }
      
      /* Custom checkbox appearance */
      .${Checkbox.BASE_CHECKBOX_CLASS} {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 0.25rem;
        border: 2px solid var(${Checkbox.CSS_VAR_PREFIX}border-color);
        background-color: var(${Checkbox.CSS_VAR_PREFIX}bg);
        transition: all 0.2s ease;
        position: relative;
      }
      
      /* Check mark (initially hidden) */
      .${Checkbox.BASE_CHECKBOX_CLASS}::after {
        content: '';
        position: absolute;
        opacity: 0;
        transform: rotate(45deg) scale(0);
        width: 0.3125rem;
        height: 0.625rem;
        border-right: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
        border-bottom: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
        transition: all 0.2s ease;
      }
      
      /* When checkbox is checked */
      .${Checkbox.BASE_CHECKBOX_CLASS}--checked {
        background-color: var(${Checkbox.CSS_VAR_PREFIX}checked-bg);
        border-color: var(${Checkbox.CSS_VAR_PREFIX}checked-border);
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--checked::after {
        opacity: 1;
        transform: rotate(45deg) scale(1);
      }
      
      /* Indeterminate state */
      .${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate::after {
        opacity: 1;
        transform: rotate(0) scale(1);
        width: 0.625rem;
        height: 0.125rem;
        border-right: none;
        border-bottom: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
      }
      
      /* On hover */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container:hover .${Checkbox.BASE_CHECKBOX_CLASS}:not(.${Checkbox.BASE_CHECKBOX_CLASS}--checked):not(.${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate) {
        border-color: var(${Checkbox.CSS_VAR_PREFIX}hover-border);
        background-color: var(${Checkbox.CSS_VAR_PREFIX}hover-bg);
      }
      
      /* On focus */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container:focus-within .${Checkbox.BASE_CHECKBOX_CLASS} {
        box-shadow: 0 0 0 3px var(${Checkbox.CSS_VAR_PREFIX}focus-shadow);
      }
      
      /* Label styles */
      .${Checkbox.BASE_CHECKBOX_CLASS}-label {
        margin-left: 0.5rem;
        font-size: 0.875rem;
      }
      
      /* Checkbox sizes */
      .${Checkbox.BASE_CHECKBOX_CLASS}--small {
        width: 1rem;
        height: 1rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--small::after {
        width: 0.25rem;
        height: 0.5rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--large {
        width: 1.5rem;
        height: 1.5rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--large::after {
        width: 0.375rem;
        height: 0.75rem;
      }
    `, 'userscripts-checkbox-styles');

        Checkbox.stylesInitialized = true;
      }
      /**
         * Inject default color variables for the checkbox component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
      static useDefaultColors() {
        const styleId = 'userscripts-checkbox-default-colors';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
        :root {
          /* Default state */
          ${Checkbox.CSS_VAR_PREFIX}bg: #ffffff;
          ${Checkbox.CSS_VAR_PREFIX}border-color: #d1d5db;
          ${Checkbox.CSS_VAR_PREFIX}hover-bg: #f3f4f6;
          ${Checkbox.CSS_VAR_PREFIX}hover-border: #9ca3af;
          
          /* Checked state */
          ${Checkbox.CSS_VAR_PREFIX}checked-bg: #3b82f6;
          ${Checkbox.CSS_VAR_PREFIX}checked-border: #3b82f6;
          ${Checkbox.CSS_VAR_PREFIX}checkmark-color: #ffffff;
          
          /* Focus state */
          ${Checkbox.CSS_VAR_PREFIX}focus-shadow: rgba(59, 130, 246, 0.3);
        }
      `;
          document.head.appendChild(style);
        }
      }
      /**
         * Create a new Checkbox.
         * @param {Object} options - Configuration options.
         * @param {String} [options.label] - Checkbox label text.
         * @param {Boolean} [options.checked=false] - Initial checked state.
         * @param {Boolean} [options.indeterminate=false] - Initial indeterminate state.
         * @param {String} [options.id] - Checkbox ID.
         * @param {String} [options.name] - Input name attribute.
         * @param {Function} [options.onChange] - Change event handler.
         * @param {HTMLElement} [options.container] - Container to append the checkbox to.
         * @param {String} [options.className] - Additional custom CSS class.
         * @param {Boolean} [options.disabled=false] - Disabled state.
         * @param {String} [options.size="medium"] - Checkbox size.
         * @param {Object} [options.attributes={}] - Additional HTML attributes.
         */
      constructor(options = {}) {
        this.label = options.label || '';
        this.checked = options.checked || false;
        this.indeterminate = options.indeterminate || false;
        this.id = options.id;
        this.name = options.name;
        this.onChange = options.onChange;
        this.container = options.container;
        this.customClassName = options.className || '';
        this.disabled = options.disabled || false;
        this.size = options.size || 'medium';
        this.attributes = options.attributes || {};

        // DOM elements references
        this.checkboxContainer = null;
        this.customCheckbox = null;
        this.nativeCheckbox = null;
        this.labelElement = null;

        Checkbox.initStyles();
        this.create();
      }


      /**
         * Create the checkbox UI and, if a container is provided, append it.
         * @return {HTMLElement} The created checkbox container element.
         */
      create() {
        // Create container
        this.checkboxContainer = document.createElement('label');
        this.checkboxContainer.className = `${Checkbox.BASE_CHECKBOX_CLASS}-container`;
        if (this.customClassName) {
          this.checkboxContainer.classList.add(this.customClassName);
        }
        if (this.disabled) {
          this.checkboxContainer.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
        }

        // Create hidden native checkbox for accessibility
        this.nativeCheckbox = document.createElement('input');
        this.nativeCheckbox.type = 'checkbox';
        this.nativeCheckbox.className = `${Checkbox.BASE_CHECKBOX_CLASS}-native`;
        this.nativeCheckbox.checked = this.checked;
        this.nativeCheckbox.indeterminate = this.indeterminate;
        this.nativeCheckbox.disabled = this.disabled;

        if (this.id) this.nativeCheckbox.id = this.id;
        if (this.name) this.nativeCheckbox.name = this.name;

        Object.entries(this.attributes).forEach(([key, value]) => {
          this.nativeCheckbox.setAttribute(key, value);
        });

        // Create custom checkbox visual
        this.customCheckbox = document.createElement('span');
        this.customCheckbox.className = `${Checkbox.BASE_CHECKBOX_CLASS} ${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`;
        if (this.checked) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
        } else if (this.indeterminate) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
        }

        // Create label if provided
        if (this.label) {
          this.labelElement = document.createElement('span');
          this.labelElement.className = `${Checkbox.BASE_CHECKBOX_CLASS}-label`;
          this.labelElement.textContent = this.label;
        }

        // Set up event listeners
        this.nativeCheckbox.addEventListener('change', (e) => this.handleChange(e));
        this.nativeCheckbox.addEventListener('focus', () => this.handleFocus());
        this.nativeCheckbox.addEventListener('blur', () => this.handleBlur());

        // Assemble the component
        this.checkboxContainer.appendChild(this.nativeCheckbox);
        this.checkboxContainer.appendChild(this.customCheckbox);
        if (this.labelElement) {
          this.checkboxContainer.appendChild(this.labelElement);
        }

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.checkboxContainer);
        }

        // Store reference to instance on DOM element for potential external access
        this.checkboxContainer._checkboxInstance = this;

        return this.checkboxContainer;
      }

      /**
         * Handle change events.
         * @param {Event} e - The change event.
         */
      handleChange(e) {
        this.checked = this.nativeCheckbox.checked;
        this.indeterminate = this.nativeCheckbox.indeterminate;

        if (this.checked) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
        } else if (this.indeterminate) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
        } else {
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
        }

        if (this.onChange) {
          this.onChange(e);
        }
      }

      /**
         * Handle focus events.
         */
      handleFocus() {
        // Additional focus behaviors can be added here if needed
      }

      /**
         * Handle blur events.
         */
      handleBlur() {
        // Additional blur behaviors can be added here if needed
      }

      /**
         * Set the checked state.
         * @param {Boolean} checked - The new checked state.
         */
      setChecked(checked) {
        this.checked = checked;
        this.nativeCheckbox.checked = checked;

        if (checked) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
          this.indeterminate = false;
          this.nativeCheckbox.indeterminate = false;
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
        } else {
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
        }
      }

      /**
         * Set the indeterminate state.
         * @param {Boolean} indeterminate - The new indeterminate state.
         */
      setIndeterminate(indeterminate) {
        this.indeterminate = indeterminate;
        this.nativeCheckbox.indeterminate = indeterminate;

        if (indeterminate) {
          this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
        } else {
          this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
        }
      }

      /**
         * Toggle the checked state.
         * @return {Boolean} The new checked state.
         */
      toggle() {
        this.setChecked(!this.checked);
        return this.checked;
      }

      /**
         * Set the disabled state.
         * @param {Boolean} disabled - The new disabled state.
         */
      setDisabled(disabled) {
        this.disabled = disabled;
        this.nativeCheckbox.disabled = disabled;

        if (disabled) {
          this.checkboxContainer.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
        } else {
          this.checkboxContainer.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
        }
      }

      /**
         * Set the label text.
         * @param {String} text - The new label text.
         */
      setLabel(text) {
        this.label = text;

        if (!this.labelElement) {
          this.labelElement = document.createElement('span');
          this.labelElement.className = `${Checkbox.BASE_CHECKBOX_CLASS}-label`;
          this.checkboxContainer.appendChild(this.labelElement);
        }

        this.labelElement.textContent = text;
      }

      /**
         * Change the checkbox size.
         * @param {String} size - The new size (e.g., "small", "medium", "large").
         */
      setSize(size) {
        this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`);
        this.size = size;
        this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`);
      }

      /**
         * Apply a custom CSS class to the checkbox container.
         * @param {String} className - The custom class name.
         */
      setCustomClass(className) {
        if (this.customClassName) {
          this.checkboxContainer.classList.remove(this.customClassName);
        }
        this.customClassName = className;
        if (className) {
          this.checkboxContainer.classList.add(className);
        }
      }

      /**
         * Get the current checked state.
         * @return {Boolean} The current checked state.
         */
      isChecked() {
        return this.checked;
      }

      /**
         * Get the current indeterminate state.
         * @return {Boolean} The current indeterminate state.
         */
      isIndeterminate() {
        return this.indeterminate;
      }

      /**
         * Get the current disabled state.
         * @return {Boolean} The current disabled state.
         */
      isDisabled() {
        return this.disabled;
      }
    }

    // Static property to track if styles have been initialized.
    Checkbox.stylesInitialized = false;
    Checkbox.initStyles();

    // GM function fallbacks for direct browser execution

    GMFunctions.initialize();

    const SELECTORS = {
        ITEM_CARDS: [
            'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
            '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
            '[class^="feed_Feed__item__"] a[href^="/item/"]',
        ],
        ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
        EXPAND_BUTTON: '.expand-button',
        // New consolidated control panel selectors
        CONTROL_PANEL: '.control-panel',
        FILTER_INPUT: '.filter-input',
        FILTER_APPLY: '.filter-apply',
        BLOCKED_TERMS_LIST: '.blocked-terms-list'
    };

    // Find the CSS styles section in the script
    StyleManager.addStyles(`
        :root {
            --transition-speed: 0.3s;
            --transition-easing: ease-in-out;
            --panel-background: #ffffff;
            --panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            --panel-border-radius: 8px;
            --panel-accent-color: #008080;
            --panel-hover-color: #006666;
            
            /* Set Wallapop colors for progress bar components */
            --userscripts-progress-bar-bg: #f3f3f3;
            --userscripts-progress-label-color: #333;
            --userscripts-progress-text-color: #333;
            
            /* Teal color theme for Wallapop */
            --userscripts-progress-primary-fill-gradient-start: #008080;
            --userscripts-progress-primary-fill-gradient-end: #006666;
            
            /* Success theme (green) */
            --userscripts-progress-success-fill-gradient-start: #4CAF50;
            --userscripts-progress-success-fill-gradient-end: #45a049;
            
            /* Warning theme (orange) */
            --userscripts-progress-warning-fill-gradient-start: #FF9800;
            --userscripts-progress-warning-fill-gradient-end: #F57C00;
            
            /* Checkbox component variables */
            --userscripts-checkbox-bg: #ffffff;
            --userscripts-checkbox-border-color: #d1d5db;
            --userscripts-checkbox-hover-bg: #f0f0f0;
            --userscripts-checkbox-hover-border: #9ca3af;
            --userscripts-checkbox-checked-bg: #008080;
            --userscripts-checkbox-checked-border: #008080;
            --userscripts-checkbox-checkmark-color: #ffffff;
            --userscripts-checkbox-focus-shadow: rgba(0, 128, 128, 0.3);
            
            /* SectionToggler variables */
            --userscripts-section-bg: #ffffff;
            --userscripts-section-border-color: #e5e7eb;
            --userscripts-section-header-bg: #f9fafb;
            --userscripts-section-header-hover-bg: #f3f4f6;
            --userscripts-section-title-color: #374151;
            --userscripts-section-icon-color: #9ca3af;
            --userscripts-section-icon-hover-color: #6b7280;
            --userscripts-section-content-bg: #ffffff;
            --userscripts-section-content-max-height: 500px;
            
            /* SectionToggler primary theme */
            --userscripts-section-primary-header-bg: #f0f8f8;
            --userscripts-section-primary-title-color: #008080;
            --userscripts-section-primary-icon-color: #008080;
            
            /* SectionToggler success theme */
            --userscripts-section-success-header-bg: #ecfdf5;
            --userscripts-section-success-title-color: #059669;
            --userscripts-section-success-icon-color: #10b981;
        }

        /* Control Panel Styles */
        .control-panel {
            position: fixed;
            top: 120px;
            right: 20px;
            background-color: var(--panel-background);
            border-radius: var(--panel-border-radius);
            box-shadow: var(--panel-shadow);
            padding: 0;
            z-index: 9999;
            width: 280px;
            display: flex;
            flex-direction: column;
            transition: opacity var(--transition-speed) var(--transition-easing),
                        transform var(--transition-speed) var(--transition-easing);
        }

        .panel-title {
            font-weight: bold;
            font-size: 14px;
            padding: 10px 15px;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--panel-accent-color);
            border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
            cursor: pointer;
            user-select: none;
        }

        .panel-toggle {
            cursor: pointer;
            user-select: none;
            transition: transform 0.3s var(--transition-easing);
        }

        .panel-content {
            display: flex;
            flex-direction: column;
            max-height: 800px;
            overflow: hidden;
            opacity: 1;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .panel-content.collapsed {
            max-height: 0;
            opacity: 0;
        }

        .panel-section {
            border-bottom: 1px solid #eee;
        }

        .panel-section:last-child {
            border-bottom: none;
        }

        .filter-input {
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
            transition: border-color var(--transition-speed) var(--transition-easing);
        }

        .filter-input:focus {
            border-color: var(--panel-accent-color);
            outline: none;
        }

        .panel-button {
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .copy-button {
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: left;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .copy-success {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .blocked-terms-list {
            max-height: 150px;
            overflow-y: auto;
            margin-top: 10px;
        }

        .blocked-term-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background-color: #f0f0f0;
            border-radius: 4px;
            margin-bottom: 5px;
            animation: fadeIn 0.3s ease-in-out;
        }

        .remove-term {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: transform var(--transition-speed) var(--transition-easing),
                        color var(--transition-speed) var(--transition-easing);
        }

        .remove-term:hover {
            transform: scale(1.2);
            color: #ff4040;
        }

        .copy-dropdown {
            position: relative;
            display: inline-block;
            width: 100%;
            margin-top: 10px;
        }

        .panel-content .${SectionToggler.BASE_SECTION_CLASS} {
            margin-bottom: 0;
            border: 0 none;
        }

        .dropdown-content {
            display: block;
            position: absolute;
            background-color: #f1f1f1;
            min-width: 160px;
            box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
            right: 0;
            margin-top: 2px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content.top {
            bottom: 100%;
            margin-top: 0;
            margin-bottom: 2px;
        }

        .copy-dropdown:hover .dropdown-content {
            max-height: 200px;
            opacity: 1;
            pointer-events: auto;
        }

        .dropdown-content button {
            color: black;
            padding: 12px 16px;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content button:hover {
            background-color: #ddd;
        }

        .language-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

     .language-selector .userscripts-button.lang-button {
            ${Button.CSS_VAR_PREFIX}bg: #f0f0f0;
            ${Button.CSS_VAR_PREFIX}bg-hover: #e0e0e0;
            ${Button.CSS_VAR_PREFIX}border: #ccc;
            flex-grow: 1;
            flex-basis: 45%;
            border-width: 1px;
            border-style: solid;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing),
                        border-color var(--transition-speed) var(--transition-easing);
        }
        
        .language-selector .userscripts-button.lang-button.active {
            background-color: var(--panel-accent-color);
            color: white;
            border-color: var(--panel-accent-color);
        }

        ${SELECTORS.EXPAND_BUTTON} {
            background: none;
            border: none;
            color: #008080;
            cursor: pointer;
            padding: 5px;
            font-size: 12px;
            text-decoration: underline;
            transition: opacity var(--transition-speed) var(--transition-easing);
        }

        .description-content {
            max-height: 0;
            overflow: hidden;
            padding: 0 10px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin-top: 5px;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .description-content.expanded {
            max-height: 1000px;
            padding: 10px;
            transition: max-height 0.5s var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .error-message {
            color: #ff0000;
            font-style: italic;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }

        .fadeOutAnimation {
            animation: fadeOut 0.3s ease-in-out forwards;
        }

        .hidden-item {
            display: none !important;
        }

        .hiding-animation {
            animation: fadeOut 0.5s ease-in-out forwards;
        }

        /* Export Format Styles */
        .export-section {
            position: relative;
        }

        .format-selector-container {
            position: relative;
            margin-top: 10px;
        }

        .format-selector {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            background-color: white;
            text-align: left;
            position: relative;
        }

        .format-selector:after {
            content: '▼';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
        }

        .format-dropdown {
            position: absolute;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 10;
            transition: max-height var(--transition-speed) var(--transition-easing);
        }

        .format-dropdown.active {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ccc;
        }

        .format-categories {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .format-category-label {
            padding: 8px 12px;
            font-weight: bold;
            background-color: #f5f5f5;
            border-bottom: 1px solid #eee;
        }

        .format-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .format-item {
            position: relative;
            cursor: pointer;
        }

        .format-label {
            padding: 8px 12px 8px 20px;
            border-bottom: 1px solid #eee;
        }

        .format-item.selected .format-label {
            background-color: #e0f0f0;
            color: var(--panel-accent-color);
        }

        .format-item:hover .format-label {
            background-color: #f0f0f0;
        }

        .options-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 12px;
            color: #777;
            cursor: pointer;
            padding: 4px;
        }

        .format-options {
            padding: 5px 10px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #eee;
        }

        .format-options.hidden {
            display: none;
        }

        .option-row {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        
        /* Customize Checkbox component to match existing styling */
        .option-row .userscripts-checkbox-container {
            width: 100%;
        }
        
        .option-row .userscripts-checkbox-label {
            font-size: 12px;
            color: #555;
        }

        .export-buttons-container .export-success {
            ${Button.CSS_VAR_PREFIX}bg: #4CAF50;
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .export-buttons-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .export-buttons-container .export-button {
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            flex: 1;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .downloaded {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

       .expand-progress-container {
            margin-top: 10px;
            padding: 5px;
            border-radius: 4px;
        }

        .userscripts-slider-input::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            background-color: #008080 !important;
            cursor: pointer !important;
            border: none !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        
        .userscripts-slider-input::-moz-range-thumb {
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            background-color: #008080 !important;
            cursor: pointer !important;
            border: none !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        
        .userscripts-slider-input {
            -webkit-appearance: none !important;
            appearance: none !important;
            height: 6px !important;
            border-radius: 3px !important;
            background-color: #e5e7eb !important;
            outline: none !important;
        }

        /* Select box styling */
        .delivery-method-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
          color: #333;
          cursor: pointer;
          outline: none;
          margin: 8px 0;
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        
        .delivery-method-select:focus {
          border-color: var(--panel-accent-color);
        }
        
        .delivery-method-select option {
          padding: 8px;
        }
        
        .delivery-method-select option:checked {
          background-color: var(--panel-accent-color);
          color: white;
        }
`, 'wallapop-enhanced-tools');

    Logger.setPrefix("Wallapop Enhanced Tools");


    TranslationManager.init({
        languages: {
            en: 'English',
            es: 'Español',
            ca: 'Català',
            tr: 'Türkçe',
            pt: 'Português',
            it: 'Italiano',
            fr: 'Français',
            de: 'Deutsch',
            nl: 'Nederlands'
        },
        translations: {
            en: {
                expandDescription: 'Expand Description',
                hideDescription: 'Hide Description',
                loading: 'Loading...',
                wallapopTools: 'Wallapop Tools',
                filterUnwantedWords: 'Filter Unwanted Words',
                example: 'E.g: mac, apple, macbook...',
                addAndApply: 'Add and Apply',
                noWordsToFilter: 'No words to filter',
                remove: 'Remove',
                copyDescriptions: 'Copy Descriptions',
                copyAsJSON: 'Copy as JSON',
                copyAsCSV: 'Copy as CSV',
                withHeaders: 'With Headers',
                withoutHeaders: 'Without Headers',
                clearAll: 'Clear All',
                cleared: 'Cleared!',
                copied: 'Copied!',
                nothingToCopy: 'Nothing to copy!',
                languageSettings: 'Language Settings',
                errorOccurred: 'An unexpected error occurred',
                failedToParse: 'Failed to parse description:',
                // Export functionality
                selectFormat: 'Select Format',
                exportData: 'Export',
                exportDescriptions: 'Export Descriptions',
                // New entries for download functionality
                copyToClipboard: 'Copy to Clipboard',
                downloadFile: 'Download File',
                downloaded: 'Downloaded!',
                deliveryMethodFilter: 'Delivery Method Filter',
                showAll: 'Show All',
                showOnlyShipping: 'Show Only Shipping',
                showOnlyInPerson: 'Show Only In-Person',
                noDeliveryOption: 'No delivery option found',
                preparingToExpand: 'Preparing to expand descriptions...',
                expandingProgress: 'Expanding {current} of {total}',
                expandingComplete: 'Expanded {count} of {total} descriptions ({errors} errors)',
                noDescriptionsToExpand: 'No descriptions to expand',
                expandAllVisible: 'Expand All Visible',
                expandAllDescriptions: 'Expand All Descriptions',
                delayBetweenRequests: 'Delay between requests:',
            },
            es: {
                expandDescription: 'Ampliar Descripción',
                hideDescription: 'Ocultar Descripción',
                loading: 'Cargando...',
                wallapopTools: 'Herramientas Wallapop',
                filterUnwantedWords: 'Filtrar Palabras No Deseadas',
                example: 'Ej: mac, apple, macbook...',
                addAndApply: 'Añadir y Aplicar',
                noWordsToFilter: 'No hay palabras para filtrar',
                remove: 'Eliminar',
                copyDescriptions: 'Copiar Descripciones',
                copyAsJSON: 'Copiar como JSON',
                copyAsCSV: 'Copiar como CSV',
                withHeaders: 'Con Encabezados',
                withoutHeaders: 'Sin Encabezados',
                clearAll: 'Borrar Todo',
                cleared: '¡Borrado!',
                copied: '¡Copiado!',
                nothingToCopy: '¡Nada para copiar!',
                languageSettings: 'Configuración de Idioma',
                errorOccurred: 'Ocurrió un error inesperado',
                failedToParse: 'Error al analizar la descripción:',
                // Export functionality
                selectFormat: 'Seleccionar Formato',
                exportData: 'Exportar',
                exportDescriptions: 'Exportar Descripciones',
                // New entries for download functionality
                copyToClipboard: 'Copiar al Portapapeles',
                downloadFile: 'Descargar Archivo',
                downloaded: '¡Descargado!',
                deliveryMethodFilter: 'Filtro de Método de Entrega',
                showAll: 'Mostrar Todo',
                showOnlyShipping: 'Solo con Envío',
                showOnlyInPerson: 'Solo en Persona',
                noDeliveryOption: 'Opción de entrega no encontrada',
            },
            ca: {
                expandDescription: 'Ampliar Descripció',
                hideDescription: 'Amagar Descripció',
                loading: 'Carregant...',
                wallapopTools: 'Eines de Wallapop',
                filterUnwantedWords: 'Filtrar Paraules No Desitjades',
                example: 'Ex: mac, apple, macbook...',
                addAndApply: 'Afegir i Aplicar',
                noWordsToFilter: 'No hi ha paraules per filtrar',
                remove: 'Eliminar',
                copyDescriptions: 'Copiar Descripcions',
                copyAsJSON: 'Copiar com a JSON',
                copyAsCSV: 'Copiar com a CSV',
                withHeaders: 'Amb Capçaleres',
                withoutHeaders: 'Sense Capçaleres',
                clearAll: 'Esborrar Tot',
                cleared: 'Esborrat!',
                copied: 'Copiat!',
                nothingToCopy: 'Res per copiar!',
                languageSettings: 'Configuració d\'Idioma',
                errorOccurred: 'S\'ha produït un error inesperat',
                failedToParse: 'Error en analitzar la descripció:',
                // Export functionality
                selectFormat: 'Seleccionar Format',
                exportData: 'Exportar',
                exportDescriptions: 'Exportar Descripcions',
                // New entries for download functionality
                copyToClipboard: 'Copiar al Portapapers',
                downloadFile: 'Descarregar Arxiu',
                downloaded: 'Descarregat!'
            },
            tr: {
                expandDescription: 'Açıklamayı Genişlet',
                hideDescription: 'Açıklamayı Gizle',
                loading: 'Yükleniyor...',
                wallapopTools: 'Wallapop Araçları',
                filterUnwantedWords: 'İstenmeyen Kelimeleri Filtrele',
                example: 'Örn: mac, apple, macbook...',
                addAndApply: 'Ekle ve Uygula',
                noWordsToFilter: 'Filtrelenecek kelime yok',
                remove: 'Kaldır',
                copyDescriptions: 'Açıklamaları Kopyala',
                copyAsJSON: 'JSON olarak Kopyala',
                copyAsCSV: 'CSV olarak Kopyala',
                withHeaders: 'Başlıklarla',
                withoutHeaders: 'Başlıklar Olmadan',
                clearAll: 'Tümünü Temizle',
                cleared: 'Temizlendi!',
                copied: 'Kopyalandı!',
                nothingToCopy: 'Kopyalanacak bir şey yok!',
                languageSettings: 'Dil Ayarları',
                errorOccurred: 'Beklenmeyen bir hata oluştu',
                failedToParse: 'Açıklama ayrıştırılamadı:',
                // Export functionality
                selectFormat: 'Format Seçin',
                exportData: 'Dışa Aktar',
                exportDescriptions: 'Açıklamaları Dışa Aktar',
                // New entries for download functionality
                copyToClipboard: 'Panoya Kopyala',
                downloadFile: 'Dosyayı İndir',
                downloaded: 'İndirildi!',
                deliveryMethodFilter: 'Teslimat Yöntemi Filtresi',
                showAll: 'Tümünü Göster',
                showOnlyShipping: 'Sadece Kargolu',
                showOnlyInPerson: 'Sadece Elden Satış',
                noDeliveryOption: 'Teslimat seçeneği bulunamadı',
            },
            pt: {
                expandDescription: 'Expandir Descrição',
                hideDescription: 'Ocultar Descrição',
                loading: 'Carregando...',
                wallapopTools: 'Ferramentas Wallapop',
                filterUnwantedWords: 'Filtrar Palavras Indesejadas',
                example: 'Ex: mac, apple, macbook...',
                addAndApply: 'Adicionar e Aplicar',
                noWordsToFilter: 'Sem palavras para filtrar',
                remove: 'Remover',
                copyDescriptions: 'Copiar Descrições',
                copyAsJSON: 'Copiar como JSON',
                copyAsCSV: 'Copiar como CSV',
                withHeaders: 'Com Cabeçalhos',
                withoutHeaders: 'Sem Cabeçalhos',
                clearAll: 'Limpar Tudo',
                cleared: 'Limpo!',
                copied: 'Copiado!',
                nothingToCopy: 'Nada para copiar!',
                languageSettings: 'Configurações de Idioma',
                errorOccurred: 'Ocorreu um erro inesperado',
                failedToParse: 'Falha ao analisar descrição:',
                // Export functionality
                selectFormat: 'Selecionar Formato',
                exportData: 'Exportar',
                exportDescriptions: 'Exportar Descrições',
                // New entries for download functionality
                copyToClipboard: 'Copiar para Área de Transferência',
                downloadFile: 'Baixar Arquivo',
                downloaded: 'Baixado!'
            },
            it: {
                expandDescription: 'Espandi Descrizione',
                hideDescription: 'Nascondi Descrizione',
                loading: 'Caricamento...',
                wallapopTools: 'Strumenti Wallapop',
                filterUnwantedWords: 'Filtra Parole Indesiderate',
                example: 'Es: mac, apple, macbook...',
                addAndApply: 'Aggiungi e Applica',
                noWordsToFilter: 'Nessuna parola da filtrare',
                remove: 'Rimuovi',
                copyDescriptions: 'Copia Descrizioni',
                copyAsJSON: 'Copia come JSON',
                copyAsCSV: 'Copia come CSV',
                withHeaders: 'Con Intestazioni',
                withoutHeaders: 'Senza Intestazioni',
                clearAll: 'Cancella Tutto',
                cleared: 'Cancellato!',
                copied: 'Copiato!',
                nothingToCopy: 'Niente da copiare!',
                languageSettings: 'Impostazioni Lingua',
                errorOccurred: 'Si è verificato un errore imprevisto',
                failedToParse: 'Impossibile analizzare la descrizione:',
                // Export functionality
                selectFormat: 'Seleziona Formato',
                exportData: 'Esporta',
                exportDescriptions: 'Esporta Descrizioni',
                // New entries for download functionality
                copyToClipboard: 'Copia negli Appunti',
                downloadFile: 'Scarica File',
                downloaded: 'Scaricato!'
            },
            fr: {
                expandDescription: 'Développer Description',
                hideDescription: 'Masquer Description',
                loading: 'Chargement...',
                wallapopTools: 'Outils Wallapop',
                filterUnwantedWords: 'Filtrer les Mots Indésirables',
                example: 'Ex: mac, apple, macbook...',
                addAndApply: 'Ajouter et Appliquer',
                noWordsToFilter: 'Pas de mots à filtrer',
                remove: 'Supprimer',
                copyDescriptions: 'Copier les Descriptions',
                copyAsJSON: 'Copier en JSON',
                copyAsCSV: 'Copier en CSV',
                withHeaders: 'Avec En-têtes',
                withoutHeaders: 'Sans En-têtes',
                clearAll: 'Tout Effacer',
                cleared: 'Effacé !',
                copied: 'Copié !',
                nothingToCopy: 'Rien à copier !',
                languageSettings: 'Paramètres de Langue',
                errorOccurred: 'Une erreur inattendue s\'est produite',
                failedToParse: 'Échec de l\'analyse de la description :',
                // Export functionality
                selectFormat: 'Sélectionner Format',
                exportData: 'Exporter',
                exportDescriptions: 'Exporter les Descriptions',
                // New entries for download functionality
                copyToClipboard: 'Copier dans le Presse-papiers',
                downloadFile: 'Télécharger le Fichier',
                downloaded: 'Téléchargé !'
            },
            de: {
                expandDescription: 'Beschreibung Erweitern',
                hideDescription: 'Beschreibung Ausblenden',
                loading: 'Wird geladen...',
                wallapopTools: 'Wallapop-Werkzeuge',
                filterUnwantedWords: 'Unerwünschte Wörter Filtern',
                example: 'Z.B: mac, apple, macbook...',
                addAndApply: 'Hinzufügen und Anwenden',
                noWordsToFilter: 'Keine Wörter zum Filtern',
                remove: 'Entfernen',
                copyDescriptions: 'Beschreibungen Kopieren',
                copyAsJSON: 'Als JSON Kopieren',
                copyAsCSV: 'Als CSV Kopieren',
                withHeaders: 'Mit Überschriften',
                withoutHeaders: 'Ohne Überschriften',
                clearAll: 'Alles Löschen',
                cleared: 'Gelöscht!',
                copied: 'Kopiert!',
                nothingToCopy: 'Nichts zu kopieren!',
                languageSettings: 'Spracheinstellungen',
                errorOccurred: 'Ein unerwarteter Fehler ist aufgetreten',
                failedToParse: 'Fehler beim Analysieren der Beschreibung:',
                // Export functionality
                selectFormat: 'Format Auswählen',
                exportData: 'Exportieren',
                exportDescriptions: 'Beschreibungen Exportieren',
                // New entries for download functionality
                copyToClipboard: 'In die Zwischenablage Kopieren',
                downloadFile: 'Datei Herunterladen',
                downloaded: 'Heruntergeladen!'
            },
            nl: {
                expandDescription: 'Beschrijving Uitklappen',
                hideDescription: 'Beschrijving Verbergen',
                loading: 'Laden...',
                wallapopTools: 'Wallapop Hulpmiddelen',
                filterUnwantedWords: 'Ongewenste Woorden Filteren',
                example: 'Bijv: mac, apple, macbook...',
                addAndApply: 'Toevoegen en Toepassen',
                noWordsToFilter: 'Geen woorden om te filteren',
                remove: 'Verwijderen',
                copyDescriptions: 'Beschrijvingen Kopiëren',
                copyAsJSON: 'Kopiëren als JSON',
                copyAsCSV: 'Kopiëren als CSV',
                withHeaders: 'Met Headers',
                withoutHeaders: 'Zonder Headers',
                clearAll: 'Alles Wissen',
                cleared: 'Gewist!',
                copied: 'Gekopieerd!',
                nothingToCopy: 'Niets om te kopiëren!',
                languageSettings: 'Taalinstellingen',
                errorOccurred: 'Er is een onverwachte fout opgetreden',
                failedToParse: 'Kan beschrijving niet analyseren:',
                // Export functionality
                selectFormat: 'Selecteer Formaat',
                exportData: 'Exporteren',
                exportDescriptions: 'Beschrijvingen Exporteren',
                // New entries for download functionality
                copyToClipboard: 'Kopiëren naar Klembord',
                downloadFile: 'Bestand Downloaden',
                downloaded: 'Gedownload!'
            }
        },
        defaultLanguage: 'en',
        storageKey: 'wallapop-language'
    });

    class DescriptionFetcher {
        static async getDescription(url) {
            Logger.log("Fetching description for URL:", url);
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: (response) => this.handleResponse(response, resolve, url),
                    onerror: (error) => this.handleError(error, resolve)
                });
            });
        }

        static handleResponse(response, resolve, originalUrl) {
            try {
                // Parse the received response
                Logger.log("Response received with status:", response.status);

                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, "text/html");

                // Find the __NEXT_DATA__ script tag
                const nextDataScript = doc.querySelector('#__NEXT_DATA__');

                if (nextDataScript) {
                    Logger.log("Found __NEXT_DATA__ script tag");

                    try {
                        // Parse the JSON content
                        const jsonData = JSON.parse(nextDataScript.textContent);
                        Logger.log("JSON data parsed successfully");

                        // Extract the item description and title
                        let itemData = {};
                        if (jsonData.props?.pageProps?.item) {
                            const item = jsonData.props.pageProps.item;

                            // Get title
                            itemData.title = item.title?.original.trim() || "";

                            // Get description
                            if (item.description?.original) {
                                const description = item.description.original;
                                Logger.log("Description extracted from JSON:", description);

                                // Get the part before tag indicators like "No leer"
                                const cleanDescription = this.cleanDescription(description);
                                itemData.description = cleanDescription;

                                // Get the URL
                                itemData.url = originalUrl;

                                // Get price if available
                                itemData.price = item.price ? `${item.price.cash.amount} ${item.price.cash.currency}` : "";

                                resolve({success: true, data: itemData});
                            } else {
                                Logger.log("Description not found in JSON structure:", jsonData);
                                throw new Error("Description not found in JSON data");
                            }
                        } else {
                            Logger.log("Item data not found in JSON structure:", jsonData);
                            throw new Error("Item not found in JSON data");
                        }
                    } catch (jsonError) {
                        Logger.error(jsonError, "Parsing JSON data");
                        throw jsonError;
                    }
                } else {
                    Logger.log("__NEXT_DATA__ script tag not found, trying old method");

                    // Fall back to old method (for compatibility)
                    const descriptionElement = doc.querySelector(SELECTORS.ITEM_DESCRIPTION);
                    if (descriptionElement) {
                        const description = descriptionElement.querySelector(".mt-2")?.innerHTML.trim();
                        if (description) {
                            Logger.log("Description found using old method");

                            // In old method, we can't get the title easily, so we'll use the URL
                            const itemData = {
                                title: doc.querySelector('title')?.textContent || originalUrl,
                                description: description,
                                url: originalUrl,
                                price: doc.querySelector('[class*="ItemDetail__price"]')?.textContent || ""
                            };

                            resolve({success: true, data: itemData});
                            return;
                        }
                    }

                    throw new Error("Description not found with any method");
                }
            } catch (error) {
                Logger.error(error, "Parsing response");
                resolve({success: false, error: "Failed to parse description: " + error.message});
            }
        }

        // Method to clean tags from the description
        static cleanDescription(description) {
            // Look for tag indicators like "No leer"
            const tagMarkers = [
                "\n\n\n\n\n\n\nNo leer\n",
                "\n\n\n\n\nNo leer\n",
                "\nNo leer\n",
                "\n\nNo leer\n",
                "No leer",
                "tags:",
                "etiquetas:",
                "keywords:"
            ];

            // Check each marker and split at the first one found
            let cleanDesc = description;

            for (const marker of tagMarkers) {
                if (description.includes(marker)) {
                    Logger.log(`Found tag marker: "${marker}"`);
                    cleanDesc = description.split(marker)[0].trim();
                    break;
                }
            }

            // Clean excessive empty lines (reduce more than 3 newlines to 2)
            cleanDesc = cleanDesc.replace(/\n{3,}/g, "\n\n");

            return cleanDesc;
        }

        static handleError(error, resolve) {
            Logger.error(error, "XML HTTP Request");
            resolve({success: false, error: "Network error occurred"});
        }
    }

    // Storage for expanded descriptions - global manager
    class DescriptionManager {
        static expandedItems = [];

        static addItem(itemData) {
            // Check if the item already exists by URL
            const existingIndex = this.expandedItems.findIndex(item => item.url === itemData.url);
            if (existingIndex >= 0) {
                // Update existing item
                this.expandedItems[existingIndex] = itemData;
            } else {
                // Add new item
                this.expandedItems.push(itemData);
            }
            Logger.log("Item added to description manager:", itemData.title);
            Logger.log("Total items:", this.expandedItems.length);

            // Update control panel visibility
            ControlPanel.updatePanelVisibility();
        }

        static removeItem(url) {
            const index = this.expandedItems.findIndex(item => item.url === url);
            if (index >= 0) {
                this.expandedItems.splice(index, 1);
                Logger.log("Item removed from description manager:", url);
                Logger.log("Total items:", this.expandedItems.length);

                // Update control panel visibility
                ControlPanel.updatePanelVisibility();
            }
        }

        static clearItems() {
            this.expandedItems = [];
            Logger.log("All items cleared from description manager");
            ControlPanel.updatePanelVisibility();
        }

        static getItemsAsJson() {
            return JSON.stringify(this.expandedItems, null, 2);
        }

        static getItemsAsCsv(includeHeaders = true) {
            if (this.expandedItems.length === 0) {
                return "";
            }

            // Define headers
            const headers = ["Title", "Description", "Price", "URL"];

            // Create CSV rows
            let csvContent = includeHeaders ? headers.join(",") + "\n" : "";

            this.expandedItems.forEach(item => {
                // Properly escape CSV fields
                const escapeCsvField = (field) => {
                    field = String(field || "");
                    // If field contains comma, newline or double quote, enclose in double quotes
                    if (field.includes(",") || field.includes("\n") || field.includes("\"")) {
                        // Replace double quotes with two double quotes
                        field = field.replace(/"/g, "\"\"");
                        return `"${field}"`;
                    }
                    return field;
                };

                const row = [
                    escapeCsvField(item.title),
                    escapeCsvField(item.description),
                    escapeCsvField(item.price),
                    escapeCsvField(item.url)
                ];

                csvContent += row.join(",") + "\n";
            });

            return csvContent;
        }
    }

    class ExpandButton {
        constructor(anchorElement, url) {
            this.anchorElement = anchorElement;
            this.url = url;
            this.button = null;
            this.descriptionContent = null;
            this.expanded = false;
            this.itemData = null;
            this.createButton();
        }

        createButton() {
            Logger.log("Creating expand button for URL:", this.url);
            this.button = document.createElement('button');
            this.button.textContent = TranslationManager.getText('expandDescription');
            this.button.className = SELECTORS.EXPAND_BUTTON.slice(1); // Remove the leading dot

            this.descriptionContent = document.createElement('div');
            this.descriptionContent.className = 'description-content';

            this.button.addEventListener('click', this.handleClick.bind(this));

            const container = document.createElement('div');
            container.appendChild(this.button);
            container.appendChild(this.descriptionContent);

            this.anchorElement.appendChild(container);
            Logger.log("Expand button added for URL:", this.url);
        }

        async handleClick(event) {
            event.preventDefault();
            event.stopPropagation();
            Logger.log("Expand button clicked for URL:", this.url);
            try {
                if (!this.expanded) {
                    await this.expandDescription();
                } else {
                    this.hideDescription();
                }
            } catch (error) {
                Logger.error(error, "Button click handler");
                this.showError("An unexpected error occurred");
            }
        }

        async expandDescription() {
            this.button.textContent = TranslationManager.getText('loading');
            const result = await DescriptionFetcher.getDescription(this.url);
            if (result.success) {
                this.itemData = result.data;
                this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data.description);
                // Use the class toggle approach for smooth transition
                this.descriptionContent.classList.add('expanded');
                this.button.textContent = TranslationManager.getText('hideDescription');
                this.expanded = true;

                // Add to global description manager
                DescriptionManager.addItem(this.itemData);

                Logger.log("Description expanded for URL:", this.url);
            } else {
                this.showError(result.error);
            }
        }

        hideDescription() {
            // Remove expanded class for smooth transition
            this.descriptionContent.classList.remove('expanded');

            // Use transition end event to clean up
            const transitionEnded = () => {
                if (!this.expanded) ;
                this.descriptionContent.removeEventListener('transitionend', transitionEnded);
            };
            this.descriptionContent.addEventListener('transitionend', transitionEnded);

            this.button.textContent = TranslationManager.getText('expandDescription');
            this.expanded = false;

            // Remove from global description manager
            if (this.itemData) {
                DescriptionManager.removeItem(this.url);
            }

            Logger.log("Description hidden for URL:", this.url);
        }

        showError(message) {
            if (message.startsWith('Failed to parse description:')) {
                message = TranslationManager.getText('failedToParse') + message.substring('Failed to parse description:'.length);
            } else if (message === 'An unexpected error occurred') {
                message = TranslationManager.getText('errorOccurred');
            }
            this.descriptionContent.innerHTML = `<span class="error-message">${message}</span>`;
            this.descriptionContent.classList.add('expanded');
            this.button.textContent = TranslationManager.getText('expandDescription');
            this.expanded = false;
            Logger.log("Error displaying description for URL:", this.url, message);
        }
    }

    class ListingManager {
        static addExpandButtonsToListings() {
            Logger.log("Adding expand buttons to listings");
            let totalListings = 0;

            SELECTORS.ITEM_CARDS.forEach(selector => {
                const listings = document.querySelectorAll(selector);
                totalListings += listings.length;
                Logger.log(`Found ${listings.length} items for selector: ${selector}`);

                listings.forEach(listing => {
                    try {
                        let href = listing.getAttribute('href') || listing.querySelector('a')?.getAttribute('href');

                        // Make sure href is a full URL
                        if (href && !href.startsWith('http')) {
                            if (href.startsWith('/')) {
                                href = `https://es.wallapop.com${href}`;
                            } else {
                                href = `https://es.wallapop.com/${href}`;
                            }
                        }

                        if (href && !listing.querySelector(SELECTORS.EXPAND_BUTTON)) {
                            new ExpandButton(listing, href);
                        } else if (!href) {
                            Logger.log("No valid href found for a listing");
                        }
                    } catch (error) {
                        Logger.error(error, "Processing individual listing");
                    }
                });
            });

            Logger.log("Total listings processed:", totalListings);
        }
    }

    class DOMObserver {
        constructor() {
            this.observer = new MutationObserver(this.handleMutations.bind(this));
            this.lastUrl = location.href;
        }

        observe() {
            this.observer.observe(document.body, {childList: true, subtree: true});
            window.addEventListener('popstate', this.handleUrlChange.bind(this));
            Logger.log("MutationObserver and popstate listener set up");
        }

        handleMutations(mutations) {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasNewItemCards = addedNodes.some(node =>
                        node.nodeType === Node.ELEMENT_NODE &&
                        SELECTORS.ITEM_CARDS.some(selector =>
                            node.matches(selector) || node.querySelector(selector)
                        )
                    );
                    if (hasNewItemCards) {
                        Logger.log("New ItemCards detected, adding expand buttons");
                        ListingManager.addExpandButtonsToListings();

                        // Apply filters to new listings
                        ControlPanel.applyFilters();
                    }
                }
            }
            this.checkUrlChange();
        }

        checkUrlChange() {
            if (this.lastUrl !== location.href) {
                Logger.log("URL changed:", location.href);
                this.lastUrl = location.href;
                this.handleUrlChange();
            }
        }

        handleUrlChange() {
            Logger.log("Handling URL change");
            setTimeout(() => {
                ListingManager.addExpandButtonsToListings();
                // Apply filters after URL change
                ControlPanel.applyFilters();
            }, 1000); // Delay to allow for dynamic content to load
        }
    }

    /**
     * FormatOption - A reusable component for format selection with conditional options
     */
    class FormatOption {
        constructor(config) {
            this.id = config.id;
            this.label = config.label;
            this.description = config.description;
            this.category = config.category;
            this.options = config.options || [];
            this.element = null;
            this.optionsContainer = null;
            this.optionValues = {};

            // Initialize default values for options
            this.options.forEach(option => {
                this.optionValues[option.id] = option.defaultValue || false;
            });
        }

        /**
         * Create the DOM element for this format option
         * @param {Function} onSelect - Callback when this option is selected
         * @returns {HTMLElement} The created element
         */
        createElement(onSelect) {
            // Create main format item
            this.element = document.createElement('li');
            this.element.className = 'format-item';
            this.element.dataset.formatId = this.id;
            this.element.dataset.category = this.category;

            const formatLabel = document.createElement('div');
            formatLabel.className = 'format-label';
            formatLabel.textContent = this.label;
            formatLabel.title = this.description;

            this.element.appendChild(formatLabel);

            // Handle format selection
            formatLabel.addEventListener('click', (e) => {
                if (onSelect) {
                    onSelect(this);
                }
                e.stopPropagation();
            });

            // Create options container if this format has options
            if (this.options.length > 0) {
                this.optionsContainer = document.createElement('div');
                this.optionsContainer.className = 'format-options hidden';

                // Create each option checkbox
                this.options.forEach(option => {
                    const optionRow = document.createElement('div');
                    optionRow.className = 'option-row';

                    // Create checkbox using the Checkbox component
                    new Checkbox({
                        id: `option-${this.id}-${option.id}`,
                        label: option.label,
                        checked: option.defaultValue || false,
                        container: optionRow,
                        size: 'small',
                        attributes: {
                            title: option.description || ''
                        },
                        onChange: (e) => {
                            this.optionValues[option.id] = e.target.checked;
                            e.stopPropagation();
                        }
                    });

                    this.optionsContainer.appendChild(optionRow);
                });

                this.element.appendChild(this.optionsContainer);

                // Add expand/collapse capability for options
                const expandButton = document.createElement('button');
                expandButton.className = 'options-toggle';
                expandButton.innerHTML = '⚙️';
                expandButton.title = 'Format Options';
                formatLabel.appendChild(expandButton);

                expandButton.addEventListener('click', (e) => {
                    this.toggleOptions();
                    e.stopPropagation();
                });
            }

            return this.element;
        }

        /**
         * Toggle options visibility
         */
        toggleOptions() {
            if (this.optionsContainer) {
                this.optionsContainer.classList.toggle('hidden');
            }
        }

        /**
         * Show options panel
         */
        showOptions() {
            if (this.optionsContainer) {
                this.optionsContainer.classList.remove('hidden');
            }
        }

        /**
         * Hide options panel
         */
        hideOptions() {
            if (this.optionsContainer) {
                this.optionsContainer.classList.add('hidden');
            }
        }

        /**
         * Get all options values
         * @returns {Object} The options values
         */
        getOptions() {
            return this.optionValues;
        }

        /**
         * Get a specific option value
         * @param {String} optionId - The option ID
         * @returns {*} The option value
         */
        getOption(optionId) {
            return this.optionValues[optionId];
        }

        /**
         * Set a specific option value
         * @param {String} optionId - The option ID
         * @param {*} value - The value to set
         */
        setOption(optionId, value) {
            this.optionValues[optionId] = value;

            // Update checkbox if it exists - find the checkbox component instead of the raw element
            const checkboxContainer = this.element.querySelector(`#option-${this.id}-${optionId}`).closest('.userscripts-checkbox-container');
            if (checkboxContainer && checkboxContainer._checkboxInstance) {
                checkboxContainer._checkboxInstance.setChecked(value);
            }
        }

        /**
         * Mark this format as selected
         */
        select() {
            if (this.element) {
                this.element.classList.add('selected');
            }
        }

        /**
         * Unselect this format
         */
        unselect() {
            if (this.element) {
                this.element.classList.remove('selected');
            }
        }
    }

    class WallapopExpandDescription {
        static async init() {
            Logger.log("Initializing script");

            // Load language preference first
            TranslationManager.loadLanguagePreference();

            StyleManager.addStyles();

            // Create unified control panel
            ControlPanel.createControlPanel();

            await this.waitForElements(SELECTORS.ITEM_CARDS);
            ListingManager.addExpandButtonsToListings();

            // Apply filters to initial listings
            ControlPanel.applyFilters();

            new DOMObserver().observe();
        }

        static waitForElements(selectors, timeout = 10000) {
            Logger.log("Waiting for elements:", selectors);
            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                function checkElements() {
                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            Logger.log("Elements found:", selector, elements.length);
                            resolve(elements);
                            return;
                        }
                    }

                    if (Date.now() - startTime > timeout) {
                        Logger.log("Timeout waiting for elements");
                        reject(new Error(`Timeout waiting for elements`));
                    } else {
                        requestAnimationFrame(checkElements);
                    }
                }

                checkElements();
            });
        }
    }

    class ControlPanel {
        static blockedTerms = [];
        static container = null;
        static filterInputElement = null;
        static blockedTermsListElement = null;
        static exportFormats = {
            // Text-based formats
            text: {
                label: 'Text',
                formats: {
                    'plain': new FormatOption({
                        id: 'plain',
                        label: 'Plain Text',
                        description: 'Simple text list of descriptions',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images as URLs',
                                description: 'Add image URLs to the output',
                                defaultValue: false
                            }
                        ]
                    }),
                    'markdown': new FormatOption({
                        id: 'markdown',
                        label: 'Markdown',
                        description: 'Formatted with Markdown syntax',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images as markdown',
                                description: 'Add image references using markdown syntax',
                                defaultValue: true
                            },
                            {
                                id: 'use-frontmatter',
                                label: 'Use frontmatter',
                                description: 'Add YAML frontmatter with metadata',
                                defaultValue: false
                            }
                        ]
                    }),
                    'html': new FormatOption({
                        id: 'html',
                        label: 'HTML',
                        description: 'Formatted as HTML document',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images',
                                description: 'Add image elements with source URLs',
                                defaultValue: true
                            },
                            {
                                id: 'include-styles',
                                label: 'Include CSS styles',
                                description: 'Add CSS styling to the HTML',
                                defaultValue: true
                            }
                        ]
                    })
                }
            },
            // Data formats
            data: {
                label: 'Data',
                formats: {
                    'json': new FormatOption({
                        id: 'json',
                        label: 'JSON',
                        description: 'JavaScript Object Notation',
                        category: 'data',
                        options: [
                            {
                                id: 'pretty-print',
                                label: 'Pretty print',
                                description: 'Format JSON with indentation',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs to JSON objects',
                                defaultValue: false
                            }
                        ]
                    }),
                    'csv': new FormatOption({
                        id: 'csv',
                        label: 'CSV',
                        description: 'Comma-separated values',
                        category: 'data',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    }),
                    'tsv': new FormatOption({
                        id: 'tsv',
                        label: 'TSV',
                        description: 'Tab-separated values',
                        category: 'data',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    }),
                    'xml': new FormatOption({
                        id: 'xml',
                        label: 'XML',
                        description: 'Extensible Markup Language',
                        category: 'data',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include image elements',
                                description: 'Add image URLs as XML elements',
                                defaultValue: false
                            },
                            {
                                id: 'pretty-print',
                                label: 'Pretty print',
                                description: 'Format XML with indentation',
                                defaultValue: true
                            }
                        ]
                    })
                }
            },
            // Spreadsheet formats
            spreadsheet: {
                label: 'Spreadsheet',
                formats: {
                    'excel-csv': new FormatOption({
                        id: 'excel-csv',
                        label: 'Excel CSV',
                        description: 'CSV optimized for Excel import',
                        category: 'spreadsheet',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    }),
                    'excel-xml': new FormatOption({
                        id: 'excel-xml',
                        label: 'Excel XML',
                        description: 'XML format for Excel',
                        category: 'spreadsheet',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    })
                }
            }
        };

        // Store togglers for state management
        static togglers = {
            panel: null,
            filter: null,
            copy: null,
            language: null
        };

        /**
         * Create a button with standard style
         */
        static createButton(text, className, clickHandler, options = {}) {
            // Configure button options
            const buttonOptions = {
                text: text,
                className: className, // Use the original class name
                onClick: clickHandler,
                disabled: options.disabled || false,
                successText: options.successText || null,
                successDuration: options.successDuration || 1500,
                container: options.container || null
            };

            // Create button using Button component
            const buttonComponent = new Button(buttonOptions);
            const buttonElement = buttonComponent.button;

            // Add any dataset properties
            if (options.dataset) {
                Object.entries(options.dataset).forEach(([key, value]) => {
                    buttonElement.dataset[key] = value;
                });
            }

            return buttonElement;
        }

        /**
         * Create a new "Expand All" section in the control panel
         */
        static createExpandAllSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isExpandAllSectionExpanded', true);

            this.togglers.expandAll = new SectionToggler({
                container,
                customClassName: 'expand-all',
                title: TranslationManager.getText('expandAllDescriptions'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isExpandAllSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create the expand all button
                    const expandAllButton = this.createButton(
                        TranslationManager.getText('expandAllVisible'),
                        'panel-button expand-all-button',
                        () => this.handleExpandAll()
                    );
                    content.appendChild(expandAllButton);

                    // Create progress container (empty container to hold the progress bar)
                    const progressContainer = document.createElement('div');
                    progressContainer.className = 'expand-progress-container';
                    progressContainer.style.display = 'none';
                    progressContainer.style.marginTop = '10px';

                    // Store the container for later access
                    this.expandProgressContainer = progressContainer;
                    content.appendChild(progressContainer);

                    // Add delay option using the Slider component
                    const delayContainer = document.createElement('div');
                    delayContainer.style.marginTop = '10px';

                    // Get saved delay value
                    const savedDelay = parseInt(this.loadPanelState('expandAllDelay', '1000'));

                    // Create the slider with the Slider component
                    this.delaySlider = new Slider({
                        container: delayContainer,
                        min: 500,
                        max: 3000,
                        step: 100,
                        value: savedDelay,
                        label: TranslationManager.getText('delayBetweenRequests'),
                        theme: 'primary',
                        valueSuffix: 'ms',
                        onChange: (value) => {
                            this.savePanelState('expandAllDelay', value.toString());
                        }
                    });

                    content.appendChild(delayContainer);
                }
            });

            return this.togglers.expandAll.section;
        }

        /**
         * Expand all visible descriptions sequentially
         */
        static async handleExpandAll() {
            // Find all unexpanded descriptions that are visible (not filtered)
            const allExpandButtons = Array.from(document.querySelectorAll(SELECTORS.EXPAND_BUTTON))
                .filter(button => {
                    // Only include buttons that are for expanding (not hiding)
                    const isExpandButton = button.textContent === TranslationManager.getText('expandDescription');
                    // Only include buttons for listings that are visible (not filtered out)
                    const listing = this.getListingFromButton(button);
                    const isVisible = listing && !listing.classList.contains('hidden-item');

                    return isExpandButton && isVisible;
                });

            const totalButtons = allExpandButtons.length;

            if (totalButtons === 0) {
                this.showExpandAllMessage(TranslationManager.getText('noDescriptionsToExpand'));
                return;
            }

            // Get the delay setting from the slider
            const delay = this.delaySlider ? this.delaySlider.getValue() : parseInt(this.loadPanelState('expandAllDelay', '1000'));

            // Get expand button and disable it
            const expandAllButton = document.querySelector('.expand-all-button');
            if (expandAllButton) expandAllButton.disabled = true;

            // Show the progress container and create a new ProgressBar instance
            if (this.expandProgressContainer) {
                this.expandProgressContainer.innerHTML = '';
                this.expandProgressContainer.style.display = 'block';

                // Create the progress bar using the enhanced ProgressBar component
                this.progressBar = new ProgressBar({
                    initialValue: 0,
                    container: this.expandProgressContainer,
                    showText: true,
                    theme: 'primary',
                    size: 'normal'  // can be 'small', 'normal', or 'large'
                });

                // Set initial text
                this.progressBar.setValue(0, `Expanding 0 of ${totalButtons}`);
            }

            let expanded = 0;
            let errors = 0;

            // Process buttons one at a time
            for (const button of allExpandButtons) {
                try {
                    // Update progress bar with current status
                    if (this.progressBar) {
                        // Calculate percentage
                        const progress = Math.floor((expanded / totalButtons) * 100);

                        // Update progress bar with custom text
                        this.progressBar.setValue(
                            progress,
                            `Expanding ${expanded + 1} of ${totalButtons}`
                        );
                    }

                    // Click the button to expand
                    button.click();

                    // Wait for the specified delay
                    await new Promise(resolve => setTimeout(resolve, delay));

                    expanded++;
                } catch (error) {
                    Logger.error(error, "Expanding description in sequence");
                    errors++;
                }
            }

            // Update UI when finished
            if (this.progressBar) {
                // Set to 100% complete
                this.progressBar.setValue(100);

                // Change theme based on success or errors
                this.progressBar.setTheme(errors > 0 ? 'warning' : 'success');

                // Update the text with completion message
                const completionText = `Expanded ${expanded} of ${totalButtons}` +
                    (errors > 0 ? ` (${errors} errors)` : '');
                this.progressBar.setValue(100, completionText);
            }

            // Re-enable the button after 2 seconds
            setTimeout(() => {
                if (expandAllButton) expandAllButton.disabled = false;

                // Hide progress after 5 seconds
                setTimeout(() => {
                    if (this.expandProgressContainer) {
                        this.expandProgressContainer.style.display = 'none';

                        // Clean up the progress bar instance
                        if (this.progressBar) {
                            this.progressBar.destroy();
                            this.progressBar = null;
                        }
                    }
                }, 3000);
            }, 2000);
        }

        /**
         * Get the listing element that contains the button
         */
        static getListingFromButton(button) {
            // Traverse up to find the listing container
            let element = button;

            // Check SELECTORS.ITEM_CARDS selectors to find which one matches
            for (let i = 0; i < 10; i++) {  // Limit to 10 levels to avoid infinite loop
                element = element.parentElement;

                if (!element) break;

                const matchesSelector = SELECTORS.ITEM_CARDS.some(selector => {
                    // Remove the prefix if it's a child selector
                    const simpleSelector = selector.includes(' ')
                        ? selector.split(' ').pop()
                        : selector;

                    return element.matches(simpleSelector);
                });

                if (matchesSelector) return element;
            }

            return null;
        }

        /**
         * Show a message in the expand all section
         */
        static showExpandAllMessage(message) {
            const expandAllButton = document.querySelector('.expand-all-button');
            if (expandAllButton) {
                const originalText = expandAllButton.textContent;
                expandAllButton.textContent = message;

                setTimeout(() => {
                    expandAllButton.textContent = originalText;
                }, 2000);
            }
        }

        /**
         * Create the filter section
         */
        static createFilterSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isFilterSectionExpanded', true);

            this.togglers.filter = new SectionToggler({
                container,
                sectionClass: 'filter',
                title: TranslationManager.getText('filterUnwantedWords'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isFilterSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Filter input
                    this.filterInputElement = document.createElement('input');
                    this.filterInputElement.className = 'filter-input';
                    this.filterInputElement.placeholder = TranslationManager.getText('example');

                    // Add enter key listener
                    this.filterInputElement.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.addBlockedTerm();
                        }
                    });

                    content.appendChild(this.filterInputElement);

                    // Apply button
                    const applyButton = this.createButton(
                        TranslationManager.getText('addAndApply'),
                        'panel-button filter-apply',
                        () => this.addBlockedTerm()
                    );
                    content.appendChild(applyButton);

                    // Create list for blocked terms
                    this.blockedTermsListElement = document.createElement('div');
                    this.blockedTermsListElement.className = 'blocked-terms-list';
                    content.appendChild(this.blockedTermsListElement);
                }
            });

            return this.togglers.filter.section;
        }

        /**
         * Update format options display based on the selected format
         * @param {FormatOption} format - The selected format
         * @param {HTMLElement} container - The container for options
         */
        static updateFormatOptions(format, container) {
            // Clear existing options
            container.innerHTML = '';

            // If no options, hide the container
            if (!format.options || format.options.length === 0) {
                container.style.display = 'none';
                return;
            }

            // Show the container
            container.style.display = 'block';

            // Create a label
            const optionsLabel = document.createElement('div');
            optionsLabel.className = 'format-options-label';
            optionsLabel.textContent = 'Format Options:';
            container.appendChild(optionsLabel);

            // Create options using Checkbox component
            format.options.forEach(option => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';

                // Create checkbox using the Checkbox component
                new Checkbox({
                    id: `option-${format.id}-${option.id}`,
                    label: option.label,
                    checked: option.defaultValue || false,
                    container: optionRow,
                    size: 'small',
                    attributes: {
                        title: option.description || ''
                    },
                    onChange: (e) => {
                        format.setOption(option.id, e.target.checked);
                    }
                });

                container.appendChild(optionRow);
            });
        }

        /**
         * Create the copy section
         */
        static createCopySection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isCopySectionExpanded', true);

            // Load the last selected format
            let lastSelectedFormat = this.loadExportFormat();

            this.togglers.copy = new SectionToggler({
                container,
                sectionClass: 'export',
                title: TranslationManager.getText('exportDescriptions'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isCopySectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Convert export formats to SelectBox items format
                    const selectItems = [];

                    // Process each category
                    Object.entries(this.exportFormats).forEach(([categoryId, category]) => {
                        // Create a category item with nested formats
                        const categoryItems = {
                            label: category.label,
                            items: []
                        };

                        // Add formats to this category
                        Object.entries(category.formats).forEach(([formatId, format]) => {
                            categoryItems.items.push({
                                value: `${categoryId}:${formatId}`,
                                label: format.label,
                                // Select this format if it matches last saved format
                                selected: lastSelectedFormat &&
                                    lastSelectedFormat.category === categoryId &&
                                    lastSelectedFormat.id === formatId
                            });
                        });

                        selectItems.push(categoryItems);
                    });

                    // Create format selector using SelectBox
                    const formatSelectorContainer = document.createElement('div');
                    formatSelectorContainer.className = 'format-selector-container';
                    content.appendChild(formatSelectorContainer);

                    // Initialize SelectBox
                    this.formatSelector = new SelectBox({
                        items: selectItems,
                        name: 'export-format',
                        id: 'export-format-select',
                        placeholder: TranslationManager.getText('selectFormat'),
                        container: formatSelectorContainer,
                        theme: 'default',
                        size: 'medium',
                        useCategorizedUI: true,
                        onChange: (value) => {
                            // Parse the value (category:formatId)
                            const [categoryId, formatId] = value.split(':');

                            // Save the selected format
                            this.saveExportFormat(formatId, categoryId);

                            // Store current selected format for use in export functions
                            window.currentSelectedFormat = this.exportFormats[categoryId].formats[formatId];
                        }
                    });

                    const formatOptionsContainer = document.createElement('div');
                    formatOptionsContainer.className = 'format-options-container';
                    formatOptionsContainer.style.display = 'none'; // Hide initially
                    content.appendChild(formatOptionsContainer);

                    // Update when format changes
                    this.formatSelector.onChange = (value) => {
                        // Parse the value (category:formatId)
                        const [categoryId, formatId] = value.split(':');

                        // Save the selected format
                        this.saveExportFormat(formatId, categoryId);

                        // Get the format
                        const format = this.exportFormats[categoryId].formats[formatId];
                        window.currentSelectedFormat = format;

                        // Update options display
                        this.updateFormatOptions(format, formatOptionsContainer);
                    };

                    // Create export buttons container
                    const exportButtonsContainer = document.createElement('div');
                    exportButtonsContainer.className = 'export-buttons-container';

                    // Copy button
                    const copyButton = this.createButton(
                        TranslationManager.getText('copyToClipboard'),
                        'export-button',
                        () => this.copyToClipboard()
                    );
                    copyButton.style.flex = '1';

                    // Download button
                    const downloadButton = this.createButton(
                        TranslationManager.getText('downloadFile'),
                        'export-button',
                        () => this.downloadFormatted()
                    );
                    downloadButton.style.flex = '1';

                    exportButtonsContainer.appendChild(copyButton);
                    exportButtonsContainer.appendChild(downloadButton);
                    content.appendChild(exportButtonsContainer);

                    content.insertBefore(formatOptionsContainer, exportButtonsContainer);

                    const handleFormatSelection = (value) => {
                        // Parse the value (category:formatId)
                        const [categoryId, formatId] = value.split(':');

                        // Save the selected format
                        this.saveExportFormat(formatId, categoryId);

                        // Get the format
                        const format = this.exportFormats[categoryId].formats[formatId];
                        window.currentSelectedFormat = format;

                        // Update options display
                        this.updateFormatOptions(format, formatOptionsContainer);
                    };

                    if (lastSelectedFormat) {
                        // Get currently selected value from select box
                        const selectedValue = this.formatSelector.getValue();
                        if (selectedValue) {
                            handleFormatSelection(selectedValue);
                        }
                    }

                    // Create clear button
                    const clearButton = this.createButton(
                        TranslationManager.getText('clearAll'),
                        'panel-button copy-clear',
                        () => {
                            DescriptionManager.clearItems();
                            this.showCopySuccess(clearButton, TranslationManager.getText('cleared'));
                        }
                    );
                    content.appendChild(clearButton);
                }
            });

            return this.togglers.copy.section;
        }

        /**
         * Copy formatted data to clipboard
         */
        static copyToClipboard() {
            // Get the currently selected format
            const selectedFormat = window.currentSelectedFormat;
            if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
                // No format selected or no data to export
                return;
            }

            Logger.log(`Copying data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

            // Get the formatter based on the selected format
            const formatter = this.getFormatter(selectedFormat);
            if (!formatter) {
                Logger.log("No formatter available for", selectedFormat.id);
                return;
            }

            // Format the data
            const formattedData = formatter(DescriptionManager.expandedItems, selectedFormat.getOptions());

            // Copy to clipboard
            if (formattedData) {
                GM_setClipboard(formattedData);

                // Visual feedback
                const copyButton = document.querySelector('.export-buttons-container .export-button');
                if (copyButton) {
                    this.showCopySuccess(copyButton, TranslationManager.getText('copied'));
                }
            }
        }

        /**
         * Download formatted data as a file
         */
        static downloadFormatted() {
            // Get the currently selected format
            const selectedFormat = window.currentSelectedFormat;
            if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
                // No format selected or no data to export
                return;
            }

            Logger.log(`Downloading data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

            // Get the formatter based on the selected format
            const formatter = this.getFormatter(selectedFormat);
            if (!formatter) {
                Logger.log("No formatter available for", selectedFormat.id);
                return;
            }

            // Format the data
            const formattedData = formatter(DescriptionManager.expandedItems, selectedFormat.getOptions());

            if (formattedData) {
                // Get file extension and mime type
                const {extension, mimeType} = this.getFileInfo(selectedFormat.id);

                // Create filename
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const filename = `wallapop-export-${timestamp}.${extension}`;

                // Download the file
                this.downloadFile(formattedData, filename, mimeType);

                // Visual feedback
                const downloadButton = document.querySelectorAll('.export-buttons-container .export-button')[1];
                if (downloadButton) {
                    this.showCopySuccess(downloadButton, TranslationManager.getText('downloaded'));
                }
            }
        }

        static saveExportFormat(formatId, categoryId) {
            try {
                localStorage.setItem('wallapop-export-format', JSON.stringify({id: formatId, category: categoryId}));
                Logger.log(`Export format saved: ${formatId} (${categoryId})`);
            } catch (error) {
                Logger.error(error, "Saving export format");
            }
        }

        static loadExportFormat() {
            try {
                const savedFormat = localStorage.getItem('wallapop-export-format');
                if (savedFormat) {
                    const format = JSON.parse(savedFormat);
                    Logger.log(`Export format loaded: ${format.id} (${format.category})`);
                    return format;
                }
            } catch (error) {
                Logger.error(error, "Loading export format");
            }
            return null;
        }

        static getFormatter(format) {
            // Map of format IDs to formatter functions
            const formatters = {
                // Text formats
                'plain': this.formatAsPlainText,
                'markdown': this.formatAsMarkdown,
                'html': this.formatAsHtml,

                // Data formats
                'json': this.formatAsJson,
                'csv': this.formatAsCsv,
                'tsv': this.formatAsTsv,
                'xml': this.formatAsXml,

                // Spreadsheet formats
                'excel-csv': this.formatAsExcelCsv,
                'excel-xml': this.formatAsExcelXml
            };

            return formatters[format.id];
        }

        /**
         * JavaScript implementation for select box delivery method filter
         */
        static createDeliveryMethodSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isDeliveryMethodSectionExpanded', true);

            this.togglers.deliveryMethod = new SectionToggler({
                container,
                sectionClass: 'delivery-method',
                title: TranslationManager.getText('deliveryMethodFilter'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isDeliveryMethodSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create select element
                    new SelectBox({
                        items: [
                            {
                                value: 'all',
                                label: TranslationManager.getText('showAll'),
                                selected: this.loadPanelState('deliveryMethodFilter', 'all') === 'all'
                            },
                            {value: 'shipping', label: TranslationManager.getText('showOnlyShipping')},
                            {value: 'inperson', label: TranslationManager.getText('showOnlyInPerson')}
                        ],
                        name: 'delivery-method',
                        id: 'delivery-method-select',
                        container: content, // the container passed to the contentCreator callback
                        onChange: (value, event) => {
                            this.savePanelState('deliveryMethodFilter', value);
                            this.applyDeliveryMethodFilter();
                        },
                        theme: 'default', // or set a different theme if needed
                        size: 'medium',
                        placeholder: TranslationManager.getText('selectDeliveryMethod') // Make sure to add this key in translations if required
                    });
                }
            });

            return this.togglers.deliveryMethod.section;
        }

        /**
         * Apply delivery method filter
         */
        static applyDeliveryMethodFilter() {
            Logger.log("Applying delivery method filter");

            const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
            const allListings = document.querySelectorAll(allSelectors);

            // Get current filter value
            const filterValue = this.loadPanelState('deliveryMethodFilter', 'all');

            if (filterValue === 'all') {
                // Show all listings (that aren't hidden by other filters)
                allListings.forEach(listing => {
                    if (!this.shouldHideListing(listing)) {
                        this.showListing(listing);
                    }
                });
                return;
            }

            let hiddenCount = 0;

            allListings.forEach(listing => {
                // First check if it should be hidden by the keyword filter
                if (this.shouldHideListing(listing)) {
                    this.hideListing(listing);
                    hiddenCount++;
                    return;
                }

                // Then check delivery method
                const deliveryMethod = this.getDeliveryMethod(listing);

                if (
                    (filterValue === 'shipping' && deliveryMethod !== 'shipping') ||
                    (filterValue === 'inperson' && deliveryMethod !== 'inperson')
                ) {
                    this.hideListing(listing);
                    hiddenCount++;
                } else {
                    this.showListing(listing);
                }
            });

            Logger.log(`Delivery method filter applied: ${hiddenCount} listings hidden out of ${allListings.length}`);
        }

        /**
         * Detect the delivery method of a listing
         * @param {HTMLElement} listing - The listing element
         * @returns {string} 'shipping', 'inperson', or 'unknown'
         */
        static getDeliveryMethod(listing) {

            // Look for shadow roots and badge elements within them
            const shadowRoots = [];
            const findShadowRoots = (element) => {
                if (element.shadowRoot) {
                    shadowRoots.push(element.shadowRoot);
                }
                Array.from(element.children).forEach(findShadowRoots);
            };
            findShadowRoots(listing);

            // Check for shipping badge in shadow DOM
            const hasShippingBadge = shadowRoots.some(root =>
                root.querySelector('.wallapop-badge--shippingAvailable') !== null ||
                root.querySelector('[class*="wallapop-badge"][class*="shippingAvailable"]') !== null
            );

            // Check for in-person badge in shadow DOM
            const hasInPersonBadge = shadowRoots.some(root =>
                root.querySelector('.wallapop-badge--faceToFace') !== null ||
                root.querySelector('[class*="wallapop-badge"][class*="faceToFace"]') !== null
            );

            // Text fallback as a last resort
            const shippingText = listing.textContent.includes('Envío disponible');
            const inPersonText = listing.textContent.includes('Sólo venta en persona') ||
                listing.textContent.includes('Solo venta en persona');

            // Determine delivery method
            if (hasShippingBadge || (!hasInPersonBadge && shippingText)) {
                return 'shipping';
            } else if (hasInPersonBadge || inPersonText) {
                return 'inperson';
            } else {
                // Add additional fallback based on HTML structure
                // Check if there's an icon that might indicate shipping or in-person
                const hasShippingIcon = shadowRoots.some(root =>
                    root.querySelector('walla-icon[class*="shipping"]') !== null
                );
                const hasInPersonIcon = shadowRoots.some(root =>
                    root.querySelector('walla-icon[class*="faceToFace"]') !== null
                );

                if (hasShippingIcon) {
                    return 'shipping';
                } else if (hasInPersonIcon) {
                    return 'inperson';
                }

                Logger.log("Unknown delivery method for listing:", listing);
                return 'unknown';
            }
        }

        static formatAsPlainText(items, options) {
            // Simple plain text formatter
            let result = '';

            items.forEach((item, index) => {
                result += `== ${item.title} ==\n`;
                result += `Price: ${item.price || 'N/A'}\n`;
                result += `Description: ${item.description}\n`;

                // Add images if option is enabled
                if (options['include-images'] && item.images && item.images.length > 0) {
                    result += 'Images:\n';
                    item.images.forEach(img => {
                        result += `- ${img}\n`;
                    });
                }

                result += `URL: ${item.url}\n`;

                // Add separator between items
                if (index < items.length - 1) {
                    result += '\n--------------------------------------------------\n\n';
                }
            });

            return result;
        }

        static formatAsMarkdown(items, options) {
            // Markdown formatter
            let result = '';

            items.forEach((item, index) => {
                // Add frontmatter if option is enabled
                if (options['use-frontmatter']) {
                    result += '---\n';
                    result += `title: "${item.title.replace(/"/g, '\\"')}"\n`;
                    result += `price: "${item.price || 'N/A'}"\n`;
                    result += `url: "${item.url}"\n`;

                    if (options['include-images'] && item.images && item.images.length > 0) {
                        result += 'images:\n';
                        item.images.forEach(img => {
                            result += `  - ${img}\n`;
                        });
                    }

                    result += '---\n\n';
                }

                // Add title and details
                result += `# ${item.title}\n\n`;
                result += `**Price:** ${item.price || 'N/A'}\n\n`;
                result += `## Description\n\n${item.description}\n\n`;

                // Add images if option is enabled
                if (options['include-images'] && item.images && item.images.length > 0) {
                    result += '## Images\n\n';
                    item.images.forEach(img => {
                        result += `![${item.title}](${img})\n\n`;
                    });
                }

                result += `**URL:** [${item.title}](${item.url})\n\n`;

                // Add separator between items
                if (index < items.length - 1) {
                    result += '---\n\n';
                }
            });

            return result;
        }

        static formatAsJson(items, options) {
            // Filter out image URLs if not needed
            const processedItems = items.map(item => {
                const processedItem = {...item};

                // Remove images if option is disabled
                if (!options['include-images']) {
                    delete processedItem.images;
                }

                return processedItem;
            });

            // Pretty print or compact JSON
            if (options['pretty-print']) {
                return JSON.stringify(processedItems, null, 2);
            } else {
                return JSON.stringify(processedItems);
            }
        }

        static formatAsCsv(items, options) {
            // Determine columns
            const columns = ['title', 'price', 'description', 'url'];

            // Add images column if needed
            if (options['include-images']) {
                columns.push('images');
            }

            // Start building CSV
            let csv = '';

            // Add headers if option is enabled
            if (options['include-headers']) {
                csv += columns.map(col => `"${col}"`).join(',') + '\n';
            }

            // Add data rows
            items.forEach(item => {
                const row = columns.map(column => {
                    if (column === 'images') {
                        // Join multiple image URLs with pipe character if they exist
                        return item.images && item.images.length > 0
                            ? `"${item.images.join('|')}"`
                            : '""';
                    } else {
                        // Escape double quotes and wrap values in quotes
                        const value = item[column] !== undefined ? String(item[column]) : '';
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                });

                csv += row.join(',') + '\n';
            });

            return csv;
        }

        static formatAsTsv(items, options) {
            // Determine columns
            const columns = ['title', 'price', 'description', 'url'];

            // Add images column if needed
            if (options['include-images']) {
                columns.push('images');
            }

            // Start building TSV
            let tsv = '';

            // Add headers if option is enabled
            if (options['include-headers']) {
                tsv += columns.join('\t') + '\n';
            }

            // Add data rows
            items.forEach(item => {
                const row = columns.map(column => {
                    if (column === 'images') {
                        // Join multiple image URLs with pipe character if they exist
                        return item.images && item.images.length > 0
                            ? item.images.join('|')
                            : '';
                    } else {
                        // Replace tabs with spaces for TSV compatibility
                        const value = item[column] !== undefined ? String(item[column]) : '';
                        return value.replace(/\t/g, ' ');
                    }
                });

                tsv += row.join('\t') + '\n';
            });

            return tsv;
        }

        static formatAsHtml(items, options) {
            // HTML formatter
            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallapop Item Descriptions</title>`;

            // Add CSS if option is enabled
            if (options['include-styles']) {
                html += `
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .item {
            margin-bottom: 40px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-title {
            font-size: 24px;
            margin: 0 0 10px 0;
            color: #008080;
        }
        .item-price {
            font-size: 18px;
            font-weight: bold;
            color: #e64a19;
            margin: 0 0 15px 0;
        }
        .item-description {
            margin-bottom: 15px;
            white-space: pre-wrap;
        }
        .item-url {
            display: inline-block;
            margin-top: 10px;
            color: #0277bd;
            text-decoration: none;
        }
        .item-url:hover {
            text-decoration: underline;
        }
        .item-images {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .item-image {
            max-width: 200px;
            max-height: 200px;
            object-fit: contain;
            border: 1px solid #ddd;
        }
        h2 {
            color: #555;
            font-size: 18px;
            margin: 20px 0 10px 0;
        }
    </style>`;
            }

            html += `
</head>
<body>
    <h1>Wallapop Item Descriptions</h1>`;

            // Add items
            items.forEach(item => {
                html += `
    <div class="item">
        <h2 class="item-title">${this.escapeHtml(item.title)}</h2>
        <div class="item-price">Price: ${this.escapeHtml(item.price || 'N/A')}</div>
        <div class="item-description">${this.escapeHtml(item.description)}</div>`;

                // Add images if option is enabled
                if (options['include-images'] && item.images && item.images.length > 0) {
                    html += `
        <div class="item-images">`;

                    item.images.forEach(img => {
                        html += `
            <img class="item-image" src="${this.escapeHtml(img)}" alt="${this.escapeHtml(item.title)}" />`;
                    });

                    html += `
        </div>`;
                }

                html += `
        <a class="item-url" href="${this.escapeHtml(item.url)}" target="_blank">View on Wallapop</a>
    </div>`;
            });

            html += `
</body>
</html>`;

            return html;
        }

        static formatAsXml(items, options) {
            // XML formatter
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';

            // Add items
            items.forEach(item => {
                xml += '  <item>\n';
                xml += `    <title>${this.escapeXml(item.title)}</title>\n`;
                xml += `    <price>${this.escapeXml(item.price || 'N/A')}</price>\n`;
                xml += `    <description>${this.escapeXml(item.description)}</description>\n`;
                xml += `    <url>${this.escapeXml(item.url)}</url>\n`;

                // Add images if option is enabled
                if (options['include-images'] && item.images && item.images.length > 0) {
                    xml += '    <images>\n';

                    item.images.forEach(img => {
                        xml += `      <image>${this.escapeXml(img)}</image>\n`;
                    });

                    xml += '    </images>\n';
                }

                xml += '  </item>\n';
            });

            xml += '</items>';

            // Format XML with indentation if pretty print is enabled
            if (!options['pretty-print']) {
                // Remove line breaks and extra spaces if pretty print is disabled
                xml = xml.replace(/\n\s*/g, '');
            }

            return xml;
        }

        static formatAsExcelCsv(items, options) {
            // Excel-friendly CSV (uses semicolons as separators in some regions)
            // Determine columns
            const columns = ['title', 'price', 'description', 'url'];

            // Add images column if needed
            if (options['include-images']) {
                columns.push('images');
            }

            // Start building CSV
            let csv = '';

            // Add BOM for Excel
            const bom = '\uFEFF';
            csv += bom;

            // Add headers if option is enabled
            if (options['include-headers']) {
                csv += columns.map(col => `"${col}"`).join(';') + '\n';
            }

            // Add data rows
            items.forEach(item => {
                const row = columns.map(column => {
                    if (column === 'images') {
                        // Join multiple image URLs with pipe character if they exist
                        return item.images && item.images.length > 0
                            ? `"${item.images.join('|')}"`
                            : '""';
                    } else {
                        // Escape double quotes and wrap values in quotes
                        const value = item[column] !== undefined ? String(item[column]) : '';
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                });

                csv += row.join(';') + '\n';
            });

            return csv;
        }

        static formatAsExcelXml(items, options) {
            // Excel XML format
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<?mso-application progid="Excel.Sheet"?>\n';
            xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
            xml += '  xmlns:o="urn:schemas-microsoft-com:office:office"\n';
            xml += '  xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
            xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
            xml += '  xmlns:html="http://www.w3.org/TR/REC-html40">\n';
            xml += '  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
            xml += '    <Title>Wallapop Items Export</Title>\n';
            xml += '    <Author>Wallapop Expand Description</Author>\n';
            xml += '    <Created>' + new Date().toISOString() + '</Created>\n';
            xml += '  </DocumentProperties>\n';
            xml += '  <Styles>\n';
            xml += '    <Style ss:ID="Default" ss:Name="Normal">\n';
            xml += '      <Alignment ss:Vertical="Top"/>\n';
            xml += '      <Borders/>\n';
            xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>\n';
            xml += '      <Interior/>\n';
            xml += '      <NumberFormat/>\n';
            xml += '      <Protection/>\n';
            xml += '    </Style>\n';
            xml += '    <Style ss:ID="Header">\n';
            xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>\n';
            xml += '      <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/>\n';
            xml += '    </Style>\n';
            xml += '  </Styles>\n';
            xml += '  <Worksheet ss:Name="Wallapop Items">\n';
            xml += '    <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="' + (items.length + 1) + '" x:FullColumns="1" x:FullRows="1">\n';

            // Define columns
            const columns = ['title', 'price', 'description', 'url'];
            if (options['include-images']) {
                columns.push('images');
            }

            // Set column widths
            xml += '      <Column ss:Width="150"/>\n'; // Title
            xml += '      <Column ss:Width="80"/>\n';  // Price
            xml += '      <Column ss:Width="250"/>\n'; // Description
            xml += '      <Column ss:Width="150"/>\n'; // URL
            if (options['include-images']) {
                xml += '      <Column ss:Width="250"/>\n'; // Images
            }

            // Add headers if option is enabled
            if (options['include-headers']) {
                xml += '      <Row ss:StyleID="Header">\n';

                columns.forEach(column => {
                    xml += '        <Cell><Data ss:Type="String">' + column + '</Data></Cell>\n';
                });

                xml += '      </Row>\n';
            }

            // Add data rows
            items.forEach(item => {
                xml += '      <Row>\n';

                columns.forEach(column => {
                    let value = '';

                    if (column === 'images') {
                        // Join multiple image URLs with pipe character if they exist
                        value = item.images && item.images.length > 0
                            ? item.images.join('|')
                            : '';
                    } else {
                        value = item[column] !== undefined ? String(item[column]) : '';
                    }

                    xml += '        <Cell><Data ss:Type="String">' + this.escapeXml(value) + '</Data></Cell>\n';
                });

                xml += '      </Row>\n';
            });

            xml += '    </Table>\n';
            xml += '    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
            xml += '      <PageSetup>\n';
            xml += '        <Layout x:Orientation="Landscape"/>\n';
            xml += '        <Header x:Margin="0.3"/>\n';
            xml += '        <Footer x:Margin="0.3"/>\n';
            xml += '        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
            xml += '      </PageSetup>\n';
            xml += '      <Print>\n';
            xml += '        <ValidPrinterInfo/>\n';
            xml += '        <HorizontalResolution>600</HorizontalResolution>\n';
            xml += '        <VerticalResolution>600</VerticalResolution>\n';
            xml += '      </Print>\n';
            xml += '      <Selected/>\n';
            xml += '      <Panes>\n';
            xml += '        <Pane>\n';
            xml += '          <Number>3</Number>\n';
            xml += '          <ActiveRow>1</ActiveRow>\n';
            xml += '          <ActiveCol>0</ActiveCol>\n';
            xml += '        </Pane>\n';
            xml += '      </Panes>\n';
            xml += '      <ProtectObjects>False</ProtectObjects>\n';
            xml += '      <ProtectScenarios>False</ProtectScenarios>\n';
            xml += '    </WorksheetOptions>\n';
            xml += '  </Worksheet>\n';
            xml += '</Workbook>';

            return xml;
        }

        // Helper methods for HTML and XML escaping
        static escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        static escapeXml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        /**
         * Create the language section
         */
        /**
         * Create the language section using Button component with CSS styling
         */
        static createLanguageSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isLanguageSectionExpanded', true);

            this.togglers.language = new SectionToggler({
                container,
                sectionClass: 'language',
                title: TranslationManager.getText('languageSettings'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isLanguageSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create language selector
                    const languageSelector = document.createElement('div');
                    languageSelector.className = 'language-selector';

                    // Add language options using Button component
                    Object.entries(TranslationManager.availableLanguages).forEach(([code, name]) => {
                        const isActive = code === TranslationManager.currentLanguage;

                        // Use Button component with CSS class for styling
                        const langButton = this.createButton(
                            name,
                            `lang-button ${isActive ? 'active' : ''}`,
                            () => {
                                if (TranslationManager.setLanguage(code)) {
                                    // Update all language buttons' active state
                                    document.querySelectorAll('.lang-button').forEach(btn => {
                                        const btnCode = btn.dataset.lang;
                                        if (btnCode === code) {
                                            btn.classList.add('active');
                                        } else {
                                            btn.classList.remove('active');
                                        }
                                    });

                                    // Update all text in the UI
                                    this.updateUILanguage();
                                    return true;
                                }
                                return false;
                            },
                            {
                                container: languageSelector,
                                preserveStyles: true // Use our custom option to preserve CSS classes
                            }
                        );

                        // Add dataset attribute for language code
                        langButton.dataset.lang = code;
                    });

                    content.appendChild(languageSelector);
                }
            });

            return this.togglers.language.section;
        }

        /**
         * Create the main control panel
         */
        static createControlPanel() {
            // Create control panel if it doesn't exist
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'control-panel';

                // Load panel expanded state
                const isPanelExpanded = this.loadPanelState('isPanelExpanded', true);

                // Create panel content container
                const contentContainer = document.createElement('div');
                contentContainer.className = 'panel-content';
                // Create panel toggler (header)
                this.togglers.panel = new SectionToggler({
                    customClassName: 'panel',
                    title: TranslationManager.getText('wallapopTools'),
                    isExpanded: isPanelExpanded,
                    onToggle: (state) => {
                        this.savePanelState('isPanelExpanded', state);
                        // Unlike other togglers, we need to manually toggle content visibility
                        // since we're using header + separate content container
                        if (state) {
                            contentContainer.classList.remove('collapsed');
                        } else {
                            contentContainer.classList.add('collapsed');
                        }
                    }
                });

                // Apply initial collapsed state if needed
                if (!isPanelExpanded) {
                    contentContainer.classList.add('collapsed');
                }

                // Add all sections to content container, including the new Expand All section
                this.createExpandAllSection(contentContainer); // Add the new Expand All section first
                this.createFilterSection(contentContainer);
                this.createDeliveryMethodSection(contentContainer);
                this.createCopySection(contentContainer);
                this.createLanguageSection(contentContainer);

                // Add content container to main container
                this.container.appendChild(contentContainer);
                document.body.appendChild(this.container);

                // Apply initial state
                this.updateUILanguage();
                this.loadBlockedTerms();

                Logger.log("Control panel created with SectionToggler");
            }
        }

        /**
         * Load blocked terms from localStorage
         */
        static loadBlockedTerms() {
            try {
                const savedTerms = localStorage.getItem('wallapop-blocked-terms');
                if (savedTerms) {
                    this.blockedTerms = JSON.parse(savedTerms);
                    this.updateBlockedTermsList();
                    Logger.log("Blocked terms loaded:", this.blockedTerms);
                }
            } catch (error) {
                Logger.error(error, "Loading blocked terms");
                // Initialize with empty array if there's an error
                this.blockedTerms = [];
            }
        }

        /**
         * Save blocked terms to localStorage
         */
        static saveBlockedTerms() {
            try {
                localStorage.setItem('wallapop-blocked-terms', JSON.stringify(this.blockedTerms));
                Logger.log("Blocked terms saved to localStorage");
            } catch (error) {
                Logger.error(error, "Saving blocked terms");
            }
        }

        /**
         * Load blocked terms from localStorage
         */
        static loadBlockedTerms() {
            try {
                const savedTerms = localStorage.getItem('wallapop-blocked-terms');
                if (savedTerms) {
                    this.blockedTerms = JSON.parse(savedTerms);
                    this.updateBlockedTermsList();
                    Logger.log("Blocked terms loaded:", this.blockedTerms);
                }
            } catch (error) {
                Logger.error(error, "Loading blocked terms");
                // Initialize with empty array if there's an error
                this.blockedTerms = [];
            }
        }

        /**
         * Save blocked terms to localStorage
         */
        static saveBlockedTerms() {
            try {
                localStorage.setItem('wallapop-blocked-terms', JSON.stringify(this.blockedTerms));
                Logger.log("Blocked terms saved to localStorage");
            } catch (error) {
                Logger.error(error, "Saving blocked terms");
            }
        }

        /**
         * Update the list of blocked terms in the UI
         */
        static updateBlockedTermsList() {
            if (this.blockedTermsListElement) {
                this.blockedTermsListElement.innerHTML = '';

                if (this.blockedTerms.length === 0) {
                    this.renderNoBlockedTermsMessage();
                } else {
                    this.renderBlockedTermsList();
                }
            }
        }

        /**
         * Render message when no terms are blocked
         */
        static renderNoBlockedTermsMessage() {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
            emptyMessage.style.fontStyle = 'italic';
            emptyMessage.style.color = '#888';
            emptyMessage.style.padding = '8px 0';
            emptyMessage.style.opacity = '0';
            this.blockedTermsListElement.appendChild(emptyMessage);

            // Fade in animation
            setTimeout(() => {
                emptyMessage.style.transition = 'opacity 0.3s ease-in-out';
                emptyMessage.style.opacity = '1';
            }, 10);
        }

        /**
         * Render the list of blocked terms
         */
        static renderBlockedTermsList() {
            this.blockedTerms.forEach((term, index) => {
                const termItem = document.createElement('div');
                termItem.className = 'blocked-term-item';
                termItem.style.opacity = '0';
                termItem.style.transform = 'translateY(-10px)';

                const termText = document.createElement('span');
                termText.textContent = term;
                termItem.appendChild(termText);

                const removeButton = document.createElement('button');
                removeButton.className = 'remove-term';
                removeButton.textContent = '×';
                removeButton.title = TranslationManager.getText('remove');
                removeButton.addEventListener('click', () => {
                    termItem.classList.add('fadeOutAnimation');
                    setTimeout(() => this.removeBlockedTerm(term), 300);
                });
                termItem.appendChild(removeButton);

                this.blockedTermsListElement.appendChild(termItem);

                // Staggered fade in animation
                setTimeout(() => {
                    termItem.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
                    termItem.style.opacity = '1';
                    termItem.style.transform = 'translateY(0)';
                }, 50 * index);
            });
        }

        /**
         * Apply filters to all listings
         */
        static applyFilters() {
            Logger.log("Applying all filters to listings");

            // Apply keyword filters
            const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
            const allListings = document.querySelectorAll(allSelectors);

            let hiddenCount = 0;

            allListings.forEach(listing => {
                if (this.shouldHideListing(listing)) {
                    this.hideListing(listing);
                    hiddenCount++;
                } else {
                    this.showListing(listing);
                }
            });

            Logger.log(`Keyword filter applied: ${hiddenCount} listings hidden out of ${allListings.length}`);

            // Then apply delivery method filter
            this.applyDeliveryMethodFilter();
        }

        /**
         * Update panel visibility based on whether there are expanded descriptions
         */
        static updatePanelVisibility() {
            const copySection = this.container.querySelector('.copy-section');
            if (copySection) {
                copySection.style.display =
                    DescriptionManager.expandedItems.length > 0 ? 'block' : 'none';
            }
        }

        /**
         * Show success animation on a button
         */
        static showCopySuccess(button, successText) {
            const originalText = button.textContent;
            button.textContent = successText || TranslationManager.getText('copied');
            button.classList.add('copy-success');

            setTimeout(() => {
                button.classList.remove('copy-success');
                button.textContent = originalText;
            }, 1500);
        }

        /**
         * Determine if a listing should be hidden based on blocked terms
         */
        static shouldHideListing(listing) {
            if (this.blockedTerms.length === 0) {
                return false;
            }

            // Get all text content from the listing
            const listingText = listing.textContent.toLowerCase();

            // Check if any blocked term is in the listing
            return this.blockedTerms.some(term => listingText.includes(term.toLowerCase()));
        }

        /**
         * Hide a listing with animation
         */
        static hideListing(listing) {
            if (!listing.classList.contains('hidden-item')) {
                listing.classList.add('hiding-animation');
                setTimeout(() => {
                    listing.classList.add('hidden-item');
                    listing.classList.remove('hiding-animation');
                }, 500);
            }
        }

        /**
         * Show a previously hidden listing with animation
         */
        static showListing(listing) {
            if (listing.classList.contains('hidden-item')) {
                listing.classList.remove('hidden-item');
                listing.style.opacity = 0;
                listing.style.transform = 'translateY(-10px)';

                setTimeout(() => {
                    listing.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
                    listing.style.opacity = 1;
                    listing.style.transform = 'translateY(0)';

                    // Clean up after animation
                    setTimeout(() => {
                        listing.style.transition = '';
                    }, 500);
                }, 10);
            }
        }

        /**
         * Add a blocked term from the input field
         */
        static addBlockedTerm() {
            const term = this.filterInputElement.value.trim().toLowerCase();

            if (term && !this.blockedTerms.includes(term)) {
                this.blockedTerms.push(term);
                this.saveBlockedTerms();
                this.updateBlockedTermsList();
                this.filterInputElement.value = '';

                // Re-apply filters to all listings
                this.applyFilters();

                Logger.log("Blocked term added:", term);
            }
        }

        /**
         * Remove a blocked term
         */
        static removeBlockedTerm(term) {
            const index = this.blockedTerms.indexOf(term);
            if (index > -1) {
                this.blockedTerms.splice(index, 1);
                this.saveBlockedTerms();
                this.updateBlockedTermsList();

                // Re-apply filters to all listings
                this.applyFilters();

                Logger.log("Blocked term removed:", term);
            }
        }

        /**
         * Save a specific panel state to localStorage
         */
        static savePanelState(key, value) {
            try {
                // Get existing states or create new object
                let states = {};
                try {
                    const savedStates = localStorage.getItem('wallapop-panel-states');
                    if (savedStates) {
                        states = JSON.parse(savedStates);
                    }
                } catch (e) {
                    Logger.error(e, "Parsing saved panel states");
                }

                // Update specific state
                states[key] = value;

                // Save back to localStorage
                localStorage.setItem('wallapop-panel-states', JSON.stringify(states));
                Logger.log(`Panel state saved: ${key} = ${value}`);
            } catch (error) {
                Logger.error(error, "Saving panel state");
            }
        }

        /**
         * Load a specific panel state from localStorage
         */
        static loadPanelState(key, defaultValue) {
            try {
                const savedStates = localStorage.getItem('wallapop-panel-states');
                if (savedStates) {
                    const states = JSON.parse(savedStates);
                    if (key in states) {
                        return states[key];
                    }
                }
            } catch (error) {
                Logger.error(error, "Loading panel state");
            }
            return defaultValue;
        }

        /**
         * Save all panel states at once
         */
        static savePanelStates() {
            const states = {};

            // Get states from all togglers
            for (const [key, toggler] of Object.entries(this.togglers)) {
                if (toggler) {
                    states[`is${key.charAt(0).toUpperCase() + key.slice(1)}SectionExpanded`] = toggler.getState();
                }
            }

            try {
                localStorage.setItem('wallapop-panel-states', JSON.stringify(states));
                Logger.log("All panel states saved");
            } catch (error) {
                Logger.error(error, "Saving all panel states");
            }
        }

        // Other methods remain the same
        // ... (all the other methods that don't involve toggling)

        // Only including a few key methods to show the pattern:

        /**
         * Position dropdown based on available space
         */
        static positionDropdown() {
            const dropdownContent = this.container.querySelector('.dropdown-content');
            const dropdownButton = this.container.querySelector('.copy-dropdown .panel-button');

            // Reset position classes
            dropdownContent.classList.remove('top');

            // Check if dropdown would go out of viewport at the bottom
            const viewportHeight = window.innerHeight;
            const buttonRect = dropdownButton.getBoundingClientRect();
            const dropdownHeight = 82; // Approximate height of dropdown when expanded

            // If not enough space below, position above
            if (viewportHeight - buttonRect.bottom < dropdownHeight) {
                dropdownContent.classList.add('top');
            }
        }

        /**
         * Update UI text for all elements based on selected language
         */
        static updateUILanguage() {
            if (!this.container) return;

            // Helper function to update text of elements matching a selector
            const updateText = (selector, translationKey) => {
                const element = this.container.querySelector(selector);
                if (element) {
                    element.textContent = TranslationManager.getText(translationKey);
                }
            };

            // Update panel title
            updateText('.panel-title span:first-child', 'wallapopTools');

            // Update section titles
            updateText('.filter-section .section-title span:first-child', 'filterUnwantedWords');
            updateText('.delivery-method-section .section-title span:first-child', 'deliveryMethodFilter');
            updateText('.copy-section .section-title span:first-child', 'copyDescriptions');
            updateText('.language-section .section-title span:first-child', 'languageSettings');

            // Update delivery method options
            updateText('.delivery-options label[for="delivery-option-all"]', 'showAll');
            updateText('.delivery-options label[for="delivery-option-shipping"]', 'showOnlyShipping');
            updateText('.delivery-options label[for="delivery-option-inperson"]', 'showOnlyInPerson');

            // Update filter section
            if (this.filterInputElement) {
                this.filterInputElement.placeholder = TranslationManager.getText('example');
            }
            updateText('.filter-apply', 'addAndApply');

            // Update empty message if visible
            const emptyMessage = this.container.querySelector('.blocked-terms-list div[style*="italic"]');
            if (emptyMessage) {
                emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
            }

            // Update copy section buttons
            updateText('.copy-json', 'copyAsJSON');
            updateText('.copy-csv', 'copyAsCSV');
            updateText('.dropdown-content button:first-child', 'withHeaders');
            updateText('.dropdown-content button:last-child', 'withoutHeaders');
            updateText('.copy-clear', 'clearAll');

            // Update all expand buttons on the page
            document.querySelectorAll(SELECTORS.EXPAND_BUTTON).forEach(button => {
                if (!button.textContent.includes('...')) {
                    if (button.textContent.includes('Hide')) {
                        button.textContent = TranslationManager.getText('hideDescription');
                    } else {
                        button.textContent = TranslationManager.getText('expandDescription');
                    }
                }
            });
        }

        /**
         * Download a file with the given data and name
         * @param {String} data - The file content to download
         * @param {String} filename - The filename to use
         * @param {String} mimeType - The MIME type of the file
         */
        static downloadFile(data, filename, mimeType) {
            try {
                // Convert data to blob for binary formats
                const blob = new Blob([data], {type: mimeType});
                const url = URL.createObjectURL(blob);

                // Use GM_download (our implementation will fall back to the simple method if needed)
                GM_download({
                    url: url,
                    name: filename,
                    saveAs: true,
                    onload: () => URL.revokeObjectURL(url),
                    onerror: (error) => {
                        Logger.error(error, "GM_download");
                        // If GM_download fails, try fallback (shouldn't be needed with our polyfill, but just in case)
                        this.fallbackDownload(data, filename, mimeType);
                    }
                });
            } catch (error) {
                Logger.error(error, "Downloading file");
                this.fallbackDownload(data, filename, mimeType);
            }
        }

        /**
         * Fallback download method using a data URL and click event
         */
        static fallbackDownload(data, filename, mimeType) {
            try {
                const blob = new Blob([data], {type: mimeType});
                const url = URL.createObjectURL(blob);

                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';

                document.body.appendChild(downloadLink);
                downloadLink.click();

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(downloadLink);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (error) {
                Logger.error(error, "Fallback download");
                alert("Download failed. Please try copying to clipboard instead.");
            }
        }

        /**
         * Get the appropriate file extension and MIME type for the format
         * @param {String} formatId - The format ID
         * @returns {Object} Object with extension and mimeType properties
         */
        static getFileInfo(formatId) {
            const fileInfo = {
                // Text formats
                'plain': {extension: 'txt', mimeType: 'text/plain'},
                'markdown': {extension: 'md', mimeType: 'text/markdown'},
                'html': {extension: 'html', mimeType: 'text/html'},

                // Data formats
                'json': {extension: 'json', mimeType: 'application/json'},
                'csv': {extension: 'csv', mimeType: 'text/csv'},
                'tsv': {extension: 'tsv', mimeType: 'text/tab-separated-values'},
                'xml': {extension: 'xml', mimeType: 'application/xml'},

                // Spreadsheet formats
                'excel-csv': {extension: 'csv', mimeType: 'text/csv'},
                'excel-xml': {extension: 'xml', mimeType: 'application/xml'}
            };

            return fileInfo[formatId] || {extension: 'txt', mimeType: 'text/plain'};
        }
    }

    // Script initialization
    Logger.log("Script loaded, waiting for page to be ready");
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', WallapopExpandDescription.init.bind(WallapopExpandDescription));
        Logger.log("Added DOMContentLoaded event listener");
    } else {
        Logger.log("Document already loaded, initializing script immediately");
        WallapopExpandDescription.init();
    }

})();
