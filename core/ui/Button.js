/**
 * Button - A reusable UI component for buttons
 * Creates customizable, accessible buttons with various states and callbacks
 */
class Button {
  /**
     * Create a new button
     * @param {Object} options - Configuration options
     * @param {String} options.text - Button text
     * @param {String} options.type - Button type (button, submit, reset)
     * @param {String} options.className - Button CSS class
     * @param {Function} options.onClick - Click event handler
     * @param {String} options.id - Button ID
     * @param {HTMLElement} options.container - Container to append button to
     * @param {Object} options.attributes - Additional HTML attributes
     * @param {String} options.theme - Button theme (primary, secondary, success, danger)
     * @param {String} options.size - Button size (small, medium, large)
     * @param {Boolean} options.disabled - Whether button is initially disabled
     * @param {String} options.icon - Optional icon HTML to show before text
     * @param {String} options.successText - Text to show on success state
     * @param {Number} options.successDuration - Duration to show success state (ms)
     */
  constructor(options) {
    this.text = options.text || '';
    this.type = options.type || 'button';
    this.className = options.className || 'reusable-button';
    this.onClick = options.onClick;
    this.id = options.id;
    this.container = options.container;
    this.attributes = options.attributes || {};
    this.theme = options.theme || 'default';
    this.size = options.size || 'medium';
    this.disabled = options.disabled || false;
    this.icon = options.icon || null;
    this.successText = options.successText || null;
    this.successDuration = options.successDuration || 1500;
    this.originalText = this.text;

    this.button = null;
    this.create();
  }

  /**
     * Create the button element
     * @return {HTMLButtonElement} The created button
     */
  create() {
    this.button = document.createElement('button');

    // Set basic properties
    this.button.type = this.type;
    this.button.className = this.getButtonClasses();
    this.button.disabled = this.disabled;

    // Set ID if provided
    if (this.id) {
      this.button.id = this.id;
    }

    // Set content (icon + text)
    this.updateContent();

    // Add click handler
    if (this.onClick) {
      this.button.addEventListener('click', (e) => this.handleClick(e));
    }

    // Add additional attributes
    Object.entries(this.attributes).forEach(([key, value]) => {
      this.button.setAttribute(key, value);
    });

    // Add to container if provided
    if (this.container) {
      this.container.appendChild(this.button);
    }

    return this.button;
  }

  /**
     * Handle click events, with success state support
     * @param {Event} e - Click event
     */
  handleClick(e) {
    if (this.disabled) return;

    // Call the onClick handler
    const result = this.onClick(e);

    // Handle success state if successText is set
    if (this.successText && false !== result) {
      this.showSuccessState();
    }
  }

  /**
     * Show success state animation
     */
  showSuccessState() {
    // Store original button state
    const originalText = this.text;
    const originalClasses = this.button.className;

    // Update to success state
    this.setText(this.successText);
    this.button.className = this.getButtonClasses('success');

    // Set timeout to revert back
    setTimeout(() => {
      this.setText(originalText);
      this.button.className = originalClasses;
    }, this.successDuration);
  }

  /**
     * Generate button classes based on theme and size
     * @param {String} state - Optional state override (success, error, etc)
     * @return {String} Combined CSS classes
     */
  getButtonClasses(state = null) {
    const classes = [this.className];

    // Add theme class
    const theme = state || this.theme;
    classes.push(`${this.className}--${theme}`);

    // Add size class
    classes.push(`${this.className}--${this.size}`);

    return classes.join(' ');
  }

  /**
     * Update button content (icon + text)
     */
  updateContent() {
    // Clear existing content
    this.button.innerHTML = '';

    // Add icon if present
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = `${this.className}__icon`;
      iconSpan.innerHTML = this.icon;
      this.button.appendChild(iconSpan);
    }

    // Add text
    const textSpan = document.createElement('span');
    textSpan.className = `${this.className}__text`;
    textSpan.textContent = this.text;
    this.button.appendChild(textSpan);
  }

  /**
     * Set button text
     * @param {String} text - New button text
     */
  setText(text) {
    this.text = text;
    const textElement = this.button.querySelector(`.${this.className}__text`);
    if (textElement) {
      textElement.textContent = text;
    } else {
      this.updateContent();
    }
  }

  /**
     * Reset button text to original
     */
  resetText() {
    this.setText(this.originalText);
  }

  /**
     * Set icon content
     * @param {String} iconHtml - HTML for the icon
     */
  setIcon(iconHtml) {
    this.icon = iconHtml;
    this.updateContent();
  }

  /**
     * Enable or disable the button
     * @param {Boolean} disabled - Whether the button should be disabled
     */
  setDisabled(disabled) {
    this.disabled = disabled;
    this.button.disabled = disabled;
  }

  /**
     * Toggle button disabled state
     * @return {Boolean} New disabled state
     */
  toggleDisabled() {
    this.setDisabled(!this.disabled);
    return this.disabled;
  }

  /**
     * Set button theme
     * @param {String} theme - Theme name
     */
  setTheme(theme) {
    this.theme = theme;
    this.button.className = this.getButtonClasses();
  }

  /**
     * Set button size
     * @param {String} size - Size name
     */
  setSize(size) {
    this.size = size;
    this.button.className = this.getButtonClasses();
  }
}

export default Button;
