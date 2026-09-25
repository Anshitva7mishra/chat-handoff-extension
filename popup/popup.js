/**
 * popup/popup.js
 *
 * Thin orchestrator. All UI concerns are delegated to components/*.js.
 * All storage access goes through window.ChatHandoffStorage (loaded via
 * storage-schema.js script tag in popup.html).
 */

let currentTargetSite = null;
let currentSourceSite = null;
let currentTranscript = null;
let previewTeardown = null;

// ---- DOM references ---------------------------------------------------------

const pickStep = document.getElementById("step-pick");
const previewStep = document.getElementById("step-preview");
const resultEl = document.getElementById("result");
const leadInEl = document.getElementById("leadInBox");
const transcriptEl = document.getElementById("transcriptBox");
const templateSelectEl = document.getElementById("templateSelect");
const targetsEl = document.getElementById("targets");
const backBtn = document.getElementById("backBtn");
const sendBtn = document.getElementById("sendBtn");

// ---- Helpers ----------------------------------------------------------------

function showStep(step) {
  pickStep.classList.toggle("hidden", step !== "pick");
  previewStep.classList.toggle("hidden", step !== "preview");
}

function setStatus(text, isError = false) {
  resultEl.textContent = text;
  resultEl.classList.toggle("error", isError);
}

function detectSourceSite(url) {
  if (url.includes("claude.ai"))              return "claude";
  if (url.includes("chatgpt.com"))            return "chatgpt";
  if (url.includes("gemini.google.com"))      return "gemini";
  if (url.includes("perplexity.ai"))          return "perplexity";
  if (url.includes("chat.mistral.ai"))        return "mistral";
  if (url.includes("copilot.microsoft.com")) return "copilot";
  return null;
}

// ---- Flow handlers ----------------------------------------------------------

async function handlePickTarget(targetSite) {
  currentTargetSite = targetSite;
  setStatus("Reading conversation…");

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.runtime.sendMessage({
    type: "SCRAPE_FOR_PREVIEW",
    sourceTabId: activeTab.id,
  });

  if (!response?.ok) {
    setStatus(response?.error || "Something went wrong reading the conversation.", true);
    return;
  }

  currentTranscript = response.transcript;
  setStatus("");

  // Tear down previous preview listeners before re-initialising.
  if (previewTeardown) previewTeardown();
  previewTeardown = window.ChatHandoffComponents.initPreviewEditor({
    leadInEl,
    transcriptEl,
    backBtn,
    sendBtn,
    leadIn: response.leadIn,
    transcript: response.transcript,
    onBack: handleBack,
    onSend: handleSend,
  });

  showStep("preview");
}

function handleBack() {
  showStep("pick");
  setStatus("");
}

async function handleSend({ leadIn }) {
  setStatus("Sending…");

  const response = await chrome.runtime.sendMessage({
    type: "CONFIRM_HANDOFF",
    targetSite: currentTargetSite,
    sourceSite: currentSourceSite,
    leadIn,
    transcript: currentTranscript,
  });

  if (!response?.ok) {
    setStatus(response?.error || "Send failed.", true);
    return;
  }

  const SITE_LABELS = {
    claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini",
    perplexity: "Perplexity", mistral: "Mistral", copilot: "Copilot",
  };
  const label = SITE_LABELS[currentTargetSite] || currentTargetSite;
  setStatus(`Sent to ${label}.`);
}

// ---- Initialise -------------------------------------------------------------

async function init() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentSourceSite = detectSourceSite(activeTab.url || "");

  if (!currentSourceSite) {
    showStep(null); // hide both steps
    setStatus("Open a supported chatbot (Claude, ChatGPT, Gemini, Perplexity, Mistral, Copilot, or DeepSeek) to use this extension.", true);
    return;
  }

  window.ChatHandoffComponents.initPickTarget(targetsEl, currentSourceSite, handlePickTarget);
  await window.ChatHandoffComponents.initTemplatePicker(templateSelectEl, leadInEl);
}

document.getElementById("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
