// js/overlays.js
window.Heavenly = window.Heavenly || {};
Heavenly.overlay = Heavenly.overlay || (function(){
  const openStack = []; // merkt Reihenfolge (topmost zuletzt)

  function isOpen(el){
    if(!el) return false;
    return el.classList.contains("active") || el.classList.contains("open");
  }

  function open(el, cls = "active"){
    if(!el) return;
    el.classList.add(cls);

    // Stack pflegen: Element nur 1x
    const idx = openStack.indexOf(el);
    if(idx !== -1) openStack.splice(idx, 1);
    openStack.push(el);
  }

  function close(el, cls = "active"){
    if(!el) return;
    el.classList.remove(cls);

    const idx = openStack.indexOf(el);
    if(idx !== -1) openStack.splice(idx, 1);
  }

  function closeTop(){
    // schließt das zuletzt geöffnete Overlay
    const el = openStack[openStack.length - 1];
    if(!el) return false;

    // Welche Klasse entfernen?
    // dmPanel = active, profileScreen = active, imageViewer = open, profileMenu = open, popup = active
    if(el.id === "imageViewer" || el.classList.contains("imageViewer")){
      close(el, "open");
      return true;
    }

    // Menüs
    if(el.id === "profileMenu" || el.classList.contains("profileMenu")){
      close(el, "open");
      return true;
    }

    // Popups
    if(el.id === "loginPopup" || el.id === "registerPopup" || el.classList.contains("popup")){
      close(el, "active");
      return true;
    }

    // Panels / Screens
    close(el, "active");
    return true;
  }

  // global ESC: schließt top overlay
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      closeTop();
    }
  });

  return { open, close, closeTop, isOpen };
})();