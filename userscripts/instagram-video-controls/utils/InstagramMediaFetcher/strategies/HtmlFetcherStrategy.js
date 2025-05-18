import {HTMLUtils, Logger} from "../../../../core";
import MediaFetcherStrategy from "./MediaFetcherStrategy";
import SimpleCache from "../../../../core/utils/SimpleCache";

/**
 * Strategy for fetching media information by parsing HTML content
 * Used as a fallback when direct API or DOM strategies fail,
 * especially for blob URLs.
 */
export default class HtmlFetcherStrategy extends MediaFetcherStrategy {
    CONFIG = {
        /** Regular expression patterns used for parsing strings */
        REGEX: {
            /** Extracts Post ID (shortcode) from URL path */
            postIdPath: /^\/p\/([^/]+)\//,
            /** Extracts a potential video URL embedded within HTML source, often near poster filename */
            videoUrlInHtml: /"([^"]+\.(?:jpg|png|jpeg|webp))".*?"video_versions".*?"url":"([^"]+)"/si,
            /** Broader RegEx to find video URLs in HTML when the poster name isn't directly adjacent */
            videoUrlInHtmlBroad: /"video_versions"\s*:\s*\[(.*?)\{[^}]*?"url"\s*:\s*"([^"]+\.(?:mp4|mov)[^"]*)"/i,
            /** Extracts og:video meta tag content */
            ogVideoTag: /<meta\s+property="og:video"\s+content="([^"]+)"/i,
            /** Extracts filename part from common image URLs (used for matching in HTML) */
            posterFilename: /\/([^\/?]+)\.(?:jpg|png|jpeg|webp|mp4|mov)/i,
        },
        SELECTORS: {
            /** Targets links within a post that contain the post ID */
            postLink: 'a[href*="/p/"]',
            /** Targets the time element, often a sibling or child of a post link */
            postTime: 'time',
        }
    };

    constructor() {
        super();
        this.videoUrlCache = new SimpleCache(50);
    }

    /**
     * Fetch media information by parsing HTML content
     *
     * @param {HTMLElement} containerNode - The container element
     * @param {number} mediaIdx - The index of the media
     * @param {object} options - Additional options
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchMediaInfo(containerNode, mediaIdx, options = {}) {
        Logger.info('HTML Strategy: Attempting to get URL via HTML parsing...', {mediaIdx});

        try {
            const videoElem = containerNode.querySelector('video');
            const poster = videoElem?.getAttribute('poster');

            // Determine context type based on container and URL
            if (window.location.pathname.startsWith('/reels/')) {
                return await this.fetchReelMediaFromHtml(containerNode, videoElem);
            } else if (containerNode.tagName === 'ARTICLE') {
                return await this.fetchPostMediaFromHtml(containerNode, videoElem, mediaIdx);
            } else if (containerNode.tagName === 'SECTION') {
                return await this.fetchStoryMediaFromHtml(containerNode, videoElem, mediaIdx);
            }

            Logger.warn('HTML Strategy: Unknown container type, cannot fetch media.');
            return null;
        } catch (error) {
            Logger.error(error, 'Error occurred within HTML Media Fetcher Strategy.');
            return null;
        }
    }

    /**
     * Checks if HTML strategy is applicable
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {boolean} True if this strategy can be applied
     */
    isApplicable(containerNode) {
        // HTML strategy is typically a fallback for blob URLs or when other strategies fail
        const videoElem = containerNode.querySelector('video');

        if (!videoElem) return false;

        // Especially useful for blob URLs
        if (videoElem.src && videoElem.src.startsWith('blob:')) {
            return true;
        }

        // Or when we have a poster but no direct URL
        if (videoElem.getAttribute('poster') && !videoElem.src) {
            return true;
        }

        return false;
    }

    /**
     * Fetch media information for a post by parsing HTML
     *
     * @param {HTMLElement} containerNode - The post container
     * @param {HTMLVideoElement} videoElem - The video element (may have blob URL)
     * @param {number} mediaIdx - The media index
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchPostMediaFromHtml(containerNode, videoElem, mediaIdx) {
        // Check cache first
        const poster = videoElem?.getAttribute('poster');
        const cacheKey = videoElem?.src?.startsWith('blob:') ? videoElem.src : poster;

        if (cacheKey && this.videoUrlCache[cacheKey]) {
            Logger.info('HTML Strategy: Found cached URL for post video.');
            return {
                url: this.videoUrlCache[cacheKey],
                mediaIndex: mediaIdx,
                type: 'video'
            };
        }

        // Get post URL
        let postUrl = null;

        // First try to find post ID
        const postId = this.findPostId(containerNode);
        if (postId) {
            postUrl = `https://www.instagram.com/p/${postId}/`;
            Logger.debug('HTML Strategy: Found post URL via postId:', postUrl);
        } else {
            // Fallback: try time element link
            const timeElement = containerNode.querySelector(this.CONFIG.SELECTORS.postTime);
            if (timeElement) {
                const timeParentLink = timeElement.closest('a');
                if (timeParentLink && timeParentLink.href?.includes('/p/')) {
                    postUrl = timeParentLink.href;
                    Logger.debug('HTML Strategy: Found post URL via time element parent link.');
                }
            }

            // Another fallback: general post link
            if (!postUrl) {
                const postLink = containerNode.querySelector(this.CONFIG.SELECTORS.postLink);
                if (postLink?.href && new URL(postLink.href).pathname.startsWith('/p/')) {
                    postUrl = postLink.href;
                    Logger.debug('HTML Strategy: Found post URL via general post link query.');
                }
            }
        }

        if (!postUrl) {
            Logger.error('HTML Strategy: Could not find the post permalink URL needed for fetching HTML.');
            return null;
        }

        // Fetch the HTML
        Logger.info(`HTML Strategy: Fetching post HTML from: ${postUrl}`);
        const response = await fetch(postUrl, {
            method: 'GET',
            headers: {'User-Agent': navigator.userAgent},
            credentials: 'include',
            mode: 'cors'
        });

        if (!response.ok) {
            Logger.error(`HTML Strategy: Failed to fetch post HTML (${response.status}): ${postUrl}`);
            return null;
        }

        const content = await response.text();
        Logger.debug(`HTML Strategy: Fetched HTML content (${content.length} bytes). Parsing...`);

        // Parse the HTML to find the video URL
        let videoUrl = null;

        // If we have a poster, try to find a match based on the poster filename
        if (poster) {
            Logger.debug('HTML Strategy: Video element has poster attribute:', poster);
            const posterFilenameMatch = poster.match(this.CONFIG.REGEX.posterFilename);

            if (posterFilenameMatch && posterFilenameMatch[1]) {
                const posterFileName = posterFilenameMatch[1];
                Logger.debug(`HTML Strategy: Using poster filename for specific RegEx: ${posterFileName}`);

                try {
                    // Escape special regex characters in the filename
                    const escapedPosterFileName = posterFileName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const specificPattern = new RegExp(`"${escapedPosterFileName}[^"]*\\.(?:jpg|png|jpeg|webp)".*?"video_versions".*?"url":"([^"]+)"`, 'si');

                    const match = content.match(specificPattern);
                    if (match && match[1]) {
                        try {
                            videoUrl = JSON.parse(`"${match[1]}"`);
                            Logger.info('HTML Strategy: Specific RegEx (poster filename) matched:', videoUrl);
                        } catch (jsonParseError) {
                            videoUrl = match[1].replace(/\\u0026/g, '&'); // Basic unescaping
                        }
                    }
                } catch (regexError) {
                    Logger.error(regexError, 'HTML Strategy: Error during specific RegEx execution.');
                }
            }
        }

        // If poster method failed, try broader regex
        if (!videoUrl) {
            Logger.debug('HTML Strategy: Attempting broader RegEx for video_versions...');
            const broadMatch = content.match(this.CONFIG.REGEX.videoUrlInHtmlBroad);

            if (broadMatch && broadMatch[2]) {
                try {
                    videoUrl = JSON.parse(`"${broadMatch[2]}"`);
                    Logger.info('HTML Strategy: Broad RegEx matched:', videoUrl);
                } catch (jsonParseError) {
                    videoUrl = broadMatch[2].replace(/\\u0026/g, '&'); // Basic unescaping
                }
            }
        }

        // If still no URL, try og:video meta tag
        if (!videoUrl) {
            Logger.debug('HTML Strategy: Checking og:video meta tag...');
            const metaTags = HTMLUtils.extractMetaTags(content);

            if (metaTags["og:video"]) {
                videoUrl = metaTags["og:video"];
                Logger.info('HTML Strategy: Found URL in og:video meta tag:', videoUrl);
            }
        }

        if (!videoUrl) {
            Logger.error('HTML Strategy: Failed to extract video URL from fetched HTML.');
            return null;
        }

        // Cache the result using poster or blob URL as key
        if (cacheKey) {
            this.videoUrlCache.set(cacheKey, videoUrl);
        }

        return {
            url: videoUrl,
            mediaIndex: mediaIdx,
            type: 'video'
        };
    }

    /**
     * Fetch media information for a reel by parsing HTML
     *
     * @param {HTMLElement} containerNode - The reel container
     * @param {HTMLVideoElement} videoElem - The video element (likely has blob URL)
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchReelMediaFromHtml(containerNode, videoElem) {
        const reelId = this.findReelId();
        if (!reelId) {
            Logger.error('HTML Strategy: Could not find Reel ID from URL.');
            return null;
        }

        const reelUrl = `https://www.instagram.com/reel/${reelId}/`;
        Logger.info(`HTML Strategy: Fetching Reel HTML from: ${reelUrl}`);

        try {
            const response = await fetch(reelUrl, {
                method: 'GET',
                headers: {'User-Agent': navigator.userAgent},
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                Logger.error(`HTML Strategy: Failed to fetch Reel HTML (${response.status}): ${reelUrl}`);
                return null;
            }

            const content = await response.text();
            Logger.debug(`HTML Strategy: Fetched HTML content (${content.length} bytes). Parsing...`);

            // Parse the HTML to find the video URL
            let videoUrl = null;

            // Try broad regex
            Logger.debug('HTML Strategy: Attempting broad RegEx for video_versions...');
            const broadMatch = content.match(this.CONFIG.REGEX.videoUrlInHtmlBroad);

            if (broadMatch && broadMatch[2]) {
                try {
                    videoUrl = JSON.parse(`"${broadMatch[2]}"`);
                    Logger.info('HTML Strategy: Broad RegEx matched for Reel:', videoUrl);
                } catch (jsonParseError) {
                    videoUrl = broadMatch[2].replace(/\\u0026/g, '&'); // Basic unescaping
                }
            }

            // Try og:video meta tag
            if (!videoUrl) {
                Logger.debug('HTML Strategy: Checking og:video meta tag for Reel...');
                const metaTags = HTMLUtils.extractMetaTags(content);
                if (metaTags["og:video"]) {
                    videoUrl = metaTags["og:video"];
                    Logger.info('HTML Strategy: Found URL in og:video meta tag for Reel:', videoUrl);
                }
            }

            if (!videoUrl) {
                Logger.error('HTML Strategy: Failed to extract video URL from fetched Reel HTML.');
                return null;
            }

            return {
                url: videoUrl,
                mediaIndex: 0, // Reels are always single media
                type: 'video'
            };
        } catch (error) {
            Logger.error(error, 'HTML Strategy: Error fetching Reel HTML.');
            return null;
        }
    }

    /**
     * Fetch media information for a story by parsing HTML
     * Note: This is the most challenging case and may not always work
     *
     * @param {HTMLElement} containerNode - The story container
     * @param {HTMLVideoElement} videoElem - The video element
     * @param {number} mediaIdx - The media index
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchStoryMediaFromHtml(containerNode, videoElem, mediaIdx) {
        // Stories are challenging because they don't have stable URLs
        if (!window.location.pathname.includes('/stories/')) {
            Logger.error('HTML Strategy: Not a story URL, cannot fetch story media from HTML.');
            return null;
        }

        const match = window.location.pathname.match(/^\/stories\/([^/]+)\/(\d+)/);
        if (!match || !match[1] || !match[2]) {
            Logger.error('HTML Strategy: Could not parse story URL components.');
            return null;
        }

        const username = match[1];
        const storyId = match[2];
        const storyUrl = window.location.href;

        Logger.info(`HTML Strategy: Fetching story HTML from: ${storyUrl}`);

        try {
            const response = await fetch(storyUrl, {
                method: 'GET',
                headers: {'User-Agent': navigator.userAgent},
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                Logger.error(`HTML Strategy: Failed to fetch story HTML (${response.status}): ${storyUrl}`);
                return null;
            }

            const content = await response.text();
            Logger.debug(`HTML Strategy: Fetched HTML content (${content.length} bytes). Parsing...`);

            // For stories, the og:video tag is often the most reliable source
            const metaTags = HTMLUtils.extractMetaTags(content);
            if (metaTags["og:video"]) {
                let videoUrl = metaTags["og:video"];
                Logger.info('HTML Strategy: Found URL in og:video meta tag for Story:', videoUrl);

                return {
                    url: videoUrl,
                    mediaIndex: mediaIdx,
                    type: 'video'
                };
            }

            // Try broad regex as fallback
            const broadMatch = content.match(this.CONFIG.REGEX.videoUrlInHtmlBroad);
            if (broadMatch && broadMatch[2]) {
                try {
                    const videoUrl = JSON.parse(`"${broadMatch[2]}"`);
                    Logger.info('HTML Strategy: Broad RegEx matched for Story:', videoUrl);

                    return {
                        url: videoUrl,
                        mediaIndex: mediaIdx,
                        type: 'video'
                    };
                } catch (jsonParseError) {
                    Logger.error(jsonParseError, 'HTML Strategy: Error parsing JSON in Story HTML.');
                }
            }

            Logger.error('HTML Strategy: Failed to extract video URL from fetched Story HTML.');
            return null;
        } catch (error) {
            Logger.error(error, 'HTML Strategy: Error fetching Story HTML.');
            return null;
        }
    }

    /**
     * Finds the Post ID (shortcode) from links within an article node
     *
     * @param {HTMLElement} articleNode - The post article node
     * @returns {string|null} The Post ID string or null
     */
    findPostId(articleNode) {
        Logger.debug('HTML Strategy: Finding Post ID (shortcode)...');
        const links = articleNode.querySelectorAll(this.CONFIG.SELECTORS.postLink);
        const postIdPattern = this.CONFIG.REGEX.postIdPath;

        for (const link of links) {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(postIdPattern);
                if (match && match[1]) {
                    Logger.debug('HTML Strategy: Found Post ID:', match[1]);
                    return match[1];
                }
            }
        }

        Logger.warn('HTML Strategy: Post ID not found in article links.');
        return null;
    }

    /**
     * Finds the Reel ID (shortcode) from the current URL
     *
     * @returns {string|null} The Reel ID string or null
     */
    findReelId() {
        try {
            const match = window.location.pathname.match(/^\/reels?\/([^/]+)/);
            if (match && match[1]) {
                Logger.debug('HTML Strategy: Found Reel ID from URL:', match[1]);
                return match[1];
            }
        } catch (e) {
            Logger.error(e, "HTML Strategy: Error parsing window location for Reel ID");
        }

        return null;
    }
}