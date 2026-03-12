window.Heavenly = window.Heavenly || {};

Heavenly.state = Heavenly.state || {
  currentUser: null,
  viewedProfileUser: null
};

Heavenly.util = Heavenly.util || {
  initials: function (name) {
    if (!name) return "?";

    var parts = String(name)
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);

    var initials = parts
      .map(function (part) {
        return part[0].toUpperCase();
      })
      .join("");

    return initials || String(name).charAt(0).toUpperCase();
  }
};

Heavenly.ui = Heavenly.ui || {};

Heavenly.ui.showScreen = function (screenId) {
  var loginLogo = document.getElementById("loginLogo");
  var screens = document.querySelectorAll(".screen");
  var target = document.getElementById(screenId);

  screens.forEach(function (screen) {
    screen.classList.remove("active");
  });

  if (!target) {
    console.warn("showScreen: screen not found:", screenId);
    return;
  }

  target.classList.add("active");

  if (loginLogo) {
    loginLogo.style.display = screenId === "loginScreen" ? "block" : "none";
  }

  if (typeof closeDMs === "function") closeDMs();
  if (typeof closePopup === "function") closePopup();
  if (typeof closeImageViewer === "function") closeImageViewer();
  if (typeof closeProfileMenu === "function") closeProfileMenu();
};