/**
 * Button - A reusable UI component for buttons.
 * Creates customizable, accessible buttons with various states and callbacks.
 */
import StyleManager from '../utils/StyleManager.js';

/**
 * A reusable UI component for creating accessible, customizable buttons.
 */
class Button {
  /**
     * Returns the unique base CSS class for the Button component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for buttons.
     */
  static get BASE_BUTTON_CLASS() {
    return 'userscripts-button';
  }
  /**
     * Returns the CSS variable prefix used for theming and styling the Button component.
     * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the button.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-button-';
  }
  /**
     * Initialize styles for all buttons.
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (Button.stylesInitialized) return;
    StyleManager.addStyles(`
      /* Scoped styles for Userscripts Button Component */
      .${Button.Button.BASE_BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        text-align: center;
      }
      
      /* Button sizes */
      .${Button.Button.BASE_BUTTON_CLASS}--small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      .${Button.Button.BASE_BUTTON_CLASS}--medium {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 2.25rem;
      }
      .${Button.Button.BASE_BUTTON_CLASS}--large {
        font-size: 1rem;
        padding: 0.75rem 1.5rem;
        min-height: 2.75rem;
      }
      
      /* Button themes using CSS variables */
      .${Button.Button.BASE_BUTTON_CLASS}--default {
        background-color: var(${Button.cssVarPrefix}bg-default);
        color: var(${Button.cssVarPrefix}color-default);
        border-color: var(${Button.cssVarPrefix}border-default);
      }
      .${Button.Button.BASE_BUTTON_CLASS}--default:hover:not(:disabled) {
        background-color: var(${Button.cssVarPrefix}bg-default-hover);
      }
      
      .${Button.Button.BASE_BUTTON_CLASS}--primary {
        background-color: var(${Button.cssVarPrefix}bg-primary);
        color: var(${Button.cssVarPrefix}color-primary);
        border-color: var(${Button.cssVarPrefix}border-primary);
      }
      .${Button.Button.BASE_BUTTON_CLASS}--primary:hover:not(:disabled) {
        background-color: var(${Button.cssVarPrefix}bg-primary-hover);
        border-color: var(${Button.cssVarPrefix}border-primary-hover);
      }
      
      .${Button.Button.BASE_BUTTON_CLASS}--secondary {
        background-color: var(${Button.cssVarPrefix}bg-secondary);
        color: var(${Button.cssVarPrefix}color-secondary);
        border-color: var(${Button.cssVarPrefix}border-secondary);
      }
      .${Button.Button.BASE_BUTTON_CLASS}--secondary:hover:not(:disabled) {
        background-color: var(${Button.cssVarPrefix}bg-secondary-hover);
        border-color: var(${Button.cssVarPrefix}border-secondary-hover);
      }
      
      .${Button.Button.BASE_BUTTON_CLASS}--success {
        background-color: var(${Button.cssVarPrefix}bg-success);
        color: var(${Button.cssVarPrefix}color-success);
        border-color: var(${Button.cssVarPrefix}border-success);
      }
      .${Button.Button.BASE_BUTTON_CLASS}--success:hover:not(:disabled) {
        background-color: var(${Button.cssVarPrefix}bg-success-hover);
        border-color: var(${Button.cssVarPrefix}border-success-hover);
      }
      
      .${Button.Button.BASE_BUTTON_CLASS}--danger {
        background-color: var(${Button.cssVarPrefix}bg-danger);
        color: var(${Button.cssVarPrefix}color-danger);
        border-color: var(${Button.cssVarPrefix}border-danger);
      }
      .${Button.Button.BASE_BUTTON_CLASS}--danger:hover:not(:disabled) {
        background-color: var(${Button.cssVarPrefix}bg-danger-hover);
        border-color: var(${Button.cssVarPrefix}border-danger-hover);
      }
      
      /* Button state styles */
      .${Button.Button.BASE_BUTTON_CLASS}:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      .${Button.Button.BASE_BUTTON_CLASS}:focus {
        outline: none;
        box-shadow: 0 0 0 3px var(${Button.cssVarPrefix}focus-shadow);
      }
      
