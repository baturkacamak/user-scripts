/**
 * ProgressBar - A reusable progress visualization component
 * Provides a customizable progress bar with status text
 */
import StyleManager from '../utils/StyleManager.js';

class ProgressBar {
  /**
     * Create a task progress bar (specialized ProgressBar)
     * @param {Object} options - Configuration options
     * @return {ProgressBar} The created progress bar instance
     */
  static createTaskProgress(options = {}) {
    const defaultOptions = {
      value: 0,
      text: 'Starting...',
      visible: false,
      animated: true,
    };

    return new ProgressBar({...defaultOptions, ...options});
  }
  /**
     * Create a new ProgressBar component
     * @param {Object} options - Configuration options
     * @param {number} options.value - Initial value (0-100)
     * @param {string} options.text - Initial status text
     * @param {boolean} options.visible - Whether the progress bar is initially visible
     * @param {boolean} options.animated - Whether to animate progress changes
     * @param {Object} options.styles - Custom styles override
     */
  constructor(options = {}) {
    this.value = Math.min(Math.max(options.value || 0, 0), 100);
    this.text = options.text || '';
    this.visible = options.visible !== undefined ? options.visible : false;
    this.animated = options.animated !== undefined ? options.animated : true;
    this.customStyles = options.styles || {};

    // Element references
    this.container = null;
    this.statusText = null;
    this.progressFill = null;

    // Initialize styles once for all instances
    this.initStyles();

    // Create the component
    this.element = this.create();
  }


  /**
     * Initialize styles for all progress bar instances
     */
  initStyles() {
    if (!ProgressBar.stylesAdded) {
      const defaultStyles = `
        .progress-container {
          margin-top: 10px;
          padding: 8px;
          background-color: #f9f9f9;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-text {
          font-size: 12px;
          margin-bottom: 5px;
          text-align: center;
          color: #555;
        }
        
        .progress-track {
          height: 5px;
          background-color: #e0e0e0;
          border-radius: 5px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: var(--progress-fill-color, #008080);
          width: 0%;
          border-radius: 5px;
        }
        
        .progress-fill.animated {
          transition: width 0.3s ease-in-out;
        }
      `;

      // Add styles
      StyleManager.addStyles(defaultStyles, 'progress-bar-component-styles');
      ProgressBar.stylesAdded = true;
    }
  }

  /**
     * Create the progress bar component
     * @return {HTMLElement} The progress bar container element
     */
  create() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'progress-container';
    Object.assign(this.container.style, this.customStyles.container || {});

    // Set initial visibility
    this.container.style.display = this.visible ? 'block' : 'none';

    // Create status text
    this.statusText = document.createElement('div');
    this.statusText.className = 'progress-text';
    this.statusText.textContent = this.text;
    Object.assign(this.statusText.style, this.customStyles.text || {});
    this.container.appendChild(this.statusText);

    // Create progress track
    const progressTrack = document.createElement('div');
    progressTrack.className = 'progress-track';
    Object.assign(progressTrack.style, this.customStyles.track || {});

    // Create progress fill
    this.progressFill = document.createElement('div');
    this.progressFill.className = `progress-fill ${this.animated ? 'animated' : ''}`;
    this.progressFill.style.width = `${this.value}%`;
    Object.assign(this.progressFill.style, this.customStyles.fill || {});

    // Assemble the component
    progressTrack.appendChild(this.progressFill);
    this.container.appendChild(progressTrack);

    return this.container;
  }

  /**
     * Update the progress value
     * @param {number} value - The new progress value (0-100)
     */
  updateProgress(value) {
    this.value = Math.min(Math.max(value, 0), 100);
    if (this.progressFill) {
      this.progressFill.style.width = `${this.value}%`;
    }
  }

  /**
     * Update the status text
     * @param {string} text - The new status text
     */
  updateText(text) {
    this.text = text;
    if (this.statusText) {
      this.statusText.textContent = text;
    }
  }

  /**
     * Update both progress and text at once
     * @param {number} value - The new progress value (0-100)
     * @param {string} text - The new status text
     */
  update(value, text) {
    this.updateProgress(value);
    this.updateText(text);
  }

  /**
     * Show the progress bar
     */
  show() {
    this.visible = true;
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
     * Hide the progress bar
     */
  hide() {
    this.visible = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
     * Toggle visibility of the progress bar
     * @return {boolean} New visibility state
     */
  toggle() {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? 'block' : 'none';
    }
    return this.visible;
  }

  /**
     * Set if the progress fill should be animated
     * @param {boolean} animated - Whether transitions should be animated
     */
  setAnimated(animated) {
    this.animated = animated;
    if (this.progressFill) {
      if (animated) {
        this.progressFill.classList.add('animated');
      } else {
        this.progressFill.classList.remove('animated');
      }
    }
  }
}

// Static property to track if styles have been added
ProgressBar.stylesAdded = false;

export default ProgressBar;
