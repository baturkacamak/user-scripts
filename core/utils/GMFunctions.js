/**
 * GMFunctions - Provides fallback implementations for Greasemonkey/Tampermonkey functions
 * Ensures compatibility across different userscript managers and direct browser execution
 */
import Logger from './Logger.js';

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

        Logger.debug('GMFunctions initializing', isDevMode ? 'in development mode' : 'in production mode');

        if (isDevMode) {
            // Create fallbacks for common GM functions
            this.setupAddStyle();
            this.setupXmlHttpRequest();
            this.setupSetClipboard();
            this.setupDownload();
            this.setupGetValue();
            this.setupSetValue();

            Logger.info('GM function fallbacks have been created for development mode');
        } else {
            Logger.debug('Using native userscript manager GM functions');
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
            Logger.debug('GM_addStyle fallback executing', css.substring(0, 50) + '...');
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
            Logger.debug('GM_xmlhttpRequest fallback executing', {
                method: details.method,
                url: details.url
            });

            const xhr = new XMLHttpRequest();
            xhr.open(details.method, details.url);

            if (details.headers) {
                Object.keys(details.headers).forEach((key) => {
                    xhr.setRequestHeader(key, details.headers[key]);
                });
            }

            xhr.onload = function () {
                if (details.onload) {
                    const response = {
                        responseText: xhr.responseText,
                        response: xhr.response,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        readyState: xhr.readyState,
                    };

                    Logger.debug('GM_xmlhttpRequest completed', {
                        status: xhr.status,
                        url: details.url
                    });

                    details.onload(response);
                }
            };

            xhr.onerror = function () {
                Logger.error('GM_xmlhttpRequest error', {
                    url: details.url,
                    status: xhr.status
                });

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
            Logger.debug('GM_setClipboard fallback executing', {
                textLength: text.length
            });

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
                Logger.info('Clipboard copy ' + (success ? 'successful' : 'unsuccessful'));
            } catch (err) {
                Logger.error(err, 'Error copying to clipboard');
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

                Logger.debug('GM_download fallback executing', {
                    url: url.substring(0, 100),
                    filename: name
                });

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
                    if (onload) {
                        Logger.debug('GM_download completed successfully');
                        onload();
                    }
                }, 100);

                return true;
            } catch (err) {
                Logger.error(err, 'Error downloading file');
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
                const storageKey = `GM_${key}`;
                Logger.debug('GM_getValue fallback executing', {key: storageKey});

                const value = localStorage.getItem(storageKey);
                if (null === value) {
                    Logger.debug('GM_getValue: No value found, using default', {
                        key,
                        defaultValue
                    });
                    return defaultValue;
                }

                // Try to parse JSON
                try {
                    const parsedValue = JSON.parse(value);
                    Logger.debug('GM_getValue: Retrieved and parsed JSON value', {key});
                    return parsedValue;
                } catch (e) {
                    Logger.debug('GM_getValue: Retrieved non-JSON value', {key, value});
                    return value;
                }
            } catch (e) {
                Logger.error(e, 'Error in GM_getValue fallback');
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
                const storageKey = `GM_${key}`;
                Logger.debug('GM_setValue fallback executing', {
                    key: storageKey,
                    valueType: typeof value
                });

                // Convert non-string values to JSON
                const valueToStore = 'string' === typeof value ? value : JSON.stringify(value);
                localStorage.setItem(storageKey, valueToStore);
                Logger.debug('GM_setValue: Value stored successfully', {key: storageKey});
                return true;
            } catch (e) {
                Logger.error(e, 'Error in GM_setValue fallback');
                return false;
            }
        };
    }
}

export default GMFunctions;