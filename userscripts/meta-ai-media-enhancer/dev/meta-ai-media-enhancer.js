// Import core components
import {
    Button,
    Checkbox,
    Debouncer,
    DOMObserver,
    HTMLUtils,
    Input,
    Logger,
    Notification,
    PollingStrategy,
    PubSub,
    SidebarPanel,
    StyleManager,
    TextArea,
    ThrottleService,
    UrlChangeWatcher,
    UserInteractionDetector,
    ClipboardService
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";
import { MouseEventUtils } from '../../common/core/utils/HTMLUtils.js';

// Configure logger
Logger.setPrefix("Meta AI Media Enhancer");
Logger.DEBUG = true;

/**
 * Meta AI Media Enhancer
 * Automates prompt sending to Meta AI Media with multiple prompts and configurable delays
 */
class MetaAIMediaEnhancer {
    // Configuration
    static SELECTORS = {
        PROMPT_AREA: [
            'div[aria-label="Describe your image..."][contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"][aria-label*="image"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[contenteditable="true"]'
        ],
        SEND_BUTTON: [
            'div[aria-label="Send"][role="button"]:not([aria-disabled="true"])',
            'div[aria-label="Send"][role="button"]',
            'div[role="button"][aria-label="Send"]'
        ],
        SEND_BUTTON_DISABLED: [
            'div[aria-label="Send"][aria-disabled="true"]',
            'div[role="button"][aria-disabled="true"][aria-label="Send"]'
        ]
    };

    static SETTINGS_KEYS = {
        MULTIPLE_PROMPTS: 'maime-multiple-prompts',
        DELAY_SECONDS: 'maime-delay-seconds',
        SHOW_NOTIFICATIONS: 'maime-show-notifications',
        PANEL_POSITION: 'maime-panel-position',
        AUTO_CLEAR_PROMPT: 'maime-auto-clear-prompt'
    };

    static DEFAULT_SETTINGS = {
        MULTIPLE_PROMPTS: '',
        DELAY_SECONDS: 3,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_CLEAR_PROMPT: true
    };

    static EVENTS = {
        PROMPT_SENT: 'meta-ai-media:prompt-sent',
        AUTOMATION_STARTED: 'meta-ai-media:automation-started',
        AUTOMATION_STOPPED: 'meta-ai-media:automation-stopped',
        AUTOMATION_ITERATION: 'meta-ai-media:automation-iteration',
        SETTINGS_CHANGED: 'meta-ai-media:settings-changed'
    };

    constructor() {
        this.isRunning = false;
        this.shouldStop = false;
        this.currentIndex = 0;
        this.totalPrompts = 0;
        this.settings = { ...MetaAIMediaEnhancer.DEFAULT_SETTINGS };
        this.sidebarPanel = null;
        this.enhancerId = 'meta-ai-media-enhancer-container';
        this.subscriptionIds = [];
        
        this.userInteraction = UserInteractionDetector.getInstance({
            debug: Logger.DEBUG,
            namespace: 'meta-ai-media-enhancer',
            interactionWindow: 200,
            interactionThrottle: 100
        });

        Logger.info("Initializing Meta AI Media Enhancer");

        this.setupEventHandlers();
        this.urlWatcher = new UrlChangeWatcher([
            new PollingStrategy(this.handleUrlChange.bind(this), 1000)
        ], false);

        this.loadSettings().then(() => {
            this.init();
        });
        
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Simple delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Setup PubSub event handlers
     */
    setupEventHandlers() {
        this.subscriptionIds.push(
            PubSub.subscribe(MetaAIMediaEnhancer.EVENTS.SETTINGS_CHANGED, (data) => {
                this.handleSettingsChanged(data);
            })
        );

        Logger.debug("PubSub event handlers setup complete");
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.subscriptionIds.forEach(id => {
            PubSub.unsubscribe(id);
        });
        this.subscriptionIds = [];
        
        if (this.isRunning) {
            this.shouldStop = true;
        }
        
        Logger.debug("All subscriptions and resources cleaned up");
    }

    /**
     * Load saved settings
     */
    async loadSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(MetaAIMediaEnhancer.SETTINGS_KEYS)) {
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
     * Save settings
     */
    async saveSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(MetaAIMediaEnhancer.SETTINGS_KEYS)) {
                await setValue(storageKey, this.settings[settingName]);
            }
            Logger.debug("Settings saved", this.settings);
            PubSub.publish(MetaAIMediaEnhancer.EVENTS.SETTINGS_CHANGED, this.settings);
        } catch (error) {
            Logger.error("Error saving settings:", error);
        }
    }

    /**
     * Initialize the enhancer
     */
    async init() {
        try {
            Logger.info("Enhancer starting initialization...");

            try {
                document.body.id = this.enhancerId;
            } catch (error) {
                Logger.warn('Failed to set body ID:', error);
            }

            await this.waitForPageReady();
            Logger.info("Page is ready, proceeding with initialization.");

            try {
                SidebarPanel.initStyles();
                Button.initStyles();
                Button.useDefaultColors();
                Checkbox.initStyles();
                Checkbox.useDefaultColors();
                Notification.initStyles();
                Notification.useDefaultColors();
                Input.initStyles();
                Input.useDefaultColors();
                TextArea.initStyles();
                TextArea.useDefaultColors();
            } catch (error) {
                Logger.error('Error initializing styles:', error);
            }

            StyleManager.addStyles(`
                .meta-ai-prompts-textarea,
                .meta-ai-delay-input {
                    margin-bottom: 12px;
                }
                
                .meta-ai-prompts-textarea textarea {
                    max-height: 300px !important;
                    overflow-y: auto !important;
                }
                
                .meta-ai-status-display {
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    padding: 8px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    margin-top: 8px;
                }
            `, 'meta-ai-media-enhancer-custom-styles');

            await this.createSidebarPanel();

            Logger.success("Meta AI Media Enhancer initialized successfully!");
        } catch (error) {
            Logger.error('Error during initialization:', error);
            this.showNotification('Failed to initialize enhancer. Please refresh the page.', 'error');
        }
    }

    /**
     * Wait for page to be ready
     */
    async waitForPageReady() {
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve, { once: true });
            });
        }
        
        try {
            await HTMLUtils.waitForElement('body', 5000);
            await new Promise(resolve => setTimeout(resolve, 1000));
            Logger.debug('Page ready - main elements found');
        } catch (error) {
            Logger.warn('Some page elements not found, but continuing:', error.message);
        }
    }

    /**
     * Create the sidebar panel
     */
    async createSidebarPanel() {
        this.sidebarPanel = new SidebarPanel({
            title: '🎨 Meta AI Media Enhancer',
            id: 'meta-ai-media-enhancer-panel',
            position: 'right',
            transition: 'slide',
            buttonIcon: '🎨',
            content: {
                generator: () => this.createPanelContent()
            },
            style: {
                width: '400px',
                buttonSize: '48px',
                buttonColor: '#fff',
                buttonBg: '#0084ff',
                panelBg: '#fff'
            },
            rememberState: true
        });

        // Initialize the panel to create DOM elements
        await this.sidebarPanel.init();

        Logger.debug("SidebarPanel created and initialized");
    }

    /**
     * Create panel content
     */
    createPanelContent() {
        const content = document.createElement('div');
        content.style.cssText = `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        `;

        this.createAutomationSection(content);
        this.createSettingsSection(content);

        return content;
    }

    /**
     * Create automation section
     */
    createAutomationSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '🚀 Prompt Automation';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Prompts input
        const promptsLabel = document.createElement('label');
        promptsLabel.textContent = 'Prompts (separated by newlines or ---):';
        promptsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';

        const separatorInfo = document.createElement('div');
        separatorInfo.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;';
        
        const separatorTitle = document.createElement('div');
        HTMLUtils.setHTMLSafely(separatorTitle, '<strong>Separators:</strong> Use newlines or <code>---</code> (three dashes) to separate prompts.');
        separatorTitle.style.marginBottom = '4px';
        
        const exampleTitle = document.createElement('div');
        HTMLUtils.setHTMLSafely(exampleTitle, '<strong>Example:</strong>');
        exampleTitle.style.marginBottom = '4px';
        
        const exampleCode = document.createElement('code');
        exampleCode.textContent = `First prompt here
can be multiline
---
Second prompt here
also multiline`;
        exampleCode.style.cssText = 'display: block; background: #f0f0f0; padding: 4px; border-radius: 3px; font-family: monospace; font-size: 10px; white-space: pre-line;';
        
        separatorInfo.appendChild(separatorTitle);
        separatorInfo.appendChild(exampleTitle);
        separatorInfo.appendChild(exampleCode);

        const promptsContainer = document.createElement('div');
        promptsContainer.className = 'meta-ai-prompts-textarea';

        this.promptsTextArea = new TextArea({
            value: this.settings.MULTIPLE_PROMPTS || '',
            placeholder: 'Enter prompts separated by newlines or ---:\nFirst prompt\ncan be multiline\n---\nSecond prompt\nalso multiline',
            rows: 10,
            theme: 'primary',
            size: 'medium',
            className: 'meta-ai-prompts-textarea',
            onInput: (event, textArea) => {
                this.settings.MULTIPLE_PROMPTS = textArea.getValue();
                this.saveSettings();
            },
            container: promptsContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Delay input
        const delayContainer = document.createElement('div');
        delayContainer.style.marginBottom = '12px';

        const delayLabel = document.createElement('label');
        delayLabel.textContent = 'Delay between prompts (seconds):';
        delayLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.delayInput = new Input({
            type: 'number',
            value: this.settings.DELAY_SECONDS,
            placeholder: 'Delay in seconds',
            min: 0,
            max: 300,
            step: 0.5,
            className: 'meta-ai-delay-input',
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) {
                    return 'Please enter a number greater than or equal to 0';
                }
                if (num > 300) {
                    return 'Maximum 300 seconds allowed';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseFloat(input.getValue());
                if (!isNaN(value) && value >= 0) {
                    this.settings.DELAY_SECONDS = value;
                    this.saveSettings();
                }
            },
            container: delayContainer
        });

        delayContainer.appendChild(delayLabel);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-bottom: 10px;';

        this.toggleButton = new Button({
            text: 'Start Automation',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleToggleButtonClick(event),
            className: 'meta-ai-toggle-button',
            container: buttonContainer
        });

        // Status display
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'meta-ai-status-display';
        this.statusElement.textContent = 'Ready to start';

        section.appendChild(title);
        section.appendChild(promptsLabel);
        section.appendChild(separatorInfo);
        section.appendChild(promptsContainer);
        section.appendChild(delayContainer);
        section.appendChild(buttonContainer);
        section.appendChild(this.statusElement);

        container.appendChild(section);
    }

    /**
     * Create settings section
     */
    createSettingsSection(container) {
        const section = document.createElement('div');

        const title = document.createElement('h3');
        title.textContent = '⚙️ Settings';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Auto clear prompt checkbox
        this.autoClearCheckbox = new Checkbox({
            label: 'Auto-clear prompt after sending',
            checked: this.settings.AUTO_CLEAR_PROMPT !== false,
            onChange: (event) => {
                this.settings.AUTO_CLEAR_PROMPT = this.autoClearCheckbox.isChecked();
                this.saveSettings();
            },
            container: section,
            size: 'small'
        });

        // Show notifications checkbox
        this.showNotificationsCheckbox = new Checkbox({
            label: 'Show notifications',
            checked: this.settings.SHOW_NOTIFICATIONS !== false,
            onChange: (event) => {
                this.settings.SHOW_NOTIFICATIONS = this.showNotificationsCheckbox.isChecked();
                this.saveSettings();
            },
            container: section,
            size: 'small'
        });

        section.appendChild(title);

        container.appendChild(section);
    }

    /**
     * Handle toggle button click
     */
    handleToggleButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.info('Toggle button clicked', {
            isUserInitiated,
            currentState: this.isRunning
        });

        if (isUserInitiated) {
            this.toggleAutomation();
        } else {
            Logger.warn('Programmatic toggle button click detected - ignoring');
        }
    }

    /**
     * Toggle automation
     */
    async toggleAutomation() {
        if (this.isRunning) {
            this.stopAutomation();
        } else {
            await this.startAutomation();
        }
    }

    /**
     * Start automation
     */
    async startAutomation() {
        if (this.isRunning) {
            this.showNotification('Automation is already running', 'warning');
            return;
        }

        // Parse prompts
        const prompts = this.parsePrompts(this.settings.MULTIPLE_PROMPTS || '');
        if (prompts.length === 0) {
            this.showNotification('No prompts found. Please enter prompts separated by newlines or ---', 'error');
            return;
        }

        // Update state
        this.isRunning = true;
        this.shouldStop = false;
        this.currentIndex = 0;
        this.totalPrompts = prompts.length;

        // Update UI
        this.updateButtonState();
        this.updateStatus();

        Logger.info(`Starting automation with ${prompts.length} prompts`);
        Logger.info(`Settings: Delay=${this.settings.DELAY_SECONDS}s between prompts`);
        this.showNotification(`Starting automation with ${prompts.length} prompts (Delay: ${this.settings.DELAY_SECONDS}s)`, 'info');

        // Run all prompts sequentially
        try {
            await this.runAllPrompts(prompts);
            
            if (!this.shouldStop) {
                this.showNotification('Automation completed successfully', 'success');
                Logger.success('Automation completed successfully');
            }
        } catch (error) {
            Logger.error('Automation error:', error);
            this.showNotification(`Automation error: ${error.message}`, 'error');
        } finally {
            // Clean up state
            this.isRunning = false;
            this.shouldStop = false;
            this.currentIndex = 0;
            this.updateButtonState();
            this.updateStatus();
        }
    }

    /**
     * Stop automation
     */
    stopAutomation() {
        if (!this.isRunning) {
            return;
        }

        Logger.info('Stopping automation');
        this.shouldStop = true;
        this.showNotification('Stopping automation...', 'info');
    }

    /**
     * Parse prompts from text (supports both newlines and ---)
     * Logic:
     * - If text contains '---', split by '---' first, then split each part by newlines
     * - If text doesn't contain '---', split directly by newlines
     * - Each non-empty line becomes a separate prompt
     */
    parsePrompts(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const prompts = [];
        
        // Check if text contains '---' separator
        if (text.includes('---')) {
            // Split by --- first
            const parts = text.split('---');
            
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.length > 0) {
                    // Split each part by newlines - each line becomes a separate prompt
                    const lines = trimmed.split('\n')
                        .map(l => l.trim())
                        .filter(l => l.length > 0);
                    
                    // Add each line as a separate prompt
                    prompts.push(...lines);
                }
            }
        } else {
            // No '---' separator, split directly by newlines
            const lines = text.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);
            
            prompts.push(...lines);
        }

        Logger.debug(`Parsed ${prompts.length} prompts from text`);
        return prompts;
    }

    /**
     * Run all prompts sequentially
     */
    async runAllPrompts(prompts) {
        Logger.info(`🚀 Starting prompt automation with ${prompts.length} prompts...`);
        
        for (let i = 0; i < prompts.length; i++) {
            // Check if we should stop
            if (this.shouldStop) {
                Logger.info('Automation stopped by user');
                break;
            }

            this.currentIndex = i + 1;
            this.updateStatus();
            
            await this.processPrompt(prompts[i], i);
            
            // Add delay between prompts (except for the last one)
            if (i < prompts.length - 1 && !this.shouldStop) {
                const delaySeconds = this.settings.DELAY_SECONDS || 3;
                const delayMs = delaySeconds * 1000;
                Logger.info(`⏱️ Waiting ${delaySeconds} seconds before next prompt (delay between prompts)...`);
                await this.delay(delayMs);
                Logger.debug(`✅ Delay completed, proceeding to next prompt`);
            }
        }
        
        Logger.info('🎉 All prompts processed');
    }

    /**
     * Process a single prompt
     */
    async processPrompt(prompt, index) {
        Logger.info(`➡️ Processing prompt ${index + 1}/${this.totalPrompts}: "${prompt.substring(0, 50)}..."`);
        
        try {
            // Clear prompt area if enabled
            if (this.settings.AUTO_CLEAR_PROMPT) {
                await this.clearPromptArea();
                await this.delay(200);
            }

            // Type the prompt
            await this.typePrompt(prompt);
            
            // Small delay to let the UI settle
            await this.delay(500);
            
            // Click send button
            await this.clickSendButton();
            
            // Small delay to ensure the request is sent
            await this.delay(500);
            
            Logger.success(`✅ Prompt ${index + 1} sent`);
        } catch (error) {
            Logger.error(`🚨 Error on prompt ${index + 1}:`, error.message);
            throw error;
        }
    }

    /**
     * Clear prompt area
     */
    async clearPromptArea() {
        const promptArea = this.findPromptArea();
        if (!promptArea) {
            Logger.warn('Prompt area not found for clearing');
            return;
        }

        try {
            // Clear contenteditable
            promptArea.textContent = '';
            promptArea.innerHTML = '<p class="x1oj8htv x2dq9o6 xxzylry x1mfz1tq xdj266r x14z9mp xat24cr x1lziwak xv54qhq" dir="auto"><br></p>';
            
            // Dispatch events
            promptArea.dispatchEvent(new InputEvent('input', { bubbles: true }));
            promptArea.dispatchEvent(new Event('change', { bubbles: true }));
            
            Logger.debug('Prompt area cleared');
        } catch (error) {
            Logger.error('Error clearing prompt area:', error);
        }
    }

    /**
     * Type prompt into contenteditable area
     */
    async typePrompt(prompt) {
        try {
            const promptArea = this.findPromptArea();
            if (!promptArea) {
                throw new Error("Prompt area not found");
            }
            
            return await this.typeIntoContentEditable(promptArea, prompt);
        } catch (error) {
            throw new Error("❌ Typing failed: " + error.message);
        }
    }

    /**
     * Find prompt area element
     */
    findPromptArea() {
        for (const selector of MetaAIMediaEnhancer.SELECTORS.PROMPT_AREA) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                return element;
            }
        }
        return null;
    }

    /**
     * Type into a contenteditable element
     */
    async typeIntoContentEditable(element, text) {
        element.focus();
        
        // Clear existing content
        element.textContent = '';
        element.innerHTML = '<p class="x1oj8htv x2dq9o6 xxzylry x1mfz1tq xdj266r x14z9mp xat24cr x1lziwak xv54qhq" dir="auto"><br></p>';
        
        // Set text content
        const p = element.querySelector('p') || element;
        p.textContent = text;
        
        // Dispatch events to trigger React/Facebook's event handlers
        element.dispatchEvent(new InputEvent('input', { 
            bubbles: true, 
            cancelable: true,
            inputType: 'insertText',
            data: text
        }));
        
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Also try composition events for better compatibility (if available)
        if (typeof CompositionEvent !== 'undefined') {
            try {
                element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
                element.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: text }));
                element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
            } catch (e) {
                Logger.debug('CompositionEvent not supported, skipping');
            }
        }
        
        Logger.debug(`⌨️ Typed: "${text.substring(0, 50)}..."`);
        
        // Small delay to ensure the text is set
        await this.delay(300);
    }

    /**
     * Click send button
     */
    async clickSendButton(retries = 10) {
        for (let attempt = 0; attempt < retries; attempt++) {
            // Try each selector
            for (const selector of MetaAIMediaEnhancer.SELECTORS.SEND_BUTTON) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    // Check if button is disabled
                    const isDisabled = button.getAttribute('aria-disabled') === 'true';
                    
                    if (!isDisabled) {
                        // Use MouseEventUtils for better compatibility
                        const clickEvent = MouseEventUtils.createClickEvent({ 
                            bubbles: true, 
                            cancelable: true, 
                            programmatic: true 
                        });
                        button.dispatchEvent(clickEvent);
                        Logger.debug(`📤 Clicked Send button using selector: ${selector}`);
                        // Small delay to allow DOM to update after click
                        await this.delay(200);
                        return;
                    }
                }
            }
            
            Logger.debug(`⏱ Waiting for Send button to be ready... (attempt ${attempt + 1}/${retries})`);
            await this.delay(500);
        }
        
        // Log available buttons for debugging
        const allSendButtons = document.querySelectorAll('div[aria-label="Send"]');
        Logger.error(`❌ Send button not found or disabled. Found ${allSendButtons.length} button(s) with aria-label="Send":`, 
            Array.from(allSendButtons).map(btn => ({
                ariaDisabled: btn.getAttribute('aria-disabled'),
                visible: btn.offsetParent !== null,
                classes: btn.className
            }))
        );
        
        throw new Error("❌ Send button not found or disabled");
    }

    /**
     * Update button state
     */
    updateButtonState() {
        if (this.toggleButton) {
            if (this.isRunning) {
                this.toggleButton.setText('Stop Automation');
                this.toggleButton.setTheme('danger');
            } else {
                this.toggleButton.setText('Start Automation');
                this.toggleButton.setTheme('primary');
            }
        }
    }

    /**
     * Update status display
     */
    updateStatus() {
        if (this.statusElement) {
            if (this.isRunning) {
                this.statusElement.textContent = `Running: ${this.currentIndex}/${this.totalPrompts}`;
                this.statusElement.style.background = '#e3f2fd';
                this.statusElement.style.color = '#1976d2';
            } else {
                this.statusElement.textContent = 'Ready to start';
                this.statusElement.style.background = '#f5f5f5';
                this.statusElement.style.color = '#666';
            }
        }
    }

    /**
     * Handle URL changes
     */
    handleUrlChange(newUrl, oldUrl) {
        Logger.debug(`URL changed from ${oldUrl} to ${newUrl}`);
        // Could reset state or handle navigation here if needed
    }

    /**
     * Handle settings changed event
     */
    handleSettingsChanged(data) {
        Logger.debug('Settings changed:', data);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (!this.settings.SHOW_NOTIFICATIONS) {
            Logger.info(`[NOTIFICATION ${type.toUpperCase()}] ${message}`);
            return;
        }

        switch (type) {
            case 'success':
                Notification.success(message, {
                    duration: 3000,
                    position: 'top-center',
                    showProgress: true
                });
                break;
            case 'warning':
                Notification.warning(message, {
                    duration: 4000,
                    position: 'top-center',
                    showProgress: true
                });
                break;
            case 'error':
                Notification.error(message, {
                    duration: 5000,
                    position: 'top-center',
                    showProgress: true
                });
                break;
            case 'info':
            default:
                Notification.info(message, {
                    duration: 3000,
                    position: 'top-center',
                    showProgress: true
                });
                break;
        }
        
        Logger.info(`[NOTIFICATION ${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Initialize the enhancer when the page is ready
 */
function init() {
    Logger.info("Starting Meta AI Media Enhancer initialization");
    
    if (!window.location.hostname.includes('meta.ai') || !window.location.pathname.includes('/media')) {
        Logger.warn("Not on Meta AI Media page, script will not run");
        return;
    }

    new MetaAIMediaEnhancer();
}

// Start initialization
init();

