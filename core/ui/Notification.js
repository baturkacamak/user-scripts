/**
 * Notification - A reusable UI component for toast notifications.
 * Creates customizable, temporary notifications that appear and disappear automatically.
 */
import StyleManager from '../utils/StyleManager.js';
import Logger from '../utils/Logger.js';

/**
 * A reusable UI component for creating toast notifications that provide non-intrusive
 * feedback to users.
 */
class Notification {
    /**
     * Storage for the notification container elements by position
     * @private
     */
    static _containers = {};
    /**
     * Storage for all active notifications
     * @private
     */
    static _activeNotifications = [];
    /**
     * Counter for generating unique notification IDs
     * @private
     */
    static _idCounter = 0;
    /**
     * Maximum number of notifications to show per container
     * @private
     */
    static _maxNotificationsPerContainer = 5;
    /**
     * Queue for notifications waiting to be shown
     * @private
     */
    static _queue = [];

    /**
     * Returns the unique base CSS class for the Notification component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for notifications.
     */
    static get BASE_NOTIFICATION_CLASS() {
        return 'userscripts-notification';
    }

    /**
     * Returns the CSS variable prefix used for theming the Notification component.
     * This prefix scopes all custom CSS variables related to the notification.
     *
     * @return {string} The CSS variable prefix.
     */
    static get CSS_VAR_PREFIX() {
        return '--userscripts-notification-';
    }

