// Import core components
import {
    Button,
    Checkbox,
    HTMLUtils,
    Input,
    Logger,
    Notification,
    SidebarPanel,
    StyleManager,
    TextArea,
    Tabs,
    TextChunker
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";

// Configure logger
Logger.setPrefix("Gemini Enhancer");
Logger.DEBUG = true;

// TODO: Image download functionality temporarily removed due to Angular SPA limitations.
// See TODO-IMAGE-DOWNLOAD.md for full details on the issue, attempted solutions, and future options.

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
        VIDEO_DESELECT_BUTTON: 'button.toolbox-drawer-item-deselect-button'
    };

    static SETTINGS_KEYS = {
        PROMPTS_QUEUE: 'gemini-prompts-queue',
        GENERATION_TYPE: 'gemini-generation-type',
        QUEUE_DELAY: 'gemini-queue-delay',
        SHOW_NOTIFICATIONS: 'gemini-show-notifications',
        PANEL_POSITION: 'gemini-panel-position',
        CHUNKED_TEXT: 'gemini-chunked-text',
        CHUNKED_BASE_PROMPT: 'gemini-chunked-base-prompt',
        CHUNKED_WORDS_PER_CHUNK: 'gemini-chunked-words-per-chunk',
        CHUNKED_STRATEGY: 'gemini-chunked-strategy',
        CHUNKED_APPEND_TO_QUEUE: 'gemini-chunked-append-to-queue'
    };

    static DEFAULT_SETTINGS = {
        PROMPTS_QUEUE: '',
        GENERATION_TYPE: 'text', // 'text', 'image', 'video'
        QUEUE_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        CHUNKED_TEXT: '',
        CHUNKED_BASE_PROMPT: '',
        CHUNKED_WORDS_PER_CHUNK: 500,
        CHUNKED_STRATEGY: 'soft',
        CHUNKED_APPEND_TO_QUEUE: false // false = clean and replace, true = append
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
        this.generatedChunkedPrompts = [];

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
                Input.initStyles();
                Input.useDefaultColors();
                Checkbox.initStyles();
                Checkbox.useDefaultColors();
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
                    id: 'chunked',
                    label: '✂️ Chunked Prompts',
                    content: () => this.createChunkedPromptsSection()
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
            onInput: (event, textArea) => {
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

        this.delayInput = new Input({
            type: 'number',
            value: this.settings.QUEUE_DELAY || 2000,
            placeholder: 'Delay in milliseconds',
            min: 500,
            max: 10000,
            attributes: { step: '100' },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 500 && value <= 10000) {
                    this.settings.QUEUE_DELAY = value;
                    this.saveSettings();
                }
            },
            container: container,
            scopeSelector: `#${this.enhancerId}`
        });
        this.delayInput.getElement().style.marginBottom = '12px';

        // Show notifications checkbox
        this.notificationsCheckbox = new Checkbox({
            label: 'Show notifications',
            checked: this.settings.SHOW_NOTIFICATIONS !== false,
            onChange: (event) => {
                this.settings.SHOW_NOTIFICATIONS = this.notificationsCheckbox.isChecked();
                this.saveSettings();
            },
            container: container,
            size: 'small'
        });
        this.notificationsCheckbox.checkboxContainer.style.marginTop = '12px';

        return container;
    }

    /**
     * Create chunked prompts section
     */
    createChunkedPromptsSection() {
        const container = document.createElement('div');
        container.style.padding = '12px';

        // Info text
        const infoText = HTMLUtils.createElementWithHTML('div', 
            'Chunk text and use variables in base prompt:<br/>• Use $chunk for current chunk (auto in loop)<br/>• Use $1, $2, $3... for chunk variables<br/>• Use $counter for current chunk index (1-based)<br/>• Use $total for total chunk count',
            {}
        );
        infoText.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;';
        container.appendChild(infoText);

        // Text to chunk
        const textLabel = document.createElement('label');
        textLabel.textContent = 'Text to Chunk:';
        textLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(textLabel);

        this.chunkedTextArea = new TextArea({
            value: this.settings.CHUNKED_TEXT || '',
            placeholder: 'Enter the text you want to chunk...',
            rows: 8,
            onInput: (event, textArea) => {
                this.settings.CHUNKED_TEXT = textArea.getValue();
                this.saveSettings();
            },
            container: container
        });

        // Base prompt template
        const promptLabel = document.createElement('label');
        promptLabel.textContent = 'Base Prompt Template:';
        promptLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(promptLabel);

        this.chunkedBasePromptArea = new TextArea({
            value: this.settings.CHUNKED_BASE_PROMPT || '',
            placeholder: 'Enter base prompt with variables:\nExample: Analyze this text: $chunk\nChunk $counter of $total',
            rows: 6,
            onInput: (event, textArea) => {
                this.settings.CHUNKED_BASE_PROMPT = textArea.getValue();
                this.saveSettings();
            },
            container: container
        });

        // Chunking options
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = 'margin-top: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px;';

        // Words per chunk
        const wordsLabel = document.createElement('label');
        wordsLabel.textContent = 'Words per chunk:';
        wordsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';
        optionsContainer.appendChild(wordsLabel);

        this.wordsPerChunkInput = new Input({
            type: 'number',
            value: this.settings.CHUNKED_WORDS_PER_CHUNK || 500,
            placeholder: 'Words per chunk',
            min: 10,
            max: 5000,
            attributes: { step: '50' },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 10 && value <= 5000) {
                    this.settings.CHUNKED_WORDS_PER_CHUNK = value;
                    this.saveSettings();
                }
            },
            container: optionsContainer,
            scopeSelector: `#${this.enhancerId}`
        });
        this.wordsPerChunkInput.getElement().style.marginBottom = '8px';

        // Strategy selector
        const strategyLabel = document.createElement('label');
        strategyLabel.textContent = 'Chunking strategy:';
        strategyLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';
        optionsContainer.appendChild(strategyLabel);

        const strategySelect = document.createElement('select');
        strategySelect.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;';
        strategySelect.value = this.settings.CHUNKED_STRATEGY || 'soft';

        const softOption = document.createElement('option');
        softOption.value = 'soft';
        softOption.textContent = 'Soft (allow overflow to finish sentence)';
        strategySelect.appendChild(softOption);

        const hardOption = document.createElement('option');
        hardOption.value = 'hard';
        hardOption.textContent = 'Hard (strict cut at boundary)';
        strategySelect.appendChild(hardOption);

        strategySelect.onchange = (e) => {
            this.settings.CHUNKED_STRATEGY = e.target.value;
            this.saveSettings();
        };
        optionsContainer.appendChild(strategySelect);

        container.appendChild(optionsContainer);

        // Generate button
        const generateButton = new Button({
            text: 'Generate Prompts',
            onClick: () => this.generateChunkedPrompts(),
            container: container
        });
        generateButton.button.style.marginTop = '12px';
        this.generateChunkedButton = generateButton;

        // Preview/Result area
        const previewLabel = document.createElement('label');
        previewLabel.textContent = 'Generated Prompts Preview:';
        previewLabel.style.cssText = 'display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; color: #555; font-weight: 500;';
        container.appendChild(previewLabel);

        this.chunkedPreviewArea = new TextArea({
            value: '',
            placeholder: 'Generated prompts will appear here...',
            rows: 8,
            onChange: () => {},
            container: container,
            disabled: true
        });

        // Append to queue checkbox
        this.appendToQueueCheckbox = new Checkbox({
            label: 'Append to existing prompts (unchecked = clean and replace)',
            checked: this.settings.CHUNKED_APPEND_TO_QUEUE || false,
            onChange: (event) => {
                this.settings.CHUNKED_APPEND_TO_QUEUE = this.appendToQueueCheckbox.isChecked();
                this.saveSettings();
            },
            container: container,
            size: 'small'
        });
        this.appendToQueueCheckbox.checkboxContainer.style.marginTop = '12px';

        // Add to queue button
        const addToQueueButton = new Button({
            text: 'Add to Queue',
            onClick: () => this.addChunkedPromptsToQueue(),
            container: container
        });
        addToQueueButton.button.style.marginTop = '8px';
        this.addToQueueChunkedButton = addToQueueButton;

        // Status message
        this.chunkedStatus = document.createElement('div');
        this.chunkedStatus.style.cssText = 'margin-top: 8px; padding: 6px; font-size: 11px; color: #666; text-align: center;';
        this.chunkedStatus.textContent = '';
        container.appendChild(this.chunkedStatus);

        return container;
    }

    /**
     * Generate prompts from chunked text
     */
    generateChunkedPrompts() {
        const text = this.chunkedTextArea.getValue().trim();
        const basePrompt = this.chunkedBasePromptArea.getValue().trim();

        if (!text) {
            this.showNotification('Please enter text to chunk', 'warning');
            this.chunkedStatus.textContent = 'Error: No text to chunk';
            this.chunkedStatus.style.color = '#d32f2f';
            return;
        }

        if (!basePrompt) {
            this.showNotification('Please enter base prompt template', 'warning');
            this.chunkedStatus.textContent = 'Error: No base prompt template';
            this.chunkedStatus.style.color = '#d32f2f';
            return;
        }

        try {
            // Initialize TextChunker
            const chunker = new TextChunker();
            const wordsPerChunk = this.settings.CHUNKED_WORDS_PER_CHUNK || 500;
            const strategy = this.settings.CHUNKED_STRATEGY === 'hard' 
                ? TextChunker.STRATEGY.HARD_LIMIT 
                : TextChunker.STRATEGY.SOFT_LIMIT;

            // Chunk the text
            const chunks = chunker.splitByWords(text, wordsPerChunk, {
                strategy: strategy,
                respectSentenceBoundaries: true
            });

            if (chunks.length === 0) {
                this.showNotification('No chunks generated. Text might be too short.', 'warning');
                this.chunkedStatus.textContent = 'Error: No chunks generated';
                this.chunkedStatus.style.color = '#d32f2f';
                return;
            }

            // Generate prompts by replacing variables
            const generatedPrompts = [];
            const total = chunks.length;

            for (let i = 0; i < chunks.length; i++) {
                let prompt = basePrompt;
                const counter = i + 1; // 1-based index
                const currentChunk = chunks[i];

                // Replace $chunk with current chunk (must be done first to avoid conflicts)
                prompt = prompt.replace(/\$chunk/g, currentChunk);

                // Replace $counter
                prompt = prompt.replace(/\$counter/g, counter.toString());

                // Replace $total
                prompt = prompt.replace(/\$total/g, total.toString());

                // Replace $1, $2, $3, etc. with corresponding chunks
                // Replace variables with chunks
                prompt = prompt.replace(/\$(\d+)/g, (match, varNum) => {
                    const varIndex = parseInt(varNum, 10) - 1; // Convert to 0-based
                    if (varIndex >= 0 && varIndex < chunks.length) {
                        return chunks[varIndex];
                    }
                    return match; // Keep original if out of range
                });

                generatedPrompts.push(prompt);
            }

            // Store generated prompts
            this.generatedChunkedPrompts = generatedPrompts;

            // Display in preview
            const previewText = generatedPrompts.join('\n---\n');
            this.chunkedPreviewArea.setValue(previewText);

            // Update status
            this.chunkedStatus.textContent = `Generated ${generatedPrompts.length} prompts from ${chunks.length} chunks`;
            this.chunkedStatus.style.color = '#2e7d32';
            this.showNotification(`Generated ${generatedPrompts.length} prompts`, 'success');

            Logger.info(`Generated ${generatedPrompts.length} prompts from ${chunks.length} chunks`);
        } catch (error) {
            Logger.error('Error generating chunked prompts:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            this.chunkedStatus.textContent = `Error: ${error.message}`;
            this.chunkedStatus.style.color = '#d32f2f';
        }
    }

    /**
     * Add generated chunked prompts to queue
     */
    addChunkedPromptsToQueue() {
        if (!this.generatedChunkedPrompts || this.generatedChunkedPrompts.length === 0) {
            this.showNotification('No prompts generated. Please generate prompts first.', 'warning');
            return;
        }

        const shouldAppend = this.settings.CHUNKED_APPEND_TO_QUEUE || false;
        let newQueue;

        if (shouldAppend) {
            // Append to existing queue
            const currentQueue = this.promptsTextArea.getValue().trim();
            const separator = currentQueue ? '\n---\n' : '';
            newQueue = currentQueue + separator + this.generatedChunkedPrompts.join('\n---\n');
        } else {
            // Clean and replace
            newQueue = this.generatedChunkedPrompts.join('\n---\n');
        }

        this.promptsTextArea.setValue(newQueue);

        // Save to settings
        this.settings.PROMPTS_QUEUE = newQueue;
        this.saveSettings();

        const action = shouldAppend ? 'appended' : 'replaced';
        this.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} queue with ${this.generatedChunkedPrompts.length} prompts`, 'success');
        Logger.info(`${action.charAt(0).toUpperCase() + action.slice(1)} queue with ${this.generatedChunkedPrompts.length} prompts`);

        // Switch to queue tab to show the added prompts
        if (this.tabs) {
            this.tabs.switchToTab('queue');
        }
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
