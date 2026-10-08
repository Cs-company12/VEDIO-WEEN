(() => {
  if (window.__videoWeyneeye) return;
  window.__videoWeyneeye = true;

  const MIN = 1, MAX = 4, STEP = 0.1;
  let zoom = 1, tx = 0, ty = 0;
  let host = null, lbl = null, hideTimer = null;
  const touched = new Set();

  // Xusuusta: site kasta wuxuu xusuusanayaa heerkii ugu dambeeyay
  const store = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  const KEY = "zoom:" + (location.hostname || "local");
  function save() {
    try { if (store) store.set({ [KEY]: zoom }); } catch (e) {}
  }
  try {
    if (store) store.get(KEY, (r) => {
      const z = r && r[KEY];
      if (typeof z === "number" && z >= MIN && z <= MAX) { zoom = z; tick(); }
    });
  } catch (e) {}

  // Hel video kasta, xataa kuwa ku dhex jira shadow DOM
  function deep(root, out) {
    root.querySelectorAll("video").forEach((v) => out.push(v));
    root.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) deep(el.shadowRoot, out); });
    return out;
  }
  function videos() {
    return deep(document, []).filter((v) => v.clientWidth >= 200 && v.clientHeight >= 120);
  }
  function biggest(list) {
    return list.reduce((a, b) => (!a || b.clientWidth * b.clientHeight > a.clientWidth * a.clientHeight ? b : a), null);
  }

  // Kaliya video-ga hadda socda (playing). Haddii la hakiyo (pause), isla video-gaas ayaa la hayaa.
  let current = null;
  function pick() {
    const list = videos();
    const playing = list.filter((v) => !v.paused && !v.ended && v.readyState > 1);
    if (playing.length) current = biggest(playing);
    else if (current && list.indexOf(current) === -1) current = null;
    return current;
  }

  function apply() {
    const cur = pick();
    if (zoom === 1) { tx = 0; ty = 0; }
    touched.forEach((v) => {
      if (v !== cur || zoom === 1) {
        v.style.removeProperty("transform");
        v.style.removeProperty("transform-origin");
        touched.delete(v);
      }
    });
    if (cur && zoom !== 1) {
      touched.add(cur);
      cur.style.setProperty("transform-origin", "center center", "important");
      cur.style.setProperty("transform", "translate(" + tx + "px," + ty + "px) scale(" + zoom + ")", "important");
    }
    if (lbl) lbl.textContent = Math.round(zoom * 100) + "%";
    return cur ? [cur] : [];
  }

  function setZoom(z) {
    zoom = Math.min(MAX, Math.max(MIN, +z.toFixed(2)));
    apply();
    save();
    wake();
  }
  function step(d) { setZoom(zoom + d * STEP); }
  function pan(dx, dy) { if (zoom > 1) { tx += dx; ty += dy; apply(); } }

  // Buuxi: ka saar xariijimaha madow si video-gu u buuxiyo meesha
  function fill() {
    const v = pick();
    if (!v) return;
    let z = 1;
    if (v.videoWidth && v.videoHeight) {
      const a = v.clientWidth / v.videoWidth, b = v.clientHeight / v.videoHeight;
      z = Math.max(a, b) / Math.min(a, b);
    }
    if (z < 1.02) z = 1.33; // xariijimuhu waxay ku dhex jiraan video-ga laftiisa (4:3 gudaha 16:9)
    setZoom(Math.abs(zoom - z) < 0.02 ? 1 : z);
  }

  // ---------- UI (lagu dhisay CSSOM si CSP-ga site-yadu uusan u joojin) ----------
  function mk(text, title, onClick) {
    const b = document.createElement("button");
    b.textContent = text;
    b.title = title;
    b.style.cssText =
      "all:initial;font:600 14px/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.78);" +
      "border:1px solid rgba(255,255,255,.45);border-radius:7px;padding:8px 11px;cursor:pointer;" +
      "min-width:34px;text-align:center;user-select:none;";
    ["click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "contextmenu"].forEach((t) =>
      b.addEventListener(t, (e) => {
        e.stopPropagation();
        if (t === "contextmenu") e.preventDefault();
        if (t === "click" && onClick) onClick(e);
      })
    );
    return b;
  }

  function build() {
    host = document.createElement("div");
    host.setAttribute("data-video-weyneeye", "");
    host.style.cssText =
      "all:initial;position:fixed;top:10px;right:10px;z-index:2147483647;display:flex;gap:5px;" +
      "transition:opacity .25s;opacity:1;";
    const root = host.attachShadow ? host.attachShadow({ mode: "closed" }) : host;
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:5px;";

    const move = mk("✥", "Jiid si aad u dhaqaajiso sawirka", null);
    move.style.cursor = "grab";
    move.style.touchAction = "none";
    let drag = null;
    move.addEventListener("pointerdown", (e) => {
      try { move.setPointerCapture(e.pointerId); } catch (x) {}
      drag = { x: e.clientX - tx, y: e.clientY - ty };
    });
    move.addEventListener("pointermove", (e) => {
      if (!drag || zoom === 1) return;
      tx = e.clientX - drag.x; ty = e.clientY - drag.y;
      apply();
    });
    const end = () => { drag = null; };
    move.addEventListener("pointerup", end);
    move.addEventListener("pointercancel", end);

    lbl = mk("100%", "Caadi ku celi (Alt+0)", () => setZoom(1));
    lbl.style.minWidth = "52px";

    bar.append(
      move,
      mk("−", "Yaree (Alt −)", () => step(-1)),
      lbl,
      mk("+", "Weynee (Alt +)", () => step(1)),
      mk("⤢", "Buuxi shaashadda (Alt+F)", fill)
    );
    root.appendChild(bar);
    host.addEventListener("mouseenter", () => { clearTimeout(hideTimer); host.style.opacity = "1"; });
    host.addEventListener("mouseleave", wake);
  }

  function wake() {
    if (!host) return;
    host.style.opacity = "1";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (host) host.style.opacity = "0.18"; }, 3000);
  }

  function tick() {
    const list = apply();
    if (!list.length) {
      if (host && host.parentNode) host.remove();
      return;
    }
    if (!host) build();
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== "VIDEO" && fs.tagName !== "IFRAME" ? fs : document.documentElement;
    if (host.parentNode !== parent) { parent.appendChild(host); wake(); }
    lbl.textContent = Math.round(zoom * 100) + "%";
  }

  document.addEventListener("fullscreenchange", tick);
  // Marka video bilaabmo, isla markiiba u wareeg kaas
  ["play", "playing", "ended", "emptied"].forEach((t) => document.addEventListener(t, () => setTimeout(tick, 50), true));
  document.addEventListener("mousemove", wake, { capture: true, passive: true });

  // Keyboard: Alt + / Alt − / Alt 0 / Alt F / Alt + fallaaraha (dhaqaaji)
  window.addEventListener(
    "keydown",
    (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || !current) return;
      const c = e.code, k = e.key;
      if (c === "Equal" || c === "NumpadAdd" || k === "+" || k === "=") step(1);
      else if (c === "Minus" || c === "NumpadSubtract" || k === "-") step(-1);
      else if (c === "Digit0" || c === "Numpad0") setZoom(1);
      else if (c === "KeyF") fill();
      else if (c === "ArrowLeft") pan(40, 0);
      else if (c === "ArrowRight") pan(-40, 0);
      else if (c === "ArrowUp") pan(0, 40);
      else if (c === "ArrowDown") pan(0, -40);
      else return;
      if (!current) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  tick();
  setInterval(tick, 1500);
})();
