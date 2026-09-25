/**
 * content-scripts/claude/injector.js
 * Pastes the pending handoff markdown into Claude's input and optionally sends.
 * Mirror of chatgpt/injector.js for the reverse direction.
 *
 * SELECTORS — verify via DevTools if injection stops working:
 *   [contenteditable="true"]  (the ProseMirror editor)
 *   button[aria-label="Send message"]
 */

const CLAUDE_INJECTOR_CONFIG = {
  inputSelector: '[contenteditable="true"]',
  sendButtonSelector: 'button[aria-label="Send message"]',
  targetSite: "claude",
};

/**
 * Inject markdown into the Claude input and optionally submit.
 *
 * @param {{ markdown: string }} payload
 * @param {boolean} autoSend
 */
async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      CLAUDE_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(CLAUDE_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    console.error("[Chat Handoff] Claude injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: CLAUDE_INJECTOR_CONFIG.targetSite,
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
