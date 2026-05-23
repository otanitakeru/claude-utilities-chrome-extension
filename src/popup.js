const WIDE_DEFAULTS = { wideEnabled: true, width: 1200 };
const BAR_DEFAULTS  = { barEnabled: true };
const DEFAULT_WIDTH = 1200;
const MIN_WIDTH = 800, MAX_WIDTH = 2000;

const wideEnabledInput = document.getElementById("wideEnabled");
const widthRange       = document.getElementById("widthRange");
const widthNumber      = document.getElementById("widthNumber");
const resetWidthBtn    = document.getElementById("resetWidth");
const barEnabledInput  = document.getElementById("barEnabled");

function clampWidth(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  return Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH);
}

function setWidth(value) {
  const w = clampWidth(value);
  widthRange.value  = w;
  widthNumber.value = w;
}

async function notifyActiveTab(settings) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "CLAUDE_WIDE_CHAT_APPLY", ...settings }).catch(() => {});
}

let wideDebounceTimer = null;
function saveWide() {
  const settings = {
    wideEnabled: wideEnabledInput.checked,
    width: clampWidth(widthRange.value),
    padding: 8
  };
  chrome.storage.sync.set(settings);
  if (wideDebounceTimer) clearTimeout(wideDebounceTimer);
  wideDebounceTimer = setTimeout(() => notifyActiveTab(settings), 150);
}

let barDebounceTimer = null;
function saveBar() {
  if (barDebounceTimer) clearTimeout(barDebounceTimer);
  barDebounceTimer = setTimeout(async () => {
    const enabled = barEnabledInput.checked;
    chrome.storage.sync.set({ barEnabled: enabled });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "CLAUDE_BAR_TOGGLE", enabled }).catch(() => {});
  }, 150);
}

// 初期値読み込み
chrome.storage.sync.get({ ...WIDE_DEFAULTS, ...BAR_DEFAULTS }, (s) => {
  wideEnabledInput.checked = s.wideEnabled;
  setWidth(s.width);
  barEnabledInput.checked = s.barEnabled;
});

// スライダー操作 → number に反映
widthRange.addEventListener("input", () => {
  widthNumber.value = widthRange.value;
  saveWide();
});

// テキスト入力 → スライダーに反映（Enterまたはフォーカスアウト時）
function applyNumberInput() {
  const w = clampWidth(widthNumber.value);
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
barEnabledInput.addEventListener("change", saveBar);
