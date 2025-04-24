import {Logger} from "../../core";

/**
 * InstagramMediaFetcher - Finds direct media URLs (video/image) on Instagram.
 *
 * This class attempts various strategies, including API calls and DOM/HTML parsing,
 * to retrieve the highest quality media URL associated with a given post or story context.
 * It does NOT handle the actual download process.
 */
class InstagramMediaFetcher {
    static CONFIG = {
        /** Selectors used to query the DOM for specific Instagram elements */
        SELECTORS: {
            // Container Selectors
            /** Targets the main container for a post */
            postArticle: 'article, main[role="main"]',
            /** Targets the main container for a story/highlight view */
            storySection: 'section[role="dialog"] section', // Adjust if needed, more specific than just 'section'
            /** Targets the header element, often used as an anchor for profile pics */
            pageHeader: 'header',

            // Post Specific Selectors
            /** Targets links within a post that contain the post ID */
            postLink: 'a[href*="/p/"]',
            /** Targets the time element, often a sibling or child of a post link */
            postTime: 'time',
            /** Targets list items in a carousel/slideshow */
            postCarouselItem: 'ul li[style*="translateX"]',
            /** Targets the container for carousel navigation dots */
            postCarouselDotsContainer: 'div._acng',
            /** Targets individual navigation dots within the container */
            postCarouselDot: 'div._acnb', // Assuming dots are divs or buttons

            // Story Specific Selectors
            /** Targets the image element primarily used in stories */
            storyImage: 'img[decoding="sync"]',
            /** Targets the source element within a story video */
            storyVideoSource: 'video > source[src]',
            /** Targets the video element itself in a story */
            storyVideo: 'video',
            /** Targets the container holding the progress bar segments for stories/highlights */
            storyProgressBar: 'div[role="progressbar"]',
            /** Targets the currently filled/active segment within the progress bar */
            storyProgressFill: 'div[role="progressbar"] > div > div[style^="width"]', // Filled part often nested
            /** Targets individual segment containers in the progress bar */
            storyProgressSegments: ':scope > div', // Direct children of progress bar

            // General Media Selectors
            /** Targets generic video elements */
            videoTag: 'video',
            /** Targets generic image elements */
            imageTag: 'img',
            /** Targets script tags containing JSON data */
            jsonScript: 'script[type="application/json"]',
        },

        /** Regular expression patterns used for parsing strings */
        REGEX: {
            /** Extracts Instagram App ID from scripts */
            appId: /"X-IG-App-ID":"(\d+)"|appId:"(\d+)"/i,
            /** Extracts Media ID (long number) from various script/HTML contexts */
            mediaId: /"media_id"\s*:\s*"(\d+)"/g,
            /** Extracts Post ID (shortcode) from URL path */
            postIdPath: /^\/p\/([^/]+)\//,
            /** Extracts Story ID from URL path */
            storyIdPath: /^\/stories\/[^/]+\/(\d+)/,
            /** Extracts a potential video URL embedded within HTML source, often near poster filename */
            // Looks for a poster filename (group 1), then video_versions, then the url (group 2)
            videoUrlInHtml: /"([^"]+\.(?:jpg|png|jpeg|webp))".*?"video_versions".*?"url":"([^"]+)"/si,
            /** Broader RegEx to find video URLs in HTML when the poster name isn't directly adjacent */
            videoUrlInHtmlBroad: /"video_versions"\s*:\s*\[(.*?)\{[^}]*?"url"\s*:\s*"([^"]+\.(?:mp4|mov)[^"]*)"/i,
            /** Extracts og:video meta tag content */
            ogVideoTag: /<meta\s+property="og:video"\s+content="([^"]+)"/i,
            /** Extracts filename part from common image URLs (used for matching in HTML) */
            posterFilename: /\/([^\/?]+)\.(?:jpg|png|jpeg|webp|mp4|mov)/i,
        },

        /** Data attribute names used as potential sources for media URLs */
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

    // --- Instance Properties ---
    disableApiMethod = false;
    infoCache = {};      // key: mediaId, value: API response JSON
    mediaIdCache = {};   // key: postId (shortcode), value: mediaId
    videoUrlCache = {};  // key: unique video identifier (e.g., poster URL or blob URL), value: fetched CDN URL

    /**
     * @param {object} [options={}] Configuration options.
     * @param {boolean} [options.disableApiMethod=false] If true, disables the API fetching method and forces fallback.
     */
    constructor(options = {}) {
        this.disableApiMethod = options.disableApiMethod ?? false;
        Logger.debug('InstagramMediaFetcher Initialized', {disableApiMethod: this.disableApiMethod});
    }

    /**
     * Basic decoding for HTML entities that might appear in URLs extracted from meta tags.
     * @param {string} encodedString The string potentially containing HTML entities.
     * @returns {string} The decoded string.
     */
    static decodeHtmlEntities(encodedString) {

        // This could also potentially use HTMLUtils if that library has a more robust decoder.
        if (!encodedString || typeof encodedString !== 'string') return encodedString;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedString;
        return textarea.value;
    }

