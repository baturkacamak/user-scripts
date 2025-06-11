import Debouncer from './Debouncer.js';
import HTMLUtils from './HTMLUtils.js';
import Logger from './Logger.js';
import PubSub from './PubSub.js';
import Notification from './Notification.js';
import UserInteractionDetector from './UserInteractionDetector.js';
import DOMObserver from './DOMObserver.js';

/**
 * AutoRunner - Generic automated task execution system
 * Provides configurable task iteration with delays, progress tracking, and stop conditions
 */
class AutoRunner {
    static EVENTS = {
        STARTED: 'autorunner:started',
        STOPPED: 'autorunner:stopped', 
        ITERATION: 'autorunner:iteration',
        COMPLETED: 'autorunner:completed',
        ERROR: 'autorunner:error'
    };

    /**
     * @param {Object} options Configuration options
     * @param {Function} options.taskFunction - Function to execute each iteration (can be async)
     * @param {number} options.maxIterations - Maximum number of iterations
     * @param {number} options.delay - Delay between iterations in milliseconds
     * @param {Function} options.shouldContinue - Optional function to check if should continue
     * @param {Function} options.onProgress - Optional progress callback
     * @param {Function} options.onError - Optional error handler
     * @param {Object} options.pubsub - Optional PubSub instance for events
     * @param {Object} options.logger - Optional logger instance
     * @param {string} options.name - Optional name for this runner (for logging)
     */
    constructor(options) {
        this.taskFunction = options.taskFunction;
        this.maxIterations = options.maxIterations || 1;
        this.delay = options.delay || 1000;
        this.shouldContinue = options.shouldContinue || (() => true);
        this.onProgress = options.onProgress || (() => {});
        this.onError = options.onError || ((error) => Logger.error('AutoRunner error:', error));
        this.name = options.name || 'AutoRunner';
        
        // Optional user interaction detection
        this.enableInteractionDetection = options.enableInteractionDetection || false;
        this.userInteraction = this.enableInteractionDetection ? 
            UserInteractionDetector.getInstance({
                namespace: `autorunner-${this.name}`,
                debug: Logger.DEBUG
            }) : null;
            
        // Optional notifications
        this.enableNotifications = options.enableNotifications || false;

        this.isRunning = false;
        this.currentIteration = 0;
        this.startTime = null;
        this.results = [];
    }

    /**
     * Start the auto runner
     */
    async start() {
        if (this.isRunning) {
            Logger.warn(`[${this.name}] AutoRunner is already running`);
            return false;
        }

        this.isRunning = true;
        this.currentIteration = 0;
        this.startTime = Date.now();
        this.results = [];

        Logger.info(`[${this.name}] Starting for ${this.maxIterations} iterations`);
        
        // Show notification if enabled
        if (this.enableNotifications) {
            Notification.info(`Starting ${this.name} for ${this.maxIterations} iterations`, {
                duration: 3000,
                position: 'top-right'
            });
        }
        
        this.publishEvent(AutoRunner.EVENTS.STARTED, {
            maxIterations: this.maxIterations,
            name: this.name,
            timestamp: this.startTime
        });

        await this.runIteration();
        return true;
    }

