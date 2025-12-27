// Import core components
import {
    Button,
    FormStatePersistence,
    HTMLUtils,
    Logger,
    MouseEventUtils,
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
        // Note: For existing chats, buttons are in mat-action-list
        IMAGE_BUTTON: [
            'intent-card button[jslog*="intent_chip_image"]', // New chat - uses jslog attribute
            'button[aria-label*="Resim Oluştur"]', // Turkish
            'button[aria-label*="Görüntü oluşturun"]', // Turkish (existing chat)
            'button[aria-label*="Create image"]', // English
            'button[aria-label*="Crear imagen"]', // Spanish
            'button[aria-label*="Image"]'
        ],
        // Video generation button - multi-language
        // Note: For existing chats, buttons are in mat-action-list
        VIDEO_BUTTON: [
            'intent-card button[jslog*="intent_chip_video"]', // New chat - uses jslog attribute
            'button[aria-label*="Video oluşturun"]', // Turkish
            'button[aria-label*="Create video"]', // English
            'button[aria-label*="Crear video"]', // Spanish
            'button[aria-label*="Video"]'
        ],
        // Selectors for existing chat buttons (in mat-action-list)
        EXISTING_CHAT_CONTAINER: 'mat-action-list',
        // Toolbox drawer button that opens the menu with image/video buttons
        TOOLBOX_DRAWER_BUTTON: [
            'button.toolbox-drawer-button',
            'button[aria-label*="Araçlar"]', // Turkish
            'button[aria-label*="Tools"]', // English
            'button[aria-label*="Herramientas"]' // Spanish
        ],
        // Buttons inside the toolbox drawer
        TOOLBOX_DRAWER_BUTTONS: 'mat-action-list button.toolbox-drawer-item-list-button, mat-action-list button.mat-mdc-list-item',
        // Deselect buttons that appear when image/video is already selected
        IMAGE_DESELECT_BUTTON: 'button.toolbox-drawer-item-deselect-button:has(.toolbox-drawer-item-deselect-button-label)',
        VIDEO_DESELECT_BUTTON: 'button.toolbox-drawer-item-deselect-button',
        // Download image button
        DOWNLOAD_IMAGE_BUTTON: [
            'download-generated-image-button button[data-test-id="download-generated-image-button"]',
            'button[aria-label*="Tam boyutlu resmi indir"]', // Turkish
            'button[aria-label*="Download full size"]', // English
            'button[aria-label*="Descargar tamaño completo"]', // Spanish
            'button.generated-image-button',
            'download-generated-image-button button'
        ]
    };

    static SETTINGS_KEYS = {
        PROMPTS_QUEUE: 'gemini-prompts-queue',
        GENERATION_TYPE: 'gemini-generation-type',
        QUEUE_DELAY: 'gemini-queue-delay',
        SHOW_NOTIFICATIONS: 'gemini-show-notifications',
        PANEL_POSITION: 'gemini-panel-position',
        AUTO_DOWNLOAD_IMAGES: 'gemini-auto-download-images'
    };

    static DEFAULT_SETTINGS = {
        PROMPTS_QUEUE: '',
        GENERATION_TYPE: 'text', // 'text', 'image', 'video'
        QUEUE_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_DOWNLOAD_IMAGES: false
    };

    constructor() {
        // This check must be the first line
        if (window.GeminiEnhancerInstance) {
            console.warn("⚠️ [Gemini Enhancer] Instance already exists. Killing duplicate.");
            return; 
        }
        window.GeminiEnhancerInstance = this;

        this.isQueueRunning = false;
        this.shouldStopQueue = false;
        this.currentPromptIndex = 0;
        this.prompts = [];
        this.settings = { ...GeminiEnhancer.DEFAULT_SETTINGS };
        this.sidebarPanel = null;
        this.enhancerId = 'gemini-enhancer-container';
        this.formStatePersistence = null;

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
        // Use the correct Notification API
        if (type === 'error') {
            Notification.error(message);
        } else if (type === 'success') {
            Notification.success(message);
        } else if (type === 'warning') {
            Notification.warning(message);
        } else {
            Notification.info(message);
        }
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
            this.setupFormStatePersistence();
            Logger.info("Gemini Enhancer initialized successfully");
        } catch (error) {
            Logger.error("Error during initialization:", error);
        }
    }

    /**
     * Setup form state persistence for prompts textarea
     */
    setupFormStatePersistence() {
        if (!this.promptsTextArea) {
            Logger.warn("Prompts textarea not available for persistence");
            return;
        }

        // Wait a bit for textarea to be fully initialized
        setTimeout(() => {
            try {
                const containerElement = this.promptsTextArea.getElement();
                if (!containerElement) {
                    Logger.warn("Textarea container element not found");
                    return;
                }

                // Find the actual textarea element inside the container
                const textareaElement = containerElement.querySelector('textarea');
                if (!textareaElement) {
                    Logger.warn("Textarea element not found in container");
                    return;
                }

                this.formStatePersistence = new FormStatePersistence({
                    namespace: 'gemini-enhancer',
                    fields: {
                        prompts: {
                            selector: () => textareaElement,
                            type: 'textarea',
                            defaultValue: '',
                            validator: null
                        }
                    },
                    getValue: getValue,
                    setValue: setValue,
                    autoSave: true,
                    debounceDelay: 500,
                    name: 'Gemini Enhancer Prompts'
                });

                Logger.debug("Form state persistence setup complete");
            } catch (error) {
                Logger.error("Error setting up form state persistence:", error);
            }
        }, 1000);
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
        promptsLabel.textContent = 'Prompts (separated by ---):';
        promptsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(promptsLabel);

        const separatorInfo = document.createElement('div');
        separatorInfo.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;';
        separatorInfo.textContent = 'Separator: Use --- (three dashes) to separate prompts.';
        container.appendChild(separatorInfo);

        this.promptsTextArea = new TextArea({
            value: this.settings.PROMPTS_QUEUE || '',
            placeholder: 'Enter prompts separated by ---:\nFirst prompt\n---\nSecond prompt\n---\nThird prompt',
            rows: 10,
            onChange: (textArea) => {
                // FormStatePersistence will handle saving, but we also save to settings for compatibility
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
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 12px;';

        const queueButtonRow = document.createElement('div');
        queueButtonRow.style.cssText = 'display: flex; gap: 8px;';

        this.queueToggleButton = new Button({
            text: 'Start Queue',
            onClick: () => this.toggleQueue(),
            container: queueButtonRow
        });

        this.queueWithDownloadButton = new Button({
            text: 'Start Queue & Download Images',
            onClick: () => this.startQueueWithDownload(),
            container: queueButtonRow
        });

        buttonContainer.appendChild(queueButtonRow);

        this.downloadAllImagesButton = new Button({
            text: 'Download All Images',
            onClick: () => this.downloadAllImages(),
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
     * Start queue with auto-download enabled
     */
    async startQueueWithDownload() {
        if (this.isQueueRunning) {
            this.showNotification('Queue is already running', 'warning');
            return;
        }

        // Temporarily enable auto-download
        const originalAutoDownload = this.settings.AUTO_DOWNLOAD_IMAGES;
        this.settings.AUTO_DOWNLOAD_IMAGES = true;

        try {
            await this.startQueue();
        } finally {
            // Restore original setting
            this.settings.AUTO_DOWNLOAD_IMAGES = originalAutoDownload;
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

        // Parse prompts (separated by ---)
        this.prompts = promptsText.split('---')
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
            
            // Download image if auto-download is enabled and generation type is image
            if (this.settings.AUTO_DOWNLOAD_IMAGES && generationType === 'image') {
                await this.delay(2000); // Wait a bit for image to render
                // Only download the newly generated image (the last one)
                const downloadContainers = this.findAllDownloadButtons();
                if (downloadContainers.length > 0) {
                    // Download the last container (most recent image)
                    const lastContainer = downloadContainers[downloadContainers.length - 1];
                    await this.downloadSingleImage(lastContainer, 0, 1);
                }
            }
            
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
     * Check if toolbox drawer is actually open (has visible buttons)
     */
    isToolboxDrawerOpen() {
        const buttons = document.querySelectorAll(GeminiEnhancer.SELECTORS.TOOLBOX_DRAWER_BUTTONS);
        const visibleButtons = Array.from(buttons).filter(btn => btn.offsetParent !== null);
        Logger.debug(`Toolbox drawer check: found ${buttons.length} total buttons, ${visibleButtons.length} visible`);
        return visibleButtons.length > 0;
    }

    /**
     * Open toolbox drawer if needed (for existing chats)
     */
    async openToolboxDrawer() {
        Logger.debug("Checking if toolbox drawer needs to be opened...");
        
        // Check if drawer is actually open by looking for visible buttons
        if (this.isToolboxDrawerOpen()) {
            Logger.debug("Toolbox drawer is already open (buttons visible)");
            return true;
        }

        Logger.debug("Toolbox drawer is not open, searching for toolbox drawer button...");

        // Try to find and click the toolbox drawer button
        for (const selector of GeminiEnhancer.SELECTORS.TOOLBOX_DRAWER_BUTTON) {
            const button = document.querySelector(selector);
            Logger.debug(`Trying selector: ${selector}, found: ${!!button}, visible: ${button && button.offsetParent !== null}`);
            
            if (button && button.offsetParent !== null) {
                Logger.debug(`Found toolbox drawer button with selector: ${selector}`);
                button.click();
                Logger.debug(`Clicked toolbox drawer button using selector: ${selector}`);
                
                // Wait for the drawer to open
                await this.delay(1000);
                
                // Verify it opened by checking for visible buttons - try multiple times
                for (let i = 0; i < 10; i++) {
                    if (this.isToolboxDrawerOpen()) {
                        Logger.debug("Toolbox drawer opened successfully");
                        return true;
                    }
                    await this.delay(200);
                }
                
                Logger.warn("Toolbox drawer button clicked but drawer did not open");
            }
        }
        
        Logger.warn("Toolbox drawer button not found");
        return false;
    }

    /**
     * Find image button in existing chat (mat-action-list)
     */
    async findImageButtonInExistingChat() {
        Logger.debug("Searching for image button in existing chat...");
        
        // First, try to open the toolbox drawer if needed
        const drawerOpened = await this.openToolboxDrawer();
        if (!drawerOpened) {
            Logger.debug("Could not open toolbox drawer, trying to find button anyway...");
        }
        
        // Search for buttons with image-related text - use the selector directly
        const buttons = document.querySelectorAll(GeminiEnhancer.SELECTORS.TOOLBOX_DRAWER_BUTTONS);
        Logger.debug(`Found ${buttons.length} total buttons in toolbox drawer`);
        
        // Filter to only visible buttons
        const visibleButtons = Array.from(buttons).filter(btn => btn.offsetParent !== null);
        Logger.debug(`Found ${visibleButtons.length} visible buttons in toolbox drawer`);
        
        for (const button of visibleButtons) {
            // Try multiple ways to find the label
            let label = button.querySelector('.label.gds-label-l');
            if (!label) {
                label = button.querySelector('.label');
            }
            if (!label) {
                // Try to get text from the button itself or its content
                const textContent = button.textContent || button.innerText || '';
                const text = textContent.trim().toLowerCase();
                Logger.debug(`Checking button (no label found): "${textContent.trim().substring(0, 50)}"`);
                
                if (text.includes('görüntü') || 
                    text.includes('resim') || 
                    text.includes('image') || 
                    text.includes('imagen')) {
                    Logger.debug(`Found image button by text content: "${textContent.trim()}"`);
                    return button;
                }
                continue;
            }
            
            const text = label.textContent.trim().toLowerCase();
            Logger.debug(`Checking button with label: "${label.textContent.trim()}"`);
            
            // Check for image-related text in multiple languages
            if (text.includes('görüntü') || 
                text.includes('resim') || 
                text.includes('image') || 
                text.includes('imagen')) {
                Logger.debug(`Found image button: "${label.textContent.trim()}"`);
                return button;
            }
        }
        
        Logger.debug("Image button not found in existing chat");
        return null;
    }

    /**
     * Check if image generation is already selected
     */
    isImageSelected() {
        // Check for deselect button with image-related text
        const deselectButtons = document.querySelectorAll('button.toolbox-drawer-item-deselect-button');
        for (const button of deselectButtons) {
            if (button.offsetParent === null) continue;
            
            const label = button.querySelector('.toolbox-drawer-item-deselect-button-label');
            if (label) {
                const text = label.textContent.trim().toLowerCase();
                if (text.includes('resim') || 
                    text.includes('görüntü') || 
                    text.includes('image') || 
                    text.includes('imagen')) {
                    Logger.debug("Image generation is already selected");
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Click image generation button
     */
    async clickImageButton(retries = 10) {
        // Check if image is already selected
        if (this.isImageSelected()) {
            Logger.debug("Image generation already selected, skipping button click");
            return;
        }

        for (let attempt = 0; attempt < retries; attempt++) {
            // First try standard selectors (new chat)
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
            
            // Try finding in existing chat (mat-action-list)
            const existingChatButton = await this.findImageButtonInExistingChat();
            if (existingChatButton && existingChatButton.offsetParent !== null) {
                existingChatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.delay(300);
                
                existingChatButton.click();
                Logger.debug('Clicked image button in existing chat');
                await this.delay(200);
                return;
            }
            
            if (attempt < retries - 1) {
                Logger.debug(`Waiting for image button... (attempt ${attempt + 1}/${retries})`);
                await this.delay(500);
            }
        }
        
        throw new Error("Image button not found. Make sure the image generation option is visible on the page.");
    }

    /**
     * Find video button in existing chat (mat-action-list)
     */
    async findVideoButtonInExistingChat() {
        Logger.debug("Searching for video button in existing chat...");
        
        // First, try to open the toolbox drawer if needed
        const drawerOpened = await this.openToolboxDrawer();
        if (!drawerOpened) {
            Logger.debug("Could not open toolbox drawer, trying to find button anyway...");
        }
        
        // Search for buttons with video-related text - use the selector directly
        const buttons = document.querySelectorAll(GeminiEnhancer.SELECTORS.TOOLBOX_DRAWER_BUTTONS);
        Logger.debug(`Found ${buttons.length} total buttons in toolbox drawer`);
        
        // Filter to only visible buttons
        const visibleButtons = Array.from(buttons).filter(btn => btn.offsetParent !== null);
        Logger.debug(`Found ${visibleButtons.length} visible buttons in toolbox drawer`);
        
        for (const button of visibleButtons) {
            // Try multiple ways to find the label
            let label = button.querySelector('.label.gds-label-l');
            if (!label) {
                label = button.querySelector('.label');
            }
            if (!label) {
                // Try to get text from the button itself or its content
                const textContent = button.textContent || button.innerText || '';
                const text = textContent.trim().toLowerCase();
                Logger.debug(`Checking button (no label found): "${textContent.trim().substring(0, 50)}"`);
                
                if (text.includes('video') || 
                    text.includes('veo')) {
                    Logger.debug(`Found video button by text content: "${textContent.trim()}"`);
                    return button;
                }
                continue;
            }
            
            const text = label.textContent.trim().toLowerCase();
            Logger.debug(`Checking button with label: "${label.textContent.trim()}"`);
            
            // Check for video-related text in multiple languages
            if (text.includes('video') || 
                text.includes('veo')) {
                Logger.debug(`Found video button: "${label.textContent.trim()}"`);
                return button;
            }
        }
        
        Logger.debug("Video button not found in existing chat");
        return null;
    }

    /**
     * Check if video generation is already selected
     */
    isVideoSelected() {
        // Check for deselect button with video-related text
        const deselectButtons = document.querySelectorAll('button.toolbox-drawer-item-deselect-button');
        for (const button of deselectButtons) {
            if (button.offsetParent === null) continue;
            
            const label = button.querySelector('.toolbox-drawer-item-deselect-button-label');
            if (label) {
                const text = label.textContent.trim().toLowerCase();
                if (text.includes('video') || 
                    text.includes('veo')) {
                    Logger.debug("Video generation is already selected");
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Click video generation button
     */
    async clickVideoButton(retries = 10) {
        // Check if video is already selected
        if (this.isVideoSelected()) {
            Logger.debug("Video generation already selected, skipping button click");
            return;
        }

        for (let attempt = 0; attempt < retries; attempt++) {
            // First try standard selectors (new chat)
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
            
            // Try finding in existing chat (mat-action-list)
            const existingChatButton = await this.findVideoButtonInExistingChat();
            if (existingChatButton && existingChatButton.offsetParent !== null) {
                existingChatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.delay(300);
                
                existingChatButton.click();
                Logger.debug('Clicked video button in existing chat');
                await this.delay(200);
                return;
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
     * Check if send button is in loading state
     */
    isButtonLoading() {
        // Find any send button
        const sendButton = document.querySelector('button.send-button');
        if (!sendButton || sendButton.offsetParent === null) {
            return false;
        }

        // Check if it has the stop class (loading state)
        const hasStopClass = sendButton.classList.contains('stop');
        
        // Also check if it doesn't have submit class (alternative loading indicator)
        const hasSubmitClass = sendButton.classList.contains('submit');
        
        // Button is loading if it has stop class OR doesn't have submit class
        return hasStopClass || !hasSubmitClass;
    }

    /**
     * Check if send button is in ready state
     */
    isButtonReady() {
        // Find any send button
        const sendButton = document.querySelector('button.send-button');
        if (!sendButton || sendButton.offsetParent === null) {
            return false;
        }

        // Check if disabled
        const isDisabled = sendButton.hasAttribute('disabled') || 
                          sendButton.getAttribute('aria-disabled') === 'true';
        
        // Check classes
        const hasStopClass = sendButton.classList.contains('stop');
        const hasSubmitClass = sendButton.classList.contains('submit');
        
        // Button is ready if: not disabled, has submit class, and doesn't have stop class
        return !isDisabled && hasSubmitClass && !hasStopClass;
    }

    /**
     * Wait for completion
     */
    async waitForCompletion(timeout = 300000) {
        const start = Date.now();
        const loadingTimeout = 10000; // 10 seconds to detect loading state
        
        Logger.debug("Waiting for generation to start...");
        
        // Wait for button to change to loading state
        let loadingDetected = false;
        const loadingStartTime = Date.now();
        while (Date.now() - loadingStartTime < loadingTimeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }

            if (this.isButtonLoading()) {
                loadingDetected = true;
                Logger.debug("Generation started (loading state detected)");
                break;
            }
            
            await this.delay(200);
        }

        if (!loadingDetected) {
            Logger.warn("Loading state not detected, but continuing anyway...");
            // Don't throw error, just continue - sometimes the button state changes too quickly
        }

        // Wait for loading state to disappear (button no longer has stop class)
        Logger.debug("Waiting for generation to complete (checking if loading button is gone)...");
        let lastLogTime = 0;
        while (Date.now() - start < timeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }

            // Check if loading state is gone (button no longer has stop class)
            if (!this.isButtonLoading()) {
                Logger.debug("Generation completed - loading button is gone");
                await this.delay(1500); // Extra delay to ensure response is fully rendered
                return;
            }

            // Log progress every 5 seconds
            const elapsed = Date.now() - start;
            if (elapsed - lastLogTime > 5000) {
                lastLogTime = elapsed;
                const sendButton = document.querySelector('button.send-button');
                if (sendButton) {
                    const isStop = sendButton.classList.contains('stop');
                    Logger.debug(`Still waiting... (${Math.round(elapsed / 1000)}s) - Button has stop class: ${isStop}, classes: ${sendButton.className}`);
                } else {
                    Logger.debug(`Still waiting... (${Math.round(elapsed / 1000)}s) - Send button not found`);
                }
            }
            
            await this.delay(300);
        }
        
        throw new Error("Generation did not complete within timeout");
    }

    /**
     * Find all download button containers
     */
    findAllDownloadButtons() {
        const downloadContainers = [];
        
        // Find all download-generated-image-button containers
        for (const selector of GeminiEnhancer.SELECTORS.DOWNLOAD_IMAGE_BUTTON) {
            const containers = document.querySelectorAll(selector);
            for (const container of containers) {
                // Check if the container is visible (part of a visible image)
                if (container.offsetParent !== null && !downloadContainers.includes(container)) {
                    downloadContainers.push(container);
                }
            }
        }
        
        return downloadContainers;
    }

    /**
     * Get the download button from a container
     */
    getDownloadButtonFromContainer(container) {
        return container.querySelector('button[data-test-id="download-generated-image-button"]');
    }

    /**
     * Wait for menu to open and find download link
     * Material menus are attached to body, so we need to find the overlay panel
     */
    async waitForMenuAndFindDownloadLink(button, timeout = 5000) {
        const start = Date.now();
        const buttonRect = button.getBoundingClientRect();
        
        while (Date.now() - start < timeout) {
            // Material menus are typically in overlay panels attached to body
            // Look for the menu panel that's currently visible
            const menuPanels = document.querySelectorAll('.cdk-overlay-pane, .mat-mdc-menu-panel, [role="menu"]');
            
            let closestMenu = null;
            let closestDistance = Infinity;
            
            for (const menuPanel of menuPanels) {
                // Check if this menu panel is visible
                if (menuPanel.offsetParent === null) {
                    continue;
                }
                
                // Check if menu has download links
                const menuItems = menuPanel.querySelectorAll('a[href], button[href], a[download], button[download]');
                if (menuItems.length > 0) {
                    // Verify this menu is associated with our button by checking if it's near the button
                    const menuRect = menuPanel.getBoundingClientRect();
                    
                    // Calculate distance from button to menu
                    const distanceX = Math.abs(menuRect.left - buttonRect.right);
                    const distanceY = Math.abs(menuRect.top - buttonRect.bottom);
                    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                    
                    // Find the closest menu (should be the one we just opened)
                    if (distance < closestDistance && distance < 300) {
                        closestDistance = distance;
                        closestMenu = menuItems[0];
                    }
                }
            }
            
            if (closestMenu) {
                Logger.debug(`Found menu with download link, distance: ${Math.round(closestDistance)}px`);
                return closestMenu;
            }
            
            // Also check for menu inside container (fallback)
            const container = button.closest('download-generated-image-button');
            if (container) {
                const menu = container.querySelector('mat-menu');
                if (menu) {
                    const menuItems = menu.querySelectorAll('a[href], button[href], a[download], button[download]');
                    if (menuItems.length > 0) {
                        Logger.debug(`Found menu inside container with ${menuItems.length} items`);
                        return menuItems[0];
                    }
                }
            }
            
            await this.delay(200);
        }
        
        Logger.warn("Menu not found or no download link in menu");
        return null;
    }

    /**
     * Check if download button is in active/loading state (has active class or spinner)
     */
    isDownloadButtonActive(button) {
        if (!button || button.offsetParent === null) {
            return false;
        }
        
        // Check for active class
        const hasActiveClass = button.classList.contains('active');
        
        // Check for spinner
        const hasSpinner = button.querySelector('mat-spinner') !== null;
        
        return hasActiveClass || hasSpinner;
    }

    /**
     * Wait for download to complete by monitoring the button state
     */
    async waitForDownloadComplete(button, timeout = 30000) {
        const start = Date.now();
        const initialHasActive = this.isDownloadButtonActive(button);
        
        Logger.debug("Waiting for download to start...");
        
        // Wait for button to become active (download started)
        let downloadStarted = false;
        while (Date.now() - start < timeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }
            
            const isActive = this.isDownloadButtonActive(button);
            
            // Check if button became active (download started)
            if (isActive && !initialHasActive) {
                downloadStarted = true;
                Logger.debug("Download started (button is active with spinner)");
                break;
            }
            
            // Also check if button is no longer visible
            if (button.offsetParent === null) {
                downloadStarted = true;
                Logger.debug("Download started (button no longer visible)");
                break;
            }
            
            await this.delay(200);
        }
        
        if (!downloadStarted) {
            Logger.warn("Download start not detected, but continuing...");
        }
        
        // Wait for download to complete - button should return to normal state (no active class, no spinner)
        Logger.debug("Waiting for download to complete...");
        const completionStart = Date.now();
        
        while (Date.now() - completionStart < timeout) {
            if (this.shouldStopQueue) {
                throw new Error("Queue stopped by user");
            }
            
            // Check if button is visible
            if (button.offsetParent !== null) {
                const isActive = this.isDownloadButtonActive(button);
                
                // Download completed when button is no longer active
                if (!isActive) {
                    Logger.debug("Download completed (button returned to normal state)");
                    await this.delay(1000); // Extra delay to ensure download is fully processed
                    return true;
                }
            } else {
                // Button not visible - wait a bit and assume download completed
                await this.delay(2000);
                Logger.debug("Download completed (button no longer visible)");
                return true;
            }
            
            await this.delay(300);
        }
        
        Logger.warn("Download completion timeout, but continuing...");
        await this.delay(2000); // Extra delay before next download
        return true;
    }

    /**
     * Create a PointerEvent with full coordinate and property support
     * Angular heavily uses PointerEvents for state tracking
     */
    createPointerEvent(type, element, options = {}) {
        const rect = element.getBoundingClientRect();
        const centerX = options.clientX ?? (rect.left + rect.width / 2);
        const centerY = options.clientY ?? (rect.top + rect.height / 2);

        const eventOptions = {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: centerX,
            clientY: centerY,
            screenX: centerX + (window.screenX || 0),
            screenY: centerY + (window.screenY || 0),
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            width: 1,
            height: 1,
            pressure: type === 'pointerdown' ? 0.5 : 0,
            tangentialPressure: 0,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
            button: options.button ?? 0,
            buttons: type === 'pointerdown' ? 1 : 0,
            relatedTarget: options.relatedTarget ?? null,
            ...options
        };

        return new PointerEvent(type, eventOptions);
    }

    /**
     * Create a MouseEvent with full coordinate and property support
     */
    createMouseEvent(type, element, options = {}) {
        const rect = element.getBoundingClientRect();
        const centerX = options.clientX ?? (rect.left + rect.width / 2);
        const centerY = options.clientY ?? (rect.top + rect.height / 2);

        const eventOptions = {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: centerX,
            clientY: centerY,
            screenX: centerX + (window.screenX || 0),
            screenY: centerY + (window.screenY || 0),
            button: options.button ?? 0,
            buttons: type.includes('down') ? 1 : 0,
            relatedTarget: options.relatedTarget ?? null,
            ...options
        };

        return new MouseEvent(type, eventOptions);
    }

    /**
     * Simulate a complete user hover interaction sequence
     * This dispatches both PointerEvents and MouseEvents to ensure Angular state updates
     */
    async simulateCompleteHover(element, options = {}) {
        if (!element) return;

        const { delay: delayBetweenEvents = 50, focusElement = false } = options;

        // Scroll element into view first
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.delay(200);

        // Dispatch pointer events (Angular listens for these)
        element.dispatchEvent(this.createPointerEvent('pointerover', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createPointerEvent('pointerenter', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createPointerEvent('pointermove', element));
        await this.delay(delayBetweenEvents);

        // Dispatch mouse events (for compatibility)
        element.dispatchEvent(this.createMouseEvent('mouseover', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createMouseEvent('mouseenter', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createMouseEvent('mousemove', element));
        await this.delay(delayBetweenEvents);

        // Optionally focus the element to trigger Angular's focus-based state
        if (focusElement && element.focus) {
            element.focus();
            element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
            element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            await this.delay(delayBetweenEvents);
        }

        const rect = element.getBoundingClientRect();
        Logger.debug(`Simulated complete hover at (${Math.round(rect.left + rect.width/2)}, ${Math.round(rect.top + rect.height/2)})`);
    }

    /**
     * Simulate a complete click interaction with proper event sequencing
     * This triggers the full event sequence that Angular expects
     */
    async simulateCompleteClick(element, options = {}) {
        if (!element) return;

        const { delay: delayBetweenEvents = 30, simulateHoverFirst = true } = options;

        // First simulate hover to establish the element as the target
        if (simulateHoverFirst) {
            await this.simulateCompleteHover(element, { delay: delayBetweenEvents, focusElement: true });
            await this.delay(100);
        }

        // Pointer down sequence
        element.dispatchEvent(this.createPointerEvent('pointerdown', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createMouseEvent('mousedown', element));
        await this.delay(delayBetweenEvents);

        // Pointer up sequence
        element.dispatchEvent(this.createPointerEvent('pointerup', element));
        await this.delay(delayBetweenEvents);

        element.dispatchEvent(this.createMouseEvent('mouseup', element));
        await this.delay(delayBetweenEvents);

        // Click event
        element.dispatchEvent(this.createMouseEvent('click', element));

        Logger.debug(`Simulated complete click on element`);
    }

    /**
     * Simulate realistic mouse hover over an element with proper coordinates
     * @deprecated Use simulateCompleteHover for Angular SPAs
     */
    simulateRealisticHover(element) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Dispatch pointer events first (Angular)
        element.dispatchEvent(this.createPointerEvent('pointerover', element));
        element.dispatchEvent(this.createPointerEvent('pointerenter', element));
        element.dispatchEvent(this.createPointerEvent('pointermove', element));

        // Then dispatch mouse events (compatibility)
        element.dispatchEvent(this.createMouseEvent('mouseover', element));
        element.dispatchEvent(this.createMouseEvent('mouseenter', element));
        element.dispatchEvent(this.createMouseEvent('mousemove', element));

        Logger.debug(`Simulated realistic hover at (${Math.round(centerX)}, ${Math.round(centerY)})`);
    }

    /**
     * Get a fresh reference to the generated-image element by its index
     * This avoids stale element references after Angular re-renders
     */
    getGeneratedImageByIndex(index) {
        const allGeneratedImages = document.querySelectorAll('generated-image');
        const visibleImages = Array.from(allGeneratedImages).filter(img => img.offsetParent !== null);
        return visibleImages[index] || null;
    }

    /**
     * Find the download button within a generated-image element
     */
    findDownloadButtonInImage(generatedImage) {
        if (!generatedImage) return null;

        const downloadButtonContainer = generatedImage.querySelector('download-generated-image-button');
        if (!downloadButtonContainer) return null;

        return downloadButtonContainer.querySelector('button[data-test-id="download-generated-image-button"]');
    }

    /**
     * Download a single image and wait for completion
     * Uses enhanced event simulation for Angular SPAs with stale element handling
     */
    async downloadSingleImage(container, index, total) {
        try {
            Logger.debug(`Downloading image ${index + 1}/${total}...`);

            // Get the generated-image element (may need fresh reference)
            let generatedImage = container.closest('generated-image');
            if (!generatedImage) {
                // Try to get by index if container is stale
                generatedImage = this.getGeneratedImageByIndex(index);
                if (!generatedImage) {
                    Logger.warn(`Generated image ${index + 1} not found in DOM`);
                    return false;
                }
            }

            // Scroll the image into view
            generatedImage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(500);

            // Find the single-image element which contains the image and controls
            const singleImage = generatedImage.querySelector('single-image');
            if (!singleImage) {
                Logger.warn(`Single image element not found for image ${index + 1}`);
                return false;
            }

            // Find the overlay-container which shows the controls on hover
            const overlayContainer = singleImage.querySelector('.overlay-container');
            if (!overlayContainer) {
                Logger.warn(`Overlay container not found for image ${index + 1}`);
                return false;
            }

            // Use complete hover simulation to trigger Angular's state update
            // This dispatches PointerEvents which Angular uses for tracking the active image
            await this.simulateCompleteHover(overlayContainer, { delay: 50, focusElement: false });
            Logger.debug(`Simulated complete hover on overlay container for image ${index + 1}/${total}`);
            await this.delay(600);

            // Re-query the download button after hover (DOM may have updated)
            let downloadButton = this.findDownloadButtonInImage(generatedImage);

            if (!downloadButton || downloadButton.offsetParent === null) {
                Logger.debug(`Download button not visible yet, retrying hover on image ${index + 1}`);
                // Try hovering on the image button directly
                const imageButton = overlayContainer.querySelector('.image-button');
                if (imageButton) {
                    await this.simulateCompleteHover(imageButton, { delay: 50, focusElement: true });
                    await this.delay(600);
                }

                // Re-query again
                downloadButton = this.findDownloadButtonInImage(generatedImage);
                if (!downloadButton || downloadButton.offsetParent === null) {
                    Logger.warn(`Download button ${index + 1} still not visible after retry`);
                    return false;
                }
            }

            // Simulate complete hover on the download button itself
            await this.simulateCompleteHover(downloadButton, { delay: 30, focusElement: true });
            Logger.debug(`Simulated complete hover on download button ${index + 1}/${total}`);
            await this.delay(400);

            // Close any previously open menus
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
            document.dispatchEvent(escapeEvent);
            await this.delay(200);

            // Use complete click simulation to trigger Angular's click handlers
            await this.simulateCompleteClick(downloadButton, { delay: 30, simulateHoverFirst: false });
            Logger.debug(`Simulated complete click on download button ${index + 1}/${total}`);
            await this.delay(800);

            // Wait for menu to open and find download link
            const downloadLink = await this.waitForMenuAndFindDownloadLink(downloadButton);
            if (!downloadLink) {
                Logger.warn(`Download link not found in menu for image ${index + 1}`);
                // Close menu and continue
                document.dispatchEvent(escapeEvent);
                await this.delay(300);
                return false;
            }

            Logger.debug(`Found download link for image ${index + 1}/${total}, href: ${downloadLink.href || 'no href'}`);

            // Click the download link using complete click simulation
            await this.simulateCompleteClick(downloadLink, { delay: 30, simulateHoverFirst: true });
            Logger.debug(`Clicked download link for image ${index + 1}/${total}`);

            // Wait for download to complete
            await this.waitForDownloadComplete(downloadButton);

            // Close any lingering menus
            document.dispatchEvent(escapeEvent);
            await this.delay(200);

            Logger.success(`Downloaded image ${index + 1}/${total}`);
            return true;
        } catch (error) {
            Logger.error(`Error downloading image ${index + 1}:`, error);
            return false;
        }
    }

    /**
     * Get all visible generated-image elements
     */
    getAllVisibleGeneratedImages() {
        const allGeneratedImages = document.querySelectorAll('generated-image');
        return Array.from(allGeneratedImages).filter(img => img.offsetParent !== null);
    }

    /**
     * Download all available images (queued, one at a time)
     * Uses fresh element references for each download to handle Angular's DOM re-renders
     */
    async downloadAllImages() {
        Logger.debug("Searching for generated images...");

        // Get initial count of images
        let visibleImages = this.getAllVisibleGeneratedImages();
        const initialCount = visibleImages.length;

        Logger.debug(`Found ${initialCount} generated images`);

        if (initialCount === 0) {
            this.showNotification('No generated images found', 'info');
            return;
        }

        this.showNotification(`Starting download queue for ${initialCount} image(s)...`, 'info');

        let downloadedCount = 0;

        // Download each image sequentially using index-based lookup
        // This avoids stale element references since we re-query for each image
        for (let i = 0; i < initialCount; i++) {
            // Always get a fresh reference to the generated-image element
            const generatedImage = this.getGeneratedImageByIndex(i);

            if (!generatedImage) {
                Logger.warn(`Generated image ${i + 1} no longer available, skipping`);
                continue;
            }

            // Check if image is still visible
            if (generatedImage.offsetParent === null) {
                Logger.debug(`Generated image ${i + 1} is not visible, skipping`);
                continue;
            }

            // Find download button container within this image for passing to downloadSingleImage
            const downloadButtonContainer = generatedImage.querySelector('download-generated-image-button');
            if (!downloadButtonContainer) {
                Logger.debug(`No download button container in image ${i + 1}, skipping`);
                continue;
            }

            const success = await this.downloadSingleImage(downloadButtonContainer, i, initialCount);
            if (success) {
                downloadedCount++;
            }

            // Delay between downloads to allow Angular to stabilize
            if (i < initialCount - 1) {
                await this.delay(1500);
            }
        }

        if (downloadedCount > 0) {
            this.showNotification(`Downloaded ${downloadedCount} image(s)`, 'success');
            Logger.success(`Downloaded ${downloadedCount} image(s)`);
        } else {
            this.showNotification('No images were downloaded', 'warning');
        }
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
// Ensure you aren't calling 'new GeminiEnhancer()' in a way that allows multiples
if (window.top === window.self) { // Only run in the main window, not iframes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                new GeminiEnhancer();
            } catch (e) {
                console.error("Failed to start Gemini Enhancer", e);
            }
        });
    } else {
        try {
            new GeminiEnhancer();
        } catch (e) {
            console.error("Failed to start Gemini Enhancer", e);
        }
    }
}

