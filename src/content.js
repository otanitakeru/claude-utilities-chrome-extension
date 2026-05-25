// ════════════════════════════════════════════════════════
//  Claude Utilities — content script
//  ① 使用量表示  ② チャット幅調整
// ════════════════════════════════════════════════════════

// ── Extension context 管理 ───────────────────────────────
let contextInvalidated = false;

function invalidateContext() {
  if (contextInvalidated) return;
  contextInvalidated = true;
  console.log(
    "[ClaudeUsage] Extension context invalidated, stopping all observers.",
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
      console.log(`[ClaudeUsage] Context invalidated at: ${label}`);
      invalidateContext();
    } else {
      console.error(`[ClaudeUsage] Chrome error at ${label}:`, e?.message);
    }
  }
}

function isAllowedPage() {
  return isAllowedClaudePage(location.href);
}

function removeWideStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

// ════════════════════════════════════════════════════════
//  ① チャット幅調整
// ════════════════════════════════════════════════════════
const STYLE_ID = "claude-wide-chat-style";
const WIDE_DEFAULTS = { wideEnabled: true, width: 1000, padding: 8 };
const WIDE_MIN_WIDTH = 650;
const WIDE_MAX_WIDTH = 2000;
const WIDE_WIDTH_STEP = 10;

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function snapWideWidth(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return WIDE_DEFAULTS.width;
  const clamped = Math.min(Math.max(n, WIDE_MIN_WIDTH), WIDE_MAX_WIDTH);
  const steps = Math.round((clamped - WIDE_MIN_WIDTH) / WIDE_WIDTH_STEP);
  return WIDE_MIN_WIDTH + steps * WIDE_WIDTH_STEP;
}

