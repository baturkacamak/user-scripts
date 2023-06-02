// ==UserScript==
// @id           eksi-favori@https://github.com/baturkacamak/userscripts
// @name         Eksi Advanced Topic Sorter
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script provides a feature to sort topics by their number of favorites or length on the Eksisozluk website
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @match        https://eksisozluk1923.com/*
// @icon         https://eksisozluk1923.com/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

/**
 * @class EksiFavori
 * @classdesc An utility class for sorting entries and titles on the Eksisozluk website by favorite count and length.
 * The class provides methods for sorting entries and titles by favorite count or length,
 * and for creating buttons that can be used to trigger the sorting.
 */
class EksiFavori {
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
   * Calculates the length of an entry.
   * @param {HTMLElement} entry - The entry element.
   * @returns {number} The length of the entry.
   */
  static getEntryLength(entry) {
    const content = entry.querySelector('.content');
    const whitespace = [...content.textContent.matchAll(/(\s+| )/g)];
    return whitespace.length;
  }

  /**
   * Sorts items based on the provided sorting criteria and appends them to the entry item list.
   * @param {HTMLElement[]} items - The array of items to be sorted.
   * @param {Function} sortingCriteria - The sorting criteria function.
   */
  static sortItems(items, sortingCriteria) {
    items.sort(sortingCriteria).forEach((item, index) => {
      document.querySelector('#entry-item-list').appendChild(item);
    });
  }

  /**
   * Sorts entries by length in descending order.
   * @param {HTMLElement} a - The first entry element.
   * @param {HTMLElement} b - The second entry element.
   * @returns {number} The comparison result for sorting.
   */
  static sortEntriesByLengthDescending(a, b) {
    return EksiFavori.getEntryLength(b) - EksiFavori.getEntryLength(a);
  }

  /**
   * Sorts titles by favorite count in descending order.
   * @param {HTMLElement} a - The first title element.
   * @param {HTMLElement} b - The second title element.
   * @returns {number} The comparison result for sorting.
   */
  static sortTitlesByFavoriteCountDescending(a, b) {
    const aFav = parseInt(a.getAttribute('data-favorite-count'));
    const bFav = parseInt(b.getAttribute('data-favorite-count'));
    return bFav - aFav;
  }

  /**
   * Creates a button element for sorting.
   * @param {string} text - The text content of the button.
   * @param {Function} sortingCriteria - The sorting criteria function.
   * @returns {HTMLElement} The button element.
   */
  static createSortButton(text, sortingCriteria) {
    const button = document.createElement('span');
    button.innerText = text;
    button.addEventListener('click', () => {
      button.classList.toggle('nice-on');
      const items = Array.from(document.querySelectorAll('[data-favorite-count]'));
      document.querySelector('#entry-item-list').innerHTML = '';
      EksiFavori.sortItems(items, sortingCriteria);
    });
    return button;
  }

  /**
   * Initializes the buttons and triggers the initial sorting.
   */
  static initializeButtonsAndSort() {
    if (!document.querySelector('#entry-item-list.favorite-on') && document.querySelector('.sub-title-menu')) {
      const separator = EksiFavori.createSeparator();
      const favButton = EksiFavori.createSortButton('favori', EksiFavori.sortTitlesByFavoriteCountDescending);
      const lengthButton = EksiFavori.createSortButton('length', EksiFavori.sortEntriesByLengthDescending);
      const niceModeToggler = document.querySelector('.sub-title-menu');
      niceModeToggler.appendChild(separator);
      niceModeToggler.appendChild(favButton);
      niceModeToggler.appendChild(separator);
      niceModeToggler.appendChild(lengthButton);
    }
  }

  /**
   * Initializes the mutations observer to watch for changes in the DOM.
   */
  initializeMutations() {
    const observer = new MutationObserver((mutations) => {
      if (mutations[0].removedNodes) {
        EksiFavori.initializeButtonsAndSort();
      }
    });

    observer.observe(this.observerTarget, {
      childList: true,
    });
  }

  /**
   * Constructs a new instance of the EksiFavori class.
   */
  constructor() {
    this.observerTarget = document.querySelector('#main');
    this.initializeMutations();
    EksiFavori.initializeButtonsAndSort();
  }
}

const eksiAdvancedTopicSorter = new EksiFavori();
