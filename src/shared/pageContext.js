/** Claude Utilities — ページコンテキスト判定（content / popup 共通） */

function isClaudeHost(url) {
  try {
    const host = new URL(url).hostname;
    return host === "claude.ai" || host === "claude.com";
  } catch {
    return false;
  }
}

/** /new と /chat/* で拡張 UI を有効にする */
function isAllowedClaudePage(url) {
  try {
    const { pathname } = new URL(url);
    if (pathname === "/new" || pathname.startsWith("/new/")) return true;
    if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
    return false;
  } catch {
    return false;
  }
}

/** @returns {"allowed"|"not-claude"|"claude-other"|"unknown"} */
function getPageContext(url) {
  if (!url) return "unknown";
  if (!isClaudeHost(url)) return "not-claude";
  if (!isAllowedClaudePage(url)) return "claude-other";
  return "allowed";
}

function isAllowedPage() {
  return isAllowedClaudePage(location.href);
}
