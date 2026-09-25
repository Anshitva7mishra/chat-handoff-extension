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

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    // React overrides the value setter, so we must bypass it to trigger onChange
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // For contenteditable elements (Draft.js, ProseMirror, Lexical)
  document.execCommand("selectAll", false, null);
  document.execCommand("delete", false, null);

  // Modern frameworks intercept paste and update their state.
  // We fire paste first. If they cancel it (preventDefault), they handled it.
  const dataTransfer = new DataTransfer();
  dataTransfer.setData("text/plain", text);
  const pasteEvent = new ClipboardEvent("paste", {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
  });

  const pasteAllowed = el.dispatchEvent(pasteEvent);

  // If the framework didn't handle and cancel the paste, fall back to native execCommand
  if (pasteAllowed) {
    document.execCommand("insertText", false, text);
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

async function clickSendButton(selector, fallbackInputEl) {
  const start = Date.now();
  let clicked = false;
  
  while (Date.now() - start < 2000) {
    const btn = document.querySelector(selector);
    const disabled = !btn || btn.disabled || btn.getAttribute("aria-disabled") === "true" || btn.getAttribute("data-disabled") === "true";
    if (btn && !disabled) {
      btn.click();
      clicked = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!clicked && fallbackInputEl) {
    pressEnter(fallbackInputEl);
  }
}

window.ChatHandoffDom = { waitForElement, insertTextIntoEditable, pressEnter, clickSendButton };
