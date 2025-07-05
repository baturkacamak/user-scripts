import HTMLUtils from './HTMLUtils.js';
import StyleManager from './StyleManager.js';
import Logger from './Logger.js';
import PubSub from './PubSub.js';
import Notification from '../ui/Notification.js';

/**
 * ContentCollector - Simple content collection and cleaning system
 * Collects content from web pages using selectors and processing functions
 */
class ContentCollector {
    static EVENTS = {
        CONTENT_ADDED: 'contentcollector:content-added',
        CONTENT_CLEARED: 'contentcollector:content-cleared',
        COLLECTION_UPDATED: 'contentcollector:collection-updated'
    };

    /**
     * @param {Object} options Configuration options
     * @param {Array<string>} options.selectors - CSS selectors for content containers
     * @param {Function} options.contentExtractor - Function to extract text from elements
     * @param {Function} options.contentCleaner - Function to clean extracted content
     * @param {Function} options.contentValidator - Function to validate content before adding
     * @param {boolean} options.deduplicate - Whether to remove duplicates (default: true)
     * @param {Object} options.pubsub - Optional PubSub instance for events
     * @param {Object} options.logger - Optional logger instance
     * @param {string} options.name - Optional name for this collector
     */
    constructor(options) {
        this.selectors = options.selectors || [];
        this.contentExtractor = options.contentExtractor || this.defaultContentExtractor.bind(this);
        this.contentCleaner = options.contentCleaner || this.defaultContentCleaner.bind(this);
        this.contentValidator = options.contentValidator || this.defaultContentValidator.bind(this);
        this.deduplicate = options.deduplicate !== false;
        this.name = options.name || 'ContentCollector';
        
        // Optional notifications
        this.enableNotifications = options.enableNotifications || false;

        this.content = [];
        this.seenElements = new WeakSet();
        
        // Use StyleManager for highlighting collected elements
        this.highlightCollected = options.highlightCollected || false;
        if (this.highlightCollected) {
            this.initializeHighlightStyles();
        }
    }