    /**
     * Initialize styles for all notifications.
     * These styles reference the CSS variables with our defined prefix.
     */
    static initStyles() {
        if (Notification.stylesInitialized) return;

        StyleManager.addStyles(`
      /* Container for all notifications */
      .${Notification.BASE_NOTIFICATION_CLASS}-container {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        pointer-events: none; /* Allow clicking through the container */
        
        /* Default positioning at bottom center */
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        left: 50%;
        transform: translateX(-50%);
        
        /* Container width */
        width: var(${Notification.CSS_VAR_PREFIX}container-width, auto);
        max-width: var(${Notification.CSS_VAR_PREFIX}container-max-width, 350px);
      }
      
      /* Position variants */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        bottom: auto;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        left: var(${Notification.CSS_VAR_PREFIX}container-left, 16px);
        bottom: auto;
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right {
        top: var(${Notification.CSS_VAR_PREFIX}container-top, 16px);
        right: var(${Notification.CSS_VAR_PREFIX}container-right, 16px);
        left: auto;
        bottom: auto;
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-left {
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        left: var(${Notification.CSS_VAR_PREFIX}container-left, 16px);
        transform: none;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-right {
        bottom: var(${Notification.CSS_VAR_PREFIX}container-bottom, 16px);
        right: var(${Notification.CSS_VAR_PREFIX}container-right, 16px);
        left: auto;
        transform: none;
      }
      
      /* Individual notification toast */
      .${Notification.BASE_NOTIFICATION_CLASS} {
        position: relative;
        display: flex;
        align-items: center;
        padding: var(${Notification.CSS_VAR_PREFIX}padding, 12px 16px);
        border-radius: var(${Notification.CSS_VAR_PREFIX}border-radius, 6px);
        box-shadow: var(${Notification.CSS_VAR_PREFIX}shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
        color: var(${Notification.CSS_VAR_PREFIX}color, #fff);
        font-family: var(${Notification.CSS_VAR_PREFIX}font-family, inherit);
        font-size: var(${Notification.CSS_VAR_PREFIX}font-size, 14px);
        line-height: var(${Notification.CSS_VAR_PREFIX}line-height, 1.5);
        opacity: 0;
        transform: translateY(100%);
        transition: transform 0.3s ease, opacity 0.3s ease;
        pointer-events: auto; /* Make the notification clickable */
        max-width: 100%;
        box-sizing: border-box;
        width: 100%;
        overflow: hidden;
        
        /* Progress bar at the bottom */
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: var(${Notification.CSS_VAR_PREFIX}progress-height, 3px);
          background-color: var(${Notification.CSS_VAR_PREFIX}progress-color, rgba(255, 255, 255, 0.5));
          width: 100%;
          transform-origin: left;
          transform: scaleX(0);
        }
      }
      
      /* Visible notification */
      .${Notification.BASE_NOTIFICATION_CLASS}--visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Animation for progress bar */
      .${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after {
        animation-name: ${Notification.BASE_NOTIFICATION_CLASS}-progress;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      
      @keyframes ${Notification.BASE_NOTIFICATION_CLASS}-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
      
      /* Close button */
      .${Notification.BASE_NOTIFICATION_CLASS}-close {
        background: none;
        border: none;
        color: inherit;
        opacity: 0.7;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        margin-left: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-close:hover {
        opacity: 1;
      }
      
      /* Icon area */
      .${Notification.BASE_NOTIFICATION_CLASS}-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }
      
      /* Content area */
      .${Notification.BASE_NOTIFICATION_CLASS}-content {
        flex-grow: 1;
        word-break: break-word;
      }
      
      /* Types styling */
      .${Notification.BASE_NOTIFICATION_CLASS}--info {
        background-color: var(${Notification.CSS_VAR_PREFIX}info-bg, #3498db);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--success {
        background-color: var(${Notification.CSS_VAR_PREFIX}success-bg, #2ecc71);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--warning {
        background-color: var(${Notification.CSS_VAR_PREFIX}warning-bg, #f39c12);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}--error {
        background-color: var(${Notification.CSS_VAR_PREFIX}error-bg, #e74c3c);
      }
      
      /* Customizable style */
      .${Notification.BASE_NOTIFICATION_CLASS}--custom {
        background-color: var(${Notification.CSS_VAR_PREFIX}custom-bg, #7f8c8d);
      }
      
      /* Animation for top position variants */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center .${Notification.BASE_NOTIFICATION_CLASS},
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left .${Notification.BASE_NOTIFICATION_CLASS},
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right .${Notification.BASE_NOTIFICATION_CLASS} {
        transform: translateY(-100%);
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center .${Notification.BASE_NOTIFICATION_CLASS}--visible,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left .${Notification.BASE_NOTIFICATION_CLASS}--visible,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right .${Notification.BASE_NOTIFICATION_CLASS}--visible {
        transform: translateY(0);
      }
      
      /* Give slightly different vertical spacing based on position */
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-center,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-left,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--top-right {
        flex-direction: column;
      }
      
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-center,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-left,
      .${Notification.BASE_NOTIFICATION_CLASS}-container--bottom-right {
        flex-direction: column-reverse;
      }
      
      /* For reduced motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .${Notification.BASE_NOTIFICATION_CLASS} {
          transition: opacity 0.1s ease;
          transform: translateY(0);
        }
        
        .${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after {
          animation: none;
        }
      }
    `, 'userscripts-notification-styles');

        Notification.stylesInitialized = true;
    }

    /**
     * Injects default color variables for the notification component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
    static useDefaultColors() {
        const styleId = 'userscripts-notification-default-colors';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
        :root {
          /* Container styling */
          ${Notification.CSS_VAR_PREFIX}container-width: auto;
          ${Notification.CSS_VAR_PREFIX}container-max-width: 350px;
          ${Notification.CSS_VAR_PREFIX}container-bottom: 16px;
          ${Notification.CSS_VAR_PREFIX}container-top: 16px;
          ${Notification.CSS_VAR_PREFIX}container-left: 16px;
          ${Notification.CSS_VAR_PREFIX}container-right: 16px;
          
          /* Toast styling */
          ${Notification.CSS_VAR_PREFIX}font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          ${Notification.CSS_VAR_PREFIX}font-size: 14px;
          ${Notification.CSS_VAR_PREFIX}line-height: 1.5;
          ${Notification.CSS_VAR_PREFIX}padding: 12px 16px;
          ${Notification.CSS_VAR_PREFIX}border-radius: 6px;
          ${Notification.CSS_VAR_PREFIX}shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          ${Notification.CSS_VAR_PREFIX}color: #ffffff;
          
