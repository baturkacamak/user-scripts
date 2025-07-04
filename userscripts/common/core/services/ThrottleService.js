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