/**
 * content-scripts/gemini/scraper.js
 * Runs on gemini.google.com. Reads the current conversation from the DOM.
 *
 * SELECTORS — Gemini uses custom web components. Verify via DevTools:
 *   1. Open gemini.google.com with a conversation open.
 *   2. Right-click a message -> Inspect.
 *   3. Gemini typically renders user turns in <user-query> and model turns
 *      in <model-response> custom elements. Look for stable data-* or role
 *      attributes on the outermost message wrapper and update CONFIG below.
 */

const GEMINI_SCRAPER_CONFIG = {
  // Outer container that wraps each turn (user + assistant alike).
  messageContainerSelector: ".conversation-container [data-message-id], user-query, model-response",
  isUserMessage: (el) =>
    el.tagName.toLowerCase() === "user-query" ||
    el.getAttribute("data-role") === "user" ||
    el.closest("user-query") !== null,
};

/**
 * Pure DOM-reading function. Accepts an optional root for jsdom-based tests.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeGeminiConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(GEMINI_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/gemini/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: GEMINI_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeGeminiConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "Gemini");
      const leadIn = window.ChatHandoff.defaultLeadIn("Gemini");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeGeminiConversation, GEMINI_SCRAPER_CONFIG };
}
