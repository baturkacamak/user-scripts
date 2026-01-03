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
    InfoBox,
    Input,
    InputValidators,
    Logger,
    Notification,
    PollingStrategy,
    PubSub,
    SidebarPanel,
    SelectBox,
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
            '.ng-star-inserted .chat-turn-container.model.render .turn-content:not(:has(.mat-accordion)):not(:has(ms-thought-chunk))',
            '.ng-star-inserted .chat-turn-container.model.render .turn-content:has(.turn-information):not(:has(.mat-accordion)):not(:has(ms-thought-chunk))',
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
        BASE_PROMPT_POSITION: 'gaise-base-prompt-position',
        MULTIPLE_PROMPTS_START_COUNT: 'gaise-multiple-prompts-start-count',
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
        TTS_VOICE: 'gaise-tts-voice',
        TTS_MODE: 'gaise-tts-mode',
        TTS_EPISODES: 'gaise-tts-episodes',
        TTS_EPISODE_START_NUMBER: 'gaise-tts-episode-start-number',
        TTS_EPISODE_FILENAME_START_NUMBER: 'gaise-tts-episode-filename-start-number',
        CHUNKED_TEXT: 'gaise-chunked-text',
        CHUNKED_BASE_PROMPT: 'gaise-chunked-base-prompt',
        CHUNKED_WORDS_PER_CHUNK: 'gaise-chunked-words-per-chunk',
        CHUNKED_STRATEGY: 'gaise-chunked-strategy'
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
        BASE_PROMPT_POSITION: 'after',
        MULTIPLE_PROMPTS_START_COUNT: 0,
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
        TTS_VOICE: '',
        TTS_MODE: 'single',
        TTS_EPISODES: '',
        TTS_EPISODE_START_NUMBER: 1,
        TTS_EPISODE_FILENAME_START_NUMBER: 1,
        CHUNKED_TEXT: '',
        CHUNKED_BASE_PROMPT: '',
        CHUNKED_WORDS_PER_CHUNK: 500,
        CHUNKED_STRATEGY: 'soft'
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
        
        // Initialize ThrottleService for delay utilities
        this.throttleService = new ThrottleService();
        
        // TTS state
        this.isTTSRunning = false;
        this.shouldStopTTS = false;
        this.ttsChunks = [];
        this.currentTTSChunk = 0;
        this.totalTTSChunks = 0;
        this.ttsQuotaMonitor = null; // MutationObserver for quota errors
        this.lastTTSAudioSrc = null; // Track last downloaded audio src to detect new audio
        // TTS Episodes state
        this.currentTTSEpisode = 0;
        this.totalTTSEpisodes = 0;
        this.ttsEpisodes = []; // Array of episode objects: [{episodeNum, chunks: [...]}, ...]
        
        // Initialize TextChunker instance
        this.textChunker = new TextChunker();
        
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
                '.author-label',  // Exclude "Model" label
                'mat-accordion',  // Exclude thinking process accordion
                '.mat-accordion',  // Exclude thinking process accordion (with class)
                'ms-thought-chunk',  // Exclude thinking chunk component
                '.thought-panel',  // Exclude thought panel
                '.thinking-progress-icon',  // Exclude thinking icon
                '[class*="thought"]',  // Exclude any element with "thought" in class name
                'mat-expansion-panel[class*="thought"]',  // Exclude thought expansion panels
                'a[href*="grounding-api-redirect"]',  // Exclude citation links (grounding API)
                'a[href*="vertexaisearch"]',  // Exclude citation links (vertex AI search)
                'a[target="_blank"][href*="google.com/url"]',  // Exclude Google redirect citation links
                'ms-grounding-sources',  // Exclude grounding sources section
                '.search-sources',  // Exclude search sources container
                'ms-search-entry-point',  // Exclude Google Search Suggestions section
                '.search-entry-point',  // Exclude search entry point container
                '.search-entry-container'  // Exclude search entry container
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
        return this.throttleService.delay(ms);
    }

    /**
     * Delay with periodic stop flag checking
     * @param {number} totalMs - Total milliseconds to delay
     * @param {Function} shouldStopGetter - Function that returns true if should stop
     * @param {string} errorMessage - Error message to throw if stopped
     * @param {number} checkIntervalMs - Interval to check stop flag (default 100ms)
     */
    async delayWithStopCheck(totalMs, shouldStopGetter, errorMessage = 'Operation stopped by user', checkIntervalMs = 100) {
        return this.throttleService.delayWithStopCheck(totalMs, shouldStopGetter, errorMessage, checkIntervalMs);
    }

    /**
     * Find first visible element from array of selectors
     * @param {string[]} selectors - Array of CSS selectors to try
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Element|null>} First visible element found or null
     */
    async findFirstVisibleElement(selectors, timeout = 5000) {
        return HTMLUtils.findFirstVisibleElement(selectors, timeout);
    }

    /**
     * Check if a run button is in loading state
     * @param {string} readySelector - Selector for the ready state button
     * @returns {boolean} True if button is loading
     */
    isRunButtonLoading(readySelector = null) {
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

        // Check if button has spinner icon
        const hasSpinner = runButton.querySelector('.material-symbols-outlined.spin') ||
                          runButton.querySelector('.material-symbols-outlined[class*="progress_activity"]') ||
                          runButton.querySelector('span.spin');
        if (hasSpinner) {
            return true;
        }

        // Check if ready button is gone
        if (readySelector) {
            const readyButton = document.querySelector(readySelector);
            if (!readyButton || readyButton.offsetParent === null) {
                if (runButton && runButton.getAttribute('type') !== 'submit') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Click a button with retry logic
     * Project-specific method for Google AI Studio button interactions
     * @param {string[]} selectors - Array of selectors to try
     * @param {number} retries - Number of retry attempts
     * @param {string} logPrefix - Prefix for log messages (e.g., 'Run' or 'TTS Run')
     * @returns {Promise<void>}
     */
    async clickButtonWithRetry(selectors, retries = 10, logPrefix = 'Run') {
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
                        Logger.debug(`📤 Clicked ${logPrefix} button using selector: ${selector}`);
                        await this.delay(100);
                        return;
                    }
                }
            }

            Logger.debug(`⏱ Waiting for ${logPrefix} button to be ready... (attempt ${attempt + 1}/${retries})`);
            await this.delay(500);
        }

        // Log available buttons for debugging
        const allRunButtons = document.querySelectorAll('button[aria-label="Run"]');
        Logger.error(`❌ ${logPrefix} button not found. Found ${allRunButtons.length} button(s) with aria-label="Run":`,
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

        throw new Error(`❌ ${logPrefix} button not found or never became ready`);
    }

    /**
     * Update toggle button state based on running status
     * @param {Button} button - The button instance to update
     * @param {boolean} isRunning - Whether the operation is running
     * @param {string} startText - Text to show when not running
     * @param {string} stopText - Text to show when running
     */
    updateToggleButtonState(button, isRunning, startText, stopText) {
        if (button) {
            if (isRunning) {
                button.setText(stopText);
                button.setTheme('danger');
            } else {
                button.setText(startText);
                button.setTheme('primary');
            }
        }
    }

    /**
     * Show container based on mode selection
     * @param {string} mode - Current mode value
     * @param {Object} modeContainerMap - Map of mode values to container elements
     */
    showContainerByMode(mode, modeContainerMap) {
        // Hide all containers first
        Object.values(modeContainerMap).forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });

        // Show the container for the current mode
        const activeContainer = modeContainerMap[mode];
        if (activeContainer) {
            activeContainer.style.display = 'block';
        }
    }


    /**
     * Handle quota error if present - checks and handles quota exceeded errors
     * @returns {boolean} True if quota error was detected
     */
    handleQuotaErrorIfPresent() {
        if (this.checkForQuotaError()) {
            Logger.warn('⚠️ Quota error detected, stopping queue');
            this.shouldStopTTS = true;
            this.showNotification('⚠️ Quota exceeded detected. Queue stopped.', 'warning');
            return true;
        }
        return false;
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
                SelectBox.initStyles();
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
                .auto-run-template-prompt-textarea textarea,
                .chunked-base-prompt-textarea textarea {
                    max-height: 200px !important;
                    overflow-y: auto !important;
                }
                
                .chunked-text-textarea textarea {
                    max-height: 300px !important;
                    overflow-y: auto !important;
                }
                
                .tts-text-textarea textarea,
                .tts-episodes-textarea textarea {
                    max-height: 300px !important;
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
                    id: 'chunked-text',
                    label: '📝 Chunked Text',
                    content: () => {
                        const tabContent = document.createElement('div');
                        this.createChunkedTextSection(tabContent);
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
        title.textContent = '🔄 Prompt Automation';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';
        section.appendChild(title);

        // Prompt mode selector
        const promptModeContainer = document.createElement('div');
        promptModeContainer.style.marginBottom = '12px';

        this.promptModeSelect = new SelectBox({
            items: [
                { value: 'single', label: 'Single Prompt (same for all iterations)', selected: (this.settings.PROMPT_MODE || 'single') === 'single' },
                { value: 'multiple', label: 'Multiple Prompts (different for each iteration)', selected: (this.settings.PROMPT_MODE || 'single') === 'multiple' },
                { value: 'template', label: 'Template Prompts (with variables)', selected: (this.settings.PROMPT_MODE || 'single') === 'template' }
            ],
            name: 'prompt-mode',
            id: 'prompt-mode-select',
            label: 'Prompt Mode:',
            placeholder: 'Select prompt mode',
            container: promptModeContainer,
            theme: 'default',
            size: 'medium',
            onChange: (value) => {
                this.settings.PROMPT_MODE = value;
                this.saveSettings();
                this.updatePromptInputVisibility();
            }
        });

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

        const multiplePromptPlaceholder = `Enter prompts separated by --- (three dashes):

First prompt here
can be multiline
---
Second prompt here
also multiline
---
Third prompt`;

        this.multiplePromptTextArea = new TextArea({
            value: this.settings.MULTIPLE_PROMPTS || '',
            placeholder: multiplePromptPlaceholder,
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-multiple-prompts-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.MULTIPLE_PROMPTS = textArea.getValue();
                this.saveSettings();
                this.updateIterationInputBehavior(this.settings.PROMPT_MODE || 'single');
            },
            container: this.multiplePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Base prompt for multiple prompts
        // Base prompt position selector
        const basePromptPositionContainer = document.createElement('div');
        basePromptPositionContainer.style.cssText = 'margin-bottom: 8px; margin-top: 12px; display: flex; align-items: center; gap: 8px;';

        const basePromptPosition = this.settings.BASE_PROMPT_POSITION || 'after';
        this.basePromptPositionSelect = new SelectBox({
            items: [
                { value: 'before', label: 'Before prompt', selected: basePromptPosition === 'before' },
                { value: 'after', label: 'After prompt', selected: basePromptPosition === 'after' }
            ],
            name: 'base-prompt-position',
            id: 'base-prompt-position-select',
            label: 'Position:',
            labelPosition: 'inline',
            placeholder: 'Select position',
            container: basePromptPositionContainer,
            theme: 'default',
            size: 'small',
            onChange: (value) => {
                this.settings.BASE_PROMPT_POSITION = value;
                this.saveSettings();
                const newPlaceholder = value === 'before' 
                    ? 'Enter base prompt to prepend to each prompt (optional)'
                    : 'Enter base prompt to append to each prompt (optional)';
                if (this.basePromptMultipleTextArea && this.basePromptMultipleTextArea.textareaElement) {
                    this.basePromptMultipleTextArea.textareaElement.placeholder = newPlaceholder;
                }
            }
        });

        const basePromptPlaceholder = (this.settings.BASE_PROMPT_POSITION || 'after') === 'before' 
            ? 'Enter base prompt to prepend to each prompt (optional)'
            : 'Enter base prompt to append to each prompt (optional)';

        this.basePromptMultipleTextArea = new TextArea({
            value: this.settings.BASE_PROMPT_MULTIPLE || '',
            label: 'Base Prompt (optional):',
            placeholder: basePromptPlaceholder,
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

        this.multiplePromptContainer.appendChild(basePromptPositionContainer);

        // Start count input for multiple prompts
        const startCountContainer = document.createElement('div');
        startCountContainer.style.marginBottom = '12px';
        startCountContainer.style.marginTop = '12px';

        this.multiplePromptsStartCountInput = new Input({
            type: 'number',
            label: 'Start from prompt number:',
            value: this.settings.MULTIPLE_PROMPTS_START_COUNT !== undefined 
                ? this.settings.MULTIPLE_PROMPTS_START_COUNT 
                : 0,
            placeholder: '0',
            min: 0,
            className: 'multiple-prompts-start-count-input',
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
                    this.settings.MULTIPLE_PROMPTS_START_COUNT = value;
                    this.saveSettings();
                }
            },
            container: startCountContainer
        });

        InfoBox.create({
            content: 'Set to 0 to start from the first prompt (1-indexed)',
            variant: 'default',
            container: startCountContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        this.multiplePromptContainer.appendChild(startCountContainer);

        // Template prompts input
        this.templatePromptContainer = document.createElement('div');
        this.templatePromptContainer.className = 'template-prompt-container';
        this.templatePromptContainer.style.display = 'none';

        this.templatePromptTextArea = new TextArea({
            value: this.settings.TEMPLATE_PROMPT || 'This is iteration {iteration} of {total}. Please provide a response.',
            label: 'Template Prompt (use {iteration}, {total}, {timestamp}):',
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

        // Iterations input container
        const iterationsContainer = document.createElement('div');
        iterationsContainer.style.marginBottom = '12px';

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
            label: 'Number of iterations:',
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

        // TTS mode selector
        const ttsModeContainer = document.createElement('div');
        ttsModeContainer.style.marginBottom = '12px';

        this.ttsModeSelect = new SelectBox({
            items: [
                { value: 'single', label: 'Single Text (chunked automatically)', selected: (this.settings.TTS_MODE || 'single') === 'single' },
                { value: 'episodes', label: 'Multiple Episodes (separated by ---)', selected: (this.settings.TTS_MODE || 'single') === 'episodes' }
            ],
            name: 'tts-mode',
            id: 'tts-mode-select',
            label: 'TTS Mode:',
            placeholder: 'Select TTS mode',
            container: ttsModeContainer,
            theme: 'default',
            size: 'medium',
            onChange: (value) => {
                this.settings.TTS_MODE = value;
                this.saveSettings();
                this.updateTTSInputVisibility();
            }
        });

        // Single text input container
        this.ttsSingleTextContainer = document.createElement('div');
        this.ttsSingleTextContainer.className = 'tts-single-text-container';

        this.ttsTextArea = new TextArea({
            value: this.settings.TTS_TEXT || '',
            label: 'Text to convert (will be split into chunks):',
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
            container: this.ttsSingleTextContainer,
            autoResize: false,
            scopeSelector: `#${this.enhancerId}`
        });

        // Episodes input container
        this.ttsEpisodesContainer = document.createElement('div');
        this.ttsEpisodesContainer.className = 'tts-episodes-container';
        this.ttsEpisodesContainer.style.display = 'none';

        this.ttsEpisodesArea = new TextArea({
            value: this.settings.TTS_EPISODES || '',
            label: 'Episodes (separated by ---):',
            placeholder: 'Enter episodes separated by --- (three dashes):\n\nEpisode 1 text here\n---\nEpisode 2 text here\n---\nEpisode 3 text here',
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'tts-episodes-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.TTS_EPISODES = textArea.getValue();
                this.ttsTextSaveDebouncer.trigger();
            },
            onChange: (event, textArea) => {
                this.settings.TTS_EPISODES = textArea.getValue();
                this.saveSettings();
            },
            container: this.ttsEpisodesContainer,
            autoResize: false,
            scopeSelector: `#${this.enhancerId}`
        });

        // Episode start number input (only for episodes mode)
        const episodeStartContainer = document.createElement('div');
        episodeStartContainer.style.marginBottom = '12px';
        episodeStartContainer.style.marginTop = '12px';

        this.ttsEpisodeStartInput = new Input({
            type: 'number',
            label: 'Episode start number (processing):',
            value: this.settings.TTS_EPISODE_START_NUMBER !== undefined 
                ? this.settings.TTS_EPISODE_START_NUMBER 
                : 1,
            placeholder: '1',
            min: 1,
            className: 'tts-episode-start-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a number >= 1';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 1) {
                    this.settings.TTS_EPISODE_START_NUMBER = value;
                    this.saveSettings();
                }
            },
            container: episodeStartContainer
        });

        InfoBox.create({
            content: 'Which episode in the textarea to start processing from (1 = first episode)',
            variant: 'default',
            container: episodeStartContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        // Episode filename start number input (separate from processing start number)
        const episodeFilenameStartContainer = document.createElement('div');
        episodeFilenameStartContainer.style.marginBottom = '12px';
        episodeFilenameStartContainer.style.marginTop = '12px';

        this.ttsEpisodeFilenameStartInput = new Input({
            type: 'number',
            label: 'Episode filename start number:',
            value: this.settings.TTS_EPISODE_FILENAME_START_NUMBER !== undefined 
                ? this.settings.TTS_EPISODE_FILENAME_START_NUMBER 
                : 1,
            placeholder: '1',
            min: 1,
            className: 'tts-episode-filename-start-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a number >= 1';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 1) {
                    this.settings.TTS_EPISODE_FILENAME_START_NUMBER = value;
                    this.saveSettings();
                }
            },
            container: episodeFilenameStartContainer
        });

        InfoBox.create({
            content: 'The episode number to use in filenames (e.g., if pasting episodes 16-18, set to 16)',
            variant: 'default',
            container: episodeFilenameStartContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        InfoBox.create({
            content: 'Each episode will be chunked independently. Example: Episode 1 text --- Episode 2 text --- Episode 3 text',
            variant: 'default',
            container: this.ttsEpisodesContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        this.ttsEpisodesContainer.appendChild(episodeStartContainer);
        this.ttsEpisodesContainer.appendChild(episodeFilenameStartContainer);

        // Style instructions (prompt) input
        const stylePromptContainer = document.createElement('div');
        stylePromptContainer.style.marginBottom = '12px';
        stylePromptContainer.style.marginTop = '10px';

        this.ttsStylePromptArea = new TextArea({
            value: this.settings.TTS_STYLE_PROMPT || '',
            label: 'Style instructions (kept across refresh):',
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

        // TTS Options container (similar to Chunked Text)
        const ttsOptionsContainer = document.createElement('div');
        ttsOptionsContainer.style.cssText = 'margin-top: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px;';

        // Words per chunk input
        const wordsPerChunkContainer = document.createElement('div');
        wordsPerChunkContainer.style.marginBottom = '12px';

        this.ttsWordsPerChunkInput = new Input({
            type: 'number',
            label: 'Words per chunk:',
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

        ttsOptionsContainer.appendChild(wordsPerChunkContainer);

        // Temperature input
        const temperatureContainer = document.createElement('div');
        temperatureContainer.style.marginBottom = '12px';

        this.ttsTemperatureInput = new Input({
            type: 'number',
            label: 'Temperature (0 - 2):',
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

        ttsOptionsContainer.appendChild(temperatureContainer);

        // Voice selection input
        const voiceContainer = document.createElement('div');
        voiceContainer.style.marginBottom = '12px';

        this.ttsVoiceInput = new Input({
            type: 'text',
            label: 'Voice name (as shown in selector):',
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

        this.ttsFilenamePrefixInput = new Input({
            type: 'text',
            label: 'Filename pattern:',
            value: this.settings.TTS_FILENAME_PREFIX || 'tts-output-chunk-{chunkNum}-{timestamp}',
            placeholder: 'tts-output-chunk-{chunkNum}-{timestamp}',
            className: 'tts-filename-prefix-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            scopeSelector: `#${this.enhancerId}`,
            onChange: (event, input) => {
                this.settings.TTS_FILENAME_PREFIX = input.getValue() || 'tts-output-chunk-{chunkNum}-{timestamp}';
                this.saveSettings();
            },
            container: filenamePrefixContainer
        });

        const filenameInfoContent = [
            document.createTextNode('Use variables: {episodeNum}, {chunkNum}, {timestamp}'),
            document.createElement('br'),
            document.createTextNode('Example: agi-bolum-{episodeNum}-chunk-{chunkNum}-{timestamp}')
        ];

        InfoBox.create({
            content: filenameInfoContent,
            variant: 'default',
            container: filenamePrefixContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        // Retry count input
        const retryCountContainer = document.createElement('div');
        retryCountContainer.style.marginBottom = '12px';

        this.ttsRetryCountInput = new Input({
            type: 'number',
            label: 'Retry count (on timeout):',
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

        // Download delay input
        const downloadDelayContainer = document.createElement('div');
        downloadDelayContainer.style.marginBottom = '12px';

        this.ttsDownloadDelayInput = new Input({
            type: 'number',
            label: 'Delay before download (ms):',
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

        // Start count input
        const startCountContainer = document.createElement('div');
        startCountContainer.style.marginBottom = '12px';

        // Get current chunk number for default (1-indexed)
        const currentChunkNumber = this.currentTTSChunk || 0;
        const defaultStartCount = this.settings.TTS_START_COUNT !== undefined 
            ? this.settings.TTS_START_COUNT 
            : currentChunkNumber;

        this.ttsStartCountInput = new Input({
            type: 'number',
            label: 'Start from chunk number:',
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
        section.appendChild(ttsModeContainer);
        section.appendChild(this.ttsSingleTextContainer);
        section.appendChild(this.ttsEpisodesContainer);
        section.appendChild(stylePromptContainer);
        section.appendChild(ttsOptionsContainer);
        section.appendChild(voiceContainer);
        section.appendChild(filenamePrefixContainer);
        section.appendChild(retryCountContainer);
        section.appendChild(downloadDelayContainer);
        section.appendChild(startCountContainer);
        section.appendChild(ttsButtonContainer);
        section.appendChild(this.ttsStatusElement);

        container.appendChild(section);
        
        // Update visibility based on current mode
        this.updateTTSInputVisibility();
    }

    /**
     * Create chunked text section
     */
    createChunkedTextSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '📝 Chunked Text Posting';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        // Info text
        const infoContent = [
            document.createTextNode('Chunk long text and post as a single prompt:'),
            document.createElement('br'),
            document.createTextNode('• Text will be split into chunks'),
            document.createElement('br'),
            document.createTextNode('• All chunks will be combined with "---" separator'),
            document.createElement('br'),
            document.createTextNode('• Final prompt: Base prompt + (chunk1 --- chunk2 --- ...)')
        ];
        
        InfoBox.create({
            content: infoContent,
            variant: 'default',
            container: section,
            scopeSelector: `#${this.enhancerId}`
        });

        // Text to chunk
        this.chunkedTextArea = new TextArea({
            value: this.settings.CHUNKED_TEXT || '',
            label: 'Text to Chunk:',
            placeholder: 'Enter the long text you want to chunk...',
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'chunked-text-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.CHUNKED_TEXT = textArea.getValue();
                this.saveSettings();
            },
            container: section,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Base prompt
        this.chunkedBasePromptArea = new TextArea({
            value: this.settings.CHUNKED_BASE_PROMPT || '',
            label: 'Base Prompt:',
            placeholder: 'Enter base prompt (chunks will be appended with --- separator)',
            rows: 3,
            theme: 'primary',
            size: 'medium',
            className: 'chunked-base-prompt-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.CHUNKED_BASE_PROMPT = textArea.getValue();
                this.saveSettings();
            },
            container: section,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Chunking options
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = 'margin-top: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px;';

        // Words per chunk
        this.chunkedWordsPerChunkInput = new Input({
            type: 'number',
            label: 'Words per chunk:',
            value: this.settings.CHUNKED_WORDS_PER_CHUNK || 500,
            placeholder: 'Words per chunk',
            min: 10,
            max: 5000,
            className: 'chunked-words-per-chunk-input',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true', step: '50' },
            scopeSelector: `#${this.enhancerId}`,
            validator: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 10) {
                    return 'Please enter a number between 10 and 5000';
                }
                if (num > 5000) {
                    return 'Maximum 5000 words per chunk';
                }
                return true;
            },
            onChange: (event, input) => {
                const value = parseInt(input.getValue(), 10);
                if (!isNaN(value) && value >= 10 && value <= 5000) {
                    this.settings.CHUNKED_WORDS_PER_CHUNK = value;
                    this.saveSettings();
                }
            },
            container: optionsContainer
        });

        // Strategy selector
        this.chunkedStrategySelect = new SelectBox({
            items: [
                { value: 'soft', label: 'Soft (allow overflow to finish sentence)', selected: (this.settings.CHUNKED_STRATEGY || 'soft') === 'soft' },
                { value: 'hard', label: 'Hard (strict cut at boundary)', selected: (this.settings.CHUNKED_STRATEGY || 'soft') === 'hard' }
            ],
            name: 'chunked-strategy',
            id: 'chunked-strategy-select',
            label: 'Chunking strategy:',
            placeholder: 'Select strategy',
            container: optionsContainer,
            theme: 'default',
            size: 'small',
            onChange: (value) => {
                this.settings.CHUNKED_STRATEGY = value;
                this.saveSettings();
            }
        });

        section.appendChild(optionsContainer);

        // Post button
        const postButtonContainer = document.createElement('div');
        postButtonContainer.style.cssText = 'margin-top: 12px; margin-bottom: 10px;';

        this.chunkedPostButton = new Button({
            text: 'Chunk & Post to AI Studio',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleChunkedTextPost(event),
            className: 'chunked-post-button',
            container: postButtonContainer
        });

        section.appendChild(postButtonContainer);

        // Status display
        this.chunkedStatusElement = document.createElement('div');
        this.chunkedStatusElement.textContent = 'Ready to chunk and post';
        this.chunkedStatusElement.style.cssText = 'font-size: 12px; color: #666; text-align: center; margin-top: 8px;';
        section.appendChild(this.chunkedStatusElement);

        container.appendChild(section);
    }

    /**
     * Create settings section
     */
    createSettingsSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '⚙️ Settings';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        const interactionSubsection = document.createElement('div');
        interactionSubsection.style.marginBottom = '16px';

        const interactionTitle = document.createElement('h4');
        interactionTitle.textContent = '👆 User Interaction Detection';
        interactionTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333;';

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
                const basePromptPosition = this.settings.BASE_PROMPT_POSITION || 'after';
                const startCount = this.settings.MULTIPLE_PROMPTS_START_COUNT || 0;
                
                // Validate start count (1-indexed, so max is multiplePrompts.length)
                const validStartCount = Math.max(0, Math.min(startCount, multiplePrompts.length));
                
                // Calculate starting index (convert from 1-indexed to 0-indexed)
                const startIndex = validStartCount > 0 ? validStartCount - 1 : 0;

                // Fill prompts array by cycling through available prompts, starting from startIndex
                for (let i = 0; i < iterations; i++) {
                    // Calculate the actual prompt index (accounting for start count and cycling)
                    const actualIndex = (startIndex + i) % multiplePrompts.length;
                    let combinedPrompt = multiplePrompts[actualIndex];
                    
                    // Combine with base prompt if provided
                    if (basePrompt) {
                        if (basePromptPosition === 'before') {
                            combinedPrompt = `${basePrompt}\n${combinedPrompt}`;
                        } else {
                            combinedPrompt = `${combinedPrompt}\n${basePrompt}`;
                        }
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
        const selectors = [
            AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY,
            'button[type="submit"][aria-label="Run"][aria-disabled="false"]:not([disabled])',
            'button[aria-label="Run"][aria-disabled="false"]:not([disabled]):not([type="button"])',
            'button.ms-button-primary[type="submit"][aria-label="Run"][aria-disabled="false"]',
            'button[aria-label="Run"]:not([disabled]):not([aria-disabled="true"]):not([type="button"])'
        ];
        return this.clickButtonWithRetry(selectors, retries, 'Run');
    }

    /**
     * Wait for prompt completion (based on your working example)
     */
    async waitForPromptCompletion(timeout = 300000) {
        const start = Date.now();
        const readySelector = AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY;

        Logger.debug("🕐 Waiting for prompt to start...");

        // Wait for loading state to appear
        let loadingCheckCount = 0;
        while (!this.isRunButtonLoading(readySelector)) {
            if (Date.now() - start > 10000) {
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
        while (this.isRunButtonLoading(readySelector)) {
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

            this.showContainerByMode(mode, {
                'single': this.singlePromptContainer,
                'multiple': this.multiplePromptContainer,
                'template': this.templatePromptContainer
            });

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
        this.updateToggleButtonState(this.toggleButton, this.isAutoRunning, 'Start Auto Run', 'Stop Auto Run');
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
                // Check that it doesn't have thinking process elements inside it
                return !element.querySelector('.mat-accordion') &&
                       !element.querySelector('mat-accordion') &&
                       !element.querySelector('ms-thought-chunk') &&
                       !element.querySelector('[class*="thought"]') &&
                       !element.querySelector('.thought-panel');
            };
            
            // Wait until the element has stabilized without thinking process elements for a short period
            const waitForNoThinkingElements = async (element, timeoutMs = 800, intervalMs = 80) => {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    if (!element.isConnected) {
                        return false;
                    }
                    // Check for all thinking-related elements
                    if (!element.querySelector('.mat-accordion') &&
                        !element.querySelector('mat-accordion') &&
                        !element.querySelector('ms-thought-chunk') &&
                        !element.querySelector('[class*="thought"]') &&
                        !element.querySelector('.thought-panel')) {
                        return true;
                    }
                    await this.delay(intervalMs);
                }
                // Final check
                return !element.querySelector('.mat-accordion') &&
                       !element.querySelector('mat-accordion') &&
                       !element.querySelector('ms-thought-chunk') &&
                       !element.querySelector('[class*="thought"]') &&
                       !element.querySelector('.thought-panel');
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
                    // Wait for thinking elements to disappear after scrolling
                    const stable = await waitForNoThinkingElements(element, 800, 80);
                    if (!stable) {
                        throw new Error('Element still contains thinking process elements after wait');
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
                
                // Remove citation links and patterns (e.g., [1], [2], etc.)
                if (responseText) {
                    // Remove citation patterns like [1], [2], [3], etc.
                    // This handles cases where citation links were removed but brackets remain
                    responseText = responseText.replace(/\[\s*\d+\s*\]/g, '');
                    // Remove standalone citation numbers in brackets that might be on their own line
                    responseText = responseText.replace(/^\s*\[\s*\d+\s*\]\s*$/gm, '');
                    // Clean up any extra spaces left after removing citations
                    responseText = responseText.replace(/\s+\[\s*\]/g, ''); // Remove empty brackets with spaces
                    responseText = responseText.replace(/\[\s*\]/g, ''); // Remove empty brackets
                }
                
                // Remove sources and search suggestions sections
                if (responseText) {
                    // Remove "Sources" section header and content
                    responseText = responseText.replace(/^Sources\s*$/gmi, '');
                    responseText = responseText.replace(/Sources\s*$/gmi, '');
                    // Remove "Google Search Suggestions" section
                    responseText = responseText.replace(/^Google Search Suggestions\s*$/gmi, '');
                    responseText = responseText.replace(/Google Search Suggestions\s*$/gmi, '');
                    // Remove "Learn more" links that might appear
                    responseText = responseText.replace(/Learn more\s*/gi, '');
                    // Remove lines that are just source URLs (common domains)
                    responseText = responseText.replace(/^\s*(normalsozluk\.com|wikipedia\.org|youtube\.com|google\.com)\s*$/gmi, '');
                }
                
                // Remove any remaining thinking-related text patterns
                if (responseText) {
                    // Remove lines that contain thinking-related keywords
                    const thinkingPatterns = [
                        /^Thoughts?\s*$/i,
                        /^Expand to view model thoughts?\s*$/i,
                        /^Considering the Impact/i,
                        /^Analyzing/i,
                        /^Unpacking/i,
                        /^Dissecting/i,
                        /^Crafting/i,
                        /^Emphasizing/i
                    ];
                    const lines = responseText.split('\n');
                    const filteredLines = lines.filter(line => {
                        const trimmed = line.trim();
                        return !thinkingPatterns.some(pattern => pattern.test(trimmed));
                    });
                    responseText = filteredLines.join('\n').trim();
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
     * Handle chunked text post button click
     */
    async handleChunkedTextPost(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.info('Chunked text post button clicked', {
            isUserInitiated
        });

        if (!isUserInitiated) {
            Logger.warn('Programmatic chunked text post button click detected - ignoring');
            return;
        }

        await this.postChunkedText();
    }

    /**
     * Post chunked text to AI Studio
     */
    async postChunkedText() {
        try {
            // Get text and base prompt
            const text = this.settings.CHUNKED_TEXT || '';
            const basePrompt = this.settings.CHUNKED_BASE_PROMPT || '';

            if (!text.trim()) {
                this.showNotification('Please enter text to chunk', 'error');
                this.chunkedStatusElement.textContent = 'Error: No text to chunk';
                this.chunkedStatusElement.style.color = '#d32f2f';
                return;
            }

            // Update UI
            if (this.chunkedPostButton) {
                this.chunkedPostButton.setText('Chunking & Posting...');
                this.chunkedPostButton.setDisabled(true);
            }
            this.chunkedStatusElement.textContent = 'Chunking text...';
            this.chunkedStatusElement.style.color = '#666';

            // Initialize TextChunker
            const wordsPerChunk = this.settings.CHUNKED_WORDS_PER_CHUNK || 500;
            const strategy = this.settings.CHUNKED_STRATEGY === 'hard'
                ? TextChunker.STRATEGY.HARD_LIMIT
                : TextChunker.STRATEGY.SOFT_LIMIT;

            // Chunk the text
            // For hard strategy, disable sentence boundaries to get true hard cut at exact word count
            const chunks = this.textChunker.splitByWords(text, wordsPerChunk, {
                strategy: strategy,
                respectSentenceBoundaries: this.settings.CHUNKED_STRATEGY !== 'hard',
                preserveWhitespace: true
            });

            if (chunks.length === 0) {
                this.showNotification('No chunks generated. Text might be too short.', 'warning');
                this.chunkedStatusElement.textContent = 'Error: No chunks generated';
                this.chunkedStatusElement.style.color = '#d32f2f';
                if (this.chunkedPostButton) {
                    this.chunkedPostButton.setDisabled(false);
                    this.chunkedPostButton.setText('Chunk & Post to AI Studio');
                }
                return;
            }

            Logger.info(`Generated ${chunks.length} chunks from text`);

            // Combine chunks with "---" separator
            const chunksCombined = chunks.join('\n---\n');

            // Combine base prompt + chunks
            let finalPrompt = '';
            if (basePrompt.trim()) {
                finalPrompt = `${basePrompt.trim()}\n\n${chunksCombined}`;
            } else {
                finalPrompt = chunksCombined;
            }

            // Update status
            this.chunkedStatusElement.textContent = `Posting ${chunks.length} chunks to AI Studio...`;
            this.chunkedStatusElement.style.color = '#666';

            // Type the prompt into the textarea
            await this.typePrompt(finalPrompt);

            // Small delay to let the UI settle
            await this.delay(300);

            // Click run button
            await this.clickRunButton();

            // Update status
            this.chunkedStatusElement.textContent = `Posted ${chunks.length} chunks successfully!`;
            this.chunkedStatusElement.style.color = '#2e7d32';
            this.showNotification(`Posted ${chunks.length} chunks to AI Studio`, 'success');

            Logger.success(`Posted ${chunks.length} chunks to AI Studio`);

        } catch (error) {
            Logger.error('Error posting chunked text:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            this.chunkedStatusElement.textContent = `Error: ${error.message}`;
            this.chunkedStatusElement.style.color = '#d32f2f';
        } finally {
            if (this.chunkedPostButton) {
                this.chunkedPostButton.setDisabled(false);
                this.chunkedPostButton.setText('Chunk & Post to AI Studio');
            }
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

        const mode = this.settings.TTS_MODE || 'single';
        const wordsPerChunk = this.settings.TTS_WORDS_PER_CHUNK || 300;
        
        if (wordsPerChunk < 50 || wordsPerChunk > 1000) {
            this.showNotification('Words per chunk must be between 50 and 1000', 'error');
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
        this.lastTTSAudioSrc = null; // Reset audio src tracking for new run

        // Update UI
        this.updateTTSButtonState();
        this.updateTTSStatus();

        // Start monitoring for quota errors
        this.startTTSQuotaMonitor();

        try {
            if (mode === 'episodes') {
                // Episodes mode
                const episodesText = this.settings.TTS_EPISODES || '';
                if (!episodesText.trim()) {
                    this.showNotification('Please enter episodes to convert', 'error');
                    return;
                }

                // Split by --- to get episodes
                const episodeTexts = episodesText.split('---')
                    .map(ep => ep.trim())
                    .filter(ep => ep.length > 0);

                if (episodeTexts.length === 0) {
                    this.showNotification('No episodes found. Use --- to separate episodes.', 'error');
                    return;
                }

                // Get episode start number (for skipping episodes in textarea)
                const episodeStartNumber = this.settings.TTS_EPISODE_START_NUMBER || 1;
                // Get filename start number (for episode numbers in filenames)
                const filenameStartNumber = this.settings.TTS_EPISODE_FILENAME_START_NUMBER || 1;

                // Calculate which episodes to process (skip episodes before start number)
                const startIndex = Math.max(0, episodeStartNumber - 1); // Convert to 0-indexed
                const episodesToProcess = episodeTexts.slice(startIndex);

                if (episodesToProcess.length === 0) {
                    this.showNotification(`No episodes to process. Start number ${episodeStartNumber} exceeds available episodes.`, 'error');
                    return;
                }

                // Process each episode
                this.totalTTSEpisodes = episodesToProcess.length;
                this.ttsEpisodes = [];

                // Prepare episodes with their chunks
                for (let i = 0; i < episodesToProcess.length; i++) {
                    // Use filename start number for episode number in filenames
                    const episodeFilenameNum = filenameStartNumber + i;
                    const episodeText = episodesToProcess[i];
                    const chunks = this.splitTextIntoChunks(episodeText, wordsPerChunk);
                    
                    if (chunks.length === 0) {
                        Logger.warn(`Episode ${episodeFilenameNum} has no chunks, skipping`);
                        continue;
                    }

                    this.ttsEpisodes.push({
                        episodeNum: episodeFilenameNum, // Use filename number for episodeNum
                        chunks: chunks
                    });
                }

                if (this.ttsEpisodes.length === 0) {
                    this.showNotification('No episodes with valid chunks to process', 'warning');
                    return;
                }

                // Calculate total chunks across all episodes
                this.totalTTSChunks = this.ttsEpisodes.reduce((sum, ep) => sum + ep.chunks.length, 0);
                this.currentTTSChunk = 0;

                Logger.info(`Starting TTS queue with ${this.ttsEpisodes.length} episodes, ${this.totalTTSChunks} total chunks`);
                this.showNotification(`Starting TTS queue with ${this.ttsEpisodes.length} episodes, ${this.totalTTSChunks} total chunks`, 'info');

                // Process episodes sequentially
                await this.processTTSEpisodes();
            } else {
                // Single text mode (existing logic)
                const text = this.settings.TTS_TEXT || '';
                if (!text.trim()) {
                    this.showNotification('Please enter text to convert', 'error');
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

                // Update state
                this.ttsChunks = chunks;
                this.currentTTSChunk = startCount; // 1-indexed chunk number
                this.totalTTSChunks = chunks.length;
                this.currentTTSEpisode = 0;
                this.totalTTSEpisodes = 0;

                Logger.info(`Starting TTS queue with ${chunks.length} chunks`);
                this.showNotification(`Starting TTS queue with ${chunks.length} chunks`, 'info');

                // Process chunks sequentially
                await this.processTTSChunks(chunks);
            }
            
            if (!this.shouldStopTTS) {
                this.showNotification('TTS queue completed successfully', 'success');
                Logger.success('TTS queue completed successfully');
            }
        } catch (error) {
            Logger.error('TTS queue error:', error);
            this.showNotification(`TTS queue error: ${error.message}`, 'error');
        } finally {
            // Clean up state
            this.isTTSRunning = false;
            this.shouldStopTTS = false;
            this.stopTTSQuotaMonitor(); // Stop quota monitoring
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
     * Automatically merges small last chunk with previous chunk if it's too small
     */
    splitTextIntoChunks(text, wordsPerChunk) {
        // Calculate threshold: 50 words or 10% of target chunk size, whichever is smaller
        const minLastChunkSize = Math.min(50, Math.floor(wordsPerChunk * 0.1));
        
        return this.textChunker.splitByWords(text, wordsPerChunk, {
            preserveWhitespace: true,
            minChunkSize: 1,
            minLastChunkSize: minLastChunkSize
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
     * Process TTS episodes sequentially
     */
    async processTTSEpisodes() {
        Logger.info(`🎤 Starting TTS processing with ${this.ttsEpisodes.length} episodes...`);
        
        let globalChunkIndex = 0; // Track global chunk index across all episodes
        
        for (let episodeIdx = 0; episodeIdx < this.ttsEpisodes.length; episodeIdx++) {
            const episode = this.ttsEpisodes[episodeIdx];
            
            // Check if we should stop
            if (this.shouldStopTTS) {
                Logger.info('TTS queue stopped by user');
                break;
            }

            // Check for quota error before processing each episode
            if (this.checkForQuotaError()) {
                Logger.warn('⚠️ Quota error detected before processing episode, stopping TTS queue');
                this.shouldStopTTS = true;
                this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                break;
            }

            this.currentTTSEpisode = episodeIdx + 1;
            this.updateTTSStatus();

            Logger.info(`📺 Processing episode ${episode.episodeNum} (${episode.chunks.length} chunks)`);

            // Process chunks for this episode
            for (let chunkIdx = 0; chunkIdx < episode.chunks.length; chunkIdx++) {
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

                globalChunkIndex++;
                this.currentTTSChunk = globalChunkIndex;
                this.updateTTSStatus();

                // Process chunk with episode number
                await this.processTTSChunk(episode.chunks[chunkIdx], chunkIdx, episode.episodeNum, episode.chunks.length);

                // Check for quota error after processing chunk
                if (this.checkForQuotaError()) {
                    Logger.warn('⚠️ Quota error detected after processing chunk, stopping TTS queue');
                    this.shouldStopTTS = true;
                    this.showNotification('⚠️ Quota exceeded detected. TTS queue stopped.', 'warning');
                    break;
                }

                // Add delay between chunks (except for the last chunk of the last episode)
                if (!(episodeIdx === this.ttsEpisodes.length - 1 && chunkIdx === episode.chunks.length - 1) && !this.shouldStopTTS) {
                    for (let j = 0; j < 10; j++) {
                        if (this.shouldStopTTS) {
                            break;
                        }
                        await this.delay(100); // 100ms at a time, checking stop flag
                    }
                }
            }

            // Check if we should stop after episode
            if (this.shouldStopTTS) {
                break;
            }
        }

        Logger.info('🎉 All TTS episodes processed');
    }

    /**
     * Process a single TTS chunk with retry logic
     */
    async processTTSChunk(chunk, index, episodeNum = null, episodeChunkCount = null) {
        Logger.info(`➡️ Processing TTS chunk ${index + 1}/${this.totalTTSChunks}`);

        const retryCount = this.settings.TTS_RETRY_COUNT || 5;
        const stopCheck = () => this.shouldStopTTS;
        const stopError = 'TTS queue stopped by user';
        let lastError = null;

        for (let attempt = 0; attempt < retryCount; attempt++) {
            if (this.shouldStopTTS) {
                Logger.info('TTS queue stopped by user - aborting chunk processing');
                throw new Error(stopError);
            }

            try {
                // Check for quota error before each attempt
                if (this.handleQuotaErrorIfPresent()) {
                    throw new Error('Quota exceeded - TTS queue stopped');
                }

                if (attempt > 0) {
                    Logger.info(`🔄 Retry attempt ${attempt + 1}/${retryCount} for chunk ${index + 1}`);
                    await this.delayWithStopCheck(2000, stopCheck, stopError);
                }

                // Type the text into TTS textarea
                await this.typeTTSText(chunk);

                // Small delay to let the UI settle
                await this.delayWithStopCheck(300, stopCheck, stopError);

                // Click run button
                await this.clickTTSRunButton();

                // Check for quota error after clicking
                await this.delayWithStopCheck(500, stopCheck, stopError);
                if (this.handleQuotaErrorIfPresent()) {
                    throw new Error('Quota exceeded - TTS queue stopped');
                }

                // Calculate timeout based on word count
                const wordCount = chunk.trim().split(/\s+/).length;
                const timeoutMinutes = Math.max(2, Math.ceil(wordCount / 100));
                const timeoutMs = timeoutMinutes * 60 * 1000;

                Logger.debug(`⏱️ Timeout set to ${timeoutMinutes} minutes for ${wordCount} words`);

                // Wait for audio to be ready
                const audioData = await this.waitForTTSAudioReady(timeoutMs);

                // Optional delay before download
                const downloadDelayMs = this.settings.TTS_DOWNLOAD_DELAY_MS ?? AIStudioEnhancer.DEFAULT_SETTINGS.TTS_DOWNLOAD_DELAY_MS;
                if (downloadDelayMs > 0) {
                    Logger.debug(`⏳ Waiting ${downloadDelayMs}ms before downloading TTS audio for chunk ${index + 1}`);
                    await this.delayWithStopCheck(downloadDelayMs, stopCheck, stopError);
                }

                // Download the audio (non-blocking)
                if (audioData) {
                    const chunkNum = index + 1;
                    this.downloadTTSAudio(audioData, chunkNum, episodeNum, episodeChunkCount).catch(error => {
                        Logger.error(`Error downloading audio chunk ${chunkNum}:`, error);
                    });
                } else {
                    throw new Error('Audio data not found');
                }

                Logger.success(`✅ TTS chunk ${index + 1} completed, download started`);
                return;
            } catch (error) {
                lastError = error;

                // If quota error or stopped by user, don't retry
                if (error.message && (error.message.includes('Quota exceeded') || error.message.includes('stopped by user'))) {
                    throw error;
                }

                Logger.warn(`⚠️ Attempt ${attempt + 1}/${retryCount} failed for chunk ${index + 1}:`, error.message);

                if (attempt === retryCount - 1) {
                    Logger.error(`🚨 All ${retryCount} attempts failed for TTS chunk ${index + 1}`);
                    throw error;
                }
            }
        }

        throw lastError || new Error('Unknown error processing TTS chunk');
    }

    /**
     * Type text into TTS textarea
     */
    async typeTTSText(text) {
        try {
            const textarea = await this.findFirstVisibleElement(AIStudioEnhancer.SELECTORS.TTS_TEXTAREA, 5000);
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
        const element = await this.findFirstVisibleElement(selectors, 5000);
        if (element) {
            await this.typeIntoElement(element, text);
            Logger.debug('✅ Applied TTS style prompt');
        } else {
            Logger.warn('TTS style prompt textarea not found');
        }
    }

    /**
     * Expand the temperature accordion if it's collapsed
     */
    async expandTemperatureAccordion() {
        try {
            const accordionSelectors = [
                'div.settings-item.settings-group-header button[aria-label*="Model settings"]',
                'div.settings-group-header button[aria-label*="Model settings"]',
                'button[aria-label*="Expand or collapse Model settings"]'
            ];

            const accordionButton = await this.findFirstVisibleElement(accordionSelectors, 2000);
            if (!accordionButton) {
                Logger.debug('Temperature accordion button not found (may already be expanded or not present)');
                return;
            }

            // Check if accordion is already expanded
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
            const expandedInput = await this.findFirstVisibleElement(numberSelectors, 2000);

            if (expandedInput) {
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
        const numberSelectors = AIStudioEnhancer.SELECTORS.TTS_TEMPERATURE_NUMBER || [];
        const el = await this.findFirstVisibleElement(numberSelectors, 2000);

        if (el) {
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('data-lpignore', 'true');
            el.value = clamped;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
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
        const trigger = await this.findFirstVisibleElement(selectors, 2000);

        if (!trigger) {
            Logger.warn('TTS voice select trigger not found');
            return;
        }

        // Open dropdown
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await this.delay(200);

        // Wait for options to appear
        let options = [];
        try {
            const elements = await DOMObserver.waitForElements(['mat-option'], 2000);
            options = Array.from(elements);
        } catch (error) {
            // Fallback: poll for options
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
        return this.clickButtonWithRetry(selectors, retries, 'TTS Run');
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
                await this.delayWithStopCheck(3000, () => this.shouldStopTTS, "TTS queue stopped by user");
                
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
        return this.isRunButtonLoading(AIStudioEnhancer.SELECTORS.TTS_RUN_BUTTON.READY);
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
    async downloadTTSAudio(audioDataUrl, chunkNumber, episodeNum = null, episodeChunkCount = null) {
        try {
            const filenamePattern = this.settings.TTS_FILENAME_PREFIX || 'tts-output-chunk-{chunkNum}-{timestamp}';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            
            // Replace variables in filename pattern
            let filename = filenamePattern;
            
            // Replace {chunkNum} with padded chunk number
            const chunkNumStr = chunkNumber.toString().padStart(3, '0');
            filename = filename.replace(/\{chunkNum\}/g, chunkNumStr);
            
            // Replace {episodeNum} if provided
            if (episodeNum !== null) {
                const episodeNumStr = episodeNum.toString().padStart(3, '0');
                filename = filename.replace(/\{episodeNum\}/g, episodeNumStr);
            } else {
                // Remove {episodeNum} if not in episodes mode
                filename = filename.replace(/\{episodeNum\}/g, '');
            }
            
            // Replace {timestamp}
            filename = filename.replace(/\{timestamp\}/g, timestamp);
            
            // Ensure .wav extension
            if (!filename.toLowerCase().endsWith('.wav')) {
                filename = `${filename}.wav`;
            }
            
            Logger.debug(`📥 Starting download for chunk ${chunkNumber}${episodeNum !== null ? ` (episode ${episodeNum})` : ''}...`);
            
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
        this.updateToggleButtonState(this.ttsToggleButton, this.isTTSRunning, 'Start TTS Queue', 'Stop TTS Queue');
    }

    /**
     * Update TTS input visibility based on mode
     */
    updateTTSInputVisibility() {
        try {
            const mode = this.settings.TTS_MODE || 'single';

            if (!this.ttsSingleTextContainer || !this.ttsEpisodesContainer) {
                Logger.debug('TTS UI elements not yet created');
                return;
            }

            this.showContainerByMode(mode, {
                'single': this.ttsSingleTextContainer,
                'episodes': this.ttsEpisodesContainer
            });
        } catch (error) {
            Logger.error('Error in updateTTSInputVisibility:', error);
        }
    }

    /**
     * Update TTS status
     */
    updateTTSStatus() {
        if (this.ttsStatusElement) {
            if (this.isTTSRunning) {
                const mode = this.settings.TTS_MODE || 'single';
                if (mode === 'episodes' && this.currentTTSEpisode !== undefined && this.totalTTSEpisodes !== undefined) {
                    this.ttsStatusElement.textContent = `Episode ${this.currentTTSEpisode}/${this.totalTTSEpisodes}, Chunk ${this.currentTTSChunk}/${this.totalTTSChunks}`;
                } else {
                    this.ttsStatusElement.textContent = `Processing: ${this.currentTTSChunk}/${this.totalTTSChunks}`;
                }
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