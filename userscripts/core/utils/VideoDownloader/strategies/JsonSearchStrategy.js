import Logger from '../../Logger';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class JsonSearchStrategy extends BaseDownloadStrategy {
  constructor() {
    super('JsonSearch');
    // Define regex as a class property with global flag to match all occurrences
    this.videoUrlRegex = /https?:(\\\/|\/)[^\s"'<>]+(\\\/|\/)[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]+)?/gi;
  }

  // --- Helper methods specific to this strategy ---
  findJsonVideoUrls() {
    const potentialUrls = new Set(); // Use Set to avoid duplicates
    const jsonScripts = document.querySelectorAll('script[type="application/json"]');

    for (const script of jsonScripts) {
      if (script.textContent) {
        // Direct extraction of URLs from text content
        const content = script.textContent;
        let match;

        // Reset regex for each new search
        this.videoUrlRegex.lastIndex = 0;

        // Find all matches in the content
        while (null !== (match = this.videoUrlRegex.exec(content))) {
          if (match[0] && 1000 > match[0].length) {
            // Clean up escaped slashes in the URL
            const cleanUrl = match[0].replace(/\\\//g, '/');
            potentialUrls.add(cleanUrl);
          }
        }
      }
    }

    // Check global variables like window.__PRELOADED_STATE__ if needed
    if (window.__PRELOADED_STATE__ && 'string' === typeof window.__PRELOADED_STATE__) {
      let match;
      this.videoUrlRegex.lastIndex = 0;
      while (null !== (match = this.videoUrlRegex.exec(window.__PRELOADED_STATE__))) {
        if (match[0] && 1000 > match[0].length) {
          const cleanUrl = match[0].replace(/\\\//g, '/');
          potentialUrls.add(cleanUrl);
        }
      }
    }

    return Array.from(potentialUrls);
  }

  // --- End Helper methods ---

  async attempt(video, filename, {downloadFromUrl}) { // eslint-disable-line no-unused-vars
    Logger.debug(`Strategy ${this.strategyName}: Searching embedded JSON in <script> tags.`);
    try {
      const jsonUrls = this.findJsonVideoUrls();
      if (0 < jsonUrls.length) {
        const firstValidUrl = jsonUrls.find((url) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });

        if (firstValidUrl) {
          Logger.debug(`Strategy ${this.strategyName}: Found potential video URL in JSON.`, firstValidUrl);
          await downloadFromUrl(firstValidUrl, filename);
          return true; // Initiated
        } else {
          Logger.debug(`Strategy ${this.strategyName}: Found URLs in JSON, but none seemed valid.`, {urls: jsonUrls});
        }
      } else {
        Logger.debug(`Strategy ${this.strategyName}: No potential video URLs found in page JSON data.`);
      }
    } catch (err) {
      Logger.error(err, `Strategy ${this.strategyName}: Error occurred while searching JSON data.`);
      // Decide if this is a strategy failure (reject) or just not applicable (return false)
      // Let's treat internal errors as failure.
      throw err; // Propagate the error
    }
    return false; // Not applicable / No valid URL found
  }
}

export default JsonSearchStrategy;
