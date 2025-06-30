/**
 * Input - A reusable input field component with theming and validation
 * Provides consistent styling and behavior across userscripts
 */
import StyleManager from '../utils/StyleManager.js';

class Input {
    static BASE_INPUT_CLASS = 'userscript-input';
    static THEMES = {
        default: 'default',
        primary: 'primary',
        success: 'success',
        warning: 'warning',
        danger: 'danger'
    };
    static SIZES = {
        small: 'small',
        medium: 'medium',
        large: 'large'
    };

    /**
     * Initialize default styles for Input components
     */
    static initStyles() {
        if (StyleManager.hasStyles('input-component')) {
            return;
        }

        const styles = `
            .${Input.BASE_INPUT_CLASS} {
                position: relative;
                display: inline-block;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .${Input.BASE_INPUT_CLASS}-field {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                transition: all 0.2s ease;
                background: #fff;
                color: #222;
                outline: none;
            }

            .${Input.BASE_INPUT_CLASS}-field:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
            }

            .${Input.BASE_INPUT_CLASS}-field:disabled {
                background: #f0f0f0;
                color: #888;
                cursor: not-allowed;
            }

            .${Input.BASE_INPUT_CLASS}-field::placeholder {
                color: #222;
                opacity: 0.7;
            }

            /* Themes */
            .${Input.BASE_INPUT_CLASS}--primary .${Input.BASE_INPUT_CLASS}-field:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
            }

            .${Input.BASE_INPUT_CLASS}--success .${Input.BASE_INPUT_CLASS}-field {
                border-color: #28a745;
            }

            .${Input.BASE_INPUT_CLASS}--success .${Input.BASE_INPUT_CLASS}-field:focus {
                border-color: #28a745;
                box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
            }

            .${Input.BASE_INPUT_CLASS}--warning .${Input.BASE_INPUT_CLASS}-field {
                border-color: #ffc107;
            }

            .${Input.BASE_INPUT_CLASS}--warning .${Input.BASE_INPUT_CLASS}-field:focus {
                border-color: #ffc107;
                box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
            }

            .${Input.BASE_INPUT_CLASS}--danger .${Input.BASE_INPUT_CLASS}-field {
                border-color: #dc3545;
            }

            .${Input.BASE_INPUT_CLASS}--danger .${Input.BASE_INPUT_CLASS}-field:focus {
                border-color: #dc3545;
                box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
            }

            /* Sizes */
            .${Input.BASE_INPUT_CLASS}--small .${Input.BASE_INPUT_CLASS}-field {
                padding: 6px 10px;
                font-size: 12px;
            }

            .${Input.BASE_INPUT_CLASS}--large .${Input.BASE_INPUT_CLASS}-field {
                padding: 12px 16px;
                font-size: 16px;
            }

            /* Label */
            .${Input.BASE_INPUT_CLASS}-label {
                display: block;
                margin-bottom: 4px;
                font-size: 13px;
                font-weight: 500;
                color: #333;
            }

            /* Error message */
            .${Input.BASE_INPUT_CLASS}-error {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #dc3545;
            }

            /* Helper text */
            .${Input.BASE_INPUT_CLASS}-helper {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #666;
            }

            /* Dark theme */
            @media (prefers-color-scheme: dark) {
                .${Input.BASE_INPUT_CLASS}-field {
                    background: #2d2d2d;
                    color: #e0e0e0;
                    border-color: #555;
                }

                .${Input.BASE_INPUT_CLASS}-field:focus {
                    border-color: #4285f4;
                    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
                }

                .${Input.BASE_INPUT_CLASS}-field:disabled {
                    background: #444;
                    color: #888;
                }

                .${Input.BASE_INPUT_CLASS}-field::placeholder {
                    color: #e0e0e0;
                    opacity: 0.5;
                }

                .${Input.BASE_INPUT_CLASS}-label {
                    color: #e0e0e0;
                }

                .${Input.BASE_INPUT_CLASS}-helper {
                    color: #aaa;
                }

                /* Themes in dark mode */
                .${Input.BASE_INPUT_CLASS}--primary .${Input.BASE_INPUT_CLASS}-field:focus {
                    border-color: #4285f4;
                    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
                }

                .${Input.BASE_INPUT_CLASS}--success .${Input.BASE_INPUT_CLASS}-field {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                    border-color: #28a745;
                }

                .${Input.BASE_INPUT_CLASS}--success .${Input.BASE_INPUT_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.3);
                }

                .${Input.BASE_INPUT_CLASS}--warning .${Input.BASE_INPUT_CLASS}-field {
                     background-color: #2d2d2d;
                    color: #e0e0e0;
                    border-color: #ffc107;
                }

                .${Input.BASE_INPUT_CLASS}--warning .${Input.BASE_INPUT_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
                }

                .${Input.BASE_INPUT_CLASS}--danger .${Input.BASE_INPUT_CLASS}-field {
                     background-color: #2d2d2d;
                    color: #e0e0e0;
                    border-color: #dc3545;
                }

                .${Input.BASE_INPUT_CLASS}--danger .${Input.BASE_INPUT_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.3);
                }
            }
        `;

        StyleManager.addStyles(styles, 'input-component');
    }

