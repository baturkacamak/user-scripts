// ==UserScript==
// @id           wallapop-remove-featured-cards@https://github.com/baturkacamak/userscripts
// @name         Wallapop Remove Featured Cards
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  This script will move youtube comments to sidebar before related videos.
// @author       Batur Kacamak
// @copyright    2022+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/wallapop-remove-featured-cards#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/wallapop-remove-featured-cards#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/wallapop-remove-featured-cards/wallapop-remove-featured-cards.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/wallapop-remove-featured-cards/wallapop-remove-featured-cards.user.js
// @match        https://es.wallapop.com/app/search?*
// @icon         https://es.wallapop.com/favicon.ico
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

/**
 * The AdsFilter class is used to remove ads that have been bumped from the page.
 * It provides a static method for initializing the filter and starting an interval
 * that calls a method for removing the bumped ads.
 */
class AdsFilter {
  // The time to wait before checking for the ads again (in milliseconds)
  static DELAY = 5000;

  // Removes ads that have been bumped
  static removeBumpedAds() {
    // Get all ads that have a 'tsladslotshopping' attribute
    document.querySelectorAll('[tsladslotshopping] > a').forEach((ad) => {
      // Check if the ad has a 'tsl-svg-icon.ItemCardWide__icon--bumped' child element
      if (ad.querySelector('tsl-svg-icon.ItemCardWide__icon--bumped')) {
        // Remove the ad
        ad.remove();
      }
    });
  }

  // Initializes the filter by starting an interval that calls the 'removeBumpedAds()' method
  static init() {
    // Start an interval that calls the 'removeBumpedAds()' method every 5 seconds
    setInterval(AdsFilter.removeBumpedAds, AdsFilter.DELAY);
  }
}

// Initialize the filter when the script is run
AdsFilter.init();
