// ==UserScript==
// @id           whatsapp-obfuscator@https://github.com/baturkacamak/userscripts
// @name         Whatsapp Obfuscator
// @namespace    https://github.com/baturkacamak/userscripts
// @name         Whatsapp
// @version      0.1
// @description  This script will obfuscate names in whatsapp web and removes photos of the users.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @match        https://*.whatsapp.com/*
// @run-at       document-end
// @grant        none
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/whatsapp-obfuscator#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/whatsapp-obfuscator#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/whatsapp-obfuscator.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/whatsapp-obfuscator.user.js
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  const IMAGE_SELECTOR = 'img._2goTk._1Jdop._3Whw5[src][style]';
  const TITLE_SELECTOR = 'span[title][dir]:not(.changed-title)';

  function createObfuscatedText(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  function removeInfo() {
    if (document.querySelectorAll(IMAGE_SELECTOR).length > 0) {
      document.querySelectorAll(IMAGE_SELECTOR).forEach((item) => { item.remove(); });
    }

    if (document.querySelectorAll(TITLE_SELECTOR).length > 0) {
      document.querySelectorAll(TITLE_SELECTOR).forEach((item) => {
      // eslint-disable-next-line no-param-reassign
        item.innerText = createObfuscatedText(40);
        item.classList.add('changed-title');
      });
    }
  }

  // detect click and remove
  document.querySelector('body').addEventListener('click', () => {
    setTimeout(removeInfo, 100);
  });

  // initial remove
  removeInfo();
  const interval = setInterval(() => {
    if (document.querySelector('body').classList.contains('vsc-initialized')
     && document.querySelectorAll(TITLE_SELECTOR).length > 0
     && document.querySelectorAll(IMAGE_SELECTOR).length > 0) {
      removeInfo();
      clearInterval(interval);
    }
  }, 1000);
}());
