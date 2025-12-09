# ContentFormatter

A flexible utility for formatting structured content (comments, tweets, posts) before copying to clipboard. Works seamlessly with `ViewportStabilizer` and `ClipboardService`.

## Features

- **Customizable templates**: Use template strings or functions
- **Built-in templates**: Pre-configured templates for Instagram, Twitter, Reddit
- **Nested structures**: Handle replies, threads, nested comments
- **Data extraction**: Extract structured data from DOM elements
- **Validation**: Filter invalid items before formatting
- **Integration**: Works with ClipboardService automatically

## Basic Usage

### Simple Formatting

```javascript
import { ContentFormatter } from '../../common/core';

const formatter = new ContentFormatter({
  template: '{username} ({time}):\n{text}',
  itemSeparator: '\n\n---\n\n'
});

const comments = [
  { username: 'john_doe', time: '2h ago', text: 'Great post!' },
  { username: 'jane_smith', time: '1h ago', text: 'I agree!' }
];

const formatted = formatter.formatItems(comments);
// Output:
// john_doe (2h ago):
// Great post!
//
// ---
//
// jane_smith (1h ago):
// I agree!
```

### Format and Copy

```javascript
await formatter.formatAndCopy(comments);
// Automatically formats and copies to clipboard
```

## Instagram Comments Example

### Complete Solution with ViewportStabilizer

```javascript
import { ViewportStabilizer, ContentFormatter } from '../../common/core';

// 1. Extract data from Instagram comment elements
const extractInstagramComment = (element) => {
  return {
    username: element.querySelector('a[href*="/"]')?.textContent?.trim() || 'Unknown',
    text: element.querySelector('span')?.textContent?.trim() || '',
    time: element.querySelector('time')?.textContent?.trim() || '',
    replies: Array.from(element.querySelectorAll('.reply')).map(replyEl => ({
      username: replyEl.querySelector('a[href*="/"]')?.textContent?.trim() || 'Unknown',
      text: replyEl.querySelector('span')?.textContent?.trim() || '',
      time: replyEl.querySelector('time')?.textContent?.trim() || '',
      repliedTo: replyEl.getAttribute('data-replied-to') || null
    }))
  };
};

// 2. Setup ViewportStabilizer for lazy-rendered comments
const commentsContainer = document.querySelector('div[role="dialog"] [style*="overflow"]');
const stabilizer = new ViewportStabilizer({
  scrollContainer: commentsContainer,
  stableDurationMs: 800,
  enableDebugLogging: true
});

// 3. Setup ContentFormatter with Instagram template
const formatter = ContentFormatter.createFromTemplate('INSTAGRAM_COMMENT', {
  itemExtractor: extractInstagramComment,
  itemValidator: (item) => item.text && item.text.length > 0
});

// 4. Collect and format comments
const commentElements = Array.from(document.querySelectorAll('.comment'));

const commentData = await stabilizer.processElements(
  commentElements,
  async (element, index, stabilityResult) => {
    return extractInstagramComment(element);
  }
);

// 5. Format and copy
await formatter.formatAndCopy(commentData, { includeReplies: true });
```

### Output Format

```
username123 (2h ago):
This is a great post! Love it!

  ↳ user456 (1h ago):
  I totally agree!

  ↳ user789 replied to username123 (30m ago):
  Same here!

---

another_user (3h ago):
Nice work!

---
```

## Twitter/X Posts Example

```javascript
import { ViewportStabilizer, ContentFormatter } from '../../common/core';

// Extract Twitter post data
const extractTwitterPost = (element) => {
  const authorLink = element.querySelector('a[href*="/"]');
  return {
    username: authorLink?.textContent?.trim() || 'Unknown',
    handle: authorLink?.getAttribute('href')?.replace('/', '') || '',
    text: element.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '',
    time: element.querySelector('time')?.textContent?.trim() || '',
    replies: Array.from(element.querySelectorAll('[data-testid="reply"]')).map(replyEl => ({
      username: replyEl.querySelector('a[href*="/"]')?.textContent?.trim() || 'Unknown',
      handle: replyEl.querySelector('a[href*="/"]')?.getAttribute('href')?.replace('/', '') || '',
      text: replyEl.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '',
      time: replyEl.querySelector('time')?.textContent?.trim() || '',
      repliedTo: replyEl.getAttribute('data-replied-to') || null
    }))
  };
};

// Setup
const stabilizer = new ViewportStabilizer({
  stableDurationMs: 1000,
  enableDebugLogging: true
});

const formatter = ContentFormatter.createFromTemplate('TWITTER_POST', {
  itemExtractor: extractTwitterPost,
  itemValidator: (item) => item.text && item.text.length > 0
});

// Collect tweets
const tweetElements = Array.from(document.querySelectorAll('[data-testid="tweet"]'));

const tweetData = await stabilizer.processElements(
  tweetElements,
  async (element) => extractTwitterPost(element)
);

// Format and copy
await formatter.formatAndCopy(tweetData, { includeReplies: true });
```

### Output Format

