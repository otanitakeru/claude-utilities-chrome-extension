/** Claude Utilities — 翻訳（content / popup 共通） */

let currentLang = "en";

const MESSAGES = {
  ja: {
    sectionChatWidth: "チャット幅",
    sectionSidebar: "サイドバー",
    sectionUsage: "使用量",
    sectionLanguage: "言語",
    viewGraph: "グラフ",
    viewBar: "バー",
    resetWidth: "↺ デフォルトに戻す",
    footerReload: "反映されない場合はページを再読み込みしてください",
    noticeNotClaude: "claude.ai でご利用ください。",
    noticeUnknown: "アクティブなタブを取得できませんでした。Claude で再度お試しください。",
    usageSession: "5時間枠",
    usageWeekly: "週間枠",
    usageExtra: "追加枠",
    refreshing: "更新中…",
    refreshBtn: "↻ 更新",
    soon: "まもなく",
    updatedAt: (h, m) => `${h}:${m} 更新`,
    timeRemaining: (h, m) => h > 0 ? `${h}時間${m}分後` : `${m}分後`,
    daysRemaining: (d) => `${d}日後`,
  },
  en: {
    sectionChatWidth: "Chat Width",
    sectionSidebar: "Sidebar",
    sectionUsage: "Usage",
    sectionLanguage: "Language",
    viewGraph: "Graph",
    viewBar: "Bar",
    resetWidth: "↺ Reset to default",
    footerReload: "If changes don't apply, reload the page",
    noticeNotClaude: "Please use this on claude.ai.",
    noticeUnknown: "Could not get the active tab. Try again on Claude.",
    usageSession: "5h Session",
    usageWeekly: "Weekly",
    usageExtra: "Extra",
    refreshing: "Updating...",
    refreshBtn: "↻ Refresh",
    soon: "Soon",
    updatedAt: (h, m) => `Updated ${h}:${m}`,
    timeRemaining: (h, m) => h > 0 ? `in ${h}h ${m}m` : `in ${m}m`,
    daysRemaining: (d) => d === 1 ? "in 1 day" : `in ${d} days`,
  },
};

function t(key, ...args) {
  const val = MESSAGES[currentLang]?.[key] ?? MESSAGES.en[key] ?? key;
  return typeof val === "function" ? val(...args) : val;
}
