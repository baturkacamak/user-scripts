import Logger from '../Logger';
import PubSub from '../PubSub';

export default class UrlChangeWatcher {
  constructor(strategies = [], fireImmediately = true) {
    this.strategies = strategies;
    this.fireImmediately = fireImmediately;
    this.lastUrl = location.href;
    this.active = false;
  }

  start() {
    if (this.active) return;
    this.active = true;
    Logger.debug('UrlChangeWatcher (Strategy) started');

    this.strategies.forEach((strategy) =>
      strategy.start?.(this._handleChange.bind(this)),
    );

    if (this.fireImmediately) {
      this._handleChange(location.href, null, true);
    }
  }

  stop() {
    this.active = false;
    this.strategies.forEach((strategy) => strategy.stop?.());
    Logger.debug('UrlChangeWatcher (Strategy) stopped');
  }

  _handleChange(newUrl, oldUrl = this.lastUrl, force = false) {
    if (!force && newUrl === this.lastUrl) return;
    Logger.debug(`URL changed: ${oldUrl} → ${newUrl}`);

    this.lastUrl = newUrl;

    if (PubSub?.publish) {
      PubSub.publish('urlchange', {newUrl, oldUrl});
    }
  }
}
