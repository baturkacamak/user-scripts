import {Logger} from '../../../core';
import PostMediaHandler from "./handlers/PostMediaHandler";
import StoryMediaHandler from "./handlers/StoryMediaHandler";
import ReelMediaHandler from "./handlers/ReelMediaHandler";
import ApiMediaFetcherStrategy from "./strategies/ApiMediaFetcherStrategy";
import DomMediaFetcherStrategy from "./strategies/DomMediaFetcherStrategy";
import HtmlFetcherStrategy from "./strategies/HtmlFetcherStrategy";

/**
 * Factory for creating media fetcher handlers with appropriate strategies.
 * Implements the Factory Method pattern to create handlers based on context.
 */
export default class MediaFetcherFactory {
    /**
     * Create a new media fetcher factory
     *
     * @param {object} [options={}] - Configuration options
     * @param {boolean} [options.disableApiMethod=false] - Whether to disable API strategies
     */
    constructor(options = {}) {
        this.options = options;
        Logger.debug('MediaFetcherFactory: Initialized with options', options);
    }

    /**
     * Create a media handler appropriate for the context
     *
     * @param {string} contextType - The type of context ('post', 'story', or 'reel')
     * @returns {PostMediaHandler|StoryMediaHandler|ReelMediaHandler} The appropriate handler
     */
    createHandler(contextType) {
        const strategies = this.createStrategies();

        switch (contextType.toLowerCase()) {
            case 'post':
                Logger.debug('MediaFetcherFactory: Creating PostMediaHandler');
                return new PostMediaHandler(strategies);

            case 'story':
                Logger.debug('MediaFetcherFactory: Creating StoryMediaHandler');
                return new StoryMediaHandler(strategies);

            case 'reel':
                Logger.debug('MediaFetcherFactory: Creating ReelMediaHandler');
                return new ReelMediaHandler(strategies);

            default:
                Logger.error(`MediaFetcherFactory: Unknown context type "${contextType}"`);
                throw new Error(`Unknown context type: ${contextType}`);
        }
    }

    /**
     * Create all available strategies in priority order
     *
     * @returns {Array} Array of strategy instances
     */
    createStrategies() {
        const strategies = [];

        // Only add API strategy if not disabled
        if (!this.options.disableApiMethod) {
            strategies.push(new ApiMediaFetcherStrategy());
        }

        // Always add DOM and HTML strategies
        strategies.push(new DomMediaFetcherStrategy());
        strategies.push(new HtmlFetcherStrategy());

        Logger.debug(`MediaFetcherFactory: Created ${strategies.length} strategies`, {
            includesApi: !this.options.disableApiMethod
        });

        return strategies;
    }

    /**
     * Detect the context type from a container node and URL
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {'post'|'story'|'reel'} The detected context type
     */
    detectContextType(containerNode) {
        // First check URL patterns (most reliable)
        if (window.location.pathname.startsWith('/reels/') || window.location.pathname.startsWith('/reel/')) {
            return 'reel';
        }

        if (window.location.pathname.startsWith('/stories/')) {
            return 'story';
        }

        // Then check container tag and structure
        if (containerNode.tagName === 'SECTION') {
            return 'story';
        }

        if (containerNode.tagName === 'ARTICLE' || containerNode.tagName === 'MAIN') {
            if (window.location.pathname.startsWith('/p/')) {
                return 'post';
            }

            // Additional checks for embedded reels vs posts
            const videoElem = containerNode.querySelector('video');
            if (videoElem && (
                containerNode.querySelector('div[class*="reel"]') ||
                containerNode.querySelector('a[href*="/reel/"]')
            )) {
                return 'reel';
            }

            return 'post';
        }

        // Default fallback
        Logger.warn('MediaFetcherFactory: Could not definitively detect context type, defaulting to "post"');
        return 'post';
    }
}