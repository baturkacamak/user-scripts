# Gemini Enhancer

A userscript that adds a queue system for prompts on [Gemini](https://gemini.google.com/app) with support for text, image, and video generation.

## 🎯 Features

### 📋 **Queue System**
- **Multiple Prompts**: Enter multiple prompts (one per line) to process sequentially
- **Generation Types**: Support for text, image, and video generation
- **Automatic Processing**: Automatically types prompts and clicks buttons as needed
- **Progress Tracking**: Real-time status showing current prompt progress
- **Stop Anytime**: Stop the queue at any time with progress preservation

### 🎨 **Generation Types**
- **Text Generation**: Direct prompt submission (no button clicks needed)
- **Image Generation**: Automatically clicks image generation button before submitting
- **Video Generation**: Automatically clicks video generation button before submitting

### 🌍 **Multi-Language Support**
- Supports English, Turkish, and Spanish interfaces
- Automatically detects and uses appropriate selectors based on the UI language

### ⚙️ **Settings**
- **Configurable Delay**: Set delay between prompts (500ms - 10000ms)
- **Notifications**: Toggle operation notifications
- **Persistent Settings**: All preferences automatically saved

## 🔧 Installation

### **Prerequisites**
Install a userscript manager (choose one):
- **[Tampermonkey](https://tampermonkey.net/)** (Recommended - Chrome, Firefox, Edge, Safari, Opera)
- **[Greasemonkey](https://www.greasespot.net/)** (Firefox)
- **[Violentmonkey](https://violentmonkey.github.io/)** (Chrome, Firefox, Edge, Opera)

### **Install the Script**
1. Open [gemini-enhancer.user.js](gemini-enhancer.user.js) in your browser
2. Your userscript manager will prompt for installation
3. Click "Install" to confirm
4. Visit [Gemini](https://gemini.google.com/app)
5. The enhancer panel will appear on the right side

## 🚀 Usage Guide

### **Basic Usage**

1. **Open the Queue Tab**: The enhancer panel opens with the Queue tab active
2. **Select Generation Type**: Choose from Text, Image, or Video generation
3. **Enter Prompts**: Type your prompts, one per line:
   ```
   First prompt here
   Second prompt here
   Third prompt here
   ```
4. **Start Queue**: Click "Start Queue" button
5. **Automated Process**: The script will automatically:
   - For image/video: Click the appropriate generation button
   - Type each prompt into the textarea
   - Click the send button
   - Wait for completion
   - Move to the next prompt
6. **Stop Anytime**: Use "Stop Queue" button to halt the process

### **Generation Types**

#### **Text Generation**
- No button clicks needed before sending
- Simply types the prompt and sends

#### **Image Generation**
- Automatically clicks the "Create Image" button (or equivalent in your language)
- Then types the prompt and sends
- Supports: "Resim Oluştur" (Turkish), "Create image" (English), "Crear imagen" (Spanish)

#### **Video Generation**
- Automatically clicks the "Create Video" button (or equivalent in your language)
- Then types the prompt and sends
- Supports: "Video oluşturun" (Turkish), "Create video" (English), "Crear video" (Spanish)

### **Settings**

- **Delay between prompts**: Set how long to wait between prompts (default: 2000ms)
- **Show notifications**: Toggle visibility of operation notifications

## 🛠️ Troubleshooting

### **Script Not Loading**
- Ensure your userscript manager is enabled
- Check that the script is active for `https://gemini.google.com/app/*`
- Refresh the page after installation

### **Buttons Not Found**
- The script uses multiple selectors with fallbacks
- If buttons aren't found, check the browser console for error messages
- The script supports English, Turkish, and Spanish - if using another language, the selectors may need updating

### **Queue Not Starting**
- Ensure you have entered at least one prompt
- Check that prompts are separated by newlines
- Verify the generation type is correctly selected

### **Generation Not Completing**
- The script waits up to 5 minutes for each generation to complete
- If timeout occurs, check your internet connection
- Some generations may take longer than expected

## 📋 Technical Details

### **Selectors**
The script uses multiple selector strategies with fallbacks:
- **Textarea**: Uses `rich-textarea .ql-editor[contenteditable="true"]` and fallbacks
- **Send Button**: Detects by class `.send-button.submit` and aria-labels
- **Image Button**: Uses `jslog` attribute `intent_chip_image` and aria-labels
- **Video Button**: Uses `jslog` attribute `intent_chip_video` and aria-labels

### **Multi-Language Support**
The script includes selectors for:
- **English**: "Send message", "Create image", "Create video"
- **Turkish**: "Mesaj gönder", "Resim Oluştur", "Video oluşturun"
- **Spanish**: "Enviar mensaje", "Crear imagen", "Crear video"

## 🔒 Security & Privacy

- **No Data Transmission**: All data stays local in your browser
- **No External Requests**: Script operates entirely offline
- **Minimal Permissions**: Only requests storage access for settings
- **Open Source**: Full source code available for inspection

## 🐛 Known Limitations

1. **Google Updates**: Google may change their UI, requiring selector updates
2. **Rate Limiting**: Google may implement rate limiting for automated requests
3. **Browser Variations**: Some features may work differently across browsers
4. **Mobile Support**: Limited functionality on mobile devices
5. **Long Prompts**: Very long prompts may take time to type

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Make changes** in the `dev/` directory
3. **Test thoroughly** on Gemini
4. **Submit a pull request** with detailed description

### **Development Setup**
```bash
# Build the userscript
npm run build:gemini-enhancer

# Watch for changes (development)
npm run watch
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the AI community**

> This userscript enhances productivity while using Gemini. Please use responsibly and in accordance with Google's terms of service.

