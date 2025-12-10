# Meta AI Media Enhancer

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/baturkacamak/user-scripts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-brightgreen.svg)](https://tampermonkey.net/)

A powerful userscript that automates prompt sending to Meta AI Media with support for multiple prompts, configurable delays, and intelligent completion detection.

## 🎯 Features

### 🚀 **Prompt Automation**
- **📝 Multiple Prompts**: Enter multiple prompts separated by newlines or `---` (three dashes)
- **⏱️ Configurable Delays**: Set custom delay between prompts (in seconds)
- **🔄 Sequential Processing**: Automatically processes prompts one by one
- **⏹️ Stop Anytime**: Emergency stop button to halt automation at any time
- **📊 Real-time Progress**: Live status updates showing current prompt and progress

### 🎨 **Smart Prompt Handling**
- **🧹 Auto-clear**: Automatically clears prompt area before each new prompt (configurable)
- **⏳ Completion Detection**: Waits for image generation to complete before sending next prompt (configurable)
- **🛡️ Robust Error Handling**: Retry mechanisms and fallback detection methods
- **🎯 Smart Element Detection**: Automatically finds prompt area and send button using multiple selectors

### ⚙️ **Settings & Persistence**
- **💾 Persistent Settings**: All preferences automatically saved using GM storage
- **🔔 Notifications Control**: Show/hide operation notifications
- **📍 Panel Position**: Draggable interface that remembers position
- **🎨 Professional UI**: Clean, modern interface with focus states and hover effects

### 🎨 **Professional User Interface**
- **📱 Responsive Design**: Works on different screen sizes and layouts
- **🖱️ Draggable Panel**: Moveable floating panel with position memory
- **✨ Visual Feedback**: Clear status indicators, focus states, and interactive elements
- **🔤 High Contrast**: Dark text on white backgrounds for excellent readability
- **📱 Touch-Friendly**: Larger click targets and proper spacing

## 🔧 Installation

### **Prerequisites**
Install a userscript manager (choose one):
- **[Tampermonkey](https://tampermonkey.net/)** (Recommended - Chrome, Firefox, Edge, Safari, Opera)
- **[Greasemonkey](https://www.greasespot.net/)** (Firefox)
- **[Violentmonkey](https://violentmonkey.github.io/)** (Chrome, Firefox, Edge, Opera)

### **Install the Script**
Choose your preferred version:

- **🚀 Production**: [meta-ai-media-enhancer.user.js](meta-ai-media-enhancer.user.js)
- **🔧 Development**: [dev/meta-ai-media-enhancer.dev.user.js](dev/meta-ai-media-enhancer.dev.user.js)

### **Quick Installation**
1. Click the production link above
2. Your userscript manager will prompt for installation
3. Click "Install" to confirm
4. Visit [Meta AI Media](https://www.meta.ai/media)
5. The enhancer panel will appear on the right side

## 🚀 Usage Guide

### **Basic Usage**
1. **Navigate** to [Meta AI Media](https://www.meta.ai/media)
2. **Open Panel**: Click the 🎨 button on the right side to open the enhancer panel
3. **Enter Prompts**: Type your prompts in the textarea, separated by newlines or `---`
4. **Set Delay**: Configure the delay between prompts (in seconds)
5. **Start Automation**: Click "Start Automation" button
6. **Monitor Progress**: Watch the status display for real-time progress updates

### **Prompt Format**

You can separate prompts in two ways:

**Option 1: Newlines**
```
First prompt here
can be multiline

Second prompt here
also multiline
```

**Option 2: Three dashes (`---`)**
```
First prompt here
can be multiline
---
Second prompt here
also multiline
---
Third prompt
```

### **Settings Configuration**

- **Auto-clear prompt after sending**: Automatically clears the prompt area before entering the next prompt
- **Wait for image generation to complete**: Waits for the image to finish generating before sending the next prompt
- **Completion timeout (seconds)**: Maximum time to wait for image generation (default: 60 seconds)
- **Show notifications**: Control visibility of operation notifications

### **Advanced Usage**

#### **Multiple Prompts with Different Delays**
You can manually adjust the delay between prompts. For example:
- Set delay to `0` for immediate sending (not recommended)
- Set delay to `5` for 5 seconds between prompts
- Set delay to `10` for 10 seconds between prompts

#### **Long-Running Automations**
For large batches of prompts:
- Use longer delays (5-10 seconds) to avoid rate limiting
- Enable "Wait for image generation to complete" to ensure each image finishes
- Monitor the status display to track progress

## 🛠️ Troubleshooting

### **Common Issues & Solutions**

#### **Script Not Loading**
- Ensure your userscript manager is enabled
- Check that the script is active for `https://www.meta.ai/media*`
- Refresh the page after installation

#### **Prompt Area Not Found**
- Make sure you're on the Meta AI Media page (`https://www.meta.ai/media`)
- Try refreshing the page
- Check browser console for error messages

#### **Send Button Not Found or Disabled**
- Ensure the prompt area has text entered
- Wait a moment for the send button to become enabled
- Check that you're not already in the middle of generating an image

#### **Automation Stops Unexpectedly**
- Check browser console for error messages
- Verify your prompts are properly formatted
- Ensure the delay is not too short (recommended: 3+ seconds)
- Try increasing the completion timeout if images take longer to generate

#### **Images Not Generating**
- This script only automates prompt sending, not image generation
- Ensure you have proper access to Meta AI Media
- Check your internet connection
- Verify Meta AI Media is working correctly in your browser

## ⚡ Performance

- **Lightweight**: Minimal impact on page performance
- **Efficient DOM Monitoring**: Uses smart selectors for fast element detection
- **Smart Retry Logic**: Automatically retries failed operations
- **Optimized Delays**: Configurable delays prevent rate limiting
- **Real-time Updates**: Live status updates during automation

## 🔒 Security & Privacy

- **No Data Transmission**: All data stays local in your browser
- **No External Requests**: Script operates entirely offline
- **Minimal Permissions**: Only requests clipboard access (for future features)
- **Open Source**: Full source code available for inspection

## 🐛 Known Limitations

1. **Meta Updates**: Meta may change their UI, requiring selector updates
2. **Rate Limiting**: Meta may implement rate limiting for automated requests
3. **Browser Variations**: Some features may work differently across browsers
4. **Mobile Support**: Limited functionality on mobile devices
5. **Contenteditable Handling**: Complex contenteditable elements may require adjustments

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Make changes** in the `dev/` directory
3. **Test thoroughly** on Meta AI Media
4. **Submit a pull request** with detailed description

### **Development Setup**
```bash
# Build the userscript
npm run build:meta-ai-media-enhancer

# Watch for changes (development)
npm run build:meta-ai-media-enhancer -- --watch
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆙 Version History

### **v1.0.0** - Initial Release
- ✅ **Multiple prompt support** with newline and `---` separators
- ✅ **Configurable delays** between prompts
- ✅ **Auto-clear prompt** option
- ✅ **Completion detection** with configurable timeout
- ✅ **Smart element detection** for prompt area and send button
- ✅ **Persistent settings** with GM storage
- ✅ **Professional UI** with high contrast and accessibility
- ✅ **Comprehensive error handling** and retry mechanisms
- ✅ **Real-time progress tracking**

### **Key Technical Achievements**
- Handles contenteditable elements properly
- Implements smart retry logic for button detection
- Creates robust completion detection system
- Built professional, accessible user interface
- Uses existing common libraries to prevent code duplication

---

**Made with ❤️ for the AI community**

> This userscript enhances productivity while using Meta AI Media. Please use responsibly and in accordance with Meta's terms of service.

