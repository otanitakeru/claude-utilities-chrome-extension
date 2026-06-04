/** Claude Utilities — ステータスランプ（コンポーザー内） */

function getStatusColor(status) {
  const colors = {
    operational: "#22c55e",
    degraded_performance: "#f59e0b",
    partial_outage: "#f97316",
    major_outage: "#ef4444",
  };
  return colors[status] ?? "#9ca3af";
}

function getStatusLabel(status) {
  const labels = {
    operational: "Operational",
    degraded_performance: "Degraded Performance",
    partial_outage: "Partial Outage",
    major_outage: "Major Outage",
  };
  return labels[status] ?? "Unknown";
}

function buildStatusLampHTML(claudeStatus) {
  const color = getStatusColor(claudeStatus);
  const label = getStatusLabel(claudeStatus);
  const isIssue = claudeStatus !== "operational" && claudeStatus !== "unknown";
  return `<div class="cus-lamp${isIssue ? " cus-lamp--issue" : ""}" style="background:${color}" title="Claude.ai: ${label}"></div>`;
}

function mountStatusLamp(claudeStatus) {
  if (!isAllowedPage()) {
    document.getElementById(STATUS_ROOT_ID)?.remove();
    return;
  }

  const existing = document.getElementById(STATUS_ROOT_ID);
  if (existing) {
    existing.innerHTML = buildStatusLampHTML(claudeStatus);
    return;
  }

  const root = document.createElement("div");
  root.id = STATUS_ROOT_ID;
  root.innerHTML = buildStatusLampHTML(claudeStatus);

  const miniUsage = document.getElementById(MINI_USAGE_ROOT_ID);
  if (miniUsage) {
    miniUsage.insertAdjacentElement("afterend", root);
    return;
  }

  const target = findMiniInsertTarget();
  if (!target) return;
  target.parentElement?.insertBefore(root, target);
}

function loadAndRenderStatus() {
  if (!isAllowedPage()) {
    document.getElementById(STATUS_ROOT_ID)?.remove();
    return;
  }
  safeChromeCall(() => {
    chrome.storage.local.get(["claudeStatus"], (result) => {
      if (contextInvalidated) return;
      mountStatusLamp(result.claudeStatus ?? "unknown");
    });
  }, "loadAndRenderStatus");
}
