import Logger from './Logger.js';
import ClipboardService from '../services/ClipboardService.js';

/**
 * ContentFormatter - Formats structured content (comments, tweets, posts) for clipboard
 * 
 * Handles formatting of structured data with customizable templates and separators.
 * Perfect for Instagram comments, Twitter posts, Reddit threads, etc.
 * 
 * @example
 * const formatter = new ContentFormatter({
 *   itemSeparator: '\n\n---\n\n',
 *   template: '{username} ({time}):\n{text}'
 * });
 * 
 * const formatted = formatter.formatItems(comments);
 * await formatter.copyToClipboard(formatted);
 */
class ContentFormatter {
    /**
     * Built-in templates for common platforms
     */
    static TEMPLATES = {
        INSTAGRAM_COMMENT: {
            item: '{username} ({time}):\n{text}',
            reply: '  ↳ {username} ({time}):\n  {text}',
            replyTo: '  ↳ {username} replied to {repliedTo} ({time}):\n  {text}',
            separator: '\n\n---\n\n'
        },
        TWITTER_POST: {
            item: '{username} (@{handle}) - {time}:\n{text}',
            reply: '  ↳ {username} (@{handle}) - {time}:\n  {text}',
            replyTo: '  ↳ {username} (@{handle}) replied to {repliedTo} - {time}:\n  {text}',
            separator: '\n\n---\n\n'
        },
        REDDIT_COMMENT: {
            item: 'u/{username} ({time}, {score} points):\n{text}',
            reply: '  ↳ u/{username} ({time}, {score} points):\n  {text}',
            separator: '\n\n---\n\n'
        },
        SIMPLE: {
            item: '{text}',
            separator: '\n\n'
        }
    };

    /**
     * @param {Object} options Configuration options
     * @param {string|Function} options.template - Template string or function for formatting items
     * @param {string|Function} options.replyTemplate - Template for replies (optional)
     * @param {string|Function} options.replyToTemplate - Template for replies with "replied to" (optional)
     * @param {string} options.itemSeparator - Separator between items (default: '\n\n---\n\n')
     * @param {string} options.replySeparator - Separator between replies (default: '\n')
     * @param {Function} options.itemExtractor - Function to extract data from element (element) => object
     * @param {Function} options.replyExtractor - Function to extract reply data (element) => object
     * @param {Function} options.itemValidator - Function to validate items before formatting (item) => boolean
     * @param {Object} options.logger - Optional logger instance
     * @param {boolean} options.enableDebugLogging - Enable debug logging
     */
    constructor(options = {}) {
        this.template = options.template || ContentFormatter.TEMPLATES.SIMPLE.item;
        this.replyTemplate = options.replyTemplate || null;
        this.replyToTemplate = options.replyToTemplate || null;
        this.itemSeparator = options.itemSeparator || '\n\n---\n\n';
        this.replySeparator = options.replySeparator || '\n';
        this.itemExtractor = options.itemExtractor || null;
        this.replyExtractor = options.replyExtractor || null;
        this.itemValidator = options.itemValidator || null;
        this.logger = options.logger || Logger;
        this.enableDebugLogging = options.enableDebugLogging || false;
    }

