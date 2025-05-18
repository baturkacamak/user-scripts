import Logger from '../../Logger';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class SourceTagStrategy extends BaseDownloadStrategy {
  constructor() {
    super('SourceTag');
  }

  async attempt(video, filename, {downloadFromUrl}) {
    const sourceElement = video.querySelector('source[src]');
    if (sourceElement?.src && !sourceElement.src.startsWith('blob:')) {
      Logger.debug(`Strategy ${this.strategyName}: Using <source> tag src attribute.`, sourceElement.src);
      await downloadFromUrl(sourceElement.src, filename);
      return true;
    }
    return false;
  }
}

export default SourceTagStrategy;