    /**
     * Main method to get media information (URL, type, index).
     * It finds the appropriate context (post/story) and delegates the fetching.
     * @param {HTMLElement} targetElement - An element within the desired media context (e.g., a button, the media element itself).
     * @returns {Promise<{ url: string, mediaIndex: number, type: 'video'|'image' }|null>} A promise resolving to an object with media details or null if not found.
     */
    async getMediaInfo(targetElement) {
        Logger.debug('getMediaInfo called for target:', targetElement);
        const containerNode = this.findMediaContainer(targetElement);

        if (!containerNode) {
            Logger.error('Could not find a valid media container (ARTICLE or SECTION) for the target element.');
            return null;
        }

        Logger.info(`Found container: ${containerNode.tagName}`);

        // Use the static config for selectors
        if (containerNode.matches(InstagramMediaFetcher.CONFIG.SELECTORS.postArticle)) {
            return this.getPostMediaInfo(containerNode);
        } else if (containerNode.matches(InstagramMediaFetcher.CONFIG.SELECTORS.storySection)) {
            return this.getStoryMediaInfo(containerNode);
        } else {
            Logger.warn(`Container ${containerNode.tagName} is not a recognized Post Article or Story Section.`);
            return null;
        }
    }

    // --- Post Specific Logic ---

    /**
     * Tries to find the main media container (article for posts, section for stories)
     * by traversing up from the target element.
     * @param {HTMLElement} targetElement - The starting element.
     * @returns {HTMLElement|null} The container element or null if not found.
     */
    findMediaContainer(targetElement) {
        Logger.debug('Attempting to find media container...');
        if (!targetElement || !targetElement.closest) {
            Logger.warn('Invalid targetElement passed to findMediaContainer.');
            return null;
        }

        // Use the static config for selectors
        const article = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.postArticle);
        if (article) {
            Logger.debug('Found ARTICLE container.');
            return article;
        }

