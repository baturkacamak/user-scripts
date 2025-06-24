// GM function fallbacks for direct browser execution
import {
    Button,
    GMFunctions,
    HTMLUtils,
    Logger,
    ProgressBar,
    SelectBox,
    Slider,
    StyleManager,
    TranslationManager,
    Checkbox,
    SectionToggler,
    SidebarPanel,
} from "../../common/core";
import {translations} from "./src/i18n/translations.js";
import {addStyles} from "./src/ui/styles.js";

const SELECTORS = {
    ITEM_CARDS: [
        'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
        '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
        '[class^="feed_Feed__item__"] a[href^="/item/"]',
    ],
    ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
    EXPAND_BUTTON: '.expand-button',
    // New consolidated control panel selectors
    CONTROL_PANEL: '.control-panel',
    FILTER_INPUT: '.filter-input',
    FILTER_APPLY: '.filter-apply',
    BLOCKED_TERMS_LIST: '.blocked-terms-list'
};

// Find the CSS styles section in the script
addStyles();

Logger.setPrefix("Wallapop Enhanced Tools");


TranslationManager.init({
    languages: {
        en: 'English',
        es: 'Español',
        ca: 'Català',
        tr: 'Türkçe',
        pt: 'Português',
        it: 'Italiano',
        fr: 'Français',
        de: 'Deutsch',
        nl: 'Nederlands'
    },
    translations: translations, // Use imported translations
    defaultLanguage: 'en',
    storageKey: 'wallapop-language'
});

class DescriptionFetcher {
    static async getDescription(url) {
        Logger.debug("Fetching description for URL:", url);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => this.handleResponse(response, resolve, url),
                onerror: (error) => this.handleError(error, resolve)
            });
        });
    }

    static handleResponse(response, resolve, originalUrl) {
        try {
            // Parse the received response
            Logger.debug("Response received with status:", response.status);

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // Find the __NEXT_DATA__ script tag
            const nextDataScript = doc.querySelector('#__NEXT_DATA__');

            if (nextDataScript) {
                Logger.debug("Found __NEXT_DATA__ script tag");

                try {
                    // Parse the JSON content
                    const jsonData = JSON.parse(nextDataScript.textContent);
                    Logger.debug("JSON data parsed successfully");

                    // Extract the item description and title
                    let itemData = {};
                    if (jsonData.props?.pageProps?.item) {
                        const item = jsonData.props.pageProps.item;

                        // Get title
                        itemData.title = item.title?.original.trim() || "";

                        // Get description
                        if (item.description?.original) {
                            const description = item.description.original;
                            Logger.debug("Description extracted from JSON:", description);

                            // Get the part before tag indicators like "No leer"
                            const cleanDescription = this.cleanDescription(description);
                            itemData.description = cleanDescription;

                            // Get the URL
                            itemData.url = originalUrl;

                            // Get price if available
                            itemData.price = item.price ? `${item.price.cash.amount} ${item.price.cash.currency}` : "";

                            resolve({success: true, data: itemData});
                        } else {
                            Logger.debug("Description not found in JSON structure:", jsonData);
                            throw new Error("Description not found in JSON data");
                        }
                    } else {
                        Logger.debug("Item data not found in JSON structure:", jsonData);
                        throw new Error("Item not found in JSON data");
                    }
                } catch (jsonError) {
                    Logger.error(jsonError, "Parsing JSON data");
                    throw jsonError;
                }
            } else {
                Logger.debug("__NEXT_DATA__ script tag not found, trying old method");

                // Fall back to old method (for compatibility)
                const descriptionElement = doc.querySelector(SELECTORS.ITEM_DESCRIPTION);
                if (descriptionElement) {
                    const description = descriptionElement.querySelector(".mt-2")?.innerHTML.trim();
                    if (description) {
                        Logger.debug("Description found using old method");

                        // In old method, we can't get the title easily, so we'll use the URL
                        const itemData = {
                            title: doc.querySelector('title')?.textContent || originalUrl,
                            description: description,
                            url: originalUrl,
                            price: doc.querySelector('[class*="ItemDetail__price"]')?.textContent || ""
                        };

                        resolve({success: true, data: itemData});
                        return;
                    }
                }

                throw new Error("Description not found with any method");
            }
        } catch (error) {
            Logger.error(error, "Parsing response");
            resolve({success: false, error: "Failed to parse description: " + error.message});
        }
    }

    // Method to clean tags from the description
    // Improved version of cleanDescription in DescriptionFetcher class
    static cleanDescription(description) {
        // Look for tag indicators with various formats
        const tagMarkers = [
            "\n\n\n\n\n\n\nNo leer\n",
            "\n\n\n\n\nNo leer\n",
            "\nNo leer\n",
            "\n\nNo leer\n",
            "No leer",
            "tags:",
            "etiquetas:",
            "keywords:",
            "\ntags:",
            "\nTags:",
            "\nTAGS:",
            "\nEtiquetas:",
            "\nKeywords:",
            " tags:",
            " Tags:",
            " TAGS:"
        ];

        // Check each marker and split at the first one found
        let cleanDesc = description;

        for (const marker of tagMarkers) {
            if (description.includes(marker)) {
                Logger.debug(`Found tag marker: "${marker}"`);
                cleanDesc = description.split(marker)[0].trim();
                break;
            }
        }

        // Use regex for more generic detection (case insensitive)
        if (cleanDesc === description) {
            // If no markers were found using the previous method
            const tagRegex = /\n+\s*(?:tags?|etiquetas?|keywords?)[\s:]+/i;
            const match = description.match(tagRegex);
            if (match) {
                Logger.debug(`Found tag section using regex at position: ${match.index}`);
                cleanDesc = description.substring(0, match.index).trim();
            }
        }

        // Clean excessive empty lines (reduce more than 3 newlines to 2)
        cleanDesc = cleanDesc.replace(/\n{3,}/g, "\n\n");

        return cleanDesc;
    }

    static handleError(error, resolve) {
        Logger.error(error, "XML HTTP Request");
        resolve({success: false, error: "Network error occurred"});
    }
}

// Storage for expanded descriptions - global manager
class DescriptionManager {
    static expandedItems = [];

    static addItem(itemData) {
        // Check if the item already exists by URL
        const existingIndex = this.expandedItems.findIndex(item => item.url === itemData.url);
        if (existingIndex >= 0) {
            // Update existing item
            this.expandedItems[existingIndex] = itemData;
        } else {
            // Add new item
            this.expandedItems.push(itemData);
        }
        Logger.debug("Item added to description manager:", itemData.title);
        Logger.debug("Total items:", this.expandedItems.length);

        // Update control panel visibility
        ControlPanel.updatePanelVisibility();
    }

    static removeItem(url) {
        const index = this.expandedItems.findIndex(item => item.url === url);
        if (index >= 0) {
            this.expandedItems.splice(index, 1);
            Logger.debug("Item removed from description manager:", url);
            Logger.debug("Total items:", this.expandedItems.length);

            // Update control panel visibility
            ControlPanel.updatePanelVisibility();
        }
    }

    static clearItems() {
        this.expandedItems = [];
        Logger.debug("All items cleared from description manager");
        ControlPanel.updatePanelVisibility();
    }

    static getItemsAsJson() {
        return JSON.stringify(this.expandedItems, null, 2);
    }

    static getItemsAsCsv(includeHeaders = true) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        // Define headers
        const headers = ["Title", "Description", "Price", "URL"];

        // Create CSV rows
        let csvContent = includeHeaders ? headers.join(",") + "\n" : "";

        this.expandedItems.forEach(item => {
            // Properly escape CSV fields
            const escapeCsvField = (field) => {
                field = String(field || "");
                // If field contains comma, newline or double quote, enclose in double quotes
                if (field.includes(",") || field.includes("\n") || field.includes("\"")) {
                    // Replace double quotes with two double quotes
                    field = field.replace(/"/g, "\"\"");
                    return `"${field}"`;
                }
                return field;
            };

            const row = [
                escapeCsvField(item.title),
                escapeCsvField(item.description),
                escapeCsvField(item.price),
                escapeCsvField(item.url)
            ];

            csvContent += row.join(",") + "\n";
        });

        return csvContent;
    }
}

class ExpandButton {
    constructor(anchorElement, url) {
        this.anchorElement = anchorElement;
        this.url = url;
        this.button = null;
        this.descriptionContent = null;
        this.expanded = false;
        this.itemData = null;
        this.createButton();
    }

    createButton() {
        Logger.debug("Creating expand button for URL:", this.url);
        this.button = document.createElement('button');
        this.button.textContent = TranslationManager.getText('expandDescription');
        this.button.className = SELECTORS.EXPAND_BUTTON.slice(1); // Remove the leading dot

        this.descriptionContent = document.createElement('div');
        this.descriptionContent.className = 'description-content';

        this.button.addEventListener('click', this.handleClick.bind(this));

        const container = document.createElement('div');
        container.appendChild(this.button);
        container.appendChild(this.descriptionContent);

        this.anchorElement.appendChild(container);
        Logger.debug("Expand button added for URL:", this.url);
    }

