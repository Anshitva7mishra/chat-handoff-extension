/**
 * shared/default-lead-in.js
 */
function defaultLeadIn(sourceSiteLabel) {
  return `Here's my conversation so far with ${sourceSiteLabel}. Please read it and continue from where it left off, keeping the same context and tone:`;
}

if (typeof self !== "undefined") {
  self.ChatHandoff = self.ChatHandoff || {};
  self.ChatHandoff.defaultLeadIn = defaultLeadIn;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { defaultLeadIn };
}
