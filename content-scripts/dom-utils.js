/**
 * content-scripts/dom-utils.js
 *
 * Shared DOM helpers loaded on every supported site.
 *
 * waitForElement — SPAs load elements asynchronously; poll rather than
 *   assume the element exists at document_idle.
 *
 * insertTextIntoEditable — React/Vue controlled inputs ignore direct .value
 *   assignment. Insert text the way a real user paste does so the framework
 *   registers the change.
 */

function waitForElement(selector, timeoutMs = 15000, pollMs = 250) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timed out waiting for "${selector}" — the site's DOM may have changed.`));
      }
      setTimeout(check, pollMs);
    };
    check();
  });
}

function insertTextIntoEditable(el, text) {
  el.focus();
  document.execCommand("selectAll", false, null);
  document.execCommand("delete", false, null);

  const inserted = document.execCommand("insertText", false, text);

  if (!inserted) {
    // execCommand is deprecated in some browsers; fall back to a synthetic paste event.
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", text);
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true, cancelable: true })
    );
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function pressEnter(el) {
  ["keydown", "keypress", "keyup"].forEach((type) => {
    el.dispatchEvent(
      new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })
    );
  });
}

window.ChatHandoffDom = { waitForElement, insertTextIntoEditable, pressEnter };
