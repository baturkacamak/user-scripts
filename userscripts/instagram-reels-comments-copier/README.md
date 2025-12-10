# Instagram Reels Comments Copier

Copy Instagram Reels comments even when Instagram strips rendered HTML. The script prefers network GraphQL payloads and falls back to DOM parsing based on the `span[dir=auto]` “For you” anchor and the second `<div>` under that `<ul>`.

## Features
- Network-first: intercepts Instagram comment JSON (legitimate requests triggered by you).
- DOM fallback for cases where HTML is pruned; uses stable ancestor lookup.
- Auto-scroll with configurable rounds, delay, and scroll step to load more comments.
- Control panel (toggle button on the page) with live counts, copy/clear, dedupe, reply inclusion, and auto-copy on finish.
- URL-aware: resets when you navigate to another reel.

## Usage
1. Install via your userscript manager.
2. Open a reel on instagram.com. Click the 💬 toggle to open the panel.
3. Hit “Start auto-scroll” (or let it run automatically), then “Copy” to send the cleaned list to your clipboard. Preview updates live inside the panel.

## Notes
- Network capture relies on Instagram’s own requests; if you block them, only DOM fallback will work.
- DOM parsing filters out the “For you” span and aims to keep username + comment text; replies are optional.
- Tested with the current Instagram reels layout where comments live under the “For you” header.
