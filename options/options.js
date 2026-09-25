"use strict";

/**
 * options/options.js
 *
 * All storage access goes through window.ChatHandoffStorage (loaded via
 * storage-schema.js in options.html). No direct chrome.storage calls here.
 */

const SITE_LABELS = {
  claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini",
  perplexity: "Perplexity", mistral: "Mistral", copilot: "Copilot",
};

async function loadSettings() {
  const settings = await window.ChatHandoffStorage.getSettings();
  document.getElementById("autoSend").checked = settings.autoSend;
  document.getElementById("defaultTarget").value = settings.defaultTarget;
}

async function saveSettings() {
  await window.ChatHandoffStorage.saveSettings({
    autoSend: document.getElementById("autoSend").checked,
    defaultTarget: document.getElementById("defaultTarget").value,
  });
}

async function loadTemplates() {
  const templates = await window.ChatHandoffStorage.getTemplates();
  const list = document.getElementById("templateList");
  list.innerHTML = "";

  if (templates.length === 0) {
    list.innerHTML = "<p class='empty-note'>No saved templates yet. Add one below.</p>";
    return;
  }

  templates.forEach((t) => {
    const row = document.createElement("div");
    row.className = "template-row";
    row.innerHTML = `
      <div class="template-info">
        <strong>${escapeHtml(t.name)}</strong>
        <p>${escapeHtml(t.text)}</p>
      </div>`;
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "btn-ghost-sm";
    del.addEventListener("click", () => deleteTemplate(t.id));
    row.appendChild(del);
    list.appendChild(row);
  });
}

async function addTemplate() {
  const name = document.getElementById("newTemplateName").value.trim();
  const text = document.getElementById("newTemplateText").value.trim();
  if (!name || !text) {
    alert("Both a name and lead-in text are required.");
    return;
  }

  try {
    await window.ChatHandoffStorage.saveTemplate({ name, text });
  } catch (err) {
    alert(err.message);
    return;
  }

  document.getElementById("newTemplateName").value = "";
  document.getElementById("newTemplateText").value = "";
  loadTemplates();
}

async function deleteTemplate(id) {
  await window.ChatHandoffStorage.deleteTemplate(id);
  loadTemplates();
}

async function loadHistory() {
  const history = await window.ChatHandoffStorage.getHistory();
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (history.length === 0) {
    list.innerHTML = "<p class='empty-note'>No handoffs yet.</p>";
    return;
  }

  history.forEach((h) => {
    const row = document.createElement("div");
    row.className = "history-row";
    const date = new Date(h.createdAt).toLocaleString();
    const srcLabel = SITE_LABELS[h.sourceSite] || h.sourceSite;
    const tgtLabel = SITE_LABELS[h.targetSite] || h.targetSite;
    row.innerHTML = `
      <span class="history-route">${escapeHtml(srcLabel)} to ${escapeHtml(tgtLabel)}</span>
      <span class="history-date">${escapeHtml(date)}</span>`;
    list.appendChild(row);
  });
}

async function clearHistory() {
  if (!confirm("Clear all handoff history?")) return;
  await window.ChatHandoffStorage.clearHistory();
  loadHistory();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

document.getElementById("autoSend").addEventListener("change", saveSettings);
document.getElementById("defaultTarget").addEventListener("change", saveSettings);
document.getElementById("addTemplateBtn").addEventListener("click", addTemplate);
document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);

loadSettings();
loadTemplates();
loadHistory();
