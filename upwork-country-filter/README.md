# Upwork Country Filter

[![version](https://img.shields.io/badge/version-1.0.1-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](../../LICENSE) <!-- Assuming LICENSE is in the root -->
[![install](https://img.shields.io/badge/install%20built%20script-userscript-brightgreen)](https://github.com/baturkacamak/userscripts/raw/master/upwork-country-filter/upwork-country-filter.user.js) <!-- Update this URL if your repo structure is different -->

**Upwork Country Filter** is a userscript designed to enhance your job search on Upwork by automatically hiding job postings from countries you specify via a convenient settings panel.

> Streamline your Upwork job feed by filtering out listings from countries not relevant to your search, with settings that persist across sessions.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation Guide](#installation-guide)
- [How to Use](#how-to-use)
  - [Settings Panel](#settings-panel)
- [Customization (via Settings Panel)](#customization-via-settings-panel)
- [Building from Source](#building-from-source)
- [Logging](#logging)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

This userscript helps declutter your Upwork job feed by removing listings from countries you define. It monitors the job search and browse pages in real-time, ensuring that newly loaded jobs are also filtered according to your preferences. Your settings are saved, so the filter remembers your choices for future browsing sessions.

## Key Features

-   ⚙️ **User-Friendly Settings Panel**: A convenient sidebar panel allows you to easily manage filter settings.
-   🚫 **Customizable Country-Based Filtering**: Define and manage your own list of countries to filter.
-   💾 **Persistent Settings**: Your filter preferences (enabled/disabled state and banned countries list) are saved and automatically loaded each time.
-   🔄 **Real-time Monitoring**: Uses `DOMObserver` to detect new job listings as they are loaded on the page and applies filters immediately.
-   ✅ **Toggle Filter On/Off**: Easily enable or disable the entire filtering functionality.
-   ✨ **No Default Banned Countries**: Starts with a clean slate, giving you full control over which countries to filter.
-   🧩 **Modular Design**: Follows a modern JavaScript module structure, leveraging a shared core library for UI and utility functions.
-   📝 **Enhanced Logging**: Provides more detailed console logs for easier debugging and monitoring of script activity.

## Installation Guide

To use the Upwork Country Filter, you'll need a userscript manager browser extension.

1.  **Install a Userscript Manager**:
    Popular choices include:
    *   [Tampermonkey](https://tampermonkey.net/) (Recommended for Chrome, Firefox, Edge, Safari, Opera)
    *   [Greasemonkey](https://www.greasespot.net/) (Firefox)
    *   [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge, Opera)

2.  **Install the Script**:
    Once you have a userscript manager, click the link below to install the latest pre-built version of the script:
    ➡️ **[Install Upwork Country Filter](https://github.com/baturkacamak/userscripts/raw/master/upwork-country-filter/upwork-country-filter.user.js)** <!-- Ensure this URL points to the built .user.js file in your repo -->

3.  **Confirm Installation**:
    Your userscript manager will display a confirmation screen. Review the script details and permissions (it will ask for `GM_setValue` and `GM_getValue` to save your settings), then click "Install".

4.  **Start Filtering!**:
    Navigate to any Upwork job search or browse page (e.g., `https://www.upwork.com/ab/jobs/search/`, `https://www.upwork.com/nx/find-work/`). The script will automatically activate, and you should see the settings panel tab on the side of the page.

## How to Use

Once installed, the script provides a settings panel to control its behavior.

### Settings Panel

-   Look for a tab or button on the side of Upwork pages, typically labeled "Upwork Country Filter Settings" (or similar, depending on the `SidebarPanel` implementation from the core library).
-   Click it to open the settings panel.
-   Inside the panel, you can:
    *   **Enable/Disable Filtering**: Use the checkbox to turn the country filtering on or off.
    *   **Manage Banned Countries**: 
        *   View the current list of banned countries.
        *   Enter a country name in the input field and click "Add Country" to add it to the list.
        *   Click the "Remove" button next to any country in the list to remove it.
-   Your changes are saved automatically and will apply immediately to the current page and future sessions.

## Customization (via Settings Panel)

All customization of the filter (enabling/disabling and managing the list of banned countries) is done through the **Settings Panel** described above. The script no longer uses a hardcoded list of default banned countries; you start with an empty list and build it according to your needs.

If you need to reset settings or manually inspect them, they are stored using Greasemonkey's `GM_setValue`/`GM_getValue` under keys like `upworkFilterEnabled` and `upworkBannedCountries`.

## Building from Source

If you want to modify the script or build it from its source files:

1.  **Clone the Repository** (if you haven't already):
    ```bash
    git clone https://github.com/baturkacamak/userscripts.git
    cd userscripts
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Build the Script**:
    Run the specific build command for this script:
    ```bash
    npm run build:upwork-country-filter
    ```
    This will generate the `upwork-country-filter.user.js` file in the `upwork-country-filter` directory.

4.  **Install the Locally Built Script**:
    Follow your userscript manager's instructions for installing scripts from a local file.

## Logging

The script now utilizes an enhanced `Logger` from the core library. You can view more detailed logs in your browser's developer console (usually accessed by pressing F12). This can be helpful for troubleshooting or understanding the script's behavior. By default, it logs initialization status, settings changes, and can be configured for more verbose debugging if needed (by adjusting the logger settings in the code).

## Contributing

Contributions are welcome! Please feel free to:

1.  [Open an issue](https://github.com/baturkacamak/userscripts/issues) to report bugs or suggest features.
2.  Fork the repository, make your changes, and submit a pull request.

Please ensure your code follows the project's established style and that builds are successful.

## License

This project is licensed under the MIT License.
See the [LICENSE](../../LICENSE) file in the root directory for details.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/)

---
*This README was last updated on 2024-07-13.* <!-- Update with current date -->