          /* Progress bar */
          ${Notification.CSS_VAR_PREFIX}progress-height: 3px;
          ${Notification.CSS_VAR_PREFIX}progress-color: rgba(255, 255, 255, 0.5);
          
          /* Toast types */
          ${Notification.CSS_VAR_PREFIX}info-bg: #3498db;
          ${Notification.CSS_VAR_PREFIX}success-bg: #2ecc71;
          ${Notification.CSS_VAR_PREFIX}warning-bg: #f39c12;
          ${Notification.CSS_VAR_PREFIX}error-bg: #e74c3c;
          ${Notification.CSS_VAR_PREFIX}custom-bg: #7f8c8d;
        }
      `;
            document.head.appendChild(style);
        }
    }

    /**
     * Creates and shows a notification.
     * @param {Object|string} options - Configuration options or message string
     * @param {string} [options.message] - The notification message
     * @param {string} [options.type='info'] - Notification type (info, success, warning, error, custom)
     * @param {number} [options.duration=3000] - How long to show the notification (ms)
     * @param {string} [options.position='bottom-center'] - Position (bottom-center, top-center, top-left, top-right, bottom-left, bottom-right)
     * @param {boolean} [options.showProgress=true] - Show progress bar
     * @param {boolean} [options.showClose=true] - Show close button
     * @param {Function} [options.onClick] - Callback when notification is clicked
     * @param {Function} [options.onClose] - Callback when notification closes
     * @param {string} [options.icon] - HTML for icon to display
     * @param {string} [options.className] - Additional CSS class
     * @param {boolean} [options.html=false] - Whether to interpret message as HTML
     * @param {Object} [options.style] - Custom inline styles for the notification
     * @return {string} ID of the created notification (can be used to close it)
     */
    static show(options) {
        // Initialize styles if not already done
        this.initStyles();

        // Allow passing just a message string
        if (typeof options === 'string') {
            options = {message: options};
        }

        // Set defaults
        const config = {
            message: '',
            type: 'info',
            duration: 3000,
            position: 'bottom-center',
            showProgress: true,
            showClose: true,
            onClick: null,
            onClose: null,
            icon: null,
            className: '',
            html: false,
            style: null,
            ...options
        };

        // Generate a unique ID for this notification
        const id = `${Notification.BASE_NOTIFICATION_CLASS}-${++this._idCounter}`;

        // Check if we're at the limit for the specified position
        const positionString = this._normalizePosition(config.position);
        const activeInPosition = this._activeNotifications.filter(n => n.position === positionString).length;

        // If we're at the limit, queue this notification
        if (activeInPosition >= this._maxNotificationsPerContainer) {
            this._queue.push({id, ...config});
            return id;
        }

        // Create and show the notification
        this._createNotification(id, config);
        return id;
    }

    /**
     * Convenience method to show an info notification
     * @param {string} message - The message to display
     * @param {Object} [options] - Additional options
     * @return {string} Notification ID
     */
    static info(message, options = {}) {
        return this.show({...options, message, type: 'info'});
    }

    /**
     * Convenience method to show a success notification
     * @param {string} message - The message to display
     * @param {Object} [options] - Additional options
     * @return {string} Notification ID
     */
    static success(message, options = {}) {
        return this.show({...options, message, type: 'success'});
    }

    /**
     * Convenience method to show a warning notification
     * @param {string} message - The message to display
     * @param {Object} [options] - Additional options
     * @return {string} Notification ID
     */
    static warning(message, options = {}) {
        return this.show({...options, message, type: 'warning'});
    }

    /**
     * Convenience method to show an error notification
     * @param {string} message - The message to display
     * @param {Object} [options] - Additional options
     * @return {string} Notification ID
     */
    static error(message, options = {}) {
        return this.show({...options, message, type: 'error'});
    }

    /**
     * Close a notification by ID
     * @param {string} id - The notification ID
     * @param {boolean} [animate=true] - Whether to animate the closing
     */
    static close(id, animate = true) {
        const element = document.getElementById(id);
        if (!element) {
            // Check if it's in the queue
            const queueIndex = this._queue.findIndex(n => n.id === id);
            if (queueIndex !== -1) {
                this._queue.splice(queueIndex, 1);
            }
            return;
        }

        // Get the notification object
        const notificationIndex = this._activeNotifications.findIndex(n => n.id === id);
        if (notificationIndex === -1) return;

        const notification = this._activeNotifications[notificationIndex];

        // Remove from active notifications
        this._activeNotifications.splice(notificationIndex, 1);

        // If animated, fade out then remove
        if (animate) {
            element.classList.remove(`${Notification.BASE_NOTIFICATION_CLASS}--visible`);
            setTimeout(() => {
                this._removeNotificationElement(element, notification);
            }, 300); // Match the transition time in CSS
        } else {
            this._removeNotificationElement(element, notification);
        }

        // Process the queue after removing
        this._processQueue(notification.position);
    }

    /**
     * Close all notifications
     * @param {string} [position] - Only close notifications in this position
     * @param {boolean} [animate=true] - Whether to animate the closing
     */
    static closeAll(position = null, animate = true) {
        // Clear the queue
        if (position) {
            const normalizedPosition = this._normalizePosition(position);
            this._queue = this._queue.filter(n => this._normalizePosition(n.position) !== normalizedPosition);
        } else {
            this._queue = [];
        }

        // Close active notifications
        const notificationsToClose = position
            ? this._activeNotifications.filter(n => n.position === this._normalizePosition(position))
            : [...this._activeNotifications];

        notificationsToClose.forEach(notification => {
            this.close(notification.id, animate);
        });
    }

    /**
     * Set the maximum number of notifications to show per container
     * @param {number} max - Maximum number of notifications
     */
    static setMaxNotifications(max) {
        if (typeof max === 'number' && max > 0) {
            this._maxNotificationsPerContainer = max;
        }
    }

    /**
     * Get a container element for a specific position, creating it if it doesn't exist
     * @param {string} position - The notification position
     * @return {HTMLElement} The container element
     * @private
     */
    static _getContainer(position) {
        const positionString = this._normalizePosition(position);

        if (this._containers[positionString]) {
            return this._containers[positionString];
        }

        // Create new container
        const container = document.createElement('div');
        container.className = `${Notification.BASE_NOTIFICATION_CLASS}-container ${Notification.BASE_NOTIFICATION_CLASS}-container--${positionString}`;
        document.body.appendChild(container);

        // Store for future use
        this._containers[positionString] = container;
        return container;
    }

    /**
     * Normalize position string to one of the supported values
     * @param {string} position - Position string
     * @return {string} Normalized position string
     * @private
     */
    static _normalizePosition(position) {
        const validPositions = [
            'top-center', 'top-left', 'top-right',
            'bottom-center', 'bottom-left', 'bottom-right'
        ];

        if (validPositions.includes(position)) {
            return position;
        }

        // Handle abbreviated positions
        if (position === 'top') return 'top-center';
        if (position === 'bottom') return 'bottom-center';

        // Default
        return 'bottom-center';
    }

    /**
     * Create and show a notification
     * @param {string} id - The notification ID
     * @param {Object} config - Notification configuration
     * @private
     */
    static _createNotification(id, config) {
        const position = this._normalizePosition(config.position);
        const container = this._getContainer(position);

        // Create the notification element
        const element = document.createElement('div');
        element.id = id;
        element.className = `${Notification.BASE_NOTIFICATION_CLASS} ${Notification.BASE_NOTIFICATION_CLASS}--${config.type}`;

        if (config.showProgress && config.duration > 0) {
            element.classList.add(`${Notification.BASE_NOTIFICATION_CLASS}--with-progress`);
            // Set the animation duration for the progress bar
            element.style.setProperty('--progress-duration', `${config.duration}ms`);
        }

        if (config.className) {
            element.classList.add(config.className);
        }

        // Apply custom styles
        if (config.style && typeof config.style === 'object') {
            Object.assign(element.style, config.style);
        }

        // Create content structure
        let content = '';

        // Add icon if provided
        if (config.icon) {
            content += `<div class="${Notification.BASE_NOTIFICATION_CLASS}-icon">${config.icon}</div>`;
        }

        // Add message
        content += `<div class="${Notification.BASE_NOTIFICATION_CLASS}-content">`;
        if (config.html) {
            content += config.message;
        } else {
            const message = document.createTextNode(config.message);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(message);
            content += tempDiv.innerHTML;
        }
        content += '</div>';

        // Add close button if needed
        if (config.showClose) {
            content += `<button class="${Notification.BASE_NOTIFICATION_CLASS}-close" aria-label="Close notification">×</button>`;
        }

        element.innerHTML = content;

        // Set up animations
        requestAnimationFrame(() => {
            container.appendChild(element);

            // Trigger layout/reflow before adding the visible class
            void element.offsetWidth;

            // Make visible
            element.classList.add(`${Notification.BASE_NOTIFICATION_CLASS}--visible`);

            // Set animation for progress bar if applicable
            const progressBar = element.querySelector(`.${Notification.BASE_NOTIFICATION_CLASS}--with-progress::after`);
            if (progressBar) {
                progressBar.style.animationDuration = `${config.duration}ms`;
            }
        });

        // Add to active notifications
        this._activeNotifications.push({
            id,
            element,
            position,
            config
        });

        // Set up click handler
        if (config.onClick) {
            element.addEventListener('click', event => {
                // Only trigger if not clicking the close button
                if (!event.target.closest(`.${Notification.BASE_NOTIFICATION_CLASS}-close`)) {
                    config.onClick(event, id);
                }
            });
        }

        // Set up close button handler
        const closeButton = element.querySelector(`.${Notification.BASE_NOTIFICATION_CLASS}-close`);
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close(id, true));
        }

        // Set auto-close timeout if duration > 0
        if (config.duration > 0) {
            setTimeout(() => {
                // Check if notification still exists before closing
                if (document.getElementById(id)) {
                    this.close(id, true);
                }
            }, config.duration);
        }
    }

    /**
     * Remove a notification element from the DOM
     * @param {HTMLElement} element - The notification element
     * @param {Object} notification - The notification object
     * @private
     */
    static _removeNotificationElement(element, notification) {
        if (!element) return;

        // Call onClose callback if provided
        if (notification && notification.config && notification.config.onClose) {
            try {
                notification.config.onClose(notification.id);
            } catch (e) {
                Logger.error(e, 'Error in notification onClose callback');
            }
        }

        // Remove the element
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }

        // Check if container is empty and remove it if so
        const container = this._containers[notification.position];
        if (container && !container.hasChildNodes()) {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            delete this._containers[notification.position];
        }
    }

    /**
     * Process the notification queue for a specific position
     * @param {string} position - Position to process
     * @private
     */
    static _processQueue(position) {
        const normalizedPosition = this._normalizePosition(position);

        // Check how many active notifications we have in this position
        const activeCount = this._activeNotifications.filter(n => n.position === normalizedPosition).length;

        // Check if we can show more
        if (activeCount >= this._maxNotificationsPerContainer) return;

        // Find the first queued notification for this position
        const queueIndex = this._queue.findIndex(n =>
            this._normalizePosition(n.position) === normalizedPosition
        );

        if (queueIndex !== -1) {
            // Remove from queue and show
            const nextNotification = this._queue.splice(queueIndex, 1)[0];
            this._createNotification(nextNotification.id, nextNotification);
        }
    }
}

// Static property to track if styles have been initialized
Notification.stylesInitialized = false;

export default Notification;