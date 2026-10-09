// Wuxuu ku shaqeeyaa bogga laftiisa (MAIN world): wuxuu joojiyaa popup-yada xayeysiiska ah.
(() => {
  if (window.__vwGuard) return;
  window.__vwGuard = true;

  const on = () => {
    const r = document.documentElement;
    return !r || r.getAttribute("data-vw-pops") !== "off";
  };
  function site(h) {
    h = (h || "").toLowerCase();
    const p = h.split(".");
    if (p.length <= 2) return h;
    const sl = ["co", "com", "org", "net", "gov", "ac", "edu"];
    if (p[p.length - 1].length === 2 && sl.indexOf(p[p.length - 2]) !== -1) return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  }
  function cross(u) {
    try {
      const x = new URL(u, location.href);
      if (x.protocol !== "http:" && x.protocol !== "https:") return false;
      return site(x.hostname) !== site(location.hostname);
    } catch (e) {
      return false;
    }
  }
  function note() {
    try { document.dispatchEvent(new CustomEvent("vw-pop-blocked")); } catch (e) {}
  }
  // Daaqad been ah: script-ka xayeysiisku wuxuu u malaynayaa in popup-ku furmay, markaa ma isku dayo hab kale
  function stub() {
    return {
      closed: false, opener: null,
      close() {}, focus() {}, blur() {}, postMessage() {},
      document: { write() {}, writeln() {}, open() {}, close() {} },
      location: { href: "", replace() {}, assign() {} },
    };
  }

  const realOpen = window.open;
  window.open = function (url) {
    if (on() && url != null && url !== "" && cross(String(url))) {
      note();
      return stub();
    }
    return realOpen.apply(this, arguments);
  };

  // Link qarsoon oo la abuuray kadibna si toos ah loo "gujiyey" (a.click()) si tab cusub loo furo
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (on() && !this.isConnected && this.target === "_blank" && !this.hasAttribute("download") && cross(this.href)) {
      note();
      return;
    }
    return realClick.apply(this, arguments);
  };
})();
