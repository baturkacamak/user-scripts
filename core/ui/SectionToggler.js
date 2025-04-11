/**
 * SectionToggler - A reusable component for toggling UI sections
 * Handles expand/collapse functionality with transitions
 */
import StyleManager from '../utils/StyleManager.js';

class SectionToggler {
  /**
     * Initialize styles for all section togglers
     */
  static initStyles() {
    // This will be called only once, when the first instance is created
    if (SectionToggler.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .reusable-section {
        border-radius: 0.375rem;
        border: 1px solid #e5e7eb;
        margin-bottom: 1rem;
        overflow: hidden;
      }
      
      .reusable-section-title {
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.75rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid transparent;
        background-color: #f9fafb;
        transition: background-color 0.2s ease;
      }
      
      .reusable-section-title:hover {
        background-color: #f3f4f6;
      }
      
      .reusable-section-toggle {
        transition: transform 0.3s ease;
        font-size: 0.75rem;
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }
      
      .reusable-section-content {
        max-height: 1000px;
        opacity: 1;
        overflow: hidden;
        padding: 1rem;
        transition: max-height 0.3s ease,
                    opacity 0.3s ease,
                    padding 0.3s ease;
      }
      
      .reusable-section-content.collapsed {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      
      /* Theme variations */
      .reusable-section--default .reusable-section-title {
        background-color: #f9fafb;
        color: #374151;
      }
      
      .reusable-section--primary .reusable-section-title {
        background-color: #eff6ff;
        color: #1e40af;
      }
      
      .reusable-section--success .reusable-section-title {
        background-color: #ecfdf5;
        color: #065f46;
      }
      
      .reusable-section--danger .reusable-section-title {
        background-color: #fef2f2;
        color: #b91c1c;
      }
      
      .reusable-section--warning .reusable-section-title {
        background-color: #fffbeb;
        color: #92400e;
      }
    `, 'reusable-section-styles');

    SectionToggler.stylesInitialized = true;
  }
  /**
     * Create a new section toggler
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element for the toggle section
     * @param {String} options.sectionClass - Base class name for the section
     * @param {String} options.titleText - Text to display in the section title
     * @param {Boolean} options.isExpanded - Initial expanded state
     * @param {Function} options.contentCreator - Function to create section content
     * @param {Function} options.onToggle - Callback when toggle state changes
     * @param {String} options.theme - Theme name (default, primary, etc.)
     */
  constructor(options) {
    this.container = options.container;
    this.sectionClass = options.sectionClass;
    this.titleText = options.titleText;
    this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : true;
    this.contentCreator = options.contentCreator;
    this.onToggle = options.onToggle;
    this.theme = options.theme || 'default';

    this.section = null;
    this.toggleElement = null;
    this.contentElement = null;

    SectionToggler.initStyles();
    this.create();
  }


  /**
     * Create the toggle section
     * @return {HTMLElement} The created section element
     */
  create() {
    // Create section container
    this.section = document.createElement('div');
    this.section.className = `reusable-section ${this.sectionClass}-section reusable-section--${this.theme}`;

    // Create section title
    const titleElement = document.createElement('div');
    titleElement.className = 'reusable-section-title';
    titleElement.innerHTML = `<span>${this.titleText}</span><span class="reusable-section-toggle">▼</span>`;
    this.toggleElement = titleElement.querySelector('.reusable-section-toggle');

    // Add toggle behavior
    titleElement.addEventListener('click', () => this.toggle());
    this.section.appendChild(titleElement);

    // Create content container
    this.contentElement = document.createElement('div');
    this.contentElement.className = `reusable-section-content ${this.sectionClass}-content`;

    // Apply initial state
    if (!this.isExpanded) {
      this.contentElement.classList.add('collapsed');
      this.toggleElement.style.transform = 'rotate(-90deg)';
    }

    // Create content
    if (this.contentCreator) {
      this.contentCreator(this.contentElement);
    }

    this.section.appendChild(this.contentElement);

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.section);
    }

    return this.section;
  }

  /**
     * Toggle the section expanded/collapsed state
     */
  toggle() {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.contentElement.classList.remove('collapsed');
      this.toggleElement.style.transform = 'rotate(0deg)';
    } else {
      this.contentElement.classList.add('collapsed');
      this.toggleElement.style.transform = 'rotate(-90deg)';
    }

    // Execute callback if provided
    if (this.onToggle) {
      this.onToggle(this.isExpanded);
    }
  }

  /**
     * Get the current expanded state
     * @return {Boolean} True if expanded, false if collapsed
     */
  getState() {
    return this.isExpanded;
  }

  /**
     * Set the expanded state
     * @param {Boolean} expanded - Whether the section should be expanded
     */
  setState(expanded) {
    if (this.isExpanded !== expanded) {
      this.toggle();
    }
  }

  /**
     * Set the theme of the section toggler
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;

    // Update class name with new theme
    const classNames = this.section.className.split(' ');
    const themeRegex = new RegExp('reusable-section--[a-z]+');
    const filteredClasses = classNames.filter((className) => !themeRegex.test(className));
    filteredClasses.push(`reusable-section--${this.theme}`);
    this.section.className = filteredClasses.join(' ');
  }
}

// Static property to track if styles have been initialized
SectionToggler.stylesInitialized = false;

// Initialize styles when imported
SectionToggler.initStyles();

export default SectionToggler;
