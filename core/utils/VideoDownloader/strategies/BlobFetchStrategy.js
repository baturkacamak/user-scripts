import Logger from '../../Logger';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class BlobFetchStrategy extends BaseDownloadStrategy {
  constructor() {
    super('BlobFetch');
  }

  async attempt(video, filename, {downloadFromBlob}) {
    if (video.src && video.src.startsWith('blob:')) {
      Logger.debug(`Strategy ${this.strategyName}: Attempting to fetch blob URL.`, video.src);
      try {
        const response = await fetch(video.src);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        if (0 < blob.size && blob.type?.startsWith('video/')) {
          Logger.debug(`Strategy ${this.strategyName}: Fetched blob successfully via fetch().`, {
            size: blob.size,
            type: blob.type,
          });
          await downloadFromBlob(blob, filename); // downloadFromBlob handles PubSub/logging
          return true; // Initiated
        } else {
          Logger.warn(`Strategy ${this.strategyName}: Fetched blob appears empty or has non-video type.`, {
            size: blob.size,
            type: blob.type,
          });
          return false; // Not applicable (invalid blob)
        }
      } catch (err) {
        Logger.error(err, `Strategy ${this.strategyName}: Fetching blob URL failed.`);
        // Let the main loop catch this error by re-throwing
        throw err;
      }
    }
    return false; // Not applicable (src is not a blob)
  }
}

export default BlobFetchStrategy;
