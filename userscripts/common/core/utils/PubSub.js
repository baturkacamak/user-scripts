/**
 * PubSub - A simple publish/subscribe pattern implementation
 * Enables components to communicate without direct references
 */
class PubSub {
    static #events = {};

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @return {string} Subscription ID
     */
    static subscribe(event, callback) {
        if (!this.#events[event]) {
            this.#events[event] = [];
        }

        const subscriptionId = `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.#events[event].push({callback, subscriptionId});
        return subscriptionId;
    }

    /**
     * Unsubscribe from an event
     * @param {string} subscriptionId - Subscription ID
     * @return {boolean} Success state
     */
    static unsubscribe(subscriptionId) {
        for (const event in this.#events) {
            const index = this.#events[event].findIndex(sub => sub.subscriptionId === subscriptionId);
            if (index !== -1) {
                this.#events[event].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Publish an event
     * @param {string} event - Event name
     * @param {any} data - Data to pass to subscribers
     */
    static publish(event, data) {
        if (!this.#events[event]) {
            return;
        }

        this.#events[event].forEach(sub => {
            sub.callback(data);
        });
    }

    /**
     * Clear all subscriptions
     * @param {string} [event] - Optional event name to clear only specific event
     */
    static clear(event) {
        if (event) {
            delete this.#events[event];
        } else {
            this.#events = {};
        }
    }
}

export default PubSub;