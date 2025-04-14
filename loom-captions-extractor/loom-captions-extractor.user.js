// ==UserScript==
// @name        loom-captions-extractor
// @description Extract and download closed captions from Loom videos
// @namespace   https://github.com/baturkacamak/userscripts
// @version     1.0.0
// @author      Batur Kacamak
// @homepage    https://github.com/baturkacamak/userscripts/tree/master/loom-captions-extractor#readme
// @homepageURL https://github.com/baturkacamak/userscripts/tree/master/loom-captions-extractor#readme
// @downloadURL https://github.com/baturkacamak/userscripts/raw/master/loom-captions-extractor/loom-captions-extractor.user.js
// @updateURL   https://github.com/baturkacamak/userscripts/raw/master/loom-captions-extractor/loom-captions-extractor.user.js
// @match       https://*.loom.com/share/*
// @match       https://*.loom.com/*
// @icon        https://cdn.loom.com/assets/favicons-loom/favicon-32x32.png
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @grant       GM_download
// @grant       GM_getValue
// @grant       GM_setValue
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

    // Import core components

    // Initialize GM functions fallbacks
    GMFunctions.initialize();

    // Initialize logger
    Logger.setPrefix("Loom Captions Extractor");
    Logger.DEBUG = true;

    // Store captions as they appear
    class CaptionsManager {
        static captions = [];
        static timestamps = [];
        static currentTimestamp = '00:00';
        static totalDuration = '00:00';
        static lastCaptionText = null; // Track the last caption text for improved duplicate detection

        /**
         * Add a new caption with its timestamp
         * @param {string} caption - The caption text
         * @param {string} timestamp - Current video timestamp (MM:SS format)
         */
        static addCaption(caption, timestamp) {
            // Don't add empty captions
            if (!caption) {
                return;
            }

            // Enhanced duplicate detection:
            // 1. Check if this exact caption text already exists in our collection
            const duplicateIndex = this.captions.findIndex(existingCaption =>
                existingCaption === caption
            );

            // If exact text duplicate exists and the timestamp is close enough, don't add it
            if (duplicateIndex >= 0) {
                // Only log if this is a new timestamp for existing caption
                if (this.timestamps[duplicateIndex] !== timestamp) {
                    Logger.log(`Skipping duplicate caption: "${caption.substring(0, 30)}..." at ${timestamp} (already exists at ${this.timestamps[duplicateIndex]})`);
                }
                return;
            }

            // If we're here, this is a new caption or a significant change
            Logger.log(`Adding caption at ${timestamp}: ${caption.substring(0, 30)}...`);
            this.captions.push(caption);
            this.timestamps.push(timestamp);
            this.lastCaptionText = caption;

            // Update UI if panel exists
            CaptionsPanel.updateCaptionCount();
        }

        /**
         * Get all captions as a single text string with timestamps
         */
        static getAllCaptionsText(format = 'timestamped') {
            if (this.captions.length === 0) {
                return "No captions have been captured yet.";
            }

            let result = "";

            switch (format) {
                case 'timestamped':
                    // Format: [00:00] Caption text
                    result = this.captions.map((caption, index) =>
                        `[${this.timestamps[index]}] ${caption}`
                    ).join("\n\n");
                    break;

                case 'srt':
                    // Format: SRT subtitle format
                    result = this.captions.map((caption, index) => {
                        const number = index + 1;
                        const startTime = this.formatSrtTimestamp(this.timestamps[index]);

                        // For end time, use next caption's timestamp or add 3 seconds to current if it's the last caption
                        const endTime = (index < this.timestamps.length - 1)
                            ? this.formatSrtTimestamp(this.timestamps[index + 1])
                            : this.formatSrtTimestamp(this.addSecondsToTimestamp(this.timestamps[index], 3));

                        return `${number}\n${startTime} --> ${endTime}\n${caption}`;
                    }).join("\n\n");
                    break;

                case 'plain':
                    // Format: Just the caption text
                    result = this.captions.join("\n\n");
                    break;

                case 'csv':
                    // Format: CSV with timestamp and caption
                    result = "Timestamp,Caption\n" + this.captions.map((caption, index) =>
                        `"${this.timestamps[index]}","${caption.replace(/"/g, '""')}"`
                    ).join("\n");
                    break;
            }

            return result;
        }

        /**
         * Add seconds to a timestamp in MM:SS format
         * @param {string} timestamp - Timestamp in MM:SS format
         * @param {number} seconds - Seconds to add
         * @returns {string} - New timestamp in MM:SS format
         */
        static addSecondsToTimestamp(timestamp, seconds) {
            const parts = timestamp.split(':');
            if (parts.length !== 2) {
                return timestamp; // Return original if invalid format
            }

            let mins = parseInt(parts[0], 10);
            let secs = parseInt(parts[1], 10) + seconds;

            // Handle overflow
            if (secs >= 60) {
                mins += Math.floor(secs / 60);
                secs = secs % 60;
            }

            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        /**
         * Convert MM:SS format to SRT format (00:MM:SS,000)
         */
        static formatSrtTimestamp(timestamp) {
            // Parse MM:SS format
            const parts = timestamp.split(':');
            if (parts.length !== 2) {
                return '00:00:00,000';
            }

            const minutes = parts[0].padStart(2, '0');
            const seconds = parts[1].padStart(2, '0');

            return `00:${minutes}:${seconds},000`;
        }

        /**
         * Clear all stored captions
         */
        static clearCaptions() {
            this.captions = [];
            this.timestamps = [];
            this.lastCaptionText = null;
            Logger.log("All captions cleared");

            // Update UI
            CaptionsPanel.updateCaptionCount();
        }

        /**
         * Update current timestamp
         */
        static updateTimestamp(current, total) {
            this.currentTimestamp = current;
            this.totalDuration = total;
        }
    }

    // UI Panel for controls
    class CaptionsPanel {
        static container = null;
        static captionCountElement = null;
        static statusElement = null;

        /**
         * Create the control panel
         */
        static createPanel() {
            if (this.container) return;

            // Create container for the panel
            this.container = document.createElement('div');
            this.container.id = 'loom-captions-extractor';
            this.container.className = 'loom-captions-panel';

            // Create panel content
            const title = document.createElement('div');
            title.className = 'loom-captions-title';
            title.textContent = 'Loom Captions Extractor';
            this.container.appendChild(title);

            // Create caption count display
            this.captionCountElement = document.createElement('div');
            this.captionCountElement.className = 'loom-captions-count';
            this.updateCaptionCount();
            this.container.appendChild(this.captionCountElement);

            // Add status element for feedback
            this.statusElement = document.createElement('div');
            this.statusElement.className = 'loom-captions-status';
            this.container.appendChild(this.statusElement);

            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'loom-captions-buttons';

            // Download button with dropdown for format selection
            const downloadContainer = document.createElement('div');
            downloadContainer.className = 'loom-dropdown-container';

            // Create the main download button
            new Button({
                text: 'Download Captions',
                className: 'loom-button loom-dropdown-button',
                container: downloadContainer,
                onClick: () => {
                    // Toggle dropdown
                    const dropdown = downloadContainer.querySelector('.loom-dropdown-content');
                    if (dropdown) {
                        dropdown.classList.toggle('show');
                    }
                }
            });

            // Create dropdown content
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'loom-dropdown-content';

            // Add format options
            const formats = [
                {id: 'timestamped', label: 'Timestamped Text (.txt)', ext: 'txt'},
                {id: 'srt', label: 'Subtitle Format (.srt)', ext: 'srt'},
                {id: 'plain', label: 'Plain Text (.txt)', ext: 'txt'},
                {id: 'csv', label: 'CSV Format (.csv)', ext: 'csv'}
            ];

            formats.forEach(format => {
                new Button({
                    text: format.label,
                    className: 'loom-button loom-dropdown-item',
                    container: dropdownContent,
                    onClick: () => {
                        this.downloadCaptions(format.id, format.ext);
                        dropdownContent.classList.remove('show');
                    }
                });
            });

            downloadContainer.appendChild(dropdownContent);
            buttonsContainer.appendChild(downloadContainer);

            // Copy button
            new Button({
                text: 'Copy to Clipboard',
                className: 'loom-button',
                container: buttonsContainer,
                onClick: () => this.copyToClipboard()
            });

            // Preview button
            new Button({
                text: 'Preview Captions',
                className: 'loom-button loom-button-secondary',
                container: buttonsContainer,
                onClick: () => this.previewCaptions()
            });

            // Clear button
            new Button({
                text: 'Clear Captions',
                className: 'loom-button loom-button-danger',
                container: buttonsContainer,
                onClick: () => {
                    if (confirm('Are you sure you want to clear all captured captions?')) {
                        CaptionsManager.clearCaptions();
                        this.updateStatus("Captions cleared");
                    }
                }
            });

            this.container.appendChild(buttonsContainer);

            // Add to page
            document.body.appendChild(this.container);

            // Make panel draggable
            this.makeDraggable();

            // Add preview dialog elements (hidden initially)
            this.createPreviewDialog();

            Logger.log("Caption panel created");
        }

        /**
         * Create preview dialog (hidden initially)
         */
        static createPreviewDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'loom-captions-preview';
            dialog.className = 'loom-preview-dialog';

            // Create dialog header
            const dialogHeader = document.createElement('div');
            dialogHeader.className = 'loom-preview-header';

            const dialogTitle = document.createElement('div');
            dialogTitle.className = 'loom-preview-title';
            dialogTitle.textContent = 'Caption Preview';
            dialogHeader.appendChild(dialogTitle);

            const closeButton = document.createElement('button');
            closeButton.className = 'loom-preview-close';
            closeButton.textContent = '×';
            closeButton.onclick = () => {
                dialog.classList.remove('show');
            };
            dialogHeader.appendChild(closeButton);

            dialog.appendChild(dialogHeader);

            // Create content area
            const content = document.createElement('div');
            content.className = 'loom-preview-content';
            content.innerHTML = '<p>No captions captured yet.</p>';
            dialog.appendChild(content);

            // Add to page (hidden)
            document.body.appendChild(dialog);
        }

        /**
         * Preview captured captions
         */
        static previewCaptions() {
            const dialog = document.getElementById('loom-captions-preview');
            const content = dialog.querySelector('.loom-preview-content');

            const captionsText = CaptionsManager.getAllCaptionsText('timestamped');

            if (captionsText === "No captions have been captured yet.") {
                content.innerHTML = '<p>No captions have been captured yet.</p>';
            } else {
                // Format with line breaks
                content.innerHTML = `<pre>${HTMLUtils.escapeHTML(captionsText)}</pre>`;
            }

            dialog.classList.add('show');
        }

        /**
         * Update the caption count display
         */
        static updateCaptionCount() {
            if (this.captionCountElement) {
                const count = CaptionsManager.captions.length;
                this.captionCountElement.textContent = `${count} caption${count !== 1 ? 's' : ''} captured`;
            }
        }

        /**
         * Update status message
         */
        static updateStatus(message, duration = 3000) {
            if (this.statusElement) {
                this.statusElement.textContent = message;
                this.statusElement.classList.add('active');

                // Clear after duration
                setTimeout(() => {
                    this.statusElement.classList.remove('active');
                }, duration);
            }
        }

        /**
         * Make the panel draggable
         */
        static makeDraggable() {
            const title = this.container.querySelector('.loom-captions-title');
            if (!title) return;

            let isDragging = false;
            let dragStartX, dragStartY;
            let initialLeft, initialTop;

            title.style.cursor = 'grab';

            title.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;

                const rect = this.container.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                title.style.cursor = 'grabbing';

                // Prevent text selection during drag
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;

                this.container.style.left = `${initialLeft + deltaX}px`;
                this.container.style.top = `${initialTop + deltaY}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    title.style.cursor = 'grab';

                    // Save position
                    if (typeof GM_setValue === 'function') {
                        const rect = this.container.getBoundingClientRect();
                        GM_setValue('loom-extractor-position', {
                            left: rect.left,
                            top: rect.top
                        });
                    }
                }
            });

            // Restore position if saved
            if (typeof GM_getValue === 'function') {
                const savedPos = GM_getValue('loom-extractor-position', null);
                if (savedPos) {
                    this.container.style.left = `${savedPos.left}px`;
                    this.container.style.top = `${savedPos.top}px`;
                }
            }
        }

        /**
         * Download captions in the specified format
         */
        static downloadCaptions(format = 'timestamped', extension = 'txt') {
            const content = CaptionsManager.getAllCaptionsText(format);

            if (content === "No captions have been captured yet.") {
                this.updateStatus("No captions captured yet", 3000);
                return;
            }

            // Create filename with video title if available and timestamp
            const videoTitle = this.getVideoTitle() || 'loom-captions';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `${videoTitle}-${timestamp}.${extension}`;

            // Download using GM_download if available
            try {
                const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
                const url = URL.createObjectURL(blob);

                GM_download({
                    url: url,
                    name: filename,
                    saveAs: true,
                    onload: () => {
                        URL.revokeObjectURL(url);
                        this.updateStatus("Download complete!");
                    },
                    onerror: (error) => {
                        Logger.error(error, "GM_download");
                        this.updateStatus("Download failed, trying fallback...");
                        // Fallback
                        this.fallbackDownload(content, filename);
                    }
                });
            } catch (error) {
                Logger.error(error, "Downloading captions");
                this.updateStatus("Download failed, trying fallback...");
                this.fallbackDownload(content, filename);
            }
        }

        /**
         * Fallback download method
         */
        static fallbackDownload(content, filename) {
            try {
                const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
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
                    this.updateStatus("Download complete!");
                }, 100);
            } catch (error) {
                Logger.error(error, "Fallback download");
                this.updateStatus("Download failed. Try copying to clipboard instead.");
            }
        }

        /**
         * Copy captions to clipboard
         */
        static copyToClipboard() {
            const content = CaptionsManager.getAllCaptionsText('timestamped');

            if (content === "No captions have been captured yet.") {
                this.updateStatus("No captions captured yet");
                return;
            }

            // Use GM_setClipboard if available
            try {
                GM_setClipboard(content);
                this.updateStatus("Captions copied to clipboard!");
            } catch (error) {
                Logger.error(error, "Copying to clipboard");
                // Fallback
                try {
                    navigator.clipboard.writeText(content).then(() => {
                        this.updateStatus("Captions copied to clipboard!");
                    }).catch(err => {
                        Logger.error(err, "Clipboard API");
                        this.updateStatus("Failed to copy captions to clipboard.");
                    });
                } catch (clipboardError) {
                    Logger.error(clipboardError, "Fallback clipboard");
                    this.updateStatus("Failed to copy captions to clipboard.");
                }
            }
        }

        /**
         * Show a temporary notification
         */
        static showNotification(message, duration = 2000) {
            // Create notification element if not exists
            let notification = document.getElementById('loom-caption-notification');

            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'loom-caption-notification';
                notification.className = 'loom-notification';
                document.body.appendChild(notification);
            }

            // Set message and show
            notification.textContent = message;
            notification.classList.add('show');

            // Hide after duration
            setTimeout(() => {
                notification.classList.remove('show');
            }, duration);
        }

        /**
         * Get the current video title
         */
        static getVideoTitle() {
            // Try to find title in Loom's UI
            const titleElement = document.querySelector('h1.css-1n14mz9') ||
                document.querySelector('h1[data-testid="video-title"]') ||
                document.querySelector('h1.headline');

            if (titleElement) {
                return titleElement.textContent.trim().replace(/[\\/:*?"<>|]/g, '-');
            }

            return null;
        }
    }

    /**
     * Handle the monitoring of captions and timestamps
     */
    class CaptionsMonitor {
        static captionsSelector = 'div[data-name="ClosedCaptions"] .css-i5c781.active, div[data-name="ClosedCaptions"] div[data-active="true"]';
        static timestampSelector = 'div.css-6kk1p4 span.css-1r8ulaz, span.time-display';
        static isCapturing = false;
        static observer = null;
        static lastCaptionText = null;
        static captionContainer = null;

        /**
         * Start monitoring captions
         */
        static startMonitoring() {
            if (this.isCapturing) return;

            Logger.log("Starting captions monitoring");
            this.isCapturing = true;

            // Create observer for captions
            this.observer = new MutationObserver(this.handleCaptionMutations.bind(this));
            this.setupObserver();

            // Initial check for captions
            this.checkCurrentCaptionAndTimestamp();

            // Also set up a polling interval as a fallback
            this.captionInterval = setInterval(() => {
                this.checkCurrentCaptionAndTimestamp();
            }, 1000); // Check every second

            // Update panel status
            if (CaptionsPanel.statusElement) {
                CaptionsPanel.updateStatus("Monitoring captions...", 3000);
            }
        }

        /**
         * Setup mutation observer
         */
        static setupObserver() {
            // First disconnect if already observing
            if (this.observer) {
                this.observer.disconnect();
            }

            // Find caption container
            this.captionContainer = document.querySelector('div[data-name="ClosedCaptions"]');

            // If not found, look for alternative containers
            if (!this.captionContainer) {
                this.captionContainer = document.querySelector('.captions-container');
            }

            if (this.captionContainer) {
                // Observe changes to the container
                this.observer.observe(this.captionContainer, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributeFilter: ['class', 'data-active']
                });

                Logger.log("Caption observer set up");

                // Also observe the DOM for potential container changes
                const domObserver = new MutationObserver((mutations) => {
                    // If our caption container is no longer in the DOM, try to re-establish
                    if (!document.contains(this.captionContainer)) {
                        Logger.log("Caption container removed from DOM, re-establishing...");
                        this.setupObserver();
                    }
                });

                // Observe the document body for caption container changes
                domObserver.observe(document.body, {childList: true, subtree: true});
            } else {
                Logger.log("Caption container not found, will try again");
                // Try again in a moment
                setTimeout(() => this.setupObserver(), 1000);
            }
        }

        /**
         * Handle mutations to the captions
         */
        static handleCaptionMutations(mutations) {
            // Check for relevant mutations
            for (const mutation of mutations) {
                if (mutation.type === 'childList' ||
                    (mutation.type === 'attributes' &&
                        (mutation.attributeName === 'class' || mutation.attributeName === 'data-active')) ||
                    mutation.type === 'characterData') {
                    // Check current caption and timestamp
                    this.checkCurrentCaptionAndTimestamp();
                    break;
                }
            }
        }

        /**
         * Check current caption and timestamp
         */
        static checkCurrentCaptionAndTimestamp() {
            // Try multiple selectors to find the active caption
            const captionElement = document.querySelector(this.captionsSelector);

            // Try multiple selectors to find timestamp
            const timestampElement = document.querySelector(this.timestampSelector);

            if (captionElement && timestampElement) {
                const captionText = captionElement.textContent.trim();
                const timestampText = timestampElement.textContent.trim();

                // Skip if the caption is empty
                if (!captionText) return;

                // Parse timestamp (format may vary: "2:03 / 10:42" or just "2:03")
                let current, total;

                if (timestampText.includes('/')) {
                    // Format: "2:03 / 10:42"
                    [current, total] = timestampText.split('/').map(t => t.trim());
                } else {
                    // Format: Just the current time "2:03"
                    current = timestampText.trim();
                    total = ""; // Unknown total duration
                }

                // Ensure MM:SS format
                current = this.normalizeTimestamp(current);

                // Update caption manager
                CaptionsManager.updateTimestamp(current, total);

                // Only add if this is a new caption
                if (captionText !== this.lastCaptionText) {
                    CaptionsManager.addCaption(captionText, current);
                    this.lastCaptionText = captionText;
                }
            }
        }

        /**
         * Normalize timestamp to MM:SS format
         * @param {string} timestamp - Input timestamp
         * @returns {string} - Normalized timestamp in MM:SS format
         */
        static normalizeTimestamp(timestamp) {
            // Remove any non-digit, non-colon characters
            timestamp = timestamp.replace(/[^\d:]/g, '');

            // Split by colon
            const parts = timestamp.split(':');

            if (parts.length === 1) {
                // Just seconds - pad to MM:SS
                return `0:${parts[0].padStart(2, '0')}`;
            } else if (parts.length === 2) {
                // MM:SS format - ensure seconds are padded
                return `${parts[0]}:${parts[1].padStart(2, '0')}`;
            } else if (parts.length === 3) {
                // HH:MM:SS format - convert to MM:SS
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10) + (hours * 60);
                return `${minutes}:${parts[2].padStart(2, '0')}`;
            }

            // Default fallback
            return timestamp;
        }

        /**
         * Stop monitoring captions
         */
        static stopMonitoring() {
            if (!this.isCapturing) return;

            Logger.log("Stopping captions monitoring");
            this.isCapturing = false;

            // Disconnect observer
            if (this.observer) {
                this.observer.disconnect();
            }

            // Clear interval
            if (this.captionInterval) {
                clearInterval(this.captionInterval);
            }

            // Update panel status
            if (CaptionsPanel.statusElement) {
                CaptionsPanel.updateStatus("Caption monitoring stopped");
            }
        }
    }

    // Apply styles
    StyleManager.addStyles(`
    /* Panel Styles */
    .loom-captions-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #333;
    }
    
    .loom-captions-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
        cursor: grab;
        user-select: none;
    }
    
    .loom-captions-count {
        margin-bottom: 4px;
        font-size: 14px;
        color: #666;
    }
    
    .loom-captions-status {
        margin-bottom: 12px;
        font-size: 13px;
        color: #4a8;
        min-height: 20px;
        transition: opacity 0.5s ease;
        opacity: 0;
    }
    
    .loom-captions-status.active {
        opacity: 1;
    }
    
    .loom-captions-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    /* Preview Dialog */
    .loom-preview-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
        width: 80%;
        max-width: 800px;
        max-height: 80vh;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        overflow: hidden;
    }
    
    .loom-preview-dialog.show {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
        visibility: visible;
    }
    
    .loom-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
    }
    
    .loom-preview-title {
        font-weight: bold;
        font-size: 18px;
    }
    
    .loom-preview-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 16px;
    }
    
    .loom-preview-close:hover {
        background-color: #f0f0f0;
        color: #333;
    }
    
    .loom-preview-content {
        padding: 16px;
        overflow-y: auto;
        max-height: calc(80vh - 60px);
    }
    
    .loom-preview-content pre {
        white-space: pre-wrap;
        font-family: monospace;
        margin: 0;
        padding: 0;
    }
    
    /* Button Styles */
    .loom-button {
        background-color: #625df5;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        text-align: center;
    }
    
    .loom-button:hover {
        background-color: #514dc6;
    }
    
    .loom-button-secondary {
        background-color: #6c757d;
    }
    
    .loom-button-secondary:hover {
        background-color: #5a6268;
    }
    
    .loom-button-danger {
        background-color: #f54242;
    }
    
    .loom-button-danger:hover {
        background-color: #d63030;
    }
    
    /* Dropdown Styles */
    .loom-dropdown-container {
        position: relative;
        display: inline-block;
        width: 100%;
    }
    
    .loom-dropdown-content {
        display: none;
        position: absolute;
        background-color: #f9f9f9;
        min-width: 100%;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 1;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .loom-dropdown-content.show {
        display: block;
    }
    
    .loom-dropdown-item {
        background-color: transparent;
        color: #333;
        text-align: left;
        border-radius: 0;
    }
    
    .loom-dropdown-item:hover {
        background-color: #f0f0f0;
    }
    
    /* Notification */
    .loom-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background-color: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        transition: transform 0.3s ease;
    }
    
    .loom-notification.show {
        transform: translateX(-50%) translateY(0);
    }
