// 定数・ユーティリティは shared/constants.js と shared/i18n.js から読み込み済み

// ── ステータス表示 ──────────────────────────────────────
function getStatusColor(status) {
  const colors = {
    operational: "#22c55e",
    degraded_performance: "#f59e0b",
    partial_outage: "#f97316",
    major_outage: "#ef4444",
  };
  return colors[status] ?? "#9ca3af";
}

function getStatusLabel(status) {
  const labels = {
    operational: "Operational",
    degraded_performance: "Degraded Performance",
    partial_outage: "Partial Outage",
    major_outage: "Major Outage",
  };
  return labels[status] ?? "—";
}

function renderStatus() {
  chrome.storage.local.get(
    ["claudeStatus", "claudeHasIncident", "claudeLatestIncident"],
    (result) => {
      const status = result.claudeStatus ?? "unknown";
      const hasIncident = result.claudeHasIncident ?? false;
      const incident = result.claudeLatestIncident ?? null;

      const dot = document.getElementById("statusDot");
      const text = document.getElementById("statusText");
      const incidentEl = document.getElementById("statusIncident");
      const incidentLink = document.getElementById("statusIncidentLink");

      if (dot) {
        dot.style.background = getStatusColor(status);
        dot.classList.toggle(
          "status-dot--issue",
          status !== "operational" && status !== "unknown",
        );
      }
      if (text) text.textContent = getStatusLabel(status);
      if (incidentEl && incidentLink) {
        if (hasIncident && incident) {
          incidentEl.hidden = false;
          incidentLink.textContent = incident.name;
          incidentLink.href = incident.shortlink ?? "#";
        } else {
          incidentEl.hidden = true;
        }
      }
    },
  );
}

const wideEnabledInput = document.getElementById("wideEnabled");
const widthRange = document.getElementById("widthRange");
const widthNumber = document.getElementById("widthNumber");
const resetWidthBtn = document.getElementById("resetWidth");
const chatWidthSection = document.getElementById("chatWidthSection");
const sidebarEnabledInput = document.getElementById("sidebarEnabled");
const usageSection = document.getElementById("usageSection");
const usageEnabledInput = document.getElementById("usageEnabled");
const viewModeControl = document.getElementById("viewModeControl");
const viewBarBtn = document.getElementById("viewBar");
const viewGraphBtn = document.getElementById("viewGraph");
const viewMiniBtn = document.getElementById("viewMini");
const langSelect = document.getElementById("langSelect");
const pageNotice = document.getElementById("pageNotice");
const pageNoticeText = document.getElementById("pageNoticeText");
const mainPanel = document.getElementById("mainPanel");
const popupFooter = document.getElementById("popupFooter");

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

function updatePageNotice(tab) {
  const ctx = getPageContext(tab?.url ?? "");
  const isChat = ctx === "chat";
  const isClaude = isChat || ctx === "claude";

  pageNotice.hidden = isClaude;
  mainPanel.hidden = !isClaude;
  popupFooter.hidden = !isClaude;

  // チャット画面専用セクションの表示切り替え
  chatWidthSection.hidden = !isChat;
  usageSection.hidden = !isChat;

  if (!isClaude) {
    const messages = {
      "not-claude": t("noticeNotClaude"),
      unknown: t("noticeUnknown"),
    };
    pageNoticeText.textContent = messages[ctx] ?? messages.unknown;
  }
}

async function refreshPageNotice() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  updatePageNotice(tab);
}

function setWidth(value) {
  const w = snapWidth(value);
  widthRange.value = w;
  widthNumber.value = w;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function notifyActiveTab(settings) {
  const tab = await getActiveTab();
  if (!tab?.id || !isAllowedClaudePage(tab.url ?? "")) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "CLAUDE_WIDE_CHAT_APPLY", ...settings })
    .catch(() => {});
}

