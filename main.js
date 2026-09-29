(function () {
  const input = document.getElementById("author");
  const heads = document.querySelectorAll("[data-surname]");
  const KEY = "draftden.landing.author";

  const PARTICLES = ["le", "la", "de", "du", "des", "del", "della", "di", "da", "van", "von", "der", "den", "ter", "bin", "ibn", "al", "el"];
  function surname(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Writer";
    let start = words.length - 1;
    while (start > 0 && PARTICLES.includes(words[start - 1].toLowerCase())) start -= 1;
    return words.slice(start).join(" ");
  }

  const notebook = document.getElementById("notebook-name");
  const LABEL_WIDTH = 112;
  function sign(name) {
    heads.forEach((el) => { el.textContent = surname(name); });

    if (input) input.style.width = Math.max(17, name.length + 2) + "ch";
    if (!notebook) return;
    notebook.textContent = name.trim();
    notebook.removeAttribute("textLength");
    if (notebook.getComputedTextLength && notebook.getComputedTextLength() > LABEL_WIDTH) {
      notebook.setAttribute("textLength", String(LABEL_WIDTH));
      notebook.setAttribute("lengthAdjust", "spacingAndGlyphs");
    }
  }

  if (input) {
    let saved = "";
    try { saved = localStorage.getItem(KEY) || ""; } catch (e) {  }
    if (saved) { input.value = saved; sign(saved); }

    if (document.fonts) document.fonts.ready.then(() => { if (input.value) sign(input.value); });
    input.addEventListener("input", () => {
      sign(input.value);
      try { localStorage.setItem(KEY, input.value); } catch (e) {  }
    });
  }

  const release = window.DRAFTDEN_RELEASE;
  if (release) {
    const line = document.querySelector("[data-release-line]");
    if (line) line.textContent = release.version;
    const entry = (label, hint, url, className) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      if (className) a.className = className;
      a.href = url;
      a.textContent = label;
      const note = document.createElement("span");
      note.className = "dl-note";
      note.textContent = hint;
      li.append(a, note);
      return li;
    };
    const linux = document.querySelector('[data-builds="linux"]');
    if (linux && release.linux) linux.replaceChildren(...release.linux.map((b) => entry(b.label, b.hint, b.url)));
    const windows = document.querySelector('[data-build="windows"]');
    if (windows && release.windows) {
      windows.href = release.windows.url;
      if (windows.nextElementSibling) windows.nextElementSibling.textContent = release.windows.label;
    }
    const mac = document.querySelector('[data-build-li="mac"]');
    if (mac && release.mac) {
      const li = entry("Download for macOS", release.mac.label, release.mac.url, "dl");
      li.firstChild.dataset.os = "mac";
      mac.replaceChildren(...li.childNodes);
    }
  }

  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  const os = /mac/i.test(platform) ? "mac" : /win/i.test(platform) ? "windows" : /linux|x11/i.test(platform) ? "linux" : null;
  if (os) {
    const link = document.querySelector('.dl[data-os="' + os + '"]:not(.dl-soon)');
    if (link) link.classList.add("yours");
  }
})();

