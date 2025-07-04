// Import core components
import {
    AutoRunner,
    AsyncQueueService,
    Button,
    Checkbox,
    ContentCollector,
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
    UserInteractionDetector
} from "../../common/core";
import { getValue, setValue, GM_setClipboard } from "../../common/core/utils/GMFunctions";
import { MouseEventUtils } from '../../common/core/utils/HTMLUtils.js';

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
        AUTO_RUN_PROMPT: 'gaise-auto-run-prompt',
        PROMPT_MODE: 'gaise-prompt-mode',
        MULTIPLE_PROMPTS: 'gaise-multiple-prompts',
        TEMPLATE_PROMPT: 'gaise-template-prompt',
        OVERRIDE_ITERATIONS: 'gaise-override-iterations'
    };

    static DEFAULT_SETTINGS = {
        DEFAULT_ITERATIONS: 10,
        AUTO_RUN_DELAY: 2000,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 },
        AUTO_RUN_PROMPT: '',
        PROMPT_MODE: 'single',
        MULTIPLE_PROMPTS: '',
        TEMPLATE_PROMPT: 'This is iteration {iteration} of {total}. Please provide a response.',
        OVERRIDE_ITERATIONS: false
    };

    // Event names for PubSub communication
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
        this.isInitialLoad = true;
        this.enhancerId = 'ai-studio-enhancer-container';
        
        // Store subscription IDs for cleanup
        this.subscriptionIds = [];
        
        // Initialize cache for persistent response storage
        this.responseCache = new DataCache(Logger);
        
        // Initialize user interaction detector for distinguishing real vs programmatic events
        this.userInteraction = UserInteractionDetector.getInstance({
            debug: Logger.DEBUG,
            namespace: 'ai-studio-enhancer',
            interactionWindow: 200, // 200ms window for related events
            interactionThrottle: 100 // 100ms throttle for performance
        });

        // Initialize ContentCollector for sophisticated response collection
        this.contentCollector = new ContentCollector({
            name: 'AI-Studio-Responses',
            selectors: AIStudioEnhancer.SELECTORS.RESPONSE_CONTAINERS,
            contentExtractor: this.extractResponseText.bind(this),
            contentCleaner: this.cleanResponseText.bind(this),
            contentValidator: (content, existing) => content && content.length > 10,
            deduplicate: true,
            enableNotifications: false, // We'll handle notifications ourselves
            enablePersistence: true,
            cacheKey: () => this.getChatCacheKey(),
            highlightCollected: false
        });

        // Initialize AutoRunner for sophisticated auto-run functionality
        this.autoRunner = null; // Will be created when needed

        // Initialize FormStatePersistence for automatic form state saving
        this.formPersistence = new FormStatePersistence({
            namespace: 'ai-studio-enhancer',
            getValue: getValue,
            setValue: setValue,
            enableNotifications: false,
            enableInteractionDetection: true,
            fields: {
                autoRunPrompt: {
                    selector: '.auto-run-prompt-textarea textarea',
                    type: 'text',
                    defaultValue: ''
                },
                autoRunIterations: {
                    selector: '.auto-run-iterations-input input',
                    type: 'number',
                    defaultValue: 10,
                    validator: (value) => {
                        const num = parseInt(value, 10);
                        return !isNaN(num) && num >= 1 && num <= 100;
                    }
                }
            }
        });

        Logger.info("Initializing Google AI Studio Enhancer");

        // Setup PubSub event handlers
        this.setupEventHandlers();

        // Initialize URL change watcher for chat monitoring
        this.urlWatcher = new UrlChangeWatcher([
            new PollingStrategy(this.handleUrlChange.bind(this), 1000)
        ], false); // false = don't fire immediately

        // Load saved settings
        this.loadSettings().then(() => {
            // Initialize components
            this.init();
            // Update prompt input visibility based on saved mode
            this.updatePromptInputVisibility();
        });
        
        // Setup cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Setup PubSub event handlers for event-driven communication
     */
    setupEventHandlers() {
        // Handle response additions
        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.RESPONSE_ADDED, (data) => {
                this.handleResponseAdded(data);
            })
        );

        // Handle chat changes
        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.CHAT_CHANGED, (data) => {
                this.handleChatChangedEvent(data);
            })
        );

        // Handle UI updates
        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, (data) => {
                this.handleUIUpdate(data);
            })
        );

        // Handle auto-run events
        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.AUTO_RUN_STARTED, (data) => {
                this.handleAutoRunStarted(data);
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.AUTO_RUN_STOPPED, (data) => {
                this.handleAutoRunStopped(data);
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(AIStudioEnhancer.EVENTS.AUTO_RUN_ITERATION, (data) => {
                this.handleAutoRunIteration(data);
            })
        );

        Logger.debug("PubSub event handlers setup complete");
    }

    /**
     * Cleanup PubSub subscriptions and other resources
     */
    cleanup() {
        // Clean up PubSub subscriptions
        this.subscriptionIds.forEach(id => {
            PubSub.unsubscribe(id);
        });
        this.subscriptionIds = [];
        
        // Clean up UserInteractionDetector if it was created by this instance
        if (this.userInteraction) {
            // Note: We don't destroy the singleton instance since other scripts might be using it
            // Just reset our specific tracking if needed
            Logger.debug("UserInteractionDetector cleanup - instance preserved for other users");
        }
        
        // Clean up tracked run buttons
        document.querySelectorAll('[data-ai-studio-enhancer-tracked]').forEach(button => {
            if (button._aiStudioEnhancerCleanup) {
                button._aiStudioEnhancerCleanup.forEach(unsubscribe => {
                    try {
                        unsubscribe();
                    } catch (error) {
                        Logger.warn('Error during run button cleanup:', error);
                    }
                });
                delete button._aiStudioEnhancerCleanup;
                delete button._aiStudioEnhancerTracked;
            }
        });
        
        // Clean up stats update interval
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
        
        // Clean up form components
        if (this.promptTextArea) {
            this.promptTextArea.destroy();
            this.promptTextArea = null;
        }
        
        if (this.iterationsInput) {
            this.iterationsInput.destroy();
            this.iterationsInput = null;
        }

        if (this.overrideIterationsCheckbox) {
            this.overrideIterationsCheckbox.destroy();
            this.overrideIterationsCheckbox = null;
        }

        // Clean up new core components
        if (this.contentCollector) {
            this.contentCollector.stopMonitoring();
            this.contentCollector = null;
        }

        if (this.autoRunner) {
            this.autoRunner.stop('cleanup');
            this.autoRunner = null;
        }

        if (this.formPersistence) {
            this.formPersistence.destroy();
            this.formPersistence = null;
        }
        
        Logger.debug("All subscriptions and resources cleaned up");
    }

    /**
     * Generate cache key for current chat
     */
    getChatCacheKey() {
        const chatId = this.currentChatId || 'default';
        return `ai-studio-responses-${chatId}`;
    }

    /**
     * Load responses from cache for current chat
     */
    loadResponsesFromCache() {
        const cacheKey = this.getChatCacheKey();
        const cachedResponses = this.responseCache.get(cacheKey);
        
        if (cachedResponses && Array.isArray(cachedResponses)) {
            this.responses = [...cachedResponses];
            Logger.debug(`Loaded ${this.responses.length} responses from cache for chat: ${this.currentChatId}`);
            
            // Update UI to reflect cached responses
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
                type: 'chat-changed',
                chatId: this.currentChatId 
            });
            
            return true;
        }
        
        Logger.debug(`No cached responses found for chat: ${this.currentChatId}`);
        return false;
    }

    /**
     * Save responses to cache for current chat
     */
    saveResponsesToCache() {
        const cacheKey = this.getChatCacheKey();
        
        // Save responses with 7 days expiration
        this.responseCache.set(cacheKey, this.responses, 7);
        
        Logger.debug(`Saved ${this.responses.length} responses to cache for chat: ${this.currentChatId}`);
    }

    /**
     * Clear cache for current chat
     */
    clearChatCache() {
        const cacheKey = this.getChatCacheKey();
        this.responseCache.set(cacheKey, [], 7); // Set empty array instead of removing
        Logger.debug(`Cleared cache for chat: ${this.currentChatId}`);
    }

    /**
     * Clear all cached responses
     */
    clearAllCache() {
        // This would require knowing all chat IDs, which is complex
        // For now, we'll just clear the current chat
        this.clearChatCache();
        Logger.info("Cache cleared for current chat");
    }

    /**
     * Clear current chat cache and update UI
     */
    clearCurrentChatCache() {
        this.clearChatCache();
        
        // Also clear current responses in memory and ContentCollector
        this.responses = [];
        if (this.contentCollector) {
            this.contentCollector.clearContent();
        }
        
        // Update UI
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'chat-changed',
            chatId: this.currentChatId 
        });
        
        this.showNotification('Cache cleared for current chat', 'success');
        Logger.info("Current chat cache cleared via UI");
    }

    /**
     * Update interaction statistics display
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
     * Handle copy button click with user interaction detection
     */
    handleCopyButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.debug('Copy button clicked', {
            isUserInitiated,
            eventType: event?.type,
            isTrusted: event?.isTrusted,
            isInteracting: this.userInteraction.isInteracting(),
            timeSinceLastInteraction: this.userInteraction.getTimeSinceLastInteraction()
        });

        if (isUserInitiated) {
            // Real user click - show notification and copy
            this.copyAllResponsesManual();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'user-action',
                action: 'copy-responses',
                userInitiated: true
            });
        } else {
            // Programmatic click - copy silently without notification
            Logger.info('Programmatic copy button click detected - copying silently');
            this.copyAllResponsesSilent();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'programmatic-action',
                action: 'copy-responses',
                userInitiated: false
            });
        }
    }

    /**
     * Handle toggle button click with user interaction detection
     */
    handleToggleButtonClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.warn('Toggle button clicked! Current auto-run state:', this.isAutoRunning, {
            isUserInitiated,
            eventType: event?.type,
            isTrusted: event?.isTrusted,
            isInteracting: this.userInteraction.isInteracting(),
            timeSinceLastInteraction: this.userInteraction.getTimeSinceLastInteraction(),
            stackTrace: new Error().stack
        });

        if (isUserInitiated) {
            // Real user click - proceed with normal toggle behavior
            Logger.warn('User-initiated toggle detected');
            this.toggleAutoRun();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'user-action',
                action: 'toggle-auto-run',
                userInitiated: true,
                newState: this.isAutoRunning
            });
        } else {
            // Programmatic click - log but potentially ignore or handle differently
            Logger.warn('Programmatic toggle button click detected - IGNORING to prevent unwanted stops');
            
            // DON'T call toggleAutoRun for programmatic clicks
            // this.toggleAutoRun();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'programmatic-action',
                action: 'toggle-auto-run-ignored',
                userInitiated: false,
                currentState: this.isAutoRunning
            });
        }
    }

    /**
     * Handle clear cache button click with user interaction detection
     */
    handleClearCacheClick(event) {
        const isUserInitiated = this.userInteraction.isUserEvent(event);
        
        Logger.debug('Clear cache button clicked', {
            isUserInitiated,
            eventType: event?.type,
            isTrusted: event?.isTrusted,
            isInteracting: this.userInteraction.isInteracting(),
            timeSinceLastInteraction: this.userInteraction.getTimeSinceLastInteraction()
        });

        if (isUserInitiated) {
            // Real user click - proceed with cache clearing
            this.clearCurrentChatCache();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'user-action',
                action: 'clear-cache',
                userInitiated: true
            });
        } else {
            // Programmatic click - be more cautious with destructive actions
            Logger.warn('Programmatic clear cache click detected - requiring user confirmation');
            
            // For destructive actions, we might want to require real user interaction
            // For now, we'll allow it but with extra logging
            this.clearCurrentChatCache();
            
            // Publish event for analytics/logging
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
                type: 'programmatic-action',
                action: 'clear-cache',
                userInitiated: false
            });
        }
    }

    /**
     * Handle response addition events
     */
    handleResponseAdded(data) {
        // Update UI counter
        this.updateResponseCount();
        
        // Save to cache
        this.saveResponsesToCache();
        
        Logger.debug(`Response added event handled - Total: ${data.total}, Initial Load: ${data.isInitialLoad}`);
    }

    /**
     * Handle chat change events
     */
    handleChatChangedEvent(data) {
        Logger.info(`Chat changed event: ${data.oldChatId} → ${data.newChatId}`);
        
        // Try to load responses from cache for the new chat first
        const loadedFromCache = this.loadResponsesFromCache();
        
        if (!loadedFromCache) {
            // Clear responses if no cache found
            this.responses = [];
            
            // Publish UI update event
            PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
                type: 'chat-changed',
                chatId: data.newChatId 
            });
        }
        
        // Set initial load mode for the new chat
        this.isInitialLoad = true;
        
        // Collect responses from the new chat after a short delay
        setTimeout(() => {
            this.collectExistingResponses();
            setTimeout(() => {
                this.isInitialLoad = false;
                Logger.debug("New chat initial load completed");
            }, 1000);
        }, 1000);
        
        if (loadedFromCache) {
            this.showNotification(`Switched to chat - loaded ${this.responses.length} cached responses`, 'info');
        } else {
            this.showNotification('Switched to new chat - responses cleared', 'info');
        }
    }

    /**
     * Handle UI update events
     */
    handleUIUpdate(data) {
        switch (data.type) {
            case 'chat-changed':
                this.updateResponseCount();
                break;
            case 'auto-run-status':
                this.updateAutoRunStatus();
                break;
            case 'button-state':
                this.updateButtonState();
                break;
            default:
                Logger.debug('Unknown UI update type:', data.type);
        }
    }

    /**
     * Handle auto-run started events
     */
    handleAutoRunStarted(data) {
        Logger.info(`Auto-run started event: ${data.iterations} iterations`);
        this.showNotification(`Starting auto runner for ${data.iterations} iterations`, 'info');
        
        // Update UI
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'button-state' 
        });
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'auto-run-status' 
        });
    }

    /**
     * Handle auto-run stopped events
     */
    handleAutoRunStopped(data) {
        Logger.info(`Auto-run stopped event: ${data.reason || 'user requested'}`);
        this.showNotification(`Auto runner stopped and reset`, 'info');
        
        // Update UI
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'button-state' 
        });
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'auto-run-status' 
        });
    }

    /**
     * Handle auto-run iteration events
     */
    handleAutoRunIteration(data) {
        Logger.info(`Auto-run iteration event: ${data.current}/${data.total}`);
        
        // Update UI
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, { 
            type: 'auto-run-status' 
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
        Logger.info("Enhancer starting initialization...");

        // Set a unique ID on the body for style scoping
        document.body.id = this.enhancerId;

        // Wait for the main content to be ready
        await this.waitForPageReady();
        Logger.info("Page is ready, proceeding with initialization.");

        // Initialize styles
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
        
        // Add custom styles for full-width buttons and form inputs
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

        // Create the UI panel using SidebarPanel component
        this.createSidebarPanel();

        // Setup chat monitoring to detect chat switches
        this.setupChatMonitoring();

        // Initialize ContentCollector for response monitoring
        this.initializeContentCollector();

        // Initialize FormStatePersistence for automatic form state saving
        this.initializeFormPersistence();

        // Setup user interaction tracking for run buttons
        this.setupRunButtonInteractionTracking();

        // Mark initial load as complete after a delay to allow for all responses to be collected
        setTimeout(() => {
            this.isInitialLoad = false;
            Logger.debug("Initial load completed, notifications now enabled for new responses");
        }, 2000);

        Logger.success("Google AI Studio Enhancer initialized successfully!");
    }

    /**
     * Wait for the page to be ready
     */
    async waitForPageReady() {
        // Wait for document to be complete
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve, { once: true });
            });
        }
        
        // Wait for main content areas to be available
        try {
            // Wait for key Google AI Studio elements to be present
            await HTMLUtils.waitForElement('body', 5000);
            
            // Give additional time for dynamic content to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            Logger.debug('Page ready - main elements found');
        } catch (error) {
            Logger.warn('Some page elements not found, but continuing:', error.message);
        }
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
            onClick: (event) => this.handleCopyButtonClick(event),
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

        // Single prompt input (existing functionality)
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

        // Add separator info
        const separatorInfo = document.createElement('div');
        separatorInfo.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;';
        
        // Create separator info content safely using HTMLUtils
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

        // Iterations label
        const iterationsLabel = document.createElement('label');
        iterationsLabel.textContent = 'Number of iterations:';
        iterationsLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 12px; color: #555;';

        // Iterations info text
        this.iterationsInfoText = document.createElement('div');
        this.iterationsInfoText.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 4px;';
        this.iterationsInfoText.textContent = 'Number of iterations to run';

        // Override checkbox for multiple prompts
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

        // Iterations input using Input component
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
        // iterationsInput is automatically appended via container option

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-bottom: 10px;';

        // Single toggle button for start/stop using Button component
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

        // Cache management subsection
        const cacheSubsection = document.createElement('div');
        cacheSubsection.style.marginBottom = '16px';

        const cacheTitle = document.createElement('h4');
        cacheTitle.textContent = '💾 Cache Management';
        cacheTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #555;';

        // Cache info
        const cacheInfo = document.createElement('div');
        cacheInfo.textContent = 'Responses are automatically saved per chat';
        cacheInfo.style.cssText = `
            color: #666;
            font-size: 12px;
            margin-bottom: 8px;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
        `;

        // Clear cache button
        const clearCacheButton = new Button({
            text: 'Clear Current Chat Cache',
            theme: 'danger',
            size: 'small',
            onClick: (event) => this.handleClearCacheClick(event),
            successText: '✅ Cleared!',
            successDuration: 1500,
            container: cacheSubsection
        });

        cacheSubsection.appendChild(cacheTitle);
        cacheSubsection.appendChild(cacheInfo);
        // clearCacheButton is automatically appended via container option

        // User interaction subsection
        const interactionSubsection = document.createElement('div');
        interactionSubsection.style.marginBottom = '16px';

        const interactionTitle = document.createElement('h4');
        interactionTitle.textContent = '👆 User Interaction Detection';
        interactionTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #555;';

        // Interaction stats
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

        // Auto-update stats every 2 seconds
        this.statsUpdateInterval = setInterval(() => {
            this.updateInteractionStats();
        }, 2000);

        interactionSubsection.appendChild(interactionTitle);
        interactionSubsection.appendChild(this.interactionStatsElement);

        section.appendChild(title);
        section.appendChild(cacheSubsection);
        section.appendChild(interactionSubsection);

        container.appendChild(section);
    }

    /**
     * Update prompt input visibility based on selected mode
     */
    updatePromptInputVisibility() {
        const mode = this.settings.PROMPT_MODE || 'single';
        
        // Hide all containers first
        this.singlePromptContainer.style.display = 'none';
        this.multiplePromptContainer.style.display = 'none';
        this.templatePromptContainer.style.display = 'none';
        
        // Show the appropriate container
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
        
        // Update iteration input behavior based on mode
        this.updateIterationInputBehavior(mode);
    }
    
    /**
     * Update iteration input behavior based on prompt mode
     */
    updateIterationInputBehavior(mode) {
        if (!this.iterationsInput || !this.iterationsInfoText) return;
        
        switch (mode) {
            case 'multiple':
                // For multiple prompts, show the number of prompts and disable manual input
                const prompts = this.settings.MULTIPLE_PROMPTS
                    ? this.settings.MULTIPLE_PROMPTS.split('---').map(p => p.trim()).filter(p => p.length > 0)
                    : [];
                const promptCount = prompts.length;
                
                // Show/hide override checkbox based on whether we have prompts
                if (this.overrideIterationsCheckbox) {
                    this.overrideIterationsCheckbox.setVisible(promptCount > 0);
                }
                
                if (promptCount > 0) {
                    // Check if user wants to override automatic count
                    const shouldOverride = this.settings.OVERRIDE_ITERATIONS && this.overrideIterationsCheckbox && this.overrideIterationsCheckbox.isChecked();
                    
                    if (shouldOverride) {
                        // Allow manual input for multiple cycles
                        this.iterationsInput.setDisabled(false);
                        this.iterationsInput.getElement().title = 'Number of iterations (will cycle through prompts)';
                        this.iterationsInfoText.textContent = `Will run ${this.iterationsInput.getValue()} iterations, cycling through ${promptCount} prompts`;
                    } else {
                        // Use automatic count
                        this.iterationsInput.setValue(promptCount.toString());
                        this.iterationsInput.setDisabled(true);
                        this.iterationsInput.getElement().title = `Automatically set to ${promptCount} (number of prompts)`;
                        this.iterationsInfoText.textContent = `Automatically set to ${promptCount} (number of prompts defined)`;
                    }
                } else {
                    this.iterationsInput.setValue('1');
                    this.iterationsInput.setDisabled(true);
                    this.iterationsInput.getElement().title = 'Set to 1 (no prompts defined)';
                    this.iterationsInfoText.textContent = 'Set to 1 (no prompts defined)';
                }
                break;
                
            case 'single':
            case 'template':
                // For single and template modes, allow manual input
                this.iterationsInput.setDisabled(false);
                this.iterationsInput.getElement().title = 'Number of iterations to run';
                this.iterationsInfoText.textContent = 'Number of iterations to run';
                
                // Hide override checkbox for non-multiple modes
                if (this.overrideIterationsCheckbox) {
                    this.overrideIterationsCheckbox.setVisible(false);
                }
                break;
        }
    }

    /**
     * Get the appropriate prompt for the current iteration
     */
    getPromptForIteration(iteration, totalIterations) {
        const mode = this.settings.PROMPT_MODE || 'single';
        
        switch (mode) {
            case 'single':
                return this.settings.AUTO_RUN_PROMPT || '';
                
            case 'multiple':
                const prompts = this.settings.MULTIPLE_PROMPTS
                    ? this.settings.MULTIPLE_PROMPTS.split('---')
                        .map(p => p.trim())
                        .filter(p => p.length > 0)
                    : [];
                
                if (prompts.length === 0) {
                    return '';
                }
                
                // For multiple prompts, we can either:
                // 1. Run each prompt once (iteration count = prompt count)
                // 2. Run multiple cycles (iteration count > prompt count)
                // 3. Run partial cycles (iteration count < prompt count)
                const promptIndex = (iteration - 1) % prompts.length;
                return prompts[promptIndex];
                
            case 'template':
                let template = this.settings.TEMPLATE_PROMPT || '';
                const timestamp = new Date().toISOString();
                
                // Replace variables in template
                template = template.replace(/\{iteration\}/g, iteration);
                template = template.replace(/\{total\}/g, totalIterations);
                template = template.replace(/\{timestamp\}/g, timestamp);
                
                return template;
                
            default:
                return '';
        }
    }

    /**
     * Handle URL changes detected by UrlChangeWatcher
     */
    handleUrlChange(newUrl, oldUrl) {
        const newChatId = this.extractChatId(newUrl);
        if (newChatId !== this.currentChatId) {
            Logger.info(`Chat changed from ${this.currentChatId} to ${newChatId} (URL: ${oldUrl} → ${newUrl})`);
            this.currentChatId = newChatId;
            this.onChatChanged();
        }
    }

    /**
     * Initialize ContentCollector for sophisticated response monitoring
     */
    async initializeContentCollector() {
        // Setup event subscriptions for ContentCollector
        this.subscriptionIds.push(
            PubSub.subscribe(ContentCollector.EVENTS.CONTENT_ADDED, (data) => {
                // Update our local responses array to maintain compatibility
                this.responses = this.contentCollector.getContent();
                
                // Handle the new content addition
                this.handleResponseAdded({
                    text: data.content,
                    total: data.totalItems,
                    isInitialLoad: this.isInitialLoad
                });
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(ContentCollector.EVENTS.COLLECTION_UPDATED, (data) => {
                // Update response count in UI
                this.updateResponseCount();
                Logger.debug(`ContentCollector updated: ${data.newItems} new, ${data.totalItems} total`);
            })
        );

        // Start monitoring for responses
        this.contentCollector.startMonitoring();
        
        // Update our responses array from ContentCollector
        this.responses = this.contentCollector.getContent();
        
        Logger.info("ContentCollector initialized and monitoring started");
    }

    /**
     * Initialize FormStatePersistence for automatic form state saving
     */
    async initializeFormPersistence() {
        // Wait for form elements to be available
        setTimeout(async () => {
            try {
                await this.formPersistence.initialize();
                Logger.info("FormStatePersistence initialized successfully");
            } catch (error) {
                Logger.warn("FormStatePersistence initialization failed:", error);
            }
        }, 1000); // Delay to ensure form elements are created
    }

    /**
     * Setup chat monitoring to detect when user switches between chats
     */
    setupChatMonitoring() {
        // Initialize current chat ID
        this.currentChatId = this.extractChatId(window.location.href);
        
        // Start URL change monitoring
        this.urlWatcher.start();

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
        
        // Publish chat change event instead of handling directly
        PubSub.publish(AIStudioEnhancer.EVENTS.CHAT_CHANGED, {
            oldChatId: this.previousChatId || null,
            newChatId: this.currentChatId
        });
        
        // Store previous chat ID for next change
        this.previousChatId = this.currentChatId;
    }

    /**
     * Setup user interaction tracking for run buttons
     */
    setupRunButtonInteractionTracking() {
        // Track run button interactions using a MutationObserver to detect when buttons appear
        const runButtonObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for run buttons in the added nodes
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

        // Track existing run buttons
        this.trackExistingRunButtons();

        Logger.debug("Run button interaction tracking setup complete");
    }

    /**
     * Track existing run buttons on the page
     */
    trackExistingRunButtons() {
        AIStudioEnhancer.SELECTORS.RUN_BUTTONS.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                this.trackRunButton(button);
            });
        });
    }

    /**
     * Track run buttons within a specific element
     */
    trackRunButtonsInElement(element) {
        // Check if the element itself is a run button
        if (element.matches) {
            AIStudioEnhancer.SELECTORS.RUN_BUTTONS.forEach(selector => {
                if (element.matches(selector)) {
                    this.trackRunButton(element);
                }
            });
        }

        // Check for run buttons within the element
        if (element.querySelectorAll) {
            AIStudioEnhancer.SELECTORS.RUN_BUTTONS.forEach(selector => {
                element.querySelectorAll(selector).forEach(button => {
                    this.trackRunButton(button);
                });
            });
        }
    }

    /**
     * Track interactions with a specific run button
     */
    trackRunButton(button) {
        // Avoid double-tracking
        if (button._aiStudioEnhancerTracked) {
            return;
        }
        button._aiStudioEnhancerTracked = true;

        // Use UserInteractionDetector to track this button
        const unsubscribe = this.userInteraction.trackElement(
            button,
            ['click', 'mousedown', 'touchstart'],
            (interactionData) => {
                this.handleRunButtonInteraction(button, interactionData);
            }
        );

        // Store unsubscribe function for cleanup
        if (!button._aiStudioEnhancerCleanup) {
            button._aiStudioEnhancerCleanup = [];
        }
        button._aiStudioEnhancerCleanup.push(unsubscribe);

        Logger.debug('Started tracking run button interactions:', button);
    }

    /**
     * Handle run button interaction events
     */
    handleRunButtonInteraction(button, interactionData) {
        const { event, isUserInitiated, globalInteracting, timeSinceLastInteraction } = interactionData;
        
        // Check if this is our programmatic click
        const isProgrammaticFromAutoRun = event._aiStudioEnhancerProgrammatic;
        
        Logger.debug('Run button interaction detected', {
            eventType: event.type,
            isUserInitiated,
            isProgrammaticFromAutoRun,
            globalInteracting,
            timeSinceLastInteraction,
            isAutoRunning: this.isAutoRunning,
            isTrusted: event.isTrusted
        });

        // Publish event for analytics/logging
        PubSub.publish(AIStudioEnhancer.EVENTS.UI_UPDATE_REQUIRED, {
            type: isUserInitiated ? 'user-action' : 'programmatic-action',
            action: 'run-button-click',
            userInitiated: isUserInitiated,
            isProgrammaticFromAutoRun,
            eventType: event.type,
            isAutoRunning: this.isAutoRunning
        });

        // Special handling for user-initiated clicks during auto-run
        if (isUserInitiated && this.isAutoRunning && !isProgrammaticFromAutoRun) {
            Logger.info('User clicked run button while auto-run is active - this may interfere with automation');
            this.showNotification('Manual run detected during auto-run - may cause conflicts', 'warning');
        }
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
     * Copy all responses to clipboard without showing notifications
     */
    async copyAllResponsesSilent() {
        // Get responses from ContentCollector if available, fallback to local array
        const responses = this.contentCollector ? this.contentCollector.getContent() : this.responses;
        
        if (responses.length === 0) {
            return false;
        }

        // Format responses - clean output without headers
        const content = responses.join('\n\n---\n\n');

        try {
            GM_setClipboard(content);
            Logger.success(`Copied ${responses.length} responses to clipboard`);
            return true;
        } catch (error) {
            Logger.error('Failed to copy responses:', error);
            return false;
        }
    }

    /**
     * Update response counter display
     */
    updateResponseCount() {
        if (this.responseCountElement) {
            // Get count from ContentCollector if available, fallback to local array
            const count = this.contentCollector ? this.contentCollector.getContent().length : this.responses.length;
            this.responseCountElement.textContent = `Current chat responses: ${count}`;
        }
    }

    /**
     * Manual copy button handler - always shows notifications
     */
    async copyAllResponsesManual() {
        // Get responses from ContentCollector if available, fallback to local array
        const responses = this.contentCollector ? this.contentCollector.getContent() : this.responses;
        
        if (responses.length === 0) {
            this.showNotification('No responses found to copy', 'warning');
            return false;
        }

        const success = await this.copyAllResponsesSilent();
        if (success) {
            this.showNotification(`Copied ${responses.length} responses to clipboard`, 'success');
        } else {
            this.showNotification('Failed to copy responses', 'error');
        }
        return success;
    }

    /**
     * Copy all responses to clipboard (legacy method for compatibility)
     */
    async copyAllResponses() {
        return await this.copyAllResponsesManual();
    }

    /**
     * Clear all collected responses
     */
    clearResponses() {
        this.responses = [];
        if (this.contentCollector) {
            this.contentCollector.clearContent();
        }
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
     * Start auto-run process using AutoRunner
     */
    async startAutoRun() {
        if (this.isAutoRunning) {
            this.showNotification('Auto runner is already running', 'warning');
            return false;
        }

        // Validate iterations input first
        if (!this.iterationsInput.validate()) {
            this.showNotification('Please fix the iterations input error', 'error');
            return false;
        }

        const iterations = parseInt(this.iterationsInput.getValue(), 10);
        if (isNaN(iterations) || iterations <= 0) {
            this.showNotification('Please enter a valid number of iterations', 'error');
            return false;
        }

        // Create AutoRunner instance
        this.autoRunner = new AutoRunner({
            name: 'AI-Studio-AutoRun',
            maxIterations: iterations,
            delay: 1000, // 1 second between iterations
            taskFunction: async (iteration, results) => {
                return await this.executeAutoRunIteration(iteration, results);
            },
            enableNotifications: true,
            enableInteractionDetection: true,
            onProgress: (current, total, result, results) => {
                this.currentIteration = current;
                this.maxIterations = total;
                PubSub.publish(AIStudioEnhancer.EVENTS.AUTO_RUN_ITERATION, {
                    current,
                    total,
                    timestamp: Date.now()
                });
            },
            onError: (error, iteration) => {
                Logger.error(`Auto-run iteration ${iteration} failed:`, error);
                this.showNotification(`Auto-run iteration ${iteration} failed: ${error.message}`, 'error');
            }
        });

        // Subscribe to AutoRunner events
        this.subscriptionIds.push(
            PubSub.subscribe(AutoRunner.EVENTS.STARTED, (data) => {
                if (data.name === 'AI-Studio-AutoRun') {
                    this.isAutoRunning = true;
                    PubSub.publish(AIStudioEnhancer.EVENTS.AUTO_RUN_STARTED, {
                        iterations: data.maxIterations,
                        timestamp: data.timestamp
                    });
                }
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(AutoRunner.EVENTS.STOPPED, (data) => {
                if (data.name === 'AI-Studio-AutoRun') {
                    this.isAutoRunning = false;
                    this.currentIteration = 0;
                    PubSub.publish(AIStudioEnhancer.EVENTS.AUTO_RUN_STOPPED, {
                        reason: data.reason,
                        timestamp: data.timestamp
                    });
                }
            })
        );

        this.subscriptionIds.push(
            PubSub.subscribe(AutoRunner.EVENTS.COMPLETED, (data) => {
                if (data.name === 'AI-Studio-AutoRun') {
                    this.isAutoRunning = false;
                    this.currentIteration = 0;
                    PubSub.publish(AIStudioEnhancer.EVENTS.AUTO_RUN_STOPPED, {
                        reason: 'completed',
                        timestamp: data.timestamp
                    });
                }
            })
        );

        // Start the AutoRunner
        this.isAutoRunning = true;
        const started = await this.autoRunner.start();
        
        if (!started) {
            this.isAutoRunning = false;
            this.showNotification('Failed to start auto runner', 'error');
            return false;
        }

        return true;
    }

    /**
     * Stop auto-run process
     */
    stopAutoRun() {
        // Add debugging to see what's calling this method
        Logger.warn('stopAutoRun called! Stack trace:', new Error().stack);
        
        if (this.autoRunner) {
            this.autoRunner.stop('user requested');
        } else {
            // Fallback for direct calls
            this.isAutoRunning = false;
            this.currentIteration = 0;
            
            PubSub.publish(AIStudioEnhancer.EVENTS.AUTO_RUN_STOPPED, {
                reason: 'user requested',
                timestamp: Date.now()
            });

            Logger.info(`Auto runner stopped and reset`);
        }
    }

    /**
     * Execute a single auto-run iteration (used by AutoRunner)
     */
    async executeAutoRunIteration(iteration, results) {
        Logger.info(`Executing auto-run iteration ${iteration}`);

        // Get the appropriate prompt for this iteration
        const totalIterations = this.maxIterations || this.settings.DEFAULT_ITERATIONS;
        const currentPrompt = this.getPromptForIteration(iteration, totalIterations);
        
        if (currentPrompt) {
            Logger.info(`Using prompt for iteration ${iteration}: ${currentPrompt.substring(0, 50)}...`);
            const promptEntered = await this.enterPrompt(currentPrompt);
            if (!promptEntered) {
                Logger.warn('Could not enter prompt - prompt input not found, continuing anyway');
            } else {
                // Small delay after entering prompt to let Google process the input
                await this.delay(500);
            }
        } else {
            Logger.info(`No prompt specified for iteration ${iteration}`);
        }

        // Wait for run button to become enabled (with retry mechanism)
        const runButton = await this.waitForRunButton();
        if (!runButton) {
            throw new Error('Run button not found after waiting');
        }

        // Click the run button programmatically during auto-run
        const clickEvent = MouseEventUtils.createClickEvent({
            bubbles: true,
            cancelable: true,
            programmatic: true
        });
        runButton.dispatchEvent(clickEvent);
        Logger.debug('Run button clicked programmatically during auto-run iteration');

        // Wait for response completion
        await this.waitForResponseCompletion();

        return {
            iteration,
            timestamp: Date.now(),
            promptUsed: currentPrompt,
            success: true
        };
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
        try {
            // Try to find enabled run button using HTMLUtils
            const button = await HTMLUtils.waitForElement('button.run-button[aria-label="Run"]:not(.disabled):not([disabled]):not(.stoppable)', maxWaitTime);
            Logger.debug('Run button found and enabled using HTMLUtils');
            return button;
        } catch (error) {
            // Fallback to custom logic if specific selector doesn't work
            Logger.debug('HTMLUtils waitForElement failed, trying fallback method');
            
            try {
                // Wait for any run button first
                await HTMLUtils.waitForElement('button.run-button[aria-label="Run"]', maxWaitTime);
                
                // Then check if it's enabled
                const button = this.findRunButton();
                if (button) {
                    Logger.debug('Run button found via fallback method');
                    return button;
                }
            } catch (fallbackError) {
                    Logger.warn(`Run button not found after ${maxWaitTime}ms`);
            }
            
            return null;
        }
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
     * Show notification using the Notification component
     */
    showNotification(message, type = 'info') {
        // Always show notifications since we removed the setting
        // Use the Notification component for proper toast notifications
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
        
        // Also log to console for debugging
        Logger.info(`[NOTIFICATION ${type.toUpperCase()}] ${message}`);
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