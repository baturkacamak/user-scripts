import BaseStrategy from './BaseStrategy';

export default class HashChangeStrategy extends BaseStrategy {
  constructor(callback) {
    super(callback);
    this._onChange = this._onChange.bind(this);
  }

  start() {
    window.addEventListener('hashchange', this._onChange);
  }

  stop() {
    window.removeEventListener('hashchange', this._onChange);
  }

  _onChange() {
    this.callback(location.href);
  }
}
