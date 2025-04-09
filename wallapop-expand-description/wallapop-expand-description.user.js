// ==UserScript==
// @id           wallapop-expand-description@https://github.com/baturkacamak/userscripts
// @name         Wallapop Expand Description
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.4.2
// @description  Add expand button to show formatted item descriptions on Wallapop listings with copy functionality
// @author       Batur Kacamak
// @copyright    2024+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/wallapop-expand-description#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/wallapop-expand-description#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/wallapop-expand-description/wallapop-expand-description.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/wallapop-expand-description/wallapop-expand-description.user.js
// @match        https://*.wallapop.com/*
// @icon         https://es.wallapop.com/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// ==/UserScript==

// GM function fallbacks for direct browser execution
if (typeof GM_addStyle === 'undefined') {
    window.GM_addStyle = function (css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    };
}

if (typeof GM_xmlhttpRequest === 'undefined') {
    window.GM_xmlhttpRequest = function (details) {
        const xhr = new XMLHttpRequest();
        xhr.open(details.method, details.url);

        if (details.headers) {
            Object.keys(details.headers).forEach(key => {
                xhr.setRequestHeader(key, details.headers[key]);
            });
        }

        xhr.onload = function () {
            if (details.onload) {
                details.onload({
                    responseText: xhr.responseText,
                    response: xhr.response,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    readyState: xhr.readyState
                });
            }
        };

        xhr.onerror = function () {
            if (details.onerror) {
                details.onerror(xhr);
            }
        };

        xhr.send(details.data);
        return xhr;
    };
}

if (typeof GM_setClipboard === 'undefined') {
    window.GM_setClipboard = function (text) {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;

        // Make the textarea not visible
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.select();

        // Try to copy the text
        let success = false;
        try {
            success = document.execCommand('copy');
            console.log('Clipboard copy ' + (success ? 'successful' : 'unsuccessful'));
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }

        // Clean up
        document.body.removeChild(textarea);
        return success;
    };
}

const SELECTORS = {
    ITEM_CARDS: [
        'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
        '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
        '[class^="feed_Feed__item__"] a[href^="/item/"]',
    ],
    ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
    EXPAND_BUTTON: '.expand-button',
    COPY_BUTTONS_CONTAINER: '.copy-buttons-container',
    FILTER_PANEL: '.filter-panel',
    FILTER_INPUT: '.filter-input',
    FILTER_APPLY: '.filter-apply',
    BLOCKED_TERMS_LIST: '.blocked-terms-list'
};

class Logger {
    static DEBUG = true;

    static log(...args) {
        if (this.DEBUG) {
            console.log("Wallapop Expand Description Debug:", ...args);
        }
    }

    static error(error, context) {
        console.error(`Wallapop Expand Description Error (${context}):`, error);
    }

    static logHtml(title, htmlContent) {
        if (this.DEBUG) {
            console.log(`Wallapop Expand Description [${title}]:`);
            console.log(htmlContent.substring(0, 1500) + "...");

            // HTML'i daha rahat inceleyebilmek için konsol içinde genişletilebilir obje olarak da gösterelim
            console.groupCollapsed(`HTML Detayları (${title})`);
            console.log("Tam HTML:", htmlContent);
            console.groupEnd();
        }
    }

    static toggleDebug() {
        this.DEBUG = !this.DEBUG;
        console.log(`Wallapop Expand Description: Debug mode ${this.DEBUG ? 'enabled' : 'disabled'}`);
        return this.DEBUG;
    }
}

