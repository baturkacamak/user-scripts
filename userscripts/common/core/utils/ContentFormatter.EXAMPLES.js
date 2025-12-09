/**
 * ContentFormatter Usage Examples
 * 
 * These examples show how to use ContentFormatter with ViewportStabilizer
 * to collect and format structured content from various platforms.
 */

import { ViewportStabilizer, ContentFormatter } from '../../common/core';

// ============================================================================
// Example 1: Instagram Comments
// ============================================================================

async function copyInstagramComments() {
    // Extract comment data from DOM
    const extractComment = (element) => {
        const authorLink = element.querySelector('a[href*="/"]');
        const timeEl = element.querySelector('time');
        
        return {
            username: authorLink?.textContent?.trim() || 'Unknown',
            text: element.querySelector('span[dir="auto"]')?.textContent?.trim() || '',
            time: timeEl?.textContent?.trim() || timeEl?.getAttribute('datetime') || '',
            likes: element.querySelector('button[aria-label*="like"]')?.textContent?.trim() || '0',
            replies: Array.from(element.querySelectorAll('ul[role="menu"] > li')).map(replyEl => {
                const replyAuthor = replyEl.querySelector('a[href*="/"]');
                return {
                    username: replyAuthor?.textContent?.trim() || 'Unknown',
                    text: replyEl.querySelector('span[dir="auto"]')?.textContent?.trim() || '',
                    time: replyEl.querySelector('time')?.textContent?.trim() || '',
                    repliedTo: element.querySelector('a[href*="/"]')?.textContent?.trim() || null
                };
            })
        };
    };

    // Find comments container (scrollable div)
    const commentsContainer = document.querySelector('div[role="dialog"] [style*="overflow"]');
    
    // Setup ViewportStabilizer
    const stabilizer = new ViewportStabilizer({
        scrollContainer: commentsContainer,
        stableDurationMs: 800,
        checkIntervalMs: 100,
        enableDebugLogging: true
    });

    // Setup ContentFormatter with Instagram template
    const formatter = ContentFormatter.createFromTemplate('INSTAGRAM_COMMENT', {
        itemExtractor: extractComment,
        itemValidator: (item) => item.text && item.text.length > 0
    });

    // Collect all comment elements
    const commentElements = Array.from(document.querySelectorAll('ul[role="menu"] > li'));

    // Process with stabilizer (scrolls and waits for each to stabilize)
    const commentData = await stabilizer.processElements(
        commentElements,
        async (element, index, stabilityResult) => {
            return extractComment(element);
        },
        {
            onProgress: (index, total) => {
                console.log(`Processing comment ${index + 1}/${total}...`);
            }
        }
    );

    // Format and copy
    const success = await formatter.formatAndCopy(commentData, {
        includeReplies: true
    });

    if (success) {
        console.log(`✅ Copied ${commentData.length} comments to clipboard!`);
    }
}

// ============================================================================
// Example 2: Twitter/X Posts
// ============================================================================

async function copyTwitterPosts() {
    const extractTweet = (element) => {
        const authorLink = element.querySelector('a[href^="/"]');
        const handleMatch = authorLink?.getAttribute('href')?.match(/^\/(\w+)/);
        
        return {
            username: authorLink?.textContent?.trim() || 'Unknown',
            handle: handleMatch ? handleMatch[1] : '',
            text: element.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '',
            time: element.querySelector('time')?.textContent?.trim() || '',
            retweets: element.querySelector('[data-testid="retweet"]')?.textContent?.trim() || '0',
            likes: element.querySelector('[data-testid="like"]')?.textContent?.trim() || '0',
            replies: Array.from(element.querySelectorAll('[data-testid="reply"]')).map(replyEl => {
                const replyAuthor = replyEl.querySelector('a[href^="/"]');
                return {
                    username: replyAuthor?.textContent?.trim() || 'Unknown',
                    handle: replyAuthor?.getAttribute('href')?.replace('/', '') || '',
                    text: replyEl.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '',
                    time: replyEl.querySelector('time')?.textContent?.trim() || ''
                };
            })
        };
    };

    const stabilizer = new ViewportStabilizer({
        stableDurationMs: 1000,
        enableDebugLogging: true
    });

    const formatter = ContentFormatter.createFromTemplate('TWITTER_POST', {
        itemExtractor: extractTweet,
        itemValidator: (item) => item.text && item.text.length > 0
    });

    const tweetElements = Array.from(document.querySelectorAll('[data-testid="tweet"]'));

    const tweetData = await stabilizer.processElements(
        tweetElements,
        async (element) => extractTweet(element)
    );

    await formatter.formatAndCopy(tweetData, { includeReplies: true });
}

