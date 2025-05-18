// Import core components
import {
    Button,
    Checkbox,
    DOMObserver,
    GMFunctions,
    HTMLUtils,
    Logger,
    Notification,
    SidebarPanel,
    Slider,
    StyleManager
} from "../common/core";
import VideoDownloader from "../common/core/utils/VideoDownloader";
import PollingStrategy from "../common/core/utils/UrlChangeWatcher/strategies/PollingStrategy";
import InstagramMediaFetcher from "./utils/InstagramMediaFetcher";
import HoverAction from "../common/core/utils/HoverAction";

// GMFunctions are now available as a namespace from the core import.
// The initialize() call is no longer needed here as GMFunctions.js self-initializes its fallbacks.
// const GM = GMFunctions.initialize(); 

// Configure logger
Logger.setPrefix("Instagram Video Controls");
Logger.DEBUG = true;

/**
 * Instagram Video Controller
 * Adds native HTML5 video controls to Instagram videos with robust fallbacks
 */
class InstagramVideoController {
    // Configuration
    static SELECTORS = {
        VIDEO: 'video',
        VIDEO_CONTAINER: '._aatk',  // Instagram's video container class
        STORY_OVERLAY: '._ac0m',     // Story overlay class
        CONTROLS_OVERLAY: '._9zmv1', // Controls overlay that can block native controls
        BODY: 'body'                // Main body element
    };

    static CLASSES = {
        PROCESSED: 'igvc-processed',
        ENHANCED: 'igvc-enhanced',
        CUSTOM_CONTROLS: 'igvc-custom-controls',
        CONTROL_BAR: 'igvc-control-bar',
        SETTINGS_PANEL: 'igvc-settings-panel',
        DOWNLOAD_BUTTON: 'igvc-download-btn',
        SPEED_BUTTON: 'igvc-speed-btn',
        LOOP_BUTTON: 'igvc-loop-btn',
        STATS_BUTTON: 'igvc-stats-btn',
        SPEED_ACTIVE: 'igvc-speed-active',
        LOOP_ACTIVE: 'igvc-loop-active',
        DOWNLOAD_BUTTON_LOADING: 'igvc-download-btn--loading',
    };

    static SETTINGS_KEYS = {
        ENHANCED_MODE: 'igvc-enhanced-mode',
        DEFAULT_VOLUME: 'igvc-default-volume',
        DISABLE_AUTOPLAY: 'igvc-disable-autoplay',
        DEFAULT_SPEED: 'igvc-default-speed',
        LOOP_VIDEOS: 'igvc-loop-videos',
        KEYBOARD_SHORTCUTS: 'igvc-keyboard-shortcuts',
        SHOW_DOWNLOAD: 'igvc-show-download',
        SHOW_SPEED: 'igvc-show-speed',
        SHOW_LOOP: 'igvc-show-loop',
        SHOW_STATS: 'igvc-show-stats',
        AUDIO_UNMUTED: 'igvc-audio-unmuted',
    };

    static SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

    static KEYBOARD_SHORTCUTS = {
        SPACE: {key: ' ', description: 'Play/Pause'},
        LEFT_ARROW: {key: 'ArrowLeft', description: 'Seek -5s'},
        RIGHT_ARROW: {key: 'ArrowRight', description: 'Seek +5s'},
        UP_ARROW: {key: 'ArrowUp', description: 'Volume +10%'},
        DOWN_ARROW: {key: 'ArrowDown', description: 'Volume -10%'},
        M: {key: 'm', description: 'Mute/Unmute'},
        F: {key: 'f', description: 'Fullscreen'},
        D: {key: 'd', description: 'Download'},
        S: {key: 's', description: 'Change Speed'},
        L: {key: 'l', description: 'Loop on/off'}
    };

    static SETTINGS = {
        CHECK_INTERVAL: 1000,     // Fallback interval for checking videos (ms)
        OBSERVER_THROTTLE: 1000,   // Throttle DOM observer callbacks
        ENHANCED_MODE: true,      // Enable enhanced mode with additional features
        DEFAULT_VOLUME: 0.5,      // Default volume level (0.0 to 1.0)
        DISABLE_AUTOPLAY: false,  // Disable Instagram's autoplay behavior
        DEFAULT_SPEED: 1.0,       // Default playback speed
        LOOP_VIDEOS: false,       // Loop videos by default
        KEYBOARD_SHORTCUTS: true, // Enable keyboard shortcuts
        SHOW_DOWNLOAD: true,      // Show download button
        SHOW_SPEED: true,         // Show speed control button
        SHOW_LOOP: true,          // Show loop button
        SHOW_STATS: true          // Show video stats button
    };

    /**
     * Initialize the controller
     */
    constructor() {
        this.lastUrl = location.href;
        this.domObserver = null;
        this.lastProcessTime = 0;
        this.activeVideo = null;
        this.settingsPanel = null;
        this.keyboardHandler = null;

        // Load saved settings
        this.loadSettings();

        Logger.debug("Initializing Instagram Video Controller");

        this.mediaFetcher = new InstagramMediaFetcher();
        Logger.debug("InstagramMediaFetcher instance created (API always enabled).");

        // Apply styles first
        this.applyStyles();

        // Create settings panel
        this.createSettingsPanel();

        // Process existing videos
        this.processVideos();

        // Setup keyboard shortcuts if enabled
        if (this.settings.KEYBOARD_SHORTCUTS) {
            this.setupKeyboardShortcuts();
        }

        this.setupDOMObserver();
    }