class StyleManager {
    static addStyles() {
        GM_addStyle(`
            /* Animation variables */
            :root {
                --transition-speed: 0.3s;
                --transition-easing: ease-in-out;
            }

            ${SELECTORS.EXPAND_BUTTON} {
                background: none;
                border: none;
                color: #008080;
                cursor: pointer;
                padding: 5px;
                font-size: 12px;
                text-decoration: underline;
                transition: opacity var(--transition-speed) var(--transition-easing);
            }

            .description-content {
                max-height: 0;
                overflow: hidden;
                padding: 0 10px;
                background-color: #f0f0f0;
                border-radius: 5px;
                margin-top: 5px;
                font-size: 14px;
                white-space: pre-wrap;
                word-wrap: break-word;
                transition: max-height var(--transition-speed) var(--transition-easing),
                            padding var(--transition-speed) var(--transition-easing);
            }

            .description-content.expanded {
                max-height: 1000px; /* Adjust based on expected content height */
                padding: 10px;
                transition: max-height 0.5s var(--transition-easing),
                            padding var(--transition-speed) var(--transition-easing);
            }

            .error-message {
                color: #ff0000;
                font-style: italic;
            }

            /* Copy button styles */
            ${SELECTORS.COPY_BUTTONS_CONTAINER} {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                padding: 10px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity var(--transition-speed) var(--transition-easing),
                            transform var(--transition-speed) var(--transition-easing);
                pointer-events: none;
            }

            ${SELECTORS.COPY_BUTTONS_CONTAINER}.visible {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }

            .copy-button {
                display: block;
                background-color: #008080;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                width: 100%;
                text-align: left;
                transition: background-color var(--transition-speed) var(--transition-easing);
            }

            .copy-button:hover {
                background-color: #006666;
            }

            .copy-success {
                background-color: #4CAF50;
                transition: background-color var(--transition-speed) var(--transition-easing);
            }

            .copy-dropdown {
                position: relative;
                display: inline-block;
                width: 100%;
            }

.dropdown-content {
    display: block;
    position: absolute;
    background-color: #f1f1f1;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
    right: 0;
    margin-top: 2px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height var(--transition-speed) var(--transition-easing),
                opacity var(--transition-speed) var(--transition-easing);
    pointer-events: none;
}

.dropdown-content.top {
    bottom: 100%;
    margin-top: 0;
    margin-bottom: 2px;
}

            .copy-dropdown:hover .dropdown-content {
                max-height: 200px;
                opacity: 1;
                pointer-events: auto;
            }

            .dropdown-content button {
                color: black;
                padding: 12px 16px;
                text-decoration: none;
                display: block;
                background: none;
                border: none;
                width: 100%;
                text-align: left;
                cursor: pointer;
                transition: background-color var(--transition-speed) var(--transition-easing);
            }

            .dropdown-content button:hover {
                background-color: #ddd;
            }

            /* Filter panel styles */
            ${SELECTORS.FILTER_PANEL} {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                padding: 15px;
                z-index: 9999;
                width: 250px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .filter-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
                color: #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .filter-toggle {
                cursor: pointer;
                user-select: none;
                color: #008080;
                transition: transform 0.3s var(--transition-easing);
            }

            .filter-content {
                max-height: 500px;
                overflow: hidden;
                opacity: 1;
                transition: max-height var(--transition-speed) var(--transition-easing),
                            opacity var(--transition-speed) var(--transition-easing);
            }

            .filter-content.collapsed {
                max-height: 0;
                opacity: 0;
            }

            ${SELECTORS.FILTER_INPUT} {
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                width: 100%;
                box-sizing: border-box;
                transition: border-color var(--transition-speed) var(--transition-easing);
            }

            ${SELECTORS.FILTER_INPUT}:focus {
                border-color: #008080;
                outline: none;
            }

            ${SELECTORS.FILTER_APPLY} {
                background-color: #008080;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                width: 100%;
                text-align: center;
                transition: background-color var(--transition-speed) var(--transition-easing);
            }

            ${SELECTORS.FILTER_APPLY}:hover {
                background-color: #006666;
            }

            ${SELECTORS.BLOCKED_TERMS_LIST} {
                max-height: 150px;
                overflow-y: auto;
                margin-top: 10px;
            }

            .blocked-term-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background-color: #f0f0f0;
                border-radius: 4px;
                margin-bottom: 5px;
                animation: fadeIn 0.3s ease-in-out;
            }

            .remove-term {
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                font-weight: bold;
                font-size: 16px;
                transition: transform var(--transition-speed) var(--transition-easing),
                            color var(--transition-speed) var(--transition-easing);
            }

            .remove-term:hover {
                transform: scale(1.2);
                color: #ff4040;
            }

            /* Animations */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }

            .fadeOutAnimation {
                animation: fadeOut 0.3s ease-in-out forwards;
            }

            .hidden-item {
                display: none !important;
            }

            .hiding-animation {
                animation: fadeOut 0.5s ease-in-out forwards;
            }
        `);
    }
}

class HTMLUtils {
    static escapeHTML(str) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return str.replace(/[&<>'"]/g, tag => escapeMap[tag] || tag);
    }
}

// Filter manager class for handling keyword filtering
class FilterManager {
    static blockedTerms = [];
    static container = null;
    static filterInputElement = null;
    static blockedTermsListElement = null;
    static isExpanded = true;

