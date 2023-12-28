// ==UserScript==
// @id           eksi-advanced-sorter@https://github.com/baturkacamak/userscripts
// @name         Eksi Advanced Sorter
// @namespace    https://github.com/baturkacamak/userscripts
// @version      2.0.3
// @description  This script provides a feature to sort topics by their number of favorites or length on the Eksisozluk website
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @match        https://eksisozluk111.com/*
// @icon         https://eksisozluk111.com/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

/**
 * @class Sorter
 * @classdesc A utility class for sorting entries and titles on the Eksi Sozluk website.
 */
class Sorter {
    /**
     * Sorts items based on the provided sorting criteria and appends them to the entry item list.
     * @param {HTMLElement[]} items - The array of items to be sorted.
     * @param {Function} sortingCriteria - The sorting criteria function.
     */
    static sortItems(items, sortingCriteria) {
        items.sort(sortingCriteria).forEach((item) => {
            DOMManipulator.appendChildToEntryItemList(item);
        });
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

class WeightSortingStrategy {
    calculateWeight = (item) => {
        let favoriteCount = parseInt(item.getAttribute('data-favorite-count'));
        const timeDifference = this.calculateTimeDifference(item);

        if (favoriteCount === 0) {
            favoriteCount = -100;
        }

        // Calculate the weight using a formula that suits your requirements
        return favoriteCount * 0.8 - timeDifference * 0.2;
    }

    calculateTimeDifference = (item) => {
        const dateStr = item.querySelector('.entry-date').textContent.trim();
        const dateRegex = /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/;

        const [, day, month, year, hours, minutes] = dateRegex.exec(dateStr);
        const entryDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}`);
        // Get the UTC offset in minutes for the Istanbul timezone
        const istanbulOffset = new Date().toLocaleTimeString('en-us', {timeZoneName: 'short'}).split(' ')[2];
        const utcOffset = parseInt(istanbulOffset.replace(/[^0-9+-]+/g, ''));
        // Apply the UTC offset to the entry date
        entryDate.setMinutes(entryDate.getMinutes() - utcOffset);

        const currentTime = new Date();
        const timeDifference = currentTime - entryDate;
        // Convert the time difference to a suitable unit (e.g., minutes, hours, etc.) based on your requirements
        // For example, to get the time difference in minutes:
        return Math.floor(timeDifference / (1000 * 60));
    }

    sort = (a, b) => {
        const aWeight = this.calculateWeight(a);
        const bWeight = this.calculateWeight(b);

        return bWeight - aWeight; // Sort by weight in descending order
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
                const items = Array.from(document.querySelectorAll('[data-favorite-count]'));
                document.querySelector('#entry-item-list').innerHTML = '';
                Sorter.sortItems(items, new strategy().sort);
            }

            const favButton = ButtonCreator.createSortButton('favori', () => {
                sortFunction(FavoriteCountSortingStrategy)
            });

            const lengthButton = ButtonCreator.createSortButton('length', () => {
                sortFunction(LengthSortingStrategy)
            });

            const weightButton = ButtonCreator.createSortButton('weight', () => {
                sortFunction(WeightSortingStrategy)
            });

            const dailyniceButton = ButtonCreator.createSortButton('dailynice', () => {
                const url = new URL(window.location.href);
                const params = new URLSearchParams(url.search);
                params.set('a', 'dailynice');
                url.search = params.toString();
                window.location.href = url.toString();
            });

            const niceModeToggler = document.querySelector('.sub-title-menu');
            niceModeToggler.appendChild(favButton);
            niceModeToggler.appendChild(ButtonCreator.createSeparator());
            niceModeToggler.appendChild(lengthButton);
            niceModeToggler.appendChild(ButtonCreator.createSeparator());
            niceModeToggler.appendChild(weightButton);
            niceModeToggler.appendChild(ButtonCreator.createSeparator());
            niceModeToggler.appendChild(dailyniceButton);
        }
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
