// ==UserScript==
// @id           upwork-filter@https://github.com/baturkacamak/userscripts
// @name         Upwork Filter
// @namespace    https://github.com/baturkacamak/userscripts
// @name         Upwork Filter
// @version      0.2.3
// @description  This script will filter upwork jobs by country.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @grant        none
// @match        https://www.upwork.com/ab/jobs/search/*
// @match        https://www.upwork.com/o/jobs/browse/*
// @match        https://www.upwork.com/ab/find-work/
// @match        https://www.upwork.com/nx/find-work/
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/upwork-filter#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/upwork-filter#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/upwork-filter/upwork-filter.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/upwork-filter/upwork-filter.user.js
// @icon         https://upwork.com/favicon.ico
// ==/UserScript==

// eslint-disable-next-line func-names
class JobsFilter {
  // A list of countries to be removed from job listings
  static COUNTRIES = ['India', 'Bangladesh', 'Pakistan', 'Arab'];

  // Waits for the specified elements to exist in the DOM,
  // and then resolves the returned Promise with the elements.
  static waitFor = (...selectors) => new Promise((resolve) => {
    // The time to wait before checking for the elements again (in milliseconds)
    const delay = 5000;
    // A recursive function that checks for the elements and
    // resolves the Promise if all elements exist
    const f = () => {
      // Use the 'map()' method to get an array of the elements
      // that match the given selectors
      const elements = selectors.map((selector) => document.querySelector(selector));
      // Check if all elements exist
      if (elements.every((element) => element != null)) {
        // Resolve the Promise with the elements
        resolve(elements);
      } else {
        // Set a timeout to call the function again after the specified delay
        setTimeout(f, delay);
      }
    };
    // Start the recursive loop
    f();
  });

  // Removes job listings for the countries in the 'COUNTRIES' list
  static removeCountries() {
    // Get all elements that have a 'data-test' attribute with the value "client-country"
    // and all elements that have a 'client-location' class
    document.querySelectorAll('*[data-test="client-country"], .job-tile .client-location').forEach((el, index) => {
      // Get the inner HTML of the element (i.e. the country name)
      const country = el.innerHTML;
      // Check if the country exists, is not empty,
      // and is included in the 'COUNTRIES' list
      if (
          country
          && country !== ''
          && JobsFilter.COUNTRIES.filter(bannedCountry => country.includes(bannedCountry)).length > 0
      ) {
        // Remove the parent element of the element (i.e. the job listing)
        el.closest('.up-card-section, .job-tile').parentNode.removeChild(el.closest('.up-card-section, .job-tile'));
      }
    });
  }

  // Initializes the filter by starting an interval that calls the 'removeCountries()' method
  // and waiting for the specified elements to exist in the DOM before calling the method
  static init() {
    // Start an interval that calls the 'removeCountries()' method every 5 seconds
    setInterval(JobsFilter.removeCountries, 5000);
    // Wait for the specified elements to exist in the DOM,
    // and then call the 'removeCountries()' method
    JobsFilter.waitFor(['.up-card-section', '*[data-test="client-country"]']).then(JobsFilter.removeCountries);
  }
}

// Initialize the filter when the script is run
JobsFilter.init();
