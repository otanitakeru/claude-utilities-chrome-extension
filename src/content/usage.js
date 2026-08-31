/** Claude Utilities — 使用量表示 */

let refreshTimer = null;

function getColor(utilization) {
  if (utilization === null) return "#aaa";
  return 100 - utilization < 10 ? "#E53E3E" : "#D97757";
}

function formatPct(pct) {
  return pct === null ? "---" : Math.round(pct) + "%";
}

function formatResetsAtRelative(isoStr) {
  if (!isoStr) return null;
  const diffMs = new Date(isoStr) - Date.now();
  if (diffMs <= 0) return t("soon");
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (m === 0) return t("soon");
  return t("timeRemaining", h, m);
}

function formatResetsAtWeekday(isoStr) {
  if (!isoStr) return null;
  const diffMs = new Date(isoStr) - Date.now();
  if (diffMs <= 0) return t("soon");
  if (diffMs < 86400000) return formatResetsAtRelative(isoStr);
  return t("daysRemaining", Math.floor(diffMs / 86400000));
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

  const modelWeeklyHTML = (data?.modelWeekly ?? [])
    .map((mw) => {
      const mc = getColor(mw.utilization);
      const reset = formatResetsAtWeekday(mw.resetsAt);
      return `<div class="cub-row">
      <span class="cub-label">${t("usageModelWeekly", mw.modelName)}</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(mw.utilization ?? 0, 100)}%;background:${mc}"></div></div>
      <span class="cub-pct" style="color:${mc}">${formatPct(mw.utilization)}</span>
      ${reset ? `<span class="cub-sub">${reset}</span>` : ""}
    </div>`;
    })
    .join("");

  const extraHTML = extra
    ? (() => {
        const ec = getColor(extra.utilization);
        return `<div class="cub-row">
      <span class="cub-label">${t("usageExtra")}</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(extra.utilization, 100)}%;background:${ec}"></div></div>
      <span class="cub-pct" style="color:${ec}">${Math.round(extra.utilization)}%</span>
      <span class="cub-sub">${formatCredit(extra.used_credits)} / ${formatCredit(extra.monthly_limit)}</span>
    </div>`;
      })()
    : "";

  return `<div class="cub-inner">
    <div class="cub-row">
      <span class="cub-label">${t("usageSession")}</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(sessionPct ?? 0, 100)}%;background:${sc}"></div></div>
      <span class="cub-pct" style="color:${sc}">${formatPct(sessionPct)}</span>
      ${sessionReset ? `<span class="cub-sub">${sessionReset}</span>` : ""}
    </div>
    <div class="cub-row">
      <span class="cub-label">${t("usageWeekly")}</span>
      <div class="cub-track"><div class="cub-fill" style="width:${Math.min(weeklyPct ?? 0, 100)}%;background:${wc}"></div></div>
      <span class="cub-pct" style="color:${wc}">${formatPct(weeklyPct)}</span>
      ${weeklyReset ? `<span class="cub-sub">${weeklyReset}</span>` : ""}
    </div>
    ${modelWeeklyHTML}
    ${extraHTML}
    <div class="cub-actions">
      <span class="cub-updated" id="cub-updated-time"></span>
      <span class="cub-refreshing" id="cub-refreshing" style="display:none">${t("refreshing")}</span>
      <button class="cub-refresh-btn" id="cub-refresh-btn">${t("refreshBtn")}</button>
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

  for (const mw of data?.modelWeekly ?? []) {
    items.push({
      pct: mw.utilization,
      reset: formatResetsAtWeekday(mw.resetsAt),
      color: getColor(mw.utilization),
    });
  }

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
      <div class="cug-reset"${reset ? "" : ' style="visibility:hidden"'}>${reset ?? " "}</div>
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
          <span class="cub-refreshing" id="cub-refreshing" style="display:none">${t("refreshing")}</span>
          <button class="cub-refresh-btn" id="cub-refresh-btn">${t("refreshBtn")}</button>
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
  document.getElementById(MINI_USAGE_ROOT_ID)?.remove();
  removeMiniTooltip();
}

function applyUsageRootBackground(root) {
  const composer = document.querySelector('[data-testid="composer"]');
  let el = composer;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      root.style.backgroundColor = bg;
      root.style.setProperty("--cub-bg", bg);
      return;
    }
    el = el.parentElement;
  }
  for (const fallback of [document.querySelector("main"), document.body]) {
    if (!fallback) continue;
    const bg = getComputedStyle(fallback).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      root.style.backgroundColor = bg;
      root.style.setProperty("--cub-bg", bg);
      return;
    }
  }
}

function mountUsage(data) {
  if (!isAllowedPage() || !usageEnabled || !data) {
    removeUsage();
    return true;
  }

  if (viewMode === "mini") {
    document.getElementById(USAGE_ROOT_ID)?.remove();
    mountMiniUsage(data);
    return true;
  }

  document.getElementById(MINI_USAGE_ROOT_ID)?.remove();
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
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  el.textContent = t("updatedAt", h, m);
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

function buildMiniDonutSVG(pct, color) {
  const r = 7,
    cx = 10,
    cy = 10;
  const circ = 2 * Math.PI * r;
  const pctVal = pct !== null ? Math.min(Math.max(pct, 0), 100) : 0;
  const filled = (circ * pctVal) / 100;
  const gap = circ - filled;
  const hasArc = pct !== null && pct > 0;
  return `<svg viewBox="0 0 20 20" width="18" height="18">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(128,128,128,0.2)" stroke-width="3"/>
    ${
      hasArc
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3"
      stroke-dasharray="${filled.toFixed(2)} ${gap.toFixed(2)}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>`
        : ""
    }
  </svg>`;
}

function buildMiniItems(data) {
  const sessionPct = data?.session ?? null;
  const weeklyPct = data?.weekly ?? null;
  const extra = data?.extraUsage;
  const sc = getColor(sessionPct);
  const wc = getColor(weeklyPct);

  const items = [
    {
      pct: sessionPct,
      color: sc,
      label: t("usageSession"),
      reset: formatResetsAtRelative(data?.sessionResetsAt),
    },
    {
      pct: weeklyPct,
      color: wc,
      label: t("usageWeekly"),
      reset: formatResetsAtWeekday(data?.weeklyResetsAt),
    },
  ];
  for (const mw of data?.modelWeekly ?? []) {
    items.push({
      pct: mw.utilization,
      color: getColor(mw.utilization),
      label: t("usageModelWeekly", mw.modelName),
      reset: formatResetsAtWeekday(mw.resetsAt),
    });
  }
  if (extra) {
    const ec = getColor(extra.utilization);
    items.push({
      pct: extra.utilization,
      color: ec,
      label: t("usageExtra"),
      reset: `${formatCredit(extra.used_credits)} / ${formatCredit(extra.monthly_limit)}`,
    });
  }
  return items;
}

function buildMiniUsageHTML(data) {
  const donuts = buildMiniItems(data)
    .map(
      ({ pct, color }) =>
        `<div class="cub-mini-item">${buildMiniDonutSVG(pct, color)}</div>`,
    )
    .join("");

  return `<div class="cub-mini-container">${donuts}</div>`;
}

function buildMiniTooltipHTML(data) {
  return buildMiniItems(data)
    .map(({ pct, label, reset }) => {
      const pctStr = pct === null ? "---" : Math.round(pct) + "%";
      const info = reset ? `${pctStr}・${reset}` : pctStr;
      const fillW = pct !== null ? Math.min(Math.max(pct, 0), 100) : 0;
      return `<div class="cub-mini-tip-row">
      <div class="cub-mini-tip-header">
        <span class="cub-mini-tip-label">${label}</span>
        <span class="cub-mini-tip-info">${info}</span>
      </div>
      <div class="cub-mini-tip-track">
        <div class="cub-mini-tip-fill" style="width:${fillW}%"></div>
      </div>
    </div>`;
    })
    .join("");
}

function findMiniInsertTarget() {
  const composer =
    document.querySelector('[data-testid="composer"]') ||
    document.querySelector("fieldset");
  if (!composer) return null;
  for (const btn of composer.querySelectorAll("button")) {
    const text = btn.textContent ?? "";
    if (!/Sonnet|Opus|Haiku|Fable|Mythos/i.test(text) || text.length >= 60) continue;
    let el = btn;
    while (el.parentElement && el.parentElement !== document.body) {
      const cl = el.parentElement.classList;
      if (
        cl.contains("w-full") &&
        cl.contains("flex") &&
        cl.contains("gap-2")
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return btn;
  }
  return null;
}

function mountMiniUsage(data) {
  if (!isAllowedPage() || !usageEnabled || !data) {
    document.getElementById(MINI_USAGE_ROOT_ID)?.remove();
    removeMiniTooltip();
    return;
  }
  const target = findMiniInsertTarget();
  if (!target) return;

  const existing = document.getElementById(MINI_USAGE_ROOT_ID);
  if (existing) {
    // 再描画で hover 中の要素が差し替わるため、いったん隠す
    hideMiniTooltip();
    existing.innerHTML = buildMiniUsageHTML(data);
  } else {
    const root = document.createElement("div");
    root.id = MINI_USAGE_ROOT_ID;
    root.innerHTML = buildMiniUsageHTML(data);
    target.parentElement?.insertBefore(root, target);
  }
  attachMiniTooltip(data);

  const lamp = document.getElementById(STATUS_ROOT_ID);
  if (lamp) {
    const miniUsageEl = document.getElementById(MINI_USAGE_ROOT_ID);
    if (miniUsageEl) miniUsageEl.insertAdjacentElement("afterend", lamp);
  }
}

/**
 * ツールチップは body 直下の fixed 要素として描画する。
 * 入力欄側の祖先に overflow:hidden が付くと absolute 配置では切れてしまうため。
 */
function ensureMiniTooltip(data) {
  let tooltip = document.getElementById(MINI_TOOLTIP_ID);
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = MINI_TOOLTIP_ID;
    tooltip.className = "cub-mini-tooltip";
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = buildMiniTooltipHTML(data);
  return tooltip;
}

function removeMiniTooltip() {
  hideMiniTooltip();
  document.getElementById(MINI_TOOLTIP_ID)?.remove();
}

function getMiniContainer() {
  return document.querySelector(`#${MINI_USAGE_ROOT_ID} .cub-mini-container`);
}

