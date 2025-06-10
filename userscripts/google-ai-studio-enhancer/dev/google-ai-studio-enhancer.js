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
            // Google AI Studio specific (most accurate)
            'button.run-button[aria-label="Run"]:not(.disabled):not([disabled])',
            'button.run-button[aria-label="Run"]',
            '.run-button:not(.disabled):not([disabled])',
            // General selectors
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
        // Common selectors for prompt input
        PROMPT_INPUTS: [
            // Google AI Studio specific (most accurate)
            'textarea.textarea.gmat-body-medium[placeholder*="Start typing a prompt"]',
            'textarea.textarea.gmat-body-medium',
            'textarea[aria-label*="Start typing a prompt"]',
            // General selectors
            'textarea[placeholder*="Enter a prompt"]',
            'textarea[placeholder*="Type a message"]',
            'textarea[placeholder*="Ask"]',
            'textarea[aria-label*="prompt"]',
            'textarea[aria-label*="message"]',
            'div[contenteditable="true"]',
            'textarea[data-testid*="prompt"]',
            'textarea[data-testid*="input"]',
            // More specific for Google AI Studio
            'textarea.input-field',
            'textarea[placeholder*="Enter your prompt"]',
            '.prompt-textarea textarea',
            '[data-testid="prompt-textarea"]'
        ],
        // Loading indicators
        LOADING_INDICATORS: [
            // Google AI Studio specific (most accurate)
            'button.run-button.stoppable',
            '.stoppable-spinner',
            'button.run-button[type="button"]',
            // General selectors
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
        DEFAULT_ITERATIONS: 'gaise-default-iterations',
        AUTO_RUN_DELAY: 'gaise-auto-run-delay',
        SHOW_NOTIFICATIONS: 'gaise-show-notifications',
        PANEL_POSITION: 'gaise-panel-position',
        AUTO_RUN_PROMPT: 'gaise-auto-run-prompt'
    };

    static DEFAULT_SETTINGS = {
        DEFAULT_ITERATIONS: 10,
        AUTO_RUN_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_RUN_PROMPT: ''
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
        this.chatObserver = null;
        this.settings = { ...AIStudioEnhancer.DEFAULT_SETTINGS };
        this.sidebarPanel = null;
        this.currentChatId = null;
        this.copyButton = null;
        this.toggleButton = null;

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

        // Initialize styles
        SidebarPanel.initStyles();
        Button.initStyles();
        Button.useDefaultColors();
        
        // Add custom styles for full-width buttons
        StyleManager.addStyles(`
            .copy-responses-button,
            .auto-run-toggle-button {
                width: 100% !important;
            }
        `, 'ai-studio-enhancer-button-styles');

        // Create the UI panel using SidebarPanel component
        this.createSidebarPanel();

        // Setup chat monitoring to detect chat switches
        this.setupChatMonitoring();

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
     * Create the main UI panel using SidebarPanel component
     */
    createSidebarPanel() {
        this.sidebarPanel = new SidebarPanel({
            title: '🤖 AI Studio Enhancer',
            id: 'ai-studio-enhancer-panel',
            position: 'right',
            transition: 'slide',
            buttonIcon: '🤖',
            content: {
                generator: () => this.createPanelContent()
            },
            style: {
                width: '380px',
                buttonSize: '48px',
                buttonColor: '#fff',
                buttonBg: '#4285f4',
                panelBg: '#fff'
            },
            rememberState: true
        });

        Logger.debug("SidebarPanel created");
    }

    /**
     * Create the content for the sidebar panel
     */
    createPanelContent() {
        const content = document.createElement('div');
        content.style.cssText = `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        `;

        // Create sections
        this.createResponseSection(content);
        this.createAutoRunSection(content);
        this.createSettingsSection(content);

        return content;
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
        this.responseCountElement.textContent = `Current chat responses: ${this.responses.length}`;
        this.responseCountElement.style.cssText = 'margin-bottom: 10px; color: #666; font-size: 12px;';

        // Copy button using Button component
        this.copyButton = new Button({
            text: 'Copy All Responses',
            theme: 'primary',
            size: 'medium',
            onClick: () => this.copyAllResponses(),
            successText: '✅ Copied!',
            successDuration: 1000,
            className: 'copy-responses-button',
            container: section
        });

        section.appendChild(title);
        section.appendChild(this.responseCountElement);
        // Note: copyButton is automatically appended to section via container option

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

        // Prompt input
        this.promptInput = document.createElement('textarea');
        this.promptInput.value = this.settings.AUTO_RUN_PROMPT;
        this.promptInput.placeholder = 'Enter prompt to auto-run (optional)';
        this.promptInput.rows = 3;
        this.promptInput.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 12px;
            box-sizing: border-box;
            resize: vertical;
            font-family: inherit;
            color: #333;
            background: #fff;
        `;
        this.promptInput.style.setProperty('color', '#333', 'important');
        this.promptInput.style.setProperty('background-color', '#fff', 'important');
        
        // Add focus and hover effects
        this.promptInput.addEventListener('focus', () => {
            this.promptInput.style.borderColor = '#4285f4';
            this.promptInput.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.2)';
        });
        this.promptInput.addEventListener('blur', () => {
            this.promptInput.style.borderColor = '#ddd';
            this.promptInput.style.boxShadow = 'none';
        });
        this.promptInput.addEventListener('input', () => {
            this.settings.AUTO_RUN_PROMPT = this.promptInput.value;
            this.saveSettings();
        });

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
            color: #333;
            background: #fff;
        `;
        this.iterationsInput.style.setProperty('color', '#333', 'important');
        this.iterationsInput.style.setProperty('background-color', '#fff', 'important');
        
        // Add focus effects
        this.iterationsInput.addEventListener('focus', () => {
            this.iterationsInput.style.borderColor = '#4285f4';
            this.iterationsInput.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.2)';
        });
        this.iterationsInput.addEventListener('blur', () => {
            this.iterationsInput.style.borderColor = '#ddd';
            this.iterationsInput.style.boxShadow = 'none';
        });

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-bottom: 10px;';

        // Single toggle button for start/stop using Button component
        this.toggleButton = new Button({
            text: 'Start Auto Run',
            theme: 'primary',
            size: 'medium',
            onClick: () => this.toggleAutoRun(),
            className: 'auto-run-toggle-button',
            container: buttonContainer
        });

        // Status display
        this.statusElement = document.createElement('div');
        this.statusElement.textContent = 'Ready to start';
        this.statusElement.style.cssText = 'font-size: 12px; color: #666; text-align: center;';

        section.appendChild(title);
        section.appendChild(this.promptInput);
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

        // Placeholder for future settings
        const placeholder = document.createElement('div');
        placeholder.textContent = 'No settings available yet';
        placeholder.style.cssText = `
            color: #999;
            font-size: 13px;
            font-style: italic;
            text-align: center;
            padding: 20px;
        `;

        section.appendChild(title);
        section.appendChild(placeholder);

        container.appendChild(section);
    }



    /**
     * Setup chat monitoring to detect when user switches between chats
     */
    setupChatMonitoring() {
        // Monitor URL changes
        let currentUrl = window.location.href;
        this.currentChatId = this.extractChatId(currentUrl);
        
        // Check for URL changes periodically
        setInterval(() => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
                currentUrl = newUrl;
                const newChatId = this.extractChatId(newUrl);
                if (newChatId !== this.currentChatId) {
                    Logger.info(`Chat changed from ${this.currentChatId} to ${newChatId}`);
                    this.currentChatId = newChatId;
                    this.onChatChanged();
                }
            }
        }, 1000);

        // Also monitor DOM changes that might indicate chat switches
        this.chatObserver = new DOMObserver((mutations) => {
            this.handleChatDOMChanges(mutations);
        });

        this.chatObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        Logger.debug("Chat monitoring setup complete");
    }

    /**
     * Extract chat ID from URL or content
     */
    extractChatId(url) {
        // Try to extract chat ID from URL patterns
        const urlPatterns = [
            /\/chat\/([^\/\?]+)/,
            /\/conversation\/([^\/\?]+)/,
            /\/prompt\/([^\/\?]+)/,
            /\/c\/([^\/\?]+)/
        ];

        for (const pattern of urlPatterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Fallback: use the full pathname as identifier
        return window.location.pathname;
    }

    /**
     * Handle chat DOM changes that might indicate a chat switch
     */
    handleChatDOMChanges(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Look for elements that might indicate a new chat
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this looks like a new conversation container
                        if (node.querySelector && 
                            (node.querySelector('[data-testid*="conversation"]') ||
                             node.querySelector('.conversation') ||
                             node.querySelector('.chat-container'))) {
                            // Slight delay to ensure the chat has fully loaded
                            setTimeout(() => {
                                const newChatId = this.extractChatId(window.location.href);
                                if (newChatId !== this.currentChatId) {
                                    Logger.info(`Chat changed via DOM to ${newChatId}`);
                                    this.currentChatId = newChatId;
                                    this.onChatChanged();
                                }
                            }, 500);
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Handle chat change event
     */
    onChatChanged() {
        Logger.info('Chat changed - clearing responses and collecting new ones');
        
        // Clear existing responses for the new chat
        this.responses = [];
        this.updateResponseCount();
        
        // Collect responses from the new chat after a short delay
        setTimeout(() => {
            this.collectExistingResponses();
        }, 1000);
        
        this.showNotification('Switched to new chat - responses cleared', 'info');
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
            
            // Always auto-copy new responses
            this.copyAllResponses();

            Logger.debug('New response added:', text.substring(0, 100) + '...');
        }
    }

    /**
     * Update response counter display
     */
    updateResponseCount() {
        if (this.responseCountElement) {
            this.responseCountElement.textContent = `Current chat responses: ${this.responses.length}`;
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
        this.showNotification('Chat responses cleared', 'info');
        Logger.info('Chat responses cleared');
    }

    /**
     * Toggle auto-run process (start/stop)
     */
    async toggleAutoRun() {
        if (this.isAutoRunning) {
            this.stopAutoRun();
        } else {
            await this.startAutoRun();
        }
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
        this.updateButtonState();
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
        
        // Reset iteration count to 0
        this.currentIteration = 0;
        
        // Update UI
        this.updateButtonState();
        this.updateAutoRunStatus();

        this.showNotification(`Auto runner stopped and reset`, 'info');
        Logger.info(`Auto runner stopped and reset`);
    }

    /**
     * Run a single iteration
     */
    async runIteration() {
        if (!this.isAutoRunning || this.currentIteration >= this.maxIterations) {
            if (this.currentIteration >= this.maxIterations) {
                // Auto-run completed all iterations
                this.isAutoRunning = false;
                this.currentIteration = 0;
                this.updateButtonState();
                this.updateAutoRunStatus();
                this.showNotification(`Auto runner completed ${this.maxIterations} iterations`, 'success');
                Logger.info(`Auto runner completed ${this.maxIterations} iterations`);
            } else {
                this.stopAutoRun();
            }
            return;
        }

        this.currentIteration++;
        this.updateAutoRunStatus();
        Logger.info(`Running iteration ${this.currentIteration}/${this.maxIterations}`);

        // Enter prompt if specified
        if (this.settings.AUTO_RUN_PROMPT.trim()) {
            const promptEntered = await this.enterPrompt(this.settings.AUTO_RUN_PROMPT);
            if (!promptEntered) {
                this.showNotification('Could not enter prompt - prompt input not found', 'error');
                this.stopAutoRun();
                return;
            }
            // Small delay after entering prompt to let Google process the input
            await this.delay(500);
        }

        // Wait for run button to become enabled (with retry mechanism)
        const runButton = await this.waitForRunButton();
        if (!runButton) {
            this.showNotification('Run button not found after waiting', 'error');
            this.stopAutoRun();
            return;
        }

        // Click the run button
        runButton.click();
        Logger.debug('Run button clicked');

        // Wait for response completion
        await this.waitForResponseCompletion();

        // Wait before next iteration (reduced delay for faster execution)
        setTimeout(() => {
            this.runIteration();
        }, 1000); // Reduced from this.settings.AUTO_RUN_DELAY (2000ms) to 1000ms
    }

    /**
     * Find the prompt input field on the page
     */
    findPromptInput() {
        // Try specific selectors first
        for (const selector of AIStudioEnhancer.SELECTORS.PROMPT_INPUTS) {
            const input = document.querySelector(selector);
            if (input && !input.disabled && !input.readOnly) {
                return input;
            }
        }

        // Fallback: search for any visible textarea
        const textareas = document.querySelectorAll('textarea');
        for (const textarea of textareas) {
            if (textarea.offsetParent !== null && !textarea.disabled && !textarea.readOnly) {
                return textarea;
            }
        }

        // Fallback: search for contenteditable divs
        const editableDivs = document.querySelectorAll('div[contenteditable="true"]');
        for (const div of editableDivs) {
            if (div.offsetParent !== null) {
                return div;
            }
        }

        return null;
    }

    /**
     * Enter prompt text into the input field
     */
    async enterPrompt(promptText) {
        const promptInput = this.findPromptInput();
        if (!promptInput) {
            Logger.warn('Prompt input field not found');
            return false;
        }

        try {
            // Clear existing content
            if (promptInput.tagName.toLowerCase() === 'textarea' || promptInput.tagName.toLowerCase() === 'input') {
                // For regular input/textarea elements
                promptInput.value = '';
                promptInput.focus();
                
                // Simulate typing the prompt
                promptInput.value = promptText;
                
                // Trigger input events
                promptInput.dispatchEvent(new Event('input', { bubbles: true }));
                promptInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // For contenteditable divs
                promptInput.focus();
                promptInput.textContent = promptText;
                
                // Trigger input events
                promptInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            Logger.debug('Prompt entered successfully:', promptText.substring(0, 50) + '...');
            return true;
        } catch (error) {
            Logger.error('Error entering prompt:', error);
            return false;
        }
    }

    /**
     * Create a delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for the run button to become available and enabled
     */
    async waitForRunButton(maxWaitTime = 10000) {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = maxWaitTime / 500; // Check every 500ms
            
            const checkForButton = () => {
                attempts++;
                const button = this.findRunButton();
                
                if (button) {
                    Logger.debug('Run button found and enabled after', attempts * 500, 'ms');
                    resolve(button);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    Logger.warn(`Run button not found after ${maxWaitTime}ms`);
                    resolve(null);
                    return;
                }
                
                Logger.debug(`Waiting for run button... attempt ${attempts}/${maxAttempts}`);
                setTimeout(checkForButton, 500);
            };
            
            // Start checking immediately
            checkForButton();
        });
    }

    /**
     * Find the run button on the page
     */
    findRunButton() {
        // First, try Google AI Studio specific selectors (most accurate)
        const googleRunButton = document.querySelector('button.run-button[aria-label="Run"]');
        if (googleRunButton && !googleRunButton.disabled && !googleRunButton.classList.contains('disabled') && !googleRunButton.classList.contains('stoppable')) {
            return googleRunButton;
        }

        // Try other specific selectors
        for (const selector of AIStudioEnhancer.SELECTORS.RUN_BUTTONS) {
            const button = document.querySelector(selector);
            if (button && !button.disabled && !button.classList.contains('disabled')) {
                return button;
            }
        }

        // Fallback: search by text content (avoiding busy/stoppable buttons)
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
            const text = button.textContent?.toLowerCase().trim();
            if ((text === 'run' || text === 'send' || text.includes('run') || text.includes('send')) && 
                !button.disabled && 
                !button.classList.contains('disabled') &&
                !button.classList.contains('stoppable')) {
                return button;
            }
        }

        return null;
    }

    /**
     * Wait for response completion using DOM observer (much faster)
     */
    async waitForResponseCompletion() {
        return new Promise((resolve) => {
            let timeoutId;
            let observer;
            
            const cleanup = () => {
                if (observer) {
                    observer.disconnect();
                }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };

            const checkCompletion = () => {
                const runButton = document.querySelector('button.run-button[aria-label="Run"]');
                
                if (!runButton) {
                    Logger.warn('Run button not found during completion check');
                    cleanup();
                    resolve();
                    return true;
                }

                // Check if button is in stoppable/busy state
                const isStoppable = runButton.classList.contains('stoppable');
                const isButtonTypeButton = runButton.type === 'button';
                const isDisabled = runButton.disabled || runButton.classList.contains('disabled');
                const buttonText = runButton.textContent?.trim();
                
                Logger.debug(`Button state check:`, {
                    isStoppable,
                    isButtonTypeButton,
                    isDisabled,
                    type: runButton.type,
                    text: buttonText,
                    classes: Array.from(runButton.classList)
                });
                
                // Response is complete when button changes from "Stop" to "Run" state
                // Note: Button may be disabled because prompt is empty (that's normal)
                const isComplete = !isStoppable && !isButtonTypeButton && runButton.type === 'submit';
                
                if (isComplete) {
                    Logger.debug('Response completion detected via DOM observer');
                    cleanup();
                    resolve();
                    return true;
                }
                
                return false;
            };

            // Set up DOM observer to watch for button changes
            observer = new MutationObserver((mutations) => {
                let shouldCheck = false;
                
                mutations.forEach((mutation) => {
                    // Check if the run button or its attributes changed
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        if (target.classList.contains('run-button') || target.getAttribute('aria-label') === 'Run') {
                            Logger.debug(`Button attribute changed: ${mutation.attributeName} on`, target);
                            shouldCheck = true;
                        }
                    }
                    
                    // Check if new nodes were added that might be the run button
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.classList?.contains('run-button') || 
                                    node.querySelector?.('.run-button')) {
                                    Logger.debug('Run button node added/changed');
                                    shouldCheck = true;
                                }
                            }
                        });
                    }
                    
                    // Also check for text content changes (Stop -> Run)
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        const target = mutation.target;
                        if (target.closest && target.closest('.run-button')) {
                            Logger.debug('Button content changed');
                            shouldCheck = true;
                        }
                    }
                });
                
                if (shouldCheck) {
                    Logger.debug('DOM observer triggered, checking completion...');
                    checkCompletion();
                }
            });

            // Start observing the document for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'type', 'disabled', 'aria-label'],
                characterData: true // Watch for text changes too
            });
            
            Logger.debug('DOM observer started, watching for button changes...');

            // Initial check after a short delay to let the button state change
            setTimeout(() => {
                if (!checkCompletion()) {
                    // Set a maximum timeout as fallback
                    timeoutId = setTimeout(() => {
                        Logger.warn('Response completion timeout (2 minutes)');
                        cleanup();
                        resolve();
                    }, 120000); // 2 minutes
                    
                    // Also set up periodic checking as backup (every 5 seconds)
                    const intervalId = setInterval(() => {
                        Logger.debug('Periodic check (backup)...');
                        if (checkCompletion()) {
                            clearInterval(intervalId);
                        }
                    }, 5000);
                    
                    // Store interval ID for cleanup
                    const originalCleanup = cleanup;
                    cleanup = () => {
                        clearInterval(intervalId);
                        originalCleanup();
                    };
                }
            }, 500); // Reduced from 2000ms to 500ms
        });
    }

    /**
     * Update button state based on running status
     */
    updateButtonState() {
        if (this.toggleButton) {
            if (this.isAutoRunning) {
                this.toggleButton.setText('Stop Auto Run');
                this.toggleButton.setTheme('danger');  // Red color for stop
            } else {
                this.toggleButton.setText('Start Auto Run');
                this.toggleButton.setTheme('primary');  // Blue color for start
            }
        }
    }

    /**
     * Update auto-run status display
     */
    updateAutoRunStatus() {
        if (this.statusElement) {
            if (this.isAutoRunning) {
                this.statusElement.textContent = `Running: ${this.currentIteration}/${this.maxIterations}`;
            } else {
                this.statusElement.textContent = 'Ready to start';
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