```
John Doe (@johndoe) - 2h ago:
Just launched my new project! Check it out 🚀

  ↳ Jane Smith (@janesmith) replied to @johndoe - 1h ago:
  Congratulations! 🎉

---

Bob Wilson (@bobwilson) - 3h ago:
Great weather today!

---
```

## Custom Templates

### Using Template Strings

```javascript
const formatter = new ContentFormatter({
  template: '{username} at {time}:\n{text}',
  replyTemplate: '  ↳ {username} at {time}:\n  {text}',
  itemSeparator: '\n\n---\n\n'
});
```

### Using Template Functions

```javascript
const formatter = new ContentFormatter({
  template: (item) => {
    return `[${item.time}] ${item.username}:\n${item.text}\n\nLikes: ${item.likes || 0}`;
  },
  replyTemplate: (reply) => {
    return `  ↳ [${reply.time}] ${reply.username}:\n  ${reply.text}`;
  }
});
```

## Advanced Usage

### Custom Data Extraction

```javascript
const formatter = new ContentFormatter({
  template: '{author} ({date}):\n{content}',
  itemExtractor: (element) => {
    // Extract from DOM element
    return {
      author: element.querySelector('.author')?.textContent || 'Unknown',
      date: element.querySelector('.date')?.getAttribute('datetime') || '',
      content: element.querySelector('.content')?.textContent || '',
      likes: parseInt(element.querySelector('.likes')?.textContent || '0'),
      replies: Array.from(element.querySelectorAll('.reply')).map(reply => ({
        author: reply.querySelector('.author')?.textContent || 'Unknown',
        content: reply.querySelector('.content')?.textContent || ''
      }))
    };
  },
  itemValidator: (item) => {
    // Only include items with content
    return item.content && item.content.length > 10;
  }
});
```

### Processing Elements Directly

```javascript
const commentElements = document.querySelectorAll('.comment');

const formatted = formatter.formatItems(commentElements, {
  extractFromElements: true,  // Extract data using itemExtractor
  includeReplies: true
});

await ClipboardService.copyToClipboard(formatted);
```

### Custom Reply Handling

```javascript
const formatter = new ContentFormatter({
  template: '{username}: {text}',
  replyTemplate: '  ↳ {username}: {text}',
  replyToTemplate: '  ↳ {username} → {repliedTo}: {text}',
  replySeparator: '\n',
  itemSeparator: '\n\n---\n\n'
});
```

## Built-in Templates

### INSTAGRAM_COMMENT
```
{username} ({time}):
{text}

  ↳ {username} ({time}):
  {text}
```

### TWITTER_POST
```
{username} (@{handle}) - {time}:
{text}

  ↳ {username} (@{handle}) - {time}:
  {text}
```

### REDDIT_COMMENT
```
u/{username} ({time}, {score} points):
{text}

  ↳ u/{username} ({time}, {score} points):
  {text}
```

### SIMPLE
```
{text}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `template` | string\|Function | `'{text}'` | Template for main items |
| `replyTemplate` | string\|Function | `null` | Template for replies |
| `replyToTemplate` | string\|Function | `null` | Template for replies with "replied to" |
| `itemSeparator` | string | `'\n\n---\n\n'` | Separator between items |
| `replySeparator` | string | `'\n'` | Separator between replies |
| `itemExtractor` | Function | `null` | Extract data from DOM elements |
| `replyExtractor` | Function | `null` | Extract reply data from elements |
| `itemValidator` | Function | `null` | Validate items before formatting |
| `logger` | Object | `Logger` | Logger instance |
| `enableDebugLogging` | boolean | `false` | Enable debug logging |

## Template Placeholders

Use `{placeholderName}` in templates. Common placeholders:
- `{username}` - Username
- `{handle}` - Handle/username with @
- `{text}` - Content text
- `{time}` - Time/date
- `{date}` - Date
- `{score}` - Upvotes/likes
- `{repliedTo}` - Username being replied to
- Any custom field from your data

## Complete Workflow Example

```javascript
import { ViewportStabilizer, ContentFormatter, ClipboardService } from '../../common/core';

// 1. Define data extraction
const extractData = (element) => ({ /* ... */ });

// 2. Setup stabilizer
const stabilizer = new ViewportStabilizer({
  scrollContainer: document.querySelector('.scroll-container'),
  stableDurationMs: 1000
});

// 3. Setup formatter
const formatter = ContentFormatter.createFromTemplate('INSTAGRAM_COMMENT', {
  itemExtractor: extractData
});

// 4. Collect elements
const elements = Array.from(document.querySelectorAll('.item'));

// 5. Process with stabilizer
const data = await stabilizer.processElements(
  elements,
  async (element) => extractData(element)
);

// 6. Format and copy
const success = await formatter.formatAndCopy(data, {
  includeReplies: true
});

if (success) {
  console.log('Copied to clipboard!');
}
```

## Notes

- Templates support both string placeholders and functions
- Replies are automatically nested if `includeReplies: true`
- Invalid items are filtered out if `itemValidator` is provided
- Works seamlessly with `ViewportStabilizer` for lazy-rendered content
- Automatically uses `ClipboardService` for copying
