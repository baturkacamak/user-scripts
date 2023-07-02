// ==UserScript==
// @id           instagram-story-anonymity-guard@https://github.com/baturkacamak/userscripts
// @name         Instagram Story Anonymity Guard
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.1
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
 * Class representing the Instagram Story Anonymity Guard user script.
 * @class
 */
class InstagramStoryAnonymityGuard {
  /**
   * Create an instance of the InstagramStoryAnonymityGuard class.
   * @constructor
   */
  constructor() {
    /**
     * Stores the reference to the original send method of XMLHttpRequest.
     * @type {function}
     * @private
     */
    this.originalXMLSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = this.send.bind(this);
  }

  /**
   * Overrides the send method of XMLHttpRequest.
   * @param {...any} args - Arguments passed to the send method.
   */
  send(...args) {
    const url = args[0];
    if (!('string' === typeof url && url.includes('viewSeenAt'))) {
      this.originalXMLSend.apply(this, args);
    }
  }
}

new InstagramStoryAnonymityGuard();
