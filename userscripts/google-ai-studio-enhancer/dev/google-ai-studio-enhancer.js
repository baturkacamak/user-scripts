// Import core components
import {
    Button,
    Checkbox,
    DOMObserver,
    HTMLUtils,
    Logger,
    Notification,
    SidebarPanel,
    StyleManager
} from "../../common/core";
import { getValue, setValue, GM_setClipboard } from "../../common/core/utils/GMFunctions";

// Configure logger
Logger.setPrefix("Google AI Studio Enhancer");
Logger.DEBUG = true;

/**
 * Google AI Studio Enhancer
 * Provides response copying and auto-run functionality for Google AI Studio
 */
class AIStudioEnhancer {
    // Configuration
    static SELECTORS = {
        // Common selectors for AI responses
        RESPONSE_CONTAINERS: [
            '[data-test-id="response-text"]',
            '.model-response',
            '.response-content',
            '[role="text"]',
            '.markdown-content',
            'div[data-message-author-role="model"]',
            'div[data-message-role="model"]',
            '[data-message-author-role="assistant"]'
        ],
        // Common selectors for run buttons
        RUN_BUTTONS: [
            'button[aria-label*="Run"]',
            'button[title*="Run"]',
            '[data-test-id="run-button"]',
            '.run-button',
            'button[data-testid*="run"]',
            'button[aria-label*="Send"]',
            'button[title*="Send"]',
            'button[data-testid*="send"]'
        ],
        // Loading indicators
        LOADING_INDICATORS: [
            '.loading',
            '.spinner',
            '[data-test-id="loading"]',
            '.generating',
            '.thinking',
            '[aria-label*="loading"]',
            '[aria-label*="thinking"]'
        ]
    };

    static SETTINGS_KEYS = {
        AUTO_COPY_RESPONSES: 'gaise-auto-copy-responses',
        DEFAULT_ITERATIONS: 'gaise-default-iterations',
        AUTO_RUN_DELAY: 'gaise-auto-run-delay',
        SHOW_NOTIFICATIONS: 'gaise-show-notifications',
        PANEL_POSITION: 'gaise-panel-position'
    };