    /**
     * Collect existing content on page
     */
    collectExistingContent() {
        const initialCount = this.content.length;

        this.selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    this.processElement(element);
                });
            } catch (error) {
                Logger.error(`[${this.name}] Error with selector "${selector}":`, error);
            }
        });

        const newCount = this.content.length - initialCount;
        Logger.info(`[${this.name}] Collected ${newCount} new content items (${this.content.length} total)`);

        // Show notification if enabled and content was found
        if (this.enableNotifications && newCount > 0) {
            Notification.success(`Collected ${newCount} new content items`, {
                duration: 3000,
                position: 'top-right'
            });
        }

        this.publishEvent(ContentCollector.EVENTS.COLLECTION_UPDATED, {
            newItems: newCount,
            totalItems: this.content.length,
            name: this.name
        });
    }

    /**
     * Process a single element for content extraction
     */
    processElement(element) {
        // Skip if already processed
        if (this.seenElements.has(element)) {
            return;
        }

        this.seenElements.add(element);

        try {
            // Extract content using the configured extractor
            const rawContent = this.contentExtractor(element);
            if (!rawContent) {
                return;
            }

            // Clean the content
            const cleanedContent = this.contentCleaner(rawContent);
            if (!cleanedContent) {
                return;
            }

            // Validate the content
            if (!this.contentValidator(cleanedContent, this.content)) {
                return;
            }

            // Check for duplicates if enabled
            if (this.deduplicate && this.content.includes(cleanedContent)) {
                return;
            }

            // Add to collection
            this.content.push(cleanedContent);

            // Highlight the element if enabled
            this.highlightElement(element);

            Logger.debug(`[${this.name}] Added content: ${cleanedContent.substring(0, 100)}...`);
            this.publishEvent(ContentCollector.EVENTS.CONTENT_ADDED, {
                content: cleanedContent,
                totalItems: this.content.length,
                name: this.name
            });

        } catch (error) {
            Logger.error(`[${this.name}] Error processing element:`, error);
        }
    }

    /**
     * Default content extractor - uses innerText
     */
    defaultContentExtractor(element) {
        return element.innerText?.trim() || '';
    }

    /**
     * Default content cleaner - removes common UI elements
     */
    defaultContentCleaner(text) {
        if (!text) return '';

        // Common UI elements to remove
        const uiElements = [
            'edit', 'more_vert', 'thumb_up', 'thumb_down', 'copy', 'share',
            'delete', 'refresh', 'restart', 'stop', 'play', 'pause',
            'expand_more', 'expand_less', 'close', 'menu', 'settings',
            'download', 'upload', 'save', 'favorite', 'star', 'bookmark'
        ];

        // Split into lines and clean
        let lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line) return false;
                
                const lowerLine = line.toLowerCase();
                if (uiElements.includes(lowerLine)) return false;
                
                if (/^[-=_\s]+$/.test(line)) return false;
                if (line.length <= 3 && !/\w/.test(line)) return false;
                
                return true;
            });

        // Remove UI patterns at beginning and end
        while (lines.length > 0 && this.isUILine(lines[0])) {
            lines.shift();
        }
        while (lines.length > 0 && this.isUILine(lines[lines.length - 1])) {
            lines.pop();
        }

        return lines.join('\n').trim();
    }

    /**
     * Check if a line is likely a UI element
     */
    isUILine(line) {
        const cleaned = line.toLowerCase().trim();
        
        const uiPatterns = [
            /^(edit|copy|share|delete|save|download)$/,
            /^(thumb_up|thumb_down|more_vert)$/,
            /^[👍👎❤️⭐🔗📋✏️🗑️]+$/,
            /^[\s\-=_]{1,5}$/
        ];

        return uiPatterns.some(pattern => pattern.test(cleaned));
    }

    /**
     * Default content validator - checks minimum length
     */
    defaultContentValidator(content, existingContent) {
        return content && content.length > 10;
    }

    /**
     * Get all collected content
     */
    getContent() {
        return [...this.content];
    }

    /**
     * Get content formatted as string
     */
    getFormattedContent(separator = '\n\n---\n\n') {
        return this.content.join(separator);
    }

    /**
     * Clear all collected content
     */
    clearContent() {
        const clearedCount = this.content.length;
        this.content = [];
        this.seenElements = new WeakSet();

        Logger.info(`[${this.name}] Cleared ${clearedCount} content items`);
        this.publishEvent(ContentCollector.EVENTS.CONTENT_CLEARED, {
            clearedCount,
            name: this.name
        });
    }

    /**
     * Get collection statistics
     */
    getStats() {
        return {
            totalItems: this.content.length,
            selectors: this.selectors.length,
            name: this.name
        };
    }

    /**
     * Add custom selector
     */
    addSelector(selector) {
        if (!this.selectors.includes(selector)) {
            this.selectors.push(selector);
            Logger.debug(`[${this.name}] Added selector: ${selector}`);
        }
    }

    /**
     * Initialize highlight styles using StyleManager
     */
    initializeHighlightStyles() {
        StyleManager.addStyles(`
            .content-collector-highlighted {
                outline: 2px solid #4CAF50 !important;
                background-color: rgba(76, 175, 80, 0.1) !important;
                transition: all 0.3s ease !important;
            }
            .content-collector-highlighted::after {
                content: "✓ Collected";
                position: absolute;
                top: -20px;
                right: 0;
                background: #4CAF50;
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 3px;
                z-index: 10000;
            }
        `, `content-collector-styles-${this.name}`);
    }

    /**
     * Wait for elements using HTMLUtils
     */
    async waitForContent(timeout = 10000) {
        for (const selector of this.selectors) {
            try {
                const element = await HTMLUtils.waitForElement(selector, timeout);
                if (element) {
                    Logger.debug(`[${this.name}] Found content with selector: ${selector}`);
                    return element;
                }
            } catch (error) {
                Logger.debug(`[${this.name}] No content found for selector: ${selector}`);
            }
        }
        return null;
    }

    /**
     * Highlight collected element using StyleManager
     */
    highlightElement(element) {
        if (this.highlightCollected && element) {
            element.classList.add('content-collector-highlighted');
            // Remove highlight after 3 seconds
            setTimeout(() => {
                element.classList.remove('content-collector-highlighted');
            }, 3000);
        }
    }

    /**
     * Remove selector
     */
    removeSelector(selector) {
        const index = this.selectors.indexOf(selector);
        if (index > -1) {
            this.selectors.splice(index, 1);
            Logger.debug(`[${this.name}] Removed selector: ${selector}`);
        }
    }

    /**
     * Publish event using core PubSub
     */
    publishEvent(eventName, data) {
        PubSub.publish(eventName, data);
    }
}

export default ContentCollector; 