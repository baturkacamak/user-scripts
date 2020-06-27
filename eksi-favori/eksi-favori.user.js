// ==UserScript==
// @id           eksi-favori@https://github.com/baturkacamak/userscripts
// @name         Eksi Olay Notification
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script will sort topic messages by "favori" count.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/eksi-favori#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/eksi-favori/eksi-favori.user.js
// @match        https://eksisozluk.com/*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  function init() {
    const separator = document.createElement('span');
    separator.innerHTML = ' | ';

    const favButton = document.createElement('span');
    favButton.innerText = 'favori';
    favButton.addEventListener('click', () => {
      favButton.classList.toggle('nice-on');
      const entries = Array.from(document.querySelectorAll('[data-favorite-count]'));
      document.querySelector('#entry-item-list').innerHTML = '';
      entries.sort((a, b) => {
        const aFav = parseInt(a.getAttribute('data-favorite-count'));
        const bFav = parseInt(b.getAttribute('data-favorite-count'));
        return bFav - aFav;
      }).forEach((item) => {
        document.querySelector('#entry-item-list').appendChild(item);
      });
    });
    document.querySelector('.nice-mode-toggler').appendChild(separator);
    document.querySelector('.nice-mode-toggler').appendChild(favButton);
  }
  let currentUrl = window.location.href;
  setInterval(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      init();
    }
  }, 2000);

  window.addEventListener('load', () => {
    init();
  });
}());
