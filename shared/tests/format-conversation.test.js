"use strict";

/**
 * shared/tests/format-conversation.test.js
 * Run with: node shared/tests/format-conversation.test.js
 */
const assert = require("assert");
const { formatConversationAsMarkdown } = require("../format-conversation.js");
const { defaultLeadIn } = require("../default-lead-in.js");
const { buildHandoffMessage } = require("../build-handoff-message.js");

{
  const out = formatConversationAsMarkdown(
    [{ role: "user", text: "Hello" }, { role: "assistant", text: "Hi there" }],
    "Claude"
  );
  assert(out.includes("**You:**"),    "should label user turns as You");
  assert(out.includes("**Claude:**"), "should label assistant turns with the source site name");
  assert(out.includes("Hello") && out.includes("Hi there"), "should include message text");
}

{
  const out = formatConversationAsMarkdown(
    [{ role: "user", text: "   " }, { role: "assistant", text: "Real reply" }],
    "Claude"
  );
  assert(!out.includes("**You:**"), "blank user turn should be skipped");
  assert(out.includes("Real reply"), "non-blank turn should remain");
}

{
  assert.throws(() => formatConversationAsMarkdown(null, "Claude"), TypeError);
}

{
  const text = defaultLeadIn("Claude");
  assert(text.includes("Claude"), "lead-in should reference the source site");
}

{
  const msg = buildHandoffMessage("Continue please:", "**You:**\nHi");
  assert(msg.includes("Continue please:"), "should include the lead-in");
  assert(msg.includes("**You:**"), "should include the transcript");
  assert.throws(() => buildHandoffMessage("lead-in only", ""), /empty/, "should reject empty transcript");
}

console.log("All shared/ unit tests passed.");
