/**
 * UserInteractionDetector - A utility class for detecting genuine user interactions
 *
 * Provides robust detection of user-initiated events vs programmatic ones
 * with multiple fallback mechanisms and integration with other utility classes.
 */
import Logger from './Logger.js';
import PubSub from './PubSub.js';

class UserInteractionDetector {
  /**
     * Get a singleton instance - this allows sharing the detector across modules
     * @param {Object} [options] - Configuration options (only used for first initialization)
     * @return {UserInteractionDetector} Singleton instance
     * @static
     */
  static getInstance(options = {}) {
    if (!window.UserInteractionDetector) {
      window.UserInteractionDetector = {};
    }

    if (!window.UserInteractionDetector._instance) {
      window.UserInteractionDetector._instance = new UserInteractionDetector(options);
    }

    return window.UserInteractionDetector._instance;
  }
  /**
     * Create a new UserInteractionDetector
     * @param {Object} options - Configuration options
     * @param {number} [options.interactionWindow=150] - Time window in ms to consider events related to user interaction
     * @param {number} [options.interactionThrottle=50] - Minimum ms between interaction broadcasts
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @param {string} [options.namespace='userscripts'] - Namespace for events
     * @param {boolean} [options.trackGlobalInteractions=true] - Whether to track interactions on document/window level
     * @param {boolean} [options.trackProgrammaticEvents=true] - Whether to track programmatic events like dispatchEvent
     */
  constructor(options = {}) {
    // Configuration
    this.interactionWindow = options.interactionWindow || 150; // Time window in ms
    this.interactionThrottle = options.interactionThrottle || 50; // Throttle in ms
    this.debug = options.debug || false;
    this.namespace = options.namespace || 'userscripts';
    this.trackGlobalInteractions = (false !== options.trackGlobalInteractions); // Default true
    this.trackProgrammaticEvents = (false !== options.trackProgrammaticEvents); // Default true

    // State tracking
    this._isInteracting = false;
    this._lastInteractionTime = 0;
    this._interactionTypes = new Set();
    this._lastEventTarget = null;
    this._lastEventType = null;
    this._interactionTimer = null;
    this._throttleTimer = null;
    this._overrideTimestamp = null;
    this._userInteractionCounter = 0;
    this._programmaticEventCounter = 0;
    this._patched = new Set();

    // Event tracking arrays
    this._recentEvents = [];
    this._trackedElements = new Map(); // element -> {events: [], handlers: []}

    // Initialize
    this._initTracking();

    // Log initialization
    if (this.debug) {
      Logger.debug('UserInteractionDetector initialized with options:', {
        interactionWindow: this.interactionWindow,
        interactionThrottle: this.interactionThrottle,
        namespace: this.namespace,
        trackGlobalInteractions: this.trackGlobalInteractions,
        trackProgrammaticEvents: this.trackProgrammaticEvents,
      });
    }
  }


  /**
     * Track a specific element for interaction events
     * You can use this for elements you want to specifically monitor
     * @param {HTMLElement} element - The element to track
     * @param {Array<string>} eventTypes - Event types to track
     * @param {Function} callback - Callback to invoke with interaction info
     * @return {Function} Unsubscribe function
     */
  trackElement(element, eventTypes = ['click', 'touchstart', 'keydown'], callback) {
    if (!element || !element.addEventListener) {
      this._logError('Invalid element provided to trackElement');
      return () => {
      }; // No-op unsubscribe
    }

    // Initialize tracking data for this element if needed
    if (!this._trackedElements.has(element)) {
      this._trackedElements.set(element, {
        events: [],
        handlers: [],
      });
    }

    const elementData = this._trackedElements.get(element);
    const handlers = [];

    // Create handler for each event type
    eventTypes.forEach((eventType) => {
      const handler = (e) => {
        const isUserInitiated = this.isUserEvent(e);
        const interactionData = {
          event: e,
          timestamp: Date.now(),
          isUserInitiated,
          globalInteracting: this._isInteracting,
          timeSinceLastInteraction: Date.now() - this._lastInteractionTime,
        };

        // Track this event
        elementData.events.unshift(interactionData);
        if (5 < elementData.events.length) {
          elementData.events.pop();
        }

        // Call the callback
        callback(interactionData);
      };

      // Attach the handler
      element.addEventListener(eventType, handler);
      handlers.push({eventType, handler});
      elementData.handlers.push({eventType, handler});
    });

    this._log(`Now tracking ${eventTypes.join(', ')} events on element:`, element);

    // Return unsubscribe function
    return () => {
      handlers.forEach(({eventType, handler}) => {
        element.removeEventListener(eventType, handler);

        // Remove from tracked handlers
        if (this._trackedElements.has(element)) {
          const data = this._trackedElements.get(element);
          data.handlers = data.handlers.filter((h) => h.handler !== handler);

          // Clean up if no more handlers
          if (0 === data.handlers.length) {
            this._trackedElements.delete(element);
          }
        }
      });

      this._log('Unsubscribed from element events');
    };
  }

