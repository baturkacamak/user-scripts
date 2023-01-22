// ==UserScript==
// @id           eksi-block-post-favorited-users@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Block Multiple Users in Bulk
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script allows the user to block multiple users in bulk on by fetching the list of users who have favorited a specific post
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

    /**
     * @constant Endpoints
     * @type {Object}
     * @desc An object containing the endpoints for different actions.
     * @property {string} BLOCK - The endpoint for blocking a user.
     * @property {string} FAVORITES - The endpoint for fetching the users who have favorited an entry.
     */
    const Endpoints = Object.freeze({
        BLOCK: 'https://eksisozluk.com/userrelation/addrelation',
        FAVORITES: 'https://eksisozluk.com/entry/favorileyenler'
    });

    /**
     * @function delay
     * @async
     * @param {number} second - Number of seconds to delay
     * @return {Promise} A promise that resolves after the specified number of seconds
     */
    // Create a delay function that returns a promise
    // The function takes a second parameter and sets a timeout for that many seconds before resolving the promise
    const delay = (second) => new Promise((res) => setTimeout(res, second * 1000));


    /**
     * @class EksiError
     * @extends Error
     * @desc A custom error class for handling errors in the Eksi Sözlük script.
     * @param {string} message - The error message.
     * @param {number} statusCode - The HTTP status code associated with the error.
     */
    class EksiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    /**
     * @class EksiRemoteRequest
     * @desc A class for making remote requests.
     */
    class EksiRemoteRequest {
        /**
         * @function setupXHR
         * @desc Sets up the XHR object with the necessary properties
         * @param {XMLHttpRequest} xhr - The XHR object
         * @param {string} method - The method of the request GET/POST
         * @param {string} url - The URL to make the request to.
         * @param {Object} data - The data to send in the body of the request.
         * @param {Object} headers - The headers to send with the request.
         */
        setupXHR(xhr, method, url, data, headers = {}) {
            xhr.open(method, url, true);
            xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
            if ('POST' === method) {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
            if (headers) {
                for (let header in headers) {
                    xhr.setRequestHeader(header, headers[header]);
                }
            }
        }

        /**
         * @function handleReadyState
         * @desc Handles the ready state change of the xhr object
         * @param {XMLHttpRequest} xhr - The XHR object
         * @param {function} resolve - The resolve function of the promise
         * @param {function} reject - The reject function of the promise
         */
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

        /**
         * @function makeRequest
         * @desc Makes a request to a specified URL with the given method and data and returns the response as a promise.
         * @param {string} method - The method of the request GET/POST
         * @param {string} url - The URL to make the request to.
         * @param {Object} data - The data to send in the body of the request.
         * @param {Object} headers - The headers to send in the request.
         * @returns {Promise<string>} - A promise that resolves with the response of the request as a string.
         */
        async makeRequest(method, url, data = null, headers = {}) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                this.setupXHR(xhr, method, url, data, headers);
                this.handleReadyState(xhr, resolve, reject);
                xhr.send(data);
            });
        }

        /**
         * @function get
         * @desc Makes a GET request to a specified URL and returns the response as a promise.
         * @param {string} url - The URL to make the GET request to.
         * @returns {Promise<string>} - A promise that resolves with the response of the GET request as a string.
         */
        async get(url) {
            return this.makeRequest('GET', url);
        }

        /**
         * @function post
         * @desc Makes a POST request to a specified URL with the given data and returns the response as a promise.
         * @param {string} url - The URL to make the POST request to.
         * @param {Object} data - The data to send in the body of the POST request.
         * @returns {Promise<string>} - A promise that resolves with the response of the POST request as a string.
         */
        async post(url, data = {}) {
            return this.makeRequest('POST', url, data);
        }
    }

    /**
     * @class EksiDOM
     * @desc A class for providing a simplified and consistent interface for manipulating the DOM
     */
    class EksiDOM {
        /**
         * @function querySelector
         * @desc Wrapper function for `document.querySelector`
         * @param {string} selector - The CSS selector to query
         * @param {HTMLElement} [context=document] - The context element to search within
         * @returns {HTMLElement} - The first element matching the selector
         */
        querySelector(selector, context = document) {
            return context.querySelector(selector);
        }

        /**
         * @function querySelectorAll
         * @desc Wrapper function for `document.querySelectorAll`
         * @param {string} selector - The CSS selector to query
         * @param {HTMLElement} [context=document] - The context element to search within
         * @returns {NodeList} - A list of elements matching the selector
         */
        querySelectorAll(selector, context = document) {
            return context.querySelectorAll(selector);
        }

        /**
         * @function createElement
         * @desc Wrapper function for `document.createElement`
         * @param {string} tagName - The name of the element to create
         * @returns {HTMLElement} - The created element
         */
        createElement(tagName) {
            return document.createElement(tagName);
        }

        /**
         * @function addClass
         * @desc Adds a class to an element
         * @param {HTMLElement} element - The element to add the class to
         * @param {string} className - The class to add
         */
        addClass(element, className) {
            element.classList.add(className);
        }

        /**
         * @function removeClass
         * @desc Removes a class from an element
         * @param {HTMLElement} element - The element to remove the class from
         * @param {string} className - The class to remove
         */
        removeClass(element, className) {
            element.classList.remove(className);
        }

        /**
         * @function hasClass
         * @desc Check if an element has a class
         * @param {HTMLElement} element - The element to check
         * @param {string} className - The class to check for
         * @returns {boolean} - Whether the element has the class or not
         */
        hasClass(element, className) {
            return element.classList.contains(className);
        }

        /**
         * @function toggleClass
         * @desc Toggles a class on an element
         * @param {HTMLElement} element - The element to toggle the class on
         * @param {string} className - The class to toggle
         */
        toggleClass(element, className) {
            element.classList.toggle(className);
        }

        /**
         * @function appendChild
         * @desc Wrapper function for `HTMLElement.appendChild`
         * @param {HTMLElement} parent - The parent element
         * @param {HTMLElement} child - The child element to append
         */
        appendChild(parent, child) {
            parent.appendChild(child);
        }

        /**
         * @function removeChild
         * @desc Wrapper function for `HTMLElement.removeChild`
         * @param {HTMLElement} parent - The parent element
         * @param {HTMLElement} child - The child element to remove
         */
        removeChild(parent, child) {
            parent.removeChild(child);
        }

        /**
         * @function addEventListener
         * @desc Wrapper function for `HTMLElement.addEventListener`
         * @param {HTMLElement} element - The element to add the event listener to
         * @param {string} event - The event to listen for
         * @param {function} callback - The function to call when the event is triggered
         */
        addEventListener(element, event, callback) {
            element.addEventListener(event, callback);
        }
    }

    /**
     * @class EksiHtmlParser
     * @desc A class for parsing HTML responses from Eksi Sözlük.
     */
    class EksiHtmlParser {

        constructor() {
            this.domHandler = new EksiDOM();
        }

        /**
         * @function parseHtml
         * @desc Parses the HTML string and returns a document object.
         * @param {string} html - The HTML string to parse.
         * @returns {HTMLDocument} - The parsed HTML document object.
         */
        parseHtml(html) {
            return new DOMParser().parseFromString(html, 'text/html');
        }

        /**
         * @function parseFavoritesHtml
         * @desc Parses the HTML response of a request for the list of favorited users, and returns an array of URLs of the favorited users' profiles.
         * @param {string} html - The HTML response of the request for the list of favorited users.
         * @returns {Array<string>} - An array of URLs of the favorited users' profiles.
         */
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

        /**
         * @function parseUserIdFromProfile
         * @desc Parses the user id from the user's profile page HTML.
         * @param {string} html - The HTML of the user's profile page.
         * @returns {string} - The user id.
         */
        parseUserIdFromProfile(html) {
            try {
                const doc = this.parseHtml(html);
                const input = this.domHandler.querySelector('#who', doc);
                if(input) {
                    return input.value;
                } else {
                    console.log('input not found');
                }
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }
    }

    /**
     * @class EksiCSS
     * @desc A class for adding and manipulating CSS styles on the page
     */
    class EksiCSS {
        /**
         * @constructor
         * @desc Initializes the class
         */
        constructor() {
            this.styleTagId = 'eksi-css-style';
            this.domHandler = new EksiDOM();
        }

        /**
         * @function getStyleTag
         * @desc Get the style tag from the page
         * @returns {HTMLStyleElement} - The existing style tag
         */
        getStyleTag() {
            return document.getElementById(this.styleTagId);
        }

        /**
         * @function createStyleTag
         * @desc Create a new style tag
         * @returns {HTMLStyleElement} - The newly created style tag
         */
        createStyleTag() {
            const style = this.domHandler.createElement('style');
            style.id = this.styleTagId;
            style.type = 'text/css';
            this.domHandler.appendChild(document.head, style);
            return style;
        }

        /**
         * @function hasCSSAdded
         * @desc Check if the given css already exists in the style tag
         * @param {string} css - The css to be checked
         * @returns {boolean} - Whether the css already exists in the style tag or not
         */
        hasCSSAdded(css) {
            return this.getStyleTag().innerHTML.includes(css);
        }

        /**
         * @function addCSS
         * @desc Adds the given CSS to the page
         * @param {string} css - The CSS to be added to the page
         */
        addCSS(css) {
            let style = this.getStyleTag();
            // If the style tag does not exist, create a new one
            if (!style) {
                style = this.createStyleTag();
            }
            // If the CSS has not been added before, append it to the style tag
            if (!this.hasCSSAdded(css)) {
                this.domHandler.appendChild(style, document.createTextNode(css));
            }
        }
    }

    /**
    * @class EksiBlockUsers
    * @desc A class for bulk blocking users on Eksi Sözlük.
    */
    class EksiBlockUsers {
        /**
         * @constructor
         * @desc Initializes the class and sets the base URL for the blocking endpoint.
         */
        constructor() {
            this.remoteRequest = new EksiRemoteRequest();
            this.htmlParser = new EksiHtmlParser();
            this.notification = new EksiNotification();
            this.totalUserCount = 0;
            this.currentBlocked = 1;
        }

        /**
         * @function fetchFavorites
         * @desc Fetches the HTML response of a request for the list of users who have favorited a specific post.
         * @param {string} entryId - The ID of the entry to fetch the favorited users of.
         * @returns {Promise<Array<string>>} - A promise that resolves with the HTML response of the request for the list of favorited users.
         */
        async fetchFavorites(entryId) {
            try {
                const html = await this.remoteRequest.get(`${Endpoints.FAVORITES}?entryId=${entryId}`);
                return this.htmlParser.parseFavoritesHtml(html);
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }

        /**
         * @function blockUsers
         * @desc Blocks multiple users in bulk by fetching the list of users who have favorited a specific post and blocking them.
         * @param {string} entryId - The ID of the entry to fetch the favorited users of.
         */
        async blockUsers(entryId) {
            try {
                const userUrls = await this.fetchFavorites(entryId);
                this.totalUserCount = userUrls.length;
                if (userUrls) {
                    for (const userUrl of userUrls) {
                        const userProfileHtml = await this.fetchUserProfile(userUrl);
                        const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);
                        await this.blockUser(userId);
                        await delay(5);
                    }
                }
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }

        /**
         * @function fetchUserProfile
         * @desc Fetches the user's profile page HTML from the given url.
         * @param {string} url - The url of the user's profile page.
         * @returns {Promise<string>} - A promise that resolves with the response of the request as a string.
         */
        async fetchUserProfile(url) {
            try {
                return await this.remoteRequest.get(url);
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }

        /**
         * @function blockUser
         * @desc Blocks a user with the given userId
         * @param {string} userId - The id of the user to be blocked
         */
        async blockUser(userId) {
            try {
                const blockTypes = ['i', 'm'];
                for (const blockType of blockTypes) {
                    await this.remoteRequest.post(`${Endpoints.BLOCK}/${userId}?r=${blockType}`);
                }
                this.updateNotification();
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }

        /**
         * @function updateNotification
         * @desc Updates the notification with the current number of blocked users
         */
        updateNotification() {
            this.notification.show(`Engellenen kullanıcılar: ${this.currentBlocked} / ${this.totalUserCount}`);
            this.currentBlocked++;
        }

    }

    /**
     * @class EksiNotification
     * @desc A class for creating and displaying notifications on the page.
     */
    class EksiNotification {
        /**
         * @constructor
         * @desc Initializes the class
         */
        constructor() {
            this.cssHandler = new EksiCSS();
            this.domHandler = new EksiDOM();
            this.notificationElement = null;
        }

        /**
         * @function show
         * @desc Displays the notification with the given message
         * @param {string} message - The message to be displayed in the notification
         * @param {object} options - Additional options for the notification
         * @param {string} options.css - The css to be applied to the notification container
         * @param {number} options.timeout - The timeout for removing the notification element
         */
        show(message, options = {}) {
            if(!this.notificationElement) {
                this.applyStyles(options.css);
                this.createElement(message);
                this.createCloseButton();
                this.appendNotificationToDOM();
            } else {
                this.updateMessage(message);
            }
            this.setAutoCloseTimeout(options.timeout);
        }

        /**
         * @function updateMessage
         * @desc Update the message of the current notification element
         * @param {string} message - The message to be displayed in the notification
         */
        updateMessage(message) {
            if(this.notificationElement) {
                this.domHandler.querySelector('p', this.notificationElement).innerHTML = message;
            }
        }

        /**
         * @function applyStyles
         * @desc Adds the default styles for the notification container. If custom styles have been passed, they will be added as well
         * @param {string} css - The css to be applied to the notification container
         */
        applyStyles(css) {
            let defaultCSS = `
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

            // If custom styles have not been passed, use the default styles
            if(!css) {
                css = defaultCSS;
            }

            // Add the styles to the page
            this.cssHandler.addCSS(css);
        }

        /**
         * @function createElement
         * @desc Creates the notification element with the given message
         * @param {string} message - The message to be displayed in the notification
         */
        createElement(message) {
            this.notificationElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.notificationElement, 'eksi-notification-container')
            this.notificationElement.innerHTML = `<p>${message}</p>`;
            this.showWithTransition();
        }

        /**
         * @function createCloseButton
         * @desc Adds a close button to the notification element
         */
        createCloseButton() {
          let closeButton = this.domHandler.createElement('span');
          closeButton.innerHTML = 'X';
          this.domHandler.addClass(closeButton, 'eksi-close-button');
          this.domHandler.addEventListener(closeButton, 'click', () => {
              this.removeWithTransition();
          });
          this.domHandler.appendChild(this.notificationElement, closeButton);
        }

        /**
         * @function appendNotificationToDOM
         * @desc Appends the notification element to the body
         */
        appendNotificationToDOM() {
            this.domHandler.appendChild(document.body, this.notificationElement)
        }

        /**
         * @function setAutoCloseTimeout
         * @desc Sets a timeout to remove the notification element after a certain amount of time
         */
        setAutoCloseTimeout(timeout = 5000) {
            setTimeout(() => {
                this.removeWithTransition();
            }, timeout);
        }

        /**
         * @function removeWithTransition
         * @desc Removes the notification element with a transition effect by removing the 'show' class and adding the 'hidden' class.
         */
        removeWithTransition() {
            this.domHandler.removeClass(this.notificationElement, 'show');
            this.domHandler.addClass(this.notificationElement, 'hidden');
            this.domHandler.addEventListener(this.notificationElement, 'transitionend', () => {
                this.notificationElement.remove();
            });
        }

        /**
         * @function showWithTransition
         * @desc Add the 'hidden' class and then remove it after a certain amount of time to show the notification with a transition effect
         */
        showWithTransition() {
            this.domHandler.addClass(this.notificationElement, 'hidden');
            setTimeout(() => {
                this.domHandler.removeClass(this.notificationElement, 'hidden');
                this.domHandler.addClass(this.notificationElement, 'show');
            }, 500);
        }
    }

    /**
     * @class EksiBlockUsersUI
     * @desc A class for creating and adding a menu item to dropdown for blocking multiple users in bulk on by fetching the list of users who have favorited a specific post
     */
    class EksiBlockUsersUI {
        constructor() {
            this.domHandler = new EksiDOM();
        }

        /**
         * @function createMenuItemElements
         * @desc creates a new li and a elements and sets their attributes
         * @returns {HTMLElement} the li element
         */
        createMenuItemElements() {
            const newItem = this.domHandler.createElement('li');
            const newAnchor = this.domHandler.createElement('a');
            newAnchor.setAttribute('title', 'favorileyenleri engelle');
            newAnchor.setAttribute('aria-label', 'favorileyenleri engelle');
            newAnchor.innerText = 'favorileyenleri engelle';
            this.domHandler.appendChild(newItem, newAnchor);
            return newItem;
        }

        /**
         * @function addMenuItemEventListener
         * @desc adds an event listener to the menu item for blocking multiple users
         * @param {string} entryId - the entry id of the post
         * @param {HTMLElement} menuItem - the li element
         */
        addMenuItemEventListener(entryId, menuItem) {
            this.domHandler.addEventListener(menuItem, 'click', () => {
                const blockUsers = new EksiBlockUsers();
                blockUsers.blockUsers(entryId);
            });
        }

        /**
         * @function createMenuItem
         * @desc creates a menu item for blocking multiple users
         * @param {string} entryId - the entry id of the post
         * @returns {HTMLElement} the li element
         */
        createMenuItem(entryId) {
            const menuItem = this.createMenuItemElements();
            this.addMenuItemEventListener(entryId, menuItem);
            return menuItem;
        }

        /**
         * @function addMenuItemToDropdown
         * @desc Iterates over all the dropdown menus and finds the entry id of the post, then it creates a menu item for blocking multiple users and appends it to the dropdown menu
         */
        addMenuItemToDropdown() {
            // Select all the dropdown menus
            const dropdownMenus = this.domHandler.querySelectorAll('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu');
            // Iterate over the dropdown menus
            dropdownMenus.forEach(dropdownMenu => {
                // Find the entry id of the post
                const entryId = dropdownMenu.closest('li[data-id]').getAttribute('data-id');
                // Create a menu item for blocking multiple users
                const menuItem = this.createMenuItem(entryId);
                // Append the menu item to the dropdown menu
                this.domHandler.appendChild(dropdownMenu, menuItem);
            });
        }
    }

    /**
     * @function entryPoint
     * @desc Entry point of the script where it creates an instance of EksiBlockUsersUI class and calls its method `addMenuItemToDropdown`
     */
    (function() {
        const blockUsersUI = new EksiBlockUsersUI();
        blockUsersUI.addMenuItemToDropdown();
    })();
})();
