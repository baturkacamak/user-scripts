# Idealista House Listing Analyzer

[![version](https://img.shields.io/badge/version-1.1.0-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen.svg)](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/idealista-house-listing-analyzer/idealista-house-listing-analyzer.user.js)

This userscript analyzes house listing statistics on Idealista (Spain, Portugal, Italy) and displays a calculated score directly next to listing links. This score helps quickly assess a property's popularity and recency.

## Key Features

-   **Statistical Analysis**: Fetches listing statistics (visits, shares, contacts, favorites).
-   **Score Calculation**: Calculates a weighted score based on the fetched statistics and the listing's age.
-   **Inline Display**: Shows the score and days since published (e.g., `(7.21) D:5`) next to each property link.
-   **Caching**: Caches scores locally to reduce redundant API calls and speed up display on subsequent views.
-   **Dynamic Content Support**: Works with dynamically loaded listings as you scroll or navigate.
-   **Multi-country**: Supports Idealista for Spain, Portugal, and Italy.

## How to Use

1.  **Install a Userscript Manager**: If you don't have one, install Tampermonkey, Greasemonkey, or Violentmonkey.
2.  **Install the Script**: Click the "Install Directly" badge above.
3.  **Browse Idealista**: Navigate to `idealista.com`, `idealista.pt`, or `idealista.it`. As you browse listings (search results, etc.), scores will appear next to property links.
    -   The score is a numerical value (higher is generally more interaction/interest).
    -   `D:X` indicates the number of days since the listing was published or last updated.
    -   Hover over the score for a tooltip with more details, including if the score is from the cache.

## Configuration

The script includes internal configuration for:
-   `expirationDays`: How long scores are cached (default: 1 day).
-   `delayBetweenRequests`: A small delay between fetching stats for different listings (default: 500ms).
-   `weights`: The weighting factors used in the score calculation for visits, shares, contacts, favorites, and recency.

These are currently hardcoded but could be exposed via userscript commands or settings in future versions.

## Contributing

Contributions, issues, and feature requests are welcome! Please refer to the [GitHub repository issues page](https://github.com/baturkacamak/user-scripts/issues).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/)