  /**
     * Check if an event was initiated by a real user interaction
     * @param {Event} event - The event to check
     * @return {boolean} True if the event was likely initiated by a user
     */
  isUserEvent(event) {
    if (!event) return false;

    // Primary check: isTrusted property (most reliable)
    if (event.isTrusted) {
      return true;
    }

    // Secondary check: event occurred during known interaction window
    if (this._isInteracting) {
      const timeSinceInteraction = Date.now() - this._lastInteractionTime;
      if (timeSinceInteraction < this.interactionWindow) {
        this._log(`Event occurred ${timeSinceInteraction}ms after user interaction`);
        return true;
      }
    }

    // Tertiary check: was the event part of a trusted cascade?
    // (sometimes events trigger other events programmatically, but they're still part of user input)
    const cascadeWindow = 50; // ms to consider event cascades
    const recentTrustedEvents = this._recentEvents.filter((e) =>
      e.trusted && Date.now() - e.timestamp < cascadeWindow,
    );

    if (0 < recentTrustedEvents.length) {
      this._log(`Event may be part of trusted cascade (${recentTrustedEvents.length} recent trusted events)`);
      return true;
    }

    // Special check for specific event types that are always user-initiated
    const alwaysUserEvents = ['beforeinput', 'mousedown', 'touchstart', 'keydown'];
    if (alwaysUserEvents.includes(event.type) && !event._detectedByUserInteractionDetector) {
      this._log(`Event type ${event.type} is typically user-initiated`);
      return true;
    }

    return false;
  }

  /**
     * Check if an element's event was likely initiated by a real user
     * @param {HTMLElement} element - The element to check
     * @param {string} eventType - The type of event
     * @param {number} [timeWindow=500] - Time window to look back in ms
     * @return {boolean} True if there's evidence the user interacted with this element
     */
  didUserInteractWith(element, eventType, timeWindow = 500) {
    if (!element) return false;

    // First check if we're tracking this element
    if (this._trackedElements.has(element)) {
      const data = this._trackedElements.get(element);
      const recentEvents = data.events.filter((entry) =>
        entry.event.type === eventType &&
                Date.now() - entry.timestamp < timeWindow &&
                entry.isUserInitiated,
      );

      if (0 < recentEvents.length) {
        return true;
      }
    }

    // Fallback: check if this element was the last interaction target
    if (this._lastEventTarget === element &&
            this._lastEventType === eventType &&
            Date.now() - this._lastInteractionTime < timeWindow) {
      return true;
    }

    // Final fallback: check if element contains last interaction target
    if (this._lastEventTarget &&
            element.contains(this._lastEventTarget) &&
            Date.now() - this._lastInteractionTime < timeWindow) {
      return true;
    }

    return false;
  }

  /**
     * Check if the user is currently interacting with the page
     * @return {boolean} True if user interaction was detected within the interaction window
     */
  isInteracting() {
    return this._isInteracting;
  }

