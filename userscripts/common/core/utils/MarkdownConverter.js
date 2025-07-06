import Logger from './Logger.js';
import HTMLUtils from './HTMLUtils.js';

class MarkdownConverter {
    constructor(options = {}) {
        this.logger = Logger.newPrefix('MarkdownConverter');

        this.options = {
            selectorsToRemove: options.selectorsToRemove || [
                'button',
                '[role="button"]',
                '.material-icons',
                '.icon',
                '[aria-label*="copy"]',
                '[aria-label*="share"]',
                '[aria-label*="edit"]',
                '[aria-label*="more"]',
                '.action-buttons',
                '.response-actions'
            ],
            keywordsToRemove: options.keywordsToRemove || [
                'edit', 'more_vert', 'thumb_up', 'thumb_down', 'copy', 'share',
                'delete', 'refresh', 'restart', 'stop', 'play', 'pause',
                'expand_more', 'expand_less', 'close', 'menu', 'settings',
                'download', 'upload', 'save', 'favorite', 'star', 'bookmark',
                'like', 'dislike', 'report', 'flag', 'hide', 'show'
            ],
            uiPatterns: options.uiPatterns || [
                /^(edit|copy|share|delete|save|download)$/,
                /^(thumb_up|thumb_down|more_vert)$/,
                /^(expand_more|expand_less|close|menu)$/,
                /^[👍👎❤️⭐🔗📋✏️🗑️]+$/,
                /^[\s\-=_]{1,5}$/,
            ],
        };
    }

    /**
     * Extract response text from an element and convert to Markdown
     * @param {HTMLElement} element - The element to extract text from
     * @returns {string} - The formatted text
     */
    extractText(element) {
        const clonedElement = element.cloneNode(true);

        this.options.selectorsToRemove.forEach(selector => {
            clonedElement.querySelectorAll(selector).forEach(el => el.remove());
        });

        const htmlContent = clonedElement.innerHTML?.trim();

        if (!htmlContent) {
            const fullText = element.innerText?.trim();
            return this.cleanResponseText(fullText);
        }

        return this.convertHtmlToFormattedText(htmlContent);
    }

    /**
     * Clean response text
     * @param {string} text - The text to clean
     * @returns {string} - The cleaned text
     */
    cleanResponseText(text) {
        if (!text) return '';

        const uiElements = this.options.keywordsToRemove;

        let lines = text.split('\n');
        let cleanedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) {
                if (cleanedLines.length > 0 &&
                    i < lines.length - 1 &&
                    lines.slice(i + 1).some(l => l.trim() && !this.isUIElementLine(l.trim(), uiElements))) {
                    cleanedLines.push('');
                }
                continue;
            }

            if (this.isUIElementLine(line, uiElements)) {
                continue;
            }

            if (/^[-=_\s]+$/.test(line)) {
                continue;
            }

            if (line.length <= 3 && !/\w/.test(line)) {
                continue;
            }

            cleanedLines.push(line);
        }

        while (cleanedLines.length > 0 && this.isUILine(cleanedLines[0])) {
            cleanedLines.shift();
        }
        while (cleanedLines.length > 0 && this.isUILine(cleanedLines[cleanedLines.length - 1])) {
            cleanedLines.pop();
        }

        let result = cleanedLines.join('\n').trim();
        result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');

        return result;
    }

    /**
     * Check if line is UI element
     * @param {string} line - The line to check
     * @param {string[]} uiElements - The list of UI elements
     * @returns {boolean} - True if the line is a UI element
     */
    isUIElementLine(line, uiElements) {
        const lowerLine = line.toLowerCase();
        return uiElements.includes(lowerLine) || this.isUILine(line);
    }

    /**
     * Check if line is UI
     * @param {string} line - The line to check
     * @returns {boolean} - True if the line is a UI line
     */
    isUILine(line) {
        const cleaned = line.toLowerCase().trim();
        return this.options.uiPatterns.some(pattern => pattern.test(cleaned));
    }

    /**
     * Convert HTML to formatted text
     * @param {string} htmlContent - The HTML content to convert
     * @returns {string} - The formatted text
     */
    convertHtmlToFormattedText(htmlContent) {
        if (!htmlContent) return '';

        const tempDiv = document.createElement('div');

        try {
            HTMLUtils.setHTMLSafely(tempDiv, htmlContent);
        } catch (error) {
            this.logger.warn('Failed to set HTML safely, falling back to plain text:', error);
            return this.cleanResponseText(htmlContent.replace(/<[^>]*>/g, ''));
        }

        const formattedText = this.processNodeForFormatting(tempDiv);
        return this.cleanResponseText(formattedText);
    }

    /**
     * Process node for formatting
     * @param {Node} node - The node to process
     * @returns {string} - The formatted text
     */
    processNodeForFormatting(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const tagName = node.tagName.toLowerCase();
        const children = Array.from(node.childNodes);
        const childText = children.map(child => this.processNodeForFormatting(child)).join('');

        switch (tagName) {
            case 'h1':
                return `\n\n# ${childText}\n\n`;
            case 'h2':
                return `\n\n## ${childText}\n\n`;
            case 'h3':
                return `\n\n### ${childText}\n\n`;
            case 'h4':
                return `\n\n#### ${childText}\n\n`;
            case 'h5':
                return `\n\n##### ${childText}\n\n`;
            case 'h6':
                return `\n\n###### ${childText}\n\n`;

            case 'p':
                return `\n\n${childText}\n\n`;

            case 'br':
                return '\n';

            case 'strong':
            case 'b':
                return `**${childText}**`;

            case 'em':
            case 'i':
                return `*${childText}*`;

            case 'code':
                return `\`${childText}\``;

            case 'pre':
                return `\n\n\`\`\`\n${childText}\n\`\`\`\n\n`;

            case 'ul':
            case 'ol':
                return `\n\n${childText}\n\n`;

            case 'li':
                return `• ${childText}\n`;

            case 'blockquote':
                return `\n\n> ${childText}\n\n`;

            case 'a':
                const href = node.getAttribute('href');
                if (href && href !== childText) {
                    return `[${childText}](${href})`;
                }
                return childText;

            case 'div':
            case 'span':
                return childText;

            default:
                return childText;
        }
    }
}

export default MarkdownConverter; 