import { Logger, DOMObserver } from '../common/core/index.js';
import { HttpService } from '../common/core/services/httpService.js';
import { DataCache } from '../common/core/utils/DataCache.js';
import { config } from './config.js';
import { StatisticsExtractor } from './services/statisticsExtractor.js';
import { ScoreCalculator } from './services/scoreCalculator.js';

const SCRIPT_NAME = 'IdealistaHouseListingAnalyzer';

class IdealistaHouseListingAnalyzer {
  constructor() {
    this.logger = new Logger(`[${SCRIPT_NAME}]`);
    this.domObserver = new DOMObserver(this.logger);
    this.httpService = new HttpService(this.logger);
    this.dataCache = new DataCache(this.logger);
    this.extractor = new StatisticsExtractor(this.logger, this.httpService);
    this.scoreCalculator = new ScoreCalculator(this.logger);
    this.processedLinks = new Set(); // Keep track of processed links
    this.logger.log('Initialized');
  }

  init() {
    this.logger.log('Starting Idealista House Listing Analyzer...');
    this.processExistingLinks(); // Process links already on the page
    this.domObserver.observeDOM(document.body, this.handleDOMChanges.bind(this), {
      childList: true,
      subtree: true,
    });
    this.logger.log('DOM observation started for Idealista links.');
  }

  handleDOMChanges(mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself if it's an anchor
            if (node.matches && node.matches('a[href*="/inmueble/"]')) {
              this.processAnchorElement(node);
            }
            // Check descendant anchors
            node.querySelectorAll('a[href*="/inmueble/"]').forEach(anchor => this.processAnchorElement(anchor));
          }
        });
      }
    }
  }
  
  processExistingLinks() {
    document.querySelectorAll('a[href*="/inmueble/"]').forEach(anchor => this.processAnchorElement(anchor));
  }

  async processAnchorElement(anchorElement) {
    if (!anchorElement || !anchorElement.href || this.processedLinks.has(anchorElement.href)) {
      return;
    }
    if (anchorElement.querySelector('.listing-score-badge')) { // Already has a score
        return;
    }

    this.processedLinks.add(anchorElement.href); // Mark as processed (attempting)
    this.logger.log(`Processing link: ${anchorElement.href}`);

    const listingId = this.extractor.extractListingId(anchorElement.href);
    if (!listingId) {
      this.logger.warn('Could not extract listing ID from:', anchorElement.href);
      return;
    }

    const cachedScoreData = this.dataCache.get(`score_${listingId}`);
    if (cachedScoreData !== null) {
      this.logger.log(`Using cached score for ${listingId}: ${cachedScoreData.score}`);
      this.displayScore(anchorElement, cachedScoreData.score, cachedScoreData.daysSincePublished, true);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests)); // Respect delay
      const statistics = await this.extractor.extractStatistics(listingId);
      if (!statistics) {
          this.logger.warn(`No statistics found for listing ID ${listingId}`);
          this.processedLinks.delete(anchorElement.href); // Allow reprocessing if stats failed
          return;
      }

      const daysSincePublished = this.calculateDaysSincePublished(statistics.dateLine);
      const score = this.scoreCalculator.calculateScore(
        statistics.visits,
        statistics.friendShares,
        statistics.emailContacts,
        statistics.favorites,
        daysSincePublished,
      );

      this.dataCache.set(`score_${listingId}`, { score, daysSincePublished }, config.expirationDays);
      this.displayScore(anchorElement, score, daysSincePublished, false);
    } catch (error) {
      this.logger.error(`Error processing listing ${listingId}:`, error);
      this.processedLinks.delete(anchorElement.href); // Allow reprocessing on error
    }
  }

  displayScore(anchorElement, score, daysSincePublished, isFromCache) {
    if (anchorElement.querySelector('.listing-score-badge')) {
        this.logger.log('Score badge already exists for:', anchorElement.href);
        return; // Avoid adding multiple badges
    }

    const scoreElement = document.createElement('span');
    scoreElement.className = 'listing-score-badge'; // For styling & identification
    scoreElement.textContent = ` (${score.toFixed(2)}) D:${daysSincePublished}`;
    scoreElement.title = `Score: ${score.toFixed(2)}, Days: ${daysSincePublished}${isFromCache ? ' (cached)' : ''}`;
    
    // Basic styling, can be enhanced with StyleManager or GM_addStyle
    scoreElement.style.color = score > 5 ? 'green' : (score > 2 ? 'orange' : 'red');
    scoreElement.style.fontWeight = 'bold';
    scoreElement.style.marginLeft = '5px';
    scoreElement.style.fontSize = '0.9em';

    anchorElement.appendChild(scoreElement);
    this.logger.log(`Displayed score ${score.toFixed(2)} (Days: ${daysSincePublished}) for ${anchorElement.href}`);
  }

  calculateDaysSincePublished(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      this.logger.warn('Invalid or missing dateString for calculateDaysSincePublished:', dateString);
      return 0; // Default to 0 days if no valid date string
    }
    // Idealista date formats: "dd de MMMM" (e.g., "23 de mayo") or sometimes relative like "ayer"
    // This regex handles "dd de MMMM"
    const monthNames = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    };
    const dateRegex = /(\d+)\s+de\s+(\w+)/i;
    const match = dateString.match(dateRegex);

    if (match && match[1] && match[2]) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const month = monthNames[monthStr];

      if (day && month !== undefined) {
        const currentYear = new Date().getFullYear();
        let publishedDate = new Date(currentYear, month, day);
        // If the date is in the future (e.g. processing Jan listings in Dec), assume previous year
        if (publishedDate > new Date() && new Date().getMonth() < month) {
            publishedDate = new Date(currentYear -1, month, day);
        } else if (publishedDate > new Date()) { // If still in future (e.g. processing Dec 31 on Dec 1), could be current year for recently posted
             // Or, if it's for a past month but results in future date (e.g., parsing "30 de Nov" in Jan), assume previous year.
            if (new Date().getMonth() < month) { // If current month is less than parsed month, it has to be last year
                 publishedDate.setFullYear(currentYear - 1);
            }
             // If it's same month but future day, this is an issue, maybe default to 0 or log warning.
             // For now, let's assume idealista doesn't show future dates beyond this logic.
        }


        const currentDate = new Date();
        currentDate.setHours(0,0,0,0); // Compare dates only
        publishedDate.setHours(0,0,0,0);

        const timeDiff = currentDate.getTime() - publishedDate.getTime();
        if (timeDiff < 0) { // Should not happen with above logic, but as a safe guard
            this.logger.warn(`Calculated future published date: ${publishedDate} for string ${dateString}`);
            return 0;
        }
        return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
      }
    }
    this.logger.warn(`Could not parse date string: ${dateString}`);
    return 0; // Default if parsing fails
  }
}

export default IdealistaHouseListingAnalyzer; 