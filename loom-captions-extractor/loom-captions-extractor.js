// Import core components
import {
    Button,
    GMFunctions,
    HTMLUtils,
    Logger,
    StyleManager,
    DOMObserver
} from "../core";

// Initialize GM functions fallbacks
const GM = GMFunctions.initialize();

// Initialize logger
Logger.setPrefix("Loom Captions Extractor");
Logger.DEBUG = true;

// Store captions as they appear
class CaptionsManager {
    static captions = [];
    static timestamps = [];
    static currentTimestamp = '00:00';
    static totalDuration = '00:00';
    static lastCaptionText = null; // Track the last caption text for improved duplicate detection

    /**
     * Add a new caption with its timestamp
     * @param {string} caption - The caption text
     * @param {string} timestamp - Current video timestamp (MM:SS format)
     */
    static addCaption(caption, timestamp) {
        // Don't add empty captions
        if (!caption) {
            return;
        }

        // Enhanced duplicate detection:
        // 1. Check if this exact caption text already exists in our collection
        const duplicateIndex = this.captions.findIndex(existingCaption =>
            existingCaption === caption
        );

        // If exact text duplicate exists and the timestamp is close enough, don't add it
        if (duplicateIndex >= 0) {
            // Only log if this is a new timestamp for existing caption
            if (this.timestamps[duplicateIndex] !== timestamp) {
                Logger.log(`Skipping duplicate caption: "${caption.substring(0, 30)}..." at ${timestamp} (already exists at ${this.timestamps[duplicateIndex]})`);
            }
            return;
        }

        // If we're here, this is a new caption or a significant change
        Logger.log(`Adding caption at ${timestamp}: ${caption.substring(0, 30)}...`);
        this.captions.push(caption);
        this.timestamps.push(timestamp);
        this.lastCaptionText = caption;

        // Update UI if panel exists
        CaptionsPanel.updateCaptionCount();
    }

    /**
     * Get all captions as a single text string with timestamps
     */
    static getAllCaptionsText(format = 'timestamped') {
        if (this.captions.length === 0) {
            return "No captions have been captured yet.";
        }

        let result = "";

        switch (format) {
            case 'timestamped':
                // Format: [00:00] Caption text
                result = this.captions.map((caption, index) =>
                    `[${this.timestamps[index]}] ${caption}`
                ).join("\n\n");
                break;

            case 'srt':
                // Format: SRT subtitle format
                result = this.captions.map((caption, index) => {
                    const number = index + 1;
                    const startTime = this.formatSrtTimestamp(this.timestamps[index]);

                    // For end time, use next caption's timestamp or add 3 seconds to current if it's the last caption
                    const endTime = (index < this.timestamps.length - 1)
                        ? this.formatSrtTimestamp(this.timestamps[index + 1])
                        : this.formatSrtTimestamp(this.addSecondsToTimestamp(this.timestamps[index], 3));

                    return `${number}\n${startTime} --> ${endTime}\n${caption}`;
                }).join("\n\n");
                break;

            case 'plain':
                // Format: Just the caption text
                result = this.captions.join("\n\n");
                break;

            case 'csv':
                // Format: CSV with timestamp and caption
                result = "Timestamp,Caption\n" + this.captions.map((caption, index) =>
                    `"${this.timestamps[index]}","${caption.replace(/"/g, '""')}"`
                ).join("\n");
                break;
        }

        return result;
    }

