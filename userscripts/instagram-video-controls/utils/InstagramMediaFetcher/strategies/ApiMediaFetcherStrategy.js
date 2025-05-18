import {Logger} from "../../../../common/core";
import MediaFetcherStrategy from "./MediaFetcherStrategy";
import MediaUtils from "../../../../common/core/utils/MediaUtils";

/**
 * Strategy for fetching media information using Instagram's API
 */
export default class ApiMediaFetcherStrategy extends MediaFetcherStrategy {
    CONFIG = {
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
            /** Selectors used to query the DOM for specific Instagram elements */
            SELECTORS: {
                /** Targets links within a post that contain the post ID */
                postLink: 'a[href*="/p/"]',
                /** Targets script tags containing JSON data */
                jsonScript: 'script[type="application/json"]',
            }
        }
    };

    constructor() {
        super();
        this.infoCache = {};      // key: mediaId, value: API response JSON
        this.mediaIdCache = {};   // key: postId (shortcode), value: mediaId
    }

    /**
     * Fetch media information using Instagram's API
     *
     * @param {HTMLElement} containerNode - The container element
     * @param {number} mediaIdx - The index of the media
     * @param {object} options - Additional options
     * @returns {Promise<{url: string, type: string, mediaIndex: number}|null>}
     */
    async fetchMediaInfo(containerNode, mediaIdx, options = {}) {
        Logger.info('API Strategy: Attempting to get URL via API...', {mediaIdx});
        try {
            const appId = this.findAppId();
            if (!appId) {
                Logger.error('API Strategy Error: Could not find App ID. Cannot proceed.');
                return null;
            }
            Logger.debug('API Strategy: Found App ID:', appId);

            const mediaId = await this.findMediaId(containerNode, mediaIdx);
            if (!mediaId) {
                Logger.error('API Strategy Error: Could not find Media ID. Cannot proceed.');
                return null;
            }
            Logger.debug(`API Strategy: Found Media ID: ${mediaId}`);

            if (this.infoCache[mediaId]) {
                Logger.info('API Strategy: Found media info in cache.');
                const url = this.extractUrlFromInfoJson(this.infoCache[mediaId], mediaIdx);
                if (url) {
                    const type = MediaUtils.detectMediaTypeFromUrl(url);
                    return {url, mediaIndex: mediaIdx, type: type || 'unknown'};
                }
                return null;
            }

            const apiUrl = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
            const headers = {'X-IG-App-ID': appId};
            Logger.info(`API Strategy: Fetching ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                Logger.error(`API Strategy Error: Fetch failed (${response.status}) for ${apiUrl}. Body: ${errorBody.substring(0, 200)}`);
                return null;
            }

            const respJson = await response.json();
            this.infoCache[mediaId] = respJson;
            Logger.debug('API Strategy: Successfully fetched and cached API response.');

            const url = this.extractUrlFromInfoJson(respJson, mediaIdx);
            if (url) {
                const type = MediaUtils.detectMediaTypeFromUrl(url);
                return {url, mediaIndex: mediaIdx, type: type || 'unknown'};
            }
            return null;

        } catch (error) {
            Logger.error(error, 'Error occurred within API Media Fetcher Strategy.');
            return null;
        }
    }

    /**
     * Checks if API strategy is applicable for all contexts
     *
     * @param {HTMLElement} containerNode - The container element
     * @returns {boolean} Always true as API can be tried for all contexts
     */
    isApplicable(containerNode) {
        // API strategy can be attempted for any container type
        return true;
    }

    /**
     * Finds the Instagram Application ID ('X-IG-App-ID') from the page's scripts.
     * @returns {string|null} The App ID string or null if not found.
     */
    findAppId() {
        Logger.debug('API Strategy: Finding App ID...');
        try {
            const scripts = document.querySelectorAll('script');
            const appIdPattern = this.CONFIG.REGEX.appId;
            for (const script of scripts) {
                if (script.textContent) {
                    const match = script.textContent.match(appIdPattern);
                    if (match) {
                        const appId = match[1] || match[2];
                        if (appId) {
                            Logger.debug('API Strategy: Found App ID:', appId);
                            return appId;
                        }
                    }
                }
            }
            Logger.warn('API Strategy: App ID pattern not found in any script tag.');
            return null;
        } catch (error) {
            Logger.error(error, 'API Strategy: Error finding App ID.');
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
        Logger.debug(`API Strategy: Finding Media ID for ${containerNode.tagName} at index ${mediaIdx}`);
        let mediaId = null;

        // Handle STORIES
        if (containerNode.tagName === 'SECTION') {
            // Strategy 1: Story URL
            if (window.location.pathname.includes('/stories/')) {
                const match = window.location.pathname.match(this.CONFIG.REGEX.storyIdPath);
                if (match && match[1]) {
                    Logger.debug('API Strategy: Media ID (Story URL): Found:', match[1]);
                    return match[1];
                }
            }

            // Strategy 2: Inline JSON for Stories/Highlights
            try {
                const scriptTags = document.querySelectorAll(this.CONFIG.REGEX.SELECTORS.jsonScript);
                const mediaIdPattern = /"media_id"\s*:\s*"(\d+)"/g;

                // Collect all media_ids found in JSON scripts
                const allMediaIds = [];
                for (const script of scriptTags) {
                    if (script.textContent) {
                        const matches = Array.from(script.textContent.matchAll(mediaIdPattern));
                        matches.forEach(match => {
                            if (match[1]) allMediaIds.push(match[1]);
                        });
                    }
                }

                // Try to pick based on mediaIdx
                if (allMediaIds.length > mediaIdx) {
                    mediaId = allMediaIds[mediaIdx];
                    if (mediaId) {
                        Logger.debug(`API Strategy: Media ID (Story/Highlight JSON): Selected ID ${mediaId} at index ${mediaIdx}.`);
                        return mediaId;
                    }
                }
            } catch (error) {
                Logger.error(error, 'API Strategy: Error finding Story Media ID from JSON.');
            }

            return null; // No story ID found
        }

        // Handle POSTS
        if (containerNode.tagName === 'ARTICLE') {
            // Strategy 3: Fetch Post HTML using postId
            const postId = this.findPostId(containerNode);
            if (postId) {
                // Check cache first
                if (this.mediaIdCache[postId]) {
                    Logger.info('API Strategy: Found Media ID in cache for postId:', postId);
                    return this.mediaIdCache[postId];
                }

                Logger.info('API Strategy: Fetching post page for Media ID, postId:', postId);
                try {
                    const postUrl = `https://www.instagram.com/p/${postId}/`;
                    const response = await fetch(postUrl);
                    if (response.ok) {
                        const text = await response.text();
                        const mediaIdPattern = /"media_id"\s*:\s*"(\d+)"/;
                        const idMatch = text.match(mediaIdPattern);
                        if (idMatch && idMatch[1]) {
                            mediaId = idMatch[1];
                            Logger.info('API Strategy: Found Media ID from fetched HTML:', mediaId);
                            this.mediaIdCache[postId] = mediaId; // Cache it
                            return mediaId;
                        }
                    }
                } catch (fetchError) {
                    Logger.error(fetchError, 'API Strategy: Error fetching post HTML.');
                }
            }

            // Strategy 2 (Fallback): Inline JSON
            try {
                const scriptTags = document.querySelectorAll(this.CONFIG.REGEX.SELECTORS.jsonScript);
                const mediaIdPattern = /"media_id"\s*:\s*"(\d+)"/g;

                for (const script of scriptTags) {
                    if (!script.textContent) continue;
                    const matches = Array.from(script.textContent.matchAll(mediaIdPattern));
                    if (matches.length > 0 && matches[0][1]) {
                        mediaId = matches[0][1];
                        Logger.warn(`API Strategy: Selected first globally found ID: ${mediaId} (Fallback).`);
                        return mediaId;
                    }
                }
            } catch (error) {
                Logger.error(error, 'API Strategy: Error during Media ID Fallback.');
            }
        }

        // Handle REELS
        if (window.location.pathname.startsWith('/reels/')) {
            const reelId = this.findReelId();
            if (reelId) {
                return await this.findMediaIdForReel(reelId);
            }
        }

        return mediaId;
    }

    /**
     * Finds the Post ID (shortcode) from links within an article node.
     * @param {HTMLElement} articleNode - The ARTICLE element.
     * @returns {string|null} The Post ID string or null.
     */
    findPostId(articleNode) {
        Logger.debug('API Strategy: Finding Post ID (shortcode)...');
        const links = articleNode.querySelectorAll(this.CONFIG.REGEX.SELECTORS.postLink);
        const postIdPattern = this.CONFIG.REGEX.postIdPath;

        for (const link of links) {
            const href = link.getAttribute('href');
            if (href) {
                const match = href.match(postIdPattern);
                if (match && match[1]) {
                    Logger.debug('API Strategy: Found Post ID:', match[1]);
                    return match[1];
                }
            }
        }

        Logger.warn('API Strategy: Post ID not found in article links.');
        return null;
    }

    /**
     * Finds the Reel ID (shortcode) from the current URL.
     * @returns {string|null} The Reel ID string or null.
     */
    findReelId() {
        try {
            const match = window.location.pathname.match(/^\/reels?\/([^/]+)/);
            if (match && match[1]) {
                Logger.debug('API Strategy: Found Reel ID from URL:', match[1]);
                return match[1];
            }
        } catch (e) {
            Logger.error(e, "API Strategy: Error parsing window location for Reel ID");
        }

        return null;
    }

    /**
     * Finds the numeric Media ID for a given Reel ID (shortcode).
     * @param {string} reelId - The Reel shortcode.
     * @returns {Promise<string|null>} The numeric Media ID or null.
     */
    async findMediaIdForReel(reelId) {
        if (!reelId) return null;
        Logger.debug(`API Strategy: Finding numeric Media ID for Reel: ${reelId}`);

        try {
            const reelUrl = `https://www.instagram.com/reel/${reelId}/`;
            Logger.info(`API Strategy: Fetching Reel HTML: ${reelUrl}`);
            const response = await fetch(reelUrl, {
                method: 'GET',
                headers: {'User-Agent': navigator.userAgent},
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                Logger.warn(`API Strategy: Fetching Reel HTML failed (${response.status})`);
                return null;
            }

            const text = await response.text();
            const patterns = [
                /"media_id"\s*:\s*"(\d+)"/,
                /instagram:\/\/media\?id=(\d+)/,
                /"video_id"\s*:\s*"(\d+)"/
            ];

            for (const pattern of patterns) {
                const idMatch = text.match(pattern);
                if (idMatch && idMatch[1]) {
                    Logger.info(`API Strategy: Found Media ID (${idMatch[1]}) for Reel (${reelId})`);
                    return idMatch[1];
                }
            }

            Logger.warn(`API Strategy: Could not find Media ID pattern in Reel HTML.`);
            return null;

        } catch (fetchError) {
            Logger.error(fetchError, `API Strategy: Error fetching Reel HTML.`);
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
        Logger.debug('API Strategy: Extracting URL from API JSON...', {mediaIdx});
        try {
            if (!infoJson?.items?.[0]) {
                Logger.warn('API Strategy: API JSON is invalid or has no items.');
                return null;
            }

            const item = infoJson.items[0];
            let targetMediaItem = item;

            if (item.carousel_media && item.carousel_media.length > mediaIdx) {
                targetMediaItem = item.carousel_media[mediaIdx];
                Logger.debug(`API Strategy: Selecting carousel item at index ${mediaIdx}`);
            } else if (item.carousel_media) {
                Logger.warn(`API Strategy: Carousel index ${mediaIdx} out of bounds (max ${item.carousel_media.length - 1}). Using first item.`);
                targetMediaItem = item.carousel_media[0];
            }

            if (targetMediaItem.video_versions?.length > 0) {
                const url = targetMediaItem.video_versions[0].url;
                Logger.debug('API Strategy: Extracted video URL');
                return url;
            }

            if (targetMediaItem.image_versions2?.candidates?.length > 0) {
                const url = targetMediaItem.image_versions2.candidates[0].url;
                Logger.debug('API Strategy: Extracted image URL');
                return url;
            }

            Logger.warn('API Strategy: Could not find video_versions or image_versions2 in target media item.');
            return null;
        } catch (error) {
            Logger.error(error, 'API Strategy: Error extracting URL from API JSON.');
            return null;
        }
    }
}