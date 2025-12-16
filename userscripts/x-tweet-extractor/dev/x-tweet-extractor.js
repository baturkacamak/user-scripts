// Import core components
import {
    Button,
    Checkbox,
    Debouncer,
    DOMObserver,
    Logger,
    Notification,
    PubSub,
    SidebarPanel,
    StyleManager,
    TextArea,
    ThrottleService,
    HTMLUtils,
    ClipboardService
} from "../../common/core";
import { getValue, setValue } from "../../common/core/utils/GMFunctions";

// Configure logger
Logger.setPrefix("X Tweet Extractor");
Logger.DEBUG = true;

/**
 * X (Twitter) Tweet Extractor
 * Automatically extracts tweets as user scrolls and they appear in viewport
 */
class XTweetExtractor {
    // Configuration
    static SELECTORS = {
        TWEET: 'article[data-testid="tweet"]',
        STATUS_LINK: 'a[href*="/status/"]',
        USER_NAME: '[data-testid="User-Name"]',
        USER_LINK: '[data-testid="User-Name"] a[href^="/"]',
        TWEET_TEXT: '[data-testid="tweetText"]',
        TIME: 'time[datetime]'
    };

    static SETTINGS_KEYS = {
        AUTO_EXTRACT: 'xte-auto-extract',
        SHOW_NOTIFICATIONS: 'xte-show-notifications',
        PANEL_POSITION: 'xte-panel-position'
    };

    static DEFAULT_SETTINGS = {
        AUTO_EXTRACT: true,
        SHOW_NOTIFICATIONS: true,
        PANEL_POSITION: { x: 20, y: 20 }
    };

    static EVENTS = {
        TWEET_EXTRACTED: 'xte:tweet-extracted',
        TWEETS_CLEARED: 'xte:tweets-cleared',
        SETTINGS_CHANGED: 'xte:settings-changed'
    };

    constructor() {
        this.extractedTweetIds = new Set();
        this.enhancerId = 'x-tweet-extractor-container';
        this.sidebarPanel = null;
        this.textArea = null;
        this.settings = { ...XTweetExtractor.DEFAULT_SETTINGS };
        this.tweetObserver = null;
        this.scrollThrottle = null;
        this.extractDebouncer = null;
        this.subscriptionIds = [];
        this.isExtracting = false;
        this.pendingNotificationCount = 0; // Queue for batched notifications
        this.notificationDebouncer = null; // Debouncer for showing batched notifications
        
        Logger.info("Initializing X Tweet Extractor");

        this.setupEventHandlers();
        this.loadSettings().then(() => {
            this.init();
        });
        
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Setup PubSub event handlers
     */
    setupEventHandlers() {
        // Note: Settings changed event handler removed to avoid duplicate notifications
        // Settings are handled directly in the checkbox onChange handler
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
        
        if (this.tweetObserver) {
            this.tweetObserver.disconnect();
        }
        
        if (this.scrollThrottle) {
            this.scrollThrottle.cancel();
        }
        
        Logger.debug("All subscriptions and resources cleaned up");
    }

    /**
     * Load saved settings
     */
    async loadSettings() {
        try {
            for (const [settingName, storageKey] of Object.entries(XTweetExtractor.SETTINGS_KEYS)) {
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
            for (const [settingName, storageKey] of Object.entries(XTweetExtractor.SETTINGS_KEYS)) {
                await setValue(storageKey, this.settings[settingName]);
            }
            Logger.debug("Settings saved", this.settings);
        } catch (error) {
            Logger.error("Error saving settings:", error);
        }
    }


    /**
     * Initialize the extractor
     */
    async init() {
        try {
            Logger.info("Extractor starting initialization...");

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
                TextArea.initStyles();
                TextArea.useDefaultColors();
                Notification.initStyles();
                Notification.useDefaultColors();
            } catch (error) {
                Logger.error('Error initializing styles:', error);
            }

            StyleManager.addStyles(`
                #${this.enhancerId} .xte-stats {
                    padding: 12px;
                    background: #f7f9f9;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 13px;
                }
                
                #${this.enhancerId} .xte-stats-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                
                #${this.enhancerId} .xte-stats-item:last-child {
                    margin-bottom: 0;
                }
                
                #${this.enhancerId} .xte-stats-label {
                    color: #536471;
                }
                
                #${this.enhancerId} .xte-stats-value {
                    font-weight: bold;
                    color: #0f1419;
                }
            `);

            await this.createSidebarPanel();
            this.setupTweetObserver();
            this.setupScrollListener();
            this.setupNotificationQueue();
            
            // Initial extraction if auto-extract is enabled
            if (this.settings.AUTO_EXTRACT) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    this.extractNewTweets();
                }, 1000);
            }
            