    static createFilterPanel() {
        // Create filter panel if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = SELECTORS.FILTER_PANEL.slice(1); // Remove the leading dot

            // Create header with expand/collapse toggle
            const titleDiv = document.createElement('div');
            titleDiv.className = 'filter-title';
            titleDiv.innerHTML = '<span>İstenmeyen Kelimeleri Filtrele</span><span class="filter-toggle">▼</span>';
            this.container.appendChild(titleDiv);

            // Add toggle functionality
            const toggleElement = titleDiv.querySelector('.filter-toggle');
            toggleElement.addEventListener('click', () => this.togglePanel());

            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'filter-content';

            // Create input for blocked terms
            this.filterInputElement = document.createElement('input');
            this.filterInputElement.className = SELECTORS.FILTER_INPUT.slice(1);
            this.filterInputElement.placeholder = 'Örn: mac, apple, macbook...';
            contentContainer.appendChild(this.filterInputElement);

            // Create apply button
            const applyButton = document.createElement('button');
            applyButton.className = SELECTORS.FILTER_APPLY.slice(1);
            applyButton.textContent = 'Ekle ve Uygula';
            applyButton.addEventListener('click', () => this.addBlockedTerm());
            contentContainer.appendChild(applyButton);

            // Add enter key listener for input
            this.filterInputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addBlockedTerm();
                }
            });

            // Create list for showing blocked terms
            this.blockedTermsListElement = document.createElement('div');
            this.blockedTermsListElement.className = SELECTORS.BLOCKED_TERMS_LIST.slice(1);
            contentContainer.appendChild(this.blockedTermsListElement);

            this.container.appendChild(contentContainer);
            document.body.appendChild(this.container);

            // Load saved blocked terms
            this.loadBlockedTerms();

            Logger.log("Filter panel created");
        }
    }

    static togglePanel() {
        const contentDiv = this.container.querySelector('.filter-content');
        const toggleElement = this.container.querySelector('.filter-toggle');

        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            contentDiv.classList.remove('collapsed');
            toggleElement.style.transform = 'rotate(0deg)';
            toggleElement.textContent = '▼';
        } else {
            contentDiv.classList.add('collapsed');
            toggleElement.style.transform = 'rotate(-90deg)';
            toggleElement.textContent = '▼';
        }
    }

    static addBlockedTerm() {
        const term = this.filterInputElement.value.trim().toLowerCase();

        if (term && !this.blockedTerms.includes(term)) {
            this.blockedTerms.push(term);
            this.saveBlockedTerms();
            this.updateBlockedTermsList();
            this.filterInputElement.value = '';

            // Re-apply filters to all listings
            this.applyFilters();

            Logger.log("Blocked term added:", term);
        }
    }

    static removeBlockedTerm(term) {
        const index = this.blockedTerms.indexOf(term);
        if (index > -1) {
            this.blockedTerms.splice(index, 1);
            this.saveBlockedTerms();
            this.updateBlockedTermsList();

            // Re-apply filters to all listings
            this.applyFilters();

            Logger.log("Blocked term removed:", term);
        }
    }

    static updateBlockedTermsList() {
        if (this.blockedTermsListElement) {
            this.blockedTermsListElement.innerHTML = '';

            if (this.blockedTerms.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.textContent = 'Filtrelenecek kelime yok';
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
            } else {
                this.blockedTerms.forEach(term => {
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
                    removeButton.title = 'Kaldır';
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
                    }, 50 * this.blockedTerms.indexOf(term));
                });
            }
        }
    }

    static saveBlockedTerms() {
        try {
            localStorage.setItem('wallapop-blocked-terms', JSON.stringify(this.blockedTerms));
            Logger.log("Blocked terms saved to localStorage");
        } catch (error) {
            Logger.error(error, "Saving blocked terms");
        }
    }

    static loadBlockedTerms() {
        try {
            const savedTerms = localStorage.getItem('wallapop-blocked-terms');
            if (savedTerms) {
                this.blockedTerms = JSON.parse(savedTerms);
                this.updateBlockedTermsList();
                Logger.log("Blocked terms loaded:", this.blockedTerms);
            }
        } catch (error) {
            Logger.error(error, "Loading blocked terms");
        }
    }

    static shouldHideListing(listing) {
        if (this.blockedTerms.length === 0) {
            return false;
        }

        // Get all text content from the listing
        const listingText = listing.textContent.toLowerCase();

        // Check if any blocked term is in the listing
        return this.blockedTerms.some(term => listingText.includes(term.toLowerCase()));
    }

    static applyFilters() {
        Logger.log("Applying filters to listings");

        const allSelectors = SELECTORS.ITEM_CARDS.join(', ');
        const allListings = document.querySelectorAll(allSelectors);

        let hiddenCount = 0;

        allListings.forEach(listing => {
            if (this.shouldHideListing(listing)) {
                // Animate the hiding process
                if (!listing.classList.contains('hidden-item')) {
                    listing.classList.add('hiding-animation');
                    setTimeout(() => {
                        listing.classList.add('hidden-item');
                        listing.classList.remove('hiding-animation');
                    }, 500);
                }
                hiddenCount++;
            } else {
                // Show previously hidden items with animation
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
        });

        Logger.log(`Filter applied: ${hiddenCount} listings hidden out of ${allListings.length}`);
    }
}