    /**
     * Use default color scheme
     */
    static useDefaultColors() {
        // Colors are already defined in initStyles
        // This method exists for API consistency with other components
    }

    /**
     * Create a new Input instance
     * @param {Object} options - Configuration options
     * @param {string} [options.type='text'] - Input type (text, number, email, password, etc.)
     * @param {string} [options.value=''] - Initial value
     * @param {string} [options.placeholder=''] - Placeholder text
     * @param {string} [options.label=''] - Label text
     * @param {string} [options.helperText=''] - Helper text
     * @param {string} [options.theme='default'] - Theme (default, primary, success, warning, danger)
     * @param {string} [options.size='medium'] - Size (small, medium, large)
     * @param {boolean} [options.disabled=false] - Whether input is disabled
     * @param {boolean} [options.required=false] - Whether input is required
     * @param {string} [options.min] - Minimum value (for number inputs)
     * @param {string} [options.max] - Maximum value (for number inputs)
     * @param {string} [options.step] - Step value (for number inputs)
     * @param {Function} [options.onInput] - Input event handler
     * @param {Function} [options.onChange] - Change event handler
     * @param {Function} [options.onFocus] - Focus event handler
     * @param {Function} [options.onBlur] - Blur event handler
     * @param {Function} [options.validator] - Custom validation function
     * @param {HTMLElement} [options.container] - Container to append to
     * @param {string} [options.className] - Additional CSS class
     */
    constructor(options = {}) {
        this.options = {
            type: 'text',
            value: '',
            placeholder: '',
            label: '',
            helperText: '',
            theme: Input.THEMES.default,
            size: Input.SIZES.medium,
            disabled: false,
            required: false,
            onInput: null,
            onChange: null,
            onFocus: null,
            onBlur: null,
            validator: null,
            container: null,
            className: '',
            ...options
        };

        this.isValid = true;
        this.errorMessage = '';

        this.createElement();
        this.setupEventListeners();

        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    /**
     * Create the input element structure
     */
    createElement() {
        // Main container
        this.element = document.createElement('div');
        this.element.className = this.buildClassName();

        // Label
        if (this.options.label) {
            this.labelElement = document.createElement('label');
            this.labelElement.className = `${Input.BASE_INPUT_CLASS}-label`;
            this.labelElement.textContent = this.options.label;
            if (this.options.required) {
                this.labelElement.textContent += ' *';
            }
            this.element.appendChild(this.labelElement);
        }

        // Input field
        this.inputElement = document.createElement('input');
        this.inputElement.type = this.options.type;
        this.inputElement.className = `${Input.BASE_INPUT_CLASS}-field`;
        this.inputElement.value = this.options.value;
        this.inputElement.placeholder = this.options.placeholder;
        this.inputElement.disabled = this.options.disabled;
        this.inputElement.required = this.options.required;

        // Set number-specific attributes
        if (this.options.type === 'number') {
            if (this.options.min !== undefined) {
                this.inputElement.min = this.options.min;
            }
            if (this.options.max !== undefined) {
                this.inputElement.max = this.options.max;
            }
            if (this.options.step !== undefined) {
                this.inputElement.step = this.options.step;
            }
        }

        this.element.appendChild(this.inputElement);

        // Helper text
        if (this.options.helperText) {
            this.helperElement = document.createElement('span');
            this.helperElement.className = `${Input.BASE_INPUT_CLASS}-helper`;
            this.helperElement.textContent = this.options.helperText;
            this.element.appendChild(this.helperElement);
        }

        // Error message container (initially hidden)
        this.errorElement = document.createElement('span');
        this.errorElement.className = `${Input.BASE_INPUT_CLASS}-error`;
        this.errorElement.style.display = 'none';
        this.element.appendChild(this.errorElement);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.options.onInput) {
            this.inputElement.addEventListener('input', (e) => {
                this.validate();
                this.options.onInput(e, this);
            });
        } else {
            this.inputElement.addEventListener('input', () => {
                this.validate();
            });
        }

        if (this.options.onChange) {
            this.inputElement.addEventListener('change', (e) => {
                this.validate();
                this.options.onChange(e, this);
            });
        }

        if (this.options.onFocus) {
            this.inputElement.addEventListener('focus', (e) => {
                this.options.onFocus(e, this);
            });
        }

        if (this.options.onBlur) {
            this.inputElement.addEventListener('blur', (e) => {
                this.validate();
                this.options.onBlur(e, this);
            });
        }
    }

