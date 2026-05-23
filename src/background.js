async function fetchUsage() {
  try {
    const orgRes = await fetch("https://claude.ai/api/organizations", { credentials: "include" });
    if (!orgRes.ok) return;
    const orgs = await orgRes.json();
    const org = orgs.find(o => o.capabilities?.includes("claude_pro")) ?? orgs[0];
    if (!org) return;

    const usageRes = await fetch(`https://claude.ai/api/organizations/${org.uuid}/usage`, { credentials: "include" });
    if (!usageRes.ok) return;
    const usage = await usageRes.json();

    const parsed = {
      session: usage.five_hour?.utilization ?? null,
      weekly:  usage.seven_day?.utilization  ?? null,
      sessionResetsAt: usage.five_hour?.resets_at ?? null,
      weeklyResetsAt:  usage.seven_day?.resets_at  ?? null,
      extraUsage: usage.extra_usage ?? null,
    };

    await chrome.storage.local.set({ usageData: parsed, lastUpdated: Date.now() });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(() => {
  fetchUsage();
  chrome.alarms.create("fetchUsage", { periodInMinutes: 5 });
});

chrome.runtime.onStartup.addListener(fetchUsage);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchUsage") fetchUsage();
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
});
