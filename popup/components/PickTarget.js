/**
 * popup/components/PickTarget.js
 *
 * Manages step 1: shows target-site buttons and hides the one
 * matching the current source site.
 */

/**
 * @param {Element}  targetsEl  - the #targets container
 * @param {string}   sourceSite - key of the site the user is currently on
 * @param {Function} onPick     - called with the chosen target site key
 * @returns {Function} teardown - removes event listeners
 */
function initPickTarget(targetsEl, sourceSite, onPick) {
  Array.from(targetsEl.querySelectorAll("button[data-target]")).forEach((btn) => {
    if (btn.dataset.target === sourceSite) btn.classList.add("hidden");
  });

  function handleClick(evt) {
    const btn = evt.target.closest("button[data-target]");
    if (!btn) return;
    onPick(btn.dataset.target);
  }

  targetsEl.addEventListener("click", handleClick);
  return () => targetsEl.removeEventListener("click", handleClick);
}

window.ChatHandoffComponents = window.ChatHandoffComponents || {};
window.ChatHandoffComponents.initPickTarget = initPickTarget;
