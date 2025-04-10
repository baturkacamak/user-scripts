/**
 * Slider - A reusable UI component for range inputs
 * Creates customizable, accessible sliders with various states and callbacks
 */
import StyleManager from '../utils/StyleManager.js';

class Slider {
  /**
     * Initialize styles for all sliders
     */
  static initStyles() {
    // This will be called only once, when the first instance is created
    if (Slider.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .reusable-slider {
        width: 100%;
        margin: 15px 0;
      }
      
      .reusable-slider-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
      
      .reusable-slider-input {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background-color: #e5e7eb;
        outline: none;
        transition: background-color 0.2s;
      }
      
      .reusable-slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #3b82f6;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .reusable-slider-input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #3b82f6;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .reusable-slider-input::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      
      .reusable-slider-input::-moz-range-thumb:hover {
        transform: scale(1.1);
      }
      
      .reusable-slider-value {
        display: block;
        margin-top: 6px;
        font-size: 0.875rem;
        color: #4b5563;
        text-align: center;
      }
      
      /* Themes */
      .reusable-slider--default .reusable-slider-input::-webkit-slider-thumb {
        background-color: #6b7280;
      }
      
      .reusable-slider--default .reusable-slider-input::-moz-range-thumb {
        background-color: #6b7280;
      }
      
      .reusable-slider--primary .reusable-slider-input::-webkit-slider-thumb {
        background-color: #3b82f6;
      }
      
      .reusable-slider--primary .reusable-slider-input::-moz-range-thumb {
        background-color: #3b82f6;
      }
      
      .reusable-slider--success .reusable-slider-input::-webkit-slider-thumb {
        background-color: #10b981;
      }
      
      .reusable-slider--success .reusable-slider-input::-moz-range-thumb {
        background-color: #10b981;
      }
      
      .reusable-slider--danger .reusable-slider-input::-webkit-slider-thumb {
        background-color: #ef4444;
      }
      
      .reusable-slider--danger .reusable-slider-input::-moz-range-thumb {
        background-color: #ef4444;
      }
      
      /* Sizes */
      .reusable-slider--small .reusable-slider-input {
        height: 4px;
      }
      
      .reusable-slider--small .reusable-slider-input::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
      }
      
      .reusable-slider--small .reusable-slider-input::-moz-range-thumb {
        width: 14px;
        height: 14px;
      }
      
      .reusable-slider--large .reusable-slider-input {
        height: 8px;
      }
      
      .reusable-slider--large .reusable-slider-input::-webkit-slider-thumb {
        width: 22px;
        height: 22px;
      }
      
      .reusable-slider--large .reusable-slider-input::-moz-range-thumb {
        width: 22px;
        height: 22px;
      }
    `, 'reusable-slider-styles');

    Slider.stylesInitialized = true;
  }
  /**
     * Create a new slider
     * @param {Object} options - Configuration options
     * @param {Number} options.min - Minimum value
     * @param {Number} options.max - Maximum value
     * @param {Number} options.value - Initial value
     * @param {Number} options.step - Step increment
     * @param {String} options.className - CSS class for styling
     * @param {Function} options.onChange - Callback when value changes
     * @param {Function} options.onInput - Callback during input (before change is finalized)
     * @param {String} options.id - ID attribute
     * @param {HTMLElement} options.container - Container to append to
     * @param {Boolean} options.showValue - Whether to show the current value
     * @param {String} options.label - Label text
     * @param {String} options.theme - Theme (default, primary, etc.)
     * @param {String} options.size - Size (small, medium, large)
     * @param {String} options.valuePrefix - Text to show before the value
     * @param {String} options.valueSuffix - Text to show after the value
     */
  constructor(options) {
    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;
    this.value = options.value !== undefined ? options.value : this.min;
    this.step = options.step !== undefined ? options.step : 1;
    this.className = options.className || 'reusable-slider';
    this.onChange = options.onChange;
    this.onInput = options.onInput;
    this.id = options.id || `slider-${Math.random().toString(36).substring(2, 9)}`;
    this.container = options.container;
    this.showValue = options.showValue !== undefined ? options.showValue : true;
    this.label = options.label || '';
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.valuePrefix = options.valuePrefix || '';
    this.valueSuffix = options.valueSuffix || '';

    this.sliderElement = null;
    this.inputElement = null;
    this.valueElement = null;
    this.labelElement = null;

    this.create();
  }


  /**
     * Create the slider element
     * @return {HTMLElement} The slider container element
     */
  create() {
    // Create container
    this.sliderElement = document.createElement('div');
    this.sliderElement.className = `${this.className} ${this.className}--${this.theme} ${this.className}--${this.size}`;

    // Add label if provided
    if (this.label) {
      this.labelElement = document.createElement('label');
      this.labelElement.className = `${this.className}-label`;
      this.labelElement.htmlFor = this.id;
      this.labelElement.textContent = this.label;
      this.sliderElement.appendChild(this.labelElement);
    }

    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'range';
    this.inputElement.className = `${this.className}-input`;
    this.inputElement.id = this.id;
    this.inputElement.min = this.min;
    this.inputElement.max = this.max;
    this.inputElement.step = this.step;
    this.inputElement.value = this.value;

    // Add event listeners
    this.inputElement.addEventListener('input', (e) => {
      this.value = parseFloat(e.target.value);
      this.updateValue();

      if (this.onInput) {
        this.onInput(this.value, e);
      }
    });

    this.inputElement.addEventListener('change', (e) => {
      if (this.onChange) {
        this.onChange(this.value, e);
      }
    });

    this.sliderElement.appendChild(this.inputElement);

    // Add value display if enabled
    if (this.showValue) {
      this.valueElement = document.createElement('span');
      this.valueElement.className = `${this.className}-value`;
      this.updateValue();
      this.sliderElement.appendChild(this.valueElement);
    }

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.sliderElement);
    }

    return this.sliderElement;
  }

  /**
     * Update the displayed value
     */
  updateValue() {
    if (this.showValue && this.valueElement) {
      this.valueElement.textContent = `${this.valuePrefix}${this.value}${this.valueSuffix}`;
    }
  }

  /**
     * Get the current value
     * @return {Number} The current value
     */
  getValue() {
    return this.value;
  }

  /**
     * Set the slider value
     * @param {Number} value - The new value
     * @param {Boolean} triggerEvent - Whether to trigger the onChange event
     */
  setValue(value, triggerEvent = false) {
    // Ensure value is within min/max bounds
    this.value = Math.min(Math.max(value, this.min), this.max);

    // Update input element
    if (this.inputElement) {
      this.inputElement.value = this.value;
    }

    // Update displayed value
    this.updateValue();

    // Trigger event if requested
    if (triggerEvent && this.onChange) {
      this.onChange(this.value);
    }

    return this.value;
  }

  /**
     * Set the theme of the slider
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;

    if (this.sliderElement) {
      // Update class name with new theme
      const classNames = this.sliderElement.className.split(' ');
      const themeRegex = new RegExp(`${this.className}--[a-z]+`);
      const filteredClasses = classNames.filter((className) => !themeRegex.test(className) || !className.includes('--theme-'));
      filteredClasses.push(`${this.className}--${this.theme}`);
      this.sliderElement.className = filteredClasses.join(' ');
    }
  }

  /**
     * Set the size of the slider
     * @param {String} size - Size name
     */
  setSize(size) {
    this.size = size;

    if (this.sliderElement) {
      // Update class name with new size
      const classNames = this.sliderElement.className.split(' ');
      const sizeRegex = new RegExp(`${this.className}--[a-z]+`);
      const filteredClasses = classNames.filter((className) => !sizeRegex.test(className) || !className.includes('--size-'));
      filteredClasses.push(`${this.className}--${this.size}`);
      this.sliderElement.className = filteredClasses.join(' ');
    }
  }

  /**
     * Enable or disable the slider
     * @param {Boolean} disabled - Whether the slider should be disabled
     */
  setDisabled(disabled) {
    if (this.inputElement) {
      this.inputElement.disabled = disabled;
    }
  }
}

// Static property to track if styles have been initialized
Slider.stylesInitialized = false;

// Initialize styles when imported
Slider.initStyles();

export default Slider;
