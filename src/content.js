// ════════════════════════════════════════════════════════
//  Claude Utilities — content script
//  ① 使用量バー  ② チャット幅調整
// ════════════════════════════════════════════════════════

// ── Extension context 管理 ───────────────────────────────
let contextInvalidated = false;

function invalidateContext() {
  if (contextInvalidated) return;
  contextInvalidated = true;
  console.log(
    "[UsageBar] Extension context invalidated, stopping all observers.",
  );
  try {
    stopBtnObserver?.disconnect();
  } catch (_) {}
  try {
    spaObserver?.disconnect();
  } catch (_) {}
}

function safeChromeCall(fn, label = "unknown") {
  if (contextInvalidated) return;
  try {
    fn();
  } catch (e) {
    if (
      e?.message?.includes("Extension context invalidated") ||
      e?.message?.includes("Cannot read properties of undefined")
    ) {
      console.log(`[UsageBar] Context invalidated at: ${label}`);
      invalidateContext();
    } else {
      console.error(`[UsageBar] Chrome error at ${label}:`, e?.message);
    }
  }
}

// ════════════════════════════════════════════════════════
//  ① チャット幅調整
// ════════════════════════════════════════════════════════
const STYLE_ID = "claude-wide-chat-style";
const WIDE_DEFAULTS = { wideEnabled: true, width: 1200, padding: 8 };

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function buildWideCss(enabled, width, padding) {
  const w = clampNumber(width, WIDE_DEFAULTS.width, 800, 2000);
  const p = clampNumber(padding, WIDE_DEFAULTS.padding, 0, 80);
  if (!enabled) return `:root { --cw-width: initial; --cw-padding: 0px; }`;
  return `
    :root {
      --cw-width:   min(${w}px, calc(100vw - 96px));
      --cw-padding: ${p}px;
    }
    body.chat-ui-core .max-w-3xl,
    body.chat-ui-core [class~="max-w-3xl"],
    body.chat-ui-core [data-autoscroll-container] .max-w-3xl,
    body.chat-ui-core [data-autoscroll-container] [class~="max-w-3xl"] {
      max-width: var(--cw-width) !important;
      box-sizing: border-box !important;
    }
    body.chat-ui-core [data-autoscroll-container] .max-w-3xl,
    body.chat-ui-core [data-autoscroll-container] [class~="max-w-3xl"],
    body.chat-ui-core [role="main"] .max-w-3xl,
    body.chat-ui-core [role="main"] [class~="max-w-3xl"] {
      padding-left:  var(--cw-padding) !important;
      padding-right: var(--cw-padding) !important;
    }
    body.chat-ui-core [data-user-message-bubble="true"] {
      max-width: min(92%, calc(var(--cw-width) - (var(--cw-padding) * 2))) !important;
    }
    body.chat-ui-core form .max-w-3xl,
    body.chat-ui-core form [class~="max-w-3xl"],
    body.chat-ui-core footer .max-w-3xl,
    body.chat-ui-core footer [class~="max-w-3xl"],
    body.chat-ui-core [role="main"] .max-w-3xl,
    body.chat-ui-core [role="main"] [class~="max-w-3xl"] {
      max-width: var(--cw-width) !important;
    }
  `;
}

function applyWideSettings(s) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = buildWideCss(
    s.wideEnabled ?? WIDE_DEFAULTS.wideEnabled,
    s.width ?? WIDE_DEFAULTS.width,
    s.padding ?? WIDE_DEFAULTS.padding,
  );
}

safeChromeCall(() => {
  chrome.storage.local.get(WIDE_DEFAULTS, applyWideSettings);
}, "wide.init");

safeChromeCall(() => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (!changes.wideEnabled && !changes.width && !changes.padding) return;
    safeChromeCall(
      () => chrome.storage.local.get(WIDE_DEFAULTS, applyWideSettings),
      "wide.onChanged",
    );
  });
}, "wide.onChanged.listen");

// ════════════════════════════════════════════════════════
//  ② 使用量バー
// ════════════════════════════════════════════════════════
const BAR_ID = "claude-usage-bar-root";
const BAR_DEFAULTS = { barEnabled: true };

