# Discogs Tracklist Copier

[![version](https://img.shields.io/badge/version-1.1.0-blue.svg)](meta.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![install](https://img.shields.io/badge/install%20directly-userscript-brightgreen.svg)](https://github.com/baturkacamak/user-scripts/raw/master/userscripts/discogs-tracklist-copier/discogs-tracklist-copier.user.js)

This userscript adds a button to Discogs.com release and master pages to easily copy the tracklist data (Artist - Track Title) to your clipboard.

## Key Features

- Adds a "Copy Tracklist Data" button near the tracklist table on Discogs release/master pages.
- Extracts artist and track titles.
- Formats data as `ARTIST_NAME - TRACK_TITLE` for each track, separated by newlines.
- Copies the formatted list to the clipboard using modern browser APIs or Greasemonkey functions for reliability.

## How to Use

1.  Install the userscript (see install badge above).
2.  Navigate to a release or master page on `www.discogs.com` (e.g., `https://www.discogs.com/master/3713-Daft-Punk-Homework` or a specific release version).
3.  A "Copy Tracklist Data" button will appear above the tracklist.
4.  Click the button. The tracklist information will be copied to your clipboard.
5.  An alert will confirm if the copy was successful or if no data was found.

## Contributing

Contributions are welcome! Discogs page structure can vary, so if you find pages where the script fails, please [open an issue](https://github.com/baturkacamak/user-scripts/issues) with a link to the page and details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Batur Kacamak**
-   GitHub: [@baturkacamak](https://github.com/baturkacamak)
-   Website: [batur.info](https://batur.info/) 