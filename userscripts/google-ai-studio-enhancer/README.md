# Google AI Studio Enhancer

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/baturkacamak/user-scripts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-brightgreen.svg)](https://tampermonkey.net/)

A powerful userscript that enhances Google AI Studio with advanced response management and automation features, designed to work around Google's Trusted Types security policy.

## 🎯 Features

### 📋 **Advanced Response Management**
- **🔍 Real-time Response Detection**: Automatically detects and collects AI responses as they appear using DOM observers
- **📋 One-Click Copy**: Copy all collected responses to clipboard with clean, formatted output
- **🔄 Auto-copy Option**: Automatically copy new responses as they are generated (configurable)
- **📚 Response History**: Maintains a session history of all collected responses with deduplication
- **🧹 Smart Text Cleaning**: Removes UI elements (edit buttons, thumbs up/down, etc.) for clean text extraction
- **🗑️ Clear History**: Easy cleanup of collected responses

### 🤖 **Intelligent Auto Runner**
- **📝 Custom Prompt Input**: Define a prompt to be automatically entered before each run iteration
- **🔢 Configurable Iterations**: Set any number of auto-runs (1-100) with progress tracking
- **🎯 Smart Button Detection**: Automatically finds and clicks Run/Send buttons using multiple selectors
- **⏳ Completion Detection**: Uses DOM observer to detect when responses complete in real-time
- **🛡️ Robust Error Handling**: Retry mechanisms and fallback detection methods
- **⏹️ Emergency Stop**: Stop auto-run at any time with progress preservation
- **📊 Real-time Progress**: Live status updates showing current iteration and progress

### ⚙️ **Settings & Persistence**
- **💾 Persistent Settings**: All preferences automatically saved using GM storage
- **🔧 Auto-copy Toggle**: Enable/disable automatic response copying
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

- **🚀 Production**: [google-ai-studio-enhancer.user.js](google-ai-studio-enhancer.user.js)
- **🔧 Development**: [dev/google-ai-studio-enhancer.dev.user.js](dev/google-ai-studio-enhancer.dev.user.js)

### **Quick Installation**
1. Click the production link above
2. Your userscript manager will prompt for installation
3. Click "Install" to confirm
4. Visit [Google AI Studio](https://aistudio.google.com/)
5. The enhancer panel will appear on the right side

## 🚀 Usage Guide

### **Response Copying**
1. **Navigate** to any chat/conversation in Google AI Studio
2. **Automatic Detection**: The script automatically detects and collects AI responses
3. **One-Click Copy**: Click "Copy All Responses" to copy formatted responses to clipboard
4. **Auto-Copy**: Enable "Auto-copy new responses" for automatic copying of each new response

### **Auto Runner**
1. **Set Prompt** (Optional): Enter your prompt in the textarea that will be automatically entered before each run
2. **Set Iterations**: Enter the number of iterations you want (1-100)
3. **Start Auto Run**: Click "Start Auto Run" button
4. **Automated Process**: The script will automatically:
   - Enter the specified prompt (if provided)
   - Wait for the Run button to become enabled
   - Click the Run/Send button
   - Monitor response completion using DOM observers
   - Repeat for the specified number of iterations
5. **Stop Anytime**: Use "Stop" button to halt the process at any time

### **Settings Configuration**
- **Auto-copy new responses**: Toggle automatic copying of new responses
- **Show notifications**: Control visibility of operation notifications
- **Panel position**: Drag the panel to your preferred location (automatically saved)

## 🛠️ Troubleshooting

### **Google's Trusted Types Policy**

Google AI Studio implements **Trusted Types** security policy that blocks direct HTML injection. This userscript has been specifically designed to work around this limitation.

**✅ Current Solution (Implemented)**
- Uses pure DOM methods (`createElement`, `appendChild`)
- No `innerHTML` or HTML injection
- Should work on all Google domains

### **Alternative Solutions (If Issues Persist)**

#### **Option A: Bookmarklet Version**
For users experiencing persistent issues, use the bookmarklet alternative:
- **Location**: [dev/libs/bookmarklet.js](dev/libs/bookmarklet.js)
- **Installation**: Copy the JavaScript code and create a bookmark with it as the URL
- **Usage**: Click the bookmark on Google AI Studio pages to extract responses
- **Benefits**: No userscript manager required, bypasses all restrictions

#### **Option B: CSS Injection Method**
```javascript
// Pure CSS-based UI (minimal JavaScript)
const style = document.createElement('style');
style.textContent = `
  .ai-enhancer-panel { /* CSS only styling */ }
`;
document.head.appendChild(style);
```

#### **Option C: Shadow DOM Approach**
```javascript
// Isolate from Google's policies
const shadowHost = document.createElement('div');
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
// Build UI inside shadow DOM
```

#### **Option D: Browser Extension**
Consider converting to a browser extension for maximum privileges:
- Chrome Extension (Manifest V3)
- Firefox Add-on
- Edge Extension

### **Common Issues & Solutions**

#### **Script Not Loading**
- Ensure your userscript manager is enabled
- Check that the script is active for `https://aistudio.google.com/*`
- Refresh the page after installation

#### **Responses Not Detected**
- Try refreshing the page and starting a new conversation
- Check browser console for error messages
- Ensure you're using a supported conversation format

#### **Auto Runner Issues**
- Verify the Run button is visible and enabled
- Check that you have a valid conversation context
- Ensure the iteration count is a positive number (1-100)

#### **Text Readability Issues**
- The script forces high contrast text (`#333` on white background)
- If text is still hard to read, check for conflicting browser extensions

## 📋 Response Format

The copied responses use a clean, simple format:
```
[First AI response content here]

---

[Second AI response content here]

---

[Third AI response content here]
```

**Features of the cleaned output:**
- ✅ Pure AI response text
- ✅ No UI metadata (edit buttons, thumbs up/down, etc.)
- ✅ No response numbering headers
- ✅ Clean separators between multiple responses
- ✅ Proper line breaks and formatting

## ⚡ Performance

- **Lightweight**: Minimal impact on page performance
- **Efficient DOM Monitoring**: Uses MutationObserver for real-time detection
- **Smart Caching**: Avoids duplicate response collection
- **Optimized Selectors**: Fast element detection with Google AI Studio specific selectors
- **Real-time Updates**: DOM observer provides instant response to button state changes

## 🔒 Security & Privacy

- **No Data Transmission**: All data stays local in your browser
- **No External Requests**: Script operates entirely offline
- **Trusted Types Compliant**: Uses secure DOM manipulation methods
- **Minimal Permissions**: Only requests clipboard access
- **Open Source**: Full source code available for inspection

## 🐛 Known Limitations

1. **Google Updates**: Google may change their UI, requiring selector updates
2. **Rate Limiting**: Google may implement rate limiting for auto-runs
3. **Browser Variations**: Some features may work differently across browsers
4. **Mobile Support**: Limited functionality on mobile devices
5. **Large Responses**: Very long responses may take time to process

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Make changes** in the `dev/` directory
3. **Test thoroughly** on Google AI Studio
4. **Submit a pull request** with detailed description

### **Development Setup**
```bash
# Build the userscript
npm run build:google-ai-studio-enhancer

# Watch for changes (development)
npm run build:google-ai-studio-enhancer -- --watch
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆙 Version History

### **v1.0.0** - Initial Release
- ✅ **DOM-based approach** for Trusted Types compliance
- ✅ **Real-time response detection** using DOM observers
- ✅ **Intelligent auto-runner** with retry mechanisms
- ✅ **Smart text cleaning** removes UI elements
- ✅ **Custom prompt input** for automated runs
- ✅ **Persistent settings** with GM storage
- ✅ **Professional UI** with high contrast and accessibility
- ✅ **Comprehensive error handling** and fallback methods
- ✅ **Bookmarklet alternative** for maximum compatibility

### **Key Technical Achievements**
- Bypassed Google's Trusted Types policy using pure DOM methods
- Implemented real-time button state detection with DOM observers
- Created robust retry mechanisms for UI state changes
- Developed intelligent text cleaning algorithms
- Built professional, accessible user interface

---

**Made with ❤️ for the AI community**

> This userscript enhances productivity while using Google AI Studio. Please use responsibly and in accordance with Google's terms of service. 