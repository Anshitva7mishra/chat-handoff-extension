/**
 * content-scripts/deepseek/injector.js
 * Pastes the pending handoff markdown into DeepSeek's input and optionally sends.
 *
 * SELECTORS — DeepSeek uses a textarea. Verify via DevTools:
 *   textarea#chat-input  or  textarea[placeholder]
 *   button[aria-label="Send"]  or  [data-testid="send-button"]
 */

const DEEPSEEK_INJECTOR_CONFIG = {
  inputSelector: 'textarea#chat-input, textarea[placeholder], #prompt-textarea',
  sendButtonSelector: 'button[aria-label="Send"], [data-testid="send-button"]',
  targetSite: "deepseek",
};

async function inject(payload, autoSend) {
  try {
    const inputEl = await window.ChatHandoffDom.waitForElement(
      DEEPSEEK_INJECTOR_CONFIG.inputSelector
    );
    window.ChatHandoffDom.insertTextIntoEditable(inputEl, payload.markdown);

    await new Promise((r) => setTimeout(r, 300));

    if (!autoSend) return;

    const sendBtn = document.querySelector(DEEPSEEK_INJECTOR_CONFIG.sendButtonSelector);
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      window.ChatHandoffDom.pressEnter(inputEl);
    }
  } catch (err) {
    console.error("[Chat Handoff] DeepSeek injection failed:", err.message);
  }
}

async function runPendingHandoffIfAny() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_HANDOFF",
      targetSite: DEEPSEEK_INJECTOR_CONFIG.targetSite,
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
