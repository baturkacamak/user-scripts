/**
 * HoverAction - A utility class for triggering actions on hover, focus, or touch
 *
 * Implements the "preloading" pattern where operations start before the final click,
 * improving perceived performance. Includes debouncing, cancellation, caching, and more.
 * Prevents multiple initializations on the same element.
 */
import Logger from './Logger.js'; // Assuming Logger exists
import Debouncer from './Debouncer.js';

// Helper class for Cache Entries (implementation assumed)
class CacheEntry {
    constructor(data, ttl) {
        this.data = data;
        this.expires = Date.now() + ttl;
        this.ttl = ttl;
    }

    isExpired() {
        return Date.now() > this.expires;
    }
}


class HoverAction {
    // --- Static property for the initialization marker ---
    static HOVER_ACTION_INITIALIZED_ATTR = 'data-hoveraction-initialized';

    /**
     * Create a new HoverAction instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.element - Target element to watch for hover/click/focus
     * @param {Function} options.action - Action to perform (should return a Promise)
     * @param {Function} [options.onResult] - Callback when action completes (receives action result)
     * @param {Function} [options.onClick] - Optional callback for click event (receives action result if available)
     * @param {Function} [options.onProgress] - Optional callback for progress updates (receives progress data)
     * @param {string} [options.loadingClass] - Class to add during loading
     * @param {boolean} [options.executeOnlyOnce=false] - Whether the action should execute only once per instance lifetime (unless reset)
     * @param {'delay'|'debounce'} [options.triggerMode='delay'] - How hover/focus triggers the action ('delay' = setTimeout, 'debounce' = use Debouncer)
     * @param {number} [options.hoverDelay=150] - Delay before triggering action on hover (ms) - used for both modes
     * @param {number} [options.hoverCancelDelay=100] - (Currently less relevant with Debouncer/Abort) How quickly to cancel pending hover action if mouse leaves (ms)
     * @param {boolean} [options.supportFocus=true] - Enable triggering action on keyboard focus
     * @param {number} [options.focusDelay=150] - Delay before triggering action on focus (ms) - used for both modes
     * @param {boolean} [options.supportTouch=true] - Enable triggering action on touch devices
     * @param {number} [options.touchDelay=300] - Delay before triggering action on touch (ms)
     * @param {number} [options.touchMoveThreshold=10] - Pixels finger can move before cancelling touch action
     * @param {boolean} [options.abortOnLeave=true] - Whether to abort in-flight requests when mouse leaves
     * @param {boolean} [options.abortOnBlur=true] - Whether to abort in-flight requests when element loses focus
     * @param {number|null} [options.cacheTTL=null] - Time-to-live for cached results (ms, null = no expiration)
     * @param {string} [options.eventNamePrefix='hoveraction'] - Prefix for dispatched CustomEvents
     */
    constructor(options) {
        // --- Assign properties early for use in _init ---
        this.element = options.element;
        this.eventNamePrefix = options.eventNamePrefix || 'hoveraction';

        // --- Prevent multiple initializations ---
        if (!this.element || this.element.hasAttribute(HoverAction.HOVER_ACTION_INITIALIZED_ATTR)) {
            if (this.element) {
                Logger.warn(`[${this.eventNamePrefix}]`, 'HoverAction already initialized on this element. Skipping initialization.', this.element);
            } else {
                Logger.error(`[${this.eventNamePrefix}]`, 'No target element provided during construction.');
            }
            // Set a flag or return early to prevent further setup on this invalid instance
            this.isInitialized = false;
            return; // Prevent rest of constructor if already initialized or no element
        }
        this.isInitialized = true; // Flag to indicate successful initialization start


        // Required options
        this.action = options.action;

        // Optional settings with defaults
        this.onResult = options.onResult || null;
        this.onClick = options.onClick || null;
        this.onProgress = options.onProgress || null;
        this.loadingClass = options.loadingClass || null;
        this.executeOnlyOnce = options.executeOnlyOnce || false;
        this.triggerMode = options.triggerMode || 'delay';
        this.hoverDelay = options.hoverDelay !== undefined ? options.hoverDelay : 150;
        this.hoverCancelDelay = options.hoverCancelDelay !== undefined ? options.hoverCancelDelay : 100;
        this.supportFocus = options.supportFocus !== undefined ? options.supportFocus : true;
        this.focusDelay = options.focusDelay !== undefined ? options.focusDelay : this.hoverDelay;
        this.supportTouch = options.supportTouch !== undefined ? options.supportTouch : true;
        this.touchDelay = options.touchDelay !== undefined ? options.touchDelay : 300;
        this.touchMoveThreshold = options.touchMoveThreshold !== undefined ? options.touchMoveThreshold : 10;
        this.abortOnLeave = options.abortOnLeave !== undefined ? options.abortOnLeave : true;
        this.abortOnBlur = options.abortOnBlur !== undefined ? options.abortOnBlur : this.abortOnLeave;
        this.cacheTTL = options.cacheTTL !== undefined ? options.cacheTTL : null;

        // State tracking
        this.hoverTimer = null;
        this.focusTimer = null;
        this.touchTimer = null;
        this.touchStartX = null;
        this.touchStartY = null;

        this.actionPromise = null;
        this.actionResult = null;
        this.actionExecuted = false;
        this.isLoading = false;
        this.abortController = null;
        this.cacheEntry = null;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Debounced function instance (if needed)
        this.debouncedExecuteAction = null;

        // Bind handlers to preserve "this" context
        this._handleMouseEnter = this._handleMouseEnter.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        this._handleFocus = this._handleFocus.bind(this);
        this._handleBlur = this._handleBlur.bind(this);
        this._handleClick = this._handleClick.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);