    /**
     * Add seconds to a timestamp in MM:SS format
     * @param {string} timestamp - Timestamp in MM:SS format
     * @param {number} seconds - Seconds to add
     * @returns {string} - New timestamp in MM:SS format
     */
    static addSecondsToTimestamp(timestamp, seconds) {
        const parts = timestamp.split(':');
        if (parts.length !== 2) {
            return timestamp; // Return original if invalid format
        }

        let mins = parseInt(parts[0], 10);
        let secs = parseInt(parts[1], 10) + seconds;

        // Handle overflow
        if (secs >= 60) {
            mins += Math.floor(secs / 60);
            secs = secs % 60;
        }

        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Convert MM:SS format to SRT format (00:MM:SS,000)
     */
    static formatSrtTimestamp(timestamp) {
        // Parse MM:SS format
        const parts = timestamp.split(':');
        if (parts.length !== 2) {
            return '00:00:00,000';
        }

        const minutes = parts[0].padStart(2, '0');
        const seconds = parts[1].padStart(2, '0');

        return `00:${minutes}:${seconds},000`;
    }

    /**
     * Clear all stored captions
     */
    static clearCaptions() {
        this.captions = [];
        this.timestamps = [];
        this.lastCaptionText = null;
        Logger.log("All captions cleared");

        // Update UI
        CaptionsPanel.updateCaptionCount();
    }

    /**
     * Update current timestamp
     */
    static updateTimestamp(current, total) {
        this.currentTimestamp = current;
        this.totalDuration = total;
    }
}

// UI Panel for controls
class CaptionsPanel {
    static container = null;
    static captionCountElement = null;
    static statusElement = null;

    /**
     * Create the control panel
     */
    static createPanel() {
        if (this.container) return;

        // Create container for the panel
        this.container = document.createElement('div');
        this.container.id = 'loom-captions-extractor';
        this.container.className = 'loom-captions-panel';

        // Create panel content
        const title = document.createElement('div');
        title.className = 'loom-captions-title';
        title.textContent = 'Loom Captions Extractor';
        this.container.appendChild(title);

        // Create caption count display
        this.captionCountElement = document.createElement('div');
        this.captionCountElement.className = 'loom-captions-count';
        this.updateCaptionCount();
        this.container.appendChild(this.captionCountElement);

        // Add status element for feedback
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'loom-captions-status';
        this.container.appendChild(this.statusElement);

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'loom-captions-buttons';

        // Download button with dropdown for format selection
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'loom-dropdown-container';

        // Create the main download button
        new Button({
            text: 'Download Captions',
            className: 'loom-button loom-dropdown-button',
            container: downloadContainer,
            onClick: () => {
                // Toggle dropdown
                const dropdown = downloadContainer.querySelector('.loom-dropdown-content');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            }
        });

        // Create dropdown content
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'loom-dropdown-content';

        // Add format options
        const formats = [
            {id: 'timestamped', label: 'Timestamped Text (.txt)', ext: 'txt'},
            {id: 'srt', label: 'Subtitle Format (.srt)', ext: 'srt'},
            {id: 'plain', label: 'Plain Text (.txt)', ext: 'txt'},
            {id: 'csv', label: 'CSV Format (.csv)', ext: 'csv'}
        ];

        formats.forEach(format => {
            new Button({
                text: format.label,
                className: 'loom-button loom-dropdown-item',
                container: dropdownContent,
                onClick: () => {
                    this.downloadCaptions(format.id, format.ext);
                    dropdownContent.classList.remove('show');
                }
            });
        });

        downloadContainer.appendChild(dropdownContent);
        buttonsContainer.appendChild(downloadContainer);

        // Copy button
        new Button({
            text: 'Copy to Clipboard',
            className: 'loom-button',
            container: buttonsContainer,
            onClick: () => this.copyToClipboard()
        });

        // Preview button
        new Button({
            text: 'Preview Captions',
            className: 'loom-button loom-button-secondary',
            container: buttonsContainer,
            onClick: () => this.previewCaptions()
        });

        // Clear button
        new Button({
            text: 'Clear Captions',
            className: 'loom-button loom-button-danger',
            container: buttonsContainer,
            onClick: () => {
                if (confirm('Are you sure you want to clear all captured captions?')) {
                    CaptionsManager.clearCaptions();
                    this.updateStatus("Captions cleared");
                }
            }
        });

        this.container.appendChild(buttonsContainer);

        // Add to page
        document.body.appendChild(this.container);

        // Make panel draggable
        this.makeDraggable();

        // Add preview dialog elements (hidden initially)
        this.createPreviewDialog();

        Logger.log("Caption panel created");
    }

