// ==UserScript==
// @id           url-to-uri@https://github.com/baturkacamak/userscripts
// @name         Tidal Converter
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script will replace tidal.com urls to tidal://
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @match        *://*/*
// @grant        none
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/url-to-uri#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/url-to-uri#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/url-to-uri/url-to-uri.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/url-to-uri/url-to-uri.user.js
// @run-at       document-idle
// ==/UserScript==

class UrlToUri {
  constructor() {
    this.regexReplace = new RegExp(/(https:\/\/tidal\.com)((\/browse\/track\/|\/track\/)\d+)/, 'i');

    this.mutations();
    this.replace(document.querySelector('body'));
  }

  replace(el) {
    document.querySelectorAll('a[href^="https://tidal"]').forEach((item) => {
      // eslint-disable-next-line no-param-reassign
      item.outerHTML = item.outerHTML.replace(this.regexReplace, 'tidal:/$2?play=true');
    });
    //    const html = el.outerHTML.replace(this.regexReplace, 'tidal:/$2?play=true');
    //    el.outerHTML = html;

    //    const treeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    //    let textNode;
    //    while (textNode = treeWalker.nextNode()) {
    //      if (textNode.nodeValue.match(this.regexReplace)) {
    //        textNode.nodeValue = textNode.nodeValue.replace(this.regexReplace, '<a href="#">tidal:/$2?play=true</a>');
    //      }
    //    }
  }

  mutations() {
    const observer = new MutationObserver(((mutations) => {
      mutations.forEach((mutation) => {
        [...mutation.addedNodes]
          .filter((node) => node.outerHTML.match(this.regexReplace))
          .forEach(this.replace.bind(this));
      });
    }));

    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }
}

// eslint-disable-next-line no-unused-vars
const urlToUri = new UrlToUri();
