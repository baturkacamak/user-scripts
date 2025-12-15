/**
 * Tabs - A reusable UI component for tabbed interfaces.
 * Creates accessible, customizable tabs with content panels.
 */
import StyleManager from '../utils/StyleManager.js';
import HTMLUtils from '../utils/HTMLUtils.js';
import Logger from '../utils/Logger.js';

/**
 * A reusable UI component for creating accessible, customizable tabs.
 */
class Tabs {
  /**
   * Returns the unique base CSS class for the Tabs component.
   * @return {string} The base CSS class name for tabs.
   */
  static get BASE_TABS_CLASS() {
    return 'userscripts-tabs';
  }

  /**
   * Returns the CSS variable prefix used for theming the Tabs component.
   * @return {string} The CSS variable prefix.
   */
  static get CSS_VAR_PREFIX() {
    return '--userscripts-tabs-';
  }

  /**
   * Initialize styles for all tabs.
   */
  static initStyles() {
    if (Tabs.stylesInitialized) return;
    StyleManager.addStyles(`
      /* Scoped styles for Userscripts Tabs Component */
      .${Tabs.BASE_TABS_CLASS} {
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .${Tabs.BASE_TABS_CLASS}__header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        border-bottom: 2px solid var(${Tabs.CSS_VAR_PREFIX}border-color, #e5e7eb);
        background-color: var(${Tabs.CSS_VAR_PREFIX}header-bg, #f9fafb);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        min-height: 2.75rem;
      }
      
      .${Tabs.BASE_TABS_CLASS}__tab {
        flex: 1 1 auto;
        min-width: fit-content;
        padding: 0.75rem 1rem;
        background-color: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(${Tabs.CSS_VAR_PREFIX}tab-color, #6b7280);
        transition: all 0.2s ease-in-out;
        white-space: nowrap;
        user-select: none;
        position: relative;
        margin-bottom: -2px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        max-width: fit-content;
      }
      
      .${Tabs.BASE_TABS_CLASS}__tab:hover:not(.${Tabs.BASE_TABS_CLASS}__tab--active) {
        color: var(${Tabs.CSS_VAR_PREFIX}tab-hover-color, #374151);
        background-color: var(${Tabs.CSS_VAR_PREFIX}tab-hover-bg, #f3f4f6);
      }
      
      .${Tabs.BASE_TABS_CLASS}__tab--active {
        color: var(${Tabs.CSS_VAR_PREFIX}tab-active-color, #2563eb);
        border-bottom-color: var(${Tabs.CSS_VAR_PREFIX}tab-active-border, #2563eb);
        background-color: var(${Tabs.CSS_VAR_PREFIX}tab-active-bg, #ffffff);
        font-weight: 600;
      }
      
      .${Tabs.BASE_TABS_CLASS}__tab:focus {
        outline: 2px solid var(${Tabs.CSS_VAR_PREFIX}tab-focus-color, #2563eb);
        outline-offset: -2px;
      }
      
      .${Tabs.BASE_TABS_CLASS}__content {
        display: none;
        padding: 1rem 0;
        animation: fadeIn 0.2s ease-in-out;
      }
      
      .${Tabs.BASE_TABS_CLASS}__content--active {
        display: block;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `, 'userscripts-tabs-styles');
    Tabs.stylesInitialized = true;
  }

  /**
   * Use default color scheme
   */
  static useDefaultColors() {
    StyleManager.addStyles(`
      .${Tabs.BASE_TABS_CLASS} {
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-border-color: #e5e7eb;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-header-bg: #f9fafb;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-color: #6b7280;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-hover-color: #374151;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-hover-bg: #f3f4f6;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-active-color: #2563eb;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-active-border: #2563eb;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-active-bg: #ffffff;
        --${Tabs.BASE_TABS_CLASS.replace('userscripts-', '')}-tab-focus-color: #2563eb;
      }
    `, 'userscripts-tabs-default-colors');
  }

  /**
   * Create a new Tabs instance.
   * @param {Object} options - Configuration options.
   * @param {Array<Object>} options.tabs - Array of tab configurations.
   * @param {string} options.tabs[].id - Unique ID for the tab.
   * @param {string} options.tabs[].label - Label text for the tab button.
   * @param {HTMLElement|Function} options.tabs[].content - Content element or function that returns content.
   * @param {string} [options.defaultTab] - ID of the default active tab.
   * @param {Function} [options.onTabChange] - Callback when tab changes (receives tabId).
   * @param {HTMLElement} [options.container] - Container element to append tabs to.
   * @param {string} [options.className] - Additional CSS class name.
   */
  constructor(options = {}) {
    this.tabs = options.tabs || [];
    this.defaultTab = options.defaultTab || (this.tabs.length > 0 ? this.tabs[0].id : null);
    this.onTabChange = options.onTabChange || null;
    this.container = options.container || null;
    this.className = options.className || '';
    
    this.activeTabId = this.defaultTab;
    this.tabElements = new Map();
    this.contentElements = new Map();
    
    // Initialize styles if not already done
    Tabs.initStyles();
    
    // Create the tabs structure
    this.element = this.create();
    
    // Append to container if provided
    if (this.container) {
      this.container.appendChild(this.element);
    }
    
    // Activate default tab
    if (this.defaultTab) {
      this.switchToTab(this.defaultTab);
    }
  }

