// ==UserScript==
// @id           eksi-advanced-sorter@https://github.com/baturkacamak/userscripts
// @name         Eksi Advanced Sorter
// @namespace    https://github.com/baturkacamak/userscripts
// @version      2.0.6
// @description  This script provides a feature to sort topics by their number of favorites or length on the Eksisozluk website
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/userscripts/eksi-advanced-sorter#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/userscripts/eksi-advanced-sorter#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/userscripts/eksi-advanced-sorter/eksi-advanced-sorter.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/userscripts/eksi-advanced-sorter/eksi-advanced-sorter.user.js
// @match        https://eksisozluk.com/*
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

/**
 * @class Sorter
 * @classdesc A utility class for sorting entries and titles on the Eksi Sozluk website.
 */
class Sorter {
    /**
    /**
     * Sorts items based on the provided sorting criteria and reorders them in the DOM.
     * @param {HTMLElement[]} items - The array of items to be sorted.
     * @param {Function} sortingCriteria - The sorting criteria function.
     */
    static sortItems(items, sortingCriteria) {
        const sortedItems = [...items].sort(sortingCriteria);
        const parent = document.querySelector('#entry-item-list');
        sortedItems.forEach((item) => parent.appendChild(item));
    }
}

/**
 * @class LengthSortingStrategy
 * @classdesc A sorting strategy for sorting entries by length in descending order.
 */
class LengthSortingStrategy {
    /**
     * Sorts entries by length in descending order.
     * @param {HTMLElement} a - The first entry element.
     * @param {HTMLElement} b - The second entry element.
     * @returns {number} The comparison result for sorting.
     */
    sort = (a, b) => {
        return this.getEntryLength(b) - this.getEntryLength(a);
    }

    /**
     * Calculates the length of an entry.
     * @param {HTMLElement} entry - The entry element.
     * @returns {number} The length of the entry.
     */
    getEntryLength = (entry) => {
        const content = entry.querySelector('.content');
        const whitespace = [...content.textContent.matchAll(/(\s+| )/g)];
        return whitespace.length;
    }

}

/**
 * @class FavoriteCountSortingStrategy
 * @classdesc A sorting strategy for sorting titles by favorite count in descending order.
 */
class FavoriteCountSortingStrategy {
    /**
     * Sorts titles by favorite count in descending order.
     * @param {HTMLElement} a - The first title element.
     * @param {HTMLElement} b - The second title element.
     * @returns {number} The comparison result for sorting.
     */
    sort(a, b) {
        const aFav = parseInt(a.getAttribute('data-favorite-count'));
        const bFav = parseInt(b.getAttribute('data-favorite-count'));
        return bFav - aFav;
    }
}


/**
 * @class ButtonCreator
 * @classdesc A utility class for creating sort buttons.
 */
class ButtonCreator {
    /**
     * Creates a separator element for UI.
     * @returns {HTMLElement} The separator element.
     */
    static createSeparator() {
        const separator = document.createElement('span');
        separator.innerHTML = ' | ';
        return separator;
    }

    /**
     * Creates a button element for sorting.
     * @param {string} text - The text content of the button.
     * @param {Function} clickHandler - The click event handler for the button.
     * @returns {HTMLElement} The button element.
     */
    static createSortButton(text, clickHandler) {
        const button = document.createElement('span');
        button.innerText = text;
        button.style.cursor = 'pointer';
        button.addEventListener('click', clickHandler);
        return button;
    }
}

/**
 * @class DOMManipulator
 * @classdesc A utility class for manipulating the DOM on the Eksi Sozluk website.
 */
class DOMManipulator {
    /**
     * Appends an item to the entry item list.
     * @param {HTMLElement} item - The item element to be appended.
     */
    static appendChildToEntryItemList(item) {
        document.querySelector('#entry-item-list').appendChild(item);
    }

    /**
     * Initializes the buttons and triggers the initial sorting.
     */
    static initializeButtonsAndSort() {
        if (!document.querySelector('#entry-item-list.favorite-on') && document.querySelector('.sub-title-menu')) {

            const sortFunction = (strategy) => {
                const items = DOMManipulator.getUpdatedEntries();
                Sorter.sortItems(items, new strategy().sort);
            }

            const favButton = ButtonCreator.createSortButton('favori', () => {
                sortFunction(FavoriteCountSortingStrategy)
            });

            const lengthButton = ButtonCreator.createSortButton('length', () => {
                sortFunction(LengthSortingStrategy)
            });

            const niceModeToggler = document.querySelector('.sub-title-menu');
            niceModeToggler.appendChild(favButton);
            niceModeToggler.appendChild(ButtonCreator.createSeparator());
            niceModeToggler.appendChild(lengthButton);
        }
    }

    /**
     * Retrieves the current entries from the document.
     * @returns {HTMLElement[]} An array of HTML elements representing the current entries.
     */
    static getUpdatedEntries() {
        return Array.from(document.querySelectorAll('#entry-item-list > li[data-favorite-count]'));
    }
}

/**
 * @class MutationObserverHandler
 * @classdesc A utility class for handling DOM mutations.
 */
class MutationObserverHandler {
    /**
     * Constructs a new instance of the MutationObserverHandler class.
     */
    constructor() {
        this.observerTarget = document.querySelector('#main');
        this.initializeMutations();
        DOMManipulator.initializeButtonsAndSort();
    }

    /**
     * Initializes the mutations observer to watch for changes in the DOM.
     */
    initializeMutations() {
        const observer = new MutationObserver((mutations) => {
            if (mutations[0].removedNodes) {
                DOMManipulator.initializeButtonsAndSort();
            }
        });
        observer.observe(this.observerTarget, {
            childList: true,
        });
    }
}

const mutationObserverHandler = new MutationObserverHandler();
