/**
 * shared/format-conversation.js
 * Pure function, no DOM/browser APIs — testable in plain Node.
 */
function formatConversationAsMarkdown(messages, sourceSiteLabel) {
  if (!Array.isArray(messages)) {
    throw new TypeError("formatConversationAsMarkdown: messages must be an array");
  }

  const lines = [];
  for (const msg of messages) {
    const text = (msg?.text || "").trim();
    if (!text) continue; // skip empty turns defensively
    const speaker = msg.role === "user" ? "You" : sourceSiteLabel;
    lines.push(`**${speaker}:**`, text, "");
  }

  return lines.join("\n").trim();
}

// Browser context (content scripts): attach to window.
// Node/test context: export via module.exports if present.
if (typeof window !== "undefined") {
  window.ChatHandoff = window.ChatHandoff || {};
  window.ChatHandoff.formatConversationAsMarkdown = formatConversationAsMarkdown;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatConversationAsMarkdown };
}
