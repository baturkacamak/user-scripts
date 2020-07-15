// ==UserScript==
// @id           whatsapp-send-new@https://github.com/baturkacamak/userscripts
// @name         Whatsapp Send New
// @namespace    https://github.com/baturkacamak/userscripts
// @name         Whatsapp
// @version      0.1
// @description  Send whatsapp messages without needing to add them to your contact list.
// There will be a new input under new chat button in whatsapp web. Try it. It is easy.
// @author       Batur Kacamak
// @copyright    2020+, Batur Kacamak (https://batur.info/)
// @match        https://*.whatsapp.com/*
// @run-at       document-idle
// @grant        none
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/whatsapp-send-new#readme
// @homepageURL  https://github.com/baturkacamak/userscripts/tree/master/whatsapp-send-new#readme
// @downloadURL  https://github.com/baturkacamak/userscripts/raw/master/whatsapp-send-new/whatsapp-send-new.user.js
// @updateURL    https://github.com/baturkacamak/userscripts/raw/master/whatsapp-send-new/whatsapp-send-new.user.js
// @icon         https://whatsapp.com/favicon.ico
// @grant        unsafeWindow
// ==/UserScript==

/* global unsafeWindow  */

class WhatsappSendNew {
  static sendMessageUrl(number) {
    const win = window || unsafeWindow;
    const phoneNumber = number.replace(/\s+/g, '');
    win.location = `https://web.whatsapp.com/send?phone=${phoneNumber}`;
  }

  constructor() {
    this.SELECTORS = {
      mutationObserver: 'div[tabindex="-1"]>div>div>span',
      mutationLeftPanel: 'div[tabindex="-1"]>div>div>span [data-list-scroll-offset]>div',
      searchContactsInput: '[tabindex] [style] div.copyable-text.selectable-text[data-tab="3"][dir]',
    };

    // start everything
    this.init();
  }

  mutationClickMessages() {
    const observerClick = new MutationObserver(((mutations) => {
      [...mutations].some(
        (mutation) => {
          if (mutation.addedNodes.length > 0) {
            return [...mutation.addedNodes].some((node) => {
              const listDiv = node.querySelector('[data-list-scroll-offset]>div');
              if (listDiv) {
                // clone new group element
                const clonedListDiv = listDiv.cloneNode(true);
                // set searchbox input as default

                const styles = document.createElement('style');

                styles.innerHTML = '.wsnu {display: flex; height: 72px; border-bottom: 1px solid;position: relative}'
                  + '.wsnu__input {font-family: inherit; width: 100%;display:block;padding: 5px 40px 5px 10px; margin:10px; border:1px dashed; border-radius: 10px;}'
                  + '.wsnu__input:active {outline:none}'
                  + '.wsnu__input:focus {outline:none}'
                  + '.wsnu__input:hover {cursor:pointer}'
                  + '.wsnu__button {transform: rotate(180deg) translateY(50%); position: absolute; top: 50%;right: 10px;padding: 0 10px; z-index: 10; border:none 0; height:50px;}';

                document.querySelector('head').appendChild(styles);

                const wsnuContainer = document.createElement('div');
                wsnuContainer.classList.add('wsnu');

                const button = document.createElement('button');
                button.classList.add('wsnu__button');
                button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>';

                const input = document.createElement('input');
                input.classList.add('wsnu__input');
                input.setAttribute('title', 'You should write a number starting with 00 rather than +');
                input.setAttribute('placeholder', 'Write a phone number starting with 00');
                input.setAttribute('autofocus', 'autofocus');

                // on click button
                button.addEventListener('click',
                  () => WhatsappSendNew.sendMessageUrl(input.value));

                // input on enter pressed
                input.addEventListener('keyup',
                  (event) => {
                    if (event.key === 'Enter') {
                      WhatsappSendNew.sendMessageUrl(input.value);
                    }
                  });
                wsnuContainer.appendChild(button);
                wsnuContainer.appendChild(input);
                input.focus();
                // add in after new group element
                listDiv.parentElement.append(wsnuContainer);

                return true;
              }
              return false;
            });
          }
        },
      );
    }));

    observerClick.observe(document.querySelector(this.SELECTORS.mutationObserver), {
      childList: true,
      subtree: true,
    });
  }

  mutationReady() {
    this.observer = new MutationObserver(((mutations) => {
      [...mutations].some(
        (mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.querySelector(this.SELECTORS.mutationObserver)) {
                // whatsapp is ready
                this.mutationClickMessages();
                this.observer.disconnect();
              }
            });
          }
        },
      );
    }));

    this.observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  init() {
    this.mutationReady();
  }
}

const whatsappSendNew = new WhatsappSendNew();