let barEnabled = true;

function getColor(utilization) {
  return 100 - (utilization ?? 100) < 10 ? "#E53E3E" : "#D97757";
}
function formatPct(pct) {
  return pct === null ? "---" : Math.round(pct) + "%";
}
function formatResetsAtRelative(isoStr) {
  if (!isoStr) return null;
  const diffMs = new Date(isoStr) - Date.now();
  if (diffMs <= 0) return "まもなくリセット";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h > 0 ? `${h}時間${m}分後にリセット` : `${m}分後にリセット`;
}
function formatResetsAtWeekday(isoStr) {
  if (!isoStr) return null;
  const weekdays = [
    "日曜日",
    "月曜日",
    "火曜日",
    "水曜日",
    "木曜日",
    "金曜日",
    "土曜日",
  ];
  return `${weekdays[new Date(isoStr).getDay()]}にリセット`;
}
function formatCredit(raw) {
  return "$" + (raw / 100).toFixed(2);
}

function buildInnerHTML(data) {
  const sessionPct = data?.session ?? null;
  const weeklyPct = data?.weekly ?? null;
  const sessionReset = formatResetsAtRelative(data?.sessionResetsAt);
  const weeklyReset = formatResetsAtWeekday(data?.weeklyResetsAt);
  const extra = data?.extraUsage;
  const sc = getColor(sessionPct),
    wc = getColor(weeklyPct);

  const extraHTML = extra
    ? (() => {
        const ec = getColor(extra.utilization);
        return `<div class="cub-row">
      <span class="cub-label">追加枠</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(extra.utilization, 100)}%;background:${ec}"></div></div>
      <span class="cub-pct" style="color:${ec}">${Math.round(extra.utilization)}%</span>
      <span class="cub-sub">${formatCredit(extra.used_credits)}/${formatCredit(extra.monthly_limit)}</span>
    </div>`;
      })()
    : "";

  return `<div class="cub-inner">
    <div class="cub-row">
      <span class="cub-label">5時間枠</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(sessionPct ?? 0, 100)}%;background:${sc}"></div></div>
      <span class="cub-pct" style="color:${sc}">${formatPct(sessionPct)}</span>
      ${sessionReset ? `<span class="cub-sub">${sessionReset}</span>` : ""}
    </div>
    <div class="cub-row">
      <span class="cub-label">週間枠</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(weeklyPct ?? 0, 100)}%;background:${wc}"></div></div>
      <span class="cub-pct" style="color:${wc}">${formatPct(weeklyPct)}</span>
      ${weeklyReset ? `<span class="cub-sub">${weeklyReset}</span>` : ""}
    </div>
    ${extraHTML}
    <div class="cub-actions">
      <span class="cub-updated" id="cub-updated-time"></span>
      <span class="cub-refreshing" id="cub-refreshing" style="display:none">更新中…</span>
      <button class="cub-refresh-btn" id="cub-refresh-btn">↻ 更新</button>
    </div>
  </div>`;
}

function removeBar() {
  document.getElementById(BAR_ID)?.remove();
}

function mountBar(data) {
  if (!barEnabled) {
    removeBar();
    return true;
  }
  const target = findInsertTarget();
  if (!target) return false;
  const existing = document.getElementById(BAR_ID);
  if (existing) {
    existing.innerHTML = buildInnerHTML(data);
  } else {
    const bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.innerHTML = buildInnerHTML(data);
    target.parentElement?.insertBefore(bar, target) || target.before(bar);
  }
  attachRefreshBtn();
  return true;
}

function attachRefreshBtn() {
  const btn = document.getElementById("cub-refresh-btn");
  if (!btn) return;
  btn.addEventListener("click", () => triggerRefresh("manual"));
}

function showRefreshing(show) {
  const el = document.getElementById("cub-refreshing");
  const btn = document.getElementById("cub-refresh-btn");
  if (el) el.style.display = show ? "inline" : "none";
  if (btn) btn.style.display = show ? "none" : "inline";
}

