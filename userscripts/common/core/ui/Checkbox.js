/**
 * Checkbox - A reusable UI component for checkboxes.
 * Creates customizable, accessible checkboxes with various states and callbacks.
 */
import StyleManager from '../utils/StyleManager.js';
import HTMLUtils from '../utils/HTMLUtils.js';

/**
 * A reusable UI component for creating accessible, customizable checkboxes.
 */
class Checkbox {
  /**
     * Returns the unique base CSS class for the Checkbox component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for checkboxes.
     */
  static get BASE_CHECKBOX_CLASS() {
    return 'userscripts-checkbox';
  }
  /**
     * Returns the CSS variable prefix used for theming and styling the Checkbox component.
     * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the checkbox.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-checkbox-';
  }
  /**
     * Initialize styles for all checkboxes.
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (Checkbox.stylesInitialized) return;
    StyleManager.addStyles(`
      /* Scoped styles for Userscripts Checkbox Component */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container {
        display: inline-flex;
        align-items: center;
        position: relative;
        cursor: pointer;
        user-select: none;
        font-family: inherit;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      
      /* Hide native checkbox */
      .${Checkbox.BASE_CHECKBOX_CLASS}-native {
        position: absolute;
        opacity: 0;
        height: 0;
        width: 0;
      }
      
      /* Custom checkbox appearance */
      .${Checkbox.BASE_CHECKBOX_CLASS} {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 0.25rem;
        border: 2px solid var(${Checkbox.CSS_VAR_PREFIX}border-color);
        background-color: var(${Checkbox.CSS_VAR_PREFIX}bg);
        transition: all 0.2s ease;
        position: relative;
      }
      
      /* Check mark (initially hidden) */
      .${Checkbox.BASE_CHECKBOX_CLASS}::after {
        content: '';
        position: absolute;
        opacity: 0;
        transform: rotate(45deg) scale(0);
        width: 0.3125rem;
        height: 0.625rem;
        border-right: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
        border-bottom: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
        transition: all 0.2s ease;
      }
      
      /* When checkbox is checked */
      .${Checkbox.BASE_CHECKBOX_CLASS}--checked {
        background-color: var(${Checkbox.CSS_VAR_PREFIX}checked-bg);
        border-color: var(${Checkbox.CSS_VAR_PREFIX}checked-border);
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--checked::after {
        opacity: 1;
        transform: rotate(45deg) scale(1);
      }
      
      /* Indeterminate state */
      .${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate::after {
        opacity: 1;
        transform: rotate(0) scale(1);
        width: 0.625rem;
        height: 0.125rem;
        border-right: none;
        border-bottom: 2px solid var(${Checkbox.CSS_VAR_PREFIX}checkmark-color);
      }
      
      /* On hover */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container:hover .${Checkbox.BASE_CHECKBOX_CLASS}:not(.${Checkbox.BASE_CHECKBOX_CLASS}--checked):not(.${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate) {
        border-color: var(${Checkbox.CSS_VAR_PREFIX}hover-border);
        background-color: var(${Checkbox.CSS_VAR_PREFIX}hover-bg);
      }
      
      /* On focus */
      .${Checkbox.BASE_CHECKBOX_CLASS}-container:focus-within .${Checkbox.BASE_CHECKBOX_CLASS} {
        box-shadow: 0 0 0 3px var(${Checkbox.CSS_VAR_PREFIX}focus-shadow);
      }
      
      /* Label styles */
      .${Checkbox.BASE_CHECKBOX_CLASS}-label {
        margin-left: 0.5rem;
        font-size: 0.875rem;
      }
      
      /* Checkbox sizes */
      .${Checkbox.BASE_CHECKBOX_CLASS}--small {
        width: 1rem;
        height: 1rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--small::after {
        width: 0.25rem;
        height: 0.5rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--large {
        width: 1.5rem;
        height: 1.5rem;
      }
      
      .${Checkbox.BASE_CHECKBOX_CLASS}--large::after {
        width: 0.375rem;
        height: 0.75rem;
      }
    `, 'userscripts-checkbox-styles');

    Checkbox.stylesInitialized = true;
  }
  /**
     * Inject default color variables for the checkbox component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-checkbox-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      HTMLUtils.setHTMLSafely(style, `
        :root {
          /* Default state */
          ${Checkbox.CSS_VAR_PREFIX}bg: #ffffff;
          ${Checkbox.CSS_VAR_PREFIX}border-color: #d1d5db;
          ${Checkbox.CSS_VAR_PREFIX}hover-bg: #f3f4f6;
          ${Checkbox.CSS_VAR_PREFIX}hover-border: #9ca3af;
          
          /* Checked state */
          ${Checkbox.CSS_VAR_PREFIX}checked-bg: #3b82f6;
          ${Checkbox.CSS_VAR_PREFIX}checked-border: #3b82f6;
          ${Checkbox.CSS_VAR_PREFIX}checkmark-color: #ffffff;
          
          /* Focus state */
          ${Checkbox.CSS_VAR_PREFIX}focus-shadow: rgba(59, 130, 246, 0.3);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            /* Default state */
            ${Checkbox.CSS_VAR_PREFIX}bg: #2d2d2d;
            ${Checkbox.CSS_VAR_PREFIX}border-color: #555;
            ${Checkbox.CSS_VAR_PREFIX}hover-bg: #4a4a4a;
            ${Checkbox.CSS_VAR_PREFIX}hover-border: #777;

            /* Checked state */
            ${Checkbox.CSS_VAR_PREFIX}checked-bg: #3b82f6;
            ${Checkbox.CSS_VAR_PREFIX}checked-border: #3b82f6;
            ${Checkbox.CSS_VAR_PREFIX}checkmark-color: #ffffff;

            /* Focus state */
            ${Checkbox.CSS_VAR_PREFIX}focus-shadow: rgba(59, 130, 246, 0.4);
          }
        }
      `);
      document.head.appendChild(style);
    }
  }
  /**
     * Create a new Checkbox.
     * @param {Object} options - Configuration options.
     * @param {String} [options.label] - Checkbox label text.
     * @param {Boolean} [options.checked=false] - Initial checked state.
     * @param {Boolean} [options.indeterminate=false] - Initial indeterminate state.
     * @param {String} [options.id] - Checkbox ID.
     * @param {String} [options.name] - Input name attribute.
     * @param {Function} [options.onChange] - Change event handler.
     * @param {HTMLElement} [options.container] - Container to append the checkbox to.
     * @param {String} [options.className] - Additional custom CSS class.
     * @param {Boolean} [options.disabled=false] - Disabled state.
     * @param {String} [options.size="medium"] - Checkbox size.
     * @param {Object} [options.attributes={}] - Additional HTML attributes.
     */
  constructor(options = {}) {
    this.label = options.label || '';
    this.checked = options.checked || false;
    this.indeterminate = options.indeterminate || false;
    this.id = options.id;
    this.name = options.name;
    this.onChange = options.onChange;
    this.container = options.container;
    this.customClassName = options.className || '';
    this.disabled = options.disabled || false;
    this.size = options.size || 'medium';
    this.attributes = options.attributes || {};

    // DOM elements references
    this.checkboxContainer = null;
    this.customCheckbox = null;
    this.nativeCheckbox = null;
    this.labelElement = null;

    Checkbox.initStyles();
    this.create();
  }


  /**
     * Create the checkbox UI and, if a container is provided, append it.
     * @return {HTMLElement} The created checkbox container element.
     */
  create() {
    // Create container
    this.checkboxContainer = document.createElement('label');
    this.checkboxContainer.className = `${Checkbox.BASE_CHECKBOX_CLASS}-container`;
    if (this.customClassName) {
      this.checkboxContainer.classList.add(this.customClassName);
    }
    if (this.disabled) {
      this.checkboxContainer.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
    }

    // Create hidden native checkbox for accessibility
    this.nativeCheckbox = document.createElement('input');
    this.nativeCheckbox.type = 'checkbox';
    this.nativeCheckbox.className = `${Checkbox.BASE_CHECKBOX_CLASS}-native`;
    this.nativeCheckbox.checked = this.checked;
    this.nativeCheckbox.indeterminate = this.indeterminate;
    this.nativeCheckbox.disabled = this.disabled;

    if (this.id) this.nativeCheckbox.id = this.id;
    if (this.name) this.nativeCheckbox.name = this.name;

    Object.entries(this.attributes).forEach(([key, value]) => {
      this.nativeCheckbox.setAttribute(key, value);
    });

    // Create custom checkbox visual
    this.customCheckbox = document.createElement('span');
    this.customCheckbox.className = `${Checkbox.BASE_CHECKBOX_CLASS} ${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`;
    if (this.checked) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
    } else if (this.indeterminate) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
    }

    // Create label if provided
    if (this.label) {
      this.labelElement = document.createElement('span');
      this.labelElement.className = `${Checkbox.BASE_CHECKBOX_CLASS}-label`;
      this.labelElement.textContent = this.label;
    }

    // Set up event listeners
    this.nativeCheckbox.addEventListener('change', (e) => this.handleChange(e));
    this.nativeCheckbox.addEventListener('focus', () => this.handleFocus());
    this.nativeCheckbox.addEventListener('blur', () => this.handleBlur());

    // Assemble the component
    this.checkboxContainer.appendChild(this.nativeCheckbox);
    this.checkboxContainer.appendChild(this.customCheckbox);
    if (this.labelElement) {
      this.checkboxContainer.appendChild(this.labelElement);
    }

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.checkboxContainer);
    }

    // Store reference to instance on DOM element for potential external access
    this.checkboxContainer._checkboxInstance = this;

    return this.checkboxContainer;
  }

  /**
     * Handle change events.
     * @param {Event} e - The change event.
     */
  handleChange(e) {
    this.checked = this.nativeCheckbox.checked;
    this.indeterminate = this.nativeCheckbox.indeterminate;

    if (this.checked) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
    } else if (this.indeterminate) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
    } else {
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
    }

    if (this.onChange) {
      this.onChange(e);
    }
  }

  /**
     * Handle focus events.
     */
  handleFocus() {
    // Additional focus behaviors can be added here if needed
  }

  /**
     * Handle blur events.
     */
  handleBlur() {
    // Additional blur behaviors can be added here if needed
  }

  /**
     * Set the checked state.
     * @param {Boolean} checked - The new checked state.
     */
  setChecked(checked) {
    this.checked = checked;
    this.nativeCheckbox.checked = checked;

    if (checked) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
      this.indeterminate = false;
      this.nativeCheckbox.indeterminate = false;
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
    } else {
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
    }
  }

  /**
     * Set the indeterminate state.
     * @param {Boolean} indeterminate - The new indeterminate state.
     */
  setIndeterminate(indeterminate) {
    this.indeterminate = indeterminate;
    this.nativeCheckbox.indeterminate = indeterminate;

    if (indeterminate) {
      this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--checked`);
    } else {
      this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--indeterminate`);
    }
  }

  /**
     * Toggle the checked state.
     * @return {Boolean} The new checked state.
     */
  toggle() {
    this.setChecked(!this.checked);
    return this.checked;
  }

  /**
     * Set the disabled state.
     * @param {Boolean} disabled - The new disabled state.
     */
  setDisabled(disabled) {
    this.disabled = disabled;
    this.nativeCheckbox.disabled = disabled;

    if (disabled) {
      this.checkboxContainer.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
    } else {
      this.checkboxContainer.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}-container--disabled`);
    }
  }

  /**
     * Set the label text.
     * @param {String} text - The new label text.
     */
  setLabel(text) {
    this.label = text;

    if (!this.labelElement) {
      this.labelElement = document.createElement('span');
      this.labelElement.className = `${Checkbox.BASE_CHECKBOX_CLASS}-label`;
      this.checkboxContainer.appendChild(this.labelElement);
    }

    this.labelElement.textContent = text;
  }

  /**
     * Change the checkbox size.
     * @param {String} size - The new size (e.g., "small", "medium", "large").
     */
  setSize(size) {
    this.customCheckbox.classList.remove(`${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`);
    this.size = size;
    this.customCheckbox.classList.add(`${Checkbox.BASE_CHECKBOX_CLASS}--${this.size}`);
  }

  /**
     * Apply a custom CSS class to the checkbox container.
     * @param {String} className - The custom class name.
     */
  setCustomClass(className) {
    if (this.customClassName) {
      this.checkboxContainer.classList.remove(this.customClassName);
    }
    this.customClassName = className;
    if (className) {
      this.checkboxContainer.classList.add(className);
    }
  }

  /**
     * Get the current checked state.
     * @return {Boolean} The current checked state.
     */
  isChecked() {
    return this.checked;
  }

  /**
     * Get the current indeterminate state.
     * @return {Boolean} The current indeterminate state.
     */
  isIndeterminate() {
    return this.indeterminate;
  }

  /**
     * Get the current disabled state.
     * @return {Boolean} The current disabled state.
     */
  isDisabled() {
    return this.disabled;
  }

  /**
     * Shows or hides the entire checkbox.
     * @param {Boolean} visible - True to show, false to hide.
     */
  setVisible(visible) {
    if (this.checkboxContainer) {
      this.checkboxContainer.style.display = visible ? '' : 'none';
    }
  }

  /**
     * Destroys the checkbox and removes it from the DOM.
     */
  destroy() {
    if (this.checkboxContainer && this.checkboxContainer.parentNode) {
      this.checkboxContainer.parentNode.removeChild(this.checkboxContainer);
    }
    this.checkboxContainer = null;
    this.customCheckbox = null;
    this.nativeCheckbox = null;
    this.labelElement = null;
  }
}

// Static property to track if styles have been initialized.
Checkbox.stylesInitialized = false;
Checkbox.initStyles();

export default Checkbox;
