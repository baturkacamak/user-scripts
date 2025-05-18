// ==UserScript==
// @name         EksiSözlük - Post Loader and Appender for Trash
// @namespace    https://eksisozluk.com/
// @version      1.0.5
// @description  Load pagination content and append it to the current list in trash page
// @author       Batur Kacamak
// @match        https://eksisozluk.com/cop
// @grant        none
// @run-at       document-idle
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash#readme
// @updateURL    https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash.user.js
// @downloadURL  https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-loader-apprender-trash/eksi-post-loader-apprender-trash.user.js
// @icon         https://eksisozluk.com/favicon.ico
// ==/UserScript==

(async function() {
  async function simulateRevive(id) {
    const url = `https://eksisozluk.com/cop/canlandir?id=${id}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9,tr;q=0.8,nl;q=0.7',
        'x-requested-with': 'XMLHttpRequest',
      },
      referrer: 'https://eksisozluk.com/cop',
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      mode: 'cors',
      credentials: 'include',
    });
    return response.ok;
  }

  function addReviveClickHandler(item) {
    const reviveLink = item.querySelector('a[href^="/cop/canlandir"]');
    if (reviveLink) {
      reviveLink.addEventListener('click', async function(event) {
        event.preventDefault();
        const id = this.href.split('=')[1];
        const confirmMessage = this.getAttribute('data-confirm-message');
        if (confirm(confirmMessage)) {
          const success = await simulateRevive(id);
          if (success) {
            console.log(`Entry ${id} successfully revived`);
            // Remove the item from the list as it's no longer in trash
            item.remove();
          } else {
            console.log(`Failed to revive entry ${id}`);
          }
        }
      });
    }
  }

  async function getHTML(currentPage, lastPage) {
    const trashItems = document.querySelector('#trash-items');
    while (currentPage <= lastPage) {
      const response = await fetch(`https://eksisozluk.com/cop?p=${currentPage}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newTrashItems = doc.querySelectorAll('#trash-items li');
      const h1 = document.createElement('h1');
      h1.textContent = `${currentPage}`;
      trashItems.appendChild(h1);

      newTrashItems.forEach((item) => {
        const clonedItem = item.cloneNode(true);
        addReviveClickHandler(clonedItem);
        trashItems.appendChild(clonedItem);
      });

      currentPage++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const lastPage = parseInt(document.querySelector('.pager a.last').innerText, 10);
  const currentPage = 2;
  await getHTML(currentPage, lastPage);
})();
