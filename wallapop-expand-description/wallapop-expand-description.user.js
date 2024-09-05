// ==UserScript==
// @id           wallapop-expand-description@https://github.com/baturkacamak/userscripts
// @name         Wallapop Expand Description
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0
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
}

class StyleManager {
    static addStyles() {
        GM_addStyle(`
            .expand-button {
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
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");
            const descriptionElement = doc.querySelector('[class^="item-detail_ItemDetail__description"]');
            if (descriptionElement) {
                const description = descriptionElement.innerHTML.trim();
                Logger.log("Description fetched successfully");
                resolve({ success: true, data: description });
            } else {
                throw new Error("Description element not found");
            }
        } catch (error) {
            Logger.error(error, "Parsing response");
            resolve({ success: false, error: "Failed to parse description" });
        }
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
        this.button.className = 'expand-button';

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
        const listings = document.querySelectorAll('a.ItemCardList__item[href^="https://es.wallapop.com/item/"]');
        Logger.log("Found ItemCardList__item elements:", listings.length);
        listings.forEach(listing => {
            try {
                const href = listing.getAttribute('href');
                if (href && !listing.querySelector('.expand-button')) {
                    new ExpandButton(listing, href);
                } else if (!href) {
                    Logger.log("No valid href found for a listing");
                }
            } catch (error) {
                Logger.error(error, "Processing individual listing");
            }
        });
    }
}

class DOMObserver {
    constructor() {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
    }

    observe() {
        this.observer.observe(document.body, { childList: true, subtree: true });
        Logger.log("MutationObserver set up");
    }

    handleMutations(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasNewItemCards = addedNodes.some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    (node.matches('a.ItemCardList__item[href^="https://es.wallapop.com/item/"]') ||
                     node.querySelector('a.ItemCardList__item[href^="https://es.wallapop.com/item/"]'))
                );
                if (hasNewItemCards) {
                    Logger.log("New ItemCards detected, adding expand buttons");
                    ListingManager.addExpandButtonsToListings();
                }
            }
        }
    }
}

class WallapopExpandDescription {
    static async init() {
        Logger.log("Initializing script");
        StyleManager.addStyles();
        await this.waitForElements('a.ItemCardList__item[href^="https://es.wallapop.com/item/"]');
        ListingManager.addExpandButtonsToListings();
        new DOMObserver().observe();
    }

    static waitForElements(selector, timeout = 10000) {
        Logger.log("Waiting for elements:", selector);
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElements() {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    Logger.log("Elements found:", selector, elements.length);
                    resolve(elements);
                } else if (Date.now() - startTime > timeout) {
                    Logger.log("Timeout waiting for elements:", selector);
                    reject(new Error(`Timeout waiting for elements: ${selector}`));
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
