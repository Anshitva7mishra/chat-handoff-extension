/**
 * content-scripts/chatgpt/scraper.js
 * Mirror of claude/scraper.js for ChatGPT -> Claude direction.
 * Same selector caveat applies — verify via DevTools before relying on this.
 *
 * To update selectors:
 *   1. Open chatgpt.com with a conversation open.
 *   2. Right-click a message bubble -> Inspect.
 *   3. Look for the data-message-author-role attribute (stable since GPT-4).
 *   4. Update CHATGPT_SCRAPER_CONFIG below.
 */

const CHATGPT_SCRAPER_CONFIG = {
  messageContainerSelector: "[data-message-author-role]",
  isUserMessage: (el) => el.getAttribute("data-message-author-role") === "user",
};

/**
 * Pure DOM-reading function. Accepts an optional root (defaults to document)
 * so it can be unit-tested against fixture HTML with jsdom.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeChatGPTConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(CHATGPT_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/chatgpt/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: CHATGPT_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeChatGPTConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "ChatGPT");
      const leadIn = window.ChatHandoff.defaultLeadIn("ChatGPT");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeChatGPTConversation, CHATGPT_SCRAPER_CONFIG };
}
