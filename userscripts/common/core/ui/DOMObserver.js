import UrlChangeWatcher from '../utils/UrlChangeWatcher';

/**
 * DOMObserver - Observes DOM changes and URL changes
 * Uses UrlChangeWatcher for URL change detection with configurable strategies
 */
class DOMObserver {
  /**
     * Wait for elements matching a selector or any of multiple selectors
     * @param {string|string[]} selectorOrSelectors - CSS selector or array of selectors to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @return {Promise<NodeList>} - Promise resolving to found elements
     */
  static waitForElements(selectorOrSelectors, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];

      function checkElements() {
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            resolve(elements);
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for elements: ${selectors.join(', ')}`));
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

export default DOMObserver;
