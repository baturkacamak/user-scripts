import {Logger} from "../../../../common/core";
import MediaFetcherFactory from "./MediaFetcherFactory";

/**
 * InstagramMediaFetcher - Finds direct media URLs (video/image) on Instagram.
 *
 * This class acts as a facade for the underlying context handlers and strategies,
 * providing a simple interface for getting media information from any Instagram context.
 */
class InstagramMediaFetcher {
    static CONFIG = {
        /** Selectors used to query the DOM for specific Instagram elements */
        SELECTORS: {
            // Container Selectors
            /** Targets the main container for a post */
            postArticle: 'article, main[role="main"]',
            /** Targets the main container for a story/highlight view */
            storySection: 'section[role="dialog"] section',
            /** Targets the header element, often used as an anchor for profile pics */
            pageHeader: 'header',
        }
    };

    /**
     * @param {object} [options={}] Configuration options.
     * @param {boolean} [options.disableApiMethod=false] If true, disables the API fetching method and forces fallback.
     */
    constructor(options = {}) {
        this.options = options;
        this.factory = new MediaFetcherFactory(options);

        Logger.debug('InstagramMediaFetcher Initialized', {
            disableApiMethod: options.disableApiMethod
        });
    }

    /**
     * Main method to get media information (URL, type, index).
     * It finds the appropriate context (post/story/reel) and delegates the fetching.
     *
     * @param {HTMLElement} targetElement - An element within the media context
     * @param {object} [options={}] - Additional options for fetching
     * @returns {Promise<{ url: string, mediaInstagramMediaFetcher: number, type: 'video'|'image' }|null>} Media info object or null
     */
    async getMediaInfo(targetElement, options = {}) {
        Logger.debug('getMediaInfo called for target:', targetElement);

        try {
            // Find the container node
            const containerNode = this.findMediaContainer(targetElement);
            if (!containerNode) {
                Logger.error('Could not find a valid media container for the target element.');
                return null;
            }

            Logger.info(`Found container: ${containerNode.tagName}`);

            // Detect context type and create appropriate handler
            const contextType = this.factory.detectContextType(containerNode);
            Logger.info(`Detected context type: ${contextType}`);

            const handler = this.factory.createHandler(contextType);

            // Delegate to the handler
            return await handler.getMediaInfo(containerNode, options);
        } catch (error) {
            Logger.error(error, 'Error in getMediaInfo');
            return null;
        }
    }

    /**
     * Tries to find the main media container (article for posts, section for stories)
     * by traversing up from the target element.
     *
     * @param {HTMLElement} targetElement - The starting element
     * @returns {HTMLElement|null} The container element or null if not found
     */
    findMediaContainer(targetElement) {
        Logger.debug('Attempting to find media container...');

        if (!targetElement || !targetElement.closest) {
            Logger.warn('Invalid targetElement passed to findMediaContainer.');
            return null;
        }

        // Check for post container
        const article = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.postArticle);
        if (article) {
            Logger.debug('Found ARTICLE container.');
            return article;
        }

        // Check for story container
        const storySection = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.storySection);
        if (storySection) {
            Logger.debug('Found STORY SECTION container.');
            return storySection;
        }

        // Check if in header (profile pictures)
        const header = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.pageHeader);
        if (header) {
            Logger.info("Target seems to be in header. Profile pictures might require different logic.");
            return null;
        }

        Logger.warn('Failed to find a media container ancestor.');
        return null;
    }
}

export default InstagramMediaFetcher;