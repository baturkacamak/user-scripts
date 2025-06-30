/**
 * SidebarPanel - A reusable UI component for creating a sidebar panel with a trigger button
 * Similar to Wallapop's help button that shifts the site content
 */
import StyleManager from '../utils/StyleManager.js';
import {getValue, setValue} from '../utils/GMFunctions.js';
import PubSub from '../utils/PubSub.js';
import Logger from '../utils/Logger.js';
import HTMLUtils from '../utils/HTMLUtils.js';

/**
 * A reusable component that creates a toggle button and sidebar panel
 */
class SidebarPanel {
    // Panel states
    static PANEL_STATES = {
        OPENED: 'opened',
        CLOSED: 'closed'
    };

    // Panel positions
    static PANEL_POSITIONS = {
        RIGHT: 'right',
        LEFT: 'left'
    };

    // Panel transitions
    static PANEL_TRANSITIONS = {
        SLIDE: 'slide',
        PUSH: 'push'
    };

    // GM storage keys
    static STORAGE_KEYS = {
        PANEL_STATE: 'sidebar-panel-state',
        PANEL_SETTINGS: 'sidebar-panel-settings'
    };

    // PubSub events
    static EVENTS = {
        PANEL_OPEN: 'sidebar-panel-open',
        PANEL_CLOSE: 'sidebar-panel-close',
        PANEL_TOGGLE: 'sidebar-panel-toggle',
        PANEL_INITIALIZED: 'sidebar-panel-initialized'
    };

    /**
     * Create a new SidebarPanel.
     * @param {Object} options - Configuration options.
     * @param {String} options.title - Panel title.
     * @param {String} [options.id="sidebar-panel"] - Unique ID for the panel.
     * @param {String} [options.position="right"] - Position of the panel ("right" or "left").
     * @param {String} [options.transition="slide"] - Transition effect ("slide" or "push").
     * @param {String} [options.buttonIcon="?"] - HTML content for the toggle button.
     * @param {Boolean} [options.showButton=true] - Whether to show the toggle button.
     * @param {String} [options.namespace="userscripts"] - Namespace for CSS classes.
     * @param {Function} [options.onOpen=null] - Callback when panel opens.
     * @param {Function} [options.onClose=null] - Callback when panel closes.
     * @param {Boolean} [options.overlay=true] - Whether to show an overlay behind the panel.
     * @param {Object} [options.content={}] - Content configuration.
     * @param {String|HTMLElement} [options.content.html=null] - HTML content for the panel.
     * @param {Function} [options.content.generator=null] - Function that returns content.
     * @param {Boolean} [options.rememberState=true] - Whether to remember the panel state.
     * @param {Object} [options.style={}] - Custom style options.
     * @param {String} [options.style.width="320px"] - Panel width.
     * @param {String} [options.style.buttonSize="48px"] - Button size.
     * @param {String} [options.style.buttonColor="#fff"] - Button text color.
     * @param {String} [options.style.buttonBg="#625df5"] - Button background color.
     * @param {String} [options.style.panelBg="#fff"] - Panel background color.
     */
    constructor(options = {}) {
        // Process and store options with defaults
        this.options = {
            title: options.title || 'Panel',
            id: options.id || 'sidebar-panel',
            position: options.position || SidebarPanel.PANEL_POSITIONS.RIGHT,
            transition: options.transition || SidebarPanel.PANEL_TRANSITIONS.SLIDE,
            buttonIcon: options.buttonIcon || '?',
            showButton: options.showButton !== false,
            namespace: options.namespace || 'userscripts',
            onOpen: options.onOpen || null,
            onClose: options.onClose || null,
            overlay: options.overlay !== false,
            content: options.content || {},
            rememberState: options.rememberState !== false,
            style: options.style || {}
        };

        // Dark mode color defaults
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
            this.options.style = {
                buttonColor: '#fff',
                buttonBg: '#3b82f6',
                panelBg: '#2d2d2d',
                ...options.style // User-provided styles take precedence
            };
        } else {
            this.options.style = {
                buttonColor: '#fff',
                buttonBg: '#625df5',
                panelBg: '#fff',
                ...options.style
            };
        }

