/**
 * Core functionality for userscripts
 * Export all components from a single file for easy importing
 */

// Utils
import Logger from './utils/Logger.js';
import HTMLUtils from './utils/HTMLUtils.js';
import StyleManager from './utils/StyleManager.js';
import Debouncer from './utils/Debouncer.js';
import PubSub from './utils/PubSub.js';
import { DataCache } from './utils/DataCache.js';
import UserInteractionDetector from './utils/UserInteractionDetector.js';
import UrlChangeWatcher from './utils/UrlChangeWatcher/index.js';
import PollingStrategy from './utils/UrlChangeWatcher/strategies/PollingStrategy.js';
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
  Debouncer,
  PubSub,
  DataCache,
  UserInteractionDetector,
  UrlChangeWatcher,
  PollingStrategy,
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
  Debouncer,
  PubSub,
  DataCache,
  UserInteractionDetector,
  UrlChangeWatcher,
  PollingStrategy,
  TranslationManager,
  SectionToggler,
  DOMObserver,
  SelectBox,
  Button,
  Checkbox,
  SidebarPanel,
  Notification,
};
