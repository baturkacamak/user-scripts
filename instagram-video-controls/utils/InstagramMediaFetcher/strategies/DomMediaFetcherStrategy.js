import {Logger} from "../../../../core";
import MediaFetcherStrategy from "./MediaFetcherStrategy";

/**
 * Strategy for fetching media information from DOM elements
 */
export default class DomMediaFetcherStrategy extends MediaFetcherStrategy {
    CONFIG = {
        SELECTORS: {
            /** Targets the video element */
            videoTag: 'video',
            /** Targets generic image elements */
            imageTag: 'img',
            /** Targets the source element within a story video */
            storyVideoSource: 'video > source[src]',
            /** Targets the image element primarily used in stories */
            storyImage: 'img[decoding="sync"]',
            /** Targets list items in a carousel/slideshow */
            postCarouselItem: 'ul li[style*="translateX"]',
            /** Targets the container for carousel navigation dots */
            postCarouselDotsContainer: 'div._acng',
            /** Targets individual navigation dots within the container */
            postCarouselDot: 'div._acnb'
        },
        DATA_ATTRS: {
            /** dataset.videoSrc */
            videoSrc: 'videoSrc',
            /** dataset.originalSrc */
            originalSrc: 'originalSrc',
            /** dataset.src */
            src: 'src',
            /** Legacy attribute sometimes used */
            legacyVideoUrl: 'videoURL'
        }
    };

    constructor() {
        super();
        this.videoUrlCache = {};  // key: unique identifier, value: fetched CDN URL
    }

    /**
     * Fetch media information from DOM elements
     *
     * @param {HTMLElement} containerNode - The container element
     * @param {number} mediaIdx - The index of the media
     * @param {object} options - Additional options
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchMediaInfo(containerNode, mediaIdx, options = {}) {
        Logger.info('DOM Strategy: Attempting to get URL via DOM elements...', {mediaIdx});

        try {
            let targetNode = containerNode;

            // For carousels, find the specific slide
            const isCarousel = containerNode.tagName === 'ARTICLE' &&
                containerNode.querySelector(this.CONFIG.SELECTORS.postCarouselItem);

            if (isCarousel) {
                Logger.debug('DOM Strategy: Finding specific slide element for carousel...');
                targetNode = this.findCarouselItem(containerNode, mediaIdx);

                if (!targetNode) {
                    Logger.error('DOM Strategy: Could not find target node for carousel media');
                    return null;
                }
            }

            // Find media source based on context
            if (containerNode.tagName === 'SECTION') {
                // Story context
                return this.getStoryMediaFromDom(containerNode);
            } else {
                // Post/Reel context
                return this.getPostMediaFromDom(targetNode, mediaIdx);
            }
        } catch (error) {
            Logger.error(error, 'Error occurred within DOM Media Fetcher Strategy.');
            return null;
        }
    }

    /**
     * Checks if DOM strategy is applicable
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {boolean} True if this strategy can be applied
     */
    isApplicable(containerNode) {
        // DOM strategy can be applied to any container with video or image elements
        const hasVideo = containerNode.querySelector(this.CONFIG.SELECTORS.videoTag);
        const hasImage = containerNode.querySelector(this.CONFIG.SELECTORS.imageTag);

        return !!(hasVideo || hasImage);
    }

    /**
     * Find the specific carousel item at the given index
     *
     * @param {HTMLElement} containerNode - The post container
     * @param {number} mediaIdx - The index to find
     * @returns {HTMLElement|null} The carousel item or null
     */
    findCarouselItem(containerNode, mediaIdx) {
        const listItems = containerNode.querySelectorAll(this.CONFIG.SELECTORS.postCarouselItem);

        if (listItems.length > mediaIdx) {
            const targetNode = listItems[mediaIdx];
            Logger.debug(`DOM Strategy: Selected carousel item at index ${mediaIdx}.`);

            if (targetNode.getAttribute('aria-hidden') === 'true' && listItems.length > 1) {
                Logger.warn(`DOM Strategy: Carousel item at index ${mediaIdx} has aria-hidden=true. Trying visible item.`);
                const visibleItem = Array.from(listItems).find(item => item.getAttribute('aria-hidden') !== 'true');
                if (visibleItem) return visibleItem;
            }

            return targetNode;
        } else if (listItems.length > 0) {
            Logger.warn(`DOM Strategy: Carousel mediaIndex ${mediaIdx} is out of bounds (found ${listItems.length} items). Using first item.`);
            return listItems[0];
        }

        Logger.error('DOM Strategy: Carousel detected, but no list items found');
        return null;
    }

