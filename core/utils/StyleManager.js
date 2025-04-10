/**
 * StyleManager - Utility for CSS style management
 * Handles adding and removing styles, theme variables, etc.
 */
class StyleManager {
    static styleElements = new Map();

    /**
     * Add CSS styles to the document
     * @param {string} css - CSS string to add
     * @param {string} id - Optional ID for the style element
     * @returns {HTMLStyleElement} - The created style element
     */
    static addStyles(css, id = null) {
        const style = document.createElement('style');
        style.textContent = css;

        if (id) {
            style.id = id;
            // Remove any existing style with the same ID
            if (this.styleElements.has(id)) {
                this.removeStyles(id);
            }
            this.styleElements.set(id, style);
        }

        document.head.appendChild(style);
        return style;
    }

    /**
     * Remove styles by ID
     * @param {string} id - ID of the style element to remove
     * @returns {boolean} - True if styles were removed, false otherwise
     */
    static removeStyles(id) {
        if (!this.styleElements.has(id)) return false;

        const styleElement = this.styleElements.get(id);
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }

        this.styleElements.delete(id);
        return true;
    }

    /**
     * Apply CSS variables for theming
     * @param {Object} variables - Object with variable names and values
     * @param {string} selector - CSS selector to apply variables to (default: :root)
     */
    static applyThemeVariables(variables, selector = ':root') {
        let css = `${selector} {\n`;

        Object.entries(variables).forEach(([name, value]) => {
            // Ensure variable names start with --
            const varName = name.startsWith('--') ? name : `--${name}`;
            css += `  ${varName}: ${value};\n`;
        });

        css += `}\n`;

        this.addStyles(css, 'theme-variables');
    }

    /**
     * Add styles to handle animations
     * @param {Object} animations - Key-value pairs of animation name and keyframes
     */
    static addAnimations(animations) {
        let css = '';

        Object.entries(animations).forEach(([name, keyframes]) => {
            css += `@keyframes ${name} {\n${keyframes}\n}\n\n`;
        });

        this.addStyles(css, 'animations');
    }
}

export default StyleManager;