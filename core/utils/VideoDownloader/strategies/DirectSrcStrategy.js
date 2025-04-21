import Logger from '../../Logger';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class DirectSrcStrategy extends BaseDownloadStrategy {
  constructor() {
    super('DirectSrc');
  }

  async attempt(video, filename, {downloadFromUrl}) {
    if (video.src && !video.src.startsWith('blob:')) {
      Logger.debug(`Strategy ${this.strategyName}: Using direct video src attribute.`, video.src);
      await downloadFromUrl(video.src, filename); // downloadFromUrl handles PubSub/logging for success/error
      return true; // Signal that download was initiated
    }
    return false; // Not applicable
  }
}

export default DirectSrcStrategy;
