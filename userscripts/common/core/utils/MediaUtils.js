/**
 * MediaUtils - Utility functions for handling media operations
 * Provides reusable functions for filename generation, media type detection, etc.
 */
import Logger from './Logger.js';

class MediaUtils {
    /**
     * Generate a filename for a media element
     * @param {Object} options - Configuration options
     * @param {HTMLMediaElement} [options.element] - Media element to generate filename from
     * @param {string} [options.url] - URL to derive filename from
     * @param {string} [options.prefix='media'] - Filename prefix
     * @param {string} [options.extension] - Force specific extension
     * @param {string} [options.timestamp=true] - Include timestamp
     * @param {string} [options.format] - Custom format string
     * @return {string} The generated filename
     */
    static generateFilename(options = {}) {
        Logger.debug('MediaUtils: Generating filename', options);

        const {
            element,
            url = element?.src || '',
            prefix = this.detectMediaType(element, url),
            extension,
            timestamp = true,
            format
        } = options;

        // Generate timestamp component if needed
        const timestampStr = timestamp
            ? `_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}`
            : '';

        // Detect extension from element or URL if not specified
        const fileExtension = extension || this.detectExtension(element, url);

        Logger.debug('MediaUtils: Filename components', {
            prefix,
            timestampStr,
            fileExtension,
            format: format || 'default'
        });

        // Format can be a custom string with placeholders: {prefix}, {timestamp}, {extension}
        if (format) {
            const filename = format
                .replace('{prefix}', prefix)
                .replace('{timestamp}', timestampStr)
                .replace('{extension}', fileExtension);

            Logger.debug('MediaUtils: Generated filename with custom format', {format, filename});
            return filename;
        }

        // Default format
        const filename = `${prefix}${timestampStr}.${fileExtension}`;
        Logger.debug('MediaUtils: Generated filename with default format', {filename});
        return filename;
    }

    /**
     * Detect media type (video, audio, image)
     * @param {HTMLMediaElement} [element] - Media element
     * @param {string} [url] - URL to analyze
     * @return {string} Media type prefix
     */
    static detectMediaType(element, url = '') {
        Logger.debug('MediaUtils: Detecting media type', {
            elementType: element ? element.constructor.name : 'none',
            url: url.substring(0, 50) + (url.length > 50 ? '...' : '')
        });

        // Check element type first
        if (element instanceof HTMLVideoElement) {
            Logger.debug('MediaUtils: Detected video element');
            return 'video';
        }
        if (element instanceof HTMLAudioElement) {
            Logger.debug('MediaUtils: Detected audio element');
            return 'audio';
        }
        if (element instanceof HTMLImageElement) {
            Logger.debug('MediaUtils: Detected image element');
            return 'image';
        }

        // Try to detect from URL
        if (url.match(/\.(mp4|webm|mov|avi|mkv)/i)) {
            Logger.debug('MediaUtils: Detected video URL pattern');
            return 'video';
        }
        if (url.match(/\.(mp3|wav|ogg|m4a|aac)/i)) {
            Logger.debug('MediaUtils: Detected audio URL pattern');
            return 'audio';
        }
        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
            Logger.debug('MediaUtils: Detected image URL pattern');
            return 'image';
        }

