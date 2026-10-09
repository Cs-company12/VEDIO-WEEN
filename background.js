const DEF = { ads: true, pops: true, allow: [] };
let adHosts = null;
const fresh = new Map(); // tab-yada cusub ee hadda la furay: tabId -> { time, source }

async function cfg() {
  const r = await chrome.storage.local.get(DEF);
  return { ads: r.ads !== false, pops: r.pops !== false, allow: Array.isArray(r.allow) ? r.allow : [] };
}

async function hosts() {
  if (!adHosts) {
    const rules = await (await fetch(chrome.runtime.getURL("rules.json"))).json();
    adHosts = new Set();
    rules.forEach((r) => (r.condition.requestDomains || []).forEach((d) => adHosts.add(d)));
  }
  return adHosts;
}
function isAd(host, set) {
  const p = (host || "").toLowerCase().split(".");
  for (let i = 0; i < p.length - 1; i++) if (set.has(p.slice(i).join("."))) return true;
  return false;
}

// Ku dabaq dejinta: shid/dami xeerarka, kuna dar site-yada la oggolaaday
async function sync() {
  const c = await cfg();
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(c.ads ? { enableRulesetIds: ["ads"] } : { disableRulesetIds: ["ads"] });
    const old = (await chrome.declarativeNetRequest.getDynamicRules()).map((r) => r.id);
    const add = c.allow.length
      ? [{ id: 1000, priority: 10, action: { type: "allowAllRequests" }, condition: { requestDomains: c.allow, resourceTypes: ["main_frame"] } }]
      : [];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: old, addRules: add });
    await chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
  } catch (e) {
    console.warn("sync", e);
  }
}
chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && (ch.ads || ch.pops || ch.allow)) sync();
});

async function bump(tabId) {
  const r = await chrome.storage.local.get({ popCount: 0 });
  await chrome.storage.local.set({ popCount: (r.popCount || 0) + 1 });
  if (tabId != null) chrome.tabs.sendMessage(tabId, { type: "vw-toast" }, { frameId: 0 }).catch(() => {});
}

chrome.runtime.onMessage.addListener((m, sender) => {
  if (m && m.type === "vw-pop") bump(sender.tab ? sender.tab.id : null);
});

async function allowedSource(tabId, c) {
  try {
    const t = await chrome.tabs.get(tabId);
    return c.allow.indexOf(new URL(t.url).hostname) !== -1;
  } catch (e) {
    return false;
  }
}

// Tab cusub oo uu bog furay: haddii uu u socdo shabakad xayeysiis, isla markiiba xir
async function check(tabId, url, source) {
  const c = await cfg();
  if (!c.pops) return;
  let u;
  try { u = new URL(url); } catch (e) { return; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return;
  if (!isAd(u.hostname, await hosts())) return;
  if (source != null && (await allowedSource(source, c))) return;
  fresh.delete(tabId);
  chrome.tabs.remove(tabId).catch(() => {});
  bump(source);
}

chrome.webNavigation.onCreatedNavigationTarget.addListener((d) => {
  fresh.set(d.tabId, { time: Date.now(), source: d.sourceTabId });
  check(d.tabId, d.url, d.sourceTabId);
});
// Popup-yada marka hore maraya domain kale kadibna u wareegaya shabakad xayeysiis
chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return;
  const f = fresh.get(d.tabId);
  if (!f) return;
  if (Date.now() - f.time > 8000) { fresh.delete(d.tabId); return; }
  check(d.tabId, d.url, f.source);
});
chrome.tabs.onRemoved.addListener((id) => fresh.delete(id));
