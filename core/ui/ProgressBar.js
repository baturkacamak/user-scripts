/**
 * ProgressBar - A reusable UI component for displaying progress
 * Provides customizable, animated progress indicators
 */
import StyleManager from '../utils/StyleManager.js';

class ProgressBar {
  /**
     * Initialize styles for all progress bars
     */
  static initStyles() {
    // This will be called only once, when the first instance is created
    if (ProgressBar.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .reusable-progress {
        width: 100%;
        margin: 10px 0;
      }
      
      .reusable-progress-label {
        font-size: 0.875rem;
        margin-bottom: 4px;
        display: block;
        color: #555;
      }
      
      .reusable-progress-bar {
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .reusable-progress-fill {
        height: 100%;
        width: 0%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .reusable-progress-text {
        font-size: 0.75rem;
        text-align: right;
        margin-top: 4px;
        color: #555;
      }
      
      /* Themes */
      .reusable-progress--default .reusable-progress-fill {
        background-color: #6b7280;
      }
      
      .reusable-progress--primary .reusable-progress-fill {
        background-color: #3b82f6;
      }
      
      .reusable-progress--success .reusable-progress-fill {
        background-color: #10b981;
      }
      
      .reusable-progress--danger .reusable-progress-fill {
        background-color: #ef4444;
      }
      
      .reusable-progress--warning .reusable-progress-fill {
        background-color: #f59e0b;
      }
      
      /* Sizes */
      .reusable-progress--small .reusable-progress-bar {
        height: 4px;
      }
      
      .reusable-progress--large .reusable-progress-bar {
        height: 12px;
      }
    `, 'reusable-progress-styles');

    ProgressBar.stylesInitialized = true;
  }
  /**
     * Create a new progress bar
     * @param {Object} options - Configuration options
     * @param {Number} options.initialValue - Initial progress value (0-100)
     * @param {String} options.className - CSS class for styling
     * @param {HTMLElement} options.container - Container to append to
     * @param {Boolean} options.showText - Whether to show progress text
     * @param {Boolean} options.showLabel - Whether to show a label
     * @param {String} options.label - Label text (if showLabel is true)
     * @param {String} options.theme - Theme (default, primary, success, etc.)
     */
  constructor(options) {
    this.value = options.initialValue || 0;
    this.className = options.className || 'reusable-progress';
    this.container = options.container;
    this.showText = options.showText !== undefined ? options.showText : true;
    this.showLabel = options.showLabel || false;
    this.label = options.label || '';
    this.theme = options.theme || 'default';

    this.progressElement = null;
    this.progressBarElement = null;
    this.progressFillElement = null;
    this.progressTextElement = null;
    this.labelElement = null;

    this.initStyles();
    this.create();
  }


  /**
     * Create the progress bar elements
     * @return {HTMLElement} The created progress bar container
     */
  create() {
    // Create container
    this.progressElement = document.createElement('div');
    this.progressElement.className = `${this.className} ${this.className}--${this.theme}`;

    // Add label if needed
    if (this.showLabel) {
      this.labelElement = document.createElement('span');
      this.labelElement.className = `${this.className}-label`;
      this.labelElement.textContent = this.label;
      this.progressElement.appendChild(this.labelElement);
    }

    // Create progress bar
    this.progressBarElement = document.createElement('div');
    this.progressBarElement.className = `${this.className}-bar`;

    this.progressFillElement = document.createElement('div');
    this.progressFillElement.className = `${this.className}-fill`;
    this.progressFillElement.style.width = `${this.value}%`;
    this.progressBarElement.appendChild(this.progressFillElement);

    this.progressElement.appendChild(this.progressBarElement);

    // Add text if needed
    if (this.showText) {
      this.progressTextElement = document.createElement('div');
      this.progressTextElement.className = `${this.className}-text`;
      this.progressTextElement.textContent = `${this.value}%`;
      this.progressElement.appendChild(this.progressTextElement);
    }

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.progressElement);
    }

    return this.progressElement;
  }

  /**
     * Set progress value
     * @param {Number} value - New progress value (0-100)
     * @param {String} text - Optional custom text to display
     */
  setValue(value, text) {
    // Ensure value is between 0 and 100
    this.value = Math.min(100, Math.max(0, value));

    // Update fill width
    if (this.progressFillElement) {
      this.progressFillElement.style.width = `${this.value}%`;
    }

    // Update text if visible
    if (this.showText && this.progressTextElement) {
      this.progressTextElement.textContent = text || `${this.value}%`;
    }

    return this.value;
  }

  /**
     * Set the theme of the progress bar
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;
    if (this.progressElement) {
      // Remove all theme classes
      const classNames = this.progressElement.className.split(' ');
      const nonThemeClasses = classNames.filter((className) => !className.includes('--'));

      // Add new theme class
      this.progressElement.className = `${nonThemeClasses.join(' ')} ${this.className}--${this.theme}`;
    }
  }

  /**
     * Set the label text
     * @param {String} label - New label text
     */
  setLabel(label) {
    this.label = label;
    if (this.labelElement) {
      this.labelElement.textContent = this.label;
    }
  }

  /**
     * Show or hide the progress bar
     * @param {Boolean} visible - Whether the progress bar should be visible
     */
  setVisible(visible) {
    if (this.progressElement) {
      this.progressElement.style.display = visible ? '' : 'none';
    }
  }
}

// Static property to track if styles have been initialized
ProgressBar.stylesInitialized = false;

// Initialize styles when imported
ProgressBar.initStyles();

export default ProgressBar;
