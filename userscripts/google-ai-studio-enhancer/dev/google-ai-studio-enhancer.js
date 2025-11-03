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
    ThrottleService,
    UrlChangeWatcher,
    UserInteractionDetector,
    ClipboardService,
    MarkdownConverter
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
            READY: 'button.run-button[aria-label="Run"]:not([disabled]):not(.stoppable)',
            LOADING: 'button.run-button.stoppable',
            DISABLED: 'button.run-button[disabled]',
        },
        RESPONSE_CONTAINERS: [
            '.ng-star-inserted .chat-turn-container.model.render .turn-content:not(:has(.mat-accordion))',
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
        ]
    };

    static SETTINGS_KEYS = {
        DEFAULT_ITERATIONS: 'gaise-default-iterations',
        AUTO_RUN_DELAY: 'gaise-auto-run-delay',
        SHOW_NOTIFICATIONS: 'gaise-show-notifications',
        PANEL_POSITION: 'gaise-panel-position',
        AUTO_RUN_PROMPT: 'gaise-auto-run-prompt',
        PROMPT_MODE: 'gaise-prompt-mode',
        MULTIPLE_PROMPTS: 'gaise-multiple-prompts',
        TEMPLATE_PROMPT: 'gaise-template-prompt',
        OVERRIDE_ITERATIONS: 'gaise-override-iterations'
    };

    static DEFAULT_SETTINGS = {
        DEFAULT_ITERATIONS: 10,
        AUTO_RUN_DELAY: 1000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_RUN_PROMPT: '',
        PROMPT_MODE: 'single',
        MULTIPLE_PROMPTS: '',
        TEMPLATE_PROMPT: 'This is iteration {iteration} of {total}. Please provide a response.',
        OVERRIDE_ITERATIONS: false
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
                .auto-run-template-prompt-textarea {
                    margin-bottom: 12px;
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

        this.createResponseSection(content);
        this.createAutoRunSection(content);
        this.createSettingsSection(content);

        return content;
    }

    /**
     * Create response management section
     */
    createResponseSection(container) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const title = document.createElement('h3');
        title.textContent = '📋 Response Management';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;';

        this.copyButton = new Button({
            text: 'Copy All Responses',
            theme: 'primary',
            size: 'medium',
            onClick: (event) => this.handleCopyButtonClick(event),
            successText: '✅ Copied!',
            successDuration: 1000,
            className: 'copy-responses-button',
            container: section
        });

        section.appendChild(title);
        container.appendChild(section);
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

        const promptModeSelect = document.createElement('select');
        promptModeSelect.style.cssText = 'width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;';
        HTMLUtils.setHTMLSafely(promptModeSelect, `
            <option value="single">Single Prompt (same for all iterations)</option>
            <option value="multiple">Multiple Prompts (different for each iteration)</option>
            <option value="template">Template Prompts (with variables)</option>
        `);
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
        
        const separatorTitle = document.createElement('div');
        HTMLUtils.setHTMLSafely(separatorTitle, '<strong>Separator:</strong> Use <code>---</code> (three dashes) to separate prompts.');
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

        this.multiplePromptTextArea = new TextArea({
            value: this.settings.MULTIPLE_PROMPTS || '',
            placeholder: 'Enter prompts separated by ---:\nFirst prompt\ncan be multiline\n---\nSecond prompt\nalso multiline\n---\nThird prompt',
            rows: 8,
            theme: 'primary',
            size: 'medium',
            className: 'auto-run-multiple-prompts-textarea',
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
        section.appendChild(buttonContainer);
        section.appendChild(this.statusElement);

        container.appendChild(section);
        
        this.updatePromptInputVisibility();
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

                // Fill prompts array by cycling through available prompts
                for (let i = 0; i < iterations; i++) {
                    const promptIndex = i % multiplePrompts.length;
                    prompts.push(multiplePrompts[promptIndex]);
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
            const textarea = document.querySelector(AIStudioEnhancer.SELECTORS.PROMPT_INPUTS[0]);
            if (!textarea) {
                // Try other selectors
                for (const selector of AIStudioEnhancer.SELECTORS.PROMPT_INPUTS) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return await this.typeIntoElement(element, prompt);
                    }
                }
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
        for (let attempt = 0; attempt < retries; attempt++) {
            const button = document.querySelector(AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY);
            if (button) {
                button.click();
                Logger.debug("📤 Clicked Run button");
                return;
            }
            
            Logger.debug("⏱ Waiting for Run button to be ready...");
            await this.delay(500);
        }
        
        throw new Error("❌ Run button not found or never became ready");
    }

    /**
     * Wait for prompt completion (based on your working example)
     */
    async waitForPromptCompletion(timeout = 300000) {
        const start = Date.now();
        
        Logger.debug("🕐 Waiting for prompt to start...");
        
        // Wait for loading state to appear
        while (!document.querySelector(AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.LOADING)) {
            if (Date.now() - start > 10000) {
                throw new Error("⚠️ Timed out waiting for response to start");
            }
            if (this.shouldStopAutoRun) {
                throw new Error("Auto-run stopped by user");
            }
            await this.delay(200);
        }
        
        Logger.debug("⏳ Response started... waiting for it to finish");
        
        // Wait for loading state to disappear
        while (document.querySelector(AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.LOADING)) {
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
        const selector = AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY;
        document.querySelectorAll(selector).forEach(button => {
            this.trackRunButton(button);
        });
    }

    /**
     * Track run buttons in element
     */
    trackRunButtonsInElement(element) {
        if (element.matches) {
            const selector = AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY;
            if (element.matches(selector)) {
                this.trackRunButton(element);
            }
        }

        if (element.querySelectorAll) {
            const selector = AIStudioEnhancer.SELECTORS.MAIN_SUBMIT_BUTTON.READY;
            element.querySelectorAll(selector).forEach(button => {
                this.trackRunButton(button);
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
        
        const autoscrollContainer = document.querySelector('ms-autoscroll-container') 
                                 || document.querySelector('[ms-autoscroll-container]');
        
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

            const responseSelector = AIStudioEnhancer.SELECTORS.RESPONSE_CONTAINERS[0];
            const responseElements = Array.from(document.querySelectorAll(responseSelector));
            
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
            const waitForNoAccordion = async (element, timeoutMs = 1500, intervalMs = 100) => {
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
            
            for (let i = 0; i < responseElements.length; i++) {
                let element = responseElements[i];
                
                // Verify element is still valid before scrolling
                if (!isValidResponseElement(element)) {
                    Logger.debug(`Skipping invalid element ${i + 1}/${responseElements.length}`);
                    continue;
                }
                
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                Logger.debug(`Processing response ${i + 1}/${responseElements.length}`);
                
                await this.delay(200);
                
                // Re-verify element after scrolling (DOM may have changed)
                if (!isValidResponseElement(element)) {
                    Logger.debug(`Element ${i + 1} no longer valid after scrolling, skipping`);
                    continue;
                }
                
                // Give the DOM a moment to settle and ensure accordion is not present
                const stable = await waitForNoAccordion(element, 1500, 120);
                if (!stable) {
                    Logger.debug(`Element ${i + 1} still contains accordion after wait, skipping`);
                    continue;
                }
                
                let responseText = this.markdownConverter.extractText(element);
                
                // Remove "Model" at the beginning if present
                if (responseText) {
                    responseText = responseText.replace(/^Model\.?\s*/i, '').trim();
                }
                
                if (responseText && responseText.length > 10) {
                    responses.push(responseText);
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