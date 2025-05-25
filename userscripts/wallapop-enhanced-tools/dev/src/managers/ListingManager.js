// Manager for handling item listings on the page

import {Logger} from "../../core";
import {ExpandButton} from "../components/ExpandButton";
import {SELECTORS} from "../utils/constants";

/**
 * Manages the detection and handling of item listings on the page
 */
export class ListingManager {
    /**
     * Add expand buttons to all item listings on the current page
     */
    static addExpandButtonsToListings() {
        Logger.debug("Adding expand buttons to listings");
        let totalListings = 0;

        SELECTORS.ITEM_CARDS.forEach(selector => {
            const listings = document.querySelectorAll(selector);
            totalListings += listings.length;
            Logger.debug(`Found ${listings.length} items for selector: ${selector}`);

            listings.forEach(listing => {
                try {
                    let href = listing.getAttribute('href') || listing.querySelector('a')?.getAttribute('href');

                    // Make sure href is a full URL
                    if (href && !href.startsWith('http')) {
                        if (href.startsWith('/')) {
                            href = `https://es.wallapop.com${href}`;
                        } else {
                            href = `https://es.wallapop.com/${href}`;
                        }
                    }

                    if (href && !listing.querySelector(SELECTORS.EXPAND_BUTTON)) {
                        new ExpandButton(listing, href);
                    } else if (!href) {
                        Logger.debug("No valid href found for a listing");
                    }
                } catch (error) {
                    Logger.error(error, "Processing individual listing");
                }
            });
        });

        Logger.debug("Total listings processed:", totalListings);
    }

    /**
     * Get all listings on the current page
     * @returns {NodeListOf<Element>} All listing elements
     */
    static getAllListings() {
        let allListings = [];

        SELECTORS.ITEM_CARDS.forEach(selector => {
            const listings = document.querySelectorAll(selector);
            allListings = [...allListings, ...Array.from(listings)];
        });

        return allListings;
    }

    /**
     * Check if a listing has shipping available
     * @param {HTMLElement} listing - The listing element to check
     * @returns {string} 'shipping', 'inperson', or 'unknown'
     */
    static getDeliveryMethod(listing) {
        // Function to search within shadow DOM
        const queryShadowDOM = (element, selector) => {
            // Check if the element itself matches
            if (element.matches && element.matches(selector)) {
                return element;
            }

            // Check normal children first
            const found = element.querySelector(selector);
            if (found) return found;

            // Then check shadow roots
            const shadowRoot = element.shadowRoot;
            if (shadowRoot) {
                const foundInShadow = shadowRoot.querySelector(selector);
                if (foundInShadow) return foundInShadow;
            }

            // Finally check all child elements recursively for shadow roots
            for (const child of element.children) {
                const foundInChild = queryShadowDOM(child, selector);
                if (foundInChild) return foundInChild;
            }

            return null;
        };

        // Look for shadow roots and badge elements within them
        const shadowRoots = [];
        const findShadowRoots = (element) => {
            if (element.shadowRoot) {
                shadowRoots.push(element.shadowRoot);
            }
            Array.from(element.children).forEach(findShadowRoots);
        };
        findShadowRoots(listing);

        // Check for shipping badge in shadow DOM
        const hasShippingBadge = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--shippingAvailable') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="shippingAvailable"]') !== null
        );

        // Check for in-person badge in shadow DOM
        const hasInPersonBadge = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--faceToFace') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="faceToFace"]') !== null
        );

        // Text fallback as a last resort
        const shippingText = listing.textContent.includes('Envío disponible');
        const inPersonText = listing.textContent.includes('Sólo venta en persona') ||
            listing.textContent.includes('Solo venta en persona');

        // Determine delivery method
        if (hasShippingBadge || (!hasInPersonBadge && shippingText)) {
            return 'shipping';
        } else if (hasInPersonBadge || inPersonText) {
            return 'inperson';
        } else {
            // Add additional fallback based on HTML structure
            // Check if there's an icon that might indicate shipping or in-person
            const hasShippingIcon = shadowRoots.some(root =>
                root.querySelector('walla-icon[class*="shipping"]') !== null
            );
            const hasInPersonIcon = shadowRoots.some(root =>
                root.querySelector('walla-icon[class*="faceToFace"]') !== null
            );

            if (hasShippingIcon) {
                return 'shipping';
            } else if (hasInPersonIcon) {
                return 'inperson';
            }

            Logger.debug("Unknown delivery method for listing:", listing);
            return 'unknown';
        }
    }

    /**
     * Check if a listing is marked as reserved
     * @param {HTMLElement} listing - The listing element to check
     * @returns {boolean} True if the listing is reserved
     */
    static isReservedListing(listing) {
        // Method 1: Check for the badge with text "Reservado"
        const hasReservedText = listing.textContent.includes('Reservado');

        // Method 2: Check for the wallapop-badge--reserved class
        const hasReservedBadge = !!listing.querySelector('.wallapop-badge--reserved, [class*="wallapop-badge"][class*="reserved"]');

        // Method 3: Check in shadow DOM
        const shadowRoots = [];
        const findShadowRoots = (element) => {
            if (element.shadowRoot) {
                shadowRoots.push(element.shadowRoot);
            }
            Array.from(element.children).forEach(findShadowRoots);
        };
        findShadowRoots(listing);

        // Check for reserved badge in shadow DOM
        const hasReservedBadgeInShadow = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--reserved') !== null ||
            root.querySelector('wallapop-badge.wallapop-badge--reserved') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="reserved"]') !== null
        );

        return hasReservedText || hasReservedBadge || hasReservedBadgeInShadow;
    }
}