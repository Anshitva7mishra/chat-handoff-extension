"use strict";

/**
 * tests/unit/claude-scraper.test.js
 * Tests the Claude scraper against a saved HTML fixture so CI never
 * depends on the live claude.ai DOM.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { scrapeClaudeConversation } = require("../../content-scripts/claude/scraper.js");

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, "fixtures", "claude-conversation.html"),
  "utf8"
);

const dom = new JSDOM(`<body>${fixtureHtml}</body>`);
const doc = dom.window.document;

{
  const messages = scrapeClaudeConversation(doc);
  assert.strictEqual(messages.length, 4, "should parse 4 messages from the fixture");
}

{
  const messages = scrapeClaudeConversation(doc);
  assert.strictEqual(messages[0].role, "user",      "first message should be a user turn");
  assert.strictEqual(messages[2].role, "user",      "third message should be a user turn");
  assert.strictEqual(messages[1].role, "assistant", "second message should be an assistant turn");
  assert.strictEqual(messages[3].role, "assistant", "fourth message should be an assistant turn");
}

{
  const messages = scrapeClaudeConversation(doc);
  assert(messages[0].text.includes("capital of France"), "user message text should be captured");
  assert(messages[1].text.includes("Paris"),             "assistant message text should be captured");
}

{
  const emptyDoc = new JSDOM("<body></body>").window.document;
  assert.throws(
    () => scrapeClaudeConversation(emptyDoc),
    /No messages found/,
    "should throw with a helpful message when no messages exist"
  );
}

console.log("All claude-scraper unit tests passed.");
