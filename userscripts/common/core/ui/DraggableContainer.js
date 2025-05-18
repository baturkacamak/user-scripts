/**
 * DraggableContainer - A reusable UI component for draggable containers.
 * Creates customizable, draggable containers with position persistence.
 */
import StyleManager from '../utils/StyleManager.js';
import Logger from '../utils/Logger.js';
import GMFunctions from '../utils/GMFunctions.js';

/**
 * A reusable UI component for creating draggable containers with position persistence.
 * Uses GMFunctions for cross-browser compatibility and persistence.
 *
 * IMPORTANT: This component relies on CSS variables for styling. Call
 * `DraggableContainer.useDefaultColors()` to inject default styles, or define
 * the variables (prefixed with `--userscripts-draggable-container-`) manually.
 */
class DraggableContainer {
  /**
     * Returns the unique base CSS class for the DraggableContainer component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for draggable containers.
     */
  static get BASE_CONTAINER_CLASS() {
    return 'userscripts-draggable-container';
  }
  /**
     * Returns the CSS variable prefix used for theming and styling the DraggableContainer component.
     * This prefix scopes all custom CSS variables related to the container.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-draggable-container-';
  }
  /**
     * Returns the local storage key used for saving position.
     *
     * @return {string} The local storage key prefix.
     */
  static get STORAGE_KEY_PREFIX() {
    return 'userscripts-container-position-';
  }
  /**
     * Initialize styles for all draggable containers.
     * These styles reference the CSS variables with our defined prefix.
     * Fallback values are NOT provided here; variables must be defined externally
     * or by calling `DraggableContainer.useDefaultColors()`.
     */
  static initStyles() {
    if (DraggableContainer.stylesInitialized) return;

    StyleManager.addStyles(`
      /* Scoped styles for Userscripts DraggableContainer Component */
      .${DraggableContainer.BASE_CONTAINER_CLASS} {
        position: fixed;
        z-index: 9999;
        border-radius: var(${DraggableContainer.CSS_VAR_PREFIX}border-radius);
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}bg);
        box-shadow: var(${DraggableContainer.CSS_VAR_PREFIX}shadow);
        box-sizing: border-box;
        overflow: hidden; /* Keep overflow hidden for content */
        /* Add top and left to the transition */
        transition: opacity 0.3s ease, transform 0.2s ease,
                    top 0.25s ease-out, left 0.25s ease-out; /* Adjust timing/easing as needed */
        max-width: 90vw;
        max-height: 90vh;
        resize: both; /* Default to resizable, controlled by instance option */
        /* Ensure initial position is relative for top/left to work */
        top: 0;
        left: 0;
      }

      /* Handle for dragging */
      .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        padding: 10px 15px;
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}handle-bg);
        cursor: grab;
        user-select: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(${DraggableContainer.CSS_VAR_PREFIX}border-color);
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__handle:active {
        cursor: grabbing;
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__title {
        margin: 0;
        font-weight: bold;
        font-size: var(${DraggableContainer.CSS_VAR_PREFIX}title-size);
        color: var(${DraggableContainer.CSS_VAR_PREFIX}title-color);
        /* Prevent title from blocking drag */
        pointer-events: none; 
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__actions {
        display: flex;
        gap: 8px;
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__action {
        background: none;
        border: none;
        cursor: pointer;
        color: var(${DraggableContainer.CSS_VAR_PREFIX}action-color);
        font-size: 14px; /* Consider making this a variable too? */
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__action:hover {
        color: var(${DraggableContainer.CSS_VAR_PREFIX}action-hover-color);
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
        padding: var(${DraggableContainer.CSS_VAR_PREFIX}content-padding);
        overflow: auto;
      }

      /* Sizes */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--small {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}small-width);
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}--medium {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}medium-width);
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}--large {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}large-width);
      }

      /* Themes - Apply theme-specific variables */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--default .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}default-handle-bg);
        /* Default handle text color might need its own variable if different from title-color */
        color: var(${DraggableContainer.CSS_VAR_PREFIX}title-color); 
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--primary .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}primary-handle-bg);
      }
      .${DraggableContainer.BASE_CONTAINER_CLASS}--primary .${DraggableContainer.BASE_CONTAINER_CLASS}__title,
      .${DraggableContainer.BASE_CONTAINER_CLASS}--primary .${DraggableContainer.BASE_CONTAINER_CLASS}__action {
        color: var(${DraggableContainer.CSS_VAR_PREFIX}primary-handle-color);
      }
       .${DraggableContainer.BASE_CONTAINER_CLASS}--primary .${DraggableContainer.BASE_CONTAINER_CLASS}__action:hover {
         /* Might need a specific hover color variable for primary actions */
         color: var(${DraggableContainer.CSS_VAR_PREFIX}primary-handle-color); 
         opacity: 0.8; /* Example hover effect */
      }


      .${DraggableContainer.BASE_CONTAINER_CLASS}--secondary .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-bg);
      }
       .${DraggableContainer.BASE_CONTAINER_CLASS}--secondary .${DraggableContainer.BASE_CONTAINER_CLASS}__title,
       .${DraggableContainer.BASE_CONTAINER_CLASS}--secondary .${DraggableContainer.BASE_CONTAINER_CLASS}__action {
        color: var(${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-color);
      }
       .${DraggableContainer.BASE_CONTAINER_CLASS}--secondary .${DraggableContainer.BASE_CONTAINER_CLASS}__action:hover {
         color: var(${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-color);
         opacity: 0.8;
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}--success .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}success-handle-bg);
      }
       .${DraggableContainer.BASE_CONTAINER_CLASS}--success .${DraggableContainer.BASE_CONTAINER_CLASS}__title,
       .${DraggableContainer.BASE_CONTAINER_CLASS}--success .${DraggableContainer.BASE_CONTAINER_CLASS}__action {
        color: var(${DraggableContainer.CSS_VAR_PREFIX}success-handle-color);
      }
       .${DraggableContainer.BASE_CONTAINER_CLASS}--success .${DraggableContainer.BASE_CONTAINER_CLASS}__action:hover {
         color: var(${DraggableContainer.CSS_VAR_PREFIX}success-handle-color);
         opacity: 0.8;
      }

      /* State modifiers */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--minimized .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
        display: none;
      }

      .${DraggableContainer.BASE_CONTAINER_CLASS}--minimized {
        /* When minimized, prevent resize and use auto height based on handle */
        resize: none !important; 
        height: auto !important; 
        overflow: visible; /* Allow shadow if needed */
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--not-resizable {
          resize: none !important;
          /* overflow: hidden; /* Already set, but ensure it overrides */
      }


      /* Animation for minimizing/maximizing (handled by browser/css state) */
      .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
         /* Transition height might not work well with auto height. */
         /* Consider opacity or max-height transitions if needed. */
         /* transition: max-height 0.3s ease, opacity 0.3s ease; */
         /* max-height: 500px; /* Example max height for transition */
      }
      /* .${DraggableContainer.BASE_CONTAINER_CLASS}--minimized .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
         max-height: 0;
         opacity: 0;
         padding-top: 0;
         padding-bottom: 0;
         overflow: hidden;
      } */
    `, 'userscripts-draggable-container-styles');

    DraggableContainer.stylesInitialized = true;
  }
  /**
     * Inject default color variables for the container component into the :root.
     * Users can call this method to automatically set a default color palette.
     * These variables are used by the styles defined in `initStyles`.
     */
static useDefaultColors() {
    const styleId = 'userscripts-draggable-container-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          ${DraggableContainer.CSS_VAR_PREFIX}bg: #ffffff;
          ${DraggableContainer.CSS_VAR_PREFIX}shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          ${DraggableContainer.CSS_VAR_PREFIX}border-radius: 8px;
          ${DraggableContainer.CSS_VAR_PREFIX}border-color: #e0e0e0;

          ${DraggableContainer.CSS_VAR_PREFIX}handle-bg: #f0f0f0; /* Used by handle unless overridden by theme */
          ${DraggableContainer.CSS_VAR_PREFIX}title-color: #333333;
          ${DraggableContainer.CSS_VAR_PREFIX}title-size: 14px;

          ${DraggableContainer.CSS_VAR_PREFIX}action-color: #666666;
          ${DraggableContainer.CSS_VAR_PREFIX}action-hover-color: #333333;

          ${DraggableContainer.CSS_VAR_PREFIX}content-padding: 15px;

          ${DraggableContainer.CSS_VAR_PREFIX}small-width: 250px;
          ${DraggableContainer.CSS_VAR_PREFIX}medium-width: 350px;
          ${DraggableContainer.CSS_VAR_PREFIX}large-width: 450px;

          /* Theme Specific Variables */
          ${DraggableContainer.CSS_VAR_PREFIX}default-handle-bg: #f0f0f0; /* Same as base handle-bg */

          ${DraggableContainer.CSS_VAR_PREFIX}primary-handle-bg: #3b82f6;
          ${DraggableContainer.CSS_VAR_PREFIX}primary-handle-color: #ffffff;

          ${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-bg: #6b7280;
          ${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-color: #ffffff;

          ${DraggableContainer.CSS_VAR_PREFIX}success-handle-bg: #10b981;
          ${DraggableContainer.CSS_VAR_PREFIX}success-handle-color: #ffffff;
        }
      `;
      document.head.appendChild(style);
      Logger.debug('Default DraggableContainer colors injected.');
    }
  }
/**
     * Create a new DraggableContainer.
     * @param {Object} options - Configuration options.
     * @param {String} options.title - Container title displayed in the handle.
     * @param {String} [options.id] - Container unique ID, used for position saving. Defaults to a timestamp-based ID.
     * @param {String} [options.className] - Additional custom CSS class to add to the container root.
     * @param {HTMLElement} [options.container=document.body] - DOM element to append the draggable container to.
     * @param {String} [options.theme="default"] - Container theme ('default', 'primary', 'secondary', 'success'). Affects handle style.
     * @param {String} [options.size="medium"] - Container size class ('small', 'medium', 'large'). Affects initial width via CSS variable.
     * @param {Boolean} [options.minimizable=true] - Whether the container can be minimized via a button.
     * @param {Boolean} [options.closable=true] - Whether the container can be closed via a button.
     * @param {Boolean} [options.resizable=true] - Whether the container can be resized by the user via CSS resize handle.
     * @param {Number} [options.defaultX=20] - Default X position (left) if no saved position exists.
     * @param {Number} [options.defaultY=20] - Default Y position (top) if no saved position exists.
     * @param {Function} [options.onClose] - Callback function executed when the container is closed via the close button. `(instance: DraggableContainer) => void`.
     * @param {Function} [options.onMinimize] - Callback function executed when the container is minimized or restored. `(isMinimized: boolean, instance: DraggableContainer) => void`.
     * @param {Function} [options.onMove] - Callback function executed when the container finishes moving. `(position: {x: number, y: number}, instance: DraggableContainer) => void`.
     * @param {Function} [options.onResize] - Callback function executed when the container is resized (uses ResizeObserver). `(size: {width: number, height: number}, instance: DraggableContainer) => void`.
     * @param {Function} [options.onInit] - Callback function executed after the container is created and initialized. `(instance: DraggableContainer) => void`.
     * @param {Boolean} [options.debug=false] - Enable debug logging for this instance.
     */
  constructor(options) {
    // Ensure GMFunctions are initialized (safe to call multiple times)
    GMFunctions.initialize();

    // Initialize options with defaults
    this.title = options.title || 'Draggable Container';
    // Generate a more descriptive default ID if none provided
    this.id = options.id || `draggable-container-${Math.random().toString(36).substring(2, 9)}`;
    this.customClassName = options.className || '';
    this.parentContainer = options.container instanceof HTMLElement ? options.container : document.body;
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.minimizable = false !== options.minimizable; // Default true
    this.closable = false !== options.closable; // Default true
    this.resizable = false !== options.resizable; // Default true
    this.defaultX = options.defaultX !== undefined ? options.defaultX : 20;
    this.defaultY = options.defaultY !== undefined ? options.defaultY : 20;
    this.onClose = 'function' === typeof options.onClose ? options.onClose : null;
    this.onMinimize = 'function' === typeof options.onMinimize ? options.onMinimize : null;
    this.onMove = 'function' === typeof options.onMove ? options.onMove : null;
    this.onResize = 'function' === typeof options.onResize ? options.onResize : null;
    this.onInit = 'function' === typeof options.onInit ? options.onInit : null;

    // Set logger prefix for debugging
    this._debug = !!options.debug; // Private debug flag
    if (this._debug) {
      Logger.DEBUG = true; // Enable global logger if any instance needs it
    }
    this._loggerPrefix = `DraggableContainer(${this.id})`; // Store prefix

    // State tracking
    this.isMinimized = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.containerStartX = 0;
    this.containerStartY = 0;
    this._resizeObserver = null; // To keep track of the observer

    // References to DOM elements
    this.containerElement = null;
    this.handleElement = null;
    this.contentElement = null;
    this.minimizeButton = null; // Reference for potential state updates

    // Initialize styles (safe to call multiple times)
    DraggableContainer.initStyles();

    // Create the container
    this.create();

    // Load saved position and state AFTER element creation
    this.loadPosition();
    this._setupUnloadListener();

    // Call onInit callback if provided
    if (this.onInit) {
      try {
        this.onInit(this);
      } catch (e) {
        this._logError(e, 'running onInit callback');
      }
    }

    this._log('Initialized');
  }





  
  

  /**
     * Create the container element, its children, and append it to the parent container.
     * Sets up event listeners for dragging, closing, and minimizing.
     * @return {HTMLElement} The created container element.
     */
  create() {
    this._log('Creating container element');
    // Create main container
    this.containerElement = document.createElement('div');
    this.containerElement.id = this.id;
    // Store a reference to the instance on the element for potential external access
    this.containerElement._draggableContainerInstance = this;

    // Set initial classes (theme, size, base)
    this.updateContainerClasses();

    // Apply resizable style *conditionally*
    if (!this.resizable) {
      this.containerElement.classList.add(`${DraggableContainer.BASE_CONTAINER_CLASS}--not-resizable`);
    }

    // --- Create Handle ---
    this.handleElement = document.createElement('div');
    this.handleElement.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__handle`;

    // Add title
    const titleElement = document.createElement('div');
    titleElement.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__title`;
    titleElement.textContent = this.title;
    this.handleElement.appendChild(titleElement);

    // Add action buttons container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__actions`;

    // Add minimize button if needed
    if (this.minimizable) {
      this.minimizeButton = document.createElement('button');
      this.minimizeButton.type = 'button'; // Best practice
      this.minimizeButton.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__action`;
      this.minimizeButton.innerHTML = '−'; // Unicode minus
      this.minimizeButton.title = 'Minimize / Restore'; // More descriptive title
      this.minimizeButton.setAttribute('aria-label', 'Minimize or restore container');
      this.minimizeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag start
        this.toggleMinimize();
      });
      actionsContainer.appendChild(this.minimizeButton);
    }

    // Add close button if needed
    if (this.closable) {
      const closeButton = document.createElement('button');
      closeButton.type = 'button'; // Best practice
      closeButton.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__action`;
      closeButton.innerHTML = '×'; // Unicode times
      closeButton.title = 'Close';
      closeButton.setAttribute('aria-label', 'Close container');
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag start
        this.close();
      });
      actionsContainer.appendChild(closeButton);
    }

