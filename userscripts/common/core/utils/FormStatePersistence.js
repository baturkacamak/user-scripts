import Debouncer from './Debouncer.js';
import HTMLUtils from './HTMLUtils.js';
import { DataCache } from './DataCache.js';
import Logger from './Logger.js';
import PubSub from './PubSub.js';
import Notification from '../ui/Notification.js';
import UserInteractionDetector from './UserInteractionDetector.js';
import PollingStrategy from './UrlChangeWatcher/strategies/PollingStrategy.js';

/**
 * FormStatePersistence - Generic form state persistence system
 * Automatically saves and restores form values using GM storage
 */
class FormStatePersistence {
    static EVENTS = {
        STATE_SAVED: 'formstate:state-saved',
        STATE_LOADED: 'formstate:state-loaded',
        STATE_CLEARED: 'formstate:state-cleared',
        FIELD_CHANGED: 'formstate:field-changed'
    };

    /**
     * @param {Object} options Configuration options
     * @param {string} options.namespace - Namespace for storage keys
     * @param {Object} options.fields - Field configurations {fieldName: {selector, type, defaultValue, validator}}
     * @param {Function} options.getValue - Function to get values from GM storage
     * @param {Function} options.setValue - Function to set values in GM storage
     * @param {boolean} options.autoSave - Whether to auto-save on change (default: true)
     * @param {number} options.debounceDelay - Debounce delay for auto-save (default: 500ms)
     * @param {Object} options.pubsub - Optional PubSub instance for events
     * @param {Object} options.logger - Optional logger instance
     * @param {string} options.name - Optional name for this persistence manager
     */
    constructor(options) {
        this.namespace = options.namespace || 'form-state';
        this.fields = options.fields || {};
        this.getValue = options.getValue;
        this.setValue = options.setValue;
        this.autoSave = options.autoSave !== false;
        this.debounceDelay = options.debounceDelay || 500;
        this.name = options.name || 'FormStatePersistence';
        
        // Optional user interaction detection for distinguishing user vs auto-save
        this.enableInteractionDetection = options.enableInteractionDetection || false;
        this.userInteraction = this.enableInteractionDetection ? 
            UserInteractionDetector.getInstance({
                namespace: `formstate-${this.name}`,
                debug: Logger.DEBUG
            }) : null;
            
        // Optional notifications
        this.enableNotifications = options.enableNotifications || false;
        
        // Optional periodic save using PollingStrategy
        this.enablePeriodicSave = options.enablePeriodicSave || false;
        this.periodicSaveInterval = options.periodicSaveInterval || 30000; // 30 seconds
        this.pollingStrategy = null;

        this.fieldElements = new Map();
        this.fieldValues = new Map();
        this.saveTimeouts = new Map();
        this.isInitialized = false;
        
        // Use core Debouncer for save operations
        this.debouncedSave = Debouncer.debounce(this.performSave.bind(this), this.debounceDelay);
        
        // Use DataCache for backup storage
        this.enableBackup = options.enableBackup || false;
        this.backupCache = this.enableBackup ? new DataCache(Logger) : null;

        // Import Debouncer if available
        this.Debouncer = options.Debouncer;
    }

    /**
     * Initialize the form state persistence
     */
    async initialize() {
        if (this.isInitialized) {
            Logger.warn(`[${this.name}] Already initialized`);
            return;
        }

        Logger.info(`[${this.name}] Initializing form state persistence with ${Object.keys(this.fields).length} fields`);

        // Find and cache field elements
        this.findFieldElements();

        // Load saved state
        await this.loadState();

        // Setup auto-save listeners
        if (this.autoSave) {
            this.setupAutoSave();
        }

        this.isInitialized = true;
        Logger.info(`[${this.name}] Form state persistence initialized`);
        
        // Start periodic save if enabled
        if (this.enablePeriodicSave) {
            this.pollingStrategy = new PollingStrategy(() => {
                this.saveState();
            }, this.periodicSaveInterval);
            this.pollingStrategy.start();
        }
        
        // Show initialization notification if enabled
        if (this.enableNotifications) {
            Notification.success(`Form state persistence initialized for ${Object.keys(this.fields).length} fields`, {
                duration: 3000,
                position: 'bottom-right'
            });
        }
    }

