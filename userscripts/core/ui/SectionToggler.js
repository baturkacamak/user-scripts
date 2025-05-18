import StyleManager from '../utils/StyleManager.js';
import PubSub from '../utils/PubSub.js';

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
     * Returns the CSS variable prefix used for theming the SectionToggler component.
     * This prefix scopes all custom CSS variables (e.g., colors) related to the section toggler.
     *
     * @return {string} The CSS variable prefix.
     */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-section-';
  }
  /**
     * Initialize styles for all section togglers.
     * These styles reference the CSS variables with our defined prefix.
     */
  static initStyles() {
    if (SectionToggler.stylesInitialized) return;
    StyleManager.addStyles(`
    /* Scoped styles for Userscripts SectionToggler Component */
    .${SectionToggler.BASE_SECTION_CLASS} {
      width: 100%;
      margin-bottom: 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color, #e5e7eb);
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}bg, #ffffff);
      overflow: hidden;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}header-bg, #f9fafb);
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid transparent;
      transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__header:hover {
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}header-hover-bg, #f3f4f6);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__title {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(${SectionToggler.CSS_VAR_PREFIX}title-color, #374151);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__icon {
      width: 1rem;
      height: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-in-out;
      color: var(${SectionToggler.CSS_VAR_PREFIX}icon-color, #9ca3af);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__icon svg {
      width: 100%;
      height: 100%;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__header:hover .${SectionToggler.BASE_SECTION_CLASS}__icon {
      color: var(${SectionToggler.CSS_VAR_PREFIX}icon-hover-color, #6b7280);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}__content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out, opacity 0.3s ease-in-out;
      opacity: 0;
      padding: 0 1rem;
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}content-bg, #ffffff);
      position: relative; /* Add position relative to manage child absolute elements */
      z-index: 1; /* Ensure content stays above other elements */
    }
    
    /* Direct child selector for nested section support */
    .${SectionToggler.BASE_SECTION_CLASS}--expanded > .${SectionToggler.BASE_SECTION_CLASS}__content {
      max-height: var(${SectionToggler.CSS_VAR_PREFIX}content-max-height, 500px);
      padding: 1rem;
      opacity: 1;
    }
    
    /* Ensure nested sections keep their own styles regardless of parent state */
    .${SectionToggler.BASE_SECTION_CLASS}__content .${SectionToggler.BASE_SECTION_CLASS} {
      max-height: none;
      opacity: 1;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--expanded > .${SectionToggler.BASE_SECTION_CLASS}__header {
      border-bottom: 1px solid var(${SectionToggler.CSS_VAR_PREFIX}border-color, #e5e7eb);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--expanded > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__icon {
      transform: rotate(180deg);
    }
    
    /* Section sizes */
    .${SectionToggler.BASE_SECTION_CLASS}--small > .${SectionToggler.BASE_SECTION_CLASS}__header {
      padding: 0.5rem 0.75rem;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--small > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__title {
      font-size: 0.75rem;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--large > .${SectionToggler.BASE_SECTION_CLASS}__header {
      padding: 1rem 1.25rem;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--large > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__title {
      font-size: 1rem;
    }
    
    /* Themes */
    .${SectionToggler.BASE_SECTION_CLASS}--primary > .${SectionToggler.BASE_SECTION_CLASS}__header {
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}primary-header-bg, #eff6ff);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--primary > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__title {
      color: var(${SectionToggler.CSS_VAR_PREFIX}primary-title-color, #2563eb);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--primary > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__icon {
      color: var(${SectionToggler.CSS_VAR_PREFIX}primary-icon-color, #3b82f6);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--success > .${SectionToggler.BASE_SECTION_CLASS}__header {
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}success-header-bg, #ecfdf5);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--success > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__title {
      color: var(${SectionToggler.CSS_VAR_PREFIX}success-title-color, #059669);
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--success > .${SectionToggler.BASE_SECTION_CLASS}__header .${SectionToggler.BASE_SECTION_CLASS}__icon {
      color: var(${SectionToggler.CSS_VAR_PREFIX}success-icon-color, #10b981);
    }
    
    /* Badge for counters or status indicators */
    .${SectionToggler.BASE_SECTION_CLASS}__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: var(${SectionToggler.CSS_VAR_PREFIX}badge-bg, #e5e7eb);
      color: var(${SectionToggler.CSS_VAR_PREFIX}badge-color, #4b5563);
      font-size: 0.75rem;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      margin-left: 0.5rem;
      font-weight: 500;
    }
    
    .${SectionToggler.BASE_SECTION_CLASS}--disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    
    /* For improved accessibility */
    @media (prefers-reduced-motion: reduce) {
      .${SectionToggler.BASE_SECTION_CLASS}__content,
      .${SectionToggler.BASE_SECTION_CLASS}__icon {
        transition: none;
      }
    }
  `, 'userscripts-section-toggler-styles');

    SectionToggler.stylesInitialized = true;

    // Set up a listener for SelectBox dropdown events to adjust content area accordingly
    PubSub.subscribe('selectbox:dropdown:open', (data) => {
      // Find all section togglers that contain this selectbox
      const selectboxElement = document.getElementById(data.id);
      if (!selectboxElement) return;

      // Find parent section content element
      const parentContent = selectboxElement.closest(`.${SectionToggler.BASE_SECTION_CLASS}__content`);
      if (parentContent) {
        parentContent.classList.add('has-selectbox');

        // Adjust the padding-bottom based on dropdown height if needed
        const dropdownHeight = data.height || 200;
        parentContent.style.paddingBottom = `${dropdownHeight + 20}px`;
      }
    });

    PubSub.subscribe('selectbox:dropdown:close', (data) => {
      const selectboxElement = document.getElementById(data.id);
      if (!selectboxElement) return;

      // Find parent section content element
      const parentContent = selectboxElement.closest(`.${SectionToggler.BASE_SECTION_CLASS}__content`);
      if (parentContent) {
        // Reset to original padding
        parentContent.style.paddingBottom = '';
      }
    });

    // Cleanup event when selectbox is destroyed
    PubSub.subscribe('selectbox:destroy', (data) => {
      const selectboxElement = document.getElementById(data.id);
      if (!selectboxElement) return;

      // Find parent section content element
      const parentContent = selectboxElement.closest(`.${SectionToggler.BASE_SECTION_CLASS}__content`);
      if (parentContent) {
        parentContent.classList.remove('has-selectbox');
        parentContent.style.paddingBottom = '';
      }
    });
  }
  /**
     * Inject default color variables for the SectionToggler component into the :root.
     * Users can call this method to automatically set a default color palette.
     */
  static useDefaultColors() {
    const styleId = 'userscripts-section-toggler-default-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        :root {
          /* Base colors */
          ${SectionToggler.CSS_VAR_PREFIX}bg: #ffffff;
          ${SectionToggler.CSS_VAR_PREFIX}border-color: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}header-bg: #f9fafb;
          ${SectionToggler.CSS_VAR_PREFIX}header-hover-bg: #f3f4f6;
          ${SectionToggler.CSS_VAR_PREFIX}title-color: #374151;
          ${SectionToggler.CSS_VAR_PREFIX}icon-color: #9ca3af;
          ${SectionToggler.CSS_VAR_PREFIX}icon-hover-color: #6b7280;
          ${SectionToggler.CSS_VAR_PREFIX}content-bg: #ffffff;
          ${SectionToggler.CSS_VAR_PREFIX}content-max-height: 500px;
          
          /* Primary theme */
          ${SectionToggler.CSS_VAR_PREFIX}primary-header-bg: #eff6ff;
          ${SectionToggler.CSS_VAR_PREFIX}primary-title-color: #2563eb;
          ${SectionToggler.CSS_VAR_PREFIX}primary-icon-color: #3b82f6;
          
          /* Success theme */
          ${SectionToggler.CSS_VAR_PREFIX}success-header-bg: #ecfdf5;
          ${SectionToggler.CSS_VAR_PREFIX}success-title-color: #059669;
          ${SectionToggler.CSS_VAR_PREFIX}success-icon-color: #10b981;
          
          /* Badge */
          ${SectionToggler.CSS_VAR_PREFIX}badge-bg: #e5e7eb;
          ${SectionToggler.CSS_VAR_PREFIX}badge-color: #4b5563;
        }
      `;
      document.head.appendChild(style);
    }
  }
  /**
     * Create a new SectionToggler.
     * @param {Object} options - Configuration options.
     * @param {string} options.title - The section title.
     * @param {boolean} [options.isExpanded=false] - Whether the section should be expanded initially.
     * @param {HTMLElement} [options.container] - Container to append the section to.
     * @param {string} [options.className] - Additional custom CSS class.
     * @param {Function} [options.onToggle] - Callback when section is toggled.
     * @param {Function} [options.contentCreator] - Function to create content dynamically.
     * @param {HTMLElement} [options.content] - Existing content element to use.
     * @param {string} [options.theme='default'] - Theme name (default, primary, success).
     * @param {string} [options.size='medium'] - Size name (small, medium, large).
     * @param {boolean} [options.disabled=false] - Whether the section is disabled.
     * @param {string|number} [options.badge] - Optional badge text or count.
     * @param {string} [options.id] - Optional ID for the section element.
     * @param {string} [options.icon='▼'] - Icon to use for toggle indicator.
     */
  constructor(options) {
    this.title = options.title || '';
    this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : false;
    this.container = options.container;
    this.customClassName = options.className || '';
    this.onToggle = options.onToggle;
    this.contentCreator = options.contentCreator;
    this.existingContent = options.content;
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.disabled = options.disabled || false;
    this.badge = options.badge;
    this.id = options.id;
    this.icon = options.icon || '▼';

    // DOM element references
    this.sectionElement = null;
    this.headerElement = null;
    this.contentElement = null;
    this.titleElement = null;
    this.iconElement = null;
    this.badgeElement = null;

    // Initialize styles
    SectionToggler.initStyles();
    this.create();
  }


  /**
     * Create the section toggler element.
     * @return {HTMLElement} The created section element.
     */
  create() {
    // Create main section container
    this.sectionElement = document.createElement('div');
    this.sectionElement.className = `${SectionToggler.BASE_SECTION_CLASS}`;

    if ('medium' !== this.size) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${this.size}`);
    }

    if ('default' !== this.theme) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);
    }

    if (this.isExpanded) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);
    }

    if (this.disabled) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
    }

    if (this.customClassName) {
      this._addCustomClassWithBEM(this.customClassName);
    }

    if (this.id) {
      this.sectionElement.id = this.id;
    }

    // Create header
    this.headerElement = document.createElement('div');
    this.headerElement.className = `${SectionToggler.BASE_SECTION_CLASS}__header`;
    this.headerElement.setAttribute('role', 'button');
    this.headerElement.setAttribute('tabindex', '0');
    this.headerElement.setAttribute('aria-expanded', this.isExpanded.toString());

    // Create title
    this.titleElement = document.createElement('div');
    this.titleElement.className = `${SectionToggler.BASE_SECTION_CLASS}__title`;
    this.titleElement.textContent = this.title;

    // Add badge if provided
    if (this.badge !== undefined) {
      this.badgeElement = document.createElement('span');
      this.badgeElement.className = `${SectionToggler.BASE_SECTION_CLASS}__badge`;
      this.badgeElement.textContent = this.badge;
      this.titleElement.appendChild(this.badgeElement);
    }

    this.headerElement.appendChild(this.titleElement);

    // Create icon
    this.iconElement = document.createElement('div');
    this.iconElement.className = `${SectionToggler.BASE_SECTION_CLASS}__icon`;

    // Support for text icons or SVG
    if (this.icon.startsWith('<svg') || this.icon.startsWith('<img')) {
      this.iconElement.innerHTML = this.icon;
    } else {
      this.iconElement.textContent = this.icon;
    }

    this.headerElement.appendChild(this.iconElement);

    // Create content container
    this.contentElement = document.createElement('div');
    this.contentElement.className = `${SectionToggler.BASE_SECTION_CLASS}__content`;

    // Add content if provided or use content creator
    if (this.existingContent) {
      this.contentElement.appendChild(this.existingContent);

      // Check if content contains a selectbox
      if (this.existingContent.querySelector('.userscripts-select-container')) {
        this.contentElement.classList.add('has-selectbox');
      }
    } else if (this.contentCreator) {
      this.contentCreator(this.contentElement);

      // Check if content contains a selectbox after creation
      if (this.contentElement.querySelector('.userscripts-select-container')) {
        this.contentElement.classList.add('has-selectbox');
      }
    }

    // Add event listeners
    this.headerElement.addEventListener('click', () => this.toggle());
    this.headerElement.addEventListener('keydown', (e) => {
      if ('Enter' === e.key || ' ' === e.key) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Assemble the elements
    this.sectionElement.appendChild(this.headerElement);
    this.sectionElement.appendChild(this.contentElement);

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.sectionElement);
    }

    // Store instance reference on the DOM element
    this.sectionElement._togglerInstance = this;

    return this.sectionElement;
  }

  /**
     * Toggle the expanded state of the section.
     * @return {boolean} The new expanded state.
     */
  toggle() {
    if (this.disabled) return this.isExpanded;

    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);

      // Check for selectbox presence when expanding
      if (this.contentElement.querySelector('.userscripts-select-container')) {
        this.contentElement.classList.add('has-selectbox');
      }
    } else {
      this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--expanded`);
    }

    this.headerElement.setAttribute('aria-expanded', this.isExpanded.toString());

    if (this.onToggle) {
      this.onToggle(this.isExpanded);
    }

    return this.isExpanded;
  }

  /**
     * Expand the section.
     */
  expand() {
    if (!this.isExpanded) {
      this.toggle();
    }
  }

  /**
     * Collapse the section.
     */
  collapse() {
    if (this.isExpanded) {
      this.toggle();
    }
  }

  /**
     * Set the section title.
     * @param {string} title - The new title.
     */
  setTitle(title) {
    this.title = title;
    if (this.titleElement) {
      // Preserve the badge if it exists
      const badge = this.titleElement.querySelector(`.${SectionToggler.BASE_SECTION_CLASS}__badge`);
      this.titleElement.textContent = title;
      if (badge) {
        this.titleElement.appendChild(badge);
      }
    }
  }

  /**
     * Set the badge text/count.
     * @param {string|number} badge - The badge text or count.
     */
  setBadge(badge) {
    this.badge = badge;

    if (!this.badgeElement && badge !== undefined) {
      // Create badge if it doesn't exist
      this.badgeElement = document.createElement('span');
      this.badgeElement.className = `${SectionToggler.BASE_SECTION_CLASS}__badge`;
      this.titleElement.appendChild(this.badgeElement);
    }

    if (this.badgeElement) {
      if (badge === undefined) {
        // Remove badge if set to undefined
        this.badgeElement.remove();
        this.badgeElement = null;
      } else {
        // Update badge text
        this.badgeElement.textContent = badge;
      }
    }
  }

  /**
     * Enable or disable the section toggler.
     * @param {boolean} disabled - Whether the toggler should be disabled.
     */
  setDisabled(disabled) {
    this.disabled = disabled;

    if (disabled) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
    } else {
      this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--disabled`);
    }

    this.headerElement.setAttribute('tabindex', disabled ? '-1' : '0');
  }

  /**
     * Set the theme of the section.
     * @param {string} theme - The theme name.
     */
  setTheme(theme) {
    // Remove current theme
    this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--${this.theme}`);

    // Set new theme
    this.theme = theme;

    // Add new theme class if not default
    if ('default' !== theme) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${theme}`);
    }
  }

  /**
     * Set the size of the section.
     * @param {string} size - The size name.
     */
  setSize(size) {
    // Remove current size
    this.sectionElement.classList.remove(`${SectionToggler.BASE_SECTION_CLASS}--${this.size}`);

    // Set new size
    this.size = size;

    // Add new size class if not medium
    if ('medium' !== size) {
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${size}`);
    }
  }

  /**
     * Set a custom content max height.
     * @param {string} height - CSS height value (e.g., "300px", "50vh").
     */
  setContentMaxHeight(height) {
    if (this.contentElement) {
      this.contentElement.style.setProperty(`${SectionToggler.CSS_VAR_PREFIX}content-max-height`, height);
    }
  }

  /**
     * Get the current expanded state.
     * @return {boolean} Whether the section is expanded.
     */
  isExpanded() {
    return this.isExpanded;
  }

  /**
     * Apply a custom CSS class to the section.
     * @param {string} className - The custom class name.
     */
  setCustomClass(className) {
    if (this.customClassName) {
      this.sectionElement.classList.remove(this.customClassName);
    }
    this.customClassName = className;
    if (className) {
      this._addCustomClassWithBEM(className);
    }
  }

  /**
     * Replace the section content.
     * @param {HTMLElement|string} content - New content element or HTML string.
     */
  setContent(content) {
    if (this.contentElement) {
      // Clear current content
      this.contentElement.innerHTML = '';

      // Add new content
      if ('string' === typeof content) {
        this.contentElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.contentElement.appendChild(content);
      }

      // Check if new content contains selectbox
      if (this.contentElement.querySelector('.userscripts-select-container')) {
        this.contentElement.classList.add('has-selectbox');
      } else {
        this.contentElement.classList.remove('has-selectbox');
      }
    }
  }

  /**
     * Get the content element of the section.
     * @return {HTMLElement} The content element.
     */
  getContentElement() {
    return this.contentElement;
  }

  /**
     * Private helper method to handle adding custom class following BEM convention
     * @param {string} className - The custom class to add
     * @private
     */
  _addCustomClassWithBEM(className) {
    if (!className) return;

    // If the class already follows BEM format, use it as is
    if (className.startsWith(`${SectionToggler.BASE_SECTION_CLASS}--`)) {
      this.sectionElement.classList.add(className);
    } else {
      // Otherwise add it as a BEM modifier
      this.sectionElement.classList.add(`${SectionToggler.BASE_SECTION_CLASS}--${className}`);
    }
  }
}

// Static property to track if styles have been initialized
SectionToggler.stylesInitialized = false;

export default SectionToggler;
