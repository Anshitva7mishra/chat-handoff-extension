/**
 * content-scripts/deepseek/scraper.js
 * Runs on chat.deepseek.com. Reads the current conversation.
 *
 * SELECTORS — DeepSeek uses a React SPA similar in structure to ChatGPT.
 * Verify via DevTools:
 *   1. Open chat.deepseek.com with a conversation open.
 *   2. Right-click a message bubble -> Inspect.
 *   3. DeepSeek typically uses data-message-author-role or role attributes.
 *      Look for a stable container attribute that covers all message bubbles.
 *   4. Update CONFIG below.
 */

const DEEPSEEK_SCRAPER_CONFIG = {
  messageContainerSelector: "[data-message-author-role], [class*='ds-markdown'], [class*='message-item']",
  isUserMessage: (el) =>
    el.getAttribute("data-message-author-role") === "user" ||
    el.closest("[class*='UserMessage'], [class*='human']") !== null,
};

/**
 * Pure DOM-reading function. Accepts an optional root for jsdom-based tests.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeDeepSeekConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(DEEPSEEK_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/deepseek/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: DEEPSEEK_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeDeepSeekConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "DeepSeek");
      const leadIn = window.ChatHandoff.defaultLeadIn("DeepSeek");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeDeepSeekConversation, DEEPSEEK_SCRAPER_CONFIG };
}