    static DEFAULT_SETTINGS = {
        AUTO_COPY_RESPONSES: false,
        DEFAULT_ITERATIONS: 10,
        AUTO_RUN_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 }
    };

    /**
     * Initialize the enhancer
     */
    constructor() {
        this.responses = [];
        this.isAutoRunning = false;
        this.currentIteration = 0;
        this.maxIterations = 0;
        this.responseObserver = null;
        this.settings = { ...AIStudioEnhancer.DEFAULT_SETTINGS };
        this.panel = null;

        Logger.info("Initializing Google AI Studio Enhancer");

        // Load saved settings
        this.loadSettings().then(() => {
            // Initialize components
            this.init();
        });
    }

    /**
     * Load saved settings from GM storage
     */
    async loadSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(AIStudioEnhancer.SETTINGS_KEYS)) {
                const savedValue = await getValue(storageKey, null);
                if (savedValue !== null) {
                    this.settings[settingName] = savedValue;
                }
            }
            Logger.debug("Settings loaded", this.settings);
        } catch (error) {
            Logger.error("Error loading settings:", error);
        }
    }

    /**
     * Save settings to GM storage
     */
    async saveSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(AIStudioEnhancer.SETTINGS_KEYS)) {
                await setValue(storageKey, this.settings[settingName]);
            }
            Logger.debug("Settings saved", this.settings);
        } catch (error) {
            Logger.error("Error saving settings:", error);
        }
    }

    /**
     * Initialize the enhancer
     */
    async init() {
        // Wait for page to be ready
        await this.waitForPageReady();

        // Create the UI panel
        this.createPanel();

        // Setup response monitoring
        this.setupResponseMonitoring();

        // Collect existing responses
        this.collectExistingResponses();

        Logger.success("Google AI Studio Enhancer initialized successfully!");
    }

    /**
     * Wait for the page to be ready
     */
    waitForPageReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                setTimeout(resolve, 1000);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(resolve, 1000);
                });
            }
        });
    }

    /**
     * Create the main UI panel
     */
    createPanel() {
        this.panel = new SidebarPanel({
            title: '🤖 AI Studio Enhancer',
            position: this.settings.PANEL_POSITION,
            draggable: true,
            collapsible: true,
            width: 320,
            onPositionChange: (position) => {
                this.settings.PANEL_POSITION = position;
                this.saveSettings();
            }
        });

        this.createResponseSection();
        this.createAutoRunSection();
        this.createSettingsSection();

        this.panel.show();
    }

    /**
     * Create the response management section
     */
    createResponseSection() {
        const section = this.panel.addSection('📋 Response Management');

        // Response counter
        this.responseCountElement = HTMLUtils.createElement('div', {
            className: 'response-counter',
            textContent: `Responses collected: ${this.responses.length}`
        });
        section.appendChild(this.responseCountElement);

        // Copy all responses button
        const copyButton = new Button({
            text: 'Copy All Responses',
            icon: '📋',
            onClick: () => this.copyAllResponses(),
            variant: 'primary',
            fullWidth: true
        });
        section.appendChild(copyButton.element);

        // Clear responses button
        const clearButton = new Button({
            text: 'Clear Response History',
            icon: '🗑️',
            onClick: () => this.clearResponses(),
            variant: 'secondary',
            fullWidth: true
        });
        section.appendChild(clearButton.element);
    }

    /**
     * Create the auto-run section
     */
    createAutoRunSection() {
        const section = this.panel.addSection('🔄 Auto Runner');

        // Iterations input
        this.iterationsInput = HTMLUtils.createElement('input', {
            type: 'number',
            min: 1,
            max: 100,
            value: this.settings.DEFAULT_ITERATIONS,
            placeholder: 'Number of iterations',
            style: { width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }
        });
        section.appendChild(this.iterationsInput);

        // Button container
        const buttonContainer = HTMLUtils.createElement('div', {
            style: { display: 'flex', gap: '10px', marginBottom: '10px' }
        });

        // Start button
        this.startButton = new Button({
            text: 'Start Auto Run',
            icon: '▶️',
            onClick: () => this.startAutoRun(),
            variant: 'primary'
        });
        buttonContainer.appendChild(this.startButton.element);

        // Stop button
        this.stopButton = new Button({
            text: 'Stop',
            icon: '⏹️',
            onClick: () => this.stopAutoRun(),
            variant: 'danger',
            disabled: true
        });
        buttonContainer.appendChild(this.stopButton.element);

        section.appendChild(buttonContainer);

        // Status display
        this.statusElement = HTMLUtils.createElement('div', {
            className: 'auto-run-status',
            textContent: 'Ready to start',
            style: { fontSize: '12px', color: '#666', textAlign: 'center' }
        });
        section.appendChild(this.statusElement);
    }

    /**
     * Create the settings section
     */
    createSettingsSection() {
        const section = this.panel.addSection('⚙️ Settings');

        // Auto-copy responses setting
        const autoCopyCheckbox = new Checkbox({
            label: 'Auto-copy new responses',
            checked: this.settings.AUTO_COPY_RESPONSES,
            onChange: (checked) => {
                this.settings.AUTO_COPY_RESPONSES = checked;
                this.saveSettings();
            }
        });
        section.appendChild(autoCopyCheckbox.element);

        // Show notifications setting
        const notificationsCheckbox = new Checkbox({
            label: 'Show notifications',
            checked: this.settings.SHOW_NOTIFICATIONS,
            onChange: (checked) => {
                this.settings.SHOW_NOTIFICATIONS = checked;
                this.saveSettings();
            }
        });
        section.appendChild(notificationsCheckbox.element);
    }

    /**
     * Setup response monitoring using DOM observer
     */
    setupResponseMonitoring() {
        this.responseObserver = new DOMObserver((mutations) => {
            this.handleDOMChanges(mutations);
        });

        this.responseObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        Logger.debug("Response monitoring setup complete");
    }

    /**
     * Handle DOM changes to detect new responses
     */
    handleDOMChanges(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.scanForNewResponses(node);
                    }
                }
            }
        }
    }

    /**
     * Scan element for new AI responses
     */
    scanForNewResponses(element) {
        AIStudioEnhancer.SELECTORS.RESPONSE_CONTAINERS.forEach(selector => {
            // Check if the element itself matches
            if (element.matches && element.matches(selector)) {
                this.addResponse(element);
            }
            // Check children
            if (element.querySelectorAll) {
                element.querySelectorAll(selector).forEach(el => {
                    this.addResponse(el);
                });
            }
        });
    }

    /**
     * Collect existing responses on page
     */
    collectExistingResponses() {
        AIStudioEnhancer.SELECTORS.RESPONSE_CONTAINERS.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                this.addResponse(element);
            });
        });

        Logger.info(`Collected ${this.responses.length} existing responses`);
        this.updateResponseCount();
    }

    /**
     * Add a response to the collection
     */
    addResponse(element) {
        const text = element.innerText?.trim();
        if (text && text.length > 10 && !this.responses.includes(text)) {
            this.responses.push(text);
            this.updateResponseCount();
            
            if (this.settings.AUTO_COPY_RESPONSES) {
                this.copyAllResponses();
            }

            Logger.debug('New response added:', text.substring(0, 100) + '...');
        }
    }

    /**
     * Update response counter display
     */
    updateResponseCount() {
        if (this.responseCountElement) {
            this.responseCountElement.textContent = `Responses collected: ${this.responses.length}`;
        }
    }

    /**
     * Copy all responses to clipboard
     */
    async copyAllResponses() {
        if (this.responses.length === 0) {
            this.showNotification('No responses found to copy', 'warning');
            return false;
        }

        const content = this.responses.map((response, index) => {
            return `=== Response ${index + 1} ===\n${response}\n`;
        }).join('\n');

        try {
            GM_setClipboard(content);
            this.showNotification(`Copied ${this.responses.length} responses to clipboard`, 'success');
            Logger.success(`Copied ${this.responses.length} responses to clipboard`);
            return true;
        } catch (error) {
            this.showNotification('Failed to copy responses', 'error');
            Logger.error('Failed to copy responses:', error);
            return false;
        }
    }

    /**
     * Clear all collected responses
     */
    clearResponses() {
        this.responses = [];
        this.updateResponseCount();
        this.showNotification('Response history cleared', 'info');
        Logger.info('Response history cleared');
    }

    /**
     * Start auto-run process
     */
    async startAutoRun() {
        if (this.isAutoRunning) {
            this.showNotification('Auto runner is already running', 'warning');
            return false;
        }

        const iterations = parseInt(this.iterationsInput.value, 10);
        if (isNaN(iterations) || iterations <= 0) {
            this.showNotification('Please enter a valid number of iterations', 'error');
            return false;
        }

        this.isAutoRunning = true;
        this.currentIteration = 0;
        this.maxIterations = iterations;

        // Update UI
        this.startButton.setDisabled(true);
        this.stopButton.setDisabled(false);
        this.updateAutoRunStatus();

        this.showNotification(`Starting auto runner for ${iterations} iterations`, 'info');
        Logger.info(`Starting auto runner for ${iterations} iterations`);

        await this.runIteration();
        return true;
    }

    /**
     * Stop auto-run process
     */
    stopAutoRun() {
        this.isAutoRunning = false;
        
        // Update UI
        this.startButton.setDisabled(false);
        this.stopButton.setDisabled(true);
        this.updateAutoRunStatus();

        this.showNotification(`Auto runner stopped at ${this.currentIteration}/${this.maxIterations}`, 'info');
        Logger.info(`Auto runner stopped. Completed ${this.currentIteration}/${this.maxIterations} iterations`);
    }

    /**
     * Run a single iteration
     */
    async runIteration() {
        if (!this.isAutoRunning || this.currentIteration >= this.maxIterations) {
            this.stopAutoRun();
            return;
        }

        this.currentIteration++;
        this.updateAutoRunStatus();
        Logger.info(`Running iteration ${this.currentIteration}/${this.maxIterations}`);

        const runButton = this.findRunButton();
        if (!runButton) {
            this.showNotification('Run button not found', 'error');
            this.stopAutoRun();
            return;
        }

        // Click the run button
        runButton.click();
        Logger.debug('Run button clicked');

        // Wait for response completion
        await this.waitForResponseCompletion();

        // Wait before next iteration
        setTimeout(() => {
            this.runIteration();
        }, this.settings.AUTO_RUN_DELAY);
    }

    /**
     * Find the run button on the page
     */
    findRunButton() {
        // Try specific selectors first
        for (const selector of AIStudioEnhancer.SELECTORS.RUN_BUTTONS) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
                return button;
            }
        }

        // Fallback: search by text content
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
            const text = button.textContent?.toLowerCase().trim();
            if ((text === 'run' || text === 'send' || text.includes('run') || text.includes('send')) && !button.disabled) {
                return button;
            }
        }

        return null;
    }

    /**
     * Wait for response completion
     */
    async waitForResponseCompletion() {
        return new Promise((resolve) => {
            let checks = 0;
            const maxChecks = 120; // 2 minutes timeout

            const checkCompletion = () => {
                checks++;

                // Check for loading indicators
                const isLoading = AIStudioEnhancer.SELECTORS.LOADING_INDICATORS.some(selector =>
                    document.querySelector(selector) !== null
                );

                // Check if run button is disabled
                const runButton = this.findRunButton();
                const isProcessing = runButton?.disabled;

                if (!isLoading && !isProcessing) {
                    Logger.debug('Response completion detected');
                    resolve();
                    return;
                }

                if (checks >= maxChecks) {
                    Logger.warn('Response completion timeout');
                    resolve();
                    return;
                }

                setTimeout(checkCompletion, 1000);
            };

            setTimeout(checkCompletion, 2000); // Initial delay
        });
    }

    /**
     * Update auto-run status display
     */
    updateAutoRunStatus() {
        if (this.statusElement) {
            if (this.isAutoRunning) {
                this.statusElement.textContent = `Running: ${this.currentIteration}/${this.maxIterations}`;
            } else {
                if (this.currentIteration > 0) {
                    this.statusElement.textContent = `Completed: ${this.currentIteration}/${this.maxIterations}`;
                } else {
                    this.statusElement.textContent = 'Ready to start';
                }
            }
        }
    }

    /**
     * Show notification if enabled
     */
    showNotification(message, type = 'info') {
        if (this.settings.SHOW_NOTIFICATIONS) {
            Notification.show(message, {
                type: type,
                duration: 3000,
                position: 'top-right'
            });
        }
    }
}

/**
 * Initialize the enhancer when the page is ready
 */
function init() {
    Logger.info("Starting Google AI Studio Enhancer initialization");
    
    // Check if we're on the correct page
    if (window.location.hostname !== 'aistudio.google.com') {
        Logger.warn("Not on Google AI Studio, script will not run");
        return;
    }

    new AIStudioEnhancer();
}

// Start initialization
init(); 