    /**
     * Create preview dialog (hidden initially)
     */
    static createPreviewDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'loom-captions-preview';
        dialog.className = 'loom-preview-dialog';

        // Create dialog header
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'loom-preview-header';

        const dialogTitle = document.createElement('div');
        dialogTitle.className = 'loom-preview-title';
        dialogTitle.textContent = 'Caption Preview';
        dialogHeader.appendChild(dialogTitle);

        const closeButton = document.createElement('button');
        closeButton.className = 'loom-preview-close';
        closeButton.textContent = '×';
        closeButton.onclick = () => {
            dialog.classList.remove('show');
        };
        dialogHeader.appendChild(closeButton);

        dialog.appendChild(dialogHeader);

        // Create content area
        const content = document.createElement('div');
        content.className = 'loom-preview-content';
        content.innerHTML = '<p>No captions captured yet.</p>';
        dialog.appendChild(content);

        // Add to page (hidden)
        document.body.appendChild(dialog);
    }

    /**
     * Preview captured captions
     */
    static previewCaptions() {
        const dialog = document.getElementById('loom-captions-preview');
        const content = dialog.querySelector('.loom-preview-content');

        const captionsText = CaptionsManager.getAllCaptionsText('timestamped');

        if (captionsText === "No captions have been captured yet.") {
            content.innerHTML = '<p>No captions have been captured yet.</p>';
        } else {
            // Format with line breaks
            content.innerHTML = `<pre>${HTMLUtils.escapeHTML(captionsText)}</pre>`;
        }

        dialog.classList.add('show');
    }

    /**
     * Update the caption count display
     */
    static updateCaptionCount() {
        if (this.captionCountElement) {
            const count = CaptionsManager.captions.length;
            this.captionCountElement.textContent = `${count} caption${count !== 1 ? 's' : ''} captured`;
        }
    }

    /**
     * Update status message
     */
    static updateStatus(message, duration = 3000) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.classList.add('active');

