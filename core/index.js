/**
 * Core functionality for userscripts
 * Export all components from a single file for easy importing
 */

// Utils
import Logger from './utils/Logger.js';
import HTMLUtils from './utils/HTMLUtils.js';
import StyleManager from './utils/StyleManager.js';
import GMFunctions from './utils/GMFunctions.js';

// Internationalization
import TranslationManager from './i18n/TranslationManager.js';

// UI Components
import SectionToggler from './ui/SectionToggler.js';
import DOMObserver from './ui/DOMObserver.js';

// Export all components
export {
  // Utils
  Logger,
  HTMLUtils,
  StyleManager,
  GMFunctions,

  // Internationalization
  TranslationManager,

  // UI Components
  SectionToggler,
  DOMObserver,
};

// Also export as default for convenience
export default {
  Logger,
  HTMLUtils,
  StyleManager,
  TranslationManager,
  SectionToggler,
  DOMObserver,
};
