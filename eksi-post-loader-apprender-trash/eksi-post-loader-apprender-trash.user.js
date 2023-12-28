// ==UserScript==
// @name         EksiSözlük - Post Loader and Appender for Trash
// @namespace    https://eksisozluk111.com/
// @version      1.0.3
// @description  Load pagination content and append it to the current list in trash page
// @author       Batur Kacamak
// @match        https://eksisozluk111.com/cop
// @grant        none
// @run-at       document-idle
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash#readme
// @updateURL    https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash.user.js
// @downloadURL  https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash.user.js
// @icon         https://eksisozluk111.com/favicon.ico
// ==/UserScript==

(async function() {
  async function getHTML(currentPage, lastPage) {
    const trashItems = document.querySelector('#trash-items');

    while (currentPage <= lastPage) {
      const response = await fetch(`https://eksisozluk111.com/cop?p=${currentPage}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newTrashItems = doc.querySelectorAll('#trash-items li');
      newTrashItems.forEach((item) => trashItems.appendChild(item));
      currentPage++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const lastPage = document.querySelector('.pager a.last').innerText;
  const currentPage = 2;

  await getHTML(currentPage, lastPage);
})();
