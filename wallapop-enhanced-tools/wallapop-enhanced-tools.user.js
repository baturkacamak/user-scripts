// ==UserScript==
// @name        Wallapop Enhanced Tools
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
     * SectionToggler - A reusable component for toggling UI sections
     * Handles expand/collapse functionality with transitions
     */

    class SectionToggler {
      /**
         * Initialize styles for all section togglers
         */
      static initStyles() {
        // This will be called only once, when the first instance is created
        if (SectionToggler.stylesInitialized) return;

        // Use StyleManager instead of directly creating style elements
        StyleManager.addStyles(`
      .reusable-section {
        border-radius: 0.375rem;
        border: 1px solid #e5e7eb;
        margin-bottom: 1rem;
        overflow: hidden;
      }
      
      .reusable-section-title {
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.75rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid transparent;
        background-color: #f9fafb;
        transition: background-color 0.2s ease;
      }
      
      .reusable-section-title:hover {
        background-color: #f3f4f6;
      }
      
      .reusable-section-toggle {
        transition: transform 0.3s ease;
        font-size: 0.75rem;
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }
      
      .reusable-section-content {
        max-height: 1000px;
        opacity: 1;
        overflow: hidden;
        padding: 1rem;
        transition: max-height 0.3s ease,
                    opacity 0.3s ease,
                    padding 0.3s ease;
      }
      
      .reusable-section-content.collapsed {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      
      /* Theme variations */
      .reusable-section--default .reusable-section-title {
        background-color: #f9fafb;
        color: #374151;
      }
      
      .reusable-section--primary .reusable-section-title {
        background-color: #eff6ff;
        color: #1e40af;
      }
      
      .reusable-section--success .reusable-section-title {
        background-color: #ecfdf5;
        color: #065f46;
      }
      
      .reusable-section--danger .reusable-section-title {
        background-color: #fef2f2;
        color: #b91c1c;
      }
      
      .reusable-section--warning .reusable-section-title {
        background-color: #fffbeb;
        color: #92400e;
      }
    `, 'reusable-section-styles');

        SectionToggler.stylesInitialized = true;
      }
      /**
         * Create a new section toggler
         * @param {Object} options - Configuration options
         * @param {HTMLElement} options.container - Container element for the toggle section
         * @param {String} options.sectionClass - Base class name for the section
         * @param {String} options.titleText - Text to display in the section title
         * @param {Boolean} options.isExpanded - Initial expanded state
         * @param {Function} options.contentCreator - Function to create section content
         * @param {Function} options.onToggle - Callback when toggle state changes
         * @param {String} options.theme - Theme name (default, primary, etc.)
         */
      constructor(options) {
        this.container = options.container;
        this.sectionClass = options.sectionClass;
        this.titleText = options.titleText;
        this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : true;
        this.contentCreator = options.contentCreator;
        this.onToggle = options.onToggle;
        this.theme = options.theme || 'default';

        this.section = null;
        this.toggleElement = null;
        this.contentElement = null;

        this.initStyles();
        this.create();
      }


      /**
         * Create the toggle section
         * @return {HTMLElement} The created section element
         */
      create() {
        // Create section container
        this.section = document.createElement('div');
        this.section.className = `reusable-section ${this.sectionClass}-section reusable-section--${this.theme}`;

        // Create section title
        const titleElement = document.createElement('div');
        titleElement.className = 'reusable-section-title';
        titleElement.innerHTML = `<span>${this.titleText}</span><span class="reusable-section-toggle">▼</span>`;
        this.toggleElement = titleElement.querySelector('.reusable-section-toggle');

        // Add toggle behavior
        titleElement.addEventListener('click', () => this.toggle());
        this.section.appendChild(titleElement);

        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = `reusable-section-content ${this.sectionClass}-content`;

        // Apply initial state
        if (!this.isExpanded) {
          this.contentElement.classList.add('collapsed');
          this.toggleElement.style.transform = 'rotate(-90deg)';
        }

        // Create content
        if (this.contentCreator) {
          this.contentCreator(this.contentElement);
        }

        this.section.appendChild(this.contentElement);

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.section);
        }

        return this.section;
      }

      /**
         * Toggle the section expanded/collapsed state
         */
      toggle() {
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
          this.contentElement.classList.remove('collapsed');
          this.toggleElement.style.transform = 'rotate(0deg)';
        } else {
          this.contentElement.classList.add('collapsed');
          this.toggleElement.style.transform = 'rotate(-90deg)';
        }

        // Execute callback if provided
        if (this.onToggle) {
          this.onToggle(this.isExpanded);
        }
      }

      /**
         * Get the current expanded state
         * @return {Boolean} True if expanded, false if collapsed
         */
      getState() {
        return this.isExpanded;
      }

      /**
         * Set the expanded state
         * @param {Boolean} expanded - Whether the section should be expanded
         */
      setState(expanded) {
        if (this.isExpanded !== expanded) {
          this.toggle();
        }
      }

      /**
         * Set the theme of the section toggler
         * @param {String} theme - Theme name
         */
      setTheme(theme) {
        this.theme = theme;

        // Update class name with new theme
        const classNames = this.section.className.split(' ');
        const themeRegex = new RegExp('reusable-section--[a-z]+');
        const filteredClasses = classNames.filter((className) => !themeRegex.test(className));
        filteredClasses.push(`reusable-section--${this.theme}`);
        this.section.className = filteredClasses.join(' ');
      }
    }

    // Static property to track if styles have been initialized
    SectionToggler.stylesInitialized = false;

    // Initialize styles when imported
    SectionToggler.initStyles();

    /**
     * DOMObserver - Observes DOM changes and triggers callbacks
     * Useful for watching for dynamic content loading
     */
    alert('asdasd');

    class DOMObserver {
      /**
         * Wait for elements matching a selector
         * @param {string} selector - CSS selector to wait for
         * @param {number} timeout - Timeout in milliseconds
         * @return {Promise<NodeList>} - Promise resolving to found elements
         */
      static waitForElements(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();

          function checkElements() {
            const elements = document.querySelectorAll(selector);
            if (0 < elements.length) {
              resolve(elements);
              return;
            }

            if (Date.now() - startTime > timeout) {
              reject(new Error(`Timeout waiting for elements: ${selector}`));
              return;
            }

            requestAnimationFrame(checkElements);
          }

          checkElements();
        });
      }
      /**
         * Create a new DOMObserver
         * @param {Function} onMutation - Callback for handling mutations
         * @param {Function} onUrlChange - Callback for handling URL changes
         */
      constructor(onMutation, onUrlChange) {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.lastUrl = location.href;
        this.onMutation = onMutation;
        this.onUrlChange = onUrlChange;
      }


      /**
         * Start observing DOM changes
         * @param {HTMLElement} target - Element to observe (defaults to document.body)
         * @param {Object} config - MutationObserver configuration (defaults to sensible values)
         */
      observe(target = document.body, config = {childList: true, subtree: true}) {
        this.observer.observe(target, config);
        window.addEventListener('popstate', this.handleUrlChange.bind(this));
      }

      /**
         * Stop observing DOM changes
         */
      disconnect() {
        this.observer.disconnect();
        window.removeEventListener('popstate', this.handleUrlChange.bind(this));
      }

      /**
         * Handle mutations
         * @param {MutationRecord[]} mutations - Array of mutation records
         * @private
         */
      handleMutations(mutations) {
        if (this.onMutation) {
          this.onMutation(mutations);
        }
        this.checkUrlChange();
      }

      /**
         * Check if URL has changed
         * @private
         */
      checkUrlChange() {
        if (this.lastUrl !== location.href) {
          const oldUrl = this.lastUrl;
          this.lastUrl = location.href;
          this.handleUrlChange(oldUrl);
        }
      }

      /**
         * Handle URL changes
         * @param {string} oldUrl - Previous URL before change
         * @private
         */
      handleUrlChange(oldUrl) {
        if (this.onUrlChange) {
          this.onUrlChange(location.href, oldUrl);
        }
      }
    }

    /**
     * SelectBox - A reusable UI component for dropdown selects
     * Creates customizable, accessible dropdown selects with callbacks
     */

    class SelectBox {
      /**
         * Initialize styles for all select boxes
         */
      static initStyles() {
        // This will be called only once, when the first instance is created
        if (SelectBox.stylesInitialized) return;

        // Use StyleManager instead of directly creating style elements
        StyleManager.addStyles(`
      .reusable-select {
        appearance: none;
        background-color: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        font-family: inherit;
        color: #374151;
        cursor: pointer;
        width: 100%;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 1rem;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
      }
      
      .reusable-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
      }
      
      .reusable-select:disabled {
        background-color: #f3f4f6;
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .reusable-select option {
        padding: 0.5rem;
      }
      
      /* Select sizes */
      .reusable-select--small {
        font-size: 0.75rem;
        padding: 0.25rem 1.75rem 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .reusable-select--medium {
        font-size: 0.875rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        min-height: 2.25rem;
      }
      
      .reusable-select--large {
        font-size: 1rem;
        padding: 0.75rem 2.25rem 0.75rem 1rem;
        min-height: 2.75rem;
      }
      
      /* Select themes */
      .reusable-select--default {
        border-color: #d1d5db;
      }
      
      .reusable-select--primary {
        border-color: #3b82f6;
      }
      
      .reusable-select--primary:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
      }
      
      .reusable-select--success {
        border-color: #10b981;
      }
      
      .reusable-select--success:focus {
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4);
      }
      
      .reusable-select--danger {
        border-color: #ef4444;
      }
      
      .reusable-select--danger:focus {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
      }
      
      .reusable-select-container {
        position: relative;
        width: 100%;
      }
      
      .reusable-select-label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
    `, 'reusable-select-styles');

        SelectBox.stylesInitialized = true;
      }
      /**
         * Create a new select box
         * @param {Object} options - Configuration options
         * @param {Array} options.items - Array of items [{value: string, label: string, selected: boolean}]
         * @param {String} options.name - Name attribute for the select element
         * @param {String} options.id - ID attribute for the select element
         * @param {String} options.className - Class name for styling
         * @param {Function} options.onChange - Callback when selection changes
         * @param {String} options.placeholder - Placeholder text when no selection
         * @param {HTMLElement} options.container - Optional container to append the select box
         * @param {Object} options.attributes - Additional HTML attributes for the select element
         * @param {String} options.theme - Theme name (default, primary, etc.)
         * @param {String} options.size - Size name (small, medium, large)
         */
      constructor(options) {
        this.items = options.items || [];
        this.name = options.name || '';
        this.id = options.id || `select-${Math.random().toString(36).substring(2, 9)}`;
        this.className = options.className || 'reusable-select';
        this.onChange = options.onChange;
        this.placeholder = options.placeholder || 'Select an option';
        this.container = options.container;
        this.attributes = options.attributes || {};
        this.theme = options.theme || 'default';
        this.size = options.size || 'medium';

        this.selectElement = null;
        this.initStyles();
        this.create();
      }


      /**
         * Create the select box
         * @return {HTMLElement} The created select element
         */
      create() {
        // Create select element
        this.selectElement = document.createElement('select');
        this.selectElement.name = this.name;
        this.selectElement.id = this.id;
        this.selectElement.className = `${this.className} ${this.className}--${this.theme} ${this.className}--${this.size}`;

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
        this.items.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.value;
          option.textContent = item.label;

          if (item.selected) {
            option.selected = true;
          }

          if (item.disabled) {
            option.disabled = true;
          }

          this.selectElement.appendChild(option);
        });

        // Add change event listener
        if (this.onChange) {
          this.selectElement.addEventListener('change', (e) => {
            this.onChange(e.target.value, e);
          });
        }

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.selectElement);
        }

        return this.selectElement;
      }

      /**
         * Check if any item is selected
         * @return {Boolean} True if at least one item has selected:true
         */
      hasSelectedItem() {
        return this.items.some((item) => item.selected);
      }

      /**
         * Get the currently selected value
         * @return {String} The value of the selected option
         */
      getValue() {
        return this.selectElement.value;
      }

      /**
         * Set the selected value
         * @param {String} value - The value to select
         * @param {Boolean} triggerChange - Whether to trigger the onChange event
         */
      setValue(value, triggerChange = false) {
        this.selectElement.value = value;

        if (triggerChange && this.onChange) {
          const event = new Event('change');
          this.selectElement.dispatchEvent(event);
        }
      }

      /**
         * Add a new option
         * @param {Object} item - {value: string, label: string, selected: boolean}
         */
      addOption(item) {
        // Add to items array
        this.items.push(item);

        // Create and add option element
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;

        if (item.selected) {
          option.selected = true;
        }

        if (item.disabled) {
          option.disabled = true;
        }

        this.selectElement.appendChild(option);
      }

      /**
         * Remove an option by value
         * @param {String} value - The value of the option to remove
         */
      removeOption(value) {
        // Remove from items array
        this.items = this.items.filter((item) => item.value !== value);

        // Remove from select element
        const option = this.selectElement.querySelector(`option[value="${value}"]`);
        if (option) {
          option.remove();
        }
      }

      /**
         * Update the options in the select box
         * @param {Array} items - New array of items
         * @param {Boolean} reset - Whether to completely reset (true) or update (false)
         */
      updateOptions(items, reset = false) {
        if (reset) {
          // Clear all options except placeholder
          while (this.selectElement.options.length > (this.placeholder ? 1 : 0)) {
            this.selectElement.remove(this.placeholder ? 1 : 0);
          }
          this.items = [];
        }

        // Add new options
        items.forEach((item) => {
          this.addOption(item);
        });
      }

      /**
         * Disable the select box
         * @param {Boolean} disabled - Whether the select should be disabled
         */
      setDisabled(disabled) {
        this.selectElement.disabled = disabled;
      }

      /**
         * Set the theme of the select box
         * @param {String} theme - Theme name
         */
      setTheme(theme) {
        this.theme = theme;

        // Update class name with new theme
        const classNames = this.selectElement.className.split(' ');
        const themeRegex = new RegExp(`${this.className}--[a-z]+`);
        const filteredClasses = classNames.filter((className) => !themeRegex.test(className) || !className.includes('--theme-'));
        filteredClasses.push(`${this.className}--${this.theme}`);
        this.selectElement.className = filteredClasses.join(' ');
      }

      /**
         * Set the size of the select box
         * @param {String} size - Size name
         */
      setSize(size) {
        this.size = size;

        // Update class name with new size
        const classNames = this.selectElement.className.split(' ');
        const sizeRegex = new RegExp(`${this.className}--[a-z]+`);
        const filteredClasses = classNames.filter((className) => !sizeRegex.test(className) || !className.includes('--size-'));
        filteredClasses.push(`${this.className}--${this.size}`);
        this.selectElement.className = filteredClasses.join(' ');
      }
    }

    // Static property to track if styles have been initialized
    SelectBox.stylesInitialized = false;

    // Initialize styles when imported
    SelectBox.initStyles();

    /**
     * Button - A reusable UI component for buttons
     * Creates customizable, accessible buttons with various states and callbacks
     */

    class Button {
      /**
         * Initialize styles for all buttons
         */
      static initStyles() {
        // This will be called only once, when the first instance is created
        if (Button.stylesInitialized) return;

        // Use StyleManager instead of directly creating style elements
        StyleManager.addStyles(`
      .reusable-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        white-space: nowrap;
        text-align: center;
      }
      
      /* Button sizes */
      .reusable-button--small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .reusable-button--medium {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
      }
      
      .reusable-button--large {
        font-size: 1rem;
        padding: 0.75rem 1.5rem;
        min-height: 2.75rem;
      }
      
      /* Button themes */
      .reusable-button--default {
        background-color: #f3f4f6;
        color: #374151;
        border-color: #d1d5db;
      }
      
      .reusable-button--default:hover:not(:disabled) {
        background-color: #e5e7eb;
      }
      
      .reusable-button--primary {
        background-color: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
      }
      
      .reusable-button--primary:hover:not(:disabled) {
        background-color: #2563eb;
        border-color: #2563eb;
      }
      
      .reusable-button--secondary {
        background-color: #6b7280;
        color: #ffffff;
        border-color: #6b7280;
      }
      
      .reusable-button--secondary:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #4b5563;
      }
      
      .reusable-button--success {
        background-color: #10b981;
        color: #ffffff;
        border-color: #10b981;
      }
      
      .reusable-button--success:hover:not(:disabled) {
        background-color: #059669;
        border-color: #059669;
      }
      
      .reusable-button--danger {
        background-color: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
      
      .reusable-button--danger:hover:not(:disabled) {
        background-color: #dc2626;
        border-color: #dc2626;
      }
      
      /* Button states */
      .reusable-button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      .reusable-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }
      
      /* Button content */
      .reusable-button__icon {
        display: inline-flex;
        margin-right: 0.5rem;
      }
      
      .reusable-button__text {
        display: inline-block;
      }
    `, 'reusable-button-styles');

        Button.stylesInitialized = true;
      }
      /**
         * Create a new button
         * @param {Object} options - Configuration options
         * @param {String} options.text - Button text
         * @param {String} options.type - Button type (button, submit, reset)
         * @param {String} options.className - Button CSS class
         * @param {Function} options.onClick - Click event handler
         * @param {String} options.id - Button ID
         * @param {HTMLElement} options.container - Container to append button to
         * @param {Object} options.attributes - Additional HTML attributes
         * @param {String} options.theme - Button theme (primary, secondary, success, danger)
         * @param {String} options.size - Button size (small, medium, large)
         * @param {Boolean} options.disabled - Whether button is initially disabled
         * @param {String} options.icon - Optional icon HTML to show before text
         * @param {String} options.successText - Text to show on success state
         * @param {Number} options.successDuration - Duration to show success state (ms)
         */
      constructor(options) {
        this.text = options.text || '';
        this.type = options.type || 'button';
        this.className = options.className || 'reusable-button';
        this.onClick = options.onClick;
        this.id = options.id;
        this.container = options.container;
        this.attributes = options.attributes || {};
        this.theme = options.theme || 'default';
        this.size = options.size || 'medium';
        this.disabled = options.disabled || false;
        this.icon = options.icon || null;
        this.successText = options.successText || null;
        this.successDuration = options.successDuration || 1500;
        this.originalText = this.text;

        this.button = null;
        this.initStyles();
        this.create();
      }


      /**
         * Create the button element
         * @return {HTMLButtonElement} The created button
         */
      create() {
        this.button = document.createElement('button');

        // Set basic properties
        this.button.type = this.type;
        this.button.className = this.getButtonClasses();
        this.button.disabled = this.disabled;

        // Set ID if provided
        if (this.id) {
          this.button.id = this.id;
        }

        // Set content (icon + text)
        this.updateContent();

        // Add click handler
        if (this.onClick) {
          this.button.addEventListener('click', (e) => this.handleClick(e));
        }

        // Add additional attributes
        Object.entries(this.attributes).forEach(([key, value]) => {
          this.button.setAttribute(key, value);
        });

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.button);
        }

        return this.button;
      }

      /**
         * Handle click events, with success state support
         * @param {Event} e - Click event
         */
      handleClick(e) {
        if (this.disabled) return;

        // Call the onClick handler
        const result = this.onClick(e);

        // Handle success state if successText is set
        if (this.successText && false !== result) {
          this.showSuccessState();
        }
      }

      /**
         * Show success state animation
         */
      showSuccessState() {
        // Store original button state
        const originalText = this.text;
        const originalClasses = this.button.className;

        // Update to success state
        this.setText(this.successText);
        this.button.className = this.getButtonClasses('success');

        // Set timeout to revert back
        setTimeout(() => {
          this.setText(originalText);
          this.button.className = originalClasses;
        }, this.successDuration);
      }

      /**
         * Generate button classes based on theme and size
         * @param {String} state - Optional state override (success, error, etc)
         * @return {String} Combined CSS classes
         */
      getButtonClasses(state = null) {
        const classes = [this.className];

        // Add theme class
        const theme = state || this.theme;
        classes.push(`${this.className}--${theme}`);

        // Add size class
        classes.push(`${this.className}--${this.size}`);

        return classes.join(' ');
      }

      /**
         * Update button content (icon + text)
         */
      updateContent() {
        // Clear existing content
        this.button.innerHTML = '';

        // Add icon if present
        if (this.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = `${this.className}__icon`;
          iconSpan.innerHTML = this.icon;
          this.button.appendChild(iconSpan);
        }

        // Add text
        const textSpan = document.createElement('span');
        textSpan.className = `${this.className}__text`;
        textSpan.textContent = this.text;
        this.button.appendChild(textSpan);
      }

      /**
         * Set button text
         * @param {String} text - New button text
         */
      setText(text) {
        this.text = text;
        const textElement = this.button.querySelector(`.${this.className}__text`);
        if (textElement) {
          textElement.textContent = text;
        } else {
          this.updateContent();
        }
      }

      /**
         * Reset button text to original
         */
      resetText() {
        this.setText(this.originalText);
      }

      /**
         * Set icon content
         * @param {String} iconHtml - HTML for the icon
         */
      setIcon(iconHtml) {
        this.icon = iconHtml;
        this.updateContent();
      }

      /**
         * Enable or disable the button
         * @param {Boolean} disabled - Whether the button should be disabled
         */
      setDisabled(disabled) {
        this.disabled = disabled;
        this.button.disabled = disabled;
      }

      /**
         * Toggle button disabled state
         * @return {Boolean} New disabled state
         */
      toggleDisabled() {
        this.setDisabled(!this.disabled);
        return this.disabled;
      }

      /**
         * Set button theme
         * @param {String} theme - Theme name
         */
      setTheme(theme) {
        this.theme = theme;
        this.button.className = this.getButtonClasses();
      }

      /**
         * Set button size
         * @param {String} size - Size name
         */
      setSize(size) {
        this.size = size;
        this.button.className = this.getButtonClasses();
      }
    }

    // Static property to track if styles have been initialized
    Button.stylesInitialized = false;

    // Initialize styles when imported
    Button.initStyles();

    /**
     * Slider - A reusable UI component for range inputs
     * Creates customizable, accessible sliders with various states and callbacks
     */

    class Slider {
      /**
         * Initialize styles for all sliders
         */
      static initStyles() {
        // This will be called only once, when the first instance is created
        if (Slider.stylesInitialized) return;

        // Use StyleManager instead of directly creating style elements
        StyleManager.addStyles(`
      .reusable-slider {
        width: 100%;
        margin: 15px 0;
      }
      
      .reusable-slider-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
      
      .reusable-slider-input {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background-color: #e5e7eb;
        outline: none;
        transition: background-color 0.2s;
      }
      
      .reusable-slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #3b82f6;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .reusable-slider-input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #3b82f6;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .reusable-slider-input::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      
      .reusable-slider-input::-moz-range-thumb:hover {
        transform: scale(1.1);
      }
      
      .reusable-slider-value {
        display: block;
        margin-top: 6px;
        font-size: 0.875rem;
        color: #4b5563;
        text-align: center;
      }
      
      /* Themes */
      .reusable-slider--default .reusable-slider-input::-webkit-slider-thumb {
        background-color: #6b7280;
      }
      
      .reusable-slider--default .reusable-slider-input::-moz-range-thumb {
        background-color: #6b7280;
      }
      
      .reusable-slider--primary .reusable-slider-input::-webkit-slider-thumb {
        background-color: #3b82f6;
      }
      
      .reusable-slider--primary .reusable-slider-input::-moz-range-thumb {
        background-color: #3b82f6;
      }
      
      .reusable-slider--success .reusable-slider-input::-webkit-slider-thumb {
        background-color: #10b981;
      }
      
      .reusable-slider--success .reusable-slider-input::-moz-range-thumb {
        background-color: #10b981;
      }
      
      .reusable-slider--danger .reusable-slider-input::-webkit-slider-thumb {
        background-color: #ef4444;
      }
      
      .reusable-slider--danger .reusable-slider-input::-moz-range-thumb {
        background-color: #ef4444;
      }
      
      /* Sizes */
      .reusable-slider--small .reusable-slider-input {
        height: 4px;
      }
      
      .reusable-slider--small .reusable-slider-input::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
      }
      
      .reusable-slider--small .reusable-slider-input::-moz-range-thumb {
        width: 14px;
        height: 14px;
      }
      
      .reusable-slider--large .reusable-slider-input {
        height: 8px;
      }
      
      .reusable-slider--large .reusable-slider-input::-webkit-slider-thumb {
        width: 22px;
        height: 22px;
      }
      
      .reusable-slider--large .reusable-slider-input::-moz-range-thumb {
        width: 22px;
        height: 22px;
      }
    `, 'reusable-slider-styles');

        Slider.stylesInitialized = true;
      }
      /**
         * Create a new slider
         * @param {Object} options - Configuration options
         * @param {Number} options.min - Minimum value
         * @param {Number} options.max - Maximum value
         * @param {Number} options.value - Initial value
         * @param {Number} options.step - Step increment
         * @param {String} options.className - CSS class for styling
         * @param {Function} options.onChange - Callback when value changes
         * @param {Function} options.onInput - Callback during input (before change is finalized)
         * @param {String} options.id - ID attribute
         * @param {HTMLElement} options.container - Container to append to
         * @param {Boolean} options.showValue - Whether to show the current value
         * @param {String} options.label - Label text
         * @param {String} options.theme - Theme (default, primary, etc.)
         * @param {String} options.size - Size (small, medium, large)
         * @param {String} options.valuePrefix - Text to show before the value
         * @param {String} options.valueSuffix - Text to show after the value
         */
      constructor(options) {
        this.min = options.min !== undefined ? options.min : 0;
        this.max = options.max !== undefined ? options.max : 100;
        this.value = options.value !== undefined ? options.value : this.min;
        this.step = options.step !== undefined ? options.step : 1;
        this.className = options.className || 'reusable-slider';
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

        this.create();
      }


      /**
         * Create the slider element
         * @return {HTMLElement} The slider container element
         */
      create() {
        // Create container
        this.sliderElement = document.createElement('div');
        this.sliderElement.className = `${this.className} ${this.className}--${this.theme} ${this.className}--${this.size}`;

        // Add label if provided
        if (this.label) {
          this.labelElement = document.createElement('label');
          this.labelElement.className = `${this.className}-label`;
          this.labelElement.htmlFor = this.id;
          this.labelElement.textContent = this.label;
          this.sliderElement.appendChild(this.labelElement);
        }

        // Create input element
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'range';
        this.inputElement.className = `${this.className}-input`;
        this.inputElement.id = this.id;
        this.inputElement.min = this.min;
        this.inputElement.max = this.max;
        this.inputElement.step = this.step;
        this.inputElement.value = this.value;

        // Add event listeners
        this.inputElement.addEventListener('input', (e) => {
          this.value = parseFloat(e.target.value);
          this.updateValue();

          if (this.onInput) {
            this.onInput(this.value, e);
          }
        });

        this.inputElement.addEventListener('change', (e) => {
          if (this.onChange) {
            this.onChange(this.value, e);
          }
        });

        this.sliderElement.appendChild(this.inputElement);

        // Add value display if enabled
        if (this.showValue) {
          this.valueElement = document.createElement('span');
          this.valueElement.className = `${this.className}-value`;
          this.updateValue();
          this.sliderElement.appendChild(this.valueElement);
        }

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.sliderElement);
        }

        return this.sliderElement;
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
         * @param {Boolean} triggerEvent - Whether to trigger the onChange event
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
        this.theme = theme;

        if (this.sliderElement) {
          // Update class name with new theme
          const classNames = this.sliderElement.className.split(' ');
          const themeRegex = new RegExp(`${this.className}--[a-z]+`);
          const filteredClasses = classNames.filter((className) => !themeRegex.test(className) || !className.includes('--theme-'));
          filteredClasses.push(`${this.className}--${this.theme}`);
          this.sliderElement.className = filteredClasses.join(' ');
        }
      }

      /**
         * Set the size of the slider
         * @param {String} size - Size name
         */
      setSize(size) {
        this.size = size;

        if (this.sliderElement) {
          // Update class name with new size
          const classNames = this.sliderElement.className.split(' ');
          const sizeRegex = new RegExp(`${this.className}--[a-z]+`);
          const filteredClasses = classNames.filter((className) => !sizeRegex.test(className) || !className.includes('--size-'));
          filteredClasses.push(`${this.className}--${this.size}`);
          this.sliderElement.className = filteredClasses.join(' ');
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
    }

    // Static property to track if styles have been initialized
    Slider.stylesInitialized = false;

    // Initialize styles when imported
    Slider.initStyles();

    /**
     * ProgressBar - A reusable UI component for displaying progress
     * Provides customizable, animated progress indicators
     */

    class ProgressBar {
      /**
         * Initialize styles for all progress bars
         */
      static initStyles() {
        // This will be called only once, when the first instance is created
        if (ProgressBar.stylesInitialized) return;

        // Use StyleManager instead of directly creating style elements
        StyleManager.addStyles(`
      .reusable-progress {
        width: 100%;
        margin: 10px 0;
      }
      
      .reusable-progress-label {
        font-size: 0.875rem;
        margin-bottom: 4px;
        display: block;
        color: #555;
      }
      
      .reusable-progress-bar {
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .reusable-progress-fill {
        height: 100%;
        width: 0%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .reusable-progress-text {
        font-size: 0.75rem;
        text-align: right;
        margin-top: 4px;
        color: #555;
      }
      
      /* Themes */
      .reusable-progress--default .reusable-progress-fill {
        background-color: #6b7280;
      }
      
      .reusable-progress--primary .reusable-progress-fill {
        background-color: #3b82f6;
      }
      
      .reusable-progress--success .reusable-progress-fill {
        background-color: #10b981;
      }
      
      .reusable-progress--danger .reusable-progress-fill {
        background-color: #ef4444;
      }
      
      .reusable-progress--warning .reusable-progress-fill {
        background-color: #f59e0b;
      }
      
      /* Sizes */
      .reusable-progress--small .reusable-progress-bar {
        height: 4px;
      }
      
      .reusable-progress--large .reusable-progress-bar {
        height: 12px;
      }
    `, 'reusable-progress-styles');

        ProgressBar.stylesInitialized = true;
      }
      /**
         * Create a new progress bar
         * @param {Object} options - Configuration options
         * @param {Number} options.initialValue - Initial progress value (0-100)
         * @param {String} options.className - CSS class for styling
         * @param {HTMLElement} options.container - Container to append to
         * @param {Boolean} options.showText - Whether to show progress text
         * @param {Boolean} options.showLabel - Whether to show a label
         * @param {String} options.label - Label text (if showLabel is true)
         * @param {String} options.theme - Theme (default, primary, success, etc.)
         */
      constructor(options) {
        this.value = options.initialValue || 0;
        this.className = options.className || 'reusable-progress';
        this.container = options.container;
        this.showText = options.showText !== undefined ? options.showText : true;
        this.showLabel = options.showLabel || false;
        this.label = options.label || '';
        this.theme = options.theme || 'default';

        this.progressElement = null;
        this.progressBarElement = null;
        this.progressFillElement = null;
        this.progressTextElement = null;
        this.labelElement = null;

        this.initStyles();
        this.create();
      }


      /**
         * Create the progress bar elements
         * @return {HTMLElement} The created progress bar container
         */
      create() {
        // Create container
        this.progressElement = document.createElement('div');
        this.progressElement.className = `${this.className} ${this.className}--${this.theme}`;

        // Add label if needed
        if (this.showLabel) {
          this.labelElement = document.createElement('span');
          this.labelElement.className = `${this.className}-label`;
          this.labelElement.textContent = this.label;
          this.progressElement.appendChild(this.labelElement);
        }

        // Create progress bar
        this.progressBarElement = document.createElement('div');
        this.progressBarElement.className = `${this.className}-bar`;

        this.progressFillElement = document.createElement('div');
        this.progressFillElement.className = `${this.className}-fill`;
        this.progressFillElement.style.width = `${this.value}%`;
        this.progressBarElement.appendChild(this.progressFillElement);

        this.progressElement.appendChild(this.progressBarElement);

        // Add text if needed
        if (this.showText) {
          this.progressTextElement = document.createElement('div');
          this.progressTextElement.className = `${this.className}-text`;
          this.progressTextElement.textContent = `${this.value}%`;
          this.progressElement.appendChild(this.progressTextElement);
        }

        // Add to container if provided
        if (this.container) {
          this.container.appendChild(this.progressElement);
        }

        return this.progressElement;
      }

      /**
         * Set progress value
         * @param {Number} value - New progress value (0-100)
         * @param {String} text - Optional custom text to display
         */
      setValue(value, text) {
        // Ensure value is between 0 and 100
        this.value = Math.min(100, Math.max(0, value));

        // Update fill width
        if (this.progressFillElement) {
          this.progressFillElement.style.width = `${this.value}%`;
        }

        // Update text if visible
        if (this.showText && this.progressTextElement) {
          this.progressTextElement.textContent = text || `${this.value}%`;
        }

        return this.value;
      }

      /**
         * Set the theme of the progress bar
         * @param {String} theme - Theme name
         */
      setTheme(theme) {
        this.theme = theme;
        if (this.progressElement) {
          // Remove all theme classes
          const classNames = this.progressElement.className.split(' ');
          const nonThemeClasses = classNames.filter((className) => !className.includes('--'));

          // Add new theme class
          this.progressElement.className = `${nonThemeClasses.join(' ')} ${this.className}--${this.theme}`;
        }
      }

      /**
         * Set the label text
         * @param {String} label - New label text
         */
      setLabel(label) {
        this.label = label;
        if (this.labelElement) {
          this.labelElement.textContent = this.label;
        }
      }

      /**
         * Show or hide the progress bar
         * @param {Boolean} visible - Whether the progress bar should be visible
         */
      setVisible(visible) {
        if (this.progressElement) {
          this.progressElement.style.display = visible ? '' : 'none';
        }
      }
    }

    // Static property to track if styles have been initialized
    ProgressBar.stylesInitialized = false;

    // Initialize styles when imported
    ProgressBar.initStyles();

    // GM function fallbacks for direct browser execution

    GMFunctions.initialize();

    Logger.setPrefix("Wallapop Enhanced Tools");

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

    StyleManager.addStyles(`
        :root {
            --transition-speed: 0.3s;
            --transition-easing: ease-in-out;
            --panel-background: #ffffff;
            --panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            --panel-border-radius: 8px;
            --panel-accent-color: #008080;
            --panel-hover-color: #006666;
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

        .panel-title, .section-title {
            font-weight: bold;
            font-size: 14px;
            padding: 10px 15px;
            color: #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            user-select: none;
        }

        .panel-title {
            background-color: var(--panel-accent-color);
            color: white;
            border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
        }

        .panel-toggle, .section-toggle {
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

        .section-content {
            padding: 15px;
            max-height: 300px;
            opacity: 1;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .section-content.collapsed {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
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
            display: block;
            background-color: var(--panel-accent-color);
            color: white;
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

        .panel-button:hover,
        .copy-button:hover {
            background-color: var(--panel-hover-color);
        }

        .copy-button {
            display: block;
            background-color: var(--panel-accent-color);
            color: white;
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

        .lang-button {
            flex-grow: 1;
            flex-basis: 45%;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing),
                        border-color var(--transition-speed) var(--transition-easing);
        }

        .lang-button:hover {
            background-color: #e0e0e0;
        }

        .lang-button.active {
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
            margin: 5px 0;
        }

        .option-checkbox {
            margin-right: 8px;
        }

        .option-label {
            font-size: 12px;
            color: #555;
        }

        .export-button {
            display: block;
            background-color: var(--panel-accent-color);
            color: white;
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

        .export-button:hover {
            background-color: var(--panel-hover-color);
        }

        .export-success {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .export-buttons-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .export-buttons-container .export-button {
            flex: 1;
        }

        .downloaded {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

           .expand-progress-container {
                margin-top: 10px;
                padding: 5px;
                background-color: #f9f9f9;
                border-radius: 4px;
            }

            input[type="range"] {
                -webkit-appearance: none;
                width: 100%;
                height: 5px;
                border-radius: 5px;
                background: #d3d3d3;
                outline: none;
            }

            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--panel-accent-color);
                cursor: pointer;
            }

            input[type="range"]::-moz-range-thumb {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: var(--panel-accent-color);
                cursor: pointer;
            }

            .panel-button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
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

    const setupDOMObserver = () => {
        const observer = new DOMObserver(
            // Mutation callback
            (mutations) => {
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
            },

            // URL change callback
            (newUrl, oldUrl) => {
                Logger.log("URL changed:", newUrl);
                setTimeout(() => {
                    ListingManager.addExpandButtonsToListings();
                    // Apply filters after URL change
                    ControlPanel.applyFilters();
                }, 1000); // Delay to allow for dynamic content to load
            }
        );

        // Start observing
        observer.observe();

        return observer;
    };

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

            // Create description content container first
            this.descriptionContent = document.createElement('div');
            this.descriptionContent.className = 'description-content';

            // Create container for the button and content
            const container = document.createElement('div');

            // Use Button component to create the expand button
            this.buttonComponent = new Button({
                text: TranslationManager.getText('expandDescription'),
                className: 'reusable-button',
                theme: 'default',
                size: 'small',
                onClick: (e) => this.handleClick(e),
                attributes: {
                    'data-url': this.url
                }
            });

            // Set additional CSS to match the old style
            this.buttonComponent.button.style.background = 'none';
            this.buttonComponent.button.style.border = 'none';
            this.buttonComponent.button.style.color = '#008080';
            this.buttonComponent.button.style.textDecoration = 'underline';
            this.buttonComponent.button.style.padding = '5px';
            this.buttonComponent.button.style.fontSize = '12px';
            this.buttonComponent.button.classList.add(SELECTORS.EXPAND_BUTTON.slice(1));

            // Store reference to the actual button element
            this.button = this.buttonComponent.button;

            // Add elements to container
            container.appendChild(this.button);
            container.appendChild(this.descriptionContent);

            // Add container to anchor element
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
            // Set to loading state
            this.buttonComponent.setText(TranslationManager.getText('loading'));

            const result = await DescriptionFetcher.getDescription(this.url);
            if (result.success) {
                this.itemData = result.data;
                this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data.description);
                // Use the class toggle approach for smooth transition
                this.descriptionContent.classList.add('expanded');

                // Update button text
                this.buttonComponent.setText(TranslationManager.getText('hideDescription'));
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

            // Reset button text
            this.buttonComponent.setText(TranslationManager.getText('expandDescription'));
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

            // Reset button text
            this.buttonComponent.setText(TranslationManager.getText('expandDescription'));
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

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `option-${this.id}-${option.id}`;
                    checkbox.className = 'option-checkbox';
                    checkbox.checked = option.defaultValue || false;

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.className = 'option-label';
                    label.textContent = option.label;
                    label.title = option.description || '';

                    // Handle checkbox change
                    checkbox.addEventListener('change', (e) => {
                        this.optionValues[option.id] = e.target.checked;
                        e.stopPropagation();
                    });

                    optionRow.appendChild(checkbox);
                    optionRow.appendChild(label);
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

            // Update checkbox if it exists
            const checkbox = this.element.querySelector(`#option-${this.id}-${optionId}`);
            if (checkbox) {
                checkbox.checked = value;
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

    class WallapopEnhancedTools {
        static async init() {
            Logger.log("Initializing script");

            // Create unified control panel
            ControlPanel.createControlPanel();

            // Wait for listing elements
            try {
                // Using static method from DOMObserver
                await DOMObserver.waitForElements(SELECTORS.ITEM_CARDS.join(', '));
                ListingManager.addExpandButtonsToListings();

                // Apply filters to initial listings
                ControlPanel.applyFilters();

                // Set up DOM observation
                setupDOMObserver();

                Logger.log("Script initialized successfully");
            } catch (error) {
                Logger.error(error, "Initialization");
                Logger.log("Continuing with partial initialization");

                // Still set up observer to catch elements when they do appear
                setupDOMObserver();
            }
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
         * Create a button using Button component
         */
        static createButton(text, className, clickHandler, options = {}) {
            let theme = 'primary';

            // Detect theme from className
            if (className.includes('danger') || className.includes('error')) {
                theme = 'danger';
            } else if (className.includes('success') || className.includes('copy-success')) {
                theme = 'success';
            } else if (className.includes('secondary')) {
                theme = 'secondary';
            }

            // Create button with component
            const button = new Button({
                text,
                className: 'reusable-button',
                theme,
                onClick: clickHandler,
                successText: options.successText || null,
                successDuration: options.successDuration || 1500,
                attributes: options.attributes || {}
            });

            return button.button;
        }

        /**
         * Create the expand all section with Button component
         */
        static createExpandAllSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isExpandAllSectionExpanded', true);

            this.togglers.expandAll = new SectionToggler({
                container,
                sectionClass: 'expand-all',
                titleText: TranslationManager.getText('expandAllDescriptions'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isExpandAllSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create the expand all button with Button component
                    new Button({
                        text: TranslationManager.getText('expandAllVisible'),
                        className: 'reusable-button',
                        theme: 'primary',
                        id: 'expand-all-button',
                        onClick: () => this.handleExpandAll(),
                        container: content
                    });

                    // Create progress container
                    const progressContainer = document.createElement('div');
                    progressContainer.className = 'expand-progress-container';
                    progressContainer.style.display = 'none';
                    progressContainer.style.marginTop = '10px';

                    // Create progress text
                    const progressText = document.createElement('div');
                    progressText.className = 'expand-progress-text';
                    progressText.style.fontSize = '12px';
                    progressText.style.marginBottom = '5px';
                    progressText.style.textAlign = 'center';
                    progressContainer.appendChild(progressText);

                    // Create progress bar
                    const progressBar = document.createElement('div');
                    progressBar.className = 'expand-progress-bar';
                    progressBar.style.height = '5px';
                    progressBar.style.backgroundColor = '#eee';
                    progressBar.style.borderRadius = '3px';
                    progressBar.style.overflow = 'hidden';

                    const progressFill = document.createElement('div');
                    progressFill.className = 'expand-progress-fill';
                    progressFill.style.height = '100%';
                    progressFill.style.backgroundColor = 'var(--panel-accent-color)';
                    progressFill.style.width = '0%';
                    progressFill.style.transition = 'width 0.3s ease-in-out';

                    progressBar.appendChild(progressFill);
                    progressContainer.appendChild(progressBar);
                    content.appendChild(progressContainer);

                    // Add delay option
                    const delayContainer = document.createElement('div');
                    delayContainer.style.marginTop = '10px';
                    delayContainer.style.fontSize = '12px';

                    const delayLabel = document.createElement('label');
                    delayLabel.textContent = TranslationManager.getText('delayBetweenRequests');
                    delayLabel.htmlFor = 'expand-delay-input';
                    delayLabel.style.display = 'block';
                    delayLabel.style.marginBottom = '5px';
                    delayContainer.appendChild(delayLabel);

                    const delayInput = document.createElement('input');
                    delayInput.id = 'expand-delay-input';
                    delayInput.type = 'range';
                    delayInput.min = '500';
                    delayInput.max = '3000';
                    delayInput.step = '100';
                    delayInput.value = this.loadPanelState('expandAllDelay', '1000');
                    delayInput.style.width = '100%';

                    // Add event listener to save the delay value
                    delayInput.addEventListener('change', () => {
                        this.savePanelState('expandAllDelay', delayInput.value);
                    });

                    delayContainer.appendChild(delayInput);

                    // Display the current delay value
                    const delayValue = document.createElement('div');
                    delayValue.textContent = `${parseInt(delayInput.value) / 1000}s`;
                    delayValue.style.textAlign = 'center';
                    delayValue.style.marginTop = '5px';

                    // Update displayed value when slider moves
                    delayInput.addEventListener('input', () => {
                        delayValue.textContent = `${parseInt(delayInput.value) / 1000}s`;
                    });

                    delayContainer.appendChild(delayValue);
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

            // Get the delay setting
            const delay = parseInt(this.loadPanelState('expandAllDelay', '1000'));

            // Get progress elements
            const expandAllButton = document.querySelector('.expand-all-button');
            const progressContainer = document.querySelector('.expand-progress-container');
            const progressText = document.querySelector('.expand-progress-text');
            const progressFill = document.querySelector('.expand-progress-fill');

            // Update UI to show progress
            if (expandAllButton) expandAllButton.disabled = true;
            if (progressContainer) progressContainer.style.display = 'block';

            let expanded = 0;
            let errors = 0;

            // Process buttons one at a time
            for (const button of allExpandButtons) {
                // Update progress
                if (progressText) {
                    progressText.textContent = TranslationManager.getText('expandingProgress')
                        .replace('{current}', expanded + 1)
                        .replace('{total}', totalButtons);
                }

                if (progressFill) {
                    progressFill.style.width = `${(expanded / totalButtons) * 100}%`;
                }

                try {
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
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) {
                progressText.textContent = TranslationManager.getText('expandingComplete')
                    .replace('{count}', expanded)
                    .replace('{total}', totalButtons)
                    .replace('{errors}', errors);
            }

            // Re-enable the button after 2 seconds
            setTimeout(() => {
                if (expandAllButton) expandAllButton.disabled = false;

                // Hide progress after 5 seconds
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
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
         * Create the filter section with Button component
         */
        static createFilterSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isFilterSectionExpanded', true);

            this.togglers.filter = new SectionToggler({
                container,
                sectionClass: 'filter',
                titleText: TranslationManager.getText('filterUnwantedWords'),
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

                    // Apply button using Button component
                    new Button({
                        text: TranslationManager.getText('addAndApply'),
                        className: 'reusable-button',
                        theme: 'primary',
                        size: 'medium',
                        onClick: () => this.addBlockedTerm(),
                        container: content
                    });

                    // Create list for blocked terms
                    this.blockedTermsListElement = document.createElement('div');
                    this.blockedTermsListElement.className = 'blocked-terms-list';
                    content.appendChild(this.blockedTermsListElement);
                }
            });

            return this.togglers.filter.section;
        }

        /**
         * Create the copy section with Button components
         */
        static createCopySection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isCopySectionExpanded', true);

            // Load the last selected format
            let lastSelectedFormat = this.loadExportFormat();

            this.togglers.copy = new SectionToggler({
                container,
                sectionClass: 'export',
                titleText: TranslationManager.getText('exportDescriptions'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isCopySectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create format selector container
                    const formatSelectorContainer = document.createElement('div');
                    formatSelectorContainer.className = 'format-selector-container';

                    // Create format selector button
                    const formatSelector = document.createElement('button');
                    formatSelector.className = 'format-selector';
                    formatSelector.textContent = TranslationManager.getText('selectFormat');

                    // Create format dropdown
                    const formatDropdown = document.createElement('div');
                    formatDropdown.className = 'format-dropdown';

                    // Toggle dropdown when selector is clicked
                    formatSelector.addEventListener('click', () => {
                        formatDropdown.classList.toggle('active');
                    });

                    // Close dropdown when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!formatSelectorContainer.contains(e.target)) {
                            formatDropdown.classList.remove('active');
                        }
                    });

                    formatSelectorContainer.appendChild(formatSelector);
                    formatSelectorContainer.appendChild(formatDropdown);

                    // Create format categories list
                    const formatCategories = document.createElement('ul');
                    formatCategories.className = 'format-categories';

                    // Populate categories and formats
                    Object.entries(this.exportFormats).forEach(([categoryId, category]) => {
                        const categoryItem = document.createElement('li');
                        categoryItem.className = 'format-category';

                        const categoryLabel = document.createElement('div');
                        categoryLabel.className = 'format-category-label';
                        categoryLabel.textContent = category.label;
                        categoryItem.appendChild(categoryLabel);

                        // Create format list for this category
                        const formatList = document.createElement('ul');
                        formatList.className = 'format-list';

                        // Create and add format items
                        Object.values(category.formats).forEach(format => {
                            // Create the format item element
                            const formatElement = format.createElement((selectedFormat) => {
                                // Unselect the previously selected format
                                if (window.currentSelectedFormat) {
                                    window.currentSelectedFormat.unselect();
                                }

                                // Set the new selected format
                                window.currentSelectedFormat = selectedFormat;
                                selectedFormat.select();

                                // Update the selector button text
                                formatSelector.textContent = selectedFormat.label;

                                // Save the selected format
                                this.saveExportFormat(selectedFormat.id, selectedFormat.category);

                                // Close the dropdown
                                formatDropdown.classList.remove('active');
                            });

                            formatList.appendChild(formatElement);

                            // If this is the last selected format, select it
                            if (lastSelectedFormat &&
                                lastSelectedFormat.id === format.id &&
                                lastSelectedFormat.category === format.category) {
                                // Trigger a click on this format
                                setTimeout(() => {
                                    const formatLabel = formatElement.querySelector('.format-label');
                                    if (formatLabel) {
                                        formatLabel.click();
                                    }
                                }, 0);
                            }
                        });

                        categoryItem.appendChild(formatList);
                        formatCategories.appendChild(categoryItem);
                    });

                    formatDropdown.appendChild(formatCategories);
                    content.appendChild(formatSelectorContainer);

                    // Create export buttons container
                    const exportButtonsContainer = document.createElement('div');
                    exportButtonsContainer.className = 'export-buttons-container';
                    exportButtonsContainer.style.display = 'flex';
                    exportButtonsContainer.style.gap = '10px';
                    exportButtonsContainer.style.marginTop = '10px';

                    // Copy button using Button component
                    const copyButton = new Button({
                        text: TranslationManager.getText('copyToClipboard'),
                        className: 'reusable-button',
                        theme: 'primary',
                        size: 'medium',
                        onClick: () => this.copyToClipboard(),
                        successText: TranslationManager.getText('copied'),
                        container: exportButtonsContainer
                    });
                    copyButton.button.style.flex = '1';

                    // Download button using Button component
                    const downloadButton = new Button({
                        text: TranslationManager.getText('downloadFile'),
                        className: 'reusable-button',
                        theme: 'secondary',
                        size: 'medium',
                        onClick: () => this.downloadFormatted(),
                        successText: TranslationManager.getText('downloaded'),
                        container: exportButtonsContainer
                    });
                    downloadButton.button.style.flex = '1';

                    content.appendChild(exportButtonsContainer);

                    // Create clear button using Button component
                    const clearButton = new Button({
                        text: TranslationManager.getText('clearAll'),
                        className: 'reusable-button',
                        theme: 'danger',
                        size: 'medium',
                        onClick: () => {
                            DescriptionManager.clearItems();
                            clearButton.showSuccessState();
                        },
                        successText: TranslationManager.getText('cleared'),
                        container: content
                    });
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
                titleText: TranslationManager.getText('deliveryMethodFilter'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isDeliveryMethodSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Get saved preference
                    const savedOption = this.loadPanelState('deliveryMethodFilter', 'all');

                    // Create SelectBox items
                    const selectItems = [
                        {value: 'all', label: TranslationManager.getText('showAll'), selected: savedOption === 'all'},
                        {
                            value: 'shipping',
                            label: TranslationManager.getText('showOnlyShipping'),
                            selected: savedOption === 'shipping'
                        },
                        {
                            value: 'inperson',
                            label: TranslationManager.getText('showOnlyInPerson'),
                            selected: savedOption === 'inperson'
                        }
                    ];

                    // Create select box
                    new SelectBox({
                        items: selectItems,
                        id: 'delivery-method-select',
                        className: 'reusable-select delivery-method-select',
                        onChange: (value) => {
                            this.savePanelState('deliveryMethodFilter', value);
                            this.applyDeliveryMethodFilter();
                        },
                        container: content
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
        static createLanguageSection(container) {
            // Load saved state
            const isExpanded = this.loadPanelState('isLanguageSectionExpanded', true);

            this.togglers.language = new SectionToggler({
                container,
                sectionClass: 'language',
                titleText: TranslationManager.getText('languageSettings'),
                isExpanded,
                onToggle: (state) => {
                    this.savePanelState('isLanguageSectionExpanded', state);
                },
                contentCreator: (content) => {
                    // Create language selector
                    const languageSelector = document.createElement('div');
                    languageSelector.className = 'language-selector';

                    // Add language options
                    Object.entries(TranslationManager.availableLanguages).forEach(([code, name]) => {
                        const langButton = document.createElement('button');
                        langButton.className = `lang-button ${code === TranslationManager.currentLanguage ? 'active' : ''}`;
                        langButton.dataset.lang = code;
                        langButton.textContent = name;

                        langButton.addEventListener('click', () => {
                            if (TranslationManager.setLanguage(code)) {
                                // Mark this button as active and others as inactive
                                document.querySelectorAll('.lang-button').forEach(btn => {
                                    btn.classList.toggle('active', btn.dataset.lang === code);
                                });

                                // Update all text in the UI
                                this.updateUILanguage();
                            }
                        });

                        languageSelector.appendChild(langButton);
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
                    sectionClass: 'panel',
                    titleText: TranslationManager.getText('wallapopTools'),
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

                // Remove section class and add panel-title class
                this.togglers.panel.section.className = '';
                this.togglers.panel.section.querySelector('.section-title').className = 'panel-title';

                // Add header to container
                this.container.appendChild(this.togglers.panel.section.querySelector('.panel-title'));

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
        document.addEventListener('DOMContentLoaded', WallapopEnhancedTools.init.bind(WallapopEnhancedTools));
        Logger.log("Added DOMContentLoaded event listener");
    } else {
        Logger.log("Document already loaded, initializing script immediately");
        WallapopEnhancedTools.init();
    }

})();
