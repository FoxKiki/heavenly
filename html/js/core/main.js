window.Heavenly = window.Heavenly || {};

window.addEventListener("DOMContentLoaded", async function () {
  var logo = document.getElementById("loginLogo");
  var username = "";

  if (Heavenly.api && Heavenly.api.getSession) {
    var result = await Heavenly.api.getSession();

    if (result && result.ok && result.data && result.data.username) {
      username = String(result.data.username).trim();
    }
  }

  if (username) {
    if (!Heavenly.state) Heavenly.state = {};
    Heavenly.state.currentUser = username;

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("homeScreen");
    }

    if (typeof showHome === "function") {
      showHome(username);
    }

    if (logo) {
      logo.style.display = "none";
    }

    return;
  }

  if (Heavenly.ui && Heavenly.ui.showScreen) {
    Heavenly.ui.showScreen("loginScreen");
  }

  if (logo) {
    logo.style.display = "block";
  }
});