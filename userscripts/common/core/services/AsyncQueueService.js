import ThrottleService from './ThrottleService.js';

/**
 * AsyncQueueService - A service for managing asynchronous task queues
 * 
 * Provides functionality to queue and execute asynchronous tasks with:
 * - Priority-based ordering
 * - Configurable concurrency limits
 * - Automatic retry logic
 * - Configurable delays between tasks
 * - Error handling
 */
export class AsyncQueueService {
    /**
     * Creates a new AsyncQueueService instance
     * 
     * @param {number} defaultDelayMs - Default delay in milliseconds after each task
     * @param {number} maxConcurrency - Maximum number of tasks to run concurrently
     * @param {number} maxRetries - Maximum number of retries for failed tasks
     * @param {ThrottleService} throttleService - Service for managing delays
     */
    constructor(
        defaultDelayMs = 0,
        maxConcurrency = 1,
        maxRetries = 0,
        throttleService = new ThrottleService()
    ) {
        this.queue = [];
        this.activeTasks = 0;
        this.isProcessing = false;
        this.defaultDelayMs = defaultDelayMs;
        this.maxConcurrency = maxConcurrency;
        this.maxRetries = maxRetries;
        this.throttleService = throttleService;
    }

    /**
     * Adds a task to the queue
     * 
     * @param {Function} task - The async function to execute
     * @param {Object} options - Task options
     * @param {number} options.priority - Task priority (higher = executed first)
     * @param {number} options.delayAfterMs - Delay after this specific task
     * @param {number} options.retries - Number of retries for this specific task
     */
    add(task, options = {}) {
        this.queue.push({
            task,
            retriesLeft: options.retries ?? this.maxRetries,
            delayAfterMs: options.delayAfterMs ?? this.defaultDelayMs,
            priority: options.priority ?? 0,
        });

        this.sortQueueByPriority();

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Sorts the queue by priority (higher priority tasks first)
     */
    sortQueueByPriority() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Processes the queue of tasks
     */
    async processQueue() {
        this.isProcessing = true;

        while (this.queue.length > 0) {
            if (this.activeTasks >= this.maxConcurrency) {
                await this.throttleService.delay(50);
                continue;
            }

            const nextTask = this.queue.shift();
            if (!nextTask) continue;

            this.activeTasks++;

            this.executeTask(nextTask)
                .then(() => {
                    this.activeTasks--;
                })
                .catch(() => {
                    this.activeTasks--;
                });
        }

        this.isProcessing = false;
    }

    /**
     * Executes a single task from the queue
     * 
     * @param {Object} queueTask - The task to execute
     */
    async executeTask(queueTask) {
        try {
            await queueTask.task();

            if (queueTask.delayAfterMs > 0) {
                await this.throttleService.delay(queueTask.delayAfterMs);
            }
        } catch (error) {
            console.error('AsyncQueueService: task failed.', error);

            if (queueTask.retriesLeft > 0) {
                console.warn(`Retrying... (${queueTask.retriesLeft} retries left)`);
                queueTask.retriesLeft--;
                this.queue.push(queueTask); // Re-add at the end
                this.sortQueueByPriority();
            }
        }
    }

    /**
     * Gets the current queue length
     * 
     * @returns {number} Number of tasks in the queue
     */
    getQueueLength() {
        return this.queue.length;
    }

    /**
     * Gets the number of currently active tasks
     * 
     * @returns {number} Number of active tasks
     */
    getActiveTasksCount() {
        return this.activeTasks;
    }

    /**
     * Checks if the queue is currently processing
     * 
     * @returns {boolean} True if processing, false otherwise
     */
    isQueueProcessing() {
        return this.isProcessing;
    }

    /**
     * Clears all pending tasks from the queue
     */
    clearQueue() {
        this.queue = [];
    }
}

export default AsyncQueueService; 