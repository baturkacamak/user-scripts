/**
 * InfoBox - A reusable UI component for informational callout boxes
 * Provides consistent styling for info, warning, and notice boxes
 */
import StyleManager from '../utils/StyleManager.js';

class InfoBox {
    static BASE_INFOBOX_CLASS = 'userscript-infobox';
    static VARIANTS = {
        info: 'info',
        warning: 'warning',
        success: 'success',
        error: 'error',
        default: 'default'
    };

    /**
     * Initialize default styles for InfoBox components
     */
    static initStyles(options = {}) {
        const { scopeSelector = '' } = options;
        const styleId = `infobox-component${scopeSelector ? '-' + scopeSelector.replace(/[^a-zA-Z0-9]/g, '') : ''}`;

        if (StyleManager.hasStyles(styleId)) {
            return;
        }

        const selectorPrefix = scopeSelector ? `${scopeSelector} ` : '';

        const styles = `
            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS} {
                font-size: 11px;
                color: #666;
                margin-bottom: 12px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 4px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.5;
            }

            /* Variants */
            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS}--info {
                background: #e3f2fd;
                color: #1565c0;
                border-left: 3px solid #2196f3;
            }

            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS}--warning {
                background: #fff3e0;
                color: #e65100;
                border-left: 3px solid #ff9800;
            }

            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS}--success {
                background: #e8f5e9;
                color: #2e7d32;
                border-left: 3px solid #4caf50;
            }

            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS}--error {
                background: #ffebee;
                color: #c62828;
                border-left: 3px solid #f44336;
            }

            ${selectorPrefix}.${InfoBox.BASE_INFOBOX_CLASS}--default {
                background: #f5f5f5;
                color: #666;
            }
        `;

        StyleManager.addStyles(styles, styleId);
    }

    /**
     * Create an InfoBox element
     * @param {Object} options - Configuration options
     * @param {string|HTMLElement} options.content - Text content or HTML element(s) to display
     * @param {string} [options.variant='default'] - Variant (info, warning, success, error, default)
     * @param {HTMLElement} [options.container] - Container to append the InfoBox to
     * @param {string} [options.className] - Additional CSS class
     * @param {string} [options.scopeSelector] - Scope selector for styles
     * @param {boolean} [options.html=false] - Whether to interpret content as HTML (use with caution)
     * @return {HTMLElement} The created InfoBox element
     */
    static create(options = {}) {
        const {
            content = '',
            variant = 'default',
            container = null,
            className = '',
            scopeSelector = '',
            html = false
        } = options;

        // Initialize styles
        InfoBox.initStyles({ scopeSelector });

        // Create the InfoBox element
        const infoBox = document.createElement('div');
        infoBox.className = `${InfoBox.BASE_INFOBOX_CLASS} ${InfoBox.BASE_INFOBOX_CLASS}--${variant} ${className}`.trim();

        // Set content
        if (html && typeof content === 'string') {
            // Use innerHTML only if explicitly requested (security risk, but sometimes needed)
            infoBox.innerHTML = content;
        } else if (typeof content === 'string') {
            // Safe text content - split by newlines and create elements
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.trim()) {
                    infoBox.appendChild(document.createTextNode(line));
                }
                if (index < lines.length - 1) {
                    infoBox.appendChild(document.createElement('br'));
                }
            });
        } else if (content instanceof HTMLElement) {
            // Append element directly
            infoBox.appendChild(content);
        } else if (Array.isArray(content)) {
            // Append multiple elements
            content.forEach(item => {
                if (item instanceof HTMLElement) {
                    infoBox.appendChild(item);
                } else if (typeof item === 'string') {
                    infoBox.appendChild(document.createTextNode(item));
                }
            });
        }

        // Append to container if provided
        if (container) {
            container.appendChild(infoBox);
        }

        return infoBox;
    }

    /**
     * Convenience method to create an info variant InfoBox
     * @param {string|HTMLElement} content - Content to display
     * @param {Object} [options] - Additional options
     * @return {HTMLElement} The created InfoBox element
     */
    static info(content, options = {}) {
        return InfoBox.create({ ...options, content, variant: 'info' });
    }

    /**
     * Convenience method to create a warning variant InfoBox
     * @param {string|HTMLElement} content - Content to display
     * @param {Object} [options] - Additional options
     * @return {HTMLElement} The created InfoBox element
     */
    static warning(content, options = {}) {
        return InfoBox.create({ ...options, content, variant: 'warning' });
    }

    /**
     * Convenience method to create a success variant InfoBox
     * @param {string|HTMLElement} content - Content to display
     * @param {Object} [options] - Additional options
     * @return {HTMLElement} The created InfoBox element
     */
    static success(content, options = {}) {
        return InfoBox.create({ ...options, content, variant: 'success' });
    }

    /**
     * Convenience method to create an error variant InfoBox
     * @param {string|HTMLElement} content - Content to display
     * @param {Object} [options] - Additional options
     * @return {HTMLElement} The created InfoBox element
     */
    static error(content, options = {}) {
        return InfoBox.create({ ...options, content, variant: 'error' });
    }
}

export default InfoBox;

