/**
 * content-scripts/perplexity/scraper.js
 * Runs on perplexity.ai. Reads the current conversation from the DOM.
 *
 * SELECTORS — Perplexity has a hybrid search+chat UI. Verify via DevTools:
 *   1. Open perplexity.ai and run a query with follow-ups.
 *   2. Right-click your query text -> Inspect. Look for a stable attribute
 *      on the outermost element that holds user queries.
 *   3. Right-click an answer block -> Inspect. Look for a stable attribute
 *      on the answer container.
 *   4. Update CONFIG below.
 */

const PERPLEXITY_SCRAPER_CONFIG = {
  // Perplexity wraps each query+answer pair. We select individual turn elements.
  messageContainerSelector: '[data-message-author-role], .break-words',
  isUserMessage: (el) =>
    el.getAttribute("data-message-author-role") === "user" ||
    el.closest("[data-testid*='user'], [class*='UserMessage'], [class*='userMessage']") !== null,
};

/**
 * Pure DOM-reading function. Accepts an optional root for jsdom-based tests.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapePerplexityConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(PERPLEXITY_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/perplexity/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: PERPLEXITY_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapePerplexityConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "Perplexity");
      const leadIn = window.ChatHandoff.defaultLeadIn("Perplexity");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapePerplexityConversation, PERPLEXITY_SCRAPER_CONFIG };
}
