import Logger from '../utils/Logger.js';

export class HttpError extends Error {
    constructor(message, statusCode, response) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.response = response;
    }
}

export class HttpService {
    constructor(loggingService) {
        if (loggingService) {
            this.loggingService = loggingService;
        } else {
            // If no loggingService is provided, create a new Logger instance.
            if (typeof Logger !== 'undefined') {
                this.loggingService = new Logger();
                this.loggingService.info('HttpService: No logger provided, created a new Logger instance.');
            } else {
                // Fallback to console if Logger is somehow undefined (should not happen with correct import)
                this.loggingService = {
                    debug: (...args) => console.debug('HttpService (fallback):', ...args),
                    info: (...args) => console.info('HttpService (fallback):', ...args),
                    warn: (...args) => console.warn('HttpService (fallback):', ...args),
                    error: (...args) => console.error('HttpService (fallback):', ...args),
                };
                console.warn('HttpService: Logger class was not available, falling back to console. Check import path.');
            }
        }
    }

    /**
     * Make an HTTP request with progressive fallbacks
     * First tries fetch API, then XMLHttpRequest, then fallbacks for older browsers
     */
    async makeRequest(method, url, data = null, headers = {}) {
        const browserHeaders = this.getRandomizedBrowserHeaders(headers);

        // Try using the modern Fetch API first
        if (typeof fetch === 'function') {
            try {
                this.loggingService.debug('Using Fetch API for request', { method, url });
                return await this.makeFetchRequest(method, url, data, browserHeaders);
            } catch (error) {
                this.loggingService.error('Fetch request failed, falling back to XMLHttpRequest', error);
            }
        }

        // Fall back to XMLHttpRequest
        if (typeof XMLHttpRequest === 'function') {
            try {
                this.loggingService.debug('Using XMLHttpRequest for request', { method, url });
                return await this.makeXHRRequest(method, url, data, browserHeaders);
            } catch (error) {
                this.loggingService.error('XMLHttpRequest failed, falling back to legacy methods', error);
            }
        }

        // Last resort for very old environments: JSONP for GET requests
        if (method.toUpperCase() === 'GET') {
            try {
                this.loggingService.debug('Using JSONP fallback for GET request', { url });
                return await this.makeJSONPRequest(url);
            } catch (error) {
                this.loggingService.error('JSONP request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        // For POST without XMLHttpRequest, try iframe approach
        if (method.toUpperCase() === 'POST' && typeof document !== 'undefined') {
            try {
                this.loggingService.debug('Using iframe fallback for POST request', { url });
                return await this.makeIframePostRequest(url, data);
            } catch (error) {
                this.loggingService.error('Iframe POST request failed', error);
                throw new HttpError('All request methods failed', 0, error);
            }
        }

        throw new HttpError('No suitable request method available', 0);
    }

    getRandomizedBrowserHeaders(customHeaders = {}) {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        const acceptLanguages = [
            'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'tr,tr-TR;q=0.9,en;q=0.8',
            'en-US,en;q=0.9,tr;q=0.8',
            'tr;q=0.9,en-US;q=0.8,en;q=0.7'
        ];

        const chromeVersions = ['110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'];
        const randomChromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];

        const browserHeaders = {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
            'Cache-Control': Math.random() > 0.5 ? 'no-cache' : 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${randomChromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': Math.random() > 0.7 ? '"Windows"' : (Math.random() > 0.5 ? '"macOS"' : '"Linux"')
        };

        const headersToRandomlyOmit = ['Cache-Control', 'Pragma', 'Sec-Fetch-User'];
        headersToRandomlyOmit.forEach(header => {
            if (Math.random() > 0.7) {
                delete browserHeaders[header];
            }
        });

        if (Math.random() > 0.5) {
            browserHeaders['Accept-Encoding'] = 'gzip, deflate, br';
        }

        return { ...browserHeaders, ...customHeaders };
    }

    async makeFetchRequest(method, url, data = null, headers = {}) {
        const options = {
            method: method.toUpperCase(),
            headers: {
                'x-requested-with': 'XMLHttpRequest',
                ...headers
            },
            credentials: 'same-origin',
        };

        if (method.toUpperCase() === 'POST') {
            if (options.headers) {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                options.headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                };
            }
        }

        if (data && method.toUpperCase() === 'POST') {
            options.body = data;
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const responseBody = await response.text(); // Attempt to get more details
            throw new HttpError(
                `Request failed with status: ${response.status} ${response.statusText}. Response: ${responseBody}`,
                response.status,
                responseBody // Include response body in error
            );
        }
        return await response.text();
    }

    makeXHRRequest(method, url, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            this.setupXHR(xhr, method, url, headers);
            this.handleReadyState(xhr, resolve, reject);

            xhr.onerror = () => reject(new HttpError('Network error occurred', 0, xhr));
            xhr.ontimeout = () => reject(new HttpError('Request timed out', 0, xhr));
            xhr.timeout = 30000;

            try {
                xhr.send(data);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                reject(new HttpError(`Error sending request: ${errorMessage}`, 0, error));
            }
        });
    }

