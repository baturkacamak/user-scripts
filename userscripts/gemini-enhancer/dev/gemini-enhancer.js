// Import core components
import {
    Button,
    HTMLUtils,
    Logger,
    Notification,
    SidebarPanel,
    StyleManager,
    TextArea,
    Tabs
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";

// Configure logger
Logger.setPrefix("Gemini Enhancer");
Logger.DEBUG = true;

/**
 * Gemini Enhancer
 * Queue system for prompts with support for text, image, and video generation
 */
class GeminiEnhancer {
    // Configuration
    static SELECTORS = {
        // Prompt textarea - supports English, Turkish, Spanish
        PROMPT_TEXTAREA: [
            'rich-textarea .ql-editor[contenteditable="true"]',
            'rich-textarea .ql-editor.textarea',
            'rich-textarea .ql-editor.textarea.new-input-ui',
            'div[contenteditable="true"][role="textbox"][aria-multiline="true"]',
            '.ql-editor[contenteditable="true"]'
        ],
        // Send button - ready state
        SEND_BUTTON: {
            READY: 'button.send-button.submit:not(.stop):not([aria-disabled="true"])',
            LOADING: 'button.send-button.stop',
            // Multi-language aria-label support
            READY_ALT: [
                'button[aria-label*="Mesaj gönder"]:not(.stop):not([aria-disabled="true"])', // Turkish
                'button[aria-label*="Send message"]:not(.stop):not([aria-disabled="true"])', // English
                'button[aria-label*="Enviar mensaje"]:not(.stop):not([aria-disabled="true"])', // Spanish
                'button.send-button:not(.stop):not([aria-disabled="true"])'
            ]
        },
        // Image generation button - multi-language
        IMAGE_BUTTON: [
            'intent-card button[jslog*="intent_chip_image"]', // Most reliable - uses jslog attribute
            'button[aria-label*="Resim Oluştur"]', // Turkish
            'button[aria-label*="Create image"]', // English
            'button[aria-label*="Crear imagen"]', // Spanish
            'button[aria-label*="Image"]',
            'button.card:has(.card-label:contains("Resim"))',
            'button.card:has(.card-label:contains("Image"))',
            'button.card:has(.card-label:contains("Imagen"))'
        ],
        // Video generation button - multi-language
        VIDEO_BUTTON: [
            'intent-card button[jslog*="intent_chip_video"]', // Most reliable - uses jslog attribute
            'button[aria-label*="Video oluşturun"]', // Turkish
            'button[aria-label*="Create video"]', // English
            'button[aria-label*="Crear video"]', // Spanish
            'button[aria-label*="Video"]',
            'button.card:has(.card-label:contains("Video"))'
        ]
    };

    static SETTINGS_KEYS = {
        PROMPTS_QUEUE: 'gemini-prompts-queue',
        GENERATION_TYPE: 'gemini-generation-type',
        QUEUE_DELAY: 'gemini-queue-delay',
        SHOW_NOTIFICATIONS: 'gemini-show-notifications',
        PANEL_POSITION: 'gemini-panel-position'
    };

    static DEFAULT_SETTINGS = {
        PROMPTS_QUEUE: '',
        GENERATION_TYPE: 'text', // 'text', 'image', 'video'
        QUEUE_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 }
    };

    constructor() {
        this.isQueueRunning = false;
        this.shouldStopQueue = false;
        this.currentPromptIndex = 0;
        this.prompts = [];
        this.settings = { ...GeminiEnhancer.DEFAULT_SETTINGS };
        this.sidebarPanel = null;
        this.enhancerId = 'gemini-enhancer-container';

        Logger.info("Initializing Gemini Enhancer");

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
     * Cleanup resources
     */
    cleanup() {
        if (this.isQueueRunning) {
            this.shouldStopQueue = true;
        }
        Logger.debug("Resources cleaned up");
    }

    /**
     * Load saved settings
     */
    async loadSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(GeminiEnhancer.SETTINGS_KEYS)) {
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
            for (const [settingName, storageKey] of Object.entries(GeminiEnhancer.SETTINGS_KEYS)) {
                await setValue(storageKey, this.settings[settingName]);
            }
            Logger.debug("Settings saved", this.settings);
        } catch (error) {
            Logger.error("Error saving settings:", error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (!this.settings.SHOW_NOTIFICATIONS) return;
        Notification.show(message, type);
    }

    /**
     * Wait for page to be ready
     */
    async waitForPageReady() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (document.readyState === 'complete' && document.body) {
                // Check if Gemini UI is loaded
                const textarea = this.findPromptTextarea();
                if (textarea) {
                    return true;
                }
            }
            await this.delay(200);
            attempts++;
        }
        
        Logger.warn("Page ready timeout, proceeding anyway");
        return true;
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
                Notification.initStyles();
                Notification.useDefaultColors();
                TextArea.initStyles();
                TextArea.useDefaultColors();
                Tabs.initStyles();
                Tabs.useDefaultColors();
            } catch (error) {
                Logger.error('Error initializing styles:', error);
            }

            StyleManager.addStyles(`
                .gemini-enhancer-panel {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                }
                .gemini-enhancer-panel textarea {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                }
                .generation-type-select {
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-bottom: 12px;
                }
                .queue-status {
                    padding: 8px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    margin-bottom: 12px;
                    font-size: 12px;
                    color: #333;
                }
            `);

            this.createUI();
            Logger.info("Gemini Enhancer initialized successfully");
        } catch (error) {
            Logger.error("Error during initialization:", error);
        }
    }

    /**
     * Create the UI
     */
    async createUI() {
        this.sidebarPanel = new SidebarPanel({
            id: 'gemini-enhancer-panel',
            title: '🚀 Gemini Enhancer',
            position: 'right',
            transition: 'slide',
            buttonIcon: '🚀',
            content: {
                generator: () => this.createPanelContent()
            },
            style: {
                width: '380px',
                buttonSize: '48px',
                buttonColor: '#fff',
                buttonBg: '#625df5',
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

        // Create tabs container
        const tabsContainer = document.createElement('div');
        
        this.tabs = new Tabs({
            tabs: [
                {
                    id: 'queue',
                    label: '📋 Queue',
                    content: () => this.createQueueSection()
                },
                {
                    id: 'settings',
                    label: '⚙️ Settings',
                    content: () => this.createSettingsSection()
                }
            ],
            defaultTab: 'queue',
            container: tabsContainer
        });

        content.appendChild(tabsContainer);

        return content;
    }

    /**
     * Create queue section
     */
    createQueueSection() {
        const container = document.createElement('div');
        container.style.padding = '12px';

        // Generation type selector
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Generation Type:';
        typeLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(typeLabel);

        const typeSelect = document.createElement('select');
        typeSelect.className = 'generation-type-select';
        
        // Create options using DOM methods to avoid TrustedHTML issues
        const textOption = document.createElement('option');
        textOption.value = 'text';
        textOption.textContent = 'Text Generation';
        typeSelect.appendChild(textOption);
        
        const imageOption = document.createElement('option');
        imageOption.value = 'image';
        imageOption.textContent = 'Image Generation';
        typeSelect.appendChild(imageOption);
        
        const videoOption = document.createElement('option');
        videoOption.value = 'video';
        videoOption.textContent = 'Video Generation';
        typeSelect.appendChild(videoOption);
        
        typeSelect.value = this.settings.GENERATION_TYPE || 'text';
        typeSelect.onchange = (e) => {
            this.settings.GENERATION_TYPE = e.target.value;
            this.saveSettings();
        };
        container.appendChild(typeSelect);
        this.generationTypeSelect = typeSelect;

        // Prompts textarea
        const promptsLabel = document.createElement('label');
        promptsLabel.textContent = 'Prompts (one per line):';
        promptsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(promptsLabel);

        this.promptsTextArea = new TextArea({
            value: this.settings.PROMPTS_QUEUE || '',
            placeholder: 'Enter prompts, one per line:\nFirst prompt\nSecond prompt\nThird prompt',
            rows: 10,
            onChange: (textArea) => {
                this.settings.PROMPTS_QUEUE = textArea.getValue();
                this.saveSettings();
            },
            container: container
        });

        // Queue status
        this.queueStatus = document.createElement('div');
        this.queueStatus.className = 'queue-status';
        this.queueStatus.textContent = 'Ready';
        container.appendChild(this.queueStatus);

        // Control buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 12px;';

        this.queueToggleButton = new Button({
            text: 'Start Queue',
            onClick: () => this.toggleQueue(),
            container: buttonContainer
        });

        container.appendChild(buttonContainer);

        return container;
    }

    /**
     * Create settings section
     */
    createSettingsSection() {
        const container = document.createElement('div');
        container.style.padding = '12px';

        // Queue delay
        const delayLabel = document.createElement('label');
        delayLabel.textContent = 'Delay between prompts (ms):';
        delayLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';
        container.appendChild(delayLabel);

        const delayInput = document.createElement('input');
        delayInput.type = 'number';
        delayInput.min = '500';
        delayInput.max = '10000';
        delayInput.step = '100';
        delayInput.value = this.settings.QUEUE_DELAY || 2000;
        delayInput.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-bottom: 12px;';
        delayInput.onchange = (e) => {
            this.settings.QUEUE_DELAY = parseInt(e.target.value, 10);
            this.saveSettings();
        };
        container.appendChild(delayInput);

        // Show notifications checkbox
        const notificationsCheckbox = document.createElement('input');
        notificationsCheckbox.type = 'checkbox';
        notificationsCheckbox.checked = this.settings.SHOW_NOTIFICATIONS !== false;
        notificationsCheckbox.onchange = (e) => {
            this.settings.SHOW_NOTIFICATIONS = e.target.checked;
            this.saveSettings();
        };
        const notificationsLabel = document.createElement('label');
        notificationsLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 12px; color: #555; margin-top: 12px;';
        notificationsLabel.appendChild(notificationsCheckbox);
        notificationsLabel.appendChild(document.createTextNode('Show notifications'));
        container.appendChild(notificationsLabel);

        return container;
    }

    /**
     * Toggle queue
     */
    async toggleQueue() {
        if (this.isQueueRunning) {
            this.stopQueue();
        } else {
            await this.startQueue();
        }
    }

    /**
     * Start queue
     */
    async startQueue() {
        if (this.isQueueRunning) {
            this.showNotification('Queue is already running', 'warning');
            return;
        }

        // Get prompts from textarea
        const promptsText = this.promptsTextArea.getValue().trim();
        if (!promptsText) {
            this.showNotification('Please enter at least one prompt', 'warning');
            return;
        }

        // Parse prompts (one per line)
        this.prompts = promptsText.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (this.prompts.length === 0) {
            this.showNotification('No valid prompts found', 'warning');
            return;
        }

        this.isQueueRunning = true;
        this.shouldStopQueue = false;
        this.currentPromptIndex = 0;

        this.updateQueueStatus();
        this.queueToggleButton.setText('Stop Queue');

        Logger.info(`Starting queue with ${this.prompts.length} prompts`);
        this.showNotification(`Starting queue with ${this.prompts.length} prompts`, 'info');

        try {
            await this.processQueue();
            
            if (!this.shouldStopQueue) {
                this.showNotification('Queue completed successfully', 'success');
                Logger.success('Queue completed successfully');
            }
        } catch (error) {
            Logger.error('Queue error:', error);
            this.showNotification(`Queue error: ${error.message}`, 'error');
        } finally {
            this.isQueueRunning = false;
            this.shouldStopQueue = false;
            this.currentPromptIndex = 0;
            this.updateQueueStatus();
            this.queueToggleButton.setText('Start Queue');
        }
    }

    /**
     * Stop queue
     */
    stopQueue() {
        if (!this.isQueueRunning) {
            return;
        }

        Logger.info('Stopping queue');
        this.shouldStopQueue = true;
        this.showNotification('Stopping queue...', 'info');
    }

    /**
     * Process queue
     */
    async processQueue() {
        const generationType = this.settings.GENERATION_TYPE || 'text';

        for (let i = 0; i < this.prompts.length; i++) {
            if (this.shouldStopQueue) {
                Logger.info('Queue stopped by user');
                break;
            }

            this.currentPromptIndex = i + 1;
            this.updateQueueStatus();

            await this.processPrompt(this.prompts[i], generationType);

            // Add delay between prompts (except for the last one)
            if (i < this.prompts.length - 1 && !this.shouldStopQueue) {
                await this.delay(this.settings.QUEUE_DELAY || 2000);
            }
        }

        Logger.info('All prompts processed');
    }

    /**
     * Process a single prompt
     */
    async processPrompt(prompt, generationType) {
        Logger.info(`Processing prompt ${this.currentPromptIndex}/${this.prompts.length} (${generationType})`);

        try {
            // For image and video, click the appropriate button first
            if (generationType === 'image') {
                await this.clickImageButton();
                await this.delay(500); // Wait for UI to update
            } else if (generationType === 'video') {
                await this.clickVideoButton();
                await this.delay(500); // Wait for UI to update
            }

            // Type the prompt
            await this.typePrompt(prompt);
            
            // Small delay to let the UI settle
            await this.delay(300);
            
            // Click send button (for all types)
            await this.clickSendButton();
            
            // Wait for completion
            await this.waitForCompletion();
            
            Logger.success(`Prompt ${this.currentPromptIndex} completed`);
        } catch (error) {
            Logger.error(`Error on prompt ${this.currentPromptIndex}:`, error.message);
            throw error;
        }
    }

    /**
     * Find prompt textarea
     */
    findPromptTextarea() {
        for (const selector of GeminiEnhancer.SELECTORS.PROMPT_TEXTAREA) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    }

    /**
     * Type prompt into textarea
     */
    async typePrompt(prompt) {
        const textarea = this.findPromptTextarea();
        if (!textarea) {
            throw new Error("Prompt textarea not found");
        }

        try {
            textarea.focus();
            
            // Clear existing content
            textarea.textContent = '';
            textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
            await this.delay(100);

            // Set new content
            textarea.textContent = prompt;
            textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            
            Logger.debug(`Typed prompt: "${prompt.substring(0, 50)}..."`);
        } catch (error) {
            throw new Error("Typing failed: " + error.message);
        }
    }

    /**
     * Click image generation button
     */
    async clickImageButton(retries = 10) {
        for (let attempt = 0; attempt < retries; attempt++) {
            for (const selector of GeminiEnhancer.SELECTORS.IMAGE_BUTTON) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    // Scroll button into view if needed
                    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await this.delay(300);
                    
                    button.click();
                    Logger.debug(`Clicked image button using selector: ${selector}`);
                    await this.delay(200);
                    return;
                }
            }
            
            if (attempt < retries - 1) {
                Logger.debug(`Waiting for image button... (attempt ${attempt + 1}/${retries})`);
                await this.delay(500);
            }
        }
        
        throw new Error("Image button not found. Make sure the image generation option is visible on the page.");
    }

    /**
     * Click video generation button
     */
    async clickVideoButton(retries = 10) {
        for (let attempt = 0; attempt < retries; attempt++) {
            for (const selector of GeminiEnhancer.SELECTORS.VIDEO_BUTTON) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    // Scroll button into view if needed
                    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await this.delay(300);
                    
                    button.click();
                    Logger.debug(`Clicked video button using selector: ${selector}`);
                    await this.delay(200);
                    return;
                }
            }
            
            if (attempt < retries - 1) {
                Logger.debug(`Waiting for video button... (attempt ${attempt + 1}/${retries})`);
                await this.delay(500);
            }
        }
        
        throw new Error("Video button not found. Make sure the video generation option is visible on the page.");
    }

    /**
     * Click send button
     */
    async clickSendButton(retries = 20) {
        const selectors = [
            GeminiEnhancer.SELECTORS.SEND_BUTTON.READY,
            ...GeminiEnhancer.SELECTORS.SEND_BUTTON.READY_ALT
        ];

        for (let attempt = 0; attempt < retries; attempt++) {
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    const isDisabled = button.hasAttribute('disabled') || 
                                     button.getAttribute('aria-disabled') === 'true' ||
                                     button.classList.contains('stop');
                    
                    if (!isDisabled) {
                        button.click();
                        Logger.debug(`Clicked send button using selector: ${selector}`);
                        await this.delay(200);
                        return;
                    }
                }
            }
            
            if (attempt < retries - 1) {
                Logger.debug(`Waiting for send button... (attempt ${attempt + 1}/${retries})`);
                await this.delay(500);
            }
        }
        
        throw new Error("Send button not found or not ready");
    }

    /**
     * Wait for completion
     */
    async waitForCompletion(timeout = 300000) {
        const start = Date.now();
        
        Logger.debug("Waiting for generation to start...");
        
        // Wait for button to change to loading state
        let loadingDetected = false;
        while (Date.now() - start < timeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }

            const loadingButton = document.querySelector(GeminiEnhancer.SELECTORS.SEND_BUTTON.LOADING);
            if (loadingButton && loadingButton.offsetParent !== null) {
                loadingDetected = true;
                Logger.debug("Generation started (loading state detected)");
                break;
            }
            
            await this.delay(200);
        }

        if (!loadingDetected) {
            throw new Error("Generation did not start within timeout");
        }

        // Wait for button to return to ready state
        Logger.debug("Waiting for generation to complete...");
        while (Date.now() - start < timeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }

            // Check if button is back to ready state
            const readyButton = document.querySelector(GeminiEnhancer.SELECTORS.SEND_BUTTON.READY);
            if (readyButton && readyButton.offsetParent !== null) {
                const isDisabled = readyButton.hasAttribute('disabled') || 
                                 readyButton.getAttribute('aria-disabled') === 'true';
                if (!isDisabled) {
                    Logger.debug("Generation completed");
                    await this.delay(1000); // Extra delay to ensure response is fully rendered
                    return;
                }
            }

            // Also check alternative selectors
            for (const selector of GeminiEnhancer.SELECTORS.SEND_BUTTON.READY_ALT) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    const isDisabled = button.hasAttribute('disabled') || 
                                     button.getAttribute('aria-disabled') === 'true' ||
                                     button.classList.contains('stop');
                    if (!isDisabled) {
                        Logger.debug("Generation completed (alternative selector)");
                        await this.delay(1000);
                        return;
                    }
                }
            }
            
            await this.delay(500);
        }
        
        throw new Error("Generation did not complete within timeout");
    }

    /**
     * Update queue status
     */
    updateQueueStatus() {
        if (!this.queueStatus) return;

        if (this.isQueueRunning) {
            const total = this.prompts.length;
            const current = this.currentPromptIndex;
            const type = this.settings.GENERATION_TYPE || 'text';
            this.queueStatus.textContent = `Processing: ${current}/${total} (${type})`;
            this.queueStatus.style.background = '#e3f2fd';
        } else {
            this.queueStatus.textContent = 'Ready';
            this.queueStatus.style.background = '#f5f5f5';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GeminiEnhancer();
    });
} else {
    new GeminiEnhancer();
}

