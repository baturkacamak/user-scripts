import {Logger} from "../../../../core";

/**
 * Handler for extracting media information from Instagram stories.
 * Follows Single Responsibility Principle by focusing only on story context.
 */
export default class StoryMediaHandler {
    /**
     * Configuration settings specific to story media handling
     */
    CONFIG = {
        SELECTORS: {
            /** Targets the container holding progress bar segments for stories */
            storyProgressBar: 'div[role="progressbar"]',
            /** Targets individual segment containers in the progress bar */
            storyProgressSegments: ':scope > div',
            /** Targets the currently filled/active segment within the progress bar */
            storyProgressFill: 'div[style*="width"]',
        }
    };

    /**
     * Create a new story media handler
     *
     * @param {Array} strategies - The media fetching strategies to use in order of preference
     */
    constructor(strategies = []) {
        this.strategies = strategies;
    }

    /**
     * Get media information for a story
     *
     * @param {HTMLElement} containerNode - The story section element
     * @param {object} [options={}] - Additional options
     * @returns {Promise<{url: string, mediaIndex: number, type: string}|null>}
     */
    async getMediaInfo(containerNode, options = {}) {
        Logger.info('StoryMediaHandler: Processing story media container');

        try {
            // Determine the index of the current story
            const mediaIndex = this.findStoryIndex(containerNode);
            Logger.debug(`StoryMediaHandler: Story index determined: ${mediaIndex !== null ? mediaIndex : 'Not found, using 0'}`);

            // Try each strategy in order until one succeeds
            for (const strategy of this.strategies) {
                if (strategy.isApplicable(containerNode)) {
                    Logger.debug(`StoryMediaHandler: Trying strategy: ${strategy.getName()}`);
                    const result = await strategy.fetchMediaInfo(containerNode, mediaIndex || 0, options);

                    if (result && result.url) {
                        Logger.info(`StoryMediaHandler: Strategy ${strategy.getName()} succeeded`);
                        return result;
                    }

                    Logger.debug(`StoryMediaHandler: Strategy ${strategy.getName()} failed to get URL`);
                }
            }

            Logger.error('StoryMediaHandler: All strategies failed to get media URL');
            return null;
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error getting story media info');
            return null;
        }
    }

    /**
     * Finds the index (0-based) of the current story/highlight being viewed using the progress bar.
     * @param {HTMLElement} sectionNode - The story/highlight container SECTION.
     * @returns {number|null} The index or null if not found.
     */
    findStoryIndex(sectionNode) {
        Logger.debug('StoryMediaHandler: Finding story/highlight index using progress bar...');
        try {
            // Find the progress bar element
            const progressBar = sectionNode.querySelector(this.CONFIG.SELECTORS.storyProgressBar);
            if (!progressBar) {
                Logger.debug('StoryMediaHandler: Progress bar element not found.');
                return null;
            }

            // Find all segments in the progress bar
            const segments = progressBar.querySelectorAll(this.CONFIG.SELECTORS.storyProgressSegments);
            if (segments.length === 0) {
                Logger.debug('StoryMediaHandler: No progress bar segments found.');
                return null;
            }

            if (segments.length === 1) {
                Logger.debug('StoryMediaHandler: Only one progress bar segment found, index is 0.');
                return 0;
            }

            // Find the active segment (the one that's currently filling up)
            for (let i = 0; i < segments.length; i++) {
                const fillDiv = segments[i].querySelector(this.CONFIG.SELECTORS.storyProgressFill);
                if (fillDiv?.style.width) {
                    const widthPercent = parseFloat(fillDiv.style.width);
                    if (widthPercent > 0) {
                        Logger.debug(`StoryMediaHandler: Found active progress segment at index ${i} (width=${widthPercent}%).`);
                        return i;
                    }
                }
            }

            Logger.warn('StoryMediaHandler: Could not definitively identify active progress segment. Defaulting to 0.');
            return 0;
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error finding story index.');
            return null;
        }
    }

    /**
     * Extract the story ID from the URL
     *
     * @returns {string|null} The story ID or null if not found
     */
    extractStoryIdFromUrl() {
        try {
            const match = window.location.pathname.match(/^\/stories\/([^/]+)\/(\d+)/);
            if (match && match[2]) {
                Logger.debug('StoryMediaHandler: Extracted story ID from URL:', match[2]);
                return match[2];
            }
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error extracting story ID from URL');
        }

        Logger.warn('StoryMediaHandler: Could not extract story ID from URL');
        return null;
    }

    /**
     * Extract the username of the story owner from the URL
     *
     * @returns {string|null} The username or null if not found
     */
    extractUsernameFromUrl() {
        try {
            const match = window.location.pathname.match(/^\/stories\/([^/]+)\//);
            if (match && match[1]) {
                Logger.debug('StoryMediaHandler: Extracted username from URL:', match[1]);
                return match[1];
            }
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error extracting username from URL');
        }

        Logger.warn('StoryMediaHandler: Could not extract username from URL');
        return null;
    }

    /**
     * Check if this is a story or highlight
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {boolean} True if this is a highlight, false if it's a regular story
     */
    isHighlight(containerNode) {
        // Best way to detect highlight is checking URL pattern
        // Regular stories: /stories/username/12345678/
        // Highlights: /stories/highlights/12345678/

        try {
            if (window.location.pathname.includes('/highlights/')) {
                Logger.debug('StoryMediaHandler: Detected highlight story');
                return true;
            }

            // Alternative detection through DOM if URL check fails
            const highlightIndicator = containerNode.querySelector('div[aria-label*="highlight"]');
            if (highlightIndicator) {
                Logger.debug('StoryMediaHandler: Detected highlight indicator in DOM');
                return true;
            }
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error detecting highlight');
        }

        return false;
    }

    /**
     * Gets the total number of stories in the current story set
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {number} The total number of stories
     */
    getTotalStoryCount(containerNode) {
        try {
            const progressBar = containerNode.querySelector(this.CONFIG.SELECTORS.storyProgressBar);
            if (!progressBar) return 1;

            const segments = progressBar.querySelectorAll(this.CONFIG.SELECTORS.storyProgressSegments);
            return segments.length || 1;
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error getting total story count');
            return 1;
        }
    }

    /**
     * Check if the current story is a video or an image
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {'video'|'image'|null} The type of media or null if undetermined
     */
    detectStoryMediaType(containerNode) {
        try {
            // Check for video element first
            const videoElement = containerNode.querySelector('video');
            if (videoElement) {
                return 'video';
            }

            // Check for image element
            const imageElement = containerNode.querySelector('img[decoding="sync"]') ||
                containerNode.querySelector('img[style*="object-fit"]');
            if (imageElement) {
                return 'image';
            }

            // Try general media detection
            const anyImage = containerNode.querySelector('img');
            if (anyImage) {
                return 'image';
            }

            Logger.warn('StoryMediaHandler: Could not determine story media type');
            return null;
        } catch (error) {
            Logger.error(error, 'StoryMediaHandler: Error detecting story media type');
            return null;
        }
    }
}