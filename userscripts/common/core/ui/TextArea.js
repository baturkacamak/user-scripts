/**
 * TextArea - A reusable textarea component with theming and validation
 * Provides consistent styling and behavior across userscripts
 */
import StyleManager from '../utils/StyleManager.js';

class TextArea {
    static BASE_TEXTAREA_CLASS = 'userscript-textarea';
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
     * Initialize default styles for TextArea components
     */
    static initStyles() {
        if (StyleManager.hasStyles('textarea-component')) {
            return;
        }

        const styles = `
            .${TextArea.BASE_TEXTAREA_CLASS} {
                position: relative;
                display: inline-block;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}-field {
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
                resize: vertical;
                font-family: inherit;
                line-height: 1.4;
                min-height: 80px;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
            }

            .${TextArea.BASE_TEXTAREA_CLASS}-field:disabled {
                background: #f0f0f0;
                color: #888;
                cursor: not-allowed;
                resize: none;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}-field::placeholder {
                color: #222;
                opacity: 0.7;
            }

            /* Themes */
            .${TextArea.BASE_TEXTAREA_CLASS}--primary .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--success .${TextArea.BASE_TEXTAREA_CLASS}-field {
                border-color: #28a745;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--success .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                border-color: #28a745;
                box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--warning .${TextArea.BASE_TEXTAREA_CLASS}-field {
                border-color: #ffc107;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--warning .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                border-color: #ffc107;
                box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--danger .${TextArea.BASE_TEXTAREA_CLASS}-field {
                border-color: #dc3545;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--danger .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                border-color: #dc3545;
                box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
            }

            /* Sizes */
            .${TextArea.BASE_TEXTAREA_CLASS}--small .${TextArea.BASE_TEXTAREA_CLASS}-field {
                padding: 6px 10px;
                font-size: 12px;
                min-height: 60px;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}--large .${TextArea.BASE_TEXTAREA_CLASS}-field {
                padding: 12px 16px;
                font-size: 16px;
                min-height: 120px;
            }

            /* Label */
            .${TextArea.BASE_TEXTAREA_CLASS}-label {
                display: block;
                margin-bottom: 4px;
                font-size: 13px;
                font-weight: 500;
                color: #333;
            }

            /* Error message */
            .${TextArea.BASE_TEXTAREA_CLASS}-error {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #dc3545;
            }

            /* Helper text */
            .${TextArea.BASE_TEXTAREA_CLASS}-helper {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #666;
            }

            /* Character counter */
            .${TextArea.BASE_TEXTAREA_CLASS}-counter {
                display: block;
                margin-top: 4px;
                font-size: 11px;
                color: #999;
                text-align: right;
            }

            .${TextArea.BASE_TEXTAREA_CLASS}-counter--limit-reached {
                color: #dc3545;
            }

            /* Dark theme */
            @media (prefers-color-scheme: dark) {
                .${TextArea.BASE_TEXTAREA_CLASS}-field {
                    background: #2d2d2d;
                    color: #e0e0e0;
                    border-color: #555;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                    border-color: #4285f4;
                    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-field:disabled {
                    background: #444;
                    color: #888;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-field::placeholder {
                    color: #e0e0e0;
                    opacity: 0.5;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-label {
                    color: #e0e0e0;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-helper {
                    color: #aaa;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}-counter {
                    color: #aaa;
                }

                /* Themes in dark mode */
                .${TextArea.BASE_TEXTAREA_CLASS}--primary .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                    border-color: #4285f4;
                    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--success .${TextArea.BASE_TEXTAREA_CLASS}-field {
                    background: #2d2d2d;
                    border-color: #28a745;
                    color: #e0e0e0;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--success .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.3);
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--warning .${TextArea.BASE_TEXTAREA_CLASS}-field {
                    background: #2d2d2d;
                    border-color: #ffc107;
                    color: #e0e0e0;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--warning .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--danger .${TextArea.BASE_TEXTAREA_CLASS}-field {
                    background: #2d2d2d;
                    border-color: #dc3545;
                    color: #e0e0e0;
                }

                .${TextArea.BASE_TEXTAREA_CLASS}--danger .${TextArea.BASE_TEXTAREA_CLASS}-field:focus {
                    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.3);
                }
            }
        `;

        StyleManager.addStyles(styles, 'textarea-component');
    }

