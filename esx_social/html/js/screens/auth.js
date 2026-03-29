window.Heavenly = window.Heavenly || {};

(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function showPopup(popupId) {
    var popup = getEl(popupId);
    var loginScreen = getEl("loginScreen");

    if (popup) {
      if (Heavenly.overlay && Heavenly.overlay.open) {
        Heavenly.overlay.open(popup, "active");
      } else {
        popup.classList.add("active");
      }
    }

    if (loginScreen) {
      loginScreen.classList.add("popup-open");
    }
  }

  function completeLogin(username, message) {
    if (!Heavenly.state) {
      Heavenly.state = {};
    }

    Heavenly.state.currentUser = username;
    Heavenly.state.viewedProfileUser = null;

    window.closePopup();
    window.setFeedback(message || "Login erfolgreich", true);

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("homeScreen");
    }

    try {
      if (typeof showHome === "function") {
        showHome(username);
      }
    } catch (error) {
      console.error("showHome failed:", error);
    }

    window.hideLoginLogo();
  }

  window.openLogin = function () {
    showPopup("loginPopup");
  };

  window.openRegister = function () {
    showPopup("registerPopup");
  };

  window.closePopup = function () {
    var loginPopup = getEl("loginPopup");
    var registerPopup = getEl("registerPopup");
    var loginScreen = getEl("loginScreen");

    if (loginPopup) {
      if (Heavenly.overlay && Heavenly.overlay.close) {
        Heavenly.overlay.close(loginPopup, "active");
      } else {
        loginPopup.classList.remove("active");
      }
    }

    if (registerPopup) {
      if (Heavenly.overlay && Heavenly.overlay.close) {
        Heavenly.overlay.close(registerPopup, "active");
      } else {
        registerPopup.classList.remove("active");
      }
    }

    if (loginScreen) {
      loginScreen.classList.remove("popup-open");
    }
  };

  window.setFeedback = function (message, ok) {
    var element = getEl("feedback");
    if (!element) return;

    element.innerText = message;
    element.style.color = ok === false ? "tomato" : "lime";

    setTimeout(function () {
      if (element.innerText === message) {
        element.innerText = "";
      }
    }, 2200);
  };

  window.showLoginLogo = function () {
    var logo = getEl("loginLogo");
    if (logo) {
      logo.style.display = "block";
    }
  };

  window.hideLoginLogo = function () {
    var logo = getEl("loginLogo");
    if (logo) {
      logo.style.display = "none";
    }
  };

  window.doRegisterLocal = async function (username, password, passwordRepeat) {
    if (!username || !password) {
      window.setFeedback("Bitte Username und Passwort eingeben", false);
      return;
    }

    if (password !== passwordRepeat) {
      window.setFeedback("Passwörter stimmen nicht überein", false);
      return;
    }

    if (!Heavenly.api || !Heavenly.api.register) {
      window.setFeedback("API nicht geladen", false);
      return;
    }

    try {
      var result = await Heavenly.api.register(username, password, passwordRepeat);

      if (!result || !result.ok) {
        window.setFeedback(
          result && result.message ? result.message : "Register fehlgeschlagen",
          false
        );
        return;
      }

      var message =
        result.data && result.data.message
          ? result.data.message
          : "Account erfolgreich erstellt";

      window.setFeedback(message, true);
      window.closePopup();
    } catch (error) {
      console.error("register failed:", error);
      window.setFeedback("Register fehlgeschlagen", false);
    }
  };

  window.doLoginLocal = async function (username, password) {
    if (!username || !password) {
      window.setFeedback("Bitte Username und Passwort eingeben", false);
      return;
    }

    if (!Heavenly.api || !Heavenly.api.login) {
      window.setFeedback("API nicht geladen", false);
      return;
    }

    try {
      var result = await Heavenly.api.login(username, password);

      if (!result || !result.ok) {
        window.setFeedback(
          result && result.message ? result.message : "Login fehlgeschlagen",
          false
        );
        return;
      }

      var loginUser =
        result.data && result.data.username
          ? result.data.username
          : username;

      var loginMessage =
        result.data && result.data.message
          ? result.data.message
          : "Login erfolgreich";

      completeLogin(loginUser, loginMessage);
    } catch (error) {
      console.error("login failed:", error);
      window.setFeedback("Login fehlgeschlagen", false);
    }
  };

  window.doRegister = function () {
    var regUser = getEl("regUser");
    var regPass = getEl("regPass");
    var regPass2 = getEl("regPass2");

    var username = regUser ? regUser.value.trim() : "";
    var password = regPass ? regPass.value : "";
    var passwordRepeat = regPass2 ? regPass2.value : "";

    window.doRegisterLocal(username, password, passwordRepeat);
  };

  window.doLogin = function () {
    var logUser = getEl("logUser");
    var logPass = getEl("logPass");

    var username = logUser ? logUser.value.trim() : "";
    var password = logPass ? logPass.value : "";

    window.doLoginLocal(username, password);
  };

  window.doLogout = async function () {
    try {
      if (Heavenly.api && Heavenly.api.logout) {
        await Heavenly.api.logout();
      }
    } catch (error) {
      console.error("logout failed:", error);
    }

    if (Heavenly.state) {
      Heavenly.state.currentUser = null;
      Heavenly.state.viewedProfileUser = null;
    }

    window.closePopup();

    if (typeof closeDMs === "function") closeDMs();
    if (typeof closeImageViewer === "function") closeImageViewer();
    if (typeof closeProfileMenu === "function") closeProfileMenu();
    if (typeof closeFriendRequests === "function") closeFriendRequests();
    if (typeof closeRemoveFriendPopup === "function") closeRemoveFriendPopup();
    if (typeof closeGlobalSearchPopup === "function") closeGlobalSearchPopup();

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("loginScreen");
    }

    window.showLoginLogo();
  };

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.closePopup();
    }
  });
})();