class DescriptionFetcher {
    static async getDescription(url) {
        Logger.log("Fetching description for URL:", url);
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
            Logger.log("Response received with status:", response.status);

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // Find the __NEXT_DATA__ script tag
            const nextDataScript = doc.querySelector('#__NEXT_DATA__');

            if (nextDataScript) {
                Logger.log("Found __NEXT_DATA__ script tag");

                try {
                    // Parse the JSON content
                    const jsonData = JSON.parse(nextDataScript.textContent);
                    Logger.log("JSON data parsed successfully");

                    // Extract the item description and title
                    let itemData = {};
                    if (jsonData.props?.pageProps?.item) {
                        const item = jsonData.props.pageProps.item;

                        // Get title
                        itemData.title = item.title?.original.trim() || "";

                        // Get description
                        if (item.description?.original) {
                            const description = item.description.original;
                            Logger.log("Description extracted from JSON:", description);

                            // Get the part before tag indicators like "No leer"
                            const cleanDescription = this.cleanDescription(description);
                            itemData.description = cleanDescription;

                            // Get the URL
                            itemData.url = originalUrl;

                            // Get price if available
                            itemData.price = item.price ? `${item.price.cash.amount} ${item.price.cash.currency}` : "";

                            resolve({success: true, data: itemData});
                        } else {
                            Logger.log("Description not found in JSON structure:", jsonData);
                            throw new Error("Description not found in JSON data");
                        }
                    } else {
                        Logger.log("Item data not found in JSON structure:", jsonData);
                        throw new Error("Item not found in JSON data");
                    }
                } catch (jsonError) {
                    Logger.error(jsonError, "Parsing JSON data");
                    throw jsonError;
                }
            } else {
                Logger.log("__NEXT_DATA__ script tag not found, trying old method");

                // Fall back to old method (for compatibility)
                const descriptionElement = doc.querySelector(SELECTORS.ITEM_DESCRIPTION);
                if (descriptionElement) {
                    const description = descriptionElement.querySelector(".mt-2")?.innerHTML.trim();
                    if (description) {
                        Logger.log("Description found using old method");

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
    static cleanDescription(description) {
        // Look for tag indicators like "No leer"
        const tagMarkers = [
            "\n\n\n\n\n\n\nNo leer\n",
            "\n\n\n\n\nNo leer\n",
            "\nNo leer\n",
            "\n\nNo leer\n",
            "No leer",
            "tags:",
            "etiquetas:",
            "keywords:"
        ];

        // Check each marker and split at the first one found
        let cleanDesc = description;

        for (const marker of tagMarkers) {
            if (description.includes(marker)) {
                Logger.log(`Found tag marker: "${marker}"`);
                cleanDesc = description.split(marker)[0].trim();
                break;
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
        Logger.log("Item added to description manager:", itemData.title);
        Logger.log("Total items:", this.expandedItems.length);

        // Show copy buttons if not already visible
        CopyButtonsManager.showCopyButtons();
    }

    static removeItem(url) {
        const index = this.expandedItems.findIndex(item => item.url === url);
        if (index >= 0) {
            this.expandedItems.splice(index, 1);
            Logger.log("Item removed from description manager:", url);
            Logger.log("Total items:", this.expandedItems.length);

            // Hide copy buttons if no items left
            if (this.expandedItems.length === 0) {
                CopyButtonsManager.hideCopyButtons();
            }
        }
    }

    static clearItems() {
        this.expandedItems = [];
        Logger.log("All items cleared from description manager");
        CopyButtonsManager.hideCopyButtons();
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
        Logger.log("Creating expand button for URL:", this.url);
        this.button = document.createElement('button');
        this.button.textContent = 'Expand Description';
        this.button.className = SELECTORS.EXPAND_BUTTON.slice(1); // Remove the leading dot

        this.descriptionContent = document.createElement('div');
        this.descriptionContent.className = 'description-content';

        this.button.addEventListener('click', this.handleClick.bind(this));

        const container = document.createElement('div');
        container.appendChild(this.button);
        container.appendChild(this.descriptionContent);

        this.anchorElement.appendChild(container);
        Logger.log("Expand button added for URL:", this.url);
    }

    async handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        Logger.log("Expand button clicked for URL:", this.url);
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
        this.button.textContent = 'Loading...';
        const result = await DescriptionFetcher.getDescription(this.url);
        if (result.success) {
            this.itemData = result.data;
            this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data.description);
            // Use the class toggle approach for smooth transition
            this.descriptionContent.classList.add('expanded');
            this.button.textContent = 'Hide Description';
            this.expanded = true;

            // Add to global description manager
            DescriptionManager.addItem(this.itemData);

            Logger.log("Description expanded for URL:", this.url);
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

        this.button.textContent = 'Expand Description';
        this.expanded = false;

        // Remove from global description manager
        if (this.itemData) {
            DescriptionManager.removeItem(this.url);
        }

        Logger.log("Description hidden for URL:", this.url);
    }

    showError(message) {
        this.descriptionContent.innerHTML = `<span class="error-message">${message}</span>`;
        this.descriptionContent.classList.add('expanded');
        this.button.textContent = 'Expand Description';
        this.expanded = false;
        Logger.log("Error displaying description for URL:", this.url, message);
    }
}

// Copy buttons manager
class CopyButtonsManager {
    static container = null;

    static createCopyButtons() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = SELECTORS.COPY_BUTTONS_CONTAINER.slice(1); // Remove the leading dot

            // Create JSON copy button
            const jsonButton = document.createElement('button');
            jsonButton.className = 'copy-button';
            jsonButton.textContent = 'Copy as JSON';
            jsonButton.addEventListener('click', () => this.copyToClipboard('json'));
            this.container.appendChild(jsonButton);

            // Create CSV dropdown
            const csvDropdown = document.createElement('div');
            csvDropdown.className = 'copy-dropdown';

            const csvButton = document.createElement('button');
            csvButton.className = 'copy-button';
            csvButton.textContent = 'Copy as CSV';
            csvDropdown.appendChild(csvButton);

            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'dropdown-content';

            csvButton.addEventListener('mouseenter', () => this.positionDropdown());
            csvDropdown.addEventListener('mouseenter', () => this.positionDropdown());

            const csvWithHeadersButton = document.createElement('button');
            csvWithHeadersButton.textContent = 'With Headers';
            csvWithHeadersButton.addEventListener('click', () => this.copyToClipboard('csv', true));
            dropdownContent.appendChild(csvWithHeadersButton);

            const csvWithoutHeadersButton = document.createElement('button');
            csvWithoutHeadersButton.textContent = 'Without Headers';
            csvWithoutHeadersButton.addEventListener('click', () => this.copyToClipboard('csv', false));
            dropdownContent.appendChild(csvWithoutHeadersButton);

            csvDropdown.appendChild(dropdownContent);
            this.container.appendChild(csvDropdown);

            // Create clear button
            const clearButton = document.createElement('button');
            clearButton.className = 'copy-button';
            clearButton.textContent = 'Clear All';
            clearButton.addEventListener('click', () => {
                DescriptionManager.clearItems();
                this.showCopySuccess(clearButton, 'Cleared!');
            });
            this.container.appendChild(clearButton);

            document.body.appendChild(this.container);
            Logger.log("Copy buttons created");
        }
    }

    static positionDropdown() {
        const dropdownContent = this.container.querySelector('.dropdown-content');
        const dropdownButton = this.container.querySelector('.copy-dropdown .copy-button');

        // Reset position classes
        dropdownContent.classList.remove('top');

        // Get position info
        const rect = dropdownContent.getBoundingClientRect();
        const buttonRect = dropdownButton.getBoundingClientRect();

        // Check if dropdown would go out of viewport at the bottom
        const viewportHeight = window.innerHeight;
        const bottomSpace = viewportHeight - buttonRect.bottom;
        const dropdownHeight = 82; // Approximate height of dropdown when expanded

        // If not enough space below, position above
        if (bottomSpace < dropdownHeight) {
            dropdownContent.classList.add('top');
        }
    }


    static showCopyButtons() {
        if (!this.container) {
            this.createCopyButtons();
        }
        // Use the visible class for smooth transition
        this.container.classList.add('visible');
    }

    static hideCopyButtons() {
        if (this.container) {
            // Remove visible class for smooth transition
            this.container.classList.remove('visible');
        }
    }

    static copyToClipboard(format, includeHeaders = true) {
        let content = '';
        let button = this.container.querySelector('.copy-button');

        if (format === 'json') {
            content = DescriptionManager.getItemsAsJson();
            button = this.container.querySelector('.copy-button:first-child');
        } else if (format === 'csv') {
            content = DescriptionManager.getItemsAsCsv(includeHeaders);
            button = this.container.querySelector('.copy-dropdown .copy-button');
        }

        if (content) {
            // Use GM_setClipboard to copy to clipboard
            GM_setClipboard(content);
            this.showCopySuccess(button, 'Copied!');
            Logger.log(`Copied to clipboard in ${format} format`);
        } else {
            this.showCopySuccess(button, 'Nothing to copy!', false);
            Logger.log("Nothing to copy");
        }
    }

    static showCopySuccess(button, message, success = true) {
        const originalText = button.textContent;
        button.textContent = message;

        if (success) {
            button.classList.add('copy-success');
        }

        setTimeout(() => {
            button.textContent = originalText;
            if (success) {
                button.classList.remove('copy-success');
            }
        }, 1500);
    }
}

class ListingManager {
    static addExpandButtonsToListings() {
        Logger.log("Adding expand buttons to listings");
        let totalListings = 0;

        SELECTORS.ITEM_CARDS.forEach(selector => {
            const listings = document.querySelectorAll(selector);
            totalListings += listings.length;
            Logger.log(`Found ${listings.length} items for selector: ${selector}`);

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
                        Logger.log("No valid href found for a listing");
                    }
                } catch (error) {
                    Logger.error(error, "Processing individual listing");
                }
            });
        });

