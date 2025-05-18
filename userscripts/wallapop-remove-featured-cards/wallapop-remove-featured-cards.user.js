// ==UserScript==
// @id           wallapop-remove-featured-cards@https://github.com/baturkacamak/userscripts
// @name         Wallapop Remove Featured Cards
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.1
// @description  This script removes bumped ads from the Wallapop search page.
// @author       Batur Kacamak
// @copyright    2022+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/wallapop-remove-featured-cards#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/wallapop-remove-featured-cards#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/wallapop-remove-featured-cards/wallapop-remove-featured-cards.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/wallapop-remove-featured-cards/wallapop-remove-featured-cards.user.js
// @match        https://es.wallapop.com/app/search?*
// @icon         https://es.wallapop.com/favicon.ico
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/**
 * Class representing an ad filter for removing bumped ads on Wallapop.
 */
class AdsFilter {
    /**
     * The selector for bumped ads.
     * @type {string}
     */
    static BUMPED_AD_SELECTOR = 'tsl-svg-icon.ItemCardWide__icon--bumped';

    /**
     * The selector for all ads.
     * @type {string}
     */
    static ALL_ADS_SELECTOR = '[tsladslotshopping] > a';

    /**
     * Handles mutations and removes bumped ads from the page.
     * @param {MutationRecord[]} mutations - The list of mutations.
     */
    /**
     * Handles mutations and removes bumped ads from the page.
     * @param {MutationRecord[]} mutations - The list of mutations.
     */
    static handleMutations(mutations) {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (AdsFilter.isBumpedAd(node)) {
                    // Remove the ad because it is a bumped ad
                    node.remove();
                }
            });
        });
    }

    /**
     * Checks if the given node is a bumped ad.
     * @param {Node} node - The node to check.
     * @returns {boolean} - True if the node is a bumped ad, false otherwise.
     */
    static isBumpedAd(node) {
        return (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches(AdsFilter.ALL_ADS_SELECTOR) &&
            node.querySelector(AdsFilter.BUMPED_AD_SELECTOR)
        );
    }

    /**
     * Initializes the ad filter by creating a MutationObserver and observing mutations.
     */
    static init() {
        const observer = new MutationObserver(AdsFilter.handleMutations);
        const observerConfig = {
            childList: true,
            subtree: true
        };
        observer.observe(document.body, observerConfig);
    }
}

// Initialize the ad filter when the script is run
AdsFilter.init();