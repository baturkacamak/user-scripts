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

export default DOMObserver;
