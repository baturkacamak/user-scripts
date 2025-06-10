# Google AI Studio Enhancer

A powerful userscript that enhances Google AI Studio with response copying and auto-run functionality.

## 🎯 Features

### 📋 Response Management
- **Real-time Response Detection**: Automatically detects and collects AI responses as they appear
- **One-Click Copy**: Copy all collected responses to clipboard with proper formatting
- **Auto-copy Option**: Automatically copy new responses as they are generated
- **Response History**: Maintains a history of all collected responses during your session
- **Clear History**: Easy cleanup of collected responses

### 🔄 Auto Runner
- **Custom Prompt Input**: Define a prompt to be automatically entered before each run
- **Configurable Iterations**: Set any number of auto-runs (1-100)
- **Smart Button Detection**: Automatically finds and clicks Run/Send buttons
- **Completion Detection**: Waits for responses to complete before next iteration
- **Progress Tracking**: Real-time progress display
- **Emergency Stop**: Stop auto-run at any time

### ⚙️ Settings & Persistence
- **Persistent Settings**: All preferences saved automatically
- **Auto-copy Toggle**: Enable/disable automatic response copying
- **Notifications Control**: Show/hide operation notifications
- **Draggable Interface**: Moveable panel that remembers position

### 🎨 Professional UI
- **Clean Design**: Modern, unobtrusive interface
- **Collapsible Sections**: Organized into manageable sections
- **Visual Feedback**: Clear status indicators and progress display
- **Responsive Layout**: Works on different screen sizes

## 🔧 Installation

1. Install a userscript manager:
   - [Tampermonkey](https://tampermonkey.net/) (Recommended)
   - [Greasemonkey](https://www.greasespot.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. Install the script:
   - **Production**: [google-ai-studio-enhancer.user.js](google-ai-studio-enhancer.user.js)
   - **Development**: [google-ai-studio-enhancer.dev.user.js](dev/google-ai-studio-enhancer.dev.user.js)

3. Visit [Google AI Studio](https://aistudio.google.com/) and the enhancer will appear on the right side.

## 🚀 Usage

### Response Copying
1. Navigate to any chat/conversation in Google AI Studio
2. The script automatically detects and collects AI responses
3. Click "Copy All Responses" to copy formatted responses to clipboard
4. Enable "Auto-copy new responses" to automatically copy each new response

### Auto Runner
1. **Optional**: Enter a prompt in the text area that will be automatically entered before each run
2. Enter the number of iterations you want (1-100)
3. Click "Start Auto Run"
4. The script will automatically:
   - Enter the specified prompt (if provided)
   - Find and click the Run/Send button
   - Wait for the response to complete
   - Repeat for the specified number of iterations
5. Use "Stop" button to halt the process at any time

## 🛠️ Troubleshooting

### Google's Trusted Types Policy

Google AI Studio implements **Trusted Types** security policy that blocks direct HTML injection. This userscript has been specifically designed to work around this limitation.

**If you see "TrustedHTML assignment" errors:**

✅ **Current Solution (Implemented)**
- Uses pure DOM methods (`createElement`, `appendChild`)
- No `innerHTML` or HTML injection
- Should work on all Google domains

**Alternative Solutions if issues persist:**

### **Option A: CSS Injection Method**
```javascript
// Pure CSS-based UI (minimal JavaScript)
const style = document.createElement('style');
style.textContent = `
  .ai-enhancer-panel { /* CSS only styling */ }
`;
document.head.appendChild(style);
```

### **Option B: Shadow DOM Approach**
```javascript
// Isolate from Google's policies
const shadowHost = document.createElement('div');
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
// Build UI inside shadow DOM
```

### **Option C: External Iframe**
```javascript
// Load interface in separate context
const iframe = document.createElement('iframe');
iframe.src = 'data:text/html,<html>...</html>';
// Build UI inside iframe
```

### **Option D: Browser Extension**
Convert to a browser extension for maximum privileges:
- Chrome Extension (Manifest V3)
- Firefox Add-on
- Edge Extension

### **Option E: Bookmarklet Approach**
```javascript
// Simple bookmarklet for basic functionality
javascript:(function(){
  // Copy responses code here
})();
```

**Ready-to-use bookmarklet**: [dev/libs/bookmarklet.js](dev/libs/bookmarklet.js)

### **Option F: External Tools**
- Use browser automation tools (Puppeteer, Selenium)
- External clipboard managers
- Screen scraping tools

## 📋 Response Format

When copying responses, the format is clean and simple:
```
[First AI response content here]

---

[Second AI response content here]

---

[Third AI response content here]
```

## ⚡ Performance

- **Lightweight**: Minimal impact on page performance
- **Efficient DOM Monitoring**: Uses MutationObserver for real-time detection
- **Smart Caching**: Avoids duplicate response collection
- **Optimized Selectors**: Fast element detection

## 🔒 Security & Privacy

- **No Data Transmission**: All data stays local in your browser
- **No External Requests**: Script operates entirely offline
- **Trusted Types Compliant**: Uses secure DOM manipulation methods
- **Minimal Permissions**: Only requests clipboard access

## 🐛 Known Limitations

1. **Google Updates**: Google may change their UI, requiring selector updates
2. **Rate Limiting**: Google may implement rate limiting for auto-runs
3. **Browser Variations**: Some features may work differently across browsers
4. **Mobile Support**: Limited functionality on mobile devices

## 🤝 Contributing

1. Fork the repository
2. Make your changes in the `dev/` directory
3. Test thoroughly on Google AI Studio
4. Submit a pull request

## 📝 Development

```bash
# Build the userscript
npm run build:google-ai-studio-enhancer

# Watch for changes (development)
npm run build:google-ai-studio-enhancer -- --watch
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆙 Version History

- **v1.0.0**: Initial release with DOM-based approach for Trusted Types compliance
- Core features: Response copying, Auto-run, Settings persistence
- Trusted Types compatible implementation

---

**Made with ❤️ for the AI community** 