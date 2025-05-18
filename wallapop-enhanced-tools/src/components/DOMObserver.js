// Observer to detect and handle DOM changes

import {Logger} from '../../../core';
import {ListingManager} from '../managers/ListingManager';
import {FilterManager} from '../managers/FilterManager';
import {SELECTORS} from '../utils/constants';

/**
 * Observes DOM for changes to detect new listings and URL changes
 */
export class DOMObserver {
    /**
     * Initialize the DOMObserver
     */
    constructor() {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.lastUrl = location.href;
    }

    /**
     * Start observing DOM and URL changes
     */
    observe() {
        this.observer.observe(document.body, {childList: true, subtree: true});
        window.addEventListener('popstate', this.handleUrlChange.bind(this));
        Logger.debug("MutationObserver and popstate listener set up");
    }

    /**
     * Handle mutations detected by the observer
     * @param {MutationRecord[]} mutations - The detected mutations
     */
    handleMutations(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasNewItemCards = addedNodes.some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    SELECTORS.ITEM_CARDS.some(selector =>
                        node.matches(selector) || node.querySelector(selector)
                    )
                );
                if (hasNewItemCards) {
                    Logger.debug("New ItemCards detected, adding expand buttons");
                    ListingManager.addExpandButtonsToListings();

                    // Apply all filters to new listings
                    FilterManager.applyFilters();
                }
            }
        }
        this.checkUrlChange();
    }

    /**
     * Handle URL changes (page navigation)
     */
    handleUrlChange() {
        Logger.debug("Handling URL change");
        setTimeout(() => {
            ListingManager.addExpandButtonsToListings();
            // Apply all filters after URL change
            FilterManager.applyFilters();
        }, 1000); // Delay to allow for dynamic content to load
    }

    /**
     * Check if the URL has changed
     */
    checkUrlChange() {
        if (this.lastUrl !== location.href) {
            Logger.debug("URL changed:", location.href);
            this.lastUrl = location.href;
            this.handleUrlChange();
        }
    }
}