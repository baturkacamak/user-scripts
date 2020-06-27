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
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  setInterval(() => {
    if (document.querySelector('.tracked .new-update')) {
      const $title = document.querySelector('title');
      if (!$title.innerHTML.includes('OLAY')) {
        $title.innerHTML = `(OLAY) ${$title.innerHTML}`;
      }
    }
  }, 2000);
}());
