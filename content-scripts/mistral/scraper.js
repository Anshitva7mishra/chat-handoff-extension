/**
 * content-scripts/mistral/scraper.js
 * Runs on chat.mistral.ai (Le Chat). Reads the current conversation.
 *
 * SELECTORS — Mistral's Le Chat is a React SPA. Verify via DevTools:
 *   1. Open chat.mistral.ai with a conversation open.
 *   2. Right-click a message bubble -> Inspect.
 *   3. Look for data-testid, data-role, or aria attributes on the
 *      outermost message container element.
 *   4. Update CONFIG below.
 */

const MISTRAL_SCRAPER_CONFIG = {
  messageContainerSelector: "[data-message-id], [class*='Message'], [class*='message-container']",
  isUserMessage: (el) =>
    el.getAttribute("data-role") === "user" ||
    el.getAttribute("data-message-author-role") === "user" ||
    el.closest("[class*='UserMessage'], [class*='userMessage']") !== null,
};

/**
 * Pure DOM-reading function. Accepts an optional root for jsdom-based tests.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeMistralConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(MISTRAL_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/mistral/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: MISTRAL_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeMistralConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "Mistral");
      const leadIn = window.ChatHandoff.defaultLeadIn("Mistral");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeMistralConversation, MISTRAL_SCRAPER_CONFIG };
}
