# Reset X news feed

A simple browser console script to clean the X / Twitter "For you" feed.

The script automatically:
- opens post menus
- clicks "Not interested in this post"
- clicks "Show fewer posts from..."
- scrolls through the feed
- shows clean progress logs in the console

## Usage

1. Open X / Twitter in your browser.
2. Go to the "For you" feed.
3. Open Developer Tools.
4. Go to the Console tab.
5. Paste the content of `script.js`.
6. Press Enter.

## Stop the script

```js
window.stopXNotInterested()
