/**
 * popup/components/TemplatePicker.js
 *
 * Manages the "Use template ▾" dropdown in the preview step.
 * Loaded after storage-schema.js (window.ChatHandoffStorage is available).
 */

/**
 * Populates the template <select> from chrome.storage.sync.
 * Wires the change event to overwrite the lead-in textarea.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {HTMLTextAreaElement} leadInEl
 */
async function initTemplatePicker(selectEl, leadInEl) {
  try {
    const templates = await window.ChatHandoffStorage.getTemplates();
    templates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.text;
      opt.textContent = t.name;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.warn("[Chat Handoff] Could not load templates:", err.message);
  }

  selectEl.addEventListener("change", () => {
    if (selectEl.value) {
      leadInEl.value = selectEl.value;
      // Reset select back to placeholder so picking the same template again still fires change.
      selectEl.value = "";
    }
  });
}

window.ChatHandoffComponents = window.ChatHandoffComponents || {};
window.ChatHandoffComponents.initTemplatePicker = initTemplatePicker;
