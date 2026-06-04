const STATUS_API_URL = "https://anthropic.statuspage.io/api/v2/summary.json";

async function fetchStatus() {
  try {
    const res = await fetch(STATUS_API_URL);
    if (!res.ok) return;
    const data = await res.json();

    // name で動的に claude.ai コンポーネントを特定する
    const component = data.components?.find(
      (c) => c.name?.toLowerCase() === "claude.ai",
    );
    if (!component) return;

    const claudeStatus = component.status ?? "unknown";
    const claudeAiId = component.id;

    const activeIncidents = (data.incidents ?? []).filter((incident) =>
      incident.components?.some((c) => c.id === claudeAiId),
    );
    const hasIncident = activeIncidents.length > 0;
    const latest = hasIncident ? activeIncidents[0] : null;

    await chrome.storage.local.set({
      claudeStatus,
      claudeStatusUpdated: Date.now(),
      claudeHasIncident: hasIncident,
      claudeLatestIncident: latest
        ? {
            name: latest.name,
            status: latest.status,
            impact: latest.impact,
            shortlink: latest.shortlink,
          }
        : null,
    });

    if (hasIncident || claudeStatus !== "operational") {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (e) {
    console.warn("[ClaudeStatus] fetchStatus failed:", e?.message ?? e);
  }
}

async function clearUsageCache() {
  await chrome.storage.local.remove(["usageData", "lastUpdated"]);
}

async function fetchUsage() {
  try {
    const orgRes = await fetch("https://claude.ai/api/organizations", {
      credentials: "include",
    });
    if (!orgRes.ok) {
      if (orgRes.status === 401 || orgRes.status === 403) {
        await clearUsageCache();
      }
      return;
    }
    const orgs = await orgRes.json();
    const org =
      orgs.find((o) => o.capabilities?.includes("claude_pro")) ??
      orgs.find((o) => o.capabilities?.includes("chat")) ??
      orgs[0];
    if (!org) {
      await clearUsageCache();
      return;
    }

    const usageRes = await fetch(
      `https://claude.ai/api/organizations/${org.uuid}/usage`,
      { credentials: "include" },
    );
    if (!usageRes.ok) {
      if (usageRes.status === 401 || usageRes.status === 403) {
        await clearUsageCache();
      }
      return;
    }
    const usage = await usageRes.json();

    const parsed = {
      session: usage.five_hour?.utilization ?? null,
      weekly: usage.seven_day?.utilization ?? null,
      sessionResetsAt: usage.five_hour?.resets_at ?? null,
      weeklyResetsAt: usage.seven_day?.resets_at ?? null,
      extraUsage: usage.extra_usage ?? null,
    };

    await chrome.storage.local.set({
      usageData: parsed,
      lastUpdated: Date.now(),
    });
  } catch (e) {
    console.warn("[ClaudeUsage] fetchUsage failed:", e?.message ?? e);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  fetchUsage();
  fetchStatus();
  chrome.alarms.create("fetchUsage", { periodInMinutes: 5 });
  chrome.alarms.create("fetchStatus", { periodInMinutes: 5 });
});

chrome.runtime.onStartup.addListener(() => {
  fetchUsage();
  fetchStatus();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchUsage") fetchUsage();
  if (alarm.name === "fetchStatus") fetchStatus();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "PING") {
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === "REFRESH_USAGE") {
    fetchUsage().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "REFRESH_STATUS") {
    fetchStatus().then(() => sendResponse({ ok: true }));
    return true;
  }
});
