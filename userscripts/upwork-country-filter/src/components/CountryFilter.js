import DOMObserver from '../../../common/core/ui/DOMObserver.js';
import Logger from '../../../common/core/utils/Logger.js';
import {getValue, setValue} from '../../../common/core/utils/GMFunctions.js';
import PubSub from '../../../common/core/utils/PubSub.js';

const logger = new Logger('UpworkCountryFilter');

const FILTER_ENABLED_KEY = 'upworkFilterEnabled';
const BANNED_COUNTRIES_KEY = 'upworkBannedCountries';

/**
 * Class for filtering Upwork job listings by country.
 */
export class UpworkCountryFilter {
    static observerInstance = null;
    static isFilterEnabled = true;
    static bannedCountriesList = [];

    /**
     * Initializes the filter by starting a DOMObserver and removing countries.
     */
    static async init() {
        await this.loadSettings();

        const mutationCallback = () => {
            if (this.isFilterEnabled) {
                this.removeCountryListings();
            }
        };

        this.observerInstance = new DOMObserver(mutationCallback);
        this.observerInstance.observe(document.documentElement, {childList: true, subtree: true});

        if (this.isFilterEnabled) {
            this.removeCountryListings(); // Initial scan
        }
        logger.log('Initialized with filter enabled:', this.isFilterEnabled, 'Banned countries:', this.bannedCountriesList);

        // Subscribe to settings changes from UI
        PubSub.subscribe('filterEnabledChanged', (isEnabled) => this.setFilterEnabled(isEnabled));
        PubSub.subscribe('bannedCountriesChanged', (countries) => this.setBannedCountries(countries));
    }

    static async loadSettings() {
        const storedEnabled = await getValue(FILTER_ENABLED_KEY, true);
        this.isFilterEnabled = storedEnabled;

        const storedCountries = await getValue(BANNED_COUNTRIES_KEY, []);
        // Ensure it's always an array, even if null/undefined is somehow stored
        this.bannedCountriesList = Array.isArray(storedCountries) ? storedCountries : [];
        logger.log('Settings loaded - Enabled:', this.isFilterEnabled, 'Countries:', this.bannedCountriesList);
    }

    static async saveSettings() {
        await setValue(FILTER_ENABLED_KEY, this.isFilterEnabled);
        await setValue(BANNED_COUNTRIES_KEY, this.bannedCountriesList);
        logger.log('Settings saved - Enabled:', this.isFilterEnabled, 'Countries:', this.bannedCountriesList);
    }

    static setFilterEnabled(isEnabled) {
        if (typeof isEnabled === 'boolean' && this.isFilterEnabled !== isEnabled) {
            this.isFilterEnabled = isEnabled;
            logger.log('Filter enabled state changed to:', this.isFilterEnabled);
            this.saveSettings();
            if (!this.isFilterEnabled) {
                logger.log('Filter disabled. Job listings will not be actively removed. Previously removed items will remain removed until page refresh.');
            } else {
                this.removeCountryListings(); // Re-apply filter if enabled
            }
            PubSub.publish('filterSettingsRefreshed', {
                isEnabled: this.isFilterEnabled,
                countries: this.bannedCountriesList
            });
        }
    }

    static setBannedCountries(countries) {
        if (Array.isArray(countries)) {
            this.bannedCountriesList = [...new Set(countries.map(c => c.trim()).filter(c => c))]; // Unique, trimmed, non-empty
            logger.log('Banned countries list updated to:', this.bannedCountriesList);
            this.saveSettings();
            if (this.isFilterEnabled) {
                this.removeCountryListings(); // Re-apply filter with new countries
            }
            PubSub.publish('filterSettingsRefreshed', {
                isEnabled: this.isFilterEnabled,
                countries: this.bannedCountriesList
            });
        }
    }

    static getSettings() {
        return {isEnabled: this.isFilterEnabled, countries: [...this.bannedCountriesList]};
    }

    /**
     * Stops the DOM observer.
     */
    static stop() {
        if (this.observerInstance) {
            this.observerInstance.disconnect();
            this.observerInstance = null;
            logger.log('DOM Observer stopped.');
        }
    }

    /**
     * Removes job listings for the countries in the 'COUNTRIES' list.
     */
    static removeCountryListings() {
        if (!this.isFilterEnabled) return;

        document.querySelectorAll('*[data-test="client-country"], .job-tile .client-location').forEach((el) => {
            const countryText = el.textContent?.trim();
            if (this.shouldRemoveCountry(countryText)) {
                this.removeListing(el);
            }
        });
    }

    /**
     * Checks if a country should be removed based on the 'COUNTRIES' list.
     * @param {string} country - The country name to check.
     * @returns {boolean} Whether the country should be removed.
     */
    static shouldRemoveCountry(country) {
        if (!this.isFilterEnabled || !country || country === '') {
            return false;
        }
        return this.bannedCountriesList.some((bannedCountry) =>
            country.toLowerCase().includes(bannedCountry.toLowerCase())
        );
    }

    /**
     * Removes a job listing element from the DOM.
     * @param {HTMLElement} listingElement - The job listing element to remove.
     */
    static removeListing(listingElement) {
        // Try to find the closest common ancestor that represents a job card
        const parentSelectors = [
            '.up-card-section', // General card section
            '.job-tile',        // Older job tile class
            '[data-test="job-tile-list-visitor"]' // A common selector for job tiles
            // Add more selectors here if Upwork changes its structure
        ];

        let parentElement = null;
        for (const selector of parentSelectors) {
            parentElement = listingElement.closest(selector);
            if (parentElement) break;
        }

        if (parentElement && parentElement.parentNode) {
            parentElement.parentNode.removeChild(parentElement);
            // logger.debug('Removed listing for country:', listingElement.textContent?.trim());
        } else {
            // logger.warn('Could not find parent to remove for listing:', listingElement);
        }
    }
} 