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
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

class EksiFavori {
  static getSeparator() {
    const separator = document.createElement('span');
    separator.innerHTML = ' | ';
    return separator;
  }

  static getLength(node) {
    return [...node.querySelector('.content').textContent.matchAll(/(\s+| )/g)].length
  }

  static sortEntriesByLength(e) {
    e.target.classList.toggle('nice-on');
    const entries = Array.from(document.querySelectorAll('[data-favorite-count]'));
    document.querySelector('#entry-item-list').innerHTML = '';
    entries
    .sort((a, b) => EksiFavori.getLength(b) - EksiFavori.getLength(a))
    .forEach((item) => {
      item.querySelector('.feedback').insertAdjacentHTML('beforeend', `<span class="favorite-links">Length: <strong>${EksiFavori.getLength(item)}</strong></span>`);
      document.querySelector('#entry-item-list').appendChild(item).classList.add('favorite-on');
    });
  }

  static sortTitles(e) {
    const titles = Array.from(document.querySelectorAll('.topic-list li:not([id])'));
    document.querySelector('.topic-list').innerHTML = '';
    titles.sort((a, b) => {
      // eslint-disable-next-line radix
      const aFav = parseInt(a.querySelector('small').innerText);
      // eslint-disable-next-line radix
      const bFav = parseInt(b.querySelector('small').innerText);
      return bFav - aFav;
    }).forEach((item) => {
      document.querySelector('.topic-list').appendChild(item);
    });
  }

  static sortEntries(e) {
    e.target.classList.toggle('nice-on');
    const entries = Array.from(document.querySelectorAll('[data-favorite-count]'));
    document.querySelector('#entry-item-list').innerHTML = '';
    entries.sort((a, b) => {
      // eslint-disable-next-line radix
      const aFav = parseInt(a.getAttribute('data-favorite-count'));
      // eslint-disable-next-line radix
      const bFav = parseInt(b.getAttribute('data-favorite-count'));
      return bFav - aFav;
    }).forEach((item) => {
      document.querySelector('#entry-item-list').appendChild(item).classList.add('favorite-on');
    });
  }

  static getFavButton() {
    const favButton = document.createElement('span');
    favButton.innerText = 'favori';
    favButton.addEventListener('click', EksiFavori.sortEntries);
    return favButton;
  }

  static getLengthButton() {
    const lengthButton = document.createElement('span');
    lengthButton.innerText = 'length';
    lengthButton.addEventListener('click', EksiFavori.sortEntriesByLength);
    return lengthButton;
  }

  static init() {
    if (!document.querySelector('#entry-item-list.favorite-on')
        && document.querySelector('.nice-mode-toggler')) {
      document.querySelector('.nice-mode-toggler').appendChild(EksiFavori.getSeparator());
      document.querySelector('.nice-mode-toggler').appendChild(EksiFavori.getFavButton());
      document.querySelector('.nice-mode-toggler').appendChild(EksiFavori.getSeparator());
      document.querySelector('.nice-mode-toggler').appendChild(EksiFavori.getLengthButton());
      EksiFavori.sortTitles();
    }
  }

  constructor() {
    this.cache();
    this.mutations();
    EksiFavori.init();
  }

  cache() {
    this.observerTarget = document.querySelector('#main');
  }

  mutations() {
    const observer = new MutationObserver((mutations) => {
      // check for removed target
      if (mutations[0].removedNodes) {
        EksiFavori.init();
      }
    });

    observer.observe(this.observerTarget, {
      childList: true,
    });
  }
}

// eslint-disable-next-line no-unused-vars
const eksiFavori = new EksiFavori();