    /**
     * Extract media information from a post node
     *
     * @param {HTMLElement} targetNode - The post or carousel item node
     * @param {number} mediaIdx - The media index
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async getPostMediaFromDom(targetNode, mediaIdx) {
        // Check for video
        const videoElem = targetNode.querySelector(this.CONFIG.SELECTORS.videoTag);
        if (videoElem) {
            Logger.debug('DOM Strategy: Found video element in target node.');

            let url = videoElem.getAttribute('src');
            const poster = videoElem.getAttribute('poster');
            const cacheKey = url && url.startsWith('blob:') ? url : poster;

            if (cacheKey && this.videoUrlCache[cacheKey]) {
                Logger.info('DOM Strategy: Video URL found in cache.');
                return {
                    url: this.videoUrlCache[cacheKey],
                    mediaIndex: mediaIdx,
                    type: 'video'
                };
            }

            // Try data attributes
            const dataAttrUrl = videoElem.dataset[this.CONFIG.DATA_ATTRS.videoSrc];
            if (dataAttrUrl && !dataAttrUrl.startsWith('blob:')) {
                Logger.info('DOM Strategy: Found video URL in data-video-src attribute.');
                if (cacheKey) this.videoUrlCache[cacheKey] = dataAttrUrl;

                return {
                    url: dataAttrUrl,
                    mediaIndex: mediaIdx,
                    type: 'video'
                };
            }

            // Try legacy attribute
            if (videoElem.hasAttribute(this.CONFIG.DATA_ATTRS.legacyVideoUrl)) {
                const legacyUrl = videoElem.getAttribute(this.CONFIG.DATA_ATTRS.legacyVideoUrl);
                Logger.info('DOM Strategy: Found video URL in legacy videoURL attribute.');
                if (cacheKey) this.videoUrlCache[cacheKey] = legacyUrl;

                return {
                    url: legacyUrl,
                    mediaIndex: mediaIdx,
                    type: 'video'
                };
            }

            // If URL is a blob or null, we can't use it directly
            if (!url || url.startsWith('blob:')) {
                Logger.info('DOM Strategy: Video src is blob or null. HtmlFetcherStrategy would be needed.');
                return null;
            }

            return {
                url,
                mediaIndex: mediaIdx,
                type: 'video'
            };
        }

        // Check for image
        const imgElem = targetNode.querySelector(this.CONFIG.SELECTORS.imageTag);
        if (imgElem) {
            Logger.debug('DOM Strategy: Found image element in target node.');

            let url = null;

            if (imgElem.srcset) {
                Logger.debug('DOM Strategy: Image has srcset, attempting to parse.');
                const sources = imgElem.srcset.split(',').map(s => s.trim().split(' '));
                let bestUrl = imgElem.src;
                let maxWidth = 0;

                try {
                    sources.forEach(([sourceUrl, width]) => {
                        const w = parseInt(width?.replace('w', ''), 10);
                        if (w > maxWidth) {
                            maxWidth = w;
                            bestUrl = sourceUrl;
                        } else if (!width && !maxWidth) {
                            bestUrl = sourceUrl;
                        }
                    });

                    url = bestUrl;
                    Logger.debug(`DOM Strategy: Selected image URL from srcset (w=${maxWidth || 'N/A'})`);
                } catch (parseError) {
                    Logger.warn(parseError, 'DOM Strategy: Error parsing srcset, falling back to first entry or src.');
                    url = sources.length > 0 ? sources[0][0] : imgElem.src;
                }
            }

            if (!url) {
                url = imgElem.getAttribute('src');
                Logger.debug('DOM Strategy: Using image src attribute as fallback.');
            }

            return {
                url,
                mediaIndex: mediaIdx,
                type: 'image'
            };
        }

        // Check for data attributes on container
        const dataAttrUrlOnContainer =
            targetNode.dataset[this.CONFIG.DATA_ATTRS.videoSrc] ||
            targetNode.dataset[this.CONFIG.DATA_ATTRS.originalSrc] ||
            targetNode.dataset[this.CONFIG.DATA_ATTRS.src];

        if (dataAttrUrlOnContainer) {
            Logger.debug('DOM Strategy: Found URL in data-* attribute on the container node.');
            const type = this.guessMediaTypeFromUrl(dataAttrUrlOnContainer) || 'unknown';

            return {
                url: dataAttrUrlOnContainer,
                mediaIndex: mediaIdx,
                type
            };
        }

        Logger.warn('DOM Strategy: Could not find video, image, or relevant data attribute in target node.');
        return null;
    }

    /**
     * Extract media information from a story section
     *
     * @param {HTMLElement} sectionNode - The story section node
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async getStoryMediaFromDom(sectionNode) {
        Logger.debug('DOM Strategy: Extracting story media...');
        const mediaIndex = this.findStoryIndex(sectionNode) || 0;

        // Check for video source element
        const videoSourceElem = sectionNode.querySelector(this.CONFIG.SELECTORS.storyVideoSource);
        if (videoSourceElem?.src) {
            Logger.debug('DOM Strategy: Found URL in <source> tag for story.');
            return {
                url: videoSourceElem.src,
                mediaIndex,
                type: 'video'
            };
        }

        // Check for video element
        const videoElem = sectionNode.querySelector(this.CONFIG.SELECTORS.videoTag);
        if (videoElem?.src) {
            Logger.debug('DOM Strategy: Found URL in <video> src attribute for story.');
            if (videoElem.src.startsWith('blob:')) {
                Logger.warn('DOM Strategy: Found blob URL for story video. HtmlFetcherStrategy would be needed.');
                return null;
            }

            return {
                url: videoElem.src,
                mediaIndex,
                type: 'video'
            };
        }

        // Check for story image element
        const imgElem = sectionNode.querySelector(this.CONFIG.SELECTORS.storyImage);
        if (imgElem) {
            Logger.debug('DOM Strategy: Found story image element.');
            let url = null;

            if (imgElem.srcset) {
                Logger.debug('DOM Strategy: Story image has srcset.');
                const sources = imgElem.srcset.split(',').map(s => s.trim().split(' ')[0]);
                url = sources[sources.length - 1] || sources[0];
                Logger.debug('DOM Strategy: Extracted URL from story image srcset');
            }

            if (!url) {
                url = imgElem.getAttribute('src');
                Logger.debug('DOM Strategy: Using story image src attribute.');
            }

            return {
                url,
                mediaIndex,
                type: 'image'
            };
        }

        Logger.warn('DOM Strategy: Could not find video or image element in story section.');
        return null;
    }

    /**
     * Finds the index of the current story being viewed using the progress bar
     *
     * @param {HTMLElement} sectionNode - The story container section
     * @returns {number|null} The index or null if not found
     */
    findStoryIndex(sectionNode) {
        Logger.debug('DOM Strategy: Finding story index using progress bar...');
        try {
            // Find progress bar container
            const progressBar = sectionNode.querySelector('div[role="progressbar"]');
            if (!progressBar) {
                Logger.debug('DOM Strategy: Progress bar element not found.');
                return null;
            }

            const segments = progressBar.querySelectorAll(':scope > div');
            if (segments.length === 0) {
                Logger.debug('DOM Strategy: No progress bar segments found.');
                return null;
            }

            if (segments.length === 1) {
                Logger.debug('DOM Strategy: Only one progress bar segment found, index is 0.');
                return 0;
            }

            for (let i = 0; i < segments.length; i++) {
                const fillDiv = segments[i].querySelector('div[style*="width"]');
                if (fillDiv?.style.width) {
                    const widthPercent = parseFloat(fillDiv.style.width);
                    if (widthPercent > 0) {
                        Logger.debug(`DOM Strategy: Found active progress segment at index ${i} (width=${widthPercent}%).`);
                        return i;
                    }
                }
            }

            Logger.warn('DOM Strategy: Could not identify active progress segment. Defaulting to 0.');
            return 0;
        } catch (error) {
            Logger.error(error, 'DOM Strategy: Error finding story index.');
            return null;
        }
    }

