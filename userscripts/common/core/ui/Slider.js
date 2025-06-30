/**
 * Slider - A reusable UI component for range inputs
 * Creates customizable, accessible sliders with various states and callbacks
 */
import StyleManager from '../utils/StyleManager.js';

class Slider {
  /**
     * Returns the unique base CSS class for the Slider component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for sliders.
     */
  static get BASE_SLIDER_CLASS() {
    return 'userscripts-slider';
  }
  /**
     * Returns the CSS variable prefix used for theming the Slider component.
     * This prefix scopes all custom CSS variables (e.g., colors) related to the slider.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-slider-';
  }
  /**
     * Initialize styles for all sliders.
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (Slider.stylesInitialized) return;

    StyleManager.addStyles(`
      /* Scoped styles for Userscripts Slider Component */
      .${Slider.BASE_SLIDER_CLASS} {
        width: 100%;
        margin: 15px 0;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${Slider.CSS_VAR_PREFIX}label-color);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input {
        -webkit-appearance: none;
        width: 100%;
        height: var(${Slider.CSS_VAR_PREFIX}track-height);
        border-radius: 3px;
        background-color: var(${Slider.CSS_VAR_PREFIX}track-bg);
        outline: none;
        transition: background-color 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        border-radius: 50%;
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-bg);
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size);
        border-radius: 50%;
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-bg);
        cursor: pointer;
        border: none;
        transition: background-color 0.2s, transform 0.2s;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb:hover {
        transform: scale(1.1);
      }
      
      .${Slider.BASE_SLIDER_CLASS}-value {
        display: block;
        margin-top: 6px;
        font-size: 0.875rem;
        color: var(${Slider.CSS_VAR_PREFIX}value-color);
        text-align: center;
      }
      
      /* Themes */
      .${Slider.BASE_SLIDER_CLASS}--default .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-default);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--default .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-default);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--primary .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-primary);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--primary .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-primary);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--success .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-success);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--success .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-success);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--danger .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-danger);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--danger .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        background-color: var(${Slider.CSS_VAR_PREFIX}thumb-danger);
      }
      
      /* Sizes */
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input {
        height: var(${Slider.CSS_VAR_PREFIX}track-height-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--small .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-small);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input {
        height: var(${Slider.CSS_VAR_PREFIX}track-height-large);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input::-webkit-slider-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
      }
      
      .${Slider.BASE_SLIDER_CLASS}--large .${Slider.BASE_SLIDER_CLASS}-input::-moz-range-thumb {
        width: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
        height: var(${Slider.CSS_VAR_PREFIX}thumb-size-large);
      }
      
      /* Disabled state */
      .${Slider.BASE_SLIDER_CLASS}-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input:disabled::-webkit-slider-thumb {
        cursor: not-allowed;
        transform: none;
      }
      
      .${Slider.BASE_SLIDER_CLASS}-input:disabled::-moz-range-thumb {
        cursor: not-allowed;
        transform: none;
      }
    `, 'userscripts-slider-styles');

    Slider.stylesInitialized = true;
  }
  /**
     * Injects default color variables for the Slider component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-slider-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          /* Base colors */
          ${Slider.CSS_VAR_PREFIX}label-color: #374151;
          ${Slider.CSS_VAR_PREFIX}track-bg: #e5e7eb;
          ${Slider.CSS_VAR_PREFIX}value-color: #4b5563;
          
          /* Theme colors */
          ${Slider.CSS_VAR_PREFIX}thumb-default: #6b7280;
          ${Slider.CSS_VAR_PREFIX}thumb-primary: #3b82f6;
          ${Slider.CSS_VAR_PREFIX}thumb-success: #10b981;
          ${Slider.CSS_VAR_PREFIX}thumb-danger: #ef4444;
          
          /* Sizing variables */
          ${Slider.CSS_VAR_PREFIX}track-height: 6px;
          ${Slider.CSS_VAR_PREFIX}track-height-small: 4px;
          ${Slider.CSS_VAR_PREFIX}track-height-large: 8px;
          
          ${Slider.CSS_VAR_PREFIX}thumb-size: 18px;
          ${Slider.CSS_VAR_PREFIX}thumb-size-small: 14px;
          ${Slider.CSS_VAR_PREFIX}thumb-size-large: 22px;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            /* Base colors */
            ${Slider.CSS_VAR_PREFIX}label-color: #e0e0e0;
            ${Slider.CSS_VAR_PREFIX}track-bg: #444;
            ${Slider.CSS_VAR_PREFIX}value-color: #ccc;
            
            /* Theme colors */
            ${Slider.CSS_VAR_PREFIX}thumb-default: #b0b0b0;
            ${Slider.CSS_VAR_PREFIX}thumb-primary: #3b82f6;
            ${Slider.CSS_VAR_PREFIX}thumb-success: #10b981;
            ${Slider.CSS_VAR_PREFIX}thumb-danger: #ef4444;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  /**
     * Create a new slider
     * @param {Object} options - Configuration options
     * @param {Number} [options.min=0] - Minimum value
     * @param {Number} [options.max=100] - Maximum value
     * @param {Number} [options.value] - Initial value
     * @param {Number} [options.step=1] - Step increment
     * @param {String} [options.className] - Additional CSS class for styling
     * @param {Function} [options.onChange] - Callback when value changes
     * @param {Function} [options.onInput] - Callback during input (before change is finalized)
     * @param {String} [options.id] - ID attribute
     * @param {HTMLElement} [options.container] - Container to append to
     * @param {Boolean} [options.showValue=true] - Whether to show the current value
     * @param {String} [options.label] - Label text
     * @param {String} [options.theme='default'] - Theme (default, primary, etc.)
     * @param {String} [options.size='medium'] - Size (small, medium, large)
     * @param {String} [options.valuePrefix] - Text to show before the value
     * @param {String} [options.valueSuffix] - Text to show after the value
     */
  constructor(options = {}) {
    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;
    this.value = options.value !== undefined ? options.value : this.min;
    this.step = options.step !== undefined ? options.step : 1;
    this.customClassName = options.className || '';
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

    Slider.initStyles();
    this.create();
  }


  /**
     * Create the slider element.
     * @return {HTMLElement} The slider container element.
     */
  create() {
    // Create the slider container
    this.sliderElement = document.createElement('div');
    this.updateSliderClasses(); // Sets the appropriate classes based on theme, size, and custom classes

    // If a label is provided, create and append the label element
    if (this.label) {
      this.labelElement = document.createElement('label');
      this.labelElement.className = `${Slider.BASE_SLIDER_CLASS}-label`;
      this.labelElement.htmlFor = this.id;
      this.labelElement.textContent = this.label;
      this.sliderElement.appendChild(this.labelElement);
    }

    // Create the input element of type range
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'range';
    this.inputElement.className = `${Slider.BASE_SLIDER_CLASS}-input`;
    this.inputElement.id = this.id;
    this.inputElement.min = this.min;
    this.inputElement.max = this.max;
    this.inputElement.step = this.step;
    this.inputElement.value = this.value;

    // Cancel any ongoing smooth transition animation when the user initiates a drag.
    // Using "pointerdown" covers both mouse and touch events.
    this.inputElement.addEventListener('pointerdown', () => {
      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
      }
    });

    // Listen for input events to update the value and display
    this.inputElement.addEventListener('input', (e) => {
      // Update the slider's value
      this.value = parseFloat(e.target.value);
      this.updateValue();
      if (this.onInput) {
        this.onInput(this.value, e);
      }
    });

    // Listen for change events (when value change is finalized)
    this.inputElement.addEventListener('change', (e) => {
      if (this.onChange) {
        this.onChange(this.value, e);
      }
    });

    // Append the input element to the slider container
    this.sliderElement.appendChild(this.inputElement);

    // Optionally create and append a value display element
    if (this.showValue) {
      this.valueElement = document.createElement('span');
      this.valueElement.className = `${Slider.BASE_SLIDER_CLASS}-value`;
      this.updateValue();
      this.sliderElement.appendChild(this.valueElement);
    }

    // Append the slider container to the provided container, if one was specified
    if (this.container) {
      this.container.appendChild(this.sliderElement);
    }

    return this.sliderElement;
  }


  /**
     * Update the classes on the slider element based on theme, size, and custom classes.
     */
  updateSliderClasses() {
    const classNames = [Slider.BASE_SLIDER_CLASS];

    // Add theme class
    if ('medium' !== this.theme) {
      classNames.push(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
    }

    // Add size class if not the default
    if ('medium' !== this.size) {
      classNames.push(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
    }

    // Add custom class if specified
    if (this.customClassName) {
      classNames.push(this.customClassName);
    }

    this.sliderElement.className = classNames.join(' ');
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
     * @param {Boolean} [triggerEvent=false] - Whether to trigger the onChange event
     * @return {Number} The new value (clamped to min/max)
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
    // Remove current theme class
    if (this.sliderElement) {
      this.sliderElement.classList.remove(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
    }

    // Update theme and add new theme class
    this.theme = theme;

    if (this.sliderElement) {
      this.sliderElement.classList.add(`${Slider.BASE_SLIDER_CLASS}--${this.theme}`);
    }
  }

  /**
     * Set the size of the slider
     * @param {String} size - Size name (small, medium, large)
     */
  setSize(size) {
    // Remove current size class
    if (this.sliderElement) {
      this.sliderElement.classList.remove(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
    }

    // Update size and add new size class
    this.size = size;

    if (this.sliderElement && 'medium' !== size) {
      this.sliderElement.classList.add(`${Slider.BASE_SLIDER_CLASS}--${this.size}`);
    }
  }

  /**
     * Set a custom CSS class for the slider
     * @param {String} className - The custom class name
     */
  setCustomClass(className) {
    if (this.customClassName && this.sliderElement) {
      this.sliderElement.classList.remove(this.customClassName);
    }

    this.customClassName = className;

    if (className && this.sliderElement) {
      this.sliderElement.classList.add(className);
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

  /**
     * Set the label text
     * @param {String} label - New label text
     */
  setLabel(label) {
    this.label = label;

    if (this.labelElement) {
      this.labelElement.textContent = label;
    } else if (label && this.sliderElement) {
      // Create label if it doesn't exist but is now needed
      this.labelElement = document.createElement('label');
      this.labelElement.className = `${Slider.BASE_SLIDER_CLASS}-label`;
      this.labelElement.htmlFor = this.id;
      this.labelElement.textContent = label;
      this.sliderElement.insertBefore(this.labelElement, this.sliderElement.firstChild);
    }
  }

  /**
     * Snap a given value to the nearest valid step increment within [this.min, this.max].
     * @param {number} val - The raw floating-point value to snap.
     * @return {number} The stepped value, clamped to min/max.
     */
  snapValueToStep(val) {
    // Constrain into [min, max] first
    const clamped = Math.max(this.min, Math.min(this.max, val));

    // Compute how many steps from this.min
    const stepsFromMin = Math.round((clamped - this.min) / this.step);
    // Snap back to [min, max]
    return this.min + (stepsFromMin * this.step);
  }

  /**
     * Animate the slider from its current value to a target value
     * with snapping to steps at each frame.
     *
     * @param {number} rawTargetValue - The raw target (e.g. from click).
     * @param {number} [duration=300] - The animation duration in ms.
     */
  animateToValue(rawTargetValue, duration = 300) {
    // Snap the final target to a valid step before we start animating:
    const targetValue = this.snapValueToStep(rawTargetValue);

    // Cancel any existing animation frame
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    const startValue = this.value; // Current slider value
    const startTime = performance.now();
    const range = targetValue - startValue;

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1); // interpolation factor [0..1]
      // Compute new float value
      const newFloatValue = startValue + t * range;

      // Snap each intermediate to the nearest step:
      const snapped = this.snapValueToStep(newFloatValue);

      // Update the slider's value without a final change event
      this.setValue(snapped, false);

      if (1 > t) {
        this._animationFrame = requestAnimationFrame(step);
      } else {
        // End exactly on the snapped target, triggering an onChange if desired
        this._animationFrame = null;
        this.setValue(targetValue, true);
      }
    };

    this._animationFrame = requestAnimationFrame(step);
  }

  /**
     * Set the value prefix and suffix
     * @param {String} prefix - Text to show before the value
     * @param {String} suffix - Text to show after the value
     */
  setValueFormat(prefix, suffix) {
    this.valuePrefix = prefix || '';
    this.valueSuffix = suffix || '';
    this.updateValue();
  }

  /**
     * Show or hide the value display
     * @param {Boolean} show - Whether to show the value
     */
  setShowValue(show) {
    this.showValue = show;

    if (show && !this.valueElement && this.sliderElement) {
      // Create value element if it doesn't exist but is now needed
      this.valueElement = document.createElement('span');
      this.valueElement.className = `${Slider.BASE_SLIDER_CLASS}-value`;
      this.updateValue();
      this.sliderElement.appendChild(this.valueElement);
    } else if (!show && this.valueElement) {
      // Remove value element if it exists but is no longer needed
      this.valueElement.remove();
      this.valueElement = null;
    }
  }

  /**
     * Destroys the slider and removes it from the DOM.
     */
  destroy() {
    if (this.sliderElement && this.sliderElement.parentNode) {
      this.sliderElement.parentNode.removeChild(this.sliderElement);
    }

    this.sliderElement = null;
    this.inputElement = null;
    this.valueElement = null;
    this.labelElement = null;
  }
}

// Static property to track if styles have been initialized
Slider.stylesInitialized = false;

export default Slider;
