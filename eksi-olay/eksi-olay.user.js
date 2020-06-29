// ==UserScript==
// @id           eksi-olay@https://github.com/baturkacamak/userscripts
// @name         Eksi Olay Notification
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script will change the title of eksi sozluk's title to notify user about "olay".
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/eksi-olay#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/eksi-olay#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/eksi-olay/eksi-olay.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/eksi-olay/eksi-olay.user.js
// @run-at       document-idle
// ==/UserScript==

class EksiOlay {
  constructor() {
    const remoteFile = 'https://github.com/baturkacamak/userscripts/raw/master/eksi-olay/assets/sounds/notifications/juntos.mp3';
    this.beep = new Audio(remoteFile);

    this.cache();
    this.mutations();
    this.init();
  }

  init() {
    if (this.eventSelector) {
      const $title = document.querySelector('title');
      if (!$title.innerHTML.includes('OLAY')) {
        $title.innerHTML = `(OLAY) ${$title.innerHTML}`;
        this.beep.play();
      }
    }
  }

  cache() {
    this.eventSelector = document.querySelector('.tracked .new-update');
    this.targetSelector = document.querySelector('#top-navigation .tracked > a');
  }

  mutations() {
    const observer = new MutationObserver(((mutations) => {
      // eslint-disable-next-line no-unused-vars
      mutations.forEach((mutation) => {
        this.init();
      });
    }));

    observer.observe(this.targetSelector, {
      attributes: true,
    });
  }
}

// eslint-disable-next-line no-unused-vars
const olay = new EksiOlay();
