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

export default HTMLUtils;
