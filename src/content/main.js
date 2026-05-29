// ════════════════════════════════════════════════════════
//  Claude Utilities — content script エントリーポイント
//  読み込み順: pageContext.js → constants.js → i18n.js → wide.js → usage.js → sidebar.js → main.js
// ════════════════════════════════════════════════════════

// ── Extension context 管理 ───────────────────────────────
let contextInvalidated = false;
let domObserver = null;
let wasGenerating = false;
let lastPath = location.pathname;
let usageEnabled = true;
let viewMode = "graph";

function invalidateContext() {
  if (contextInvalidated) return;
  contextInvalidated = true;
  console.log(
    "[ClaudeUsage] Extension context invalidated, stopping all observers.",
  );
  try {
    domObserver?.disconnect();
    teardownSidebarObserver();
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

// ── 共通ヘルパー ─────────────────────────────────────────

/** コンテンツ UI をすべて解除する */
function teardownContentUI() {
  removeUsage();
  removeWideStyle();
  removeSidebarStyle();
  teardownSidebarObserver();
}

/** レイアウト設定（幅・サイドバー）をストレージから再適用する */
function reapplyLayoutSettings(label) {
  safeChromeCall(() => {
    chrome.storage.local.get({ ...WIDE_DEFAULTS, ...SIDEBAR_DEFAULTS }, (s) => {
      applyWideSettings(s);
      applySidebarSettings(s);
    });
  }, label);
}

// ── 初期化 ───────────────────────────────────────────────
safeChromeCall(() => {
  chrome.storage.local.get(
    { ...LANG_DEFAULTS, ...WIDE_DEFAULTS, ...SIDEBAR_DEFAULTS, ...USAGE_DEFAULTS, viewMode: "graph" },
    (s) => {
      currentLang = s.lang ?? "en";
      applyWideSettings(s);
      applySidebarSettings(s);
      usageEnabled = readUsageEnabled(s);
      viewMode = s.viewMode ?? "graph";
      if (!isAllowedPage()) {
        removeUsage();
        return;
      }
      loadAndRender();
      triggerRefresh("page-load", 250);
    },
  );
}, "init");

// ── DOM Observer ─────────────────────────────────────────
domObserver = new MutationObserver(() => {
  if (contextInvalidated) return;
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    wasGenerating = false;
    if (!isAllowedPage()) {
      teardownContentUI();
      return;
    }
    reapplyLayoutSettings("layout.spa");
    setTimeout(loadAndRender, 800);
  }
  const isGenerating = !!findStopButton();
  if (wasGenerating && !isGenerating) triggerRefresh("stop-button-gone", 1500);
  wasGenerating = isGenerating;
  const usageVisible = document.getElementById(USAGE_ROOT_ID) || document.getElementById(MINI_USAGE_ROOT_ID);
  if (isAllowedPage() && usageEnabled && !usageVisible)
    setTimeout(loadAndRender, 500);
  // Retry sidebar observer if not yet attached (e.g. nav just appeared in DOM)
  if (sidebarEnabled && !sidebarObserver) initSidebarDisplay();
});
domObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener("visibilitychange", () => {
  if (contextInvalidated) return;
  if (document.hidden) {
    domObserver.disconnect();
  } else {
    domObserver.observe(document.body, { childList: true, subtree: true });
    if (isAllowedPage()) {
      reapplyLayoutSettings("layout.visibility");
      loadAndRender();
    } else {
      teardownContentUI();
    }
  }
});

// ── ストレージ変更の監視 ──────────────────────────────────
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
  if (msg?.type === "CLAUDE_WIDE_CHAT_APPLY") {
    applyWideSettings(msg);
  }
  if (msg?.type === "CLAUDE_USAGE_TOGGLE") {
    usageEnabled = !!msg.enabled;
    if (!usageEnabled) {
      removeUsage();
    } else {
      loadAndRender();
    }
  }
  if (msg?.type === "CLAUDE_VIEW_MODE") {
    viewMode = msg.viewMode ?? "graph";
    loadAndRender();
  }
  if (msg?.type === "CLAUDE_LANG_CHANGE") {
    currentLang = msg.lang ?? "en";
    loadAndRender();
  }
  if (msg?.type === "CLAUDE_SIDEBAR_APPLY") {
    applySidebarSettings(msg);
  }
});
