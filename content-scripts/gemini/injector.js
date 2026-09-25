/**
 * content-scripts/gemini/injector.js
 * Pastes the pending handoff markdown into Gemini's input and optionally sends.
 *
 * SELECTORS — Gemini uses a custom rich-textarea web component. Verify via DevTools:
 *   rich-textarea div[contenteditable="true"]  (the editable region inside rich-textarea)
 *   button.send-button  or  button[aria-label="Send message"]
 */

const GEMINI_INJECTOR_CONFIG = {
  // Gemini's input is a contenteditable paragraph inside the rich-textarea custom element.
  inputSelector: 'rich-textarea div[contenteditable="true"], .input-area [contenteditable="true"]',
  sendButtonSelector: '.send-button, button[aria-label="Send message"]',
  targetSite: "gemini",
};

async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      GEMINI_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(GEMINI_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    console.error("[Chat Handoff] Gemini injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: GEMINI_INJECTOR_CONFIG.targetSite,
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
