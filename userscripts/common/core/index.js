/**
 * Core functionality for userscripts
 * Export all components from a single file for easy importing
 */

// Utils
import Logger from './utils/Logger.js';
import HTMLUtils from './utils/HTMLUtils.js';
import StyleManager from './utils/StyleManager.js';
import * as GMFunctions from './utils/GMFunctions.js';

// Internationalization
import TranslationManager from './i18n/TranslationManager.js';

// UI Components
import SectionToggler from './ui/SectionToggler.js';
import DOMObserver from './ui/DOMObserver.js';
import SelectBox from './ui/SelectBox.js';
import Button from './ui/Button.js';
import Slider from './ui/Slider.js';
import ProgressBar from './ui/ProgressBar.js';
import Checkbox from './ui/Checkbox';
import SidebarPanel from './ui/SidebarPanel';
import Notification from './ui/Notification';

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
  SelectBox,
  Button,
  Slider,
  ProgressBar,
  Checkbox,
  SidebarPanel,
  Notification,
};

// Also export as default for convenience
export default {
  Logger,
  HTMLUtils,
  StyleManager,
  TranslationManager,
  SectionToggler,
  DOMObserver,
  SelectBox,
  Button,
  Checkbox,
  SidebarPanel,
  Notification,
};
