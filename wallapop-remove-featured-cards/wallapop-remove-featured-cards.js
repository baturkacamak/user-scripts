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

(function() {
	'use strict';
	const interval = setInterval(() => {
		document.querySelectorAll('[tsladslotshopping] > a').forEach((card) => card.querySelector('tsl-svg-icon.ItemCardWide__icon--bumped') ? card.remove() : '');
	}, 5000);
})();