    // Only add actions container if it has children
    if (actionsContainer.hasChildNodes()) {
      this.handleElement.appendChild(actionsContainer);
    }
    this.containerElement.appendChild(this.handleElement);

    // --- Create Content Area ---
    this.contentElement = document.createElement('div');
    this.contentElement.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__content`;
    // Accessibility: Make content scrollable if needed, managed by CSS overflow: auto
    this.contentElement.setAttribute('tabindex', '0'); // Allow focus for scrolling
    this.containerElement.appendChild(this.contentElement);

    // Setup drag functionality
    this.setupDragging();

    // Setup resize event listener if needed and callback provided
    if (this.resizable && this.onResize) {
      this.setupResizeObserver();
    }

    // Add to parent container
    try {
      this.parentContainer.appendChild(this.containerElement);
    } catch (e) {
      this._logError(e, 'appending container to parent');
      console.error(`[${this._loggerPrefix}] Failed to append container to`, this.parentContainer, '. Appending to document.body instead.');
      document.body.appendChild(this.containerElement); // Fallback append
    }


    return this.containerElement;
  }

  /**
     * Sets up the ResizeObserver to monitor container size changes.
     * Enforces maximum height based on content scrollHeight during user resize.
     */
  setupResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target === this.containerElement &&
                        !this.containerElement.classList.contains(`${DraggableContainer.BASE_CONTAINER_CLASS}--minimized`)) {
            const currentReportedRect = entry.contentRect; // From observer
            const currentWidth = currentReportedRect.width;
            // We need the *actual current total height* for comparison, not just contentRect.height
            const currentTotalHeight = this.containerElement.offsetHeight;

            let finalHeight = currentTotalHeight; // Start with current actual height
            let heightAdjusted = false;

            // --- Calculate Max Allowed Container Height ---
            let maxContainerHeight = Infinity;
            if (this.contentElement && this.handleElement) {
              try {
                const contentScrollHeight = this.contentElement.scrollHeight;
                const handleHeight = this.handleElement.offsetHeight; // Height of handle (includes its padding/border)

                // Get computed style for content padding (already included in scrollHeight conceptually, but needed if borders are on content itself)
                const contentStyle = getComputedStyle(this.contentElement);
                const contentPaddingTop = parseFloat(contentStyle.paddingTop) || 0;
                const contentPaddingBottom = parseFloat(contentStyle.paddingBottom) || 0;
                // Content border if contentElement itself has border (usually 0)
                const contentBorderTop = parseFloat(contentStyle.borderTopWidth) || 0;
                const contentBorderBottom = parseFloat(contentStyle.borderBottomWidth) || 0;


                // Max height calculation assuming container is border-box:
                // Handle height + Content scroll height + content vertical padding + content vertical border
                maxContainerHeight = handleHeight +
                                    contentScrollHeight +
                                    contentPaddingTop +
                                    contentPaddingBottom +
                                    contentBorderTop +
                                    contentBorderBottom;


                // Alternative simple calculation if content has no border/complex box model:
                // maxContainerHeight = handleHeight + this.contentElement.scrollHeight + (contentPaddingTop + contentPaddingBottom);
                // Check this calculation works with your specific styling.

                // Get container's own top/bottom border widths if needed (usually 0 if border is only on handle bottom)
                // const containerStyle = getComputedStyle(this.containerElement);
                // const containerBorderTop = parseFloat(containerStyle.borderTopWidth) || 0;
                // const containerBorderBottom = parseFloat(containerStyle.borderBottomWidth) || 0;
                // maxContainerHeight += containerBorderTop + containerBorderBottom;


                // Respect the CSS max-height (e.g., 90vh) - Check computed style
                const cssMaxHeightStyle = getComputedStyle(this.containerElement).maxHeight;
                if (cssMaxHeightStyle && 'none' !== cssMaxHeightStyle) {
                  // Need a robust way to get pixel value from vh/etc.
                  // Simple approach: Use getBoundingClientRect height as a proxy for rendered max-height if available
                  // Or, more simply, just check against window height for vh units
                  if (cssMaxHeightStyle.endsWith('vh')) {
                    const vhValue = parseFloat(cssMaxHeightStyle);
                    if (!isNaN(vhValue)) {
                      maxContainerHeight = Math.min(maxContainerHeight, window.innerHeight * (vhValue / 100));
                    }
                  } else if (cssMaxHeightStyle.endsWith('px')) {
                    const pxValue = parseFloat(cssMaxHeightStyle);
                    if (!isNaN(pxValue)) {
                      maxContainerHeight = Math.min(maxContainerHeight, pxValue);
                    }
                  }
                }


                // Ensure minimum height (at least the handle height)
                maxContainerHeight = Math.max(maxContainerHeight, handleHeight);
              } catch (e) {
                this._logError(e, 'calculating max height during resize');
                maxContainerHeight = Infinity;
              }
            }
            // --- End Calculate Max Height ---


            // --- Apply Height Constraint ---
            // Compare the *actual current total height* against the calculated max
            const tolerance = 1; // Tolerance for floating point issues
            if (currentTotalHeight > maxContainerHeight + tolerance) {
              this._log(`Height constraint applied: Actual H ${currentTotalHeight.toFixed(2)} > Max H ${maxContainerHeight.toFixed(2)}. Clamping.`);
              // Clamp the height by setting the style
              this.containerElement.style.height = `${maxContainerHeight}px`;
              // Update the final height variable for callbacks/saving
              finalHeight = maxContainerHeight;
              heightAdjusted = true;
            }
            // --- End Apply Height Constraint ---

            // Use finalHeight (potentially clamped) for logging and callbacks
            this._log(`Resize event: W=${currentWidth.toFixed(2)}, H=${finalHeight.toFixed(2)} (Adjusted: ${heightAdjusted})`);

            // Call the onResize callback *before* viewport check, passing the final dimensions
            if (this.onResize && (heightAdjusted || entry.contentRect.height !== this._lastReportedHeight || entry.contentRect.width !== this._lastReportedWidth)) {
              // Only call if size actually changed or was clamped
              try {
                this.onResize({width: currentWidth, height: finalHeight}, this);
                this._lastReportedHeight = finalHeight; // Store last reported values
                this._lastReportedWidth = currentWidth;
              } catch (e) {
                this._logError(e, 'running onResize callback');
              }
            } else {
              // Update last known height even if callback wasn't called, to prevent unnecessary future callbacks
              this._lastReportedHeight = finalHeight;
              this._lastReportedWidth = currentWidth;
            }


            // Check viewport bounds AFTER resize and potential height clamping
            this.ensureInViewport((finalPosition) => {
              // Save position *after* all adjustments (height clamp, viewport snap)
              this.savePosition();
            });
          }
        }
      });
    });
    // Initialize last reported dimensions to prevent initial unnecessary callback
    this._lastReportedHeight = this.containerElement?.offsetHeight;
    this._lastReportedWidth = this.containerElement?.offsetWidth;

    this._resizeObserver.observe(this.containerElement);
    this._log('Resize observer attached (with revised height constraint logic)');
  }

  /**
     * Update container classes based on state (theme, size, minimized, custom).
     */
  updateContainerClasses() {
    if (!this.containerElement) return; // Guard against calls before creation

    const classNames = [
      DraggableContainer.BASE_CONTAINER_CLASS,
      `${DraggableContainer.BASE_CONTAINER_CLASS}--${this.theme}`,
      `${DraggableContainer.BASE_CONTAINER_CLASS}--${this.size}`,
    ];

    if (this.isMinimized) {
      classNames.push(`${DraggableContainer.BASE_CONTAINER_CLASS}--minimized`);
    }

    // Add conditional non-resizable class based on the *instance* property
    if (!this.resizable) {
      classNames.push(`${DraggableContainer.BASE_CONTAINER_CLASS}--not-resizable`);
    }

    // Handle custom class name - remove old, add new
    if (this._previousCustomClassName && this._previousCustomClassName !== this.customClassName) {
      this.containerElement.classList.remove(this._previousCustomClassName);
    }
    if (this.customClassName) {
      classNames.push(this.customClassName);
    }
    this._previousCustomClassName = this.customClassName; // Track for removal


    this.containerElement.className = classNames.join(' ');
    this._log('Updated container classes:', this.containerElement.className);
  }

  /**
     * Setup dragging functionality attaching listeners to the handle and document.
     */
  setupDragging() {
    if (!this.handleElement) return;

    const onDragStart = (e) => {
      // Allow dragging only with the primary mouse button (usually left)
      if (0 !== e.button) return;
      // Ignore if clicking on action buttons within the handle
      if (e.target.closest(`.${DraggableContainer.BASE_CONTAINER_CLASS}__action`)) {
        return;
      }

      this.isDragging = true;
      // Use pageX/pageY for coordinates relative to the whole document,
      // less likely to be affected by scrolling during drag start.
      this.dragStartX = e.pageX;
      this.dragStartY = e.pageY;

      // Get initial position relative to viewport
      const rect = this.containerElement.getBoundingClientRect();
      this.containerStartX = rect.left;
      this.containerStartY = rect.top;

      // Apply grabbing cursor and potentially a class for visual feedback
      this.handleElement.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none'; // Prevent text selection globally
      this.containerElement.classList.add('is-dragging'); // Optional: for styling during drag

      this._log('Drag started');

      // Add move/end listeners to the document, not the handle
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('mouseleave', onDragEnd); // Handle mouse leaving window

      // Prevent default behavior like text selection or image dragging
      e.preventDefault();
    };

    const onDragMove = (e) => {
      if (!this.isDragging) return;

      // Use requestAnimationFrame to throttle updates and improve performance
      window.requestAnimationFrame(() => {
        if (!this.isDragging) return; // Check again inside rAF

        const deltaX = e.pageX - this.dragStartX;
        const deltaY = e.pageY - this.dragStartY;

        const newX = this.containerStartX + deltaX;
        const newY = this.containerStartY + deltaY;

        // Apply new position (onMove callback is called inside setPosition ONLY on drag end)
        // Pass true to prevent callback on every mouse move event
        this.setPosition(newX, newY, true);
      });
    };

    const onDragEnd = (e) => {
      if (!this.isDragging || ('mouseup' === e.type && 0 !== e.button)) return;

      this.isDragging = false;
      this.handleElement.style.cursor = 'grab';
      document.body.style.userSelect = '';
      this.containerElement.classList.remove('is-dragging');

      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('mouseleave', onDragEnd);

      this._log('Drag ended, checking viewport bounds...');

      // Check bounds and snap if needed *after* drag interaction finishes
      this.ensureInViewport((finalPosition) => {
        // Save the potentially adjusted final position
        this.savePosition();

        // Trigger the onMove callback *after* snapping check/animation starts,
        // reporting the final (potentially snapped) position.
        if (this.onMove) {
          try {
            // Use the position reported by ensureInViewport
            this.onMove({x: finalPosition.x, y: finalPosition.y}, this);
            this._log('onMove callback triggered with final position:', finalPosition);
          } catch (err) {
            this._logError(err, 'running onMove callback after drag end');
          }
        }
      });
    };

    // Attach the starting listener to the handle
    this.handleElement.addEventListener('mousedown', onDragStart);
  }

  /**
     * Set the container's position programmatically. Will snap to viewport if needed.
     * @param {Number} x - Desired X coordinate (left).
     * @param {Number} y - Desired Y coordinate (top).
     * @param {Boolean} [preventCallbackAndSnap=false] - If true, prevents the onMove callback AND the viewport snapping check (used internally during drag).
     * @return {Promise<Object>} A promise that resolves with the final bounded coordinates {x, y} after potential snapping animation.
     */
  setPosition(x, y, preventCallbackAndSnap = false) {
    return new Promise((resolve) => {
      if (!this.containerElement) {
        resolve({x: 0, y: 0});
        return;
      }

      const targetX = Number(x) || 0;
      const targetY = Number(y) || 0;

      // Apply the requested position directly first
      // (ensureInViewport will read this and correct if necessary)
      this.containerElement.style.left = targetX + 'px';
      this.containerElement.style.top = targetY + 'px';

      if (preventCallbackAndSnap) {
        // Used during drag - no snapping or callback here
        // Resolve immediately with the raw target position (drag handles bounds later)
        resolve({x: targetX, y: targetY});
      } else {
        // Programmatic call - check viewport after styles apply
        // Use rAF to ensure the style is applied before checking bounds
        requestAnimationFrame(() => {
          this._log(`Programmatic setPosition to (${targetX}, ${targetY}), checking viewport.`);
          this.ensureInViewport((finalPosition) => {
            // Trigger onMove with the final (potentially snapped) position
            if (this.onMove) {
              try {
                this.onMove({x: finalPosition.x, y: finalPosition.y}, this);
              } catch (e) {
                this._logError(e, 'running onMove callback');
              }
            }
            // Save the potentially adjusted position
            this.savePosition();
            // Resolve the promise with the final position
            resolve(finalPosition);
          });
        });
      }
    });
  }

  /**
     * Save the container's current position, size (if resizable), and minimized state
     * to persistent storage using GMFunctions (GM_setValue).
     */
  savePosition() {
    // Debounce saving to avoid excessive writes during rapid interaction (like resize)
    clearTimeout(this._savePositionTimeout);
    this._savePositionTimeout = setTimeout(() => {
      if (!this.containerElement || !this.id) return;

      try {
        const rect = this.containerElement.getBoundingClientRect();
        const positionData = {
          x: rect.left,
          y: rect.top,
          minimized: this.isMinimized,
          // Only save size if the container is actually resizable by the user
          width: this.resizable ? rect.width : undefined,
          height: this.resizable ? rect.height : undefined,
        };

        // Remove undefined size properties if not resizable
        if (!this.resizable) {
          delete positionData.width;
          delete positionData.height;
        }

        const storageKey = `${DraggableContainer.STORAGE_KEY_PREFIX}${this.id}`;
        GM_setValue(storageKey, positionData);

        this._log('Position saved:', positionData);
      } catch (e) {
        this._logError(e, 'saving container position');
      }
    }, 150); // Debounce timeout of 150ms
  }

  /**
     * Load the container's position, size, and minimized state from persistent storage
     * using GMFunctions (GM_getValue) and apply them. Applies defaults if no saved data exists.
     */
  loadPosition() {
    if (!this.id) return;

    try {
      const storageKey = `${DraggableContainer.STORAGE_KEY_PREFIX}${this.id}`;
      const savedData = GM_getValue(storageKey, null);
      let initialX = this.defaultX;
      let initialY = this.defaultY;

      if (savedData && 'object' === typeof savedData) {
        this._log('Loaded position data:', savedData);
        initialX = savedData.x;
        initialY = savedData.y;


        // Apply size first if resizable AND size data exists
        if (this.resizable && savedData.width !== undefined && savedData.height !== undefined) {
          // Apply size without triggering observer during load if possible
          this.containerElement.style.width = savedData.width + 'px';
          this.containerElement.style.height = savedData.height + 'px';
          this._log(`Applied saved size: ${savedData.width}x${savedData.height}`);
        }

        // Apply minimized state silently *before* setting position
        if (this.minimizable && savedData.minimized !== undefined && savedData.minimized !== this.isMinimized) {
          this.isMinimized = savedData.minimized;
          this.updateContainerClasses(); // Update classes
          if (this.minimizeButton) {
            this.minimizeButton.innerHTML = this.isMinimized ? '+' : '−';
          }
          this._log(`Applied saved minimized state: ${this.isMinimized}`);
        }
      } else {
        this._log('No saved position found, using defaults.');
      }

      // Apply initial position (prevent callback, as ensureInViewport handles final state)
      // Need to set initial style directly for getBoundingClientRect in ensureInViewport
      this.containerElement.style.left = `${initialX}px`;
      this.containerElement.style.top = `${initialY}px`;
      this._log(`Initial position set to ${initialX}, ${initialY}. Checking viewport.`);

      // Check bounds and snap if needed AFTER applying initial position/size/state
      // Use requestAnimationFrame to ensure styles are applied before checking bounds
      requestAnimationFrame(() => {
        this.ensureInViewport(() => {
          // Optionally save the snapped position if it differed from loaded/default
          this.savePosition();
        });
      });
    } catch (e) {
      this._logError(e, 'loading container position');
      // Fallback to default position on error and check viewport
      this.containerElement.style.left = `${this.defaultX}px`;
      this.containerElement.style.top = `${this.defaultY}px`;
      requestAnimationFrame(() => {
        this.ensureInViewport(() => {
          this.savePosition();
        });
      });
    }
  }

  /**
     * Set the container's size explicitly. Only works if `resizable` is true.
     * @param {Number} width - Width in pixels.
     * @param {Number} height - Height in pixels.
     */
  setSize(width, height) {
    if (!this.resizable || !this.containerElement) return;

    const w = parseFloat(width);
    const h = parseFloat(height);

    if (!isNaN(w) && 0 < w) {
      this.containerElement.style.width = w + 'px';
    }
    if (!isNaN(h) && 0 < h) {
      this.containerElement.style.height = h + 'px';
    }
    // Note: Size changes might trigger the ResizeObserver, which handles callbacks and saving.
  }

  /**
     * Toggle the minimized state of the container. Updates appearance, calls callback, and saves state.
     */
  toggleMinimize() {
    if (!this.minimizable || !this.containerElement) return;

    this.isMinimized = !this.isMinimized;
    this._log(`Toggling minimize state to: ${this.isMinimized}`);

    // Update classes to reflect state (adds/removes --minimized class)
    this.updateContainerClasses();

    // Update minimize button appearance (example: change symbol)
    if (this.minimizeButton) {
      this.minimizeButton.innerHTML = this.isMinimized ? '+' : '−'; // Plus when minimized, Minus when normal
      this.minimizeButton.title = this.isMinimized ? 'Restore' : 'Minimize';
    }


    // Call the onMinimize callback if provided
    if (this.onMinimize) {
      try {
        this.onMinimize(this.isMinimized, this);
      } catch (e) {
        this._logError(e, 'running onMinimize callback');
      }
    }

    // Save the new state
    this.savePosition();
  }

  /**
     * Close and remove the container from the DOM. Calls the onClose callback.
     * Cleans up event listeners and observers.
     */
  close() {
    this._log('Closing container');
    // Call the onClose callback first, allowing potential cleanup or prevention
    if (this.onClose) {
      try {
        this.onClose(this);
      } catch (e) {
        this._logError(e, 'running onClose callback');
      }
    }

    // Disconnect resize observer if it exists
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
      this._log('Resize observer disconnected');
    }

    // Remove the container element from DOM
    if (this.containerElement && this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
      this._log('Container element removed from DOM');
    }

    // Nullify references to help garbage collection
    this.containerElement = null;
    this.handleElement = null;
    this.contentElement = null;
    this.minimizeButton = null;
    // NOTE: Drag listeners are on `document`, they are removed on drag end.
    // The mousedown listener on handleElement is removed when handleElement is GC'd.
  }

  /**
     * Set the container's theme class.
     * @param {String} theme - The theme name (e.g., 'default', 'primary').
     */
  setTheme(theme) {
    if ('string' === typeof theme && theme) {
      this.theme = theme;
      this.updateContainerClasses();
      this._log(`Theme set to: ${theme}`);
    }
  }

  /**
     * Set the container's size class. Affects width via CSS.
     * @param {String} size - The size name ('small', 'medium', 'large').
     */
  setSizeClass(size) { // Renamed from setSize to avoid conflict with setSize(width, height)
    if ('string' === typeof size && ['small', 'medium', 'large'].includes(size)) {
      this.size = size;
      this.updateContainerClasses();
      this._log(`Size class set to: ${size}`);
      // Note: This does NOT directly set width/height style, it relies on CSS classes.
      // It also doesn't trigger onResize or save position unless the actual size changes due to the class change.
    }
  }

  /**
     * Set or update a custom CSS class for the container root element.
     * @param {String} className - The custom class name. Pass empty string or null to remove.
     */
  setCustomClass(className) {
    const newClassName = 'string' === typeof className ? className.trim() : '';
    if (this.customClassName !== newClassName) {
      this.customClassName = newClassName;
      this.updateContainerClasses(); // Will handle adding/removing
      this._log(`Custom class set to: '${this.customClassName}'`);
    }
  }

  /**
     * Set the container's title displayed in the handle.
     * @param {String} title - The new title text.
     */
  setTitle(title) {
    const newTitle = String(title);
    this.title = newTitle;
    // Find the title element within the handle specifically
    const titleElement = this.handleElement?.querySelector(`.${DraggableContainer.BASE_CONTAINER_CLASS}__title`);
    if (titleElement) {
      titleElement.textContent = newTitle;
      this._log(`Title set to: "${newTitle}"`);
    }
  }

  /**
     * Replace the content area's content.
     * @param {HTMLElement|DocumentFragment|String} content - Content to add. Can be an HTML element, a DocumentFragment, or an HTML string.
     */
  setContent(content) {
    if (!this.contentElement) return;

    // Clear existing content safely
    while (this.contentElement.firstChild) {
      this.contentElement.removeChild(this.contentElement.firstChild);
    }

    // Add new content
    if (content instanceof HTMLElement || content instanceof DocumentFragment) {
      this.contentElement.appendChild(content);
      this._log('Content set with HTMLElement/DocumentFragment');
    } else if ('string' === typeof content) {
      this.contentElement.innerHTML = content;
      this._log('Content set with HTML string');
    } else if (null !== content && content !== undefined) {
      // Handle other types like numbers by converting to string
      this.contentElement.textContent = String(content);
      this._log('Content set with other type (converted to string)');
    } else {
      this._log('Content cleared');
    }
  }

  /**
     * Append content to the container's content area.
     * @param {HTMLElement|DocumentFragment|String} content - Content to append (HTML element, DocumentFragment, or HTML string).
     */
  appendContent(content) {
    if (!this.contentElement) return;

    // Append new content
    if (content instanceof HTMLElement || content instanceof DocumentFragment) {
      this.contentElement.appendChild(content);
      this._log('Content appended with HTMLElement/DocumentFragment');
    } else if ('string' === typeof content) {
      // Use a template element for efficient parsing and appending of HTML strings
      const template = document.createElement('template');
      template.innerHTML = content.trim(); // Trim whitespace
      this.contentElement.appendChild(template.content); // Appends all nodes within the template
      this._log('Content appended with HTML string');
    } else if (null !== content && content !== undefined) {
      // Append other types as text nodes
      this.contentElement.appendChild(document.createTextNode(String(content)));
      this._log('Content appended with other type (converted to text node)');
    }
  }

  /**
     * Make the container visible if it was previously hidden via `hide()`.
     */
  show() {
    if (this.containerElement) {
      this.containerElement.style.display = ''; // Revert to default display (usually block or from CSS)
      this.containerElement.removeAttribute('hidden'); // Also remove hidden attribute if set
      this._log('Container shown');
    }
  }
  /**
     * Checks if the container is within the viewport boundaries.
     * If not, smoothly animates it back into view using CSS transitions.
     * @param {Function} [callback] - Optional callback function to execute after snapping animation might finish.
     *                                Note: Due to CSS transition timing, exact finish is hard to guarantee.
     *                                Callback is called *after* styles are set, initiating the transition.
     */
  ensureInViewport(callback) {
    if (!this.containerElement || this.isMinimized) { // Don't adjust if minimized
      if (callback) callback();
      return;
    }

    const rect = this.containerElement.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let targetX = rect.left;
    let targetY = rect.top;
    let needsAdjustment = false;

    // Handle containers potentially larger than viewport
    const effectiveWidth = Math.min(rect.width, vw);
    const effectiveHeight = Math.min(rect.height, vh);

    // Check Left boundary
    if (0 > rect.left) {
      targetX = 0;
      needsAdjustment = true;
    }
    // Check Right boundary
    else if (rect.right > vw) {
      targetX = vw - rect.width; // Adjust left edge based on width
      // If still < 0 because width > vw, snap to 0
      if (0 > targetX) {
        targetX = 0;
      }
      needsAdjustment = true;
    }

    // Check Top boundary
    if (0 > rect.top) {
      targetY = 0;
      needsAdjustment = true;
    }
    // Check Bottom boundary
    else if (rect.bottom > vh) {
      targetY = vh - rect.height; // Adjust top edge based on height
      // If still < 0 because height > vh, snap to 0
      if (0 > targetY) {
        targetY = 0;
      }
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      this._log(`Adjusting position to stay in viewport: (${targetX}, ${targetY})`);
      // Apply new position directly - CSS transition handles the animation
      this.containerElement.style.left = `${targetX}px`;
      this.containerElement.style.top = `${targetY}px`;

      // Optional: Slightly delay callback if needed, though exact timing is tricky
      const transitionDuration = 250; // Match the CSS transition duration in ms
      setTimeout(() => {
        if (callback) callback({x: targetX, y: targetY});
        // Potentially save position *after* snap animation completes
        // Note: saving here might conflict with debounced saving elsewhere
        // this.savePosition();
      }, transitionDuration);
    } else {
      // No adjustment needed, call callback immediately
      if (callback) callback({x: rect.left, y: rect.top});
    }
  }
  /**
     * Hide the container using `display: none;`.
     * Note: This might interfere with position/size calculations if called inappropriately.
     */
  hide() {
    if (this.containerElement) {
      this.containerElement.style.display = 'none';
      // Optionally add hidden attribute for semantics/accessibility
      // this.containerElement.setAttribute('hidden', '');
      this._log('Container hidden');
    }
  }
  /**
     * Returns the main container DOM element.
     * @return {HTMLElement | null} The container element or null if not created.
     */
  getElement() {
    return this.containerElement;
  }
  /**
     * Returns the content area DOM element.
     * @return {HTMLElement | null} The content element or null if not created.
     */
getContentElement() {
    return this.contentElement;
  }
_setupUnloadListener() {
    // Save position on page unload to catch any unsaved resize operations
    window.addEventListener('beforeunload', () => {
      // Clear any pending timeout to ensure immediate save
      clearTimeout(this._savePositionTimeout);

      if (this.containerElement && this.id) {
        try {
          const rect = this.containerElement.getBoundingClientRect();
          const positionData = {
            x: rect.left,
            y: rect.top,
            minimized: this.isMinimized,
            width: this.resizable ? rect.width : undefined,
            height: this.resizable ? rect.height : undefined,
          };

          if (!this.resizable) {
            delete positionData.width;
            delete positionData.height;
          }

          const storageKey = `${DraggableContainer.STORAGE_KEY_PREFIX}${this.id}`;
          GM_setValue(storageKey, positionData);
          this._log('Position saved on page unload:', positionData);
        } catch (e) {
          this._logError(e, 'saving container position on unload');
        }
      }
    });
  }





  
  

  // --- Private logging helper ---
  _log(...args) {
    if (this._debug) {
      Logger.setPrefix(this._loggerPrefix); // Ensure correct prefix
      Logger.debug(...args);
      Logger.setPrefix(''); // Reset prefix
    }
  }

  _logError(error, context) {
    Logger.setPrefix(this._loggerPrefix); // Ensure correct prefix
    Logger.error(error, context);
    Logger.setPrefix(''); // Reset prefix
  }
}

// Static property to track if base styles have been injected.
DraggableContainer.stylesInitialized = false;
// Static property to track the timeout for debounced saving.
DraggableContainer._savePositionTimeout = null;
// Static property to store the last used custom class name for removal logic
DraggableContainer._previousCustomClassName = '';


export default DraggableContainer;

