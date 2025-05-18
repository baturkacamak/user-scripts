// Manager for filtering listings based on various criteria

import {Logger} from "../../core";
import {ListingManager} from "./ListingManager";
import {STORAGE_KEYS} from "../utils/constants";
import {loadFromLocalStorage, loadPanelState} from "../utils/helpers";

/**
 * Manages filtering of listings based on various criteria
 */
export class FilterManager {
    /**
     * Apply all active filters to the listings
     */
    static applyFilters() {
        Logger.debug("Applying all filters to listings");

        const allListings = ListingManager.getAllListings();
        let hiddenCount = 0;

        allListings.forEach(listing => {
            const hideByKeyword = this.shouldHideByKeyword(listing);
            const hideByDelivery = this.shouldHideByDeliveryMethod(listing);
            const hideByReserved = this.shouldHideByReserved(listing);

            if (hideByKeyword || hideByDelivery || hideByReserved) {
                this.hideListing(listing);
                hiddenCount++;

                // Mark appropriately for later filter toggling
                if (hideByReserved) {
                    listing.dataset.reservedHidden = 'true';
                }
            } else {
                this.showListing(listing);
            }
        });

        Logger.debug(`All filters applied: ${hiddenCount} listings hidden out of ${allListings.length}`);
    }

    /**
     * Apply only the keyword filter to listings
     */
    static applyKeywordFilter() {
        Logger.debug("Applying keyword filter to listings");

        const allListings = ListingManager.getAllListings();
        let hiddenCount = 0;

        allListings.forEach(listing => {
            // Skip listings already hidden by other filters
            if (listing.dataset.reservedHidden === 'true' ||
                listing.dataset.deliveryHidden === 'true') {
                return;
            }

            if (this.shouldHideByKeyword(listing)) {
                this.hideListing(listing);
                hiddenCount++;
            } else {
                this.showListing(listing);
            }
        });

        Logger.debug(`Keyword filter applied: ${hiddenCount} listings hidden`);
    }

    /**
     * Apply only the delivery method filter to listings
     */
    static applyDeliveryMethodFilter() {
        Logger.debug("Applying delivery method filter");

        const allListings = ListingManager.getAllListings();
        let hiddenCount = 0;

        // Get current filter value
        const filterValue = loadPanelState('deliveryMethodFilter', 'all');

        if (filterValue === 'all') {
            // Show all listings (that aren't hidden by other filters)
            allListings.forEach(listing => {
                // Remove delivery filter flag
                delete listing.dataset.deliveryHidden;

                // Check other filters
                if (!this.shouldHideByKeyword(listing) &&
                    !this.shouldHideByReserved(listing)) {
                    this.showListing(listing);
                }
            });
            return;
        }

        allListings.forEach(listing => {
            // First check if it should be hidden by other filters
            if (this.shouldHideByKeyword(listing) ||
                this.shouldHideByReserved(listing)) {
                this.hideListing(listing);
                return;
            }

            // Then check delivery method
            const deliveryMethod = ListingManager.getDeliveryMethod(listing);

            if ((filterValue === 'shipping' && deliveryMethod !== 'shipping') ||
                (filterValue === 'inperson' && deliveryMethod !== 'inperson')) {
                listing.dataset.deliveryHidden = 'true';
                this.hideListing(listing);
                hiddenCount++;
            } else {
                delete listing.dataset.deliveryHidden;
                this.showListing(listing);
            }
        });

        Logger.debug(`Delivery method filter applied: ${hiddenCount} listings hidden`);
    }

    /**
     * Apply only the reserved listings filter
     */
    static applyReservedFilter() {
        Logger.debug("Applying reserved listings filter");

        const allListings = ListingManager.getAllListings();
        let hiddenCount = 0;

        // Get filter setting
        const hideReserved = loadPanelState('hideReservedListings', true);

        if (!hideReserved) {
            // If filter is disabled, show any listings that were hidden by this filter
            // but respect other filters
            allListings.forEach(listing => {
                if (listing.dataset.reservedHidden === 'true') {
                    delete listing.dataset.reservedHidden;

                    // Only show if not hidden by other filters
                    if (!this.shouldHideByKeyword(listing) &&
                        !this.shouldHideByDeliveryMethod(listing)) {
                        this.showListing(listing);
                    }
                }
            });
            return;
        }

        // Apply the filter to hide reserved listings
        allListings.forEach(listing => {
            if (ListingManager.isReservedListing(listing)) {
                // Mark as hidden specifically by this filter
                listing.dataset.reservedHidden = 'true';
                this.hideListing(listing);
                hiddenCount++;
            }
        });

        Logger.debug(`Reserved listings filter applied: ${hiddenCount} listings hidden`);

        return hiddenCount;
    }

