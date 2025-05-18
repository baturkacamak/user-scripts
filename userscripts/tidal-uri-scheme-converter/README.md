# Tidal URI Scheme Converter

[![version](https://img.shields.io/badge/version-0.3.0-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen.svg)](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/tidal-uri-scheme-converter/tidal-uri-scheme-converter.user.js)

**Tidal URI Scheme Converter** is a userscript that automatically changes `tidal.com` links to the `tidal://` URI scheme. This allows links to music, albums, artists, etc., on Tidal to open directly in the Tidal desktop application instead of the web browser.

> Seamlessly open Tidal links in your desktop app for a better listening experience, especially when browsing on sites like WhatsApp Web.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation Guide](#installation-guide)
- [How to Use](#how-to-use)
- [Supported Pages](#supported-pages)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

This script monitors pages for links pointing to `tidal.com` and modifies them to use the `tidal://` protocol. This is particularly useful when sharing or receiving Tidal links on platforms where you'd prefer them to launch the native application.

## Key Features

-   🔗 **Automatic Conversion**: Converts `https://tidal.com/...` links to `tidal://...`.
-   🚀 **Direct App Launch**: Ensures Tidal links open in the desktop app.
-   🔄 **Dynamic Content Support**: Watches for new links added to the page (e.g., in chat applications) and converts them on the fly.
-   🛠️ **Customizable**: The script can be adapted if Tidal changes its URL structure or if new match patterns are needed.

## Installation Guide

1.  **Install a Userscript Manager**:
    If you don't have one, install a userscript manager for your browser (e.g., [Tampermonkey](https://tampermonkey.net/), [Greasemonkey](https://www.greasespot.net/), [Violentmonkey](https://violentmonkey.github.io/)).

2.  **Install the Script**:
    Click the link below:
    ➡️ **[Install Tidal URI Scheme Converter](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/tidal-uri-scheme-converter/tidal-uri-scheme-converter.user.js)**

3.  **Confirm Installation**:
    Your userscript manager will ask for confirmation. Review and click "Install".

## How to Use

Once installed, the script runs automatically on the pages defined in its `@match` rules (currently configured for WhatsApp Web). When a `tidal.com` link appears on these pages, it will be converted. Clicking the link should then prompt your system to open it with the Tidal application.

No further configuration is typically needed.

## Supported Pages

Currently, this script is configured to run on:
-   WhatsApp Web (`*://*.whatsapp.com/*`)

If you want it to run on other pages where Tidal links appear, you can edit the script's metadata (via Tampermonkey's dashboard) to add more `@match` patterns.

## Contributing

Contributions are welcome! Please [open an issue](https://github.com/baturkacamak/user-scripts/issues) to discuss ideas or report bugs, or fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/) 