            Logger.info("X Tweet Extractor initialized successfully");
        } catch (error) {
            Logger.error('Error during initialization:', error);
            this.showNotification('Failed to initialize extractor. Please refresh the page.', 'error');
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
            title: '📝 Tweet Extractor',
            id: 'x-tweet-extractor-panel',
            position: 'right',
            transition: 'slide',
            buttonIcon: '📝',
            content: {
                generator: () => this.createPanelContent()
            },
            style: {
                width: '500px',
                buttonSize: '48px',
                buttonColor: '#fff',
                buttonBg: '#1d9bf0',
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

        // Stats section
        const statsSection = document.createElement('div');
        statsSection.className = 'xte-stats';
        statsSection.innerHTML = `
            <div class="xte-stats-item">
                <span class="xte-stats-label">Extracted Tweets:</span>
                <span class="xte-stats-value" id="xte-stats-count">0</span>
            </div>
        `;
        content.appendChild(statsSection);

        // Auto-extract checkbox
        const autoExtractContainer = document.createElement('div');
        autoExtractContainer.style.marginBottom = '16px';

        this.autoExtractCheckbox = new Checkbox({
            label: 'Auto-extract on scroll',
            checked: this.settings.AUTO_EXTRACT,
            onChange: (checked) => {
                this.settings.AUTO_EXTRACT = checked;
                this.saveSettings();
                this.toggleAutoExtract(checked);
            },
            container: autoExtractContainer,
            scopeSelector: `#${this.enhancerId}`
        });

        content.appendChild(autoExtractContainer);

        // Textarea for extracted tweets
        this.textArea = new TextArea({
            value: '',
            placeholder: 'Extracted tweets will appear here automatically as you scroll...',
            rows: 20,
            theme: 'primary',
            size: 'medium',
            className: 'xte-textarea',
            id: 'xte-textarea',
            readOnly: true,
            container: content,
            autoResize: false,
            scopeSelector: `#${this.enhancerId}`
        });

        // Controls section
        const controlsSection = document.createElement('div');
        controlsSection.style.cssText = 'display: flex; gap: 10px; margin-top: 16px;';

        const clearBtn = new Button({
            text: 'Clear',
            onClick: () => this.clearTweets(),
            theme: 'secondary',
            size: 'medium',
            className: 'xte-clear-btn',
            container: controlsSection,
            attributes: { title: 'Clear extracted tweets' }
        });

        const copyBtn = new Button({
            text: 'Copy',
            onClick: () => this.copyToClipboard(),
            theme: 'primary',
            size: 'medium',
            className: 'xte-copy-btn',
            container: controlsSection,
            attributes: { title: 'Copy to clipboard' }
        });

        content.appendChild(controlsSection);

        return content;
    }

    /**
     * Setup tweet observer to watch for new tweets
     */
    setupTweetObserver() {
        this.tweetObserver = new DOMObserver((mutations) => {
            this.handleTweetDOMChanges(mutations);
        });

        this.tweetObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Debouncer for extraction to avoid too frequent calls
        this.extractDebouncer = Debouncer.debounce(() => {
            if (this.settings.AUTO_EXTRACT && !this.isExtracting) {
                // Use requestAnimationFrame to ensure DOM is updated
                requestAnimationFrame(() => {
                    this.extractNewTweets();
                });
            }
        }, 800);

        Logger.debug("Tweet observer setup complete");
    }

    /**
     * Setup scroll listener
     */
    setupScrollListener() {
        // Use ThrottleService for scroll events
        const throttleService = new ThrottleService();
        this.scrollThrottle = throttleService.throttle(() => {
            if (this.settings.AUTO_EXTRACT && !this.isExtracting) {
                // Use requestAnimationFrame to ensure DOM is updated
                requestAnimationFrame(() => {
                    this.extractNewTweets();
                });
            }
        }, 300);

        // Listen to scroll on both window and document
        const scrollHandler = () => {
            this.scrollThrottle();
        };
        
        window.addEventListener('scroll', scrollHandler, { passive: true });
        document.addEventListener('scroll', scrollHandler, { passive: true });

        Logger.debug("Scroll listener setup complete");
    }

    /**
     * Handle tweet DOM changes
     */
    handleTweetDOMChanges(mutations) {
        if (!this.settings.AUTO_EXTRACT || this.isExtracting) return;
        
        let hasNewTweets = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if a tweet was added
                        if (node.matches && node.matches(XTweetExtractor.SELECTORS.TWEET)) {
                            hasNewTweets = true;
                            break;
                        }
                        // Check if a tweet is within the added node
                        if (node.querySelector && node.querySelector(XTweetExtractor.SELECTORS.TWEET)) {
                            hasNewTweets = true;
                            break;
                        }
                    }
                }
            }
        }

        if (hasNewTweets) {
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                this.extractDebouncer();
            });
        }
    }

    /**
     * Toggle auto-extract
     */
    toggleAutoExtract(enabled) {
        this.settings.AUTO_EXTRACT = enabled;
        if (enabled) {
            // Extract immediately when enabled
            setTimeout(() => {
                this.extractNewTweets();
            }, 100);
        }
    }

    /**
     * Extract new tweets from viewport
     */
    extractNewTweets() {
        if (this.isExtracting) return;
        
        this.isExtracting = true;
        
        try {
            const tweets = this.getVisibleTweets();
            const extractedData = [];
            
            tweets.forEach(tweet => {
                const data = this.extractTweetData(tweet);
                if (data && !this.extractedTweetIds.has(data.tweetId)) {
                    extractedData.push(data);
                    this.extractedTweetIds.add(data.tweetId);
                }
            });
            
            if (extractedData.length > 0) {
                this.appendToTextarea(extractedData);
                this.updateStats();
                
                // Queue notification count instead of showing immediately
                if (this.settings.SHOW_NOTIFICATIONS) {
                    this.pendingNotificationCount += extractedData.length;
                    this.queueNotification();
                }
                
                PubSub.publish(XTweetExtractor.EVENTS.TWEET_EXTRACTED, {
                    count: extractedData.length,
                    total: this.extractedTweetIds.size
                });
            }
        } catch (error) {
            Logger.error('Error extracting tweets:', error);
            if (this.settings.SHOW_NOTIFICATIONS) {
                this.showNotification('Error extracting tweets', 'error');
            }
        } finally {
            this.isExtracting = false;
        }
    }

    /**
     * Get visible tweets in viewport
     */
    getVisibleTweets() {
        const tweets = document.querySelectorAll(XTweetExtractor.SELECTORS.TWEET);
        const visibleTweets = [];
        
        tweets.forEach(tweet => {
            const rect = tweet.getBoundingClientRect();
            
            // Include tweets that are partially visible
            const isPartiallyVisible = (
                rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
                rect.bottom > 0 &&
                rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
                rect.right > 0
            );
            
            if (isPartiallyVisible) {
                visibleTweets.push(tweet);
            }
        });
        
        Logger.debug(`Found ${visibleTweets.length} visible tweets`);
        return visibleTweets;
    }

    /**
     * Extract data from a tweet element
     */
    extractTweetData(tweetElement) {
        try {
            // Extract tweet ID from status link
            const statusLink = tweetElement.querySelector(XTweetExtractor.SELECTORS.STATUS_LINK);
            if (!statusLink) {
                return null;
            }
            
            const href = statusLink.getAttribute('href');
            const tweetIdMatch = href.match(/\/status\/(\d+)/);
            if (!tweetIdMatch) {
                return null;
            }
            
            const tweetId = tweetIdMatch[1];
            
            // Extract username from the user link
            const userLink = tweetElement.querySelector(XTweetExtractor.SELECTORS.USER_LINK);
            const usernameHref = userLink?.getAttribute('href') || '';
            const usernameMatch = usernameHref.match(/^\/([^\/]+)/);
            const username = usernameMatch ? usernameMatch[1] : 'unknown';
            
            // Extract display name
            const displayNameElement = tweetElement.querySelector(XTweetExtractor.SELECTORS.USER_NAME);
            const displayNameSpans = displayNameElement?.querySelectorAll('span');
            let displayName = username;
            if (displayNameSpans) {
                for (const span of displayNameSpans) {
                    const text = span.textContent?.trim();
                    if (text && !text.startsWith('@') && text.length > 0) {
                        displayName = text;
                        break;
                    }
                }
            }
            
            // Extract content
            const contentElement = tweetElement.querySelector(XTweetExtractor.SELECTORS.TWEET_TEXT);
            const content = contentElement?.textContent?.trim() || '';
            
            // Extract datetime
            const timeElement = tweetElement.querySelector(XTweetExtractor.SELECTORS.TIME);
            const datetime = timeElement?.getAttribute('datetime') || '';
            const datetimeDisplay = timeElement?.textContent?.trim() || '';
            
            // Check if it's a reply
            let replyTweetId = null;
            
            // Method 1: Look for "Replying to" text and find the parent tweet link
            const allTextElements = Array.from(tweetElement.querySelectorAll('span, div, a'));
            const replyingToElement = allTextElements.find(
                el => el.textContent?.includes('Replying to') || el.textContent?.includes('Yanıtla')
            );
            
            if (replyingToElement) {
                const parentContainer = replyingToElement.closest('div') || replyingToElement.parentElement;
                if (parentContainer) {
                    const allLinks = parentContainer.querySelectorAll('a[href*="/status/"]');
                    for (const link of allLinks) {
                        const linkHref = link.getAttribute('href');
                        const linkMatch = linkHref.match(/\/status\/(\d+)/);
                        if (linkMatch && linkMatch[1] !== tweetId) {
                            replyTweetId = linkMatch[1];
                            break;
                        }
                    }
                }
            }
            
            // Method 2: Check if tweet is in a reply thread context
            if (!replyTweetId) {
                const contextLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
                for (const link of contextLinks) {
                    const linkHref = link.getAttribute('href');
                    const linkMatch = linkHref.match(/\/status\/(\d+)/);
                    if (linkMatch && linkMatch[1] !== tweetId) {
                        const linkText = link.textContent || '';
                        if (!content.includes(linkText) || linkText.length < 5) {
                            replyTweetId = linkMatch[1];
                            break;
                        }
                    }
                }
            }
            
            return {
                tweetId,
                username,
                displayName,
                content,
                datetime,
                datetimeDisplay,
                replyTweetId
            };
        } catch (error) {
            Logger.error('Error extracting tweet data:', error);
            return null;
        }
    }

    /**
     * Format tweet data for display
     */
    formatTweetData(data) {
        let output = `Tweet ID: ${data.tweetId}\n`;
        output += `Username: @${data.username} (${data.displayName})\n`;
        output += `Content: ${data.content}\n`;
        output += `Datetime: ${data.datetimeDisplay} (${data.datetime})\n`;
        if (data.replyTweetId) {
            output += `Reply to Tweet ID: ${data.replyTweetId}\n`;
        }
        output += `${'='.repeat(60)}\n\n`;
        return output;
    }

    /**
     * Append extracted data to textarea
     */
    appendToTextarea(newData) {
        if (!this.textArea) return;
        
        const formatted = newData.map(data => this.formatTweetData(data)).join('');
        const currentValue = this.textArea.getValue();
        this.textArea.setValue(currentValue + formatted);
        
        // Scroll to bottom
        const textareaElement = this.textArea.getElement();
        if (textareaElement) {
            textareaElement.scrollTop = textareaElement.scrollHeight;
        }
    }

    /**
     * Update stats display
     */
    updateStats() {
        const statsCount = document.getElementById('xte-stats-count');
        if (statsCount) {
            statsCount.textContent = this.extractedTweetIds.size.toString();
        }
    }

    /**
     * Clear extracted tweets
     */
    clearTweets() {
        if (this.textArea) {
            this.textArea.setValue('');
        }
        this.extractedTweetIds.clear();
        this.updateStats();
        this.showNotification('Cleared all extracted tweets', 'info');
        PubSub.publish(XTweetExtractor.EVENTS.TWEETS_CLEARED);
    }

    /**
     * Copy to clipboard
     */
    async copyToClipboard() {
        try {
            if (!this.textArea) return;
            
            const text = this.textArea.getValue();
            if (!text.trim()) {
                this.showNotification('No content to copy', 'info');
                return;
            }
            
            await ClipboardService.copyToClipboard(text);
            this.showNotification('Copied to clipboard!', 'success');
        } catch (error) {
            Logger.error('Error copying to clipboard:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    /**
     * Setup notification queue with debouncer
     */
    setupNotificationQueue() {
        // Debouncer to batch notifications - wait 1.5 seconds after last extraction
        this.notificationDebouncer = Debouncer.debounce(() => {
            if (this.pendingNotificationCount > 0) {
                const count = this.pendingNotificationCount;
                this.pendingNotificationCount = 0; // Reset counter
                this.showNotification(`Extracted ${count} new tweet(s)`, 'success');
            }
        }, 1500);
    }

    /**
     * Queue notification (will be batched and shown after debounce delay)
     */
    queueNotification() {
        if (this.notificationDebouncer) {
            this.notificationDebouncer();
        }
    }

    /**
     * Flush pending notifications immediately
     */
    flushNotifications() {
        if (this.pendingNotificationCount > 0 && this.notificationDebouncer) {
            // Cancel the debouncer and show immediately
            if (this.notificationDebouncer.cancel) {
                this.notificationDebouncer.cancel();
            }
            const count = this.pendingNotificationCount;
            this.pendingNotificationCount = 0;
            this.showNotification(`Extracted ${count} new tweet(s)`, 'success');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        try {
            Notification.show({
                message,
                type,
                duration: 3000,
                position: 'top-right'
            });
        } catch (error) {
            Logger.warn('Failed to show notification:', error);
            Logger.info(message);
        }
    }
}

/**
 * Initialize the extractor when the page is ready
 */
function init() {
    Logger.info("Starting X Tweet Extractor initialization");
    
    const hostname = window.location.hostname;
    if (hostname !== 'x.com' && hostname !== 'twitter.com' && !hostname.includes('x.com') && !hostname.includes('twitter.com')) {
        Logger.warn("Not on X.com or Twitter.com, script will not run");
        return;
    }

    new XTweetExtractor();
}

// Start initialization
init();
