// Service for fetching and parsing item descriptions

import {Logger} from "../../core";
import {SELECTORS} from "../utils/constants";

/**
 * Service for fetching and cleaning item descriptions from Wallapop
 */
export class DescriptionFetcher {
    /**
     * Fetch a description for a given URL
     * @param {string} url - The item URL to fetch
     * @returns {Promise<Object>} Promise resolving to success/error object with data
     */
    static async getDescription(url) {
        Logger.debug("Fetching description for URL:", url);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => this.handleResponse(response, resolve, url),
                onerror: (error) => this.handleError(error, resolve)
            });
        });
    }

    /**
     * Handle the response from GM_xmlhttpRequest
     * @param {Object} response - The response object
     * @param {Function} resolve - The promise resolve function
     * @param {string} originalUrl - The original request URL
     */
    static handleResponse(response, resolve, originalUrl) {
        try {
            // Parse the received response
            Logger.debug("Response received with status:", response.status);

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, "text/html");

            // Find the __NEXT_DATA__ script tag
            const nextDataScript = doc.querySelector('#__NEXT_DATA__');

            if (nextDataScript) {
                Logger.debug("Found __NEXT_DATA__ script tag");

                try {
                    // Parse the JSON content
                    const jsonData = JSON.parse(nextDataScript.textContent);
                    Logger.debug("JSON data parsed successfully");

                    // Extract the item description and title
                    let itemData = {};
                    if (jsonData.props?.pageProps?.item) {
                        const item = jsonData.props.pageProps.item;

                        // Get title
                        itemData.title = item.title?.original.trim() || "";

                        // Get description
                        if (item.description?.original) {
                            const description = item.description.original;
                            Logger.debug("Description extracted from JSON:", description);

                            // Get the part before tag indicators like "No leer"
                            const cleanDescription = this.cleanDescription(description);
                            itemData.description = cleanDescription;

                            // Get the URL
                            itemData.url = originalUrl;

                            // Get price if available
                            itemData.price = item.price ? `${item.price.cash.amount} ${item.price.cash.currency}` : "";

                            // Get images if available
                            if (item.images && Array.isArray(item.images)) {
                                itemData.images = item.images.map(img => img.urlTemplate);
                            }

                            resolve({success: true, data: itemData});
                        } else {
                            Logger.debug("Description not found in JSON structure:", jsonData);
                            throw new Error("Description not found in JSON data");
                        }
                    } else {
                        Logger.debug("Item data not found in JSON structure:", jsonData);
                        throw new Error("Item not found in JSON data");
                    }
                } catch (jsonError) {
                    Logger.error(jsonError, "Parsing JSON data");
                    throw jsonError;
                }
            } else {
                Logger.debug("__NEXT_DATA__ script tag not found, trying old method");

                // Fall back to old method (for compatibility)
                const descriptionElement = doc.querySelector(SELECTORS.ITEM_DESCRIPTION);
                if (descriptionElement) {
                    const description = descriptionElement.querySelector(".mt-2")?.innerHTML.trim();
                    if (description) {
                        Logger.debug("Description found using old method");

                        // In old method, we can't get the title easily, so we'll use the URL
                        const itemData = {
                            title: doc.querySelector('title')?.textContent || originalUrl,
                            description: description,
                            url: originalUrl,
                            price: doc.querySelector('[class*="ItemDetail__price"]')?.textContent || ""
                        };

                        // Try to find image URLs
                        const imageElements = doc.querySelectorAll('img[srcset]');
                        if (imageElements.length > 0) {
                            itemData.images = Array.from(imageElements)
                                .map(img => img.src)
                                .filter(src => src.includes('wallapop'));
                        }

                        resolve({success: true, data: itemData});
                        return;
                    }
                }

                throw new Error("Description not found with any method");
            }
        } catch (error) {
            Logger.error(error, "Parsing response");
            resolve({success: false, error: "Failed to parse description: " + error.message});
        }
    }

    /**
     * Clean tags and formatting from the description
     * @param {string} description - The raw description text
     * @returns {string} Cleaned description
     */
    static cleanDescription(description) {
        // Look for tag indicators with various formats
        const tagMarkers = [
            "\n\n\n\n\n\n\nNo leer\n",
            "\n\n\n\n\nNo leer\n",
            "\nNo leer\n",
            "\n\nNo leer\n",
            "No leer",
            "tags:",
            "etiquetas:",
            "keywords:",
            "\ntags:",
            "\nTags:",
            "\nTAGS:",
            "\nEtiquetas:",
            "\nKeywords:",
            " tags:",
            " Tags:",
            " TAGS:"
        ];

        // Check each marker and split at the first one found
        let cleanDesc = description;

        for (const marker of tagMarkers) {
            if (description.includes(marker)) {
                Logger.debug(`Found tag marker: "${marker}"`);
                cleanDesc = description.split(marker)[0].trim();
                break;
            }
        }

        // Use regex for more generic detection (case insensitive)
        if (cleanDesc === description) {
            // If no markers were found using the previous method
            const tagRegex = /\n+\s*(?:tags?|etiquetas?|keywords?)[\s:]+/i;
            const match = description.match(tagRegex);
            if (match) {
                Logger.debug(`Found tag section using regex at position: ${match.index}`);
                cleanDesc = description.substring(0, match.index).trim();
            }
        }

        // Clean excessive empty lines (reduce more than 3 newlines to 2)
        cleanDesc = cleanDesc.replace(/\n{3,}/g, "\n\n");

        return cleanDesc;
    }

    /**
     * Handle error from GM_xmlhttpRequest
     * @param {Object} error - The error object
     * @param {Function} resolve - The promise resolve function
     */
    static handleError(error, resolve) {
        Logger.error(error, "XML HTTP Request");
        resolve({success: false, error: "Network error occurred"});
    }
}