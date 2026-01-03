/**
 * ThrottleService - A service for managing delays and throttling operations
 * 
 * Provides a simple interface for creating delays and managing throttled operations
 * that can be used by other services like AsyncQueueService.
 */
class ThrottleService {
    /**
     * Creates a delay for the specified number of milliseconds
     * 
     * @param {number} ms - The number of milliseconds to delay
     * @returns {Promise<void>} A promise that resolves after the delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Delay with periodic stop flag checking
     * Adds cancellation support using a stop flag getter function
     * 
     * @param {number} totalMs - Total milliseconds to delay
     * @param {Function} shouldStopGetter - Function that returns true if should stop
     * @param {string} errorMessage - Error message to throw if stopped
     * @param {number} checkIntervalMs - Interval to check stop flag (default 100ms)
     * @returns {Promise<void>} Resolves after delay or rejects if stopped
     */
    async delayWithStopCheck(totalMs, shouldStopGetter, errorMessage = 'Operation stopped by user', checkIntervalMs = 100) {
        const iterations = Math.ceil(totalMs / checkIntervalMs);
        for (let i = 0; i < iterations; i++) {
            if (shouldStopGetter()) {
                throw new Error(errorMessage);
            }
            await this.delay(checkIntervalMs);
        }
    }

    /**
     * Creates a throttled function that only invokes the provided function
     * at most once per every wait milliseconds
     * 
     * @param {Function} func - The function to throttle
     * @param {number} wait - The number of milliseconds to throttle invocations to
     * @param {Object} options - Throttle options
     * @param {boolean} options.leading - Whether to invoke on the leading edge
     * @param {boolean} options.trailing - Whether to invoke on the trailing edge
     * @returns {Function} The throttled function
     */
    throttle(func, wait, options = {}) {
        let timeout;
        let lastCallTime = 0;
        let lastArgs;
        let lastThis;
        let result;

        const { leading = true, trailing = true } = options;

        function invokeFunc() {
            const args = lastArgs;
            const thisArg = lastThis;
            
            lastArgs = lastThis = undefined;
            result = func.apply(thisArg, args);
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
            
            if (trailing && lastArgs) {
                return invokeFunc();
            }
            
            lastArgs = lastThis = undefined;
            return result;
        }

        function leadingEdge() {
            timeout = startTimer(trailingEdge, wait);
            return leading ? invokeFunc() : result;
        }

        function cancel() {
            if (timeout !== undefined) {
                cancelTimer(timeout);
            }
            lastArgs = lastThis = undefined;
            timeout = undefined;
        }

        function flush() {
            return timeout === undefined ? result : trailingEdge();
        }

        function throttled(...args) {
            const time = Date.now();
            const timeSinceLastCall = time - lastCallTime;
            const shouldInvoke = lastCallTime === 0 || timeSinceLastCall >= wait;

            lastArgs = args;
            lastThis = this;

            if (shouldInvoke) {
                if (timeout === undefined) {
                    return leadingEdge();
                }
                if (timeout !== undefined) {
                    timeout = startTimer(trailingEdge, wait);
                    return invokeFunc();
                }
            }
            
            if (timeout === undefined) {
                timeout = startTimer(trailingEdge, wait);
            }
            
            return result;
        }

        throttled.cancel = cancel;
        throttled.flush = flush;
        
        return throttled;
    }
}

export default ThrottleService; 