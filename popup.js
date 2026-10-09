const DEF = { ads: true, pops: true, allow: [], popCount: 0 };
const $ = (id) => document.getElementById(id);
let host = "", tabId = null;

function paint(r) {
  $("ads").checked = r.ads !== false;
  $("pops").checked = r.pops !== false;
  $("off").checked = !!host && (r.allow || []).indexOf(host) !== -1;
  $("off").disabled = !host;
  $("count").textContent = r.popCount || 0;
}
function load() { chrome.storage.local.get(DEF, paint); }

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const t = tabs && tabs[0];
  if (t) {
    tabId = t.id;
    try {
      const u = new URL(t.url);
      if (u.protocol === "http:" || u.protocol === "https:") host = u.hostname;
    } catch (e) {}
  }
  $("host").textContent = host || "(boggan laguma isticmaali karo)";
  load();
});

$("ads").addEventListener("change", (e) => chrome.storage.local.set({ ads: e.target.checked }));
$("pops").addEventListener("change", (e) => chrome.storage.local.set({ pops: e.target.checked }));
$("off").addEventListener("change", (e) => {
  chrome.storage.local.get(DEF, (r) => {
    let allow = (r.allow || []).filter((h) => h !== host);
    if (e.target.checked) allow.push(host);
    chrome.storage.local.set({ allow }, () => { if (tabId != null) chrome.tabs.reload(tabId); });
  });
});
chrome.storage.onChanged.addListener(load);