    /**
     * Guesses media type based on URL extension
     *
     * @param {string|null} url - The URL to check
     * @returns {'video'|'image'|null} The guessed type or null
     */
    guessMediaTypeFromUrl(url) {
        if (!url) return null;

        try {
            const path = new URL(url).pathname.toLowerCase();
            if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm')) {
                return 'video';
            }
            if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp') || path.endsWith('.gif')) {
                return 'image';
            }
        } catch (e) {
            Logger.warn('DOM Strategy: Could not parse URL to guess media type:', url);
        }

        return null;
    }

    /**
     * Attempts to determine media type by making a HEAD request to check the Content-Type header.
     * Used when extension-based detection fails.
     *
     * @param {string} url - The media URL
     * @returns {Promise<'video'|'image'|'unknown'>} The determined type
     */
    async probeMediaType(url) {
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
            Logger.debug('DOM Strategy: Cannot probe media type for blob/data URL');
            return 'unknown';
        }

        Logger.debug('DOM Strategy: Probing media type via HEAD request for:', url);

        try {
            const response = await fetch(url, {method: 'HEAD', mode: 'cors'});

            if (response.ok) {
                const contentType = response.headers.get('content-type');

                if (contentType) {
                    Logger.debug(`DOM Strategy: HEAD request got Content-Type: ${contentType}`);

                    if (contentType.startsWith('video/')) return 'video';
                    if (contentType.startsWith('image/')) return 'image';

                    Logger.warn(`DOM Strategy: Unknown Content-Type encountered: ${contentType}`);
                } else {
                    Logger.warn('DOM Strategy: HEAD request successful but Content-Type header missing.');
                }
            } else {
                Logger.warn(`DOM Strategy: HEAD request failed (${response.status}) for probing type.`);
            }
        } catch (error) {
            Logger.error(error, `DOM Strategy: Error probing media type for ${url}.`);
        }

        return 'unknown';
    }

    /**
     * Decodes HTML entities in a string (helper method)
     *
     * @param {string} encodedString - String potentially containing HTML entities
     * @returns {string} Decoded string
     */
    decodeHtmlEntities(encodedString) {
        if (!encodedString || typeof encodedString !== 'string') return encodedString;

        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedString;
        return textarea.value;
    }
}