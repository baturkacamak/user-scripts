/**
 * GMFunctions - Provides fallback implementations for Greasemonkey/Tampermonkey functions
 * Ensures compatibility across different userscript managers and direct browser execution
 */
class GMFunctions {
    /**
     * Check if we're running in development mode (outside a userscript manager)
     * @return {boolean} True if in development environment
     */
    static isDevelopmentMode() {
        // In production, GM_info should be defined by the userscript manager
        return 'undefined' === typeof GM_info;
    }

    /**
     * Initialize fallbacks for missing GM functions
     * @return {Object} Object containing references to all GM functions (either native or polyfilled)
     */
    static initialize() {
        const isDevMode = this.isDevelopmentMode();
        if (isDevMode) {
            // Create fallbacks for common GM functions
            this.setupAddStyle();
            this.setupXmlHttpRequest();
            this.setupSetClipboard();
            this.setupDownload();
            this.setupGetValue();
            this.setupSetValue();
        }

        // Return references to all functions (either native or polyfilled)
        return {
            GM_addStyle: window.GM_addStyle,
            GM_xmlhttpRequest: window.GM_xmlhttpRequest,
            GM_setClipboard: window.GM_setClipboard,
            GM_download: window.GM_download,
            GM_getValue: window.GM_getValue,
            GM_setValue: window.GM_setValue,
        };
    }

    /**
     * Set up GM_addStyle fallback
     */
    static setupAddStyle() {
        window.GM_addStyle = function (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            return style;
        };
    }

    /**
     * Set up GM_xmlhttpRequest fallback
     */
    static setupXmlHttpRequest() {
        window.GM_xmlhttpRequest = function (details) {
            const xhr = new XMLHttpRequest();
            xhr.open(details.method, details.url);

            if (details.headers) {
                Object.keys(details.headers).forEach((key) => {
                    xhr.setRequestHeader(key, details.headers[key]);
                });
            }

            xhr.onload = function () {
                if (details.onload) {
                    details.onload({
                        responseText: xhr.responseText,
                        response: xhr.response,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        readyState: xhr.readyState,
                    });
                }
            };

            xhr.onerror = function () {
                if (details.onerror) {
                    details.onerror(xhr);
                }
            };

            xhr.send(details.data);
            return xhr;
        };
    }

    /**
     * Set up GM_setClipboard fallback
     */
    static setupSetClipboard() {
        window.GM_setClipboard = function (text) {
            // Create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = text;

            // Make the textarea not visible
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';

            document.body.appendChild(textarea);
            textarea.select();

            // Try to copy the text
            let success = false;
            try {
                success = document.execCommand('copy');
                console.log('Clipboard copy ' + (success ? 'successful' : 'unsuccessful'));
            } catch (err) {
                console.error('Error copying to clipboard:', err);
            }

            // Clean up
            document.body.removeChild(textarea);
            return success;
        };
    }

    /**
     * Set up GM_download fallback
     */
    static setupDownload() {
        window.GM_download = function (options) {
            try {
                const {url, name, onload, onerror} = options;

                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = name || 'download';
                downloadLink.style.display = 'none';

                // Add to document, click, and remove
                document.body.appendChild(downloadLink);
                downloadLink.click();

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(downloadLink);
                    if (onload) onload();
                }, 100);

                return true;
            } catch (err) {
                console.error('Error downloading file:', err);
                if (options.onerror) options.onerror(err);
                return false;
            }
        };
    }

    /**
     * Set up GM_getValue fallback using localStorage
     */
    static setupGetValue() {
        window.GM_getValue = function (key, defaultValue) {
            try {
                const value = localStorage.getItem(`GM_${key}`);
                if (null === value) return defaultValue;

                // Try to parse JSON
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return value;
                }
            } catch (e) {
                console.error('Error in GM_getValue:', e);
                return defaultValue;
            }
        };
    }

    /**
     * Set up GM_setValue fallback using localStorage
     */
    static setupSetValue() {
        window.GM_setValue = function (key, value) {
            try {
                // Convert non-string values to JSON
                const valueToStore = 'string' === typeof value ? value : JSON.stringify(value);
                localStorage.setItem(`GM_${key}`, valueToStore);
                return true;
            } catch (e) {
                console.error('Error in GM_setValue:', e);
                return false;
            }
        };
    }
}

export default GMFunctions;
