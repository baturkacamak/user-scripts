// Initialize Greasemonkey/Tampermonkey functions safely
import { GM_download } from '../GMFunctions';
import PubSub from '../PubSub';
import Logger from '../Logger';

import DirectSrcStrategy from './strategies/DirectSrcStrategy';
import SourceTagStrategy from './strategies/SourceTagStrategy';
import JsonSearchStrategy from './strategies/JsonSearchStrategy';
import DataAttributeStrategy from './strategies/DataAttributeStrategy';
import BlobFetchStrategy from './strategies/BlobFetchStrategy';
import MediaRecorderStrategy from './strategies/MediaRecorderStrategy';
import MediaUtils from "../MediaUtils";

/**
 * @typedef {Object} DVideoDownloownloadOptions
 * @property {string} [filename] - A custom filename for the downloaded video.
 */

/**
 * VideoDownloader - Uses the Strategy pattern to reliably download videos.
 *
 * It iterates through a predefined list of download strategies (algorithms)
 * until one successfully initiates the download.
 */
class VideoDownloader {
    /**
     * Downloads a video from a direct URL using GM_download or anchor fallback.
     * @public
     * @param {string} url - URL to download from
     * @param {string|HTMLVideoElement} filenameOrVideo - Either a filename string or a video element reference
     */
    static async downloadFromUrl(url, filenameOrVideo) {
        // Fix: Ensure filename is a string, not a video element
        const filename = typeof filenameOrVideo === 'string'
            ? filenameOrVideo
            : MediaUtils.generateFilename(filenameOrVideo);

        PubSub.publish('download:url', {url, filename});
        Logger.debug('Attempting download via URL', {url: url.substring(0, 100) + '...', filename});

        try {
            if (GM_download && typeof GM_download === 'function') {
                Logger.debug('Using GM_download for URL.', {filename});
                // GM_download is often synchronous or doesn't return a useful promise
                GM_download({url: url, name: filename, saveAs: true});
            } else {
                Logger.debug('Using fallback anchor download for URL.', {filename});
                this.triggerDownload(url, filename);
            }
            PubSub.publish('download:success', {filename, method: GM_download ? 'GM_download' : 'anchor'});
            Logger.debug('Download successfully initiated via URL method.', filename);
        } catch (err) {
            Logger.error(err, 'downloadFromUrl failed');
            PubSub.publish('download:error', {filename, url, error: err});
            throw err; // Propagate error to the calling strategy
        }
    }

    /**
     * Downloads a video from a Blob object.
     * @private
     * @param {Blob} blob - The blob to download
     * @param {string|HTMLVideoElement} filenameOrVideo - Either a filename string or a video element reference
     */
    static async downloadFromBlob(blob, filenameOrVideo) {
        // Fix: Ensure filename is a string, not a video element
        const filename = typeof filenameOrVideo === 'string'
            ? filenameOrVideo
            : MediaUtils.generateFilename(filenameOrVideo);

        PubSub.publish('download:blob', {filename, size: blob.size, type: blob.type});
        Logger.debug('Attempting download via Blob', {filename, size: blob.size, type: blob.type});
        let blobUrl = null;
        try {
            blobUrl = URL.createObjectURL(blob);
            Logger.debug('Blob Object URL created.', blobUrl.substring(0, 100) + '...');
            this.triggerDownload(blobUrl, filename);
            PubSub.publish('download:success', {filename, method: 'blob'});
            Logger.debug('Blob download successfully triggered.', filename);
        } catch (err) {
            Logger.error(err, 'downloadFromBlob failed');
            PubSub.publish('download:error', {filename, blobInfo: {size: blob.size, type: blob.type}, error: err});
            throw err; // Propagate error
        } finally {
            if (blobUrl) {
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                    Logger.debug('Blob Object URL revoked.');
                }, 1500);
            }
        }
    }

    /**
     * Triggers a file download using a temporary anchor element.
     * @private
     */
    static triggerDownload(url, filename) {
        Logger.debug('Triggering anchor download.', {url: url.substring(0, 100) + '...', filename});
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        try {
            a.click();
            Logger.debug('Anchor element clicked.', filename);
        } catch (err) {
            Logger.error(err, 'Failed to click anchor element.');
            throw err; // Propagate error
        } finally {
            document.body.removeChild(a);
        }
    }

    // --- Strategy Execution Logic ---

    /**
     * Initiates the video download process by iterating through strategies.
     *
     * @param {HTMLVideoElement} video - The target HTML video element.
     * @param {DownloadOptions} [options={}] - Optional configuration.
     * @return {Promise<void>} Resolves when download is initiated or all strategies fail.
     */
    static async download(video, options = {}) {
        if (!(video instanceof HTMLVideoElement)) {
            Logger.error(new Error('Invalid input: Not an HTMLVideoElement.'), 'VideoDownloader.download');
            PubSub.publish('download:error', {video, error: 'Invalid input element'});
            alert('Download failed: Invalid video element provided.');
            return;
        }

        PubSub.publish('download:start', {video, options});
        Logger.debug('Attempting to download video using strategies', {video, options});

        // Generate a default filename but use custom one if provided
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = options.filename || `instagram_video_${timestamp}.mp4`;

        // Define the order of strategies to try
        const strategies = [
            new DirectSrcStrategy(),
            new SourceTagStrategy(),
            new DataAttributeStrategy(),
            new JsonSearchStrategy(),
            new BlobFetchStrategy(),
            new MediaRecorderStrategy(), // Last resort
        ];

        // Prepare helpers object to pass to strategies (could also use dependency injection)
        const helpers = {
            downloadFromUrl: this.downloadFromUrl.bind(this),
            downloadFromBlob: this.downloadFromBlob.bind(this),
            triggerDownload: this.triggerDownload.bind(this),
            // Note: MediaRecorderStrategy embeds its own logic but uses downloadFromBlob helper
        };

        let downloadInitiated = false;
        for (const strategy of strategies) {
            // Optional: Quick check if strategy might be applicable
            if (!strategy.isApplicable(video)) {
                Logger.debug(`Strategy ${strategy.strategyName} skipped (not applicable).`);
                continue;
            }

            try {
                Logger.debug(`Attempting strategy: ${strategy.strategyName}`);
                const success = await strategy.attempt(video, filename, helpers);

                if (success) {
                    Logger.debug(`Strategy ${strategy.strategyName} successfully initiated download.`);
                    downloadInitiated = true;
                    break; // Exit loop on first success
                } else {
                    // Strategy determined it wasn't applicable or couldn't find a source, but didn't error.
                    Logger.debug(`Strategy ${strategy.strategyName} did not initiate download (not applicable or no source found).`);
                }
            } catch (error) {
                // Strategy encountered an error during its execution (e.g., fetch failed)
                Logger.error(error, `Strategy ${strategy.strategyName} failed with error`);
                // Continue to the next strategy
            }
        }

        if (!downloadInitiated) {
            PubSub.publish('download:failed', {video, filename});
            Logger.error(new Error('All download strategies failed for this video.'), 'VideoDownloader');
            alert('Failed to download video using all available methods. You might need to use browser developer tools or specific extensions.');
        }
    }
}

export default VideoDownloader;