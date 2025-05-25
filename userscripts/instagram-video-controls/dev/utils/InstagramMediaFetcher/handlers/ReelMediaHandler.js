import {Logger} from '../../../../common/core';

/**
 * Handler for extracting media information from Instagram reels.
 * Follows Single Responsibility Principle by focusing only on reel context.
 */
export default class ReelMediaHandler {
    /**
     * Create a new reel media handler
     *
     * @param {Array} strategies - The media fetching strategies to use in order of preference
     */
    constructor(strategies = []) {
        this.strategies = strategies;
    }

    /**
     * Get media information for a reel
     *
     * @param {HTMLElement} containerNode - The reel container element
     * @param {object} [options={}] - Additional options
     * @returns {Promise<{url: string, mediaIndex: number, type: string}|null>}
     */
    async getMediaInfo(containerNode, options = {}) {
        Logger.info('ReelMediaHandler: Processing reel media container');

        try {
            // Reels always have a single video at index 0
            const mediaIndex = 0;

            // Try each strategy in order until one succeeds
            for (const strategy of this.strategies) {
                if (strategy.isApplicable(containerNode)) {
                    Logger.debug(`ReelMediaHandler: Trying strategy: ${strategy.getName()}`);
                    const result = await strategy.fetchMediaInfo(containerNode, mediaIndex, options);

                    if (result && result.url) {
                        Logger.info(`ReelMediaHandler: Strategy ${strategy.getName()} succeeded`);
                        return {
                            url: result.url,
                            mediaIndex: mediaIndex,
                            type: 'video' // Reels are always videos
                        };
                    }

                    Logger.debug(`ReelMediaHandler: Strategy ${strategy.getName()} failed to get URL`);
                }
            }

            Logger.error('ReelMediaHandler: All strategies failed to get media URL');
            return null;
        } catch (error) {
            Logger.error(error, 'ReelMediaHandler: Error getting reel media info');
            return null;
        }
    }

    /**
     * Checks if this is a reel context based on URL or container
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {boolean} True if this is a reel context
     */
    isReelContext(containerNode) {
        // Check URL first (most reliable)
        if (window.location.pathname.startsWith('/reels/') || window.location.pathname.startsWith('/reel/')) {
            return true;
        }

        // Can add additional checks if needed for embedded reels

        return false;
    }
}