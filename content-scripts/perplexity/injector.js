/**
 * content-scripts/perplexity/injector.js
 * Pastes the pending handoff markdown into Perplexity's input and optionally sends.
 *
 * SELECTORS — Perplexity uses a textarea for its main search/query input. Verify:
 *   textarea[placeholder]  or  #ask-textarea
 *   button[aria-label="Submit"]  or  button[type="submit"]
 */

const PERPLEXITY_INJECTOR_CONFIG = {
  inputSelector: '#ask-input, #ask-textarea, textarea[placeholder], textarea',
  sendButtonSelector: 'button[aria-label="Submit"], button[type="submit"]',
  targetSite: "perplexity",
};

async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      PERPLEXITY_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    if (!autoSend) return;

    await window.ChatHandoffDom.clickSendButton(PERPLEXITY_INJECTOR_CONFIG.sendButtonSelector, inputEl);
  } catch (err) {
    console.error("[Chat Handoff] Perplexity injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: PERPLEXITY_INJECTOR_CONFIG.targetSite,
    });
  } catch {
    return;
  }

  if (!response?.ok || !response.result?.payload) return;
  await inject(response.result.payload, response.result.autoSend);
}

runPendingHandoffIfAny();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RUN_PENDING_HANDOFF") {
    inject(message.payload, message.autoSend).then(() => sendResponse({ ok: true }));
    return true;
  }
});
