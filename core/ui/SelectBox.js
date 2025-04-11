/**
 * SelectBox - A reusable UI component for dropdown selects
 * Creates customizable, accessible dropdown selects with callbacks
 */
import StyleManager from '../utils/StyleManager.js';

class SelectBox {
  /**
     * Initialize styles for all select boxes
     */
  static initStyles() {
    // This will be called only once, when the first instance is created
    if (SelectBox.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .reusable-select {
        appearance: none;
        background-color: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        font-family: inherit;
        color: #374151;
        cursor: pointer;
        width: 100%;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 1rem;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
      }
      
      .reusable-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
      }
      
      .reusable-select:disabled {
        background-color: #f3f4f6;
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .reusable-select option {
        padding: 0.5rem;
      }
      
      /* Select sizes */
      .reusable-select--small {
        font-size: 0.75rem;
        padding: 0.25rem 1.75rem 0.25rem 0.5rem;
        min-height: 1.75rem;
      }
      
      .reusable-select--medium {
        font-size: 0.875rem;
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        min-height: 2.25rem;
      }
      
      .reusable-select--large {
        font-size: 1rem;
        padding: 0.75rem 2.25rem 0.75rem 1rem;
        min-height: 2.75rem;
      }
      
      /* Select themes */
      .reusable-select--default {
        border-color: #d1d5db;
      }
      
      .reusable-select--primary {
        border-color: #3b82f6;
      }
      
      .reusable-select--primary:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
      }
      
      .reusable-select--success {
        border-color: #10b981;
      }
      
      .reusable-select--success:focus {
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4);
      }
      
      .reusable-select--danger {
        border-color: #ef4444;
      }
      
      .reusable-select--danger:focus {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
      }
      
      .reusable-select-container {
        position: relative;
        width: 100%;
      }
      
      .reusable-select-label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
    `, 'reusable-select-styles');

    SelectBox.stylesInitialized = true;
  }
  /**
     * Create a new select box
     * @param {Object} options - Configuration options
     * @param {Array} options.items - Array of items [{value: string, label: string, selected: boolean}]
     * @param {String} options.name - Name attribute for the select element
     * @param {String} options.id - ID attribute for the select element
     * @param {String} options.className - Class name for styling
     * @param {Function} options.onChange - Callback when selection changes
     * @param {String} options.placeholder - Placeholder text when no selection
     * @param {HTMLElement} options.container - Optional container to append the select box
     * @param {Object} options.attributes - Additional HTML attributes for the select element
     * @param {String} options.theme - Theme name (default, primary, etc.)
     * @param {String} options.size - Size name (small, medium, large)
     */
  constructor(options) {
    this.items = options.items || [];
    this.name = options.name || '';
    this.id = options.id || `select-${Math.random().toString(36).substring(2, 9)}`;
    this.className = options.className || 'reusable-select';
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
     * Create the select box
     * @return {HTMLElement} The created select element
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
     * Check if any item is selected
     * @return {Boolean} True if at least one item has selected:true
     */
  hasSelectedItem() {
    return this.items.some((item) => item.selected);
  }

  /**
     * Get the currently selected value
     * @return {String} The value of the selected option
     */
  getValue() {
    return this.selectElement.value;
  }

  /**
     * Set the selected value
     * @param {String} value - The value to select
     * @param {Boolean} triggerChange - Whether to trigger the onChange event
     */
  setValue(value, triggerChange = false) {
    this.selectElement.value = value;

    if (triggerChange && this.onChange) {
      const event = new Event('change');
      this.selectElement.dispatchEvent(event);
    }
  }

  /**
     * Add a new option
     * @param {Object} item - {value: string, label: string, selected: boolean}
     */
  addOption(item) {
    // Add to items array
    this.items.push(item);

    // Create and add option element
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
     * Remove an option by value
     * @param {String} value - The value of the option to remove
     */
  removeOption(value) {
    // Remove from items array
    this.items = this.items.filter((item) => item.value !== value);

    // Remove from select element
    const option = this.selectElement.querySelector(`option[value="${value}"]`);
    if (option) {
      option.remove();
    }
  }

  /**
     * Update the options in the select box
     * @param {Array} items - New array of items
     * @param {Boolean} reset - Whether to completely reset (true) or update (false)
     */
  updateOptions(items, reset = false) {
    if (reset) {
      // Clear all options except placeholder
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
     * Disable the select box
     * @param {Boolean} disabled - Whether the select should be disabled
     */
  setDisabled(disabled) {
    this.selectElement.disabled = disabled;
  }

  /**
     * Set the theme of the select box
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;

    // Update class name with new theme
    const classNames = this.selectElement.className.split(' ');
    const themeRegex = new RegExp(`${this.className}--[a-z]+`);
    const filteredClasses = classNames.filter((className) => !themeRegex.test(className) || !className.includes('--theme-'));
    filteredClasses.push(`${this.className}--${this.theme}`);
    this.selectElement.className = filteredClasses.join(' ');
  }

  /**
     * Set the size of the select box
     * @param {String} size - Size name
     */
  setSize(size) {
    this.size = size;

    // Update class name with new size
    const classNames = this.selectElement.className.split(' ');
    const sizeRegex = new RegExp(`${this.className}--[a-z]+`);
    const filteredClasses = classNames.filter((className) => !sizeRegex.test(className) || !className.includes('--size-'));
    filteredClasses.push(`${this.className}--${this.size}`);
    this.selectElement.className = filteredClasses.join(' ');
  }
}

// Static property to track if styles have been initialized
SelectBox.stylesInitialized = false;

// Initialize styles when imported
SelectBox.initStyles();

export default SelectBox;
