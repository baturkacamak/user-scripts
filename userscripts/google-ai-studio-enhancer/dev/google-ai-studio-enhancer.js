// Import core components
import {
    Button,
    Checkbox,
    DOMObserver,
    HTMLUtils,
    Logger,
    Notification,
    StyleManager
} from "../../common/core";
import { getValue, setValue, GM_setClipboard } from "../../common/core/utils/GMFunctions";

// Configure logger
Logger.setPrefix("Google AI Studio Enhancer");
Logger.DEBUG = true;

/**
 * Google AI Studio Enhancer
 * Provides response copying and auto-run functionality for Google AI Studio
 * Uses DOM methods to bypass Trusted Types policy
 */
class AIStudioEnhancer {
    // Configuration
    static SELECTORS = {
        // Common selectors for AI responses
        RESPONSE_CONTAINERS: [
            // Google AI Studio specific (most accurate)
            '.chat-turn-container.model.render',
            '.chat-turn-container.model',
            // General selectors
            '[data-test-id="response-text"]',
            '.model-response',
            '.response-content',
            '[role="text"]',
            '.markdown-content',
            'div[data-message-author-role="model"]',
            'div[data-message-role="model"]',
            '[data-message-author-role="assistant"]',
            // More specific selectors for Google AI Studio
            '[data-testid="conversation-turn-content"]',
            '.conversation-turn-content',
            '[data-testid="model-response"]'
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
            'button[data-testid*="send"]',
            // More specific for Google AI Studio
            'button[data-testid="send-button"]',
            'button[aria-label*="send message"]'
        ],
        // Loading indicators
        LOADING_INDICATORS: [
            '.loading',
            '.spinner',
            '[data-test-id="loading"]',
            '.generating',
            '.thinking',
            '[aria-label*="loading"]',
            '[aria-label*="thinking"]',
            // Google AI Studio specific
            '[data-testid="loading"]',
            '.mdc-linear-progress'
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

        // Create the UI panel using DOM methods
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
     * Create the main UI panel using pure DOM methods
     */
    createPanel() {
        // Create main panel container
        this.panel = document.createElement('div');
        this.panel.className = 'ai-studio-enhancer-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #4285f4;
            color: white;
            padding: 12px 16px;
            border-radius: 8px 8px 0 0;
            font-weight: 600;
            cursor: move;
            user-select: none;
        `;
        header.textContent = '🤖 AI Studio Enhancer';

        // Create content container
        const content = document.createElement('div');
        content.style.padding = '16px';

        // Create sections
        this.createResponseSection(content);
        this.createAutoRunSection(content);
        this.createSettingsSection(content);

        // Assemble panel
        this.panel.appendChild(header);
        this.panel.appendChild(content);

        // Add to page
        document.body.appendChild(this.panel);

        // Make draggable
        this.makeDraggable(header);

        Logger.debug("Panel created using DOM methods");
    }

    /**
     * Create the response management section
     */
    createResponseSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        // Section title
        const title = document.createElement('h3');
        title.textContent = '📋 Response Management';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Response counter
        this.responseCountElement = document.createElement('div');
        this.responseCountElement.textContent = `Responses collected: ${this.responses.length}`;
        this.responseCountElement.style.cssText = 'margin-bottom: 10px; color: #666; font-size: 12px;';

        // Copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy All Responses';
        copyButton.style.cssText = `
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            width: 100%;
            margin-bottom: 8px;
        `;
        copyButton.addEventListener('click', () => this.copyAllResponses());

        // Clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Response History';
        clearButton.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            width: 100%;
        `;
        clearButton.addEventListener('click', () => this.clearResponses());

        section.appendChild(title);
        section.appendChild(this.responseCountElement);
        section.appendChild(copyButton);
        section.appendChild(clearButton);

        container.appendChild(section);
    }

    /**
     * Create the auto-run section
     */
    createAutoRunSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        // Section title
        const title = document.createElement('h3');
        title.textContent = '🔄 Auto Runner';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Iterations input
        this.iterationsInput = document.createElement('input');
        this.iterationsInput.type = 'number';
        this.iterationsInput.min = '1';
        this.iterationsInput.max = '100';
        this.iterationsInput.value = this.settings.DEFAULT_ITERATIONS;
        this.iterationsInput.placeholder = 'Number of iterations';
        this.iterationsInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 12px;
            box-sizing: border-box;
        `;

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 10px;';

        // Start button
        this.startButton = document.createElement('button');
        this.startButton.textContent = 'Start Auto Run';
        this.startButton.style.cssText = `
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            flex: 1;
        `;
        this.startButton.addEventListener('click', () => this.startAutoRun());

        // Stop button
        this.stopButton = document.createElement('button');
        this.stopButton.textContent = 'Stop';
        this.stopButton.disabled = true;
        this.stopButton.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            flex: 1;
        `;
        this.stopButton.addEventListener('click', () => this.stopAutoRun());

        buttonContainer.appendChild(this.startButton);
        buttonContainer.appendChild(this.stopButton);

        // Status display
        this.statusElement = document.createElement('div');
        this.statusElement.textContent = 'Ready to start';
        this.statusElement.style.cssText = 'font-size: 12px; color: #666; text-align: center;';

        section.appendChild(title);
        section.appendChild(this.iterationsInput);
        section.appendChild(buttonContainer);
        section.appendChild(this.statusElement);

        container.appendChild(section);
    }

    /**
     * Create the settings section
     */
    createSettingsSection(container) {
        const section = document.createElement('div');

        // Section title
        const title = document.createElement('h3');
        title.textContent = '⚙️ Settings';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Auto-copy checkbox
        const autoCopyContainer = document.createElement('label');
        autoCopyContainer.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px; cursor: pointer;';

        const autoCopyCheckbox = document.createElement('input');
        autoCopyCheckbox.type = 'checkbox';
        autoCopyCheckbox.checked = this.settings.AUTO_COPY_RESPONSES;
        autoCopyCheckbox.style.marginRight = '8px';
        autoCopyCheckbox.addEventListener('change', (e) => {
            this.settings.AUTO_COPY_RESPONSES = e.target.checked;
            this.saveSettings();
        });

        const autoCopyLabel = document.createElement('span');
        autoCopyLabel.textContent = 'Auto-copy new responses';

        autoCopyContainer.appendChild(autoCopyCheckbox);
        autoCopyContainer.appendChild(autoCopyLabel);

        // Notifications checkbox
        const notifContainer = document.createElement('label');
        notifContainer.style.cssText = 'display: flex; align-items: center; cursor: pointer;';

        const notifCheckbox = document.createElement('input');
        notifCheckbox.type = 'checkbox';
        notifCheckbox.checked = this.settings.SHOW_NOTIFICATIONS;
        notifCheckbox.style.marginRight = '8px';
        notifCheckbox.addEventListener('change', (e) => {
            this.settings.SHOW_NOTIFICATIONS = e.target.checked;
            this.saveSettings();
        });

        const notifLabel = document.createElement('span');
        notifLabel.textContent = 'Show notifications';

        notifContainer.appendChild(notifCheckbox);
        notifContainer.appendChild(notifLabel);

        section.appendChild(title);
        section.appendChild(autoCopyContainer);
        section.appendChild(notifContainer);

        container.appendChild(section);
    }

    /**
     * Make panel draggable
     */
    makeDraggable(header) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === header) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                this.panel.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        });

        document.addEventListener('mouseup', () => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        });
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
     * Clean response text by removing UI elements and metadata
     */
    cleanResponseText(text) {
        if (!text) return '';

        // Common UI elements to remove (case-insensitive)
        const uiElements = [
            'edit', 'more_vert', 'thumb_up', 'thumb_down', 'copy', 'share',
            'delete', 'refresh', 'restart', 'stop', 'play', 'pause',
            'expand_more', 'expand_less', 'close', 'menu', 'settings',
            'download', 'upload', 'save', 'favorite', 'star', 'bookmark',
            'like', 'dislike', 'report', 'flag', 'hide', 'show'
        ];

        // Split into lines and clean
        let lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => {
                // Remove empty lines
                if (!line) return false;
                
                // Remove lines that are just UI elements
                const lowerLine = line.toLowerCase();
                if (uiElements.includes(lowerLine)) return false;
                
                // Remove lines with only symbols/dashes
                if (/^[-=_\s]+$/.test(line)) return false;
                
                // Remove very short lines that are likely UI elements
                if (line.length <= 3 && !/\w/.test(line)) return false;
                
                return true;
            });

        // Remove common patterns at the beginning and end
        while (lines.length > 0 && this.isUILine(lines[0])) {
            lines.shift();
        }
        while (lines.length > 0 && this.isUILine(lines[lines.length - 1])) {
            lines.pop();
        }

        return lines.join('\n').trim();
    }

    /**
     * Check if a line is likely a UI element
     */
    isUILine(line) {
        const cleaned = line.toLowerCase().trim();
        
        // Common UI patterns
        const uiPatterns = [
            /^(edit|copy|share|delete|save|download)$/,
            /^(thumb_up|thumb_down|more_vert)$/,
            /^(expand_more|expand_less|close|menu)$/,
            /^[👍👎❤️⭐🔗📋✏️🗑️]+$/,  // Emoji-only lines
            /^[\s\-=_]{1,5}$/,          // Short separator lines
        ];

        return uiPatterns.some(pattern => pattern.test(cleaned));
    }

    /**
     * Extract clean text from response element
     */
    extractResponseText(element) {
        // Try to find more specific text content within the response container
        const textSelectors = [
            '.response-text',
            '.message-content',
            '.content',
            '.text-content',
            'p',
            'div.content',
            '[data-testid="message-text"]'
        ];

        // First, try to find specific text content elements
        for (const selector of textSelectors) {
            const textElement = element.querySelector(selector);
            if (textElement) {
                const text = textElement.innerText?.trim();
                if (text && text.length > 10) {
                    return this.cleanResponseText(text);
                }
            }
        }

        // If no specific text element found, use the container but clean it thoroughly
        const fullText = element.innerText?.trim();
        return this.cleanResponseText(fullText);
    }

    /**
     * Add a response to the collection
     */
    addResponse(element) {
        const text = this.extractResponseText(element);
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

        // Format responses - clean output without headers
        const content = this.responses.join('\n\n---\n\n');

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
        this.startButton.disabled = true;
        this.stopButton.disabled = false;
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
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
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
            // Simple notification using alert as fallback
            // Since Trusted Types might block advanced notifications too
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // You could also create a simple toast notification using DOM methods
            if (type === 'error') {
                alert(`Error: ${message}`);
            }
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