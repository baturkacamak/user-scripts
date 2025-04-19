import Logger from "./Logger";

class PubSub {
    static events = {};

    static subscribe(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);

        // Return unsubscribe function
        return () => {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        };
    }

    static publish(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => callback(data));
    }
}

export default PubSub;