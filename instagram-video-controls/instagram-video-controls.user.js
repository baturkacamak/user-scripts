// ==UserScript==
// @name        instagram-video-controls
// @description Adds native HTML5 video controls to Instagram videos with enhanced features like download, speed control, and more
// @namespace   https://github.com/baturkacamak/userscripts
// @version     1.0.0
// @author      Batur Kacamak
// @homepage    https://github.com/baturkacamak/userscripts/tree/master/instagram-video-controls/instagram-video-controls#readme
// @homepageURL https://github.com/baturkacamak/userscripts/tree/master/instagram-video-controls/instagram-video-controls#readme
// @downloadURL https://github.com/baturkacamak/userscripts/raw/master/instagram-video-controls/instagram-video-controls.user.js
// @updateURL   https://github.com/baturkacamak/userscripts/raw/master/instagram-video-controls/instagram-video-controls.user.js
// @match       https://*.instagram.com/*
// @icon        https://www.instagram.com/favicon.ico
// @run-at      document-start
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_download
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Enhanced Logger - A feature-rich logging utility
     * Supports log levels, styling, grouping, caller info, filtering, persistence, exporting, and more
     */
    class Logger {
        static DEBUG = true;
        static PREFIX = "Userscript";
        static _customFormat = null;
        static _logHistory = [];
        static _filters = new Set();
        static _lastTimestamp = null;
        static _persist = false;
        static _mock = false;
        static _theme = {
            debug: "color: #3498db; font-weight: bold;",
            info: "color: #1abc9c; font-weight: bold;",
            warn: "color: #f39c12; font-weight: bold;",
            error: "color: #e74c3c; font-weight: bold;",
            success: "color: #2ecc71; font-weight: bold;",
            trace: "color: #8e44ad; font-weight: bold;",
            htmlTitle: "color: #9b59b6; font-weight: bold;",
            htmlContent: "color: #2c3e50;",
            toggle: "color: #f39c12; font-weight: bold;"
        };
        static _emojis = {
            debug: "\uD83D\uDC1B",
            info: "\u2139\uFE0F",
            warn: "\u26A0\uFE0F",
            error: "\u274C",
            success: "\u2705",
            trace: "\uD83D\uDCCC",
            html: "\uD83E\uDDE9",
            toggle: "\uD83C\uDF9B\uFE0F"
        };

        static setTimeFormat(locale = "en-US", use12Hour = false) {
            this._customFormat = {locale, hour12: use12Hour};
        }

        static _detectTimeFormat() {
            try {
                const testDate = new Date(Date.UTC(2020, 0, 1, 13, 0, 0));
                const locale = navigator.language || "tr-TR";
                const timeString = testDate.toLocaleTimeString(locale);
                const is12Hour = timeString.toLowerCase().includes("pm") || timeString.toLowerCase().includes("am");
                return {locale, hour12: is12Hour};
            } catch (e) {
                return {locale: "tr-TR", hour12: false};
            }
        }

        static _timestamp() {
            const {locale, hour12} = this._customFormat || this._detectTimeFormat();
            const now = new Date();
            const time = now.toLocaleString(locale, {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12
            });
            let diff = "";
            if (this._lastTimestamp) {
                const ms = now - this._lastTimestamp;
                diff = ` [+${(ms / 1000).toFixed(1)}s]`;
            }
            this._lastTimestamp = now;
            return `${time}${diff}`;
        }

        static _getCaller() {
            const err = new Error();
            const stack = err.stack?.split("\n")[3];
            return stack ? stack.trim() : "(unknown)";
        }

        static _log(level, ...args) {
            if (!this.DEBUG && level === "debug") return;
            if (this._filters.size && !args.some(arg => this._filters.has(arg))) return;
            const emoji = this._emojis[level] || '';
            const style = this._theme[level] || '';
            const timestamp = this._timestamp();
            const caller = this._getCaller();

            const message = [
                `%c${timestamp} %c${emoji} [${this.PREFIX} ${level.toUpperCase()}]%c:`,
                "color: gray; font-style: italic;",
                style,
                "color: inherit;",
                ...args,
                `\nCaller: ${caller}`
            ];

            this._logHistory.push({timestamp, level, args});

            if (this._persist) localStorage.setItem("LoggerHistory", JSON.stringify(this._logHistory));
            if (!this._mock) console.log(...message);
        }

        static debug(...args) {
            this._log("debug", ...args);
        }

        static info(...args) {
            this._log("info", ...args);
        }

        static warn(...args) {
            this._log("warn", ...args);
        }

        static error(...args) {
            this._log("error", ...args);
        }

        static success(...args) {
            this._log("success", ...args);
        }

        static trace(...args) {
            this._log("trace", ...args);
            console.trace();
        }

        static logHtml(title, htmlContent) {
            const shortContent = htmlContent.substring(0, 1500) + "...";
            this._log("html", `[${title}]`, shortContent);
            if (!this._mock) {
                console.groupCollapsed(`%c\uD83E\uDDE9 HTML Details (${title})`, this._theme.htmlTitle);
                console.log("%cComplete HTML:", this._theme.htmlTitle);
                console.log(`%c${htmlContent}`, this._theme.htmlContent);
                console.groupEnd();
            }
        }

        static setPrefix(prefix) {
            this.PREFIX = prefix;
        }

        static setTheme(theme) {
            Object.assign(this._theme, theme);
        }

        static addFilter(tag) {
            this._filters.add(tag);
        }

        static clearFilters() {
            this._filters.clear();
        }

        static persistLogs(enable = true) {
            this._persist = enable;
        }

        static mock(enable = true) {
            this._mock = enable;
        }

        static group(label) {
            if (!this._mock) console.group(label);
        }

        static groupEnd() {
            if (!this._mock) console.groupEnd();
        }

        static step(msg) {
            this.info(`\u2705 ${msg}`);
        }

        static hello() {
            this.info("Hello, dev! \uD83D\uDC4B Ready to debug?");
        }

        static downloadLogs(filename = "logs.json") {
            const blob = new Blob([JSON.stringify(this._logHistory, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        static autoClear(intervalMs) {
            setInterval(() => {
                this._logHistory = [];
                if (this._persist) localStorage.removeItem("LoggerHistory");
            }, intervalMs);
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
         * * Wait for a specific element to appear in the DOM.
         *  * Continues checking using requestAnimationFrame until it appears,
         *  * a timeout is reached, or the maximum number of attempts is exceeded.
         *  *
         *  * @param {string} selector - CSS selector of the target element.
         *  * @param {number} [timeout=10000] - Maximum time in milliseconds to wait.
         *  * @param {Document|Element} [root=document] - DOM root to query from.
         *  * @param {number} [maxRetries=60] - Maximum number of requestAnimationFrame attempts.
         *  * @returns {Promise<Element>} Resolves with the found element or rejects on timeout.
         */
      static waitForElement(selector, timeout = 10000, root = document, maxRetries = 60) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          let attempts = 0;

          function checkElement() {
            const element = root.querySelector(selector);
            if (element) {
              resolve(element);
              return;
            }

            if ((Date.now() - startTime > timeout) || (attempts >= maxRetries)) {
              reject(new Error(`Timeout waiting for element: ${selector}`));
              return;
            }

            attempts++;
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
     * PubSub - A simple publish/subscribe pattern implementation
     * Enables components to communicate without direct references
     */
    class PubSub {
        static #events = {};

        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} callback - Callback function
         * @return {string} Subscription ID
         */
        static subscribe(event, callback) {
            if (!this.#events[event]) {
                this.#events[event] = [];
            }

            const subscriptionId = `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            this.#events[event].push({callback, subscriptionId});
            return subscriptionId;
        }

        /**
         * Unsubscribe from an event
         * @param {string} subscriptionId - Subscription ID
         * @return {boolean} Success state
         */
        static unsubscribe(subscriptionId) {
            for (const event in this.#events) {
                const index = this.#events[event].findIndex(sub => sub.subscriptionId === subscriptionId);
                if (index !== -1) {
                    this.#events[event].splice(index, 1);
                    return true;
                }
            }
            return false;
        }

        /**
         * Publish an event
         * @param {string} event - Event name
         * @param {any} data - Data to pass to subscribers
         */
        static publish(event, data) {
            if (!this.#events[event]) {
                return;
            }

            this.#events[event].forEach(sub => {
                sub.callback(data);
            });
        }

        /**
         * Clear all subscriptions
         * @param {string} [event] - Optional event name to clear only specific event
         */
        static clear(event) {
            if (event) {
                delete this.#events[event];
            } else {
                this.#events = {};
            }
        }
    }

    class UrlChangeWatcher {
      constructor(strategies = [], fireImmediately = true) {
        this.strategies = strategies;
        this.fireImmediately = fireImmediately;
        this.lastUrl = location.href;
        this.active = false;
      }

      start() {
        if (this.active) return;
        this.active = true;
        Logger.debug('UrlChangeWatcher (Strategy) started');

        this.strategies.forEach((strategy) =>
          strategy.start?.(this._handleChange.bind(this)),
        );

        if (this.fireImmediately) {
          this._handleChange(location.href, null, true);
        }
      }

      stop() {
        this.active = false;
        this.strategies.forEach((strategy) => strategy.stop?.());
        Logger.debug('UrlChangeWatcher (Strategy) stopped');
      }

      _handleChange(newUrl, oldUrl = this.lastUrl, force = false) {
        if (!force && newUrl === this.lastUrl) return;
        Logger.debug(`URL changed: ${oldUrl} → ${newUrl}`);

        this.lastUrl = newUrl;

        if (PubSub?.publish) {
          PubSub.publish('urlchange', {newUrl, oldUrl});
        }
      }
    }

    /**
     * DOMObserver - Observes DOM changes and URL changes
     * Uses UrlChangeWatcher for URL change detection with configurable strategies
     */
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
         * @param {Array} urlChangeStrategies - Array of URL change detection strategies to use
         */
      constructor(onMutation, urlChangeStrategies = []) {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.lastUrl = location.href;
        this.onMutation = onMutation;

        // Initialize URL change watcher with provided strategies
        this.urlChangeWatcher = new UrlChangeWatcher(urlChangeStrategies, false); // false = don't fire immediately
      }


      /**
         * Start observing DOM changes and URL changes
         * @param {HTMLElement} target - Element to observe (defaults to document.body)
         * @param {Object} config - MutationObserver configuration (defaults to sensible values)
         */
      observe(target = document.body, config = {childList: true, subtree: true}) {
        this.observer.observe(target, config);

        // Start URL change watcher
        this.urlChangeWatcher.start();
      }

      /**
         * Stop observing DOM changes and URL changes
         */
      disconnect() {
        this.observer.disconnect();

        // Stop URL change watcher
        this.urlChangeWatcher.stop();
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

    /**
     * SidebarPanel - A reusable UI component for creating a sidebar panel with a trigger button
     * Similar to Wallapop's help button that shifts the site content
     */

    /**
     * A reusable component that creates a toggle button and sidebar panel
     */
    class SidebarPanel {
        // Panel states
        static PANEL_STATES = {
            OPENED: 'opened',
            CLOSED: 'closed'
        };

        // Panel positions
        static PANEL_POSITIONS = {
            RIGHT: 'right',
            LEFT: 'left'
        };

        // Panel transitions
        static PANEL_TRANSITIONS = {
            SLIDE: 'slide',
            PUSH: 'push'
        };

        // GM storage keys
        static STORAGE_KEYS = {
            PANEL_STATE: 'sidebar-panel-state',
            PANEL_SETTINGS: 'sidebar-panel-settings'
        };

        // PubSub events
        static EVENTS = {
            PANEL_OPEN: 'sidebar-panel-open',
            PANEL_CLOSE: 'sidebar-panel-close',
            PANEL_TOGGLE: 'sidebar-panel-toggle',
            PANEL_INITIALIZED: 'sidebar-panel-initialized'
        };

        /**
         * Create a new SidebarPanel.
         * @param {Object} options - Configuration options.
         * @param {String} options.title - Panel title.
         * @param {String} [options.id="sidebar-panel"] - Unique ID for the panel.
         * @param {String} [options.position="right"] - Position of the panel ("right" or "left").
         * @param {String} [options.transition="slide"] - Transition effect ("slide" or "push").
         * @param {String} [options.buttonIcon="?"] - HTML content for the toggle button.
         * @param {Boolean} [options.showButton=true] - Whether to show the toggle button.
         * @param {String} [options.namespace="userscripts"] - Namespace for CSS classes.
         * @param {Function} [options.onOpen=null] - Callback when panel opens.
         * @param {Function} [options.onClose=null] - Callback when panel closes.
         * @param {Boolean} [options.overlay=true] - Whether to show an overlay behind the panel.
         * @param {Object} [options.content={}] - Content configuration.
         * @param {String|HTMLElement} [options.content.html=null] - HTML content for the panel.
         * @param {Function} [options.content.generator=null] - Function that returns content.
         * @param {Boolean} [options.rememberState=true] - Whether to remember the panel state.
         * @param {Object} [options.style={}] - Custom style options.
         * @param {String} [options.style.width="320px"] - Panel width.
         * @param {String} [options.style.buttonSize="48px"] - Button size.
         * @param {String} [options.style.buttonColor="#fff"] - Button text color.
         * @param {String} [options.style.buttonBg="#625df5"] - Button background color.
         * @param {String} [options.style.panelBg="#fff"] - Panel background color.
         */
        constructor(options = {}) {
            // Initialize GM functions if not already
            this.GM = GMFunctions.initialize();

            // Process and store options with defaults
            this.options = {
                title: options.title || 'Panel',
                id: options.id || 'sidebar-panel',
                position: options.position || SidebarPanel.PANEL_POSITIONS.RIGHT,
                transition: options.transition || SidebarPanel.PANEL_TRANSITIONS.SLIDE,
                buttonIcon: options.buttonIcon || '?',
                showButton: options.showButton !== false,
                namespace: options.namespace || 'userscripts',
                onOpen: options.onOpen || null,
                onClose: options.onClose || null,
                overlay: options.overlay !== false,
                content: options.content || {},
                rememberState: options.rememberState !== false,
                style: options.style || {}
            };

            // Setup base class names based on namespace
            this.baseClass = `${this.options.namespace}-sidebar-panel`;
            this.cssVarPrefix = `--${this.options.namespace}-sidebar-panel-`;

            // Elements references
            this.container = null;
            this.panel = null;
            this.button = null;
            this.closeButton = null;
            this.content = null;
            this.header = null;
            this.footer = null;
            this.overlay = null;

            // Panel state
            this.state = this.getSavedState() || SidebarPanel.PANEL_STATES.CLOSED;

            // Storage key for this specific panel instance
            this.storageKey = `${SidebarPanel.STORAGE_KEYS.PANEL_STATE}-${this.options.id}`;

            // Initialize the component
            this.init();
        }

        /**
         * Initialize the styles for the SidebarPanel
         * @param {String} namespace - Optional namespace to prevent CSS collisions
         */
        static initStyles(namespace = 'userscripts') {
            const baseClass = `${namespace}-sidebar-panel`;
            const cssVarPrefix = `--${namespace}-sidebar-panel-`;

            StyleManager.addStyles(`
            /* Base styles for the sidebar panel */
            .${baseClass}-container {
                position: fixed;
                top: 0;
                height: 100%;
                z-index: 9998;
                transition: transform 0.3s ease-in-out;
            }
            
            .${baseClass}-container--right {
                right: 0;
                transform: translateX(100%);
            }
            
            .${baseClass}-container--left {
                left: 0;
                transform: translateX(-100%);
            }
            
            .${baseClass}-container--opened {
                transform: translateX(0);
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
            }
            
            .${baseClass} {
                width: var(${cssVarPrefix}width, 320px);
                height: 100%;
                background-color: var(${cssVarPrefix}bg, #fff);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
            }
            
            .${baseClass}-header {
                padding: 16px;
                background-color: var(${cssVarPrefix}header-bg, #f5f5f5);
                border-bottom: 1px solid var(${cssVarPrefix}border-color, #eee);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .${baseClass}-title {
                font-weight: bold;
                font-size: 18px;
                color: var(${cssVarPrefix}title-color, #333);
                margin: 0;
            }
            
            .${baseClass}-close {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 24px;
                line-height: 24px;
                padding: 0;
                width: 24px;
                height: 24px;
                color: var(${cssVarPrefix}close-color, #777);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .${baseClass}-close:hover {
                color: var(${cssVarPrefix}close-color-hover, #333);
            }
            
            .${baseClass}-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            
            .${baseClass}-footer {
                padding: 16px;
                background-color: var(${cssVarPrefix}footer-bg, #f5f5f5);
                border-top: 1px solid var(${cssVarPrefix}border-color, #eee);
            }
            
            /* Toggle button styles */
            .${baseClass}-toggle {
                position: fixed;
                width: var(${cssVarPrefix}button-size, 48px);
                height: var(${cssVarPrefix}button-size, 48px);
                border-radius: 50%;
                background-color: var(${cssVarPrefix}button-bg, #625df5);
                color: var(${cssVarPrefix}button-color, #fff);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                border: none;
                outline: none;
                transition: background-color 0.2s ease, transform 0.2s ease;
            }
            
            .${baseClass}-toggle:hover {
                background-color: var(${cssVarPrefix}button-bg-hover, #514dc6);
                transform: scale(1.05);
            }
            
            .${baseClass}-toggle--right {
                right: 20px;
                bottom: 20px;
            }
            
            .${baseClass}-toggle--left {
                left: 20px;
                bottom: 20px;
            }
            
            /* For push transition effect */
            body.${baseClass}-push-active--right {
                transition: margin-left 0.3s ease-in-out;
            }
            
            body.${baseClass}-push-active--right.${baseClass}-push--opened {
                margin-left: calc(-1 * var(${cssVarPrefix}width, 320px));
            }
            
            body.${baseClass}-push-active--left {
                transition: margin-right 0.3s ease-in-out;
            }
            
            body.${baseClass}-push-active--left.${baseClass}-push--opened {
                margin-right: calc(-1 * var(${cssVarPrefix}width, 320px));
            }
            
            /* Overlay for mobile views */
            .${baseClass}-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9997;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            
            .${baseClass}-overlay--visible {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }
            
            /* Responsive styles */
            @media (max-width: 768px) {
                .${baseClass} {
                    width: 85vw;
                }
            }
        `, `${namespace}-sidebar-panel-styles`);
        }

        /**
         * Initialize the panel and button
         */
        init() {
            // Initialize styles if not already done
            SidebarPanel.initStyles(this.options.namespace);

            // Create custom CSS variables for this instance
            this.applyCustomStyles();

            // Create the panel elements
            this.createPanel();

            // Create toggle button if needed
            if (this.options.showButton) {
                this.createToggleButton();
            }

            // Create overlay if needed
            if (this.options.overlay) {
                this.createOverlay();
            }

            // Set up events
            this.setupEvents();

            // Apply saved state if we're remembering state
            if (this.options.rememberState) {
                if (this.state === SidebarPanel.PANEL_STATES.OPENED) {
                    this.open(false); // Open without animation for initial state
                }
            }

            // Publish initialization event
            PubSub.publish(SidebarPanel.EVENTS.PANEL_INITIALIZED, {
                id: this.options.id,
                panel: this
            });

            Logger.debug(`SidebarPanel initialized: ${this.options.id}`);
        }

        /**
         * Apply custom styles from options
         */
        applyCustomStyles() {
            const customStyles = {};

            // Process style options
            if (this.options.style.width) {
                customStyles[`${this.cssVarPrefix}width`] = this.options.style.width;
            }
            if (this.options.style.buttonSize) {
                customStyles[`${this.cssVarPrefix}button-size`] = this.options.style.buttonSize;
            }
            if (this.options.style.buttonColor) {
                customStyles[`${this.cssVarPrefix}button-color`] = this.options.style.buttonColor;
            }
            if (this.options.style.buttonBg) {
                customStyles[`${this.cssVarPrefix}button-bg`] = this.options.style.buttonBg;
            }
            if (this.options.style.buttonBgHover) {
                customStyles[`${this.cssVarPrefix}button-bg-hover`] = this.options.style.buttonBgHover;
            }
            if (this.options.style.panelBg) {
                customStyles[`${this.cssVarPrefix}bg`] = this.options.style.panelBg;
            }

            // Apply the CSS variables using StyleManager
            if (Object.keys(customStyles).length > 0) {
                const styleId = `${this.baseClass}-custom-${this.options.id}`;
                let cssText = `:root {\n`;

                for (const [key, value] of Object.entries(customStyles)) {
                    cssText += `  ${key}: ${value};\n`;
                }

                cssText += `}\n`;
                StyleManager.addStyles(cssText, styleId);
            }
        }

        /**
         * Create the panel element
         */
        createPanel() {
            // Create panel container
            this.container = document.createElement('div');
            this.container.id = `${this.baseClass}-${this.options.id}`;
            this.container.className = `${this.baseClass}-container ${this.baseClass}-container--${this.options.position}`;

            // Create panel
            this.panel = document.createElement('div');
            this.panel.className = this.baseClass;

            // Create panel header
            this.header = document.createElement('div');
            this.header.className = `${this.baseClass}-header`;

            // Create title
            const title = document.createElement('h2');
            title.className = `${this.baseClass}-title`;
            title.textContent = this.options.title;
            this.header.appendChild(title);

            // Create close button
            this.closeButton = document.createElement('button');
            this.closeButton.type = 'button';
            this.closeButton.className = `${this.baseClass}-close`;
            this.closeButton.innerHTML = '×';
            this.closeButton.setAttribute('aria-label', 'Close');
            this.header.appendChild(this.closeButton);

            // Create content container
            this.content = document.createElement('div');
            this.content.className = `${this.baseClass}-content`;

            // Add initial content if provided
            if (this.options.content.html) {
                if (typeof this.options.content.html === 'string') {
                    this.content.innerHTML = this.options.content.html;
                } else if (this.options.content.html instanceof HTMLElement) {
                    this.content.appendChild(this.options.content.html);
                }
            } else if (this.options.content.generator && typeof this.options.content.generator === 'function') {
                const generatedContent = this.options.content.generator();
                if (typeof generatedContent === 'string') {
                    this.content.innerHTML = generatedContent;
                } else if (generatedContent instanceof HTMLElement) {
                    this.content.appendChild(generatedContent);
                }
            }

            // Create footer (optional)
            if (this.options.footer) {
                this.footer = document.createElement('div');
                this.footer.className = `${this.baseClass}-footer`;

                if (typeof this.options.footer === 'string') {
                    this.footer.innerHTML = this.options.footer;
                } else if (this.options.footer instanceof HTMLElement) {
                    this.footer.appendChild(this.options.footer);
                }
            }

            // Assemble the panel
            this.panel.appendChild(this.header);
            this.panel.appendChild(this.content);
            if (this.footer) {
                this.panel.appendChild(this.footer);
            }
            this.container.appendChild(this.panel);

            // Add to document
            document.body.appendChild(this.container);
        }

        /**
         * Create toggle button
         */
        createToggleButton() {
            this.button = document.createElement('button');
            this.button.type = 'button';
            this.button.className = `${this.baseClass}-toggle ${this.baseClass}-toggle--${this.options.position}`;
            this.button.innerHTML = this.options.buttonIcon;
            this.button.setAttribute('aria-label', `Open ${this.options.title}`);

            // Add to document
            document.body.appendChild(this.button);
        }

        /**
         * Create overlay element
         */
        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.className = `${this.baseClass}-overlay`;
            document.body.appendChild(this.overlay);
        }

        /**
         * Set up event listeners
         */
        setupEvents() {
            // Toggle button click
            if (this.button) {
                this.button.addEventListener('click', () => this.toggle());
            }

            // Close button click
            if (this.closeButton) {
                this.closeButton.addEventListener('click', () => this.close());
            }

            // Overlay click
            if (this.overlay) {
                this.overlay.addEventListener('click', () => this.close());
            }

            // Listen for PubSub events
            this.subscriptions = [
                PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_OPEN}-${this.options.id}`, () => this.open()),
                PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_CLOSE}-${this.options.id}`, () => this.close()),
                PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_TOGGLE}-${this.options.id}`, () => this.toggle())
            ];

            // ESC key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state === SidebarPanel.PANEL_STATES.OPENED) {
                    this.close();
                }
            });
        }

        /**
         * Toggle panel state
         */
        toggle() {
            if (this.state === SidebarPanel.PANEL_STATES.CLOSED) {
                this.open();
            } else {
                this.close();
            }
        }

        /**
         * Open the panel
         * @param {Boolean} animate - Whether to animate the opening
         */
        open(animate = true) {
            if (this.state === SidebarPanel.PANEL_STATES.OPENED) return;

            this.state = SidebarPanel.PANEL_STATES.OPENED;

            // Update panel class
            if (!animate) {
                this.container.style.transition = 'none';
                requestAnimationFrame(() => {
                    this.container.style.transition = '';
                });
            }

            this.container.classList.add(`${this.baseClass}-container--opened`);

            // Handle push transition
            if (this.options.transition === SidebarPanel.PANEL_TRANSITIONS.PUSH) {
                document.body.classList.add(`${this.baseClass}-push-active--${this.options.position}`);
                document.body.classList.add(`${this.baseClass}-push--opened`);
            }

            // Show overlay
            if (this.overlay) {
                this.overlay.classList.add(`${this.baseClass}-overlay--visible`);
            }

            // Save state
            if (this.options.rememberState) {
                this.saveState();
            }

            // Call onOpen callback if provided
            if (typeof this.options.onOpen === 'function') {
                this.options.onOpen();
            }

            // Publish event
            PubSub.publish(SidebarPanel.EVENTS.PANEL_OPEN, {
                id: this.options.id,
                panel: this
            });

            Logger.debug(`SidebarPanel opened: ${this.options.id}`);
        }

        /**
         * Close the panel
         */
        close() {
            if (this.state === SidebarPanel.PANEL_STATES.CLOSED) return;

            this.state = SidebarPanel.PANEL_STATES.CLOSED;

            // Update panel class
            this.container.classList.remove(`${this.baseClass}-container--opened`);

            // Handle push transition
            if (this.options.transition === SidebarPanel.PANEL_TRANSITIONS.PUSH) {
                document.body.classList.remove(`${this.baseClass}-push--opened`);
                // We keep the active class for transition
                setTimeout(() => {
                    if (this.state === SidebarPanel.PANEL_STATES.CLOSED) {
                        document.body.classList.remove(`${this.baseClass}-push-active--${this.options.position}`);
                    }
                }, 300); // Match transition duration
            }

            // Hide overlay
            if (this.overlay) {
                this.overlay.classList.remove(`${this.baseClass}-overlay--visible`);
            }

            // Save state
            if (this.options.rememberState) {
                this.saveState();
            }

            // Call onClose callback if provided
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }

            // Publish event
            PubSub.publish(SidebarPanel.EVENTS.PANEL_CLOSE, {
                id: this.options.id,
                panel: this
            });

            Logger.debug(`SidebarPanel closed: ${this.options.id}`);
        }

        /**
         * Save panel state using GM functions
         */
        saveState() {
            try {
                this.GM.GM_setValue(this.storageKey, this.state);
                Logger.debug(`SidebarPanel state saved: ${this.options.id} - ${this.state}`);
            } catch (error) {
                Logger.error(error, "Saving sidebar panel state");
            }
        }

        /**
         * Get saved panel state from GM storage
         * @return {String|null} Panel state or null if not found
         */
        getSavedState() {
            try {
                return this.GM.GM_getValue(this.storageKey, null);
            } catch (error) {
                Logger.error(error, "Getting sidebar panel state");
                return null;
            }
        }

        /**
         * Set panel content
         * @param {String|HTMLElement} content - HTML string or element to set as content
         */
        setContent(content) {
            if (!this.content) return;

            // Clear existing content
            this.content.innerHTML = '';

            // Add new content
            if (typeof content === 'string') {
                this.content.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.content.appendChild(content);
            }
        }

        /**
         * Set panel title
         * @param {String} title - New title text
         */
        setTitle(title) {
            const titleElement = this.header ? this.header.querySelector(`.${this.baseClass}-title`) : null;
            if (titleElement) {
                titleElement.textContent = title;
                this.options.title = title;
            }
        }

        /**
         * Set button icon
         * @param {String} iconHtml - HTML string for icon content
         */
        setButtonIcon(iconHtml) {
            if (this.button) {
                this.button.innerHTML = iconHtml;
                this.options.buttonIcon = iconHtml;
            }
        }

        /**
         * Destroy the panel and clean up
         */
        destroy() {
            // Remove DOM elements
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }

            if (this.button && this.button.parentNode) {
                this.button.parentNode.removeChild(this.button);
            }

            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }

            // Remove body classes
            document.body.classList.remove(`${this.baseClass}-push-active--${this.options.position}`);
            document.body.classList.remove(`${this.baseClass}-push--opened`);

            // Unsubscribe from PubSub events
            if (this.subscriptions) {
                this.subscriptions.forEach(subscriptionId => {
                    PubSub.unsubscribe(subscriptionId);
                });
            }

            Logger.debug(`SidebarPanel destroyed: ${this.options.id}`);
        }
    }

    /**
     * Notification - A reusable UI component for toast notifications.
     * Creates customizable, temporary notifications that appear and disappear automatically.
     */

    /**
     * A reusable UI component for creating toast notifications that provide non-intrusive
     * feedback to users.
     */
    class Notification {
        /**
         * Storage for the notification container elements by position
         * @private
         */
        static _containers = {};
        /**
         * Storage for all active notifications
         * @private
         */
        static _activeNotifications = [];
        /**
         * Counter for generating unique notification IDs
         * @private
         */
        static _idCounter = 0;
        /**
         * Maximum number of notifications to show per container
         * @private
         */
        static _maxNotificationsPerContainer = 5;
        /**
         * Queue for notifications waiting to be shown
         * @private
         */
        static _queue = [];

        /**
         * Returns the unique base CSS class for the Notification component.
         * This class is used as the root for all styling and helps prevent CSS collisions.
         *
         * @return {string} The base CSS class name for notifications.
         */
        static get BASE_NOTIFICATION_CLASS() {
            return 'userscripts-notification';
        }

        /**
         * Returns the CSS variable prefix used for theming the Notification component.
         * This prefix scopes all custom CSS variables related to the notification.
         *
         * @return {string} The CSS variable prefix.
         */
        static get CSS_VAR_PREFIX() {
            return '--userscripts-notification-';
        }

        /**
         * Initialize styles for all notifications.
         * These styles reference the CSS variables with our defined prefix.
         */
        static initStyles() {
            if (Notification.stylesInitialized) return;

            StyleManager.addStyles(`
      /* Container for all notifications */
      .${Notification.BASE_NOTIFICATION_CLASS}-container {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        pointer-events: none; /* Allow clicking through the container */
        
        /* Default positioning at bottom center */
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        left: 50%;
        transform: translateX(-50%);
        
        /* Container width */
        width: var(${Notification.CSS_VAR_PREFIX}container-width, auto);
        max-width: var(${Notification.CSS_VAR_PREFIX}container-max-width, 350px);
      }
      
      /* Position variants */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        bottom: auto;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        left: var(${Notification.CSS_VAR_PREFIX}container-left, 16px);
        bottom: auto;
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        right: var(${Notification.CSS_VAR_PREFIX}container-right, 16px);
        left: auto;
        bottom: auto;
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-left {
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        left: var(${Notification.CSS_VAR_PREFIX}container-left, 16px);
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-right {
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        right: var(${Notification.CSS_VAR_PREFIX}container-right, 16px);
        left: auto;
        transform: none;
      }
      
      /* Individual notification toast */
      .${Notification.BASE_NOTIFICATION_CLASS} {
        position: relative;
        display: flex;
        align-items: center;
        padding: var(${Notification.CSS_VAR_PREFIX}padding, 12px 16px);
        border-radius: var(${Notification.CSS_VAR_PREFIX}border-radius, 6px);
        box-shadow: var(${Notification.CSS_VAR_PREFIX}shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
        color: var(${Notification.CSS_VAR_PREFIX}color, #fff);
        font-family: var(${Notification.CSS_VAR_PREFIX}font-family, inherit);
        font-size: var(${Notification.CSS_VAR_PREFIX}font-size, 14px);
        line-height: var(${Notification.CSS_VAR_PREFIX}line-height, 1.5);
        opacity: 0;
        transform: translateY(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        pointer-events: auto; /* Make the notification clickable */
        max-width: 100%;
        box-sizing: border-box;
        width: 100%;
        overflow: hidden;
        
        /* Progress bar at the bottom */
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: var(${Notification.CSS_VAR_PREFIX}progress-height, 3px);
          background-color: var(${Notification.CSS_VAR_PREFIX}progress-color, rgba(255, 255, 255, 0.5));
          width: 100%;
          transform-origin: left;
          transform: scaleX(0);
        }
      }
      
      /* Visible notification */
      .${Notification.BASE_NOTIFICATION_CLASS}--visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Animation for progress bar */
      .${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after {
        animation-name: ${Notification.BASE_NOTIFICATION_CLASS}-progress;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      
      @keyframes ${Notification.BASE_NOTIFICATION_CLASS}-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
      
      /* Close button */
      .${Notification.BASE_NOTIFICATION_CLASS}-close {
        background: none;
        border: none;
        color: inherit;
        opacity: 0.7;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        margin-left: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-close:hover {
        opacity: 1;
      }
      
      /* Icon area */
      .${Notification.BASE_NOTIFICATION_CLASS}-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }
      
      /* Content area */
      .${Notification.BASE_NOTIFICATION_CLASS}-content {
        flex-grow: 1;
        word-break: break-word;
      }
      
      /* Types styling */
      .${Notification.BASE_NOTIFICATION_CLASS}--info {
        background-color: var(${Notification.CSS_VAR_PREFIX}info-bg, #3498db);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--success {
        background-color: var(${Notification.CSS_VAR_PREFIX}success-bg, #2ecc71);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--warning {
        background-color: var(${Notification.CSS_VAR_PREFIX}warning-bg, #f39c12);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--error {
        background-color: var(${Notification.CSS_VAR_PREFIX}error-bg, #e74c3c);
      }
      
      /* Customizable style */
      .${Notification.BASE_NOTIFICATION_CLASS}--custom {
        background-color: var(${Notification.CSS_VAR_PREFIX}custom-bg, #7f8c8d);
      }
      
      /* Animation for top position variants */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center .${Notification.BASE_NOTIFICATION_CLASS},
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left .${Notification.BASE_NOTIFICATION_CLASS},
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right .${Notification.BASE_NOTIFICATION_CLASS} {
        transform: translateY(-100%);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center .${Notification.BASE_NOTIFICATION_CLASS}--visible,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left .${Notification.BASE_NOTIFICATION_CLASS}--visible,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right .${Notification.BASE_NOTIFICATION_CLASS}--visible {
        transform: translateY(0);
      }
      
      /* Give slightly different vertical spacing based on position */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right {
        flex-direction: column;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-center,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-left,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-right {
        flex-direction: column-reverse;
      }
      
      /* For reduced motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .${Notification.BASE_NOTIFICATION_CLASS} {
          transition: opacity 0.1s ease;
          transform: translateY(0);
        }
        
        .${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after {
          animation: none;
        }
      }
    `, 'userscripts-notification-styles');

            Notification.stylesInitialized = true;
        }

        /**
         * Injects default color variables for the notification component into the :root.
         * Users can call this method to automatically set a default color palette.
         */
        static useDefaultColors() {
            const styleId = 'userscripts-notification-default-colors';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
        :root {
          /* Container styling */
          ${Notification.CSS_VAR_PREFIX}container-width: auto;
          ${Notification.CSS_VAR_PREFIX}container-max-width: 350px;
          ${Notification.CSS_VAR_PREFIX}container-bottom: 16px;
          ${Notification.CSS_VAR_PREFIX}container-top: 16px;
          ${Notification.CSS_VAR_PREFIX}container-left: 16px;
          ${Notification.CSS_VAR_PREFIX}container-right: 16px;
          
          /* Toast styling */
          ${Notification.CSS_VAR_PREFIX}font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          ${Notification.CSS_VAR_PREFIX}font-size: 14px;
          ${Notification.CSS_VAR_PREFIX}line-height: 1.5;
          ${Notification.CSS_VAR_PREFIX}padding: 12px 16px;
          ${Notification.CSS_VAR_PREFIX}border-radius: 6px;
          ${Notification.CSS_VAR_PREFIX}shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          ${Notification.CSS_VAR_PREFIX}color: #ffffff;
          
          /* Progress bar */
          ${Notification.CSS_VAR_PREFIX}progress-height: 3px;
          ${Notification.CSS_VAR_PREFIX}progress-color: rgba(255, 255, 255, 0.5);
          
          /* Toast types */
          ${Notification.CSS_VAR_PREFIX}info-bg: #3498db;
          ${Notification.CSS_VAR_PREFIX}success-bg: #2ecc71;
          ${Notification.CSS_VAR_PREFIX}warning-bg: #f39c12;
          ${Notification.CSS_VAR_PREFIX}error-bg: #e74c3c;
          ${Notification.CSS_VAR_PREFIX}custom-bg: #7f8c8d;
        }
      `;
                document.head.appendChild(style);
            }
        }

        /**
         * Creates and shows a notification.
         * @param {Object|string} options - Configuration options or message string
         * @param {string} [options.message] - The notification message
         * @param {string} [options.type='info'] - Notification type (info, success, warning, error, custom)
         * @param {number} [options.duration=3000] - How long to show the notification (ms)
         * @param {string} [options.position='bottom-center'] - Position (bottom-center, top-center, top-left, top-right, bottom-left, bottom-right)
         * @param {boolean} [options.showProgress=true] - Show progress bar
         * @param {boolean} [options.showClose=true] - Show close button
         * @param {Function} [options.onClick] - Callback when notification is clicked
         * @param {Function} [options.onClose] - Callback when notification closes
         * @param {string} [options.icon] - HTML for icon to display
         * @param {string} [options.className] - Additional CSS class
         * @param {boolean} [options.html=false] - Whether to interpret message as HTML
         * @param {Object} [options.style] - Custom inline styles for the notification
         * @return {string} ID of the created notification (can be used to close it)
         */
        static show(options) {
            // Initialize styles if not already done
            this.initStyles();

            // Allow passing just a message string
            if (typeof options === 'string') {
                options = {message: options};
            }

            // Set defaults
            const config = {
                message: '',
                type: 'info',
                duration: 3000,
                position: 'bottom-center',
                showProgress: true,
                showClose: true,
                onClick: null,
                onClose: null,
                icon: null,
                className: '',
                html: false,
                style: null,
                ...options
            };

            // Generate a unique ID for this notification
            const id = `${Notification.BASE_NOTIFICATION_CLASS}-${++this._idCounter}`;

            // Check if we're at the limit for the specified position
            const positionString = this._normalizePosition(config.position);
            const activeInPosition = this._activeNotifications.filter(n => n.position === positionString).length;

            // If we're at the limit, queue this notification
            if (activeInPosition >= this._maxNotificationsPerContainer) {
                this._queue.push({id, ...config});
                return id;
            }

            // Create and show the notification
            this._createNotification(id, config);
            return id;
        }

        /**
         * Convenience method to show an info notification
         * @param {string} message - The message to display
         * @param {Object} [options] - Additional options
         * @return {string} Notification ID
         */
        static info(message, options = {}) {
            return this.show({...options, message, type: 'info'});
        }

        /**
         * Convenience method to show a success notification
         * @param {string} message - The message to display
         * @param {Object} [options] - Additional options
         * @return {string} Notification ID
         */
        static success(message, options = {}) {
            return this.show({...options, message, type: 'success'});
        }

        /**
         * Convenience method to show a warning notification
         * @param {string} message - The message to display
         * @param {Object} [options] - Additional options
         * @return {string} Notification ID
         */
        static warning(message, options = {}) {
            return this.show({...options, message, type: 'warning'});
        }

        /**
         * Convenience method to show an error notification
         * @param {string} message - The message to display
         * @param {Object} [options] - Additional options
         * @return {string} Notification ID
         */
        static error(message, options = {}) {
            return this.show({...options, message, type: 'error'});
        }

        /**
         * Close a notification by ID
         * @param {string} id - The notification ID
         * @param {boolean} [animate=true] - Whether to animate the closing
         */
        static close(id, animate = true) {
            const element = document.getElementById(id);
            if (!element) {
                // Check if it's in the queue
                const queueIndex = this._queue.findIndex(n => n.id === id);
                if (queueIndex !== -1) {
                    this._queue.splice(queueIndex, 1);
                }
                return;
            }

            // Get the notification object
            const notificationIndex = this._activeNotifications.findIndex(n => n.id === id);
            if (notificationIndex === -1) return;

            const notification = this._activeNotifications[notificationIndex];

            // Remove from active notifications
            this._activeNotifications.splice(notificationIndex, 1);

            // If animated, fade out then remove
            if (animate) {
                element.classList.remove(`${Notification.BASE_NOTIFICATION_CLASS}--visible`);
                setTimeout(() => {
                    this._removeNotificationElement(element, notification);
                }, 300); // Match the transition time in CSS
            } else {
                this._removeNotificationElement(element, notification);
            }

            // Process the queue after removing
            this._processQueue(notification.position);
        }

        /**
         * Close all notifications
         * @param {string} [position] - Only close notifications in this position
         * @param {boolean} [animate=true] - Whether to animate the closing
         */
        static closeAll(position = null, animate = true) {
            // Clear the queue
            if (position) {
                const normalizedPosition = this._normalizePosition(position);
                this._queue = this._queue.filter(n => this._normalizePosition(n.position) !== normalizedPosition);
            } else {
                this._queue = [];
            }

            // Close active notifications
            const notificationsToClose = position
                ? this._activeNotifications.filter(n => n.position === this._normalizePosition(position))
                : [...this._activeNotifications];

            notificationsToClose.forEach(notification => {
                this.close(notification.id, animate);
            });
        }

        /**
         * Set the maximum number of notifications to show per container
         * @param {number} max - Maximum number of notifications
         */
        static setMaxNotifications(max) {
            if (typeof max === 'number' && max > 0) {
                this._maxNotificationsPerContainer = max;
            }
        }

        /**
         * Get a container element for a specific position, creating it if it doesn't exist
         * @param {string} position - The notification position
         * @return {HTMLElement} The container element
         * @private
         */
        static _getContainer(position) {
            const positionString = this._normalizePosition(position);

            if (this._containers[positionString]) {
                return this._containers[positionString];
            }

            // Create new container
            const container = document.createElement('div');
            container.className = `${Notification.BASE_NOTIFICATION_CLASS}-container ${Notification.BASE_NOTIFICATION_CLASS}-container--${positionString}`;
            document.body.appendChild(container);

            // Store for future use
            this._containers[positionString] = container;
            return container;
        }

        /**
         * Normalize position string to one of the supported values
         * @param {string} position - Position string
         * @return {string} Normalized position string
         * @private
         */
        static _normalizePosition(position) {
            const validPositions = [
                'top-center', 'top-left', 'top-right',
                'bottom-center', 'bottom-left', 'bottom-right'
            ];

            if (validPositions.includes(position)) {
                return position;
            }

            // Handle abbreviated positions
            if (position === 'top') return 'top-center';
            if (position === 'bottom') return 'bottom-center';

            // Default
            return 'bottom-center';
        }

        /**
         * Create and show a notification
         * @param {string} id - The notification ID
         * @param {Object} config - Notification configuration
         * @private
         */
        static _createNotification(id, config) {
            const position = this._normalizePosition(config.position);
            const container = this._getContainer(position);

            // Create the notification element
            const element = document.createElement('div');
            element.id = id;
            element.className = `${Notification.BASE_NOTIFICATION_CLASS} ${Notification.BASE_NOTIFICATION_CLASS}--${config.type}`;

            if (config.showProgress && config.duration > 0) {
                element.classList.add(`${Notification.BASE_NOTIFICATION_CLASS}--with-progress`);
                // Set the animation duration for the progress bar
                element.style.setProperty('--progress-duration', `${config.duration}ms`);
            }

            if (config.className) {
                element.classList.add(config.className);
            }

            // Apply custom styles
            if (config.style && typeof config.style === 'object') {
                Object.assign(element.style, config.style);
            }

            // Create content structure
            let content = '';

            // Add icon if provided
            if (config.icon) {
                content += `<div class="${Notification.BASE_NOTIFICATION_CLASS}-icon">${config.icon}</div>`;
            }

            // Add message
            content += `<div class="${Notification.BASE_NOTIFICATION_CLASS}-content">`;
            if (config.html) {
                content += config.message;
            } else {
                const message = document.createTextNode(config.message);
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(message);
                content += tempDiv.innerHTML;
            }
            content += '</div>';

            // Add close button if needed
            if (config.showClose) {
                content += `<button class="${Notification.BASE_NOTIFICATION_CLASS}-close" aria-label="Close notification">×</button>`;
            }

            element.innerHTML = content;

            // Set up animations
            requestAnimationFrame(() => {
                container.appendChild(element);

                // Trigger layout/reflow before adding the visible class
                void element.offsetWidth;

                // Make visible
                element.classList.add(`${Notification.BASE_NOTIFICATION_CLASS}--visible`);

                // Set animation for progress bar if applicable
                const progressBar = element.querySelector(`.${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after`);
                if (progressBar) {
                    progressBar.style.animationDuration = `${config.duration}ms`;
                }
            });

            // Add to active notifications
            this._activeNotifications.push({
                id,
                element,
                position,
                config
            });

            // Set up click handler
            if (config.onClick) {
                element.addEventListener('click', event => {
                    // Only trigger if not clicking the close button
                    if (!event.target.closest(`.${Notification.BASE_NOTIFICATION_CLASS}-close`)) {
                        config.onClick(event, id);
                    }
                });
            }

            // Set up close button handler
            const closeButton = element.querySelector(`.${Notification.BASE_NOTIFICATION_CLASS}-close`);
            if (closeButton) {
                closeButton.addEventListener('click', () => this.close(id, true));
            }

            // Set auto-close timeout if duration > 0
            if (config.duration > 0) {
                setTimeout(() => {
                    // Check if notification still exists before closing
                    if (document.getElementById(id)) {
                        this.close(id, true);
                    }
                }, config.duration);
            }
        }

        /**
         * Remove a notification element from the DOM
         * @param {HTMLElement} element - The notification element
         * @param {Object} notification - The notification object
         * @private
         */
        static _removeNotificationElement(element, notification) {
            if (!element) return;

            // Call onClose callback if provided
            if (notification && notification.config && notification.config.onClose) {
                try {
                    notification.config.onClose(notification.id);
                } catch (e) {
                    Logger.error(e, 'Error in notification onClose callback');
                }
            }

            // Remove the element
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }

            // Check if container is empty and remove it if so
            const container = this._containers[notification.position];
            if (container && !container.hasChildNodes()) {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                delete this._containers[notification.position];
            }
        }

        /**
         * Process the notification queue for a specific position
         * @param {string} position - Position to process
         * @private
         */
        static _processQueue(position) {
            const normalizedPosition = this._normalizePosition(position);

            // Check how many active notifications we have in this position
            const activeCount = this._activeNotifications.filter(n => n.position === normalizedPosition).length;

            // Check if we can show more
            if (activeCount >= this._maxNotificationsPerContainer) return;

            // Find the first queued notification for this position
            const queueIndex = this._queue.findIndex(n =>
                this._normalizePosition(n.position) === normalizedPosition
            );

            if (queueIndex !== -1) {
                // Remove from queue and show
                const nextNotification = this._queue.splice(queueIndex, 1)[0];
                this._createNotification(nextNotification.id, nextNotification);
            }
        }
    }

    // Static property to track if styles have been initialized
    Notification.stylesInitialized = false;

    class BaseDownloadStrategy {
      constructor(name) {
        if (this.constructor === BaseDownloadStrategy) {
          throw new Error('Abstract classes can\'t be instantiated.');
        }
        this.strategyName = name || this.constructor.name;
      }

      /**
         * Checks if this strategy is potentially applicable to the given video element.
         * Optional: Can be overridden by subclasses for quick filtering.
         * @param {HTMLVideoElement} video
         * @return {boolean}
         */
      isApplicable(video) { // eslint-disable-line no-unused-vars
        return true; // Default to true, attempt will do the real check
      }

      /**
         * Attempts to initiate a download using this strategy.
         * Must be implemented by subclasses.
         * @param {HTMLVideoElement} video - The video element.
         * @param {string} filename - The desired filename.
         * @param {Object} helpers - Utility functions { downloadFromUrl, downloadFromBlob, triggerDownload, recordFromStream, findJsonVideoUrls }
         * @return {Promise<boolean>} Resolves with `true` if download was successfully initiated, `false` if the strategy was not applicable or couldn't find a source, rejects on actual error during processing (e.g., fetch failed).
         * @abstract
         */
      async attempt(video, filename, helpers) { // eslint-disable-line no-unused-vars
        throw new Error('Method \'attempt()\' must be implemented.');
      }
    }

    class DirectSrcStrategy extends BaseDownloadStrategy {
      constructor() {
        super('DirectSrc');
      }

      async attempt(video, filename, {downloadFromUrl}) {
        if (video.src && !video.src.startsWith('blob:')) {
          Logger.debug(`Strategy ${this.strategyName}: Using direct video src attribute.`, video.src);
          await downloadFromUrl(video.src, filename); // downloadFromUrl handles PubSub/logging for success/error
          return true; // Signal that download was initiated
        }
        return false; // Not applicable
      }
    }

    class SourceTagStrategy extends BaseDownloadStrategy {
      constructor() {
        super('SourceTag');
      }

      async attempt(video, filename, {downloadFromUrl}) {
        const sourceElement = video.querySelector('source[src]');
        if (sourceElement?.src && !sourceElement.src.startsWith('blob:')) {
          Logger.debug(`Strategy ${this.strategyName}: Using <source> tag src attribute.`, sourceElement.src);
          await downloadFromUrl(sourceElement.src, filename);
          return true;
        }
        return false;
      }
    }

    class JsonSearchStrategy extends BaseDownloadStrategy {
      constructor() {
        super('JsonSearch');
        // Define regex as a class property with global flag to match all occurrences
        this.videoUrlRegex = /https?:(\\\/|\/)[^\s"'<>]+(\\\/|\/)[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]+)?/gi;
      }

      // --- Helper methods specific to this strategy ---
      findJsonVideoUrls() {
        const potentialUrls = new Set(); // Use Set to avoid duplicates
        const jsonScripts = document.querySelectorAll('script[type="application/json"]');

        for (const script of jsonScripts) {
          if (script.textContent) {
            // Direct extraction of URLs from text content
            const content = script.textContent;
            let match;

            // Reset regex for each new search
            this.videoUrlRegex.lastIndex = 0;

            // Find all matches in the content
            while (null !== (match = this.videoUrlRegex.exec(content))) {
              if (match[0] && 1000 > match[0].length) {
                // Clean up escaped slashes in the URL
                const cleanUrl = match[0].replace(/\\\//g, '/');
                potentialUrls.add(cleanUrl);
              }
            }
          }
        }

        // Check global variables like window.__PRELOADED_STATE__ if needed
        if (window.__PRELOADED_STATE__ && 'string' === typeof window.__PRELOADED_STATE__) {
          let match;
          this.videoUrlRegex.lastIndex = 0;
          while (null !== (match = this.videoUrlRegex.exec(window.__PRELOADED_STATE__))) {
            if (match[0] && 1000 > match[0].length) {
              const cleanUrl = match[0].replace(/\\\//g, '/');
              potentialUrls.add(cleanUrl);
            }
          }
        }

        return Array.from(potentialUrls);
      }

      // --- End Helper methods ---

      async attempt(video, filename, {downloadFromUrl}) { // eslint-disable-line no-unused-vars
        Logger.debug(`Strategy ${this.strategyName}: Searching embedded JSON in <script> tags.`);
        try {
          const jsonUrls = this.findJsonVideoUrls();
          if (0 < jsonUrls.length) {
            const firstValidUrl = jsonUrls.find((url) => {
              try {
                new URL(url);
                return true;
              } catch {
                return false;
              }
            });

            if (firstValidUrl) {
              Logger.debug(`Strategy ${this.strategyName}: Found potential video URL in JSON.`, firstValidUrl);
              await downloadFromUrl(firstValidUrl, filename);
              return true; // Initiated
            } else {
              Logger.debug(`Strategy ${this.strategyName}: Found URLs in JSON, but none seemed valid.`, {urls: jsonUrls});
            }
          } else {
            Logger.debug(`Strategy ${this.strategyName}: No potential video URLs found in page JSON data.`);
          }
        } catch (err) {
          Logger.error(err, `Strategy ${this.strategyName}: Error occurred while searching JSON data.`);
          // Decide if this is a strategy failure (reject) or just not applicable (return false)
          // Let's treat internal errors as failure.
          throw err; // Propagate the error
        }
        return false; // Not applicable / No valid URL found
      }
    }

    class DataAttributeStrategy extends BaseDownloadStrategy {
      constructor() {
        super('DataAttribute');
      }

      async attempt(video, filename, {downloadFromUrl}) {
        const dataSrc = video.dataset.videoSrc || video.dataset.originalSrc || video.dataset.src;
        if (dataSrc && !dataSrc.startsWith('blob:')) {
          try {
            new URL(dataSrc); // Validate
            Logger.debug(`Strategy ${this.strategyName}: Using data-* attribute src.`, dataSrc);
            await downloadFromUrl(dataSrc, filename);
            return true;
          } catch (e) {
            Logger.warn(`Strategy ${this.strategyName}: Found data-* attribute, but it was not a valid URL.`, {
              dataSrc,
              error: e,
            });
            // Fall through to return false (not applicable/failed validation)
          }
        }
        return false;
      }
    }

    class BlobFetchStrategy extends BaseDownloadStrategy {
      constructor() {
        super('BlobFetch');
      }

      async attempt(video, filename, {downloadFromBlob}) {
        if (video.src && video.src.startsWith('blob:')) {
          Logger.debug(`Strategy ${this.strategyName}: Attempting to fetch blob URL.`, video.src);
          try {
            const response = await fetch(video.src);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            if (0 < blob.size && blob.type?.startsWith('video/')) {
              Logger.debug(`Strategy ${this.strategyName}: Fetched blob successfully via fetch().`, {
                size: blob.size,
                type: blob.type,
              });
              await downloadFromBlob(blob, filename); // downloadFromBlob handles PubSub/logging
              return true; // Initiated
            } else {
              Logger.warn(`Strategy ${this.strategyName}: Fetched blob appears empty or has non-video type.`, {
                size: blob.size,
                type: blob.type,
              });
              return false; // Not applicable (invalid blob)
            }
          } catch (err) {
            Logger.error(err, `Strategy ${this.strategyName}: Fetching blob URL failed.`);
            // Let the main loop catch this error by re-throwing
            throw err;
          }
        }
        return false; // Not applicable (src is not a blob)
      }
    }

    class MediaRecorderStrategy extends BaseDownloadStrategy {
      constructor() {
        super('MediaRecorder');
      }

      // --- Helper method specific to this strategy ---
      async recordFromStreamInternal(video, filename, {downloadFromBlob}) {
        if (!navigator.mediaDevices || !video.captureStream) {
          throw new Error('MediaRecorder API or captureStream() not supported.');
        }
        if (!MediaRecorder.isTypeSupported('video/mp4')) {
          Logger.warn(`Strategy ${this.strategyName}: video/mp4 mimetype not supported. Trying default.`);
        }

        let stream;
        try {
          stream = video.captureStream();
          if (!stream?.active || 0 === stream.getVideoTracks().length) {
            throw new Error('Failed to capture active video stream.');
          }

          const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : undefined;
          const recorder = new MediaRecorder(stream, {mimeType});
          const chunks = [];

          recorder.ondataavailable = (e) => {
            if (0 < e.data.size) chunks.push(e.data);
          };

          const recordingStopped = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = (event) => reject(event.error || new Error('MediaRecorder error.'));
          });

          recorder.start();
          Logger.debug(`Strategy ${this.strategyName}: Recording started.`);
          PubSub.publish('download:stream:start', {video, filename});


          const durationMs = Math.min((video.duration || 5), 5) * 1000;
          await new Promise((resolve) => setTimeout(resolve, durationMs));

          if ('recording' === recorder.state) recorder.stop();
          else Logger.warn(`Strategy ${this.strategyName}: Recorder not recording before stop`, {state: recorder.state});

          await recordingStopped;
          PubSub.publish('download:stream:end', {filename});
          Logger.debug(`Strategy ${this.strategyName}: Recording process finished.`);

          if (0 === chunks.length) {
            throw new Error('MediaRecorder did not produce any data chunks.');
          }

          const recordedBlob = new Blob(chunks, {type: recorder.mimeType || 'video/mp4'});
          const finalFilename = filename.replace(/\.mp4$/i, '') + '.' + (recordedBlob.type.split('/')[1] || 'mp4');

          Logger.debug(`Strategy ${this.strategyName}: Blob created from chunks.`, {
            size: recordedBlob.size,
            type: recordedBlob.type,
          });
          await downloadFromBlob(recordedBlob, finalFilename); // Let downloadFromBlob handle logs/events
        } finally {
          stream?.getTracks().forEach((track) => track.stop());
        }
      }

      // --- End Helper method ---

      async attempt(video, filename, helpers) {
        if ('function' === typeof video.captureStream) {
          Logger.debug(`Strategy ${this.strategyName}: Attempting MediaRecorder stream recording fallback.`);
          try {
            await this.recordFromStreamInternal(video, filename, helpers);
            return true; // Initiated (via downloadFromBlob)
          } catch (err) {
            Logger.error(err, `Strategy ${this.strategyName} failed during recording/download.`);
            // Let the main loop catch this error
            throw err;
          }
        }
        return false; // Not applicable
      }
    }

    // Initialize Greasemonkey/Tampermonkey functions safely

    const GM = GMFunctions.initialize();

    /**
     * @typedef {Object} DVideoDownloownloadOptions
     * @property {string} [filename] - A custom filename for the downloaded video.
     */

    /**
     * VideoDownloader - Uses the Strategy pattern to reliably download videos.
     *
     * It iterates through a predefined list of download strategies (algorithms)
     * until one successfully initiates the download.
     */
    class VideoDownloader {
      // --- Core Download Triggering Methods (remain static or could be instance methods) ---

      /**
         * Downloads a video from a direct URL using GM_download or anchor fallback.
         * @private
         */
      static async downloadFromUrl(url, filename) {
        PubSub.publish('download:url', {url, filename});
        Logger.debug('Attempting download via URL', {url: url.substring(0, 100) + '...', filename});
        try {
          if (GM?.GM_download && 'function' === typeof GM.GM_download) {
            Logger.debug('Using GM_download for URL.', {filename});
            // GM_download is often synchronous or doesn't return a useful promise
            GM.GM_download({url: url, name: filename, saveAs: true});
          } else {
            Logger.debug('Using fallback anchor download for URL.', {filename});
            this.triggerDownload(url, filename);
          }
          PubSub.publish('download:success', {filename, method: GM?.GM_download ? 'GM_download' : 'anchor'});
          Logger.debug('Download successfully initiated via URL method.', filename);
        } catch (err) {
          Logger.error(err, 'downloadFromUrl failed');
          PubSub.publish('download:error', {filename, url, error: err});
          throw err; // Propagate error to the calling strategy
        }
      }

      /**
         * Downloads a video from a Blob object.
         * @private
         */
      static async downloadFromBlob(blob, filename) {
        PubSub.publish('download:blob', {filename, size: blob.size, type: blob.type});
        Logger.debug('Attempting download via Blob', {filename, size: blob.size, type: blob.type});
        let blobUrl = null;
        try {
          blobUrl = URL.createObjectURL(blob);
          Logger.debug('Blob Object URL created.', blobUrl.substring(0, 100) + '...');
          this.triggerDownload(blobUrl, filename);
          PubSub.publish('download:success', {filename, method: 'blob'});
          Logger.debug('Blob download successfully triggered.', filename);
        } catch (err) {
          Logger.error(err, 'downloadFromBlob failed');
          PubSub.publish('download:error', {filename, blobInfo: {size: blob.size, type: blob.type}, error: err});
          throw err; // Propagate error
        } finally {
          if (blobUrl) {
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
              Logger.debug('Blob Object URL revoked.');
            }, 1500);
          }
        }
      }

      /**
         * Triggers a file download using a temporary anchor element.
         * @private
         */
      static triggerDownload(url, filename) {
        Logger.debug('Triggering anchor download.', {url: url.substring(0, 100) + '...', filename});
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        try {
          a.click();
          Logger.debug('Anchor element clicked.', filename);
        } catch (err) {
          Logger.error(err, 'Failed to click anchor element.');
          throw err; // Propagate error
        } finally {
          document.body.removeChild(a);
        }
      }

      // --- Strategy Execution Logic ---

      /**
         * Initiates the video download process by iterating through strategies.
         *
         * @param {HTMLVideoElement} video - The target HTML video element.
         * @param {DownloadOptions} [options={}] - Optional configuration.
         * @return {Promise<void>} Resolves when download is initiated or all strategies fail.
         */
      static async download(video, options = {}) {
        if (!(video instanceof HTMLVideoElement)) {
          Logger.error(new Error('Invalid input: Not an HTMLVideoElement.'), 'VideoDownloader.download');
          PubSub.publish('download:error', {video, error: 'Invalid input element'});
          alert('Download failed: Invalid video element provided.');
          return;
        }

        PubSub.publish('download:start', {video, options});
        Logger.debug('Attempting to download video using strategies', {video, options});

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = options.filename || `video_${timestamp}.mp4`;

        // Define the order of strategies to try
        const strategies = [
          new DirectSrcStrategy(),
          new SourceTagStrategy(),
          new DataAttributeStrategy(),
          new JsonSearchStrategy(),
          new BlobFetchStrategy(),
          new MediaRecorderStrategy(), // Last resort
        ];

        // Prepare helpers object to pass to strategies (could also use dependency injection)
        const helpers = {
          downloadFromUrl: this.downloadFromUrl.bind(this),
          downloadFromBlob: this.downloadFromBlob.bind(this),
          triggerDownload: this.triggerDownload.bind(this),
          // Note: MediaRecorderStrategy embeds its own logic but uses downloadFromBlob helper
        };

        let downloadInitiated = false;
        for (const strategy of strategies) {
          // Optional: Quick check if strategy might be applicable
          if (!strategy.isApplicable(video)) {
            Logger.debug(`Strategy ${strategy.strategyName} skipped (not applicable).`);
            continue;
          }

          try {
            Logger.debug(`Attempting strategy: ${strategy.strategyName}`);
            const success = await strategy.attempt(video, filename, helpers);

            if (success) {
              Logger.debug(`Strategy ${strategy.strategyName} successfully initiated download.`);
              downloadInitiated = true;
              break; // Exit loop on first success
            } else {
              // Strategy determined it wasn't applicable or couldn't find a source, but didn't error.
              Logger.debug(`Strategy ${strategy.strategyName} did not initiate download (not applicable or no source found).`);
            }
          } catch (error) {
            // Strategy encountered an error during its execution (e.g., fetch failed)
            Logger.error(error, `Strategy ${strategy.strategyName} failed with error`);
            // Continue to the next strategy
          }
        }

        if (!downloadInitiated) {
          PubSub.publish('download:failed', {video, filename});
          Logger.error(new Error('All download strategies failed for this video.'), 'VideoDownloader');
          alert('Failed to download video using all available methods. You might need to use browser developer tools or specific extensions.');
        }
      }
    }

    class BaseStrategy {
      constructor(callback) {
        this.callback = callback;
      }

      start() {
      }

      stop() {
      }
    }

    class PollingStrategy extends BaseStrategy {
      constructor(callback, interval = 500) {
        super(callback);
        this.interval = interval;
        this.lastUrl = location.href;
      }

      start() {
        Logger.debug('PollingStrategy started');
        this.timer = setInterval(() => {
          const current = location.href;
          if (current !== this.lastUrl) {
            Logger.debug(`Polling detected change: ${this.lastUrl} → ${current}`);
            this.callback(current, this.lastUrl);
            this.lastUrl = current;
          }
        }, this.interval);
      }

      stop() {
        clearInterval(this.timer);
        Logger.debug('PollingStrategy stopped');
      }
    }

    // Import core components

    // Initialize GM functions fallbacks
    GMFunctions.initialize();

    // Configure logger
    Logger.setPrefix("Instagram Video Controls");
    Logger.DEBUG = true;

    /**
     * Instagram Video Controller
     * Adds native HTML5 video controls to Instagram videos with robust fallbacks
     */
    class InstagramVideoController {
        // Configuration
        static SELECTORS = {
            VIDEO: 'video',
            VIDEO_CONTAINER: '._aatk',  // Instagram's video container class
            STORY_OVERLAY: '._ac0m',     // Story overlay class
            CONTROLS_OVERLAY: '._9zmv1', // Controls overlay that can block native controls
            BODY: 'body'                // Main body element
        };

        static CLASSES = {
            PROCESSED: 'igvc-processed',
            ENHANCED: 'igvc-enhanced',
            CUSTOM_CONTROLS: 'igvc-custom-controls',
            CONTROL_BAR: 'igvc-control-bar',
            SETTINGS_PANEL: 'igvc-settings-panel',
            DOWNLOAD_BUTTON: 'igvc-download-btn',
            SPEED_BUTTON: 'igvc-speed-btn',
            LOOP_BUTTON: 'igvc-loop-btn',
            STATS_BUTTON: 'igvc-stats-btn',
            SPEED_ACTIVE: 'igvc-speed-active',
            LOOP_ACTIVE: 'igvc-loop-active'
        };

        static SETTINGS_KEYS = {
            ENHANCED_MODE: 'igvc-enhanced-mode',
            DEFAULT_VOLUME: 'igvc-default-volume',
            DISABLE_AUTOPLAY: 'igvc-disable-autoplay',
            DEFAULT_SPEED: 'igvc-default-speed',
            LOOP_VIDEOS: 'igvc-loop-videos',
            KEYBOARD_SHORTCUTS: 'igvc-keyboard-shortcuts',
            SHOW_DOWNLOAD: 'igvc-show-download',
            SHOW_SPEED: 'igvc-show-speed',
            SHOW_LOOP: 'igvc-show-loop',
            SHOW_STATS: 'igvc-show-stats',
            AUDIO_UNMUTED: 'igvc-audio-unmuted',
        };

        static SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

        static KEYBOARD_SHORTCUTS = {
            SPACE: {key: ' ', description: 'Play/Pause'},
            LEFT_ARROW: {key: 'ArrowLeft', description: 'Seek -5s'},
            RIGHT_ARROW: {key: 'ArrowRight', description: 'Seek +5s'},
            UP_ARROW: {key: 'ArrowUp', description: 'Volume +10%'},
            DOWN_ARROW: {key: 'ArrowDown', description: 'Volume -10%'},
            M: {key: 'm', description: 'Mute/Unmute'},
            F: {key: 'f', description: 'Fullscreen'},
            D: {key: 'd', description: 'Download'},
            S: {key: 's', description: 'Change Speed'},
            L: {key: 'l', description: 'Loop on/off'}
        };

        static SETTINGS = {
            CHECK_INTERVAL: 1000,     // Fallback interval for checking videos (ms)
            OBSERVER_THROTTLE: 1000,   // Throttle DOM observer callbacks
            ENHANCED_MODE: true,      // Enable enhanced mode with additional features
            DEFAULT_VOLUME: 0.5,      // Default volume level (0.0 to 1.0)
            DISABLE_AUTOPLAY: false,  // Disable Instagram's autoplay behavior
            DEFAULT_SPEED: 1.0,       // Default playback speed
            LOOP_VIDEOS: false,       // Loop videos by default
            KEYBOARD_SHORTCUTS: true, // Enable keyboard shortcuts
            SHOW_DOWNLOAD: true,      // Show download button
            SHOW_SPEED: true,         // Show speed control button
            SHOW_LOOP: true,          // Show loop button
            SHOW_STATS: true          // Show video stats button
        };

        /**
         * Initialize the controller
         */
        constructor() {
            this.lastUrl = location.href;
            this.domObserver = null;
            this.lastProcessTime = 0;
            this.activeVideo = null;
            this.settingsPanel = null;
            this.keyboardHandler = null;
            this.currentVideoDownloadUrl = null;

            // Load saved settings
            this.loadSettings();

            Logger.debug("Initializing Instagram Video Controller");

            // Apply styles first
            this.applyStyles();

            // Create settings panel
            this.createSettingsPanel();

            // Process existing videos
            this.processVideos();

            // Setup keyboard shortcuts if enabled
            if (this.settings.KEYBOARD_SHORTCUTS) {
                this.setupKeyboardShortcuts();
            }

            this.setupDOMObserver();
        }

        /**
         * Load saved settings from GM storage
         */
        loadSettings() {
            this.settings = {...InstagramVideoController.SETTINGS};

            try {
                // Load each setting individually with defaults
                Object.entries(InstagramVideoController.SETTINGS_KEYS).forEach(([settingName, storageKey]) => {
                    const savedValue = GM_getValue(storageKey, null);

                    // Only update if the setting exists in storage
                    if (savedValue !== null) {
                        this.settings[settingName] = savedValue;
                    }
                });

                this.audioUnmuted = GM_getValue(InstagramVideoController.SETTINGS_KEYS.AUDIO_UNMUTED, false);
                Logger.debug("Settings loaded", this.settings);
            } catch (error) {
                Logger.error(error, "Loading settings");
            }
        }

        /**
         * Save settings to GM storage
         */
        saveSettings() {
            try {
                // Save each setting individually
                Object.entries(InstagramVideoController.SETTINGS_KEYS).forEach(([settingName, storageKey]) => {
                    GM_setValue(storageKey, this.settings[settingName]);
                });

                Logger.debug("Settings saved", this.settings);
            } catch (error) {
                Logger.error(error, "Saving settings");
            }
        }

        /**
         * Apply custom styles for the script
         */
        applyStyles() {
            StyleManager.addStyles(`
            /* Make videos with controls more visible */
            video.${InstagramVideoController.CLASSES.PROCESSED} {
            z-index: 10 !important;
            position: relative !important;
        }

        /* Ensure controls are visible */
        video.${InstagramVideoController.CLASSES.PROCESSED}::-webkit-media-controls {
            opacity: 1 !important;
            display: flex !important;
        }

        /* Additional styles for enhanced mode */
        video.${InstagramVideoController.CLASSES.ENHANCED} {
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
            border-radius: 3px;
            transition: box-shadow 0.2s ease-in-out;
        }

        video.${InstagramVideoController.CLASSES.ENHANCED}:hover {
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
        }

        /* Prevent Instagram from hiding our controls */
    ._9zmv1[aria-hidden="true"] {
            display: none !important;
        }

        /* Custom controls bar */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            top: 40px; /* Position above native controls */
            right: 10px;
            z-index: 12;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            padding: 4px 8px;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }

        /* Show controls on video hover */
        video.${InstagramVideoController.CLASSES.PROCESSED}:hover + .${InstagramVideoController.CLASSES.CONTROL_BAR},
    .${InstagramVideoController.CLASSES.CONTROL_BAR}:hover {
            opacity: 1;
            pointer-events: auto;
        }

        /* Control buttons */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button {
            background: transparent;
            border: none;
            color: white;
            font-size: 14px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            outline: none;
            transition: background-color 0.2s ease;
        }

    .${InstagramVideoController.CLASSES.CONTROL_BAR} button:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        /* Active state for toggleable buttons */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button.${InstagramVideoController.CLASSES.SPEED_ACTIVE},
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button.${InstagramVideoController.CLASSES.LOOP_ACTIVE} {
            background-color: rgba(255, 255, 255, 0.3);
            color: #1da1f2;
        }

        /* Video stats display */
    .igvc-stats-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: monospace;
            z-index: 11;
            pointer-events: none;
            display: none;
        }

    .igvc-stats-overlay.active {
            display: block;
        }

    .igvc-stats-overlay p {
            margin: 4px 0;
            line-height: 1.3;
        }

        /* Tooltip styles */
    .igvc-tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            transform: translateY(-30px);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        /* Settings panel styles handled by SidebarPanel component */
    .igvc-settings-title {
            margin-bottom: 16px;
            font-weight: bold;
            font-size: 16px;
        }

    .igvc-settings-section {
            margin-bottom: 20px;
        }

    .igvc-settings-section h3 {
            margin-bottom: 10px;
            font-size: 14px;
            color: #444;
        }

    .igvc-setting-item {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

    .igvc-setting-label {
            font-size: 13px;
            flex: 1;
        }

    .igvc-shortcut-list {
            margin-top: 10px;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }

    .igvc-shortcut-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
        }

    .igvc-shortcut-key {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            margin-right: 10px;
        }

        /* Speed selection menu */
    .igvc-speed-menu {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 6px;
            padding: 8px 0;
            z-index: 20;
            display: none;
            flex-direction: column;
            gap: 4px;
            top: -130px;
            right: 10px;
        }

    .igvc-speed-menu.active {
            display: flex;
        }

    .igvc-speed-option {
            color: white;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.15s ease;
        }

    .igvc-speed-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

    .igvc-speed-option.active {
            background-color: rgba(29, 161, 242, 0.3);
            color: #fff;
        }

        /* Custom seekbar preview thumbnail */
    .igvc-seekbar-preview {
            position: absolute;
            background: #000;
            border: 2px solid white;
            border-radius: 4px;
            width: 160px;
            height: 90px;
            z-index: 15;
            pointer-events: none;
            display: none;
            bottom: 50px;
            transform: translateX(-50%);
        }`
                , 'instagram-video-controls-styles');

            Logger.debug("Custom styles applied");
        }

        // Add a new method for setting up the DOM observer
        setupDOMObserver() {
            // Create a throttled callback for handling mutations
            const handleMutations = (mutations) => {
                // Clear any existing timeout to prevent multiple rapid processing
                if (this.processingThrottleTimeout) {
                    clearTimeout(this.processingThrottleTimeout);
                }

                // Check if any of the mutations might have added videos
                const shouldProcess = mutations.some(mutation => {
                    // Check for added nodes
                    if (mutation.addedNodes.length > 0) {
                        // Check if any added node is a video or could contain a video
                        return Array.from(mutation.addedNodes).some(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Either it's a video element
                                if (node.tagName === 'VIDEO') {
                                    return true;
                                }
                                // Or it contains video elements
                                return node.querySelector('video') !== null;
                            }
                            return false;
                        });
                    }
                    return false;
                });

                // Only schedule processing if necessary
                if (shouldProcess) {
                    // Use setTimeout for throttling (process max once every 500ms)
                    this.processingThrottleTimeout = setTimeout(() => {
                        Logger.debug("DOM changes detected that might have added videos, processing...");
                        this.processVideos();
                    }, 500);
                }
            };

            // Handle URL changes
            const handleUrlChange = (newUrl, oldUrl) => {
                Logger.debug(`URL changed: ${oldUrl} → ${newUrl}`);
                this.processVideos();
            };

            // Define strategies for Instagram's URL change detection
            const urlChangeStrategies = [
                new PollingStrategy(handleUrlChange, 1000), // Fallback polling strategy
            ];

            // Initialize DOMObserver with our callbacks and strategies
            this.domObserver = new DOMObserver(handleMutations, urlChangeStrategies);

            // Start observing document.body for changes
            this.domObserver.observe();

            Logger.debug("DOM Observer started");
        }

        /**
         * Create the settings panel using SidebarPanel component
         */
        createSettingsPanel() {
            try {
                // Create panel content
                const content = document.createElement('div');
                content.className = InstagramVideoController.CLASSES.SETTINGS_PANEL;

                // Title
                const title = document.createElement('div');
                title.className = 'igvc-settings-title';
                title.textContent = 'Instagram Video Controls Settings';
                content.appendChild(title);

                // Video Behavior section
                const behaviorSection = document.createElement('div');
                behaviorSection.className = 'igvc-settings-section';
                behaviorSection.innerHTML = '<h3>Video Behavior</h3>';

                // Add each setting control
                this.addSettingToggle(
                    behaviorSection,
                    'Enhanced Video Display',
                    'ENHANCED_MODE',
                    'Adds visual enhancements to videos'
                );

                this.addSettingToggle(
                    behaviorSection,
                    'Disable Autoplay',
                    'DISABLE_AUTOPLAY',
                    'Prevents videos from autoplaying'
                );

                this.addSettingToggle(
                    behaviorSection,
                    'Loop Videos',
                    'LOOP_VIDEOS',
                    'Automatically loop videos when they end'
                );

                // Volume slider
                const volumeItem = document.createElement('div');
                volumeItem.className = 'igvc-setting-item';

                const volumeLabel = document.createElement('div');
                volumeLabel.className = 'igvc-setting-label';
                volumeLabel.textContent = 'Default Volume';
                volumeItem.appendChild(volumeLabel);

                // Create volume slider using core Slider component
                const volumeSliderContainer = document.createElement('div');
                volumeSliderContainer.style.width = '150px';
                volumeItem.appendChild(volumeSliderContainer);

                behaviorSection.appendChild(volumeItem);

                // Create the slider after appending to ensure the container exists
                const volumeSlider = new Slider({
                    min: 0,
                    max: 1,
                    step: 0.1,
                    value: this.settings.DEFAULT_VOLUME,
                    container: volumeSliderContainer,
                    valueSuffix: 'x',
                    showValue: true,
                    onChange: (value) => {
                        this.settings.DEFAULT_VOLUME = value;
                        this.saveSettings();
                    }
                });

                content.appendChild(behaviorSection);

                // Features section
                const featuresSection = document.createElement('div');
                featuresSection.className = 'igvc-settings-section';
                featuresSection.innerHTML = '<h3>Features</h3>';

                this.addSettingToggle(
                    featuresSection,
                    'Keyboard Shortcuts',
                    'KEYBOARD_SHORTCUTS',
                    'Enable keyboard shortcuts for video control',
                    (value) => {
                        // Setup or remove keyboard shortcuts when toggled
                        if (value) {
                            this.setupKeyboardShortcuts();
                        } else {
                            this.removeKeyboardShortcuts();
                        }
                    }
                );

                this.addSettingToggle(
                    featuresSection,
                    'Show Download Button',
                    'SHOW_DOWNLOAD',
                    'Display download button in the control bar'
                );

                this.addSettingToggle(
                    featuresSection,
                    'Show Speed Control',
                    'SHOW_SPEED',
                    'Display playback speed button in the control bar'
                );

                this.addSettingToggle(
                    featuresSection,
                    'Show Loop Button',
                    'SHOW_LOOP',
                    'Display loop button in the control bar'
                );

                this.addSettingToggle(
                    featuresSection,
                    'Show Video Stats',
                    'SHOW_STATS',
                    'Display detailed video statistics'
                );

                content.appendChild(featuresSection);

                // Keyboard shortcuts section (if enabled)
                if (this.settings.KEYBOARD_SHORTCUTS) {
                    const shortcutsSection = document.createElement('div');
                    shortcutsSection.className = 'igvc-settings-section';
                    shortcutsSection.innerHTML = '<h3>Keyboard Shortcuts</h3>';

                    const shortcutsList = document.createElement('div');
                    shortcutsList.className = 'igvc-shortcut-list';

                    // Add each shortcut
                    Object.entries(InstagramVideoController.KEYBOARD_SHORTCUTS).forEach(([name, shortcut]) => {
                        const shortcutItem = document.createElement('div');
                        shortcutItem.className = 'igvc-shortcut-item';

                        const keyElement = document.createElement('span');
                        keyElement.className = 'igvc-shortcut-key';
                        keyElement.textContent = shortcut.key === ' ' ? 'Space' : shortcut.key;

                        const descElement = document.createElement('span');
                        descElement.className = 'igvc-shortcut-desc';
                        descElement.textContent = shortcut.description;

                        shortcutItem.appendChild(keyElement);
                        shortcutItem.appendChild(descElement);
                        shortcutsList.appendChild(shortcutItem);
                    });

                    shortcutsSection.appendChild(shortcutsList);
                    content.appendChild(shortcutsSection);
                }

                const buttonContainer = document.createElement('div');

                // Create a reset button
                const resetButton = new Button({
                    text: 'Reset to Defaults',
                    className: 'igvc-reset-button',
                    onClick: () => {
                        // Confirm before resetting
                        if (confirm('Are you sure you want to reset all settings to default values?')) {
                            this.settings = {...InstagramVideoController.SETTINGS};
                            this.saveSettings();

                            // Close and recreate the panel to reflect changes
                            this.settingsPanel.close();
                            setTimeout(() => this.createSettingsPanel(), 300);

                            // Show notification
                            Notification.success('Settings have been reset to defaults');
                        }
                    },
                    container: buttonContainer
                });

                // Add button container
                buttonContainer.style.marginTop = '20px';
                buttonContainer.style.textAlign = 'center';
                content.appendChild(buttonContainer);

                // Create the sidebar panel
                this.settingsPanel = new SidebarPanel({
                    title: 'Instagram Video Controls',
                    id: 'igvc-settings-panel',
                    position: 'right',
                    transition: 'slide',
                    buttonIcon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v3M19.07 5.93l-2.12 2.12M22 12h-3M19.07 18.07l-2.12-2.12M12 22v-3M4.93 18.07l2.12-2.12M2 12h3M4.93 5.93l2.12 2.12"/><circle cx="12" cy="12" r="4"/></svg>',
                    content: {
                        html: content
                    },
                    style: {
                        width: '320px',
                        buttonBg: '#405DE6',
                        buttonColor: 'white'
                    }
                });

                Logger.debug("Settings panel created");
            } catch (error) {
                Logger.error(error, "Creating settings panel");
            }
        }

        /**
         * Add a setting toggle to the settings panel
         * @param {HTMLElement} container - Container to add the toggle to
         * @param {string} label - Setting label
         * @param {string} settingKey - Key in the settings object
         * @param {string} description - Optional description/tooltip
         * @param {Function} onChange - Optional callback function
         */
        addSettingToggle(container, label, settingKey, description = '', onChange = null) {
            const settingItem = document.createElement('div');
            settingItem.className = 'igvc-setting-item';

            const labelElement = document.createElement('div');
            labelElement.className = 'igvc-setting-label';
            labelElement.textContent = label;

            if (description) {
                labelElement.title = description;
            }

            settingItem.appendChild(labelElement);

            // Create checkbox using core Checkbox component
            const checkbox = new Checkbox({
                checked: this.settings[settingKey],
                onChange: (e) => {
                    this.settings[settingKey] = e.target.checked;
                    this.saveSettings();

                    if (onChange) {
                        onChange(e.target.checked);
                    }
                },
                container: settingItem,
            });

            container.appendChild(settingItem);

            return checkbox;
        }

        /**
         * Process all unprocessed videos on the page
         */
        processVideos() {
            try {
                const videos = document.querySelectorAll(InstagramVideoController.SELECTORS.VIDEO);
                Logger.debug(`Found ${videos.length} total videos on page`);

                let processedCount = 0;

                videos.forEach(video => {
                    if (video.classList.length > 0 && !video.classList.contains(InstagramVideoController.CLASSES.PROCESSED)) {
                        this.enhanceVideo(video);
                        processedCount++;
                    }
                });

                if (processedCount > 0) {
                    Logger.debug(`Enhanced ${processedCount} new videos`);
                }
            } catch (error) {
                Logger.error(error, "Processing videos");
            }
        }

        /**
         * Enhance a video with native controls
         * @param {HTMLVideoElement} video - The video element to enhance
         */
        enhanceVideo(video) {
            // --- ADD THIS CHECK AT THE VERY BEGINNING ---
            // If already processed, skip (extra safety check)
            if (video.classList.contains(InstagramVideoController.CLASSES.PROCESSED)) {
                // Logger.debug("Skipping already processed video:", video.src?.substring(0, 50));
                return;
            }
            // --- END ADDED CHECK ---

            try {
                // Mark as processed
                video.classList.add(InstagramVideoController.CLASSES.PROCESSED);

                // Add enhanced class if enabled
                if (this.settings.ENHANCED_MODE) {
                    video.classList.add(InstagramVideoController.CLASSES.ENHANCED);
                }

                // Enable native controls
                video.setAttribute('controls', 'true');
                video.controls = true;

                // Apply the global preference ONLY if the video is currently muted.
                // If the video is already unmuted (e.g., by Instagram itself), leave it.
                if (this.audioUnmuted && video.muted) {
                    video.muted = false;
                    Logger.debug("Applying global unmute preference to video:", video.src?.substring(0, 50));
                } else if (!this.audioUnmuted && !video.muted) {
                    // If global preference is muted, but video isn't, mute it initially.
                    // This handles cases where IG might default to unmuted on some videos.
                    // video.muted = true; // Optional: Decide if you want to enforce mute initially
                    Logger.debug("Video initially unmuted, respecting global mute preference (or default).");
                }

                let volumeEventTrusted = false;
                const handler = (e) => volumeEventTrusted = e.isTrusted;
                video.addEventListener('volumechange', handler, {once: true});

                // Listen for user unmuting the video
                video.addEventListener('volumechange', () => {
                    const isNowAudible = !video.muted && video.volume > 0;

                    if (isNowAudible && volumeEventTrusted) {
                        this.audioUnmuted = true;
                        GM_setValue(InstagramVideoController.SETTINGS_KEYS.AUDIO_UNMUTED, true);
                        Logger.debug("User unmuted video (volume > 0), preference saved.");
                    } else if (video.muted || video.volume === 0) {
                        this.audioUnmuted = false;
                        Logger.debug("Video manually muted or volume set to 0. Global preference remains:", this.audioUnmuted);
                    }
                });

                // Set default volume if not already set
                if (video.volume < 0.1) {
                    video.volume = this.settings.DEFAULT_VOLUME;
                }

                // Apply default playback speed
                if (video.volume < 0.01) { // Check if volume is effectively zero
                    video.volume = this.settings.DEFAULT_VOLUME;
                    Logger.debug("Setting default volume:", this.settings.DEFAULT_VOLUME);
                }

                // Disable autoplay if setting is enabled
                if (this.settings.DISABLE_AUTOPLAY) {
                    video.autoplay = false;

                    // Force-stop the video if it's playing
                    if (!video.paused) {
                        video.pause();
                    }

                    // Override play method to prevent further autoplay
                    const originalPlay = video.play;
                    video.play = function (...args) {
                        // Allow user-initiated plays by checking if it's from a click event
                        if (window.event && (window.event.type === 'click' || window.event.type === 'pointerup')) {
                            return originalPlay.apply(this, args);
                        }
                        return new Promise(resolve => resolve());
                    };
                }

                // Apply loop setting
                video.loop = this.settings.LOOP_VIDEOS;

                // Remove any overlays that might block controls
                this.removeOverlays(video);

                // Create control bar with additional features
                this.addEnhancedControls(video);

                Logger.debug("Video enhanced successfully", video.src?.substring(0, 50));

                // Setup additional improvements
                this.setupVideoImprovements(video);
            } catch (error) {
                Logger.error(error, "Enhancing video");
                // Ensure the class is removed if enhancement failed badly
                video.classList.remove(InstagramVideoController.CLASSES.PROCESSED);
            }
        }

        /**
         * Add enhanced controls to a video
         * @param {HTMLVideoElement} video - The video element to enhance
         */
        addEnhancedControls(video) {
            // Prevent adding duplicate control bars/stats overlays
            const parent = video.parentNode;
            if (!parent) return;

            const existingControlBar = parent.querySelector(`.${InstagramVideoController.CLASSES.CONTROL_BAR}[data-video-src="${video.src}"]`);
            parent.querySelector('.igvc-stats-overlay'); // Assuming only one stats overlay per parent

            if (existingControlBar) {
                Logger.debug("Control bar already exists for this video, skipping add.", video.src?.substring(0, 50));
                return;
            }

            try {
                // Create control bar
                const controlBar = document.createElement('div');
                controlBar.className = InstagramVideoController.CLASSES.CONTROL_BAR;
                controlBar.dataset.videoId = video.src;

                // Track active controls for this video
                const activeControls = [];

                // Download button 1
                if (this.settings.SHOW_DOWNLOAD) {
                    const downloadButton = document.createElement('button');
                    downloadButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
                    downloadButton.title = 'Download Video';
                    downloadButton.className = InstagramVideoController.CLASSES.DOWNLOAD_BUTTON;
                    downloadButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await VideoDownloader.download(video);
                    });
                    controlBar.appendChild(downloadButton);
                    activeControls.push('download');
                }

                // Speed control button
                if (this.settings.SHOW_SPEED) {
                    const speedButton = document.createElement('button');
                    speedButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v4M19.07 4.93l-2.83 2.83M22 12h-4M19.07 19.07l-2.83-2.83M12 18v4M7.76 19.07l-2.83-2.83M6 12H2M7.76 4.93L4.93 7.76"/></svg>';
                    speedButton.title = 'Playback Speed';
                    speedButton.className = InstagramVideoController.CLASSES.SPEED_BUTTON;

                    if (video.playbackRate !== 1.0) {
                        speedButton.classList.add(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                        speedButton.innerHTML = `${video.playbackRate}x`;
                    }

                    // Create speed menu
                    const speedMenu = document.createElement('div');
                    speedMenu.className = 'igvc-speed-menu';

                    // Add options
                    InstagramVideoController.SPEED_OPTIONS.forEach(speed => {
                        const option = document.createElement('div');
                        option.className = 'igvc-speed-option';
                        option.textContent = `${speed}x`;
                        option.dataset.speed = speed;

                        if (video.playbackRate === speed) {
                            option.classList.add('active');
                        }

                        option.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Set speed
                            video.playbackRate = speed;

                            // Update active class
                            Array.from(speedMenu.children).forEach(child => {
                                child.classList.remove('active');
                            });
                            option.classList.add('active');

                            // Update button text and appearance
                            speedButton.innerHTML = `${speed}x`;

                            if (speed !== 1.0) {
                                speedButton.classList.add(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                            } else {
                                speedButton.classList.remove(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                            }

                            // Hide menu
                            speedMenu.classList.remove('active');
                        });

                        speedMenu.appendChild(option);
                    });

                    controlBar.appendChild(speedMenu);

                    // Toggle speed menu on click
                    speedButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        speedMenu.classList.toggle('active');

                        // Close when clicking outside
                        const closeMenu = (e) => {
                            if (!speedMenu.contains(e.target) && e.target !== speedButton) {
                                speedMenu.classList.remove('active');
                                document.removeEventListener('click', closeMenu);
                            }
                        };

                        if (speedMenu.classList.contains('active')) {
                            // Use setTimeout to avoid immediate triggering
                            setTimeout(() => document.addEventListener('click', closeMenu), 0);
                        }
                    });

                    controlBar.appendChild(speedButton);
                    activeControls.push('speed');
                }

                // Loop button
                if (this.settings.SHOW_LOOP) {
                    const loopButton = document.createElement('button');
                    loopButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
                    loopButton.title = 'Loop Video';
                    loopButton.className = InstagramVideoController.CLASSES.LOOP_BUTTON;

                    if (video.loop) {
                        loopButton.classList.add(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                    }

                    loopButton.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Toggle loop state
                        video.loop = !video.loop;

                        // Update appearance
                        if (video.loop) {
                            loopButton.classList.add(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                        } else {
                            loopButton.classList.remove(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                        }
                    });

                    controlBar.appendChild(loopButton);
                    activeControls.push('loop');
                }

                // Stats button
                if (this.settings.SHOW_STATS) {
                    const statsButton = document.createElement('button');
                    statsButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
                    statsButton.title = 'Video Statistics';
                    statsButton.className = InstagramVideoController.CLASSES.STATS_BUTTON;

                    // Create stats overlay
                    const statsOverlay = document.createElement('div');
                    statsOverlay.className = 'igvc-stats-overlay';
                    const statsContent = document.createElement('div');
                    statsOverlay.appendChild(statsContent);

                    // Toggle stats display
                    statsButton.addEventListener('click', (e) => {
                        e.preventDefault();

                        if (statsOverlay.classList.contains('active')) {
                            statsOverlay.classList.remove('active');
                        } else {
                            // Update stats before showing
                            this.updateVideoStats(video, statsContent);
                            statsOverlay.classList.add('active');
                        }
                    });

                    // Add to control bar and parent container
                    controlBar.appendChild(statsButton);
                    video.parentNode.appendChild(statsOverlay);
                    activeControls.push('stats');

                    // Update stats periodically when visible
                    setInterval(() => {
                        if (statsOverlay.classList.contains('active') && document.contains(video)) {
                            this.updateVideoStats(video, statsContent);
                        }
                    }, 1000);
                }

                // Only add the control bar if we have active controls
                if (activeControls.length > 0) {
                    video.parentNode.insertBefore(controlBar, video.nextSibling);

                    // Store a reference to the active video when hovering controls
                    controlBar.addEventListener('mouseenter', () => {
                        this.activeVideo = video;
                    });

                    controlBar.addEventListener('mouseleave', () => {
                        this.activeVideo = null;
                    });
                }

            } catch (error) {
                Logger.error(error, "Adding enhanced controls");
            }
        }

        /**
         * Update video statistics display
         * @param {HTMLVideoElement} video - The video element
         * @param {HTMLElement} container - The stats container element
         */
        updateVideoStats(video, container) {
            try {
                // Get basic video info
                const currentTime = video.currentTime;
                const duration = video.duration || 0;
                const volume = Math.round(video.volume * 100);
                const playbackRate = video.playbackRate;
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;

                // Calculate time remaining
                const timeRemaining = duration - currentTime;

                // Format times as MM:SS
                const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                };

                // Build HTML with stats
                let html =
                    `  <p><b>Resolution:</b> ${videoWidth}×${videoHeight}</p>
            <p><b>Duration:</b> ${formatTime(duration)}</p>
            <p><b>Current:</b> ${formatTime(currentTime)}</p>
            <p><b>Remaining:</b> ${formatTime(timeRemaining)}</p>
            <p><b>Volume:</b> ${volume}%</p>
            <p><b>Speed:</b> ${playbackRate}x</p>
            <p><b>Loop:</b> ${video.loop ? 'On' : 'Off'}</p>`
                ;

                // Add extra info if available
                if (video.src) {
                    const srcSize = (video.src.length / 1024).toFixed(1);
                    html += `<p><b>Source Size:</b> ~${srcSize} KB</p>`;
                }

                // Update container content
                container.innerHTML = html;

            } catch (error) {
                Logger.error(error, "Updating video stats");
            }
        }

        /**
         * Set up keyboard shortcuts for video control
         */
        setupKeyboardShortcuts() {
            // Remove any existing handlers first
            this.removeKeyboardShortcuts();

            // Create keyboard handler
            this.keyboardHandler = (e) => {
                // Don't process shortcuts when typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }

                // Find active video (either the one with controls hovered or the currently visible one)
                let targetVideo = this.activeVideo;

                // If no active video found by controls hover, try to find one that's playing or visible
                if (!targetVideo) {
                    const videos = document.querySelectorAll(`video.${InstagramVideoController.CLASSES.PROCESSED}`);

                    // First try to find one that's playing
                    targetVideo = Array.from(videos).find(v => !v.paused);

                    // If none are playing, try to find one that's visible
                    if (!targetVideo) {
                        targetVideo = Array.from(videos).find(v => {
                            const rect = v.getBoundingClientRect();
                            return (
                                rect.top >= 0 &&
                                rect.left >= 0 &&
                                rect.bottom <= window.innerHeight &&
                                rect.right <= window.innerWidth
                            );
                        });
                    }

                    // If still no video found, use the first one
                    if (!targetVideo && videos.length > 0) {
                        targetVideo = videos[0];
                    }
                }

                // Do nothing if no video found
                if (!targetVideo) return;

                // Process keyboard shortcuts
                switch (e.key) {
                    case ' ': // Space - play/pause
                        e.preventDefault();
                        if (targetVideo.paused) {
                            targetVideo.play();
                        } else {
                            targetVideo.pause();
                        }
                        break;

                    case 'ArrowLeft': // Left arrow - seek backward 5s
                        e.preventDefault();
                        targetVideo.currentTime = Math.max(0, targetVideo.currentTime - 5);
                        break;

                    case 'ArrowRight': // Right arrow - seek forward 5s
                        e.preventDefault();
                        targetVideo.currentTime = Math.min(targetVideo.duration, targetVideo.currentTime + 5);
                        break;

                    case 'ArrowUp': // Up arrow - volume up 10%
                        e.preventDefault();
                        targetVideo.volume = Math.min(1, targetVideo.volume + 0.1);
                        break;

                    case 'ArrowDown': // Down arrow - volume down 10%
                        e.preventDefault();
                        targetVideo.volume = Math.max(0, targetVideo.volume - 0.1);
                        break;

                    case 'm': // M - mute/unmute
                    case 'M':
                        e.preventDefault();
                        targetVideo.muted = !targetVideo.muted;
                        break;

                    case 'f': // F - fullscreen
                    case 'F':
                        e.preventDefault();
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else if (targetVideo.requestFullscreen) {
                            targetVideo.requestFullscreen();
                        }
                        break;

                    case 'd': // D - download
                    case 'D':
                        e.preventDefault();
                        this.downloadVideo(targetVideo);
                        break;

                    case 's': // S - speed toggle
                    case 'S':
                        e.preventDefault();
                        // Cycle through speeds: 1x -> 1.5x -> 2x -> 0.5x -> 0.75x -> 1x
                        const speedSequence = [1, 1.5, 2, 0.5, 0.75, 1];
                        const currentIndex = speedSequence.findIndex(s => Math.abs(s - targetVideo.playbackRate) < 0.01);
                        const nextIndex = (currentIndex !== -1) ? (currentIndex + 1) % speedSequence.length : 1;
                        targetVideo.playbackRate = speedSequence[nextIndex];

                        // Show notification
                        Notification.info(`Playback speed: ${targetVideo.playbackRate}x`, {
                            duration: 1500,
                            position: 'top-center'
                        });
                        break;

                    case 'l': // L - loop toggle
                    case 'L':
                        e.preventDefault();
                        targetVideo.loop = !targetVideo.loop;

                        // Show notification
                        Notification.info(`Loop: ${targetVideo.loop ? 'On' : 'Off'}`, {
                            duration: 1500,
                            position: 'top-center'
                        });
                        break;
                }
            };

            // Add keyboard handler
            document.addEventListener('keydown', this.keyboardHandler);
            Logger.debug("Keyboard shortcuts enabled");
        }

        /**
         * Remove keyboard shortcuts
         */
        removeKeyboardShortcuts() {
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
                Logger.debug("Keyboard shortcuts removed");
            }
        }

        /**
         * Download the video
         * @param {HTMLVideoElement} video - The video element to download
         */
        async downloadVideo(video) {
            try {
                // 1. Try direct src download if it's a normal URL (not blob)
                if (video.src && !video.src.startsWith('blob:')) {
                    this.fallbackDownload(video.src);
                    return;
                }

                // 2. Try to find <source> tag inside video
                const source = video.querySelector('source');
                if (source && source.src && !source.src.startsWith('blob:')) {
                    this.fallbackDownload(source.src);
                    return;
                }

                // 3. Try to read from MediaStream (experimental, not widely supported)
                if (video.captureStream) {
                    Notification.info('Trying to record video stream...', {duration: 1500});
                    await this.recordAndDownload(video);
                    return;
                }

                // 4. Try to read from blob via fetch (may fail with opaque origin)
                try {
                    const blobResponse = await fetch(video.src);
                    const blob = await blobResponse.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    this.fallbackDownload(blobUrl);
                    return;
                } catch (fetchError) {
                    Logger.warn(fetchError, "Fetch blob failed");
                }

                // 5. Ultimate fallback: notify user to right-click manually
                Notification.error("Automatic download failed. Try right-clicking the video and selecting 'Save video as...'");
            } catch (error) {
                Logger.error(error, "Downloading video");
                Notification.error("Download failed: " + error.message);
            }
        }

        async recordAndDownload(video) {
            try {
                const stream = video.captureStream();
                const recorder = new MediaRecorder(stream);
                const chunks = [];

                recorder.ondataavailable = (e) => chunks.push(e.data);

                const done = new Promise((resolve) => {
                    recorder.onstop = () => resolve();
                });

                // Start recording
                recorder.start();

                // Record only a short chunk (e.g., 5 seconds or full duration if shorter)
                const duration = Math.min(video.duration || 5, 5);
                await new Promise((res) => setTimeout(res, duration * 1000));

                recorder.stop();
                await done;

                const blob = new Blob(chunks, {type: 'video/mp4'});
                const blobUrl = URL.createObjectURL(blob);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const filename = `instagram_video_recorded_${timestamp}.mp4`;

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 100);

                Notification.success("Recorded and downloaded a short clip");
            } catch (error) {
                Logger.error(error, "Recording video stream");
                Notification.error("Stream recording failed");
            }
        }

        /**
         * Remove overlays that might block video controls
         * @param {HTMLVideoElement} video - The video element
         */
        removeOverlays(video) {
            try {
                // Find parent container
                const container = video.closest(InstagramVideoController.SELECTORS.VIDEO_CONTAINER) ||
                    video.parentElement;

                if (!container) return;

                // Remove sibling overlays
                Array.from(container.children).forEach(child => {
                    if (child !== video && child.tagName === 'DIV') {
                        // Check if it's an overlay element
                        const isOverlay = !child.querySelector('img, video');

                        if (isOverlay) {
                            child.remove();
                            Logger.debug("Removed overlay element");
                        }
                    }
                });
            } catch (error) {
                Logger.error(error, "Removing overlays");
            }
        }

        /**
         * Setup additional improvements for videos
         * @param {HTMLVideoElement} video - The video element
         */
        setupVideoImprovements(video) {
            // Ensure we can play the video properly
            video.addEventListener('canplay', () => {
                // Enable picture-in-picture if supported
                if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
                    video.disablePictureInPicture = false;
                }
            }, {once: true});

            // Setup seekbar preview (experimental)
            this.setupSeekbarPreview(video);

            // Fix for videos that might lose controls after Instagram's JS runs
            const ensureControls = () => {
                if (!video.controls) {
                    video.controls = true;
                    Logger.debug("Re-applied controls to video");
                }
            };

            // Check periodically to ensure controls remain enabled
            const controlCheckInterval = setInterval(() => {
                if (document.body.contains(video)) {
                    ensureControls();
                } else {
                    // Video is no longer in DOM, clear interval
                    clearInterval(controlCheckInterval);
                }
            }, 2000);

            // Handle video errors
            video.addEventListener('error', (e) => {
                Logger.error(e, `Video error (code: ${video.error?.code}x)`);
            });
        }

        /**
         * Setup seekbar preview functionality
         * @param {HTMLVideoElement} video - The video element
         */
        setupSeekbarPreview(video) {
            try {
                // Create preview element
                const previewElement = document.createElement('div');
                previewElement.className = 'igvc-seekbar-preview';

                // Create preview video element
                const previewVideo = document.createElement('video');
                previewVideo.muted = true;
                previewVideo.src = video.src;
                previewVideo.style.width = '100%';
                previewVideo.style.height = '100%';

                previewElement.appendChild(previewVideo);
                video.parentNode.appendChild(previewElement);

                // Get the progress bar element (native controls)
                const progressListener = (e) => {
                    const progressBar = video.querySelector('input[type="range"]') ||
                        video.shadowRoot?.querySelector('input[type="range"]');

                    if (progressBar) {
                        // Mouse is over the seekbar
                        const rect = progressBar.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;

                        // Calculate preview position
                        if (percentage >= 0 && percentage <= 1) {
                            // Show preview
                            previewElement.style.display = 'block';
                            previewElement.style.left = `${rect.left + x}px`;

                            // Set time for preview
                            const previewTime = video.duration * percentage;
                            previewVideo.currentTime = previewTime;

                            // Pause preview to show the frame
                            previewVideo.pause();
                        }
                    } else {
                        // Mouse not over seekbar, hide preview
                        previewElement.style.display = 'none';
                    }
                };

                // Event listener with throttling
                let lastMove = 0;
                const throttledProgressListener = (e) => {
                    const now = Date.now();
                    if (now - lastMove > 50) { // Throttle to 50ms
                        lastMove = now;
                        progressListener(e);
                    }
                };

                // Add event listeners to track mouse position
                video.addEventListener('mousemove', throttledProgressListener);
                video.addEventListener('mouseleave', () => {
                    previewElement.style.display = 'none';
                });

            } catch (error) {
                Logger.error(error, "Setting up seekbar preview");
            }
        }
    }

    /**
     * Initialize the script
     */
    function init() {
        try {
            Notification.useDefaultColors();
            let controller;

            // Single function to process videos when they're available
            const processVideosWhenReady = (source = "init") => {
                Logger.debug(`Waiting for videos (source: ${source})...`);

                HTMLUtils.waitForElement('video', 10000, document)
                    .then(() => {
                        Logger.debug(`Video element detected (source: ${source})`);

                        // Create controller if it doesn't exist yet
                        if (!controller) {
                            controller = new InstagramVideoController();
                        } else {
                            controller.processVideos();
                        }
                    })
                    .catch(() => {
                        Logger.debug(`No video found after waiting period (source: ${source})`);
                        // Still initialize controller even if no videos found initially
                        if (!controller && source === "init") {
                            controller = new InstagramVideoController();
                        }
                    });
            };

            // Handle initial page load
            processVideosWhenReady("init");

            Logger.debug("Instagram Video Controls initialized successfully");
        } catch (error) {
            Logger.error(error, "Script initialization");
        }
    }


    // Run the initialization
    init();

})();
