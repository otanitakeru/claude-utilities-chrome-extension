/** Claude Utilities — ページコンテキスト判定（content / popup 共通） */

function isClaudeHost(url) {
  try {
    const host = new URL(url).hostname;
    return host === "claude.ai" || host === "claude.com";
  } catch {
    return false;
  }
}

/** /new と /chat/* （チャット画面）かどうか */
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

/** @returns {"chat"|"claude"|"not-claude"|"unknown"} */
function getPageContext(url) {
  if (!url) return "unknown";
  if (!isClaudeHost(url)) return "not-claude";
  if (isAllowedClaudePage(url)) return "chat";
  return "claude";
}

/** チャット画面か（チャット幅・使用量表示の有効判定） */
function isAllowedPage() {
  return isAllowedClaudePage(location.href);
}

/** claude.ai / claude.com のいずれかのページか（サイドバーの有効判定） */
function isClaudePage() {
  return isClaudeHost(location.href);
}
