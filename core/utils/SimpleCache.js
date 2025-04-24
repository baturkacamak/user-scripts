class SimpleCache {
    constructor(maxSize = 100) {
        this.cache = {};
        this.maxSize = maxSize;
        this.keys = [];
    }

    get(key) {
        return this.cache[key];
    }

    set(key, value) {
        if (!this.cache[key]) {
            // Manage cache size
            if (this.keys.length >= this.maxSize) {
                const oldestKey = this.keys.shift();
                delete this.cache[oldestKey];
            }
            this.keys.push(key);
        }
        this.cache[key] = value;
        return value;
    }

    has(key) {
        return key in this.cache;
    }

    clear() {
        this.cache = {};
        this.keys = [];
    }
}

export default SimpleCache;