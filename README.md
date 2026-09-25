# Chat Handoff

A browser extension that continues an AI chat conversation on a different chatbot when you hit a usage or token limit. It works entirely on top of the consumer web applications for Claude, ChatGPT, Gemini, Perplexity, Mistral, Copilot, and DeepSeek. No API keys, no user accounts, no backend of any kind.

---

## Table of Contents

1. [Overview](#overview)
2. [Supported Services](#supported-services)
3. [Features](#features)
4. [How It Works](#how-it-works)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Installation (Development)](#installation-development)
8. [Configuration](#configuration)
9. [Usage Guide](#usage-guide)
10. [Storage Design](#storage-design)
11. [Selector Maintenance](#selector-maintenance)
12. [Testing](#testing)
13. [Continuous Integration](#continuous-integration)
14. [Privacy](#privacy)
15. [Known Limitations](#known-limitations)
16. [Hosting and Distribution](#hosting-and-distribution)
17. [Contributing](#contributing)
18. [License](#license)

---

## Overview

Chat Handoff solves a practical problem: AI chatbots impose per-session or per-plan usage limits. When a conversation hits that limit, the user must either pay for more credits, wait for the limit to reset, or start a new conversation on a different platform and manually re-explain all context. This extension automates the last option.

The extension scrapes the current conversation from the DOM, constructs a formatted handoff message (a short lead-in paragraph plus a markdown transcript of the conversation), navigates to the target chatbot, and pastes and submits the message automatically. The receiving chatbot reads the full context and continues the conversation without the user having to re-explain anything.

Everything runs inside the user's browser. No server, no database, no third-party service, and no API credentials are involved at any point.

---

## Supported Services

| Service | URL | Direction |
|---|---|---|
| Claude | claude.ai | Source and target |
| ChatGPT | chatgpt.com | Source and target |
| Gemini | gemini.google.com | Source and target |
| Perplexity | perplexity.ai | Source and target |
| Mistral (Le Chat) | chat.mistral.ai | Source and target |
| Microsoft Copilot | copilot.microsoft.com | Source and target |
| DeepSeek | chat.deepseek.com | Source and target |

Any service can hand off to any other service. Adding a new service requires only a scraper file, an injector file, and three new lines in the orchestrator — no shared code changes.

---

## Features

- One-click handoff between any two of the seven supported chatbots.
- Dark mode UI designed to feel premium and unobtrusive.
- Editable lead-in message displayed before every send so you can add framing or instructions before the transcript is pasted.
- Saved lead-in templates: name and store frequently used openers; load them from a dropdown in the popup.
- Auto-send toggle: by default the extension pastes and submits automatically; disable this in Settings to review the text first.
- Handoff history: the last 20 handoffs are logged (source, target, timestamp) for reference. Full transcripts are never stored.
- Settings sync: preferences and templates sync across all Chrome installations via your existing Google login at no extra cost.
- No account required, no API keys, no configuration needed out of the box.

---

## How It Works

1. The user is on one of the supported chatbot sites with an active conversation.
2. The user clicks the Chat Handoff extension icon in the browser toolbar.
3. The popup detects the current site and shows all other supported sites as target options.
4. The user clicks a target. The extension sends a message to the current tab's content script, which reads every message bubble from the DOM and returns structured data.
5. The popup shows a preview: an editable lead-in textarea and a read-only transcript.
6. The user optionally edits the lead-in or applies a saved template, then clicks Send.
7. The service worker assembles the final message (lead-in + horizontal rule + markdown transcript), stores it transiently in `chrome.storage.local`, then focuses an existing target tab or opens a new one.
8. The target site's content script claims the payload via a `GET_PENDING_HANDOFF` message, inserts it into the chat input, and submits it if auto-send is enabled.

---

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Extension platform | Chrome Manifest V3 | Required by the Chrome Web Store as of 2024 |
| Language | Vanilla JavaScript (ES2022) | No build step needed; fast-loading content scripts |
| Styling | Vanilla CSS with custom properties | Full control, no framework overhead in a 360px popup |
| Storage | chrome.storage.local + chrome.storage.sync | Device-local history; cross-device settings via Google account |
| Unit testing | Node assert + jsdom | No framework overhead; fixture-based tests for all scrapers |
| E2e testing | Playwright | Real browser flows; skipped in CI, run manually |
| Linting | ESLint v9 (flat config) | Separate environments for browser scripts and Node test files |
| CI | GitHub Actions | Lint + unit tests on every push and pull request |

---

## Project Structure

```
chat-handoff-extension/
├── manifest.json                     Chrome extension manifest (MV3, v1.1.0)
├── icons/                            Extension icons at 16, 48, 128 px
│
├── shared/                           Pure functions — no DOM or browser API dependencies
│   ├── format-conversation.js        Converts messages[] to a markdown transcript
│   ├── default-lead-in.js            Generates the default lead-in text
│   ├── build-handoff-message.js      Assembles lead-in + transcript into the final message
│   └── tests/
│       └── format-conversation.test.js
│
├── content-scripts/
│   ├── dom-utils.js                  Shared DOM helpers: waitForElement, insertTextIntoEditable, pressEnter
│   ├── claude/        scraper.js + injector.js
│   ├── chatgpt/       scraper.js + injector.js
│   ├── gemini/        scraper.js + injector.js
│   ├── perplexity/    scraper.js + injector.js
│   ├── mistral/       scraper.js + injector.js
│   ├── copilot/       scraper.js + injector.js
│   └── deepseek/      scraper.js + injector.js
│
├── background/
│   ├── service-worker.js             Message router; no business logic
│   └── handoff-orchestrator.js       Scrape, assemble, deliver; owns all site URLs and match patterns
│
├── popup/
│   ├── popup.html / popup.css / popup.js
│   └── components/
│       ├── PickTarget.js             Step 1: hides the current site, shows all other targets
│       ├── PreviewEditor.js          Step 2: lead-in editor and read-only transcript preview
│       └── TemplatePicker.js         Template dropdown loader
│
├── options/
│   ├── options.html / options.css / options.js
│
├── storage/
│   └── storage-schema.js             Single source of truth for all chrome.storage keys and shapes
│
├── tests/
│   ├── unit/
│   │   ├── fixtures/
│   │   │   ├── claude-conversation.html
│   │   │   └── chatgpt-conversation.html
│   │   ├── claude-scraper.test.js
│   │   └── chatgpt-scraper.test.js
│   └── e2e/
│       └── handoff-flow.test.js      Playwright smoke test (manual only)
│
├── .github/workflows/ci.yml          Lint + unit tests on push and PR
├── eslint.config.js                  Separate browser and Node linting environments
├── package.json
├── .gitignore
└── README.md
```

---

## Installation (Development)

### Prerequisites

- Google Chrome (or any Chromium-based browser supporting Manifest V3)
- Node.js 18 or later

### Steps

1. Clone the repository:

   ```
   git clone https://github.com/your-username/chat-handoff-extension.git
   cd chat-handoff-extension
   ```

2. Install dev dependencies:

   ```
   npm install
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable Developer Mode (toggle in the top-right corner)
   - Click "Load unpacked"
   - Select the repository root (the folder containing `manifest.json`)

4. The Chat Handoff icon appears in the toolbar. If it is hidden, click the puzzle-piece icon and pin it.

5. Before using the extension on the newer sites (Gemini, Perplexity, Mistral, Copilot, DeepSeek), verify the DOM selectors are current — see [Selector Maintenance](#selector-maintenance).

---

## Configuration

All configuration lives in the Settings page. Open it from the popup header or by right-clicking the extension icon and choosing "Options".

| Setting | Description | Default |
|---|---|---|
| Auto-send | When enabled, the handoff message is submitted automatically after pasting. Disable to review before sending. | Enabled |
| Default target | Which service to show first in the popup. | ChatGPT |
| Lead-in templates | Named snippets applied from the popup dropdown. Synced across devices. | None |

---

## Usage Guide

### Performing a handoff

1. Have a conversation on any supported chatbot until you want to continue it on a different one.
2. Click the Chat Handoff icon in the Chrome toolbar.
3. The popup shows all other supported sites as target buttons. Click the one you want.
4. The extension reads the conversation. A preview appears:
   - The upper textarea contains the lead-in message — edit it freely or load a template from the dropdown.
   - The lower read-only area shows the formatted transcript that will be sent.
5. Click Send. The extension navigates to the target site and submits the handoff.
6. The target chatbot responds in context.

### Managing templates

Open Settings, fill in a name and lead-in text under "Lead-in Templates", and click Add Template. Templates appear in the popup dropdown on every future handoff.

### Viewing history

Open Settings and scroll to "Recent Handoffs". The last 20 entries show source, target, and timestamp. Click "Clear History" to remove all entries.

---

## Storage Design

All `chrome.storage` access is centralised in `storage/storage-schema.js`. No other file calls `chrome.storage` directly. This prevents shape drift and makes the schema easy to audit.

| Store | Key | Contents | Notes |
|---|---|---|---|
| chrome.storage.sync | `settings` | `{ autoSend, defaultTarget }` | Synced; well within 8KB per-item limit |
| chrome.storage.sync | `leadInTemplates` | `Array<{ id, name, text }>` | Synced; saveTemplate throws if sync quota is exceeded |
| chrome.storage.local | `handoffHistory` | `Array<{ id, sourceSite, targetSite, leadInUsed, createdAt }>` | Capped at 20 entries |
| chrome.storage.local | `pendingHandoff` | `{ targetSite, markdown, createdAt }` | Transient; cleared the moment the injector claims it |

Full conversation transcripts are never persisted.

---

## Selector Maintenance

The scrapers and injectors depend on CSS selectors targeting DOM elements in each chatbot's web application. All these sites are React or Web Component SPAs that update their structure across deploys.

Each site's selectors are isolated in a `CONFIG` constant at the top of its scraper/injector file. When a selector breaks:

1. Open the broken site with a conversation loaded.
2. Right-click a message bubble and choose Inspect.
3. Find a stable attribute on the outermost message container. Prefer `data-*`, `aria-*`, and `role` attributes over generated class names.
4. Update the `CONFIG` constant in the relevant `scraper.js` and `injector.js`.
5. Update the corresponding fixture file in `tests/unit/fixtures/`.
6. Run `npm test` to confirm the fixture tests pass.

Claude and ChatGPT selectors have been confirmed against the live DOM. The five newer sites (Gemini, Perplexity, Mistral, Copilot, DeepSeek) ship with best-effort selectors that were not confirmed against a live session and will likely require a selector update before they work end-to-end. Each file's header contains specific DevTools instructions.

---

## Testing

```
npm test              # shared pure-function tests + scraper fixture tests
npm run test:shared   # shared/tests/ only
npm run test:unit     # tests/unit/ fixture-based scraper tests
npm run test:e2e      # Playwright end-to-end (manual only)
npm run lint          # ESLint across all source and test files
```

### Unit tests

`shared/tests/format-conversation.test.js` covers the three pure functions in `shared/`. No browser environment needed.

`tests/unit/claude-scraper.test.js` and `tests/unit/chatgpt-scraper.test.js` run the scraper logic against saved HTML fixtures using jsdom. No network requests, no live DOM dependency, safe for CI.

### End-to-end tests

`tests/e2e/handoff-flow.test.js` uses Playwright to load the extension in a headed Chrome instance. It is skipped in CI. To run locally:

1. Install Playwright: `npx playwright install chromium`
2. Set `CLAUDE_SESSION_COOKIE` in your environment to your Claude session cookie value.
3. Run `npm run test:e2e`.

---

## Continuous Integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request targeting `main`:

1. Checkout
2. Set up Node.js 20 and run `npm ci`
3. `npm run lint`
4. `npm run test:shared`
5. `npm run test:unit`

End-to-end tests are excluded from CI. There is no deploy step — the extension is distributed as a Chrome Web Store upload, which is a manual process.

---

## Privacy

No backend exists, so no server ever holds any user's chat content.

- Full conversation transcripts exist only in memory during the popup interaction and in the transient `pendingHandoff` key in `chrome.storage.local`, which is deleted the moment the injector claims it.
- The handoff history contains only metadata: source site, target site, timestamp, and the lead-in text. No transcript text is persisted anywhere.
- No data is transmitted to any external server at any point.

---

## Known Limitations

- **Selector fragility**: Scrapers and injectors break when a chatbot ships a DOM update. This is the primary ongoing maintenance cost. See [Selector Maintenance](#selector-maintenance).
- **New-site selectors unverified**: Gemini, Perplexity, Mistral, Copilot, and DeepSeek injectors ship with placeholder selectors. Each will require a DevTools inspection pass before the handoff works end-to-end on that site.
- **Terms of Service**: Automating the consumer web UI sits in a gray area in most providers' terms. This extension is intended for personal use.
- **No mobile support**: Chrome extensions do not run on iOS or Android Chrome.
- **New-tab timing**: When the extension opens a new tab for the target site, injection depends on the page finishing its React/Vue initialisation. The injector polls for up to 15 seconds; on very slow connections an occasional retry may be needed.
- **chrome.storage.sync quota**: Approximately 100KB total. Sufficient for settings and a reasonable number of templates, but templates should not contain very large text blocks.

---

## Hosting and Distribution

The extension has no server component and therefore no hosting requirement. Distribution options:

### Chrome Web Store

Pack the extension from `chrome://extensions` (Pack extension button) and upload the `.crx` and private key to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). A one-time $5 developer registration fee applies. The store handles distribution, automatic updates, and security scanning. This is the recommended path for distributing to end users.

### Microsoft Edge Add-ons Store

The extension is Manifest V3-compliant and uses only standard WebExtensions APIs. It should run in Edge without modification. Submit to the [Edge Add-ons store](https://partner.microsoft.com/dashboard/microsoftedge) for Edge users.

### Firefox Add-ons (AMO)

Firefox supports MV3 as of Firefox 109. The `chrome.*` namespace is aliased to `browser.*` in Firefox, so minor namespace adjustments may be needed. Once adjusted, submit to [addons.mozilla.org](https://addons.mozilla.org).

### GitHub Releases (manual sideload)

Tag a release in the repository, pack the extension, and attach the `.crx` as a release asset. Technical users can download and sideload it via Developer Mode. No fee, no review process, no automatic updates.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npm run lint` and `npm test` and confirm both pass before pushing.
3. If you changed a selector in a scraper, update the corresponding fixture in `tests/unit/fixtures/` and re-run `npm test`.
4. Open a pull request against `main`. The CI workflow runs automatically.

### Adding a new chatbot

1. Create `content-scripts/<sitename>/scraper.js` and `injector.js` following an existing pair as a template.
2. Add the site's URL patterns to `manifest.json` under `content_scripts` and `host_permissions`.
3. Add entries for `SITE_URLS`, `SITE_MATCH_PATTERNS`, and `SITE_LABELS` in `background/handoff-orchestrator.js`.
4. Add a `<button data-target="sitename">` in `popup/popup.html` and a CSS color variable in `popup/popup.css`.
5. Add a fixture HTML file and a scraper test in `tests/unit/`.

No shared code or storage schema changes are required.

---

## License

MIT
