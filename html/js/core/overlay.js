window.Heavenly = window.Heavenly || {};

Heavenly.overlay = Heavenly.overlay || (function () {
  var openStack = [];

  function updateBodyState() {
    var hasOpenOverlay = openStack.length > 0;

    if (hasOpenOverlay) {
      document.body.classList.add("hasOverlayOpen");
    } else {
      document.body.classList.remove("hasOverlayOpen");
    }
  }

  function isOpen(element, className) {
    if (!element) return false;

    if (className) {
      return element.classList.contains(className);
    }

    return element.classList.contains("active") || element.classList.contains("open");
  }

  function open(element, className) {
    if (!element) return;

    var targetClass = className || "active";
    element.classList.add(targetClass);

    var index = openStack.indexOf(element);
    if (index !== -1) {
      openStack.splice(index, 1);
    }

    openStack.push(element);
    updateBodyState();
  }

  function close(element, className) {
    if (!element) return;

    var targetClass = className || "active";
    element.classList.remove(targetClass);

    var index = openStack.indexOf(element);
    if (index !== -1) {
      openStack.splice(index, 1);
    }

    updateBodyState();
  }

  function closeTop() {
    var element = openStack[openStack.length - 1];
    if (!element) return false;

    if (element.id === "imageViewer" || element.classList.contains("imageViewer")) {
      close(element, "open");
      return true;
    }

    if (element.id === "profileMenu" || element.classList.contains("profileMenu")) {
      close(element, "open");
      return true;
    }

    if (element.id === "foreignProfileMenu" || element.classList.contains("foreignProfileMenu")) {
      close(element, "open");
      return true;
    }

    if (
      element.id === "globalSearchDropdown" ||
      element.classList.contains("globalSearchDropdown")
    ) {
      close(element, "open");
      return true;
    }

    if (element.id === "dmPanel" || element.classList.contains("dmPanel")) {
      close(element, "active");
      return true;
    }

    if (
      element.id === "loginPopup" ||
      element.id === "registerPopup" ||
      element.classList.contains("popup")
    ) {
      close(element, "active");
      return true;
    }

    close(element, "active");
    return true;
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeTop();
    }
  });

  return {
    open: open,
    close: close,
    closeTop: closeTop,
    isOpen: isOpen
  };
})();