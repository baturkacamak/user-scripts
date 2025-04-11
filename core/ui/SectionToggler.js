/**
 * SectionToggler - A reusable component for toggling UI sections
 * Handles expand/collapse functionality with transitions, animations,
 * and provides various customization options including icons, badges,
 * accessibility features, and event handling.
 */
import StyleManager from '../utils/StyleManager.js';

/**
 * A reusable UI component for creating expand/collapse sections with
 * advanced features like custom icons, animations, and accessibility.
 */
class SectionToggler {
  /**
     * Returns the unique base CSS class for the SectionToggler component.
     * This class is used as the root for all styling and helps prevent CSS collisions.
     *
     * @return {string} The base CSS class name for section togglers.
     */
  static get BASE_SECTION_CLASS() {
    return 'userscripts-section';
  }
  /**
     * Returns the CSS variable prefix used for theming and styling the SectionToggler component.
     * This prefix scopes all custom CSS variables (e.g., colors, borders) related to the section toggler.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-section-';
  }
  /**
     * Initialize styles for all section togglers
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (SectionToggler.stylesInitialized) return;

    // Use StyleManager instead of directly creating style elements
    StyleManager.addStyles(`
      .${SectionToggler.BASE_SECTION_CLASS} {
        border-radius: 0.375rem;
        border: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color);
        margin-bottom: 1rem;
        overflow: hidden;
        box-shadow: var(${SectionToggler.CSS_VAR_PREFIX}box-shadow);
        transition: box-shadow 0.3s ease;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}:hover {
        box-shadow: var(${SectionToggler.CSS_VAR_PREFIX}box-shadow-hover);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--disabled {
        opacity: 0.65;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--shadow-none {
        box-shadow: none !important;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--bordered-content .${SectionToggler.BASE_SECTION_CLASS}-content {
        border-top: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-title {
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.75rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid transparent;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color);
        transition: background-color 0.2s ease;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-title:hover {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-hover);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-title__left,
      .${SectionToggler.BASE_SECTION_CLASS}-title__right {
        display: flex;
        align-items: center;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-title__icon {
        margin-right: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(${SectionToggler.CSS_VAR_PREFIX}icon-color);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-title__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}badge-bg);
        color: var(${SectionToggler.CSS_VAR_PREFIX}badge-color);
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.125rem 0.5rem;
        margin-left: 0.5rem;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-toggle {
        transition: transform 0.3s ease;
        font-size: 0.75rem;
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(${SectionToggler.CSS_VAR_PREFIX}toggle-color);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-content {
        max-height: var(${SectionToggler.CSS_VAR_PREFIX}content-max-height, 1000px);
        opacity: 1;
        overflow: hidden;
        padding: 1rem;
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}content-bg);
        transition: max-height var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease),
                    opacity var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease),
                    padding var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}-content.collapsed {
        max-height: 0;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      
      /* Animation variations */
      .${SectionToggler.BASE_SECTION_CLASS}--animation-fade .${SectionToggler.BASE_SECTION_CLASS}-content {
        transition: opacity var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease),
                    padding var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--animation-slide .${SectionToggler.BASE_SECTION_CLASS}-content {
        transition: max-height var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease),
                    padding var(${SectionToggler.CSS_VAR_PREFIX}transition-duration, 0.3s) var(${SectionToggler.CSS_VAR_PREFIX}transition-timing, ease);
        opacity: 1 !important;
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--animation-none .${SectionToggler.BASE_SECTION_CLASS}-content {
        transition: none !important;
      }
      
