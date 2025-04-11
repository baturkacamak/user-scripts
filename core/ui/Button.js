/**
 * Button - A reusable UI component for buttons.
 * Creates customizable, accessible buttons with various states and callbacks.
 */
import StyleManager from '../utils/StyleManager.js';

// Define a unique base class for buttons to avoid collisions.
const BASE_BUTTON_CLASS = 'userscripts-button';

class Button {
  /**
     * Initialize styles for all buttons.
     */
  static initStyles() {
    // Only add styles once.
    if (Button.stylesInitialized) return;

    // Use template literals to inject the BASE_BUTTON_CLASS variable
    StyleManager.addStyles(`
      .${BASE_BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        white-space: nowrap;
        text-align: center;
      }
      
      /* Button sizes */
      .${BASE_BUTTON_CLASS}--small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .${BASE_BUTTON_CLASS}--medium {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
      }
      
      .${BASE_BUTTON_CLASS}--large {
        font-size: 1rem;
        padding: 0.75rem 1.5rem;
        min-height: 2.75rem;
      }
      
      /* Button themes */
      .${BASE_BUTTON_CLASS}--default {
        background-color: #f3f4f6;
        color: #374151;
        border-color: #d1d5db;
      }
      
      .${BASE_BUTTON_CLASS}--default:hover:not(:disabled) {
        background-color: #e5e7eb;
      }
      
      .${BASE_BUTTON_CLASS}--primary {
        background-color: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
      }
      
      .${BASE_BUTTON_CLASS}--primary:hover:not(:disabled) {
        background-color: #2563eb;
        border-color: #2563eb;
      }
      
      .${BASE_BUTTON_CLASS}--secondary {
        background-color: #6b7280;
        color: #ffffff;
        border-color: #6b7280;
      }
      
      .${BASE_BUTTON_CLASS}--secondary:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #4b5563;
      }
      
      .${BASE_BUTTON_CLASS}--success {
        background-color: #10b981;
        color: #ffffff;
        border-color: #10b981;
      }
      
      .${BASE_BUTTON_CLASS}--success:hover:not(:disabled) {
        background-color: #059669;
        border-color: #059669;
      }
      
      .${BASE_BUTTON_CLASS}--danger {
        background-color: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
      
      .${BASE_BUTTON_CLASS}--danger:hover:not(:disabled) {
        background-color: #dc2626;
        border-color: #dc2626;
      }
      
      /* Button states */
      .${BASE_BUTTON_CLASS}:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      .${BASE_BUTTON_CLASS}:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }
      
      /* Button content */
      .${BASE_BUTTON_CLASS}__icon {
        display: inline-flex;
        margin-right: 0.5rem;
      }
      
      .${BASE_BUTTON_CLASS}__text {
        display: inline-block;
      }
    `, 'reusable-button-styles');

    Button.stylesInitialized = true;
  }
  /**
     * Create a new Button.
     * @param {Object} options - Configuration options.
     * @param {String} options.text - Button text.
     * @param {String} [options.type="button"] - Button type (e.g., "button", "submit").
     * @param {String} [options.className] - Additional custom CSS class for the button.
     * @param {Function} options.onClick - Click event handler.
     * @param {String} [options.id] - Button ID.
     * @param {HTMLElement} [options.container] - Container to append the button to.
     * @param {Object} [options.attributes={}] - Additional HTML attributes.
     * @param {String} [options.theme="default"] - Button theme ("default", "primary", etc.).
     * @param {String} [options.size="medium"] - Button size ("small", "medium", "large").
     * @param {Boolean} [options.disabled=false] - Initial disabled state.
     * @param {String} [options.icon] - Optional HTML for an icon to display.
     * @param {String} [options.successText] - Text to show on success state.
     * @param {Number} [options.successDuration=1500] - Duration (ms) to show success state.
     */
  constructor(options) {
    this.text = options.text || '';
    this.type = options.type || 'button';
    this.customClassName = options.className || '';
    this.onClick = options.onClick;
    this.id = options.id;
    this.container = options.container;
    this.attributes = options.attributes || {};
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.disabled = options.disabled || false;
    this.icon = options.icon || null;
    this.successText = options.successText || null;
    this.successDuration = options.successDuration || 1500;
    this.originalText = this.text;

    // These properties will refer to the DOM elements.
    this.button = null;
    this.textElement = null;

    // Initialize styles (only once globally)
    Button.initStyles();
    this.create();
  }