function buildWideCss(enabled, width, padding) {
  const w = snapWideWidth(width ?? WIDE_DEFAULTS.width);
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
  if (!isAllowedPage()) {
    removeWideStyle();
    return;
  }
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

// ════════════════════════════════════════════════════════
//  ② 使用量表示
// ════════════════════════════════════════════════════════
const USAGE_ROOT_ID = "claude-usage-root";
const USAGE_DEFAULTS = { usageEnabled: true };

let usageEnabled = true;
let viewMode = "graph";

function readUsageEnabled(stored) {
  return stored.usageEnabled ?? true;
}

function getColor(utilization) {
  return 100 - (utilization ?? 100) < 10 ? "#E53E3E" : "#D97757";
}
function formatPct(pct) {
  return pct === null ? "---" : Math.round(pct) + "%";
}
function formatResetsAtRelative(isoStr) {
  if (!isoStr) return null;
  const diffMs = new Date(isoStr) - Date.now();
  if (diffMs <= 0) return "まもなく";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (m === 0) return "まもなく";
  return h > 0 ? `${h}時間${m}分後` : `${m}分後`;
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
  return `${weekdays[new Date(isoStr).getDay()]}`;
}
function formatCredit(raw) {
  return "$" + (raw / 100).toFixed(2);
}

function buildBarHTML(data) {
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
      <span class="cub-sub">${formatCredit(extra.used_credits)} / ${formatCredit(extra.monthly_limit)}</span>
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

function buildDonutSVG(pct, color) {
  const r = 25,
    cx = 40,
    cy = 40;
  const circ = 2 * Math.PI * r;
  const pctVal = pct !== null ? Math.min(Math.max(pct, 0), 100) : 0;
  const filled = (circ * pctVal) / 100;
  const gap = circ - filled;
  const pctLabel = pct === null ? "---" : Math.round(pct) + "%";
  const hasArc = pct !== null && pct > 0;

  return `<svg class="cug-svg" viewBox="0 0 80 80" width="70" height="70">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="5"/>
    ${
      hasArc
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="5"
      stroke-dasharray="${filled.toFixed(2)} ${gap.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>`
        : ""
    }
    <text x="${cx}" y="${cy + 1.5}" text-anchor="middle" dominant-baseline="middle"
      fill="${color}" font-size="14" font-weight="700" font-family="-apple-system,sans-serif">${pctLabel}</text>
  </svg>`;
}

function buildGraphHTML(data) {
  const sessionPct = data?.session ?? null;
  const weeklyPct = data?.weekly ?? null;
  const extra = data?.extraUsage;
  const sc = getColor(sessionPct);
  const wc = getColor(weeklyPct);

  const items = [
    {
      pct: sessionPct,
      reset: formatResetsAtRelative(data?.sessionResetsAt),
      color: sc,
    },
    {
      pct: weeklyPct,
      reset: formatResetsAtWeekday(data?.weeklyResetsAt),
      color: wc,
    },
  ];

  if (extra) {
    const ec = getColor(extra.utilization);
    items.push({
      pct: extra.utilization,
      reset: `${formatCredit(extra.used_credits)} / ${formatCredit(extra.monthly_limit)}`,
      color: ec,
    });
  }

  const circles = items
    .map(
      ({ pct, reset, color }) => `<div class="cug-item">
      ${buildDonutSVG(pct, color)}
      ${reset ? `<div class="cug-reset">${reset}</div>` : ""}
    </div>`,
    )
    .join("");

  return `<div class="cub-inner cub-inner--graph">
    <div class="cug-stage">
      <div class="cug-side cug-side--left" aria-hidden="true"></div>
      <div class="cug-container">${circles}</div>
      <div class="cug-side cug-side--right">
        <div class="cub-actions cub-actions--graph">
          <span class="cub-updated" id="cub-updated-time"></span>
          <span class="cub-refreshing" id="cub-refreshing" style="display:none">更新中…</span>
          <button class="cub-refresh-btn" id="cub-refresh-btn">↻ 更新</button>
        </div>
      </div>
    </div>
  </div>`;
}

function buildInnerHTML(data) {
  return viewMode === "graph" ? buildGraphHTML(data) : buildBarHTML(data);
}

function removeUsage() {
  document.getElementById(USAGE_ROOT_ID)?.remove();
}

function applyUsageRootBackground(root) {
  const composer = document.querySelector('[data-testid="composer"]');
  let el = composer;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      root.style.backgroundColor = bg;
      return;
    }
    el = el.parentElement;
  }
  for (const fallback of [document.querySelector("main"), document.body]) {
    if (!fallback) continue;
    const bg = getComputedStyle(fallback).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      root.style.backgroundColor = bg;
      return;
    }
  }
}

function mountUsage(data) {
  if (!isAllowedPage() || !usageEnabled || !data) {
    removeUsage();
    return true;
  }
  const target = findInsertTarget();
  if (!target) return false;
  const existing = document.getElementById(USAGE_ROOT_ID);
  let root = existing;
  if (existing) {
    existing.innerHTML = buildInnerHTML(data);
  } else {
    root = document.createElement("div");
    root.id = USAGE_ROOT_ID;
    root.innerHTML = buildInnerHTML(data);
    target.parentElement?.insertBefore(root, target) || target.before(root);
  }
  applyUsageRootBackground(root);
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
  if (!isAllowedPage()) {
    removeUsage();
    return;
  }
  safeChromeCall(() => {
    chrome.storage.local.get(["usageData", "lastUpdated"], (result) => {
      if (contextInvalidated || !result) return;
      if (!findInsertTarget()) {
        removeUsage();
        return;
      }
      if (!mountUsage(result.usageData ?? null)) {
        setTimeout(loadAndRender, 1000);
        return;
      }
      updateTimestamp(result.lastUpdated);
    });
  }, "loadAndRender");
}

function sendMessageSafe(msg, callback) {
  safeChromeCall(() => {
    chrome.runtime.sendMessage(msg, (response) => {
      void chrome.runtime.lastError;
      callback?.(response);
    });
  }, "sendMessage");
  if (contextInvalidated) callback?.();
}

let refreshTimer = null;
function triggerRefresh(reason, delayMs = 0) {
  if (contextInvalidated || !isAllowedPage()) return;
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
  if (
    isAllowedPage() &&
    usageEnabled &&
    !document.getElementById(USAGE_ROOT_ID)
  )
    setTimeout(loadAndRender, 500);
});
stopBtnObserver.observe(document.body, { childList: true, subtree: true });

let lastPath = location.pathname;
const spaObserver = new MutationObserver(() => {
  if (contextInvalidated) return;
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    wasGenerating = false;
    if (!isAllowedPage()) {
      removeUsage();
      removeWideStyle();
      return;
    }
    safeChromeCall(() => {
      chrome.storage.local.get(WIDE_DEFAULTS, applyWideSettings);
    }, "wide.spa");
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
    if (isAllowedPage()) {
      safeChromeCall(() => {
        chrome.storage.local.get(WIDE_DEFAULTS, applyWideSettings);
      }, "wide.visibility");
      loadAndRender();
    } else {
      removeUsage();
      removeWideStyle();
    }
  }
});

safeChromeCall(() => {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.viewMode) viewMode = changes.viewMode.newValue ?? "graph";
    if (changes.usageEnabled)
      usageEnabled = changes.usageEnabled.newValue ?? true;
    safeChromeCall(() => {
      chrome.storage.local.get(["usageData", "lastUpdated"], (result) => {
        if (contextInvalidated || !result) return;
        if (!isAllowedPage()) {
          removeUsage();
          return;
        }
        mountUsage(result.usageData ?? null);
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
  // 使用量表示 ON/OFF
  if (msg?.type === "CLAUDE_USAGE_TOGGLE") {
    usageEnabled = !!msg.enabled;
    if (!usageEnabled) {
      removeUsage();
    } else {
      loadAndRender();
    }
  }
  // 表示モード切替
  if (msg?.type === "CLAUDE_VIEW_MODE") {
    viewMode = msg.viewMode ?? "graph";
    loadAndRender();
  }
});

// ── 初期化 ───────────────────────────────────────────────
safeChromeCall(() => {
  chrome.storage.local.get({ ...USAGE_DEFAULTS, viewMode: "graph" }, (s) => {
    usageEnabled = readUsageEnabled(s);
    viewMode = s.viewMode ?? "graph";
    if (!isAllowedPage()) {
      removeUsage();
      return;
    }
    loadAndRender();
    triggerRefresh("page-load", 250);
  });
}, "usage.init");