  /**
     * Get time (ms) since last user interaction
     * @return {number} Milliseconds since last interaction, or Infinity if no interaction yet
     */
  getTimeSinceLastInteraction() {
    if (0 === this._lastInteractionTime) return Infinity;
    return Date.now() - this._lastInteractionTime;
  }

  /**
     * Check if an interaction happened recently within the given time window
     * @param {number} withinMs - Time window in milliseconds
     * @return {boolean} True if interaction happened within the specified window
     */
  interactedWithin(withinMs) {
    return this.getTimeSinceLastInteraction() < withinMs;
  }
  /**
     * Get statistics about detected interactions
     * @return {Object} Interaction statistics
     */
  getStats() {
    return {
      isInteracting: this._isInteracting,
      lastInteractionTime: this._lastInteractionTime,
      timeSinceLastInteraction: this.getTimeSinceLastInteraction(),
      interactionTypes: Array.from(this._interactionTypes),
      userInteractionCount: this._userInteractionCounter,
      programmaticEventCount: this._programmaticEventCounter,
      trackedElements: this._trackedElements.size,
      recentEvents: this._recentEvents.length,
    };
  }
  /**
     * Reset all tracking state
     */
  reset() {
    this._resetInteractionState();
    this._lastInteractionTime = 0;
    this._userInteractionCounter = 0;
    this._programmaticEventCounter = 0;
    this._recentEvents = [];

    // Clear tracked elements
    this._trackedElements.forEach((data, element) => {
      data.handlers.forEach(({eventType, handler}) => {
        try {
          element.removeEventListener(eventType, handler);
        } catch (e) {
          // Element might be gone from DOM
        }
      });
    });
    this._trackedElements.clear();

    this._log('All tracking state reset');
  }
  /**
     * Clean up resources when detector is no longer needed
     */
  destroy() {
    this.reset();

    // Could unpatch event methods here, but it's generally safer
    // to leave them patched to avoid breaking other code

    this._log('Detector destroyed');
  }
  /**
     * Initialize event tracking
     * @private
     */
  _initTracking() {
    if (this.trackGlobalInteractions) {
      // Track global user interactions (capture phase to get them early)
      this._setupGlobalEventListeners();
    }

    if (this.trackProgrammaticEvents) {
      // Track programmatic events by patching EventTarget.prototype
      this._patchEventMethods();
    }
  }


