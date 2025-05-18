import { Logger, Button } from '../common/core/index.js';

class DiscogsTracklistCopier {
  constructor() {
    this.logger = new Logger('[DiscogsTracklistCopier]');
    this.coreButton = new Button(this.logger);
    this.tracklistTableSelector = 'table.tracklist, table.tracklist_track_table'; // Common selectors for Discogs tracklist tables
    this.copyButton = null;
    this.init();
  }

  init() {
    this.logger.log('Initializing...');
    // Attempt to add the button. DOMObserver could be used if table loads very dynamically.
    // For now, run-at: document-idle should be sufficient for most cases.
    this.addButtonWhenReady();
  }

  addButtonWhenReady() {
    const tracklistTable = document.querySelector(this.tracklistTableSelector);
    if (tracklistTable) {
      this.logger.log('Tracklist table found. Adding button.');
      this.addButton(tracklistTable);
    } else {
      // Optional: use DOMObserver if table isn't always present at document-idle
      this.logger.log('Tracklist table not immediately found. Consider DOMObserver for dynamic pages.');
      // Fallback to a simple interval check for simplicity, or recommend DOMObserver for robustness
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const table = document.querySelector(this.tracklistTableSelector);
        if (table) {
          clearInterval(interval);
          this.logger.log('Tracklist table found after delay. Adding button.');
          this.addButton(table);
        }
        if (attempts > 10) { // Stop after 5 seconds (10 * 500ms)
            clearInterval(interval);
            this.logger.warn('Tracklist table not found after several attempts.');
        }
      }, 500);
    }
  }

  addButton(tracklistTable) {
    if (this.copyButton && this.copyButton.parentNode) {
        this.logger.log('Button already exists.');
        return;
    }

    this.copyButton = this.coreButton.createButton({
      id: 'discogs-copy-btn',
      label: 'Copy Tracklist Data',
      onClick: () => this.copyTracklistData(tracklistTable),
      // No icon specified, will be a text button by default by core.Button
    });

    if (this.copyButton && tracklistTable.parentNode) {
      tracklistTable.parentNode.insertBefore(this.copyButton, tracklistTable);
      // Add some basic styling to the button if not handled by core.Button entirely
      this.copyButton.style.margin = '10px 0';
      this.copyButton.style.padding = '8px 12px';
      this.copyButton.style.cursor = 'pointer';
      this.logger.log('Copy button added.');
    } else {
        this.logger.error('Failed to create or append the copy button.');
    }
  }

  extractTextContent(element, selector) {
    const targetElement = element.querySelector(selector);
    // Fallback for artist if it's directly in a td without specific class (sometimes happens)
    if (!targetElement && selector.includes('artist')) {
        const artistCells = Array.from(element.querySelectorAll('td'));
        // Heuristic: artist is often in a cell with multiple `<a>` or complex structure before title
        // This needs to be adjusted based on actual Discogs HTML structure variance.
        // For now, let's assume the original selectors are mostly reliable.
    }
    return targetElement ? targetElement.textContent.trim() : '';
  }

  async copyTracklistData(tracklistTable) {
    this.logger.log('Attempting to copy tracklist data...');
    let tracklistData = '';
    const tracklistRows = tracklistTable.querySelectorAll('tbody tr.track, tbody tr.tracklist_track');

    if (!tracklistRows.length) {
        this.logger.warn('No track rows found in the table.');
        alert('No track rows found. Cannot copy.');
        return;
    }

    tracklistRows.forEach((row) => {
      // Discogs has varying structures, try to be flexible
      const artistSelectors = [
        'td.tracklist_track_artists a', // Common for releases
        'span.tracklist_track_title_master_artist_details a', // For master releases sometimes
        'td[data-track-credits] a', // Another variant
        // older structures might not have specific artist column per track if it's a compilation by Various Artists
      ];
      const titleSelectors = [
        'span.tracklist_track_title',
        'td.track_title > span', // older style
        'td.title > span.tracklist_track_title'
      ];

      let artist = '';
      for (const selector of artistSelectors) {
        artist = this.extractTextContent(row, selector);
        if (artist) break;
      }
      // If no specific track artist, it might be overall release artist (e.g. an album by one artist)
      // This part might require fetching main release artist if not available per track, or assuming it for VA.

      let trackTitle = '';
      for (const selector of titleSelectors) {
        trackTitle = this.extractTextContent(row, selector);
        if (trackTitle) break;
      }

      if (trackTitle) { // Artist can sometimes be omitted for Various Artists compilations if copying raw titles
        const trackLine = (artist ? `${artist} - ` : '') + `${trackTitle}\n`;
        tracklistData += trackLine;
        this.logger.debug(`Added: ${trackLine.trim()}`);
      }
    });

    if (tracklistData) {
      try {
        if (typeof GM_setClipboard !== 'undefined') {
          GM_setClipboard(tracklistData.trim());
          this.logger.log('Tracklist data copied to clipboard using GM_setClipboard.');
          alert('Tracklist data copied to clipboard!');
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(tracklistData.trim());
          this.logger.log('Tracklist data copied to clipboard using navigator.clipboard.');
          alert('Tracklist data copied to clipboard!');
        } else {
          // Fallback to old execCommand if others fail (less reliable)
          const textarea = document.createElement('textarea');
          textarea.value = tracklistData.trim();
          textarea.style.position = 'fixed'; // Prevent scrolling to bottom
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          this.logger.log('Tracklist data copied to clipboard using execCommand (fallback).');
          alert('Tracklist data copied to clipboard! (fallback method)');
        }
      } catch (err) {
        this.logger.error('Failed to copy tracklist data to clipboard:', err);
        alert('Failed to copy tracklist data. See console for details.');
      }
    } else {
      this.logger.warn('No tracklist data could be extracted.');
      alert('No tracklist data found or extracted on the page!');
    }
  }
}

// Initialize the script
const discogsCopier = new DiscogsTracklistCopier();

export default DiscogsTracklistCopier; 