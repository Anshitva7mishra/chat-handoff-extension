/**
 * content-scripts/copilot/injector.js
 * Pastes the pending handoff markdown into Microsoft Copilot's input and optionally sends.
 *
 * SELECTORS — Copilot uses a custom textarea component. Verify via DevTools:
 *   cib-text-input textarea  or  #userInput  or  [data-testid="composer-code-input"]
 *   button[aria-label="Submit"]  or  button[type="submit"]
 */

const COPILOT_INJECTOR_CONFIG = {
  inputSelector: 'cib-text-input textarea, #userInput, [contenteditable="true"]',
  sendButtonSelector: 'cib-button[type="submit"], button[aria-label="Submit"], button[type="submit"]',
  targetSite: "copilot",
};

async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      COPILOT_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(COPILOT_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    console.error("[Chat Handoff] Copilot injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: COPILOT_INJECTOR_CONFIG.targetSite,
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
