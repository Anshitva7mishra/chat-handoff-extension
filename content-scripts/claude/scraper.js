/**
 * content-scripts/claude/scraper.js
 * Runs on claude.ai. Reads the current conversation from the DOM.
 *
 * SELECTORS — prefer data-testid / aria attributes over generated class names;
 * they survive deploys far better. To update:
 *   1. Open claude.ai with a conversation open.
 *   2. Right-click a message bubble -> Inspect.
 *   3. Find the outermost stable attribute on each message container.
 *   4. Update CONFIG below — nothing else needs to change.
 */

const CLAUDE_SCRAPER_CONFIG = {
  messageContainerSelector: '[data-testid="user-message"], [data-testid="assistant-message"]',
  isUserMessage: (el) =>
    el.getAttribute("data-testid") === "user-message",
};

/**
 * Pure DOM-reading function. Accepts an optional root (defaults to document)
 * so it can be unit-tested against fixture HTML with jsdom.
 *
 * @param {Document|Element} [root]
 * @returns {{ role: "user"|"assistant", text: string }[]}
 */
function scrapeClaudeConversation(root) {
  const doc = root || document;
  const containers = Array.from(
    doc.querySelectorAll(CLAUDE_SCRAPER_CONFIG.messageContainerSelector)
  );

  if (containers.length === 0) {
    throw new Error(
      "No messages found — the selector in content-scripts/claude/scraper.js likely needs updating (see file header)."
    );
  }

  return containers
    .map((el) => ({
      role: CLAUDE_SCRAPER_CONFIG.isUserMessage(el) ? "user" : "assistant",
      text: (el.innerText || el.textContent || "").trim(),
    }))
    .filter((m) => m.text.length > 0);
}

// Wire up the extension messaging only when running inside the browser.
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCRAPE_CONVERSATION") return false;

    try {
      const messages = scrapeClaudeConversation();
      const transcript = window.ChatHandoff.formatConversationAsMarkdown(messages, "Claude");
      const leadIn = window.ChatHandoff.defaultLeadIn("Claude");
      sendResponse({ ok: true, transcript, leadIn });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }

    return true;
  });
}

// Export for unit tests (jsdom fixture tests in tests/unit/).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { scrapeClaudeConversation, CLAUDE_SCRAPER_CONFIG };
}
