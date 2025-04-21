import BaseStrategy from './BaseStrategy';

export default class HistoryApiStrategy extends BaseStrategy {
  constructor(callback) {
    super(callback);
    this._onChange = this._onChange.bind(this);
  }

  start() {
    ['pushState', 'replaceState'].forEach((method) => {
      const original = history[method];
      if (!original._patched) {
        history[method] = function(...args) {
          const result = original.apply(this, args);
          window.dispatchEvent(new Event('urlchange'));
          return result;
        };
        history[method]._patched = true;
      }
    });

    window.addEventListener('popstate', this._onChange);
    window.addEventListener('urlchange', this._onChange);
  }

  stop() {
    window.removeEventListener('popstate', this._onChange);
    window.removeEventListener('urlchange', this._onChange);
  }

  _onChange() {
    this.callback(location.href);
  }
}