        const storySection = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.storySection);
        if (storySection) {
            Logger.debug('Found STORY SECTION container.');
            return storySection;
        }

        const header = targetElement.closest(InstagramMediaFetcher.CONFIG.SELECTORS.pageHeader);
        if (header) {
            Logger.info("Target seems to be in header. Profile pictures might require different logic not fully handled here.");
            return null;
        }

        Logger.warn('Failed to find ARTICLE or STORY_SECTION container ancestor.');
        return null;
    }

    /**
     * Gets media info for a post (Article). Orchestrates API and fallback methods.
     * @param {HTMLElement} articleNode - The ARTICLE element.
     * @returns {Promise<{ url: string, mediaIndex: number, type: 'video'|'image' }|null>} Media info object or null.
     */
    async getPostMediaInfo(articleNode) {
        Logger.info('Attempting to get Post media info...');
        let url = null;
        let mediaType = 'unknown';
        let mediaIndex = 0;

        try {
            // Use the static config for selectors
            const isCarousel = articleNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselItem) !== null;
            const postView = window.location.pathname.startsWith('/p/');

            if (isCarousel) {
                mediaIndex = this.findActiveMediaIndex(articleNode);
                if (mediaIndex === null) {
                    Logger.warn('Could not determine active media index for carousel. Defaulting to 0.');
                    mediaIndex = 0;
                }
                Logger.debug(`Carousel detected, active index: ${mediaIndex}`);
            } else {
                Logger.debug('Single media post detected.');
            }

            if (!this.disableApiMethod) {
                try {
                    url = await this.getUrlFromInfoApi(articleNode, mediaIndex);
                    if (url) Logger.info(`API Method Success (Post): URL found.`);
                    else Logger.debug('API Method did not return a URL for Post.');
                } catch (apiError) {
                    Logger.error(apiError, 'API Method failed during execution (Post).');
                }
            } else {
                Logger.info('API Method is disabled.');
            }

            if (!url) {
                Logger.info('Attempting DOM/Fallback method for Post...');
                try {
                    const fallbackResult = await this.getPostMediaUrlFallback(articleNode, isCarousel, mediaIndex);
                    if (fallbackResult?.url) {
                        url = fallbackResult.url;
                        mediaType = fallbackResult.type;
                        Logger.info(`Fallback Method Success (Post): URL found.`);
                    } else {
                        Logger.warn('Fallback method did not find a URL for Post.');
                    }
                } catch (fallbackError) {
                    Logger.error(fallbackError, 'Fallback Method failed during execution (Post).');
                    return null;
                }
            }

            if (url) {
                if (mediaType === 'unknown') {
                    mediaType = this.guessMediaTypeFromUrl(url) || (await this.probeMediaType(url));
                    Logger.debug(`Determined media type: ${mediaType}`);
                }
                Logger.success('Successfully retrieved Post Media Info.');
                return {url, mediaIndex, type: mediaType};
            } else {
                Logger.error('Failed to get media URL from both API and Fallback methods for Post.');
                return null;
            }

        } catch (error) {
            Logger.error(error, 'Unhandled error in getPostMediaInfo.');
            return null;
        }
    }

    /**
     * Fallback method for posts: Scrapes DOM or fetches post HTML to find the media URL.
     * @param {HTMLElement} articleNode - The ARTICLE element.
     * @param {boolean} isCarousel - Whether the post contains multiple media items.
     * @param {number} mediaIndex - The index of the currently active media item (0-based).
     * @returns {Promise<{url: string|null, type: 'video'|'image'|'unknown'}>} An object containing the URL and type, or nulls if not found.
     */
    async getPostMediaUrlFallback(articleNode, isCarousel, mediaIndex) {
        Logger.debug('Executing getPostMediaUrlFallback...', {isCarousel, mediaIndex});
        let url = null;
        let mediaType = 'unknown';
        let targetNode = articleNode;

        if (isCarousel) {
            Logger.debug('Finding specific slide element for carousel fallback...');
            // Use the static config for selectors
            const listItems = articleNode.querySelectorAll(InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselItem);
            if (listItems.length > mediaIndex) {
                targetNode = listItems[mediaIndex];
                Logger.debug(`Selected carousel item at index ${mediaIndex}.`);
                if (targetNode.getAttribute('aria-hidden') === 'true' && listItems.length > 1) {
                    Logger.warn(`Carousel item at index ${mediaIndex} has aria-hidden=true. Indexing might be off. Trying visible item.`);
                    const visibleItem = Array.from(listItems).find(item => item.getAttribute('aria-hidden') !== 'true');
                    if (visibleItem) targetNode = visibleItem;
                    else Logger.warn('Could not find a visible carousel item.');
                }
            } else if (listItems.length > 0) {
                Logger.warn(`Carousel mediaIndex ${mediaIndex} is out of bounds (found ${listItems.length} items). Using first item.`);
                targetNode = listItems[0];
            } else {
                Logger.error('Carousel detected, but no list items found with selector:', InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselItem);
                return {url: null, type: 'unknown'};
            }
        }

        if (!targetNode) {
            Logger.error('Could not find target node for media in fallback.');
            return {url: null, type: 'unknown'};
        }
        Logger.debug('Target node for fallback:', targetNode);

        // Use the static config for selectors
        const videoElem = targetNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.videoTag);
        if (videoElem) {
            Logger.debug('Found video element in target node.');
            mediaType = 'video';
            url = videoElem.getAttribute('src');
            const poster = videoElem.getAttribute('poster');
            const cacheKey = url && url.startsWith('blob:') ? url : poster;

            if (cacheKey && this.videoUrlCache[cacheKey]) {
                Logger.info('Video URL found in cache (videoUrlCache).', {key: cacheKey});
                return {url: this.videoUrlCache[cacheKey], type: 'video'};
            }

            // Use the static config for data attributes
            const dataAttrUrl = videoElem.dataset[InstagramMediaFetcher.CONFIG.DATA_ATTRS.videoSrc];
            if (dataAttrUrl && !dataAttrUrl.startsWith('blob:')) {
                Logger.info('Found video URL in data-video-src attribute.');
                if (cacheKey) this.videoUrlCache[cacheKey] = dataAttrUrl;
                return {url: dataAttrUrl, type: 'video'};
            }
            if (videoElem.hasAttribute(InstagramMediaFetcher.CONFIG.DATA_ATTRS.legacyVideoUrl)) { // Check legacy attribute
                const legacyUrl = videoElem.getAttribute(InstagramMediaFetcher.CONFIG.DATA_ATTRS.legacyVideoUrl);
                Logger.info('Found video URL in legacy videoURL attribute.');
                if (cacheKey) this.videoUrlCache[cacheKey] = legacyUrl;
                return {url: legacyUrl, type: 'video'};
            }

            if (!url || url.startsWith('blob:')) {
                Logger.info('Video src is blob or null. Attempting fetchVideoUrlFromHtml...');
                try {
                    url = await this.fetchVideoUrlFromHtml(articleNode, videoElem);
                    if (url && cacheKey) {
                        this.videoUrlCache[cacheKey] = url;
                        Logger.info('Successfully fetched video URL from HTML and cached it.');
                    } else if (!url) {
                        Logger.warn('fetchVideoUrlFromHtml did not return a URL.');
                    }
                } catch (fetchHtmlError) {
                    Logger.error(fetchHtmlError, 'Error occurred during fetchVideoUrlFromHtml.');
                    return {url: null, type: 'video'};
                }
            }
            return {url, type: 'video'};
        }
        Logger.debug('No video element found in target node.');

        // Use the static config for selectors
        const imgElem = targetNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.imageTag);
        if (imgElem) {
            Logger.debug('Found image element in target node.');
            mediaType = 'image';
            if (imgElem.srcset) {
                Logger.debug('Image has srcset, attempting to parse.');
                const sources = imgElem.srcset.split(',').map(s => s.trim().split(' '));
                let bestUrl = imgElem.src;
                let maxWidth = 0;
                try {
                    sources.forEach(([url, width]) => {
                        const w = parseInt(width?.replace('w', ''), 10);
                        if (w > maxWidth) {
                            maxWidth = w;
                            bestUrl = url;
                        } else if (!width && !maxWidth) {
                            bestUrl = url;
                        }
                    });
                    url = bestUrl;
                    Logger.debug(`Selected image URL from srcset (w=${maxWidth || 'N/A'}):`, url);
                } catch (parseError) {
                    Logger.warn(parseError, 'Error parsing srcset, falling back to first entry or src.');
                    url = sources.length > 0 ? sources[0][0] : imgElem.src;
                }
            }
            if (!url) {
                url = imgElem.getAttribute('src');
                Logger.debug('Using image src attribute as fallback.');
            }
            return {url, type: 'image'};
        }
        Logger.debug('No image element found in target node.');

        // Use the static config for data attributes
        const dataAttrUrlOnContainer = targetNode.dataset[InstagramMediaFetcher.CONFIG.DATA_ATTRS.videoSrc] ||
            targetNode.dataset[InstagramMediaFetcher.CONFIG.DATA_ATTRS.originalSrc] ||
            targetNode.dataset[InstagramMediaFetcher.CONFIG.DATA_ATTRS.src];
        if (dataAttrUrlOnContainer) {
            Logger.debug('Found URL in data-* attribute on the container node.');
            url = dataAttrUrlOnContainer;
            mediaType = this.guessMediaTypeFromUrl(url) || 'unknown';
            return {url, type: mediaType};
        }

        Logger.warn('Could not find video, image, or relevant data attribute in fallback target node.');
        return {url: null, type: 'unknown'};
    }

    /**
     * Finds the active index (0-based) in a carousel post.
     * Prioritizes checking the URL's ?img_index= param, falls back to carousel dots.
     * @param {HTMLElement} articleNode - The ARTICLE element.
     * @returns {number|null} The index or null if detection fails.
     */
    findActiveMediaIndex(articleNode) {
        Logger.debug('Finding active media index in carousel...');

        // --- Step 1: Try to read from ?img_index=N in URL ---
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const imgIndex = parseInt(urlParams.get('img_index'), 10);
            // Check if it's a valid number AND greater than 0 (URL params are usually 1-based)
            if (!isNaN(imgIndex) && imgIndex >= 1) {
                Logger.debug(`Detected img_index=${imgIndex} from URL. Adjusting to 0-based index.`);
                return imgIndex - 1; // Convert to 0-based index
            }
        } catch (e) {
            Logger.warn('Error parsing URL for img_index:', e);
        }

        // --- Step 2: Fallback to dot-based detection ---
        const dotsContainer = articleNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselDotsContainer);
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll(InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselDot);
            if (dots.length > 1) {
                for (let i = 0; i < dots.length; i++) {
                    if (dots[i].classList.length >= 2 && dots[i].classList.length !== 1) {
                        Logger.debug(`Active dot found at index ${i} (using class count >= 2)`);
                        return i;
                    }
                }
                Logger.warn('Found dots container but could not identify the active dot based on class count.');
            } else if (dots.length === 1) {
                Logger.debug('Only one dot found, assuming index 0.');
                return 0;
            } else {
                Logger.debug('No dots found in the dots container.');
            }
        } else {
            Logger.debug('Carousel dots container not found with selector:', InstagramMediaFetcher.CONFIG.SELECTORS.postCarouselDotsContainer);
        }

        Logger.warn('Could not determine active media index using URL or dot indicators. Returning 0 as fallback.');
        return 0;
    }

    // --- Story Specific Logic ---
    /**
     * Fetches the actual video URL when a blob URL is encountered or when the API fails.
     * It achieves this by fetching the post's HTML source and parsing it using various strategies.
     * It's made more robust by not strictly requiring the poster attribute.
     * @param {HTMLElement} containerNode - The main container element for the post (e.g., MAIN or ARTICLE).
     * @param {HTMLElement} videoElem - The VIDEO element (may or may not have blob src or poster).
     * @returns {Promise<string|null>} The actual video CDN URL or null if fetching/parsing fails.
     */
    async fetchVideoUrlFromHtml(containerNode, videoElem) {
        Logger.info('Executing fetchVideoUrlFromHtml...');
        try {
            let postUrl = null;

            // --- Strategy 1: Use findPostId helper ---
            const postId = this.findPostId(containerNode); // Use the existing helper
            if (postId) {
                postUrl = `https://www.instagram.com/p/${postId}/`;
                Logger.debug('fetchVideoUrlFromHtml: Found post URL via findPostId:', postUrl);
            } else {
                Logger.warn('fetchVideoUrlFromHtml: Could not find Post ID using findPostId helper.');
                // --- Strategy 2: Fallback using time element link ---
                const timeElement = containerNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.postTime);
                if (timeElement) {
                    const timeParentLink = timeElement.closest('a');
                    if (timeParentLink && timeParentLink.href?.includes('/p/')) {
                        postUrl = timeParentLink.href;
                        Logger.debug('fetchVideoUrlFromHtml: Found post URL via time element parent link:', postUrl);
                    }
                }
                // --- Strategy 3: Fallback using general post link ---
                if (!postUrl) {
                    const postLink = containerNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.postLink);
                    if (postLink?.href) {
                        // Ensure it's actually a post link
                        if (new URL(postLink.href).pathname.startsWith('/p/')) {
                            postUrl = postLink.href;
                            Logger.debug('fetchVideoUrlFromHtml: Found post URL via general post link query:', postUrl);
                        }
                    }
                }
            }

            if (!postUrl) {
                Logger.error('fetchVideoUrlFromHtml: Could not find the post permalink URL needed for fetching HTML.');
                return null;
            }

            // --- Fetch the HTML ---
            Logger.info(`fetchVideoUrlFromHtml: Fetching post HTML from: ${postUrl}`);
            const response = await fetch(postUrl, {
                method: 'GET',
                headers: {'User-Agent': navigator.userAgent}, // Use standard browser UA
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                Logger.error(`fetchVideoUrlFromHtml: Failed to fetch post HTML (${response.status} ${response.statusText}): ${postUrl}`);
                return null;
            }
            const content = await response.text();
            Logger.debug(`fetchVideoUrlFromHtml: Fetched HTML content (${content.length} bytes). Parsing for video URL...`);

            // --- Parse the HTML Content ---
            let videoUrl = null;
            const poster = videoElem.getAttribute('poster'); // Still useful if available

            // --- Attempt 1: Use Poster (if available) ---
            if (poster) {
                Logger.debug('fetchVideoUrlFromHtml: Video element has poster attribute:', poster);
                const posterFilenameMatch = poster.match(InstagramMediaFetcher.CONFIG.REGEX.posterFilename);
                if (posterFilenameMatch && posterFilenameMatch[1]) {
                    const posterFileName = posterFilenameMatch[1];
                    Logger.debug(`fetchVideoUrlFromHtml: Using poster filename for specific RegEx: ${posterFileName}`);
                    try {
                        // Escape special regex characters in the filename
                        const escapedPosterFileName = posterFileName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        // Construct specific pattern dynamically (use the one from config as base)
                        // Note: Reusing videoUrlInHtml regex structure here
                        const specificPattern = new RegExp(`"${escapedPosterFileName}[^"]*\\.(?:jpg|png|jpeg|webp)".*?"video_versions".*?"url":"([^"]+)"`, 'si');
                        const match = content.match(specificPattern);
                        if (match && match[1]) {
                            // Use JSON.parse to correctly unescape JSON string encoded URLs
                            try {
                                videoUrl = JSON.parse(`"${match[1]}"`);
                                Logger.info('fetchVideoUrlFromHtml: Specific RegEx (poster filename) matched:', videoUrl);
                            } catch (jsonParseError) {
                                Logger.warn('fetchVideoUrlFromHtml: Failed to JSON parse specific RegEx match', {
                                    match: match[1],
                                    error: jsonParseError
                                });
                                // Fallback to using the raw match if JSON parsing fails unexpectedly
                                videoUrl = match[1].replace(/\\u0026/g, '&'); // Basic unescaping as fallback
                            }
                        } else {
                            Logger.debug('fetchVideoUrlFromHtml: Specific RegEx (poster filename) did not find video URL.');
                        }
                    } catch (regexError) {
                        Logger.error(regexError, 'fetchVideoUrlFromHtml: Error during specific RegEx execution.');
                    }
                } else {
                    Logger.warn('fetchVideoUrlFromHtml: Could not extract filename from poster URL for specific RegEx.');
                }
            } else {
                Logger.warn('fetchVideoUrlFromHtml: Video element has no poster attribute, skipping poster-specific RegEx.');
            }

            // --- Attempt 2: Broad video_versions Regex (if poster attempt failed or skipped) ---
            if (!videoUrl) {
                Logger.debug('fetchVideoUrlFromHtml: Attempting broader RegEx for video_versions...');
                const broadMatch = content.match(InstagramMediaFetcher.CONFIG.REGEX.videoUrlInHtmlBroad);
                if (broadMatch && broadMatch[1]) {
                    try {
                        videoUrl = JSON.parse(`"${broadMatch[1]}"`);
                        Logger.info('fetchVideoUrlFromHtml: Broad RegEx matched:', videoUrl);
                    } catch (jsonParseError) {
                        Logger.warn('fetchVideoUrlFromHtml: Failed to JSON parse broad RegEx match', {
                            match: broadMatch[1],
                            error: jsonParseError
                        });
                        videoUrl = broadMatch[1].replace(/\\u0026/g, '&'); // Basic unescaping as fallback
                    }
                } else {
                    Logger.debug('fetchVideoUrlFromHtml: Broad RegEx did not find video URL.');
                }
            }

            // --- Attempt 3: og:video Meta Tag (if still not found) ---
            if (!videoUrl) {
                Logger.debug('fetchVideoUrlFromHtml: Checking og:video meta tag...');
                const ogVideoMatch = content.match(InstagramMediaFetcher.CONFIG.REGEX.ogVideoTag);
                if (ogVideoMatch && ogVideoMatch[1]) {
                    // Use static method for decoding potential HTML entities
                    videoUrl = InstagramMediaFetcher.decodeHtmlEntities(ogVideoMatch[1]);
                    Logger.info('fetchVideoUrlFromHtml: Found video URL in og:video meta tag:', videoUrl);
                } else {
                    Logger.debug('fetchVideoUrlFromHtml: og:video meta tag not found or empty.');
                }
            }

            // --- Final Result ---
            if (!videoUrl) {
                Logger.error('fetchVideoUrlFromHtml: Failed to extract video URL from fetched HTML using all methods.');
            } else {
                // Optional: Cache the result if needed (using poster or blob URL as key)
                // const cacheKey = videoElem.src.startsWith('blob:') ? videoElem.src : poster;
                // if (cacheKey) this.videoUrlCache[cacheKey] = videoUrl;
            }

            return videoUrl;

        } catch (error) {
            Logger.error(error, 'Error occurred within fetchVideoUrlFromHtml.');
            return null;
        }
    }

    /**
     * Gets media info for a story (Section). Orchestrates API and fallback methods.
     * @param {HTMLElement} sectionNode - The SECTION element containing the story view.
     * @returns {Promise<{ url: string, mediaIndex: number, type: 'video'|'image' }|null>} Media info object or null.
     */
    async getStoryMediaInfo(sectionNode) {
        Logger.info('Attempting to get Story media info...');
        let url = null;
        let mediaType = 'unknown';
        const mediaIndex = this.findStoryIndex(sectionNode);
        Logger.debug(`Determined Story/Highlight Index: ${mediaIndex ?? 'Not Found'}`);

        try {
            if (!this.disableApiMethod) {
                try {
                    url = await this.getUrlFromInfoApi(sectionNode, mediaIndex ?? 0);
                    if (url) Logger.info(`API Method Success (Story): URL found.`);
                    else Logger.debug('API Method did not return a URL for Story.');
                } catch (apiError) {
                    Logger.error(apiError, 'API Method failed during execution (Story).');
                }
            } else {
                Logger.info('API Method is disabled.');
            }

            if (!url) {
                Logger.info('Attempting DOM/Fallback method for Story...');
                try {
                    const fallbackResult = this.getStoryMediaUrlFallback(sectionNode);
                    if (fallbackResult?.url) {
                        url = fallbackResult.url;
                        mediaType = fallbackResult.type;
                        Logger.info(`Fallback Method Success (Story): URL found.`);
                    } else {
                        Logger.warn('Fallback method did not find a URL for Story.');
                    }
                } catch (fallbackError) {
                    Logger.error(fallbackError, 'Fallback Method failed during execution (Story).');
                    return null;
                }
            }

            if (url) {
                if (mediaType === 'unknown') {
                    mediaType = this.guessMediaTypeFromUrl(url) || (await this.probeMediaType(url));
                    Logger.debug(`Determined media type: ${mediaType}`);
                }
                Logger.success('Successfully retrieved Story Media Info.');
                return {url, mediaIndex: mediaIndex ?? 0, type: mediaType};
            } else {
                Logger.error('Failed to get media URL from both API and Fallback methods for Story.');
                return null;
            }

        } catch (error) {
            Logger.error(error, 'Unhandled error in getStoryMediaInfo.');
            return null;
        }
    }

    /**
     * Fallback method for stories: Scrapes the DOM to find the media URL.
     * @param {HTMLElement} sectionNode - The SECTION element.
     * @returns {{url: string|null, type: 'video'|'image'|'unknown'}} An object containing the URL and type.
     */
    getStoryMediaUrlFallback(sectionNode) {
        Logger.debug('Executing getStoryMediaUrlFallback...');
        let url = null;
        let mediaType = 'unknown';

        // Use the static config for selectors
        const videoSourceElem = sectionNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.storyVideoSource);
        if (videoSourceElem?.src) {
            mediaType = 'video';
            url = videoSourceElem.src;
            Logger.debug('Story Fallback: Found URL in <source> tag:', url);
            return {url, type: mediaType};
        }
        const videoElem = sectionNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.storyVideo);
        if (videoElem?.src) {
            mediaType = 'video';
            url = videoElem.src;
            Logger.debug('Story Fallback: Found URL in <video> src attribute:', url);
            if (url.startsWith('blob:')) {
                Logger.warn('Story Fallback: Found blob URL for video. API method is preferred for direct URL.');
            }
            return {url, type: mediaType};
        }
        Logger.debug('Story Fallback: No video elements found.');

        // Use the static config for selectors
        const imgElem = sectionNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.storyImage);
        if (imgElem) {
            Logger.debug('Story Fallback: Found story image element.');
            mediaType = 'image';
            if (imgElem.srcset) {
                Logger.debug('Story Fallback: Image has srcset.');
                const sources = imgElem.srcset.split(',').map(s => s.trim().split(' ')[0]);
                url = sources[sources.length - 1] || sources[0];
                Logger.debug('Story Fallback: Extracted URL from srcset:', url);
            }
            if (!url) {
                url = imgElem.getAttribute('src');
                Logger.debug('Story Fallback: Using image src attribute.');
            }
            return {url, type: mediaType};
        }
        Logger.debug('Story Fallback: No story image element found.');

        Logger.warn('Story Fallback: Could not find video or image element.');
        return {url: null, type: 'unknown'};
    }


    // --- API Method & Helpers ---

    /**
     * Finds the index (0-based) of the current story/highlight being viewed using the progress bar.
     * @param {HTMLElement} sectionNode - The story/highlight container SECTION.
     * @returns {number|null} The index or null if not found.
     */
    findStoryIndex(sectionNode) {
        Logger.debug('Finding story/highlight index using progress bar...');
        try {
            // Use the static config for selectors
            const progressBar = sectionNode.querySelector(InstagramMediaFetcher.CONFIG.SELECTORS.storyProgressBar);
            if (!progressBar) {
                Logger.debug('Progress bar element not found.');
                return null;
            }

            const segments = progressBar.querySelectorAll(InstagramMediaFetcher.CONFIG.SELECTORS.storyProgressSegments);
            if (segments.length === 0) {
                Logger.debug('No progress bar segments found.');
                return null;
            }
            if (segments.length === 1) {
                Logger.debug('Only one progress bar segment found, index is 0.');
                return 0;
            }

            for (let i = 0; i < segments.length; i++) {
                // Use the static config for selectors
                const fillDiv = segments[i].querySelector('div[style*="width"]'); // Re-use existing logic, selector is simple
                if (fillDiv?.style.width) {
                    const widthPercent = parseFloat(fillDiv.style.width);
                    if (widthPercent > 0) {
                        Logger.debug(`Found active progress segment at index ${i} (width=${widthPercent}%).`);
                        return i;
                    }
                }
            }

            Logger.warn('Could not definitively identify active progress segment. Defaulting to 0.');
            return 0;

        } catch (error) {
            Logger.error(error, 'Error finding story index.');
            return null;
        }
    }

    /**
     * Fetches media URL using Instagram's internal info API.
     * @param {HTMLElement} containerNode - The ARTICLE or SECTION element.
     * @param {number} [mediaIdx=0] - The index for carousel media or highlights.
     * @returns {Promise<string|null>} The media URL or null.
     */
    async getUrlFromInfoApi(containerNode, mediaIdx = 0) {
        Logger.info('Attempting API method to get URL...', {mediaIdx});
        try {
            const appId = this.findAppId();
            if (!appId) {
                Logger.error('API Method Error: Could not find App ID. Cannot proceed.');
                return null;
            }
            Logger.debug('Found App ID:', appId);

            const mediaId = await this.findMediaId(containerNode, mediaIdx);
            if (!mediaId) {
                Logger.error('API Method Error: Could not find Media ID. Cannot proceed.');
                return null;
            }
            Logger.debug(`Found Media ID: ${mediaId}`);

            if (this.infoCache[mediaId]) {
                Logger.info('API Method: Found media info in cache.');
                return this.extractUrlFromInfoJson(this.infoCache[mediaId], mediaIdx);
            }

            const apiUrl = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
            const headers = {'X-IG-App-ID': appId};
            Logger.info(`API Method: Fetching ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                Logger.error(`API Method Error: Fetch failed (${response.status} ${response.statusText}) for ${apiUrl}. Body: ${errorBody.substring(0, 200)}`);
                return null;
            }

            const respJson = await response.json();
            this.infoCache[mediaId] = respJson;
            Logger.debug('API Method: Successfully fetched and cached API response.');

            return this.extractUrlFromInfoJson(respJson, mediaIdx);

        } catch (error) {
            Logger.error(error, 'Error occurred within getUrlFromInfoApi.');
            return null;
        }
    }

    /**
     * Extracts the highest quality media URL from the parsed API JSON response.
     * @param {object} infoJson - The JSON object from the info API.
     * @param {number} [mediaIdx=0] - The index for carousel media or highlights.
     * @returns {string|null} The media URL or null if not found.
     */
    extractUrlFromInfoJson(infoJson, mediaIdx = 0) {
        Logger.debug('Extracting URL from API JSON...', {mediaIdx});
        try {
            if (!infoJson?.items?.[0]) {
                Logger.warn('API JSON is invalid or has no items.');
                return null;
            }
            const item = infoJson.items[0];

            let targetMediaItem = item;
            if (item.carousel_media && item.carousel_media.length > mediaIdx) {
                targetMediaItem = item.carousel_media[mediaIdx];
                Logger.debug(`API JSON: Selecting carousel item at index ${mediaIdx}`);
            } else if (item.carousel_media) {
                Logger.warn(`API JSON: Carousel index ${mediaIdx} out of bounds (max ${item.carousel_media.length - 1}). Using first item as fallback.`);
                targetMediaItem = item.carousel_media[0];
            } else {
                Logger.debug('API JSON: Not a carousel or index 0 requested.');
            }

            if (targetMediaItem.video_versions?.length > 0) {
                const url = targetMediaItem.video_versions[0].url;
                Logger.debug('API JSON: Extracted video URL:', url);
                return url;
            }

            if (targetMediaItem.image_versions2?.candidates?.length > 0) {
                const url = targetMediaItem.image_versions2.candidates[0].url;
                Logger.debug('API JSON: Extracted image URL:', url);
                return url;
            }

            Logger.warn('API JSON: Could not find video_versions or image_versions2 in target media item.', targetMediaItem);
            return null;
        } catch (error) {
            Logger.error(error, 'Error extracting URL from API JSON.');
            return null;
        }
    }

    /**
     * Finds the Instagram Application ID ('X-IG-App-ID') from the page's scripts.
     * @returns {string|null} The App ID string or null if not found.
     */
    findAppId() {
        // ... (Implementation uses CONFIG.REGEX.appId, otherwise same as previous version) ...
        Logger.debug('Finding App ID...');
        try {
            const scripts = document.querySelectorAll('script');
            // Use the static config for regex
            const appIdPattern = InstagramMediaFetcher.CONFIG.REGEX.appId;
            for (const script of scripts) {
                if (script.textContent) {
                    const match = script.textContent.match(appIdPattern);
                    if (match) {
                        const appId = match[1] || match[2];
                        if (appId) {
                            Logger.debug('Found App ID:', appId);
                            return appId;
                        }
                    }
                }
            }
            Logger.warn('App ID pattern not found in any script tag.');
            return null;
        } catch (error) {
            Logger.error(error, 'Error finding App ID.');
            return null;
        }
    }

    /**
     * Finds the Media ID (long numeric string) for a given post or story context.
     * @param {HTMLElement} containerNode - The ARTICLE or SECTION element.
     * @param {number} [mediaIdx=0] - The index for highlights/stories, used by some strategies.
     * @returns {Promise<string|null>} The Media ID string or null.
     */
    async findMediaId(containerNode, mediaIdx = 0) {
        // ... (Implementation uses CONFIG.REGEX.* and CONFIG.SELECTORS.*, otherwise same logic) ...
        Logger.debug(`Finding Media ID for ${containerNode.tagName} at index ${mediaIdx}`);
        let mediaId = null;

        // Strategy 1: Story URL
        if (containerNode.tagName === 'SECTION' && window.location.pathname.includes('/stories/')) {
            // Use the static config for regex
            const match = window.location.pathname.match(InstagramMediaFetcher.CONFIG.REGEX.storyIdPath);
            if (match && match[1]) {
                Logger.debug('Media ID Strategy 1 (Story URL): Found:', match[1]);
                return match[1];
            }
        }

        // Strategy 2: Inline JSON
        Logger.debug('Media ID Strategy 2: Searching inline JSON scripts...');
        try {
            // Use the static config for selectors and regex
            const scriptTags = document.querySelectorAll(InstagramMediaFetcher.CONFIG.SELECTORS.jsonScript);
            const pkPattern = InstagramMediaFetcher.CONFIG.REGEX.mediaId;

            for (const script of scriptTags) {
                if (!script.textContent) continue;
                const textContent = script.textContent;
                const matches = Array.from(textContent.matchAll(pkPattern));

                if (matches.length > 0) {
                    // ... (selection logic based on tagName and mediaIdx remains the same) ...
                    if (containerNode.tagName === 'SECTION') {
                        if (matches.length > mediaIdx) {
                            const id = matches[mediaIdx][1] || matches[mediaIdx][2] || matches[mediaIdx][3];
                            if (id) {
                                Logger.debug(`Media ID Strategy 2 (Story/Highlight JSON): Selected ID ${id} at index ${mediaIdx}.`);
                                return id;
                            }
                        }
                    } else {
                        for (const match of matches) {
                            const id = match[1] || match[2] || match[3];
                            if (id) {
                                Logger.debug('Media ID Strategy 2 (Post JSON): Selected first found ID:', id);
                                return id;
                            }
                        }
                    }
                }
            }
            Logger.debug('Media ID Strategy 2: No relevant ID patterns found in inline JSON.');
        } catch (error) {
            Logger.error(error, 'Error occurred during Media ID Strategy 2 (Inline JSON).');
        }

        // Strategy 3: Fetch Post HTML
        if (containerNode.tagName === 'ARTICLE') {
            Logger.debug('Media ID Strategy 3: Attempting to fetch Post HTML...');
            const postId = this.findPostId(containerNode); // Uses internal method
            if (postId) {
                if (this.mediaIdCache[postId]) {
                    Logger.info('Media ID Strategy 3 (Post): Found Media ID in cache for postId:', postId);
                    return this.mediaIdCache[postId];
                }
                Logger.info('Media ID Strategy 3 (Post): Fetching post page for Media ID, postId:', postId);
                try {
                    const postUrl = `https://www.instagram.com/p/${postId}/`;
                    if (window.location.href === postUrl || window.location.href === new URL(postUrl).href) {
                        Logger.warn('Media ID Strategy 3: Attempting to fetch current page. Skipping fetch.');
                    } else {
                        const response = await fetch(postUrl);
                        if (response.ok) {
                            const text = await response.text();
                            // Use the static config for regex
                            const idMatch = text.match(InstagramMediaFetcher.CONFIG.REGEX.mediaId);
                            if (idMatch) {
                                mediaId = idMatch[1] || idMatch[2] || idMatch[3];
                                if (mediaId) {
                                    Logger.info('Media ID Strategy 3 (Post): Found Media ID from fetched HTML:', mediaId);
                                    this.mediaIdCache[postId] = mediaId;
                                    return mediaId;
                                }
                            } else {
                                Logger.warn('Media ID Strategy 3 (Post): Media ID pattern not found in fetched HTML.');
                            }
                        } else {
                            Logger.warn(`Media ID Strategy 3 (Post): Fetch failed (${response.status}) for ${postUrl}`);
                        }
                    }
                } catch (fetchError) {
                    Logger.error(fetchError, 'Media ID Strategy 3 (Post): Error fetching post HTML.');
                }
            } else {
                Logger.warn('Media ID Strategy 3 (Post): Could not find Post ID to fetch HTML.');
            }
        }

        Logger.error('Failed to find Media ID using all available strategies.');
        return null;
    }

    // --- Utility Methods ---

    /**
     * Finds the Post ID (shortcode, e.g., Cxyz...) from links within an article node.
     * @param {HTMLElement} articleNode - The ARTICLE element.
     * @returns {string|null} The Post ID string or null.
     */
    findPostId(articleNode) {
        // ... (Implementation uses CONFIG.SELECTORS.postLink and CONFIG.REGEX.postIdPath) ...
        Logger.debug('Finding Post ID (shortcode)...');
        // Use the static config for selectors and regex
        const links = articleNode.querySelectorAll(InstagramMediaFetcher.CONFIG.SELECTORS.postLink);
        const postIdPattern = InstagramMediaFetcher.CONFIG.REGEX.postIdPath;
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(postIdPattern);
                if (match && match[1]) {
                    Logger.debug('Found Post ID:', match[1]);
                    return match[1];
                }
            }
        }
        Logger.warn('Post ID not found in article links.');
        return null;
    }

    /**
     * Guesses media type ('video' or 'image') based on URL extension.
     * @param {string|null} url - The URL to check.
     * @returns {'video'|'image'|null} The guessed type or null.
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
            Logger.warn('Could not parse URL to guess media type:', url, e);
        }
        Logger.debug('Could not guess media type from URL extension:', url);
        return null;
    }

    /**
     * Attempts to determine media type by making a HEAD request to check the Content-Type header.
     * @param {string} url - The media URL.
     * @returns {Promise<'video'|'image'|'unknown'>} The determined type.
     */
    async probeMediaType(url) {

        if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
            Logger.debug('Cannot probe media type for blob/data URL:', url);
            return 'unknown';
        }
        Logger.debug('Probing media type via HEAD request for:', url);
        try {
            const response = await fetch(url, {method: 'HEAD', mode: 'cors'});
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType) {
                    Logger.debug(`HEAD request got Content-Type: ${contentType}`);
                    if (contentType.startsWith('video/')) return 'video';
                    if (contentType.startsWith('image/')) return 'image';
                    Logger.warn(`Unknown Content-Type encountered: ${contentType}`);
                } else {
                    Logger.warn('HEAD request successful but Content-Type header missing.');
                }
            } else {
                Logger.warn(`HEAD request failed (${response.status}) for probing type.`);
            }
        } catch (error) {
            Logger.error(error, `Error probing media type for ${url}.`);
        }
        return 'unknown';
    }
}

export default InstagramMediaFetcher;