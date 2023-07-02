// ==UserScript==
// @id           upwork-country-filter@baturkacamak
// @name         Upwork Country Filter
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  This script filters Upwork job listings by country, removing jobs from specified countries.
// @author       Batur Kacamak
// @license      MIT
// @match        https://www.upwork.com/ab/jobs/search/*
// @match        https://www.upwork.com/o/jobs/browse/*
// @match        https://www.upwork.com/ab/find-work/
// @match        https://www.upwork.com/nx/find-work/
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/upwork-country-filter#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/upwork-country-filter#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/upwork-country-filter/upwork-country-filter.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/upwork-country-filter/upwork-country-filter.user.js
// @icon         https://upwork.com/favicon.ico
// ==/UserScript==

/**
 * Class for filtering Upwork job listings by country.
 */
class UpworkCountryFilter {
  /**
   * A list of countries to be removed from job listings.
   * @type {string[]}
   */
  static COUNTRIES = ['India', 'Bangladesh', 'Pakistan', 'Arab'];

  /**
   * Initializes the filter by starting a MutationObserver and removing countries.
   */
  static init() {
    const observerCallback = () => {
      UpworkCountryFilter.removeCountryListings();
    };

    const observer = new MutationObserver(observerCallback);
    const observerOptions = {
      childList: true,
      subtree: true,
    };

    observer.observe(document.documentElement, observerOptions);
    UpworkCountryFilter.removeCountryListings();
  }

  /**
   * Removes job listings for the countries in the 'COUNTRIES' list.
   */
  static removeCountryListings() {
    document.querySelectorAll('*[data-test="client-country"], .job-tile .client-location').forEach((el) => {
      const country = el.textContent;
      if (UpworkCountryFilter.shouldRemoveCountry(country)) {
        UpworkCountryFilter.removeListing(el);
      }
    });
  }

  /**
   * Checks if a country should be removed based on the 'COUNTRIES' list.
   * @param {string} country - The country name to check.
   * @returns {boolean} Whether the country should be removed.
   */
  static shouldRemoveCountry(country) {
    return (
        country &&
        country !== '' &&
        UpworkCountryFilter.COUNTRIES.some((bannedCountry) => country.includes(bannedCountry))
    );
  }

  /**
   * Removes a job listing element from the DOM.
   * @param {HTMLElement} listingElement - The job listing element to remove.
   */
  static removeListing(listingElement) {
    const parentElement = listingElement.closest('.up-card-section, .job-tile');
    if (parentElement) {
      parentElement.parentNode.removeChild(parentElement);
    }
  }
}

// Initialize the filter when the script is run
UpworkCountryFilter.init();