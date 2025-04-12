/**
 * SectionToggler - A reusable component for toggling UI sections
 * Handles expand/collapse functionality with transitions, animations,
 * and provides various customization options including icons, badges,
 * accessibility features, and event handling.
 */
/**
 * Reusable Toggler Component
 * Handles section toggling with consistent behavior
 */
class SectionToggler {
  /**
     * Create a new section toggler
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element for the toggle section
     * @param {String} options.sectionClass - Base class name for the section
     * @param {String} options.titleText - Text to display in the section title
     * @param {Boolean} options.isExpanded - Initial expanded state
     * @param {Function} options.contentCreator - Function to create section content
     * @param {Function} options.onToggle - Callback when toggle state changes
     */
  constructor(options) {
    this.container = options.container;
    this.sectionClass = options.sectionClass;
    this.titleText = options.titleText;
    this.isExpanded = options.isExpanded !== undefined ? options.isExpanded : true;
    this.contentCreator = options.contentCreator;
    this.onToggle = options.onToggle;

    this.section = null;
    this.toggleElement = null;
    this.contentElement = null;

    this.create();
  }

  /**
     * Create the toggle section
     * @return {HTMLElement} The created section element
     */
  create() {
    // Create section container
    this.section = document.createElement('div');
    this.section.className = `panel-section ${this.sectionClass}-section`;

    // Create section title
    const titleElement = document.createElement('div');
    titleElement.className = 'section-title';
    titleElement.innerHTML = `<span>${this.titleText}</span><span class="section-toggle">▼</span>`;
    this.toggleElement = titleElement.querySelector('.section-toggle');

    // Add toggle behavior
    titleElement.addEventListener('click', () => this.toggle());
    this.section.appendChild(titleElement);

    // Create content container
    this.contentElement = document.createElement('div');
    this.contentElement.className = `section-content ${this.sectionClass}-content`;

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
}

export default SectionToggler;
