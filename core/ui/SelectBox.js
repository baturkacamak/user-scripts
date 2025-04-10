/**
 * SelectBox - A reusable UI component for dropdown selects
 * Creates customizable, accessible dropdown selects with callbacks
 */
class SelectBox {
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

    this.selectElement = null;
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
    this.selectElement.className = this.className;

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
}

export default SelectBox;
