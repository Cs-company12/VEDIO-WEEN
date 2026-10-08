(() => {
  // Heerarka weyneynta. 1.33 = video 4:3 ah wuxuu buuxinayaa shaashad 16:9 ah.
  const levels = [1, 1.15, 1.33, 1.5, 1.75, 2];
  let i = 0;
  let btn = null;

  function label() {
    return levels[i] === 1 ? "🔍 Weynee" : "🔍 " + Math.round(levels[i] * 100) + "%";
  }

  function apply() {
    document.querySelectorAll("video").forEach((v) => {
      v.style.transformOrigin = "center center";
      v.style.transform = levels[i] === 1 ? "" : "scale(" + levels[i] + ")";
    });
    if (btn) btn.textContent = label();
  }

  function step(dir) {
    i = (i + dir + levels.length) % levels.length;
    apply();
  }

  function host() {
    return document.fullscreenElement || document.documentElement;
  }

  function ensure() {
    if (!document.querySelector("video")) return;
    if (!btn) {
      btn = document.createElement("button");
      btn.title = "Guji: weynee | Midig-guji: yaree | Alt + / Alt - / Alt 0";
      btn.style.cssText =
        "position:fixed;top:12px;right:12px;z-index:2147483647;" +
        "padding:8px 14px;font:600 14px sans-serif;color:#fff;" +
        "background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.5);" +
        "border-radius:8px;cursor:pointer;opacity:.85";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        step(1);
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        step(-1);
      });
    }
    if (btn.parentNode !== host()) host().appendChild(btn);
    apply();
  }

  document.addEventListener("fullscreenchange", ensure);

  document.addEventListener(
    "keydown",
    (e) => {
      if (!e.altKey || !document.querySelector("video")) return;
      if (e.key === "+" || e.key === "=") step(1);
      else if (e.key === "-") step(-1);
      else if (e.key === "0") {
        i = 0;
        apply();
      } else return;
      e.preventDefault();
    },
    true
  );

  setInterval(ensure, 1500);
})();
