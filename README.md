# Claude Utilities

A Chrome extension to enhance your experience on Claude (claude.ai).

[日本語](README.ja.md)

<div align="center">
  <img src="assets/top.jpg" width="100%">
</div>

## Features

### Chat Width

Freely adjust the maximum width of the chat area.

- Configurable between 650–2000px (default: 1000px)
- Set via slider or numeric input in the extension popup

### Usage

Displays real-time usage above the chat input.

- Shows 5-hour session, weekly, and extra quota as a progress bar or donut chart
- Turns red when less than 10% remains
- Auto-refreshes after Claude finishes responding

### Language

Switch between Japanese and English from the extension popup.

## Installation

1. Download the latest `claude-utilities-vX.X.X.zip` from [Releases](../../releases)
2. Unzip the file
3. Open `chrome://extensions/` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** (top left)
6. Select the unzipped folder

<details>
<summary>Option: Install via git clone (for developers)</summary>

Use this if you want to try the latest `main` branch or modify the source.

```bash
git clone https://github.com/otanitakeru/claude-utilities-chrome-extension.git
cd claude-utilities-chrome-extension
```

Steps 3–5 are the same as above. In step 6, select the **`src` folder** inside the cloned repository.

</details>

## Screenshots

### Before

<img src="assets/before.jpg" width="900">

### After

<img src="assets/after.jpg" width="900">

## License

MIT

## Credits

The pixel art character (Clawd) in the icon is adapted from SVG assets in [marciogranzotto/clawd-tank](https://github.com/marciogranzotto/clawd-tank).
Original author: Marcio Granzotto Rodrigues (MIT License)
