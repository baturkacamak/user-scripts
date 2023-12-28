// ==UserScript==
// @id           eksi-aria-enhancer@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Aria Hidden Enhancer
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.2
// @description  Enhances accessibility in Eksi Sozluk by automatically adding aria-hidden attributes to entry footers.
// @author       Batur Kacamak
// @copyright    2023, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk111.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-aria-enhancer#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-aria-enhancer#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-aria-enhancer/eksi-aria-enhancer.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-aria-enhancer/eksi-aria-enhancer.user.js
// @icon         https://eksisozluk111.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  /**
     * @class DOMManipulator
     * @classdesc Utility class to manipulate the DOM on the target website.
     */
  class DOMManipulator {
    /**
         * Adds aria-hidden attribute to footers inside #entry-item-list.
         */
    static addAriaHiddenToFooters() {
      const entryList = document.querySelector('#entry-item-list');
      if (!entryList) return;

      const footers = entryList.querySelectorAll('footer');
      footers.forEach((footer) => footer.setAttribute('aria-hidden', 'true'));
    }
  }

  /**
     * @class MutationObserverHandler
     * @classdesc Utility class to handle DOM mutations.
     */
  class MutationObserverHandler {
    /**
         * Initializes the MutationObserver for the given target.
         */
    constructor() {
      this.observerTarget = document.querySelector('body');
      this.observeMutations();
    }

    /**
         * Observes mutations on the target. If #entry-item-list is affected, applies DOM manipulations.
         */
    observeMutations() {
      const observer = new MutationObserver(this.handleMutations.bind(this));

      observer.observe(this.observerTarget, {
        childList: true,
        subtree: true,
      });
    }

    /**
         * Handles detected mutations.
         * @param {Array} mutations - List of detected DOM mutations.
         */
    handleMutations(mutations) {
      mutations.forEach((mutation) => {
        if (!mutation.addedNodes.length && !mutation.removedNodes.length) return;

        const entryList = document.querySelector('#entry-item-list');
        if (entryList) {
          DOMManipulator.addAriaHiddenToFooters();
        }
      });
    }
  }

  new MutationObserverHandler();
})();
