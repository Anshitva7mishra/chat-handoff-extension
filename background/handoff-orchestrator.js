/**
 * background/handoff-orchestrator.js
 *
 * Orchestration logic: scrape -> preview -> confirm -> deliver.
 * Imported by service-worker.js via importScripts.
 * All storage access goes through ChatHandoffStorage (storage-schema.js).
 * All shared formatting goes through ChatHandoff (shared/*.js).
 *
 * Adding a new site: add entries to SITE_URLS, SITE_MATCH_PATTERNS, SITE_LABELS,
 * then add content-scripts/<sitename>/scraper.js + injector.js and update manifest.json.
 * Nothing else here needs to change.
 */

const SITE_URLS = {
  claude:      "https://claude.ai/new",
  chatgpt:     "https://chatgpt.com/",
  gemini:      "https://gemini.google.com/app",
  perplexity:  "https://perplexity.ai/",
  mistral:     "https://chat.mistral.ai/chat",
  copilot:     "https://copilot.microsoft.com/",
  deepseek:    "https://chat.deepseek.com/",
};

const SITE_MATCH_PATTERNS = {
  claude:      "*://claude.ai/*",
  chatgpt:     "*://chatgpt.com/*",
  gemini:      "*://gemini.google.com/*",
  perplexity:  "*://perplexity.ai/*",
  mistral:     "*://chat.mistral.ai/*",
  copilot:     "*://copilot.microsoft.com/*",
  deepseek:    "*://chat.deepseek.com/*",
};

const SITE_LABELS = {
  claude:     "Claude",
  chatgpt:    "ChatGPT",
  gemini:     "Gemini",
  perplexity: "Perplexity",
  mistral:    "Mistral",
  copilot:    "Copilot",
  deepseek:   "DeepSeek",
};

/**
 * Asks the source tab's content script to scrape the conversation.
 * Returns { ok, transcript, leadIn } or { ok: false, error }.
 */
async function scrapeForPreview(sourceTabId) {
  let scrapeResult;
  try {
    scrapeResult = await chrome.tabs.sendMessage(sourceTabId, {
      type: "SCRAPE_CONVERSATION",
    });
  } catch {
    return {
      ok: false,
      error:
        "Couldn't reach the page. Make sure you're on a supported AI chatbot site and the page has finished loading, then try again.",
    };
  }

  if (!scrapeResult?.ok) {
    return {
      ok: false,
      error: scrapeResult?.error || "Could not read the conversation on this page.",
    };
  }

  return { ok: true, transcript: scrapeResult.transcript, leadIn: scrapeResult.leadIn };
}

/**
 * Reads the autoSend setting, stores the payload, then navigates to (or opens)
 * the target site and triggers injection.
 * Returns { ok } or { ok: false, error }.
 */
async function confirmHandoff({ targetSite, sourceSite, leadIn, transcript }) {
  let markdown;
  try {
    markdown = self.ChatHandoff.buildHandoffMessage(leadIn, transcript);
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const settings = await self.ChatHandoffStorage.getSettings();
  const autoSend = settings.autoSend !== false;

  const payload = { targetSite, markdown, createdAt: Date.now() };
  await self.ChatHandoffStorage.setPendingHandoff(payload);

  try {
    const matches = await chrome.tabs.query({ url: SITE_MATCH_PATTERNS[targetSite] });

    if (matches.length > 0) {
      const targetTab = matches[0];
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true });
      await chrome.tabs.sendMessage(targetTab.id, {
        type: "RUN_PENDING_HANDOFF",
        payload,
        autoSend,
      });
    } else {
      await chrome.tabs.create({ url: SITE_URLS[targetSite] });
    }
  } catch (err) {
    return {
      ok: false,
      error: `Could not open or reach the ${SITE_LABELS[targetSite]} tab: ${err.message}`,
    };
  }

  try {
    await self.ChatHandoffStorage.addHistoryEntry({
      sourceSite: sourceSite || "unknown",
      targetSite,
      leadInUsed: leadIn,
    });
  } catch (err) {
    console.warn("[Chat Handoff] Could not log history (non-fatal):", err.message);
  }

  return { ok: true };
}

/**
 * Called by a newly-opened target tab's injector to claim the pending handoff
 * payload. Returns and clears it atomically so double-delivery is impossible.
 * If the pending payload is for a different target site, it is put back.
 */
async function getPendingHandoff(targetSite) {
  const payload = await self.ChatHandoffStorage.takePendingHandoff();
  if (!payload) return null;

  if (payload.targetSite !== targetSite) {
    await self.ChatHandoffStorage.setPendingHandoff(payload);
    return null;
  }

  const settings = await self.ChatHandoffStorage.getSettings();
  return { payload, autoSend: settings.autoSend !== false };
}

self.ChatHandoffOrchestrator = {
  scrapeForPreview,
  confirmHandoff,
  getPendingHandoff,
};
