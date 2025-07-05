/**
 * HTMLUtils - Utilities for HTML manipulation
 * Provides functions for escaping HTML, encoding/decoding entities, etc.
 */
class HTMLUtils {
    static #policy;

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

    static decodeHtmlEntities(encodedString) {
        if (!encodedString || typeof encodedString !== 'string') return encodedString;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedString;
        return textarea.value;
    }

    static extractMetaTags(html) {
        if (!html) return {};

        const metaTags = {};
        const regex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']+)["']/gi;

        let match;
        while (match = regex.exec(html)) {
            if (match[1] && match[2]) {
                metaTags[match[1]] = this.decodeHtmlEntities(match[2]);
            }
        }

        return metaTags;
    }

    /**
     * Safely set HTML content with CSP fallback
     * @param {HTMLElement} element - The element to set content on
     * @param {String} html - HTML content to set
     * @param {String} fallbackText - Text to use if HTML fails (optional)
     * @return {boolean} True if HTML was set successfully, false if fallback was used
     */
    static setHTMLSafely(element, html, fallbackText = null) {
        if (!element) return false;

        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            if (!HTMLUtils.#policy) {
                try {
                    HTMLUtils.#policy = window.trustedTypes.createPolicy('baturkacamak-userscripts-policy', {
                        createHTML: (input) => input,
                    });
                } catch (e) {
                    // Policy likely already exists.
                    // We will fallback to innerHTML which will probably fail and be caught.
                    HTMLUtils.#policy = null;
                }
            }
        }

        try {
            if (HTMLUtils.#policy) {
                element.innerHTML = HTMLUtils.#policy.createHTML(html);
            } else {
                element.innerHTML = html;
            }
            return true;
        } catch (error) {
            // Fallback to textContent if innerHTML fails due to CSP
            const fallback = fallbackText || html;
            element.textContent = fallback;
            return false;
        }
    }

    /**
     * Create an element with HTML content safely
     * @param {String} tagName - HTML tag name
     * @param {String} html - HTML content
     * @param {Object} attributes - Element attributes
     * @return {HTMLElement} The created element
     */
    static createElementWithHTML(tagName, html, attributes = {}) {
        const element = document.createElement(tagName);
        
        // Set attributes
        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });
        
        // Set content safely
        this.setHTMLSafely(element, html);
        
        return element;
    }

    /**
     * Waits for an element to disappear from the DOM.
     * @param {string} selector - The CSS selector of the element.
     * @param {number} timeout - The maximum time to wait in milliseconds.
     * @param {number} interval - The interval between checks in milliseconds.
     * @returns {Promise<void>} A promise that resolves when the element is no longer found.
     */
    static waitForElementToDisappear(selector, timeout = 10000, interval = 1000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const check = () => {
                if (!document.querySelector(selector)) {
                    clearInterval(intervalId);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(intervalId);
                    reject(new Error(`Element "${selector}" did not disappear within ${timeout}ms`));
                }
            };

            const intervalId = setInterval(check, interval);
            check(); // Initial check
        });
    }
}

/**
 * MouseEventUtils - Utility for creating mouse events with fallbacks
 * Usage:
 *   const evt = MouseEventUtils.createClickEvent({bubbles: true, cancelable: true, programmatic: true});
 *   element.dispatchEvent(evt);
 */
export class MouseEventUtils {
    /**
     * Create a click MouseEvent with fallbacks for older browsers
     * @param {Object} options - MouseEventInit options + {programmatic: boolean}
     * @returns {MouseEvent}
     */
    static createClickEvent(options = {}) {
        const { programmatic, ...eventOptions } = options;
        let event;
        try {
            event = new MouseEvent('click', eventOptions);
        } catch (e) {
            // Fallback for older browsers
            event = document.createEvent('MouseEvents');
            event.initMouseEvent(
                'click',
                eventOptions.bubbles || false,
                eventOptions.cancelable || false,
                window,
                eventOptions.detail || 1,
                eventOptions.screenX || 0,
                eventOptions.screenY || 0,
                eventOptions.clientX || 0,
                eventOptions.clientY || 0,
                eventOptions.ctrlKey || false,
                eventOptions.altKey || false,
                eventOptions.shiftKey || false,
                eventOptions.metaKey || false,
                eventOptions.button || 0,
                eventOptions.relatedTarget || null
            );
        }
        if (programmatic) {
            event._programmatic = true;
        }
        return event;
    }
}

export default HTMLUtils;
