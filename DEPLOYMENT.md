# Deployment Guide — Chat Handoff Extension

---

## 1. Push to GitHub

You already have a local commit. Now connect it to a remote repository.

### Step-by-step

```
# 1. Create a new repository on github.com (do NOT initialise it with a README)

# 2. Add the remote origin (replace with your actual URL)
git remote add origin https://github.com/your-username/chat-handoff-extension.git

# 3. Rename the branch to main (GitHub's default)
git branch -M main

# 4. Push
git push -u origin main
```

After this, GitHub Actions will automatically run lint and unit tests on every future push. The badge status will appear on github.com/your-username/chat-handoff-extension/actions.

---

## 2. Distribute to Users

### Option A — Chrome Web Store (recommended)

This is the only distribution method that gives users one-click install with automatic updates.

**One-time setup (only done once per developer account)**

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
2. Pay the one-time $5 USD developer registration fee with any Google account.

**Pack the extension**

1. In Chrome, go to `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Pack extension".
4. In "Extension root directory", browse to the project folder (the one containing `manifest.json`).
5. Leave "Private key file" empty on the first pack — Chrome will generate one.
6. Click "Pack Extension". Chrome creates two files next to the project folder:
   - `chat-handoff-extension.crx` — the distributable package
   - `chat-handoff-extension.pem` — your private key (keep this safe; you need it for every future update)

**Upload to the Web Store**

1. In the Developer Console, click "New Item" > "Upload".
2. Upload the `.crx` file.
3. Fill in the store listing:
   - **Name**: Chat Handoff
   - **Short description** (132 chars): Continue your AI chat on a different chatbot when you run out of tokens. Free, no account, nothing leaves your browser.
   - **Category**: Productivity
   - **Screenshots**: At least one 1280x800 or 640x400 screenshot (required)
   - **Privacy practices**: Select "This extension does not collect or use personal data" and explain that everything stays in the browser
4. Click "Submit for Review".

Review typically takes 1–3 business days. Once approved, users install with one click from your store listing URL and receive automatic updates whenever you publish a new version.

**Publishing an update**

1. Increment the `"version"` field in `manifest.json` (e.g., `"1.1.0"` to `"1.2.0"`).
2. Repack using the same `.pem` private key: in Chrome, open "Pack extension" and set the private key file path this time.
3. Upload the new `.crx` in the Developer Console > your extension > "Upload new package".
4. Submit for review.

---

### Option B — Microsoft Edge Add-ons Store

The extension uses only standard WebExtensions APIs and should work in Edge without code changes.

1. Go to [https://partner.microsoft.com/en-us/dashboard/microsoftedge](https://partner.microsoft.com/en-us/dashboard/microsoftedge).
2. Register as a developer (free).
3. Create a new submission and upload a `.zip` of the project folder (zip the contents of the folder, not the folder itself).
4. Complete the store listing and submit.

---

### Option C — Firefox Add-ons (AMO)

Firefox 109+ supports Manifest V3. One namespace adjustment is needed because Firefox does not alias `chrome.*` to `browser.*` in MV3:

1. In all files that call `chrome.*`, add a polyfill at the top of `background/service-worker.js`:
   ```js
   const chromeCompat = typeof browser !== "undefined" ? browser : chrome;
   ```
   Then replace `chrome.` with `chromeCompat.` in the service worker and orchestrator. Content scripts and popup scripts are unaffected because they use `chrome.*` which Firefox does alias in these contexts.

2. Zip the project folder (contents only, not the folder itself).
3. Submit at [https://addons.mozilla.org/developers](https://addons.mozilla.org/developers).

---

### Option D — Direct sideload (no store, developer/personal use)

No packing or fee required. Users load the extension directly from the source folder.

Share the project as a zip file (or a GitHub link) and give users these instructions:

```
1. Download and unzip the extension folder.
2. Open Chrome and go to chrome://extensions.
3. Enable Developer Mode (toggle in the top-right corner).
4. Click "Load unpacked".
5. Select the unzipped folder (the one containing manifest.json).
6. The Chat Handoff icon appears in the toolbar.
```

Limitations: Chrome shows a "Developer mode extensions" warning on startup. There are no automatic updates — users must re-download and reload manually on each release.

---

## 3. After Users Install

Users need no configuration to get started. The extension works out of the box with its defaults:

- **Auto-send** is enabled (the handoff is submitted automatically).
- **Default target** is ChatGPT.

If users want to change these, they open Settings from the popup header.

### Known first-use friction on the newer services

The five newer services (Gemini, Perplexity, Mistral, Copilot, DeepSeek) ship with placeholder DOM selectors that need verification against a live browser session before the handoff works end-to-end on those services. Before promoting the extension to users of those services:

1. Open the target site with a real conversation.
2. Right-click a message bubble > Inspect.
3. Find a stable `data-*` or `aria-*` attribute on the message container.
4. Update the `CONFIG` constant in the relevant `scraper.js` and `injector.js`.
5. Re-run `npm test`, increment the version, and publish an update.

Claude and ChatGPT selectors have been confirmed and work end-to-end.

---

## 4. Version History

| Version | Date | Notes |
|---|---|---|
| 1.1.0 | 2026-09-25 | Added Gemini, Perplexity, Mistral, Copilot, DeepSeek. Dark mode UI. Componentised popup. Full test and lint setup. |
| 1.0.0 | — | Initial version: Claude and ChatGPT only. |
