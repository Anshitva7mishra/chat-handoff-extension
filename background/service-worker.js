/**
 * background/service-worker.js
 *
 * Message router only — no business logic lives here.
 * All orchestration is in handoff-orchestrator.js.
 * All storage access goes through storage-schema.js.
 */

importScripts(
  "../storage/storage-schema.js",
  "../shared/format-conversation.js",
  "../shared/default-lead-in.js",
  "../shared/build-handoff-message.js",
  "handoff-orchestrator.js"
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type } = message;

  if (type === "SCRAPE_FOR_PREVIEW") {
    self.ChatHandoffOrchestrator
      .scrapeForPreview(message.sourceTabId)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (type === "CONFIRM_HANDOFF") {
    self.ChatHandoffOrchestrator
      .confirmHandoff(message)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Called by a newly-opened target tab injector on page load.
  if (type === "GET_PENDING_HANDOFF") {
    self.ChatHandoffOrchestrator
      .getPendingHandoff(message.targetSite)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
