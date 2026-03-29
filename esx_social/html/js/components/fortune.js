window.Heavenly = window.Heavenly || {};
Heavenly.fortune = Heavenly.fortune || {};

(function () {
  const STORAGE_KEY = "heavenlyFortune";
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  function getBox() {
    return document.getElementById("fortuneBox");
  }

  function getTextEl() {
    return document.getElementById("fortuneText");
  }

  function getViewport() {
    return document.querySelector(".fortuneViewport");
  }

  function getList() {
    return Array.isArray(Heavenly.fortunes) ? Heavenly.fortunes : [];
  }

  function readStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Fortune lesen fehlgeschlagen", error);
      return null;
    }
  }

  function writeStored(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Fortune speichern fehlgeschlagen", error);
    }
  }

  function pickRandomFortune(previousText) {
    const list = getList();
    var lastText = previousText || "";

    if (list.length === 0) {
      return "✨ Heute wartet etwas Gutes auf dich.";
    }

    if (list.length === 1) {
      return list[0];
    }

    let text = list[Math.floor(Math.random() * list.length)];
    let tries = 0;

    while (text === lastText && tries < 10) {
      text = list[Math.floor(Math.random() * list.length)];
      tries++;
    }

    return text;
  }

  function applyTicker() {
    const textEl = getTextEl();
    const viewport = getViewport();

    if (!textEl || !viewport) return;

    textEl.classList.remove("is-scrolling");
    textEl.style.removeProperty("--scroll-distance");

    const overflow = textEl.scrollWidth - viewport.clientWidth;

    if (overflow > 8) {
      textEl.style.setProperty("--scroll-distance", overflow + "px");
      textEl.classList.add("is-scrolling");
    }
  }

  function setText(text) {
    const box = getBox();
    const textEl = getTextEl();

    if (!box || !textEl) return;

    textEl.classList.remove("is-scrolling");
    textEl.style.removeProperty("--scroll-distance");
    textEl.textContent = text;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyTicker();
      });
    });
  }

  function refresh(force) {
    var shouldForce = !!force;
    const saved = readStored();
    const now = Date.now();

    if (!shouldForce && saved && saved.text && saved.time && (now - saved.time) < TWO_HOURS) {
      setText(saved.text);
      return;
    }

    const text = pickRandomFortune(saved && saved.text ? saved.text : "");

    writeStored({
      text: text,
      time: now
    });

    setText(text);
  }

  function init() {
    const box = getBox();
    if (!box) return;

    refresh(false);
  }

  Heavenly.fortune.init = init;
  Heavenly.fortune.refresh = refresh;

  window.addEventListener("resize", applyTicker);
})();