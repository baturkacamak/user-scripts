// Import core components
import {
    AsyncQueueService,
    Button,
    Checkbox,
    DataCache,
    Debouncer,
    DOMObserver,
    FormStatePersistence,
    HTMLUtils,
    Input,
    Logger,
    Notification,
    PollingStrategy,
    PubSub,
    SidebarPanel,
    StyleManager,
    TextArea,
    TextChunker,
    ThrottleService,
    UrlChangeWatcher,
    UserInteractionDetector,
    ClipboardService,
    MarkdownConverter,
    ViewportStabilizer,
    Tabs
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";
import { MouseEventUtils } from '../../common/core/utils/HTMLUtils.js';

// Configure logger
Logger.setPrefix("Google AI Studio Enhancer");
Logger.DEBUG = true;

/**
 * Google AI Studio Enhancer - Fixed Version
 * Provides response copying and auto-run functionality for Google AI Studio
 */
class AIStudioEnhancer {
    // Configuration
    static SELECTORS = {
        MAIN_SUBMIT_BUTTON: {
            READY: 'button[aria-label="Run"][type="submit"][aria-disabled="false"]:not([disabled])',
            LOADING: 'button[aria-label="Run"][type="button"]:not([disabled]), button[aria-label="Run"]:has(.material-symbols-outlined.spin), button[aria-label="Run"]:has(span:contains("Stop"))',
            DISABLED: 'button[aria-label="Run"][disabled]',
        },
        RESPONSE_CONTAINERS: [
            '.ng-star-inserted .chat-turn-container.model.render .turn-content:not(:has(.mat-accordion))',
            '.ng-star-inserted .chat-turn-container.model.render .turn-content:has(.turn-information)',
        ],
        PROMPT_INPUTS: [
            'textarea[aria-label*="Start typing a prompt"]',
            'textarea.textarea.gmat-body-medium[placeholder*="Start typing a prompt"]',
            'textarea.textarea.gmat-body-medium',
            'textarea[placeholder*="Enter a prompt"]',
            'textarea[placeholder*="Type a message"]',
            'textarea[aria-label*="prompt"]',
            'textarea[aria-label*="message"]',
            'div[contenteditable="true"]',
        ],
        TTS_TEXTAREA: [
            'textarea[placeholder*="Start writing or paste text here to generate speech"]',
            'textarea[arialabel*="Enter a prompt"]',
            'textarea[aria-label*="Enter a prompt"]',
            'textarea[placeholder*="generate speech"]',
            'textarea[placeholder*="Text"]',
            'textarea.textarea.gmat-body-medium',
            'textarea.textarea',
            'textarea'
        ],
        TTS_STYLE_TEXTAREA: [
            'textarea[placeholder*="Describe the style of your dialog"]',
            'textarea[aria-label*="Style instructions"]',
            'textarea[placeholder*="style of your dialog"]'
        ],
        // Temperature number input (we prefer this over the range slider for better control)
        TTS_TEMPERATURE_NUMBER: [
            'input.slider-number-input.small[min="0"][max="2"]',
            'input.slider-number-input[min="0"][max="2"]',
            'input.slider-number-input'
        ],
        TTS_VOICE_SELECT: [
            'mat-select[aria-haspopup="listbox"].mat-mdc-select',
            'mat-select.mat-mdc-select'
        ],
        TTS_AUDIO: 'audio[src^="data:audio"], audio[controls]',
        TTS_RUN_BUTTON: {
            READY: 'button[aria-label="Run"][type="submit"][aria-disabled="false"]:not([disabled])',
            LOADING: 'button[aria-label="Run"][type="button"]:not([disabled]), button[aria-label="Run"]:has(.material-symbols-outlined.spin), button[aria-label="Run"]:has(span:contains("Stop"))'
        }
    };

    static SETTINGS_KEYS = {
        DEFAULT_ITERATIONS: 'gaise-default-iterations',
        AUTO_RUN_DELAY: 'gaise-auto-run-delay',
        SHOW_NOTIFICATIONS: 'gaise-show-notifications',
        PANEL_POSITION: 'gaise-panel-position',
        AUTO_RUN_PROMPT: 'gaise-auto-run-prompt',
        PROMPT_MODE: 'gaise-prompt-mode',
        MULTIPLE_PROMPTS: 'gaise-multiple-prompts',
        BASE_PROMPT_MULTIPLE: 'gaise-base-prompt-multiple',
        TEMPLATE_PROMPT: 'gaise-template-prompt',
        OVERRIDE_ITERATIONS: 'gaise-override-iterations',
        TTS_TEXT: 'gaise-tts-text',
        TTS_WORDS_PER_CHUNK: 'gaise-tts-words-per-chunk',
        TTS_FILENAME_PREFIX: 'gaise-tts-filename-prefix',
        TTS_RETRY_COUNT: 'gaise-tts-retry-count',
        TTS_START_COUNT: 'gaise-tts-start-count',
        TTS_DOWNLOAD_DELAY_MS: 'gaise-tts-download-delay-ms',
        TTS_STYLE_PROMPT: 'gaise-tts-style-prompt',
        TTS_TEMPERATURE: 'gaise-tts-temperature',
        TTS_VOICE: 'gaise-tts-voice'
    };

    static DEFAULT_SETTINGS = {
        DEFAULT_ITERATIONS: 10,
        AUTO_RUN_DELAY: 1000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_RUN_PROMPT: '',
        PROMPT_MODE: 'single',
        MULTIPLE_PROMPTS: '',
        BASE_PROMPT_MULTIPLE: '',
        TEMPLATE_PROMPT: 'This is iteration {iteration} of {total}. Please provide a response.',
        OVERRIDE_ITERATIONS: false,
        TTS_TEXT: '',
        TTS_WORDS_PER_CHUNK: 300,
        TTS_FILENAME_PREFIX: 'tts-output',
        TTS_RETRY_COUNT: 5,
        TTS_START_COUNT: 0,
        // Delay before downloading TTS audio (in ms)
        TTS_DOWNLOAD_DELAY_MS: 5000,
        TTS_STYLE_PROMPT: '',
        TTS_TEMPERATURE: 0.75,
        TTS_VOICE: ''
    };

    static EVENTS = {
        RESPONSE_ADDED: 'ai-studio:response-added',
        RESPONSES_COPIED: 'ai-studio:responses-copied',
        CHAT_CHANGED: 'ai-studio:chat-changed',
        AUTO_RUN_STARTED: 'ai-studio:auto-run-started',
        AUTO_RUN_STOPPED: 'ai-studio:auto-run-stopped',
        AUTO_RUN_ITERATION: 'ai-studio:auto-run-iteration',
        SETTINGS_CHANGED: 'ai-studio:settings-changed',
        UI_UPDATE_REQUIRED: 'ai-studio:ui-update-required'
    };

    constructor() {
        this.isAutoRunning = false;
        this.shouldStopAutoRun = false; // New flag for clean stopping
        this.currentIteration = 0;
        this.maxIterations = 0;
        this.settings = { ...AIStudioEnhancer.DEFAULT_SETTINGS };
        this.sidebarPanel = null;
        this.currentChatId = null;
        this.copyButton = null;
        this.toggleButton = null;
        this.isInitialLoad = true;
        this.enhancerId = 'ai-studio-enhancer-container';
        
        // TTS state
        this.isTTSRunning = false;
        this.shouldStopTTS = false;
        this.ttsChunks = [];
        this.currentTTSChunk = 0;
        this.totalTTSChunks = 0;
        this.ttsQuotaMonitor = null; // MutationObserver for quota errors
        this.lastTTSAudioSrc = null; // Track last downloaded audio src to detect new audio
        
        // Debouncer for TTS text saving
        this.ttsTextSaveDebouncer = new Debouncer(() => {
            this.saveSettings();
        }, 500);
        
        this.subscriptionIds = [];
        
        this.markdownConverter = new MarkdownConverter({
            selectorsToRemove: [
                'button',
                '[role="button"]',
                '.material-icons',
                '.icon',
                '[aria-label*="copy"]',
                '[aria-label*="share"]',
                '[aria-label*="edit"]',
                '[aria-label*="more"]',
                '.action-buttons',
                '.response-actions',
                '.author-label'  // Exclude "Model" label
            ]
        });
        
        this.userInteraction = UserInteractionDetector.getInstance({
            debug: Logger.DEBUG,
            namespace: 'ai-studio-enhancer',
            interactionWindow: 200,
            interactionThrottle: 100
        });

        // Initialize ViewportStabilizer for lazy-rendered content
        this.viewportStabilizer = new ViewportStabilizer({
            scrollContainer: null, // Use window/document
            stableDurationMs: 500,
            checkIntervalMs: 120,
            maxWaitMs: 4000,
            scrollDelayMs: 120,
            enableDebugLogging: Logger.DEBUG,
            logger: Logger
        });

        Logger.info("Initializing Google AI Studio Enhancer");

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
            PubSub.subscribe(AIStudioEnhancer.EVENTS.CHAT_CHANGED, (data) => {
                this.handleChatChangedEvent(data);
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, (data) => {
                this.handleUIUpdate(data);
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
        
        if (this.isAutoRunning) {
            this.shouldStopAutoRun = true;
        }
        
        if (this.isTTSRunning) {
            this.shouldStopTTS = true;
        }
        
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
        
        Logger.debug("All subscriptions and resources cleaned up");
    }

    /**
     * Load saved settings
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
     * Save settings
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
                Tabs.initStyles();
                Tabs.useDefaultColors();
            } catch (error) {
                Logger.error('Error initializing styles:', error);
            }

            StyleManager.addStyles(`
                .copy-responses-button,
                .auto-run-toggle-button {
                    width: 100% !important;
                }
                
                .auto-run-prompt-textarea,
                .auto-run-iterations-input,
                .auto-run-multiple-prompts-textarea,
                .auto-run-base-prompt-multiple-textarea,
                .auto-run-template-prompt-textarea {
                    margin-bottom: 12px;
                }
                
                .auto-run-prompt-textarea textarea,
                .auto-run-multiple-prompts-textarea textarea,
                .auto-run-base-prompt-multiple-textarea textarea,
                .auto-run-template-prompt-textarea textarea {
                    max-height: 200px !important;
                    overflow-y: auto !important;
                }
                
                .single-prompt-container,
                .multiple-prompt-container,
                .template-prompt-container {
                    margin-bottom: 12px;
                }
                
                .multiple-prompt-container label,
                .template-prompt-container label {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 12px;
                    color: #555;
                    font-weight: 500;
                }
                
                .multiple-prompt-container code {
                    background: #f0f0f0;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                    font-size: 11px;
                }
            `, 'ai-studio-enhancer-custom-styles');

            await this.createSidebarPanel();
            this.setupChatMonitoring();
            this.setupRunButtonInteractionTracking();

            setTimeout(() => {
                this.isInitialLoad = false;
                Logger.debug("Initial load completed");
            }, 2000);

            Logger.success("Google AI Studio Enhancer initialized successfully!");
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

        // Create tabs to separate prompt automation and TTS
        const tabsContainer = document.createElement('div');
        
        this.tabs = new Tabs({
            tabs: [
                {
                    id: 'prompt-automation',
                    label: '🔄 Prompt Automation',
                    content: () => {
                        const tabContent = document.createElement('div');
                        this.createAutoRunSection(tabContent);
                        return tabContent;
                    }
                },
                {
                    id: 'tts',
                    label: '🔊 Text-to-Speech',
                    content: () => {
                        const tabContent = document.createElement('div');
                        this.createTTSSection(tabContent);
                        return tabContent;
                    }
                },
                {
                    id: 'settings',
                    label: '⚙️ Settings',
                    content: () => {
                        const tabContent = document.createElement('div');
                        this.createSettingsSection(tabContent);
                        return tabContent;
                    }
                }
            ],
            defaultTab: 'prompt-automation',
            container: tabsContainer,
            onTabChange: (tabId) => {
                Logger.debug(`Switched to tab: ${tabId}`);
            }
        });

        content.appendChild(tabsContainer);

        return content;
    }


    /**
     * Create auto-run section
     */
    createAutoRunSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '🔄 Auto Runner';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Prompt mode selector
        const promptModeContainer = document.createElement('div');
        promptModeContainer.style.marginBottom = '12px';

        const promptModeLabel = document.createElement('label');
        promptModeLabel.textContent = 'Prompt Mode:';
        promptModeLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        const promptModeSelect = HTMLUtils.createElementWithHTML('select', `
            <option value="single">Single Prompt (same for all iterations)</option>
            <option value="multiple">Multiple Prompts (different for each iteration)</option>
            <option value="template">Template Prompts (with variables)</option>
        `, {});
        promptModeSelect.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;';
        promptModeSelect.value = this.settings.PROMPT_MODE || 'single';
        promptModeSelect.onchange = (event) => {
            this.settings.PROMPT_MODE = event.target.value;
            this.saveSettings();
            this.updatePromptInputVisibility();
        };

        promptModeContainer.appendChild(promptModeLabel);
        promptModeContainer.appendChild(promptModeSelect);
        this.promptModeSelect = promptModeSelect;

        // Single prompt input
        this.singlePromptContainer = document.createElement('div');
        this.singlePromptContainer.className = 'single-prompt-container';
        
        this.promptTextArea = new TextArea({
            value: this.settings.AUTO_RUN_PROMPT,
            placeholder: 'Enter prompt to auto-run (optional)',
            rows: 3,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-prompt-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.AUTO_RUN_PROMPT = textArea.getValue();
                this.saveSettings();
            },
            container: this.singlePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Multiple prompts input
        this.multiplePromptContainer = document.createElement('div');
        this.multiplePromptContainer.className = 'multiple-prompt-container';
        this.multiplePromptContainer.style.display = 'none';

        const multiplePromptLabel = document.createElement('label');
        multiplePromptLabel.textContent = 'Prompts (separated by ---, will cycle through):';
        multiplePromptLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        const separatorInfo = document.createElement('div');
        separatorInfo.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;';
        
        const separatorTitle = HTMLUtils.createElementWithHTML('div', '<strong>Separator:</strong> Use <code>---</code> (three dashes) to separate prompts.', {});
        separatorTitle.style.marginBottom = '4px';
        
        const exampleTitle = HTMLUtils.createElementWithHTML('div', '<strong>Example:</strong>', {});
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

        this.multiplePromptTextArea = new TextArea({
            value: this.settings.MULTIPLE_PROMPTS || '',
            placeholder: 'Enter prompts separated by ---:\nFirst prompt\ncan be multiline\n---\nSecond prompt\nalso multiline\n---\nThird prompt',
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-multiple-prompts-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.MULTIPLE_PROMPTS = textArea.getValue();
                this.saveSettings();
            },
            container: this.multiplePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        this.multiplePromptContainer.appendChild(multiplePromptLabel);
        this.multiplePromptContainer.appendChild(separatorInfo);

        // Base prompt for multiple prompts
        const basePromptLabel = document.createElement('label');
        basePromptLabel.textContent = 'Base Prompt (will be appended to each prompt):';
        basePromptLabel.style.cssText = 'display: block; margin-bottom: 4px; margin-top: 12px; font-size: 12px; color: #555; font-weight: 500;';

        const basePromptInfo = HTMLUtils.createElementWithHTML('div', 'Each prompt will be combined with the base prompt as: <code>Prompt X\n[Base Prompt]</code>', {});
        basePromptInfo.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;';

        this.basePromptMultipleTextArea = new TextArea({
            value: this.settings.BASE_PROMPT_MULTIPLE || '',
            placeholder: 'Enter base prompt to append to each prompt (optional)',
            rows: 3,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-base-prompt-multiple-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.BASE_PROMPT_MULTIPLE = textArea.getValue();
                this.saveSettings();
            },
            container: this.multiplePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        this.multiplePromptContainer.appendChild(basePromptLabel);
        this.multiplePromptContainer.appendChild(basePromptInfo);

        // Template prompts input
        this.templatePromptContainer = document.createElement('div');
        this.templatePromptContainer.className = 'template-prompt-container';
        this.templatePromptContainer.style.display = 'none';

        const templatePromptLabel = document.createElement('label');
        templatePromptLabel.textContent = 'Template Prompt (use {iteration}, {total}, {timestamp}):';
        templatePromptLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.templatePromptTextArea = new TextArea({
            value: this.settings.TEMPLATE_PROMPT || 'This is iteration {iteration} of {total}. Please provide a response.',
            placeholder: 'Template with variables: {iteration}, {total}, {timestamp}',
            rows: 3,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-template-prompt-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.TEMPLATE_PROMPT = textArea.getValue();
                this.saveSettings();
            },
            container: this.templatePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        this.templatePromptContainer.appendChild(templatePromptLabel);

        // Iterations input container
        const iterationsContainer = document.createElement('div');
        iterationsContainer.style.marginBottom = '12px';

        const iterationsLabel = document.createElement('label');
        iterationsLabel.textContent = 'Number of iterations:';
        iterationsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.iterationsInfoText = document.createElement('div');
        this.iterationsInfoText.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 4px;';
        this.iterationsInfoText.textContent = 'Number of iterations to run';

        this.overrideIterationsCheckbox = new Checkbox({
            label: 'Override automatic iteration count (run multiple cycles)',
            checked: this.settings.OVERRIDE_ITERATIONS || false,
            onChange: (event) => {
                this.settings.OVERRIDE_ITERATIONS = this.overrideIterationsCheckbox.isChecked();
                this.saveSettings();
                this.updateIterationInputBehavior(this.settings.PROMPT_MODE || 'single');
            },
            container: iterationsContainer,
            size: 'small'
        });

        this.iterationsInput = new Input({
            type: 'number',
            value: this.settings.DEFAULT_ITERATIONS,
            placeholder: 'Number of iterations',
            min: 1,
            max: 100,
            className: 'auto-run-iterations-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a number greater than 0';
                }
                if (num > 100) {
                    return 'Maximum 100 iterations allowed';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value > 0) {
                    this.settings.DEFAULT_ITERATIONS = value;
                    this.saveSettings();
                }
            },
            container: iterationsContainer
        });

        iterationsContainer.appendChild(iterationsLabel);
        iterationsContainer.appendChild(this.iterationsInfoText);

        // Copy button container (moved above auto-run button)
        const copyButtonContainer = document.createElement('div');
        copyButtonContainer.style.cssText = 'margin-bottom: 10px;';

        this.copyButton = new Button({
            text: 'Copy All Responses',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleCopyButtonClick(event),
            successText: '✅ Copied!',
            successDuration: 1000,
            className: 'copy-responses-button',
            container: copyButtonContainer
        });

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-bottom: 10px;';

        this.toggleButton = new Button({
            text: 'Start Auto Run',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleToggleButtonClick(event),
            className: 'auto-run-toggle-button',
            container: buttonContainer
        });

        // Status display
        this.statusElement = document.createElement('div');
        this.statusElement.textContent = 'Ready to start';
        this.statusElement.style.cssText = 'font-size: 12px; color: #666; text-align: center;';

        section.appendChild(title);
        section.appendChild(promptModeContainer);
        section.appendChild(this.singlePromptContainer);
        section.appendChild(this.multiplePromptContainer);
        section.appendChild(this.templatePromptContainer);
        section.appendChild(iterationsContainer);
        section.appendChild(copyButtonContainer);
        section.appendChild(buttonContainer);
        section.appendChild(this.statusElement);

        container.appendChild(section);
        
        this.updatePromptInputVisibility();
    }

    /**
     * Create TTS section
     */
    createTTSSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '🔊 Text-to-Speech Queue';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Text input
        const textLabel = document.createElement('label');
        textLabel.textContent = 'Text to convert (will be split into chunks):';
        textLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.ttsTextArea = new TextArea({
            value: this.settings.TTS_TEXT || '',
            placeholder: 'Enter the text you want to convert to speech...',
            rows: 6,
            theme: 'primary',
            size: 'medium',
            className: 'tts-text-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.TTS_TEXT = textArea.getValue();
                // Debounce the save to avoid too many writes
                this.ttsTextSaveDebouncer.trigger();
            },
            onChange: (event, textArea) => {
                // Also save on change (when user leaves the field)
                this.settings.TTS_TEXT = textArea.getValue();
                this.saveSettings();
            },
            container: section,
            autoResize: false,
            scopeSelector: `#${this.enhancerId}`
        });

        // Style instructions (prompt) input
        const stylePromptContainer = document.createElement('div');
        stylePromptContainer.style.marginBottom = '12px';
        stylePromptContainer.style.marginTop = '10px';

        const stylePromptLabel = document.createElement('label');
        stylePromptLabel.textContent = 'Style instructions (kept across refresh):';
        stylePromptLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        stylePromptContainer.appendChild(stylePromptLabel);

        this.ttsStylePromptArea = new TextArea({
            value: this.settings.TTS_STYLE_PROMPT || '',
            placeholder: 'Describe the style, e.g. "Dramatic whisper"...',
            rows: 2,
            theme: 'primary',
            size: 'small',
            className: 'tts-style-prompt-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.TTS_STYLE_PROMPT = textArea.getValue();
                this.ttsTextSaveDebouncer.trigger();
            },
            onChange: (event, textArea) => {
                this.settings.TTS_STYLE_PROMPT = textArea.getValue();
                this.saveSettings();
            },
            container: stylePromptContainer,
            autoResize: false,
            scopeSelector: `#${this.enhancerId}`
        });

        // Words per chunk input
        const wordsPerChunkContainer = document.createElement('div');
        wordsPerChunkContainer.style.marginBottom = '12px';
        wordsPerChunkContainer.style.marginTop = '12px';

        const wordsPerChunkLabel = document.createElement('label');
        wordsPerChunkLabel.textContent = 'Words per chunk:';
        wordsPerChunkLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.ttsWordsPerChunkInput = new Input({
            type: 'number',
            value: this.settings.TTS_WORDS_PER_CHUNK || 300,
            placeholder: 'Words per chunk',
            min: 50,
            max: 1000,
            className: 'tts-words-per-chunk-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 50) {
                    return 'Please enter a number between 50 and 1000';
                }
                if (num > 1000) {
                    return 'Maximum 1000 words per chunk';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 50 && value <= 1000) {
                    this.settings.TTS_WORDS_PER_CHUNK = value;
                    this.saveSettings();
                }
            },
            container: wordsPerChunkContainer
        });

        wordsPerChunkContainer.appendChild(wordsPerChunkLabel);

        // Temperature input
        const temperatureContainer = document.createElement('div');
        temperatureContainer.style.marginBottom = '12px';

        const temperatureLabel = document.createElement('label');
        temperatureLabel.textContent = 'Temperature (0 - 2):';
        temperatureLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        temperatureContainer.appendChild(temperatureLabel);

        this.ttsTemperatureInput = new Input({
            type: 'number',
            value: this.settings.TTS_TEMPERATURE ?? 0.75,
            placeholder: '0.75',
            min: 0,
            max: 2,
            step: 0.05,
            className: 'tts-temperature-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0) {
                    return 'Please enter a number between 0 and 2';
                }
                if (num > 2) {
                    return 'Maximum 2.0';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseFloat(input.getValue());
                if (!isNaN(value) && value >= 0 && value <= 2) {
                    this.settings.TTS_TEMPERATURE = value;
                    this.saveSettings();
                }
            },
            container: temperatureContainer
        });

        // Voice selection input
        const voiceContainer = document.createElement('div');
        voiceContainer.style.marginBottom = '12px';

        const voiceLabel = document.createElement('label');
        voiceLabel.textContent = 'Voice name (as shown in selector):';
        voiceLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        voiceContainer.appendChild(voiceLabel);

        this.ttsVoiceInput = new Input({
            type: 'text',
            value: this.settings.TTS_VOICE || '',
            placeholder: 'e.g., Charon',
            className: 'tts-voice-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            onChange: (event, input) => {
                this.settings.TTS_VOICE = input.getValue() || '';
                this.saveSettings();
            },
            container: voiceContainer
        });

        // Filename prefix input
        const filenamePrefixContainer = document.createElement('div');
        filenamePrefixContainer.style.marginBottom = '12px';

        const filenamePrefixLabel = document.createElement('label');
        filenamePrefixLabel.textContent = 'Filename prefix:';
        filenamePrefixLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.ttsFilenamePrefixInput = new Input({
            type: 'text',
            value: this.settings.TTS_FILENAME_PREFIX || 'tts-output',
            placeholder: 'tts-output',
            className: 'tts-filename-prefix-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            onChange: (event, input) => {
                this.settings.TTS_FILENAME_PREFIX = input.getValue() || 'tts-output';
                this.saveSettings();
            },
            container: filenamePrefixContainer
        });

        filenamePrefixContainer.appendChild(filenamePrefixLabel);

        // Retry count input
        const retryCountContainer = document.createElement('div');
        retryCountContainer.style.marginBottom = '12px';

        const retryCountLabel = document.createElement('label');
        retryCountLabel.textContent = 'Retry count (on timeout):';
        retryCountLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.ttsRetryCountInput = new Input({
            type: 'number',
            value: this.settings.TTS_RETRY_COUNT || 5,
            placeholder: '5',
            min: 1,
            max: 20,
            className: 'tts-retry-count-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a number between 1 and 20';
                }
                if (num > 20) {
                    return 'Maximum 20 retries';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 1 && value <= 20) {
                    this.settings.TTS_RETRY_COUNT = value;
                    this.saveSettings();
                }
            },
            container: retryCountContainer
        });

        retryCountContainer.appendChild(retryCountLabel);

        // Download delay input
        const downloadDelayContainer = document.createElement('div');
        downloadDelayContainer.style.marginBottom = '12px';

        const downloadDelayLabel = document.createElement('label');
        downloadDelayLabel.textContent = 'Delay before download (ms):';
        downloadDelayLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        this.ttsDownloadDelayInput = new Input({
            type: 'number',
            value: this.settings.TTS_DOWNLOAD_DELAY_MS ?? 5000,
            placeholder: '5000',
            min: 0,
            max: 600000,
            className: 'tts-download-delay-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 0) {
                    return 'Please enter a number between 0 and 600000';
                }
                if (num > 600000) {
                    return 'Maximum 600000 ms (10 minutes)';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 0 && value <= 600000) {
                    this.settings.TTS_DOWNLOAD_DELAY_MS = value;
                    this.saveSettings();
                }
            },
            container: downloadDelayContainer
        });

        downloadDelayContainer.appendChild(downloadDelayLabel);

        // Start count input
        const startCountContainer = document.createElement('div');
        startCountContainer.style.marginBottom = '12px';

        const startCountLabel = document.createElement('label');
        startCountLabel.textContent = 'Start from chunk number:';
        startCountLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        // Get current chunk number for default (1-indexed)
        const currentChunkNumber = this.currentTTSChunk || 0;
        const defaultStartCount = this.settings.TTS_START_COUNT !== undefined 
            ? this.settings.TTS_START_COUNT 
            : currentChunkNumber;

        this.ttsStartCountInput = new Input({
            type: 'number',
            value: defaultStartCount,
            placeholder: '0',
            min: 0,
            className: 'tts-start-count-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 0) {
                    return 'Please enter a number >= 0';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 0) {
                    this.settings.TTS_START_COUNT = value;
                    this.saveSettings();
                }
            },
            container: startCountContainer
        });

        startCountContainer.appendChild(startCountLabel);

        // TTS Button container
        const ttsButtonContainer = document.createElement('div');
        ttsButtonContainer.style.cssText = 'margin-bottom: 10px;';

        this.ttsToggleButton = new Button({
            text: 'Start TTS Queue',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleTTSToggleButtonClick(event),
            className: 'tts-toggle-button',
            container: ttsButtonContainer
        });

        // TTS Status display
        this.ttsStatusElement = document.createElement('div');
        this.ttsStatusElement.textContent = 'Ready to start';
        this.ttsStatusElement.style.cssText = 'font-size: 12px; color: #666; text-align: center; margin-top: 8px;';

        section.appendChild(title);
        section.appendChild(textLabel);
        section.appendChild(stylePromptContainer);
        section.appendChild(wordsPerChunkContainer);
        section.appendChild(temperatureContainer);
        section.appendChild(voiceContainer);
        section.appendChild(filenamePrefixContainer);
        section.appendChild(retryCountContainer);
        section.appendChild(downloadDelayContainer);
        section.appendChild(startCountContainer);
        section.appendChild(ttsButtonContainer);
        section.appendChild(this.ttsStatusElement);

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

        const interactionSubsection = document.createElement('div');
        interactionSubsection.style.marginBottom = '16px';

        const interactionTitle = document.createElement('h4');
        interactionTitle.textContent = '👆 User Interaction Detection';
        interactionTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #555;';

        this.interactionStatsElement = document.createElement('div');
        this.updateInteractionStats();
        this.interactionStatsElement.style.cssText = `
            color: #666;
            font-size: 11px;
            margin-bottom: 8px;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-line;
        `;

        this.statsUpdateInterval = setInterval(() => {
            this.updateInteractionStats();
        }, 2000);

        interactionSubsection.appendChild(interactionTitle);
        interactionSubsection.appendChild(this.interactionStatsElement);

        section.appendChild(title);
        section.appendChild(interactionSubsection);

        container.appendChild(section);
    }

    /**
     * Update interaction statistics
     */
    updateInteractionStats() {
        if (!this.interactionStatsElement || !this.userInteraction) {
            return;
        }

        const stats = this.userInteraction.getStats();
        const timeSince = stats.timeSinceLastInteraction === Infinity ? 'Never' : `${Math.round(stats.timeSinceLastInteraction / 1000)}s ago`;

        const statsText = [
            `Currently Interacting: ${stats.isInteracting ? '✅ Yes' : '❌ No'}`,
            `Last Interaction: ${timeSince}`,
            `User Interactions: ${stats.userInteractionCount}`,
            `Programmatic Events: ${stats.programmaticEventCount}`,
            `Tracked Elements: ${stats.trackedElements}`,
            `Recent Events: ${stats.recentEvents}`
        ].join('\n');

        this.interactionStatsElement.textContent = statsText;
    }

    /**
     * Handle copy button click
     */
    handleCopyButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.debug('Copy button clicked', {
            isUserInitiated,
            eventType: event?.type,
            isTrusted: event?.isTrusted
        });

        if (isUserInitiated) {
            this.copyAllResponsesManual();
        } else {
            Logger.info('Programmatic copy button click detected - copying silently');
            this.copyAllResponsesSilent();
        }
    }

    /**
     * Handle toggle button click
     */
    handleToggleButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.info('Toggle button clicked', {
            isUserInitiated,
            currentState: this.isAutoRunning
        });

        if (isUserInitiated) {
            this.toggleAutoRun();
        } else {
            Logger.warn('Programmatic toggle button click detected - ignoring');
        }
    }

    /**
     * Toggle auto-run
     */
    async toggleAutoRun() {
        if (this.isAutoRunning) {
            this.stopAutoRun();
        } else {
            await this.startAutoRun();
        }
    }

    /**
     * Start auto-run with simplified approach
     */
    async startAutoRun() {
        if (this.isAutoRunning) {
            this.showNotification('Auto runner is already running', 'warning');
            return;
        }

        // Validate iterations
        if (!this.iterationsInput || !this.iterationsInput.validate()) {
            this.showNotification('Please fix the iterations input error', 'error');
            return;
        }

        const iterations = parseInt(this.iterationsInput.getValue(), 10);
        if (isNaN(iterations) || iterations <= 0) {
            this.showNotification('Please enter a valid number of iterations', 'error');
            return;
        }

        // Get all prompts for this run
        const prompts = this.getAllPrompts(iterations);
        if (prompts.length === 0) {
            this.showNotification('No prompts configured', 'warning');
            return;
        }

        // Update state
        this.isAutoRunning = true;
        this.shouldStopAutoRun = false;
        this.currentIteration = 0;
        this.maxIterations = iterations;

        // Update UI
        this.updateButtonState();
        this.updateAutoRunStatus();

        Logger.info(`Starting auto-run with ${prompts.length} prompts`);
        this.showNotification(`Starting auto-run with ${prompts.length} prompts`, 'info');

        // Run all prompts sequentially
        try {
            await this.runAllPrompts(prompts);
            
            if (!this.shouldStopAutoRun) {
                this.showNotification('Auto-run completed successfully', 'success');
                Logger.success('Auto-run completed successfully');
            }
        } catch (error) {
            Logger.error('Auto-run error:', error);
            this.showNotification(`Auto-run error: ${error.message}`, 'error');
        } finally {
            // Clean up state
            this.isAutoRunning = false;
            this.shouldStopAutoRun = false;
            this.currentIteration = 0;
            this.updateButtonState();
            this.updateAutoRunStatus();
        }
    }

    /**
     * Stop auto-run
     */
    stopAutoRun() {
        if (!this.isAutoRunning) {
            return;
        }

        Logger.info('Stopping auto-run');
        this.shouldStopAutoRun = true;
        this.showNotification('Stopping auto-run...', 'info');
    }

    /**
     * Get all prompts based on mode and iterations
     */
    getAllPrompts(iterations) {
        const mode = this.settings.PROMPT_MODE || 'single';
        const prompts = [];

        switch (mode) {
            case 'single':
                const singlePrompt = this.settings.AUTO_RUN_PROMPT || '';
                for (let i = 0; i < iterations; i++) {
                    prompts.push(singlePrompt);
                }
                break;

            case 'multiple':
                const multiplePrompts = this.settings.MULTIPLE_PROMPTS
                    ? this.settings.MULTIPLE_PROMPTS.split('---')
                        .map(p => p.trim())
                        .filter(p => p.length > 0)
                    : [];
                
                if (multiplePrompts.length === 0) {
                    break;
                }

                const basePrompt = (this.settings.BASE_PROMPT_MULTIPLE || '').trim();

                // Fill prompts array by cycling through available prompts
                for (let i = 0; i < iterations; i++) {
                    const promptIndex = i % multiplePrompts.length;
                    let combinedPrompt = multiplePrompts[promptIndex];
                    
                    // Combine with base prompt if provided
                    if (basePrompt) {
                        combinedPrompt = `${combinedPrompt}\n${basePrompt}`;
                    }
                    
                    prompts.push(combinedPrompt);
                }
                break;

            case 'template':
                const template = this.settings.TEMPLATE_PROMPT || '';
                for (let i = 0; i < iterations; i++) {
                    let prompt = template;
                    const timestamp = new Date().toISOString();
                    
                    // Replace variables
                    prompt = prompt.replace(/\{iteration\}/g, i + 1);
                    prompt = prompt.replace(/\{total\}/g, iterations);
                    prompt = prompt.replace(/\{timestamp\}/g, timestamp);
                    
                    prompts.push(prompt);
                }
                break;
        }

        return prompts;
    }

    /**
     * Run all prompts sequentially (based on your working example)
     */
    async runAllPrompts(prompts) {
        Logger.info(`🚀 Starting prompt automation with ${prompts.length} prompts...`);
        
        for (let i = 0; i < prompts.length; i++) {
            // Check if we should stop
            if (this.shouldStopAutoRun) {
                Logger.info('Auto-run stopped by user');
                break;
            }

            this.currentIteration = i + 1;
            this.updateAutoRunStatus();
            
            await this.processPrompt(prompts[i], i);
            
            // Add delay between prompts (except for the last one)
            if (i < prompts.length - 1 && !this.shouldStopAutoRun) {
                await this.delay(this.settings.AUTO_RUN_DELAY || 1000);
            }
        }
        
        Logger.info('🎉 All prompts processed');
    }

    /**
     * Process a single prompt (based on your working example)
     */
    async processPrompt(prompt, index) {
        Logger.info(`➡️ Processing prompt ${index + 1}/${this.maxIterations}`);
        
        try {
            // Type the prompt
            await this.typePrompt(prompt);
            
            // Small delay to let the UI settle
            await this.delay(300);
            
            // Click run button
            await this.clickRunButton();
            
            // Wait for completion
            await this.waitForPromptCompletion();
            
            Logger.success(`✅ Prompt ${index + 1} completed`);
        } catch (error) {
            Logger.error(`🚨 Error on prompt ${index + 1}:`, error.message);
            throw error;
        }
    }

    /**
     * Type prompt into textarea (based on your working example)
     */
    async typePrompt(prompt) {
        try {
            // Use DOMObserver.waitForElements to wait for any of the prompt input selectors
            const elements = await DOMObserver.waitForElements(AIStudioEnhancer.SELECTORS.PROMPT_INPUTS, 5000);
            const textarea = elements[0];
            if (!textarea) {
                throw new Error("Prompt textarea not found");
            }
            
            return await this.typeIntoElement(textarea, prompt);
        } catch (error) {
            throw new Error("❌ Typing failed: " + error.message);
        }
    }

    /**
     * Type into an element
     */
    async typeIntoElement(element, text) {
        element.focus();
        
        if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
            // Prevent LastPass and other password managers from interfering
            element.setAttribute('autocomplete', 'off');
            element.setAttribute('data-lpignore', 'true');
            element.value = text;
            element.dispatchEvent(new InputEvent('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // For contenteditable
            element.textContent = text;
            element.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
        
        Logger.debug(`⌨️ Typed: "${text.substring(0, 50)}..."`);
    }

    /**
     * Click run button (based on your working example)
     */
    async clickRunButton(retries = 10) {
        // Try multiple selector variations as fallbacks
        const selectors = [
            AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY,
            'button[type="submit"][aria-label="Run"][aria-disabled="false"]:not([disabled])',
            'button[aria-label="Run"][aria-disabled="false"]:not([disabled]):not([type="button"])',
            'button.ms-button-primary[type="submit"][aria-label="Run"][aria-disabled="false"]',
            'button[aria-label="Run"]:not([disabled]):not([aria-disabled="true"]):not([type="button"])'
        ];

        for (let attempt = 0; attempt < retries; attempt++) {
            // Try each selector
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) { // Check if button is visible
                    // Double-check it's actually enabled and ready (not in loading state)
                    const isDisabled = button.hasAttribute('disabled') || 
                                     button.getAttribute('aria-disabled') === 'true';
                    const isTypeSubmit = button.getAttribute('type') === 'submit';
                    const hasStopText = button.textContent?.trim().includes('Stop');
                    const hasSpinner = button.querySelector('.material-symbols-outlined.spin') ||
                                     button.querySelector('span.spin');
                    
                    if (!isDisabled && isTypeSubmit && !hasStopText && !hasSpinner) {
                button.click();
                        Logger.debug(`📤 Clicked Run button using selector: ${selector}`);
                        // Small delay to allow DOM to update after click
                        await this.delay(100);
                return;
                    }
                }
            }
            
            Logger.debug(`⏱ Waiting for Run button to be ready... (attempt ${attempt + 1}/${retries})`);
            await this.delay(500);
        }
        
        // Log available buttons for debugging
        const allRunButtons = document.querySelectorAll('button[aria-label="Run"]');
        Logger.error(`❌ Run button not found. Found ${allRunButtons.length} button(s) with aria-label="Run":`, 
            Array.from(allRunButtons).map(btn => ({
                type: btn.getAttribute('type'),
                ariaDisabled: btn.getAttribute('aria-disabled'),
                disabled: btn.hasAttribute('disabled'),
                textContent: btn.textContent?.trim(),
                hasSpinner: !!btn.querySelector('.material-symbols-outlined.spin'),
                classes: btn.className,
                visible: btn.offsetParent !== null
            }))
        );
        
        throw new Error("❌ Run button not found or never became ready");
    }

    /**
     * Wait for prompt completion (based on your working example)
     */
    async waitForPromptCompletion(timeout = 300000) {
        const start = Date.now();
        
        Logger.debug("🕐 Waiting for prompt to start...");
        
        // Helper function to check if button is in loading state
        const isButtonLoading = () => {
            // Check for loading state indicators
            const runButton = document.querySelector('button[aria-label="Run"]');
            if (!runButton || runButton.offsetParent === null) {
                return false;
            }
            
            // Check if button type changed from "submit" to "button" (indicates loading)
            if (runButton.getAttribute('type') === 'button') {
                return true;
            }
            
            // Check if button contains "Stop" text
            const buttonText = runButton.textContent?.trim() || '';
            if (buttonText.includes('Stop')) {
                return true;
            }
            
            // Check if button has spinner icon (progress_activity or spin class)
            const hasSpinner = runButton.querySelector('.material-symbols-outlined.spin') ||
                              runButton.querySelector('.material-symbols-outlined[class*="progress_activity"]') ||
                              runButton.querySelector('span.spin');
            if (hasSpinner) {
                return true;
            }
            
            // Check if ready button is gone (might indicate loading)
            const readyButton = document.querySelector(AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY);
            if (!readyButton || readyButton.offsetParent === null) {
                // If there's a Run button but it's not ready, it might be loading
                if (runButton && runButton.getAttribute('type') !== 'submit') {
                    return true;
                }
            }
            
            return false;
        };
        
        // Wait for loading state to appear
        let loadingCheckCount = 0;
        while (!isButtonLoading()) {
            if (Date.now() - start > 10000) {
                // Log button state for debugging
                const runButton = document.querySelector('button[aria-label="Run"]');
                Logger.error('⚠️ Timeout waiting for response to start. Current button state:', {
                    exists: !!runButton,
                    type: runButton?.getAttribute('type'),
                    ariaDisabled: runButton?.getAttribute('aria-disabled'),
                    textContent: runButton?.textContent?.trim(),
                    hasSpinner: !!runButton?.querySelector('.material-symbols-outlined.spin'),
                    visible: runButton?.offsetParent !== null
                });
                throw new Error("⚠️ Timed out waiting for response to start");
            }
            if (this.shouldStopAutoRun) {
                throw new Error("Auto-run stopped by user");
            }
            loadingCheckCount++;
            if (loadingCheckCount % 10 === 0) {
                // Log every 2 seconds (10 * 200ms)
                const runButton = document.querySelector('button[aria-label="Run"]');
                Logger.debug('Still waiting for loading state...', {
                    type: runButton?.getAttribute('type'),
                    textContent: runButton?.textContent?.trim(),
                    hasSpinner: !!runButton?.querySelector('.material-symbols-outlined.spin')
                });
            }
            await this.delay(200);
        }
        
        Logger.debug("⏳ Response started... waiting for it to finish");
        
        // Wait for loading state to disappear (button becomes ready again)
        while (isButtonLoading()) {
            if (Date.now() - start > timeout) {
                throw new Error("⏰ Timeout: Prompt processing took too long");
            }
            if (this.shouldStopAutoRun) {
                throw new Error("Auto-run stopped by user");
            }
            await this.delay(500);
        }
        
        Logger.debug("✅ Prompt completed");
    }

    /**
     * Update prompt input visibility
     */
    updatePromptInputVisibility() {
        try {
            const mode = this.settings.PROMPT_MODE || 'single';
            
            if (!this.singlePromptContainer || !this.multiplePromptContainer || !this.templatePromptContainer) {
                Logger.debug('UI elements not yet created');
                return;
            }
            
            this.singlePromptContainer.style.display = 'none';
            this.multiplePromptContainer.style.display = 'none';
            this.templatePromptContainer.style.display = 'none';
            
            switch (mode) {
                case 'single':
                    this.singlePromptContainer.style.display = 'block';
                    break;
                case 'multiple':
                    this.multiplePromptContainer.style.display = 'block';
                    break;
                case 'template':
                    this.templatePromptContainer.style.display = 'block';
                    break;
            }
            
            this.updateIterationInputBehavior(mode);
        } catch (error) {
            Logger.error('Error in updatePromptInputVisibility:', error);
        }
    }

    /**
     * Update iteration input behavior
     */
    updateIterationInputBehavior(mode) {
        try {
            if (!this.iterationsInput || !this.iterationsInfoText) {
                return;
            }
            
            switch (mode) {
                case 'multiple':
                    const prompts = this.settings.MULTIPLE_PROMPTS
                        ? this.settings.MULTIPLE_PROMPTS.split('---').map(p => p.trim()).filter(p => p.length > 0)
                        : [];
                    const promptCount = prompts.length;
                    
                    if (this.overrideIterationsCheckbox) {
                        this.overrideIterationsCheckbox.setVisible(promptCount > 0);
                    }
                    
                    if (promptCount > 0) {
                        const shouldOverride = this.settings.OVERRIDE_ITERATIONS && 
                            this.overrideIterationsCheckbox && 
                            this.overrideIterationsCheckbox.isChecked();
                        
                        if (shouldOverride) {
                            this.iterationsInput.setDisabled(false);
                            this.iterationsInfoText.textContent = `Will run ${this.iterationsInput.getValue()} iterations, cycling through ${promptCount} prompts`;
                        } else {
                            this.iterationsInput.setValue(promptCount.toString());
                            this.iterationsInput.setDisabled(true);
                            this.iterationsInfoText.textContent = `Automatically set to ${promptCount} (number of prompts defined)`;
                        }
                    } else {
                        this.iterationsInput.setValue('1');
                        this.iterationsInput.setDisabled(true);
                        this.iterationsInfoText.textContent = 'Set to 1 (no prompts defined)';
                    }
                    break;
                    
                case 'single':
                case 'template':
                    this.iterationsInput.setDisabled(false);
                    this.iterationsInfoText.textContent = 'Number of iterations to run';
                    
                    if (this.overrideIterationsCheckbox) {
                        this.overrideIterationsCheckbox.setVisible(false);
                    }
                    break;
            }
        } catch (error) {
            Logger.error('Error in updateIterationInputBehavior:', error);
        }
    }

    /**
     * Update button state
     */
    updateButtonState() {
        if (this.toggleButton) {
            if (this.isAutoRunning) {
                this.toggleButton.setText('Stop Auto Run');
                this.toggleButton.setTheme('danger');
            } else {
                this.toggleButton.setText('Start Auto Run');
                this.toggleButton.setTheme('primary');
            }
        }
    }

    /**
     * Update auto-run status
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
     * Setup chat monitoring
     */
    setupChatMonitoring() {
        this.currentChatId = this.extractChatId(window.location.href);
        this.urlWatcher.start();

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
     * Extract chat ID from URL
     */
    extractChatId(url) {
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

        return window.location.pathname;
    }

    /**
     * Handle URL changes
     */
    handleUrlChange(newUrl, oldUrl) {
        const newChatId = this.extractChatId(newUrl);
        if (newChatId !== this.currentChatId) {
            Logger.info(`Chat changed from ${this.currentChatId} to ${newChatId}`);
            this.currentChatId = newChatId;
            this.onChatChanged();
        }
    }

    /**
     * Handle chat DOM changes
     */
    handleChatDOMChanges(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.querySelector && 
                            (node.querySelector('[data-testid*="conversation"]') ||
                             node.querySelector('.conversation') ||
                             node.querySelector('.chat-container'))) {
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
     * Handle chat change
     */
    onChatChanged() {
        Logger.info('Chat changed');
        PubSub.publish(AIStudioEnhancer.EVENTS.CHAT_CHANGED, {
            oldChatId: this.previousChatId || null,
            newChatId: this.currentChatId
        });
        this.previousChatId = this.currentChatId;
    }

    /**
     * Handle chat changed event
     */
    handleChatChangedEvent(data) {
        Logger.info(`Chat changed event: ${data.oldChatId} → ${data.newChatId}`);
        Logger.info('Switched to new chat - responses will be collected fresh when copying');
    }

    /**
     * Handle UI update
     */
    handleUIUpdate(data) {
        switch (data.type) {
            case 'auto-run-status':
                this.updateAutoRunStatus();
                break;
            case 'button-state':
                this.updateButtonState();
                break;
        }
    }

    /**
     * Setup run button interaction tracking
     */
    setupRunButtonInteractionTracking() {
        const runButtonObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.trackRunButtonsInElement(node);
                        }
                    });
                }
            });
        });

        runButtonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.trackExistingRunButtons();
        Logger.debug("Run button interaction tracking setup complete");
    }

    /**
     * Track existing run buttons
     */
    trackExistingRunButtons() {
        // Try multiple selectors to catch all variations
        const selectors = [
            AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY,
            'button[aria-label="Run"]'
        ];
        
        const trackedButtons = new Set();
        selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(button => {
                if (!trackedButtons.has(button)) {
                    trackedButtons.add(button);
            this.trackRunButton(button);
                }
            });
        });
    }

    /**
     * Track run buttons in element
     */
    trackRunButtonsInElement(element) {
        const selectors = [
            AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY,
            'button[aria-label="Run"]'
        ];
        
        if (element.matches) {
            for (const selector of selectors) {
            if (element.matches(selector)) {
                this.trackRunButton(element);
                    return;
                }
            }
        }

        if (element.querySelectorAll) {
            const trackedButtons = new Set();
            selectors.forEach(selector => {
            element.querySelectorAll(selector).forEach(button => {
                    if (!trackedButtons.has(button)) {
                        trackedButtons.add(button);
                this.trackRunButton(button);
                    }
                });
            });
        }
    }

    /**
     * Track a run button
     */
    trackRunButton(button) {
        if (button._aiStudioEnhancerTracked) {
            return;
        }
        button._aiStudioEnhancerTracked = true;

        const unsubscribe = this.userInteraction.trackElement(
            button,
            ['click', 'mousedown', 'touchstart'],
            (interactionData) => {
                this.handleRunButtonInteraction(button, interactionData);
            }
        );

        if (!button._aiStudioEnhancerCleanup) {
            button._aiStudioEnhancerCleanup = [];
        }
        button._aiStudioEnhancerCleanup.push(unsubscribe);

        Logger.debug('Started tracking run button interactions:', button);
    }

    /**
     * Handle run button interaction
     */
    handleRunButtonInteraction(button, interactionData) {
        const { event, isUserInitiated } = interactionData;
        
        Logger.debug('Run button interaction detected', {
            isUserInitiated,
            isAutoRunning: this.isAutoRunning
        });

        if (isUserInitiated && this.isAutoRunning) {
            Logger.info('User clicked run button while auto-run is active');
            this.showNotification('Manual run detected during auto-run - may cause conflicts', 'warning');
        }
    }

    /**
     * Collect responses from the page
     */
    async collectResponsesFresh() {
        Logger.debug('Starting response collection...');
        
        // Try to find autoscroll container using waitForElement
        let autoscrollContainer = null;
        try {
            autoscrollContainer = await HTMLUtils.waitForElement('ms-autoscroll-container', 2000);
        } catch (error) {
            try {
                autoscrollContainer = await HTMLUtils.waitForElement('[ms-autoscroll-container]', 2000);
            } catch (error2) {
                Logger.error('Autoscroll container not found');
                return [];
            }
        }
        
        if (!autoscrollContainer) {
            Logger.error('Autoscroll container not found');
            return [];
        }

        const cssProps = [
            'height', 'max-height', 'min-height', 'width', 'max-width', 'min-width', 
            'overflow', 'container-type', 'outline', 'padding'
        ];
        const originalStyles = {};
        
        cssProps.forEach(prop => {
            originalStyles[prop] = autoscrollContainer.style.getPropertyValue(prop) || '';
        });

        try {
            cssProps.forEach(prop => {
                let value = prop === 'overflow' ? 'visible' : 'auto';
                if (prop === 'container-type') value = 'normal';
                autoscrollContainer.style.setProperty(prop, value, 'important');
            });

            const responseSelectors = AIStudioEnhancer.SELECTORS.RESPONSE_CONTAINERS || [];
            let responseElements = [];

            // Use DOMObserver.waitForElements to find elements using the first selector that yields results
            try {
                const elements = await DOMObserver.waitForElements(responseSelectors, 2000);
                responseElements = Array.from(elements);
            } catch (error) {
                // If no elements found, responseElements remains empty
                Logger.debug('No response elements found yet');
            }
            
            Logger.debug(`Found ${responseElements.length} response elements`);

            const responses = [];
            
            // Helper function to check if element matches the selector criteria
            const isValidResponseElement = (element) => {
                if (!element || !element.isConnected) {
                    return false;
                }
                // Check that it doesn't have .mat-accordion inside it
                return !element.querySelector('.mat-accordion');
            };
            
            // Wait until the element has stabilized without .mat-accordion for a short period
            const waitForNoAccordion = async (element, timeoutMs = 800, intervalMs = 80) => {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    if (!element.isConnected) {
                        return false;
                    }
                    if (!element.querySelector('.mat-accordion')) {
                        return true;
                    }
                    await this.delay(intervalMs);
                }
                return !element.querySelector('.mat-accordion');
            };
            
            // Configure ViewportStabilizer with custom hooks for accordion checking
            const stabilizer = new ViewportStabilizer({
                scrollContainer: null, // Use window/document
                stableDurationMs: 500,
                checkIntervalMs: 120,
                maxWaitMs: 4000,
                scrollDelayMs: 120,
                elementValidator: isValidResponseElement,
                postScrollHook: async (element) => {
                    // Wait for accordion to disappear after scrolling
                    const stable = await waitForNoAccordion(element, 800, 80);
                    if (!stable) {
                        throw new Error('Element still contains accordion after wait');
                    }
                },
                enableDebugLogging: Logger.DEBUG,
                logger: Logger
            });
            
            // Quick stability probe: check if text changes within a short window
            const quickStableCheck = async (element, windowMs = 150) => {
                const text1 = element.textContent || '';
                const height1 = element.offsetHeight || element.scrollHeight || 0;
                await this.delay(windowMs);
                const text2 = element.textContent || '';
                const height2 = element.offsetHeight || element.scrollHeight || 0;
                return text1 === text2 && height1 === height2;
            };
            
            // Process elements using ViewportStabilizer
            for (let i = 0; i < responseElements.length; i++) {
                const element = responseElements[i];
                
                Logger.debug(`Processing response ${i + 1}/${responseElements.length}`);
                
                try {
                    // Scroll first
                    stabilizer.scrollIntoView(element);
                    await this.delay(120);
                
                    // Quick probe: if text/height not changing, skip longer wait
                    let stabilityResult = { stable: true, reason: 'quick-stable' };
                    const quickStable = await quickStableCheck(element, 150);
                    if (!quickStable) {
                        // Fall back to full stabilizer wait
                        stabilityResult = await stabilizer.scrollAndWaitForStable(element);
                    }
                    
                    if (!stabilityResult.stable) {
                        Logger.warn(`Element ${i + 1} did not stabilize: ${stabilityResult.reason}, but continuing anyway`);
                    }
                    
                    // Extract text after element is stable
                let responseText = this.markdownConverter.extractText(element);
                
                // Remove "Model" at the beginning if present
                if (responseText) {
                    responseText = responseText.replace(/^Model\.?\s*/i, '').trim();
                }
                
                if (responseText && responseText.length > 10) {
                    responses.push(responseText);
                    }
                } catch (error) {
                    Logger.warn(`Error processing element ${i + 1}/${responseElements.length}:`, error);
                    // Continue with next element
                }
            }

            Logger.success(`Collected ${responses.length} responses`);
            return responses;

        } catch (error) {
            Logger.error('Error during response collection:', error);
            return [];
        } finally {
            cssProps.forEach(prop => {
                if (originalStyles[prop]) {
                    autoscrollContainer.style.setProperty(prop, originalStyles[prop]);
                } else {
                    autoscrollContainer.style.removeProperty(prop);
                }
            });
        }
    }

    /**
     * Copy all responses silently
     */
    async copyAllResponsesSilent() {
        try {
            const responses = await this.collectResponsesFresh();
            
            if (responses.length === 0) {
                Logger.warn('No responses found to copy');
                return false;
            }

            const content = responses.join('\n\n---\n\n');
            const success = await ClipboardService.copyToClipboard(content);
            
            if (success) {
                Logger.success(`Copied ${responses.length} responses to clipboard silently`);
            } else {
                Logger.error('All clipboard copy methods failed');
            }
            
            return success;
        } catch (error) {
            Logger.error('Error in copyAllResponsesSilent:', error);
            return false;
        }
    }

    /**
     * Copy all responses manually
     */
    async copyAllResponsesManual() {
        try {
            if (this.copyButton) {
                this.copyButton.setText('Copying...');
                this.copyButton.setDisabled(true);
            }

            const responses = await this.collectResponsesFresh();
            
            if (responses.length === 0) {
                this.showNotification('No responses found to copy', 'warning');
                return false;
            }

            const content = responses.join('\n\n---\n\n');
            const success = await ClipboardService.copyToClipboard(content);
            
            if (success) {
                this.showNotification(`✅ Copied ${responses.length} responses to clipboard`, 'success');
            } else {
                Logger.warn('Copy to clipboard failed, manual copy prompt was shown');
            }
            
            return success;
        } catch (error) {
            Logger.error('Error in copyAllResponsesManual:', error);
            this.showNotification('Error occurred while copying responses', 'error');
            return false;
        } finally {
            if (this.copyButton) {
                setTimeout(() => {
                    this.copyButton.setDisabled(false);
                    this.copyButton.setText('Copy All Responses');
                }, 1500);
            }
        }
    }

    /**
     * Handle TTS toggle button click
     */
    handleTTSToggleButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.info('TTS toggle button clicked', {
            isUserInitiated,
            currentState: this.isTTSRunning
        });

        if (isUserInitiated) {
            this.toggleTTS();
        } else {
            Logger.warn('Programmatic TTS toggle button click detected - ignoring');
        }
    }

    /**
     * Toggle TTS queue
     */
    async toggleTTS() {
        if (this.isTTSRunning) {
            this.stopTTS();
        } else {
            await this.startTTS();
        }
    }

    /**
     * Start TTS queue
     */
    async startTTS() {
        if (this.isTTSRunning) {
            this.showNotification('TTS queue is already running', 'warning');
            return;
        }

        // Get text
        const text = this.settings.TTS_TEXT || '';
        if (!text.trim()) {
            this.showNotification('Please enter text to convert', 'error');
            return;
        }

        // Get words per chunk
        const wordsPerChunk = this.settings.TTS_WORDS_PER_CHUNK || 300;
        if (wordsPerChunk < 50 || wordsPerChunk > 1000) {
            this.showNotification('Words per chunk must be between 50 and 1000', 'error');
            return;
        }

        // Split text into chunks
        const chunks = this.splitTextIntoChunks(text, wordsPerChunk);
        if (chunks.length === 0) {
            this.showNotification('No text chunks to process', 'warning');
            return;
        }

        // Get start count (default to current chunk number if available, otherwise 0)
        // Start count is 1-indexed (chunk number, not array index)
        const startCount = this.settings.TTS_START_COUNT !== undefined 
            ? this.settings.TTS_START_COUNT 
            : (this.currentTTSChunk || 0);
        
        // Validate start count (1-indexed, so max is chunks.length)
        if (startCount < 0 || startCount > chunks.length) {
            this.showNotification(`Start count must be between 0 and ${chunks.length}`, 'error');
            return;
        }

        // Apply persisted TTS preferences (style prompt, temperature, voice)
        try {
            await this.applyTTSPreferences();
        } catch (error) {
            Logger.warn('Could not apply saved TTS preferences:', error);
        }

        // Update state
        this.isTTSRunning = true;
        this.shouldStopTTS = false;
        this.ttsChunks = chunks;
        this.currentTTSChunk = startCount; // 1-indexed chunk number
        this.totalTTSChunks = chunks.length;
        this.lastTTSAudioSrc = null; // Reset audio src tracking for new run

        // Update UI
        this.updateTTSButtonState();
        this.updateTTSStatus();

        // Start monitoring for quota errors
        this.startTTSQuotaMonitor();

        Logger.info(`Starting TTS queue with ${chunks.length} chunks`);
        this.showNotification(`Starting TTS queue with ${chunks.length} chunks`, 'info');

        // Process chunks sequentially
        try {
            await this.processTTSChunks(chunks);
            
            if (!this.shouldStopTTS) {
                this.showNotification('TTS queue completed successfully', 'success');
                Logger.success('TTS queue completed successfully');
            }
        } catch (error) {
            Logger.error('TTS queue error:', error);
            this.showNotification(`TTS queue error: ${error.message}`, 'error');
        } finally {
            // Clean up state (but preserve currentTTSChunk for next run)
            this.isTTSRunning = false;
            this.shouldStopTTS = false;
            this.stopTTSQuotaMonitor(); // Stop quota monitoring
            // Don't reset currentTTSChunk to 0 - keep it for next run
            // this.currentTTSChunk = 0;
            this.updateTTSButtonState();
            this.updateTTSStatus();
        }
    }

    /**
     * Stop TTS queue
     */
    stopTTS() {
        if (!this.isTTSRunning) {
            return;
        }

        Logger.info('Stopping TTS queue');
        this.shouldStopTTS = true;
        this.stopTTSQuotaMonitor();
        this.showNotification('Stopping TTS queue...', 'info');
    }

    /**
     * Check for quota exceeded error in the page
     */
    checkForQuotaError() {
        // Check for error messages in snackbar/toast containers
        const errorSelectors = [
            'mat-snack-bar-container',
            'ms-toast-snack-bar-container',
            '.ms-toast',
            '.mat-snack-bar-container',
            'ms-callout.error-callout'
        ];

        for (const selector of errorSelectors) {
            const containers = document.querySelectorAll(selector);
            for (const container of containers) {
                const text = container.textContent || '';
                // Check for quota exceeded messages (case insensitive)
                const lowerText = text.toLowerCase();
                if (lowerText.includes('user has exceeded quota') || 
                    lowerText.includes('exceeded quota') ||
                    (lowerText.includes('quota') && lowerText.includes('exceeded')) ||
                    lowerText.includes('failed to generate content') && lowerText.includes('quota')) {
                    return true;
                }
            }
        }

        // Also check for specific error message elements (more targeted)
        const errorMessages = document.querySelectorAll('.message, .mat-mdc-snack-bar-label, .mdc-snackbar__label, ms-callout .message');
        for (const msg of errorMessages) {
            const text = msg.textContent || '';
            const lowerText = text.toLowerCase();
            // Check for the exact quota error message
            if (lowerText.includes('user has exceeded quota') || 
                lowerText.includes('exceeded quota') ||
                (lowerText.includes('quota') && lowerText.includes('exceeded')) ||
                (lowerText.includes('failed to generate content') && lowerText.includes('quota'))) {
                return true;
            }
        }

        // Check for error callout specifically
        const errorCallouts = document.querySelectorAll('ms-callout.error-callout');
        for (const callout of errorCallouts) {
            const text = callout.textContent || '';
            const lowerText = text.toLowerCase();
            if (lowerText.includes('quota') && (lowerText.includes('exceeded') || lowerText.includes('failed'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Start monitoring for quota errors
     */
    startTTSQuotaMonitor() {
        // Stop any existing monitor
        this.stopTTSQuotaMonitor();

        // Check immediately
        if (this.checkForQuotaError()) {
            Logger.warn('⚠️ Quota error detected, stopping TTS queue');
            this.shouldStopTTS = true;
            this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
            return;
        }

        // Set up mutation observer to watch for new error messages
        this.ttsQuotaMonitor = new MutationObserver((mutations) => {
            // Only check if relevant nodes were added
            let shouldCheck = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added node is a snackbar or contains error-related elements
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            if (element.matches && (
                                element.matches('mat-snack-bar-container') ||
                                element.matches('ms-toast') ||
                                element.matches('ms-callout.error-callout') ||
                                element.querySelector('mat-snack-bar-container, ms-toast, ms-callout.error-callout')
                            )) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                } else if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    // Text content might have changed
                    shouldCheck = true;
                }
                if (shouldCheck) break;
            }
            
            if (shouldCheck && this.checkForQuotaError()) {
                Logger.warn('⚠️ Quota error detected via mutation observer, stopping TTS queue');
                this.shouldStopTTS = true;
                this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                this.stopTTSQuotaMonitor();
            }
        });

        // Observe the document body for new snackbar/toast elements and text changes
        this.ttsQuotaMonitor.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true // Also watch for text content changes
        });

        Logger.debug('TTS quota monitor started');
    }

    /**
     * Stop monitoring for quota errors
     */
    stopTTSQuotaMonitor() {
        if (this.ttsQuotaMonitor) {
            this.ttsQuotaMonitor.disconnect();
            this.ttsQuotaMonitor = null;
            Logger.debug('TTS quota monitor stopped');
        }
    }

    /**
     * Split text into chunks by word count, breaking at closest sentence boundary (.)
     * Uses the shared TextChunker utility class
     */
    splitTextIntoChunks(text, wordsPerChunk) {
        return TextChunker.splitByWords(text, wordsPerChunk, {
            sentenceDelimiter: '.',
            preserveWhitespace: true,
            minChunkSize: 1
        });
    }

    /**
     * Process TTS chunks sequentially
     */
    async processTTSChunks(chunks) {
        // Start index is 0-indexed (array index), currentTTSChunk is 1-indexed (chunk number)
        const startIndex = this.currentTTSChunk > 0 ? this.currentTTSChunk - 1 : 0;
        Logger.info(`🎤 Starting TTS processing with ${chunks.length} chunks (starting from chunk ${startIndex + 1})...`);
        
        for (let i = startIndex; i < chunks.length; i++) {
            // Check if we should stop
            if (this.shouldStopTTS) {
                Logger.info('TTS queue stopped by user');
                break;
            }

            // Check for quota error before processing each chunk
            if (this.checkForQuotaError()) {
                Logger.warn('⚠️ Quota error detected before processing chunk, stopping TTS queue');
                this.shouldStopTTS = true;
                this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                break;
            }

            this.currentTTSChunk = i + 1;
            this.updateTTSStatus();
            
            await this.processTTSChunk(chunks[i], i);
            
            // Check for quota error after processing chunk
            if (this.checkForQuotaError()) {
                Logger.warn('⚠️ Quota error detected after processing chunk, stopping TTS queue');
                this.shouldStopTTS = true;
                this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                break;
            }
            
            // Add delay between chunks (except for the last one)
            // Check shouldStopTTS during delay
            if (i < chunks.length - 1 && !this.shouldStopTTS) {
                for (let j = 0; j < 10; j++) {
                    if (this.shouldStopTTS) {
                        break;
                    }
                    await this.delay(100); // 100ms at a time, checking stop flag
                }
            }
        }
        
        Logger.info('🎉 All TTS chunks processed');
    }

    /**
     * Process a single TTS chunk with retry logic
     */
    async processTTSChunk(chunk, index) {
        Logger.info(`➡️ Processing TTS chunk ${index + 1}/${this.totalTTSChunks}`);
        
        const retryCount = this.settings.TTS_RETRY_COUNT || 5;
        let lastError = null;
        
            for (let attempt = 0; attempt < retryCount; attempt++) {
                // Check if we should stop before starting a new attempt
                if (this.shouldStopTTS) {
                    Logger.info('TTS queue stopped by user - aborting chunk processing');
                    throw new Error('TTS queue stopped by user');
                }
                
                try {
                    // Check for quota error before each attempt
                    if (this.checkForQuotaError()) {
                        Logger.warn('⚠️ Quota error detected before processing chunk, stopping TTS queue');
                        this.shouldStopTTS = true;
                        this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                        throw new Error('Quota exceeded - TTS queue stopped');
                    }

                    if (attempt > 0) {
                        Logger.info(`🔄 Retry attempt ${attempt + 1}/${retryCount} for chunk ${index + 1}`);
                        // Check shouldStopTTS during retry delay
                        for (let i = 0; i < 20; i++) {
                            if (this.shouldStopTTS) {
                                throw new Error('TTS queue stopped by user');
                            }
                            await this.delay(100); // Wait 100ms at a time, checking stop flag
                        }
                    }
                    
                    // Type the text into TTS textarea
                    await this.typeTTSText(chunk);
                    
                    // Small delay to let the UI settle (check shouldStopTTS during delay)
                    for (let i = 0; i < 3; i++) {
                        if (this.shouldStopTTS) {
                            throw new Error('TTS queue stopped by user');
                        }
                        await this.delay(100);
                    }
                    
                    // Click run button
                    await this.clickTTSRunButton();
                    
                    // Check for quota error immediately after clicking (error might appear quickly)
                    // Check shouldStopTTS during delay
                    for (let i = 0; i < 5; i++) {
                        if (this.shouldStopTTS) {
                            throw new Error('TTS queue stopped by user');
                        }
                        await this.delay(100);
                    }
                    if (this.checkForQuotaError()) {
                        Logger.warn('⚠️ Quota error detected after clicking run button, stopping TTS queue');
                        this.shouldStopTTS = true;
                        this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                        throw new Error('Quota exceeded - TTS queue stopped');
                    }
                
                // Calculate timeout based on word count (approximately 1 minute per 100 words, minimum 2 minutes)
                const wordCount = chunk.trim().split(/\s+/).length;
                const timeoutMinutes = Math.max(2, Math.ceil(wordCount / 100));
                const timeoutMs = timeoutMinutes * 60 * 1000;
                
                Logger.debug(`⏱️ Timeout set to ${timeoutMinutes} minutes for ${wordCount} words`);
                
                // Wait for audio to be ready with calculated timeout
                const audioData = await this.waitForTTSAudioReady(timeoutMs);
                
                // Optional delay before starting download (to coordinate with other processes)
                const downloadDelayMs = this.settings.TTS_DOWNLOAD_DELAY_MS ?? AIStudioEnhancer.DEFAULT_SETTINGS.TTS_DOWNLOAD_DELAY_MS;
                if (downloadDelayMs > 0) {
                    Logger.debug(`⏳ Waiting ${downloadDelayMs}ms before downloading TTS audio for chunk ${index + 1}`);
                    // Check shouldStopTTS during delay (split into chunks)
                    const delayChunks = Math.ceil(downloadDelayMs / 100);
                    for (let i = 0; i < delayChunks; i++) {
                        if (this.shouldStopTTS) {
                            throw new Error('TTS queue stopped by user');
                        }
                        await this.delay(100); // 100ms at a time, checking stop flag
                    }
                }
                
                // Download the audio (non-blocking - don't wait for download to complete)
                if (audioData) {
                    // Start download but don't await it - continue to next chunk
                    this.downloadTTSAudio(audioData, index + 1).catch(error => {
                        Logger.error(`Error downloading audio chunk ${index + 1}:`, error);
                    });
                } else {
                    throw new Error('Audio data not found');
                }
                
                Logger.success(`✅ TTS chunk ${index + 1} completed, download started`);
                return; // Success, exit retry loop
                } catch (error) {
                lastError = error;
                
                // If quota error, don't retry - stop immediately
                if (error.message && error.message.includes('Quota exceeded')) {
                    Logger.error(`🚨 Quota exceeded detected, stopping TTS queue immediately`);
                    throw error; // Re-throw to stop processing
                }
                
                // If stopped by user, don't retry - stop immediately
                if (error.message && error.message.includes('stopped by user')) {
                    Logger.info(`🛑 TTS queue stopped by user, aborting chunk processing`);
                    throw error; // Re-throw to stop processing
                }
                
                Logger.warn(`⚠️ Attempt ${attempt + 1}/${retryCount} failed for chunk ${index + 1}:`, error.message);
                
                // If it's the last attempt, throw the error
                if (attempt === retryCount - 1) {
                    Logger.error(`🚨 All ${retryCount} attempts failed for TTS chunk ${index + 1}`);
                    throw error;
                }
            }
        }
        
        // Should never reach here, but just in case
        throw lastError || new Error('Unknown error processing TTS chunk');
    }

    /**
     * Type text into TTS textarea
     */
    async typeTTSText(text) {
        try {
            let textarea = null;
            
            // Try to find TTS textarea using DOMObserver.waitForElements
            try {
                const elements = await DOMObserver.waitForElements(AIStudioEnhancer.SELECTORS.TTS_TEXTAREA, 5000);
                // Find the first visible element
                for (const element of Array.from(elements)) {
                    if (element && element.offsetParent !== null) {
                        textarea = element;
                        break;
                    }
                }
            } catch (error) {
                // Fall through to check if textarea was found
            }
            
            if (!textarea) {
                throw new Error("TTS textarea not found");
            }
            
            return await this.typeIntoElement(textarea, text);
        } catch (error) {
            throw new Error("❌ Typing TTS text failed: " + error.message);
        }
    }

    /**
     * Apply persisted TTS preferences (style prompt, temperature, voice)
     */
    async applyTTSPreferences() {
        const { TTS_STYLE_PROMPT, TTS_TEMPERATURE, TTS_VOICE } = this.settings;

        if (TTS_STYLE_PROMPT && TTS_STYLE_PROMPT.trim()) {
            await this.setTTSStylePrompt(TTS_STYLE_PROMPT.trim());
        }

        if (TTS_TEMPERATURE !== undefined && TTS_TEMPERATURE !== null && !isNaN(Number(TTS_TEMPERATURE))) {
            await this.setTTSTemperature(Number(TTS_TEMPERATURE));
        }

        if (TTS_VOICE && TTS_VOICE.trim()) {
            await this.setTTSVoice(TTS_VOICE.trim());
        }
    }

    /**
     * Set style prompt/voice instructions
     */
    async setTTSStylePrompt(text) {
        const selectors = AIStudioEnhancer.SELECTORS.TTS_STYLE_TEXTAREA || [];
        try {
            const elements = await DOMObserver.waitForElements(selectors, 5000);
            // Find the first visible element
            for (const element of Array.from(elements)) {
                if (element && element.offsetParent !== null) {
                    await this.typeIntoElement(element, text);
                    Logger.debug('✅ Applied TTS style prompt');
                    return;
                }
            }
        } catch (error) {
            Logger.debug('TTS style textarea not found');
        }
        Logger.warn('TTS style prompt textarea not found');
    }

    /**
     * Expand the temperature accordion if it's collapsed
     */
    async expandTemperatureAccordion() {
        try {
            // Find the accordion header by aria-label
            const accordionSelectors = [
                'div.settings-item.settings-group-header button[aria-label*="Model settings"]',
                'div.settings-group-header button[aria-label*="Model settings"]',
                'button[aria-label*="Expand or collapse Model settings"]'
            ];

            let accordionButton = null;
            try {
                const elements = await DOMObserver.waitForElements(accordionSelectors, 2000);
                accordionButton = elements[0];
            } catch (error) {
                Logger.debug('Temperature accordion button not found (may already be expanded or not present)');
                return;
            }

            if (!accordionButton) {
                Logger.debug('Temperature accordion button not found (may already be expanded or not present)');
                return;
            }

            // Check if accordion is already expanded by looking at parent header
            const header = accordionButton.closest('.settings-group-header');
            if (header && header.classList.contains('expanded')) {
                Logger.debug('Temperature accordion is already expanded');
                return;
            }

            // Click to expand
            accordionButton.click();
            Logger.debug('Clicked to expand temperature accordion');

            // Wait for accordion to expand (wait for input to become visible)
            const numberSelectors = AIStudioEnhancer.SELECTORS.TTS_TEMPERATURE_NUMBER || [];
            let expanded = false;
            try {
                const elements = await DOMObserver.waitForElements(numberSelectors, 2000);
                // Check if any element is visible
                for (const el of Array.from(elements)) {
                    if (el && el.offsetParent !== null) {
                        expanded = true;
                        break;
                    }
                }
            } catch (error) {
                // Accordion might not expand, continue
            }
            
            if (!expanded) {
                // Fallback: try checking manually for a few attempts
                for (let attempt = 0; attempt < 20; attempt++) {
                    for (const selector of numberSelectors) {
                        const el = document.querySelector(selector);
                        if (el && el.offsetParent !== null) {
                            expanded = true;
                            break;
                        }
                    }
                    if (expanded) break;
                    await this.delay(100);
                }
            }

            if (expanded) {
                Logger.debug('Temperature accordion expanded successfully');
            } else {
                Logger.warn('Temperature accordion expansion may have failed - input not visible after wait');
            }
        } catch (error) {
            Logger.warn('Error expanding temperature accordion:', error);
        }
    }

    /**
     * Set temperature using the numeric input (preferred over slider)
     */
    async setTTSTemperature(value) {
        // First, expand the accordion if needed
        await this.expandTemperatureAccordion();

        const clamped = Math.min(2, Math.max(0, value));
        let applied = false;

        const setValueAndDispatch = (el) => {
            // Prevent LastPass and other password managers from interfering
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('data-lpignore', 'true');
            el.value = clamped;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // Prefer the numeric input control for temperature instead of the range slider
        const numberSelectors = AIStudioEnhancer.SELECTORS.TTS_TEMPERATURE_NUMBER || [];
        try {
            const elements = await DOMObserver.waitForElements(numberSelectors, 2000);
            // Find the first visible element
            for (const el of Array.from(elements)) {
                if (el && el.offsetParent !== null) {
                    setValueAndDispatch(el);
                    applied = true;
                    break;
                }
            }
        } catch (error) {
            // Fallback to direct querySelector if waitForElements fails
            for (const selector of numberSelectors) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    setValueAndDispatch(el);
                    applied = true;
                    break;
                }
            }
        }

        if (applied) {
            Logger.debug(`✅ Applied TTS temperature via number input: ${clamped}`);
        } else {
            Logger.warn('TTS temperature number input not found');
        }
    }

    /**
     * Set TTS voice by selecting option in mat-select
     */
    async setTTSVoice(voiceName) {
        const selectors = AIStudioEnhancer.SELECTORS.TTS_VOICE_SELECT || [];
        let trigger = null;

        try {
            const elements = await DOMObserver.waitForElements(selectors, 2000);
            // Find the first visible element
            for (const el of Array.from(elements)) {
                if (el && el.offsetParent !== null) {
                    trigger = el;
                    break;
                }
            }
        } catch (error) {
            // Fallback to direct querySelector
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    trigger = el;
                    break;
                }
            }
        }

        if (!trigger) {
            Logger.warn('TTS voice select trigger not found');
            return;
        }

        // Open dropdown
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await this.delay(200);

        let options = [];
        try {
            const elements = await DOMObserver.waitForElements(['mat-option'], 2000);
            options = Array.from(elements);
        } catch (error) {
            // Fallback: try checking manually for a few attempts
            for (let attempt = 0; attempt < 10; attempt++) {
                options = Array.from(document.querySelectorAll('mat-option'));
                if (options.length > 0) break;
                await this.delay(100);
            }
        }

        const lowerVoice = voiceName.toLowerCase();
        const target = options.find(opt => (opt.textContent || '').toLowerCase().includes(lowerVoice));

        if (!target) {
            Logger.warn(`TTS voice option not found for "${voiceName}"`);
            // Close dropdown by clicking trigger again
            trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return;
        }

        const clickable = target.querySelector('.mdc-list-item__primary-text') || target;
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await this.delay(150);
        Logger.debug(`✅ Applied TTS voice: ${voiceName}`);
    }

    /**
     * Click TTS run button
     */
    async clickTTSRunButton(retries = 10) {
        const selectors = [
            AIStudioEnhancer.SELECTORS.TTS_RUN_BUTTON.READY,
            'button[type="submit"][aria-label="Run"][aria-disabled="false"]:not([disabled])',
            'button[aria-label="Run"][aria-disabled="false"]:not([disabled]):not([type="button"])'
        ];

        for (let attempt = 0; attempt < retries; attempt++) {
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    const isDisabled = button.hasAttribute('disabled') || 
                                     button.getAttribute('aria-disabled') === 'true';
                    const isTypeSubmit = button.getAttribute('type') === 'submit';
                    const hasStopText = button.textContent?.trim().includes('Stop');
                    const hasSpinner = button.querySelector('.material-symbols-outlined.spin') ||
                                     button.querySelector('span.spin');
                    
                    if (!isDisabled && isTypeSubmit && !hasStopText && !hasSpinner) {
                        button.click();
                        Logger.debug(`📤 Clicked TTS Run button using selector: ${selector}`);
                        await this.delay(100);
                        return;
                    }
                }
            }
            
            Logger.debug(`⏱ Waiting for TTS Run button to be ready... (attempt ${attempt + 1}/${retries})`);
            await this.delay(500);
        }
        
        throw new Error("❌ TTS Run button not found or never became ready");
    }

    /**
     * Wait for TTS audio to be ready
     * Uses button state checking rather than fixed timeout
     */
    async waitForTTSAudioReady(maxTimeout = 600000) { // 10 minutes max timeout for busy servers
        const start = Date.now();
        const READY_STATE_STABLE_DURATION = 2000; // Button must be ready for 2 seconds to be considered stable
        
        Logger.debug("🕐 Waiting for TTS audio to start...");
        
        // Wait for loading state to appear (button should change to loading)
        let loadingCheckCount = 0;
        const loadingStartTimeout = 15000; // 15 seconds max to detect loading state
        while (!this.isTTSButtonLoading()) {
            if (Date.now() - start > loadingStartTimeout) {
                throw new Error("⚠️ Timed out waiting for TTS to start (button never entered loading state)");
            }
            if (this.shouldStopTTS) {
                throw new Error("TTS queue stopped by user");
            }
            // Check for quota error
            if (this.checkForQuotaError()) {
                Logger.warn('⚠️ Quota error detected while waiting for TTS to start');
                this.shouldStopTTS = true;
                throw new Error("⚠️ Quota exceeded - TTS queue stopped");
            }
            loadingCheckCount++;
            if (loadingCheckCount % 10 === 0) {
                Logger.debug('Still waiting for TTS loading state...');
            }
            await this.delay(200);
        }
        
        const loadingStartTime = Date.now();
        Logger.debug("⏳ TTS started (button in loading state)... waiting for audio to be ready");
        
        // Wait for audio element to appear with data AND button to return to ready state
        // Track previous audio src to detect when a NEW audio is ready
        // First, check if there's existing audio on the page from a previous generation
        let previousAudioSrc = this.lastTTSAudioSrc || null;
        
        // If we don't have a tracked audio src, check for existing audio on the page
        // This handles the case where there's audio from a previous generation that wasn't processed by this script
        if (!previousAudioSrc) {
            const existingAudio = document.querySelector(AIStudioEnhancer.SELECTORS.TTS_AUDIO);
            if (existingAudio && existingAudio.src) {
                previousAudioSrc = existingAudio.src;
                Logger.debug(`🔍 Found existing audio on page (length: ${existingAudio.src.length} chars), will wait for new audio`);
            }
        }
        
        let audioDataUrl = null;
        let audioElement = null;
        let readyStateStartTime = null; // Track when button first becomes ready
        let lastLoadingCheckTime = Date.now(); // Track last time we saw loading state
        let quotaCheckCounter = 0; // Counter for periodic quota checks
        let audioSrcChangeTime = null; // Track when audio src changed
        
        Logger.debug(`🔍 Looking for new audio (previous src: ${previousAudioSrc ? 'exists' : 'none'})`);
        
        while (true) {
            const elapsed = Date.now() - start;
            
            // Check max timeout (safety net for very busy servers)
            if (elapsed > maxTimeout) {
                const loadingDuration = Date.now() - loadingStartTime;
                throw new Error(`⏰ Max timeout reached (${Math.round(maxTimeout / 1000)}s). Processing took too long. Last seen loading: ${Math.round((Date.now() - lastLoadingCheckTime) / 1000)}s ago`);
            }
            
            if (this.shouldStopTTS) {
                throw new Error("TTS queue stopped by user");
            }
            
            // Check for quota error periodically (every 10 iterations, roughly every 2 seconds)
            quotaCheckCounter++;
            if (quotaCheckCounter >= 10) {
                quotaCheckCounter = 0;
                if (this.checkForQuotaError()) {
                    Logger.warn('⚠️ Quota error detected while waiting for audio');
                    this.shouldStopTTS = true;
                    throw new Error("⚠️ Quota exceeded - TTS queue stopped");
                }
            }
            
            // Check button state
            const isCurrentlyLoading = this.isTTSButtonLoading();
            const isCurrentlyReady = !isCurrentlyLoading;
            
            // Update tracking
            if (isCurrentlyLoading) {
                lastLoadingCheckTime = Date.now();
                readyStateStartTime = null; // Reset ready state timer if button goes back to loading
                audioSrcChangeTime = null; // Reset audio src change time when button goes to loading
            } else if (isCurrentlyReady) {
                if (readyStateStartTime === null) {
                    readyStateStartTime = Date.now();
                    Logger.debug("🔄 Button entered ready state, waiting for stability...");
                }
            }
            
            // Check for audio element and detect src changes
            const audio = document.querySelector(AIStudioEnhancer.SELECTORS.TTS_AUDIO);
            if (audio && audio.src) {
                const currentSrc = audio.src;
                
                // Check if this is a NEW audio (src has changed from previous)
                const isNewAudio = previousAudioSrc === null || currentSrc !== previousAudioSrc;
                
                if (isNewAudio && !audioDataUrl) {
                    // New audio detected!
                    audioElement = audio;
                    audioSrcChangeTime = Date.now();
                    Logger.debug(`🆕 New audio detected! Src changed (length: ${currentSrc.length} chars)`);
                    
                    // Extract audio data
                    try {
                        if (currentSrc.startsWith('data:audio/')) {
                            audioDataUrl = currentSrc;
                            Logger.debug("✅ TTS audio found with data URL");
                        } else if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
                            // Try to get the source
                            try {
                                const response = await fetch(currentSrc);
                                const blob = await response.blob();
                                audioDataUrl = await this.blobToDataURL(blob);
                                Logger.debug("✅ TTS audio ready (fetched)");
                            } catch (error) {
                                Logger.warn('Could not fetch audio, using src directly:', error);
                                audioDataUrl = currentSrc;
                            }
                        } else {
                            // Audio element exists but not ready yet, wait a bit
                            Logger.debug(`⏳ Audio element found but not ready yet (readyState: ${audio.readyState})`);
                        }
                    } catch (error) {
                        Logger.warn('Error processing audio src:', error);
                    }
                } else if (!isNewAudio && audioDataUrl) {
                    // Same audio as before, but we already have the data URL - this is fine
                    // Just make sure we have the latest reference
                    audioElement = audio;
                }
            }
            
            // Check if button has been in ready state for the required duration
            const readyStateStable = readyStateStartTime !== null && 
                                   (Date.now() - readyStateStartTime) >= READY_STATE_STABLE_DURATION;
            
            // Also ensure audio src has been stable (not changing) for a bit
            const audioSrcStable = audioSrcChangeTime !== null && 
                                 (Date.now() - audioSrcChangeTime) >= 1000; // Audio src stable for 1 second
            
            // Only proceed if we have NEW audio data AND button has been stable in ready state AND audio src is stable
            if (audioDataUrl && readyStateStable && audioSrcStable) {
                // Wait for audio to be fully loaded and check duration
                if (audioElement) {
                    try {
                        // Wait for audio metadata to be loaded (duration, etc.)
                        let waitCount = 0;
                        while ((!audioElement.duration || isNaN(audioElement.duration) || audioElement.duration === 0) && waitCount < 20) {
                            if (this.shouldStopTTS) {
                                throw new Error("TTS queue stopped by user");
                            }
                            await this.delay(200);
                            waitCount++;
                        }
                        
                        if (audioElement.duration && !isNaN(audioElement.duration) && audioElement.duration > 0) {
                            Logger.debug(`🎵 Audio duration detected: ${audioElement.duration.toFixed(2)}s`);
                        }
                        
                        // Stop autoplay before downloading
                        audioElement.removeAttribute('autoplay');
                        if (!audioElement.paused) {
                            audioElement.pause();
                        }
                        audioElement.currentTime = 0;
                        Logger.debug("🔇 Stopped audio autoplay before download");
                    } catch (error) {
                        Logger.warn('Error processing audio element:', error);
                        // Re-throw if it's a stop error
                        if (error.message && error.message.includes('stopped by user')) {
                            throw error;
                        }
                    }
                }
                
                // Check shouldStopTTS before final delay
                if (this.shouldStopTTS) {
                    throw new Error("TTS queue stopped by user");
                }
                
                // Add additional delay to ensure audio is fully generated and ready
                // This is important because the audio might still be processing even after the button is ready
                // Check shouldStopTTS during delay (split into smaller chunks)
                for (let i = 0; i < 30; i++) {
                    if (this.shouldStopTTS) {
                        throw new Error("TTS queue stopped by user");
                    }
                    await this.delay(100); // 100ms at a time, checking stop flag
                }
                
                // Store this audio src as the last one for next chunk
                this.lastTTSAudioSrc = audioDataUrl;
                
                const totalTime = Math.round((Date.now() - start) / 1000);
                Logger.debug(`✅ TTS audio ready and processing complete (took ${totalTime}s)`);
                return audioDataUrl;
            }
            
            // Log progress every 10 seconds
            if (elapsed % 10000 < 500) {
                const loadingDuration = Math.round((Date.now() - loadingStartTime) / 1000);
                const timeSinceLastLoading = Math.round((Date.now() - lastLoadingCheckTime) / 1000);
                const audioStatus = audioDataUrl ? 'found' : 'waiting';
                Logger.debug(`⏳ Still processing... Loading for ${loadingDuration}s, last loading state ${timeSinceLastLoading}s ago, audio: ${audioStatus}`);
            }
            
            await this.delay(500);
        }
    }

    /**
     * Check if TTS button is in loading state
     */
    isTTSButtonLoading() {
        const runButton = document.querySelector('button[aria-label="Run"]');
        if (!runButton || runButton.offsetParent === null) {
            return false;
        }
        
        if (runButton.getAttribute('type') === 'button') {
            return true;
        }
        
        const buttonText = runButton.textContent?.trim() || '';
        if (buttonText.includes('Stop')) {
            return true;
        }
        
        const hasSpinner = runButton.querySelector('.material-symbols-outlined.spin') ||
                          runButton.querySelector('.material-symbols-outlined[class*="progress_activity"]') ||
                          runButton.querySelector('span.spin');
        if (hasSpinner) {
            return true;
        }
        
        const readyButton = document.querySelector(AIStudioEnhancer.SELECTORS.TTS_RUN_BUTTON.READY);
        if (!readyButton || readyButton.offsetParent === null) {
            if (runButton && runButton.getAttribute('type') !== 'submit') {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Convert blob to data URL
     */
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Download TTS audio (non-blocking)
     */
    async downloadTTSAudio(audioDataUrl, chunkNumber) {
        try {
            const prefix = this.settings.TTS_FILENAME_PREFIX || 'tts-output';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `${prefix}-chunk-${chunkNumber.toString().padStart(3, '0')}-${timestamp}.wav`;
            
            Logger.debug(`📥 Starting download for chunk ${chunkNumber}...`);
            
            // Convert data URL to blob if needed
            let blob;
            if (audioDataUrl.startsWith('data:')) {
                const response = await fetch(audioDataUrl);
                blob = await response.blob();
            } else {
                // If it's a regular URL, fetch it
                const response = await fetch(audioDataUrl);
                blob = await response.blob();
            }
            
            // Log blob size for debugging
            Logger.debug(`📦 Audio blob size: ${(blob.size / 1024).toFixed(2)} KB`);
            
            const url = URL.createObjectURL(blob);
            
            // Use GM_download if available, otherwise fallback
            if (typeof GM_download === 'function') {
                // Don't await - let it download in background
                GM_download({
                    url: url,
                    name: filename,
                    saveAs: false,
                    onload: () => {
                        URL.revokeObjectURL(url);
                        Logger.success(`✅ Downloaded: ${filename} (${(blob.size / 1024).toFixed(2)} KB)`);
                    },
                    onerror: (error) => {
                        Logger.error('GM_download error:', error);
                        this.fallbackDownloadAudio(url, filename);
                    }
                });
            } else {
                this.fallbackDownloadAudio(url, filename);
            }
            
            Logger.info(`📥 Download initiated for chunk ${chunkNumber}: ${filename}`);
        } catch (error) {
            Logger.error('Error downloading TTS audio:', error);
            throw error;
        }
    }

    /**
     * Fallback download method for audio
     */
    fallbackDownloadAudio(url, filename) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            Logger.error('Fallback download error:', error);
        }
    }

    /**
     * Update TTS button state
     */
    updateTTSButtonState() {
        if (this.ttsToggleButton) {
            if (this.isTTSRunning) {
                this.ttsToggleButton.setText('Stop TTS Queue');
                this.ttsToggleButton.setTheme('danger');
            } else {
                this.ttsToggleButton.setText('Start TTS Queue');
                this.ttsToggleButton.setTheme('primary');
            }
        }
    }

    /**
     * Update TTS status
     */
    updateTTSStatus() {
        if (this.ttsStatusElement) {
            if (this.isTTSRunning) {
                this.ttsStatusElement.textContent = `Processing: ${this.currentTTSChunk}/${this.totalTTSChunks}`;
            } else {
                this.ttsStatusElement.textContent = 'Ready to start';
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
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
    Logger.info("Starting Google AI Studio Enhancer initialization");
    
    if (window.location.hostname !== 'aistudio.google.com') {
        Logger.warn("Not on Google AI Studio, script will not run");
        return;
    }

    new AIStudioEnhancer();
}

// Start initialization
init();