        // Initialize
        this._init();
    }

    // --- Public Methods ---

    execute() {
        if (!this.isInitialized) return Promise.reject(new Error('HoverAction not initialized on this element.'));
        return this._executeAction();
    }

    reset(clearCache = true) {
        if (!this.isInitialized) return; // Don't operate on uninitialized instance

        this.actionExecuted = false;
        if (clearCache) {
            this.actionResult = null;
            this.cacheEntry = null;
            Logger.debug(`[${this.eventNamePrefix}]`, 'Cache cleared on reset');
        }
        this.actionPromise = null;

        // --- Abort existing action on reset ---
        this._abortAction('reset'); // Call the abort helper

        this._setLoading(false);
        this._clearTimers();

        Logger.debug(`[${this.eventNamePrefix}]`, 'State reset', clearCache ? 'with cache cleared' : ', cache preserved');
    }

    destroy() {
        if (!this.isInitialized) return; // Don't operate on uninitialized instance

        // --- Abort any in-flight action before removing listeners ---
        this._abortAction('destroy');

        // --- Remove Listeners ---
        if (this.element) {
            this.element.removeEventListener('mouseenter', this._handleMouseEnter);
            this.element.removeEventListener('mouseleave', this._handleMouseLeave);
            this.element.removeEventListener('click', this._handleClick);
            if (this.supportFocus) {
                this.element.removeEventListener('focus', this._handleFocus);
                this.element.removeEventListener('blur', this._handleBlur);
            }
            if (this.supportTouch && this.isTouchDevice) {
                this.element.removeEventListener('touchstart', this._handleTouchStart);
                this.element.removeEventListener('touchend', this._handleTouchEnd);
                this.element.removeEventListener('touchcancel', this._handleTouchEnd);
                this.element.removeEventListener('touchmove', this._handleTouchMove);
            }
            // --- Remove initialization marker ---
            this.element.removeAttribute(HoverAction.HOVER_ACTION_INITIALIZED_ATTR);
        }

        // --- Cleanup ---
        this._clearTimers();
        if (this.debouncedExecuteAction?.cancel) {
            this.debouncedExecuteAction.cancel();
        }
        if (this.loadingClass && this.element) {
            this.element.classList.remove(this.loadingClass);
        }
        this.actionPromise = null;
        this.actionResult = null;
        this.cacheEntry = null;
        this.isInitialized = false; // Mark as destroyed/uninitialized

        Logger.debug(`[${this.eventNamePrefix}]`, 'Destroyed');
    }

    // --- Initialization ---

    _init() {
        // Double check initialization status (already checked in constructor)
        if (!this.isInitialized) return;

        // Check for valid action function
        if (!this.action || typeof this.action !== 'function') {
            Logger.error(`[${this.eventNamePrefix}]`, 'No valid action function provided');
            this.isInitialized = false; // Mark as failed initialization
            return;
        }

        // --- Mark element as initialized ---
        this.element.setAttribute(HoverAction.HOVER_ACTION_INITIALIZED_ATTR, 'true');

        // Set up debouncer if needed
        if (this.triggerMode === 'debounce') {
            const delay = this.supportFocus ? Math.max(this.hoverDelay, this.focusDelay) : this.hoverDelay;
            this.debouncedExecuteAction = Debouncer.debounce(
                this._executeAction.bind(this),
                delay,
                {trailing: true, leading: false}
            );
            Logger.debug(`[${this.eventNamePrefix}]`, `Debounce mode enabled with delay ${delay}ms`);
        }

        // Add event listeners
        this.element.addEventListener('mouseenter', this._handleMouseEnter);
        this.element.addEventListener('mouseleave', this._handleMouseLeave);
        this.element.addEventListener('click', this._handleClick);

        if (this.supportFocus) {
            this.element.addEventListener('focus', this._handleFocus);
            this.element.addEventListener('blur', this._handleBlur);
            Logger.debug(`[${this.eventNamePrefix}]`, 'Focus support enabled');
        }

        if (this.supportTouch && this.isTouchDevice) {
            this.element.addEventListener('touchstart', this._handleTouchStart, {passive: true});
            this.element.addEventListener('touchend', this._handleTouchEnd);
            this.element.removeEventListener('touchcancel', this._handleTouchEnd); // Typo fixed: removeEventListener -> addEventListener
            this.element.addEventListener('touchcancel', this._handleTouchEnd);
            this.element.addEventListener('touchmove', this._handleTouchMove, {passive: true});
            Logger.debug(`[${this.eventNamePrefix}]`, 'Touch support enabled');
        }

        Logger.debug(`[${this.eventNamePrefix}]`, 'Initialized for element', this.element);
    }

    _handleMouseEnter(e) {
        if (!this.isInitialized) return;
        this._initiateActionTrigger('hover');
    }

    _handleMouseLeave(e) {
        if (!this.isInitialized) return;
        this._cancelActionTrigger('hover');
        if (this.abortOnLeave) {
            this._abortAction('mouseleave');
        }
    }

    _handleFocus(e) {
        if (!this.isInitialized) return;
        this._initiateActionTrigger('focus');
    }

    _handleBlur(e) {
        if (!this.isInitialized) return;
        this._cancelActionTrigger('focus');
        if (this.abortOnBlur) {
            this._abortAction('blur');
        }
    }

    _handleClick(e) {
        if (!this.isInitialized) return;
        Logger.debug(`[${this.eventNamePrefix}]`, 'Click detected');
        this._clearTimers(); // Clear any pending timed triggers

        // If debouncing, flush any pending call immediately
        if (this.triggerMode === 'debounce' && this.debouncedExecuteAction?.flush) {
            Logger.debug(`[${this.eventNamePrefix}]`, 'Flushing debounced action for click');
            this.debouncedExecuteAction.flush();
        }

        if (this.actionPromise && !this.actionExecuted) {
            Logger.debug(`[${this.eventNamePrefix}]`, 'Action in progress, waiting for completion before handling click');
            this.actionPromise
                .then((result) => this._handleClickWithResult(result, e))
                .catch((error) => {
                    if (error && error.name !== 'AbortError') {
                        Logger.error(`[${this.eventNamePrefix}]`, 'Error in pending action during click:', error);
                    }
                    this._handleClickWithResult(null, e);
                });
        } else if (this.actionExecuted) { // Check cache validity inside this block
            let useCached = false;
            let cachedResult = null;
            if (this.cacheEntry && !this.cacheEntry.isExpired()) {
                useCached = true;
                cachedResult = this.cacheEntry.data;
                Logger.debug(`[${this.eventNamePrefix}]`, 'Using TTL-valid cached result for click');
            } else if (!this.cacheEntry && this.actionResult !== undefined) { // No TTL, but result exists
                useCached = true;
                cachedResult = this.actionResult;
                Logger.debug(`[${this.eventNamePrefix}]`, 'Using non-TTL cached result for click');
            }

            if (useCached) {
                this._handleClickWithResult(cachedResult, e);
            } else {
                Logger.debug(`[${this.eventNamePrefix}]`, 'No valid cached result, executing action now for click');
                this._executeAction()
                    .then((result) => this._handleClickWithResult(result, e))
                    .catch((error) => {
                        Logger.error(`[${this.eventNamePrefix}]`, 'Error executing action on click:', error);
                        this._handleClickWithResult(null, e);
                    });
            }
        } else {
            // No action started or cached, start it now
            Logger.debug(`[${this.eventNamePrefix}]`, 'No action started, executing now for click');
            this._executeAction()
                .then((result) => this._handleClickWithResult(result, e))
                .catch((error) => {
                    Logger.error(`[${this.eventNamePrefix}]`, 'Error executing action on click:', error);
                    this._handleClickWithResult(null, e);
                });
        }
    }

    _handleTouchStart(e) {
        if (!this.isInitialized) return;
        this._clearTimers('touch');
        if (e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        } else {
            this.touchStartX = null;
            this.touchStartY = null;
        }
        if (this._shouldExecute()) {
            this.touchTimer = setTimeout(() => {
                Logger.debug(`[${this.eventNamePrefix}]`, 'Touch delay finished, executing action');
                this._executeAction();
            }, this.touchDelay);
            Logger.debug(`[${this.eventNamePrefix}]`, 'Touch started, scheduled action in', this.touchDelay, 'ms');
        }
    }

    _handleTouchEnd(e) {
        if (!this.isInitialized) return;
        this._clearTimers('touch');
        this.touchStartX = null;
        this.touchStartY = null;
        Logger.debug(`[${this.eventNamePrefix}]`, 'Touch ended/cancelled');
    }

    _handleTouchMove(e) {
        if (!this.isInitialized) return;
        if (this.touchTimer && this.touchStartX !== null && this.touchStartY !== null && e.touches.length > 0) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - this.touchStartX;
            const deltaY = currentY - this.touchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > this.touchMoveThreshold) {
                this._clearTimers('touch');
                this.touchStartX = null;
                this.touchStartY = null;
                Logger.debug(`[${this.eventNamePrefix}]`, 'Touch moved beyond threshold, cancelled pending action');
            }
        }
    }


    _initiateActionTrigger(type = 'hover') { // type: 'hover' | 'focus'
        const delay = type === 'focus' ? this.focusDelay : this.hoverDelay;
        const timerProp = type === 'focus' ? 'focusTimer' : 'hoverTimer';

        this._clearTimers(timerProp); // Clear specific timer

        if (!this._shouldExecute()) return;

        if (this.triggerMode === 'debounce') {
            Logger.debug(`[${this.eventNamePrefix}]`, `${type} detected, triggering debounced action (delay: ${delay}ms)`);
            this.debouncedExecuteAction();
        } else { // 'delay' mode
            this[timerProp] = setTimeout(() => {
                Logger.debug(`[${this.eventNamePrefix}]`, `${type} delay finished, executing action`);
                // Ensure we clear the timer ref *before* executing
                this[timerProp] = null;
                this._executeAction();
            }, delay);
            Logger.debug(`[${this.eventNamePrefix}]`, `${type} detected, scheduled action in ${delay}ms`);
        }
    }

    _cancelActionTrigger(type = 'hover') { // type: 'hover' | 'focus'
        const timerProp = type === 'focus' ? 'focusTimer' : 'hoverTimer';

        if (this.triggerMode === 'debounce') {
            if (this.debouncedExecuteAction?.cancel) {
                this.debouncedExecuteAction.cancel();
                Logger.debug(`[${this.eventNamePrefix}]`, `${type} ended, cancelled pending debounced action`);
            }
        } else { // 'delay' mode
            this._clearTimers(timerProp); // Clear specific timer
        }
    }

    _clearTimers(timerType = null) {
        let cleared = false;
        if ((timerType === 'hover' || timerType === null) && this.hoverTimer) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
            cleared = true;
        }
        if ((timerType === 'focus' || timerType === null) && this.focusTimer) {
            clearTimeout(this.focusTimer);
            this.focusTimer = null;
            cleared = true;
        }
        if ((timerType === 'touch' || timerType === null) && this.touchTimer) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
            cleared = true;
        }
        if (cleared) Logger.debug(`[${this.eventNamePrefix}]`, `Cleared timers for type: ${timerType || 'all'}`);
    }

    _shouldExecute() {
        // Added check for initialization status
        if (!this.isInitialized) return false;

        if (this.executeOnlyOnce && this.actionExecuted) {
            if (this.cacheEntry && !this.cacheEntry.isExpired()) {
                Logger.debug(`[${this.eventNamePrefix}]`, '_shouldExecute: false (executed once, cache valid)');
                return false;
            } else if (this.cacheEntry && this.cacheEntry.isExpired()) {
                Logger.debug(`[${this.eventNamePrefix}]`, '_shouldExecute: true (executed once, cache expired)');
                return true;
            } else if (!this.cacheEntry && this.actionResult !== undefined) {
                Logger.debug(`[${this.eventNamePrefix}]`, '_shouldExecute: false (executed once, no TTL cache)');
                return false;
            }
        }
        if (this.isLoading) Logger.debug(`[${this.eventNamePrefix}]`, '_shouldExecute: called while loading=true');
        return true;
    }

    /** Aborts the current action if conditions met */
    _abortAction(reason = 'unknown') {
        if (this.abortController && !this.actionExecuted && this.isLoading) {
            Logger.debug(`[${this.eventNamePrefix}]`, `Aborting action due to ${reason}`);
            this.abortController.abort(reason);
            this._setLoading(false); // Ensure loading state is reset
        }
    }

    _executeAction() {
        // Added check for initialization status
        if (!this.isInitialized) return Promise.reject(new Error('HoverAction not initialized'));

        if (this.isLoading) {
            Logger.debug(`[${this.eventNamePrefix}]`, 'ExecuteAction: Action execution attempt while already loading, ignoring.');
            return this.actionPromise || Promise.reject(new Error('Action already in progress'));
        }

        if (this.executeOnlyOnce && this.actionExecuted) {
            if (this.cacheEntry && !this.cacheEntry.isExpired()) {
                Logger.debug(`[${this.eventNamePrefix}]`, 'ExecuteAction: Using cached result (TTL valid)');
                return Promise.resolve(this.cacheEntry.data);
            } else if (!this.cacheEntry && this.actionResult !== undefined) { // Check for undefined specifically
                Logger.debug(`[${this.eventNamePrefix}]`, 'ExecuteAction: Using cached result (no TTL)');
                return Promise.resolve(this.actionResult);
            }
            if (this.cacheEntry && this.cacheEntry.isExpired()) {
                Logger.debug(`[${this.eventNamePrefix}]`, 'ExecuteAction: Cache expired, proceeding.');
            }
        }

        this._setLoading(true);
        this.abortController = new AbortController(); // Always create a fresh one

        this._dispatchEvent('start');
        Logger.debug(`[${this.eventNamePrefix}]`, 'Executing action...');

        try {
            const actionOptions = {signal: this.abortController.signal};
            const reportProgress = (progress) => {
                // Check if this action is still current (not aborted) before reporting
                if (!this.abortController?.signal.aborted) {
                    if (this.onProgress && typeof this.onProgress === 'function') {
                        try {
                            this.onProgress(progress);
                        } catch (e) {
                            Logger.error(`[${this.eventNamePrefix}]`, 'Error in onProgress callback:', e);
                        }
                    }
                    this._dispatchEvent('progress', {progress});
                }
            };

            const actionResultPromise = Promise.resolve(this.action(actionOptions, reportProgress));
            this.actionPromise = actionResultPromise;

            return actionResultPromise.then((result) => {
                // Explicitly check the signal *associated with this promise* upon resolution
                if (actionOptions.signal.aborted) {
                    Logger.debug(`[${this.eventNamePrefix}]`, 'Action completed but was aborted, ignoring result.');
                    // AbortError will be caught by the .catch block below
                    throw new DOMException(actionOptions.signal.reason || 'Aborted', 'AbortError');
                }

                Logger.debug(`[${this.eventNamePrefix}]`, 'Action completed successfully.');
                this.actionResult = result;
                this.actionExecuted = true;
                if (this.cacheTTL !== null) {
                    this.cacheEntry = new CacheEntry(result, this.cacheTTL);
                    Logger.debug(`[${this.eventNamePrefix}]`, 'Result cached with TTL:', this.cacheTTL);
                }
                // Clear the controller *only* on successful, non-aborted completion
                this.abortController = null;
                this._setLoading(false);

                if (this.onResult && typeof this.onResult === 'function') {
                    try {
                        this.onResult(result);
                    } catch (e) {
                        Logger.error(`[${this.eventNamePrefix}]`, 'Error in onResult callback:', e);
                    }
                }
                this._dispatchEvent('complete', {result});
                return result;
            })
                .catch((error) => {
                    if (error && error.name === 'AbortError') {
                        Logger.debug(`[${this.eventNamePrefix}]`, 'Action aborted cleanly.');
                        this._setLoading(false); // Ensure loading is off
                        this.abortController = null; // Clean controller ref
                        this._dispatchEvent('abort', {reason: error.message || 'aborted'});
                    } else {
                        Logger.error(`[${this.eventNamePrefix}]`, 'Action failed:', error);
                        this._setLoading(false); // Ensure loading is off
                        this.abortController = null; // Clean controller ref
                        this._dispatchEvent('error', {error});
                    }
                    this.actionPromise = null;
                    throw error;
                });
        } catch (error) {
            Logger.error(`[${this.eventNamePrefix}]`, 'Error initiating action:', error);
            this._setLoading(false); // Ensure loading is off
            this.abortController = null; // Clean controller ref
            this._dispatchEvent('error', {error});
            this.actionPromise = null;
            return Promise.reject(error);
        }
    }

    // --- UI & State Helpers (No changes needed below for these specific requests) ---
    _setLoading(isLoading) {
        if (this.isLoading === isLoading) return;
        this.isLoading = isLoading;
        if (this.loadingClass) {
            this.element.classList.toggle(this.loadingClass, isLoading);
        }
        this.element.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        Logger.debug(`[${this.eventNamePrefix}]`, 'Loading state set to:', isLoading);
    }

    _handleClickWithResult(result, originalEvent) {
        if (this.onClick && typeof this.onClick === 'function') {
            try {
                this.onClick(result, originalEvent);
            } catch (error) {
                Logger.error(`[${this.eventNamePrefix}]`, 'Error in onClick callback:', error);
            }
        }
        this._dispatchEvent('click', {result, event: originalEvent});
    }

    _dispatchEvent(eventName, detail = {}) {
        if (!this.element) return; // Don't dispatch if element is gone
        const event = new CustomEvent(`${this.eventNamePrefix}:${eventName}`, {
            detail: {
                ...detail,
                sourceElement: this.element,
            },
            bubbles: true,
            cancelable: true
        });
        try { // Add try-catch around dispatchEvent for robustness
            this.element.dispatchEvent(event);
        } catch (dispatchError) {
            Logger.error(`[${this.eventNamePrefix}]`, `Error dispatching event ${eventName}:`, dispatchError);
        }
    }

} // End of HoverAction class

export default HoverAction;