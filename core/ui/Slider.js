/**
 * Slider - A reusable range input component
 * Provides a customizable slider with value display and callback support
 */
import StyleManager from '../utils/StyleManager.js';

class Slider {
  /**
     * Create a time delay slider (specialized Slider)
     * @param {Object} options - Configuration options
     * @return {Slider} The created slider instance
     */
  static createDelaySlider(options = {}) {
    const defaultOptions = {
      min: 500,
      max: 3000,
      step: 100,
      value: 1000,
      label: 'Delay between requests',
    };

    const mergedOptions = {...defaultOptions, ...options};

    // Create a specialized slider with time formatting
    const delaySlider = new Slider(mergedOptions);

    // Override the format value method for time display
    delaySlider.formatValue = (value) => {
      return `${(parseInt(value) / 1000).toFixed(1)}s`;
    };

    return delaySlider;
  }
  /**
     * Create a new Slider component
     * @param {Object} options - Configuration options
     * @param {number} options.min - Minimum value
     * @param {number} options.max - Maximum value
     * @param {number} options.step - Step increment
     * @param {number} options.value - Initial value
     * @param {string} options.label - Label text
     * @param {Function} options.onChange - Callback when value changes
     * @param {Object} options.styles - Custom styles override
     */
  constructor(options = {}) {
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.step = options.step || 1;
    this.value = options.value || this.min;
    this.label = options.label || '';
    this.onChange = options.onChange || (() => {
    });
    this.customStyles = options.styles || {};

    // Element references
    this.container = null;
    this.slider = null;
    this.valueDisplay = null;

    // Initialize styles once for all instances
    this.initStyles();

    // Create the component
    this.element = this.create();
  }


  /**
     * Initialize styles for all slider instances
     */
  initStyles() {
    if (!Slider.stylesAdded) {
      const defaultStyles = `
        .slider-container {
          padding: 10px 0;
        }
        
        .slider-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          color: #555;
        }
        
        .slider-input-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .slider-input {
          flex-grow: 1;
          -webkit-appearance: none;
          height: 5px;
          border-radius: 5px;
          background: #d3d3d3;
          outline: none;
        }
        
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--slider-thumb-color, #008080);
          cursor: pointer;
        }
        
        .slider-input::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--slider-thumb-color, #008080);
          cursor: pointer;
        }
        
        .slider-value {
          min-width: 40px;
          text-align: center;
          font-size: 12px;
          color: #555;
        }
      `;

      // Add styles
      StyleManager.addStyles(defaultStyles, 'slider-component-styles');
      Slider.stylesAdded = true;
    }
  }

  /**
     * Create the slider component
     * @return {HTMLElement} The slider container element
     */
  create() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'slider-container';
    Object.assign(this.container.style, this.customStyles.container || {});

    // Add label if provided
    if (this.label) {
      const labelElement = document.createElement('label');
      labelElement.className = 'slider-label';
      labelElement.textContent = this.label;
      Object.assign(labelElement.style, this.customStyles.label || {});
      this.container.appendChild(labelElement);
    }

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'slider-input-container';

    // Create range input
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'slider-input';
    this.slider.min = this.min;
    this.slider.max = this.max;
    this.slider.step = this.step;
    this.slider.value = this.value;
    Object.assign(this.slider.style, this.customStyles.slider || {});

    // Create value display
    this.valueDisplay = document.createElement('div');
    this.valueDisplay.className = 'slider-value';
    this.valueDisplay.textContent = this.formatValue(this.value);
    Object.assign(this.valueDisplay.style, this.customStyles.value || {});

    // Add event listeners
    this.slider.addEventListener('input', this.handleInput.bind(this));
    this.slider.addEventListener('change', this.handleChange.bind(this));

    // Assemble the component
    inputContainer.appendChild(this.slider);
    inputContainer.appendChild(this.valueDisplay);
    this.container.appendChild(inputContainer);

    return this.container;
  }

  /**
     * Handle input event (while dragging)
     * @param {Event} event - The input event
     */
  handleInput(event) {
    this.value = event.target.value;
    this.valueDisplay.textContent = this.formatValue(this.value);
  }

  /**
     * Handle change event (after release)
     * @param {Event} event - The change event
     */
  handleChange(event) {
    this.value = event.target.value;
    if (this.onChange) {
      this.onChange(this.value);
    }
  }

  /**
     * Format the displayed value
     * @param {number} value - The value to format
     * @return {string} The formatted value
     */
  formatValue(value) {
    // Default formatter, can be overridden in subclasses
    return value;
  }

  /**
     * Get the current value
     * @return {number} The current value
     */
  getValue() {
    return Number(this.value);
  }

  /**
     * Set the value
     * @param {number} value - The new value
     */
  setValue(value) {
    this.value = value;
    this.slider.value = value;
    this.valueDisplay.textContent = this.formatValue(value);
  }

  /**
     * Enable the slider
     */
  enable() {
    this.slider.disabled = false;
  }

  /**
     * Disable the slider
     */
  disable() {
    this.slider.disabled = true;
  }
}

// Static property to track if styles have been added
Slider.stylesAdded = false;

export default Slider;