        Logger.log("Total listings processed:", totalListings);
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
        Logger.log("MutationObserver and popstate listener set up");
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
                    Logger.log("New ItemCards detected, adding expand buttons");
                    ListingManager.addExpandButtonsToListings();

                    // Apply filters to new listings
                    FilterManager.applyFilters();
                }
            }
        }
        this.checkUrlChange();
    }

    checkUrlChange() {
        if (this.lastUrl !== location.href) {
            Logger.log("URL changed:", location.href);
            this.lastUrl = location.href;
            this.handleUrlChange();
        }
    }

    handleUrlChange() {
        Logger.log("Handling URL change");
        setTimeout(() => {
            ListingManager.addExpandButtonsToListings();
            // Apply filters after URL change
            FilterManager.applyFilters();
        }, 1000); // Delay to allow for dynamic content to load
    }
}

class WallapopExpandDescription {
    static async init() {
        Logger.log("Initializing script");
        StyleManager.addStyles();

        // Create copy buttons container (hidden initially)
        CopyButtonsManager.createCopyButtons();

        // Create filter panel
        FilterManager.createFilterPanel();

        await this.waitForElements(SELECTORS.ITEM_CARDS);
        ListingManager.addExpandButtonsToListings();

        // Apply filters to initial listings
        FilterManager.applyFilters();

        new DOMObserver().observe();
    }

    static waitForElements(selectors, timeout = 10000) {
        Logger.log("Waiting for elements:", selectors);
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElements() {
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        Logger.log("Elements found:", selector, elements.length);
                        resolve(elements);
                        return;
                    }
                }

                if (Date.now() - startTime > timeout) {
                    Logger.log("Timeout waiting for elements");
                    reject(new Error(`Timeout waiting for elements`));
                } else {
                    requestAnimationFrame(checkElements);
                }
            }

            checkElements();
        });
    }
}

// Script initialization
Logger.log("Script loaded, waiting for page to be ready");
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WallapopExpandDescription.init.bind(WallapopExpandDescription));
    Logger.log("Added DOMContentLoaded event listener");
} else {
    Logger.log("Document already loaded, initializing script immediately");
    WallapopExpandDescription.init();
}
