/**
 * Button - A reusable UI component for buttons
 * Creates customizable, accessible buttons with various states and callbacks
 */
import StyleManager from '../utils/StyleManager.js';

class Button {
  /**
     * Initialize styles for all buttons
     */
  static initStyles() {
    // This will be called only once, when the first instance is created
    if (Button.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .reusable-button {
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
      .reusable-button--small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .reusable-button--medium {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
      }
      
      .reusable-button--large {
        font-size: 1rem;
        padding: 0.75rem 1.5rem;
        min-height: 2.75rem;
      }
      
      /* Button themes */
      .reusable-button--default {
        background-color: #f3f4f6;
        color: #374151;
        border-color: #d1d5db;
      }
      
      .reusable-button--default:hover:not(:disabled) {
        background-color: #e5e7eb;
      }
      
      .reusable-button--primary {
        background-color: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
      }
      
      .reusable-button--primary:hover:not(:disabled) {
        background-color: #2563eb;
        border-color: #2563eb;
      }
      
      .reusable-button--secondary {
        background-color: #6b7280;
        color: #ffffff;
        border-color: #6b7280;
      }
      
      .reusable-button--secondary:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #4b5563;
      }
      
      .reusable-button--success {
        background-color: #10b981;
        color: #ffffff;
        border-color: #10b981;
      }
      
      .reusable-button--success:hover:not(:disabled) {
        background-color: #059669;
        border-color: #059669;
      }
      
      .reusable-button--danger {
        background-color: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
      }
      
      .reusable-button--danger:hover:not(:disabled) {
        background-color: #dc2626;
        border-color: #dc2626;
      }
      
      /* Button states */
      .reusable-button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      .reusable-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }
      
      /* Button content */
      .reusable-button__icon {
        display: inline-flex;
        margin-right: 0.5rem;
      }
      
      .reusable-button__text {
        display: inline-block;
      }
    `, 'reusable-button-styles');

    Button.stylesInitialized = true;
  }
  /**
     * Create a new button
     * @param {Object} options - Configuration options
     * @param {String} options.text - Button text
     * @param {String} options.type - Button type (button, submit, reset)
     * @param {String} options.className - Button CSS class
     * @param {Function} options.onClick - Click event handler
     * @param {String} options.id - Button ID
     * @param {HTMLElement} options.container - Container to append button to
     * @param {Object} options.attributes - Additional HTML attributes
     * @param {String} options.theme - Button theme (primary, secondary, success, danger)
     * @param {String} options.size - Button size (small, medium, large)
     * @param {Boolean} options.disabled - Whether button is initially disabled
     * @param {String} options.icon - Optional icon HTML to show before text
     * @param {String} options.successText - Text to show on success state
     * @param {Number} options.successDuration - Duration to show success state (ms)
     */
  constructor(options) {
    this.text = options.text || '';
    this.type = options.type || 'button';
    this.className = options.className || 'reusable-button';
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

    this.button = null;
    Button.initStyles();
    this.create();
  }


  /**
     * Create the button element
     * @return {HTMLButtonElement} The created button
     */
  create() {
    this.button = document.createElement('button');

    // Set basic properties
    this.button.type = this.type;
    this.button.className = this.getButtonClasses();
    this.button.disabled = this.disabled;

    // Set ID if provided
    if (this.id) {
      this.button.id = this.id;
    }

    // Set content (icon + text)
    this.updateContent();

    // Add click handler
    if (this.onClick) {
      this.button.addEventListener('click', (e) => this.handleClick(e));
    }

    // Add additional attributes
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.button.setAttribute(key, value);
    });

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.button);
    }

    return this.button;
  }

  /**
     * Handle click events, with success state support
     * @param {Event} e - Click event
     */
  handleClick(e) {
    if (this.disabled) return;

    // Call the onClick handler
    const result = this.onClick(e);

    // Handle success state if successText is set
    if (this.successText && false !== result) {
      this.showSuccessState();
    }
  }

  /**
     * Show success state animation
     */
  showSuccessState() {
    // Store original button state
    const originalText = this.text;
    const originalClasses = this.button.className;

    // Update to success state
    this.setText(this.successText);
    this.button.className = this.getButtonClasses('success');

    // Set timeout to revert back
    setTimeout(() => {
      this.setText(originalText);
      this.button.className = originalClasses;
    }, this.successDuration);
  }

  /**
     * Generate button classes based on theme and size
     * @param {String} state - Optional state override (success, error, etc)
     * @return {String} Combined CSS classes
     */
  getButtonClasses(state = null) {
    const classes = [this.className];

    // Add theme class
    const theme = state || this.theme;
    classes.push(`${this.className}--${theme}`);

    // Add size class
    classes.push(`${this.className}--${this.size}`);

    return classes.join(' ');
  }

  /**
     * Update button content (icon + text)
     */
  updateContent() {
    // Clear existing content
    this.button.innerHTML = '';

    // Add icon if present
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = `${this.className}__icon`;
      iconSpan.innerHTML = this.icon;
      this.button.appendChild(iconSpan);
    }

    // Add text
    const textSpan = document.createElement('span');
    textSpan.className = `${this.className}__text`;
    textSpan.textContent = this.text;
    this.button.appendChild(textSpan);
  }

  /**
     * Set button text
     * @param {String} text - New button text
     */
  setText(text) {
    this.text = text;
    const textElement = this.button.querySelector(`.${this.className}__text`);
    if (textElement) {
      textElement.textContent = text;
    } else {
      this.updateContent();
    }
  }

  /**
     * Reset button text to original
     */
  resetText() {
    this.setText(this.originalText);
  }

  /**
     * Set icon content
     * @param {String} iconHtml - HTML for the icon
     */
  setIcon(iconHtml) {
    this.icon = iconHtml;
    this.updateContent();
  }

  /**
     * Enable or disable the button
     * @param {Boolean} disabled - Whether the button should be disabled
     */
  setDisabled(disabled) {
    this.disabled = disabled;
    this.button.disabled = disabled;
  }

  /**
     * Toggle button disabled state
     * @return {Boolean} New disabled state
     */
  toggleDisabled() {
    this.setDisabled(!this.disabled);
    return this.disabled;
  }

  /**
     * Set button theme
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;
    this.button.className = this.getButtonClasses();
  }

  /**
     * Set button size
     * @param {String} size - Size name
     */
  setSize(size) {
    this.size = size;
    this.button.className = this.getButtonClasses();
  }
}

// Static property to track if styles have been initialized
Button.stylesInitialized = false;

// Initialize styles when imported
Button.initStyles();

export default Button;
