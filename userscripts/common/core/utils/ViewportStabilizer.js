import Logger from './Logger.js';

/**
 * ViewportStabilizer - Handles scrolling elements into viewport and waiting for lazy-rendered content to stabilize
 * 
 * This utility is designed to work with modern web apps that use virtual scrolling or lazy rendering,
 * where content is only fully rendered when it comes into the viewport.
 * 
 * @example
 * const stabilizer = new ViewportStabilizer({
 *   scrollContainer: document.querySelector('.scrollable-container'), // or null for window
 *   stableDurationMs: 1000,
 *   checkIntervalMs: 150,
 *   maxWaitMs: 10000
 * });
 * 
 * const result = await stabilizer.scrollAndWaitForStable(element);
 * if (result.stable) {
 *   const text = element.textContent;
 * }
 */
class ViewportStabilizer {
    /**
     * @param {Object} options Configuration options
     * @param {HTMLElement|null} options.scrollContainer - Container to scroll within (null = window/document)
     * @param {number} options.stableDurationMs - How long content must be stable before considering it ready (default: 1000ms)
     * @param {number} options.checkIntervalMs - How often to check for changes (default: 150ms)
     * @param {number} options.maxWaitMs - Maximum time to wait for stability (default: 10000ms)
     * @param {Function} options.elementValidator - Optional function to validate element before processing (element) => boolean
     * @param {Function} options.preScrollHook - Optional function called before scrolling (element) => Promise|void
     * @param {Function} options.postScrollHook - Optional function called after scrolling (element) => Promise|void
     * @param {Function} options.stabilityChecker - Optional custom stability checker (element) => boolean
     * @param {Object} options.scrollOptions - Options for scrollIntoView (default: { behavior: 'auto', block: 'center' })
     * @param {number} options.scrollDelayMs - Delay after scrolling before checking stability (default: 200ms)
     * @param {Object} options.logger - Optional logger instance (default: Logger)
     * @param {boolean} options.enableDebugLogging - Enable debug logging (default: false)
     */
    constructor(options = {}) {
        this.scrollContainer = options.scrollContainer || null;
        this.stableDurationMs = options.stableDurationMs || 1000;
        this.checkIntervalMs = options.checkIntervalMs || 150;
        this.maxWaitMs = options.maxWaitMs || 10000;
        this.elementValidator = options.elementValidator || null;
        this.preScrollHook = options.preScrollHook || null;
        this.postScrollHook = options.postScrollHook || null;
        this.stabilityChecker = options.stabilityChecker || null;
        this.scrollOptions = options.scrollOptions || { behavior: 'auto', block: 'center' };
        this.scrollDelayMs = options.scrollDelayMs || 200;
        this.logger = options.logger || Logger;
        this.enableDebugLogging = options.enableDebugLogging || false;
    }

    /**
     * Simple delay utility
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Scroll element into view within the configured container
     * @private
     */
    scrollIntoView(element) {
        if (this.scrollContainer) {
            // Scroll within a specific container
            const containerRect = this.scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            // Check if element is already in view
            const isInView = (
                elementRect.top >= containerRect.top &&
                elementRect.bottom <= containerRect.bottom &&
                elementRect.left >= containerRect.left &&
                elementRect.right <= containerRect.right
            );

            if (!isInView) {
                // Calculate scroll position to center element in container
                const scrollTop = this.scrollContainer.scrollTop + 
                    (elementRect.top - containerRect.top) - 
                    (containerRect.height / 2) + 
                    (elementRect.height / 2);
                
                this.scrollContainer.scrollTo({
                    top: scrollTop,
                    behavior: this.scrollOptions.behavior || 'auto'
                });
            }
        } else {
            // Use standard scrollIntoView for window/document
            element.scrollIntoView(this.scrollOptions);
        }
    }

