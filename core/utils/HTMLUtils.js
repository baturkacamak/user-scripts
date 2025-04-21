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

export default HTMLUtils;
