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
// ==/UserScript==

class WhatsappObfuscator {
  constructor() {
    this.IMAGE_QUERY = 'img._2goTk._1Jdop._3Whw5[src][style]';
    this.TITLE_QUERY = 'span[title][dir]:not(.changed-title)';
    this.events();
  }

  cache() {
    this.images = document.querySelectorAll(this.IMAGE_QUERY);
    this.titles = document.querySelectorAll(this.TITLE_QUERY);
  }

  events() {
    document.querySelector('body').addEventListener('click', this.init.bind(this));
  }

  removeInfo() {
    if (this.images.length > 0) {
      this.images.forEach((item) => { item.remove(); });
    }

    if (this.titles.length > 0) {
      this.titles.forEach((item) => {
        // eslint-disable-next-line no-param-reassign
        item.innerText = this.createObfuscatedText(40);
        item.classList.add('changed-title');
      });
    }
  }

  init() {
    this.cache();
    this.removeInfo();
  }

  createObfuscatedText(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}

const whatsappObfuscator = new WhatsappObfuscator();
