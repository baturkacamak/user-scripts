// ==UserScript==
// @id           eksi-aria-enhancer@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Aria Hidden Enhancer
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.1.0
// @description  Enhances accessibility in Eksi Sozluk by automatically adding aria-hidden attributes to entry footers and read-more links.
// @author       Batur Kacamak
// @copyright    2023, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-aria-enhancer#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-aria-enhancer#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-aria-enhancer/eksi-aria-enhancer.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-aria-enhancer/eksi-aria-enhancer.user.js
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const SELECTORS = Object.freeze({
    ENTRY_LIST: '#entry-item-list',
    HIDEABLE_ELEMENTS: 'footer, .read-more-link-wrapper',
  });

  class AccessibilityEnhancer {
    #entryList;
    #observer;

    constructor() {
      this.#entryList = null;
      this.#observer = null;
    }

    init() {
      this.#entryList = document.querySelector(SELECTORS.ENTRY_LIST);
      if (this.#entryList) {
        this.#enhanceAccessibility();
        this.#setupMutationObserver();
      }
    }

    #enhanceAccessibility = () => {
      const hideableElements = this.#entryList.querySelectorAll(SELECTORS.HIDEABLE_ELEMENTS);
      hideableElements.forEach(element => element.setAttribute('aria-hidden', 'true'));
    }

    #setupMutationObserver = () => {
      this.#observer = new MutationObserver(this.#handleMutations);
      this.#observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    #handleMutations = (mutations) => {
      const hasRelevantChanges = mutations.some(({ addedNodes, removedNodes }) =>
        addedNodes.length || removedNodes.length
      );

      if (hasRelevantChanges && document.querySelector(SELECTORS.ENTRY_LIST)) {
        this.#enhanceAccessibility();
      }
    }
  }

  const enhancer = new AccessibilityEnhancer();
  enhancer.init();
})();
