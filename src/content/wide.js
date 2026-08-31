/** Claude Utilities — チャット幅調整 */

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function buildWideCss(enabled, width, padding) {
  const w = snapWidth(width ?? WIDE_DEFAULTS.width);
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
    body.chat-ui-core [data-autoscroll-container] [class~="max-w-3xl"],
    body.chat-ui-core [data-testid="chat-column"] {
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

function removeWideStyle() {
  document.getElementById(STYLE_ID)?.remove();
}
