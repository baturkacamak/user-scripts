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
// @match        https://eksisozluk.com/*
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

/**
 * @class EksiAdvancedTopicSorter
 * @classdesc An utility class for sorting entries and titles on the Eksisozluk website by favorite count and length.
 * The class provides methods for sorting entries and titles by favorite count or length,
 * and for creating buttons that can be used to trigger the sorting.
 */
class EksiAdvancedTopicSorter {
  /**
   * Creates and returns a span element with the text " | ".
   *
   * This method creates a new span element, sets its inner HTML to " | ",
   * and returns it. The returned element can be used as a separator
   * between the "favori" and "length" buttons.
   *
   * @returns {HTMLElement} The separator element
   */
  static getSeparator() {
    // Create a new span element
    const separator = document.createElement('span');
    // Set the inner HTML of the span to " | "
    separator.innerHTML = ' | ';
    // Return the span element
    return separator;
  }


  /**
   * Gets the length of an entry.
   *
   * @param {HTMLElement} node - The entry element.
   * @returns {Number} The length of the entry.
   */
  static getLength(node) {
    // Get all whitespace characters in the content of the entry
    // (including regular spaces and tabs)
    const whitespace = [...node.querySelector('.content').textContent.matchAll(/(\s+| )/g)];
    // Return the length of the array of whitespace characters
    // (this will be the length of the entry, as each whitespace character represents one character)
    return whitespace.length;
  }

  /**
   * Sorts the entries in the entry list by their length in descending order.
   *
   * @param {Event} e - The event object for the click event.
   */
  static sortEntriesByLengthDescending(e) {
    // Toggle the 'nice-on' class on the event target
    e.target.classList.toggle('nice-on');
    // Get all entries in the entry list
    const entries = Array.from(document.querySelectorAll('[data-favorite-count]'));
    // Clear the entry list
    // (to make room for the sorted entries)
    document.querySelector('#entry-item-list').innerHTML = '';
    // Sort the entries by their length in descending order
    entries
    // Use the 'getLength()' method to get the length of each entry
    .sort((a, b) => EksiFavori.getLength(b) - EksiFavori.getLength(a))
    // Use the 'forEach()' method to append each sorted entry to the entry list, and add the 'favorite-on' class to the entry
    .forEach((item) => {
      // Use the 'getLength()' method to get the length of the entry
      // and insert it as a span element into the feedback element of the entry
      item.querySelector('.feedback').insertAdjacentHTML('beforeend', `<span class="favorite-links">Length: <strong>${EksiFavori.getLength(item)}</strong></span>`);
      // Append the entry to the entry list, and add the 'favorite-on' class to the entry
      document.querySelector('#entry-item-list').appendChild(item).classList.add('favorite-on');
    });
  }

/**
 * Sorts the titles in the topic list by their favorite count in descending order.
 *
 * @param {Event} e - The event object for the click event.
 */
 static sortTitles(e) {
    // Get all titles in the topic list, excluding those with an ID attribute
    // (these titles are likely to be special and should not be sorted)
    const titles = Array.from(document.querySelectorAll('.topic-list li:not([id])'));
    // Clear the topic list
    // (to make room for the sorted titles)
    document.querySelector('.topic-list').innerHTML = '';
    // Sort the titles by their favorite count in descending order
    titles.sort((a, b) => {
      // Parse the favorite count of the first title from a string to an integer
      // (the favorite count is stored as a string in the HTML)
      // eslint-disable-next-line radix
      const aFav = parseInt(a.querySelector('small').innerText);
      // Parse the favorite count of the second title from a string to an integer
      // (the favorite count is stored as a string in the HTML)
      // eslint-disable-next-line radix
      const bFav = parseInt(b.querySelector('small').innerText);
      // Return the difference between the favorite counts of the two titles
      // (this will sort the titles by their favorite count in descending order)
      return bFav - aFav;
    }).forEach((item) => {
      // Append each sorted title to the topic list
      document.querySelector('.topic-list').appendChild(item);
    });
  }

  /**
   * Sorts the entries in the entry list by their favorite count in descending order.
   *
   * @param {Event} e - The event object for the click event.
   */
  static sortEntries(e) {
    // Toggle the 'nice-on' class on the event target
    e.target.classList.toggle('nice-on');
    // Get all entries in the entry list that have a 'data-favorite-count' attribute
    const entries = Array.from(document.querySelectorAll('[data-favorite-count]'));
    // Clear the entry list
    // (to make room for the sorted entries)
    document.querySelector('#entry-item-list').innerHTML = '';
    // Sort the entries by their favorite count in descending order
    entries.sort((a, b) => {
      // Parse the favorite count of the first entry from a string to an integer
      // (the favorite count is stored as a string in the 'data-favorite-count' attribute)
      // eslint-disable-next-line radix
      const aFav = parseInt(a.getAttribute('data-favorite-count'));
      // Parse the favorite count of the second entry from a string to an integer
      // (the favorite count is stored as a string in the 'data-favorite-count' attribute)
      // eslint-disable-next-line radix
      const bFav = parseInt(b.getAttribute('data-favorite-count'));
      // Return the difference between the favorite counts of the two entries
      // (this will sort the entries by their favorite count in descending order)
      return bFav - aFav;
    }).forEach((item) => {
      // Append each sorted entry to the entry list, and add the 'favorite-on' class to the entry
      document.querySelector('#entry-item-list').appendChild(item).classList.add('favorite-on');
    });
  }

