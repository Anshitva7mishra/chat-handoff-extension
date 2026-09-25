/**
 * storage/storage-schema.js
 *
 * EVERY chrome.storage read/write in this extension goes through this file.
 * Nothing else should call chrome.storage.local/sync directly — that's how
 * shape drift (one file expecting a field another file never writes) gets
 * introduced silently. Loaded as a plain script in background/popup/options
 * contexts (not a content script — chrome.storage.sync isn't needed on the
 * page itself).
 */

const MAX_HISTORY_ITEMS = 20;

const DEFAULT_SETTINGS = {
  autoSend: true,
  defaultTarget: "chatgpt",
};

// ---- sync storage (settings + templates: small, synced across devices) ----

async function getSettings() {
  const { settings } = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

async function saveSettings(partialSettings) {
  const current = await getSettings();
  const next = { ...current, ...partialSettings };
  await chrome.storage.sync.set({ settings: next });
  return next;
}

async function getTemplates() {
  const { leadInTemplates } = await chrome.storage.sync.get("leadInTemplates");
  return leadInTemplates || [];
}

async function saveTemplate(template) {
  const templates = await getTemplates();
  const withId = { ...template, id: template.id || crypto.randomUUID() };
  const next = [...templates.filter((t) => t.id !== withId.id), withId];

  try {
    await chrome.storage.sync.set({ leadInTemplates: next });
  } catch (err) {
    // chrome.storage.sync has a ~100KB total quota — surface a clear
    // error instead of failing silently if it's ever exceeded.
    throw new Error(
      `Could not save template — storage quota may be full. (${err.message})`
    );
  }

  return withId;
}

async function deleteTemplate(templateId) {
  const templates = await getTemplates();
  const next = templates.filter((t) => t.id !== templateId);
  await chrome.storage.sync.set({ leadInTemplates: next });
}

// ---- local storage (history + transient handoff payload: device-only) ----

async function getHistory() {
  const { handoffHistory } = await chrome.storage.local.get("handoffHistory");
  return handoffHistory || [];
}

async function addHistoryEntry(entry) {
  const history = await getHistory();
  const next = [{ ...entry, id: crypto.randomUUID(), createdAt: Date.now() }, ...history].slice(
    0,
    MAX_HISTORY_ITEMS // capped defensively — never grows unbounded
  );
  await chrome.storage.local.set({ handoffHistory: next });
}

async function clearHistory() {
  await chrome.storage.local.remove("handoffHistory");
}

// ---- transient handoff payload (cleared immediately after use) ----

async function setPendingHandoff(payload) {
  await chrome.storage.local.set({ pendingHandoff: payload });
}

async function takePendingHandoff() {
  const { pendingHandoff } = await chrome.storage.local.get("pendingHandoff");
  if (pendingHandoff) await chrome.storage.local.remove("pendingHandoff");
  return pendingHandoff || null;
}

// `self` resolves to `window` in page contexts (popup, options) and to the
// ServiceWorkerGlobalScope in the background worker — one assignment covers both.
const ChatHandoffStorage = {
  getSettings,
  saveSettings,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getHistory,
  addHistoryEntry,
  clearHistory,
  setPendingHandoff,
  takePendingHandoff,
};

self.ChatHandoffStorage = ChatHandoffStorage;

// Allow Node require() in unit tests.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ChatHandoffStorage };
}