async function sendToActiveTab(msg) {
  const tab = await getActiveTab();
  if (!tab?.id || !isAllowedClaudePage(tab.url ?? "")) return;
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

let sidebarDebounceTimer = null;
function saveSidebar() {
  const settings = { sidebarEnabled: sidebarEnabledInput.checked };
  chrome.storage.local.set(settings);
  if (sidebarDebounceTimer) clearTimeout(sidebarDebounceTimer);
  sidebarDebounceTimer = setTimeout(async () => {
    const tab = await getActiveTab();
    if (!tab?.id || !isClaudeHost(tab.url ?? "")) return;
    chrome.tabs
      .sendMessage(tab.id, { type: "CLAUDE_SIDEBAR_APPLY", ...settings })
      .catch(() => {});
  }, 250);
}

let usageDebounceTimer = null;
function saveUsage() {
  if (usageDebounceTimer) clearTimeout(usageDebounceTimer);
  usageDebounceTimer = setTimeout(async () => {
    const enabled = usageEnabledInput.checked;
    chrome.storage.local.set({ usageEnabled: enabled });
    viewModeControl.style.display = enabled ? "flex" : "none";
    const tab = await getActiveTab();
    if (!tab?.id || !isAllowedClaudePage(tab.url ?? "")) return;
    chrome.tabs
      .sendMessage(tab.id, { type: "CLAUDE_USAGE_TOGGLE", enabled })
      .catch(() => {});
  }, 150);
}

function updateViewBtns(mode) {
  viewBarBtn.classList.toggle("active", mode === "bar");
  viewGraphBtn.classList.toggle("active", mode === "graph");
  viewMiniBtn.classList.toggle("active", mode === "mini");
}

function saveViewMode(mode) {
  chrome.storage.local.set({ viewMode: mode });
  updateViewBtns(mode);
  sendToActiveTab({ type: "CLAUDE_VIEW_MODE", viewMode: mode });
}

function saveLang(lang) {
  currentLang = lang;
  chrome.storage.local.set({ lang });
  applyI18n();
  refreshPageNotice();
  sendToActiveTab({ type: "CLAUDE_LANG_CHANGE", lang });
}

// 初期値読み込み
chrome.storage.local.get(
  {
    ...WIDE_DEFAULTS,
    ...SIDEBAR_DEFAULTS,
    ...USAGE_DEFAULTS,
    ...VIEW_DEFAULTS,
    ...LANG_DEFAULTS,
  },
  (s) => {
    wideEnabledInput.checked = s.wideEnabled;
    setWidth(s.width);
    sidebarEnabledInput.checked = s.sidebarEnabled ?? false;
    const usageOn = readUsageEnabled(s);
    usageEnabledInput.checked = usageOn;
    viewModeControl.style.display = usageOn ? "flex" : "none";
    updateViewBtns(s.viewMode ?? "graph");
    currentLang = s.lang ?? "en";
    langSelect.value = currentLang;
    applyI18n();
    refreshPageNotice();
    renderStatus();
  },
);

widthRange.addEventListener("input", () => {
  widthNumber.value = widthRange.value;
  saveWide();
});

function applyNumberInput() {
  const w = snapWidth(widthNumber.value);
  setWidth(w);
  saveWide();
}
widthNumber.addEventListener("change", applyNumberInput);
widthNumber.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyNumberInput();
});

resetWidthBtn.addEventListener("click", () => {
  setWidth(WIDE_DEFAULTS.width);
  saveWide();
});

wideEnabledInput.addEventListener("change", saveWide);

sidebarEnabledInput.addEventListener("change", saveSidebar);

usageEnabledInput.addEventListener("change", saveUsage);
viewBarBtn.addEventListener("click", () => saveViewMode("bar"));
viewGraphBtn.addEventListener("click", () => saveViewMode("graph"));
viewMiniBtn.addEventListener("click", () => saveViewMode("mini"));
langSelect.addEventListener("change", () => saveLang(langSelect.value));
