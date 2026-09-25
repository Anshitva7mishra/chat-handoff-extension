/**
 * shared/build-handoff-message.js
 */
function buildHandoffMessage(leadInText, transcript) {
  const cleanLeadIn = (leadInText || "").trim();
  const cleanTranscript = (transcript || "").trim();

  if (!cleanTranscript) {
    throw new Error("buildHandoffMessage: transcript is empty — nothing to hand off");
  }

  return [cleanLeadIn, "", "---", "", cleanTranscript, "", "---"].join("\n");
}

if (typeof window !== "undefined") {
  window.ChatHandoff = window.ChatHandoff || {};
  window.ChatHandoff.buildHandoffMessage = buildHandoffMessage;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildHandoffMessage };
}
