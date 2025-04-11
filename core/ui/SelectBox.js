/**
 * SelectBox - A reusable UI component for dropdown selects.
 * Creates customizable, accessible dropdown selects with callbacks.
 */
import StyleManager from '../utils/StyleManager.js';

class SelectBox {
  /**
     * Returns the unique base CSS class for the SelectBox component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for select boxes.
     */
  static get BASE_SELECT_CLASS() {
    return 'userscripts-select';
  }
  /**
     * Returns the CSS variable prefix used for theming the SelectBox component.
     * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the select box.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-select-';
  }
  /**
     * Initialize styles for all select boxes.
     * These styles reference CSS variables using our defined prefix.
     */
  static initStyles() {
    if (SelectBox.stylesInitialized) return;

    StyleManager.addStyles(`
      /* Scoped styles for Userscripts SelectBox Component */
      .${SelectBox.BASE_SELECT_CLASS} {
        appearance: none;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}bg, #ffffff);
        border: 1px solid var(${SelectBox.CSS_VAR_PREFIX}border, #d1d5db);
        border-radius: 0.375rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        font-family: inherit;
        color: var(${SelectBox.CSS_VAR_PREFIX}color, #374151);
        cursor: pointer;
        width: 100%;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='var(${SelectBox.CSS_VAR_PREFIX}icon-color, %23666)'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 1rem;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}:focus {
        outline: none;
        border-color: var(${SelectBox.CSS_VAR_PREFIX}focus-border, #3b82f6);
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow, rgba(59, 130, 246, 0.25));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}:disabled {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}disabled-bg, #f3f4f6);
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .${SelectBox.BASE_SELECT_CLASS} option {
        padding: 0.5rem;
      }
      
      /* Select sizes */
      .${SelectBox.BASE_SELECT_CLASS}--small {
        font-size: 0.75rem;
        padding: 0.25rem 1.75rem 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--medium {
        font-size: 0.875rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        min-height: 2.25rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--large {
        font-size: 1rem;
        padding: 0.75rem 2.25rem 0.75rem 1rem;
        min-height: 2.75rem;
      }
      
      /* Select themes */
      .${SelectBox.BASE_SELECT_CLASS}--default {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-default, #d1d5db);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--primary {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-primary, #3b82f6);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--primary:focus {
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow-primary, rgba(59, 130, 246, 0.4));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--success {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-success, #10b981);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--success:focus {
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow-success, rgba(16, 185, 129, 0.4));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--danger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-danger, #ef4444);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}--danger:focus {
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow-danger, rgba(239, 68, 68, 0.4));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container {
        position: relative;
        width: 100%;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${SelectBox.CSS_VAR_PREFIX}label-color, #374151);
      }
    `, 'userscripts-select-styles');

    SelectBox.stylesInitialized = true;
  }
  /**
     * Create a new select box.
     * @param {Object} options - Configuration options.
     * @param {Array} options.items - Array of items [{value: string, label: string, selected: boolean}].
     * @param {string} options.name - Name attribute for the select element.
     * @param {string} options.id - ID attribute for the select element.
     * @param {string} options.className - Additional custom CSS class for styling.
     * @param {Function} options.onChange - Callback when selection changes.
     * @param {string} options.placeholder - Placeholder text when no selection.
     * @param {HTMLElement} options.container - Optional container to append the select box.
     * @param {Object} options.attributes - Additional HTML attributes for the select element.
     * @param {string} options.theme - Theme name (default, primary, etc.).
     * @param {string} options.size - Size name (small, medium, large).
     */
  constructor(options) {
    this.items = options.items || [];
    this.name = options.name || '';
    this.id = options.id || `select-${Math.random().toString(36).substring(2, 9)}`;
    this.className = options.className || SelectBox.BASE_SELECT_CLASS;
    this.onChange = options.onChange;
    this.placeholder = options.placeholder || 'Select an option';
    this.container = options.container;
    this.attributes = options.attributes || {};
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';

    this.selectElement = null;
    SelectBox.initStyles();
    this.create();
  }