    /**
     * Replace template placeholders with actual values
     * @private
     */
    replacePlaceholders(template, data) {
        if (typeof template === 'function') {
            return template(data);
        }

        let result = template;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{${key}}`;
            const replacement = value !== null && value !== undefined ? String(value) : '';
            result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        }
        return result;
    }

    /**
     * Format a single item
     * @private
     */
    formatItem(item, isReply = false, repliedTo = null) {
        if (isReply && repliedTo && this.replyToTemplate) {
            return this.replacePlaceholders(this.replyToTemplate, { ...item, repliedTo });
        } else if (isReply && this.replyTemplate) {
            return this.replacePlaceholders(this.replyTemplate, item);
        } else {
            return this.replacePlaceholders(this.template, item);
        }
    }

    /**
     * Format a single item with its replies
     * @private
     */
    formatItemWithReplies(item) {
        let formatted = this.formatItem(item, false);

        if (item.replies && Array.isArray(item.replies) && item.replies.length > 0) {
            const formattedReplies = item.replies
                .filter(reply => !this.itemValidator || this.itemValidator(reply))
                .map(reply => this.formatItem(reply, true, item.username || item.handle))
                .join(this.replySeparator);

            if (formattedReplies) {
                formatted += this.replySeparator + formattedReplies;
            }
        }

        return formatted;
    }

    /**
     * Format an array of items
     * 
     * @param {Array} items - Array of item objects or elements
     * @param {Object} options - Formatting options
     * @param {boolean} options.includeReplies - Include replies in formatting (default: true)
     * @param {boolean} options.extractFromElements - Extract data from DOM elements (default: false)
     * @returns {string} Formatted string
     */
    formatItems(items, options = {}) {
        const includeReplies = options.includeReplies !== false;
        const extractFromElements = options.extractFromElements || false;

        if (!Array.isArray(items) || items.length === 0) {
            if (this.enableDebugLogging) {
                this.logger.debug('No items to format');
            }
            return '';
        }

        if (this.enableDebugLogging) {
            this.logger.debug(`Formatting ${items.length} items`);
        }

        const formattedItems = items
            .map((item, index) => {
                try {
                    // Extract data from element if needed
                    let data = item;
                    if (extractFromElements && item instanceof HTMLElement) {
                        if (this.itemExtractor) {
                            data = this.itemExtractor(item);
                        } else {
                            data = { text: item.textContent || '' };
                        }
                    }

                    // Validate item
                    if (this.itemValidator && !this.itemValidator(data)) {
                        if (this.enableDebugLogging) {
                            this.logger.debug(`Item ${index} failed validation, skipping`);
                        }
                        return null;
                    }

                    // Format item
                    if (includeReplies && data.replies) {
                        return this.formatItemWithReplies(data);
                    } else {
                        return this.formatItem(data, false);
                    }
                } catch (error) {
                    this.logger.error(`Error formatting item ${index}:`, error);
                    return null;
                }
            })
            .filter(item => item !== null && item.trim().length > 0);

        return formattedItems.join(this.itemSeparator);
    }

    /**
     * Format and copy items to clipboard
     * 
     * @param {Array} items - Array of items to format and copy
     * @param {Object} options - Formatting options
     * @returns {Promise<boolean>} True if successful
     */
    async formatAndCopy(items, options = {}) {
        try {
            const formatted = this.formatItems(items, options);
            
            if (!formatted || formatted.trim().length === 0) {
                this.logger.warn('No content to copy after formatting');
                return false;
            }

            const success = await ClipboardService.copyToClipboard(formatted);
            
            if (success && this.enableDebugLogging) {
                this.logger.debug(`Successfully copied ${formatted.length} characters to clipboard`);
            }

            return success;
        } catch (error) {
            this.logger.error('Error formatting and copying:', error);
            return false;
        }
    }

    /**
     * Create a formatter with a built-in template
     * 
     * @param {string} templateName - Name of built-in template (INSTAGRAM_COMMENT, TWITTER_POST, etc.)
     * @param {Object} customOptions - Additional options to override template defaults
     * @returns {ContentFormatter} Configured formatter instance
     */
    static createFromTemplate(templateName, customOptions = {}) {
        const template = ContentFormatter.TEMPLATES[templateName];
        if (!template) {
            throw new Error(`Template "${templateName}" not found. Available: ${Object.keys(ContentFormatter.TEMPLATES).join(', ')}`);
        }

        return new ContentFormatter({
            template: template.item,
            replyTemplate: template.reply || null,
            replyToTemplate: template.replyTo || null,
            itemSeparator: template.separator,
            ...customOptions
        });
    }
}

export default ContentFormatter;