        Logger.debug('MediaUtils: Could not determine specific media type, using default');
        return 'media';
    }

    /**
     * Detect appropriate file extension
     * @param {HTMLMediaElement} [element] - Media element
     * @param {string} [url] - URL to analyze
     * @return {string} File extension
     */
    static detectExtension(element, url = '') {
        Logger.debug('MediaUtils: Detecting file extension', {
            hasElement: !!element,
            url: url.substring(0, 50) + (url.length > 50 ? '...' : '')
        });

        // Try to get from MIME type first (more reliable)
        if (element) {
            const mimeType = element.getAttribute('type') || '';
            Logger.debug('MediaUtils: Element MIME type', {mimeType});

            if (mimeType.includes('mp4') || mimeType.includes('mpeg')) {
                Logger.debug('MediaUtils: Detected MP4 from MIME type');
                return 'mp4';
            }
            if (mimeType.includes('webm')) {
                Logger.debug('MediaUtils: Detected WebM from MIME type');
                return 'webm';
            }
            if (mimeType.includes('ogg')) {
                Logger.debug('MediaUtils: Detected Ogg from MIME type');
                return 'ogg';
            }
            // ...add other mime type mappings as needed
        }

        // Try to extract from URL
        const extMatch = url.match(/\.([a-z0-9]{2,5})($|\?)/i);
        if (extMatch && extMatch[1]) {
            const extension = extMatch[1].toLowerCase();
            Logger.debug('MediaUtils: Extracted extension from URL', {extension});
            return extension;
        }

        // Fallbacks based on element type
        if (element instanceof HTMLVideoElement) {
            Logger.debug('MediaUtils: Using default video extension');
            return 'mp4';
        }
        if (element instanceof HTMLAudioElement) {
            Logger.debug('MediaUtils: Using default audio extension');
            return 'mp3';
        }
        if (element instanceof HTMLImageElement) {
            Logger.debug('MediaUtils: Using default image extension');
            return 'jpg';
        }

        Logger.debug('MediaUtils: Could not determine extension, using default mp4');
        return 'mp4'; // Default fallback
    }

    /**
     * Get a readable file size string
     * @param {number} bytes - Size in bytes
     * @param {number} [decimals=2] - Decimal places
     * @return {string} Formatted size string
     */
    static formatFileSize(bytes, decimals = 2) {
        Logger.debug('MediaUtils: Formatting file size', {bytes, decimals});

        if (0 === bytes) {
            Logger.debug('MediaUtils: Zero bytes');
            return '0 Bytes';
        }

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
        Logger.debug('MediaUtils: Formatted file size', {formattedSize});
        return formattedSize;
    }

    /**
     * Check if a URL is a valid media URL
     * @param {string} url - URL to check
     * @return {boolean} True if URL appears to be valid media
     */
    static isValidMediaUrl(url) {
        if (!url || typeof url !== 'string') {
            Logger.debug('MediaUtils: Invalid URL (empty or not string)');
            return false;
        }

        try {
            // First check if it's a valid URL
            new URL(url);

            // Check if it's a blob URL (which is valid for media)
            if (url.startsWith('blob:')) {
                Logger.debug('MediaUtils: Valid blob URL');
                return true;
            }

            // Check if it has a valid media extension
            const hasMediaExtension = /\.(mp4|webm|mov|avi|mkv|mp3|wav|ogg|m4a|aac|jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(url);

            if (hasMediaExtension) {
                Logger.debug('MediaUtils: URL has valid media extension');
                return true;
            }

            // If no extension, check if from a known media domain
            const mediaHostPatterns = [
                /\.cdninstagram\.com$/i,
                /\.fbcdn\.net$/i,
                /\.ytimg\.com$/i,
                /\.twimg\.com$/i,
                /\.vimeocdn\.com$/i,
                /cloudfront\.net$/i,
                /\.githubusercontent\.com$/i
            ];

            const urlObj = new URL(url);
            const isKnownMediaDomain = mediaHostPatterns.some(pattern => pattern.test(urlObj.hostname));

            Logger.debug('MediaUtils: URL domain check', {
                domain: urlObj.hostname,
                isKnownMediaDomain
            });

            return isKnownMediaDomain;
        } catch (error) {
            Logger.error(error, 'MediaUtils: Error validating media URL');
            return false;
        }
    }

    /**
     * Extract media info from a source
     * @param {HTMLMediaElement|string} source - Media element or URL
     * @return {Object} Media information object
     */
    static getMediaInfo(source) {
        Logger.debug('MediaUtils: Getting media info', {
            sourceType: typeof source,
            isElement: source instanceof HTMLElement
        });

        const result = {
            type: null,
            extension: null,
            url: null,
            width: null,
            height: null,
            duration: null,
            isBlob: false,
            mimeType: null
        };

        try {
            // Handle media element
            if (source instanceof HTMLMediaElement) {
                result.type = this.detectMediaType(source);
                result.extension = this.detectExtension(source);
                result.url = source.src || null;
                result.isBlob = result.url?.startsWith('blob:') || false;

                if (source instanceof HTMLVideoElement) {
                    result.width = source.videoWidth || null;
                    result.height = source.videoHeight || null;
                    result.duration = isNaN(source.duration) ? null : source.duration;
                } else if (source instanceof HTMLImageElement) {
                    result.width = source.naturalWidth || null;
                    result.height = source.naturalHeight || null;
                }

                // Try to get MIME type
                result.mimeType = source.getAttribute('type') || null;
            }
            // Handle URL string
            else if (typeof source === 'string') {
                result.url = source;
                result.type = this.detectMediaType(null, source);
                result.extension = this.detectExtension(null, source);
                result.isBlob = source.startsWith('blob:');
            }

            Logger.debug('MediaUtils: Media info results', result);
            return result;
        } catch (error) {
            Logger.error(error, 'MediaUtils: Error getting media info');
            return result;
        }
    }

    static detectMediaTypeFromUrl(url) {
        if (!url) return null;
        try {
            const path = new URL(url).pathname.toLowerCase();
            if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm')) {
                return 'video';
            }
            if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') ||
                path.endsWith('.webp') || path.endsWith('.gif')) {
                return 'image';
            }
        } catch (e) {
            Logger.warn('Could not parse URL to detect media type:', url);
        }
        return null;
    }

    static getHighestResSrcFromSrcset(srcset) {
        if (!srcset) return null;

        try {
            const sources = srcset.split(',').map(s => s.trim().split(' '));
            let bestUrl = null;
            let maxWidth = 0;

            sources.forEach(([sourceUrl, width]) => {
                const w = parseInt(width?.replace('w', ''), 10);
                if (w > maxWidth) {
                    maxWidth = w;
                    bestUrl = sourceUrl;
                } else if (!width && !maxWidth) {
                    bestUrl = sourceUrl;
                }
            });

            return bestUrl;
        } catch (error) {
            Logger.warn('Error parsing srcset:', error);
            return null;
        }
    }

    static async probeMediaType(url) {
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
            return 'unknown';
        }

        try {
            const response = await fetch(url, {method: 'HEAD', mode: 'cors'});

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType) {
                    if (contentType.startsWith('video/')) return 'video';
                    if (contentType.startsWith('image/')) return 'image';
                    if (contentType.startsWith('audio/')) return 'audio';
                    return contentType;
                }
            }
        } catch (error) {
            Logger.error(error, `Error probing media type for ${url}`);
        }

        return 'unknown';
    }

    static findMediaUrlsInText(text, options = {}) {
        if (!text) return [];

        const {videoOnly = false, imageOnly = false} = options;
        const urls = new Set();

        // Generic video URL pattern
        if (!imageOnly) {
            const videoPattern = /https?:(\\\/|\/)[^\s"'<>]+(\\\/|\/)[^\s"'<>]+\.(mp4|webm|mov)(\?[^\s"'<>]+)?/gi;
            let match;
            while (match = videoPattern.exec(text)) {
                if (match[0]) {
                    const cleanUrl = match[0].replace(/\\\//g, '/');
                    urls.add(cleanUrl);
                }
            }
        }

        // Generic image URL pattern
        if (!videoOnly) {
            const imagePattern = /https?:(\\\/|\/)[^\s"'<>]+(\\\/|\/)[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)(\?[^\s"'<>]+)?/gi;
            let match;
            while (match = imagePattern.exec(text)) {
                if (match[0]) {
                    const cleanUrl = match[0].replace(/\\\//g, '/');
                    urls.add(cleanUrl);
                }
            }
        }

        return Array.from(urls);
    }
}

export default MediaUtils;