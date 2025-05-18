// ==UserScript==
// @id           eksi-block-post-favorited-users@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Block Multiple Users in Bulk
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.1.0
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

    const BlockTypes = Object.freeze({
        MUTE: 'u',    // Sessiz alma
        BLOCK: 'm'    // Engelleme
    });

    const STORAGE_KEY = 'eksi_blocker_state';

    const delay = (second) => new Promise((res) => setTimeout(res, second * 1000));

    class EksiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    class EksiStorage {
        static save(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Error saving to localStorage:', e);
                return false;
            }
        }

        static load(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error('Error loading from localStorage:', e);
                return defaultValue;
            }
        }

        static remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Error removing from localStorage:', e);
                return false;
            }
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
                        reject(new EksiError(`Request failed: ${xhr.statusText}`, xhr.status));
                    }
                }
            };
        }

        async makeRequest(method, url, data = null, headers = {}) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                this.setupXHR(xhr, method, url, data, headers);
                this.handleReadyState(xhr, resolve, reject);
                xhr.onerror = () => reject(new EksiError('Network error occurred', 0));
                xhr.ontimeout = () => reject(new EksiError('Request timed out', 0));
                xhr.timeout = 30000; // 30 seconds timeout
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
                    console.error('User ID input not found in profile HTML');
                    return null;
                }
            } catch (error) {
                console.error('Error parsing user ID from profile:', error);
                return null;
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
            const styleTag = this.getStyleTag();
            return styleTag && styleTag.innerHTML.includes(css);
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
            this.timeout = 30;
            this.retryDelay = 5;          // Seconds to wait between retries
            this.requestDelay = 7;        // Seconds between regular requests to avoid rate limiting
            this.maxRetries = 3;          // Maximum number of retries
            this.blockType = BlockTypes.MUTE; // Default to mute
            this.entryId = null;
            this.processedUsers = new Set();
            this.pendingUsers = [];
            this.isProcessing = false;
            this.abortProcessing = false;
            this.errorCount = 0;
            this.maxErrors = 10;          // Maximum errors before aborting
        }

        setBlockType(type) {
            this.blockType = type;
        }

        getBlockTypeText() {
            return this.blockType === BlockTypes.MUTE ? 'sessiz alındı' : 'engellendi';
        }

        loadState() {
            const savedState = EksiStorage.load(STORAGE_KEY);
            if (savedState && savedState.entryId === this.entryId) {
                this.processedUsers = new Set(savedState.processedUsers || []);
                this.currentBlocked = (savedState.processedUsers || []).length + 1;
                return true;
            }
            return false;
        }

        saveState() {
            EksiStorage.save(STORAGE_KEY, {
                entryId: this.entryId,
                blockType: this.blockType,
                processedUsers: Array.from(this.processedUsers),
                totalUserCount: this.totalUserCount,
                timestamp: Date.now()
            });
        }

        clearState() {
            EksiStorage.remove(STORAGE_KEY);
        }

        async fetchFavorites(entryId) {
            try {
                this.notification.show('Favori listesi yükleniyor...', {timeout: 60});
                const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
                return this.htmlParser.parseFavoritesHtml(html);
            } catch (error) {
                this.notification.show('Favori listesi yüklenemedi: ' + (error.message || 'Bilinmeyen hata'), {timeout: 10});
                throw error;
            }
        }

        async blockUsers(entryId) {
            try {
                this.entryId = entryId;
                if (!this.loadState()) {
                    this.processedUsers = new Set();
                    this.currentBlocked = 1;
                }

                return this.fetchFavorites(entryId)
                    .then(userUrls => {
                    this.totalUserCount = userUrls.length;
                    const postTitle = this.htmlParser.parsePostTitle();

                    // Filter out already processed users
                    this.pendingUsers = userUrls.filter(userUrl => {
                        const username = this.getUsernameFromUrl(userUrl);
                        return !this.processedUsers.has(username);
                    });

                    if (this.pendingUsers.length === 0) {
                        this.notification.show(
                            `<div class="eksi-notification-success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
                  </svg>
                  Tüm kullanıcılar zaten işlendi.
                </div>`,
                            {timeout: 5}
                        );
                        return Promise.resolve();
                    }

                    this.notification.show(`${this.pendingUsers.length} kullanıcı işlenecek...`, {timeout: 10});

                    this.isProcessing = true;
                    this.abortProcessing = false;
                    this.errorCount = 0;

                    // Create a Stop button in the notification
                    this.notification.addStopButton(() => {
                        this.abortProcessing = true;
                        this.notification.show(
                            `<div class="eksi-notification-warning">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 7H11V13H13V7ZM13 15H11V17H13V15Z" fill="#ff9800"/>
                  </svg>
                  İşlem durduruldu.
                </div>`,
                            {timeout: 5}
                        );
                    });

                    // Start processing after a short delay
                    return delay(2)
                        .then(() => this.processBatch(postTitle))
                        .then(() => {
                        if (!this.abortProcessing) {
                            this.notification.show(
                                `<div class="eksi-notification-success">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
                      </svg>
                      İşlem tamamlandı. <strong>${this.processedUsers.size}</strong> kullanıcı ${this.getBlockTypeText()}.
                    </div>`,
                                {timeout: 10}
                            );
                            this.clearState(); // Clear saved state after successful completion
                        } else {
                            this.saveState(); // Save progress for later continuation
                        }
                    });
                });
            } catch (error) {
                console.error('Error in blockUsers:', error);
                this.notification.show(
                    `<div class="eksi-notification-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM7.12 14.88L9.12 16.88L16.88 9.12L14.88 7.12L7.12 14.88Z" fill="#e53935"/>
            </svg>
            Hata oluştu: ${error.message || 'Bilinmeyen hata'}
          </div>`,
                    {timeout: 10}
                );
                this.saveState(); // Save progress on error
                return Promise.reject(error);
            } finally {
                this.isProcessing = false;
            }
        }

        async processBatch(postTitle) {
            let userIndex = 0;

            // Process users sequentially with proper delays to avoid rate limiting
            while (userIndex < this.pendingUsers.length && !this.abortProcessing && this.errorCount < this.maxErrors) {
                const userUrl = this.pendingUsers[userIndex];
                const username = this.getUsernameFromUrl(userUrl);

                if (this.processedUsers.has(username)) {
                    userIndex++;
                    continue; // Skip already processed user
                }

                try {
                    await this.processUser(userUrl, postTitle);
                    this.processedUsers.add(username);
                    this.updateNotification();
                    this.saveState(); // Save state after each successful processing
                } catch (error) {
                    this.errorCount++;
                    console.error(`Error processing user ${username}:`, error);

                    if (this.errorCount >= this.maxErrors) {
                        this.notification.show(`Çok fazla hata oluştu (${this.errorCount}). İşlem durduruluyor.`, {timeout: 10});
                        this.abortProcessing = true;
                        break;
                    }

                    // Short extra delay after an error to give the server some rest
                    await delay(this.retryDelay);
                }

                userIndex++;

                // Add a delay between processing users to avoid rate limiting
                // Only delay if we're not at the end and not aborting
                if (userIndex < this.pendingUsers.length && !this.abortProcessing) {
                    this.notification.updateDelayCountdown(this.requestDelay);
                    await delay(this.requestDelay);
                }
            }
        }

        async processUser(userUrl, postTitle) {
            const username = this.getUsernameFromUrl(userUrl);
            try {
                const userProfileHtml = await this.fetchUserProfile(userUrl);
                const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);

                if (!userId) {
                    throw new Error(`User ID not found for ${username}`);
                }

                await this.retryOperation(() => this.blockUser(userId));
                await this.retryOperation(() => this.addNoteToUser(userUrl, userId, postTitle, this.entryId));

                return true;
            } catch (error) {
                console.error(`Failed to process user ${username}:`, error);
                throw error;
            }
        }

        getUsernameFromUrl(url) {
            return url.split('/').pop();
        }

        async fetchUserProfile(url) {
            try {
                return await this.remoteRequest.get(url);
            } catch (error) {
                throw new Error(`Failed to fetch user profile: ${error.message || 'Unknown error'}`);
            }
        }

        async blockUser(userId) {
            if (!userId) {
                throw new Error('User ID is required for blocking');
            }

            try {
                await this.remoteRequest.post(`${Endpoints.BLOCK}/${userId}?r=${this.blockType}`);
                return true;
            } catch (error) {
                throw new Error(`Failed to block user: ${error.message || 'Unknown error'}`);
            }
        }

        async addNoteToUser(userUrl, userId, postTitle, entryId) {
            if (!userId) {
                throw new Error('User ID is required for adding note');
            }

            try {
                const username = this.getUsernameFromUrl(userUrl);
                const noteUrl = Endpoints.ADD_NOTE.replace('{username}', username);
                const actionType = this.blockType === BlockTypes.MUTE ? 'sessiz alındı' : 'engellendi';
                const data = `who=${userId}&usernote=${encodeURIComponent(`${postTitle} için ${actionType}. Entry: https://eksisozluk.com/entry/${entryId}`)}`;
                await this.remoteRequest.post(noteUrl, data);
                return true;
            } catch (error) {
                throw new Error(`Failed to add note to user: ${error.message || 'Unknown error'}`);
            }
        }

        async retryOperation(operation) {
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    return await operation();
                } catch (error) {
                    attempts++;
                    if (attempts >= this.maxRetries) {
                        throw error;
                    }
                    await delay(this.retryDelay);
                }
            }
        }

        updateNotification() {
            const total = this.totalUserCount;
            const processed = this.processedUsers.size;
            const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

            this.updateNotificationMessage();
            this.notification.addProgressBar(processed, total);
        }

        updateNotificationMessage() {
            const actionType = this.getBlockTypeText();
            const total = this.totalUserCount;
            const processed = this.processedUsers.size;
            const remaining = this.pendingUsers.length - (this.currentBlocked - 1 - processed);

            this.notification.show(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} kullanıcılar: <strong>${processed}</strong> / <strong>${total}</strong> (Kalan: ${remaining})`, {timeout: 60});
            this.currentBlocked = processed + 1;
        }
    }

    function initAnimations() {
        const style = document.createElement('style');
        style.textContent = `
    @keyframes eksiModalSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
        document.head.appendChild(style);
    }
    initAnimations();

    class EksiNotification {
        constructor() {
            this.cssHandler = new EksiCSS();
            this.domHandler = new EksiDOM();
            this.notificationElement = null;
            this.timeoutId = null;
            this.countdownIntervalId = null;
            this.countdownElement = null;
        }

        show(message, options = {}) {
            this.applyStyles();

            if (!this.notificationElement) {
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
                const messageElement = this.domHandler.querySelector('.eksi-notification-message', this.notificationElement);
                if (messageElement) {
                    messageElement.innerHTML = message;
                }
            }
        }

        updateDelayCountdown(seconds) {
            // Clear any existing countdown interval first
            this.clearCountdown();

            // Create countdown element if it doesn't exist
            if (!this.countdownElement) {
                this.countdownElement = this.domHandler.createElement('div');
                this.domHandler.addClass(this.countdownElement, 'eksi-notification-countdown');

                if (this.notificationElement) {
                    // Find the progress container
                    const progressContainer = this.domHandler.querySelector('.eksi-progress-container', this.notificationElement);

                    if (progressContainer && progressContainer.parentNode) {
                        progressContainer.parentNode.insertBefore(this.countdownElement, progressContainer.nextSibling);
                    } else {
                        // Fallback to insert after message
                        const messageElement = this.domHandler.querySelector('.eksi-notification-message', this.notificationElement);
                        if (messageElement && messageElement.parentNode) {
                            messageElement.parentNode.insertBefore(this.countdownElement, messageElement.nextSibling);
                        }
                    }
                }
            }

            // Set initial text with icon
            let remainingSeconds = seconds;
            this.countdownElement.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
          <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="#a0e577"/>
        </svg>
        Sonraki işlem için bekleniyor: <strong>${remainingSeconds}</strong> saniye
      `;

            // Start the countdown
            this.countdownIntervalId = setInterval(() => {
                remainingSeconds--;

                if (remainingSeconds <= 0) {
                    this.clearCountdown();
                    return;
                }

                if (this.countdownElement) {
                    this.countdownElement.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
              <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="#a0e577"/>
            </svg>
            Sonraki işlem için bekleniyor: <strong>${remainingSeconds}</strong> saniye
          `;
                }
            }, 1000);
        }

        clearCountdown() {
            if (this.countdownIntervalId) {
                clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = null;
            }

            if (this.countdownElement) {
                this.countdownElement.textContent = '';
            }
        }

        applyStyles() {
            const defaultCSS = `
            /* Base notification container */
            .eksi-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #2c2c2c;
                color: #fff;
                padding: 1.4rem;
                border-radius: 8px;
                font-size: 14px;
                z-index: 100000;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
                min-width: 320px;
                border-left: 4px solid #81c14b;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }

            /* Notification states */
            .eksi-notification-container.show {
                opacity: 1;
                transform: translateY(0);
                max-height: 100%;
            }

            .eksi-notification-container.hidden {
                opacity: 0;
                transform: translateY(-20px);
                max-height: 0;
            }

            /* Message styling */
            .eksi-notification-message {
                padding: 0;
                margin: 0 0 12px 0;
                line-height: 1.5;
            }

            /* Countdown timer styling */
            .eksi-notification-countdown {
                font-size: 12px;
                color: #a0e577;
                margin: 8px 0;
                font-style: italic;
                padding: 6px 10px;
                background-color: rgba(129, 193, 75, 0.1);
                border-radius: 4px;
                display: inline-block;
            }

            /* Button container */
            .eksi-notification-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            }

            /* Button styling */
            .eksi-notification-button {
                padding: 8px 14px;
                border: none;
                border-radius: 4px;
                background-color: #444;
                color: white;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
                font-weight: 500;
            }

            .eksi-notification-button:hover {
                background-color: #555;
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }

            .eksi-notification-button:active {
                transform: translateY(0);
                box-shadow: none;
            }

            .eksi-notification-button.stop {
                background-color: #e55353;
            }

            .eksi-notification-button.stop:hover {
                background-color: #f06464;
            }

            /* Close button styling */
            .eksi-close-button {
                position: absolute;
                right: 12px;
                top: 12px;
                z-index: 20;
                cursor: pointer;
                padding: 4px;
                font-size: 18px;
                line-height: 1;
                color: #999;
                transition: color 0.2s ease;
                background: none;
                border: none;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }

            .eksi-close-button:hover {
                color: #fff;
                background-color: rgba(255, 255, 255, 0.1);
            }

            /* Modal styling */
            .eksi-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.65);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100001;
                animation: eksiModalFadeIn 0.3s ease;
                backdrop-filter: blur(3px);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }

            @keyframes eksiModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .eksi-modal-content {
                background-color: #fff;
                padding: 24px;
                border-radius: 10px;
                max-width: 420px;
                width: 100%;
                color: #333;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
                animation: eksiModalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateY(0);
            }

            @keyframes eksiModalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .eksi-modal-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #222;
                border-bottom: 1px solid #eee;
                padding-bottom: 12px;
            }

            .eksi-modal-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 16px;
            }

            .eksi-option-button {
                padding: 12px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                text-align: left;
                font-size: 14px;
                background-color: #f5f5f5;
                transition: all 0.2s ease;
                font-weight: 500;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            .eksi-option-button:hover {
                background-color: #eaeaea;
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
            }

            .eksi-option-button:active {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .eksi-option-button.primary {
                background-color: #81c14b;
                color: white;
                box-shadow: 0 2px 5px rgba(129, 193, 75, 0.3);
            }

            .eksi-option-button.primary:hover {
                background-color: #72ad42;
                box-shadow: 0 4px 10px rgba(129, 193, 75, 0.4);
            }

            .eksi-option-button.secondary {
                background-color: #ff7063;
                color: white;
                box-shadow: 0 2px 5px rgba(255, 112, 99, 0.3);
            }

            .eksi-option-button.secondary:hover {
                background-color: #f05a4f;
                box-shadow: 0 4px 10px rgba(255, 112, 99, 0.4);
            }
            `;

            this.cssHandler.addCSS(defaultCSS + `
            /* Header styling */
            .eksi-notification-header {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .eksi-notification-icon {
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: rgba(129, 193, 75, 0.15);
                width: 28px;
                height: 28px;
                border-radius: 50%;
            }

            .eksi-notification-title {
                font-weight: 600;
                font-size: 15px;
                color: #81c14b;
            }

            /* Progress bar */
            .eksi-progress-container {
                width: 100%;
                height: 6px;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                margin: 15px 0;
                overflow: hidden;
            }

            .eksi-progress-bar {
                height: 100%;
                background-color: #81c14b;
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }

            /* Status messages */
            .eksi-notification-success,
            .eksi-notification-error,
            .eksi-notification-warning {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 10px;
                line-height: 1.5;
            }

            .eksi-notification-success {
                background-color: rgba(129, 193, 75, 0.1);
            }

            .eksi-notification-error {
                background-color: rgba(229, 57, 53, 0.1);
            }

            .eksi-notification-warning {
                background-color: rgba(255, 152, 0, 0.1);
            }

            /* Tooltip styles */
            .eksi-tooltip {
                position: relative;
                display: inline-block;
                cursor: help;
            }

            .eksi-tooltip .eksi-tooltiptext {
                visibility: hidden;
                width: 200px;
                background-color: #333;
                color: #fff;
                text-align: center;
                border-radius: 6px;
                padding: 8px;
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                margin-left: -100px;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 12px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }

            .eksi-tooltip .eksi-tooltiptext::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #333 transparent transparent transparent;
            }

            .eksi-tooltip:hover .eksi-tooltiptext {
                visibility: visible;
                opacity: 1;
            }
      `);
        }

        createElement(message) {
            if (this.notificationElement) {
                this.removeExistingNotification();
            }

            this.notificationElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.notificationElement, 'eksi-notification-container');

            // Create a header with icon
            const headerElement = this.domHandler.createElement('div');
            this.domHandler.addClass(headerElement, 'eksi-notification-header');
            headerElement.innerHTML = `
        <div class="eksi-notification-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="#81c14b"/>
          </svg>
        </div>
        <div class="eksi-notification-title">Ekşi Kullanıcı İşlemi</div>
      `;

            const messageElement = this.domHandler.createElement('p');
            this.domHandler.addClass(messageElement, 'eksi-notification-message');
            messageElement.innerHTML = message;

            const buttonsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(buttonsContainer, 'eksi-notification-buttons');

            this.domHandler.appendChild(this.notificationElement, headerElement);
            this.domHandler.appendChild(this.notificationElement, messageElement);
            this.domHandler.appendChild(this.notificationElement, buttonsContainer);

            this.showWithTransition();
        }

        removeExistingNotification() {
            if (this.notificationElement && this.notificationElement.parentNode) {
                this.notificationElement.parentNode.removeChild(this.notificationElement);
                this.notificationElement = null;
            }
        }

        createCloseButton() {
            const closeButton = this.domHandler.createElement('button');
            closeButton.innerHTML = '×';
            this.domHandler.addClass(closeButton, 'eksi-close-button');
            this.domHandler.addEventListener(closeButton, 'click', () => {
                this.removeWithTransition();
            });
            this.domHandler.appendChild(this.notificationElement, closeButton);
        }

        addProgressBar(current, total) {
            // Remove existing progress bar if any
            const existingContainer = this.domHandler.querySelector('.eksi-progress-container', this.notificationElement);
            if (existingContainer) {
                existingContainer.parentNode.removeChild(existingContainer);
            }

            // Calculate percentage
            const percentage = Math.min(100, Math.round((current / total) * 100));

            // Create progress container
            const progressContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(progressContainer, 'eksi-progress-container');

            // Create progress bar
            const progressBar = this.domHandler.createElement('div');
            this.domHandler.addClass(progressBar, 'eksi-progress-bar');
            progressBar.style.width = `${percentage}%`;

            // Append to container
            this.domHandler.appendChild(progressContainer, progressBar);

            // Insert after message
            const messageElement = this.domHandler.querySelector('.eksi-notification-message', this.notificationElement);
            if (messageElement && messageElement.parentNode) {
                messageElement.parentNode.insertBefore(progressContainer, messageElement.nextSibling);
            }
        }

        addStopButton(clickHandler) {
            if (!this.notificationElement) return;

            const buttonsContainer = this.domHandler.querySelector('.eksi-notification-buttons', this.notificationElement);
            if (!buttonsContainer) return;

            // Remove existing stop button if any
            const existingButton = this.domHandler.querySelector('.eksi-notification-button.stop', buttonsContainer);
            if (existingButton) {
                this.domHandler.removeChild(buttonsContainer, existingButton);
            }

            const stopButton = this.domHandler.createElement('button');
            stopButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
        </svg>
        Durdur
      `;
            this.domHandler.addClass(stopButton, 'eksi-notification-button');
            this.domHandler.addClass(stopButton, 'stop');
            this.domHandler.addEventListener(stopButton, 'click', clickHandler);

            this.domHandler.appendChild(buttonsContainer, stopButton);
        }

        appendNotificationToDOM() {
            this.domHandler.appendChild(document.body, this.notificationElement);
        }

        setAutoCloseTimeout(timeout = 10) {
            clearTimeout(this.timeoutId);
            if (timeout > 0) {
                this.timeoutId = setTimeout(() => {
                    this.removeWithTransition();
                }, timeout * 1000);
            }
        }

        removeWithTransition() {
            if (!this.notificationElement) return;

            // Clear any active countdown
            this.clearCountdown();

            // Clear auto-close timeout
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }

            this.domHandler.removeClass(this.notificationElement, 'show');
            this.domHandler.addClass(this.notificationElement, 'hidden');

            const handleTransitionEnd = () => {
                if (this.notificationElement && this.notificationElement.parentNode) {
                    this.notificationElement.parentNode.removeChild(this.notificationElement);
                    this.notificationElement = null;
                    this.countdownElement = null;
                }
            };

            this.domHandler.addEventListener(this.notificationElement, 'transitionend', handleTransitionEnd, { once: true });

            // Fallback in case transition doesn't trigger
            setTimeout(handleTransitionEnd, 500);
        }

        showWithTransition() {
            if (!this.notificationElement) return;

            this.domHandler.addClass(this.notificationElement, 'hidden');
            requestAnimationFrame(() => {
                this.domHandler.removeClass(this.notificationElement, 'hidden');
                this.domHandler.addClass(this.notificationElement, 'show');
            });
        }
    }

    class EksiBlockOptionsModal {
        constructor(entryId) {
            this.domHandler = new EksiDOM();
            this.entryId = entryId;
            this.modalElement = null;
        }

        show() {
            try {
                this.createElement();
                this.appendModalToDOM();
                this.applyInlineStyles(); // Apply inline styles

                // Add keydown listener for Escape key to close modal
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.modalElement) {
                        this.close();
                    }
                });
            } catch (err) {
                console.error('Error showing modal:', err);
            }
        }

        applyInlineStyles() {
            if (!this.modalElement) return;

            // Apply styles to main modal
            Object.assign(this.modalElement.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '100001',
                backdropFilter: 'blur(3px)'
            });

            // Find modal content and apply styles
            const modalContent = this.modalElement.querySelector('.eksi-modal-content');
            if (modalContent) {
                Object.assign(modalContent.style, {
                    backgroundColor: '#fff',
                    padding: '24px',
                    borderRadius: '10px',
                    maxWidth: '420px',
                    width: '100%',
                    color: '#333',
                    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
                    transform: 'translateY(0)',
                    animation: 'eksiModalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            }

            // Style modal title
            const modalTitle = this.modalElement.querySelector('.eksi-modal-title');
            if (modalTitle) {
                Object.assign(modalTitle.style, {
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#222',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '12px'
                });
            }

            // Style options container
            const optionsContainer = this.modalElement.querySelector('.eksi-modal-options');
            if (optionsContainer) {
                Object.assign(optionsContainer.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                });
            }

            // Style all option buttons
            const buttons = this.modalElement.querySelectorAll('.eksi-option-button');
            buttons.forEach(button => {
                Object.assign(button.style, {
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    backgroundColor: '#f5f5f5',
                    transition: 'all 0.2s ease',
                    fontWeight: '500',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center'
                });
            });

            // Style primary button (Sessiz Al)
            const primaryButton = this.modalElement.querySelector('.eksi-option-button.primary');
            if (primaryButton) {
                Object.assign(primaryButton.style, {
                    backgroundColor: '#81c14b',
                    color: 'white',
                    boxShadow: '0 2px 5px rgba(129, 193, 75, 0.3)'
                });
            }

            // Style secondary button (Engelle)
            const secondaryButton = this.modalElement.querySelector('.eksi-option-button.secondary');
            if (secondaryButton) {
                Object.assign(secondaryButton.style, {
                    backgroundColor: '#ff7063',
                    color: 'white',
                    boxShadow: '0 2px 5px rgba(255, 112, 99, 0.3)'
                });
            }
        }

        createElement() {
            this.modalElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.modalElement, 'eksi-modal');

            const modalContent = this.domHandler.createElement('div');
            this.domHandler.addClass(modalContent, 'eksi-modal-content');

            const modalTitle = this.domHandler.createElement('div');
            this.domHandler.addClass(modalTitle, 'eksi-modal-title');
            modalTitle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 12L13 7L11 7L11 12L16 12L16 14L11 14L11 17L13 17L13 14.5L17 14.5L17 12H13Z" fill="#333"/>
        </svg>
        İşlem Seçin
      `;

            const optionsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

            const muteButton = this.createOptionButton('Sessiz Al', 'primary', () => {
                this.handleOptionSelected(BlockTypes.MUTE);
            });
            muteButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M16.5 12C16.5 14.49 14.49 16.5 12 16.5C9.51 16.5 7.5 14.49 7.5 12C7.5 9.51 9.51 7.5 12 7.5C14.49 7.5 16.5 9.51 16.5 12ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9ZM18.86 13.73C19.14 13.13 19.3 12.45 19.3 11.75C19.3 11.06 19.15 10.4 18.87 9.8L20.12 8.95C20.5 9.82 20.7 10.75 20.7 11.75C20.7 12.76 20.49 13.7 20.11 14.58L18.86 13.73ZM16.69 17.97C15.73 18.7 14.59 19.21 13.3 19.42V21.18C15.11 20.95 16.75 20.21 18.07 19.09L16.69 17.97ZM13.3 4.07V5.83C14.6 6.04 15.74 6.56 16.7 7.3L18.08 6.18C16.76 5.05 15.12 4.3 13.3 4.07ZM5.16 4.4L4 5.57L7.6 9.17C7.4 10.05 7.3 10.9 7.3 11.75C7.3 12.47 7.47 13.16 7.75 13.77L6.5 14.63C6.11 13.74 5.9 12.79 5.9 11.75C5.9 10.63 6.16 9.56 6.63 8.6L10.6 12.57C10.6 12.58 10.6 12.58 10.61 12.59C10.62 12.59 10.62 12.59 10.63 12.6L18.31 20.28L19.48 19.11L5.16 4.4ZM8.71 17.97L10.09 19.09C11.31 20.13 12.79 20.83 14.43 21.1C14.03 21.15 13.63 21.18 13.21 21.18V19.42C11.91 19.2 10.77 18.68 9.82 17.95L8.71 17.97Z" fill="currentColor"/>
        </svg>
        Sessiz Al (Yazdıklarını Görebilirsin)
      `;

            const blockButton = this.createOptionButton('Engelle', 'secondary', () => {
                this.handleOptionSelected(BlockTypes.BLOCK);
            });
            blockButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 13.85 19.37 15.55 18.31 16.9L7.1 5.69C8.45 4.63 10.15 4 12 4ZM4 12C4 10.15 4.63 8.45 5.69 7.1L16.9 18.31C15.55 19.37 13.85 20 12 20C7.58 20 4 16.42 4 12Z" fill="currentColor"/>
        </svg>
        Engelle (Tamamen Engelleme)
      `;

            const cancelButton = this.createOptionButton('İptal', '', () => {
                this.close();
            });
            cancelButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#555"/>
        </svg>
        İptal
      `;

            this.domHandler.appendChild(optionsContainer, muteButton);
            this.domHandler.appendChild(optionsContainer, blockButton);
            this.domHandler.appendChild(optionsContainer, cancelButton);

            this.domHandler.appendChild(modalContent, modalTitle);
            this.domHandler.appendChild(modalContent, optionsContainer);
            this.domHandler.appendChild(this.modalElement, modalContent);

            // Close modal when clicking outside content
            this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }

        createOptionButton(text, className, clickHandler) {
            const button = this.domHandler.createElement('button');
            this.domHandler.addClass(button, 'eksi-option-button');
            if (className) {
                this.domHandler.addClass(button, className);
            }
            button.textContent = text;
            this.domHandler.addEventListener(button, 'click', clickHandler);
            return button;
        }

        handleOptionSelected(blockType) {
            const blockUsers = new EksiBlockUsers();
            blockUsers.setBlockType(blockType);
            blockUsers.blockUsers(this.entryId);
            this.close();
        }

        appendModalToDOM() {
            this.domHandler.appendChild(document.body, this.modalElement);
        }

        close() {
            if (this.modalElement && this.modalElement.parentNode) {
                console.log('Closing modal');
                document.body.style.overflow = ''; // Restore scrolling
                this.modalElement.parentNode.removeChild(this.modalElement);
                this.modalElement = null;
            }
        }
    }

    class EksiBlockUsersUI {
        constructor() {
            this.domHandler = new EksiDOM();
            this.initialized = false;
        }

        createMenuItemElements() {
            const newItem = this.domHandler.createElement('li');
            const newAnchor = this.domHandler.createElement('a');

            // Setup anchor with proper attributes
            newAnchor.setAttribute('title', 'favorileyenleri engelle');
            newAnchor.setAttribute('aria-label', 'favorileyenleri engelle');

            // Create an icon for the menu item
            newAnchor.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 5px;">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12 10.5C12.83 10.5 13.5 11.17 13.5 12C13.5 12.83 12.83 13.5 12 13.5C11.17 13.5 10.5 12.83 10.5 12C10.5 11.17 11.17 10.5 12 10.5ZM5.5 10.5C6.33 10.5 7 11.17 7 12C7 12.83 6.33 13.5 5.5 13.5C4.67 13.5 4 12.83 4 12C4 11.17 4.67 10.5 5.5 10.5ZM18.5 10.5C19.33 10.5 20 11.17 20 12C20 12.83 19.33 13.5 18.5 13.5C17.67 13.5 17 12.83 17 12C17 11.17 17.67 10.5 18.5 10.5Z" fill="currentColor"/>
        </svg>
        favorileyenleri engelle
      `;

            // Add a custom CSS class for styling
            this.domHandler.addClass(newAnchor, 'eksi-block-users-link');

            // Add custom styling
            const cssHandler = new EksiCSS();
            cssHandler.addCSS(`
        .eksi-block-users-link {
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }

        .eksi-block-users-link:hover {
          color: #81c14b !important;
        }

        .eksi-block-users-link:hover svg path {
          fill: #81c14b;
        }
      `);

            this.domHandler.appendChild(newItem, newAnchor);
            return newItem;
        }

        addMenuItemEventListener(entryId, menuItem) {
            this.domHandler.addEventListener(menuItem, 'click', (e) => {
                // First, prevent default behavior to ensure the click isn't hijacked
                e.preventDefault();
                e.stopPropagation();

                // Log for debugging
                console.log('Menu item clicked for entry ID:', entryId);

                // Check if there's an existing operation
                const savedState = EksiStorage.load(STORAGE_KEY);
                if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                    console.log('Found saved state, showing resume modal');
                    this.showResumeModal(entryId, savedState);
                } else {
                    console.log('No saved state, showing options modal');
                    try {
                        // Create modal with explicit error handling
                        const optionsModal = new EksiBlockOptionsModal(entryId);
                        document.body.style.overflow = 'hidden'; // Prevent scrolling while modal is open
                        optionsModal.show();
                    } catch (err) {
                        console.error('Error showing modal:', err);
                        alert('Bir hata oluştu: ' + err.message);
                    }
                }
            });
        }

        showResumeModal(entryId, savedState) {
            const modal = this.domHandler.createElement('div');
            this.domHandler.addClass(modal, 'eksi-modal');

            const modalContent = this.domHandler.createElement('div');
            this.domHandler.addClass(modalContent, 'eksi-modal-content');

            const modalTitle = this.domHandler.createElement('div');
            this.domHandler.addClass(modalTitle, 'eksi-modal-title');
            modalTitle.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="#333"/>
        </svg>
        Devam Eden İşlem
      `;

            const message = this.domHandler.createElement('p');
            message.innerHTML = `<div class="eksi-modal-message">
        Entry <strong>${savedState.entryId}</strong> için devam eden bir işlem var.
        <div class="eksi-modal-stats">
          <div class="eksi-stat">
            <span class="eksi-stat-label">Toplam Kullanıcı:</span>
            <span class="eksi-stat-value">${savedState.totalUserCount}</span>
          </div>
          <div class="eksi-stat">
            <span class="eksi-stat-label">İşlenen Kullanıcı:</span>
            <span class="eksi-stat-value">${savedState.processedUsers.length}</span>
          </div>
          <div class="eksi-stat">
            <span class="eksi-stat-label">Kalan Kullanıcı:</span>
            <span class="eksi-stat-value">${savedState.totalUserCount - savedState.processedUsers.length}</span>
          </div>
        </div>
        <div class="eksi-modal-progress-container">
          <div class="eksi-modal-progress-bar" style="width: ${Math.round((savedState.processedUsers.length / savedState.totalUserCount) * 100)}%;"></div>
        </div>
      </div>`;

            const optionsContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(optionsContainer, 'eksi-modal-options');

            const resumeButton = this.createOptionButton('Devam Et', 'primary', () => {
                this.closeModal(modal);
                const blockUsers = new EksiBlockUsers();
                blockUsers.setBlockType(savedState.blockType);
                blockUsers.blockUsers(savedState.entryId);
            });
            resumeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
        </svg>
        Devam Et
      `;

            const newButton = this.createOptionButton('Yeni İşlem Başlat', 'secondary', () => {
                this.closeModal(modal);
                EksiStorage.remove(STORAGE_KEY);
                const optionsModal = new EksiBlockOptionsModal(entryId);
                optionsModal.show();
            });
            newButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
        </svg>
        Yeni İşlem Başlat
      `;

            const cancelButton = this.createOptionButton('İptal', '', () => {
                this.closeModal(modal);
            });
            cancelButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#555"/>
        </svg>
        İptal
      `;

            this.domHandler.appendChild(optionsContainer, resumeButton);
            this.domHandler.appendChild(optionsContainer, newButton);
            this.domHandler.appendChild(optionsContainer, cancelButton);

            this.domHandler.appendChild(modalContent, modalTitle);
            this.domHandler.appendChild(modalContent, message);
            this.domHandler.appendChild(modalContent, optionsContainer);
            this.domHandler.appendChild(modal, modalContent);

            // Add custom CSS for this modal
            const cssHandler = new EksiCSS();
            cssHandler.addCSS(`
        .eksi-modal-message {
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .eksi-modal-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 15px 0;
          padding: 12px;
          background-color: #f9f9f9;
          border-radius: 6px;
        }
        .eksi-stat {
          flex: 1;
          min-width: 120px;
        }
        .eksi-stat-label {
          font-size: 12px;
          color: #777;
          display: block;
          margin-bottom: 5px;
        }
        .eksi-stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        .eksi-modal-progress-container {
          width: 100%;
          height: 8px;
          background-color: #eee;
          border-radius: 4px;
          overflow: hidden;
          margin: 15px 0 5px 0;
        }
        .eksi-modal-progress-bar {
          height: 100%;
          background-color: #81c14b;
          border-radius: 4px;
        }
      `);

            this.domHandler.appendChild(document.body, modal);

            this.domHandler.addEventListener(modal, 'click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        }

        closeModal(modal) {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }

        createOptionButton(text, className, clickHandler) {
            const button = this.domHandler.createElement('button');
            this.domHandler.addClass(button, 'eksi-option-button');
            if (className) {
                this.domHandler.addClass(button, className);
            }
            button.textContent = text;
            this.domHandler.addEventListener(button, 'click', clickHandler);
            return button;
        }

        createMenuItem(entryId) {
            const menuItem = this.createMenuItemElements();
            this.addMenuItemEventListener(entryId, menuItem);
            return menuItem;
        }

        addMenuItemToDropdown() {
            try {
                const dropdownMenus = this.domHandler.querySelectorAll('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu');

                if (!dropdownMenus || dropdownMenus.length === 0) {
                    return; // No dropdown menus found
                }

                dropdownMenus.forEach((dropdownMenu) => {
                    try {
                        // Check if this menu already has our custom option
                        const existingItem = this.domHandler.querySelector('li a[aria-label="favorileyenleri engelle"]', dropdownMenu);
                        if (existingItem) {
                            return; // Skip this menu if our option already exists
                        }

                        const entryItem = dropdownMenu.closest('li[data-id]');
                        if (!entryItem) {
                            return; // Skip if we can't find the entry ID
                        }

                        const entryId = entryItem.getAttribute('data-id');
                        if (!entryId) {
                            return; // Skip if entry ID is empty
                        }

                        const menuItem = this.createMenuItem(entryId);
                        this.domHandler.appendChild(dropdownMenu, menuItem);
                    } catch (err) {
                        console.error('Error adding menu item to dropdown:', err);
                    }
                });

                this.initialized = true;
            } catch (err) {
                console.error('Error in addMenuItemToDropdown:', err);
            }
        }

        observeDOMChanges() {
            try {
                // Use MutationObserver instead of deprecated DOMNodeInserted
                const observer = new MutationObserver((mutations) => {
                    try {
                        if (!this.initialized) {
                            this.addMenuItemToDropdown();
                            return;
                        }

                        let shouldUpdate = false;

                        for (const mutation of mutations) {
                            // Check for new nodes that might contain our target elements
                            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                                for (const node of mutation.addedNodes) {
                                    if (!node || !node.nodeType) continue;

                                    if (node.nodeType === 1 && (
                                        (node.querySelector && node.querySelector('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu')) ||
                                        (node.classList && (
                                            node.classList.contains('dropdown-menu') ||
                                            node.classList.contains('toggles-menu') ||
                                            node.classList.contains('feedback-container')
                                        ))
                                    )) {
                                        shouldUpdate = true;
                                        break;
                                    }
                                }
                            }

                            if (shouldUpdate) break;
                        }

                        if (shouldUpdate) {
                            // Add a small delay to ensure the DOM is fully updated
                            setTimeout(() => {
                                this.addMenuItemToDropdown();
                            }, 100);
                        }
                    } catch (err) {
                        console.error('Error in MutationObserver callback:', err);
                    }
                });

                // Start observing the document body for DOM changes
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } catch (err) {
                console.error('Error setting up MutationObserver:', err);

                // Fallback to periodic checking if MutationObserver fails
                setInterval(() => {
                    if (document.readyState === 'complete') {
                        this.addMenuItemToDropdown();
                    }
                }, 2000);
            }
        }

        closeModal(modal) {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }

        createOptionButton(text, className, clickHandler) {
            const button = this.domHandler.createElement('button');
            this.domHandler.addClass(button, 'eksi-option-button');
            if (className) {
                this.domHandler.addClass(button, className);
            }
            button.textContent = text;
            this.domHandler.addEventListener(button, 'click', clickHandler);
            return button;
        }
    }

    // Initialize the script after the DOM is fully loaded
    function init() {
        try {
            const blockUsersUI = new EksiBlockUsersUI();

            // Wait for the page to be more fully loaded
            setTimeout(() => {
                blockUsersUI.addMenuItemToDropdown();
                blockUsersUI.observeDOMChanges();

                // Add version info to console
                console.info('EksiSözlük - Block Multiple Users in Bulk v1.1.0 loaded.');

                // Check for any saved state and show notification if exists
                const savedState = EksiStorage.load(STORAGE_KEY);
                if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                    const notification = new EksiNotification();
                    const actionType = savedState.blockType === BlockTypes.MUTE ? 'sessiz alma' : 'engelleme';

                    notification.show(
                        `<div class="eksi-notification-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="#42a5f5"/>
              </svg>
              Entry <strong>${savedState.entryId}</strong> için devam eden ${actionType} işlemi var.
              <div class="eksi-tooltip">
                <strong>${savedState.processedUsers.length}</strong>/${savedState.totalUserCount} kullanıcı işlendi
                <span class="eksi-tooltiptext">Menüden "favorileyenleri engelle" seçeneği ile devam edebilirsiniz.</span>
              </div>
            </div>`,
                        {timeout: 15}
                    );
                }
            }, 500);
        } catch (err) {
            console.error('Error initializing EksiBlockUsers script:', err);
        }
    }

    // Execute init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // If DOMContentLoaded already fired, run init with a delay
        setTimeout(init, 0);
    }
})();
