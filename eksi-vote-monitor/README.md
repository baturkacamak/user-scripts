# Eksi Vote Notifier

Eksi Vote Notifier is a Chrome extension designed to notify users of new votes on a specified page on Eksi Sozluk, a
popular Turkish social media platform. It uses Chrome's APIs to check for vote updates periodically and provides
notifications to keep users informed about the engagement on their posts or topics of interest.

## Features

- **Periodic Checks:** Utilizes Chrome's alarm API to check for new votes every minute, ensuring timely updates.
- **Notification System:** Sends a desktop notification when a new vote is detected, offering immediate information
  about engagement changes.
- **Efficient and Reliable:** Uses timestamped URLs for fetching page content to avoid caching issues and ensures that
  the latest information is always retrieved.
- **Privacy-Focused:** Operates directly within the user's browser, ensuring that data processing for vote checking is
  done locally without the need for external servers.

## Installation

To install Eksi Vote Notifier, follow these steps:

1. Download the extension files from the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable Developer Mode by toggling the switch in the upper right corner.
4. Click on the "Load unpacked" button and select the directory containing the extension's files.
5. The extension should now appear in your list of installed extensions and is ready to use.

## Usage

Once installed, the extension automatically starts monitoring for new votes on the specified page on Eksi Sozluk. When a
new vote is detected, it will display a notification with the title of the post or topic that received the vote. Users
can click on the notification to be directed to the page in question.

## Configuration

Currently, the extension monitors a hardcoded page for demonstration purposes. Future versions will include options for
users to specify pages or posts they wish to monitor through the extension's options page.

## Contributing

Contributions to the Eksi Vote Notifier are welcome. Whether it's feature suggestions, bug reports, or code
contributions, please feel free to make your input known. To contribute code or documentation, please fork the
repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This extension is developed as a utility tool for Eksi Sozluk users and is not officially associated with Eksi Sozluk.
- Special thanks to the Chromium and Eksi Sozluk communities for their resources and support.

For more information or to report issues, please visit the GitHub repository issue tracker.

**Note:** This project is a work in progress, and future updates will include more features and customization options.
Stay tuned!