(function () {
  const root = document.documentElement;
  const stack = document.getElementById("stack");
  const frame = document.getElementById("frame");
  const sheets = Array.from(document.querySelectorAll("#frame > .sheet"));
  const status = document.getElementById("page-status");
  if (!root.classList.contains("pile") || !frame || sheets.length === 0) return;

  const PAGE_W = 860;
  const PAGE_H = 1000;
  const STRIPS = 14;
  const TURN_MS = 950;
  const BEND_DEG = 115;
  const WHEEL_QUIET_MS = 260;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let turning = false;

  sheets.forEach((sheet) => { sheet.tabIndex = -1; });

  const turned = document.createElement("div");
  turned.className = "turned";
  turned.setAttribute("aria-hidden", "true");
  frame.appendChild(turned);
  function showTurned(count) {
    turned.hidden = count === 0;
    turned.classList.toggle("one", count === 1);
  }

  function fit() {
    const room = stack.getBoundingClientRect();
    const scale = Math.min(room.height / (PAGE_H + 30), room.width / (PAGE_W + 80), 1.15);
    stack.style.setProperty("--scale", String(scale));
  }
  fit();
  window.addEventListener("resize", fit);

  function show(index) {
    current = index;
    sheets.forEach((sheet, i) => {
      const on = i === index;
      sheet.classList.toggle("is-current", on);
      if (on) { sheet.removeAttribute("inert"); sheet.removeAttribute("aria-hidden"); }
      else { sheet.setAttribute("inert", ""); sheet.setAttribute("aria-hidden", "true"); }
    });
    const left = sheets.length - 1 - index;
    frame.classList.toggle("edges-2", left >= 2);
    frame.classList.toggle("edges-1", left === 1);
    frame.classList.toggle("edges-0", left === 0);
    if (status) status.textContent = "Page " + (index + 1) + " of " + sheets.length;
  }

  function buildTurningPage(sheet) {
    const flipper = document.createElement("div");
    flipper.className = "flipper";
    flipper.setAttribute("aria-hidden", "true");
    const stripH = PAGE_H / STRIPS;
    const strips = [];
    const shades = [];
    let parent = flipper;
    for (let i = 0; i < STRIPS; i++) {
      const strip = document.createElement("div");
      strip.className = "strip";
      strip.style.height = stripH + "px";
      strip.style.top = i === 0 ? "0" : "100%";
      const front = document.createElement("div");
      front.className = "face front";
      const slice = document.createElement("div");
      slice.className = "slice";
      slice.style.top = -(i * stripH) + 1.5 + "px";
      const copy = sheet.cloneNode(true);
      copy.classList.remove("is-current");
      copy.classList.add("flip-clone");
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      const liveInput = sheet.querySelector("input");
      const copyInput = copy.querySelector("input");
      if (liveInput && copyInput) copyInput.value = liveInput.value;
      slice.appendChild(copy);
      const frontShade = document.createElement("div");
      frontShade.className = "shade";
      front.append(slice, frontShade);
      const back = document.createElement("div");
      back.className = "face back";
      const backShade = document.createElement("div");
      backShade.className = "shade";
      back.appendChild(backShade);
      strip.append(front, back);
      parent.appendChild(strip);
      strips.push(strip);
      shades.push([frontShade, backShade]);
      parent = strip;
    }
    const shadow = document.createElement("div");
    shadow.className = "flip-shadow";
    frame.append(shadow, flipper);
    return { flipper, shadow, strips, shades };
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function pose(page, p) {
    const base = 180 * p;
    const bend = BEND_DEG * Math.sin(Math.PI * p);
    let above = 0;
    for (let i = 0; i < STRIPS; i++) {

      const angle = Math.min(180, base + bend * (i * (i + 1)) / (STRIPS * (STRIPS - 1)));
      page.strips[i].style.transform = "rotateX(" + (angle - above) + "deg)";
      above = angle;
      const tilt = Math.sin((angle * Math.PI) / 180);
      page.shades[i][0].style.opacity = String(0.22 * tilt);
      page.shades[i][1].style.opacity = String(0.12 + 0.18 * tilt);
    }
    page.shadow.style.opacity = String(Math.sin(Math.PI * p));
  }

  function turn(sheet, from, to, done) {
    const page = buildTurningPage(sheet);
    pose(page, from);
    const start = performance.now();
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      page.flipper.remove();
      page.shadow.remove();
      done();
    }
    function step(time) {
      if (finished) return;
      const t = Math.min(1, (time - start) / TURN_MS);
      pose(page, from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);

    setTimeout(finish, TURN_MS + 400);
  }

  function go(index, { focus = false } = {}) {
    const target = Math.max(0, Math.min(sheets.length - 1, index));
    if (target === current || turning) return;
    const land = () => { turning = false; if (focus) sheets[current].focus({ preventScroll: true }); };
    if (reduceMotion || Math.abs(target - current) > 1) { show(target); showTurned(target); land(); return; }
    turning = true;
    if (target > current) {

      const leaving = sheets[current];
      show(target);
      turn(leaving, 0, 1, () => { showTurned(target); land(); });
    } else {

      showTurned(target);
      turn(sheets[target], 1, 0, () => { show(target); land(); });
    }
  }
  const next = (opts) => go(current + 1, opts);
  const prev = (opts) => go(current - 1, opts);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const i = sheets.findIndex((s) => "#" + s.id === link.getAttribute("href"));
      if (i < 0) return;
      e.preventDefault();
      go(i, { focus: true });
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;

    if ((e.key === " " || e.key === "Enter") && e.target instanceof Element && e.target.closest("a, button, summary")) return;
    const forward = ["ArrowRight", "ArrowDown", "PageDown", " "];
    const back = ["ArrowLeft", "ArrowUp", "PageUp"];
    if (forward.includes(e.key)) { e.preventDefault(); next({ focus: true }); }
    else if (back.includes(e.key)) { e.preventDefault(); prev({ focus: true }); }
    else if (e.key === "Home") { e.preventDefault(); go(0, { focus: true }); }
    else if (e.key === "End") { e.preventDefault(); go(sheets.length - 1, { focus: true }); }
  });

  let quietTimer = null;
  let gestureUsed = false;
  window.addEventListener("wheel", (e) => {
    e.preventDefault();
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => { gestureUsed = false; }, WHEEL_QUIET_MS);
    if (gestureUsed || turning || Math.abs(e.deltaY) < 4) return;
    gestureUsed = true;
    if (e.deltaY > 0) next(); else prev();
  }, { passive: false });

  const start = sheets.findIndex((s) => location.hash && "#" + s.id === location.hash);
  show(start > 0 ? start : 0);
  showTurned(current);
})();
