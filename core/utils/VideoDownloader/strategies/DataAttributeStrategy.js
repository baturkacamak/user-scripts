import Logger from '../../Logger';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class DataAttributeStrategy extends BaseDownloadStrategy {
  constructor() {
    super('DataAttribute');
  }

  async attempt(video, filename, {downloadFromUrl}) {
    const dataSrc = video.dataset.videoSrc || video.dataset.originalSrc || video.dataset.src;
    if (dataSrc && !dataSrc.startsWith('blob:')) {
      try {
        new URL(dataSrc); // Validate
        Logger.debug(`Strategy ${this.strategyName}: Using data-* attribute src.`, dataSrc);
        await downloadFromUrl(dataSrc, filename);
        return true;
      } catch (e) {
        Logger.warn(`Strategy ${this.strategyName}: Found data-* attribute, but it was not a valid URL.`, {
          dataSrc,
          error: e,
        });
        // Fall through to return false (not applicable/failed validation)
      }
    }
    return false;
  }
}

export default DataAttributeStrategy;
