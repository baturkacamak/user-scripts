// ==UserScript==
// @name         Copy to Clipboard Button for Replies
// @namespace    https://chat.openai.com/chat
// @version      1.0
// @description  Adds a copy to clipboard button to each of your replies on https://chat.openai.com/chat
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/openai-copy-to-clipboard#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/openai-copy-to-clipboard#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/openai-copy-to-clipboard/openai-copy-to-clipboard.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/openai-copy-to-clipboard/openai-copy-to-clipboard.user.js
// @icon         https://chat.openai.com/favicon-32x32.png
// @match        https://chat.openai.com/chat
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // Create a function to add a copy to clipboard button to the specified element
  const addCopyButton = (elem) => {
    // Create the button
    const button = document.createElement("button");
    button.innerHTML = "Copy";
    button.setAttribute("style", "left: 20px; bottom: 20px; position: absolute; border: 1px solid white; padding: 1rem; background: brown; border-radius: 4px;");


    // Add a click event listener to the button to copy the text to the clipboard
    button.addEventListener("click", () => {
      let text = elem.textContent.replace(/Copy$/, '');
      GM_setClipboard(text);
    });

    // Add the button to the element
    elem.appendChild(button);
  };

   let chatContainer;

  // Set an interval to run a function every 1 second
  const interval = setInterval(() => {
    // Select the chat container element using a class selector
    chatContainer = document.querySelector("*[class*=react-scroll-to-bottom--css]");

    // If the chat container element exists
    if(chatContainer) {
      // Initialize a counter variable
      let ticker = 0;

      // Create a new MutationObserver instance
      const observer = new MutationObserver((mutations) => {
        // Loop through each mutation in the observer's queue
        for (const mutation of mutations) {
          // Loop through each added node in the mutation
          for (const node of mutation.addedNodes) {
              console.log(node.querySelector("*[class*='request-:r0']"))
            // Check if the node is a message by searching for a specific class
            if (node.classList && node.querySelector("*[class*='request-:']")) {
              // Add the 'relative' class to the node
              node.classList.add('relative');
              // Call the 'addCopyButton' function, passing in the node as an argument
              addCopyButton(node);
            }
          }
        }
      });

      // Start observing the chat container element for changes, including child and subtree changes
      observer.observe(chatContainer, {childList: true, subtree: true});

      // Clear the interval to prevent it from running again
      clearInterval(interval);
    }
  }, 1000);
})();