function updateTimestamp(lastUpdated) {
  const el = document.getElementById("cub-updated-time");
  if (!el || !lastUpdated) return;
  const d = new Date(lastUpdated);
  el.textContent = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} 更新`;
}

function findInsertTarget() {
  for (const sel of [
    "fieldset",
    '[data-testid="composer"]',
    "form",
    ".composer",
  ]) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function loadAndRender() {
  safeChromeCall(() => {
    chrome.storage.local.get(["usageData", "lastUpdated"], (result) => {
      if (contextInvalidated || !result) return;
      if (!mountBar(result.usageData ?? null)) {
        setTimeout(loadAndRender, 1000);
        return;
      }
      updateTimestamp(result.lastUpdated);
    });
  }, "loadAndRender");
}

function sendMessageSafe(msg, callback) {
  safeChromeCall(() => {
    chrome.runtime.sendMessage({ type: "PING" }, () => {
      void chrome.runtime.lastError;
      safeChromeCall(() => {
        chrome.runtime.sendMessage(msg, (response) => {
          void chrome.runtime.lastError;
          callback?.(response);
        });
      }, "sendMessage");
    });
  }, "sendPing");
  if (contextInvalidated) callback?.();
}

let refreshTimer = null;
function triggerRefresh(reason, delayMs = 0) {
  if (contextInvalidated) return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (contextInvalidated) return;
    showRefreshing(true);
    sendMessageSafe({ type: "REFRESH_USAGE" }, () => {
      loadAndRender();
      showRefreshing(false);
      refreshTimer = null;
    });
  }, delayMs);
}

const STOP_BTN_PATH_PREFIX = "M128,20A108,108";

function findStopButton() {
  for (const btn of document.querySelectorAll("button")) {
    const path = btn.querySelector("svg path")?.getAttribute("d") ?? "";
    if (path.startsWith(STOP_BTN_PATH_PREFIX)) return btn;
  }
  return null;
}

let wasGenerating = false;

const stopBtnObserver = new MutationObserver(() => {
  if (contextInvalidated) return;
  const isGenerating = !!findStopButton();
  if (wasGenerating && !isGenerating) triggerRefresh("stop-button-gone", 1500);
  wasGenerating = isGenerating;
  if (barEnabled && !document.getElementById(BAR_ID))
    setTimeout(loadAndRender, 500);
});
stopBtnObserver.observe(document.body, { childList: true, subtree: true });

let lastPath = location.pathname;
const spaObserver = new MutationObserver(() => {
  if (contextInvalidated) return;
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    wasGenerating = false;
    setTimeout(loadAndRender, 800);
  }
});
spaObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener("visibilitychange", () => {
  if (contextInvalidated) return;
  if (document.hidden) {
    stopBtnObserver.disconnect();
  } else {
    stopBtnObserver.observe(document.body, { childList: true, subtree: true });
    loadAndRender();
  }
});

safeChromeCall(() => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    safeChromeCall(() => {
      chrome.storage.local.get(["usageData", "lastUpdated"], (result) => {
        if (contextInvalidated || !result) return;
        mountBar(result.usageData ?? null);
        updateTimestamp(result.lastUpdated);
      });
    }, "onChanged.get");
  });
}, "onChanged.listen");

// ── メッセージ受信（popup → content） ───────────────────
chrome.runtime.onMessage.addListener((msg) => {
  // 幅調整
  if (msg?.type === "CLAUDE_WIDE_CHAT_APPLY") {
    applyWideSettings(msg);
  }
  // バー ON/OFF
  if (msg?.type === "CLAUDE_BAR_TOGGLE") {
    barEnabled = !!msg.enabled;
    if (!barEnabled) {
      removeBar();
    } else {
      loadAndRender();
    }
  }
});

// ── 初期化 ───────────────────────────────────────────────
safeChromeCall(() => {
  chrome.storage.local.get(BAR_DEFAULTS, (s) => {
    barEnabled = s.barEnabled ?? true;
    loadAndRender();
  });
}, "bar.init");
