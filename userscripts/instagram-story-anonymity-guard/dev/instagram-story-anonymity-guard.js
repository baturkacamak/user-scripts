import { Logger } from '../../common/core/index.js';

class InstagramStoryAnonymityGuard {
  constructor() {
    this.logger = new Logger('[InstagramStoryAnonymityGuard]');
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    this.overrideXHRSend();
    this.logger.log('Initialized. XHR.send overridden to block story view tracking.');
  }

  customXHRSend(...args) {
    const requestData = args[0];
    if (typeof requestData === 'string' && requestData.includes('viewSeenAt')) {
      this.logger.log('Blocked a story view tracking request.');
      // By not calling originalXHRSend, the request is effectively blocked.
      return; 
    }
    // For all other requests, call the original send method
    this.originalXHRSend.apply(this, args);
  }

  overrideXHRSend() {
    // Ensure 'this' inside customXHRSend refers to the XHR instance
    XMLHttpRequest.prototype.send = this.customXHRSend.bind(this);
  }

  // It might be useful to have a method to revert the override, e.g., for debugging or if the script is disabled.
  // revertXHROverride() {
  //   XMLHttpRequest.prototype.send = this.originalXHRSend;
  //   this.logger.log('XHR.send override reverted.');
  // }
}

// Initialize the guard
// eslint-disable-next-line no-unused-vars
const storyGuard = new InstagramStoryAnonymityGuard(); 