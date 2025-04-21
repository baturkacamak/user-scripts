class BaseDownloadStrategy {
  constructor(name) {
    if (this.constructor === BaseDownloadStrategy) {
      throw new Error('Abstract classes can\'t be instantiated.');
    }
    this.strategyName = name || this.constructor.name;
  }

  /**
     * Checks if this strategy is potentially applicable to the given video element.
     * Optional: Can be overridden by subclasses for quick filtering.
     * @param {HTMLVideoElement} video
     * @return {boolean}
     */
  isApplicable(video) { // eslint-disable-line no-unused-vars
    return true; // Default to true, attempt will do the real check
  }

  /**
     * Attempts to initiate a download using this strategy.
     * Must be implemented by subclasses.
     * @param {HTMLVideoElement} video - The video element.
     * @param {string} filename - The desired filename.
     * @param {Object} helpers - Utility functions { downloadFromUrl, downloadFromBlob, triggerDownload, recordFromStream, findJsonVideoUrls }
     * @return {Promise<boolean>} Resolves with `true` if download was successfully initiated, `false` if the strategy was not applicable or couldn't find a source, rejects on actual error during processing (e.g., fetch failed).
     * @abstract
     */
  async attempt(video, filename, helpers) { // eslint-disable-line no-unused-vars
    throw new Error('Method \'attempt()\' must be implemented.');
  }
}

export default BaseDownloadStrategy;
