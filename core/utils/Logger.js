/**
 * Logger - A utility for consistent logging
 * Provides debug, log, error, and toggling capabilities
 */
class Logger {
    static DEBUG = true;
    static PREFIX = "Userscript";

    /**
     * Sets the prefix used in log messages
     * @param {string} prefix - The prefix to use
     */
    static setPrefix(prefix) {
        this.PREFIX = prefix;
    }

    /**
     * Log a debug message (only when debug mode is enabled)
     * @param {...any} args - Arguments to log
     */
    static log(...args) {
        if (this.DEBUG) {
            console.log(`${this.PREFIX} Debug:`, ...args);
        }
    }

    /**
     * Log an error message with context
     * @param {Error} error - The error object
     * @param {string} context - Context description where the error occurred
     */
    static error(error, context) {
        console.error(`${this.PREFIX} Error (${context}):`, error);
    }

    /**
     * Log HTML content with a title
     * @param {string} title - Title describing the content
     * @param {string} htmlContent - The HTML content to log
     */
    static logHtml(title, htmlContent) {
        if (this.DEBUG) {
            console.log(`${this.PREFIX} [${title}]:`);
            console.log(htmlContent.substring(0, 1500) + "...");

            // Show HTML in expandable format for easier inspection
            console.groupCollapsed(`HTML Details (${title})`);
            console.log("Complete HTML:", htmlContent);
            console.groupEnd();
        }
    }

    /**
     * Toggle debug mode on/off
     * @returns {boolean} The new debug state
     */
    static toggleDebug() {
        this.DEBUG = !this.DEBUG;
        console.log(`${this.PREFIX}: Debug mode ${this.DEBUG ? 'enabled' : 'disabled'}`);
        return this.DEBUG;
    }
}

export default Logger;