export class DataCache {
  constructor(logger) {
    this.logger = logger;
  }

  get(key) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        const { data, expires } = JSON.parse(value);
        if (expires === null || new Date(expires) > new Date()) {
          return data;
        }
        localStorage.removeItem(key);
        this.logger.log(`Cache expired and removed for key: ${key}`);
      }
    } catch (e) {
      this.logger.error(`Error getting cache for key ${key}:`, e);
      localStorage.removeItem(key); // Remove potentially corrupted data
    }
    return null;
  }

  set(key, value, expirationDays) {
    try {
      const expires = expirationDays ?
        new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) :
        null;
      localStorage.setItem(key, JSON.stringify({ data: value, expires }));
      this.logger.log(`Cache set for key: ${key}, expires: ${expires}`);
    } catch (e) {
      this.logger.error(`Error setting cache for key ${key}:`, e);
    }
  }
} 