      /* Button content */
      .${Button.Button.BASE_BUTTON_CLASS}__icon {
        display: inline-flex;
        margin-right: 0.5rem;
      }
      .${Button.Button.BASE_BUTTON_CLASS}__text {
        display: inline-block;
      }
    `, 'userscripts-button-styles');

    Button.stylesInitialized = true;
  }
  /**
     * Inject default color variables for the button component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-button-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          ${Button.CSS_VAR_PREFIX}bg-default: #f3f4f6;
          ${Button.CSS_VAR_PREFIX}color-default: #374151;
          ${Button.CSS_VAR_PREFIX}border-default: #d1d5db;
          ${Button.CSS_VAR_PREFIX}bg-default-hover: #e5e7eb;
          
          ${Button.CSS_VAR_PREFIX}bg-primary: #3b82f6;
          ${Button.CSS_VAR_PREFIX}color-primary: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-primary: #3b82f6;
          ${Button.CSS_VAR_PREFIX}bg-primary-hover: #2563eb;
          ${Button.CSS_VAR_PREFIX}border-primary-hover: #2563eb;
          
          ${Button.CSS_VAR_PREFIX}bg-secondary: #6b7280;
          ${Button.CSS_VAR_PREFIX}color-secondary: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-secondary: #6b7280;
          ${Button.CSS_VAR_PREFIX}bg-secondary-hover: #4b5563;
          ${Button.CSS_VAR_PREFIX}border-secondary-hover: #4b5563;
          
          ${Button.CSS_VAR_PREFIX}bg-success: #10b981;
          ${Button.CSS_VAR_PREFIX}color-success: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-success: #10b981;
          ${Button.CSS_VAR_PREFIX}bg-success-hover: #059669;
          ${Button.CSS_VAR_PREFIX}border-success-hover: #059669;
          
          ${Button.CSS_VAR_PREFIX}bg-danger: #ef4444;
          ${Button.CSS_VAR_PREFIX}color-danger: #ffffff;
          ${Button.CSS_VAR_PREFIX}border-danger: #ef4444;
          ${Button.CSS_VAR_PREFIX}bg-danger-hover: #dc2626;
          ${Button.CSS_VAR_PREFIX}border-danger-hover: #dc2626;
          
          ${Button.CSS_VAR_PREFIX}focus-shadow: rgba(59, 130, 246, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
  }
  /**
     * Create a new Button.
     * @param {Object} options - Configuration options.
     * @param {String} options.text - Button text.
     * @param {String} [options.type="button"] - Button type.
     * @param {String} [options.className] - Additional custom CSS class.
     * @param {Function} options.onClick - Click event handler.
     * @param {String} [options.id] - Button ID.
     * @param {HTMLElement} [options.container] - Container to append the button to.
     * @param {Object} [options.attributes={}] - Additional HTML attributes.
     * @param {String} [options.theme="default"] - Button theme.
     * @param {String} [options.size="medium"] - Button size.
     * @param {Boolean} [options.disabled=false] - Disabled state.
     * @param {String} [options.icon] - Optional icon HTML.
     * @param {String} [options.successText] - Success state text.
     * @param {Number} [options.successDuration=1500] - Success state duration (ms).
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
    this.button = null;
    this.textElement = null;
    Button.initStyles();
    this.create();
  }


  /**
     * Create the button element and, if a container is provided, append it.
     * @return {HTMLButtonElement} The created button element.
     */
  create() {
    this.button = document.createElement('button');
    this.button.type = this.type;
    this.button.disabled = this.disabled;
    if (this.id) this.button.id = this.id;
    this.button._buttonInstance = this;
    this.updateButtonClasses();
    this.updateContent();
    if (this.onClick) this.button.addEventListener('click', (e) => this.handleClick(e));
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.button.setAttribute(key, value);
    });
    if (this.container) this.container.appendChild(this.button);
    return this.button;
  }

  /**
     * Update the classes on the button element based on theme, size, and custom classes.
     */
  updateButtonClasses() {
    const classNames = [Button.BASE_BUTTON_CLASS];
    classNames.push(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
    classNames.push(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
    if (this.customClassName) classNames.push(this.customClassName);
    this.button.className = classNames.join(' ');
  }

  /**
     * Update the button content (icon and text).
     */
  updateContent() {
    this.button.innerHTML = '';
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = `${Button.BASE_BUTTON_CLASS}__icon`;
      iconSpan.innerHTML = this.icon;
      this.button.appendChild(iconSpan);
    }
    this.textElement = document.createElement('span');
    this.textElement.className = `${Button.BASE_BUTTON_CLASS}__text`;
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
     * @param {String} theme - The new theme (e.g., "default", "primary", etc.).
     */
  setTheme(theme) {
    this.button.classList.remove(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
    this.theme = theme;
    this.button.classList.add(`${Button.BASE_BUTTON_CLASS}--${this.theme}`);
  }

  /**
     * Change the button's size.
     * @param {String} size - The new size (e.g., "small", "medium", "large").
     */
  setSize(size) {
    this.button.classList.remove(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
    this.size = size;
    this.button.classList.add(`${Button.BASE_BUTTON_CLASS}--${this.size}`);
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
Button.initStyles();

export default Button;