const MINI_TOOLTIP_GAP = 8;
const MINI_TOOLTIP_MARGIN = 8;

function positionMiniTooltip() {
  const tooltip = document.getElementById(MINI_TOOLTIP_ID);
  const container = getMiniContainer();
  if (!tooltip || !container) return;

  const anchor = container.getBoundingClientRect();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;

  let top = anchor.top - height - MINI_TOOLTIP_GAP;
  if (top < MINI_TOOLTIP_MARGIN) {
    top = Math.min(
      anchor.bottom + MINI_TOOLTIP_GAP,
      window.innerHeight - height - MINI_TOOLTIP_MARGIN,
    );
  }

  const maxLeft = window.innerWidth - width - MINI_TOOLTIP_MARGIN;
  const left = Math.max(
    MINI_TOOLTIP_MARGIN,
    Math.min(anchor.left + anchor.width / 2 - width / 2, maxLeft),
  );

  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.left = `${Math.round(left)}px`;
}

function showMiniTooltip() {
  const tooltip = document.getElementById(MINI_TOOLTIP_ID);
  if (!tooltip) return;
  tooltip.classList.add("cub-mini-tooltip--visible");
  positionMiniTooltip();
  window.addEventListener("scroll", positionMiniTooltip, true);
  window.addEventListener("resize", positionMiniTooltip);
}

function hideMiniTooltip() {
  document
    .getElementById(MINI_TOOLTIP_ID)
    ?.classList.remove("cub-mini-tooltip--visible");
  window.removeEventListener("scroll", positionMiniTooltip, true);
  window.removeEventListener("resize", positionMiniTooltip);
}

function attachMiniTooltip(data) {
  const miniContainer = getMiniContainer();
  if (!miniContainer) {
    removeMiniTooltip();
    return;
  }
  ensureMiniTooltip(data);

  miniContainer.addEventListener("mouseenter", showMiniTooltip);
  miniContainer.addEventListener("mouseleave", hideMiniTooltip);

  // 再描画直後もカーソルが乗ったままなら表示を復帰させる
  requestAnimationFrame(() => {
    if (getMiniContainer()?.matches(":hover")) showMiniTooltip();
  });
}

const STOP_BTN_PATH_PREFIX = "M128,20A108,108";

function findStopButton() {
  for (const btn of document.querySelectorAll("button")) {
    const path = btn.querySelector("svg path")?.getAttribute("d") ?? "";
    if (path.startsWith(STOP_BTN_PATH_PREFIX)) return btn;
  }
  return null;
}