  /**
   * Create the tabs DOM structure.
   * @return {HTMLElement} The tabs container element.
   */
  create() {
    const container = document.createElement('div');
    container.className = `${Tabs.BASE_TABS_CLASS} ${this.className}`.trim();
    
    // Create header with tab buttons
    const header = document.createElement('div');
    header.className = `${Tabs.BASE_TABS_CLASS}__header`;
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = `${Tabs.BASE_TABS_CLASS}__content-container`;
    
    // Create tabs and content panels
    this.tabs.forEach((tabConfig, index) => {
      // Create tab button
      const tabButton = document.createElement('button');
      tabButton.className = `${Tabs.BASE_TABS_CLASS}__tab`;
      tabButton.setAttribute('role', 'tab');
      tabButton.setAttribute('aria-selected', 'false');
      tabButton.setAttribute('aria-controls', `tab-panel-${tabConfig.id}`);
      tabButton.setAttribute('id', `tab-button-${tabConfig.id}`);
      tabButton.textContent = tabConfig.label;
      
      tabButton.addEventListener('click', () => {
        this.switchToTab(tabConfig.id);
      });
      
      // Create content panel
      const contentPanel = document.createElement('div');
      contentPanel.className = `${Tabs.BASE_TABS_CLASS}__content`;
      contentPanel.setAttribute('role', 'tabpanel');
      contentPanel.setAttribute('aria-labelledby', `tab-button-${tabConfig.id}`);
      contentPanel.setAttribute('id', `tab-panel-${tabConfig.id}`);
      
      // Set content
      if (typeof tabConfig.content === 'function') {
        const content = tabConfig.content();
        if (content instanceof HTMLElement) {
          contentPanel.appendChild(content);
        } else if (typeof content === 'string') {
          HTMLUtils.setHTMLSafely(contentPanel, content);
        }
      } else if (tabConfig.content instanceof HTMLElement) {
        contentPanel.appendChild(tabConfig.content);
      } else if (typeof tabConfig.content === 'string') {
        HTMLUtils.setHTMLSafely(contentPanel, tabConfig.content);
      }
      
      header.appendChild(tabButton);
      contentContainer.appendChild(contentPanel);
      
      // Store references
      this.tabElements.set(tabConfig.id, tabButton);
      this.contentElements.set(tabConfig.id, contentPanel);
    });
    
    container.appendChild(header);
    container.appendChild(contentContainer);
    
    return container;
  }

  /**
   * Switch to a specific tab.
   * @param {string} tabId - ID of the tab to activate.
   */
  switchToTab(tabId) {
    if (!this.tabElements.has(tabId) || !this.contentElements.has(tabId)) {
      Logger.warn(`Tab with ID "${tabId}" not found`);
      return;
    }
    
    // Deactivate all tabs
    this.tabElements.forEach((button, id) => {
      button.classList.remove(`${Tabs.BASE_TABS_CLASS}__tab--active`);
      button.setAttribute('aria-selected', 'false');
    });
    
    this.contentElements.forEach((panel, id) => {
      panel.classList.remove(`${Tabs.BASE_TABS_CLASS}__content--active`);
    });
    
    // Activate selected tab
    const activeButton = this.tabElements.get(tabId);
    const activePanel = this.contentElements.get(tabId);
    
    if (activeButton && activePanel) {
      activeButton.classList.add(`${Tabs.BASE_TABS_CLASS}__tab--active`);
      activeButton.setAttribute('aria-selected', 'true');
      activePanel.classList.add(`${Tabs.BASE_TABS_CLASS}__content--active`);
      
      this.activeTabId = tabId;
      
      // Call callback if provided
      if (this.onTabChange) {
        this.onTabChange(tabId);
      }
    }
  }

  /**
   * Get the currently active tab ID.
   * @return {string} The active tab ID.
   */
  getActiveTab() {
    return this.activeTabId;
  }

  /**
   * Get the tabs container element.
   * @return {HTMLElement} The tabs container.
   */
  getElement() {
    return this.element;
  }

  /**
   * Update tab content.
   * @param {string} tabId - ID of the tab to update.
   * @param {HTMLElement|string|Function} content - New content.
   */
  updateTabContent(tabId, content) {
    const panel = this.contentElements.get(tabId);
    if (!panel) {
      Logger.warn(`Tab panel with ID "${tabId}" not found`);
      return;
    }
    
    // Clear existing content
    panel.innerHTML = '';
    
    // Set new content
    if (typeof content === 'function') {
      const newContent = content();
      if (newContent instanceof HTMLElement) {
        panel.appendChild(newContent);
      } else if (typeof newContent === 'string') {
        HTMLUtils.setHTMLSafely(panel, newContent);
      }
    } else if (content instanceof HTMLElement) {
      panel.appendChild(content);
    } else if (typeof content === 'string') {
      HTMLUtils.setHTMLSafely(panel, content);
    }
  }

  /**
   * Destroy the tabs component and clean up.
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.tabElements.clear();
    this.contentElements.clear();
  }
}

export default Tabs;



