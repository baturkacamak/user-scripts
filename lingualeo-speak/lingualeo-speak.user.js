// ==UserScript==
// @id           lingualeo-speak@https://github.com/baturkacamak/userscripts
// @name         Lingualeo Speaker
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script will click on lingualeo speaker button to hear pronunciation of the word in sprint mode.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/lingualeo-speak#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/lingualeo-speak#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/lingualeo-speak/lingualeo-speak.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/lingualeo-speak/lingualeo-speak.user.js
// @match        https://lingualeo.com/tr/training/leoSprint
// @grant        none
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  function init() {
    let word = document.querySelector('.ll-LeoSprint__text').innerText;
    document.querySelector('.ll-LeoSprint__btn-sound').click();
    setInterval(() => {
      if (document.querySelector('.ll-LeoSprint__text')) {
        const currentWord = document.querySelector('.ll-LeoSprint__text').innerText;

        if (!document.querySelector('.ll-LeoSprint__btn-sound__m-muted')) {
          document.querySelector('.ll-LeoSprint__btn-sound').click();
        }

        if (currentWord !== word) {
          word = currentWord;
          document.querySelector('.ll-LeoSprint__question-wrapper .ll-leokit__button').click();
        }
      }
    }, 100);
  }

  const loadInterval = setInterval(() => {
    if (document.querySelector('.ll-LeoSprint__text')) {
      clearInterval(loadInterval);
      init();
    }
  }, 500);
}());
