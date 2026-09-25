/**
 * content-scripts/mistral/injector.js
 * Pastes the pending handoff markdown into Mistral Le Chat's input and optionally sends.
 *
 * SELECTORS — Le Chat uses a contenteditable input. Verify via DevTools:
 *   [contenteditable="true"]  (the ProseMirror-style editor)
 *   button[aria-label="Send"]  or  button[type="submit"]
 */

const MISTRAL_INJECTOR_CONFIG = {
  inputSelector: '[contenteditable="true"]',
  sendButtonSelector: 'button[aria-label="Send"], button[aria-label="Send message"], button[type="submit"]',
  targetSite: "mistral",
};

async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      MISTRAL_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(MISTRAL_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    console.error("[Chat Handoff] Mistral injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: MISTRAL_INJECTOR_CONFIG.targetSite,
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
