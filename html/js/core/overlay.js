window.Heavenly = window.Heavenly || {};

Heavenly.overlay = Heavenly.overlay || (function () {
  const openStack = [];

  function isOpen(element) {
    if (!element) return false;
    return element.classList.contains("active") || element.classList.contains("open");
  }

  function open(element, className) {
    if (!element) return;
    var targetClass = className || "active";

    element.classList.add(targetClass);

    const index = openStack.indexOf(element);
    if (index !== -1) {
      openStack.splice(index, 1);
    }

    openStack.push(element);
  }

  function close(element, className) {
    if (!element) return;
    var targetClass = className || "active";

    element.classList.remove(targetClass);

    const index = openStack.indexOf(element);
    if (index !== -1) {
      openStack.splice(index, 1);
    }
  }

  function closeTop() {
    const element = openStack[openStack.length - 1];
    if (!element) return false;

    if (element.id === "imageViewer" || element.classList.contains("imageViewer")) {
      close(element, "open");
      return true;
    }

    if (element.id === "profileMenu" || element.classList.contains("profileMenu")) {
      close(element, "open");
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