  /**
     * Create the button element and append it to the container if provided.
     * @return {HTMLButtonElement} The created button element.
     */
  create() {
    this.button = document.createElement('button');
    this.button.type = this.type;
    this.button.disabled = this.disabled;
    if (this.id) {
      this.button.id = this.id;
    }
    // Store the button instance in the DOM element for external reference.
    this.button._buttonInstance = this;

    // Apply classes based on theme, size, and any custom class.
    this.updateButtonClasses();

    // Set the button's content (icon and text).
    this.updateContent();

    // Set up click handler if provided.
    if (this.onClick) {
      this.button.addEventListener('click', (e) => this.handleClick(e));
    }

    // Add any additional attributes.
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.button.setAttribute(key, value);
    });

    // Append to the container if provided.
    if (this.container) {
      this.container.appendChild(this.button);
    }

    return this.button;
  }

  /**
     * Update the classes on the button element.
     * Uses the base class defined in BASE_BUTTON_CLASS.
     */
  updateButtonClasses() {
    const classNames = [BASE_BUTTON_CLASS];
    classNames.push(`${BASE_BUTTON_CLASS}--${this.theme}`);
    classNames.push(`${BASE_BUTTON_CLASS}--${this.size}`);
    if (this.customClassName) {
      classNames.push(this.customClassName);
    }
    this.button.className = classNames.join(' ');
  }

  /**
     * Update the content of the button (icon and text).
     * The icon (if provided) is inserted first, followed by the text.
     */
  updateContent() {
    // Clear any existing content.
    this.button.innerHTML = '';

    // Add icon if provided.
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = `${BASE_BUTTON_CLASS}__icon`;
      iconSpan.innerHTML = this.icon;
      this.button.appendChild(iconSpan);
    }

    // Create a span for the text.
    this.textElement = document.createElement('span');
    this.textElement.className = `${BASE_BUTTON_CLASS}__text`;
    this.textElement.textContent = this.text;
    this.button.appendChild(this.textElement);
  }

  /**
     * Handle click events on the button.
     * @param {Event} e - The click event.
     */
  handleClick(e) {
    if (this.disabled) return;
    const result = this.onClick(e);
    // If onClick returns something other than false and successText is defined, show success animation.
    if (this.successText && false !== result) {
      this.showSuccessState();
    }
  }

  /**
     * Show a success state by temporarily changing the button's text and theme.
     */
  showSuccessState() {
    const originalText = this.text;
    const originalTheme = this.theme;
    this.setText(this.successText);
    this.setTheme('success');
    setTimeout(() => {
      this.setText(originalText);
      this.setTheme(originalTheme);
    }, this.successDuration);
  }

  /**
     * Set the button's text.
     * @param {String} text - The new text to display.
     */
  setText(text) {
    this.text = text;
    if (this.textElement) {
      this.textElement.textContent = text;
    } else {
      this.updateContent();
    }
  }

  /**
     * Reset the button's text to its original value.
     */
  resetText() {
    this.setText(this.originalText);
  }

  /**
     * Set an icon for the button.
     * @param {String} iconHtml - The HTML string for the icon.
     */
  setIcon(iconHtml) {
    this.icon = iconHtml;
    this.updateContent();
  }

  /**
     * Enable or disable the button.
     * @param {Boolean} disabled - Whether the button should be disabled.
     */
  setDisabled(disabled) {
    this.disabled = disabled;
    this.button.disabled = disabled;
  }

  /**
     * Toggle the disabled state of the button.
     * @return {Boolean} The new disabled state.
     */
  toggleDisabled() {
    this.setDisabled(!this.disabled);
    return this.disabled;
  }

  /**
     * Change the button's theme.
     * @param {String} theme - The new theme (e.g., 'default', 'primary', etc.).
     */
  setTheme(theme) {
    // Remove the old theme class.
    this.button.classList.remove(`${BASE_BUTTON_CLASS}--${this.theme}`);
    this.theme = theme;
    // Add the new theme class.
    this.button.classList.add(`${BASE_BUTTON_CLASS}--${this.theme}`);
  }

  /**
     * Change the button's size.
     * @param {String} size - The new size (e.g., 'small', 'medium', 'large').
     */
  setSize(size) {
    // Remove the old size class.
    this.button.classList.remove(`${BASE_BUTTON_CLASS}--${this.size}`);
    this.size = size;
    // Add the new size class.
    this.button.classList.add(`${BASE_BUTTON_CLASS}--${this.size}`);
  }

  /**
     * Apply a custom CSS class to the button.
     * @param {String} className - The custom class name.
     */
  setCustomClass(className) {
    if (this.customClassName) {
      this.button.classList.remove(this.customClassName);
    }
    this.customClassName = className;
    if (className) {
      this.button.classList.add(className);
    }
  }
}

// Static property to track if styles have been initialized.
Button.stylesInitialized = false;

// Initialize styles when imported.
Button.initStyles();

export default Button;