  /**
     * Set up global event listeners to detect user interaction
     * @private
     */
  _setupGlobalEventListeners() {
    // Primary interaction events with capture to catch events early
    const interactionEvents = [
      'mousedown', 'mouseup', 'click', 'touchstart', 'touchend',
      'keydown', 'keyup', 'keypress', 'input', 'change', 'focus',
    ];

    const handleInteraction = this._handleGlobalInteraction.bind(this);

    interactionEvents.forEach((eventType) => {
      document.addEventListener(eventType, handleInteraction, {
        capture: true,
        passive: true, // For better performance
      });
    });

    // Special handling for scroll events (throttled)
    let scrollTimeout = null;
    const handleScroll = (e) => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleInteraction(e);
          scrollTimeout = null;
        }, 100); // Throttle scroll events
      }
    };

    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    });

    // Track window focus/blur for tab switching context
    window.addEventListener('focus', () => {
      this._log('Window focused');
      this._overrideTimestamp = Date.now();
    });

    window.addEventListener('blur', () => {
      this._log('Window blurred - resetting interaction state');
      this._resetInteractionState();
    });

    this._log('Global event listeners registered');
  }


  /**
     * Handle a global interaction event
     * @param {Event} e - The event object
     * @private
     */
  _handleGlobalInteraction(e) {
    // Only process trusted events from the user
    if (!e.isTrusted) {
      this._log(`Ignoring untrusted event: ${e.type}`);
      return;
    }

    // Track this event in the recent events list
    this._trackEvent(e);

    // Update interaction state
    this._setInteracting(e);
  }


  /**
     * Reset interaction state
     * @private
     */
  _resetInteractionState() {
    this._isInteracting = false;
    this._interactionTypes.clear();
    this._lastEventTarget = null;
    this._lastEventType = null;
    clearTimeout(this._interactionTimer);
    this._interactionTimer = null;

    // Emit an event about interaction end
    PubSub.publish(`${this.namespace}:interaction:end`, {
      timestamp: Date.now(),
      duration: Date.now() - this._lastInteractionTime,
    });

    this._log('Interaction state reset');
  }


  /**
     * Set interaction state and schedule timeout
     * @param {Event} e - The triggering event
     * @private
     */
  _setInteracting(e) {
    const now = Date.now();
    const wasInteracting = this._isInteracting;

    // Update state
    this._isInteracting = true;
    this._lastInteractionTime = now;
    this._interactionTypes.add(e.type);
    this._lastEventTarget = e.target;
    this._lastEventType = e.type;
    this._userInteractionCounter++;

    // Clear any existing timeout and set a new one
    clearTimeout(this._interactionTimer);
    this._interactionTimer = setTimeout(() => {
      this._log(`Interaction window timeout after ${this.interactionWindow}ms`);
      this._resetInteractionState();
    }, this.interactionWindow);

    // Emit event (throttled)
    if (!wasInteracting || !this._throttleTimer) {
      if (this._throttleTimer) {
        clearTimeout(this._throttleTimer);
      }

      // Immediate first notification
      this._emitInteractionEvent(e);

      // Throttle subsequent notifications
      this._throttleTimer = setTimeout(() => {
        this._throttleTimer = null;
      }, this.interactionThrottle);
    }
  }


  /**
     * Emit interaction event via PubSub
     * @param {Event} e - The triggering event
     * @private
     */
  _emitInteractionEvent(e) {
    PubSub.publish(`${this.namespace}:interaction`, {
      timestamp: Date.now(),
      event: {
        type: e.type,
        target: e.target,
      },
      interactionTypes: Array.from(this._interactionTypes),
      interactionCount: this._userInteractionCounter,
    });

    this._log(`Emitted interaction event for ${e.type}`);
  }


  /**
     * Track an event in the recent events list
     * @param {Event} e - The event object
     * @private
     */
  _trackEvent(e) {
    const eventData = {
      type: e.type,
      timestamp: Date.now(),
      target: e.target,
      trusted: e.isTrusted,
    };

    // Add to recent events, keeping last 10
    this._recentEvents.unshift(eventData);
    if (10 < this._recentEvents.length) {
      this._recentEvents.pop();
    }
  }


  /**
     * Patch event methods to detect programmatic events
     * @private
     */
  _patchEventMethods() {
    // Don't patch twice
    if (this._patched.has('events')) return;

    // Save original methods
    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;

    // Patch dispatchEvent
    EventTarget.prototype.dispatchEvent = function(event) {
      // Mark the event as detected by our utility
      event._detectedByUserInteractionDetector = true;

      // Track programmatic event
      if (window.UserInteractionDetector && window.UserInteractionDetector._instance) {
        window.UserInteractionDetector._instance._programmaticEventCounter++;

        window.UserInteractionDetector._instance._log(
            `Programmatic event detected: ${event.type} on ${this.tagName || 'EventTarget'}`,
        );
      }

      // Call original method
      return originalDispatchEvent.apply(this, arguments);
    };

    this._patched.add('events');
    this._log('Event methods patched to detect programmatic events');
  }


  /**
     * Private logging helper
     * @param {...any} args - Arguments to log
     * @private
     */
  _log(...args) {
    if (this.debug) {
      Logger.debug('[UserInteractionDetector]', ...args);
    }
  }

  /**
     * Private error logging helper
     * @param {...any} args - Arguments to log
     * @private
     */
  _logError(...args) {
    Logger.error('[UserInteractionDetector]', ...args);
  }
}

export default UserInteractionDetector;
