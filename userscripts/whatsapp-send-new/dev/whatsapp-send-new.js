import { StyleManager, Button, DOMObserver, Logger } from '../../common/core/index.js';

/* global webpackJsonp, unsafeWindow  */

// Moved from static class methods to module-scoped functions
function getStore(modules) {
  const win = window || unsafeWindow;
  const storeObjects = [
    {
      id: 'Store',
      conditions: (module) => ((module.default && module.default.Chat && module.default.Msg) ? module.default : null),
    },
    {
      id: 'OpenChat',
      conditions: (module) => ((module.default && module.default.prototype && module.default.prototype.openChat) ? module.default : null),
    },
  ];
  let foundCount = 0;
  for (const idx in modules) {
    if (('object' === typeof modules[idx]) && (null !== modules[idx])) {
      const first = Object.values(modules[idx])[0];
      if (('object' === typeof first) && (first.exports)) {
        for (const idx2 in modules[idx]) {
          const module = modules(idx2);
          if (!module) {
            continue;
          }
          storeObjects.forEach((needObj) => {
            if (!needObj.conditions || needObj.foundedModule) return;
            const neededModule = needObj.conditions(module);
            if (null !== neededModule) {
              foundCount++;
              needObj.foundedModule = neededModule;
            }
          });
          if (foundCount == storeObjects.length) {
            break;
          }
        }
        const neededStore = storeObjects.find((needObj) => 'Store' === needObj.id);
        win.Store = neededStore.foundedModule ? neededStore.foundedModule : window.Store;
        storeObjects.splice(storeObjects.indexOf(neededStore), 1);
        storeObjects.forEach((needObj) => {
          if (needObj.foundedModule) win.Store[needObj.id] = needObj.foundedModule;
        });
        return win.Store;
      }
    }
  }
}

function loadModule() {
  if ('function' === typeof webpackJsonp) {
    webpackJsonp([], {parasite: (x, y, z) => getStore(z)}, ['parasite']);
  } else {
    webpackJsonp.push([['parasite'], {
      parasite(o, e, t) {
        getStore(t);
      },
    }, [['parasite']]]);
  }
}

class WhatsappSendNew {
  constructor() {
    this.CSS_STYLES = `
        .wsnu {display: flex; height: 72px; border-bottom: 1px solid;position: relative}
        .wsnu__input {font-family: inherit; width: 100%;display:block;padding: 5px 40px 5px 10px; margin:10px; border:1px dashed; border-radius: 10px;}
        .wsnu__input:active {outline:none}
        .wsnu__input:focus {outline:none}
        .wsnu__input:hover {cursor:pointer}
        .wsnu__button {transform: rotate(180deg) translateY(50%); position: absolute; top: 50%;right: 10px;padding: 0 10px; z-index: 10; border:none 0; height:50px; background-color: transparent !important;}
    `;
    this.SVG_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>';

    this.SELECTORS = {
      mutationObserver: 'div[tabindex="-1"]>div>div>span',
      mutationLeftPanel: 'div[tabindex="-1"]>div>div>span [data-list-scroll-offset]>div',
      searchContactsInput: '[tabindex] [style] div.copyable-text.selectable-text[data-tab="3"][dir]',
    };
    this.win = window || unsafeWindow;
    this.logger = new Logger('[WhatsappSendNew]');
    this.init();
  }

  injectStyles() {
    StyleManager.addStyles(this.CSS_STYLES, 'wsnu-styles');
  }

  createPhoneNumberInput() {
    const input = document.createElement('input');
    input.classList.add('wsnu__input');
    input.setAttribute('placeholder', 'Write a phone number and hit enter');
    input.setAttribute('autofocus', 'autofocus');
    input.addEventListener('keyup', (event) => {
      if ('Enter' === event.key) {
        this.sendMessageUrl(input.value);
      }
    });
    return input;
  }

  createSendButton(inputElement) {
    const button = new Button({
        icon: this.SVG_ICON,
        onClick: () => this.sendMessageUrl(inputElement.value),
        className: 'wsnu__button',
    });
    return button.button;
  }

  createUiElements() {
    const input = this.createPhoneNumberInput();
    const buttonElement = this.createSendButton(input);

    const wsnuContainer = document.createElement('div');
    wsnuContainer.classList.add('wsnu');
    wsnuContainer.appendChild(buttonElement);
    wsnuContainer.appendChild(input);
    
    return { container: wsnuContainer, inputElement: input };
  }

  handleNewChatPanelNode(node) {
    const listDiv = node.querySelector('[data-list-scroll-offset]>div');
    if (listDiv && !listDiv.parentElement.querySelector('.wsnu')) { 
        this.injectStyles();
        const { container, inputElement } = this.createUiElements();
        listDiv.parentElement.append(container);
        inputElement.focus();
        return true;
    }
    return false;
  }

  handleUiMutations(mutations) {
      for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
              for (const addedNode of mutation.addedNodes) {
                  if (addedNode.nodeType === Node.ELEMENT_NODE) { 
                     if (this.handleNewChatPanelNode(addedNode)) {
                         return; 
                     }
                  }
              }
          }
      }
  }

  startWhatsapp() {
    this.newWhatsapp(); 
    
    const observerTargetNode = document.querySelector(this.SELECTORS.mutationObserver);
    if (observerTargetNode) {
        if (this.uiObserver) {
            this.uiObserver.disconnect();
        }
        this.uiObserver = new DOMObserver(this.handleUiMutations.bind(this));
        this.uiObserver.observe(observerTargetNode, { childList: true, subtree: true });
        this.logger.log('UI Observer started.');
    } else {
        this.logger.warn('Could not find target node for UI observer.');
    }
  }

  async initialDomReadyCheck() {
    try {
        this.logger.log('Waiting for WhatsApp main UI to be ready...');
        await DOMObserver.waitForElements(this.SELECTORS.mutationObserver, 30000);
        this.logger.log('WhatsApp main UI is ready.');
        this.startWhatsapp();
    } catch (error) {
        this.logger.error('Failed to initialize script, WhatsApp UI not found after timeout.', error);
    }
  }

  sendMessageUrl(number) {
    if (number) {
      let phoneNumber = number.replace(/\s+/g, '');
      phoneNumber = phoneNumber.replace(/^00/g, '');
      phoneNumber = phoneNumber.replace(/^\+/g, '');
      if (this.wchat && typeof this.wchat.openChat === 'function') {
        this.wchat.openChat(phoneNumber);
      } else {
        this.logger.error('wchat or openChat method not available.');
      }
    }
  }

  newWhatsapp() {
    loadModule(); // Now calls the module-scoped function
    if (this.win.Store && this.win.Store.OpenChat) {
        this.wchat = new this.win.Store.OpenChat();
        this.logger.log('WhatsApp OpenChat module loaded.');
    } else {
        this.logger.error('Failed to load WhatsApp OpenChat module.');
    }
  }

  init() {
    this.initialDomReadyCheck(); // Renamed from mutationReady for clarity
  }
}

// eslint-disable-next-line no-unused-vars
const whatsappSendNew = new WhatsappSendNew(); 