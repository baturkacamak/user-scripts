import { Logger, DOMObserver, Button } from '../../common/core/index.js';

/* global axios, v, moment, unsafeWindow */

class GoogleMapsImageDownloader {
  constructor() {
    this.logger = new Logger('[GoogleMapsImageDownloader]');
    this.domObserver = new DOMObserver(this.logger);
    this.coreButton = new Button(this.logger);
    this.initialLoad = true;
    this.imageSelector = '[role=img] > a.gallery-cell';
    this.imageContainersQuery = '#pane .section-layout[style] > div > [role=img]';
    this.downloadButtonElement = null; // Store the button element created by Core Button
    this.imageUrl = null;
    this.logger.log('Initialized');
  }

  // Helper to add event listeners, kept as an instance method for now
  addEventListeners(selector, callback, event = 'click', scope = document) {
    [...scope.querySelectorAll(selector)].forEach(
        (item) => {
          item.addEventListener(event, callback);
        },
    );
  }

  init() {
    this.logger.log('Starting init...');
    this.domObserver.observeDOM(document, this.handleDOMChanges.bind(this), { childList: true, subtree: true });
    this.logger.log('DOM observation started.');
  }

  handleDOMChanges(mutations) {
    // Check if image containers are present or if relevant nodes were added
    let relevantChange = false;
    if (document.querySelectorAll(this.imageContainersQuery).length > 0) {
        relevantChange = true;
    } else {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.removedNodes) {
                    // If a container that previously held our button is removed, we might need to re-evaluate
                    if (node === this.downloadButtonElement?.parentNode) {
                        relevantChange = true;
                        break;
                    }
                }
                if (relevantChange) break;
            }
        }
    }

    if (!relevantChange) return;

    if (document.querySelectorAll(this.imageContainersQuery).length > 0) {
      // Logic to find newly added image containers and attach listeners
      // This part is slightly different as mutations are now records, not a live list
      // We might need to re-scan or refine this logic based on how dynamic the content is.
      // For now, let's assume we re-evaluate on any significant DOM change if containers exist.

      document.querySelectorAll(this.imageContainersQuery).forEach(container => {
        // Check if we already processed this container or if it needs listeners
        // This is a simplified approach; a more robust way might involve marking processed elements.
        if (!container.dataset.gmidProcessed) {
            this.addEventListeners(
                this.imageSelector,
                this.getImageUrl.bind(this),
                'click',
                container, // Observe within the specific container
            );
            container.dataset.gmidProcessed = 'true';

            if (this.initialLoad) {
                const firstImage = container.querySelector(this.imageSelector);
                if (firstImage) {
                    this.logger.log('Clicking first image automatically.');
                    firstImage.click(); // This should trigger getImageUrl and addDownloadButton
                }
                this.initialLoad = false;
            }
        }
      });

    } else {
      this.removeDownloadButton();
    }
  }

  removeDownloadButton() {
    if (this.downloadButtonElement && this.downloadButtonElement.parentNode) {
      this.downloadButtonElement.parentNode.removeChild(this.downloadButtonElement);
      this.logger.log('Download button removed.');
    }
    this.downloadButtonElement = null;
  }

  addDownloadButton() {
    this.removeDownloadButton(); // Remove any existing button first
    this.logger.log('Adding download button...');

    this.downloadButtonElement = this.coreButton.createButton({
      id: 'gmid-download-btn',
      label: 'Download Image', // For accessibility, though it's an icon button
      iconUrl: 'https://www.gstatic.com/images/icons/material/system_gm/2x/arrow_back_gm_grey_24dp.png',
      onClick: this.downloadFile.bind(this),
      buttonType: 'icon', // Assuming core.Button handles icon styling or provide class
    });

    if (!this.downloadButtonElement) {
        this.logger.error('Core Button creation failed.');
        return;
    }

    // Apply necessary custom styles for positioning and appearance
    const buttonStyles = {
      position: 'absolute',
      left: '24px',
      bottom: '42px',
      transform: 'rotate(-90deg)',
      pointerEvents: 'auto',
      background: 'rgba(255, 240, 240, 0.27)',
      zIndex: '9999',
      padding: '5px', // Example padding
      borderRadius: '50%', // Example border radius
      cursor: 'pointer',
    };
    Object.assign(this.downloadButtonElement.style, buttonStyles);

    // Ensure the icon itself is visible if createButton wraps the img
    const imgElement = this.downloadButtonElement.querySelector('img');
    if (imgElement) {
        imgElement.style.display = 'block';
    }

    let appendSelector = '.app-bottom-content-anchor';
    const viewerFooter = document.querySelector('#viewer-footer');

    if (viewerFooter) {
      appendSelector = '#viewer-footer';
    } else {
      // Adjust styles if appended to the alternative anchor
      this.downloadButtonElement.style.right = '55px';
      this.downloadButtonElement.style.bottom = '35px';
      delete this.downloadButtonElement.style.left; // Remove left if right is set
    }

    const appendTarget = document.querySelector(appendSelector);
    if (appendTarget) {
      appendTarget.appendChild(this.downloadButtonElement);
      this.logger.log(`Download button added to ${appendSelector}.`);
    } else {
      this.logger.warn(`Could not find append target: ${appendSelector}. Button not added.`);
      this.downloadButtonElement = null; // Clear if not added
    }
  }

  downloadFile() {
    if (!this.imageUrl) {
      this.logger.warn('Image URL not set. Cannot download.');
      return;
    }
    this.logger.log(`Downloading image from: ${this.imageUrl}`);
    axios({
      url: this.imageUrl,
      method: 'GET',
      responseType: 'blob',
    }).then((response) => {
      let fileName = 'google-maps-image';
      const headlineElement = document.querySelector('div.gm2-headline-6[jsan]');
      const titleCardElement = document.querySelector('h1.widget-titlecard-header > span');

      if (headlineElement && headlineElement.innerText) {
        fileName = headlineElement.innerText;
      } else if (titleCardElement && titleCardElement.innerText) {
        fileName = titleCardElement.innerText;
      }

      fileName = v.slugify(fileName);
      const fileDate = moment().format('YYYY-MM-D-HH-mm-ss');

      const blobData = new Blob([response.data], {type: 'image/jpeg'});
      const url = window.URL.createObjectURL(blobData);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}-${fileDate}.jpeg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up blob URL
      this.logger.log(`Successfully initiated download for: ${fileName}-${fileDate}.jpeg`);
    }).catch(error => {
      this.logger.error('Error downloading file:', error);
    });
  }

  getImageUrl(event) { // event might be useful to get the clicked element
    // Ensure a button is added (or re-added if it was removed)
    // This is called on image click, so it's a good place to ensure the button is visible.
    this.addDownloadButton();
    this.logger.log('Attempting to get image URL...');

    // The clicked element is event.currentTarget if using addEventListeners correctly
    const clickedImageContainer = event ? event.currentTarget.closest('.gallery-cell') : null;

    const interval = setInterval(() => {
      let selectedImageElement = null;
      // Prioritize the image that was actually clicked, if available
      if (clickedImageContainer) {
          selectedImageElement = clickedImageContainer.querySelector('.gallery-image-high-res.loaded');
      }
      // Fallback to the globally selected image or the first image
      if (!selectedImageElement) {
          selectedImageElement = document.querySelector('.gallery-cell.selected .gallery-image-high-res.loaded');
      }
      if (!selectedImageElement) {
          const firstGalleryImageContainer = document.querySelector('.gallery-cell[data-photo-index="0"]');
          if (firstGalleryImageContainer) {
            selectedImageElement = firstGalleryImageContainer.querySelector('.gallery-image-high-res.loaded, div[style*="background-image"]');
          }
      }

      let backgroundImage = null;
      if (selectedImageElement && selectedImageElement.style.backgroundImage) {
        backgroundImage = selectedImageElement.style.backgroundImage;
      }

      if (backgroundImage) {
        clearInterval(interval);
        this.logger.log(`Found background image style: ${backgroundImage}`);
        const regex = /url\(['"]?(.*?)['"]?\)/; // More robust regex for url("...") or url(...)
        const result = backgroundImage.match(regex);

        if (result && result[1]) {
          let hiresUrl = result[1].replace(/=s\d+/, '=s2048');
          hiresUrl = hiresUrl.replace(/=w\d+/, '=w2048');
          hiresUrl = hiresUrl.replace(/=h\d+/, '=h2048'); // Request even higher res
          this.imageUrl = hiresUrl;
          this.logger.log(`Image URL obtained: ${this.imageUrl}`);
        } else {
          this.logger.warn('Could not parse background image URL from style:', backgroundImage);
        }
      } else {
        this.logger.debug('Waiting for image to load or get selected...');
      }
    }, 500);
  }
}

// Initialization logic will be handled by the userscript loader or build process
// For development, you might instantiate and attach to window:
// if (typeof unsafeWindow !== 'undefined') {
//   unsafeWindow.googleMapsImageDownloader = new GoogleMapsImageDownloader();
//   unsafeWindow.googleMapsImageDownloader.init();
// }

// The following event listeners should be managed by the application loading this script
// For instance, the dev-script-loader can call init on specific events if needed.
// unsafeWindow.onload = async () => {
//   if (unsafeWindow.googleMapsImageDownloader && typeof unsafeWindow.googleMapsImageDownloader.init === 'function') {
//      await unsafeWindow.googleMapsImageDownloader.init();
//   }
// };
//
// unsafeWindow.addEventListener('pushState', async () => {
//  if (unsafeWindow.googleMapsImageDownloader && typeof unsafeWindow.googleMapsImageDownloader.init === 'function') {
//    await unsafeWindow.googleMapsImageDownloader.init();
//  }
// }, false);

export default GoogleMapsImageDownloader; 