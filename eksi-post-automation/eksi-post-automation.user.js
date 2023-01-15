// ==UserScript==
// @name        EksiSözlük - Load More Posts and Delete Posts Automation
// @namespace   https://eksisozluk.com/
// @version     1.0
// @description Automatically loads all posts and deletes posts on a specific website using classes for organization and readability.
// @match       https://eksisozluk.com/biri/*
// @run-at      document-idle
// @grant       none
// @author      Batur Kacamak
// @updateURL   https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-automation/eksi-post-automation.user.js
// @downloadURL https://raw.githubusercontent.com/baturkacamak/user-scripts/eksi-post-automation/eksi-post-automation.user.js
// ==/UserScript==

/**
 * @fileoverview Tampermonkey script that loads all entries and deletes all posts on a given topic page
 * @author Batur Kacamak
 */
(function() {
    'use strict';

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
     * Class to handle the deletion of posts.
     * @class
     * @property {HTMLElement[]} topicItems - The array of topic items to be deleted.
     */
    class PostDeleter {
        /**
         * Constructor method that takes in an array of topic items as a parameter.
         * @constructor
         * @param {HTMLElement[]} topicItems - The array of topic items to be deleted.
         */
        constructor(topicItems) {
            this.topicItems = topicItems;
        }

        /**
         * Method that iterates through the topic items and calls the deletePost method on each item.
         * @method
         */
        async processTopicItems() {
            // If there are no topic items, then query the DOM for all elements with the class "topic-item"
            if (this.topicItems.length === 0) {
                this.topicItems = document.querySelectorAll('.topic-item');
            }
            // loop through the topicItems
            for (let i = 0; i < this.topicItems.length; i++) {
                // call deletePost method on each topic item
                await this.deletePost(this.topicItems[i]);
            }
        }

        /**
         * Method that finds the delete button in a topic item and clicks it, then calls the confirmDeletion method.
         * @method
         * @param {HTMLElement} topicItem - The topic item element.
         */
        async deletePost(topicItem) {
            this.findAndClickButton("sil", "a", topicItem);
            await delay(2);
            await this.confirmDeletion();
        }

        /**
         * Method that finds the confirm button in the deletion modal and clicks it, then waits for the modal to disappear
         * @method
         */
        async confirmDeletion() {
            // Return a new promise, so that we can use the 'await' keyword to wait for this function to complete
            return new Promise(resolve => {
                // Set an interval to repeatedly check for the presence of the delete button
                // This allows us to wait for the deletion modal to appear before clicking the button
                const deleteInterval = setInterval(() => {
                    // Call the findAndClickButton method to find and click the confirm button
                    this.findAndClickButton("kesin", "button", document);
                    // Check if the modal is no longer visible by checking the display style property
                    // If the modal is no longer visible, we clear the interval and resolve the promise
                    if ('none' === document.querySelector('#delete-self-form').style.display) {
                        clearInterval(deleteInterval);
                        resolve();
                    }
                }, 2000); // interval is set to 2 sec
            });
        }

        /**
         * Method that finds a button element based on its text and tagName and clicks it.
         * @method
         * @param {string} buttonText - The text of the button to find.
         * @param {string} tagName - The tagname of the button to find.
         * @param {HTMLElement} scope - The element to search for the button within.
         */
        findAndClickButton(buttonText, tagName, scope) {
            const button = Array.prototype.slice.call(scope.getElementsByTagName(tagName)).filter(function(el) {
                return el.textContent === buttonText
            });
            if (button.length > 0) {
                button[0].click();
            }
        }
    }

    /**
     * Class to handle the loading of more entries.
     * @class
     * @property {HTMLElement} loadMoreButton - The "load-more-entries" button element.
     * @property {HTMLElement} itemCountStyle - The styles for the topic items counter.
     */
    class LoadMoreEntries {
        /**
         * Constructor method that takes in the loadMoreButton and itemCountStyle as parameters.
         * @constructor
         * @param {HTMLElement} loadMoreButton - The "load-more-entries" button element.
         * @param {HTMLElement} itemCountStyle - The styles for the topic items counter.
         */
        constructor(loadMoreButton, itemCountStyle) {
            this.loadMoreButton = loadMoreButton;
            this.itemCountStyle = itemCountStyle;
        }

        /**
         * Method that loads all the entries by clicking the loadMoreButton.
         * @method
         */
        loadAllEntries() {
            // Check if the button exists
            if (this.loadMoreButton) {
                // Create a new MutationObserver
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if ("daha fazla göster" === mutation.target.textContent) {
                            setTimeout(() => this.clickLoadMoreButton(), 1000);
                        }
                    });
                });

                // Observe the href attribute of the "load-more-entries" button
                observer.observe(this.loadMoreButton, {
                    attributes: true,
                });
                setTimeout(() => this.clickLoadMoreButton(), 2000);
            }
        }

        /**
         * Method that clicks the loadMoreButton and updates the itemCountStyle with the current number of topic items.
         * @method
         */
        clickLoadMoreButton() {
            this.loadMoreButton.click();
            this.itemCountStyle.innerHTML = `.topic-item::before { content: "Item " counter(my-sec-counter); counter-increment: my-sec-counter -1; } #profile-stats-section-content {counter-increment: my-sec-counter ${document.querySelectorAll('.topic-item').length}};`;
        }
    }


    /**
     * Class to handle the creation of menu buttons.
     * @class
     * @property {string} buttonText - The text to be displayed on the button.
     * @property {function} clickCallback - The function to be called on button click.
     * @property {HTMLElement} dropdownMenuList - The ul element that contains the existing dropdown menu items.
     */
    class MenuButton {
        /**
         * Constructor method that takes in the buttonText and clickCallback as parameters.
         * @constructor
         * @param {string} buttonText - The text to be displayed on the button.
         * @param {function} clickCallback - The function to be called on button click.
         */
        constructor(buttonText, clickCallback) {
            this.buttonText = buttonText;
            this.clickCallback = clickCallback;
            this.dropdownMenuList = document.querySelector('#profile-dots ul');
        }

        /**
         * Method that creates a new button element with the provided buttonText and clickCallback function.
         * @method
         */
        createMenuButton() {
            // Create the new li element
            const newMenuItem = document.createElement('li');
            // Create the new button element
            const newButton = document.createElement('a');
            newButton.textContent = this.buttonText;
            newButton.addEventListener('click', this.clickCallback);
            // Append the button to the li element
            newMenuItem.appendChild(newButton);
            // Append the li element to the ul element
            this.dropdownMenuList.appendChild(newMenuItem);
        }
    }

    /**
     * Class to handle the main functionality of the script.
     * @class
     * @property {HTMLElement} loadMoreButton - The "load-more-entries" button element.
     * @property {LoadMoreEntries} loadEntries - The object that handles loading more entries.
     * @property {HTMLElement[]} topicItems - The array of topic items to be deleted.
     * @property {PostDeleter} deletePost - The object that handles deleting posts.
     * @property {MenuButton} deleteButton - The object that creates the "Delete All Posts" button.
     * @property {MenuButton} loadAllPostsButton - The object that creates the "Load All Posts" button.
     */
    class App {
        /**
         * Constructor method that initializes the loadMoreButton, loadEntries, topicItems, deletePost, deleteButton, and loadAllPostsButton properties.
         * @constructor
         */
        constructor() {
            const itemCountStyle = document.createElement('style');
            itemCountStyle.innerHTML = `.topic-item::before { content: "Item " counter(my-sec-counter); counter-increment: my-sec-counter -1; } #profile-stats-section-content {counter-increment: my-sec-counter 11;}`;
            document.head.appendChild(itemCountStyle);

            this.loadMoreButton = document.querySelector('.load-more-entries');
            this.loadEntries = new LoadMoreEntries(this.loadMoreButton, itemCountStyle);

            this.topicItems = document.querySelectorAll('.topic-item');
            this.deletePost = new PostDeleter(this.topicItems);
            this.deleteButton = new MenuButton("Delete All Posts", () => this.deletePost.processTopicItems());
            this.loadAllPostsButton = new MenuButton('Load All Posts', () => this.loadEntries.loadAllEntries());
        }

        /**
         * Method that creates the delete and load all posts button and adds them to the menu.
         * @method
         */
        init() {
            this.deleteButton.createMenuButton();
            this.loadAllPostsButton.createMenuButton();

        }
    }

    const app = new App();
    app.init();
})();