    /**
     * Wait for element height and text to stabilize
     * @private
     */
    async waitForStability(element) {
        if (!element || !element.isConnected) {
            return { stable: false, reason: 'Element not connected' };
        }

        // Use custom stability checker if provided
        if (this.stabilityChecker) {
            const isStable = await this.stabilityChecker(element);
            return { stable: isStable, reason: isStable ? 'Custom checker passed' : 'Custom checker failed' };
        }

        let lastHeight = element.offsetHeight || element.scrollHeight || 0;
        let lastTextLength = (element.textContent || '').length;
        let stableStartTime = Date.now();
        const startTime = Date.now();

        if (this.enableDebugLogging) {
            this.logger.debug(`Waiting for element height to stabilize (current: ${lastHeight}px, text: ${lastTextLength} chars)...`);
        }

        while (Date.now() - startTime < this.maxWaitMs) {
            if (!element.isConnected) {
                if (this.enableDebugLogging) {
                    this.logger.debug('Element disconnected while waiting for height stability');
                }
                return { stable: false, reason: 'Element disconnected' };
            }

            const currentHeight = element.offsetHeight || element.scrollHeight || 0;
            const currentTextLength = (element.textContent || '').length;

            const heightChanged = currentHeight !== lastHeight;
            const textChanged = currentTextLength !== lastTextLength;

            if (heightChanged || textChanged) {
                // Height or text changed, reset stability timer
                if (heightChanged) {
                    lastHeight = currentHeight;
                    if (this.enableDebugLogging) {
                        this.logger.debug(`Height changed to ${currentHeight}px, resetting stability timer`);
                    }
                }
                if (textChanged) {
                    lastTextLength = currentTextLength;
                    if (this.enableDebugLogging) {
                        this.logger.debug(`Text length changed to ${currentTextLength} chars, resetting stability timer`);
                    }
                }
                stableStartTime = Date.now();
            } else {
                // Both height and text are stable, check if it's been stable long enough
                const stableDuration = Date.now() - stableStartTime;
                if (stableDuration >= this.stableDurationMs) {
                    if (this.enableDebugLogging) {
                        this.logger.debug(`Height (${currentHeight}px) and text (${currentTextLength} chars) stable for ${stableDuration}ms`);
                    }
                    return { 
                        stable: true, 
                        reason: 'Height and text stable',
                        finalHeight: currentHeight,
                        finalTextLength: currentTextLength
                    };
                }
            }

            await this.delay(this.checkIntervalMs);
        }

        if (this.enableDebugLogging) {
            this.logger.debug(`Height stability timeout reached (final height: ${lastHeight}px, text: ${lastTextLength} chars)`);
        }
        // Return true even if timeout, to not block forever
        return { 
            stable: true, 
            reason: 'Timeout reached but continuing',
            finalHeight: lastHeight,
            finalTextLength: lastTextLength
        };
    }

    /**
     * Scroll element into view and wait for it to stabilize
     * 
     * @param {HTMLElement} element - Element to scroll and wait for
     * @param {Object} options - Optional overrides for this specific call
     * @returns {Promise<Object>} Result object with { stable: boolean, reason: string, ... }
     */
    async scrollAndWaitForStable(element, options = {}) {
        // Validate element
        if (!element || !(element instanceof HTMLElement)) {
            return { stable: false, reason: 'Invalid element' };
        }

        // Use custom validator if provided
        if (this.elementValidator) {
            const isValid = await this.elementValidator(element);
            if (!isValid) {
                return { stable: false, reason: 'Element failed validation' };
            }
        }

        // Pre-scroll hook
        if (this.preScrollHook) {
            await this.preScrollHook(element);
        }

        // Scroll into view
        this.scrollIntoView(element);

        // Wait for scroll to start
        const scrollDelay = options.scrollDelayMs !== undefined ? options.scrollDelayMs : this.scrollDelayMs;
        await this.delay(scrollDelay);

        // Post-scroll hook
        if (this.postScrollHook) {
            await this.postScrollHook(element);
        }

        // Re-validate element after scrolling (DOM may have changed)
        if (this.elementValidator) {
            const isValid = await this.elementValidator(element);
            if (!isValid) {
                return { stable: false, reason: 'Element failed validation after scroll' };
            }
        }

        // Wait for stability
        const stabilityResult = await this.waitForStability(element);
        return stabilityResult;
    }

    /**
     * Process multiple elements sequentially, scrolling each into view and waiting for stability
     * 
     * @param {Array<HTMLElement>} elements - Array of elements to process
     * @param {Function} processor - Function to process each element after it's stable (element, index, result) => any
     * @param {Object} options - Optional processing options
     * @param {Function} options.onProgress - Callback for progress updates (index, total, element) => void
     * @param {Function} options.onError - Callback for errors (error, element, index) => void
     * @returns {Promise<Array>} Array of results from processor function
     */
    async processElements(elements, processor, options = {}) {
        const results = [];
        const onProgress = options.onProgress || null;
        const onError = options.onError || null;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            try {
                if (onProgress) {
                    onProgress(i, elements.length, element);
                }

                const stabilityResult = await this.scrollAndWaitForStable(element);

                if (!stabilityResult.stable) {
                    if (this.enableDebugLogging) {
                        this.logger.warn(`Element ${i + 1}/${elements.length} did not stabilize: ${stabilityResult.reason}`);
                    }
                    // Continue anyway, let processor decide what to do
                }

                const result = await processor(element, i, stabilityResult);
                results.push(result);
            } catch (error) {
                if (onError) {
                    onError(error, element, i);
                } else {
                    this.logger.error(`Error processing element ${i + 1}/${elements.length}:`, error);
                }
                results.push(null);
            }
        }

        return results;
    }
}

export default ViewportStabilizer;
