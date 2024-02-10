// ==UserScript==
// @id           eksi-response-enhancer@https://github.com/baturkacamak/userscripts
// @name         Eksi Response Enhancer with ChatGPT
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Enhances Eksisozluk entry interaction by adding response features with ChatGPT integration, display for ChatGPT responses, and a copy to clipboard button for the responses.
// @author       Batur Kacamak
// @copyright    2021+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-response-enhancer-with-chatgpt#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-response-enhancer-with-chatgpt#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-response-enhancer-with-chatgpt/eksi-response-enhancer-with-chatgpt.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-response-enhancer-with-chatgpt/eksi-response-enhancer-with-chatgpt.user.js
// @match        https://eksisozluk.com/*
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  // Function to add response controls, display area, and copy button to each entry
  function addResponseControlsDisplayAndCopy() {
    const entries = document.querySelectorAll('#entry-item-list > li');

    entries.forEach((entry) => {
      if (entry.querySelector('.custom-response-controls')) return;

      const selectBox = document.createElement('select');
      selectBox.innerHTML = `
                <option value="">Select Response Type</option>
                <option value="critical">Critical Response</option>
                <option value="verification">Verify Entry</option>
            `;
      selectBox.classList.add('custom-response-select');

      const responseButton = document.createElement('button');
      responseButton.textContent = 'Respond';
      responseButton.classList.add('custom-response-button');

      const controlsContainer = document.createElement('div');
      controlsContainer.classList.add('custom-response-controls');
      controlsContainer.appendChild(selectBox);
      controlsContainer.appendChild(responseButton);

      const responseDisplay = document.createElement('div');
      responseDisplay.classList.add('chatgpt-response-display');

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy to Clipboard';
      copyButton.classList.add('custom-copy-button');
      copyButton.style.display = 'none'; // Initially hide the copy button

      // Append the copy button after the response display area
      controlsContainer.appendChild(responseDisplay);
      controlsContainer.appendChild(copyButton);

      entry.querySelector('.content').appendChild(controlsContainer);

      responseButton.addEventListener('click', function() {
        const prompt = entry.querySelector('.content').textContent;
        const responseType = selectBox.value;
        if (responseType && prompt) {
          callChatGPTAPI(prompt, function(responseText) {
            responseDisplay.textContent = `ChatGPT: ${responseText}`;
            copyButton.style.display = 'inline-block'; // Show the copy button after receiving response
          });
        } else {
          alert('Please select a response type.');
        }
      });

      copyButton.addEventListener('click', function() {
        GM_setClipboard(responseDisplay.textContent);
        alert('Response copied to clipboard!');
      });
    });
  }

  function callChatGPTAPI(prompt, callback) {
    const apiKey = 'YOUR API KEY';

    GM_xmlhttpRequest({
      method: 'POST', url: 'https://api.openai.com/v1/chat/completions', headers: {
        'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`,
      }, data: JSON.stringify({
        model: 'gpt-3.5-turbo', messages: [{
          role: 'user', content: prompt,
        }],
      }), onload: function(response) {
        try {
          const result = JSON.parse(response.responseText);
          if (result.error) {
            console.error('API Error:', result.error); // Log the detailed error message
            alert(`API Error: ${result.error.message}`); // Display a more informative error message
            return;
          }
          if (result.choices && 0 < result.choices.length && result.choices[0].message && result.choices[0].message.content) {
            if (callback && 'function' === typeof callback) {
              callback(result.choices[0].message.content);
            }
          } else {
            console.error('Unexpected response format:', result);
            alert('Failed to get a response from ChatGPT. The response format is unexpected.');
          }
        } catch (error) {
          console.error('Error parsing response from ChatGPT API:', error);
          alert('There was an error processing the response from ChatGPT. Please check the console for more details.');
        }
      }, onerror: function(error) {
        console.error('Request to ChatGPT API failed:', error);
        alert('There was an error making the request to ChatGPT. Please check the console for more details.');
      },
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) addResponseControlsDisplayAndCopy();
    });
  });

  const entryList = document.querySelector('#entry-item-list');
  if (entryList) {
    observer.observe(entryList, {childList: true});
    addResponseControlsDisplayAndCopy();
  }
})();
