// Helper functions used throughout the application

import {Logger} from "../../core";
import {STORAGE_KEYS} from './constants';

/**
 * Save data to localStorage with error handling
 * @param {string} key - The storage key
 * @param {*} value - The value to store (will be JSON stringified)
 */
export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        Logger.debug(`Data saved to localStorage: ${key}`);
    } catch (error) {
        Logger.error(error, `Error saving to localStorage: ${key}`);
    }
}

/**
 * Load data from localStorage with error handling
 * @param {string} key - The storage key
 * @param {*} defaultValue - The default value if key doesn't exist or there's an error
 * @returns {*} The parsed data or the default value
 */
export function loadFromLocalStorage(key, defaultValue) {
    try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        Logger.error(error, `Error loading from localStorage: ${key}`);
    }
    return defaultValue;
}

/**
 * Save panel state to localStorage
 * @param {string} key - Specific panel state key
 * @param {*} value - Value to save
 */
export function savePanelState(key, value) {
    try {
        // Get existing states or create new object
        let states = loadFromLocalStorage(STORAGE_KEYS.PANEL_STATES, {});

        // Update specific state
        states[key] = value;

        // Save back to localStorage
        saveToLocalStorage(STORAGE_KEYS.PANEL_STATES, states);
        Logger.debug(`Panel state saved: ${key} = ${value}`);
    } catch (error) {
        Logger.error(error, "Saving panel state");
    }
}

/**
 * Load a specific panel state from localStorage
 * @param {string} key - Specific panel state key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The state value or default
 */
export function loadPanelState(key, defaultValue) {
    try {
        const states = loadFromLocalStorage(STORAGE_KEYS.PANEL_STATES, {});
        return key in states ? states[key] : defaultValue;
    } catch (error) {
        Logger.error(error, "Loading panel state");
        return defaultValue;
    }
}

/**
 * Show a success message on a button and revert after delay
 * @param {HTMLElement} button - The button element
 * @param {string} successText - Text to show during success state
 * @param {number} duration - Duration in ms before reverting
 */
export function showButtonSuccess(button, successText, duration = 1500) {
    const originalText = button.textContent;
    button.textContent = successText;
    button.classList.add('copy-success');

    setTimeout(() => {
        button.classList.remove('copy-success');
        button.textContent = originalText;
    }, duration);
}

/**
 * Check if an item should be hidden based on filter terms
 * @param {HTMLElement} element - The DOM element to check
 * @param {Array<string>} filterTerms - Array of terms to filter by
 * @returns {boolean} True if the element should be hidden
 */
export function shouldFilterByTerms(element, filterTerms) {
    if (!filterTerms || filterTerms.length === 0) {
        return false;
    }

    const elementText = element.textContent.toLowerCase();
    return filterTerms.some(term => elementText.includes(term.toLowerCase()));
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Download a file using GM_download with fallback
 * @param {string|Blob} data - The content to download
 * @param {string} filename - The filename to use
 * @param {string} mimeType - The MIME type
 */
export function downloadFile(data, filename, mimeType) {
    try {
        // Convert data to blob for binary formats
        const blob = new Blob([data], {type: mimeType});
        const url = URL.createObjectURL(blob);

        // Use GM_download (our implementation will fall back to the simple method if needed)
        GM_download({
            url: url,
            name: filename,
            saveAs: true,
            onload: () => URL.revokeObjectURL(url),
            onerror: (error) => {
                Logger.error(error, "GM_download");
                // If GM_download fails, try fallback
                fallbackDownload(data, filename, mimeType);
            }
        });
    } catch (error) {
        Logger.error(error, "Downloading file");
        fallbackDownload(data, filename, mimeType);
    }
}

/**
 * Fallback download method using a data URL and click event
 * @param {string|Blob} data - The content to download
 * @param {string} filename - The filename to use
 * @param {string} mimeType - The MIME type
 */
function fallbackDownload(data, filename, mimeType) {
    try {
        const blob = new Blob([data], {type: mimeType});
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';

        document.body.appendChild(downloadLink);
        downloadLink.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        Logger.error(error, "Fallback download");
        alert("Download failed. Please try copying to clipboard instead.");
    }
}

/**
 * Get file extension and MIME type for a format
 * @param {string} formatId - The format identifier
 * @returns {Object} Object with extension and mimeType properties
 */
export function getFileInfo(formatId) {
    const fileInfo = {
        // Text formats
        'plain': {extension: 'txt', mimeType: 'text/plain'},
        'markdown': {extension: 'md', mimeType: 'text/markdown'},
        'html': {extension: 'html', mimeType: 'text/html'},

        // Data formats
        'json': {extension: 'json', mimeType: 'application/json'},
        'csv': {extension: 'csv', mimeType: 'text/csv'},
        'tsv': {extension: 'tsv', mimeType: 'text/tab-separated-values'},
        'xml': {extension: 'xml', mimeType: 'application/xml'},

        // Spreadsheet formats
        'excel-csv': {extension: 'csv', mimeType: 'text/csv'},
        'excel-xml': {extension: 'xml', mimeType: 'application/xml'}
    };

    return fileInfo[formatId] || {extension: 'txt', mimeType: 'text/plain'};
}