    /**
     * Load saved settings from GM storage
     */
    async loadSettings() {
        this.settings = {...InstagramVideoController.SETTINGS};

        try {
            // Load each setting individually with defaults
            for (const [settingName, storageKey] of Object.entries(InstagramVideoController.SETTINGS_KEYS)) {
                const savedValue = await GMFunctions.getValue(storageKey, null);

                // Only update if the setting exists in storage
                if (savedValue !== null) {
                    this.settings[settingName] = savedValue;
                }
            }

            this.audioUnmuted = await GMFunctions.getValue(InstagramVideoController.SETTINGS_KEYS.AUDIO_UNMUTED, false);
            Logger.debug("Settings loaded", this.settings);
        } catch (error) {
            Logger.error(error, "Loading settings");
        }
    }

    /**
     * Save settings to GM storage
     */
    async saveSettings() {
        try {
            // Save each setting individually
            for (const [settingName, storageKey] of Object.entries(InstagramVideoController.SETTINGS_KEYS)) {
                await GMFunctions.setValue(storageKey, this.settings[settingName]);
            }

            Logger.debug("Settings saved", this.settings);
        } catch (error) {
            Logger.error(error, "Saving settings");
        }
    }

    /**
     * Apply custom styles for the script
     */
    applyStyles() {
        StyleManager.addStyles(`
            /* Make videos with controls more visible */
            video.${InstagramVideoController.CLASSES.PROCESSED} {
            z-index: 10 !important;
            position: relative !important;
        }

        /* Ensure controls are visible */
        video.${InstagramVideoController.CLASSES.PROCESSED}::-webkit-media-controls {
            opacity: 1 !important;
            display: flex !important;
        }

        /* Additional styles for enhanced mode */
        video.${InstagramVideoController.CLASSES.ENHANCED} {
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
            border-radius: 3px;
            transition: box-shadow 0.2s ease-in-out;
        }

        video.${InstagramVideoController.CLASSES.ENHANCED}:hover {
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
        }

        /* Prevent Instagram from hiding our controls */
    ._9zmv1[aria-hidden="true"] {
            display: none !important;
        }

        /* Custom controls bar */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            top: 40px; /* Position above native controls */
            right: 10px;
            z-index: 12;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            padding: 4px 8px;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }

        /* Show controls on video hover */
        video.${InstagramVideoController.CLASSES.PROCESSED}:hover + .${InstagramVideoController.CLASSES.CONTROL_BAR},
    .${InstagramVideoController.CLASSES.CONTROL_BAR}:hover {
            opacity: 1;
            pointer-events: auto;
        }

        /* Control buttons */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button {
            background: transparent;
            border: none;
            color: white;
            font-size: 14px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            outline: none;
            transition: background-color 0.2s ease;
        }

    .${InstagramVideoController.CLASSES.CONTROL_BAR} button:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        /* Active state for toggleable buttons */
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button.${InstagramVideoController.CLASSES.SPEED_ACTIVE},
    .${InstagramVideoController.CLASSES.CONTROL_BAR} button.${InstagramVideoController.CLASSES.LOOP_ACTIVE} {
            background-color: rgba(255, 255, 255, 0.3);
            color: #1da1f2;
        }

        /* Video stats display */
    .igvc-stats-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: monospace;
            z-index: 11;
            pointer-events: none;
            display: none;
        }

    .igvc-stats-overlay.active {
            display: block;
        }

    .igvc-stats-overlay p {
            margin: 4px 0;
            line-height: 1.3;
        }

        /* Tooltip styles */
    .igvc-tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            transform: translateY(-30px);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        /* Settings panel styles handled by SidebarPanel component */
    .igvc-settings-title {
            margin-bottom: 16px;
            font-weight: bold;
            font-size: 16px;
        }

    .igvc-settings-section {
            margin-bottom: 20px;
        }

    .igvc-settings-section h3 {
            margin-bottom: 10px;
            font-size: 14px;
            color: #444;
        }

    .igvc-setting-item {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

    .igvc-setting-label {
            font-size: 13px;
            flex: 1;
        }

    .igvc-shortcut-list {
            margin-top: 10px;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }

    .igvc-shortcut-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
        }

    .igvc-shortcut-key {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            margin-right: 10px;
        }

        /* Speed selection menu */
    .igvc-speed-menu {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 6px;
            padding: 8px 0;
            z-index: 20;
            display: none;
            flex-direction: column;
            gap: 4px;
            top: -130px;
            right: 10px;
        }

    .igvc-speed-menu.active {
            display: flex;
        }

    .igvc-speed-option {
            color: white;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.15s ease;
        }

    .igvc-speed-option:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

    .igvc-speed-option.active {
            background-color: rgba(29, 161, 242, 0.3);
            color: #fff;
        }

        /* Custom seekbar preview thumbnail */
    .igvc-seekbar-preview {
            position: absolute;
            background: #000;
            border: 2px solid white;
            border-radius: 4px;
            width: 160px;
            height: 90px;
            z-index: 15;
            pointer-events: none;
            display: none;
            bottom: 50px;
            transform: translateX(-50%);
        }
        
        .${InstagramVideoController.CLASSES.DOWNLOAD_BUTTON}--loading {
            animation: igvc-pulse 1.5s infinite;
        }
        
        @keyframes igvc-pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        `
            , 'instagram-video-controls-styles');

        Logger.debug("Custom styles applied");
    }