            // Clear after duration
            setTimeout(() => {
                this.statusElement.classList.remove('active');
            }, duration);
        }
    }

    /**
     * Make the panel draggable
     */
    static makeDraggable() {
        const title = this.container.querySelector('.loom-captions-title');
        if (!title) return;

        let isDragging = false;
        let dragStartX, dragStartY;
        let initialLeft, initialTop;

        title.style.cursor = 'grab';

        title.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = this.container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            title.style.cursor = 'grabbing';

            // Prevent text selection during drag
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;

            this.container.style.left = `${initialLeft + deltaX}px`;
            this.container.style.top = `${initialTop + deltaY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                title.style.cursor = 'grab';

                // Save position
                if (typeof GM_setValue === 'function') {
                    const rect = this.container.getBoundingClientRect();
                    GM_setValue('loom-extractor-position', {
                        left: rect.left,
                        top: rect.top
                    });
                }
            }
        });

        // Restore position if saved
        if (typeof GM_getValue === 'function') {
            const savedPos = GM_getValue('loom-extractor-position', null);
            if (savedPos) {
                this.container.style.left = `${savedPos.left}px`;
                this.container.style.top = `${savedPos.top}px`;
            }
        }
    }

    /**
     * Download captions in the specified format
     */
    static downloadCaptions(format = 'timestamped', extension = 'txt') {
        const content = CaptionsManager.getAllCaptionsText(format);

        if (content === "No captions have been captured yet.") {
            this.updateStatus("No captions captured yet", 3000);
            return;
        }

        // Create filename with video title if available and timestamp
        const videoTitle = this.getVideoTitle() || 'loom-captions';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${videoTitle}-${timestamp}.${extension}`;

        // Download using GM_download if available
        try {
            const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
            const url = URL.createObjectURL(blob);

            GM_download({
                url: url,
                name: filename,
                saveAs: true,
                onload: () => {
                    URL.revokeObjectURL(url);
                    this.updateStatus("Download complete!");
                },
                onerror: (error) => {
                    Logger.error(error, "GM_download");
                    this.updateStatus("Download failed, trying fallback...");
                    // Fallback
                    this.fallbackDownload(content, filename);
                }
            });
        } catch (error) {
            Logger.error(error, "Downloading captions");
            this.updateStatus("Download failed, trying fallback...");
            this.fallbackDownload(content, filename);
        }
    }

    /**
     * Fallback download method
     */
    static fallbackDownload(content, filename) {
        try {
            const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.style.display = 'none';

            document.body.appendChild(downloadLink);
            downloadLink.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
                this.updateStatus("Download complete!");
            }, 100);
        } catch (error) {
            Logger.error(error, "Fallback download");
            this.updateStatus("Download failed. Try copying to clipboard instead.");
        }
    }

    /**
     * Copy captions to clipboard
     */
    static copyToClipboard() {
        const content = CaptionsManager.getAllCaptionsText('timestamped');

        if (content === "No captions have been captured yet.") {
            this.updateStatus("No captions captured yet");
            return;
        }

        // Use GM_setClipboard if available
        try {
            GM_setClipboard(content);
            this.updateStatus("Captions copied to clipboard!");
        } catch (error) {
            Logger.error(error, "Copying to clipboard");
            // Fallback
            try {
                navigator.clipboard.writeText(content).then(() => {
                    this.updateStatus("Captions copied to clipboard!");
                }).catch(err => {
                    Logger.error(err, "Clipboard API");
                    this.updateStatus("Failed to copy captions to clipboard.");
                });
            } catch (clipboardError) {
                Logger.error(clipboardError, "Fallback clipboard");
                this.updateStatus("Failed to copy captions to clipboard.");
            }
        }
    }

    /**
     * Show a temporary notification
     */
    static showNotification(message, duration = 2000) {
        // Create notification element if not exists
        let notification = document.getElementById('loom-caption-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'loom-caption-notification';
            notification.className = 'loom-notification';
            document.body.appendChild(notification);
        }

        // Set message and show
        notification.textContent = message;
        notification.classList.add('show');

        // Hide after duration
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    /**
     * Get the current video title
     */
    static getVideoTitle() {
        // Try to find title in Loom's UI
        const titleElement = document.querySelector('h1.css-1n14mz9') ||
            document.querySelector('h1[data-testid="video-title"]') ||
            document.querySelector('h1.headline');

        if (titleElement) {
            return titleElement.textContent.trim().replace(/[\\/:*?"<>|]/g, '-');
        }

        return null;
    }
}

/**
 * Handle the monitoring of captions and timestamps
 */
class CaptionsMonitor {
    static captionsSelector = 'div[data-name="ClosedCaptions"] .css-i5c781.active, div[data-name="ClosedCaptions"] div[data-active="true"]';
    static timestampSelector = 'div.css-6kk1p4 span.css-1r8ulaz, span.time-display';
    static isCapturing = false;
    static observer = null;
    static lastCaptionText = null;
    static captionContainer = null;

    /**
     * Start monitoring captions
     */
    static startMonitoring() {
        if (this.isCapturing) return;

        Logger.log("Starting captions monitoring");
        this.isCapturing = true;

        // Create observer for captions
        this.observer = new MutationObserver(this.handleCaptionMutations.bind(this));
        this.setupObserver();

        // Initial check for captions
        this.checkCurrentCaptionAndTimestamp();

        // Also set up a polling interval as a fallback
        this.captionInterval = setInterval(() => {
            this.checkCurrentCaptionAndTimestamp();
        }, 1000); // Check every second

        // Update panel status
        if (CaptionsPanel.statusElement) {
            CaptionsPanel.updateStatus("Monitoring captions...", 3000);
        }
    }

    /**
     * Setup mutation observer
     */
    static setupObserver() {
        // First disconnect if already observing
        if (this.observer) {
            this.observer.disconnect();
        }

        // Find caption container
        this.captionContainer = document.querySelector('div[data-name="ClosedCaptions"]');

        // If not found, look for alternative containers
        if (!this.captionContainer) {
            this.captionContainer = document.querySelector('.captions-container');
        }

        if (this.captionContainer) {
            // Observe changes to the container
            this.observer.observe(this.captionContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributeFilter: ['class', 'data-active']
            });

            Logger.log("Caption observer set up");

            // Also observe the DOM for potential container changes
            const domObserver = new MutationObserver((mutations) => {
                // If our caption container is no longer in the DOM, try to re-establish
                if (!document.contains(this.captionContainer)) {
                    Logger.log("Caption container removed from DOM, re-establishing...");
                    this.setupObserver();
                }
            });

            // Observe the document body for caption container changes
            domObserver.observe(document.body, {childList: true, subtree: true});
        } else {
            Logger.log("Caption container not found, will try again");
            // Try again in a moment
            setTimeout(() => this.setupObserver(), 1000);
        }
    }

    /**
     * Handle mutations to the captions
     */
    static handleCaptionMutations(mutations) {
        // Check for relevant mutations
        for (const mutation of mutations) {
            if (mutation.type === 'childList' ||
                (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'data-active')) ||
                mutation.type === 'characterData') {
                // Check current caption and timestamp
                this.checkCurrentCaptionAndTimestamp();
                break;
            }
        }
    }

    /**
     * Check current caption and timestamp
     */
    static checkCurrentCaptionAndTimestamp() {
        // Try multiple selectors to find the active caption
        const captionElement = document.querySelector(this.captionsSelector);

        // Try multiple selectors to find timestamp
        const timestampElement = document.querySelector(this.timestampSelector);

        if (captionElement && timestampElement) {
            const captionText = captionElement.textContent.trim();
            const timestampText = timestampElement.textContent.trim();

            // Skip if the caption is empty
            if (!captionText) return;

            // Parse timestamp (format may vary: "2:03 / 10:42" or just "2:03")
            let current, total;

            if (timestampText.includes('/')) {
                // Format: "2:03 / 10:42"
                [current, total] = timestampText.split('/').map(t => t.trim());
            } else {
                // Format: Just the current time "2:03"
                current = timestampText.trim();
                total = ""; // Unknown total duration
            }

            // Ensure MM:SS format
            current = this.normalizeTimestamp(current);

            // Update caption manager
            CaptionsManager.updateTimestamp(current, total);

            // Only add if this is a new caption
            if (captionText !== this.lastCaptionText) {
                CaptionsManager.addCaption(captionText, current);
                this.lastCaptionText = captionText;
            }
        }
    }

    /**
     * Normalize timestamp to MM:SS format
     * @param {string} timestamp - Input timestamp
     * @returns {string} - Normalized timestamp in MM:SS format
     */
    static normalizeTimestamp(timestamp) {
        // Remove any non-digit, non-colon characters
        timestamp = timestamp.replace(/[^\d:]/g, '');

        // Split by colon
        const parts = timestamp.split(':');

        if (parts.length === 1) {
            // Just seconds - pad to MM:SS
            return `0:${parts[0].padStart(2, '0')}`;
        } else if (parts.length === 2) {
            // MM:SS format - ensure seconds are padded
            return `${parts[0]}:${parts[1].padStart(2, '0')}`;
        } else if (parts.length === 3) {
            // HH:MM:SS format - convert to MM:SS
            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10) + (hours * 60);
            return `${minutes}:${parts[2].padStart(2, '0')}`;
        }

        // Default fallback
        return timestamp;
    }

    /**
     * Stop monitoring captions
     */
    static stopMonitoring() {
        if (!this.isCapturing) return;

        Logger.log("Stopping captions monitoring");
        this.isCapturing = false;

        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
        }

        // Clear interval
        if (this.captionInterval) {
            clearInterval(this.captionInterval);
        }

        // Update panel status
        if (CaptionsPanel.statusElement) {
            CaptionsPanel.updateStatus("Caption monitoring stopped");
        }
    }
}

