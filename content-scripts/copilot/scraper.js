/**
 * content-scripts/copilot/scraper.js
 * Runs on copilot.microsoft.com. Reads the current conversation.
 *
 * SELECTORS — Microsoft Copilot has its own component library. Verify via DevTools:
 *   1. Open copilot.microsoft.com with an active conversation.
 *   2. Right-click a user message -> Inspect. Look for cib-chat-turn or
 *      similar component attributes that identify user vs assistant turns.
 *   3. Update CONFIG below.
 */

const COPILOT_SCRAPER_CONFIG = {
  // Verified against live Copilot DOM (2026-09-25).
  // User messages carry data-content="user-message"; assistant messages have "ai-message-item" in class.
  // Empty toolbar elements with class*="message-item" are filtered out by the text.length check below.
  messageContainerSelector: '[data-content="user-message"], [class*="ai-message-item"]',
  isUserMessage: (el) => el.getAttribute("data-content") === "user-message",
};

/**
 * Pure DOM-reading function. Accepts an optional root for jsdom-based tests.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeCopilotConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(COPILOT_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/copilot/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: COPILOT_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeCopilotConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "Copilot");
      const leadIn = window.ChatHandoff.defaultLeadIn("Copilot");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeCopilotConversation, COPILOT_SCRAPER_CONFIG };
}
