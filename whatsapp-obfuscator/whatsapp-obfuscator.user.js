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
// @run-at       document-idle
// @grant        none
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/whatsapp-obfuscator#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/whatsapp-obfuscator#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/whatsapp-obfuscator.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/whatsapp-obfuscator/whatsapp-obfuscator.user.js
// @icon         https://whatsapp.com/favicon.ico
// ==/UserScript==

class WhatsappObfuscator {
  static createObfuscatedText(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  constructor() {
    this.SELECTORS = {
      mutationObserver: 'div[tabindex="-1"]>div>div>span',
      titles: 'span[title][dir]:not(.changed-title)',
      images: 'img._2goTk',
    };

    this.events();
    this.mutations();
  }

  cache() {
    this.images = document.querySelectorAll(this.SELECTORS.images);
    this.titles = document.querySelectorAll(this.SELECTORS.titles);
  }

  mutations() {
    this.observer = new MutationObserver(((mutations) => {
      [...mutations].forEach(
        (mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.querySelector(this.SELECTORS.titles)
                || [...node.classList].includes('_2goTk')
              ) {
                // whatsapp is ready
                this.init();
              }
            });
          }
        },
      );
    }));

    this.observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  events() {
    document.querySelector('body').addEventListener('click', this.init.bind(this));
  }

  removeInfo() {
    console.log('this.images.length :>> ', this.images.length);
    if (this.images.length > 0) {
      this.images.forEach((item) => item.remove());
    }

    if (this.titles.length > 0) {
      this.titles.forEach((item) => {
        // eslint-disable-next-line no-param-reassign
        item.innerText = WhatsappObfuscator.createObfuscatedText(40);
        item.classList.add('changed-title');
      });
    }
  }

  init() {
    this.cache();
    this.removeInfo();
  }
}

const whatsappObfuscator = new WhatsappObfuscator();
