// Wuxuu maamulaa dejinta (on/off), wuxuu xiraa link-yada qarsoon ee bogga daboola, wuxuuna muujiyaa ogeysiis.
(() => {
  if (window.__vwAdblock) return;
  window.__vwAdblock = true;

  const DEF = { ads: true, pops: true, allow: [] };
  const isTop = window.top === window;
  const topHost = (() => {
    try {
      const a = location.ancestorOrigins;
      return a && a.length ? new URL(a[a.length - 1]).hostname : location.hostname;
    } catch (e) {
      return location.hostname;
    }
  })();
  let popsOn = true;

  function applyCfg(r) {
    const root = document.documentElement;
    if (!root) return;
    const allowed = Array.isArray(r.allow) && r.allow.indexOf(topHost) !== -1;
    popsOn = r.pops !== false && !allowed;
    root.setAttribute("data-vw-ads", r.ads === false || allowed ? "off" : "on");
    root.setAttribute("data-vw-pops", popsOn ? "on" : "off");
  }
  function refresh() {
    try { chrome.storage.local.get(DEF, applyCfg); } catch (e) {}
  }
  refresh();
  try { chrome.storage.onChanged.addListener(refresh); } catch (e) {}

  function site(h) {
    h = (h || "").toLowerCase();
    const p = h.split(".");
    if (p.length <= 2) return h;
    const sl = ["co", "com", "org", "net", "gov", "ac", "edu"];
    if (p[p.length - 1].length === 2 && sl.indexOf(p[p.length - 2]) !== -1) return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  }

  function report() {
    try { chrome.runtime.sendMessage({ type: "vw-pop" }); } catch (e) {}
  }
  document.addEventListener("vw-pop-blocked", report);

  // Link aan la arki karin ama bogga oo dhan daboolaya oo tab cusub u furaya site kale = dabin xayeysiis
  window.addEventListener(
    "click",
    (e) => {
      if (!popsOn || !e.isTrusted) return;
      const path = e.composedPath ? e.composedPath() : [e.target];
      let a = null;
      for (const n of path) if (n && n.tagName === "A" && n.href) { a = n; break; }
      if (!a || a.target !== "_blank") return;
      let u;
      try { u = new URL(a.href); } catch (x) { return; }
      if (!/^https?:$/.test(u.protocol) || site(u.hostname) === site(location.hostname)) return;
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const covers = r.width * r.height >= 0.6 * innerWidth * innerHeight;
      const invisible = parseFloat(cs.opacity) < 0.1 || cs.visibility === "hidden";
      const empty = !a.textContent.trim() && !a.querySelector("img,svg,picture,video") && r.width * r.height > 20000;
      if (covers || invisible || empty) {
        e.preventDefault();
        e.stopImmediatePropagation();
        report();
      }
    },
    true
  );

  // Ogeysiis yar (kaliya bogga sare): "Popup la xiray" + badhan lagu oggolaado site-kan
  if (!isTop) return;
  let toast = null, count = 0, timer = null, text = null;
  function show() {
    count++;
    if (!toast) {
      toast = document.createElement("div");
      toast.setAttribute("data-video-weyneeye-toast", "");
      toast.style.cssText =
        "all:initial;position:fixed;left:12px;bottom:12px;z-index:2147483647;display:flex;gap:8px;align-items:center;" +
        "font:600 13px/1.2 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.85);" +
        "border:1px solid rgba(255,255,255,.35);border-radius:8px;padding:8px 10px;";
      text = document.createElement("span");
      text.style.cssText = "all:initial;font:inherit;color:#fff;";
      const b = document.createElement("button");
      b.textContent = "Oggolow site-kan";
      b.title = "Ka dami ad block iyo popup block site-kan";
      b.style.cssText =
        "all:initial;font:600 12px/1 system-ui,sans-serif;color:#111;background:#f5b301;border-radius:6px;" +
        "padding:6px 8px;cursor:pointer;";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.storage.local.get(DEF, (r) => {
          const allow = Array.isArray(r.allow) ? r.allow.slice() : [];
          if (allow.indexOf(location.hostname) === -1) allow.push(location.hostname);
          chrome.storage.local.set({ allow }, () => location.reload());
        });
      });
      toast.append(text, b);
    }
    text.textContent = "🚫 Popup la xiray" + (count > 1 ? " (" + count + ")" : "");
    if (!toast.isConnected) (document.fullscreenElement || document.documentElement).appendChild(toast);
    clearTimeout(timer);
    timer = setTimeout(() => { if (toast) toast.remove(); }, 4000);
  }
  try {
    chrome.runtime.onMessage.addListener((m) => { if (m && m.type === "vw-toast") show(); });
  } catch (e) {}
})();