    /**
     * Stop the auto runner
     */
    stop(reason = 'user requested') {
        if (!this.isRunning) {
            Logger.warn(`[${this.name}] AutoRunner is not currently running`);
            return false;
        }

        this.isRunning = false;
        const duration = Date.now() - this.startTime;

        Logger.info(`[${this.name}] stopped: ${reason} (completed ${this.currentIteration}/${this.maxIterations} iterations in ${duration}ms)`);
        this.publishEvent(AutoRunner.EVENTS.STOPPED, {
            reason,
            completedIterations: this.currentIteration,
            totalIterations: this.maxIterations,
            duration,
            results: this.results,
            name: this.name,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Run a single iteration
     */
    async runIteration() {
        if (!this.isRunning) {
            return;
        }

        // Check if we've completed all iterations
        if (this.currentIteration >= this.maxIterations) {
            this.isRunning = false;
            const duration = Date.now() - this.startTime;

            Logger.info(`[${this.name}] completed all ${this.maxIterations} iterations in ${duration}ms`);
            
            // Show completion notification if enabled
            if (this.enableNotifications) {
                Notification.success(`${this.name} completed all ${this.maxIterations} iterations in ${(duration/1000).toFixed(1)}s`, {
                    duration: 5000,
                    position: 'top-right'
                });
            }
            
            this.publishEvent(AutoRunner.EVENTS.COMPLETED, {
                completedIterations: this.currentIteration,
                totalIterations: this.maxIterations,
                duration,
                results: this.results,
                name: this.name,
                timestamp: Date.now()
            });

            return;
        }

        // Check custom continue condition
        if (!this.shouldContinue(this.currentIteration, this.results)) {
            this.stop('custom condition failed');
            return;
        }

        this.currentIteration++;
        
        Logger.debug(`[${this.name}] Running iteration ${this.currentIteration}/${this.maxIterations}`);
        this.publishEvent(AutoRunner.EVENTS.ITERATION, {
            current: this.currentIteration,
            total: this.maxIterations,
            name: this.name,
            timestamp: Date.now()
        });

        try {
            // Execute the task function
            const result = await this.taskFunction(this.currentIteration, this.results);
            this.results.push(result);

            // Call progress callback
            this.onProgress(this.currentIteration, this.maxIterations, result, this.results);

            // Schedule next iteration if still running
            if (this.isRunning) {
                setTimeout(() => {
                    this.runIteration();
                }, this.delay);
            }

        } catch (error) {
            Logger.error(`[${this.name}] Error in iteration ${this.currentIteration}:`, error);
            this.publishEvent(AutoRunner.EVENTS.ERROR, {
                error: error.message,
                iteration: this.currentIteration,
                name: this.name,
                timestamp: Date.now()
            });

            this.onError(error, this.currentIteration);

            // Continue to next iteration after error (unless stopped)
            if (this.isRunning) {
                setTimeout(() => {
                    this.runIteration();
                }, this.delay);
            }
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            currentIteration: this.currentIteration,
            maxIterations: this.maxIterations,
            progress: this.maxIterations > 0 ? (this.currentIteration / this.maxIterations) * 100 : 0,
            duration: this.startTime ? Date.now() - this.startTime : 0,
            results: this.results,
            name: this.name
        };
    }

    /**
     * Update configuration while running
     */
    updateConfig(options) {
        if (options.delay !== undefined) this.delay = options.delay;
        if (options.maxIterations !== undefined) this.maxIterations = options.maxIterations;
        if (options.shouldContinue !== undefined) this.shouldContinue = options.shouldContinue;
        
        Logger.debug(`[${this.name}] Configuration updated:`, options);
    }

    /**
     * Wait for element using HTMLUtils before starting task
     */
    async waitForElement(selector, timeout = 5000) {
        try {
            return await HTMLUtils.waitForElement(selector, timeout);
        } catch (error) {
            Logger.warn(`[${this.name}] Element not found: ${selector}`, error);
            return null;
        }
    }

    /**
     * Create debounced function using core Debouncer
     */
    createDebouncedTask(func, delay) {
        return Debouncer.debounce(func, delay);
    }

    /**
     * Publish event using core PubSub
     */
    publishEvent(eventName, data) {
        PubSub.publish(eventName, data);
    }

    /**
     * Check if user is currently interacting and pause if needed
     */
    async checkUserInteraction() {
        if (!this.userInteraction) return true;
        
        const isInteracting = this.userInteraction.isInteracting();
        if (isInteracting) {
            Logger.debug(`[${this.name}] User interaction detected, pausing iteration`);
            
            if (this.enableNotifications) {
                Notification.warning('Auto-run paused - user interaction detected', {
                    duration: 2000,
                    position: 'top-right'
                });
            }
            
            // Wait for user to stop interacting
            while (this.userInteraction.isInteracting() && this.isRunning) {
                await this.delay(500);
            }
            
            // Additional pause after user stops interacting
            if (this.isRunning) {
                await this.delay(1000);
                Logger.debug(`[${this.name}] Resuming after user interaction ended`);
            }
        }
        
        return this.isRunning;
    }

    /**
     * Enhanced run iteration with interaction detection
     */
    async runIterationWithInteractionCheck() {
        // Check for user interaction before proceeding
        const shouldContinue = await this.checkUserInteraction();
        if (!shouldContinue) return;
        
        // Run normal iteration
        await this.runIteration();
    }

    /**
     * Static factory method for simple use cases
     */
    static async run(taskFunction, iterations, delay = 1000, options = {}) {
        const runner = new AutoRunner({
            taskFunction,
            maxIterations: iterations,
            delay,
            ...options
        });

        await runner.start();
        return runner;
    }
}

export default AutoRunner; 