    // Add a new method for setting up the DOM observer
    setupDOMObserver() {
        // Create a throttled callback for handling mutations
        const handleMutations = (mutations) => {
            // Clear any existing timeout to prevent multiple rapid processing
            if (this.processingThrottleTimeout) {
                clearTimeout(this.processingThrottleTimeout);
            }

            // Check if any of the mutations might have added videos
            const shouldProcess = mutations.some(mutation => {
                // Check for added nodes
                if (mutation.addedNodes.length > 0) {
                    // Check if any added node is a video or could contain a video
                    return Array.from(mutation.addedNodes).some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Either it's a video element
                            if (node.tagName === 'VIDEO') {
                                return true;
                            }
                            // Or it contains video elements
                            return node.querySelector('video') !== null;
                        }
                        return false;
                    });
                }
                return false;
            });

            // Only schedule processing if necessary
            if (shouldProcess) {
                // Use setTimeout for throttling (process max once every 500ms)
                this.processingThrottleTimeout = setTimeout(() => {
                    Logger.debug("DOM changes detected that might have added videos, processing...");
                    this.processVideos();
                }, 500);
            }
        };

        // Handle URL changes
        const handleUrlChange = (newUrl, oldUrl) => {
            Logger.debug(`URL changed: ${oldUrl} → ${newUrl}`);
            this.processVideos();
        };

        // Define strategies for Instagram's URL change detection
        const urlChangeStrategies = [
            new PollingStrategy(handleUrlChange, 1000), // Fallback polling strategy
        ];

        // Initialize DOMObserver with our callbacks and strategies
        this.domObserver = new DOMObserver(handleMutations, urlChangeStrategies);

        // Start observing document.body for changes
        this.domObserver.observe();

        Logger.debug("DOM Observer started");
    }

    /**
     * Create the settings panel using SidebarPanel component
     */
    createSettingsPanel() {
        try {
            // Create panel content
            const content = document.createElement('div');
            content.className = InstagramVideoController.CLASSES.SETTINGS_PANEL;

            // Title
            const title = document.createElement('div');
            title.className = 'igvc-settings-title';
            title.textContent = 'Instagram Video Controls Settings';
            content.appendChild(title);

            // Video Behavior section
            const behaviorSection = document.createElement('div');
            behaviorSection.className = 'igvc-settings-section';
            behaviorSection.innerHTML = '<h3>Video Behavior</h3>';

            // Add each setting control
            this.addSettingToggle(
                behaviorSection,
                'Enhanced Video Display',
                'ENHANCED_MODE',
                'Adds visual enhancements to videos'
            );

            this.addSettingToggle(
                behaviorSection,
                'Disable Autoplay',
                'DISABLE_AUTOPLAY',
                'Prevents videos from autoplaying'
            );

            this.addSettingToggle(
                behaviorSection,
                'Loop Videos',
                'LOOP_VIDEOS',
                'Automatically loop videos when they end'
            );

            // Volume slider
            const volumeItem = document.createElement('div');
            volumeItem.className = 'igvc-setting-item';

            const volumeLabel = document.createElement('div');
            volumeLabel.className = 'igvc-setting-label';
            volumeLabel.textContent = 'Default Volume';
            volumeItem.appendChild(volumeLabel);

            // Create volume slider using core Slider component
            const volumeSliderContainer = document.createElement('div');
            volumeSliderContainer.style.width = '150px';
            volumeItem.appendChild(volumeSliderContainer);

            behaviorSection.appendChild(volumeItem);

            // Create the slider after appending to ensure the container exists
            const volumeSlider = new Slider({
                min: 0,
                max: 1,
                step: 0.1,
                value: this.settings.DEFAULT_VOLUME,
                container: volumeSliderContainer,
                valueSuffix: 'x',
                showValue: true,
                onChange: (value) => {
                    this.settings.DEFAULT_VOLUME = value;
                    this.saveSettings();
                }
            });

            content.appendChild(behaviorSection);

            // Features section
            const featuresSection = document.createElement('div');
            featuresSection.className = 'igvc-settings-section';
            featuresSection.innerHTML = '<h3>Features</h3>';

            this.addSettingToggle(
                featuresSection,
                'Keyboard Shortcuts',
                'KEYBOARD_SHORTCUTS',
                'Enable keyboard shortcuts for video control',
                (value) => {
                    // Setup or remove keyboard shortcuts when toggled
                    if (value) {
                        this.setupKeyboardShortcuts();
                    } else {
                        this.removeKeyboardShortcuts();
                    }
                }
            );

            this.addSettingToggle(
                featuresSection,
                'Show Download Button',
                'SHOW_DOWNLOAD',
                'Display download button in the control bar'
            );

            this.addSettingToggle(
                featuresSection,
                'Show Speed Control',
                'SHOW_SPEED',
                'Display playback speed button in the control bar'
            );

            this.addSettingToggle(
                featuresSection,
                'Show Loop Button',
                'SHOW_LOOP',
                'Display loop button in the control bar'
            );

            this.addSettingToggle(
                featuresSection,
                'Show Video Stats',
                'SHOW_STATS',
                'Display detailed video statistics'
            );

            content.appendChild(featuresSection);

            // Keyboard shortcuts section (if enabled)
            if (this.settings.KEYBOARD_SHORTCUTS) {
                const shortcutsSection = document.createElement('div');
                shortcutsSection.className = 'igvc-settings-section';
                shortcutsSection.innerHTML = '<h3>Keyboard Shortcuts</h3>';

                const shortcutsList = document.createElement('div');
                shortcutsList.className = 'igvc-shortcut-list';

                // Add each shortcut
                Object.entries(InstagramVideoController.KEYBOARD_SHORTCUTS).forEach(([name, shortcut]) => {
                    const shortcutItem = document.createElement('div');
                    shortcutItem.className = 'igvc-shortcut-item';

                    const keyElement = document.createElement('span');
                    keyElement.className = 'igvc-shortcut-key';
                    keyElement.textContent = shortcut.key === ' ' ? 'Space' : shortcut.key;

                    const descElement = document.createElement('span');
                    descElement.className = 'igvc-shortcut-desc';
                    descElement.textContent = shortcut.description;

                    shortcutItem.appendChild(keyElement);
                    shortcutItem.appendChild(descElement);
                    shortcutsList.appendChild(shortcutItem);
                });

                shortcutsSection.appendChild(shortcutsList);
                content.appendChild(shortcutsSection);
            }

            const buttonContainer = document.createElement('div');

            // Create a reset button
            const resetButton = new Button({
                text: 'Reset to Defaults',
                className: 'igvc-reset-button',
                onClick: () => {
                    // Confirm before resetting
                    if (confirm('Are you sure you want to reset all settings to default values?')) {
                        this.settings = {...InstagramVideoController.SETTINGS};
                        this.saveSettings();

                        // Close and recreate the panel to reflect changes
                        this.settingsPanel.close();
                        setTimeout(() => this.createSettingsPanel(), 300);

                        // Show notification
                        Notification.success('Settings have been reset to defaults');
                    }
                },
                container: buttonContainer
            });

            // Add button container
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'center';
            content.appendChild(buttonContainer);

            // Create the sidebar panel
            this.settingsPanel = new SidebarPanel({
                title: 'Instagram Video Controls',
                id: 'igvc-settings-panel',
                position: 'right',
                transition: 'slide',
                buttonIcon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v3M19.07 5.93l-2.12 2.12M22 12h-3M19.07 18.07l-2.12-2.12M12 22v-3M4.93 18.07l2.12-2.12M2 12h3M4.93 5.93l2.12 2.12"/><circle cx="12" cy="12" r="4"/></svg>',
                content: {
                    html: content
                },
                style: {
                    width: '320px',
                    buttonBg: '#405DE6',
                    buttonColor: 'white'
                }
            });

            Logger.debug("Settings panel created");
        } catch (error) {
            Logger.error(error, "Creating settings panel");
        }
    }

    /**
     * Add a setting toggle to the settings panel
     * @param {HTMLElement} container - Container to add the toggle to
     * @param {string} label - Setting label
     * @param {string} settingKey - Key in the settings object
     * @param {string} description - Optional description/tooltip
     * @param {Function} onChange - Optional callback function
     */
    addSettingToggle(container, label, settingKey, description = '', onChange = null) {
        const settingItem = document.createElement('div');
        settingItem.className = 'igvc-setting-item';

        const labelElement = document.createElement('div');
        labelElement.className = 'igvc-setting-label';
        labelElement.textContent = label;

        if (description) {
            labelElement.title = description;
        }

        settingItem.appendChild(labelElement);

        // Create checkbox using core Checkbox component
        const checkbox = new Checkbox({
            checked: this.settings[settingKey],
            onChange: (e) => {
                this.settings[settingKey] = e.target.checked;
                this.saveSettings();

                if (onChange) {
                    onChange(e.target.checked);
                }
            },
            container: settingItem,
        });

        container.appendChild(settingItem);

        return checkbox;
    }

    /**
     * Process all unprocessed videos on the page
     */
    processVideos() {
        try {
            const videos = document.querySelectorAll(InstagramVideoController.SELECTORS.VIDEO);
            Logger.debug(`Found ${videos.length} total videos on page`);

            let processedCount = 0;

            videos.forEach(video => {
                if (video.classList.length > 0 && !video.classList.contains(InstagramVideoController.CLASSES.PROCESSED)) {
                    this.enhanceVideo(video);
                    processedCount++;
                }
            });

            if (processedCount > 0) {
                Logger.debug(`Enhanced ${processedCount} new videos`);
            }
        } catch (error) {
            Logger.error(error, "Processing videos");
        }
    }

    /**
     * Enhance a video with native controls
     * @param {HTMLVideoElement} video - The video element to enhance
     */
    enhanceVideo(video) {
        // --- ADD THIS CHECK AT THE VERY BEGINNING ---
        // If already processed, skip (extra safety check)
        if (video.classList.contains(InstagramVideoController.CLASSES.PROCESSED)) {
            // Logger.debug("Skipping already processed video:", video.src?.substring(0, 50));
            return;
        }
        // --- END ADDED CHECK ---

        try {
            // Mark as processed
            video.classList.add(InstagramVideoController.CLASSES.PROCESSED);

            // Add enhanced class if enabled
            if (this.settings.ENHANCED_MODE) {
                video.classList.add(InstagramVideoController.CLASSES.ENHANCED);
            }

            // Enable native controls
            video.setAttribute('controls', 'true');
            video.controls = true;

            // Apply the global preference ONLY if the video is currently muted.
            // If the video is already unmuted (e.g., by Instagram itself), leave it.
            if (this.audioUnmuted && video.muted) {
                video.muted = false;
                Logger.debug("Applying global unmute preference to video:", video.src?.substring(0, 50));
            } else if (!this.audioUnmuted && !video.muted) {
                // If global preference is muted, but video isn't, mute it initially.
                // This handles cases where IG might default to unmuted on some videos.
                // video.muted = true; // Optional: Decide if you want to enforce mute initially
                Logger.debug("Video initially unmuted, respecting global mute preference (or default).");
            }

            let volumeEventTrusted = false;
            const handler = (e) => volumeEventTrusted = e.isTrusted;
            video.addEventListener('volumechange', handler, {once: true});

            // Listen for user unmuting the video
            video.addEventListener('volumechange', () => {
                const isNowAudible = !video.muted && video.volume > 0;

                if (isNowAudible && volumeEventTrusted) {
                    this.audioUnmuted = true;
                    GMFunctions.setValue(InstagramVideoController.SETTINGS_KEYS.AUDIO_UNMUTED, true);
                    Logger.debug("User unmuted video (volume > 0), preference saved.");
                } else if (video.muted || video.volume === 0) {
                    this.audioUnmuted = false;
                    Logger.debug("Video manually muted or volume set to 0. Global preference remains:", this.audioUnmuted);
                }
            });

            // Set default volume if not already set
            if (video.volume < 0.1) {
                video.volume = this.settings.DEFAULT_VOLUME;
            }

            // Apply default playback speed
            if (video.volume < 0.01) { // Check if volume is effectively zero
                video.volume = this.settings.DEFAULT_VOLUME;
                Logger.debug("Setting default volume:", this.settings.DEFAULT_VOLUME);
            }

            // Disable autoplay if setting is enabled
            if (this.settings.DISABLE_AUTOPLAY) {
                video.autoplay = false;

                // Force-stop the video if it's playing
                if (!video.paused) {
                    video.pause();
                }

                // Override play method to prevent further autoplay
                const originalPlay = video.play;
                video.play = function (...args) {
                    // Allow user-initiated plays by checking if it's from a click event
                    if (window.event && (window.event.type === 'click' || window.event.type === 'pointerup')) {
                        return originalPlay.apply(this, args);
                    }
                    return new Promise(resolve => resolve());
                };
            }

            // Apply loop setting
            video.loop = this.settings.LOOP_VIDEOS;

            // Remove any overlays that might block controls
            this.removeOverlays(video);

            // Create control bar with additional features
            this.addEnhancedControls(video);

            Logger.debug("Video enhanced successfully", video.src?.substring(0, 50));

            // Setup additional improvements
            this.setupVideoImprovements(video);
        } catch (error) {
            Logger.error(error, "Enhancing video");
            // Ensure the class is removed if enhancement failed badly
            video.classList.remove(InstagramVideoController.CLASSES.PROCESSED);
        }
    }

    /**
     * Add enhanced controls to a video
     * @param {HTMLVideoElement} video - The video element to enhance
     */
    addEnhancedControls(video) {
        // Prevent adding duplicate control bars/stats overlays
        const parent = video.parentNode;
        if (!parent) return;

        const existingControlBar = parent.querySelector(`.${InstagramVideoController.CLASSES.CONTROL_BAR}[data-video-src="${video.src}"]`);
        const existingStatsOverlay = parent.querySelector('.igvc-stats-overlay'); // Assuming only one stats overlay per parent

        if (existingControlBar) {
            Logger.debug("Control bar already exists for this video, skipping add.", video.src?.substring(0, 50));
            return;
        }

        try {
            // Create control bar
            const controlBar = document.createElement('div');
            controlBar.className = InstagramVideoController.CLASSES.CONTROL_BAR;
            controlBar.dataset.videoId = video.src;

            // Track active controls for this video
            const activeControls = [];

            // Download button 1
            if (this.settings.SHOW_DOWNLOAD) {
                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
                downloadButton.title = 'Download Video';
                downloadButton.className = InstagramVideoController.CLASSES.DOWNLOAD_BUTTON;
                new HoverAction({
                    element: downloadButton,
                    action: async (options, reportProgress) => {
                        // The action to perform on hover (preload download info)
                        try {
                            const mediaInfo = await this.mediaFetcher.getMediaInfo(video, options);
                            return mediaInfo;
                        } catch (error) {
                            Logger.error("Error preloading media info on hover:", error);
                            throw error;
                        }
                    },
                    onClick: async (mediaInfo, e) => {
                        // Handle the click with the preloaded mediaInfo if available
                        e.preventDefault();
                        e.stopPropagation();

                        await this.downloadVideo(video, mediaInfo);
                    },
                    onResult: (mediaInfo) => {
                        // Callback when the action completes successfully
                        if (mediaInfo && mediaInfo.url) {
                            Logger.debug(`Media info preloaded successfully. URL length: ${mediaInfo.url.length}`);
                        }
                    },
                    loadingClass: InstagramVideoController.CLASSES.DOWNLOAD_BUTTON_LOADING,
                    hoverDelay: 200,          // Start preloading after 200ms hover
                    abortOnLeave: true,       // Abort preloading if mouse leaves
                    cacheTTL: 60000,          // Cache result for 1 minute (Instagram might update stories frequently)
                    eventNamePrefix: 'igvc-download'
                });
                controlBar.appendChild(downloadButton);
                activeControls.push('download');
            }


            // Speed control button
            if (this.settings.SHOW_SPEED) {
                const speedButton = document.createElement('button');
                speedButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v4M19.07 4.93l-2.83 2.83M22 12h-4M19.07 19.07l-2.83-2.83M12 18v4M7.76 19.07l-2.83-2.83M6 12H2M7.76 4.93L4.93 7.76"/></svg>';
                speedButton.title = 'Playback Speed';
                speedButton.className = InstagramVideoController.CLASSES.SPEED_BUTTON;

                if (video.playbackRate !== 1.0) {
                    speedButton.classList.add(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                    speedButton.innerHTML = `${video.playbackRate}x`;
                }

                // Create speed menu
                const speedMenu = document.createElement('div');
                speedMenu.className = 'igvc-speed-menu';

                // Add options
                InstagramVideoController.SPEED_OPTIONS.forEach(speed => {
                    const option = document.createElement('div');
                    option.className = 'igvc-speed-option';
                    option.textContent = `${speed}x`;
                    option.dataset.speed = speed;

                    if (video.playbackRate === speed) {
                        option.classList.add('active');
                    }

                    option.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Set speed
                        video.playbackRate = speed;

                        // Update active class
                        Array.from(speedMenu.children).forEach(child => {
                            child.classList.remove('active');
                        });
                        option.classList.add('active');

                        // Update button text and appearance
                        speedButton.innerHTML = `${speed}x`;

                        if (speed !== 1.0) {
                            speedButton.classList.add(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                        } else {
                            speedButton.classList.remove(InstagramVideoController.CLASSES.SPEED_ACTIVE);
                        }

                        // Hide menu
                        speedMenu.classList.remove('active');
                    });

                    speedMenu.appendChild(option);
                });

                controlBar.appendChild(speedMenu);

                // Toggle speed menu on click
                speedButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    speedMenu.classList.toggle('active');

                    // Close when clicking outside
                    const closeMenu = (e) => {
                        if (!speedMenu.contains(e.target) && e.target !== speedButton) {
                            speedMenu.classList.remove('active');
                            document.removeEventListener('click', closeMenu);
                        }
                    };

                    if (speedMenu.classList.contains('active')) {
                        // Use setTimeout to avoid immediate triggering
                        setTimeout(() => document.addEventListener('click', closeMenu), 0);
                    }
                });

                controlBar.appendChild(speedButton);
                activeControls.push('speed');
            }

            // Loop button
            if (this.settings.SHOW_LOOP) {
                const loopButton = document.createElement('button');
                loopButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
                loopButton.title = 'Loop Video';
                loopButton.className = InstagramVideoController.CLASSES.LOOP_BUTTON;

                if (video.loop) {
                    loopButton.classList.add(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                }

                loopButton.addEventListener('click', (e) => {
                    e.preventDefault();

                    // Toggle loop state
                    video.loop = !video.loop;

                    // Update appearance
                    if (video.loop) {
                        loopButton.classList.add(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                    } else {
                        loopButton.classList.remove(InstagramVideoController.CLASSES.LOOP_ACTIVE);
                    }
                });

                controlBar.appendChild(loopButton);
                activeControls.push('loop');
            }

            // Stats button
            if (this.settings.SHOW_STATS) {
                const statsButton = document.createElement('button');
                statsButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
                statsButton.title = 'Video Statistics';
                statsButton.className = InstagramVideoController.CLASSES.STATS_BUTTON;

                // Create stats overlay
                const statsOverlay = document.createElement('div');
                statsOverlay.className = 'igvc-stats-overlay';
                const statsContent = document.createElement('div');
                statsOverlay.appendChild(statsContent);

                // Toggle stats display
                statsButton.addEventListener('click', (e) => {
                    e.preventDefault();

                    if (statsOverlay.classList.contains('active')) {
                        statsOverlay.classList.remove('active');
                    } else {
                        // Update stats before showing
                        this.updateVideoStats(video, statsContent);
                        statsOverlay.classList.add('active');
                    }
                });

                // Add to control bar and parent container
                controlBar.appendChild(statsButton);
                video.parentNode.appendChild(statsOverlay);
                activeControls.push('stats');

                // Update stats periodically when visible
                setInterval(() => {
                    if (statsOverlay.classList.contains('active') && document.contains(video)) {
                        this.updateVideoStats(video, statsContent);
                    }
                }, 1000);
            }

            // Only add the control bar if we have active controls
            if (activeControls.length > 0) {
                video.parentNode.insertBefore(controlBar, video.nextSibling);

                // Store a reference to the active video when hovering controls
                controlBar.addEventListener('mouseenter', () => {
                    this.activeVideo = video;
                });

                controlBar.addEventListener('mouseleave', () => {
                    this.activeVideo = null;
                });
            }

        } catch (error) {
            Logger.error(error, "Adding enhanced controls");
        }
    }

    /**
     * Update video statistics display
     * @param {HTMLVideoElement} video - The video element
     * @param {HTMLElement} container - The stats container element
     */
    updateVideoStats(video, container) {
        try {
            // Get basic video info
            const currentTime = video.currentTime;
            const duration = video.duration || 0;
            const volume = Math.round(video.volume * 100);
            const playbackRate = video.playbackRate;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            // Calculate time remaining
            const timeRemaining = duration - currentTime;

            // Format times as MM:SS
            const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            };

            // Build HTML with stats
            let html =
                `  <p><b>Resolution:</b> ${videoWidth}×${videoHeight}</p>
            <p><b>Duration:</b> ${formatTime(duration)}</p>
            <p><b>Current:</b> ${formatTime(currentTime)}</p>
            <p><b>Remaining:</b> ${formatTime(timeRemaining)}</p>
            <p><b>Volume:</b> ${volume}%</p>
            <p><b>Speed:</b> ${playbackRate}x</p>
            <p><b>Loop:</b> ${video.loop ? 'On' : 'Off'}</p>`
            ;

            // Add extra info if available
            if (video.src) {
                const srcSize = (video.src.length / 1024).toFixed(1);
                html += `<p><b>Source Size:</b> ~${srcSize} KB</p>`;
            }

            // Update container content
            container.innerHTML = html;

        } catch (error) {
            Logger.error(error, "Updating video stats");
        }
    }

    /**
     * Set up keyboard shortcuts for video control
     */
    setupKeyboardShortcuts() {
        // Remove any existing handlers first
        this.removeKeyboardShortcuts();

        // Create keyboard handler
        this.keyboardHandler = async (e) => {
            // Don't process shortcuts when typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Find active video (either the one with controls hovered or the currently visible one)
            let targetVideo = this.activeVideo;

            // If no active video found by controls hover, try to find one that's playing or visible
            if (!targetVideo) {
                const videos = document.querySelectorAll(`video.${InstagramVideoController.CLASSES.PROCESSED}`);

                // First try to find one that's playing
                targetVideo = Array.from(videos).find(v => !v.paused);

                // If none are playing, try to find one that's visible
                if (!targetVideo) {
                    targetVideo = Array.from(videos).find(v => {
                        const rect = v.getBoundingClientRect();
                        return (
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth
                        );
                    });
                }

                // If still no video found, use the first one
                if (!targetVideo && videos.length > 0) {
                    targetVideo = videos[0];
                }
            }

            // Do nothing if no video found
            if (!targetVideo) return;

            // Process keyboard shortcuts
            switch (e.key) {
                case ' ': // Space - play/pause
                    e.preventDefault();
                    if (targetVideo.paused) {
                        targetVideo.play();
                    } else {
                        targetVideo.pause();
                    }
                    break;

                case 'ArrowLeft': // Left arrow - seek backward 5s
                    e.preventDefault();
                    targetVideo.currentTime = Math.max(0, targetVideo.currentTime - 5);
                    break;

                case 'ArrowRight': // Right arrow - seek forward 5s
                    e.preventDefault();
                    targetVideo.currentTime = Math.min(targetVideo.duration, targetVideo.currentTime + 5);
                    break;

                case 'ArrowUp': // Up arrow - volume up 10%
                    e.preventDefault();
                    targetVideo.volume = Math.min(1, targetVideo.volume + 0.1);
                    break;

                case 'ArrowDown': // Down arrow - volume down 10%
                    e.preventDefault();
                    targetVideo.volume = Math.max(0, targetVideo.volume - 0.1);
                    break;

                case 'm': // M - mute/unmute
                case 'M':
                    e.preventDefault();
                    targetVideo.muted = !targetVideo.muted;
                    break;

                case 'f': // F - fullscreen
                case 'F':
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (targetVideo.requestFullscreen) {
                        targetVideo.requestFullscreen();
                    }
                    break;

                case 'd': // D - download
                case 'D':
                    e.preventDefault();
                    await this.downloadVideo(targetVideo);
                    break;

                case 's': // S - speed toggle
                case 'S':
                    e.preventDefault();
                    // Cycle through speeds: 1x -> 1.5x -> 2x -> 0.5x -> 0.75x -> 1x
                    const speedSequence = [1, 1.5, 2, 0.5, 0.75, 1];
                    const currentIndex = speedSequence.findIndex(s => Math.abs(s - targetVideo.playbackRate) < 0.01);
                    const nextIndex = (currentIndex !== -1) ? (currentIndex + 1) % speedSequence.length : 1;
                    targetVideo.playbackRate = speedSequence[nextIndex];

                    // Show notification
                    Notification.info(`Playback speed: ${targetVideo.playbackRate}x`, {
                        duration: 1500,
                        position: 'top-center'
                    });
                    break;

                case 'l': // L - loop toggle
                case 'L':
                    e.preventDefault();
                    targetVideo.loop = !targetVideo.loop;

                    // Show notification
                    Notification.info(`Loop: ${targetVideo.loop ? 'On' : 'Off'}`, {
                        duration: 1500,
                        position: 'top-center'
                    });
                    break;
            }
        };

        // Add keyboard handler
        document.addEventListener('keydown', this.keyboardHandler);
        Logger.debug("Keyboard shortcuts enabled");
    }

    /**
     * Remove keyboard shortcuts
     */
    removeKeyboardShortcuts() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
            Logger.debug("Keyboard shortcuts removed");
        }
    }

    /**
     * Download the video
     * @param {HTMLVideoElement} video - The video element to download
     * @param preloadedMediaInfo
     */
    async downloadVideo(video, preloadedMediaInfo = null) {
        // Check if download button should be shown/active based on settings
        if (!this.settings.SHOW_DOWNLOAD) {
            Logger.warn("Download action triggered, but download button is disabled in settings.");
            return; // Don't proceed if the feature is turned off
        }

        // Find the download button if it exists d
        const downloadButton = video.parentElement?.querySelector(`.${InstagramVideoController.CLASSES.DOWNLOAD_BUTTON}`);

        // Apply loading state if button exists and doesn't already have the loading class
        if (downloadButton && !downloadButton.classList.contains(InstagramVideoController.CLASSES.DOWNLOAD_BUTTON_LOADING)) {
            downloadButton.classList.add(InstagramVideoController.CLASSES.DOWNLOAD_BUTTON_LOADING);
        }

        try {
            // If we have preloaded media info, use it; otherwise fetch it
            let mediaInfo = preloadedMediaInfo;

            if (!mediaInfo) {
                // Only show notification if we need to fetch the media info
                Notification.info('Fetching download link...', {duration: 2000});
                Logger.debug("Attempting download via InstagramMediaFetcher for video:", video);

                // Use the shared mediaFetcher instance (API is always enabled now)
                mediaInfo = await this.mediaFetcher.getMediaInfo(video);
            }

            if (mediaInfo && mediaInfo.url) {
                Logger.info(`Using ${preloadedMediaInfo ? 'preloaded' : 'fetched'} URL: ${mediaInfo.url.substring(0, 100)}... (Type: ${mediaInfo.type}, Index: ${mediaInfo.mediaIndex})`);
                Notification.success(`Found ${mediaInfo.type} URL. Starting download...`, {duration: 2500});

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const fileExtension = mediaInfo.type === 'video' ? 'mp4' : 'jpg';
                const filename = `instagram_${mediaInfo.type}_${mediaInfo.mediaIndex ?? 0}_${timestamp}.${fileExtension}`;

                // Use VideoDownloader with the fetched URL
                await VideoDownloader.downloadFromUrl(mediaInfo.url, video);
            } else {
                Logger.error('InstagramMediaFetcher failed to retrieve a media URL.');
                Notification.error('Could not automatically find the download link. Try right-clicking the video.', {duration: 5000});
            }
        } catch (error) {
            Logger.error(error, "Error during InstagramMediaFetcher download process");
            Notification.error(`Download failed: ${error.message}`, {duration: 5000});
        } finally {
            // Remove loading state from button
            if (downloadButton) {
                downloadButton.classList.remove(InstagramVideoController.CLASSES.DOWNLOAD_BUTTON_LOADING);
            }
        }
    }

    async recordAndDownload(video) {
        try {
            const stream = video.captureStream();
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);

            const done = new Promise((resolve) => {
                recorder.onstop = () => resolve();
            });

            // Start recording
            recorder.start();

            // Record only a short chunk (e.g., 5 seconds or full duration if shorter)
            const duration = Math.min(video.duration || 5, 5);
            await new Promise((res) => setTimeout(res, duration * 1000));

            recorder.stop();
            await done;

            const blob = new Blob(chunks, {type: 'video/mp4'});
            const blobUrl = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `instagram_video_recorded_${timestamp}.mp4`;

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 100);

            Notification.success("Recorded and downloaded a short clip");
        } catch (error) {
            Logger.error(error, "Recording video stream");
            Notification.error("Stream recording failed");
        }
    }

    /**
     * Remove overlays that might block video controls
     * @param {HTMLVideoElement} video - The video element
     */
    removeOverlays(video) {
        try {
            // Find parent container
            const container = video.closest(InstagramVideoController.SELECTORS.VIDEO_CONTAINER) ||
                video.parentElement;

            if (!container) return;

            // Remove sibling overlays
            Array.from(container.children).forEach(child => {
                if (child !== video && child.tagName === 'DIV') {
                    // Check if it's an overlay element
                    const isOverlay = !child.querySelector('img, video');

                    if (isOverlay) {
                        child.remove();
                        Logger.debug("Removed overlay element");
                    }
                }
            });
        } catch (error) {
            Logger.error(error, "Removing overlays");
        }
    }

    /**
     * Setup additional improvements for videos
     * @param {HTMLVideoElement} video - The video element
     */
    setupVideoImprovements(video) {
        // Ensure we can play the video properly
        video.addEventListener('canplay', () => {
            // Enable picture-in-picture if supported
            if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
                video.disablePictureInPicture = false;
            }
        }, {once: true});

        // Setup seekbar preview (experimental)
        this.setupSeekbarPreview(video);

        // Fix for videos that might lose controls after Instagram's JS runs
        const ensureControls = () => {
            if (!video.controls) {
                video.controls = true;
                Logger.debug("Re-applied controls to video");
            }
        };

        // Check periodically to ensure controls remain enabled
        const controlCheckInterval = setInterval(() => {
            if (document.body.contains(video)) {
                ensureControls();
            } else {
                // Video is no longer in DOM, clear interval
                clearInterval(controlCheckInterval);
            }
        }, 2000);

        // Handle video errors
        video.addEventListener('error', (e) => {
            Logger.error(e, `Video error (code: ${video.error?.code}x)`);
        });
    }

    /**
     * Setup seekbar preview functionality
     * @param {HTMLVideoElement} video - The video element
     */
    setupSeekbarPreview(video) {
        try {
            // Create preview element
            const previewElement = document.createElement('div');
            previewElement.className = 'igvc-seekbar-preview';

            // Create preview video element
            const previewVideo = document.createElement('video');
            previewVideo.muted = true;
            previewVideo.src = video.src;
            previewVideo.style.width = '100%';
            previewVideo.style.height = '100%';

            previewElement.appendChild(previewVideo);
            video.parentNode.appendChild(previewElement);

            // Get the progress bar element (native controls)
            const progressListener = (e) => {
                const progressBar = video.querySelector('input[type="range"]') ||
                    video.shadowRoot?.querySelector('input[type="range"]');

                if (progressBar) {
                    // Mouse is over the seekbar
                    const rect = progressBar.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;

                    // Calculate preview position
                    if (percentage >= 0 && percentage <= 1) {
                        // Show preview
                        previewElement.style.display = 'block';
                        previewElement.style.left = `${rect.left + x}px`;

                        // Set time for preview
                        const previewTime = video.duration * percentage;
                        previewVideo.currentTime = previewTime;

                        // Pause preview to show the frame
                        previewVideo.pause();
                    }
                } else {
                    // Mouse not over seekbar, hide preview
                    previewElement.style.display = 'none';
                }
            };

            // Event listener with throttling
            let lastMove = 0;
            const throttledProgressListener = (e) => {
                const now = Date.now();
                if (now - lastMove > 50) { // Throttle to 50ms
                    lastMove = now;
                    progressListener(e);
                }
            };

            // Add event listeners to track mouse position
            video.addEventListener('mousemove', throttledProgressListener);
            video.addEventListener('mouseleave', () => {
                previewElement.style.display = 'none';
            });

        } catch (error) {
            Logger.error(error, "Setting up seekbar preview");
        }
    }
}

/**
 * Initialize the script
 */
function init() {
    try {
        Notification.useDefaultColors();
        let controller;

        // Single function to process videos when they're available
        const processVideosWhenReady = (source = "init") => {
            Logger.debug(`Waiting for videos (source: ${source})...`);

            HTMLUtils.waitForElement('video', 10000, document)
                .then(() => {
                    Logger.debug(`Video element detected (source: ${source})`);

                    // Create controller if it doesn't exist yet
                    if (!controller) {
                        controller = new InstagramVideoController();
                    } else {
                        controller.processVideos();
                    }
                })
                .catch(() => {
                    Logger.debug(`No video found after waiting period (source: ${source})`);
                    // Still initialize controller even if no videos found initially
                    if (!controller && source === "init") {
                        controller = new InstagramVideoController();
                    }
                });
        };

        // Handle initial page load
        processVideosWhenReady("init");

        Logger.debug("Instagram Video Controls initialized successfully");
    } catch (error) {
        Logger.error(error, "Script initialization");
    }
}


// Run the initialization
init();