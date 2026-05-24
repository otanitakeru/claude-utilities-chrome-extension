const WIDE_DEFAULTS = { wideEnabled: true, width: 1000 };
const USAGE_DEFAULTS = { usageEnabled: true };
const VIEW_DEFAULTS = { viewMode: "graph" };
const DEFAULT_WIDTH = 1000;
const MIN_WIDTH = 650,
  MAX_WIDTH = 2000;
const WIDTH_STEP = 10;

const wideEnabledInput = document.getElementById("wideEnabled");
const widthRange = document.getElementById("widthRange");
const widthNumber = document.getElementById("widthNumber");
const resetWidthBtn = document.getElementById("resetWidth");
const usageEnabledInput = document.getElementById("usageEnabled");
const viewModeControl = document.getElementById("viewModeControl");
const viewBarBtn = document.getElementById("viewBar");
const viewGraphBtn = document.getElementById("viewGraph");

function readUsageEnabled(stored) {
  if (stored.usageEnabled !== undefined) return stored.usageEnabled;
  if (stored.barEnabled !== undefined) return stored.barEnabled;
  return true;
}

function snapWidth(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  const clamped = Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH);
  const steps = Math.round((clamped - MIN_WIDTH) / WIDTH_STEP);
  return MIN_WIDTH + steps * WIDTH_STEP;
}

function setWidth(value) {
  const w = snapWidth(value);
  widthRange.value = w;
  widthNumber.value = w;
}

async function notifyActiveTab(settings) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "CLAUDE_WIDE_CHAT_APPLY", ...settings })
    .catch(() => {});
}

async function sendToActiveTab(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
}

let wideDebounceTimer = null;
function saveWide() {
  const settings = {
    wideEnabled: wideEnabledInput.checked,
    width: snapWidth(widthRange.value),
    padding: 8,
  };
  chrome.storage.local.set(settings);
  if (wideDebounceTimer) clearTimeout(wideDebounceTimer);
  wideDebounceTimer = setTimeout(() => notifyActiveTab(settings), 250);
}

let usageDebounceTimer = null;
function saveUsage() {
  if (usageDebounceTimer) clearTimeout(usageDebounceTimer);
  usageDebounceTimer = setTimeout(async () => {
    const enabled = usageEnabledInput.checked;
    chrome.storage.local.set({ usageEnabled: enabled });
    viewModeControl.style.display = enabled ? "flex" : "none";
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    chrome.tabs
      .sendMessage(tab.id, { type: "CLAUDE_USAGE_TOGGLE", enabled })
      .catch(() => {});
  }, 150);
}

function updateViewBtns(mode) {
  viewBarBtn.classList.toggle("active", mode === "bar");
  viewGraphBtn.classList.toggle("active", mode === "graph");
}

function saveViewMode(mode) {
  chrome.storage.local.set({ viewMode: mode });
  updateViewBtns(mode);
  sendToActiveTab({ type: "CLAUDE_VIEW_MODE", viewMode: mode });
}

// 初期値読み込み
chrome.storage.local.get(
  { ...WIDE_DEFAULTS, ...USAGE_DEFAULTS, ...VIEW_DEFAULTS },
  (s) => {
    wideEnabledInput.checked = s.wideEnabled;
    setWidth(s.width);
    const usageOn = readUsageEnabled(s);
    usageEnabledInput.checked = usageOn;
    viewModeControl.style.display = usageOn ? "flex" : "none";
    updateViewBtns(s.viewMode ?? "graph");
  },
);

// スライダー操作 → number に反映
widthRange.addEventListener("input", () => {
  widthNumber.value = widthRange.value;
  saveWide();
});

// テキスト入力 → スライダーに反映（Enterまたはフォーカスアウト時）
function applyNumberInput() {
  const w = snapWidth(widthNumber.value);
  setWidth(w);
  saveWide();
}
widthNumber.addEventListener("change", applyNumberInput);
widthNumber.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyNumberInput();
});

// デフォルトに戻す
resetWidthBtn.addEventListener("click", () => {
  setWidth(DEFAULT_WIDTH);
  saveWide();
});

wideEnabledInput.addEventListener("change", saveWide);
usageEnabledInput.addEventListener("change", saveUsage);
viewBarBtn.addEventListener("click", () => saveViewMode("bar"));
viewGraphBtn.addEventListener("click", () => saveViewMode("graph"));