    /**
     * Find and cache field elements
     */
    findFieldElements() {
        for (const [fieldName, config] of Object.entries(this.fields)) {
            try {
                const element = document.querySelector(config.selector);
                if (element) {
                    this.fieldElements.set(fieldName, element);
                    Logger.debug(`[${this.name}] Found field element: ${fieldName}`);
                } else {
                    Logger.warn(`[${this.name}] Field element not found: ${fieldName} (${config.selector})`);
                }
            } catch (error) {
                Logger.error(`[${this.name}] Error finding field ${fieldName}:`, error);
            }
        }
    }

    /**
     * Load saved state from storage
     */
    async loadState() {
        if (!this.getValue) {
            Logger.warn(`[${this.name}] No getValue function provided, cannot load state`);
            return;
        }

        let loadedCount = 0;

        for (const [fieldName, config] of Object.entries(this.fields)) {
            try {
                const storageKey = this.getStorageKey(fieldName);
                const savedValue = await this.getValue(storageKey, config.defaultValue);
                
                if (savedValue !== null && savedValue !== undefined) {
                    this.fieldValues.set(fieldName, savedValue);
                    await this.setFieldValue(fieldName, savedValue);
                    loadedCount++;
                    Logger.debug(`[${this.name}] Loaded field ${fieldName}:`, savedValue);
                }
            } catch (error) {
                Logger.error(`[${this.name}] Error loading field ${fieldName}:`, error);
            }
        }

        Logger.info(`[${this.name}] Loaded ${loadedCount} field values from storage`);
        this.publishEvent(FormStatePersistence.EVENTS.STATE_LOADED, {
            loadedCount,
            totalFields: Object.keys(this.fields).length,
            name: this.name
        });
    }

    /**
     * Save current state to storage
     */
    async saveState() {
        if (!this.setValue) {
            Logger.warn(`[${this.name}] No setValue function provided, cannot save state`);
            return;
        }

        let savedCount = 0;

        for (const [fieldName, config] of Object.entries(this.fields)) {
            try {
                const currentValue = await this.getFieldValue(fieldName);
                
                if (currentValue !== null && currentValue !== undefined) {
                    // Validate value if validator provided
                    if (config.validator && !config.validator(currentValue)) {
                        Logger.warn(`[${this.name}] Validation failed for field ${fieldName}, not saving`);
                        continue;
                    }

                    const storageKey = this.getStorageKey(fieldName);
                    await this.setValue(storageKey, currentValue);
                    this.fieldValues.set(fieldName, currentValue);
                    savedCount++;
                    Logger.debug(`[${this.name}] Saved field ${fieldName}:`, currentValue);
                }
            } catch (error) {
                Logger.error(`[${this.name}] Error saving field ${fieldName}:`, error);
            }
        }

        Logger.info(`[${this.name}] Saved ${savedCount} field values to storage`);
        this.publishEvent(FormStatePersistence.EVENTS.STATE_SAVED, {
            savedCount,
            totalFields: Object.keys(this.fields).length,
            name: this.name
        });
    }

    /**
     * Get current value of a field
     */
    async getFieldValue(fieldName) {
        const element = this.fieldElements.get(fieldName);
        const config = this.fields[fieldName];
        
        if (!element || !config) {
            return null;
        }

        try {
            switch (config.type) {
                case 'text':
                case 'textarea':
                case 'number':
                case 'email':
                case 'url':
                    return element.value;
                
                case 'checkbox':
                    return element.checked;
                
                case 'radio':
                    const radioGroup = document.querySelectorAll(`[name="${element.name}"]`);
                    for (const radio of radioGroup) {
                        if (radio.checked) {
                            return radio.value;
                        }
                    }
                    return null;
                
                case 'select':
                    return element.value;
                
                case 'select-multiple':
                    return Array.from(element.selectedOptions).map(option => option.value);
                
                case 'contenteditable':
                    return element.textContent || element.innerText;
                
                default:
                    return element.value;
            }
        } catch (error) {
            Logger.error(`[${this.name}] Error getting value for field ${fieldName}:`, error);
            return null;
        }
    }

