// Component for export format selection with options

/**
 * Configurable export format option with settings
 */
export class FormatOption {
    /**
     * Create a new format option
     * @param {Object} config - Configuration options
     */
    constructor(config) {
        this.id = config.id;
        this.label = config.label;
        this.description = config.description;
        this.category = config.category;
        this.options = config.options || [];
        this.element = null;
        this.optionsContainer = null;
        this.optionValues = {};

        // Initialize default values for options
        this.options.forEach(option => {
            this.optionValues[option.id] = option.defaultValue || false;
        });
    }

    /**
     * Create the DOM element for this format option
     * @param {Function} onSelect - Callback when this option is selected
     * @returns {HTMLElement} The created element
     */
    createElement(onSelect) {
        // Create main format item
        this.element = document.createElement('li');
        this.element.className = 'format-item';
        this.element.dataset.formatId = this.id;
        this.element.dataset.category = this.category;

        const formatLabel = document.createElement('div');
        formatLabel.className = 'format-label';
        formatLabel.textContent = this.label;
        formatLabel.title = this.description;

        this.element.appendChild(formatLabel);

        // Handle format selection
        formatLabel.addEventListener('click', (e) => {
            if (onSelect) {
                onSelect(this);
            }
            e.stopPropagation();
        });

        // Create options container if this format has options
        if (this.options.length > 0) {
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'format-options hidden';

            // Create each option checkbox
            this.options.forEach(option => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';

                // Create checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `option-${this.id}-${option.id}`;
                checkbox.checked = option.defaultValue || false;
                checkbox.addEventListener('change', (e) => {
                    this.optionValues[option.id] = e.target.checked;
                    e.stopPropagation();
                });

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = option.label;
                label.title = option.description || '';
                label.className = 'checkbox-label';

                optionRow.appendChild(checkbox);
                optionRow.appendChild(label);
                this.optionsContainer.appendChild(optionRow);
            });

            this.element.appendChild(this.optionsContainer);

            // Add expand/collapse capability for options
            const expandButton = document.createElement('button');
            expandButton.className = 'options-toggle';
            expandButton.innerHTML = '⚙️';
            expandButton.title = 'Format Options';
            formatLabel.appendChild(expandButton);

            expandButton.addEventListener('click', (e) => {
                this.toggleOptions();
                e.stopPropagation();
            });
        }

        return this.element;
    }

    /**
     * Toggle options visibility
     */
    toggleOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.toggle('hidden');
        }
    }

    /**
     * Show options panel
     */
    showOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.remove('hidden');
        }
    }

    /**
     * Hide options panel
     */
    hideOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.add('hidden');
        }
    }

    /**
     * Get all options values
     * @returns {Object} The options values
     */
    getOptions() {
        return this.optionValues;
    }

    /**
     * Get a specific option value
     * @param {String} optionId - The option ID
     * @returns {*} The option value
     */
    getOption(optionId) {
        return this.optionValues[optionId];
    }

    /**
     * Set a specific option value
     * @param {String} optionId - The option ID
     * @param {*} value - The value to set
     */
    setOption(optionId, value) {
        this.optionValues[optionId] = value;

        // Update checkbox if it exists
        const checkbox = this.element?.querySelector(`#option-${this.id}-${optionId}`);
        if (checkbox) {
            checkbox.checked = value;
        }
    }

    /**
     * Mark this format as selected
     */
    select() {
        if (this.element) {
            this.element.classList.add('selected');
        }
    }

    /**
     * Unselect this format
     */
    unselect() {
        if (this.element) {
            this.element.classList.remove('selected');
        }
    }
}