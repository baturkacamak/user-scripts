// ==UserScript==
// @id           eksi-block-post-favorited-users@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Block Multiple Users in Bulk
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.4
// @description  This script allows the user to block multiple users in bulk on by fetching the list of users who have favorited a specific post and adding a note with the post title and ID.
// @author       Batur Kacamak
// @copyright    2022+, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-block-post-favorited-users#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-block-post-favorited-users#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-block-post-favorited-users/eksi-block-post-favorited-users.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-block-post-favorited-users/eksi-block-post-favorited-users.user.js
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function(url, data) {
  const Endpoints = Object.freeze({
    BLOCK: 'https://eksisozluk.com/userrelation/addrelation',
    FAVORITES: 'https://eksisozluk.com/entry/favorileyenler',
    ADD_NOTE: 'https://eksisozluk.com/biri/{username}/note',
  });

  const delay = (second) => new Promise((res) => setTimeout(res, second * 1000));

  class EksiError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  class EksiRemoteRequest {
    setupXHR(xhr, method, url, data, headers = {}) {
      xhr.open(method, url, true);
      xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
      if ('POST' === method) {
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      }
      if (headers) {
        for (const header in headers) {
          xhr.setRequestHeader(header, headers[header]);
        }
      }
    }

    handleReadyState(xhr, resolve, reject) {
      xhr.onreadystatechange = function() {
        if (4 === xhr.readyState) {
          if (200 === xhr.status) {
            resolve(xhr.responseText);
          } else {
            reject(xhr.statusText);
          }
        }
      };
    }

    async makeRequest(method, url, data = null, headers = {}) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        this.setupXHR(xhr, method, url, data, headers);
        this.handleReadyState(xhr, resolve, reject);
        xhr.send(data);
      });
    }

    async get(url) {
      return this.makeRequest('GET', url);
    }

    async post(url, data = {}) {
      return this.makeRequest('POST', url, data);
    }
  }

  class EksiDOM {
    querySelector(selector, context = document) {
      return context.querySelector(selector);
    }

    querySelectorAll(selector, context = document) {
      return context.querySelectorAll(selector);
    }

    createElement(tagName) {
      return document.createElement(tagName);
    }

    addClass(element, className) {
      element.classList.add(className);
    }

    removeClass(element, className) {
      element.classList.remove(className);
    }

    hasClass(element, className) {
      return element.classList.contains(className);
    }

    toggleClass(element, className) {
      element.classList.toggle(className);
    }

    appendChild(parent, child) {
      parent.appendChild(child);
    }

    removeChild(parent, child) {
      parent.removeChild(child);
    }

    addEventListener(element, event, callback) {
      element.addEventListener(event, callback);
    }
  }

  class EksiHtmlParser {
    constructor() {
      this.domHandler = new EksiDOM();
    }

    parseHtml(html) {
      return new DOMParser().parseFromString(html, 'text/html');
    }

    parseFavoritesHtml(html) {
      const ul = this.parseHtml(html);
      const anchorTags = this.domHandler.querySelectorAll('li a', ul);
      const hrefs = [];
      anchorTags.forEach((a) => {
        if (a.href.includes('biri')) {
          hrefs.push(a.href);
        }
      });
      return hrefs;
    }

    parseUserIdFromProfile(html) {
      try {
        const doc = this.parseHtml(html);
        const input = this.domHandler.querySelector('#who', doc);
        if (input) {
          return input.value;
        } else {
          console.log('input not found');
        }
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    parsePostTitle() {
      const titleElement = this.domHandler.querySelector('h1#title');
      if (titleElement) {
        const title = titleElement.innerText.trim();
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
      return '';
    }
  }

  class EksiCSS {
    constructor() {
      this.styleTagId = 'eksi-css-style';
      this.domHandler = new EksiDOM();
    }

    getStyleTag() {
      return document.getElementById(this.styleTagId);
    }

    createStyleTag() {
      const style = this.domHandler.createElement('style');
      style.id = this.styleTagId;
      style.type = 'text/css';
      this.domHandler.appendChild(document.head, style);
      return style;
    }

    hasCSSAdded(css) {
      return this.getStyleTag().innerHTML.includes(css);
    }

    addCSS(css) {
      let style = this.getStyleTag();
      if (!style) {
        style = this.createStyleTag();
      }
      if (!this.hasCSSAdded(css)) {
        this.domHandler.appendChild(style, document.createTextNode(css));
      }
    }
  }

  class EksiBlockUsers {
    constructor() {
      this.remoteRequest = new EksiRemoteRequest();
      this.htmlParser = new EksiHtmlParser();
      this.notification = new EksiNotification();
      this.totalUserCount = 0;
      this.currentBlocked = 1;
      this.timeout = 15;
      this.delay = 10;
      this.maxRetries = 3; // Maximum number of retries
    }

    async fetchFavorites(entryId) {
      try {
        const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
        return this.htmlParser.parseFavoritesHtml(html);
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    async blockUsers(entryId) {
      try {
        const userUrls = await this.fetchFavorites(entryId);
        this.totalUserCount = userUrls.length;
        const postTitle = this.htmlParser.parsePostTitle();
        if (userUrls) {
          for (const userUrl of userUrls) {
            const userProfileHtml = await this.fetchUserProfile(userUrl);
            const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);
            await this.retryOperation(() => this.blockUser(userId));
            await this.retryOperation(() => this.addNoteToUser(userUrl, userId, postTitle, entryId));
            await delay(this.delay);
          }
        }
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    async fetchUserProfile(url) {
      try {
        return await this.remoteRequest.get(url);
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    async blockUser(userId) {
      try {
        const blockTypes = ['i', 'u'];
        for (const blockType of blockTypes) {
          await this.remoteRequest.post(`${Endpoints.BLOCK}/${userId}?r=${blockType}`);
        }
        this.updateNotification();
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    async addNoteToUser(userUrl, userId, postTitle, entryId) {
      try {
        const username = userUrl.split('/').pop();
        const noteUrl = Endpoints.ADD_NOTE.replace('{username}', username);
        const data = `who=${userId}&usernote=${encodeURIComponent(postTitle)} with post URL https://eksisozluk.com/entry/${entryId}`;
        await this.remoteRequest.post(noteUrl, data);
      } catch (error) {
        throw new EksiError(error.message, error.statusCode);
      }
    }

    async retryOperation(operation) {
      let attempts = 0;
      while (attempts < this.maxRetries) {
        try {
          await operation();
          return;
        } catch (error) {
          attempts++;
          if (attempts >= this.maxRetries) {
            console.error(`Operation failed after ${this.maxRetries} attempts:`, error);
            return;
          }
          await delay(this.delay);
        }
      }
    }

    updateNotification() {
      this.calculateTimeout();
      this.updateNotificationMessage();
      this.incrementBlockedCount();
    }

    calculateTimeout() {
      if (this.currentBlocked === this.totalUserCount) {
        this.timeout = 5;
      }
    }

    updateNotificationMessage() {
      this.notification.show(`Engellenen kullanıcılar: ${this.currentBlocked} / ${this.totalUserCount}`, {timeout: this.timeout});
    }

    incrementBlockedCount() {
      this.currentBlocked++;
    }
  }

  class EksiNotification {
    constructor() {
      this.cssHandler = new EksiCSS();
      this.domHandler = new EksiDOM();
      this.notificationElement = null;
      this.timeoutId = null;
      this.countdownIntervalId = null;
    }

    show(message, options = {}) {
      if (!this.notificationElement) {
        this.applyStyles(options.css);
        this.createElement(message);
        this.createCloseButton();
        this.appendNotificationToDOM();
      } else {
        this.updateMessage(message);
      }
      this.setAutoCloseTimeout(options.timeout);
    }

    updateMessage(message) {
      if (this.notificationElement) {
        this.domHandler.querySelector('p', this.notificationElement).innerHTML = message;
      }
    }

    applyStyles(css) {
      const defaultCSS = `
            .eksi-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #222;
                color: #fff;
                padding: 1.4rem 3rem;
                border-radius: 5px;
                font-size: 14px;
                z-index: 100000;
                transition: all 1s ease;
                box-shadow: 0 0 9px #EEE;
            }
            .eksi-notification-container.show {
                opacity: 1;
                max-height: 100%;
            }
            .eksi-notification-container.hidden {
                opacity: 0;
                max-height: 0;
            }
            .eksi-notification-container p {
                padding: 0;
                margin: 0;
            }
            .eksi-close-button {
               position: absolute;
               right: 10px;
               top: 0;
               z-index: 20;
               cursor: pointer;
               padding: 5px;
            }
            `;

      if (!css) {
        css = defaultCSS;
      }

      this.cssHandler.addCSS(css);
    }

    createElement(message) {
      this.notificationElement = this.domHandler.createElement('div');
      this.domHandler.addClass(this.notificationElement, 'eksi-notification-container');
      this.notificationElement.innerHTML = `<p>${message}</p>`;
      this.showWithTransition();
    }

    createCloseButton() {
      const closeButton = this.domHandler.createElement('span');
      closeButton.innerHTML = 'X';
      this.domHandler.addClass(closeButton, 'eksi-close-button');
      this.domHandler.addEventListener(closeButton, 'click', () => {
        this.removeWithTransition();
      });
      this.domHandler.appendChild(this.notificationElement, closeButton);
    }

    appendNotificationToDOM() {
      this.domHandler.appendChild(document.body, this.notificationElement);
    }

    setAutoCloseTimeout(timeout = 10) {
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        this.removeWithTransition();
      }, timeout * 1000);
    }

    removeWithTransition() {
      this.domHandler.removeClass(this.notificationElement, 'show');
      this.domHandler.addClass(this.notificationElement, 'hidden');
      this.domHandler.addEventListener(this.notificationElement, 'transitionend', () => {
        this.notificationElement.remove();
      });
    }

    showWithTransition() {
      this.domHandler.addClass(this.notificationElement, 'hidden');
      setTimeout(() => {
        this.domHandler.removeClass(this.notificationElement, 'hidden');
        this.domHandler.addClass(this.notificationElement, 'show');
      }, 500);
    }
  }

  class EksiBlockUsersUI {
    constructor() {
      this.domHandler = new EksiDOM();
    }

    createMenuItemElements() {
      const newItem = this.domHandler.createElement('li');
      const newAnchor = this.domHandler.createElement('a');
      newAnchor.setAttribute('title', 'favorileyenleri engelle');
      newAnchor.setAttribute('aria-label', 'favorileyenleri engelle');
      newAnchor.innerText = 'favorileyenleri engelle';
      this.domHandler.appendChild(newItem, newAnchor);
      return newItem;
    }

    addMenuItemEventListener(entryId, menuItem) {
      this.domHandler.addEventListener(menuItem, 'click', () => {
        const blockUsers = new EksiBlockUsers();
        blockUsers.blockUsers(entryId);
      });
    }

    createMenuItem(entryId) {
      const menuItem = this.createMenuItemElements();
      this.addMenuItemEventListener(entryId, menuItem);
      return menuItem;
    }

    addMenuItemToDropdown() {
      const dropdownMenus = this.domHandler.querySelectorAll('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu');
      dropdownMenus.forEach((dropdownMenu) => {
        const entryId = dropdownMenu.closest('li[data-id]').getAttribute('data-id');
        const menuItem = this.createMenuItem(entryId);
        this.domHandler.appendChild(dropdownMenu, menuItem);
      });
    }
  }

  (function() {
    const blockUsersUI = new EksiBlockUsersUI();
    blockUsersUI.addMenuItemToDropdown();
  })();
})();
