// ==UserScript==
// @id           googlemaps-image-downloader@https://github.com/baturkacamak/userscripts
// @name         Google Maps Image Downloader
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  w
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/googlemaps-image-downloader#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/googlemaps-image-downloader#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/googlemaps-image-downloader/googlemaps-image-downloader.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/googlemaps-image-downloader/googlemaps-image-downloader.user.js
// @match        https://www.google.com/maps/place/**
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.19.2/axios.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/voca/1.4.0/voca.min.js
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

// eslint-disable-next-line func-names
(function () {
  class GoogleMapsImageDownloader {
    constructor() {
      this.elementCount = 0;
      this.imageSelector = '[role=img] > a.gallery-cell';
      this.anchor = null;
      this.timeout = null;
      this.elementDiv = null;
      this.currentURL = new URL(location.href);
    }

    async init() {
      if (document.querySelector(this.imageSelector)) {
        await this.events();
      }
    }

    isURLChanged() {
      const regex = /.*\//;
      const url = new URL(location.href);

      const urlPath = url.pathname.match(regex)[0];
      const currentURLPath = this.currentURL.pathname.match(regex)[0];

      if (urlPath !== currentURLPath) {
        this.currentURL = url;
        return true;
      }

      return false;
    }

    async events() {
      await this.waitUntil(this.imageSelector);
      await this.elementsEventListener(this.imageSelector, this.getImageUrl.bind(this));
    }

    waitUntil(selector) {
      return new Promise((resolve, reject) => {
        let times = 0;
        const delayInMs = 100;

        const interval = setInterval(() => {
          if (document.querySelector(selector)) {
            clearInterval(interval);
            resolve();
          } else {
            times += delayInMs;

            if (times === 5000) {
              clearInterval(interval);
              reject();
            }
          }
        }, delayInMs);
      });
    }

    async elementsEventListener(selector, callback, event = 'click') {
      const elements = document.querySelectorAll(selector);

      this.elementCount = elements.length;

      elements.forEach((item) => {
        if (item) {
          item.addEventListener(event, callback);
        }
      });
    }

    removeDownloadButton() {
      if (this.elementDiv) {
        if (document.querySelector('#viewer-footer')) {
          document.querySelector('#viewer-footer').removeChild(this.elementDiv);
        }
        if (document.querySelector('.app-bottom-content-anchor')) {
          document.querySelector('.app-bottom-content-anchor').removeChild(this.elementDiv);
        }
      }
    }

    addDownloadButton() {
      this.removeDownloadButton();
      const downloadIconUrl = 'https://www.gstatic.com/images/icons/material/system_gm/2x/arrow_back_gm_grey_24dp.png';
      this.elementDiv = document.createElement('div');

      let elementDivStyles = {
        position: 'absolute',
        left: '24px',
        bottom: '42px',
        transform: 'rotate(-90deg)',
        pointerEvents: 'auto',
        background: 'rgba(255, 240, 240, 0.27)',
      };

      const image = document.createElement('img');
      image.style.display = 'block';
      image.setAttribute('src', downloadIconUrl);

      this.anchor = document.createElement('div');
      this.anchor.style.cursor = 'pointer';
      this.anchor.addEventListener('click', this.downloadFile.bind(this), false);

      this.anchor.append(image);
      this.elementDiv.append(this.anchor);
      let appendSelector = '.app-bottom-content-anchor';

      if (document.querySelector('#viewer-footer')) {
        appendSelector = '#viewer-footer';
      } else {
        const customStyles = { right: '55px', bottom: '35px' };
        elementDivStyles = {
          ...elementDivStyles,
          ...customStyles,
        };
        delete elementDivStyles.left;
      }
      Object.assign(this.elementDiv.style, elementDivStyles);
      document.querySelector(appendSelector).append(this.elementDiv);
    }

    downloadFile() {
      axios({
        url: this.imageUrl,
        method: 'GET',
        responseType: 'blob', // important
      }).then((response) => {
        let fileName = 'file';
        if (document.querySelector('div.gm2-headline-6[jsan]')) {
          fileName = document.querySelector('div.gm2-headline-6[jsan]').innerText;
        } else if (document.querySelector('h1.widget-titlecard-header > span')) {
          fileName = document.querySelector('h1.widget-titlecard-header > span').innerText;
        }

        fileName = v.slugify(fileName);

        const fileDate = moment().format('YYYY-MM-D-HH-mm-ss');

        const blobData = new Blob([response.data]);
        const url = window.URL.createObjectURL(blobData);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}-${fileDate}.jpeg`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    checkElementCount() {
      const elementCount = document.querySelectorAll(this.imageSelector).length;
      return this.elementCount === elementCount;
    }

    async bindNewImages() {
      clearInterval(this.timeout);
      this.timeout = setTimeout(async () => {
        if (!this.checkElementCount()) {
          console.log('this.checkElementCount()', this.checkElementCount());
          await this.elementsEventListener(this.imageSelector, this.getImageUrl.bind(this));
        }
      }, 1000);
    }

    getImageUrl() {
      console.log('getImageUrl');
      this.addDownloadButton();
      setTimeout(() => {
        const selectedImage = document.querySelector('.gallery-cell.selected .gallery-image-high-res');

        let backgroundImage = null;
        if (selectedImage) {
          backgroundImage = selectedImage.style.backgroundImage;
        } else {
          backgroundImage = document.querySelector('.gallery-cell[data-photo-index="0"]').style.backgroundImage;
        }

        const regex = /\("(.*)"\)/;
        const result = backgroundImage.match(regex);
        if (result) {
          const imageUrlHQ = result[1].replace(/(?<==.)\d*/, '1920');
          this.imageUrl = imageUrlHQ;
        }
      }, 300);
    }
  }
  const watchHistory = () => {
    const _wr = function (type) {
      const orig = history[type];
      return function (state, title, url) {
        const urlChange = (url && url !== location.href);
        const rv = orig.apply(this, arguments);
        if (urlChange) {
          const e = new Event(type);
          e.arguments = arguments;
          window.dispatchEvent(e);
        }
        return rv;
      };
    };
    window.history.pushState = _wr('pushState');
    window.history.replaceState = _wr('replaceState');
  };

  const googleMapsImageDownloader = new GoogleMapsImageDownloader();
  window.onload = async () => {
    watchHistory();
    await googleMapsImageDownloader.init();
  };

  window.addEventListener('pushState', async () => {
    await googleMapsImageDownloader.init();
  }, false);
// window.addEventListener('replaceState', async () => {
}());