    /**
     * Use default color scheme
     */
    static useDefaultColors() {
        // Colors are already defined in initStyles
        // This method exists for API consistency with other components
    }

    /**
     * Create a new TextArea instance
     * @param {Object} options - Configuration options
     * @param {string} [options.value=''] - Initial value
     * @param {string} [options.placeholder=''] - Placeholder text
     * @param {string} [options.label=''] - Label text
     * @param {string} [options.helperText=''] - Helper text
     * @param {string} [options.theme='default'] - Theme (default, primary, success, warning, danger)
     * @param {string} [options.size='medium'] - Size (small, medium, large)
     * @param {boolean} [options.disabled=false] - Whether textarea is disabled
     * @param {boolean} [options.required=false] - Whether textarea is required
     * @param {number} [options.rows] - Number of rows
     * @param {number} [options.cols] - Number of columns
     * @param {number} [options.maxLength] - Maximum character length
     * @param {boolean} [options.showCounter=false] - Show character counter
     * @param {boolean} [options.autoResize=false] - Auto-resize to content
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
            value: '',
            placeholder: '',
            label: '',
            helperText: '',
            theme: TextArea.THEMES.default,
            size: TextArea.SIZES.medium,
            disabled: false,
            required: false,
            rows: null,
            cols: null,
            maxLength: null,
            showCounter: false,
            autoResize: false,
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
     * Create the textarea element structure
     */
    createElement() {
        // Main container
        this.element = document.createElement('div');
        this.element.className = this.buildClassName();

        // Label
        if (this.options.label) {
            this.labelElement = document.createElement('label');
            this.labelElement.className = `${TextArea.BASE_TEXTAREA_CLASS}-label`;
            this.labelElement.textContent = this.options.label;
            if (this.options.required) {
                this.labelElement.textContent += ' *';
            }
            this.element.appendChild(this.labelElement);
        }

        // TextArea field
        this.textareaElement = document.createElement('textarea');
        this.textareaElement.className = `${TextArea.BASE_TEXTAREA_CLASS}-field`;
        this.textareaElement.value = this.options.value;
        this.textareaElement.placeholder = this.options.placeholder;
        this.textareaElement.disabled = this.options.disabled;
        this.textareaElement.required = this.options.required;

        // Set rows and cols if specified
        if (this.options.rows) {
            this.textareaElement.rows = this.options.rows;
        }
        if (this.options.cols) {
            this.textareaElement.cols = this.options.cols;
        }
        if (this.options.maxLength) {
            this.textareaElement.maxLength = this.options.maxLength;
        }

        this.element.appendChild(this.textareaElement);

        // Helper text
        if (this.options.helperText) {
            this.helperElement = document.createElement('span');
            this.helperElement.className = `${TextArea.BASE_TEXTAREA_CLASS}-helper`;
            this.helperElement.textContent = this.options.helperText;
            this.element.appendChild(this.helperElement);
        }

        // Character counter
        if (this.options.showCounter || this.options.maxLength) {
            this.counterElement = document.createElement('span');
            this.counterElement.className = `${TextArea.BASE_TEXTAREA_CLASS}-counter`;
            this.updateCounter();
            this.element.appendChild(this.counterElement);
        }

        // Error message container (initially hidden)
        this.errorElement = document.createElement('span');
        this.errorElement.className = `${TextArea.BASE_TEXTAREA_CLASS}-error`;
        this.errorElement.style.display = 'none';
        this.element.appendChild(this.errorElement);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.options.onInput) {
            this.textareaElement.addEventListener('input', (e) => {
                this.handleInput();
                this.options.onInput(e, this);
            });
        } else {
            this.textareaElement.addEventListener('input', () => {
                this.handleInput();
            });
        }

        if (this.options.onChange) {
            this.textareaElement.addEventListener('change', (e) => {
                this.validate();
                this.options.onChange(e, this);
            });
        }

        if (this.options.onFocus) {
            this.textareaElement.addEventListener('focus', (e) => {
                this.options.onFocus(e, this);
            });
        }

