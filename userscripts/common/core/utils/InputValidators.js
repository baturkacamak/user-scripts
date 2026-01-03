/**
 * InputValidators - Factory functions for common input validation patterns
 * Provides reusable validators for Input components and other form elements
 */

class InputValidators {
    /**
     * Create a number validator function
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {string} minMessage - Message for values below min
     * @param {string} maxMessage - Message for values above max
     * @param {boolean} isFloat - Whether to parse as float (default false, parse as int)
     * @returns {Function} Validator function that returns true if valid, or error message string if invalid
     */
    static createNumberValidator(min, max, minMessage = null, maxMessage = null, isFloat = false) {
        return (value) => {
            const num = isFloat ? parseFloat(value) : parseInt(value, 10);
            if (isNaN(num) || num < min) {
                return minMessage || `Please enter a number >= ${min}`;
            }
            if (num > max) {
                return maxMessage || `Maximum ${max}`;
            }
            return true;
        };
    }
}

export default InputValidators;
