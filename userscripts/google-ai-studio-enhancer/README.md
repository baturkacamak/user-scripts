# Google AI Studio Enhancer

A powerful userscript that enhances your Google AI Studio experience with advanced response management and automation features.

## Features

### 📋 Response Management
- **Copy All Responses**: Copy all AI chatbot responses to clipboard with a single click
- **Response Counter**: Real-time counter showing the number of collected responses
- **Response History**: Automatic collection and storage of all AI responses during your session
- **Clear History**: Clear all collected responses when needed

### 🔄 Auto Runner
- **Automated Execution**: Automatically click the "Run" button for a specified number of iterations
- **Customizable Count**: Set any number of iterations (1-100) based on your needs
- **Smart Detection**: Waits for each response to complete before triggering the next run
- **Real-time Status**: Shows current progress and iteration count
- **Stop Control**: Ability to stop the auto-runner at any time

### 🎨 User Interface
- **Floating Panel**: Clean, draggable control panel positioned in the top-right corner
- **Modern Design**: Google Material Design inspired interface
- **Responsive Controls**: Visual feedback for all actions
- **Status Updates**: Real-time updates on operation status

## Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
2. Click on the userscript file: [google-ai-studio-enhancer.user.js](./google-ai-studio-enhancer.user.js)
3. Your userscript manager should prompt you to install it
4. Visit [Google AI Studio](https://aistudio.google.com/) and the enhancer will automatically load

## Usage

### Copy Responses Feature
1. Navigate to Google AI Studio and start a conversation with an AI model
2. The script will automatically detect and collect all AI responses
3. Click "Copy All Responses" to copy all collected responses to your clipboard
4. The responses are formatted with clear separators for easy reading

### Auto Runner Feature
1. Enter the desired number of iterations in the input field (default: 10)
2. Click "Start Auto Run" to begin automated execution
3. The script will:
   - Click the Run button
   - Wait for the AI response to complete
   - Repeat for the specified number of iterations
4. Monitor progress in the status indicator
5. Click "Stop" to halt execution at any time

## Technical Details

### Response Detection
The script uses multiple strategies to detect AI responses:
- DOM observers for real-time detection
- Multiple CSS selectors to catch various response formats
- Content filtering to avoid duplicates

### Auto-Click Logic
- Intelligent button detection using multiple selectors
- Response completion detection through loading indicators
- Timeout protection to prevent infinite waiting
- Graceful error handling

### Performance
- Minimal performance impact on Google AI Studio
- Efficient DOM observation and mutation handling
- Smart debouncing to prevent excessive processing

## Browser Compatibility
- Chrome/Chromium (Recommended)
- Firefox
- Safari
- Edge

## Permissions Required
- `GM_setClipboard`: Copy responses to clipboard
- `GM_addStyle`: Inject custom styles for the UI
- `GM_getValue`/`GM_setValue`: Store user preferences (future use)

## Troubleshooting

### Script Not Loading
- Ensure your userscript manager is enabled
- Check that the script is active for `https://aistudio.google.com/*`
- Refresh the page after installation

### Responses Not Detected
- Try refreshing the page and starting a new conversation
- Check browser console for any error messages
- Ensure you're using a supported conversation format

### Auto Runner Issues
- Verify the Run button is visible and enabled
- Check that you have a valid conversation context
- Ensure the iteration count is a positive number

## Contributing

This userscript is part of the [UserScripts collection](https://github.com/baturkacamak/userscripts). 

### Development
1. Make changes to the source file
2. Test thoroughly on Google AI Studio
3. Update version number in the userscript header
4. Submit pull request with detailed description

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Version History

### v1.0.0
- Initial release
- Copy all AI responses feature
- Auto-click Run button with custom iteration count
- Draggable UI panel
- Real-time status updates

## Support

For issues, feature requests, or questions:
1. Check the [Issues](https://github.com/baturkacamak/userscripts/issues) page
2. Create a new issue with detailed description
3. Include browser version and userscript manager details

---

**Note**: This userscript is designed to enhance productivity while using Google AI Studio. Please use responsibly and in accordance with Google's terms of service. 