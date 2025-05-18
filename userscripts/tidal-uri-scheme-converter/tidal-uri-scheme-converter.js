import { DOMObserver, Logger } from '../common/core/index.js';

class TidalUriSchemeConverter {
  constructor() {
    this.logger = new Logger('[TidalUriSchemeConverter]');
    this.regexReplace = /https:\/\/tidal\.com(\/browse)?(.*?)(?=\s|["'<]|$)/gmui;

    this.observer = new DOMObserver(this.handleMutations.bind(this));
    this.init();
  }

  replaceLinksInNode(node) {
    if (!node || typeof node.querySelectorAll !== 'function') {
      return;
    }
    const tidalLinks = node.querySelectorAll('a[href^="https://tidal.com"]');

    tidalLinks.forEach((item) => {
      const originalHref = item.href;
      const newHref = originalHref.replace(this.regexReplace, 'tidal:/$2?play=true');
      if (newHref !== originalHref) {
        item.href = newHref;
        this.logger.log(`Converted: ${originalHref} -> ${newHref}`);
      }
    });
  }

  handleMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((addedNode) => {
          if (addedNode.nodeType === Node.ELEMENT_NODE) {
            if (addedNode.matches && addedNode.matches('a[href^="https://tidal.com"]')) {
              this.replaceLinksInNode(addedNode.parentElement || document.body);
            } else {
              this.replaceLinksInNode(addedNode);
            }
          }
        });
      }
      if (mutation.type === 'attributes' && mutation.target.matches && mutation.target.matches('a[href^="https://tidal.com"]')) {
        this.replaceLinksInNode(mutation.target.parentElement || document.body);
      }
    });
  }

  init() {
    this.logger.log('Initialized. Watching for Tidal URLs.');
    this.replaceLinksInNode(document.body);
    this.observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['href'] 
    });
  }
}

// eslint-disable-next-line no-unused-vars
const tidalUriSchemeConverter = new TidalUriSchemeConverter(); 