# X (Twitter) Tweet Extractor

[![version](https://img.shields.io/badge/version-0.1.0-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen)](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/x-tweet-extractor/x-tweet-extractor.user.js)

**X (Twitter) Tweet Extractor** is a userscript that extracts all visible tweets from the X.com (Twitter) viewport with organized information including username, content, datetime, tweet ID, and reply relationships.

> Easily collect and export tweet data from your Twitter/X feed with a single click.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation Guide](#installation-guide)
- [How to Use](#how-to-use)
- [Output Format](#output-format)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

This userscript adds a floating "Record Tweets" button to X.com (Twitter) that allows you to extract all visible tweets from the current viewport. The extracted data includes:

- **Tweet ID**: Unique identifier for each tweet
- **Username**: Twitter handle (e.g., @username)
- **Display Name**: Full display name of the user
- **Content**: Full text content of the tweet
- **Datetime**: Both ISO format and human-readable format
- **Reply Information**: If the tweet is a reply, the parent tweet ID is included

The extracted data is displayed in an organized textarea that you can copy to your clipboard. Duplicate tweets are automatically prevented.

## Key Features

- ✨ **One-Click Extraction**: Extract all visible tweets with a single button click
- 📋 **Organized Output**: Clean, formatted output with all tweet information
- 🔄 **Duplicate Prevention**: Automatically prevents adding the same tweet twice
- 📱 **Viewport Detection**: Only extracts tweets currently visible in your viewport
- 🔗 **Reply Detection**: Identifies reply tweets and their parent tweet IDs
- 💾 **Copy to Clipboard**: Easy copy functionality for the extracted data
- 🎨 **Modern UI**: Clean, floating interface that doesn't interfere with browsing
- 🌙 **Dark Mode Support**: Automatically adapts to your system's color scheme

## Installation Guide

Getting started with X (Twitter) Tweet Extractor is simple:

1. **Install a Userscript Manager**:
   If you don't have one already, install a userscript manager extension for your browser. Popular choices include:
   * [Tampermonkey](https://tampermonkey.net/) (Recommended for Chrome, Firefox, Edge, Safari, Opera)
   * [Greasemonkey](https://www.greasespot.net/) (Firefox)
   * [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge, Opera)

2. **Install the Script**:
   Click the link below to install the userscript:
   ➡️ **[Install X (Twitter) Tweet Extractor](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/x-tweet-extractor/x-tweet-extractor.user.js)**

3. **Confirm Installation**:
   Your userscript manager will prompt you to confirm the installation. Review the script details and click "Install".

4. **Start Using!**:
   Navigate to [X.com](https://x.com) or [Twitter.com](https://twitter.com). You should see a floating "📝 Record Tweets" button in the bottom-right corner.

## How to Use

1. **Navigate to X.com or Twitter.com**: Open any page with tweets (home feed, profile, search results, etc.)

2. **Scroll to View Tweets**: Make sure the tweets you want to extract are visible in your viewport

3. **Click "Record Tweets"**: Click the floating button in the bottom-right corner

4. **View Extracted Data**: A panel will appear showing all extracted tweets in an organized format

5. **Copy or Clear**: 
   - Click "Copy" to copy all extracted data to your clipboard
   - Click "Clear" to clear the textarea and start fresh
   - Click "✕" to close the panel

6. **Extract More**: You can click "Record Tweets" multiple times to extract more tweets as you scroll. Duplicates will be automatically prevented.

## Output Format

The extracted tweets are formatted as follows:

```
Tweet ID: 2000950344671748327
Username: @ferg1923 (Fatih Ergin)
Content: Mahkemenin, "Bu aşılar Biontech'ten alınmadıysa nereden alındı" sorusuna Sağlık Bakanlığı cevap vermedi. Pfizer'in avukatları, Türkiye'ye tek aşı satmadıkları iddiasını yineleyip Biontech diye vurulan aşıların Afrika'ya gönderdikleri "Çöp aşılar" olabileceğini söyledi!
Datetime: 4:25 PM · Dec 16, 2025 (2025-12-16T15:25:12.000Z)
Reply to Tweet ID: 1234567890123456789
============================================================

Tweet ID: 1234567890123456789
Username: @example (Example User)
Content: This is a regular tweet.
Datetime: 2:30 PM · Dec 15, 2025 (2025-12-15T14:30:00.000Z)
============================================================
```

## Contributing

Contributions are welcome! Whether it's bug reports, feature suggestions, or code contributions, please feel free to:

1. [Open an issue](https://github.com/baturkacamak/userscripts/issues) to discuss your ideas or report a problem.
2. Fork the repository, make your changes, and submit a pull request.

Please ensure your code follows the existing style and includes tests if applicable.

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

## Author

**Batur Kacamak**
- GitHub: [@baturkacamak](https://github.com/baturkacamak)
- Website: [https://batur.info/](https://batur.info/)

---

*This README was last updated on 2025-12-16.*