`, 'loom-captions-extractor-styles');

    /**
     * Main script initialization
     */
    class LoomCaptionsExtractor {
        static async init() {
            Logger.log("Initializing Loom Captions Extractor");

            // Check if we're on a Loom video page
            if (!this.isLoomVideoPage()) {
                Logger.log("Not a Loom video page, exiting");
                return;
            }

            // Wait for video player to be ready
            try {
                await this.waitForVideoPlayer();

                // Create control panel
                CaptionsPanel.createPanel();

                // Start monitoring captions
                CaptionsMonitor.startMonitoring();

                Logger.log("Loom Captions Extractor initialized");
            } catch (error) {
                Logger.error(error, "Initialization");
            }
        }

        /**
         * Check if the current page is a Loom video page
         */
        static isLoomVideoPage() {
            return window.location.hostname.includes('loom.com') &&
                (window.location.pathname.includes('/share/') ||
                    window.location.pathname.match(/\/[a-f0-9]{32}$/i));
        }

        /**
         * Wait for video player to be ready
         */
        static waitForVideoPlayer() {
            return new Promise((resolve, reject) => {
                const maxAttempts = 30; // Try for about 15 seconds (30 * 500ms)
                let attempts = 0;

                const checkPlayer = () => {
                    const videoPlayer = document.querySelector('video') ||
                        document.querySelector('div[data-name="VideoControls"]');

                    if (videoPlayer) {
                        Logger.log("Video player found");
                        resolve(videoPlayer);
                        return;
                    }

                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error("Video player not found after multiple attempts"));
                        return;
                    }

                    setTimeout(checkPlayer, 500);
                };

                checkPlayer();
            });
        }
    }

    // Initialize when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', LoomCaptionsExtractor.init.bind(LoomCaptionsExtractor));
    } else {
        LoomCaptionsExtractor.init();
    }

})();
