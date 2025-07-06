import Logger from '../utils/Logger.js';
import { GM_setClipboard } from '../utils/GMFunctions.js';

class ClipboardService {
    constructor() {
        this.logger = Logger.newPrefix('ClipboardService');
    }

    /**
     * Copy to clipboard with fallbacks
     * @param {string} content - The content to copy
     * @returns {Promise<boolean>} - True if successful, false otherwise
     */
    async copyToClipboard(content) {
        if (!content) {
            this.logger.warn('No content to copy');
            return false;
        }

        this.logger.debug(`Attempting to copy ${content.length} characters to clipboard`);

        try {
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(content);
                this.logger.debug('✅ GM_setClipboard succeeded');
                return true;
            }
        } catch (error) {
            this.logger.warn('⚠ GM_setClipboard failed:', error);
        }

        try {
            await navigator.clipboard.writeText(content);
            this.logger.debug('✅ Clipboard API succeeded');
            return true;
        } catch (error) {
            this.logger.warn('⚠ Clipboard API failed:', error);
        }

        const textarea = document.createElement('textarea');
        textarea.value = content;
        Object.assign(textarea.style, {
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            opacity: '0',
            pointerEvents: 'none'
        });

        document.body.appendChild(textarea);

        try {
            textarea.select();
            textarea.setSelectionRange(0, content.length);
            const success = document.execCommand('copy');

            if (success) {
                document.body.removeChild(textarea);
                this.logger.debug('✅ execCommand succeeded');
                return true;
            }
        } catch (error) {
            this.logger.warn('⚠ execCommand failed:', error);
        }

        try {
            this.logger.debug('Trying designMode hack...');
            document.designMode = 'on';

            const selection = window.getSelection();
            selection.removeAllRanges();

            const range = document.createRange();
            range.selectNodeContents(textarea);
            selection.addRange(range);

            const success = document.execCommand('copy');

            document.designMode = 'off';
            selection.removeAllRanges();

            if (success) {
                document.body.removeChild(textarea);
                this.logger.debug('✅ designMode hack succeeded');
                return true;
            }
        } catch (error) {
            this.logger.warn('⚠ designMode hack failed:', error);
            document.designMode = 'off';
        }

        try {
            this.logger.warn('All automatic copy methods failed. Showing manual copy prompt...');
            window.prompt('All automatic copy methods failed. Please copy manually:', content);
            this.logger.debug('Manual copy prompt shown');
            return false;
        } catch (error) {
            this.logger.error('Even manual copy prompt failed:', error);
        } finally {
            if (textarea.parentNode) {
                document.body.removeChild(textarea);
            }
        }

        return false;
    }
}

export default new ClipboardService(); 