  /**
   * Gets the "favori" button element.
   *
   * @returns {HTMLElement} The "favori" button element.
   */
  static getFavButton() {
    // Create a span element
    const favButton = document.createElement('span');
    // Set the text content of the span element to "favori"
    favButton.innerText = 'favori';
    // Add a click event listener to the span element
    // (the event listener will call the 'sortEntries()' method when the button is clicked)
    favButton.addEventListener('click', EksiFavori.sortEntries);
    // Return the span element
    return favButton;
  }


  /**
   * Gets the "length" button element.
   *
   * @returns {HTMLElement} The "length" button element.
   */
  static getLengthButton() {
    // Create a span element
    const lengthButton = document.createElement('span');
    // Set the text content of the span element to "length"
    lengthButton.innerText = 'length';
    // Add a click event listener to the span element
    // (the event listener will call the 'sortEntriesByLengthDescending()' method when the button is clicked)
    lengthButton.addEventListener('click', EksiFavori.sortEntriesByLengthDescending);
    // Return the span element
    return lengthButton;
  }

 /**
   * Initializes the "favori" and "length" buttons, and sorts the titles.
   *
   * The "favori" button allows the user to sort entries by their favorite count.
   * The "length" button allows the user to sort entries by their length.
   */
  static init() {
    // Check if the entry item list is not already sorted by favorite count
    // (this is indicated by the 'favorite-on' class)
    // and there is a '.nice-mode-toggler' element in the document
    if (!document.querySelector('#entry-item-list.favorite-on')
        && document.querySelector('.nice-mode-toggler')) {
      // Get the separator element
      const separator = EksiFavori.getSeparator();
     // Get the "favori" button element
      const favButton = EksiFavori.getFavButton();
      // Get the "length" button element
      const lengthButton = EksiFavori.getLengthButton();
      // Get the '.nice-mode-toggler' element
      const niceModeToggler = document.querySelector('.nice-mode-toggler');
      // Append the separator element to the '.nice-mode-toggler' element
      niceModeToggler.appendChild(EksiFavori.getSeparator());
      // Append the "favori" button element to the '.nice-mode-toggler' element
      niceModeToggler.appendChild(favButton);
      // Append the separator element to the '.nice-mode-toggler' element
      niceModeToggler.appendChild(EksiFavori.getSeparator());
      // Append the "length" button element to the '.nice-mode-toggler' element
      niceModeToggler.appendChild(lengthButton);
      // Sort the titles by their favorite count
      // EksiFavori.sortTitles();
    }
  }

  /**
   * Constructs the EksiFavori object.
   *
   * This method caches relevant elements, sets up mutation observers,
   * and initializes the "favori" and "length" buttons.
   */
  constructor() {
    // Cache relevant elements
    this.cache();
    // Set up mutation observers
    this.mutations();
    // Initialize the "favori" and "length" buttons, and sort the titles
    EksiFavori.init();
  }

  /**
   * Caches relevant elements for later use.
   *
   * This method saves a reference to the element that will be observed
   * for mutations (to detect when new entries are added to the page).
   */
  cache() {
    // Save a reference to the main element, which will be observed for mutations
    this.observerTarget = document.querySelector('#main');
  }


  /**
   * Sets up mutation observers to detect when new entries are added.
   *
   * This method creates a MutationObserver that listens for changes
   * to the children of the main element. When a new entry is added,
   * the "favori" and "length" buttons are initialized and the titles are sorted.
   */
  mutations() {
    // Create a new MutationObserver
    const observer = new MutationObserver((mutations) => {
      // Check if any child nodes were removed from the main element
      // (this indicates that new entries were added to the page)
      if (mutations[0].removedNodes) {
        // Initialize the "favori" and "length" buttons, and sort the titles
        EksiFavori.init();
      }
    });

    // Start observing the main element for child node mutations
    observer.observe(this.observerTarget, {
      childList: true,
    });
  }
}

/**
* Initializes a new instance of the EksiFavori class, which adds the "favori" and "length" buttons to the page and sorts the topic list and entry list.
*/
const eksiAdvancedTopicSorter = new EksiAdvancedTopicSorter();