      /* Theme variations */
      .${SectionToggler.BASE_SECTION_CLASS}--default .${SectionToggler.BASE_SECTION_CLASS}-title {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-default);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color-default);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--primary .${SectionToggler.BASE_SECTION_CLASS}-title {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-primary);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color-primary);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--success .${SectionToggler.BASE_SECTION_CLASS}-title {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-success);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color-success);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--danger .${SectionToggler.BASE_SECTION_CLASS}-title {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-danger);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color-danger);
      }
      
      .${SectionToggler.BASE_SECTION_CLASS}--warning .${SectionToggler.BASE_SECTION_CLASS}-title {
        background-color: var(${SectionToggler.CSS_VAR_PREFIX}title-bg-warning);
        color: var(${SectionToggler.CSS_VAR_PREFIX}title-color-warning);
      }
    `, 'userscripts-section-styles');

    SectionToggler.stylesInitialized = true;
  }
  /**
     * Inject default color variables for the section toggler component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-section-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          /* Common styles */
          ${SectionToggler.CSS_VAR_PREFIX}border-color: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}toggle-color: #6b7280;
          ${SectionToggler.CSS_VAR_PREFIX}content-bg: #ffffff;
          ${SectionToggler.CSS_VAR_PREFIX}box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          ${SectionToggler.CSS_VAR_PREFIX}box-shadow-hover: 0 3px 6px rgba(0, 0, 0, 0.1);
          ${SectionToggler.CSS_VAR_PREFIX}icon-color: #6b7280;
          ${SectionToggler.CSS_VAR_PREFIX}transition-duration: 0.3s;
          ${SectionToggler.CSS_VAR_PREFIX}transition-timing: ease;
          ${SectionToggler.CSS_VAR_PREFIX}content-max-height: 1000px;
          
          /* Badge styles */
          ${SectionToggler.CSS_VAR_PREFIX}badge-bg: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}badge-color: #374151;
          
          /* Default theme */
          ${SectionToggler.CSS_VAR_PREFIX}title-bg: #f9fafb;
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-hover: #f3f4f6;
          ${SectionToggler.CSS_VAR_PREFIX}title-color: #374151;
          
          /* Theme variations */
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-default: #f9fafb;
          ${SectionToggler.CSS_VAR_PREFIX}title-color-default: #374151;
          
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-primary: #eff6ff;
          ${SectionToggler.CSS_VAR_PREFIX}title-color-primary: #1e40af;
          
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-success: #ecfdf5;
          ${SectionToggler.CSS_VAR_PREFIX}title-color-success: #065f46;
          
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-danger: #fef2f2;
          ${SectionToggler.CSS_VAR_PREFIX}title-color-danger: #b91c1c;
          
          ${SectionToggler.CSS_VAR_PREFIX}title-bg-warning: #fffbeb;
          ${SectionToggler.CSS_VAR_PREFIX}title-color-warning: #92400e;
        }
      `;
      document.head.appendChild(style);
    }
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
     * @param {String} options.customClassName - Additional custom CSS class
     * @param {String} options.animation - Animation type (default, fade, slide, none)
     * @param {String} options.iconHTML - HTML for the title icon
     * @param {String} options.badgeText - Text for the badge
     * @param {String} options.badgeTheme - Theme for the badge
     * @param {Boolean} options.disabled - Whether the section is disabled
     * @param {Boolean} options.borderedContent - Whether to add a border to the content
     * @param {Boolean} options.removeShadow - Whether to remove the shadow
     * @param {String} options.toggleIcon - Custom toggle icon HTML
     * @param {Function} options.onExpand - Callback when section is expanded
     * @param {Function} options.onCollapse - Callback when section is collapsed
     * @param {Number} options.transitionDuration - Custom transition duration in seconds
     * @param {String} options.transitionTiming - Custom transition timing function
     * @param {String} options.id - ID for the section element
     * @param {Object} options.attributes - Additional HTML attributes
     */
  constructor(options) {
    this.container = options.container;
    this.sectionClass = options.sectionClass || '';
    this.titleText = options.titleText;
    this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : true;
    this.contentCreator = options.contentCreator;
    this.onToggle = options.onToggle;
    this.theme = options.theme || 'default';
    this.customClassName = options.customClassName || '';

    // New options
    this.animation = options.animation || 'default';
    this.iconHTML = options.iconHTML || null;
    this.badgeText = options.badgeText || null;
    this.badgeTheme = options.badgeTheme || null;
    this.disabled = options.disabled || false;
    this.borderedContent = options.borderedContent || false;
    this.removeShadow = options.removeShadow || false;
    this.toggleIcon = options.toggleIcon || '▼';
    this.onExpand = options.onExpand;
    this.onCollapse = options.onCollapse;
    this.transitionDuration = options.transitionDuration;
    this.transitionTiming = options.transitionTiming;
    this.id = options.id;
    this.attributes = options.attributes || {};

    // DOM references
    this.section = null;
    this.titleElement = null;
    this.titleTextElement = null;
    this.toggleElement = null;
    this.contentElement = null;
    this.iconElement = null;
    this.badgeElement = null;

    // Event handlers
    this.keydownHandler = this.handleKeydown.bind(this);

    // Ensure styles are initialized
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
    if (this.id) {
      this.section.id = this.id;
    }

    // Apply custom attributes
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.section.setAttribute(key, value);
    });

    // Apply custom transition properties if provided
    if (this.transitionDuration) {
      this.section.style.setProperty(
          `${SectionToggler.CSS_VAR_PREFIX}transition-duration`,
          `${this.transitionDuration}s`,
      );
    }
    if (this.transitionTiming) {
      this.section.style.setProperty(
          `${SectionToggler.CSS_VAR_PREFIX}transition-timing`,
          this.transitionTiming,
      );
    }

    this.updateSectionClasses();

    // Create section title with left and right containers for flexibility
    this.titleElement = document.createElement('div');
    this.titleElement.className = `${SectionToggler.BASE_SECTION_CLASS}-title`;
    this.titleElement.setAttribute('role', 'button');
    this.titleElement.setAttribute('aria-expanded', this.isExpanded.toString());
    this.titleElement.setAttribute('tabindex', '0');

    // Create title left section (icon + text)
    const titleLeft = document.createElement('div');
    titleLeft.className = `${SectionToggler.BASE_SECTION_CLASS}-title__left`;

    // Add icon if provided
    if (this.iconHTML) {
      this.iconElement = document.createElement('span');
      this.iconElement.className = `${SectionToggler.BASE_SECTION_CLASS}-title__icon`;
      this.iconElement.innerHTML = this.iconHTML;
      titleLeft.appendChild(this.iconElement);
    }

    // Add title text
    this.titleTextElement = document.createElement('span');
    this.titleTextElement.textContent = this.titleText;
    titleLeft.appendChild(this.titleTextElement);

    // Add badge if provided
    if (this.badgeText) {
      this.badgeElement = document.createElement('span');
      this.badgeElement.className = `${SectionToggler.BASE_SECTION_CLASS}-title__badge`;
      if (this.badgeTheme) {
        this.badgeElement.style.backgroundColor = `var(${SectionToggler.CSS_VAR_PREFIX}title-bg-${this.badgeTheme})`;
        this.badgeElement.style.color = `var(${SectionToggler.CSS_VAR_PREFIX}title-color-${this.badgeTheme})`;
      }
      this.badgeElement.textContent = this.badgeText;
      titleLeft.appendChild(this.badgeElement);
    }

    // Create title right section (toggle icon)
    const titleRight = document.createElement('div');
    titleRight.className = `${SectionToggler.BASE_SECTION_CLASS}-title__right`;

    // Add toggle element
    this.toggleElement = document.createElement('span');
    this.toggleElement.className = `${SectionToggler.BASE_SECTION_CLASS}-toggle`;
    this.toggleElement.innerHTML = this.toggleIcon;
    titleRight.appendChild(this.toggleElement);

    // Assemble title
    this.titleElement.appendChild(titleLeft);
    this.titleElement.appendChild(titleRight);

    // Add toggle behavior
    this.titleElement.addEventListener('click', () => this.toggle());
    this.titleElement.addEventListener('keydown', this.keydownHandler);
    this.section.appendChild(this.titleElement);

    // Create content container
    this.contentElement = document.createElement('div');
    this.contentElement.className = `${SectionToggler.BASE_SECTION_CLASS}-content`;
    const contentId = this.id ? `${this.id}-content` : `section-content-${Math.random().toString(36).substr(2, 9)}`;
    this.contentElement.id = contentId;
    this.titleElement.setAttribute('aria-controls', contentId);

    if (this.sectionClass) {
      this.contentElement.classList.add(`${this.sectionClass}-content`);
    }

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

    // Apply disabled state if needed
    if (this.disabled) {
      this.setDisabled(true);
    }

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.section);
    }

    // Store reference to instance on DOM element for potential external access
    this.section._sectionTogglerInstance = this;

    return this.section;
  }

  /**
     * Update the classes on the section element based on theme and custom classes.
     */
  updateSectionClasses() {
    const classNames = [SectionToggler.BASE_SECTION_CLASS];
    classNames.push(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);

    // Add animation class if not default
    if (this.animation && 'default' !== this.animation) {
      classNames.push(`${SectionToggler.BASE_SECTION_CLASS}--animation-${this.animation}`);
    }

    // Add bordered content class if enabled
    if (this.borderedContent) {
      classNames.push(`${SectionToggler.BASE_SECTION_CLASS}--bordered-content`);
    }

    // Add shadow removal class if enabled
    if (this.removeShadow) {
      classNames.push(`${SectionToggler.BASE_SECTION_CLASS}--shadow-none`);
    }

    // Add disabled class if needed
    if (this.disabled) {
      classNames.push(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
    }

    if (this.sectionClass) {
      classNames.push(`${this.sectionClass}-section`);
    }

    if (this.customClassName) {
      classNames.push(this.customClassName);
    }

    this.section.className = classNames.join(' ');
  }

  /**
     * Toggle the section expanded/collapsed state
     * @param {Boolean} [forceState]

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
     * Set the title text.
     * @param {String} text - The new title text to display.
     */
  setTitleText(text) {
    this.titleText = text;
    const titleSpan = this.titleElement.querySelector('span:first-child');
    if (titleSpan) {
      titleSpan.textContent = text;
    }
  }

  /**
     * Set the theme of the section toggler
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.section.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);
    this.theme = theme;
    this.section.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);
  }

  /**
     * Apply a custom CSS class to the section.
     * @param {String} className - The custom class name.
     */
  setCustomClass(className) {
    if (this.customClassName) {
      this.section.classList.remove(this.customClassName);
    }
    this.customClassName = className;
    if (className) {
      this.section.classList.add(className);
    }
  }
}

// Static property to track if styles have been initialized
SectionToggler.stylesInitialized = false;

export default SectionToggler;