        // Setup base class names based on namespace
        this.baseClass = `${this.options.namespace}-sidebar-panel`;
        this.cssVarPrefix = `--${this.options.namespace}-sidebar-panel-`;

        // Elements references
        this.container = null;
        this.panel = null;
        this.button = null;
        this.closeButton = null;
        this.content = null;
        this.header = null;
        this.footer = null;
        this.overlay = null;

        // Panel state
        this.state = this.getSavedState() || SidebarPanel.PANEL_STATES.CLOSED;

        // Storage key for this specific panel instance
        this.storageKey = `${SidebarPanel.STORAGE_KEYS.PANEL_STATE}-${this.options.id}`;

        // Initialize the component
        this.init();
    }

    /**
     * Initialize the styles for the SidebarPanel
     * @param {String} namespace - Optional namespace to prevent CSS collisions
     */
    static initStyles(namespace = 'userscripts') {
        const baseClass = `${namespace}-sidebar-panel`;
        const cssVarPrefix = `--${namespace}-sidebar-panel-`;

        StyleManager.addStyles(`
            /* Base styles for the sidebar panel */
            .${baseClass}-container {
                position: fixed;
                top: 0;
                height: 100%;
                z-index: 9998;
                transition: transform 0.3s ease-in-out;
            }
            
            .${baseClass}-container--right {
                right: 0;
                transform: translateX(100%);
            }
            
            .${baseClass}-container--left {
                left: 0;
                transform: translateX(-100%);
            }
            
            .${baseClass}-container--opened {
                transform: translateX(0);
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
            }
            
            .${baseClass} {
                width: var(${cssVarPrefix}width, 320px);
                height: 100%;
                background-color: var(${cssVarPrefix}bg, #fff);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
            }
            
            .${baseClass}-header {
                padding: 16px;
                background-color: var(${cssVarPrefix}header-bg, #f5f5f5);
                border-bottom: 1px solid var(${cssVarPrefix}border-color, #eee);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .${baseClass}-title {
                font-weight: bold;
                font-size: 18px;
                color: var(${cssVarPrefix}title-color, #333);
                margin: 0;
            }
            
            .${baseClass}-close {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 24px;
                line-height: 24px;
                padding: 0;
                width: 24px;
                height: 24px;
                color: var(${cssVarPrefix}close-color, #777);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .${baseClass}-close:hover {
                color: var(${cssVarPrefix}close-color-hover, #333);
            }
            
            .${baseClass}-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            
            .${baseClass}-footer {
                padding: 16px;
                background-color: var(${cssVarPrefix}footer-bg, #f5f5f5);
                border-top: 1px solid var(${cssVarPrefix}border-color, #eee);
            }
            
            /* Toggle button styles */
            .${baseClass}-toggle {
                position: fixed;
                width: var(${cssVarPrefix}button-size, 48px);
                height: var(${cssVarPrefix}button-size, 48px);
                border-radius: 50%;
                background-color: var(${cssVarPrefix}button-bg, #625df5);
                color: var(${cssVarPrefix}button-color, #fff);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                border: none;
                outline: none;
                transition: background-color 0.2s ease, transform 0.2s ease;
            }
            
            .${baseClass}-toggle:hover {
                background-color: var(${cssVarPrefix}button-bg-hover, #514dc6);
                transform: scale(1.05);
            }
            
            .${baseClass}-toggle--right {
                right: 20px;
                bottom: 20px;
            }
            
            .${baseClass}-toggle--left {
                left: 20px;
                bottom: 20px;
            }
            
            /* For push transition effect */
            body.${baseClass}-push-active--right {
                transition: margin-left 0.3s ease-in-out;
            }
            
            body.${baseClass}-push-active--right.${baseClass}-push--opened {
                margin-left: calc(-1 * var(${cssVarPrefix}width, 320px));
            }
            
            body.${baseClass}-push-active--left {
                transition: margin-right 0.3s ease-in-out;
            }
            
            body.${baseClass}-push-active--left.${baseClass}-push--opened {
                margin-right: calc(-1 * var(${cssVarPrefix}width, 320px));
            }
            
            /* Overlay for slide transition */
            .${baseClass}-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9997;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
            }
            
            .${baseClass}-overlay--visible {
                opacity: 1;
                visibility: visible;
            }
            
            /* Responsive styles */
            @media (max-width: 768px) {
                .${baseClass} {
                    width: 85vw;
                }
            }

            .${baseClass}-footer-content {
                /* Add any specific footer content styling here */
            }

            @media (prefers-color-scheme: dark) {
                .${baseClass} {
                    background-color: var(${cssVarPrefix}bg, #2d2d2d);
                }

                .${baseClass}-header {
                    background-color: #3a3a3a;
                    border-bottom-color: #444;
                }

                .${baseClass}-title {
                    color: #e0e0e0;
                }

                .${baseClass}-close {
                    color: #aaa;
                }

                .${baseClass}-close:hover {
                    color: #fff;
                }

                .${baseClass}-footer {
                    background-color: #3a3a3a;
                    border-top-color: #444;
                }

                .${baseClass}-overlay {
                    background-color: rgba(0, 0, 0, 0.7);
                }
            }
        `, `sidebar-panel-styles-${namespace}`);
    }

    /**
     * Initialize the panel
     */
    async init() {
        // Ensure styles are initialized only once
        if (!document.head.dataset.sidebarPanelStylesInitialized) {
        SidebarPanel.initStyles(this.options.namespace);
            document.head.dataset.sidebarPanelStylesInitialized = 'true';
        }

        // Apply any custom styles from options
        this.applyCustomStyles();

        // Create UI elements
        await this.createPanel();
        if (this.options.showButton) {
            this.createToggleButton();
        }
        if (this.options.overlay && this.options.transition === 'slide') {
            this.createOverlay();
        }

        // Setup event listeners
        this.setupEvents();

        // Set initial state without animation
            if (this.state === SidebarPanel.PANEL_STATES.OPENED) {
            this.open(false);
        }

        // Publish initialized event
        PubSub.publish(SidebarPanel.EVENTS.PANEL_INITIALIZED, this);
        Logger.debug(`SidebarPanel initialized: ${this.options.id}`);
    }

    /**
     * Apply custom styles from options
     */
    applyCustomStyles() {
        const customStyles = {};

        // Process style options
        if (this.options.style.width) {
            customStyles[`${this.cssVarPrefix}width`] = this.options.style.width;
        }
        if (this.options.style.buttonSize) {
            customStyles[`${this.cssVarPrefix}button-size`] = this.options.style.buttonSize;
        }
        if (this.options.style.buttonColor) {
            customStyles[`${this.cssVarPrefix}button-color`] = this.options.style.buttonColor;
        }
        if (this.options.style.buttonBg) {
            customStyles[`${this.cssVarPrefix}button-bg`] = this.options.style.buttonBg;
        }
        if (this.options.style.buttonBgHover) {
            customStyles[`${this.cssVarPrefix}button-bg-hover`] = this.options.style.buttonBgHover;
        }
        if (this.options.style.panelBg) {
            customStyles[`${this.cssVarPrefix}bg`] = this.options.style.panelBg;
        }

        // Apply the CSS variables using StyleManager
        if (Object.keys(customStyles).length > 0) {
            const styleId = `${this.baseClass}-custom-${this.options.id}`;
            let cssText = `:root {\n`;

            for (const [key, value] of Object.entries(customStyles)) {
                cssText += `  ${key}: ${value};\n`;
            }

            cssText += `}\n`;
            StyleManager.addStyles(cssText, styleId);
        }
    }

    /**
     * Creates and configures the main panel element
     */
    async createPanel() {
        this.container = document.createElement('div');
        this.container.id = this.options.id;
        this.container.className = `${this.baseClass}-container ${this.baseClass}-container--${this.options.position}`;

        this.panel = document.createElement('div');
        this.panel.className = this.baseClass;

        // Create header with title and close button
        this.header = document.createElement('div');
        this.header.className = `${this.baseClass}-header`;

        const titleElement = document.createElement('h2');
        titleElement.className = `${this.baseClass}-title`;
        titleElement.textContent = this.options.title;

        this.closeButton = document.createElement('button');
        this.closeButton.className = `${this.baseClass}-close`;
        HTMLUtils.setHTMLSafely(this.closeButton, '×');
        this.closeButton.setAttribute('aria-label', 'Close panel');

        this.header.appendChild(titleElement);
        this.header.appendChild(this.closeButton);

        // Create content area
        this.content = document.createElement('div');
        this.content.className = `${this.baseClass}-content`;

        // Populate content
        await this.setContent(this.options.content);

        // Create footer if provided
        if (this.options.content.footer) {
            this.footer = document.createElement('div');
            this.footer.className = `${this.baseClass}-footer`;
            HTMLUtils.setHTMLSafely(this.footer, this.options.content.footer);
        }

        // Assemble panel
        this.panel.appendChild(this.header);
        this.panel.appendChild(this.content);
        if (this.footer) {
            this.panel.appendChild(this.footer);
        }

        this.container.appendChild(this.panel);

        // Add panel to the DOM
        document.body.appendChild(this.container);
        Logger.debug('Panel created and added to DOM');
    }

    /**
     * Create toggle button
     */
    createToggleButton() {
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = `${this.baseClass}-toggle ${this.baseClass}-toggle--${this.options.position}`;
        HTMLUtils.setHTMLSafely(this.button, this.options.buttonIcon);
        this.button.setAttribute('aria-label', `Open ${this.options.title}`);

        // Add to document
        document.body.appendChild(this.button);
    }

    /**
     * Create overlay element
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = `${this.baseClass}-overlay`;
        document.body.appendChild(this.overlay);
    }

    /**
     * Set up event listeners
     */
    setupEvents() {
        // Toggle button click
        if (this.button) {
            this.button.addEventListener('click', () => this.toggle());
        }

        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }

        // Overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }

        // Listen for PubSub events
        this.subscriptions = [
            PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_OPEN}-${this.options.id}`, () => this.open()),
            PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_CLOSE}-${this.options.id}`, () => this.close()),
            PubSub.subscribe(`${SidebarPanel.EVENTS.PANEL_TOGGLE}-${this.options.id}`, () => this.toggle())
        ];

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state === SidebarPanel.PANEL_STATES.OPENED) {
                this.close();
            }
        });
    }

    /**
     * Toggle panel state
     */
    toggle() {
        if (this.state === SidebarPanel.PANEL_STATES.CLOSED) {
            this.open();
        } else {
            this.close();
        }
    }

    /**
     * Open the panel
     * @param {Boolean} animate - Whether to animate the opening
     */
    open(animate = true) {
        if (this.state === SidebarPanel.PANEL_STATES.OPENED) return;

        this.state = SidebarPanel.PANEL_STATES.OPENED;

        // Update panel class
        if (!animate) {
            this.container.style.transition = 'none';
            requestAnimationFrame(() => {
                this.container.style.transition = '';
            });
        }

        this.container.classList.add(`${this.baseClass}-container--opened`);

        // Handle push transition
        if (this.options.transition === SidebarPanel.PANEL_TRANSITIONS.PUSH) {
            document.body.classList.add(`${this.baseClass}-push-active--${this.options.position}`);
            document.body.classList.add(`${this.baseClass}-push--opened`);
        }

        // Show overlay
        if (this.overlay) {
            this.overlay.classList.add(`${this.baseClass}-overlay--visible`);
        }

        // Save state
        if (this.options.rememberState) {
            this.saveState();
        }

        // Call onOpen callback if provided
        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen();
        }

        // Publish event
        PubSub.publish(SidebarPanel.EVENTS.PANEL_OPEN, {
            id: this.options.id,
            panel: this
        });

        Logger.debug(`SidebarPanel opened: ${this.options.id}`);
    }

    /**
     * Close the panel
     */
    close() {
        if (this.state === SidebarPanel.PANEL_STATES.CLOSED) return;

        this.state = SidebarPanel.PANEL_STATES.CLOSED;

        // Update panel class
        this.container.classList.remove(`${this.baseClass}-container--opened`);

        // Handle push transition
        if (this.options.transition === SidebarPanel.PANEL_TRANSITIONS.PUSH) {
            document.body.classList.remove(`${this.baseClass}-push--opened`);
            // We keep the active class for transition
            setTimeout(() => {
                if (this.state === SidebarPanel.PANEL_STATES.CLOSED) {
                    document.body.classList.remove(`${this.baseClass}-push-active--${this.options.position}`);
                }
            }, 300); // Match transition duration
        }

        // Hide overlay
        if (this.overlay) {
            this.overlay.classList.remove(`${this.baseClass}-overlay--visible`);
        }

        // Save state
        if (this.options.rememberState) {
            this.saveState();
        }

        // Call onClose callback if provided
        if (typeof this.options.onClose === 'function') {
            this.options.onClose();
        }

        // Publish event
        PubSub.publish(SidebarPanel.EVENTS.PANEL_CLOSE, {
            id: this.options.id,
            panel: this
        });

        Logger.debug(`SidebarPanel closed: ${this.options.id}`);
    }

    /**
     * Get saved panel state from GM storage
     * @return {String|null} Panel state or null if not found
     */
    async getSavedState() {
        if (!this.options.rememberState) return null;

        try {
            // Use directly imported getValue
            const savedState = await getValue(this.storageKey, SidebarPanel.PANEL_STATES.CLOSED);
            // Validate state
            if (Object.values(SidebarPanel.PANEL_STATES).includes(savedState)) {
                Logger.debug('Retrieved saved panel state:', savedState, 'for key:', this.storageKey);
                return savedState;
            }
            Logger.warn('Invalid saved panel state retrieved:', savedState, 'for key:', this.storageKey);
        } catch (error) {
            Logger.error('Error retrieving saved panel state:', error, 'for key:', this.storageKey);
        }
        return SidebarPanel.PANEL_STATES.CLOSED; // Default to closed on error or invalid
    }

    /**
     * Save the current panel state (opened/closed) if rememberState is enabled.
     */
    async saveState() {
        if (!this.options.rememberState) return;

        try {
            // Use directly imported setValue
            await setValue(this.storageKey, this.state);
            Logger.debug('Saved panel state:', this.state, 'for key:', this.storageKey);
        } catch (error) {
            Logger.error('Error saving panel state:', error, 'for key:', this.storageKey);
        }
    }

    /**
     * @param {Object} contentConfig - Content configuration object
     */
    async setContent(contentConfig) {
        if (!this.content) return;
        this.content.innerHTML = ''; // Clearing content is fine

        if (contentConfig.html) {
            if (typeof contentConfig.html === 'string') {
                HTMLUtils.setHTMLSafely(this.content, contentConfig.html);
            } else if (contentConfig.html instanceof HTMLElement) {
                this.content.appendChild(contentConfig.html);
            }
        } else if (typeof contentConfig.generator === 'function') {
            const generatedContent = await contentConfig.generator();
            if (typeof generatedContent === 'string') {
                HTMLUtils.setHTMLSafely(this.content, generatedContent);
            } else if (generatedContent instanceof HTMLElement) {
                this.content.appendChild(generatedContent);
            }
        }
        Logger.debug('Panel content updated');
    }

    /**
     * Set panel title
     * @param {String} title - New title text
     */
    setTitle(title) {
        const titleElement = this.header ? this.header.querySelector(`.${this.baseClass}-title`) : null;
        if (titleElement) {
            titleElement.textContent = title;
            this.options.title = title;
        }
    }

    /**
     * Set button icon
     * @param {String} iconHtml - Text content for icon (no HTML allowed for CSP compliance)
     */
    setButtonIcon(iconHtml) {
        if (this.button) {
            HTMLUtils.setHTMLSafely(this.button, iconHtml);
            this.options.buttonIcon = iconHtml;
        }
    }

    /**
     * Destroy the panel and clean up
     */
    destroy() {
        // Remove DOM elements
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }

        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        // Remove body classes
        document.body.classList.remove(`${this.baseClass}-push-active--${this.options.position}`);
        document.body.classList.remove(`${this.baseClass}-push--opened`);

        // Unsubscribe from PubSub events
        if (this.subscriptions) {
            this.subscriptions.forEach(subscriptionId => {
                PubSub.unsubscribe(subscriptionId);
            });
        }

        Logger.debug(`SidebarPanel destroyed: ${this.options.id}`);
    }
}

export default SidebarPanel;