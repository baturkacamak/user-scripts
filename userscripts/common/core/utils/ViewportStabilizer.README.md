# ViewportStabilizer

A reusable utility for handling lazy-rendered content that only appears when scrolled into view. Perfect for modern web apps using virtual scrolling or lazy rendering.

## Features

- **Automatic scrolling**: Scrolls elements into viewport (window or custom container)
- **Stability detection**: Waits for content height and text to stabilize before proceeding
- **Flexible configuration**: Custom validators, hooks, and stability checkers
- **Error handling**: Robust error handling with optional callbacks
- **Batch processing**: Process multiple elements sequentially

## Use Cases

- Copying tweets from a scrollable timeline
- Collecting Instagram post comments (scrolling within a div)
- Extracting responses from chat applications
- Any content that's lazy-rendered when scrolled into view

## Basic Usage

### Single Element

```javascript
import { ViewportStabilizer } from '../../common/core';

const stabilizer = new ViewportStabilizer({
  stableDurationMs: 1000,  // Wait 1 second for stability
  checkIntervalMs: 150,    // Check every 150ms
  maxWaitMs: 10000         // Max 10 seconds wait
});

const element = document.querySelector('.tweet');
const result = await stabilizer.scrollAndWaitForStable(element);

if (result.stable) {
  const text = element.textContent;
  console.log('Content ready:', text);
}
```

### Scrolling Within a Container

```javascript
// For Instagram comments (scrolling inside a div, not the window)
const commentsContainer = document.querySelector('.comments-scroll-container');

const stabilizer = new ViewportStabilizer({
  scrollContainer: commentsContainer,  // Scroll within this container
  stableDurationMs: 800,
  checkIntervalMs: 100
});

const comment = document.querySelector('.comment');
await stabilizer.scrollAndWaitForStable(comment);
```

### Processing Multiple Elements

```javascript
const tweets = document.querySelectorAll('.tweet');

const stabilizer = new ViewportStabilizer({
  stableDurationMs: 1000,
  enableDebugLogging: true
});

const results = await stabilizer.processElements(
  tweets,
  async (element, index, stabilityResult) => {
    // Process each element after it's stable
    const text = element.textContent;
    const author = element.querySelector('.author')?.textContent;
    
    return {
      index,
      text,
      author,
      stable: stabilityResult.stable
    };
  },
  {
    onProgress: (index, total, element) => {
      console.log(`Processing ${index + 1}/${total}...`);
    },
    onError: (error, element, index) => {
      console.error(`Error processing element ${index}:`, error);
    }
  }
);
```

## Advanced Usage

### Custom Validator

```javascript
const stabilizer = new ViewportStabilizer({
  elementValidator: (element) => {
    // Only process elements that have loaded content
    return element.querySelector('.content-loaded') !== null;
  }
});
```

### Pre/Post Scroll Hooks

```javascript
const stabilizer = new ViewportStabilizer({
  preScrollHook: async (element) => {
    // Do something before scrolling (e.g., wait for loading indicator)
    await waitForLoadingIndicator(element);
  },
  postScrollHook: async (element) => {
    // Do something after scrolling (e.g., wait for accordion to close)
    await waitForAccordionToClose(element);
  }
});
```

### Custom Stability Checker

```javascript
const stabilizer = new ViewportStabilizer({
  stabilityChecker: async (element) => {
    // Custom logic to check if content is stable
    const image = element.querySelector('img');
    if (image && !image.complete) {
      return false; // Image still loading
    }
    
    // Check if text hasn't changed in last 500ms
    const text = element.textContent;
    await delay(500);
    return element.textContent === text;
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scrollContainer` | HTMLElement\|null | `null` | Container to scroll within (null = window) |
| `stableDurationMs` | number | `1000` | How long content must be stable (ms) |
| `checkIntervalMs` | number | `150` | How often to check for changes (ms) |
| `maxWaitMs` | number | `10000` | Maximum time to wait (ms) |
| `elementValidator` | Function | `null` | Validate element before processing |
| `preScrollHook` | Function | `null` | Called before scrolling |
| `postScrollHook` | Function | `null` | Called after scrolling |
| `stabilityChecker` | Function | `null` | Custom stability checker |
| `scrollOptions` | Object | `{behavior: 'auto', block: 'center'}` | scrollIntoView options |
| `scrollDelayMs` | number | `200` | Delay after scrolling (ms) |
| `logger` | Object | `Logger` | Logger instance |
| `enableDebugLogging` | boolean | `false` | Enable debug logging |

## Examples

### Twitter/X Timeline

```javascript
import { ViewportStabilizer } from '../../common/core';

const stabilizer = new ViewportStabilizer({
  stableDurationMs: 800,
  enableDebugLogging: true
});

const tweets = Array.from(document.querySelectorAll('[data-testid="tweet"]'));

const tweetData = await stabilizer.processElements(
  tweets,
  async (tweet) => {
    const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent;
    const author = tweet.querySelector('[data-testid="User-Name"]')?.textContent;
    return { text, author };
  }
);
```

### Instagram Comments

```javascript
const commentsContainer = document.querySelector('div[role="dialog"] [style*="overflow"]');

const stabilizer = new ViewportStabilizer({
  scrollContainer: commentsContainer,
  stableDurationMs: 600,
  checkIntervalMs: 100
});

const comments = Array.from(document.querySelectorAll('.comment'));

const commentTexts = await stabilizer.processElements(
  comments,
  async (comment) => comment.textContent.trim()
);
```

### Reddit Posts

```javascript
const stabilizer = new ViewportStabilizer({
  stableDurationMs: 1000,
  elementValidator: (post) => {
    // Only process posts that are fully loaded
    return !post.querySelector('.loading-skeleton');
  }
});

const posts = Array.from(document.querySelectorAll('[data-testid="post-container"]'));

const postData = await stabilizer.processElements(
  posts,
  async (post) => {
    const title = post.querySelector('h3')?.textContent;
    const content = post.querySelector('[data-testid="post-content"]')?.textContent;
    return { title, content };
  }
);
```

## Return Values

### `scrollAndWaitForStable(element)`

Returns a Promise resolving to:
```javascript
{
  stable: boolean,           // Whether content stabilized
  reason: string,            // Reason for result
  finalHeight?: number,      // Final element height
  finalTextLength?: number   // Final text length
}
```

### `processElements(elements, processor, options)`

Returns a Promise resolving to an array of results from the `processor` function.

## Notes

- The module automatically handles disconnected elements
- If stability timeout is reached, it still returns `stable: true` to avoid blocking forever
- Custom stability checkers should return a boolean or Promise<boolean>
- Validators and hooks can be async functions
