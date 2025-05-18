/**
 * Debouncer - A utility class for creating debounced and throttled functions
 *
 * Provides sophisticated debouncing and throttling with options for immediate/delayed
 * execution, cancellation, and flushing of pending operations.
 */
class Debouncer {
  /**
     * Creates a debounced version of a function that delays invocation until after
     * a specified wait time has elapsed since the last time the debounced function was called.
     *
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The number of milliseconds to delay.
     * @param {Object} [options] - The options object.
     * @param {boolean} [options.leading=false] - Specify invoking on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] - Specify invoking on the trailing edge of the timeout.
     * @return {Function} Returns the new debounced function.
     */
  static debounce(func, wait, options = {}) {
    const {leading = false, trailing = true} = options;
    let timeout;
    let lastArgs;
    let lastThis;
    let lastCallTime;
    let result;
    let isInvoking = false;

    function invokeFunc() {
      const args = lastArgs;
      const thisArg = lastThis;

      lastArgs = lastThis = undefined;
      isInvoking = true;
      result = func.apply(thisArg, args);
      isInvoking = false;
      return result;
    }

    function startTimer(pendingFunc, wait) {
      return setTimeout(pendingFunc, wait);
    }

    function cancelTimer(id) {
      clearTimeout(id);
    }

    function trailingEdge() {
      timeout = undefined;

      // Only invoke if we have `lastArgs` which means `func` has been debounced at least once
      if (trailing && lastArgs) {
        return invokeFunc();
      }

      lastArgs = lastThis = undefined;
      return result;
    }

    function leadingEdge() {
      // Reset any `maxWait` timer
      timeout = startTimer(trailingEdge, wait);

      // Invoke the leading edge
      return leading ? invokeFunc() : result;
    }

    function cancel() {
      if (timeout !== undefined) {
        cancelTimer(timeout);
      }
      lastArgs = lastThis = lastCallTime = undefined;
      timeout = undefined;
    }

    function flush() {
      return timeout === undefined ? result : trailingEdge();
    }

    function debounced(...args) {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);

      lastArgs = args;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timeout === undefined) {
          return leadingEdge();
        }
        if (isInvoking) {
          // Handle invocations in a tight loop
          timeout = startTimer(trailingEdge, wait);
          return invokeFunc();
        }
      }
      if (timeout === undefined) {
        timeout = startTimer(trailingEdge, wait);
      }
      return result;
    }

    function shouldInvoke(time) {
      const timeSinceLastCall = time - (lastCallTime || 0);

      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
                (0 > timeSinceLastCall));
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  /**
     * Creates a throttled function that only invokes func at most once per
     * every wait milliseconds.
     *
     * @param {Function} func - The function to throttle.
     * @param {number} wait - The number of milliseconds to throttle invocations to.
     * @param {Object} [options] - The options object.
     * @param {boolean} [options.leading=true] - Specify invoking on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] - Specify invoking on the trailing edge of the timeout.
     * @return {Function} Returns the new throttled function.
     */
  static throttle(func, wait, options = {}) {
    return this.debounce(func, wait, {
      leading: false !== options.leading,
      trailing: false !== options.trailing,
    });
  }
}

export default Debouncer;
