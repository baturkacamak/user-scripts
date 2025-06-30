/**
 * Enhanced version of the ProgressBar core component with Eksi-style UI
 * This replaces the existing ProgressBar.js file in the core/ui directory
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
        position: relative;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-label {
        font-size: 0.875rem;
        margin-bottom: 4px;
        display: block;
        color: var(${ProgressBar.CSS_VAR_PREFIX}label-color, #555);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 20px;
        background-color: var(${ProgressBar.CSS_VAR_PREFIX}bar-bg, #f3f3f3);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        height: 100%;
        width: 0%;
        border-radius: 10px;
        transition: width 0.5s ease;
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}fill-bg)), 
          var(${ProgressBar.CSS_VAR_PREFIX}fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}fill-bg))
        );
        position: relative;
        overflow: hidden;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-fill::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.1) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 255, 255, 0.1) 75%,
          transparent 75%,
          transparent 100%
        );
        background-size: 30px 30px;
        animation: ${ProgressBar.BASE_PROGRESS_CLASS}-stripes 1s linear infinite;
      }
      
      @keyframes ${ProgressBar.BASE_PROGRESS_CLASS}-stripes {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 30px 0;
        }
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}-text {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 10px;
        font-size: 0.75rem;
        color: var(${ProgressBar.CSS_VAR_PREFIX}text-color, #333);
        font-weight: bold;
        text-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);
        z-index: 1;
      }
      
      /* Themes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--default .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}default-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}default-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--primary .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--success .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}success-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}success-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--danger .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg))
        );
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--warning .${ProgressBar.BASE_PROGRESS_CLASS}-fill {
        background: linear-gradient(90deg, 
          var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-start, var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg)),
          var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-end, var(${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg))
        );
      }
      
      /* Sizes */
      .${ProgressBar.BASE_PROGRESS_CLASS}--small .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 8px;
      }
      
      .${ProgressBar.BASE_PROGRESS_CLASS}--large .${ProgressBar.BASE_PROGRESS_CLASS}-bar {
        height: 24px;
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
          /* Base colors */
          ${ProgressBar.CSS_VAR_PREFIX}label-color: #555;
          ${ProgressBar.CSS_VAR_PREFIX}bar-bg: #f3f3f3;
          ${ProgressBar.CSS_VAR_PREFIX}fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}text-color: #333;
          
          /* Theme colors with gradients */
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-bg: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-start: #6b7280;
          ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-end: #4b5563;
          
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-bg: #3b82f6;
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-start: #3b82f6;
          ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-end: #2563eb;
          
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-bg: #10b981;
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-start: #10b981;
          ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-end: #059669;
          
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-bg: #ef4444;
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-start: #ef4444;
          ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-end: #dc2626;
          
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-bg: #f59e0b;
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-start: #f59e0b;
          ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-end: #d97706;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            /* Base colors */
            ${ProgressBar.CSS_VAR_PREFIX}label-color: #e0e0e0;
            ${ProgressBar.CSS_VAR_PREFIX}bar-bg: #2d2d2d;
            ${ProgressBar.CSS_VAR_PREFIX}text-color: #ffffff;
            
            /* Theme colors with gradients */
            ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-start: #6b7280;
            ${ProgressBar.CSS_VAR_PREFIX}default-fill-gradient-end: #4b5563;
            
            ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-start: #3b82f6;
            ${ProgressBar.CSS_VAR_PREFIX}primary-fill-gradient-end: #2563eb;
            
            ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-start: #10b981;
            ${ProgressBar.CSS_VAR_PREFIX}success-fill-gradient-end: #059669;
            
            ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-start: #ef4444;
            ${ProgressBar.CSS_VAR_PREFIX}danger-fill-gradient-end: #dc2626;
            
            ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-start: #f59e0b;
            ${ProgressBar.CSS_VAR_PREFIX}warning-fill-gradient-end: #d97706;
          }
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
     * @param {string} [options.size='normal'] - Size of the progress bar ('small', 'normal', 'large').
     */
  constructor(options) {
    this.value = options.initialValue || 0;
    this.className = options.className || ProgressBar.BASE_PROGRESS_CLASS;
    this.container = options.container;
    this.showText = options.showText !== undefined ? options.showText : true;
    this.showLabel = options.showLabel || false;
    this.label = options.label || '';
    this.theme = options.theme || 'default';
    this.size = options.size || 'normal';

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

    if ('normal' !== this.size) {
      this.progressElement.classList.add(`${this.className}--${this.size}`);
    }

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

    // Add progress text as absolute positioned element
    if (this.showText) {
      this.progressTextElement = document.createElement('div');
      this.progressTextElement.className = `${this.className}-text`;
      this.progressTextElement.textContent = `${this.value}%`;
      this.progressBarElement.appendChild(this.progressTextElement);
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
      const nonThemeClasses = classes.filter((cls) =>
        !cls.startsWith(`${this.className}--`) ||
                cls === `${this.className}--${this.size}`, // Keep size class
      );
      this.progressElement.className = `${nonThemeClasses.join(' ')} ${this.className}--${this.theme}`;
    }
  }

  /**
     * Changes the progress bar size.
     * @param {string} size - The new size ('small', 'normal', 'large').
     */
  setSize(size) {
    this.size = size;
    if (this.progressElement) {
      // Remove size classes
      this.progressElement.classList.remove(`${this.className}--small`);
      this.progressElement.classList.remove(`${this.className}--large`);

      // Add new size class if not normal
      if ('normal' !== size) {
        this.progressElement.classList.add(`${this.className}--${size}`);
      }
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

  /**
     * Destroys the progress bar and removes it from the DOM.
     */
  destroy() {
    if (this.progressElement && this.progressElement.parentNode) {
      this.progressElement.parentNode.removeChild(this.progressElement);
    }
    this.progressElement = null;
    this.progressBarElement = null;
    this.progressFillElement = null;
    this.progressTextElement = null;
    this.labelElement = null;
  }
}

// Static property to track if styles have been initialized.
ProgressBar.stylesInitialized = false;

// Initialize styles when imported.
ProgressBar.initStyles();

export default ProgressBar;