    async handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        Logger.debug("Expand button clicked for URL:", this.url);
        try {
            if (!this.expanded) {
                await this.expandDescription();
            } else {
                this.hideDescription();
            }
        } catch (error) {
            Logger.error(error, "Button click handler");
            this.showError("An unexpected error occurred");
        }
    }

    async expandDescription() {
        this.button.textContent = TranslationManager.getText('loading');
        const result = await DescriptionFetcher.getDescription(this.url);
        if (result.success) {
            this.itemData = result.data;
            this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data.description);
            // Use the class toggle approach for smooth transition
            this.descriptionContent.classList.add('expanded');
            this.button.textContent = TranslationManager.getText('hideDescription');
            this.expanded = true;

            // Add to global description manager
            DescriptionManager.addItem(this.itemData);

            Logger.debug("Description expanded for URL:", this.url);
        } else {
            this.showError(result.error);
        }
    }

    hideDescription() {
        // Remove expanded class for smooth transition
        this.descriptionContent.classList.remove('expanded');

        // Use transition end event to clean up
        const transitionEnded = () => {
            if (!this.expanded) {
                // Do any additional cleanup here if needed
            }
            this.descriptionContent.removeEventListener('transitionend', transitionEnded);
        };
        this.descriptionContent.addEventListener('transitionend', transitionEnded);

        this.button.textContent = TranslationManager.getText('expandDescription');
        this.expanded = false;

        // Remove from global description manager
        if (this.itemData) {
            DescriptionManager.removeItem(this.url);
        }

        Logger.debug("Description hidden for URL:", this.url);
    }

    showError(message) {
        if (message.startsWith('Failed to parse description:')) {
            message = TranslationManager.getText('failedToParse') + message.substring('Failed to parse description:'.length);
        } else if (message === 'An unexpected error occurred') {
            message = TranslationManager.getText('errorOccurred');
        }
        this.descriptionContent.innerHTML = `<span class="error-message">${message}</span>`;
        this.descriptionContent.classList.add('expanded');
        this.button.textContent = TranslationManager.getText('expandDescription');
        this.expanded = false;
        Logger.debug("Error displaying description for URL:", this.url, message);
    }
}

class ListingManager {
    static addExpandButtonsToListings() {
        Logger.debug("Adding expand buttons to listings");
        let totalListings = 0;

        SELECTORS.ITEM_CARDS.forEach(selector => {
            const listings = document.querySelectorAll(selector);
            totalListings += listings.length;
            Logger.debug(`Found ${listings.length} items for selector: ${selector}`);

            listings.forEach(listing => {
                try {
                    let href = listing.getAttribute('href') || listing.querySelector('a')?.getAttribute('href');

                    // Make sure href is a full URL
                    if (href && !href.startsWith('http')) {
                        if (href.startsWith('/')) {
                            href = `https://es.wallapop.com${href}`;
                        } else {
                            href = `https://es.wallapop.com/${href}`;
                        }
                    }

                    if (href && !listing.querySelector(SELECTORS.EXPAND_BUTTON)) {
                        new ExpandButton(listing, href);
                    } else if (!href) {
                        Logger.debug("No valid href found for a listing");
                    }
                } catch (error) {
                    Logger.error(error, "Processing individual listing");
                }
            });
        });

        Logger.debug("Total listings processed:", totalListings);
    }
}

class DOMObserver {
    constructor() {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.lastUrl = location.href;
    }

    observe() {
        this.observer.observe(document.body, {childList: true, subtree: true});
        window.addEventListener('popstate', this.handleUrlChange.bind(this));
        Logger.debug("MutationObserver and popstate listener set up");
    }

    handleMutations(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasNewItemCards = addedNodes.some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    SELECTORS.ITEM_CARDS.some(selector =>
                        node.matches(selector) || node.querySelector(selector)
                    )
                );
                if (hasNewItemCards) {
                    Logger.debug("New ItemCards detected, adding expand buttons");
                    ListingManager.addExpandButtonsToListings();

                    // Apply all filters to new listings
                    ControlPanel.applyFilters();
                }
            }
        }
        this.checkUrlChange();
    }

    handleUrlChange() {
        Logger.debug("Handling URL change");
        setTimeout(() => {
            ListingManager.addExpandButtonsToListings();
            // Apply all filters after URL change, including reserved filter
            ControlPanel.applyFilters();
        }, 1000); // Delay to allow for dynamic content to load
    }

    checkUrlChange() {
        if (this.lastUrl !== location.href) {
            Logger.debug("URL changed:", location.href);
            this.lastUrl = location.href;
            this.handleUrlChange();
        }
    }
}

/**
 * FormatOption - A reusable component for format selection with conditional options
 */
class FormatOption {
    constructor(config) {
        this.id = config.id;
        this.label = config.label;
        this.description = config.description;
        this.category = config.category;
        this.options = config.options || [];
        this.element = null;
        this.optionsContainer = null;
        this.optionValues = {};

        // Initialize default values for options
        this.options.forEach(option => {
            this.optionValues[option.id] = option.defaultValue || false;
        });
    }

    /**
     * Create the DOM element for this format option
     * @param {Function} onSelect - Callback when this option is selected
     * @returns {HTMLElement} The created element
     */
    createElement(onSelect) {
        // Create main format item
        this.element = document.createElement('li');
        this.element.className = 'format-item';
        this.element.dataset.formatId = this.id;
        this.element.dataset.category = this.category;

        const formatLabel = document.createElement('div');
        formatLabel.className = 'format-label';
        formatLabel.textContent = this.label;
        formatLabel.title = this.description;

        this.element.appendChild(formatLabel);

        // Handle format selection
        formatLabel.addEventListener('click', (e) => {
            if (onSelect) {
                onSelect(this);
            }
            e.stopPropagation();
        });

        // Create options container if this format has options
        if (this.options.length > 0) {
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'format-options hidden';

            // Create each option checkbox
            this.options.forEach(option => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';

                // Create checkbox using the Checkbox component
                new Checkbox({
                    id: `option-${this.id}-${option.id}`,
                    label: option.label,
                    checked: option.defaultValue || false,
                    container: optionRow,
                    size: 'small',
                    attributes: {
                        title: option.description || ''
                    },
                    onChange: (e) => {
                        this.optionValues[option.id] = e.target.checked;
                        e.stopPropagation();
                    }
                });

                this.optionsContainer.appendChild(optionRow);
            });

            this.element.appendChild(this.optionsContainer);

            // Add expand/collapse capability for options
            const expandButton = document.createElement('button');
            expandButton.className = 'userscripts-format-options__expand-button';
            expandButton.innerHTML = SVG_MORE_OPTIONS; // SVG for more options icon
            expandButton.title = TranslationManager.getText('formatOptions'); // Use translator
            expandButton.addEventListener('click', (e) => {
                this.toggleOptions();
                e.stopPropagation();
            });
            formatLabel.appendChild(expandButton);

            // Create a label
            const optionsLabel = document.createElement('div');
            optionsLabel.className = 'userscripts-format-options__label';
            optionsLabel.textContent = TranslationManager.getText('formatOptionsLabel'); // Use translator
            this.optionsContainer.appendChild(optionsLabel);
        }

        return this.element;
    }

    /**
     * Toggle options visibility
     */
    toggleOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.toggle('hidden');
        }
    }

    /**
     * Show options panel
     */
    showOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.remove('hidden');
        }
    }

    /**
     * Hide options panel
     */
    hideOptions() {
        if (this.optionsContainer) {
            this.optionsContainer.classList.add('hidden');
        }
    }

    /**
     * Get all options values
     * @returns {Object} The options values
     */
    getOptions() {
        return this.optionValues;
    }

    /**
     * Get a specific option value
     * @param {String} optionId - The option ID
     * @returns {*} The option value
     */
    getOption(optionId) {
        return this.optionValues[optionId];
    }

    /**
     * Set a specific option value
     * @param {String} optionId - The option ID
     * @param {*} value - The value to set
     */
    setOption(optionId, value) {
        this.optionValues[optionId] = value;

        // Update checkbox if it exists - find the checkbox component instead of the raw element
        const checkboxContainer = this.element.querySelector(`#option-${this.id}-${optionId}`).closest('.userscripts-checkbox-container');
        if (checkboxContainer && checkboxContainer._checkboxInstance) {
            checkboxContainer._checkboxInstance.setChecked(value);
        }
    }

    /**
     * Mark this format as selected
     */
    select() {
        if (this.element) {
            this.element.classList.add('selected');
        }
    }

    /**
     * Unselect this format
     */
    unselect() {
        if (this.element) {
            this.element.classList.remove('selected');
        }
    }
}

class WallapopExpandDescription {
    static async init() {
        Logger.debug("Initializing script");

        // Load language preference first
        TranslationManager.loadLanguagePreference();

        StyleManager.addStyles();

        // Create unified control panel
        ControlPanel.createControlPanel();

        await this.waitForElements(SELECTORS.ITEM_CARDS);
        ListingManager.addExpandButtonsToListings();

        // Apply filters to initial listings
        ControlPanel.applyFilters();

        new DOMObserver().observe();
    }

    static waitForElements(selectors, timeout = 10000) {
        Logger.debug("Waiting for elements:", selectors);
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElements() {
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        Logger.debug("Elements found:", selector, elements.length);
                        resolve(elements);
                        return;
                    }
                }

                if (Date.now() - startTime > timeout) {
                    Logger.debug("Timeout waiting for elements");
                    reject(new Error(`Timeout waiting for elements`));
                } else {
                    requestAnimationFrame(checkElements);
                }
            }

            checkElements();
        });
    }
}