  /**
     * Create the select box element.
     * @return {HTMLElement} The created select element.
     */
  create() {
    // Create select element
    this.selectElement = document.createElement('select');
    this.selectElement.name = this.name;
    this.selectElement.id = this.id;
    this.selectElement.className = `${this.className} ${this.className}--${this.theme} ${this.className}--${this.size}`;

    // Apply additional attributes
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.selectElement.setAttribute(key, value);
    });

    // Add placeholder option if needed
    if (this.placeholder) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = this.placeholder;
      placeholderOption.disabled = true;
      placeholderOption.selected = !this.hasSelectedItem();
      this.selectElement.appendChild(placeholderOption);
    }

    // Add options
    this.items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;

      if (item.selected) {
        option.selected = true;
      }

      if (item.disabled) {
        option.disabled = true;
      }

      this.selectElement.appendChild(option);
    });

    // Add change event listener
    if (this.onChange) {
      this.selectElement.addEventListener('change', (e) => {
        this.onChange(e.target.value, e);
      });
    }

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.selectElement);
    }

    return this.selectElement;
  }

  /**
     * Check if any item is selected.
     * @return {boolean} True if at least one item is selected.
     */
  hasSelectedItem() {
    return this.items.some((item) => item.selected);
  }

  /**
     * Get the currently selected value.
     * @return {string} The value of the selected option.
     */
  getValue() {
    return this.selectElement.value;
  }

  /**
     * Set the selected value.
     * @param {string} value - The value to select.
     * @param {boolean} [triggerChange=false] - Whether to trigger the onChange event.
     */
  setValue(value, triggerChange = false) {
    this.selectElement.value = value;

    if (triggerChange && this.onChange) {
      const event = new Event('change');
      this.selectElement.dispatchEvent(event);
    }
  }

  /**
     * Add a new option.
     * @param {Object} item - An object with {value: string, label: string, selected: boolean}.
     */
  addOption(item) {
    // Add to items array
    this.items.push(item);

    // Create and add the option element
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;

    if (item.selected) {
      option.selected = true;
    }

    if (item.disabled) {
      option.disabled = true;
    }

    this.selectElement.appendChild(option);
  }

  /**
     * Remove an option by value.
     * @param {string} value - The value of the option to remove.
     */
  removeOption(value) {
    // Remove from the items array
    this.items = this.items.filter((item) => item.value !== value);

    // Remove from the select element
    const option = this.selectElement.querySelector(`option[value="${value}"]`);
    if (option) {
      option.remove();
    }
  }

  /**
     * Update the options in the select box.
     * @param {Array} items - New array of items.
     * @param {boolean} [reset=false] - Whether to completely reset the options.
     */
  updateOptions(items, reset = false) {
    if (reset) {
      // Clear all options except the placeholder
      while (this.selectElement.options.length > (this.placeholder ? 1 : 0)) {
        this.selectElement.remove(this.placeholder ? 1 : 0);
      }
      this.items = [];
    }

    // Add new options
    items.forEach((item) => {
      this.addOption(item);
    });
  }

  /**
     * Disable the select box.
     * @param {boolean} disabled - Whether the select should be disabled.
     */
  setDisabled(disabled) {
    this.selectElement.disabled = disabled;
  }

  /**
     * Set the theme of the select box.
     * @param {string} theme - The new theme name.
     */
  setTheme(theme) {
    this.theme = theme;

    // Update class name with new theme
    const classNames = this.selectElement.className.split(' ');
    // Filter out any existing theme classes
    const filteredClasses = classNames.filter((className) => !className.startsWith(`${this.className}--`));
    filteredClasses.push(`${this.className}--${this.theme}`);
    this.selectElement.className = filteredClasses.join(' ');
  }

  /**
     * Set the size of the select box.
     * @param {string} size - The new size (e.g., "small", "medium", "large").
     */
  setSize(size) {
    this.size = size;

    // Update class name with new size
    const classNames = this.selectElement.className.split(' ');
    // Filter out any existing size classes
    const filteredClasses = classNames.filter((className) => !className.endsWith('--small') && !className.endsWith('--medium') && !className.endsWith('--large'));
    filteredClasses.push(`${this.className}--${this.size}`);
    this.selectElement.className = filteredClasses.join(' ');
  }
}

// Static property to track if styles have been initialized
SelectBox.stylesInitialized = false;

// Initialize styles when imported
SelectBox.initStyles();

export default SelectBox;
