// Button component for expanding/hiding descriptions

import {Logger} from "../../core";
import {TranslationManager} from "../../core";
import {HTMLUtils} from "../../core";
import {DescriptionFetcher} from "../services/DescriptionFetcher";
import {DescriptionManager} from "../managers/DescriptionManager";
import {SELECTORS} from "../utils/constants";

/**
 * Button component for expanding and hiding item descriptions
 */
export class ExpandButton {
    /**
     * Create a new expand button for an item
     * @param {HTMLElement} anchorElement - The element to attach the button to
     * @param {string} url - The URL of the item
     */
    constructor(anchorElement, url) {
        this.anchorElement = anchorElement;
        this.url = url;
        this.button = null;
        this.descriptionContent = null;
        this.expanded = false;
        this.itemData = null;
        this.createButton();
    }

    /**
     * Create the expand button UI
     */
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

    /**
     * Handle button click events
     * @param {Event} event - The click event
     */
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

    /**
     * Expand the description by fetching and displaying it
     */
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

    /**
     * Hide the expanded description
     */
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

    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
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