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
    ClipboardService,
    Tabs,
    SelectBox,
    InfoBox
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
        // Keep the original aria-label selector, but add language-agnostic fallbacks
        SEND_BUTTON: [
            'div[aria-label="Send"][role="button"]:not([aria-disabled="true"])',
            'div[aria-label="Send"][role="button"]',
            'div[role="button"][aria-label="Send"]',
            // Language-agnostic fallbacks (role + icon shape + enabled)
            'div[role="button"]:has(svg path[d^="M16.0279"]):not([aria-disabled="true"])',
            'div[role="button"]:has(svg path[d^="M16.0279"])'
        ],
        SEND_BUTTON_DISABLED: [
            'div[aria-label="Send"][aria-disabled="true"]',
            'div[role="button"][aria-disabled="true"][aria-label="Send"]',
            // Language-agnostic fallback for disabled state
            'div[role="button"][aria-disabled="true"]:has(svg path[d^="M16.0279"])'
        ]
    };

    static SETTINGS_KEYS = {
        MULTIPLE_PROMPTS: 'maime-multiple-prompts',
        DELAY_SECONDS: 'maime-delay-seconds',
        SHOW_NOTIFICATIONS: 'maime-show-notifications',
        PANEL_POSITION: 'maime-panel-position',
        AUTO_CLEAR_PROMPT: 'maime-auto-clear-prompt',
        PROMPT_MODE: 'maime-prompt-mode',
        AUTO_RUN_PROMPT: 'maime-auto-run-prompt',
        BASE_PROMPT_MULTIPLE: 'maime-base-prompt-multiple',
        BASE_PROMPT_POSITION: 'maime-base-prompt-position',
        MULTIPLE_PROMPTS_START_COUNT: 'maime-multiple-prompts-start-count',
        TEMPLATE_PROMPT: 'maime-template-prompt',
        OVERRIDE_ITERATIONS: 'maime-override-iterations',
        DEFAULT_ITERATIONS: 'maime-default-iterations'
    };

    static DEFAULT_SETTINGS = {
        MULTIPLE_PROMPTS: '',
        DELAY_SECONDS: 3,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_CLEAR_PROMPT: true,
        PROMPT_MODE: 'multiple',
        AUTO_RUN_PROMPT: '',
        BASE_PROMPT_MULTIPLE: '',
        BASE_PROMPT_POSITION: 'after',
        MULTIPLE_PROMPTS_START_COUNT: 0,
        TEMPLATE_PROMPT: 'This is iteration {iteration} of {total}. Please provide a response.',
        OVERRIDE_ITERATIONS: false,
        DEFAULT_ITERATIONS: 10
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
        
        // Debouncer for text saving
        this.textSaveDebouncer = new Debouncer(() => {
            this.saveSettings();
        }, 500);
        
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
                SelectBox.initStyles();
                SelectBox.useDefaultColors();
                Tabs.initStyles();
                Tabs.useDefaultColors();
            } catch (error) {
                Logger.error('Error initializing styles:', error);
            }

            StyleManager.addStyles(`
                .meta-ai-prompts-textarea,
                .meta-ai-delay-input,
                .auto-run-prompt-textarea,
                .auto-run-multiple-prompts-textarea,
                .auto-run-base-prompt-multiple-textarea,
                .auto-run-template-prompt-textarea {
                    margin-bottom: 12px;
                }
                
                .meta-ai-prompts-textarea textarea,
                .auto-run-multiple-prompts-textarea textarea,
                .auto-run-base-prompt-multiple-textarea textarea,
                .auto-run-template-prompt-textarea textarea {
                    max-height: 300px !important;
                    overflow-y: auto !important;
                }
                
                .auto-run-prompt-textarea textarea,
                .auto-run-base-prompt-multiple-textarea textarea {
                    max-height: 200px !important;
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
                
                /* Settings section improvements */
                #meta-ai-media-enhancer-panel h3 {
                    margin-top: 0;
                }
                
                /* Checkbox label styling for better readability */
                #meta-ai-media-enhancer-panel input[type="checkbox"] + label {
                    font-size: 13px;
                    line-height: 1.5;
                    color: #555;
                    cursor: pointer;
                    user-select: none;
                }
                
                #meta-ai-media-enhancer-panel input[type="checkbox"] + label:hover {
                    color: #333;
                }
                
                .single-prompt-container,
                .multiple-prompt-container,
                .template-prompt-container {
                    margin-bottom: 12px;
                }
                
                .single-prompt-container label,
                .multiple-prompt-container label,
                .template-prompt-container label {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 12px;
                    color: #555;
                    font-weight: 500;
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

        // Create tabs to separate prompt automation and settings
        const tabsContainer = document.createElement('div');
        
        this.tabs = new Tabs({
            tabs: [
                {
                    id: 'prompt-automation',
                    label: '🔄 Prompt Automation',
                    content: () => {
                        const tabContent = document.createElement('div');
                        this.createAutomationSection(tabContent);
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
            container: tabsContainer
        });

        content.appendChild(tabsContainer);

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
        section.appendChild(title);

        // Prompt mode selector
        const promptModeContainer = document.createElement('div');
        promptModeContainer.style.marginBottom = '12px';

        this.promptModeSelect = new SelectBox({
            items: [
                { value: 'single', label: 'Single Prompt (same for all iterations)', selected: (this.settings.PROMPT_MODE || 'multiple') === 'single' },
                { value: 'multiple', label: 'Multiple Prompts (different for each iteration)', selected: (this.settings.PROMPT_MODE || 'multiple') === 'multiple' },
                { value: 'template', label: 'Template Prompts (with variables)', selected: (this.settings.PROMPT_MODE || 'multiple') === 'template' }
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
        this.singlePromptContainer.style.display = (this.settings.PROMPT_MODE || 'multiple') === 'single' ? 'block' : 'none';
        
        this.promptTextArea = new TextArea({
            value: this.settings.AUTO_RUN_PROMPT || '',
            label: 'Single Prompt:',
            placeholder: 'Enter prompt to use for all iterations (optional)',
            rows: 3,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-prompt-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.AUTO_RUN_PROMPT = textArea.getValue();
                this.textSaveDebouncer.trigger();
            },
            onBlur: (event, textArea) => {
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
        this.multiplePromptContainer.style.display = (this.settings.PROMPT_MODE || 'multiple') === 'multiple' ? 'block' : 'none';

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
            label: 'Multiple Prompts:',
            placeholder: multiplePromptPlaceholder,
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-multiple-prompts-textarea',
            attributes: { autocomplete: 'off', 'data-lpignore': 'true' },
            onInput: (event, textArea) => {
                this.settings.MULTIPLE_PROMPTS = textArea.getValue();
                this.textSaveDebouncer.trigger();
                this.updateIterationInputBehavior(this.settings.PROMPT_MODE || 'multiple');
            },
            onBlur: (event, textArea) => {
                this.settings.MULTIPLE_PROMPTS = textArea.getValue();
                this.saveSettings();
            },
            container: this.multiplePromptContainer,
            autoResize: true,
            scopeSelector: `#${this.enhancerId}`
        });

        // Base prompt for multiple prompts
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
                this.textSaveDebouncer.trigger();
            },
            onBlur: (event, textArea) => {
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
        this.templatePromptContainer.style.display = (this.settings.PROMPT_MODE || 'multiple') === 'template' ? 'block' : 'none';

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
                this.textSaveDebouncer.trigger();
            },
            onBlur: (event, textArea) => {
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
        this.updateIterationInputBehavior(this.settings.PROMPT_MODE || 'multiple');

        this.overrideIterationsCheckbox = new Checkbox({
            label: 'Override automatic iteration count (run multiple cycles)',
            checked: this.settings.OVERRIDE_ITERATIONS || false,
            onChange: (event) => {
                this.settings.OVERRIDE_ITERATIONS = this.overrideIterationsCheckbox.isChecked();
                this.saveSettings();
                this.updateIterationInputBehavior(this.settings.PROMPT_MODE || 'multiple');
            },
            container: iterationsContainer,
            size: 'small'
        });

        this.iterationsInput = new Input({
            type: 'number',
            label: 'Number of iterations:',
            value: this.settings.DEFAULT_ITERATIONS || 10,
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

        section.appendChild(promptModeContainer);
        section.appendChild(this.singlePromptContainer);
        section.appendChild(this.multiplePromptContainer);
        section.appendChild(this.templatePromptContainer);
        section.appendChild(iterationsContainer);
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
        section.style.cssText = `
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e0e0e0;
        `;

        const title = document.createElement('h3');
        title.textContent = '⚙️ Settings';
        title.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            letter-spacing: 0.3px;
        `;

        // Create a container for checkboxes with better spacing
        const checkboxesContainer = document.createElement('div');
        checkboxesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 14px;
            padding: 0;
        `;

        // Auto clear prompt checkbox container
        const autoClearContainer = document.createElement('div');
        autoClearContainer.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 0;
        `;

        this.autoClearCheckbox = new Checkbox({
            label: 'Auto-clear prompt after sending',
            checked: this.settings.AUTO_CLEAR_PROMPT !== false,
            onChange: (event) => {
                this.settings.AUTO_CLEAR_PROMPT = this.autoClearCheckbox.isChecked();
                this.saveSettings();
            },
            container: autoClearContainer,
            size: 'small'
        });

        // Show notifications checkbox container
        const notificationsContainer = document.createElement('div');
        notificationsContainer.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 0;
        `;

        this.showNotificationsCheckbox = new Checkbox({
            label: 'Show notifications',
            checked: this.settings.SHOW_NOTIFICATIONS !== false,
            onChange: (event) => {
                this.settings.SHOW_NOTIFICATIONS = this.showNotificationsCheckbox.isChecked();
                this.saveSettings();
            },
            container: notificationsContainer,
            size: 'small'
        });

        // Assemble the section
        checkboxesContainer.appendChild(autoClearContainer);
        checkboxesContainer.appendChild(notificationsContainer);
        
        section.appendChild(title);
        section.appendChild(checkboxesContainer);

        container.appendChild(section);
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
     * Update prompt input visibility based on mode
     */
    updatePromptInputVisibility() {
        const mode = this.settings.PROMPT_MODE || 'multiple';
        const modeContainerMap = {
            'single': this.singlePromptContainer,
            'multiple': this.multiplePromptContainer,
            'template': this.templatePromptContainer
        };
        this.showContainerByMode(mode, modeContainerMap);
    }

    /**
     * Update iteration input behavior based on mode
     */
    updateIterationInputBehavior(mode) {
        if (!this.iterationsInfoText) return;

        if (mode === 'multiple') {
            const multiplePrompts = this.settings.MULTIPLE_PROMPTS
                ? this.settings.MULTIPLE_PROMPTS.split('---')
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                : [];
            
            const promptCount = multiplePrompts.length;
            if (promptCount > 0) {
                this.iterationsInfoText.textContent = `Number of iterations to run (${promptCount} prompts available)`;
            } else {
                this.iterationsInfoText.textContent = 'Number of iterations to run';
            }
        } else {
            this.iterationsInfoText.textContent = 'Number of iterations to run';
        }
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
     * Get all prompts based on mode and iterations
     */
    getAllPrompts(iterations) {
        const mode = this.settings.PROMPT_MODE || 'multiple';
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
     * Start automation
     */
    async startAutomation() {
        if (this.isRunning) {
            this.showNotification('Automation is already running', 'warning');
            return;
        }

        // Determine iterations
        let iterations;
        const mode = this.settings.PROMPT_MODE || 'multiple';
        
        if (mode === 'multiple' && !this.settings.OVERRIDE_ITERATIONS) {
            // Auto-detect from multiple prompts
            const multiplePrompts = this.settings.MULTIPLE_PROMPTS
                ? this.settings.MULTIPLE_PROMPTS.split('---')
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                : [];
            iterations = multiplePrompts.length;
        } else {
            // Use configured iterations
            iterations = this.settings.DEFAULT_ITERATIONS || 10;
        }

        if (iterations <= 0) {
            this.showNotification('No prompts found or invalid iteration count', 'error');
            return;
        }

        // Get all prompts based on mode
        const prompts = this.getAllPrompts(iterations);
        if (prompts.length === 0) {
            this.showNotification('No prompts found. Please configure prompts based on selected mode', 'error');
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
        const selectors = MetaAIMediaEnhancer.SELECTORS.SEND_BUTTON;

        for (let attempt = 0; attempt < retries; attempt++) {
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    const isDisabled = button.getAttribute('aria-disabled') === 'true';
                    if (!isDisabled) {
                        const clickEvent = MouseEventUtils.createClickEvent({
                            bubbles: true,
                            cancelable: true,
                            programmatic: true
                        });
                        button.dispatchEvent(clickEvent);
                        Logger.debug(`📤 Clicked Send button using selector: ${selector}`);
                        await this.delay(200);
                        return;
                    }
                }
            }

            Logger.debug(`⏱ Waiting for Send button to be ready... (attempt ${attempt + 1}/${retries})`);
            await this.delay(500);
        }

        // Log available buttons for debugging (language-agnostic)
        const allButtons = document.querySelectorAll('div[role="button"]');
        Logger.error(`❌ Send button not found or disabled. Checked ${selectors.length} selectors. Found ${allButtons.length} role="button" elements:`,
            Array.from(allButtons).map(btn => ({
                ariaLabel: btn.getAttribute('aria-label'),
                ariaDisabled: btn.getAttribute('aria-disabled'),
                visible: btn.offsetParent !== null,
                classes: btn.className,
                hasSendIcon: !!btn.querySelector('svg path[d^="M16.0279"]')
            }))
        );

        throw new Error("❌ Send button not found or never became enabled");
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

