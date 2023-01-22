// ==UserScript==
// @id           eksi-block-users@https://github.com/baturkacamak/userscripts
// @name         EksiSözlük - Block Multiple Users in Bulk
// @namespace    https://github.com/baturkacamak/userscripts
// @version      0.1
// @description  This script allows the user to block multiple users in bulk on by fetching the list of users who have favorited a specific post
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @match        https://eksisozluk.com/*
// @grant        none
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/eksi-block-users-in-bulk#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/eksi-block-users-in-bulk#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/eksi-block-users-in-bulk/eksi-block-users-in-bulk.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/eksi-block-users-in-bulk/eksi-block-users-in-bulk.user.js
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const Endpoints = {
        BLOCK: 'https://eksisozluk.com/userrelation/addrelation',
        FAVORITES: 'https://eksisozluk.com/entry/favorileyenler'
    }

    class EksiError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }

    /**
     * @class RemoteRequest
     * @desc A class for making remote requests.
     */
    class RemoteRequest {
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
        async post(url, data) {
            return this.makeRequest('POST', url, data);
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
            this.remoteRequest = new RemoteRequest();
            this.htmlParser = new EksiHtmlParser();
            this.notification = new EksiNotification();
            this.totalUserCount = 0;
            this.currentBlocked = 1;
        }

        /**
         * @function fetchFavorites
         * @desc Fetches the HTML response of a request for the list of users who have favorited a specific post.
         * @param {string} entryId - The ID of the entry to fetch the favorited users of.
         * @returns {Promise<string>} - A promise that resolves with the HTML response of the request for the list of favorited users.
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
                for (const userUrl of userUrls) {
                    const userProfileHtml = await this.fetchUserProfile(userUrl);
                    const userId = this.htmlParser.parseUserIdFromProfile(userProfileHtml);
                    await this.blockUser(userId);
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
                    // await this.remoteRequest.post(`${Endpoints.BLOCK}/${userId}?r=${blockType}`);
                }
                this.createNotificationPopup(`${this.currentBlocked} blocked out of ${this.totalUserCount}`);
                this.currentBlocked++;
            } catch (error) {
                throw new EksiError(error.message, error.statusCode);
            }
        }
    }

    class EksiNotification {
        /**
         * @constructor
         * @desc Initializes the class
         * @param {string} message - The message to be displayed in the notification popup
         * @param {string} css - The css to be applied to the notification container
         */
        constructor(message, css) {
            this.cssHandler = new EksiCSS();
            this.message = message;
            this.css = css;
        }

        /**
     * @function show
     * @desc Displays the notification with the given message
     * @param {string} message - The message to be displayed in the notification
     */
        show(message) {
            this.addStyles();
            this.createNotificationElement(message);
            this.appendToBody();
            this.setTimeout();
        }

        /**
         * @function addStyles
         * @desc Adds the default styles for the notification container. If custom styles have been passed, they will be added as well
         */
        addStyles() {
            let defaultCSS = `.notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #222;
                color: #fff;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 100000;
                transition: all 0.5s ease;
            }`;

            // If custom styles have not been passed, use the default styles
            if(!this.css) {
                this.css = defaultCSS;
            }

            // Add the styles to the page
            this.cssHandler.addCSS(this.css);
        }

        /**
     * @function createNotificationElement
     * @desc Creates the notification element with the given message
     * @param {string} message - The message to be displayed in the notification
     */
        createNotificationElement(message) {
            this.notificationElement = document.createElement('div');
            this.notificationElement.classList.add('notification-container');
            this.notificationElement.innerHTML = `<p>${message}</p>`;
        }

        /**
     * @function appendToBody
     * @desc Appends the notification element to the body
     */
        appendToBody() {
            document.body.appendChild(this.notificationElement);
        }

        /**
     * @function setTimeout
     * @desc Sets a timeout to remove the notification element after a certain amount of time
     */
        setTimeout() {
            setTimeout(() => {
                this.notificationElement.remove();
            }, 30000);
        }
    }


    /**
     * @class EksiHtmlParser
     * @desc A class for parsing HTML responses from Eksi Sözlük.
     */
    class EksiHtmlParser {
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
            const anchorTags = ul.querySelectorAll('li a');
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
                const input = doc.querySelector('#who');
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

    class EksiCSS {
        /**
     * @constructor
     * @desc Initializes the class
     */
        constructor() {
            this.styleTagId = 'eksi-css-style';
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
            const style = document.createElement('style');
            style.id = this.styleTagId;
            style.type = 'text/css';
            document.head.appendChild(style);
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
                style.appendChild(document.createTextNode(css));
            }
        }
    }

    /**
     * @class EksiBlockUsersUI
     * @desc A class for creating and adding a menu item to dropdown for blocking multiple users in bulk on by fetching the list of users who have favorited a specific post
     */
    class EksiBlockUsersUI {
        /**
         * @function createMenuItemElements
         * @desc creates a new li and a elements and sets their attributes
         * @returns {HTMLElement} the li element
         */
        createMenuItemElements() {
            const newItem = document.createElement('li');
            const newAnchor = document.createElement('a');
            newAnchor.setAttribute('title', 'favorileyenleri blokla');
            newAnchor.setAttribute('aria-label', 'favorileyenleri blokla');
            newAnchor.innerText = 'favorileyenleri blokla';
            newItem.appendChild(newAnchor);
            return newItem;
        }

        /**
         * @function addMenuItemEventListener
         * @desc adds an event listener to the menu item for blocking multiple users
         * @param {string} entryId - the entry id of the post
         * @param {HTMLElement} menuItem - the li element
         */
        addMenuItemEventListener(entryId, menuItem) {
            menuItem.addEventListener('click', () => {
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
            const dropdownMenus = document.querySelectorAll('.feedback-container .other.dropdown ul.dropdown-menu.right.toggles-menu');
            // Iterate over the dropdown menus
            dropdownMenus.forEach(dropdownMenu => {
                // Find the entry id of the post
                const entryId = dropdownMenu.closest('li[data-id]').getAttribute('data-id');
                // Create a menu item for blocking multiple users
                const menuItem = this.createMenuItem(entryId);
                // Append the menu item to the dropdown menu
                dropdownMenu.appendChild(menuItem);
            });
        }
    }

    /**
     * @function entryPoint
     * @desc Entry point of the script where it creates an instance of EksiBlockUsersUI class and calls its method `addMenuItemToDropdown`
     */
    (function() {
        const blockUsersUI = new EksiBlockUsersUI();
        blockUsersUI.addCSS();
        blockUsersUI.addMenuItemToDropdown();
    })();
})();
