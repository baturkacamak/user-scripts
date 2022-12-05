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

  // A string representing the selector for ads that have been bumped
  static BUMPED_AD_SELECTOR = 'tsl-svg-icon.ItemCardWide__icon--bumped';
  // A string representing the selector for all ads
  static ALL_ADS_SELECTOR = '[tsladslotshopping] > a';

  /**
   * The removeBumpedAds() method is used to remove ads that have been bumped
   * from the page. It does this by getting all ads that have a 'tsladslotshopping'
   * attribute and then checking if each ad has a 'tsl-svg-icon.ItemCardWide__icon--bumped'
   * child element. If it does, the ad is removed from the page.
   */
    static removeBumpedAds() {
    // Get all ads that have a 'tsladslotshopping' attribute
    document.querySelectorAll(AdsFilter.ALL_ADS_SELECTOR).forEach((ad) => {
      // Check if the ad has a 'tsl-svg-icon.ItemCardWide__icon--bumped' child element
      if (ad.querySelector(AdsFilter.BUMPED_AD_SELECTOR)) {
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
