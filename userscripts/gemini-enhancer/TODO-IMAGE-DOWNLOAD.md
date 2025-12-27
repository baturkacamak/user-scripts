# TODO: Image Download Functionality

**Status:** Temporarily Removed
**Date:** December 2024
**Priority:** Blocked by browser security limitations

---

## Issue Description

When downloading multiple generated images from Google Gemini, clicking the download button for each image always downloads the **FIRST image repeatedly**, regardless of which image's download button was clicked.

This happens because Google Gemini is an Angular Single Page Application (SPA) that maintains internal state about which image is "active" or "selected", and this state doesn't update with programmatic clicks.

---

## Root Cause

Angular (and Zone.js) tracks user interactions through the `isTrusted` property on events:

- When a user **physically clicks** with their mouse, the browser sets `isTrusted: true`
- When events are **dispatched programmatically** (via `element.click()` or `element.dispatchEvent(new MouseEvent(...))`), they always have `isTrusted: false`

Angular's change detection and state management appears to rely on trusted events to update its internal "active image" context. Without this update, the download action always operates on the first/default image in the component's state.

### Why `isTrusted` Cannot Be Bypassed

The `isTrusted` property is **read-only** and set by the browser's rendering engine. It's a security feature that cannot be overridden by JavaScript. The only way to get `isTrusted: true` is through actual user hardware input (mouse, keyboard, touch).

---

## Approaches Attempted

### 1. Canvas Extraction
- **Method:** Draw the visible image to a canvas element and export as PNG blob
- **Result:** ❌ Failed
- **Reason:** Canvas appeared to be tainted by CORS or the image dimensions were reported as 0x0 in some cases. The visible thumbnail may not have the full resolution data.

### 2. Open in New Tab
- **Method:** Extract image URL from `src` attribute and open in new tab
- **Result:** ❌ Failed
- **Reason:** Opens the image but doesn't trigger actual download. URLs may be session-bound and expire or require authentication.

### 3. Direct URL Download (GM_download + fetch)
- **Method:** Extract image URL and download directly using `GM_download` or `fetch` with credentials
- **Result:** ❌ Failed
- **Reason:** 403 Forbidden errors. Google's CDN requires authentication/cookies that aren't passed correctly even with `credentials: 'include'`. GM_download also failed with same authentication issues.

### 4. Keyboard Navigation
- **Method:** Focus the image button, press Enter to "select" it, then focus download button
- **Result:** ❌ Failed
- **Reason:** Focus events don't trigger Angular's state update either. The "active image" context remains unchanged.

### 5. Native `.click()` Method
- **Method:** Use the browser's native `click()` method on buttons
- **Result:** ❌ Failed
- **Reason:** Same issue - `isTrusted` is false, Angular doesn't update state.

### 6. Simulated Pointer/Mouse Events (Full Event Sequence)
- **Method:** Dispatch complete event sequence:
  - `pointerover`, `pointerenter`, `pointermove`
  - `mouseover`, `mouseenter`, `mousemove`
  - `focus`, `focusin`
  - `pointerdown`, `mousedown`
  - `pointerup`, `mouseup`
  - `click`
- **Result:** ❌ Failed
- **Reason:** Events are dispatched successfully but `isTrusted` remains false. Angular's Zone.js still doesn't recognize these as user interactions.

---

## Additional Complications

- The download button opens a **Material CDK overlay menu** attached to `document.body`
- Menu contains links with **dynamic hrefs** that are generated based on "active" image
- Even when the menu opens, the download link always points to the first image
- Angular **re-renders the DOM** frequently, causing stale element references

---

## Potential Future Solutions to Investigate

1. **Browser Extension with Higher Privileges**
   - Content scripts with `activeTab` permission can potentially access more APIs
   - May be able to intercept network requests or access image data directly

2. **Puppeteer/Playwright Automation**
   - Controls actual browser input at OS level
   - Events would have `isTrusted: true`
   - Requires running a separate automation server

3. **Intercepting Angular's Internal State**
   - Inject into Angular's change detection
   - Modify component state directly
   - Requires deep Angular knowledge and may break with updates

4. **Chrome DevTools Protocol**
   - Can simulate trusted input events
   - Requires extension with `debugger` permission

5. **Modifying Download Link href**
   - If we can find the URL pattern for each image
   - May need to intercept Angular's data binding

6. **Waiting for Google API**
   - Google may eventually provide a proper API for bulk downloads
   - Monitor Gemini updates for new features

---

## Files That Were Involved

- `userscripts/gemini-enhancer/dev/gemini-enhancer.js` - Main script (download code removed)
- `userscripts/common/core/index.js` - MouseEventUtils export
- `userscripts/common/core/utils/GMFunctions.js` - GM_download function

---

## Related Resources

- [MDN: Event.isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted)
- [Angular Zone.js Documentation](https://angular.io/guide/zone)
- [Material CDK Overlay](https://material.angular.io/cdk/overlay/overview)

---

## Current State

The **prompt queue functionality remains fully operational**. Users can:
- Queue multiple prompts for text, image, or video generation
- Set delays between prompts
- Start/stop the queue at any time

Only the automatic image download feature has been removed.