// Apply styles
StyleManager.addStyles(`
    /* Panel Styles */
    .loom-captions-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #333;
    }
    
    .loom-captions-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
        cursor: grab;
        user-select: none;
    }
    
    .loom-captions-count {
        margin-bottom: 4px;
        font-size: 14px;
        color: #666;
    }
    
    .loom-captions-status {
        margin-bottom: 12px;
        font-size: 13px;
        color: #4a8;
        min-height: 20px;
        transition: opacity 0.5s ease;
        opacity: 0;
    }
    
    .loom-captions-status.active {
        opacity: 1;
    }
    
    .loom-captions-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    /* Preview Dialog */
    .loom-preview-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
        width: 80%;
        max-width: 800px;
        max-height: 80vh;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        overflow: hidden;
    }
    
    .loom-preview-dialog.show {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
        visibility: visible;
    }
    
    .loom-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
    }
    
    .loom-preview-title {
        font-weight: bold;
        font-size: 18px;
    }
    
    .loom-preview-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 16px;
    }
    
    .loom-preview-close:hover {
        background-color: #f0f0f0;
        color: #333;
    }
    
    .loom-preview-content {
        padding: 16px;
        overflow-y: auto;
        max-height: calc(80vh - 60px);
    }
    
    .loom-preview-content pre {
        white-space: pre-wrap;
        font-family: monospace;
        margin: 0;
        padding: 0;
    }
    
    /* Button Styles */
    .loom-button {
        background-color: #625df5;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        text-align: center;
    }
    
    .loom-button:hover {
        background-color: #514dc6;
    }
    
    .loom-button-secondary {
        background-color: #6c757d;
    }
    
    .loom-button-secondary:hover {
        background-color: #5a6268;
    }
    
    .loom-button-danger {
        background-color: #f54242;
    }
    
    .loom-button-danger:hover {
        background-color: #d63030;
    }
    
    /* Dropdown Styles */
    .loom-dropdown-container {
        position: relative;
        display: inline-block;
        width: 100%;
    }
    
    .loom-dropdown-content {
        display: none;
        position: absolute;
        background-color: #f9f9f9;
        min-width: 100%;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 1;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .loom-dropdown-content.show {
        display: block;
    }
    
    .loom-dropdown-item {
        background-color: transparent;
        color: #333;
        text-align: left;
        border-radius: 0;
    }
    
    .loom-dropdown-item:hover {
        background-color: #f0f0f0;
    }
    
    /* Notification */
    .loom-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background-color: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        transition: transform 0.3s ease;
    }
    
    .loom-notification.show {
        transform: translateX(-50%) translateY(0);
    }
`, 'loom-captions-extractor-styles');

