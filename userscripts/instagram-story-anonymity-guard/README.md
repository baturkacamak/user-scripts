# Instagram Story Anonymity Guard

[![version](https://img.shields.io/badge/version-1.1.0-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen.svg)](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/instagram-story-anonymity-guard/instagram-story-anonymity-guard.user.js)

This userscript blocks a specific network request to maintain anonymity while viewing Instagram stories.

> View Instagram stories more privately by preventing read receipts from being sent.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation Guide](#installation-guide)
- [How to Use](#how-to-use)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Overview

The Instagram Story Anonymity Guard userscript ensures users can view Instagram stories without triggering the "seen" status. It achieves this by intercepting and blocking the specific network request (`viewSeenAt`) that Instagram uses to mark stories as viewed by your account.

## Key Features

-   🕵️ **Anonymous Story Viewing**: Prevents your account from appearing in the viewers list of stories.
-   🚫 **Request Blocking**: Specifically targets and blocks the `viewSeenAt` request.
-   🚀 **Automatic Operation**: Works in the background as soon as it's installed and you're on Instagram.
-   🧘 **Peace of Mind**: Browse stories without worrying about immediate read receipts.

## Installation Guide

1.  **Install a Userscript Manager**:
    If you don't have one, install a userscript manager for your browser (e.g., [Tampermonkey](https://tampermonkey.net/), [Greasemonkey](https://www.greasespot.net/), [Violentmonkey](https://violentmonkey.github.io/)).

2.  **Install the Script**:
    Click the link below:
    ➡️ **[Install Instagram Story Anonymity Guard](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/instagram-story-anonymity-guard/instagram-story-anonymity-guard.user.js)**

3.  **Confirm Installation**:
    Your userscript manager will prompt for confirmation. Review and click "Install".

## How to Use

Once installed, the script runs automatically when you are on `www.instagram.com`. When you view stories, the script will intercept and block the specific request that marks them as seen by your account.

No further configuration is needed. You can verify its operation by checking the console logs for messages from `[InstagramStoryAnonymityGuard]` if you have your browser's developer tools open (though it's designed to work silently).

## Contributing

Contributions are welcome! Please [open an issue](https://github.com/baturkacamak/user-scripts/issues) or submit a pull request.

## License

This project is licensed under the MIT License.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/)
