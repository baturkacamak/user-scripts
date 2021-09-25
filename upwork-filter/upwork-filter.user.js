// ==UserScript==
// @id           upwork-filter@https://github.com/baturkacamak/userscripts
// @name         Upwork Filter
// @namespace    https://github.com/baturkacamak/userscripts
// @name         Upwork Filter
// @version      0.2
// @description  This script will filter upwork jobs by country.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @grant        none
// @match        https://www.upwork.com/ab/jobs/search/*
// @match        https://www.upwork.com/o/jobs/browse/*
// @match        https://www.upwork.com/ab/find-work/
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/upwork-filter#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/upwork-filter#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/upwork-filter/upwork-filter.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/upwork-filter/upwork-filter.user.js
// @icon         https://upwork.com/favicon.ico
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  const COUNTRIES = ['India', 'Bangladesh', 'Pakistan'];

  const waitFor = (...selectors) => new Promise((resolve) => {
    const delay = 500;
    const f = () => {
      const elements = selectors.map((selector) => document.querySelector(selector));
      if (elements.every((element) => element != null)) {
        resolve(elements);
      } else {
        setTimeout(f, delay);
      }
    };
    f();
  });

  const removeCountries = () => {
    const jobs = document.querySelectorAll('.job-tile');
    document.querySelectorAll('.job-tile .client-location').forEach((el, index) => {
      const country = el.innerHTML;
      if (country && country !== '' && COUNTRIES.includes(country)) {
        el.closest('.job-tile').parentNode.removeChild(el.closest('.job-tile'));
      }
    });
  };

  setInterval(removeCountries, 5000);

  waitFor(['.job-tile', '.client-location']).then(removeCountries);
}());
