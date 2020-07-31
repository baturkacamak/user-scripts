// ==UserScript==
// @id           googlemaps-image-downloader@https://github.com/baturkacamak/userscripts
// @name         Google Maps Image Downloader
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.11
// eslint-disable-next-line max-len
// @description  This script will add a button to download the current highlighted image from Google Places
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/googlemaps-image-downloader#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/googlemaps-image-downloader#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/googlemaps-image-downloader/googlemaps-image-downloader.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/googlemaps-image-downloader/googlemaps-image-downloader.user.js
// @include      /^https:\/\/(www\.)?google(?=.*maps).*/
// @require      https://cdnjs.cloudflare.com/ajax/libs/axios/0.19.2/axios.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/voca/1.4.0/voca.min.js
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_addStyle
// @icon         https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico
// ==/UserScript==

/* global axios, v, moment, unsafeWindow */

// eslint-disable-next-line func-names
class GoogleMapsImageDownloader {
  static addEventListeners(selector, callback, event = 'click', scope = document) {
    [...scope.querySelectorAll(selector)].forEach(
      (item) => {
        item.addEventListener(event, callback);
      },
    );
  }

  constructor() {
    this.initialLoad = true;
    this.imageSelector = '[role=img] > a.gallery-cell';
    this.imageContainersQuery = '#pane .section-layout[style] > div > [role=img]';
    this.anchor = null;
    this.elementDiv = null;
  }

  async init() {
    this.mutations();
  }

  mutations() {
    const observer = new MutationObserver(((mutations) => {
      if (document.querySelectorAll(this.imageContainersQuery).length > 0) {
        mutations.forEach((mutation) => {
          [...mutation.addedNodes]
            .filter((addedNode) => addedNode
                                   && addedNode.nodeType === 1
                                   && addedNode.querySelectorAll(this.imageSelector).length > 0)
            .forEach((addedNode) => {
              GoogleMapsImageDownloader.addEventListeners(
                this.imageSelector,
                this.getImageUrl.bind(this),
                'click',
                addedNode,
              );
              if (this.initialLoad) {
                addedNode.querySelectorAll(this.imageSelector)[0].click();
                this.initialLoad = false;
              }
            });
        });
      } else {
        this.removeDownloadButton();
      }
    }));

    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  removeDownloadButton() {
    if (this.elementDiv) {
      if (document.querySelector('#viewer-footer')) {
        document.querySelector('#viewer-footer').removeChild(this.elementDiv);
      }
      if (document.querySelector('.app-bottom-content-anchor')) {
        document.querySelector('.app-bottom-content-anchor').removeChild(this.elementDiv);
        this.elementDiv = null;
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

  getImageUrl() {
    this.addDownloadButton();
    const interval = setInterval(() => {
      const selectedImage = document.querySelector('.gallery-cell.selected .gallery-image-high-res.loaded');

      let backgroundImage = null;
      if (selectedImage) {
        backgroundImage = selectedImage.style.backgroundImage;
      } else {
        backgroundImage = document.querySelector('.gallery-cell[data-photo-index="0"]').style.backgroundImage;
      }

      if (backgroundImage) {
        clearInterval(interval);
        const regex = /\("(.*)"\)/;
        const result = backgroundImage.match(regex);

        if (result) {
          this.imageUrl = result[1].replace(/(?<==.)\d*/, '1920');
        }
      }
    }, 500);
  }
}

const googleMapsImageDownloader = new GoogleMapsImageDownloader();
unsafeWindow.onload = async () => {
  await googleMapsImageDownloader.init();
};

unsafeWindow.addEventListener('pushState', async () => {
  await googleMapsImageDownloader.init();
}, false);
