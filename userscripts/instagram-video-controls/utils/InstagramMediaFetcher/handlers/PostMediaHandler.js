import {Logger} from "../../../../core";

/**
 * Handler for extracting media information from Instagram posts.
 * Follows Single Responsibility Principle by focusing only on post context.
 */
export default class PostMediaHandler {
    /**
     * Configuration settings specific to post media handling
     */
    CONFIG = {
        SELECTORS: {
            /** Targets list items in a carousel/slideshow */
            postCarouselItem: 'ul li[style*="translateX"]',
            /** Targets the container for carousel navigation dots */
            postCarouselDotsContainer: 'div._acng',
            /** Targets individual navigation dots within the container */
            postCarouselDot: 'div._acnb',
        }
    };

    /**
     * Create a new post media handler
     *
     * @param {Array} strategies - The media fetching strategies to use in order of preference
     */
    constructor(strategies = []) {
        this.strategies = strategies;
    }

    /**
     * Get media information for a post
     *
     * @param {HTMLElement} containerNode - The post article element
     * @param {object} [options={}] - Additional options
     * @returns {Promise<{url: string, mediaIndex: number, type: string}|null>}
     */
    async getMediaInfo(containerNode, options = {}) {
        Logger.info('PostMediaHandler: Processing post media container');

        try {
            // Determine if this is a carousel post and get active media index
            const isCarousel = containerNode.querySelector(this.CONFIG.SELECTORS.postCarouselItem) !== null;
            const mediaIndex = isCarousel ? this.findActiveMediaIndex(containerNode) : 0;

            if (isCarousel) {
                Logger.debug(`PostMediaHandler: Carousel detected, active index: ${mediaIndex}`);
            } else {
                Logger.debug('PostMediaHandler: Single media post detected.');
            }

            // Try each strategy in order until one succeeds
            for (const strategy of this.strategies) {
                if (strategy.isApplicable(containerNode)) {
                    Logger.debug(`PostMediaHandler: Trying strategy: ${strategy.getName()}`);
                    const result = await strategy.fetchMediaInfo(containerNode, mediaIndex, options);

                    if (result && result.url) {
                        Logger.info(`PostMediaHandler: Strategy ${strategy.getName()} succeeded`);
                        return result;
                    }

                    Logger.debug(`PostMediaHandler: Strategy ${strategy.getName()} failed to get URL`);
                }
            }

            Logger.error('PostMediaHandler: All strategies failed to get media URL');
            return null;
        } catch (error) {
            Logger.error(error, 'PostMediaHandler: Error getting post media info');
            return null;
        }
    }

    /**
     * Finds the active index (0-based) in a carousel post.
     * Prioritizes checking the URL's ?img_index= param, falls back to carousel dots.
     *
     * @param {HTMLElement} articleNode - The ARTICLE element
     * @returns {number} The index (defaults to 0 if detection fails)
     */
    findActiveMediaIndex(articleNode) {
        Logger.debug('PostMediaHandler: Finding active media index in carousel...');

        // Try to read from ?img_index=N in URL
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const imgIndex = parseInt(urlParams.get('img_index'), 10);
            // Check if it's a valid number AND greater than 0 (URL params are usually 1-based)
            if (!isNaN(imgIndex) && imgIndex >= 1) {
                Logger.debug(`PostMediaHandler: Detected img_index=${imgIndex} from URL. Adjusting to 0-based index.`);
                return imgIndex - 1; // Convert to 0-based index
            }
        } catch (e) {
            Logger.warn('PostMediaHandler: Error parsing URL for img_index:', e);
        }

        // Fallback to dot-based detection
        const dotsContainer = articleNode.querySelector(this.CONFIG.SELECTORS.postCarouselDotsContainer);
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll(this.CONFIG.SELECTORS.postCarouselDot);
            if (dots.length > 1) {
                for (let i = 0; i < dots.length; i++) {
                    if (dots[i].classList.length >= 2 && dots[i].classList.length !== 1) {
                        Logger.debug(`PostMediaHandler: Active dot found at index ${i} (using class count >= 2)`);
                        return i;
                    }
                }
                Logger.warn('PostMediaHandler: Found dots container but could not identify the active dot.');
            } else if (dots.length === 1) {
                Logger.debug('PostMediaHandler: Only one dot found, assuming index 0.');
                return 0;
            }
        }

        Logger.warn('PostMediaHandler: Could not determine active media index. Defaulting to 0.');
        return 0;
    }
}