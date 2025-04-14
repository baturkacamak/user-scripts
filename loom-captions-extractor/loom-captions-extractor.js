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

    /**
     * Add a new caption with its timestamp
     * @param {string} caption - The caption text
     * @param {string} timestamp - Current video timestamp (MM:SS format)
     */
    static addCaption(caption, timestamp) {
        // Don't add empty captions or duplicates
        if (!caption || (
            this.captions.length > 0 &&
            this.captions[this.captions.length - 1] === caption &&
            this.timestamps[this.timestamps.length - 1] === timestamp
        )) {
            return;
        }

        Logger.log(`Adding caption at ${timestamp}: ${caption}`);
        this.captions.push(caption);
        this.timestamps.push(timestamp);

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
                    const endTime = (index < this.timestamps.length - 1)
                        ? this.formatSrtTimestamp(this.timestamps[index + 1])
                        : this.formatSrtTimestamp(this.totalDuration);

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

        // Clear button
        new Button({
            text: 'Clear Captions',
            className: 'loom-button loom-button-danger',
            container: buttonsContainer,
            onClick: () => {
                if (confirm('Are you sure you want to clear all captured captions?')) {
                    CaptionsManager.clearCaptions();
                }
            }
        });

        this.container.appendChild(buttonsContainer);

        // Add to page
        document.body.appendChild(this.container);

        // Make panel draggable
        this.makeDraggable();

        Logger.log("Caption panel created");
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
            }
        });
    }

    /**
     * Download captions in the specified format
     */
    static downloadCaptions(format = 'timestamped', extension = 'txt') {
        const content = CaptionsManager.getAllCaptionsText(format);

        if (content === "No captions have been captured yet.") {
            alert("No captions have been captured yet.");
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
                onload: () => URL.revokeObjectURL(url),
                onerror: (error) => {
                    Logger.error(error, "GM_download");
                    // Fallback
                    this.fallbackDownload(content, filename);
                }
            });
        } catch (error) {
            Logger.error(error, "Downloading captions");
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
            }, 100);
        } catch (error) {
            Logger.error(error, "Fallback download");
            alert("Download failed. Please try copying to clipboard instead.");
        }
    }

    /**
     * Copy captions to clipboard
     */
    static copyToClipboard() {
        const content = CaptionsManager.getAllCaptionsText('timestamped');

        if (content === "No captions have been captured yet.") {
            alert("No captions have been captured yet.");
            return;
        }

        // Use GM_setClipboard if available
        try {
            GM_setClipboard(content);
            this.showNotification("Captions copied to clipboard!");
        } catch (error) {
            Logger.error(error, "Copying to clipboard");
            // Fallback
            try {
                navigator.clipboard.writeText(content).then(() => {
                    this.showNotification("Captions copied to clipboard!");
                }).catch(err => {
                    Logger.error(err, "Clipboard API");
                    alert("Failed to copy captions to clipboard.");
                });
            } catch (clipboardError) {
                Logger.error(clipboardError, "Fallback clipboard");
                alert("Failed to copy captions to clipboard.");
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
            document.querySelector('h1[data-testid="video-title"]');

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
    static captionsSelector = 'div[data-name="ClosedCaptions"] .css-i5c781.active';
    static timestampSelector = 'div.css-6kk1p4 span.css-1r8ulaz';
    static isCapturing = false;
    static observer = null;

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
        const captionContainer = document.querySelector('div[data-name="ClosedCaptions"]');

        if (captionContainer) {
            // Observe changes to the container
            this.observer.observe(captionContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributeFilter: ['class']
            });

            Logger.log("Caption observer set up");
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
                (mutation.type === 'attributes' && mutation.attributeName === 'class') ||
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
        const captionElement = document.querySelector(this.captionsSelector);
        const timestampElement = document.querySelector(this.timestampSelector);

        if (captionElement && timestampElement) {
            const captionText = captionElement.textContent.trim();
            const timestampText = timestampElement.textContent.trim();

            // Parse timestamp (format: "2:03 / 10:42")
            if (timestampText.includes('/')) {
                const [current, total] = timestampText.split('/').map(t => t.trim());

                // Update caption manager
                CaptionsManager.updateTimestamp(current, total);

                // Add caption
                CaptionsManager.addCaption(captionText, current);
            }
        }
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
        margin-bottom: 12px;
        font-size: 14px;
        color: #666;
    }
    
    .loom-captions-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
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