    /**
     * Check if a listing should be hidden based on keywords
     * @param {HTMLElement} listing - The listing element to check
     * @returns {boolean} True if it should be hidden
     */
    static shouldHideByKeyword(listing) {
        const blockedTerms = loadFromLocalStorage(STORAGE_KEYS.BLOCKED_TERMS, []);

        if (blockedTerms.length === 0) {
            return false;
        }

        // Get all text content from the listing
        const listingText = listing.textContent.toLowerCase();

        // Check if any blocked term is in the listing
        return blockedTerms.some(term => listingText.includes(term.toLowerCase()));
    }

    /**
     * Check if a listing should be hidden based on delivery method
     * @param {HTMLElement} listing - The listing element to check
     * @returns {boolean} True if it should be hidden
     */
    static shouldHideByDeliveryMethod(listing) {
        const filterValue = loadPanelState('deliveryMethodFilter', 'all');
        if (filterValue === 'all') return false;

        const deliveryMethod = ListingManager.getDeliveryMethod(listing);
        return (filterValue === 'shipping' && deliveryMethod !== 'shipping') ||
            (filterValue === 'inperson' && deliveryMethod !== 'inperson');
    }

    /**
     * Check if a listing should be hidden because it's reserved
     * @param {HTMLElement} listing - The listing element to check
     * @returns {boolean} True if it should be hidden
     */
    static shouldHideByReserved(listing) {
        const hideReserved = loadPanelState('hideReservedListings', true);
        return hideReserved && ListingManager.isReservedListing(listing);
    }

    /**
     * Hide a listing with animation
     * @param {HTMLElement} listing - The listing element to hide
     */
    static hideListing(listing) {
        if (!listing.classList.contains('hidden-item')) {
            listing.classList.add('hiding-animation');
            setTimeout(() => {
                listing.classList.add('hidden-item');
                listing.classList.remove('hiding-animation');
            }, 500);
        }
    }

    /**
     * Show a previously hidden listing with animation
     * @param {HTMLElement} listing - The listing element to show
     */
    static showListing(listing) {
        if (listing.classList.contains('hidden-item')) {
            listing.classList.remove('hidden-item');
            listing.style.opacity = 0;
            listing.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                listing.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
                listing.style.opacity = 1;
                listing.style.transform = 'translateY(0)';

                // Clean up after animation
                setTimeout(() => {
                    listing.style.transition = '';
                }, 500);
            }, 10);
        }
    }

    /**
     * Add a blocked term
     * @param {string} term - The term to block
     * @returns {boolean} True if the term was added
     */
    static addBlockedTerm(term) {
        term = term.trim().toLowerCase();
        if (!term) return false;

        const blockedTerms = loadFromLocalStorage(STORAGE_KEYS.BLOCKED_TERMS, []);

        // Check if term already exists
        if (blockedTerms.includes(term)) return false;

        // Add term and save
        blockedTerms.push(term);
        try {
            localStorage.setItem(STORAGE_KEYS.BLOCKED_TERMS, JSON.stringify(blockedTerms));
            Logger.debug("Blocked term added:", term);
            return true;
        } catch (error) {
            Logger.error(error, "Saving blocked terms");
            return false;
        }
    }

    /**
     * Remove a blocked term
     * @param {string} term - The term to remove
     * @returns {boolean} True if the term was removed
     */
    static removeBlockedTerm(term) {
        const blockedTerms = loadFromLocalStorage(STORAGE_KEYS.BLOCKED_TERMS, []);
        const index = blockedTerms.indexOf(term);

        if (index === -1) return false;

        blockedTerms.splice(index, 1);
        try {
            localStorage.setItem(STORAGE_KEYS.BLOCKED_TERMS, JSON.stringify(blockedTerms));
            Logger.debug("Blocked term removed:", term);
            return true;
        } catch (error) {
            Logger.error(error, "Saving blocked terms");
            return false;
        }
    }

    /**
     * Get all blocked terms
     * @returns {Array<string>} Array of blocked terms
     */
    static getBlockedTerms() {
        return loadFromLocalStorage(STORAGE_KEYS.BLOCKED_TERMS, []);
    }

    /**
     * Clear all blocked terms
     * @returns {boolean} True if successful
     */
    static clearBlockedTerms() {
        try {
            localStorage.setItem(STORAGE_KEYS.BLOCKED_TERMS, JSON.stringify([]));
            Logger.debug("All blocked terms cleared");
            return true;
        } catch (error) {
            Logger.error(error, "Clearing blocked terms");
            return false;
        }
    }
}