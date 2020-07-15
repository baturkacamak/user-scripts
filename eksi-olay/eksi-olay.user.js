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
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

class EksiOlay {
  constructor() {
    this.remoteFile = 'https://github.com/baturkacamak/userscripts/raw/master/eksi-olay/assets/sounds/notifications/juntos.mp3';
    this.beep = new Audio(this.remoteFile);
    this.observer = null;

    this.mutations();
    this.init();
  }

  sendNotification() {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then((result) => {
        if (result === 'denied') {
          console.log('Permission wasn\'t granted. Allow a retry.');
          return;
        }

        if (result === 'default') {
          console.log('The permission request was dismissed.');
          return;
        }

        const options = {
          body: 'Takip edilen baslikta yeni entry',
          icon: 'https://eksisozluk.com/favicon.ico',
          sound: this.remoteFile,
        };
        const n = new Notification('Yeni Entry!', options);
        n.custom_options = {
          url: 'https://eksisozluk.com',
        };
        n.onclick = (event) => {
          event.preventDefault(); // prevent the browser from focusing the Notification's tab
          window.open(n.custom_options.url, '_blank');
        };

        this.beep.play();

        // set time to notify is show
        let timeNotify = 1000;
        if (timeNotify > 0) {
          timeNotify *= 1000;
          setTimeout(n.close.bind(n), timeNotify);
        }
      });
    }
  }

  changeTitle() {
    if (document.querySelector('.tracked .new-update')) {
      const $title = document.querySelector('title');
      if (!$title.innerHTML.includes('OLAY')) {
        $title.innerHTML = `(OLAY) ${$title.innerHTML}`;
      }
    }
  }

  init() {
    if (document.querySelector('.tracked .new-update')) {
      this.beep.play();
      this.changeTitle();
      this.sendNotification();
    }
  }

  mutations() {
    this.observer = new MutationObserver(((mutations) => {
      if ((mutations[0].attributeName === 'class'
           && mutations[0].target.classList.contains('new-update'))
      ) {
        this.init();
      }

      if (mutations[0].target.tagName === 'TITLE') {
        this.changeTitle();
      }
    }));

    this.observer.observe(document, {
      childList: true,
      attributes: true,
      subtree: true,
    });
  }
}

// eslint-disable-next-line no-unused-vars
const olay = new EksiOlay();