        if (this.options.onBlur) {
            this.textareaElement.addEventListener('blur', (e) => {
                this.validate();
                this.options.onBlur(e, this);
            });
        }

        // Auto-resize functionality
        if (this.options.autoResize) {
            this.textareaElement.addEventListener('input', () => {
                this.autoResize();
            });
        }
    }

    /**
     * Handle input events
     */
    handleInput() {
        this.updateCounter();
        this.validate();
        
        if (this.options.autoResize) {
            this.autoResize();
        }
    }

    /**
     * Auto-resize textarea to content
     */
    autoResize() {
        this.textareaElement.style.height = 'auto';
        this.textareaElement.style.height = this.textareaElement.scrollHeight + 'px';
    }

    /**
     * Update character counter
     */
    updateCounter() {
        if (!this.counterElement) return;

        const currentLength = this.textareaElement.value.length;
        let counterText = `${currentLength}`;

        if (this.options.maxLength) {
            counterText += ` / ${this.options.maxLength}`;
            
            // Update counter styling based on limit
            if (currentLength >= this.options.maxLength) {
                this.counterElement.classList.add(`${TextArea.BASE_TEXTAREA_CLASS}-counter--limit-reached`);
            } else {
                this.counterElement.classList.remove(`${TextArea.BASE_TEXTAREA_CLASS}-counter--limit-reached`);
            }
        }

        this.counterElement.textContent = counterText;
    }

    /**
     * Build CSS class name
     */
    buildClassName() {
        const classes = [TextArea.BASE_TEXTAREA_CLASS];
        
        if (this.options.theme && this.options.theme !== TextArea.THEMES.default) {
            classes.push(`${TextArea.BASE_TEXTAREA_CLASS}--${this.options.theme}`);
        }
        
        if (this.options.size && this.options.size !== TextArea.SIZES.medium) {
            classes.push(`${TextArea.BASE_TEXTAREA_CLASS}--${this.options.size}`);
        }
        
        if (this.options.className) {
            classes.push(this.options.className);
        }
        
        return classes.join(' ');
    }

    /**
     * Validate textarea value
     */
    validate() {
        this.isValid = true;
        this.errorMessage = '';

        // Required validation
        if (this.options.required && !this.textareaElement.value.trim()) {
            this.isValid = false;
            this.errorMessage = 'This field is required';
        }

        // Max length validation
        if (this.isValid && this.options.maxLength && this.textareaElement.value.length > this.options.maxLength) {
            this.isValid = false;
            this.errorMessage = `Text must not exceed ${this.options.maxLength} characters`;
        }

        // Custom validation
        if (this.isValid && this.options.validator) {
            const validationResult = this.options.validator(this.textareaElement.value, this);
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
            this.setTheme(TextArea.THEMES.danger);
        } else {
            this.errorElement.style.display = 'none';
            this.setTheme(this.options.theme);
        }
    }

    /**
     * Get current value
     */
    getValue() {
        return this.textareaElement.value;
    }

    /**
     * Set value
     */
    setValue(value) {
        this.textareaElement.value = value;
        this.updateCounter();
        this.validate();
        
        if (this.options.autoResize) {
            this.autoResize();
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        // Remove existing theme classes
        Object.values(TextArea.THEMES).forEach(t => {
            if (t !== TextArea.THEMES.default) {
                this.element.classList.remove(`${TextArea.BASE_TEXTAREA_CLASS}--${t}`);
            }
        });

        // Add new theme class
        if (theme && theme !== TextArea.THEMES.default) {
            this.element.classList.add(`${TextArea.BASE_TEXTAREA_CLASS}--${theme}`);
        }
    }

    /**
     * Set disabled state
     */
    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.textareaElement.disabled = disabled;
    }

    /**
     * Focus the textarea
     */
    focus() {
        this.textareaElement.focus();
    }

    /**
     * Blur the textarea
     */
    blur() {
        this.textareaElement.blur();
    }

    /**
     * Get the DOM element
     */
    getElement() {
        return this.element;
    }

    /**
     * Destroy the textarea and clean up
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default TextArea; 