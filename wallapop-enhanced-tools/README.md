# Wallapop Enhanced Tools

[![version](https://img.shields.io/badge/version-1.5.0-blue.svg)](meta.json) <!-- Replace 1.5.0 with dynamic version if possible -->
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen)](https://github.com/baturkacamak/user-scripts/raw/master/wallapop-enhanced-tools/wallapop-enhanced-tools.user.js)

**Wallapop Enhanced Tools** is a comprehensive userscript designed to significantly improve your browsing experience on the Wallapop marketplace. It adds a suite of powerful features directly into the Wallapop interface.

> Enhance your Wallapop journey with features like expanded item descriptions, versatile data export options, intelligent item filtering, and multi-language support.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation Guide](#installation-guide)
- [How to Use](#how-to-use)
  - [Expanding Descriptions](#expanding-descriptions)
  - [Using the Tools Panel](#using-the-tools-panel)
    - [Filter Unwanted Items](#filter-unwanted-items-1)
    - [Export Item Data](#export-item-data)
    - [Language Settings](#language-settings)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [Acknowledgements](#acknowledgements)

## Overview

This userscript aims to provide a smoother and more efficient experience on Wallapop by adding functionalities that are commonly requested by users. Whether you're a casual browser or a power user, these tools will help you find what you need faster and manage information more effectively.

## Key Features

-   ✨ **Expand Descriptions**: View full, formatted item descriptions directly within listings. Also includes:
    -   ➕ **Bulk Expansion**: Options to "Expand All Visible" or "Expand All Descriptions" on a page.
    -   ⏱️ **Configurable Delay**: Set a delay between requests for bulk expansion to manage load.
-   📋 **Copy & Export Data**: Easily save or download item data in various formats:
    -   **Formats**: Plain Text, Markdown, HTML, JSON, CSV, TSV, XML.
    -   **Destinations**: Copy to clipboard or download as a file.
    -   **Customization**: 
        -   CSV/TSV: Option to include/exclude headers.
        -   HTML: Options to include images and CSS styles.
-   🚫 **Advanced Item Filtering**:
    -   📝 **Keyword Filtering**: Hide listings containing specific keywords to declutter your search results.
    -   🚚 **Delivery Method Filter**: Filter items by delivery option (e.g., Show Only Shipping, Show Only In-Person).
    -   🔒 **Reserved Listings Filter**: Option to hide listings marked as "reserved".
-   🌍 **Multi-language Support**: Enjoy the interface in 9 languages (English, Spanish, Catalan, Turkish, Portuguese, Italian, French, German, Dutch) with auto-detection and manual selection.
-   🎨 **Integrated UI Panel**: A convenient floating sidebar panel provides easy access to all tools and settings.

## Installation Guide

Getting started with Wallapop Enhanced Tools is simple:

1.  **Install a Userscript Manager**:
    If you don't have one already, install a userscript manager extension for your browser. Popular choices include:
    *   [Tampermonkey](https://tampermonkey.net/) (Recommended for Chrome, Firefox, Edge, Safari, Opera)
    *   [Greasemonkey](https://www.greasespot.net/) (Firefox)
    *   [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge, Opera)

2.  **Install the Script**:
    Click the link below to install the userscript:
    ➡️ **[Install Wallapop Enhanced Tools](https://github.com/baturkacamak/user-scripts/raw/master/wallapop-enhanced-tools/wallapop-enhanced-tools.user.js)**

3.  **Confirm Installation**:
    Your userscript manager will prompt you to confirm the installation. Review the script details and click "Install".

4.  **Start Enhancing!**:
    Navigate to any page on [Wallapop](https://es.wallapop.com/). The script will automatically activate, and you'll see its features integrated into the site.

That's it! You're ready to enjoy an enhanced Wallapop experience.

## How to Use

### Expanding Descriptions

-   As you browse Wallapop, you'll find an "**Expand Description**" button on item listings.
-   Click it to fetch and display the full, formatted description.
-   The button will change to "**Hide Description**". Click it again to collapse the view.

<!-- Placeholder for a GIF/screenshot showing description expansion -->
<!-- ![Expand Description Demo](link_to_your_gif_or_screenshot.png) -->

### Using the Tools Panel

A floating "**Wallapop Tools**" panel provides access to additional features. Click the panel title to expand or collapse it.

<!-- Placeholder for a GIF/screenshot showing the tools panel -->
<!-- ![Tools Panel Demo](link_to_your_tools_panel_gif_or_screenshot.png) -->

The panel has three main sections:

#### Filter Unwanted Items
-   **Purpose**: Hide listings that contain keywords you specify.
-   **How**:
    1.  Enter keywords (comma-separated) into the input field.
    2.  Items matching these keywords will be hidden in real-time as you browse.
    3.  Easily add or remove keywords as needed.

#### Export Item Data
-   **Purpose**: Save details of items (whose descriptions you've expanded) in various formats.
-   **How**:
    1.  Expand the description of items you want to export.
    2.  Open the "Export Descriptions" section in the Tools Panel.
    3.  Choose your desired format:
        *   **Text Formats**: Plain Text, Markdown, HTML
        *   **Data Formats**: JSON, CSV, TSV, XML
        *   **Spreadsheet Formats**: Excel-compatible CSV and XML
    4.  Configure export options (e.g., include headers, image inclusion).
    5.  Click to export or copy to clipboard.

#### Language Settings
-   **Purpose**: Choose your preferred language for the script's interface.
-   **How**:
    1.  The script attempts to auto-detect your browser's language.
    2.  If you prefer a different language, select from the dropdown menu.
    3.  Available languages: English, Spanish, Catalan, Turkish, Portuguese, Italian, French, German, Dutch.

## Contributing

Contributions are welcome! Whether it's bug reports, feature suggestions, or code contributions, please feel free to:

1.  [Open an issue](https://github.com/baturkacamak/user-scripts/issues) to discuss your ideas or report a problem.
2.  Fork the repository and submit a pull request with your changes.

Please ensure your code follows the existing style and includes tests if applicable.

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/)

## Acknowledgements

-   Thanks to the userscript community for tools and inspiration.
-   Mention any specific libraries or resources if applicable.

---

*This README was last updated on YYYY-MM-DD.* <!-- Consider adding a last updated date -->