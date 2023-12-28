// ==UserScript==
// @name         Twitter Auto Thread Creator
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically split long tweets into threads on Twitter
// @author       Your Name
// @match        https://twitter.com/*
// @grant        none
// @run-at      document-idle
// ==/UserScript==

(function() {
  'use strict';

  const waitForElement = function(selector) {
    return new Promise((resolve) => {
      const intervalId = setInterval(function() {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(intervalId);
          resolve(element);
        }
      }, 1000); // Check every 1000 milliseconds (1 second)
    });
  };

  // Select the target node
  waitForElement('.DraftEditor-editorContainer').then(function(target) {
    // Options for the observer (which mutations to observe)
    const config = {childList: true, subtree: true, characterData: true};

    // Callback function to execute when mutations are observed
    const callback = function(mutationsList, observer) {
      for (const mutation of mutationsList) {
        for (const mutation of mutationsList) {
          if ('childList' === mutation.type || 'characterData' === mutation.type) {
            const tweetText = target.textContent;
            // Check if the tweet is longer than the max tweet length (280 characters)
            if (280 < tweetText.length) {
              // Stop observing to avoid infinite loop
              observer.disconnect();

              // Trigger thread creation
              initiateThreadCreation(tweetText);

              // Resume observing
              observer.observe(target, config);
              break;
            }
          }
        }
      }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    if (target) {
      observer.observe(target, config);
    }

    function initiateThreadCreation(tweetText) {
      // Prevent the tweet from being sent
      event.preventDefault();

      // Split the text into chunks without splitting words
      const tweetChunks = splitTweetText(tweetText, 280);

      // Find and click the 'Compose tweet' button
      const composeTweetButton = document.querySelector('[href="/compose/tweet"]');
      composeTweetButton && composeTweetButton.click();

      // Send each chunk as a separate tweet
      tweetChunks.forEach((chunk, index) => {
        setTimeout(() => {
          createTweet(chunk);
          if (index < tweetChunks.length - 1) {
            // Add a delay to avoid being flagged for spam
            createThread();
          }
        }, index * 5000);
      });
    }

    function splitTweetText(text, maxLength) {
      const words = text.split(/\s+/);
      const chunks = [];
      let currentChunk = '';

      words.forEach((word) => {
        if (currentChunk.length + word.length + 1 <= maxLength) {
          currentChunk += ` ${word}`;
        } else {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        }
      });

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      return chunks;
    }

    function createTweet(text) {
      // Function to create a tweet with the given text
      // You would need to interact with Twitter's UI elements to create and post the tweet
    }

    function createThread() {
      // Function to create a new tweet in the thread
      // You would need to interact with Twitter's UI elements to create a thread
    }
  });
})();
