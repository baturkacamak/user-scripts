/**
 * SelectBox - A rich UI component for dropdown selects.
 * Creates customizable, accessible dropdown selects with categories and configurable options.
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
      /* Base container styles */
      .${SelectBox.BASE_SELECT_CLASS}-container {
        position: relative;
        width: 100%;
      }
      
      /* Select trigger button */
      .${SelectBox.BASE_SELECT_CLASS}-trigger {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0.5rem 0.75rem;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}bg, #ffffff);
        border: 1px solid var(${SelectBox.CSS_VAR_PREFIX}border, #d1d5db);
        border-radius: 0.375rem;
        font-family: inherit;
        font-size: 0.875rem;
        color: var(${SelectBox.CSS_VAR_PREFIX}color, #374151);
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger:hover {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}border-hover, #9ca3af);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger:focus {
        outline: none;
        border-color: var(${SelectBox.CSS_VAR_PREFIX}focus-border, #3b82f6);
        box-shadow: 0 0 0 3px var(${SelectBox.CSS_VAR_PREFIX}focus-shadow, rgba(59, 130, 246, 0.25));
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger-icon {
        margin-left: 0.5rem;
        transition: transform 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-trigger-icon.open {
        transform: rotate(180deg);
      }
      
      /* Dropdown styles */
      .${SelectBox.BASE_SELECT_CLASS}-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 10;
        width: 100%;
        max-height: 0;
        overflow: hidden;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}dropdown-bg, #ffffff);
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
        opacity: 0;
        transform: translateY(-10px);
        margin-top: 0.25rem;
        border: 1px solid var(${SelectBox.CSS_VAR_PREFIX}border, #d1d5db);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-dropdown.open {
        max-height: 300px;
        opacity: 1;
        transform: translateY(0);
        overflow-y: auto;
      }
      
      /* Categories */
      .${SelectBox.BASE_SELECT_CLASS}-category {
        border-bottom: 1px solid var(${SelectBox.CSS_VAR_PREFIX}category-border, #e5e7eb);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-category:last-child {
        border-bottom: none;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-category-label {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(${SelectBox.CSS_VAR_PREFIX}category-color, #6b7280);
        text-transform: uppercase;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}category-bg, #f9fafb);
      }
      
      /* Items */
      .${SelectBox.BASE_SELECT_CLASS}-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        color: var(${SelectBox.CSS_VAR_PREFIX}item-color, #374151);
        cursor: pointer;
        transition: background-color 0.1s ease;
        position: relative;
        display: flex;
        align-items: center;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item:hover {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}item-hover-bg, #f3f4f6);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}selected-bg, #EFF6FF);
        color: var(${SelectBox.CSS_VAR_PREFIX}selected-color, #2563EB);
        font-weight: 500;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}selected-indicator, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Item options */
      .${SelectBox.BASE_SELECT_CLASS}-item-options {
        padding: 0.25rem 0.75rem 0.5rem 1.75rem;
        background-color: var(${SelectBox.CSS_VAR_PREFIX}options-bg, #f9fafb);
        font-size: 0.8125rem;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-item-options.open {
        max-height: 200px;
        opacity: 1;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-row {
        display: flex;
        align-items: center;
        margin: 0.25rem 0;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-checkbox {
        margin-right: 0.5rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-label {
        color: var(${SelectBox.CSS_VAR_PREFIX}option-label-color, #4b5563);
      }
      
      /* Icon for options toggle */
      .${SelectBox.BASE_SELECT_CLASS}-option-toggle {
        margin-left: auto;
        padding: 0.25rem;
        background: none;
        border: none;
        cursor: pointer;
        color: var(${SelectBox.CSS_VAR_PREFIX}toggle-color, #9ca3af);
        font-size: 0.75rem;
        border-radius: 0.25rem;
        transition: background-color 0.1s ease, color 0.1s ease;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-option-toggle:hover {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}toggle-hover-bg, #e5e7eb);
        color: var(${SelectBox.CSS_VAR_PREFIX}toggle-hover-color, #4b5563);
      }
      
      /* Size variations */
      .${SelectBox.BASE_SELECT_CLASS}-container--small .${SelectBox.BASE_SELECT_CLASS}-trigger {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--large .${SelectBox.BASE_SELECT_CLASS}-trigger {
        padding: 0.75rem 1rem;
        font-size: 1rem;
      }
      
      /* Theme variations */
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}primary-border, #3b82f6);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}primary-selected-bg, #EFF6FF);
        color: var(${SelectBox.CSS_VAR_PREFIX}primary-selected-color, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--primary .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}primary-indicator, #2563EB);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}success-border, #10b981);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}success-selected-bg, #ECFDF5);
        color: var(${SelectBox.CSS_VAR_PREFIX}success-selected-color, #059669);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--success .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}success-indicator, #10b981);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-trigger {
        border-color: var(${SelectBox.CSS_VAR_PREFIX}danger-border, #ef4444);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-item.selected {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}danger-selected-bg, #FEF2F2);
        color: var(${SelectBox.CSS_VAR_PREFIX}danger-selected-color, #DC2626);
      }
      
      .${SelectBox.BASE_SELECT_CLASS}-container--danger .${SelectBox.BASE_SELECT_CLASS}-item.selected::before {
        background-color: var(${SelectBox.CSS_VAR_PREFIX}danger-indicator, #ef4444);
      }
      
      /* Placeholder for empty state */
      .${SelectBox.BASE_SELECT_CLASS}-placeholder {
        color: var(${SelectBox.CSS_VAR_PREFIX}placeholder-color, #9ca3af);
        font-style: italic;
      }
      
      /* Label */
      .${SelectBox.BASE_SELECT_CLASS}-label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${SelectBox.CSS_VAR_PREFIX}label-color, #374151);
      }
      
      /* Original select for accessibility and form submission */
      .${SelectBox.BASE_SELECT_CLASS}-native {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `, 'userscripts-enhanced-select-styles');

    SelectBox.stylesInitialized = true;
  }
  /**
     * Create a new select box.
     * @param {Object} options - Configuration options.
     * @param {Array} options.items - Array of items or item categories.
     * @param {string} options.name - Name attribute for the select element.
     * @param {string} options.id - ID attribute for the select element.
     * @param {Function} options.onChange - Callback when selection changes.
     * @param {string} options.placeholder - Placeholder text when no selection.
     * @param {HTMLElement} options.container - Optional container to append the select box.
     * @param {Object} options.attributes - Additional HTML attributes for the select element.
     * @param {string} options.theme - Theme name (default, primary, etc.).
     * @param {string} options.size - Size name (small, medium, large).
     * @param {boolean} options.useCategorizedUI - Whether to use the rich category UI (default: false).
     */
  constructor(options) {
    this.items = options.items || [];
    this.name = options.name || '';
    this.id = options.id || `select-${Math.random().toString(36).substring(2, 9)}`;
    this.onChange = options.onChange;
    this.placeholder = options.placeholder || 'Select an option';
    this.container = options.container;
    this.attributes = options.attributes || {};
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.useCategorizedUI = options.useCategorizedUI || false;

    // Detect if items are categorized or flat
    this.isCategorized = this.detectCategorizedItems();

    // DOM elements
    this.containerElement = null;
    this.selectElement = null; // Native select element (hidden)
    this.triggerElement = null; // Button to open dropdown
    this.dropdownElement = null; // Custom dropdown
    this.selectedValue = ''; // Current selected value
    this.selectedLabel = ''; // Current selected label

    // Ensure styles are initialized
    SelectBox.initStyles();

    // Create the select component
    this.create();
  }


  /**
     * Detect if items are categorized
     * @return {boolean} True if items are categorized
     */
  detectCategorizedItems() {
    // If useCategorizedUI is explicitly set, respect it
    if (this.useCategorizedUI !== undefined) return this.useCategorizedUI;

    // Otherwise, try to auto-detect based on items structure
    if (!this.items || 0 === this.items.length) return false;

    // Check if any item has a categories property
    return this.items.some((item) => item.category !== undefined || item.items !== undefined);
  }

  /**
     * Create the enhanced select box
     * @return {HTMLElement} The container element
     */
  create() {
    // Create main container
    this.containerElement = document.createElement('div');
    this.containerElement.className = `${SelectBox.BASE_SELECT_CLASS}-container ${SelectBox.BASE_SELECT_CLASS}-container--${this.theme} ${SelectBox.BASE_SELECT_CLASS}-container--${this.size}`;

    // Create native select element for form submission and accessibility
    this.createNativeSelect();

    // Create custom select UI
    if (this.isCategorized) {
      this.createCategorizedSelect();
    } else {
      this.createFlatSelect();
    }

    // Add event listeners
    this.addEventListeners();

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.containerElement);
    }

    return this.containerElement;
  }

  /**
     * Create the hidden native select element
     */
  createNativeSelect() {
    this.selectElement = document.createElement('select');
    this.selectElement.name = this.name;
    this.selectElement.id = this.id;
    this.selectElement.className = `${SelectBox.BASE_SELECT_CLASS}-native`;

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
    this.addOptionsToNativeSelect();

    // Add to container
    this.containerElement.appendChild(this.selectElement);
  }

  /**
     * Add options to the native select element
     */
  addOptionsToNativeSelect() {
    // Helper function to add a single option
    const addOption = (item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;

      if (item.selected) {
        option.selected = true;
        this.selectedValue = item.value;
        this.selectedLabel = item.label;
      }

      if (item.disabled) {
        option.disabled = true;
      }

      this.selectElement.appendChild(option);
    };

    // For categorized items
    if (this.isCategorized) {
      this.items.forEach((category) => {
        if (category.items && Array.isArray(category.items)) {
          // Add optgroup if this is a category with a label
          if (category.label) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category.label;

            category.items.forEach((item) => {
              const option = document.createElement('option');
              option.value = item.value;
              option.textContent = item.label;

              if (item.selected) {
                option.selected = true;
                this.selectedValue = item.value;
                this.selectedLabel = item.label;
              }

              if (item.disabled) {
                option.disabled = true;
              }

              optgroup.appendChild(option);
            });

            this.selectElement.appendChild(optgroup);
          } else {
            // No category label, just add the items
            category.items.forEach(addOption);
          }
        } else {
          // This is a flat item, not a category
          addOption(category);
        }
      });
    } else {
      // For flat items
      this.items.forEach(addOption);
    }
  }

  /**
     * Create a categorized select UI
     */
  createCategorizedSelect() {
    // Create trigger button
    this.triggerElement = document.createElement('button');
    this.triggerElement.type = 'button';
    this.triggerElement.className = `${SelectBox.BASE_SELECT_CLASS}-trigger`;

    // Set initial text
    const triggerText = document.createElement('span');
    triggerText.textContent = this.selectedLabel || this.placeholder;
    if (!this.selectedLabel) {
      triggerText.className = `${SelectBox.BASE_SELECT_CLASS}-placeholder`;
    }
    this.triggerElement.appendChild(triggerText);

    // Add dropdown icon
    const triggerIcon = document.createElement('span');
    triggerIcon.className = `${SelectBox.BASE_SELECT_CLASS}-trigger-icon`;
    triggerIcon.innerHTML = '▼';
    this.triggerElement.appendChild(triggerIcon);

    // Create dropdown
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = `${SelectBox.BASE_SELECT_CLASS}-dropdown`;

    // Add categories and items
    this.items.forEach((category) => {
      // Check if this is a category with items
      if (category.items && Array.isArray(category.items)) {
        const categoryElement = document.createElement('div');
        categoryElement.className = `${SelectBox.BASE_SELECT_CLASS}-category`;

        // Add category label if it exists
        if (category.label) {
          const categoryLabel = document.createElement('div');
          categoryLabel.className = `${SelectBox.BASE_SELECT_CLASS}-category-label`;
          categoryLabel.textContent = category.label;
          categoryElement.appendChild(categoryLabel);
        }

        // Add items list
        const itemsList = document.createElement('ul');
        itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

        // Add items
        category.items.forEach((item) => {
          const itemElement = this.createItemElement(item);
          itemsList.appendChild(itemElement);
        });

        categoryElement.appendChild(itemsList);
        this.dropdownElement.appendChild(categoryElement);
      } else {
        // This is a flat item, not a category
        const itemsList = document.createElement('ul');
        itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

        const itemElement = this.createItemElement(category);
        itemsList.appendChild(itemElement);

        this.dropdownElement.appendChild(itemsList);
      }
    });

    // Add elements to container
    this.containerElement.appendChild(this.triggerElement);
    this.containerElement.appendChild(this.dropdownElement);
  }

  /**
     * Create a flat select UI (simpler version)
     */
  createFlatSelect() {
    // Create trigger button
    this.triggerElement = document.createElement('button');
    this.triggerElement.type = 'button';
    this.triggerElement.className = `${SelectBox.BASE_SELECT_CLASS}-trigger`;

    // Set initial text
    const triggerText = document.createElement('span');
    triggerText.textContent = this.selectedLabel || this.placeholder;
    if (!this.selectedLabel) {
      triggerText.className = `${SelectBox.BASE_SELECT_CLASS}-placeholder`;
    }
    this.triggerElement.appendChild(triggerText);

    // Add dropdown icon
    const triggerIcon = document.createElement('span');
    triggerIcon.className = `${SelectBox.BASE_SELECT_CLASS}-trigger-icon`;
    triggerIcon.innerHTML = '▼';
    this.triggerElement.appendChild(triggerIcon);

    // Create dropdown
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = `${SelectBox.BASE_SELECT_CLASS}-dropdown`;

    // Add items list
    const itemsList = document.createElement('ul');
    itemsList.className = `${SelectBox.BASE_SELECT_CLASS}-items`;

    // Add items
    this.items.forEach((item) => {
      const itemElement = this.createItemElement(item);
      itemsList.appendChild(itemElement);
    });

    this.dropdownElement.appendChild(itemsList);

    // Add elements to container
    this.containerElement.appendChild(this.triggerElement);
    this.containerElement.appendChild(this.dropdownElement);
  }

  /**
     * Create an item element
     * @param {Object} item - The item data
     * @return {HTMLElement} The item element
     */
  createItemElement(item) {
    const itemElement = document.createElement('li');
    itemElement.className = `${SelectBox.BASE_SELECT_CLASS}-item`;
    itemElement.dataset.value = item.value;
    itemElement.textContent = item.label;

    if (item.selected) {
      itemElement.classList.add('selected');
    }

    if (item.disabled) {
      itemElement.classList.add('disabled');
    }

    // Handle item selection
    itemElement.addEventListener('click', (e) => {
      if (item.disabled) return;

      this.selectItem(item.value, item.label);
      this.closeDropdown();

      // Trigger onChange callback
      if (this.onChange) {
        this.onChange(item.value, e);
      }
    });

    // Add options if available
    if (item.options && 0 < item.options.length) {
      // Add options toggle button
      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = `${SelectBox.BASE_SELECT_CLASS}-option-toggle`;
      toggleButton.innerHTML = '⚙️';
      toggleButton.title = 'Options';

      itemElement.appendChild(toggleButton);

      // Create options container
      const optionsContainer = document.createElement('div');
      optionsContainer.className = `${SelectBox.BASE_SELECT_CLASS}-item-options`;

      // Add options
      item.options.forEach((option) => {
        const optionRow = document.createElement('div');
        optionRow.className = `${SelectBox.BASE_SELECT_CLASS}-option-row`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${this.id}-option-${item.value}-${option.id}`;
        checkbox.className = `${SelectBox.BASE_SELECT_CLASS}-option-checkbox`;
        checkbox.checked = option.defaultValue || false;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.className = `${SelectBox.BASE_SELECT_CLASS}-option-label`;
        label.textContent = option.label;

        if (option.description) {
          label.title = option.description;
        }

        // Handle option change
        checkbox.addEventListener('change', (e) => {
          // Update option value
          if (item.optionValues) {
            item.optionValues[option.id] = e.target.checked;
          }

          // Stop propagation to prevent selecting the item
          e.stopPropagation();
        });

        optionRow.appendChild(checkbox);
        optionRow.appendChild(label);
        optionsContainer.appendChild(optionRow);
      });

      // Add click handler for toggle button
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent item selection
        optionsContainer.classList.toggle('open');
      });

      // Add options container after the item
      itemElement.insertAdjacentElement('afterend', optionsContainer);
    }

    return itemElement;
  }

  /**
     * Add event listeners
     */
  addEventListeners() {
    // Toggle dropdown on trigger click
    this.triggerElement.addEventListener('click', () => {
      this.toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.containerElement.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
      if ('Escape' === e.key) {
        this.closeDropdown();
      }
    });

    // Sync with native select
    this.selectElement.addEventListener('change', (e) => {
      this.selectItemFromNative();
    });
  }

  /**
     * Toggle dropdown visibility
     */
  toggleDropdown() {
    const isOpen = this.dropdownElement.classList.contains('open');

    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
     * Open the dropdown
     */
  openDropdown() {
    this.dropdownElement.classList.add('open');
    this.triggerElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-trigger-icon`).classList.add('open');

    // Ensure the selected item is visible
    const selectedItem = this.dropdownElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-item.selected`);
    if (selectedItem) {
      selectedItem.scrollIntoView({block: 'nearest'});
    }
  }

  /**
     * Close the dropdown
     */
  closeDropdown() {
    this.dropdownElement.classList.remove('open');
    this.triggerElement.querySelector(`.${SelectBox.BASE_SELECT_CLASS}-trigger-icon`).classList.remove('open');

    // Close any open options
    const openOptions = this.dropdownElement.querySelectorAll(`.${SelectBox.BASE_SELECT_CLASS}-item-options.open`);
    openOptions.forEach((option) => {
      option.classList.remove('open');
    });
  }

  /**
     * Select an item
     * @param {string} value - The value to select
     * @param {string} label - The label text
     */
  selectItem(value, label) {
    // Update native select
    this.selectElement.value = value;

    // Update selected value and label
    this.selectedValue = value;
    this.selectedLabel = label;

    // Update trigger text
    const triggerText = this.triggerElement.querySelector('span:first-child');
    triggerText.textContent = label;
    triggerText.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-placeholder`);

    // Update item classes
    const items = this.dropdownElement.querySelectorAll(`.${SelectBox.BASE_SELECT_CLASS}-item`);
    items.forEach((item) => {
      if (item.dataset.value === value) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
     * Select item based on native select value
     */
  selectItemFromNative() {
    const value = this.selectElement.value;
    const selectedOption = this.selectElement.options[this.selectElement.selectedIndex];
    const label = selectedOption ? selectedOption.textContent : '';

    if (value && label) {
      this.selectItem(value, label);
    }
  }

  /**
     * Check if any item is selected
     * @return {boolean} True if at least one item is selected
     */
  hasSelectedItem() {
    if (this.isCategorized) {
      // For categorized items
      return this.items.some((category) => {
        if (category.items && Array.isArray(category.items)) {
          return category.items.some((item) => item.selected);
        }
        return category.selected;
      });
    }

    // For flat items
    return this.items.some((item) => item.selected);
  }

  /**
     * Get the currently selected value
     * @return {string} The value of the selected option
     */
  getValue() {
    return this.selectedValue;
  }

  /**
     * Set the selected value
     * @param {string} value - The value to select
     * @param {boolean} [triggerChange=false] - Whether to trigger the onChange event
     */
  setValue(value, triggerChange = false) {
    // Find the item with the given value
    let found = false;
    let label = '';

    const findInItems = (items) => {
      for (const item of items) {
        if (item.value === value) {
          found = true;
          label = item.label;
          return true;
        }
      }
      return false;
    };

    if (this.isCategorized) {
      // Search in categorized items
      for (const category of this.items) {
        if (category.items && Array.isArray(category.items)) {
          if (findInItems(category.items)) {
            break;
          }
        } else if (category.value === value) {
          found = true;
          label = category.label;
          break;
        }
      }
    } else {
      // Search in flat items
      findInItems(this.items);
    }

    if (found) {
      // Update the native select
      this.selectElement.value = value;

      // Update the custom UI
      this.selectItem(value, label);

      // Trigger change event if requested
      if (triggerChange && this.onChange) {
        const event = new Event('change');
        this.selectElement.dispatchEvent(event);
      }
    }
  }

  /**
     * Add a new option
     * @param {Object} item - An object with {value: string, label: string, selected: boolean}
     * @param {string} [categoryId] - Optional category ID to add the item to
     */
  addOption(item, categoryId) {
    if (this.isCategorized && categoryId) {
      // Add to specific category
      const categoryIndex = this.items.findIndex((category) =>
        category.id === categoryId || category.value === categoryId,
      );

      if (0 <= categoryIndex) {
        const category = this.items[categoryIndex];

        if (!category.items) {
          category.items = [];
        }

        category.items.push(item);
      } else {
        // Category not found, add as flat item
        this.items.push(item);
      }
    } else {
      // Add to flat items
      this.items.push(item);
    }

    // Update the native select
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;

    if (item.selected) {
      option.selected = true;
      this.selectedValue = item.value;
      this.selectedLabel = item.label;
    }

    if (item.disabled) {
      option.disabled = true;
    }

    this.selectElement.appendChild(option);

    // If using custom UI, we need to rebuild it
    this.rebuild();
  }

  /**
     * Remove an option by value
     * @param {string} value - The value of the option to remove
     */
  removeOption(value) {
    // Helper function to remove from an array of items
    const removeFromItems = (items) => {
      const index = items.findIndex((item) => item.value === value);
      if (0 <= index) {
        items.splice(index, 1);
        return true;
      }
      return false;
    };

    // Remove from the items array
    if (this.isCategorized) {
      // Search in categorized items
      let removed = false;

      for (const category of this.items) {
        if (category.items && Array.isArray(category.items)) {
          if (removeFromItems(category.items)) {
            removed = true;
            break;
          }
        } else if (category.value === value) {
          removed = true;
          const index = this.items.indexOf(category);
          this.items.splice(index, 1);
          break;
        }
      }
    } else {
      // Remove from flat items
      removeFromItems(this.items);
    }

    // Remove from the native select
    const option = this.selectElement.querySelector(`option[value="${value}"]`);
    if (option) {
      option.remove();
    }

    // If it was the selected option, update selected value
    if (this.selectedValue === value) {
      this.selectedValue = '';
      this.selectedLabel = '';

      // Update trigger text to placeholder
      const triggerText = this.triggerElement.querySelector('span:first-child');
      triggerText.textContent = this.placeholder;
      triggerText.classList.add(`${SelectBox.BASE_SELECT_CLASS}-placeholder`);
    }

    // If using custom UI, we need to rebuild it
    this.rebuild();
  }

  /**
     * Update the options in the select box
     * @param {Array} items - New array of items
     * @param {boolean} [reset=false] - Whether to completely reset the options
     */
  updateOptions(items, reset = false) {
    if (reset) {
      // Clear all options in native select
      while (0 < this.selectElement.options.length) {
        this.selectElement.options[0].remove();
      }

      // Reset items array
      this.items = [];

      // Reset selected value
      this.selectedValue = '';
      this.selectedLabel = '';
    }

    // Add new items
    this.items = items;

    // Re-detect if categorized
    this.isCategorized = this.detectCategorizedItems();

    // Add to native select
    this.addOptionsToNativeSelect();

    // Rebuild the UI
    this.rebuild();
  }

  /**
     * Rebuild the custom UI
     */
  rebuild() {
    // Remove existing trigger and dropdown
    if (this.triggerElement) {
      this.triggerElement.remove();
    }

    if (this.dropdownElement) {
      this.dropdownElement.remove();
    }

    // Recreate the UI
    if (this.isCategorized) {
      this.createCategorizedSelect();
    } else {
      this.createFlatSelect();
    }

    // Re-add event listeners
    this.addEventListeners();
  }

  /**
     * Disable the select box
     * @param {boolean} disabled - Whether the select should be disabled
     */
  setDisabled(disabled) {
    // Update native select
    this.selectElement.disabled = disabled;

    // Update custom UI
    if (disabled) {
      this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--disabled`);
      this.triggerElement.disabled = true;
    } else {
      this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--disabled`);
      this.triggerElement.disabled = false;
    }
  }

  /**
     * Set the theme of the select box
     * @param {string} theme - The new theme name
     */
  setTheme(theme) {
    this.theme = theme;

    // Update container class
    const themeClasses = ['default', 'primary', 'success', 'danger'];
    themeClasses.forEach((themeClass) => {
      this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--${themeClass}`);
    });

    this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--${theme}`);
  }

  /**
     * Set the size of the select box
     * @param {string} size - The new size (e.g., "small", "medium", "large")
     */
  setSize(size) {
    this.size = size;

    // Update container class
    const sizeClasses = ['small', 'medium', 'large'];
    sizeClasses.forEach((sizeClass) => {
      this.containerElement.classList.remove(`${SelectBox.BASE_SELECT_CLASS}-container--${sizeClass}`);
    });

    this.containerElement.classList.add(`${SelectBox.BASE_SELECT_CLASS}-container--${size}`);
  }
}


export default SelectBox;
