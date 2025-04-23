/**
 * HoverAction - A utility class for triggering actions on hover before click
 *
 * This class implements the "preloading on hover" pattern where operations start when
 * a user hovers over an element rather than waiting for the click event. This improves
 * perceived performance as operations can be in progress or even complete by the time
 * the user clicks.
 */
import Logger from './Logger.js';
import PubSub from './PubSub.js';

class HoverAction {
  /**
     * Create a new HoverAction instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.element - Target element to watch for hover/click
     * @param {Function} options.action - Action to perform on hover (should return a Promise)
     * @param {Function} [options.onResult] - Callback when action completes (receives action result)
     * @param {Function} [options.onClick] - Optional callback for click event (receives action result if available)
     * @param {Function} [options.onProgress] - Optional callback for progress updates (for supported actions)
     * @param {string} [options.loadingClass] - Class to add during loading
     * @param {boolean} [options.executeOnlyOnce=false] - Whether the action should execute only once
     * @param {number} [options.hoverDelay=150] - Delay before triggering action on hover (ms)
     * @param {number} [options.hoverCancelDelay=100] - How quickly to cancel pending hover action if mouse leaves (ms)
     * @param {boolean} [options.supportTouch=true] - Whether to support touch devices
     * @param {number} [options.touchDelay=300] - Delay before triggering action on touch (ms)
     * @param {boolean} [options.abortOnLeave=true] - Whether to abort in-flight requests when mouse leaves
     * @param {number|null} [options.cacheTTL=null] - Time-to-live for cached results (ms, null = no expiration)
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @param {string} [options.namespace='hoveraction'] - Event namespace for PubSub
     */
  constructor(options) {
    // Required options
    this.element = options.element;
    this.action = options.action;

    // Optional settings with defaults
    this.onResult = options.onResult || null;
    this.onClick = options.onClick || null;
    this.onProgress = options.onProgress || null;
    this.loadingClass = options.loadingClass || null;
    this.executeOnlyOnce = options.executeOnlyOnce || false;
    this.hoverDelay = options.hoverDelay !== undefined ? options.hoverDelay : 150;
    this.hoverCancelDelay = options.hoverCancelDelay !== undefined ? options.hoverCancelDelay : 100;
    this.supportTouch = options.supportTouch !== undefined ? options.supportTouch : true;
    this.touchDelay = options.touchDelay !== undefined ? options.touchDelay : 300;
    this.abortOnLeave = options.abortOnLeave !== undefined ? options.abortOnLeave : true;
    this.cacheTTL = options.cacheTTL !== undefined ? options.cacheTTL : null;
    this.debug = options.debug || false;
    this.namespace = options.namespace || 'hoveraction';

    // State tracking
    this.hoverTimer = null;
    this.touchTimer = null;
    this.actionPromise = null;
    this.actionResult = null;
    this.actionExecuted = false;
    this.isLoading = false;
    this.abortController = null;
    this.cacheEntry = null;
    this.isTouchDevice = 'ontouchstart' in window || 0 < navigator.maxTouchPoints;

    // Bind handlers to preserve "this" context
    this._handleMouseEnter = this._handleMouseEnter.bind(this);
    this._handleMouseLeave = this._handleMouseLeave.bind(this);
    this._handleClick = this._handleClick.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);

