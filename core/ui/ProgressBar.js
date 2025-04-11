/**
 * ProgressBar - A reusable UI component for displaying progress.
 * Provides customizable, animated progress indicators using CSS variable theming.
 */
import StyleManager from '../utils/StyleManager.js';

class ProgressBar {
  /**
     * Returns the unique base CSS class for the ProgressBar component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for progress bars.
     */
  static get BASE_PROGRESS_CLASS() {
    return 'userscripts-progress';
  }
  /**
     * Returns the CSS variable prefix used for theming the ProgressBar component.
     * This prefix scopes all custom CSS variables (e.g., colors) related to the progress bar.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-progress-';
  }
  /**
     * Initialize styles for all progress bars.
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (ProgressBar.stylesInitialized) return;
    StyleManager.addStyles(`
      /* Scoped styles for Userscripts ProgressBar Component */
      .${ProgressBar.BASE_PROGRESS_CLASS} {
        width: 100%;
        margin: 10px 0;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-label {
        font-size: 0.875rem;
        margin-bottom: 4px;
        display: block;
        color: var(${ProgressBar.CSS_VAR_PREFIX}label-color);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 8px;
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}bar-bg);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        height: 100%;
        width: 0%;
        border-radius: 4px;
        transition: width 0.3s ease;
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}fill-bg);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-text {
        font-size: 0.75rem;
        text-align: right;
        margin-top: 4px;
        color: var(${ProgressBar.CSS_VAR_PREFIX}text-color);
      }
      
      /* Themes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--default .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}default-fill-bg);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--primary .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--success .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}success-fill-bg);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--danger .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--warning .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg);
      }
      
      /* Sizes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--small .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 4px;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--large .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 12px;
      }
    `, 'userscripts-progress-styles');
    ProgressBar.stylesInitialized = true;
  }
  /**
     * Injects default color variables for the ProgressBar component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-progress-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          ${ProgressBar.CSS_VAR_PREFIX}label-color: #555;
          ${ProgressBar.CSS_VAR_PREFIX}bar-bg: #e0e0e0;
          ${ProgressBar.CSS_VAR_PREFIX}fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}text-color: #555;
          
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg: #3b82f6;
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-bg: #10b981;
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg: #ef4444;
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg: #f59e0b;
        }
      `;
      document.head.appendChild(style);
    }
  }
  /**
     * Create a new progress bar.
     * @param {Object} options - Configuration options.
     * @param {number} options.initialValue - Initial progress value (0-100).
     * @param {string} [options.className='userscripts-progress'] - CSS class for styling.
     * @param {HTMLElement} options.container - Container element to which the progress bar will be appended.
     * @param {boolean} [options.showText=true] - Whether to display the progress text.
     * @param {boolean} [options.showLabel=false] - Whether to display a label above the progress bar.
     * @param {string} [options.label=''] - Label text to display if showLabel is true.
     * @param {string} [options.theme='default'] - Theme for the progress bar (e.g., "default", "primary", "success").
     */
  constructor(options) {
    this.value = options.initialValue || 0;
    this.className = options.className || ProgressBar.BASE_PROGRESS_CLASS;
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

    ProgressBar.initStyles();
    this.create();
  }


  /**
     * Creates the progress bar elements and appends them to the container if provided.
     * @return {HTMLElement} The created progress bar container element.
     */
  create() {
    // Create the progress bar container
    this.progressElement = document.createElement('div');
    this.progressElement.className = `${this.className} ${this.className}--${this.theme}`;

    // Add a label if requested
    if (this.showLabel) {
      this.labelElement = document.createElement('span');
      this.labelElement.className = `${this.className}-label`;
      this.labelElement.textContent = this.label;
      this.progressElement.appendChild(this.labelElement);
    }

    // Create the progress bar and its fill
    this.progressBarElement = document.createElement('div');
    this.progressBarElement.className = `${this.className}-bar`;
    this.progressFillElement = document.createElement('div');
    this.progressFillElement.className = `${this.className}-fill`;
    this.progressFillElement.style.width = `${this.value}%`;
    this.progressBarElement.appendChild(this.progressFillElement);
    this.progressElement.appendChild(this.progressBarElement);

    // Add progress text if requested
    if (this.showText) {
      this.progressTextElement = document.createElement('div');
      this.progressTextElement.className = `${this.className}-text`;
      this.progressTextElement.textContent = `${this.value}%`;
      this.progressElement.appendChild(this.progressTextElement);
    }

    // Append the entire progress element to the container, if one was provided
    if (this.container) {
      this.container.appendChild(this.progressElement);
    }
    return this.progressElement;
  }

  /**
     * Updates the progress value and (optionally) the display text.
     * @param {number} value - The new progress value (between 0 and 100).
     * @param {string} [text] - Optional custom text to display.
     * @return {number} The updated progress value.
     */
  setValue(value, text) {
    this.value = Math.min(100, Math.max(0, value));
    if (this.progressFillElement) {
      this.progressFillElement.style.width = `${this.value}%`;
    }
    if (this.showText && this.progressTextElement) {
      this.progressTextElement.textContent = text || `${this.value}%`;
    }
    return this.value;
  }

  /**
     * Changes the progress bar theme by updating the theme class.
     * @param {string} theme - The new theme (e.g., "default", "primary", "success", etc.).
     */
  setTheme(theme) {
    this.theme = theme;
    if (this.progressElement) {
      // Remove any existing theme class (assumed to be in the format `${this.className}--<theme>`)
      const classes = this.progressElement.className.split(' ');
      const nonThemeClasses = classes.filter((cls) => !cls.startsWith(`${this.className}--`));
      this.progressElement.className = `${nonThemeClasses.join(' ')} ${this.className}--${this.theme}`;
    }
  }

  /**
     * Sets the label text for the progress bar.
     * @param {string} label - The new label text.
     */
  setLabel(label) {
    this.label = label;
    if (this.labelElement) {
      this.labelElement.textContent = label;
    }
  }

  /**
     * Shows or hides the entire progress bar.
     * @param {boolean} visible - True to show, false to hide.
     */
  setVisible(visible) {
    if (this.progressElement) {
      this.progressElement.style.display = visible ? '' : 'none';
    }
  }
}

// Static property to track if styles have been initialized.
ProgressBar.stylesInitialized = false;

// Initialize styles when imported.
ProgressBar.initStyles();

export default ProgressBar;
