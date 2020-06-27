// ==UserScript==
// @name         Whatsapp
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script will obfuscate names in whatsapp web and removes photos of the users.
// @author       Batur Kacamak
// @match        https://*.whatsapp.com/*
// @run-at       document-end
// @homepage    https://github.com/jerone/UserScripts/tree/master/Github_Comment_Enhancer#readme
// @homepageURL https://github.com/jerone/UserScripts/tree/master/Github_Comment_Enhancer#readme
// @downloadURL https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/index.user.js
// @updateURL   https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/index.user.js
// ==/UserScript==

const IMAGE_SELECTOR = 'img._2goTk._1Jdop._3Whw5[src][style]';
const TITLE_SELECTOR = 'span[title][dir]:not(.changed-title)';

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
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
      item.innerText = makeid(40);
      item.classList.add('changed-title');
    });
  }
}
removeInfo();
document.querySelector('body').addEventListener('click', () => {
  setTimeout(removeInfo, 100);
});

const interval = setInterval(() => {
  if (document.querySelector('body').classList.contains('vsc-initialized')
     && document.querySelectorAll(TITLE_SELECTOR).length > 0
     && document.querySelectorAll(IMAGE_SELECTOR).length > 0) {
    removeInfo();
    clearInterval(interval);
  }
}, 1000);