    setupXHR(xhr, method, url, headers = {}) {
        xhr.open(method, url, true);
        xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');

        if (method.toUpperCase() === 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        if (headers) {
            for (const header in headers) {
                if (Object.prototype.hasOwnProperty.call(headers, header)) {
                    xhr.setRequestHeader(header, headers[header]);
                }
            }
        }
    }

    handleReadyState(xhr, resolve, reject) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new HttpError(`Request failed: ${xhr.statusText || 'Unknown Error'}`, xhr.status, xhr.responseText));
                }
            }
        };
    }

    makeJSONPRequest(url) {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                this.loggingService.warn('Document not available for JSONP request, rejecting.');
                reject(new HttpError('Document not available for JSONP request', 0));
                return;
            }

            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const jsonpUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
            const script = document.createElement('script');
            script.src = jsonpUrl;

            window[callbackName] = (responseData) => { // Renamed 'data' to 'responseData' to avoid conflict
                try {
                    if (script.parentNode === document.body) document.body.removeChild(script);
                } catch (e) {
                    this.loggingService.debug('Error removing JSONP script (already removed or body unavailable)', e);
                }
                delete window[callbackName];
                resolve(typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
            };

            script.onerror = () => {
                 try {
                    if (script.parentNode === document.body) document.body.removeChild(script);
                } catch (e) {
                     this.loggingService.debug('Error removing JSONP script on error (already removed or body unavailable)', e);
                }
                delete window[callbackName];
                reject(new HttpError('JSONP request failed', 0));
            };
            
            try {
                document.body.appendChild(script);
            } catch (error) {
                 delete window[callbackName]; // Clean up global callback
                 reject(new HttpError('Failed to append JSONP script to document', 0, error));
                 return;
            }


            setTimeout(() => {
                if (window[callbackName]) { // Check if callback still exists
                    try {
                        if (script.parentNode === document.body) document.body.removeChild(script);
                    } catch (e) {
                        this.loggingService.debug('Error removing JSONP script on timeout (already removed or body unavailable)', e);
                    }
                    delete window[callbackName];
                    reject(new HttpError('JSONP request timed out', 0));
                }
            }, 30000);
        });
    }

    makeIframePostRequest(url, data) {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                this.loggingService.warn('Document not available for iframe request, rejecting.');
                reject(new HttpError('Document not available for iframe request', 0));
                return;
            }

            const iframeName = 'iframe_post_' + Math.round(100000 * Math.random());
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = iframeName;

            if (data) {
                const params = new URLSearchParams(data);
                params.forEach((value, key) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                });
            }
            
            const cleanup = () => {
                try {
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    if (form.parentNode) form.parentNode.removeChild(form);
                } catch(e) {
                    this.loggingService.debug('Error during iframe/form cleanup', e);
                }
            };

            iframe.onload = () => { // Use arrow function to preserve 'this' context if needed, though not strictly here.
                try {
                    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDocument) {
                        const response = iframeDocument.body.innerHTML;
                        cleanup();
                        resolve(response);
                    } else {
                        this.loggingService.warn('Iframe content not accessible, assuming success for POST.');
                        cleanup();
                        resolve('{"success":true}'); 
                    }
                } catch (error) {
                    this.loggingService.warn('Error accessing iframe content (likely same-origin), assuming success for POST.', error);
                    cleanup();
                    resolve('{"success":true}'); 
                }
            };

            iframe.onerror = () => {
                cleanup();
                reject(new HttpError('Iframe request failed', 0));
            };
            
            try {
                document.body.appendChild(iframe);
                document.body.appendChild(form);
                form.submit();
            } catch (error) {
                 cleanup(); // Ensure cleanup on error during setup
                 reject(new HttpError('Failed to setup iframe request', 0, error));
                 return;
            }

            setTimeout(() => {
                // Check if iframe is still part of the DOM before attempting removal
                if (iframe.parentNode) { 
                    cleanup();
                    reject(new HttpError('Iframe request timed out', 0));
                }
            }, 30000);
        });
    }

    async get(url, headers = {}) {
        return this.makeRequest('GET', url, null, headers);
    }

    async post(url, data = '', headers = {}) {
        return this.makeRequest('POST', url, data, headers);
    }

    async put(url, data = '', headers = {}) {
        return this.makeRequest('PUT', url, data, headers);
    }

    async delete(url, headers = {}) {
        return this.makeRequest('DELETE', url, null, headers);
    }

    async patch(url, data = '', headers = {}) {
        return this.makeRequest('PATCH', url, data, headers);
    }

    static checkBrowserSupport() {
        return {
            fetch: typeof fetch === 'function',
            xhr: typeof XMLHttpRequest === 'function',
            jsonp: typeof document !== 'undefined' 
        };
    }
} 