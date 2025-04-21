import BaseStrategy from './BaseStrategy';
import Logger from '../../Logger';

export default class PollingStrategy extends BaseStrategy {
  constructor(callback, interval = 500) {
    super(callback);
    this.interval = interval;
    this.lastUrl = location.href;
  }

  start() {
    Logger.debug('PollingStrategy started');
    this.timer = setInterval(() => {
      const current = location.href;
      if (current !== this.lastUrl) {
        Logger.debug(`Polling detected change: ${this.lastUrl} → ${current}`);
        this.callback(current, this.lastUrl);
        this.lastUrl = current;
      }
    }, this.interval);
  }

  stop() {
    clearInterval(this.timer);
    Logger.debug('PollingStrategy stopped');
  }
}
