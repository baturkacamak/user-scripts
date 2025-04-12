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
     */
  static initStyles() {
    if (DraggableContainer.stylesInitialized) return;

    StyleManager.addStyles(`
      /* Scoped styles for Userscripts DraggableContainer Component */
      .${DraggableContainer.BASE_CONTAINER_CLASS} {
        position: fixed;
        z-index: 9999;
        border-radius: var(${DraggableContainer.CSS_VAR_PREFIX}border-radius, 8px);
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}bg, #ffffff);
        box-shadow: var(${DraggableContainer.CSS_VAR_PREFIX}shadow, 0 2px 10px rgba(0, 0, 0, 0.2));
        overflow: hidden;
        transition: opacity 0.3s ease, transform 0.2s ease;
        max-width: 90vw;
        max-height: 90vh;
        resize: both;
      }
      
      /* Handle for dragging */
      .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        padding: 10px 15px;
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}handle-bg, #f0f0f0);
        cursor: grab;
        user-select: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(${DraggableContainer.CSS_VAR_PREFIX}border-color, #e0e0e0);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__handle:active {
        cursor: grabbing;
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__title {
        margin: 0;
        font-weight: bold;
        font-size: var(${DraggableContainer.CSS_VAR_PREFIX}title-size, 14px);
        color: var(${DraggableContainer.CSS_VAR_PREFIX}title-color, #333333);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__actions {
        display: flex;
        gap: 8px;
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__action {
        background: none;
        border: none;
        cursor: pointer;
        color: var(${DraggableContainer.CSS_VAR_PREFIX}action-color, #666666);
        font-size: 14px;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__action:hover {
        color: var(${DraggableContainer.CSS_VAR_PREFIX}action-hover-color, #333333);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
        padding: var(${DraggableContainer.CSS_VAR_PREFIX}content-padding, 15px);
        overflow: auto;
      }
      
      /* Sizes */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--small {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}small-width, 250px);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--medium {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}medium-width, 350px);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--large {
        width: var(${DraggableContainer.CSS_VAR_PREFIX}large-width, 450px);
      }
      
      /* Themes */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--default .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}default-handle-bg, #f0f0f0);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--primary .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}primary-handle-bg, #3b82f6);
        color: var(${DraggableContainer.CSS_VAR_PREFIX}primary-handle-color, #ffffff);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--secondary .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-bg, #6b7280);
        color: var(${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-color, #ffffff);
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--success .${DraggableContainer.BASE_CONTAINER_CLASS}__handle {
        background-color: var(${DraggableContainer.CSS_VAR_PREFIX}success-handle-bg, #10b981);
        color: var(${DraggableContainer.CSS_VAR_PREFIX}success-handle-color, #ffffff);
      }
      
      /* State modifiers */
      .${DraggableContainer.BASE_CONTAINER_CLASS}--minimized .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
        display: none;
      }
      
      .${DraggableContainer.BASE_CONTAINER_CLASS}--minimized {
        resize: none;
      }
      
      /* Animation for minimizing/maximizing */
      .${DraggableContainer.BASE_CONTAINER_CLASS}__content {
        transition: height 0.3s ease;
      }
    `, 'userscripts-draggable-container-styles');

    DraggableContainer.stylesInitialized = true;
  }
  /**
     * Inject default color variables for the container component into the :root.
     * Users can call this method to automatically set a default color palette.
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
          
          ${DraggableContainer.CSS_VAR_PREFIX}handle-bg: #f0f0f0;
          ${DraggableContainer.CSS_VAR_PREFIX}title-color: #333333;
          ${DraggableContainer.CSS_VAR_PREFIX}title-size: 14px;
          
          ${DraggableContainer.CSS_VAR_PREFIX}action-color: #666666;
          ${DraggableContainer.CSS_VAR_PREFIX}action-hover-color: #333333;
          
          ${DraggableContainer.CSS_VAR_PREFIX}content-padding: 15px;
          
          ${DraggableContainer.CSS_VAR_PREFIX}small-width: 250px;
          ${DraggableContainer.CSS_VAR_PREFIX}medium-width: 350px;
          ${DraggableContainer.CSS_VAR_PREFIX}large-width: 450px;
          
          ${DraggableContainer.CSS_VAR_PREFIX}default-handle-bg: #f0f0f0;
          
          ${DraggableContainer.CSS_VAR_PREFIX}primary-handle-bg: #3b82f6;
          ${DraggableContainer.CSS_VAR_PREFIX}primary-handle-color: #ffffff;
          
          ${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-bg: #6b7280;
          ${DraggableContainer.CSS_VAR_PREFIX}secondary-handle-color: #ffffff;
          
          ${DraggableContainer.CSS_VAR_PREFIX}success-handle-bg: #10b981;
          ${DraggableContainer.CSS_VAR_PREFIX}success-handle-color: #ffffff;
        }
      `;
      document.head.appendChild(style);
    }
  }
/**
     * Create a new DraggableContainer.
     * @param {Object} options - Configuration options.
     * @param {String} options.title - Container title displayed in the handle.
     * @param {String} [options.id] - Container unique ID, used for position saving.
     * @param {String} [options.className] - Additional custom CSS class.
     * @param {HTMLElement} [options.container=document.body] - Container to append the draggable container to.
     * @param {String} [options.theme="default"] - Container theme.
     * @param {String} [options.size="medium"] - Container size.
     * @param {Boolean} [options.minimizable=true] - Whether the container can be minimized.
     * @param {Boolean} [options.closable=true] - Whether the container can be closed.
     * @param {Boolean} [options.resizable=true] - Whether the container can be resized.
     * @param {Number} [options.defaultX=20] - Default X position if no saved position exists.
     * @param {Number} [options.defaultY=20] - Default Y position if no saved position exists.
     * @param {Function} [options.onClose] - Callback when container is closed.
     * @param {Function} [options.onMinimize] - Callback when container is minimized/maximized.
     * @param {Function} [options.onMove] - Callback when container is moved.
     * @param {Function} [options.onResize] - Callback when container is resized.
     * @param {Function} [options.onInit] - Callback when container is initialized.
     * @param {Boolean} [options.debug=false] - Enable debug logging.
     */
  constructor(options) {
    // Ensure GMFunctions are initialized
    GMFunctions.initialize();

    // Initialize options with defaults
    this.title = options.title || 'Draggable Container';
    this.id = options.id || `container-${Date.now()}`;
    this.customClassName = options.className || '';
    this.parentContainer = options.container || document.body;
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.minimizable = options.minimizable !== undefined ? options.minimizable : true;
    this.closable = options.closable !== undefined ? options.closable : true;
    this.resizable = options.resizable !== undefined ? options.resizable : true;
    this.defaultX = options.defaultX !== undefined ? options.defaultX : 20;
    this.defaultY = options.defaultY !== undefined ? options.defaultY : 20;
    this.onClose = options.onClose;
    this.onMinimize = options.onMinimize;
    this.onMove = options.onMove;
    this.onResize = options.onResize;
    this.onInit = options.onInit;

    // Set logger prefix for debugging
    if (options.debug) {
      Logger.DEBUG = true;
    }
    Logger.setPrefix(`DraggableContainer(${this.id})`);

    // State tracking
    this.isMinimized = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.containerStartX = 0;
    this.containerStartY = 0;

    // References to DOM elements
    this.containerElement = null;
    this.handleElement = null;
    this.contentElement = null;

    // Initialize styles
    DraggableContainer.initStyles();

    // Create the container
    this.create();

    // Load saved position
    this.loadPosition();

    // Call onInit callback if provided
    if (this.onInit) {
      this.onInit(this);
    }

    Logger.log(`DraggableContainer initialized: ${this.id}`);
  }





  
  

  /**
     * Create the container element and append it to the parent container.
     * @return {HTMLElement} The created container element.
     */
  create() {
    // Create main container
    this.containerElement = document.createElement('div');
    this.containerElement.id = this.id;
    this.containerElement._containerInstance = this;

    // Set initial classes
    this.updateContainerClasses();

    // Make resizable if needed
    if (this.resizable) {
      this.containerElement.style.resize = 'both';
      this.containerElement.style.overflow = 'hidden';
    } else {
      this.containerElement.style.resize = 'none';
    }

    // Create handle for dragging
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
      const minimizeButton = document.createElement('button');
      minimizeButton.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__action`;
      minimizeButton.innerHTML = '−'; // Unicode minus
      minimizeButton.title = 'Minimize';
      minimizeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
      actionsContainer.appendChild(minimizeButton);
    }

    // Add close button if needed
    if (this.closable) {
      const closeButton = document.createElement('button');
      closeButton.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__action`;
      closeButton.innerHTML = '×'; // Unicode times
      closeButton.title = 'Close';
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      actionsContainer.appendChild(closeButton);
    }

    this.handleElement.appendChild(actionsContainer);
    this.containerElement.appendChild(this.handleElement);

    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = `${DraggableContainer.BASE_CONTAINER_CLASS}__content`;
    this.containerElement.appendChild(this.contentElement);

    // Setup drag functionality
    this.setupDragging();

    // Setup resize event listener if needed
    if (this.resizable && this.onResize) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.containerElement) {
            this.onResize({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
            // Save the new size
            this.savePosition();
          }
        }
      });
      resizeObserver.observe(this.containerElement);
    }

    // Add to parent container
    this.parentContainer.appendChild(this.containerElement);

    return this.containerElement;
  }

  /**
     * Update container classes based on theme, size, and custom classes.
     */
  updateContainerClasses() {
    const classNames = [DraggableContainer.BASE_CONTAINER_CLASS];
    classNames.push(`${DraggableContainer.BASE_CONTAINER_CLASS}--${this.theme}`);
    classNames.push(`${DraggableContainer.BASE_CONTAINER_CLASS}--${this.size}`);

    if (this.isMinimized) {
      classNames.push(`${DraggableContainer.BASE_CONTAINER_CLASS}--minimized`);
    }

    if (this.customClassName) {
      classNames.push(this.customClassName);
    }

    this.containerElement.className = classNames.join(' ');
  }

  /**
     * Setup dragging functionality for the container.
     */
  setupDragging() {
    // Mouse down event on handle to start dragging
    this.handleElement.addEventListener('mousedown', (e) => {
      // Ignore if clicking on action buttons
      if (e.target.closest(`.${DraggableContainer.BASE_CONTAINER_CLASS}__action`)) {
        return;
      }

      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const rect = this.containerElement.getBoundingClientRect();
      this.containerStartX = rect.left;
      this.containerStartY = rect.top;

      this.handleElement.style.cursor = 'grabbing';

      // Prevent text selection during drag
      e.preventDefault();
    });

    // Mouse move event for dragging
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      const newX = this.containerStartX + deltaX;
      const newY = this.containerStartY + deltaY;

      // Apply new position (onMove callback is called inside setPosition)
      this.setPosition(newX, newY);
    });

    // Mouse up event to stop dragging
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.handleElement.style.cursor = 'grab';

        // Save the new position
        this.savePosition();
      }
    });
  }

  /**
     * Set the container's position.
     * @param {Number} x - X coordinate.
     * @param {Number} y - Y coordinate.
     * @param {Boolean} [preventCallback=false] - Whether to prevent calling the onMove callback.
     * @return {Object} The bounded coordinates that were applied.
     */
  setPosition(x, y, preventCallback = false) {
    // Make sure container stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerWidth = this.containerElement.offsetWidth;
    const containerHeight = this.containerElement.offsetHeight;

    // Ensure at least 50px of the container is always visible
    const minVisiblePx = 50;

    // Calculate bounds
    const boundedX = Math.max(minVisiblePx - containerWidth, Math.min(x, viewportWidth - minVisiblePx));
    const boundedY = Math.max(0, Math.min(y, viewportHeight - minVisiblePx));

    this.containerElement.style.left = boundedX + 'px';
    this.containerElement.style.top = boundedY + 'px';

    // Call onMove callback if provided and not prevented
    if (this.onMove && !preventCallback) {
      this.onMove({x: boundedX, y: boundedY});
    }

    return {x: boundedX, y: boundedY};
  }

  /**
     * Save the container's position to persistent storage using GMFunctions.
     */
  savePosition() {
    try {
      const rect = this.containerElement.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        minimized: this.isMinimized,
      };

      // Use GM_setValue for persistent storage with fallback
      GM_setValue(
          `${DraggableContainer.STORAGE_KEY_PREFIX}${this.id}`,
          position,
      );

      Logger.log(`Container position saved for ${this.id}:`, position);
    } catch (e) {
      Logger.error(e, 'Saving container position');
    }
  }

  /**
     * Load the container's position from persistent storage using GMFunctions.
     */
  loadPosition() {
    try {
      // Use GM_getValue for persistent storage with fallback
      const position = GM_getValue(
          `${DraggableContainer.STORAGE_KEY_PREFIX}${this.id}`,
          null,
      );

      if (position) {
        Logger.log(`Container position loaded for ${this.id}:`, position);

        // Apply position
        this.setPosition(position.x, position.y);

        // Apply size if resizable
        if (this.resizable && position.width && position.height) {
          this.setSize(position.width, position.height);
        }

        // Apply minimized state
        if (position.minimized) {
          this.isMinimized = true;
          this.updateContainerClasses();
        }
      } else {
        Logger.log(`No saved position found for ${this.id}, using defaults:`, {
          x: this.defaultX,
          y: this.defaultY,
        });

        // Apply default position
        this.setPosition(this.defaultX, this.defaultY);
      }
    } catch (e) {
      Logger.error(e, 'Loading container position');
      // Apply default position
      this.setPosition(this.defaultX, this.defaultY);
    }
  }

  /**
     * Set the container's size.
     * @param {Number} width - Width in pixels.
     * @param {Number} height - Height in pixels.
     */
  setSize(width, height) {
    if (!this.resizable) return;

    this.containerElement.style.width = width + 'px';
    this.containerElement.style.height = height + 'px';
  }

  /**
     * Toggle the minimized state of the container.
     */
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.updateContainerClasses();

    // Call the onMinimize callback if provided
    if (this.onMinimize) {
      this.onMinimize(this.isMinimized);
    }

    // Save the state
    this.savePosition();
  }

  /**
     * Close the container.
     */
  close() {
    if (this.onClose) {
      this.onClose();
    }

    // Remove the container from DOM
    if (this.containerElement && this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
    }
  }

  /**
     * Set the container's theme.
     * @param {String} theme - The theme name.
     */
  setTheme(theme) {
    this.theme = theme;
    this.updateContainerClasses();
  }

  /**
     * Set the container's size class.
     * @param {String} size - The size name (small, medium, large).
     */
  setSize(size) {
    this.size = size;
    this.updateContainerClasses();
  }

  /**
     * Set custom class for the container.
     * @param {String} className - The custom class name.
     */
  setCustomClass(className) {
    if (this.customClassName) {
      this.containerElement.classList.remove(this.customClassName);
    }
    this.customClassName = className;
    if (className) {
      this.containerElement.classList.add(className);
    }
  }

  /**
     * Set the container's title.
     * @param {String} title - The new title.
     */
  setTitle(title) {
    this.title = title;
    const titleElement = this.handleElement.querySelector(`.${DraggableContainer.BASE_CONTAINER_CLASS}__title`);
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
     * Add content to the container.
     * @param {HTMLElement|String} content - Content to add (HTML element or HTML string).
     */
  setContent(content) {
    if (!this.contentElement) return;

    // Clear existing content
    this.contentElement.innerHTML = '';

    // Add new content
    if ('string' === typeof content) {
      this.contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentElement.appendChild(content);
    }
  }

  /**
     * Append content to the container.
     * @param {HTMLElement|String} content - Content to append (HTML element or HTML string).
     */
  appendContent(content) {
    if (!this.contentElement) return;

    // Add new content
    if ('string' === typeof content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Append each child node
      while (tempDiv.firstChild) {
        this.contentElement.appendChild(tempDiv.firstChild);
      }
    } else if (content instanceof HTMLElement) {
      this.contentElement.appendChild(content);
    }
  }

  /**
     * Show the container if it's hidden.
     */
  show() {
    if (this.containerElement) {
      this.containerElement.style.display = '';
    }
  }

  /**
     * Hide the container.
     */
  hide() {
    if (this.containerElement) {
      this.containerElement.style.display = 'none';
    }
  }
}

// Static property to track if styles have been initialized.
DraggableContainer.stylesInitialized = false;

export default DraggableContainer;