class ControlPanel {
    static blockedTerms = [];
    static container = null;
    static filterInputElement = null;
    static blockedTermsListElement = null;
    static sidebarPanel = null;
    static exportFormats = {
        // Text-based formats
        text: {
            label: 'Text',
            formats: {
                'plain': new FormatOption({
                    id: 'plain',
                    label: 'Plain Text',
                    description: 'Simple text list of descriptions',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images as URLs',
                            description: 'Add image URLs to the output',
                            defaultValue: false
                        }
                    ]
                }),
                'markdown': new FormatOption({
                    id: 'markdown',
                    label: 'Markdown',
                    description: 'Formatted with Markdown syntax',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images as markdown',
                            description: 'Add image references using markdown syntax',
                            defaultValue: true
                        },
                        {
                            id: 'use-frontmatter',
                            label: 'Use frontmatter',
                            description: 'Add YAML frontmatter with metadata',
                            defaultValue: false
                        }
                    ]
                }),
                'html': new FormatOption({
                    id: 'html',
                    label: 'HTML',
                    description: 'Formatted as HTML document',
                    category: 'text',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include images',
                            description: 'Add image elements with source URLs',
                            defaultValue: true
                        },
                        {
                            id: 'include-styles',
                            label: 'Include CSS styles',
                            description: 'Add CSS styling to the HTML',
                            defaultValue: true
                        }
                    ]
                })
            }
        },
        // Data formats
        data: {
            label: 'Data',
            formats: {
                'json': new FormatOption({
                    id: 'json',
                    label: 'JSON',
                    description: 'JavaScript Object Notation',
                    category: 'data',
                    options: [
                        {
                            id: 'pretty-print',
                            label: 'Pretty print',
                            description: 'Format JSON with indentation',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs to JSON objects',
                            defaultValue: false
                        }
                    ]
                }),
                'csv': new FormatOption({
                    id: 'csv',
                    label: 'CSV',
                    description: 'Comma-separated values',
                    category: 'data',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'tsv': new FormatOption({
                    id: 'tsv',
                    label: 'TSV',
                    description: 'Tab-separated values',
                    category: 'data',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'xml': new FormatOption({
                    id: 'xml',
                    label: 'XML',
                    description: 'Extensible Markup Language',
                    category: 'data',
                    options: [
                        {
                            id: 'include-images',
                            label: 'Include image elements',
                            description: 'Add image URLs as XML elements',
                            defaultValue: false
                        },
                        {
                            id: 'pretty-print',
                            label: 'Pretty print',
                            description: 'Format XML with indentation',
                            defaultValue: true
                        }
                    ]
                })
            }
        },
        // Spreadsheet formats
        spreadsheet: {
            label: 'Spreadsheet',
            formats: {
                'excel-csv': new FormatOption({
                    id: 'excel-csv',
                    label: 'Excel CSV',
                    description: 'CSV optimized for Excel import',
                    category: 'spreadsheet',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                }),
                'excel-xml': new FormatOption({
                    id: 'excel-xml',
                    label: 'Excel XML',
                    description: 'XML format for Excel',
                    category: 'spreadsheet',
                    options: [
                        {
                            id: 'include-headers',
                            label: 'Include headers',
                            description: 'Add column names as the first row',
                            defaultValue: true
                        },
                        {
                            id: 'include-images',
                            label: 'Include image URLs',
                            description: 'Add image URLs column',
                            defaultValue: false
                        }
                    ]
                })
            }
        }
    };

    // Store togglers for state management
    static togglers = {
        panel: null,
        filter: null,
        copy: null,
        language: null
    };

    /**
     * Create a button with standard style
     */
    static createButton(text, className, clickHandler, options = {}) {
        // Configure button options
        const buttonOptions = {
            text: text,
            className: className, // Use the original class name
            onClick: clickHandler,
            disabled: options.disabled || false,
            successText: options.successText || null,
            successDuration: options.successDuration || 1500,
            container: options.container || null
        };

        // Create button using Button component
        const buttonComponent = new Button(buttonOptions);
        const buttonElement = buttonComponent.button;

        // Add any dataset properties
        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, value]) => {
                buttonElement.dataset[key] = value;
            });
        }

        return buttonElement;
    }

    /**
     * Create a new "Expand All" section in the control panel
     */
    static async createExpandAllSection(container) {
        // Load saved state
        const isExpanded = await this.loadPanelState('isExpandAllSectionExpanded', true);

        this.togglers.expandAll = new SectionToggler({
            container,
            customClassName: 'expand-all',
            title: TranslationManager.getText('expandAllDescriptions'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isExpandAllSectionExpanded', state);
            },
            contentCreator: async (content) => {
                // Create the expand all button
                const expandAllButton = this.createButton(
                    TranslationManager.getText('expandAllVisible'),
                    'panel-button expand-all-button',
                    () => this.handleExpandAll()
                );
                content.appendChild(expandAllButton);

                // Create progress container (empty container to hold the progress bar)
                const progressContainer = document.createElement('div');
                progressContainer.className = 'expand-progress-container';
                progressContainer.style.display = 'none';
                progressContainer.style.marginTop = '10px';

                // Store the container for later access
                this.expandProgressContainer = progressContainer;
                content.appendChild(progressContainer);

                // Add delay option using the Slider component
                const delayContainer = document.createElement('div');
                delayContainer.style.marginTop = '10px';

                // Get saved delay value
                const savedDelay = parseInt(await this.loadPanelState('expandAllDelay', '1000'));

                // Create the slider with the Slider component
                this.delaySlider = new Slider({
                    container: delayContainer,
                    min: 500,
                    max: 3000,
                    step: 100,
                    value: savedDelay,
                    label: TranslationManager.getText('delayBetweenRequests'),
                    theme: 'primary',
                    valueSuffix: 'ms',
                    onChange: async (value) => {
                        this.savePanelState('expandAllDelay', value.toString());
                    }
                });

                content.appendChild(delayContainer);
            }
        });

        return this.togglers.expandAll.section;
    }

    /**
     * Expand all visible descriptions sequentially
     */
    static async handleExpandAll() {
        // Find all unexpanded descriptions that are visible (not filtered)
        const allExpandButtons = Array.from(document.querySelectorAll(SELECTORS.EXPAND_BUTTON))
            .filter(button => {
                // Only include buttons that are for expanding (not hiding)
                const isExpandButton = button.textContent === TranslationManager.getText('expandDescription');
                // Only include buttons for listings that are visible (not filtered out)
                const listing = this.getListingFromButton(button);
                const isVisible = listing && !listing.classList.contains('hidden-item');

                return isExpandButton && isVisible;
            });

        const totalButtons = allExpandButtons.length;

        if (totalButtons === 0) {
            this.showExpandAllMessage(TranslationManager.getText('noDescriptionsToExpand'));
            return;
        }

        // Get the delay setting from the slider
        const delay = this.delaySlider ? this.delaySlider.getValue() : parseInt(await this.loadPanelState('expandAllDelay', '1000'));

        // Get expand button and disable it
        const expandAllButton = document.querySelector('.expand-all-button');
        if (expandAllButton) expandAllButton.disabled = true;

        // Show the progress container and create a new ProgressBar instance
        if (this.expandProgressContainer) {
            this.expandProgressContainer.innerHTML = '';
            this.expandProgressContainer.style.display = 'block';

            // Create the progress bar using the enhanced ProgressBar component
            this.progressBar = new ProgressBar({
                initialValue: 0,
                container: this.expandProgressContainer,
                showText: true,
                theme: 'primary',
                size: 'normal'  // can be 'small', 'normal', or 'large'
            });

            // Set initial text
            this.progressBar.setValue(0, `Expanding 0 of ${totalButtons}`);
        }

        let expanded = 0;
        let errors = 0;

        // Process buttons one at a time
        for (const button of allExpandButtons) {
            try {
                // Update progress bar with current status
                if (this.progressBar) {
                    // Calculate percentage
                    const progress = Math.floor((expanded / totalButtons) * 100);

                    // Update progress bar with custom text
                    this.progressBar.setValue(
                        progress,
                        `Expanding ${expanded + 1} of ${totalButtons}`
                    );
                }

                // Click the button to expand
                button.click();

                // Wait for the specified delay
                await new Promise(resolve => setTimeout(resolve, delay));

                expanded++;
            } catch (error) {
                Logger.error(error, "Expanding description in sequence");
                errors++;
            }
        }

        // Update UI when finished
        if (this.progressBar) {
            // Set to 100% complete
            this.progressBar.setValue(100);

            // Change theme based on success or errors
            this.progressBar.setTheme(errors > 0 ? 'warning' : 'success');

            // Update the text with completion message
            const completionText = `Expanded ${expanded} of ${totalButtons}` +
                (errors > 0 ? ` (${errors} errors)` : '');
            this.progressBar.setValue(100, completionText);
        }

        // Re-enable the button after 2 seconds
        setTimeout(() => {
            if (expandAllButton) expandAllButton.disabled = false;

            // Hide progress after 5 seconds
            setTimeout(() => {
                if (this.expandProgressContainer) {
                    this.expandProgressContainer.style.display = 'none';

                    // Clean up the progress bar instance
                    if (this.progressBar) {
                        this.progressBar.destroy();
                        this.progressBar = null;
                    }
                }
            }, 3000);
        }, 2000);
    }

    /**
     * Get the listing element that contains the button
     */
    static getListingFromButton(button) {
        // Traverse up to find the listing container
        let element = button;

        // Check SELECTORS.ITEM_CARDS selectors to find which one matches
        for (let i = 0; i < 10; i++) {  // Limit to 10 levels to avoid infinite loop
            element = element.parentElement;

            if (!element) break;

            const matchesSelector = SELECTORS.ITEM_CARDS.some(selector => {
                // Remove the prefix if it's a child selector
                const simpleSelector = selector.includes(' ')
                    ? selector.split(' ').pop()
                    : selector;

                return element.matches(simpleSelector);
            });

            if (matchesSelector) return element;
        }

        return null;
    }

    /**
     * Show a message in the expand all section
     */
    static showExpandAllMessage(message) {
        const expandAllButton = document.querySelector('.expand-all-button');
        if (expandAllButton) {
            const originalText = expandAllButton.textContent;
            expandAllButton.textContent = message;

            setTimeout(() => {
                expandAllButton.textContent = originalText;
            }, 2000);
        }
    }

    /**
     * Create the reserved listings section
     */
    static createReservedListingsSection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isReservedListingsSectionExpanded', true);
        const hideReserved = this.loadPanelState('hideReservedListings', true); // Default to true - hide reserved listings

        this.togglers.reservedListings = new SectionToggler({
            container,
            sectionClass: 'reserved-listings',
            title: TranslationManager.getText('reservedListingsFilter'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isReservedListingsSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create a checkbox control using the Checkbox component
                const hideReservedContainer = document.createElement('div');
                hideReservedContainer.style.padding = '10px 0';

                // Create checkbox using the Checkbox component
                this.hideReservedCheckbox = new Checkbox({
                    label: TranslationManager.getText('hideReservedListings'),
                    checked: hideReserved,
                    container: hideReservedContainer,
                    onChange: (e) => {
                        const isChecked = e.target.checked;
                        this.savePanelState('hideReservedListings', isChecked);
                        this.applyReservedFilter();
                    }
                });

                content.appendChild(hideReservedContainer);

                // Add status text element to show count of hidden listings
                const statusElement = document.createElement('div');
                statusElement.className = 'reserved-status';
                statusElement.style.fontSize = '12px';
                statusElement.style.color = '#666';
                statusElement.style.fontStyle = 'italic';
                statusElement.style.padding = '5px 0';
                content.appendChild(statusElement);

                // Store reference for later updates
                this.reservedStatusElement = statusElement;
            }
        });

        return this.togglers.reservedListings.section;
    }

    /**
     * Apply filter to hide reserved listings
     */
    static applyReservedFilter() {
        Logger.debug("Applying reserved listings filter");

        const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
        const allListings = document.querySelectorAll(allSelectors);

        // Get filter setting
        const hideReserved = this.loadPanelState('hideReservedListings', true);

        if (!hideReserved) {
            // If filter is disabled, show any listings that were hidden by this filter
            // but respect other filters
            allListings.forEach(listing => {
                if (listing.dataset.reservedHidden === 'true') {
                    delete listing.dataset.reservedHidden;

                    // Only show if not hidden by other filters
                    if (!this.shouldHideListing(listing) &&
                        !this.shouldHideByDeliveryMethod(listing)) {
                        this.showListing(listing);
                    }
                }
            });

            // Update status text
            if (this.reservedStatusElement) {
                this.reservedStatusElement.textContent = '';
            }

            return;
        }

        // Apply the filter to hide reserved listings
        let hiddenCount = 0;

        allListings.forEach(listing => {
            if (this.isReservedListing(listing)) {
                // Mark as hidden specifically by this filter
                listing.dataset.reservedHidden = 'true';
                this.hideListing(listing);
                hiddenCount++;
            }
        });

        // Update status text
        if (this.reservedStatusElement) {
            this.reservedStatusElement.textContent = TranslationManager.getText(
                'reservedListingsFound', {count: hiddenCount}
            );
        }

        Logger.debug(`Reserved listings filter applied: ${hiddenCount} listings hidden`);
    }

    /**
     * Check if a listing is reserved
     * @param {HTMLElement} listing - The listing element to check
     * @returns {boolean} true if the listing is reserved
     */
    static isReservedListing(listing) {
        // Check for various indicators that a listing is reserved

        // Method 1: Check for the badge with text "Reservado"
        const hasReservedText = listing.textContent.includes('Reservado');

        // Method 2: Check for the wallapop-badge--reserved class
        const hasReservedBadge = !!listing.querySelector('.wallapop-badge--reserved, [class*="wallapop-badge"][class*="reserved"]');

        // Method 3: Check in shadow DOM
        const shadowRoots = [];
        const findShadowRoots = (element) => {
            if (element.shadowRoot) {
                shadowRoots.push(element.shadowRoot);
            }
            Array.from(element.children).forEach(findShadowRoots);
        };
        findShadowRoots(listing);

        // Check for reserved badge in shadow DOM
        const hasReservedBadgeInShadow = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--reserved') !== null ||
            root.querySelector('wallapop-badge.wallapop-badge--reserved') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="reserved"]') !== null
        );

        return hasReservedText || hasReservedBadge || hasReservedBadgeInShadow;
    }

    /**
     * Modified method to check if a listing should be hidden by delivery method
     * Separated from the main filter to make it easier to combine filters
     */
    static shouldHideByDeliveryMethod(listing) {
        const filterValue = this.loadPanelState('deliveryMethodFilter', 'all');
        if (filterValue === 'all') return false;

        const deliveryMethod = this.getDeliveryMethod(listing);
        return (filterValue === 'shipping' && deliveryMethod !== 'shipping') ||
            (filterValue === 'inperson' && deliveryMethod !== 'inperson');
    }

    /**
     * Create the filter section
     */
    static createFilterSection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isFilterSectionExpanded', true);

        this.togglers.filter = new SectionToggler({
            container,
            sectionClass: 'filter',
            title: TranslationManager.getText('filterUnwantedWords'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isFilterSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Filter input
                this.filterInputElement = document.createElement('input');
                this.filterInputElement.className = 'filter-input';
                this.filterInputElement.placeholder = TranslationManager.getText('example');

                // Add enter key listener
                this.filterInputElement.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addBlockedTerm();
                    }
                });

                content.appendChild(this.filterInputElement);

                // Apply button
                const applyButton = this.createButton(
                    TranslationManager.getText('addAndApply'),
                    'panel-button filter-apply',
                    () => this.addBlockedTerm()
                );
                content.appendChild(applyButton);

                // Create list for blocked terms
                this.blockedTermsListElement = document.createElement('div');
                this.blockedTermsListElement.className = 'blocked-terms-list';
                content.appendChild(this.blockedTermsListElement);
            }
        });

        return this.togglers.filter.section;
    }

    /**
     * Update format options display based on the selected format
     * @param {FormatOption} format - The selected format
     * @param {HTMLElement} container - The container for options
     */
    static updateFormatOptions(format, container) {
        // Clear existing options
        container.innerHTML = '';

        // If no options, hide the container
        if (!format.options || format.options.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Show the container
        container.style.display = 'block';

        // Create a label
        const optionsLabel = document.createElement('div');
        optionsLabel.className = 'format-options-label';
        optionsLabel.textContent = TranslationManager.getText('formatOptionsLabel'); // Use translator
        container.appendChild(optionsLabel);

        // Create options using Checkbox component
        format.options.forEach(option => {
            const optionRow = document.createElement('div');
            optionRow.className = 'option-row';

            // Create checkbox using the Checkbox component
            new Checkbox({
                id: `option-${format.id}-${option.id}`,
                label: option.label,
                checked: option.defaultValue || false,
                container: optionRow,
                size: 'small',
                attributes: {
                    title: option.description || ''
                },
                onChange: (e) => {
                    format.setOption(option.id, e.target.checked);
                }
            });

            container.appendChild(optionRow);
        });
    }

    /**
     * Create the copy section
     */
    static createCopySection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isCopySectionExpanded', true);

        // Load the last selected format
        let lastSelectedFormat = this.loadExportFormat();

        this.togglers.copy = new SectionToggler({
            container,
            sectionClass: 'export',
            title: TranslationManager.getText('exportDescriptions'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isCopySectionExpanded', state);
            },
            contentCreator: (content) => {
                // Convert export formats to SelectBox items format
                const selectItems = [];

                // Process each category
                Object.entries(this.exportFormats).forEach(([categoryId, category]) => {
                    // Create a category item with nested formats
                    const categoryItems = {
                        label: category.label,
                        items: []
                    };

                    // Add formats to this category
                    Object.entries(category.formats).forEach(([formatId, format]) => {
                        categoryItems.items.push({
                            value: `${categoryId}:${formatId}`,
                            label: format.label,
                            // Select this format if it matches last saved format
                            selected: lastSelectedFormat &&
                                lastSelectedFormat.category === categoryId &&
                                lastSelectedFormat.id === formatId
                        });
                    });

                    selectItems.push(categoryItems);
                });

                // Create format selector using SelectBox
                const formatSelectorContainer = document.createElement('div');
                formatSelectorContainer.className = 'format-selector-container';
                content.appendChild(formatSelectorContainer);

                // Initialize SelectBox
                this.formatSelector = new SelectBox({
                    items: selectItems,
                    name: 'export-format',
                    id: 'export-format-select',
                    placeholder: TranslationManager.getText('selectFormat'),
                    container: formatSelectorContainer,
                    theme: 'default',
                    size: 'medium',
                    useCategorizedUI: true,
                    onChange: (value) => {
                        // Parse the value (category:formatId)
                        const [categoryId, formatId] = value.split(':');

                        // Save the selected format
                        this.saveExportFormat(formatId, categoryId);

                        // Store current selected format for use in export functions
                        window.currentSelectedFormat = this.exportFormats[categoryId].formats[formatId];
                    }
                });

                const formatOptionsContainer = document.createElement('div');
                formatOptionsContainer.className = 'format-options-container';
                formatOptionsContainer.style.display = 'none'; // Hide initially
                content.appendChild(formatOptionsContainer);

                // Update when format changes
                this.formatSelector.onChange = (value) => {
                    // Parse the value (category:formatId)
                    const [categoryId, formatId] = value.split(':');

                    // Save the selected format
                    this.saveExportFormat(formatId, categoryId);

                    // Get the format
                    const format = this.exportFormats[categoryId].formats[formatId];
                    window.currentSelectedFormat = format;

                    // Update options display
                    this.updateFormatOptions(format, formatOptionsContainer);
                };

                // Create export buttons container
                const exportButtonsContainer = document.createElement('div');
                exportButtonsContainer.className = 'export-buttons-container';

                // Copy button
                const copyButton = this.createButton(
                    TranslationManager.getText('copyToClipboard'),
                    'export-button',
                    () => this.copyToClipboard()
                );
                copyButton.style.flex = '1';

                // Download button
                const downloadButton = this.createButton(
                    TranslationManager.getText('downloadFile'),
                    'export-button',
                    () => this.downloadFormatted()
                );
                downloadButton.style.flex = '1';

                exportButtonsContainer.appendChild(copyButton);
                exportButtonsContainer.appendChild(downloadButton);
                content.appendChild(exportButtonsContainer);

                content.insertBefore(formatOptionsContainer, exportButtonsContainer);

                const handleFormatSelection = (value) => {
                    // Parse the value (category:formatId)
                    const [categoryId, formatId] = value.split(':');

                    // Save the selected format
                    this.saveExportFormat(formatId, categoryId);

                    // Get the format
                    const format = this.exportFormats[categoryId].formats[formatId];
                    window.currentSelectedFormat = format;

                    // Update options display
                    this.updateFormatOptions(format, formatOptionsContainer);
                };

                if (lastSelectedFormat) {
                    // Get currently selected value from select box
                    const selectedValue = this.formatSelector.getValue();
                    if (selectedValue) {
                        handleFormatSelection(selectedValue);
                    }
                }

                // Create clear button
                const clearButton = this.createButton(
                    TranslationManager.getText('clearAll'),
                    'panel-button copy-clear',
                    () => {
                        DescriptionManager.clearItems();
                        this.showCopySuccess(clearButton, TranslationManager.getText('cleared'));
                    }
                );
                content.appendChild(clearButton);
            }
        });

        return this.togglers.copy.section;
    }

    /**
     * Copy formatted data to clipboard
     */
    static copyToClipboard() {
        // Get the currently selected format
        const selectedFormat = window.currentSelectedFormat;
        if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
            // No format selected or no data to export
            return;
        }

        Logger.debug(`Copying data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

        // Get the formatter based on the selected format
        const formatter = this.getFormatter(selectedFormat);
        if (!formatter) {
            Logger.debug("No formatter available for", selectedFormat.id);
            return;
        }

        // Format the data
        const formattedData = formatter(DescriptionManager.expandedItems, selectedFormat.getOptions());

        // Copy to clipboard
        if (formattedData) {
            GM_setClipboard(formattedData);

            // Visual feedback
            const copyButton = document.querySelector('.export-buttons-container .export-button');
            if (copyButton) {
                this.showCopySuccess(copyButton, TranslationManager.getText('copied'));
            }
        }
    }

    /**
     * Download formatted data as a file
     */
    static downloadFormatted() {
        // Get the currently selected format
        const selectedFormat = window.currentSelectedFormat;
        if (!selectedFormat || DescriptionManager.expandedItems.length === 0) {
            // No format selected or no data to export
            return;
        }

        Logger.debug(`Downloading data in ${selectedFormat.id} format with options:`, selectedFormat.getOptions());

        // Get the formatter based on the selected format
        const formatter = this.getFormatter(selectedFormat);
        if (!formatter) {
            Logger.debug("No formatter available for", selectedFormat.id);
            return;
        }

        // Format the data
        const formattedData = formatter(DescriptionManager.expandedItems, selectedFormat.getOptions());

        if (formattedData) {
            // Get file extension and mime type
            const {extension, mimeType} = this.getFileInfo(selectedFormat.id);

            // Create filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `wallapop-export-${timestamp}.${extension}`;

            // Download the file
            this.downloadFile(formattedData, filename, mimeType);

            // Visual feedback
            const downloadButton = document.querySelectorAll('.export-buttons-container .export-button')[1];
            if (downloadButton) {
                this.showCopySuccess(downloadButton, TranslationManager.getText('downloaded'));
            }
        }
    }

    static saveExportFormat(formatId, categoryId) {
        try {
            localStorage.setItem('wallapop-export-format', JSON.stringify({id: formatId, category: categoryId}));
            Logger.debug(`Export format saved: ${formatId} (${categoryId})`);
        } catch (error) {
            Logger.error(error, "Saving export format");
        }
    }

    static loadExportFormat() {
        try {
            const savedFormat = localStorage.getItem('wallapop-export-format');
            if (savedFormat) {
                const format = JSON.parse(savedFormat);
                Logger.debug(`Export format loaded: ${format.id} (${format.category})`);
                return format;
            }
        } catch (error) {
            Logger.error(error, "Loading export format");
        }
        return null;
    }

    static getFormatter(format) {
        // Map of format IDs to formatter functions
        const formatters = {
            // Text formats
            'plain': this.formatAsPlainText,
            'markdown': this.formatAsMarkdown,
            'html': this.formatAsHtml,

            // Data formats
            'json': this.formatAsJson,
            'csv': this.formatAsCsv,
            'tsv': this.formatAsTsv,
            'xml': this.formatAsXml,

            // Spreadsheet formats
            'excel-csv': this.formatAsExcelCsv,
            'excel-xml': this.formatAsExcelXml
        };

        return formatters[format.id];
    }

    /**
     * JavaScript implementation for select box delivery method filter
     */
    static async createDeliveryMethodSection(container) {
        // Load saved state
        const isExpanded = this.loadPanelState('isDeliveryMethodSectionExpanded', true);

        this.togglers.deliveryMethod = new SectionToggler({
            container,
            sectionClass: 'delivery-method',
            title: TranslationManager.getText('deliveryMethodFilter'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isDeliveryMethodSectionExpanded', state);
            },
            contentCreator: async (content) => {
                // Create select element
                new SelectBox({
                    items: [
                        {
                            value: 'all',
                            label: TranslationManager.getText('showAll'),
                            selected: await this.loadPanelState('deliveryMethodFilter', 'shipping') === 'all'
                        },
                        {
                            value: 'shipping',
                            label: TranslationManager.getText('showOnlyShipping'),
                            selected: await this.loadPanelState('deliveryMethodFilter', 'shipping') === 'shipping'
                        },
                        {
                            value: 'inperson',
                            label: TranslationManager.getText('showOnlyInPerson'),
                            selected: await this.loadPanelState('deliveryMethodFilter', 'shipping') === 'inperson'
                        }
                    ],
                    name: 'delivery-method',
                    id: 'delivery-method-select',
                    container: content, // the container passed to the contentCreator callback
                    onChange: (value, event) => {
                        this.savePanelState('deliveryMethodFilter', value);
                        this.applyDeliveryMethodFilter();
                    },
                    theme: 'default', // or set a different theme if needed
                    size: 'medium',
                    placeholder: TranslationManager.getText('selectDeliveryMethod') // Make sure to add this key in translations if required
                });
            }
        });

        return this.togglers.deliveryMethod.section;
    }

    /**
     * Apply delivery method filter
     */
    static async applyDeliveryMethodFilter() {
        Logger.debug("Applying delivery method filter");

        const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
        const allListings = document.querySelectorAll(allSelectors);

        // Get current filter value
        const filterValue = await this.loadPanelState('deliveryMethodFilter', 'shipping');

        if (filterValue === 'all') {
            // Show all listings (that aren't hidden by other filters)
            allListings.forEach(listing => {
                if (!this.shouldHideListing(listing)) {
                    this.showListing(listing);
                }
            });
            return;
        }

        let hiddenCount = 0;

        allListings.forEach(listing => {
            // First check if it should be hidden by the keyword filter
            if (this.shouldHideListing(listing)) {
                this.hideListing(listing);
                hiddenCount++;
                return;
            }

            // Then check delivery method
            const deliveryMethod = this.getDeliveryMethod(listing);

            if (
                (filterValue === 'shipping' && deliveryMethod !== 'shipping') ||
                (filterValue === 'inperson' && deliveryMethod !== 'inperson')
            ) {
                this.hideListing(listing);
                hiddenCount++;
            } else {
                this.showListing(listing);
            }
        });

        Logger.debug(`Delivery method filter applied: ${hiddenCount} listings hidden out of ${allListings.length}`);
    }

    /**
     * Detect the delivery method of a listing
     * @param {HTMLElement} listing - The listing element
     * @returns {string} 'shipping', 'inperson', or 'unknown'
     */
    static getDeliveryMethod(listing) {
        // Function to search within shadow DOM
        const queryShadowDOM = (element, selector) => {
            // Check if the element itself matches
            if (element.matches && element.matches(selector)) {
                return element;
            }

            // Check normal children first
            const found = element.querySelector(selector);
            if (found) return found;

            // Then check shadow roots
            const shadowRoot = element.shadowRoot;
            if (shadowRoot) {
                const foundInShadow = shadowRoot.querySelector(selector);
                if (foundInShadow) return foundInShadow;
            }

            // Finally check all child elements recursively for shadow roots
            for (const child of element.children) {
                const foundInChild = queryShadowDOM(child, selector);
                if (foundInChild) return foundInChild;
            }

            return null;
        };

        // Look for shadow roots and badge elements within them
        const shadowRoots = [];
        const findShadowRoots = (element) => {
            if (element.shadowRoot) {
                shadowRoots.push(element.shadowRoot);
            }
            Array.from(element.children).forEach(findShadowRoots);
        };
        findShadowRoots(listing);

        // Check for shipping badge in shadow DOM
        const hasShippingBadge = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--shippingAvailable') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="shippingAvailable"]') !== null
        );

        // Check for in-person badge in shadow DOM
        const hasInPersonBadge = shadowRoots.some(root =>
            root.querySelector('.wallapop-badge--faceToFace') !== null ||
            root.querySelector('[class*="wallapop-badge"][class*="faceToFace"]') !== null
        );

        // Text fallback as a last resort
        const shippingText = listing.textContent.includes('Envío disponible');
        const inPersonText = listing.textContent.includes('Sólo venta en persona') ||
            listing.textContent.includes('Solo venta en persona');

        // Determine delivery method
        if (hasShippingBadge || (!hasInPersonBadge && shippingText)) {
            return 'shipping';
        } else if (hasInPersonBadge || inPersonText) {
            return 'inperson';
        } else {
            // Add additional fallback based on HTML structure
            // Check if there's an icon that might indicate shipping or in-person
            const hasShippingIcon = shadowRoots.some(root =>
                root.querySelector('walla-icon[class*="shipping"]') !== null
            );
            const hasInPersonIcon = shadowRoots.some(root =>
                root.querySelector('walla-icon[class*="faceToFace"]') !== null
            );

            if (hasShippingIcon) {
                return 'shipping';
            } else if (hasInPersonIcon) {
                return 'inperson';
            }

            Logger.debug("Unknown delivery method for listing:", listing);
            return 'unknown';
        }
    }

    static formatAsPlainText(items, options) {
        // Simple plain text formatter
        let result = '';

        items.forEach((item, index) => {
            result += `== ${item.title} ==\n`;
            result += `Price: ${item.price || 'N/A'}\n`;
            result += `Description: ${item.description}\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                result += 'Images:\n';
                item.images.forEach(img => {
                    result += `- ${img}\n`;
                });
            }

            result += `URL: ${item.url}\n`;

            // Add separator between items
            if (index < items.length - 1) {
                result += '\n--------------------------------------------------\n\n';
            }
        });

        return result;
    }

    static formatAsMarkdown(items, options) {
        // Markdown formatter
        let result = '';

        items.forEach((item, index) => {
            // Add frontmatter if option is enabled
            if (options['use-frontmatter']) {
                result += '---\n';
                result += `title: "${item.title.replace(/"/g, '\\"')}"\n`;
                result += `price: "${item.price || 'N/A'}"\n`;
                result += `url: "${item.url}"\n`;

                if (options['include-images'] && item.images && item.images.length > 0) {
                    result += 'images:\n';
                    item.images.forEach(img => {
                        result += `  - ${img}\n`;
                    });
                }

                result += '---\n\n';
            }

            // Add title and details
            result += `# ${item.title}\n\n`;
            result += `**Price:** ${item.price || 'N/A'}\n\n`;
            result += `## Description\n\n${item.description}\n\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                result += '## Images\n\n';
                item.images.forEach(img => {
                    result += `![${item.title}](${img})\n\n`;
                });
            }

            result += `**URL:** [${item.title}](${item.url})\n\n`;

            // Add separator between items
            if (index < items.length - 1) {
                result += '---\n\n';
            }
        });

        return result;
    }

    static formatAsJson(items, options) {
        // Filter out image URLs if not needed
        const processedItems = items.map(item => {
            const processedItem = {...item};

            // Remove images if option is disabled
            if (!options['include-images']) {
                delete processedItem.images;
            }

            return processedItem;
        });

        // Pretty print or compact JSON
        if (options['pretty-print']) {
            return JSON.stringify(processedItems, null, 2);
        } else {
            return JSON.stringify(processedItems);
        }
    }

    static formatAsCsv(items, options) {
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building CSV
        let csv = '';

        // Add headers if option is enabled
        if (options['include-headers']) {
            csv += columns.map(col => `"${col}"`).join(',') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? `"${item.images.join('|')}"`
                        : '""';
                } else {
                    // Escape double quotes and wrap values in quotes
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return `"${value.replace(/"/g, '""')}"`;
                }
            });

            csv += row.join(',') + '\n';
        });

        return csv;
    }

    static formatAsTsv(items, options) {
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building TSV
        let tsv = '';

        // Add headers if option is enabled
        if (options['include-headers']) {
            tsv += columns.join('\t') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? item.images.join('|')
                        : '';
                } else {
                    // Replace tabs with spaces for TSV compatibility
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return value.replace(/\t/g, ' ');
                }
            });

            tsv += row.join('\t') + '\n';
        });

        return tsv;
    }

    static formatAsHtml(items, options) {
        // HTML formatter
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallapop Item Descriptions</title>`;

        // Add CSS if option is enabled
        if (options['include-styles']) {
            html += `
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .item {
            margin-bottom: 40px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-title {
            font-size: 24px;
            margin: 0 0 10px 0;
            color: #008080;
        }
        .item-price {
            font-size: 18px;
            font-weight: bold;
            color: #e64a19;
            margin: 0 0 15px 0;
        }
        .item-description {
            margin-bottom: 15px;
            white-space: pre-wrap;
        }
        .item-url {
            display: inline-block;
            margin-top: 10px;
            color: #0277bd;
            text-decoration: none;
        }
        .item-url:hover {
            text-decoration: underline;
        }
        .item-images {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .item-image {
            max-width: 200px;
            max-height: 200px;
            object-fit: contain;
            border: 1px solid #ddd;
        }
        h2 {
            color: #555;
            font-size: 18px;
            margin: 20px 0 10px 0;
        }
    </style>`;
        }

        html += `
</head>
<body>
    <h1>Wallapop Item Descriptions</h1>`;

        // Add items
        items.forEach(item => {
            html += `
    <div class="item">
        <h2 class="item-title">${this.escapeHtml(item.title)}</h2>
        <div class="item-price">Price: ${this.escapeHtml(item.price || 'N/A')}</div>
        <div class="item-description">${this.escapeHtml(item.description)}</div>`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                html += `
        <div class="item-images">`;

                item.images.forEach(img => {
                    html += `
            <img class="item-image" src="${this.escapeHtml(img)}" alt="${this.escapeHtml(item.title)}" />`;
                });

                html += `
        </div>`;
            }

            html += `
        <a class="item-url" href="${this.escapeHtml(item.url)}" target="_blank">View on Wallapop</a>
    </div>`;
        });

        html += `
</body>
</html>`;

        return html;
    }

    static formatAsXml(items, options) {
        // XML formatter
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';

        // Add items
        items.forEach(item => {
            xml += '  <item>\n';
            xml += `    <title>${this.escapeXml(item.title)}</title>\n`;
            xml += `    <price>${this.escapeXml(item.price || 'N/A')}</price>\n`;
            xml += `    <description>${this.escapeXml(item.description)}</description>\n`;
            xml += `    <url>${this.escapeXml(item.url)}</url>\n`;

            // Add images if option is enabled
            if (options['include-images'] && item.images && item.images.length > 0) {
                xml += '    <images>\n';

                item.images.forEach(img => {
                    xml += `      <image>${this.escapeXml(img)}</image>\n`;
                });

                xml += '    </images>\n';
            }

            xml += '  </item>\n';
        });

        xml += '</items>';

        // Format XML with indentation if pretty print is enabled
        if (!options['pretty-print']) {
            // Remove line breaks and extra spaces if pretty print is disabled
            xml = xml.replace(/\n\s*/g, '');
        }

        return xml;
    }

    static formatAsExcelCsv(items, options) {
        // Excel-friendly CSV (uses semicolons as separators in some regions)
        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building CSV
        let csv = '';

        // Add BOM for Excel
        const bom = '\uFEFF';
        csv += bom;

        // Add headers if option is enabled
        if (options['include-headers']) {
            csv += columns.map(col => `"${col}"`).join(';') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? `"${item.images.join('|')}"`
                        : '""';
                } else {
                    // Escape double quotes and wrap values in quotes
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return `"${value.replace(/"/g, '""')}"`;
                }
            });

            csv += row.join(';') + '\n';
        });

        return csv;
    }

    static formatAsExcelXml(items, options) {
        // Excel XML format
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?mso-application progid="Excel.Sheet"?>\n';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xml += '  xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        xml += '  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
        xml += '    <Title>Wallapop Items Export</Title>\n';
        xml += '    <Author>Wallapop Expand Description</Author>\n';
        xml += '    <Created>' + new Date().toISOString() + '</Created>\n';
        xml += '  </DocumentProperties>\n';
        xml += '  <Styles>\n';
        xml += '    <Style ss:ID="Default" ss:Name="Normal">\n';
        xml += '      <Alignment ss:Vertical="Top"/>\n';
        xml += '      <Borders/>\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>\n';
        xml += '      <Interior/>\n';
        xml += '      <NumberFormat/>\n';
        xml += '      <Protection/>\n';
        xml += '    </Style>\n';
        xml += '    <Style ss:ID="Header">\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>\n';
        xml += '      <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/>\n';
        xml += '    </Style>\n';
        xml += '  </Styles>\n';
        xml += '  <Worksheet ss:Name="Wallapop Items">\n';
        xml += '    <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="' + (items.length + 1) + '" x:FullColumns="1" x:FullRows="1">\n';

        // Define columns
        const columns = ['title', 'price', 'description', 'url'];
        if (options['include-images']) {
            columns.push('images');
        }

        // Set column widths
        xml += '      <Column ss:Width="150"/>\n'; // Title
        xml += '      <Column ss:Width="80"/>\n';  // Price
        xml += '      <Column ss:Width="250"/>\n'; // Description
        xml += '      <Column ss:Width="150"/>\n'; // URL
        if (options['include-images']) {
            xml += '      <Column ss:Width="250"/>\n'; // Images
        }

        // Add headers if option is enabled
        if (options['include-headers']) {
            xml += '      <Row ss:StyleID="Header">\n';

            columns.forEach(column => {
                xml += '        <Cell><Data ss:Type="String">' + column + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        }

        // Add data rows
        items.forEach(item => {
            xml += '      <Row>\n';

            columns.forEach(column => {
                let value = '';

                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    value = item.images && item.images.length > 0
                        ? item.images.join('|')
                        : '';
                } else {
                    value = item[column] !== undefined ? String(item[column]) : '';
                }

                xml += '        <Cell><Data ss:Type="String">' + this.escapeXml(value) + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        });

        xml += '    </Table>\n';
        xml += '    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
        xml += '      <PageSetup>\n';
        xml += '        <Layout x:Orientation="Landscape"/>\n';
        xml += '        <Header x:Margin="0.3"/>\n';
        xml += '        <Footer x:Margin="0.3"/>\n';
        xml += '        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
        xml += '      </PageSetup>\n';
        xml += '      <Print>\n';
        xml += '        <ValidPrinterInfo/>\n';
        xml += '        <HorizontalResolution>600</HorizontalResolution>\n';
        xml += '        <VerticalResolution>600</VerticalResolution>\n';
        xml += '      </Print>\n';
        xml += '      <Selected/>\n';
        xml += '      <Panes>\n';
        xml += '        <Pane>\n';
        xml += '          <Number>3</Number>\n';
        xml += '          <ActiveRow>1</ActiveRow>\n';
        xml += '          <ActiveCol>0</ActiveCol>\n';
        xml += '        </Pane>\n';
        xml += '      </Panes>\n';
        xml += '      <ProtectObjects>False</ProtectObjects>\n';
        xml += '      <ProtectScenarios>False</ProtectScenarios>\n';
        xml += '    </WorksheetOptions>\n';
        xml += '  </Worksheet>\n';
        xml += '</Workbook>';

        return xml;
    }

    // Helper methods for HTML and XML escaping
    static escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static escapeXml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Create the language section
     */
    /**
     * Create the language section using Button component with CSS styling
     */
    static async createLanguageSection(container) {
        // Load saved state
        const isExpanded = await this.loadPanelState('isLanguageSectionExpanded', true);

        this.togglers.language = new SectionToggler({
            container,
            sectionClass: 'language',
            title: TranslationManager.getText('languageSettings'),
            isExpanded,
            onToggle: (state) => {
                this.savePanelState('isLanguageSectionExpanded', state);
            },
            contentCreator: (content) => {
                // Create language selector
                const languageSelector = document.createElement('div');
                languageSelector.className = 'language-selector';

                // Add language options using Button component
                Object.entries(TranslationManager.availableLanguages).forEach(([code, name]) => {
                    const isActive = code === TranslationManager.currentLanguage;

                    // Use Button component with CSS class for styling
                    const langButton = this.createButton(
                        name,
                        `lang-button ${isActive ? 'active' : ''}`,
                        () => {
                            if (TranslationManager.setLanguage(code)) {
                                // Update all language buttons' active state
                                document.querySelectorAll('.lang-button').forEach(btn => {
                                    const btnCode = btn.dataset.lang;
                                    if (btnCode === code) {
                                        btn.classList.add('active');
                                    } else {
                                        btn.classList.remove('active');
                                    }
                                });

                                // Update all text in the UI
                                this.updateUILanguage();
                                return true;
                            }
                            return false;
                        },
                        {
                            container: languageSelector,
                            preserveStyles: true // Use our custom option to preserve CSS classes
                        }
                    );

                    // Add dataset attribute for language code
                    langButton.dataset.lang = code;
                });

                content.appendChild(languageSelector);
            }
        });

        return this.togglers.language.section;
    }

    /**
     * Create the main control panel
     */
    static createControlPanel() {
        // Initialize the sidebar panel instead of draggable container
        this.sidebarPanel = new SidebarPanel({
            id: 'wallapop-tools-panel',
            title: TranslationManager.getText('wallapopTools'),
            position: 'right',
            transition: 'slide',
            buttonIcon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
            namespace: 'wallapop-enhanced',
            rememberState: true,
            content: {
                generator: () => {
                    // Create content container
                    const contentContainer = document.createElement('div');

                    // Create sections
                    this.createExpandAllSection(contentContainer);
                    this.createFilterSection(contentContainer);
                    this.createDeliveryMethodSection(contentContainer);
                    this.createReservedListingsSection(contentContainer);
                    this.createCopySection(contentContainer);
                    this.createLanguageSection(contentContainer);

                    return contentContainer;
                }
            },
            style: {
                width: '320px',
                buttonBg: '#008080', // Wallapop teal
                buttonBgHover: '#006666',
                panelBg: '#ffffff',
            },
            onOpen: () => {
                // Additional actions when panel opens
                this.updateUILanguage();
                this.loadBlockedTerms();
                this.updateReservedStatusCount();
            }
        });

        // Load initial state
        this.updateUILanguage();
        this.loadBlockedTerms();

        Logger.debug("Sidebar panel created for Wallapop Tools");
    }

    /**
     * Load blocked terms from localStorage
     */
    static loadBlockedTerms() {
        try {
            const savedTerms = localStorage.getItem('wallapop-blocked-terms');
            if (savedTerms) {
                this.blockedTerms = JSON.parse(savedTerms);
                this.updateBlockedTermsList();
                Logger.debug("Blocked terms loaded:", this.blockedTerms);
            }
        } catch (error) {
            Logger.error(error, "Loading blocked terms");
            // Initialize with empty array if there's an error
            this.blockedTerms = [];
        }
    }

    /**
     * Save blocked terms to localStorage
     */
    static saveBlockedTerms() {
        try {
            localStorage.setItem('wallapop-blocked-terms', JSON.stringify(this.blockedTerms));
            Logger.debug("Blocked terms saved to localStorage");
        } catch (error) {
            Logger.error(error, "Saving blocked terms");
        }
    }

    /**
     * Load blocked terms from localStorage
     */
    static loadBlockedTerms() {
        try {
            const savedTerms = localStorage.getItem('wallapop-blocked-terms');
            if (savedTerms) {
                this.blockedTerms = JSON.parse(savedTerms);
                this.updateBlockedTermsList();
                Logger.debug("Blocked terms loaded:", this.blockedTerms);
            }
        } catch (error) {
            Logger.error(error, "Loading blocked terms");
            // Initialize with empty array if there's an error
            this.blockedTerms = [];
        }
    }

    /**
     * Save blocked terms to localStorage
     */
    static saveBlockedTerms() {
        try {
            localStorage.setItem('wallapop-blocked-terms', JSON.stringify(this.blockedTerms));
            Logger.debug("Blocked terms saved to localStorage");
        } catch (error) {
            Logger.error(error, "Saving blocked terms");
        }
    }

    /**
     * Update the list of blocked terms in the UI
     */
    static updateBlockedTermsList() {
        if (this.blockedTermsListElement) {
            this.blockedTermsListElement.innerHTML = '';

            if (this.blockedTerms.length === 0) {
                this.renderNoBlockedTermsMessage();
            } else {
                this.renderBlockedTermsList();
            }
        }
    }

    /**
     * Render message when no terms are blocked
     */
    static renderNoBlockedTermsMessage() {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
        emptyMessage.style.fontStyle = 'italic';
        emptyMessage.style.color = '#888';
        emptyMessage.style.padding = '8px 0';
        emptyMessage.style.opacity = '0';
        this.blockedTermsListElement.appendChild(emptyMessage);

        // Fade in animation
        setTimeout(() => {
            emptyMessage.style.transition = 'opacity 0.3s ease-in-out';
            emptyMessage.style.opacity = '1';
        }, 10);
    }

    /**
     * Render the list of blocked terms
     */
    static renderBlockedTermsList() {
        this.blockedTerms.forEach((term, index) => {
            const termItem = document.createElement('div');
            termItem.className = 'blocked-term-item';
            termItem.style.opacity = '0';
            termItem.style.transform = 'translateY(-10px)';

            const termText = document.createElement('span');
            termText.textContent = term;
            termItem.appendChild(termText);

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-term';
            removeButton.textContent = '×';
            removeButton.title = TranslationManager.getText('remove');
            removeButton.addEventListener('click', () => {
                termItem.classList.add('fadeOutAnimation');
                setTimeout(() => this.removeBlockedTerm(term), 300);
            });
            termItem.appendChild(removeButton);

            this.blockedTermsListElement.appendChild(termItem);

            // Staggered fade in animation
            setTimeout(() => {
                termItem.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
                termItem.style.opacity = '1';
                termItem.style.transform = 'translateY(0)';
            }, 50 * index);
        });
    }

    /**
     * Apply all filters including keywords, delivery method, and reserved status
     * Modified to include the reserved filter
     */
    static applyFilters() {
        Logger.debug("Applying all filters to listings");

        const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
        const allListings = document.querySelectorAll(allSelectors);

        let hiddenCount = 0;

        allListings.forEach(async listing => {
            const hideByKeyword = this.shouldHideListing(listing);
            const hideByDelivery = this.shouldHideByDeliveryMethod(listing);
            const hideByReserved = await this.loadPanelState('hideReservedListings', true) &&
                this.isReservedListing(listing);

            if (hideByKeyword || hideByDelivery || hideByReserved) {
                this.hideListing(listing);
                hiddenCount++;

                // Mark appropriately for later filter toggling
                if (hideByReserved) {
                    listing.dataset.reservedHidden = 'true';
                }
            } else {
                this.showListing(listing);
            }
        });

        Logger.debug(`All filters applied: ${hiddenCount} listings hidden out of ${allListings.length}`);

        // Update reserved status count
        this.updateReservedStatusCount();
    }

    /**
     * Update the count of hidden reserved listings
     */
    static async updateReservedStatusCount() {
        if (!this.reservedStatusElement) return;

        // Only count if the filter is active
        if (!(await this.loadPanelState('hideReservedListings', true))) {
            this.reservedStatusElement.textContent = '';
            return;
        }

        // Count listings with the reserved-hidden dataset flag
        const count = document.querySelectorAll('[data-reserved-hidden="true"]').length;

        this.reservedStatusElement.textContent = TranslationManager.getText(
            'reservedListingsFound', {count: count}
        );
    }

    /**
     * Update panel visibility based on whether there are expanded descriptions
     */
    static updatePanelVisibility() {
        const copySection = document.querySelector('.userscripts-section.export');
        if (copySection) {
            copySection.style.display =
                DescriptionManager.expandedItems.length > 0 ? 'block' : 'none';
        }
    }

    /**
     * Show success animation on a button
     */
    static showCopySuccess(button, successText) {
        const originalText = button.textContent;
        button.textContent = successText || TranslationManager.getText('copied');
        button.classList.add('copy-success');

        setTimeout(() => {
            button.classList.remove('copy-success');
            button.textContent = originalText;
        }, 1500);
    }

    /**
     * Determine if a listing should be hidden based on blocked terms
     */
    static shouldHideListing(listing) {
        if (this.blockedTerms.length === 0) {
            return false;
        }

        // Get all text content from the listing
        const listingText = listing.textContent.toLowerCase();

        // Check if any blocked term is in the listing
        return this.blockedTerms.some(term => listingText.includes(term.toLowerCase()));
    }

    /**
     * Hide a listing with animation
     */
    static hideListing(listing) {
        if (!listing.classList.contains('hidden-item')) {
            listing.classList.add('hiding-animation');
            setTimeout(() => {
                listing.classList.add('hidden-item');
                listing.classList.remove('hiding-animation');
            }, 500);
        }
    }

    /**
     * Show a previously hidden listing with animation
     */
    static showListing(listing) {
        if (listing.classList.contains('hidden-item')) {
            listing.classList.remove('hidden-item');
            listing.style.opacity = 0;
            listing.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                listing.style.transition = 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out';
                listing.style.opacity = 1;
                listing.style.transform = 'translateY(0)';

                // Clean up after animation
                setTimeout(() => {
                    listing.style.transition = '';
                }, 500);
            }, 10);
        }
    }

    /**
     * Add a blocked term from the input field
     */
    static addBlockedTerm() {
        const term = this.filterInputElement.value.trim().toLowerCase();

        if (term && !this.blockedTerms.includes(term)) {
            this.blockedTerms.push(term);
            this.saveBlockedTerms();
            this.updateBlockedTermsList();
            this.filterInputElement.value = '';

            // Re-apply filters to all listings
            this.applyFilters();

            Logger.debug("Blocked term added:", term);
        }
    }

    /**
     * Remove a blocked term
     */
    static removeBlockedTerm(term) {
        const index = this.blockedTerms.indexOf(term);
        if (index > -1) {
            this.blockedTerms.splice(index, 1);
            this.saveBlockedTerms();
            this.updateBlockedTermsList();

            // Re-apply filters to all listings
            this.applyFilters();

            Logger.debug("Blocked term removed:", term);
        }
    }

    /**
     * Save a specific panel state to localStorage
     */
    static async savePanelState(key, value) { // Made async
        try {
            await GMFunctions.setValue(key, value); // Use await and GMFunctions.setValue
            Logger.debug('Panel state saved', {key, value});
        } catch (error) {
            Logger.error('Error saving panel state:', error, {key});
        }
    }

    /**
     * Load a specific panel state from localStorage
     */
    static async loadPanelState(key, defaultValue) { // Made async
        try {
            const value = await GMFunctions.getValue(key, defaultValue); // Use await and GMFunctions.getValue
            Logger.debug('Panel state loaded', {key, value});
            return value;
        } catch (error) {
            Logger.error('Error loading panel state:', error, {key});
            return defaultValue;
        }
    }

    /**
     * Save all panel states at once
     */
    static savePanelStates() { // This calls savePanelState, so it also needs to be async if savePanelState is awaited
        const states = {};

        // Get states from all togglers
        for (const [key, toggler] of Object.entries(this.togglers)) {
            if (toggler) {
                states[`is${key.charAt(0).toUpperCase() + key.slice(1)}SectionExpanded`] = toggler.getState();
            }
        }

        try {
            localStorage.setItem('wallapop-panel-states', JSON.stringify(states));
            Logger.debug("All panel states saved");
        } catch (error) {
            Logger.error(error, "Saving all panel states");
        }
    }

    // Other methods remain the same
    // ... (all the other methods that don't involve toggling)

    // Only including a few key methods to show the pattern:

    /**
     * Position dropdown based on available space
     */
    static positionDropdown() {
        const dropdownContent = this.container.querySelector('.dropdown-content');
        const dropdownButton = this.container.querySelector('.copy-dropdown .panel-button');

        // Reset position classes
        dropdownContent.classList.remove('top');

        // Check if dropdown would go out of viewport at the bottom
        const viewportHeight = window.innerHeight;
        const buttonRect = dropdownButton.getBoundingClientRect();
        const dropdownHeight = 82; // Approximate height of dropdown when expanded

        // If not enough space below, position above
        if (viewportHeight - buttonRect.bottom < dropdownHeight) {
            dropdownContent.classList.add('top');
        }
    }

    /**
     * Update UI text for all elements based on selected language
     */
    static updateUILanguage() {
        if (!this.container) return;

        // Helper function to update text of elements matching a selector
        const updateText = (selector, translationKey) => {
            const element = this.container.querySelector(selector);
            if (element) {
                element.textContent = TranslationManager.getText(translationKey);
            }
        };

        // Update panel title
        updateText('.userscripts-section--main-panel div:first-child', 'wallapopTools');

        // Update section titles
        updateText('.filter-section .section-title span:first-child', 'filterUnwantedWords');
        updateText('.delivery-method-section .section-title span:first-child', 'deliveryMethodFilter');
        updateText('.copy-section .section-title span:first-child', 'copyDescriptions');
        updateText('.language-section .section-title span:first-child', 'languageSettings');

        // Update delivery method options
        updateText('.delivery-options label[for="delivery-option-all"]', 'showAll');
        updateText('.delivery-options label[for="delivery-option-shipping"]', 'showOnlyShipping');
        updateText('.delivery-options label[for="delivery-option-inperson"]', 'showOnlyInPerson');

        // Update filter section
        if (this.filterInputElement) {
            this.filterInputElement.placeholder = TranslationManager.getText('example');
        }
        updateText('.filter-apply', 'addAndApply');

        // Update empty message if visible
        const emptyMessage = this.container.querySelector('.blocked-terms-list div[style*="italic"]');
        if (emptyMessage) {
            emptyMessage.textContent = TranslationManager.getText('noWordsToFilter');
        }

        // Update copy section buttons
        updateText('.copy-json', 'copyAsJSON');
        updateText('.copy-csv', 'copyAsCSV');
        updateText('.dropdown-content button:first-child', 'withHeaders');
        updateText('.dropdown-content button:last-child', 'withoutHeaders');
        updateText('.copy-clear', 'clearAll');

        if (this.togglers.reservedListings) {
            const titleElement = this.togglers.reservedListings.sectionElement.querySelector('.userscripts-section__title');
            if (titleElement) {
                titleElement.textContent = TranslationManager.getText('reservedListingsFilter');
            }

            // Update checkbox label
            if (this.hideReservedCheckbox) {
                this.hideReservedCheckbox.setLabel(TranslationManager.getText('hideReservedListings'));
            }

            // Update status element
            this.updateReservedStatusCount();
        }

        // Update all expand buttons on the page
        document.querySelectorAll(SELECTORS.EXPAND_BUTTON).forEach(button => {
            if (!button.textContent.includes('...')) {
                if (button.textContent.includes('Hide')) {
                    button.textContent = TranslationManager.getText('hideDescription');
                } else {
                    button.textContent = TranslationManager.getText('expandDescription');
                }
            }
        });
    }

    /**
     * Download a file with the given data and name
     * @param {String} data - The file content to download
     * @param {String} filename - The filename to use
     * @param {String} mimeType - The MIME type of the file
     */
    static downloadFile(data, filename, mimeType) {
        try {
            // Convert data to blob for binary formats
            const blob = new Blob([data], {type: mimeType});
            const url = URL.createObjectURL(blob);

            // Use GM_download (our implementation will fall back to the simple method if needed)
            GM_download({
                url: url,
                name: filename,
                saveAs: true,
                onload: () => URL.revokeObjectURL(url),
                onerror: (error) => {
                    Logger.error(error, "GM_download");
                    // If GM_download fails, try fallback (shouldn't be needed with our polyfill, but just in case)
                    this.fallbackDownload(data, filename, mimeType);
                }
            });
        } catch (error) {
            Logger.error(error, "Downloading file");
            this.fallbackDownload(data, filename, mimeType);
        }
    }

    /**
     * Fallback download method using a data URL and click event
     */
    static fallbackDownload(data, filename, mimeType) {
        try {
            const blob = new Blob([data], {type: mimeType});
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.style.display = 'none';

            document.body.appendChild(downloadLink);
            downloadLink.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            Logger.error(error, "Fallback download");
            alert("Download failed. Please try copying to clipboard instead.");
        }
    }

    /**
     * Get the appropriate file extension and MIME type for the format
     * @param {String} formatId - The format ID
     * @returns {Object} Object with extension and mimeType properties
     */
    static getFileInfo(formatId) {
        const fileInfo = {
            // Text formats
            'plain': {extension: 'txt', mimeType: 'text/plain'},
            'markdown': {extension: 'md', mimeType: 'text/markdown'},
            'html': {extension: 'html', mimeType: 'text/html'},

            // Data formats
            'json': {extension: 'json', mimeType: 'application/json'},
            'csv': {extension: 'csv', mimeType: 'text/csv'},
            'tsv': {extension: 'tsv', mimeType: 'text/tab-separated-values'},
            'xml': {extension: 'xml', mimeType: 'application/xml'},

            // Spreadsheet formats
            'excel-csv': {extension: 'csv', mimeType: 'text/csv'},
            'excel-xml': {extension: 'xml', mimeType: 'application/xml'}
        };

        return fileInfo[formatId] || {extension: 'txt', mimeType: 'text/plain'};
    }
}

// Script initialization
Logger.debug("Script loaded, waiting for page to be ready");
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WallapopExpandDescription.init.bind(WallapopExpandDescription));
    Logger.debug("Added DOMContentLoaded event listener");
} else {
    Logger.debug("Document already loaded, initializing script immediately");
    WallapopExpandDescription.init();
}
