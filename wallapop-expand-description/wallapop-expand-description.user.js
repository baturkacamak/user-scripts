// ==UserScript==
// @id           wallapop-expand-description@https://github.com/baturkacamak/userscripts
// @name         Wallapop Expand Description
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.1
// @description  Add expand button to show formatted item descriptions on Wallapop listings
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
// ==/UserScript==

const SELECTORS = {
    ITEM_CARDS: [
        'a.ItemCardList__item[href^="https://es.wallapop.com/item/"]',
        '[class^="experimentator-layout-slider_ExperimentatorSliderLayout__item"] a[href^="/item/"]',
        '[class^="feed_Feed__item__"] a[href^="/item/"]',
    ],
    ITEM_DESCRIPTION: '[class^="item-detail_ItemDetail__description__"]',
    EXPAND_BUTTON: '.expand-button'
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
            ${SELECTORS.EXPAND_BUTTON} {
                background: none;
                border: none;
                color: #008080;
                cursor: pointer;
                padding: 5px;
                font-size: 12px;
                text-decoration: underline;
            }
            .description-content {
                display: none;
                padding: 10px;
                background-color: #f0f0f0;
                border-radius: 5px;
                margin-top: 5px;
                font-size: 14px;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .error-message {
                color: #ff0000;
                font-style: italic;
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

class DescriptionFetcher {
    static async getDescription(url) {
        Logger.log("Fetching description for URL:", url);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => this.handleResponse(response, resolve),
                onerror: (error) => this.handleError(error, resolve)
            });
        });
    }

static handleResponse(response, resolve) {
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

                    // Extract the item description
                    if (jsonData.props?.pageProps?.item?.description?.original) {
                        const description = jsonData.props.pageProps.item.description.original;
                        Logger.log("Description extracted from JSON:", description);

                        // Get the part before tag indicators like "No leer"
                        const cleanDescription = this.cleanDescription(description);

                        resolve({ success: true, data: cleanDescription });
                    } else {
                        Logger.log("Description not found in JSON structure:", jsonData);
                        throw new Error("Description not found in JSON data");
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
                        resolve({ success: true, data: description });
                        return;
                    }
                }

                throw new Error("Description not found with any method");
            }
        } catch (error) {
            Logger.error(error, "Parsing response");
            resolve({ success: false, error: "Failed to parse description: " + error.message });
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
        resolve({ success: false, error: "Network error occurred" });
    }
}

class ExpandButton {
    constructor(anchorElement, url) {
        this.anchorElement = anchorElement;
        this.url = url;
        this.button = null;
        this.descriptionContent = null;
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
            if (this.descriptionContent.style.display === 'none' || this.descriptionContent.style.display === '') {
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
            this.descriptionContent.innerHTML = HTMLUtils.escapeHTML(result.data);
            this.descriptionContent.style.display = 'block';
            this.button.textContent = 'Hide Description';
            Logger.log("Description expanded for URL:", this.url);
        } else {
            this.showError(result.error);
        }
    }

    hideDescription() {
        this.descriptionContent.style.display = 'none';
        this.button.textContent = 'Expand Description';
        Logger.log("Description hidden for URL:", this.url);
    }

    showError(message) {
        this.descriptionContent.innerHTML = `<span class="error-message">${message}</span>`;
        this.descriptionContent.style.display = 'block';
        this.button.textContent = 'Expand Description';
        Logger.log("Error displaying description for URL:", this.url, message);
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
                    const href = listing.getAttribute('href') || listing.querySelector('a')?.getAttribute('href');
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
        this.observer.observe(document.body, { childList: true, subtree: true });
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
        }, 1000); // Delay to allow for dynamic content to load
    }
}

class WallapopExpandDescription {
    static async init() {
        Logger.log("Initializing script");
        StyleManager.addStyles();
        await this.waitForElements(SELECTORS.ITEM_CARDS);
        ListingManager.addExpandButtonsToListings();
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
