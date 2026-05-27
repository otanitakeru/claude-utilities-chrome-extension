/** Claude Utilities — サイドバー幅調整 */

let sidebarObserver = null;
let sidebarEnabled = false;
let currentSidebarWidth = SIDEBAR_DEFAULTS.sidebarWidth;

const HANDLE_ID = "cub-sidebar-handle";
const LG_BREAKPOINT = 1024; // Tailwind lg

// 最後に自分でセットした幅（MutationObserver の無限ループ防止）
let _lastSetWidth = null;
// オフ時に戻すための Claude の元の幅
let _originalWidth = null;
let _originalWrapperWidth = null;

function isDesktopViewport() {
  return window.innerWidth >= LG_BREAKPOINT;
}

function findSidebar() {
  // 狭い画面では別の nav.fixed.left-0 が存在するため、desktop のみ対象
  if (!isDesktopViewport()) return null;
  return (
    document.querySelector("nav.fixed.left-0") ||
    document.querySelector(".z-sidebar nav") ||
    document.querySelector("nav[aria-label][class*='fixed']")
  );
}

// ── 幅の直接適用（インラインスタイル） ─────────────────────

function findWrapper(sidebar) {
  return sidebar?.closest(".z-sidebar") || sidebar?.parentElement || null;
}

function applyWidthToSidebar(sidebar, widthRem) {
  const wrapper = findWrapper(sidebar);
  // 初回適用時のみ Claude の元の幅を保存
  if (_originalWidth === null) {
    _originalWidth = sidebar.style.width || null;
  }
  if (_originalWrapperWidth === null && wrapper && wrapper !== sidebar) {
    _originalWrapperWidth = wrapper.style.width || null;
  }
  const w = `${widthRem}rem`;
  _lastSetWidth = w;
  // nav（視覚的な幅）と sticky wrapper（レイアウトスペース）の両方を更新
  sidebar.style.width = w;
  if (wrapper && wrapper !== sidebar) wrapper.style.width = w;
}

function clearWidthFromSidebar(sidebar) {
  if (!sidebar) return;
  const wrapper = findWrapper(sidebar);
  // 自分が幅をセットしていた場合のみ元の値に戻す
  if (_originalWidth !== null) sidebar.style.width = _originalWidth;
  if (wrapper && wrapper !== sidebar && _originalWrapperWidth !== null) {
    wrapper.style.width = _originalWrapperWidth;
  }
  _lastSetWidth = null;
  _originalWidth = null;
  _originalWrapperWidth = null;
}

function removeSidebarStyle() {
  clearWidthFromSidebar(findSidebar());
}

// ── 折りたたみ判定 ────────────────────────────────────────

function isCollapsedByStyle(sidebar) {
  const w = sidebar.style.width;
  if (!w || w === _lastSetWidth) return false;
  let rem;
  if (w.endsWith("rem")) rem = parseFloat(w);
  else if (w.endsWith("px")) rem = parseFloat(w) / rootFontSizePx();
  else return false;
  return rem <= SIDEBAR_COLLAPSED_REM;
}

function isCollapsedByPosition(sidebar) {
  const rect = sidebar.getBoundingClientRect();
  return rect.right > 0 && rect.right < SIDEBAR_MIN_WIDTH * rootFontSizePx();
}

function isSidebarCollapsed(sidebar) {
  return isCollapsedByStyle(sidebar) || isCollapsedByPosition(sidebar);
}

// ── ドラッグハンドル ─────────────────────────────────────

function positionHandle(sidebar) {
  const handle = document.getElementById(HANDLE_ID);
  if (!handle) return;
  const rect = sidebar.getBoundingClientRect();
  const leftPx = rect.right - 3;
  if (leftPx < SIDEBAR_MIN_WIDTH * rootFontSizePx() - 6) {
    handle.style.display = "none";
    return;
  }
  handle.style.display = "";
  handle.style.left = `${leftPx}px`;
}

function mountSidebarHandle(sidebar) {
  if (document.getElementById(HANDLE_ID)) {
    positionHandle(sidebar);
    return;
  }
  const handle = document.createElement("div");
  handle.id = HANDLE_ID;
  handle.className = "cub-sidebar-handle";
  document.body.appendChild(handle);
  positionHandle(sidebar);

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidthRem = sidebar.getBoundingClientRect().width / rootFontSizePx();
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(e) {
      const newWidth = snapSidebarWidth(startWidthRem + (e.clientX - startX) / rootFontSizePx());
      currentSidebarWidth = newWidth;
      applyWidthToSidebar(sidebar, newWidth);
      positionHandle(sidebar);
    }

    function onUp() {
      handle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      safeChromeCall(() => {
        chrome.storage.local.set({ sidebarWidth: currentSidebarWidth });
      }, "sidebar.drag.save");
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function removeSidebarHandle() {
  document.getElementById(HANDLE_ID)?.remove();
}

// ── window resize 対応 ───────────────────────────────────

function onWindowResize() {
  if (!sidebarEnabled) return;
  requestAnimationFrame(() => {
    if (!isDesktopViewport()) {
      // モバイル幅になった → 別 nav が使われるので width と handle を解放
      const anySidebar = document.querySelector("nav.fixed.left-0");
      if (anySidebar) clearWidthFromSidebar(anySidebar);
      removeSidebarHandle();
      return;
    }

    // デスクトップ幅に戻った → 完全再初期化（observer も張り直す）
    initSidebarDisplay();
  });
}

// ── MutationObserver ─────────────────────────────────────

function teardownSidebarObserver() {
  sidebarObserver?.disconnect();
  sidebarObserver = null;
  window.removeEventListener("resize", onWindowResize);
}

function reinitSidebarObserver() {
  teardownSidebarObserver();
  const sidebar = findSidebar();
  if (!sidebar) return;

  sidebarObserver = new MutationObserver(() => {
    if (!sidebarEnabled || !isDesktopViewport()) return;
    const s = findSidebar();
    if (!s) return;

    const w = s.style.width;

    // 自分がセットした幅が維持されている → ハンドル位置だけ更新
    if (w === _lastSetWidth) {
      positionHandle(s);
      return;
    }

    // Claude が折りたたみ幅・空にした → 手を引く
    if (!w || isCollapsedByStyle(s) || isCollapsedByPosition(s)) {
      _lastSetWidth = null;
      removeSidebarHandle();
    } else {
      // Claude が展開幅を設定した → 自分の幅で上書き
      applyWidthToSidebar(s, currentSidebarWidth);
      mountSidebarHandle(s);
    }
  });

  sidebarObserver.observe(sidebar, { attributes: true, attributeFilter: ["style"] });
  window.addEventListener("resize", onWindowResize);
}

// ── 初期化 ───────────────────────────────────────────────

function initSidebarDisplay() {
  if (!isDesktopViewport()) return; // モバイルでは何もしない
  const sidebar = findSidebar();
  if (!sidebar) return;

  reinitSidebarObserver();

  if (isSidebarCollapsed(sidebar)) {
    removeSidebarHandle();
  } else {
    applyWidthToSidebar(sidebar, currentSidebarWidth);
    mountSidebarHandle(sidebar);
  }
}

function applySidebarSettings(s) {
  sidebarEnabled = s.sidebarEnabled ?? SIDEBAR_DEFAULTS.sidebarEnabled;
  if (s.sidebarWidth !== undefined) {
    currentSidebarWidth = snapSidebarWidth(s.sidebarWidth);
  }

  if (!sidebarEnabled || !isClaudePage()) {
    removeSidebarStyle();
    removeSidebarHandle();
    teardownSidebarObserver();
    return;
  }
  initSidebarDisplay();
}
