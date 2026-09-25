/**
 * content-scripts/chatgpt/injector.js
 * Pastes the pending handoff markdown into ChatGPT's input and optionally sends.
 *
 * SELECTORS — verify via DevTools if injection stops working:
 *   #prompt-textarea  (the ProseMirror contenteditable)
 *   [data-testid="send-button"]
 */

const CHATGPT_INJECTOR_CONFIG = {
  inputSelector: "#prompt-textarea",
  sendButtonSelector: '[data-testid="send-button"]',
  targetSite: "chatgpt",
};

/**
 * Inject markdown into the ChatGPT input and optionally submit.
 *
 * @param {{ markdown: string }} payload
 * @param {boolean} autoSend
 */
async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      CHATGPT_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    // Give React time to register the synthetic input before we attempt to send.
    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(CHATGPT_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    // The popup has already closed at this point — log so the user can share it
    // when reporting "it didn't work".
    console.error("[Chat Handoff] ChatGPT injection failed:", err.message);
  }
}

/**
 * Called on page load for the case where a new tab was opened.
 * Fetches the pending payload from the service worker (which owns storage)
 * rather than reading chrome.storage directly.
 */
async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: CHATGPT_INJECTOR_CONFIG.targetSite,
    });
  } catch {
    // Extension context unavailable (e.g., extension was reloaded mid-session).
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
