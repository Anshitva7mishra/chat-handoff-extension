/**
 * popup/components/PreviewEditor.js
 *
 * Manages step 2: the editable lead-in textarea and the read-only
 * transcript preview, plus the Back / Send action buttons.
 */

/**
 * Populates the preview step with scraped data and wires the action buttons.
 *
 * @param {Object} opts
 * @param {HTMLTextAreaElement} opts.leadInEl
 * @param {HTMLTextAreaElement} opts.transcriptEl
 * @param {HTMLButtonElement}  opts.backBtn
 * @param {HTMLButtonElement}  opts.sendBtn
 * @param {string}             opts.leadIn      — pre-filled lead-in text
 * @param {string}             opts.transcript  — scraped transcript (read-only display)
 * @param {Function}           opts.onBack      — called when Back is clicked
 * @param {Function}           opts.onSend      — called with { leadIn, transcript }
 */
function initPreviewEditor({ leadInEl, transcriptEl, backBtn, sendBtn, leadIn, transcript, onBack, onSend }) {
  leadInEl.value = leadIn;
  transcriptEl.value = transcript;

  function handleBack() { onBack(); }
  function handleSend() { onSend({ leadIn: leadInEl.value, transcript }); }

  backBtn.addEventListener("click", handleBack);
  sendBtn.addEventListener("click", handleSend);

  // Return teardown so popup.js can remove listeners if the user goes back.
  return function teardown() {
    backBtn.removeEventListener("click", handleBack);
    sendBtn.removeEventListener("click", handleSend);
  };
}

window.ChatHandoffComponents = window.ChatHandoffComponents || {};
window.ChatHandoffComponents.initPreviewEditor = initPreviewEditor;
