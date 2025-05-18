# Loom Captions Extractor

This userscript captures and extracts closed captions from Loom videos, allowing you to download them as a text file or
copy them to the clipboard.

## Features

- **Automatic Caption Capture**: Captures closed captions in real-time as you watch a Loom video
- **Timestamp Recording**: Records the timestamp for each caption
- **Multiple Export Formats**:
    - Timestamped Text (.txt): Each caption with its timestamp
    - Subtitle Format (.srt): Standard subtitle format compatible with video players
    - Plain Text (.txt): Just the captions without timestamps
    - CSV Format (.csv): Comma-separated values for importing into spreadsheets
- **User Interface**:
    - Draggable panel for easy positioning
    - Caption count indicator
    - Download and copy to clipboard functionality
    - Clear captions button to start fresh

## Installation

To install the Loom Captions Extractor userscript, follow these steps:

1. Install a userscript manager like [Tampermonkey](https://tampermonkey.net/)
   or [Greasemonkey](https://www.greasespot.net/). These programs allow you to manage userscripts and run them on
   websites.

2. Click on the following link to install the
   script: [loom-captions-extractor.user.js](https://github.com/baturkacamak/userscripts/raw/master/loom-captions-extractor/loom-captions-extractor.user.js)

3. Your userscript manager should open and display information about the script. Click on the "Install" button to
   install the script.

4. After the script is installed, visit any Loom video page. The script will automatically add a panel to the page and
   start capturing captions.

## Usage

1. Navigate to any Loom video with closed captions enabled.
2. The script will automatically detect and start capturing captions as they appear.
3. Use the control panel in the top-right corner to:
    - See how many captions have been captured
    - Download captions in various formats
    - Copy all captions to clipboard
    - Clear captured captions if needed
4. The panel can be moved by dragging its title bar.

## Requirements

- Works with videos on loom.com
- Closed captions must be enabled on the video
- Best performance with latest browser versions (Chrome, Firefox, Edge)

## Troubleshooting

- **No captions being captured**: Make sure closed captions are enabled in the Loom video player
- **Panel not showing**: Try refreshing the page or checking your browser console for errors
- **Download not working**: If direct download fails, try using the "Copy to Clipboard" option instead

## License

This script is licensed under the MIT License. See [LICENSE](LICENSE) for more information.