    // Initialize
    this._init();
  }

  /**
     * Force execute the action regardless of hover state
     * Useful for programmatic triggering
     * @return {Promise} Promise resolving to action result
     */
  execute() {
    return this._executeAction();
  }

  /**
     * Reset the state to allow re-execution even when executeOnlyOnce is true
     * @param {boolean} [clearCache=true] - Whether to clear the cached result
     */
  reset(clearCache = true) {
    this.actionExecuted = false;

    if (clearCache) {
      this.actionResult = null;
      this.cacheEntry = null;
    }

    this.actionPromise = null;

    // Abort any in-flight actions
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this._setLoading(false);

    if (this.debug) {
      Logger.debug('[HoverAction]', 'State reset' + (clearCache ? ' with cache cleared' : ', cache preserved'));
    }
  }

  /**
     * Clean up event listeners and resources
     */
  destroy() {
    // Remove event listeners
    if (this.element) {
      this.element.removeEventListener('mouseenter', this._handleMouseEnter);
      this.element.removeEventListener('mouseleave', this._handleMouseLeave);
      this.element.removeEventListener('click', this._handleClick);
    }

    // Clear any pending timers
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    // Remove loading class if present
    if (this.loadingClass && this.element) {
      this.element.classList.remove(this.loadingClass);
    }

    // Clear references
    this.actionPromise = null;
    this.actionResult = null;

    if (this.debug) {
      Logger.debug('[HoverAction]', 'Destroyed');
    }
  }

  /**
     * Initialize event listeners and setup
     * @private
     */
  _init() {
    if (!this.element) {
      Logger.error('[HoverAction]', 'No target element provided');
      return;
    }

    if (!this.action || 'function' !== typeof this.action) {
      Logger.error('[HoverAction]', 'No action function provided');
      return;
    }

    // Add mouse event listeners
    this.element.addEventListener('mouseenter', this._handleMouseEnter);
    this.element.addEventListener('mouseleave', this._handleMouseLeave);
    this.element.addEventListener('click', this._handleClick);

    // Add touch event listeners if supported and on a touch device
    if (this.supportTouch && this.isTouchDevice) {
      this.element.addEventListener('touchstart', this._handleTouchStart, {passive: true});
      this.element.addEventListener('touchend', this._handleTouchEnd);
      this.element.addEventListener('touchcancel', this._handleTouchEnd);
      this.element.addEventListener('touchmove', this._handleTouchMove, {passive: true});

      if (this.debug) {
        Logger.debug('[HoverAction]', 'Touch support enabled');
      }
    }

    if (this.debug) {
      Logger.debug('[HoverAction]', 'Initialized for element', this.element);
    }
  }


  /**
     * Handle mouse enter event
     * @param {MouseEvent} e - Mouse event
     * @private
     */
  _handleMouseEnter(e) {
    // Clear any previous timer to avoid race conditions
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }

    // If we've already executed a one-time action, don't proceed
    if (this.executeOnlyOnce && this.actionExecuted) {
      if (this.debug) {
        Logger.debug('[HoverAction]', 'Action already executed once, not initiating again');
      }
      return;
    }

    // Set timer to trigger the action after the hover delay
    this.hoverTimer = setTimeout(() => {
      this._executeAction();
    }, this.hoverDelay);

    if (this.debug) {
      Logger.debug('[HoverAction]', 'Mouse entered, scheduled action in', this.hoverDelay, 'ms');
    }
  }


  /**
     * Handle mouse leave event
     * @param {MouseEvent} e - Mouse event
     * @private
     */
  _handleMouseLeave(e) {
    // If we have a pending hover timer, cancel it
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
      if (this.debug) {
        Logger.debug('[HoverAction]', 'Mouse left, canceled pending action');
      }
    }

    // If configured to abort on leave and we have an active request
    if (this.abortOnLeave && this.abortController && !this.actionExecuted) {
      this.abortController.abort();
      this.abortController = null;
      this._setLoading(false);

      if (this.debug) {
        Logger.debug('[HoverAction]', 'Aborted in-flight request on mouse leave');
      }

      // Publish abort event
      PubSub.publish(`${this.namespace}:abort`, {
        element: this.element,
        reason: 'mouseleave',
      });
    }
  }

  /**
     * Handle click event
     * @param {MouseEvent} e - Mouse event
     * @private
     */
  _handleClick(e) {
    if (this.debug) {
      Logger.debug('[HoverAction]', 'Click detected');
    }

    // Cancel any pending hover timer
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    if (this.actionPromise && !this.actionExecuted) {
      // Action is in progress but not completed
      if (this.debug) {
        Logger.debug('[HoverAction]', 'Action in progress, waiting for completion before handling click');
      }
      this.actionPromise
          .then((result) => {
            this._handleClickWithResult(result, e);
          })
          .catch((error) => {
            Logger.error('[HoverAction]', 'Error in pending action during click:', error);
            this._handleClickWithResult(null, e);
          });
    } else if (this.actionExecuted && this.actionResult) {
      // Action already completed, use cached result
      if (this.debug) {
        Logger.debug('[HoverAction]', 'Using previously cached result for click');
      }
      this._handleClickWithResult(this.actionResult, e);
    } else {
      // No action started yet, start it now
      if (this.debug) {
        Logger.debug('[HoverAction]', 'No action in progress, executing now for click');
      }
      this._executeAction()
          .then((result) => {
            this._handleClickWithResult(result, e);
          })
          .catch((error) => {
            Logger.error('[HoverAction]', 'Error executing action on click:', error);
            this._handleClickWithResult(null, e);
          });
    }
  }

  /**
     * Handle click with an action result
     * @param {*} result - Result from the action
     * @param {MouseEvent} originalEvent - Original click event
     * @private
     */
  _handleClickWithResult(result, originalEvent) {
    if (this.onClick && 'function' === typeof this.onClick) {
      try {
        this.onClick(result, originalEvent);
      } catch (error) {
        Logger.error('[HoverAction]', 'Error in onClick callback:', error);
      }
    }

    // Publish click event with result
    PubSub.publish(`${this.namespace}:click`, {
      element: this.element,
      result: result,
      event: originalEvent,
    });
  }

  /**
     * Execute the action
     * @return {Promise} Promise resolving to action result
     * @private
     */
  _executeAction() {
    // Check cache first if we have executed before
    if (this.executeOnlyOnce && this.actionExecuted) {
      // If using TTL, check if the cache has expired
      if (this.cacheEntry && !this.cacheEntry.isExpired()) {
        if (this.debug) {
          Logger.debug('[HoverAction]', 'Using cached result (TTL valid)');
        }
        return Promise.resolve(this.cacheEntry.data);
      } else if (this.cacheEntry && this.cacheEntry.isExpired()) {
        if (this.debug) {
          Logger.debug('[HoverAction]', 'Cache expired, re-executing action');
        }
        // Continue with execution since cache is expired
      } else if (this.actionResult) {
        if (this.debug) {
          Logger.debug('[HoverAction]', 'Using cached result (no TTL)');
        }
        return Promise.resolve(this.actionResult);
      }
    }

    // Start loading state
    this._setLoading(true);

    // Create abort controller for this request if needed
    if (this.abortOnLeave) {
      this.abortController = new AbortController();
    }

    // Publish action start event
    PubSub.publish(`${this.namespace}:start`, {
      element: this.element,
    });

    if (this.debug) {
      Logger.debug('[HoverAction]', 'Executing action');
    }

    try {
      // Execute the action with abort signal if available
      const actionOptions = this.abortController ? {signal: this.abortController.signal} : undefined;

      // Support for progress reporting
      const reportProgress = (progress) => {
        if (this.onProgress && 'function' === typeof this.onProgress) {
          this.onProgress(progress);
        }

        // Also publish a progress event
        PubSub.publish(`${this.namespace}:progress`, {
          element: this.element,
          progress: progress,
        });
      };

      // Execute action with proper context
      const actionPromise = 'function' === typeof this.action ?
                this.action(actionOptions, reportProgress) :
                Promise.resolve(this.action);

      // Store the promise
      this.actionPromise = Promise.resolve(actionPromise);

      // Handle success and error cases
      return this.actionPromise
          .then((result) => {
            if (this.debug) {
              Logger.debug('[HoverAction]', 'Action completed successfully');
            }

            // Store the result with TTL if specified
            if (null !== this.cacheTTL) {
              this.cacheEntry = new CacheEntry(result, this.cacheTTL);
            }

            this.actionResult = result;
            this.actionExecuted = true;

            // End loading state
            this._setLoading(false);

            // Clean up abort controller
            this.abortController = null;

            // Call result callback if provided
            if (this.onResult && 'function' === typeof this.onResult) {
              try {
                this.onResult(result);
              } catch (error) {
                Logger.error('[HoverAction]', 'Error in onResult callback:', error);
              }
            }

            // Publish action complete event
            PubSub.publish(`${this.namespace}:complete`, {
              element: this.element,
              result: result,
            });

            return result;
          })
          .catch((error) => {
            // Don't log aborted requests as errors
            if (error && 'AbortError' === error.name) {
              if (this.debug) {
                Logger.debug('[HoverAction]', 'Action aborted');
              }
            } else {
              Logger.error('[HoverAction]', 'Action failed:', error);
            }

            // End loading state
            this._setLoading(false);

            // Clean up abort controller
            this.abortController = null;

            // Publish appropriate event
            if (error && 'AbortError' === error.name) {
              PubSub.publish(`${this.namespace}:abort`, {
                element: this.element,
                reason: 'aborted',
              });
            } else {
              PubSub.publish(`${this.namespace}:error`, {
                element: this.element,
                error: error,
              });
            }

            throw error; // Re-throw to propagate the error
          });
    } catch (error) {
      Logger.error('[HoverAction]', 'Error initiating action:', error);
      this._setLoading(false);
      this.abortController = null;
      return Promise.reject(error);
    }
  }

  /**
     * Set loading state and update UI
     * @param {boolean} isLoading - Whether loading is in progress
     * @private
     */
  _setLoading(isLoading) {
    this.isLoading = isLoading;

    if (this.loadingClass) {
      if (isLoading) {
        this.element.classList.add(this.loadingClass);
      } else {
        this.element.classList.remove(this.loadingClass);
      }
    }

    // Update aria attributes for accessibility
    this.element.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }


  /**
     * Handle touch start event - starts a timer to trigger action
     * @param {TouchEvent} e - Touch event
     * @private
     */
  _handleTouchStart(e) {
    // Clear any previous timers
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
    }

    // If we've already executed a one-time action, don't proceed
    if (this.executeOnlyOnce && this.actionExecuted) {
      if (this.debug) {
        Logger.debug('[HoverAction]', 'Action already executed once, not initiating on touch');
      }
      return;
    }

    // Set timer to trigger the action after the touch delay
    this.touchTimer = setTimeout(() => {
      this._executeAction();
    }, this.touchDelay);

    if (this.debug) {
      Logger.debug('[HoverAction]', 'Touch started, scheduled action in', this.touchDelay, 'ms');
    }
  }

  /**
     * Handle touch end event - cancels pending timers
     * @param {TouchEvent} e - Touch event
     * @private
     */
  _handleTouchEnd(e) {
    // Clear touch timer
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;

      if (this.debug) {
        Logger.debug('[HoverAction]', 'Touch ended, canceled pending action');
      }
    }
  }

  /**
     * Handle touch move event - possibly cancel timer if moved too far
     * @param {TouchEvent} e - Touch event
     * @private
     */
  _handleTouchMove(e) {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;

      if (this.debug) {
        Logger.debug('[HoverAction]', 'Touch moved, canceled pending action');
      }
    }
  }
}

export default HoverAction;