    /**
     * Build CSS class name
     */
    buildClassName() {
        const classes = [Input.BASE_INPUT_CLASS];
        
        if (this.options.theme && this.options.theme !== Input.THEMES.default) {
            classes.push(`${Input.BASE_INPUT_CLASS}--${this.options.theme}`);
        }
        
        if (this.options.size && this.options.size !== Input.SIZES.medium) {
            classes.push(`${Input.BASE_INPUT_CLASS}--${this.options.size}`);
        }
        
        if (this.options.className) {
            classes.push(this.options.className);
        }
        
        return classes.join(' ');
    }

    /**
     * Validate input value
     */
    validate() {
        this.isValid = true;
        this.errorMessage = '';

        // Required validation
        if (this.options.required && !this.inputElement.value.trim()) {
            this.isValid = false;
            this.errorMessage = 'This field is required';
        }

        // Custom validation
        if (this.isValid && this.options.validator) {
            const validationResult = this.options.validator(this.inputElement.value, this);
            if (validationResult !== true) {
                this.isValid = false;
                this.errorMessage = validationResult || 'Invalid value';
            }
        }

        // Update error display
        this.updateErrorDisplay();
        return this.isValid;
    }

    /**
     * Update error message display
     */
    updateErrorDisplay() {
        if (!this.isValid && this.errorMessage) {
            this.errorElement.textContent = this.errorMessage;
            this.errorElement.style.display = 'block';
            this.setTheme(Input.THEMES.danger);
        } else {
            this.errorElement.style.display = 'none';
            this.setTheme(this.options.theme);
        }
    }

    /**
     * Get current value
     */
    getValue() {
        return this.inputElement.value;
    }

    /**
     * Set value
     */
    setValue(value) {
        this.inputElement.value = value;
        this.validate();
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        // Remove existing theme classes
        Object.values(Input.THEMES).forEach(t => {
            if (t !== Input.THEMES.default) {
                this.element.classList.remove(`${Input.BASE_INPUT_CLASS}--${t}`);
            }
        });

        // Add new theme class
        if (theme && theme !== Input.THEMES.default) {
            this.element.classList.add(`${Input.BASE_INPUT_CLASS}--${theme}`);
        }
    }

    /**
     * Set disabled state
     */
    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.inputElement.disabled = disabled;
    }

    /**
     * Focus the input
     */
    focus() {
        this.inputElement.focus();
    }

    /**
     * Blur the input
     */
    blur() {
        this.inputElement.blur();
    }

    /**
     * Get the DOM element
     */
    getElement() {
        return this.element;
    }

    /**
     * Destroy the input and clean up
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default Input; 