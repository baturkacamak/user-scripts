// ==UserScript==
// @id           eksi-copy-entry-with-prompt@https://github.com/baturkacamak/userscripts
// @name         Eksi Copy Entry with Prompt
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Adds a copy-to-clipboard button with a selectable prompt to each entry on Eksisozluk, enhancing user interaction by encouraging critical thinking or verification of information.
// @author       Batur Kacamak
// @copyright    2021+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/eksi-copy-entry-with-prompt#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/eksi-copy-entry-with-prompt#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/eksi-copy-entry-with-prompt/eksi-copy-entry-with-prompt.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/eksi-copy-entry-with-prompt/eksi-copy-entry-with-prompt.user.js
// @match        https://eksisozluk.com/*
// @icon         https://eksisozluk.com/favicon.ico
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Function to copy text to clipboard
  function copyToClipboard(text, button, originalIconSVG) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('Copy');
    textarea.remove();

    // Change the button icon to indicate copying is done
    button.innerHTML = copiedIconSVG; // Use the 'copied' icon SVG

    // Revert the icon back to the original after 2 seconds
    setTimeout(() => {
      button.innerHTML = originalIconSVG;
    }, 2000);
  }

  // Icon HTML for the copy button
  const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
  <path d="M6.5 0a.5.5 0 0 1 .5.5H10a2 2 0 0 1 2 2V3h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1v-.5a2 2 0 0 1 2-2h1a.5.5 0 0 1 .5-.5zM10 1H6a1 1 0 0 0-1 1V3h6V2a1 1 0 0 0-1-1zM3 4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3z"/>
</svg>`;

  // Icon SVG for indicating the content has been copied
  const copiedIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-all" viewBox="0 0 16 16">
  <path d="M12.354 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L5.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
  <path d="M6.25 7a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5z"/>
</svg>`;

  const promptKeys = [
    'Doğruluğu Kontrol Et',
    'Eleştiri Yaz',
  ];

  const prompts = {
    'Doğruluğu Kontrol Et': 'Bu yazıda sunulan bilgileri ve iddiaları dikkatli bir şekilde inceleyin. Her bir paragrafı ayrı ayrı ele alarak, bahsedilen olayların, rakamların ve ifadelerin gerçeklik payını araştırın. Kullanılan kaynakları ve delilleri değerlendirin; bilgilerin güvenilir ve doğrulanabilir olup olmadığını kontrol edin. Herhangi bir çelişki veya eksik bilgi varsa bunları not alın ve bu bilgilerin genel bağlam içerisinde nasıl bir etki yarattığını düşünün.',
    'Eleştiri Yaz': 'Bu yazıdaki argümanları ve sunulan fikirleri titizlikle eleştirin. Her paragrafı ayrıntılı bir şekilde inceleyerek, yazarın görüşlerine meydan okuyan ve varsa yanlış bilgileri düzelten bir analiz yapın. Yazıdaki mantık hatalarını, bilgi yanılgılarını ve varsayımları belirleyin. Ayrıca, yazının sunduğu fikirlerin geniş bir perspektiften toplum ve bireyler üzerindeki olası etkilerini değerlendirin ve kendi bakış açınızı, somut örnekler ve alternatif çözümler sunarak ifade edin.',
  };

  // Function to create and return a smaller select box with prompts
  function createPromptSelectBox(entryContent, feedbackElement) {
    const selectBox = document.createElement('select');
    selectBox.innerHTML = '<option value="" selected>Bir eylem seçin...</option>' +
            promptKeys.map((key) => `<option value="${key}">${key}</option>`).join('');
    selectBox.classList.add('prompt-select-box'); // Add class for possible styling

    // Adjust selectBox styling
    selectBox.style.maxWidth = '117px'; // Limit the width to fit the design
    selectBox.style.fontSize = '12px'; // Adjust font size for better readability
    selectBox.style.marginLeft = '5px';
    selectBox.style.padding = '2px 6px'; // Reduce padding to make it less bulky
    selectBox.style.opacity = '0';
    selectBox.style.visibility = 'hidden';
    selectBox.style.transition = 'opacity 0.5s, visibility 0.5s';

    // Set the onchange event to automatically copy text to clipboard when a prompt is selected
    selectBox.onchange = function() {
      if (selectBox.value) {
        const selectedKey = selectBox.value;
        const textToCopy = entryContent + '\n\n\n\n\n\n' + prompts[selectedKey];
        copyToClipboard(textToCopy, feedbackElement, feedbackElement.textContent);
      }
    };

    return selectBox;
  }

  // Function to add the copy button and select box to each entry
  function addCopyButtonsAndSelectBoxes() {
    document.querySelectorAll('li[data-id]').forEach((entry) => {
      const content = entry.querySelector('.content').innerText;
      const feedbackElement = document.createElement('div');
      feedbackElement.textContent = ''; // Initial feedback text
      feedbackElement.classList.add('copy-feedback'); // Add class for possible styling

      const selectBox = createPromptSelectBox(content, feedbackElement); // Create the select box

      // Adjust feedbackElement styling as needed
      feedbackElement.style.marginLeft = '10px';
      feedbackElement.style.fontSize = '12px';
      feedbackElement.style.color = 'gray';
      entry.style.position = 'relative';

      // Create a container for the select box to control its positioning
      const selectContainer = document.createElement('div');
      selectContainer.classList.add('select-container');
      selectContainer.style.transition = 'opacity 0.5s, visibility 0.5s';
      selectContainer.appendChild(selectBox);

      const footer = entry.querySelector('.feedback-container');
      footer.appendChild(selectContainer); // Append the select box to the footer
      footer.appendChild(feedbackElement); // Append the feedback element to the footer


      // Show the select box when hovering over the entry
      entry.addEventListener('mouseenter', function() {
        selectBox.style.opacity = '1';
        selectBox.style.visibility = 'visible';
      });

      // Hide the select box when not hovering over the entry
      entry.addEventListener('mouseleave', function() {
        selectBox.style.opacity = '0';
        selectBox.style.visibility = 'hidden';
      });
    });
  }

  // Invoke the function to add buttons and select boxes
  addCopyButtonsAndSelectBoxes();
})();
