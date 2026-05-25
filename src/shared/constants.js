/** Claude Utilities — 共有定数・ユーティリティ（content / popup 共通） */

const STYLE_ID = "claude-wide-chat-style";
const USAGE_ROOT_ID = "claude-usage-root";

const WIDE_DEFAULTS = { wideEnabled: true, width: 1000, padding: 8 };
const WIDE_MIN_WIDTH = 650;
const WIDE_MAX_WIDTH = 2000;
const WIDE_WIDTH_STEP = 10;

const USAGE_DEFAULTS = { usageEnabled: true };
const VIEW_DEFAULTS = { viewMode: "graph" };

function snapWidth(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return WIDE_DEFAULTS.width;
  const clamped = Math.min(Math.max(n, WIDE_MIN_WIDTH), WIDE_MAX_WIDTH);
  const steps = Math.round((clamped - WIDE_MIN_WIDTH) / WIDE_WIDTH_STEP);
  return WIDE_MIN_WIDTH + steps * WIDE_WIDTH_STEP;
}

function readUsageEnabled(stored) {
  if (stored.usageEnabled !== undefined) return stored.usageEnabled;
  if (stored.barEnabled !== undefined) return stored.barEnabled;
  return true;
}
