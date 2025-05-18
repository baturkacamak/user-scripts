import { DOMObserver, Logger } from '../common/core/index.js';

class LingualeoSpeaker {
  constructor() {
    this.logger = new Logger('[LingualeoSpeaker]');
    this.SELECTORS = {
      wordText: '.ll-LeoSprint__text',
      soundButton: '.ll-LeoSprint__btn-sound',
      soundButtonMuted: '.ll-LeoSprint__btn-sound__m-muted',
      nextButton: '.ll-LeoSprint__question-wrapper .ll-leokit__button', // Assuming this is the "next" or "check" button
    };
    this.currentWord = null;
    this.wordObserver = null;
    this.init();
  }

  playCurrentWordSound() {
    const soundButton = document.querySelector(this.SELECTORS.soundButton);
    const isMuted = document.querySelector(this.SELECTORS.soundButtonMuted);
    if (soundButton && !isMuted) {
      soundButton.click();
      this.logger.log('Clicked sound button.');
    }
  }

  // Called when the word text content changes
  handleWordChange(mutations) {
    // We are observing the word element itself, so any characterData mutation means the word changed.
    // Or if its child nodes changed in a way that alters the text.
    const wordElement = document.querySelector(this.SELECTORS.wordText);
    if (wordElement) {
      const newWord = wordElement.innerText.trim();
      if (newWord && newWord !== this.currentWord) {
        this.logger.log(`Word changed from "${this.currentWord}" to "${newWord}"`);
        this.currentWord = newWord;
        this.playCurrentWordSound();
        
        // The original script also clicked a general button in .ll-LeoSprint__question-wrapper
        // This might be to submit the answer or move to the next word after a delay, or it might be an error.
        // For now, I'll keep the sound playing, and the next button click can be re-evaluated if needed.
        // const nextButton = document.querySelector(this.SELECTORS.nextButton);
        // if (nextButton) {
        //     this.logger.log('Clicking next/check button.');
        //     nextButton.click();
        // }
      } else if (newWord && newWord === this.currentWord) {
        // Word hasn't changed, but perhaps sound needs to be replayed if it was missed.
        // This part needs careful consideration of game flow.
        // For now, only playing on actual word change.
      }
    }
  }

  async startWordObserver() {
    try {
      const wordElement = await DOMObserver.waitForElements(this.SELECTORS.wordText, 15000);
      if (wordElement && wordElement[0]) {
        this.currentWord = wordElement[0].innerText.trim();
        this.logger.log(`Initial word: "${this.currentWord}". Starting observer.`);
        this.playCurrentWordSound(); // Play sound for the first word

        if (this.wordObserver) {
            this.wordObserver.disconnect();
        }
        this.wordObserver = new DOMObserver(this.handleWordChange.bind(this));
        // Observe the specific word element for changes in its text content
        this.wordObserver.observe(wordElement[0], { childList: true, characterData: true, subtree: true });
      } else {
        this.logger.warn('Word element not found to start observer.');
      }
    } catch (error) {
      this.logger.error('Error waiting for word element:', error);
    }
  }

  init() {
    this.logger.log('Initialized. Waiting for Leo Sprint training to start...');
    // The original script had a loadInterval. 
    // We replace this by directly waiting for the word element which indicates the game has started.
    this.startWordObserver();
  }
}

// eslint-disable-next-line no-unused-vars
const lingualeoSpeaker = new LingualeoSpeaker(); 