/**
 * Main script initialization
 */
class LoomCaptionsExtractor {
    static async init() {
        Logger.log("Initializing Loom Captions Extractor");

        // Check if we're on a Loom video page
        if (!this.isLoomVideoPage()) {
            Logger.log("Not a Loom video page, exiting");
            return;
        }

        // Wait for video player to be ready
        try {
            await this.waitForVideoPlayer();

            // Create control panel
            CaptionsPanel.createPanel();

            // Start monitoring captions
            CaptionsMonitor.startMonitoring();

            Logger.log("Loom Captions Extractor initialized");
        } catch (error) {
            Logger.error(error, "Initialization");
        }
    }

    /**
     * Check if the current page is a Loom video page
     */
    static isLoomVideoPage() {
        return window.location.hostname.includes('loom.com') &&
            (window.location.pathname.includes('/share/') ||
                window.location.pathname.match(/\/[a-f0-9]{32}$/i));
    }

    /**
     * Wait for video player to be ready
     */
    static waitForVideoPlayer() {
        return new Promise((resolve, reject) => {
            const maxAttempts = 30; // Try for about 15 seconds (30 * 500ms)
            let attempts = 0;

            const checkPlayer = () => {
                const videoPlayer = document.querySelector('video') ||
                    document.querySelector('div[data-name="VideoControls"]');

                if (videoPlayer) {
                    Logger.log("Video player found");
                    resolve(videoPlayer);
                    return;
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    reject(new Error("Video player not found after multiple attempts"));
                    return;
                }

                setTimeout(checkPlayer, 500);
            };

            checkPlayer();
        });
    }
}

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LoomCaptionsExtractor.init.bind(LoomCaptionsExtractor));
} else {
    LoomCaptionsExtractor.init();
}