// ============================================================================
// Example 3: Reddit Comments
// ============================================================================

async function copyRedditComments() {
    const extractRedditComment = (element) => {
        const authorEl = element.querySelector('a[href^="/user/"]');
        const scoreEl = element.querySelector('[id*="vote-arrows"]');
        
        return {
            username: authorEl?.textContent?.trim() || 'Unknown',
            text: element.querySelector('[data-test-id="comment"]')?.textContent?.trim() || '',
            time: element.querySelector('time')?.textContent?.trim() || '',
            score: scoreEl?.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0',
            replies: Array.from(element.querySelectorAll('.comment')).map(replyEl => ({
                username: replyEl.querySelector('a[href^="/user/"]')?.textContent?.trim() || 'Unknown',
                text: replyEl.querySelector('[data-test-id="comment"]')?.textContent?.trim() || '',
                time: replyEl.querySelector('time')?.textContent?.trim() || '',
                score: replyEl.querySelector('[id*="vote-arrows"]')?.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0'
            }))
        };
    };

    const stabilizer = new ViewportStabilizer({
        stableDurationMs: 1000
    });

    const formatter = ContentFormatter.createFromTemplate('REDDIT_COMMENT', {
        itemExtractor: extractRedditComment
    });

    const commentElements = Array.from(document.querySelectorAll('.comment'));

    const commentData = await stabilizer.processElements(
        commentElements,
        async (element) => extractRedditComment(element)
    );

    await formatter.formatAndCopy(commentData, { includeReplies: true });
}

// ============================================================================
// Example 4: Custom Template
// ============================================================================

async function copyWithCustomTemplate() {
    const extractData = (element) => ({
        author: element.querySelector('.author')?.textContent || 'Unknown',
        content: element.querySelector('.content')?.textContent || '',
        timestamp: element.querySelector('.timestamp')?.getAttribute('datetime') || '',
        likes: element.querySelector('.likes-count')?.textContent || '0'
    });

    const formatter = new ContentFormatter({
        // Custom template function
        template: (item) => {
            return `👤 ${item.author}\n📅 ${item.timestamp}\n💬 ${item.content}\n❤️ ${item.likes} likes`;
        },
        replyTemplate: (reply) => {
            return `  ↳ 👤 ${reply.author}\n  💬 ${reply.content}`;
        },
        itemSeparator: '\n\n' + '='.repeat(50) + '\n\n',
        itemExtractor: extractData,
        itemValidator: (item) => item.content && item.content.length > 5
    });

    const elements = Array.from(document.querySelectorAll('.post'));

    // If elements need scrolling, use ViewportStabilizer
    const stabilizer = new ViewportStabilizer({
        scrollContainer: document.querySelector('.scroll-container'),
        stableDurationMs: 800
    });

    const data = await stabilizer.processElements(
        elements,
        async (element) => extractData(element)
    );

    await formatter.formatAndCopy(data);
}

// ============================================================================
// Example 5: Simple Text Extraction (No Structure)
// ============================================================================

async function copySimpleText() {
    const formatter = new ContentFormatter({
        template: '{text}',
        itemSeparator: '\n\n',
        itemExtractor: (element) => ({
            text: element.textContent?.trim() || ''
        }),
        itemValidator: (item) => item.text.length > 0
    });

    const elements = Array.from(document.querySelectorAll('.item'));

    const stabilizer = new ViewportStabilizer({
        stableDurationMs: 600
    });

    const data = await stabilizer.processElements(
        elements,
        async (element) => ({ text: element.textContent?.trim() || '' })
    );

    await formatter.formatAndCopy(data);
}

// Export examples (if using as module)
export {
    copyInstagramComments,
    copyTwitterPosts,
    copyRedditComments,
    copyWithCustomTemplate,
    copySimpleText
};
