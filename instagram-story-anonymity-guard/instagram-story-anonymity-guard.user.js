// ==UserScript==
// @id           instagram-story-anonymity-guard@https://github.com/baturkacamak/userscripts
// @name         Instagram Story Anonymity Guard
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.1.0
// @description  Blocks a specific request to maintain anonymity while viewing Instagram stories.
// @author       Batur Kacamak
// @license      MIT
// @homepage     https://github.com/baturkacamak/userscripts/tree/master/instagram-story-anonymity-guard#readme
// @supportURL   https://github.com/baturkacamak/userscripts/issues
// @icon         https://instagram.com/favicon.ico
// @noframes
// @run-at       document-start
// @grant        none
// @match        *://www.instagram.com/*
// @include      *://www.instagram.com/*
// ==/UserScript==

/**
 * The InstagramStoryAnonymityGuard class ensures users maintain their anonymity while viewing Instagram stories.
 * It achieves this by overriding the XMLHttpRequest send method to block specific requests.
 */
class InstagramStoryAnonymityGuard {
  /**
     * Initializes a new instance of the InstagramStoryAnonymityGuard class and sets up the request blocking mechanism.
     */
  constructor() {
    InstagramStoryAnonymityGuard.originalXMLSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = this.send;
  }

  /**
     * Custom send method to check and block specific requests.
     * @param {...any} args - The arguments passed to the XMLHttpRequest send method.
     */
  send(...args) {
    const requestData = args[0];
    if ('string' !== typeof requestData || !requestData.includes('viewSeenAt')) {
      InstagramStoryAnonymityGuard.originalXMLSend.apply(this, args);
    }
  }
}

new InstagramStoryAnonymityGuard();
