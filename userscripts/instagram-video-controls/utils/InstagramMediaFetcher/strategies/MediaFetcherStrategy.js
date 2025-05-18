/**
 * Base strategy class for media fetching operations.
 * All concrete strategies should implement this interface.
 */
export default class MediaFetcherStrategy {
    /**
     * Configuration settings for the strategy
     */
    CONFIG = {};

    /**
     * Fetch media information based on the provided context
     *
     * @param {HTMLElement} containerNode - The container element for the media
     * @param {number} mediaIdx - The index of the media (for carousels/stories)
     * @param {object} [options={}] - Additional options for the fetcher
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchMediaInfo(containerNode, mediaIdx, options = {}) {
        throw new Error('Method fetchMediaInfo() must be implemented by concrete strategy classes');
    }

    /**
     * Checks if this strategy is applicable for the given container node
     *
     * @param {HTMLElement} containerNode - The container element to check
     * @returns {boolean} True if this strategy can be applied, false otherwise
     */
    isApplicable(containerNode) {
        throw new Error('Method isApplicable() must be implemented by concrete strategy classes');
    }

    /**
     * Get the name of this strategy for logging and debugging
     *
     * @returns {string} The name of the strategy
     */
    getName() {
        return this.constructor.name;
    }
}