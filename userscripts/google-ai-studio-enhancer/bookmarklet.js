/**
 * Google AI Studio Enhancer - Bookmarklet Version
 * 
 * A simple bookmarklet alternative for copying AI responses from Google AI Studio.
 * This version is designed to work even with Google's Trusted Types policy.
 * 
 * USAGE:
 * 1. Create a bookmark with this JavaScript code as the URL
 * 2. Navigate to Google AI Studio
 * 3. Click the bookmark to extract and copy responses
 */

javascript:(function(){
    // Response collection
    const responses = [];
    
    // Common selectors for AI responses
    const responseSelectors = [
        // Google AI Studio specific (most accurate)
        '.chat-turn-container.model.render',
        '.chat-turn-container.model',
        // General selectors
        '[data-test-id="response-text"]',
        '.model-response',
        '.response-content',
        '[role="text"]',
        '.markdown-content',
        'div[data-message-author-role="model"]',
        'div[data-message-role="model"]',
        '[data-message-author-role="assistant"]',
        '[data-testid="conversation-turn-content"]',
        '.conversation-turn-content',
        '[data-testid="model-response"]'
    ];
    
    // Function to clean response text
    function cleanResponseText(text) {
        if (!text) return '';

        // Common UI elements to remove
        const uiElements = [
            'edit', 'more_vert', 'thumb_up', 'thumb_down', 'copy', 'share',
            'delete', 'refresh', 'restart', 'stop', 'play', 'pause',
            'expand_more', 'expand_less', 'close', 'menu', 'settings'
        ];

        // Split into lines and clean
        let lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line) return false;
                
                const lowerLine = line.toLowerCase();
                if (uiElements.includes(lowerLine)) return false;
                
                // Remove lines with only symbols/dashes
                if (/^[-=_\s]+$/.test(line)) return false;
                
                // Remove very short lines that are likely UI elements
                if (line.length <= 3 && !/\w/.test(line)) return false;
                
                return true;
            });

        // Remove UI patterns at start and end
        while (lines.length > 0 && /^(edit|thumb_up|thumb_down|more_vert)$/i.test(lines[0])) {
            lines.shift();
        }
        while (lines.length > 0 && /^(thumb_up|thumb_down|edit|more_vert)$/i.test(lines[lines.length - 1])) {
            lines.pop();
        }

        return lines.join('\n').trim();
    }

    // Function to extract clean text from element
    function extractResponseText(element) {
        // Try to find specific text content within the response container
        const textSelectors = [
            '.response-text', '.message-content', '.content', '.text-content', 'p'
        ];

        for (const selector of textSelectors) {
            const textElement = element.querySelector(selector);
            if (textElement) {
                const text = textElement.innerText?.trim();
                if (text && text.length > 10) {
                    return cleanResponseText(text);
                }
            }
        }

        // If no specific text element found, use the container but clean it
        const fullText = element.innerText?.trim();
        return cleanResponseText(fullText);
    }

    // Function to collect responses
    function collectResponses() {
        let found = 0;
        
        responseSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    const text = extractResponseText(element);
                    if (text && text.length > 10 && !responses.includes(text)) {
                        responses.push(text);
                        found++;
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });
        
        return found;
    }
    
    // Function to copy to clipboard (fallback methods)
    async function copyToClipboard(text) {
        try {
            // Method 1: Modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {
            // Fall through to method 2
        }
        
        try {
            // Method 2: Temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Main execution
    try {
        // Collect responses
        const foundCount = collectResponses();
        
        if (responses.length === 0) {
            alert('No AI responses found on this page.\n\nMake sure you\'re on a Google AI Studio conversation page with AI responses visible.');
            return;
        }
        
        // Format responses - clean output without headers
        const formattedContent = responses.join('\n\n---\n\n');
        
        // Copy to clipboard
        copyToClipboard(formattedContent).then(success => {
            if (success) {
                alert(`✅ Success!\n\nCopied ${responses.length} AI responses to clipboard.\n\nFound ${foundCount} new responses in this run.`);
            } else {
                // Show content in a dialog as fallback
                const result = confirm(`❌ Copy failed, but found ${responses.length} responses.\n\nClick OK to show content in a new window.`);
                if (result) {
                    const newWindow = window.open('', '_blank');
                    newWindow.document.write(`
                        <html>
                        <head><title>AI Studio Responses</title></head>
                        <body style="font-family: monospace; white-space: pre-wrap; padding: 20px;">
                        ${formattedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                        </body>
                        </html>
                    `);
                }
            }
        });
        
    } catch (error) {
        alert('❌ Error: ' + error.message + '\n\nPlease try again or use the full userscript.');
    }
})();

/**
 * INSTALLATION INSTRUCTIONS:
 * 
 * 1. Copy the entire JavaScript code above (starting with "javascript:(function(){")
 * 2. Create a new bookmark in your browser
 * 3. Set the bookmark name to "AI Studio Enhancer"
 * 4. Set the bookmark URL to the copied JavaScript code
 * 5. Save the bookmark
 * 
 * USAGE:
 * 1. Navigate to https://aistudio.google.com/
 * 2. Open a conversation with AI responses
 * 3. Click the "AI Studio Enhancer" bookmark
 * 4. Responses will be copied to clipboard automatically
 * 
 * FEATURES:
 * - Works with Google's Trusted Types policy
 * - No userscript manager required
 * - One-click response extraction
 * - Automatic clipboard copying
 * - Fallback methods if clipboard fails
 * - Works on any browser
 * 
 * LIMITATIONS:
 * - Manual activation required (click bookmark each time)
 * - No auto-run functionality
 * - No persistent settings
 * - No real-time monitoring
 */ 