// Sidebar panel component for housing the Wallapop tools

import {Logger} from "../../core";

/**
 * Sidebar panel component for displaying controls
 */
export class SidebarPanel {
    /**
     * Create a new sidebar panel
     * @param {Object} config - Configuration options
     */
    constructor(config) {
        this.id = config.id || 'sidebar-panel';
        this.title = config.title || 'Panel';
        this.position = config.position || 'right'; // 'left' or 'right'
        this.transition = config.transition || 'slide'; // 'slide' or 'fade'
        this.buttonIcon = config.buttonIcon || '⚙️';
        this.namespace = config.namespace || 'userscript';
        this.rememberState = config.rememberState !== false;

        // Content can be a string, HTMLElement, or a generator function
        this.content = config.content;

        // Style customization
        this.style = Object.assign({
            width: '300px',
            buttonBg: '#008080',
            buttonBgHover: '#006666',
            panelBg: '#ffffff',
        }, config.style || {});

        // Event callbacks
        this.onOpen = config.onOpen || null;
        this.onClose = config.onClose || null;

        // State
        this.isOpen = false;
        this.button = null;
        this.panel = null;

        // Create the panel
        this.createPanel();

        // Load saved state if enabled
        if (this.rememberState) {
            this.loadState();
        }
    }

    /**
     * Create the panel and button
     */
    createPanel() {
        // Create floating button
        this.button = document.createElement('button');
        this.button.id = `${this.id}-button`;
        this.button.className = `${this.namespace}-sidebar-button`;
        this.button.innerHTML = this.buttonIcon;
        this.button.setAttribute('aria-label', this.title);
        this.button.title = this.title;

        // Create panel container
        this.panel = document.createElement('div');
        this.panel.id = this.id;
        this.panel.className = `${this.namespace}-sidebar-panel`;

        // Create panel header
        const header = document.createElement('div');
        header.className = `${this.namespace}-sidebar-panel-header`;

        // Create panel title
        const titleElement = document.createElement('h3');
        titleElement.className = `${this.namespace}-sidebar-panel-title`;
        titleElement.textContent = this.title;
        this.titleElement = titleElement;

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = `${this.namespace}-sidebar-panel-close`;
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close');

        // Create panel content container
        const contentContainer = document.createElement('div');
        contentContainer.className = `${this.namespace}-sidebar-panel-content`;

        // Populate content
        if (typeof this.content === 'string') {
            contentContainer.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            contentContainer.appendChild(this.content);
        } else if (typeof this.content === 'object' && typeof this.content.generator === 'function') {
            contentContainer.appendChild(this.content.generator());
        }

        // Assemble panel
        header.appendChild(titleElement);
        header.appendChild(closeButton);
        this.panel.appendChild(header);
        this.panel.appendChild(contentContainer);

        // Add styles
        this.addStyles();

        // Add event listeners
        this.button.addEventListener('click', () => this.toggle());
        closeButton.addEventListener('click', () => this.close());

        // Add to document
        document.body.appendChild(this.button);
        document.body.appendChild(this.panel);

        // Handle click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen &&
                !this.panel.contains(e.target) &&
                e.target !== this.button) {
                this.close();
            }
        });

        Logger.debug(`SidebarPanel created: ${this.id}`);
    }

    /**
     * Add necessary styles for the panel
     */
    addStyles() {
        const styleElement = document.createElement('style');
        styleElement.id = `${this.id}-styles`;

        // Calculate position values
        const buttonPosition = this.position === 'right' ? 'right: 20px;' : 'left: 20px;';
        const panelPosition = this.position === 'right' ? 'right: 0;' : 'left: 0;';
        const panelTransform = this.position === 'right' ? 'transform: translateX(100%);' : 'transform: translateX(-100%);';

        styleElement.textContent = `
            /* Sidebar Button */
            .${this.namespace}-sidebar-button {
                position: fixed;
                ${buttonPosition}
                top: 50%;
                transform: translateY(-50%);
                z-index: 9998;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background-color: ${this.style.buttonBg};
                color: white;
                border: none;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: background-color 0.3s ease;
            }
            
            .${this.namespace}-sidebar-button:hover {
                background-color: ${this.style.buttonBgHover};
            }
            
            /* Sidebar Panel */
            .${this.namespace}-sidebar-panel {
                position: fixed;
                ${panelPosition}
                top: 0;
                width: ${this.style.width};
                height: 100vh;
                background-color: ${this.style.panelBg};
                z-index: 9999;
                box-shadow: ${this.position === 'right' ? '-2px 0 10px' : '2px 0 10px'} rgba(0,0,0,0.2);
                ${panelTransform}
                opacity: ${this.transition === 'fade' ? '0' : '1'};
                transition: transform 0.3s ease, opacity 0.3s ease;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
            }
            
            .${this.namespace}-sidebar-panel.open {
                transform: translateX(0);
                opacity: 1;
            }
            
            /* Panel Header */
            .${this.namespace}-sidebar-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background-color: var(--${this.namespace}-sidebar-panel-header-bg, #f0f8f8);
                border-bottom: 1px solid var(--${this.namespace}-sidebar-panel-border-color, #e5e7eb);
            }
            
            .${this.namespace}-sidebar-panel-title {
                margin: 0;
                font-size: 18px;
                color: var(--${this.namespace}-sidebar-panel-title-color, ${this.style.buttonBg});
            }
            
            .${this.namespace}-sidebar-panel-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .${this.namespace}-sidebar-panel-close:hover {
                color: #333;
            }
            
            /* Panel Content */
            .${this.namespace}-sidebar-panel-content {
                padding: 15px;
                overflow-y: auto;
                flex-grow: 1;
            }
        `;

        document.head.appendChild(styleElement);
    }

    /**
     * Toggle the panel open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open the panel
     */
    open() {
        this.panel.classList.add('open');
        this.isOpen = true;

        // Call onOpen callback if provided
        if (typeof this.onOpen === 'function') {
            try {
                this.onOpen();
            } catch (error) {
                Logger.error(error, "SidebarPanel onOpen callback");
            }
        }

        // Save state if enabled
        if (this.rememberState) {
            this.saveState();
        }

        Logger.debug(`SidebarPanel opened: ${this.id}`);
    }

    /**
     * Close the panel
     */
    close() {
        this.panel.classList.remove('open');
        this.isOpen = false;

        // Call onClose callback if provided
        if (typeof this.onClose === 'function') {
            try {
                this.onClose();
            } catch (error) {
                Logger.error(error, "SidebarPanel onClose callback");
            }
        }

        // Save state if enabled
        if (this.rememberState) {
            this.saveState();
        }

        Logger.debug(`SidebarPanel closed: ${this.id}`);
    }

    /**
     * Save panel state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(`${this.namespace}-${this.id}-state`, JSON.stringify({
                isOpen: this.isOpen
            }));
        } catch (error) {
            Logger.error(error, "Saving SidebarPanel state");
        }
    }

    /**
     * Load panel state from localStorage
     */
    loadState() {
        try {
            const savedState = localStorage.getItem(`${this.namespace}-${this.id}-state`);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.isOpen) {
                    this.open();
                }
            }
        } catch (error) {
            Logger.error(error, "Loading SidebarPanel state");
        }
    }

    /**
     * Update the panel title
     * @param {string} title - New title
     */
    setTitle(title) {
        this.title = title;
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
        this.button.title = title;
        this.button.setAttribute('aria-label', title);
    }

    /**
     * Remove the panel completely
     */
    destroy() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }

        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }

        const styleElement = document.getElementById(`${this.id}-styles`);
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }

        Logger.debug(`SidebarPanel destroyed: ${this.id}`);
    }
}