    /**
     * Set value of a field
     */
    async setFieldValue(fieldName, value) {
        const element = this.fieldElements.get(fieldName);
        const config = this.fields[fieldName];
        
        if (!element || !config) {
            return false;
        }

        try {
            switch (config.type) {
                case 'text':
                case 'textarea':
                case 'number':
                case 'email':
                case 'url':
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                
                case 'checkbox':
                    element.checked = Boolean(value);
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                
                case 'radio':
                    const radioGroup = document.querySelectorAll(`[name="${element.name}"]`);
                    for (const radio of radioGroup) {
                        if (radio.value === value) {
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                    break;
                
                case 'select':
                    element.value = value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                
                case 'select-multiple':
                    if (Array.isArray(value)) {
                        for (const option of element.options) {
                            option.selected = value.includes(option.value);
                        }
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    break;
                
                case 'contenteditable':
                    element.textContent = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    break;
                
                default:
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            return true;
        } catch (error) {
            Logger.error(`[${this.name}] Error setting value for field ${fieldName}:`, error);
            return false;
        }
    }

    /**
     * Setup auto-save listeners
     */
    setupAutoSave() {
        for (const [fieldName, config] of Object.entries(this.fields)) {
            const element = this.fieldElements.get(fieldName);
            if (!element) continue;

            const eventTypes = this.getFieldEventTypes(config.type);
            
            for (const eventType of eventTypes) {
                element.addEventListener(eventType, () => {
                    this.scheduleFieldSave(fieldName);
                });
            }
        }

        Logger.debug(`[${this.name}] Auto-save listeners setup complete`);
    }

    /**
     * Get appropriate event types for field type
     */
    getFieldEventTypes(fieldType) {
        switch (fieldType) {
            case 'text':
            case 'textarea':
            case 'number':
            case 'email':
            case 'url':
            case 'contenteditable':
                return ['input', 'blur'];
            
            case 'checkbox':
            case 'radio':
            case 'select':
            case 'select-multiple':
                return ['change'];
            
            default:
                return ['input', 'change'];
        }
    }

    /**
     * Schedule debounced save for a specific field using core Debouncer
     */
    scheduleFieldSave(fieldName) {
        // Use the debounced save function
        this.debouncedSave();
    }

    /**
     * Perform the actual save operation (used by debouncer)
     */
    async performSave() {
        await this.saveState();
        
        // Create backup if enabled
        if (this.enableBackup && this.backupCache) {
            const currentValues = this.getCurrentValues();
            this.backupCache.set(`${this.namespace}-backup`, currentValues, 30); // 30 days
        }
    }

    /**
     * Wait for form elements using HTMLUtils
     */
    async waitForFormElements(timeout = 5000) {
        const foundElements = new Map();
        
        for (const [fieldName, config] of Object.entries(this.fields)) {
            try {
                const element = await HTMLUtils.waitForElement(config.selector, timeout);
                if (element) {
                    foundElements.set(fieldName, element);
                    Logger.debug(`[${this.name}] Found form element: ${fieldName}`);
                }
            } catch (error) {
                Logger.warn(`[${this.name}] Form element not found: ${fieldName} (${config.selector})`);
            }
        }
        
        return foundElements;
    }

    /**
     * Restore from backup using DataCache
     */
    async restoreFromBackup() {
        if (!this.enableBackup || !this.backupCache) {
            return false;
        }
        
        try {
            const backup = this.backupCache.get(`${this.namespace}-backup`);
            if (backup) {
                for (const [fieldName, value] of Object.entries(backup)) {
                    if (this.fields[fieldName]) {
                        await this.setFieldValue(fieldName, value);
                        this.fieldValues.set(fieldName, value);
                    }
                }
                Logger.info(`[${this.name}] Restored form data from backup`);
                return true;
            }
        } catch (error) {
            Logger.error(`[${this.name}] Error restoring from backup:`, error);
        }
        
        return false;
    }

    /**
     * Save a specific field
     */
    async saveField(fieldName) {
        if (!this.setValue) {
            return;
        }

        try {
            const currentValue = await this.getFieldValue(fieldName);
            const config = this.fields[fieldName];
            
            if (currentValue !== null && currentValue !== undefined) {
                // Validate value if validator provided
                if (config.validator && !config.validator(currentValue)) {
                    Logger.warn(`[${this.name}] Validation failed for field ${fieldName}, not saving`);
                    return;
                }

                const storageKey = this.getStorageKey(fieldName);
                await this.setValue(storageKey, currentValue);
                this.fieldValues.set(fieldName, currentValue);
                
                Logger.debug(`[${this.name}] Auto-saved field ${fieldName}:`, currentValue);
                this.publishEvent(FormStatePersistence.EVENTS.FIELD_CHANGED, {
                    fieldName,
                    value: currentValue,
                    name: this.name
                });
            }
        } catch (error) {
            Logger.error(`[${this.name}] Error auto-saving field ${fieldName}:`, error);
        }
    }

    /**
     * Clear saved state for all fields
     */
    async clearState() {
        if (!this.setValue) {
            Logger.warn(`[${this.name}] No setValue function provided, cannot clear state`);
            return;
        }

        let clearedCount = 0;

        for (const fieldName of Object.keys(this.fields)) {
            try {
                const storageKey = this.getStorageKey(fieldName);
                await this.setValue(storageKey, null);
                this.fieldValues.delete(fieldName);
                clearedCount++;
            } catch (error) {
                Logger.error(`[${this.name}] Error clearing field ${fieldName}:`, error);
            }
        }

        Logger.info(`[${this.name}] Cleared ${clearedCount} field values from storage`);
        this.publishEvent(FormStatePersistence.EVENTS.STATE_CLEARED, {
            clearedCount,
            name: this.name
        });
    }

    /**
     * Get storage key for a field
     */
    getStorageKey(fieldName) {
        return `${this.namespace}-${fieldName}`;
    }

    /**
     * Add a new field to persistence
     */
    addField(fieldName, config) {
        this.fields[fieldName] = config;
        
        // Find the element
        try {
            const element = document.querySelector(config.selector);
            if (element) {
                this.fieldElements.set(fieldName, element);
                
                // Setup auto-save if enabled
                if (this.autoSave) {
                    const eventTypes = this.getFieldEventTypes(config.type);
                    for (const eventType of eventTypes) {
                        element.addEventListener(eventType, () => {
                            this.scheduleFieldSave(fieldName);
                        });
                    }
                }
                
                Logger.debug(`[${this.name}] Added field: ${fieldName}`);
            }
        } catch (error) {
            Logger.error(`[${this.name}] Error adding field ${fieldName}:`, error);
        }
    }

    /**
     * Remove a field from persistence
     */
    removeField(fieldName) {
        delete this.fields[fieldName];
        this.fieldElements.delete(fieldName);
        this.fieldValues.delete(fieldName);
        
        // Clear any pending save
        if (this.saveTimeouts.has(fieldName)) {
            clearTimeout(this.saveTimeouts.get(fieldName));
            this.saveTimeouts.delete(fieldName);
        }
        
        Logger.debug(`[${this.name}] Removed field: ${fieldName}`);
    }

    /**
     * Get current field values
     */
    getCurrentValues() {
        const values = {};
        for (const fieldName of Object.keys(this.fields)) {
            values[fieldName] = this.fieldValues.get(fieldName);
        }
        return values;
    }

    /**
     * Publish event using core PubSub
     */
    publishEvent(eventName, data) {
        PubSub.publish(eventName, data);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Clear all pending timeouts
        for (const timeoutId of this.saveTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.saveTimeouts.clear();

        // Clear maps
        this.fieldElements.clear();
        this.fieldValues.clear();

        this.isInitialized = false;
        Logger.info(`[${this.name}] Form state persistence destroyed`);
    }
}

export default FormStatePersistence; 