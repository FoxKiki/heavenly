// html/js/core/storage.js
// storage.js
window.Heavenly = window.Heavenly || {};

Heavenly.storage = (function(){
  const PREFIX = "heavenly";

  function normUser(user){
    return String(user || "").trim().toLowerCase();
  }

  function key(user, thing){
    const u = normUser(user);
    return u ? `${PREFIX}_${thing}_${u}` : `${PREFIX}_${thing}`;
  }

  function readJSON(k, fallback){
    try {
      const raw = localStorage.getItem(k);
      if(raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(k, val){
    localStorage.setItem(k, JSON.stringify(val));
  }

  // -------- global --------
  function getAccounts(){ return readJSON(key(null, "accounts"), []); }
  function setAccounts(list){ writeJSON(key(null, "accounts"), list); }

  function getSession(){ return readJSON(key(null, "session"), null); }
  function setSession(obj){ writeJSON(key(null, "session"), obj); }
  function clearSession(){ localStorage.removeItem(key(null, "session")); }

  // -------- per user --------
  function getFriends(user){ return readJSON(key(user, "friends"), []); }
  function setFriends(user, list){ writeJSON(key(user, "friends"), list); }

  function getAvatar(user){
    try { return localStorage.getItem(key(user, "avatar")); } catch { return null; }
  }
  function setAvatar(user, dataUrl){
    if(!dataUrl) localStorage.removeItem(key(user, "avatar"));
    else localStorage.setItem(key(user, "avatar"), dataUrl);
  }

  function getCover(user){
    try { return localStorage.getItem(key(user, "cover")); } catch { return null; }
  }
  function setCover(user, dataUrl){
    if(!dataUrl) localStorage.removeItem(key(user, "cover"));
    else localStorage.setItem(key(user, "cover"), dataUrl);
  }

  function getSettings(user){ return readJSON(key(user, "settings"), {}); }
  function setSettings(user, obj){ writeJSON(key(user, "settings"), obj || {}); }

  function deleteUser(user){
    const normalized = normUser(user);
    if(!normalized) return;

    const accounts = getAccounts().filter(function(acc){
      return normUser(acc && acc.username) !== normalized;
    });
    setAccounts(accounts);

    localStorage.removeItem(key(user, "friends"));
    localStorage.removeItem(key(user, "avatar"));
    localStorage.removeItem(key(user, "cover"));
    localStorage.removeItem(key(user, "settings"));
  }

  return {
    key,
    getAccounts, setAccounts,
    getSession, setSession, clearSession,
    getFriends, setFriends,
    getAvatar, setAvatar,
    getCover, setCover,
    getSettings, setSettings,
    deleteUser
  };
})();

// html/js/core/app_state.js
window.Heavenly = window.Heavenly || {};

Heavenly.state = Heavenly.state || {
  currentUser: null
};

Heavenly.util = Heavenly.util || {
  initials: function(name) {
    if (!name) return "?";

    var parts = String(name)
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);

    var init = parts
      .map(function(part) {
        return part[0].toUpperCase();
      })
      .join("");

    return init || String(name).charAt(0).toUpperCase();
  }
};

Heavenly.ui = Heavenly.ui || {};

Heavenly.ui.showScreen = function(screenId) {
  var loginLogo = document.getElementById("loginLogo");
  var screens = document.querySelectorAll(".screen");
  var target = document.getElementById(screenId);

  screens.forEach(function(screen) {
    screen.classList.remove("active");
  });

  if (target) {
    target.classList.add("active");
  } else {
    console.warn("showScreen: screen not found:", screenId);
    return;
  }

  if (loginLogo) {
    loginLogo.style.display = (screenId === "loginScreen") ? "block" : "none";
  }

  if (typeof closeDMs === "function") closeDMs();
  if (typeof closePopup === "function") closePopup();
  if (typeof closeImageViewer === "function") closeImageViewer();
  if (typeof closeProfileMenu === "function") closeProfileMenu();
};

// html/js/core/env.js
window.Heavenly = window.Heavenly || {};
Heavenly.env = Heavenly.env || {};

Heavenly.env.isLbTablet = function () {
  return typeof window.fetchNui === "function" && typeof window.resourceName === "string";
};

Heavenly.env.isFiveM = function () {
  return Heavenly.env.isLbTablet() || typeof window.GetParentResourceName === "function";
};

Heavenly.env.getResourceName = function () {
  if (Heavenly.env.isLbTablet()) return window.resourceName;
  if (!Heavenly.env.isFiveM()) return null;
  return window.GetParentResourceName();
};

// html/js/core/api.js
window.Heavenly = window.Heavenly || {};

Heavenly.api = (function () {
  function isFiveM() {
    return !!(Heavenly.env && Heavenly.env.isFiveM && Heavenly.env.isFiveM());
  }

  function isLbTablet() {
    return !!(Heavenly.env && Heavenly.env.isLbTablet && Heavenly.env.isLbTablet());
  }

  function ok(data) {
    return Promise.resolve({
      ok: true,
      data: data
    });
  }

  function fail(message) {
    return Promise.resolve({
      ok: false,
      message: message || "Unbekannter Fehler"
    });
  }

  async function nuiPost(endpoint, payload) {
    if (!isFiveM()) {
      return fail("NUI nur im FiveM-Modus verfügbar");
    }

    try {
      var resourceName = Heavenly.env && Heavenly.env.getResourceName
        ? Heavenly.env.getResourceName()
        : null;

      if (!resourceName) {
        return fail("Resource Name nicht gefunden");
      }

      if (isLbTablet() && typeof window.fetchNui === "function") {
        var lbData = await window.fetchNui(endpoint, payload || {}, resourceName);

        if (lbData && lbData.ok === false) {
          return fail(lbData.message || "Serverfehler");
        }

        return {
          ok: true,
          data: lbData
        };
      }

      var res = await fetch("https://" + resourceName + "/" + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
      });

      var data = await res.json().catch(function () {
        return { ok: false, message: "Ungültige Server-Antwort" };
      });

      if (data && data.ok === false) {
        return fail(data.message || "Serverfehler");
      }

      return {
        ok: true,
        data: data
      };
    } catch (err) {
      return fail(endpoint + " fehlgeschlagen");
    }
  }

  /* =========================
     LOCAL BACKEND
  ========================= */

  function localRegister(username, password, passwordRepeat) {
    if (!username || !password) {
      return fail("Bitte Username und Passwort eingeben");
    }

    if (password !== passwordRepeat) {
      return fail("Passwörter stimmen nicht überein");
    }

    if (!Heavenly.storage || !Heavenly.storage.getAccounts || !Heavenly.storage.setAccounts) {
      return fail("Storage nicht geladen");
    }

    var accounts = Heavenly.storage.getAccounts();
    var exists = accounts.find(function (a) {
      return String(a.username).toLowerCase() === String(username).toLowerCase();
    });

    if (exists) {
      return fail("Username existiert bereits");
    }

    accounts.push({
      username: username,
      password: password
    });

    Heavenly.storage.setAccounts(accounts);

    return ok({
      username: username,
      message: "Account erfolgreich erstellt"
    });
  }

  function localLogin(username, password) {
    if (!Heavenly.storage || !Heavenly.storage.getAccounts) {
      return fail("Storage nicht geladen");
    }

    var accounts = Heavenly.storage.getAccounts();
    var acc = accounts.find(function (a) {
      return a.username === username;
    });

    if (!acc) {
      return fail("Account existiert nicht");
    }

    if (acc.password !== password) {
      return fail("Falsches Passwort");
    }

    if (Heavenly.storage.setSession) {
      Heavenly.storage.setSession({ username: username });
    }

    return ok({
      username: username,
      message: "Login erfolgreich"
    });
  }

  function localLogout() {
    if (Heavenly.storage && Heavenly.storage.clearSession) {
      Heavenly.storage.clearSession();
    }

    return ok({
      message: "Logout erfolgreich"
    });
  }

  function localGetSession() {
    var session = Heavenly.storage && Heavenly.storage.getSession
      ? Heavenly.storage.getSession()
      : null;

    return ok(session || null);
  }

  function localGetProfile(user) {
    if (!user) return fail("Kein Benutzer");

    var settings = Heavenly.storage && Heavenly.storage.getSettings
      ? Heavenly.storage.getSettings(user)
      : {};

    return ok({
      username: user,
      status: settings && settings.status ? settings.status : "",
      avatar: Heavenly.storage && Heavenly.storage.getAvatar ? Heavenly.storage.getAvatar(user) : null,
      cover: Heavenly.storage && Heavenly.storage.getCover ? Heavenly.storage.getCover(user) : null,
      settings: settings || {}
    });
  }

  function localSaveStatus(user, status) {
    if (!user) return fail("Kein Benutzer");

    var settings = Heavenly.storage && Heavenly.storage.getSettings
      ? Heavenly.storage.getSettings(user)
      : {};

    settings = settings || {};
    settings.status = status || "";

    if (Heavenly.storage && Heavenly.storage.setSettings) {
      Heavenly.storage.setSettings(user, settings);
    }

    return ok({ status: settings.status });
  }

  function localSaveTheme(user, theme) {
    if (!user) return fail("Kein Benutzer");

    var settings = Heavenly.storage && Heavenly.storage.getSettings
      ? Heavenly.storage.getSettings(user)
      : {};

    settings = settings || {};
    settings.homeProfileTheme = theme || {};

    if (Heavenly.storage && Heavenly.storage.setSettings) {
      Heavenly.storage.setSettings(user, settings);
    }

    return ok(settings.homeProfileTheme);
  }

  function localGetTheme(user) {
    if (!user) return fail("Kein Benutzer");

    var settings = Heavenly.storage && Heavenly.storage.getSettings
      ? Heavenly.storage.getSettings(user)
      : {};

    settings = settings || {};

    return ok(settings.homeProfileTheme || {});
  }

  function localSetAvatar(user, dataUrl) {
    if (!user) return fail("Kein Benutzer");

    if (Heavenly.storage && Heavenly.storage.setAvatar) {
      Heavenly.storage.setAvatar(user, dataUrl);
    }

    return ok({ avatar: dataUrl || null });
  }

  function localGetAvatar(user) {
    if (!user) return fail("Kein Benutzer");

    var avatar = Heavenly.storage && Heavenly.storage.getAvatar
      ? Heavenly.storage.getAvatar(user)
      : null;

    return ok(avatar);
  }

  function localSetCover(user, dataUrl) {
    if (!user) return fail("Kein Benutzer");

    if (Heavenly.storage && Heavenly.storage.setCover) {
      Heavenly.storage.setCover(user, dataUrl);
    }

    return ok({ cover: dataUrl || null });
  }

  function localGetCover(user) {
    if (!user) return fail("Kein Benutzer");

    var cover = Heavenly.storage && Heavenly.storage.getCover
      ? Heavenly.storage.getCover(user)
      : null;

    return ok(cover);
  }

  function localGetFriends(user) {
    if (!user) return fail("Kein Benutzer");

    var friends = Heavenly.storage && Heavenly.storage.getFriends
      ? Heavenly.storage.getFriends(user)
      : [];

    return ok(friends || []);
  }

  function localSetFriends(user, list) {
    if (!user) return fail("Kein Benutzer");

    if (Heavenly.storage && Heavenly.storage.setFriends) {
      Heavenly.storage.setFriends(user, list || []);
    }

    return ok(list || []);
  }

  function localClearProfileData(user) {
    if (!user) return fail("Kein Benutzer");

    if (Heavenly.storage && Heavenly.storage.setAvatar) {
      Heavenly.storage.setAvatar(user, null);
    }

    if (Heavenly.storage && Heavenly.storage.setCover) {
      Heavenly.storage.setCover(user, null);
    }

    if (Heavenly.storage && Heavenly.storage.setFriends) {
      Heavenly.storage.setFriends(user, []);
    }

    if (Heavenly.storage && Heavenly.storage.setSettings) {
      Heavenly.storage.setSettings(user, {});
    }

    return ok({ cleared: true });
  }

  function localDeleteAccount(user) {
    if (!user) return fail("Kein Benutzer");
    if (!Heavenly.storage) return fail("Storage nicht geladen");

    var normalized = String(user).trim().toLowerCase();
    var accounts = Heavenly.storage.getAccounts ? Heavenly.storage.getAccounts() : [];

    accounts.forEach(function (acc) {
      var username = acc && acc.username ? acc.username : "";
      if (!username) return;

      if (String(username).trim().toLowerCase() === normalized) {
        return;
      }

      if (Heavenly.storage.getFriends && Heavenly.storage.setFriends) {
        var friends = Heavenly.storage.getFriends(username) || [];
        friends = friends.filter(function (entry) {
          return String(entry).trim().toLowerCase() !== normalized;
        });
        Heavenly.storage.setFriends(username, friends);
      }

      if (Heavenly.storage.getSettings && Heavenly.storage.setSettings) {
        var settings = Heavenly.storage.getSettings(username) || {};

        var requests = Array.isArray(settings.friendRequests) ? settings.friendRequests : [];
        settings.friendRequests = requests.filter(function (entry) {
          return String(entry).trim().toLowerCase() !== normalized;
        });

        var blocked = Array.isArray(settings.blockedUsers) ? settings.blockedUsers : [];
        settings.blockedUsers = blocked.filter(function (entry) {
          return String(entry).trim().toLowerCase() !== normalized;
        });

        Heavenly.storage.setSettings(username, settings);
      }
    });

    if (Heavenly.storage.deleteUser) {
      Heavenly.storage.deleteUser(user);
    } else {
      if (Heavenly.storage.setAvatar) Heavenly.storage.setAvatar(user, null);
      if (Heavenly.storage.setCover) Heavenly.storage.setCover(user, null);
      if (Heavenly.storage.setFriends) Heavenly.storage.setFriends(user, []);
      if (Heavenly.storage.setSettings) Heavenly.storage.setSettings(user, {});
    }

    if (Heavenly.storage.clearSession) {
      Heavenly.storage.clearSession();
    }

    return ok({
      deleted: true,
      username: user
    });
  }

  /* =========================
     FIVEM BACKEND
  ========================= */

  function unwrapNuiResult(result) {
    if (!result || !result.ok) {
      return result || { ok: false, message: "Unbekannter Fehler" };
    }

    var payload = result.data || {};

    if (payload && payload.ok === false) {
      return {
        ok: false,
        message: payload.message || "Serverfehler"
      };
    }

    return {
      ok: true,
      data: Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload
    };
  }

  async function fivemRegister(username, password, passwordRepeat) {
    return unwrapNuiResult(await nuiPost("register", {
      username: username,
      password: password,
      passwordRepeat: passwordRepeat
    }));
  }

  async function fivemLogin(username, password) {
    return unwrapNuiResult(await nuiPost("login", {
      username: username,
      password: password
    }));
  }

  async function fivemLogout() {
    return unwrapNuiResult(await nuiPost("logout", {}));
  }

  async function fivemGetSession() {
    return unwrapNuiResult(await nuiPost("getSession", {}));
  }

  async function fivemGetProfile(user) {
    var result = await nuiPost("getProfile", { username: user });

    if (!result.ok) {
      return result;
    }

    var raw = result.data || {};
    var profile = raw.data || raw.profile || raw;

    return {
      ok: true,
      data: {
        username: user,
        status: profile.status || "",
        avatar: profile.avatar || null,
        cover: profile.cover || null,
        settings: profile.settings || {
          status: profile.status || "",
          homeProfileTheme: profile.theme || {}
        }
      }
    };
  }

  async function fivemSaveStatus(user, status) {
    return unwrapNuiResult(await nuiPost("saveStatus", {
      username: user,
      status: status
    }));
  }

  async function fivemSaveTheme(user, theme) {
    return unwrapNuiResult(await nuiPost("saveTheme", {
      username: user,
      theme: theme || {}
    }));
  }

  async function fivemGetTheme(user) {
    var result = await nuiPost("getProfile", { username: user });

    if (!result.ok) {
      return result;
    }

    var raw = result.data || {};
    var profile = raw.data || raw.profile || raw;
    var settings = profile.settings || {};
    var theme = settings.homeProfileTheme || profile.theme || {};

    return {
      ok: true,
      data: theme
    };
  }

  async function fivemSetAvatar(user, dataUrl) {
    return unwrapNuiResult(await nuiPost("setAvatar", {
      username: user,
      avatar: dataUrl
    }));
  }

  async function fivemGetAvatar(user) {
    var result = await nuiPost("getProfile", { username: user });

    if (!result.ok) {
      return result;
    }

    var raw = result.data || {};
    var profile = raw.data || raw.profile || raw;

    return {
      ok: true,
      data: profile.avatar || null
    };
  }

  async function fivemSetCover(user, dataUrl) {
    return unwrapNuiResult(await nuiPost("setCover", {
      username: user,
      cover: dataUrl
    }));
  }

  async function fivemGetCover(user) {
    var result = await nuiPost("getProfile", { username: user });

    if (!result.ok) {
      return result;
    }

    var raw = result.data || {};
    var profile = raw.data || raw.profile || raw;

    return {
      ok: true,
      data: profile.cover || null
    };
  }

  async function fivemGetFriends(user) {
    return unwrapNuiResult(await nuiPost("getFriends", {
      username: user
    }));
  }

  async function fivemSetFriends(user, list) {
    return unwrapNuiResult(await nuiPost("setFriends", {
      username: user,
      friends: list || []
    }));
  }

  async function fivemClearProfileData(user) {
    return unwrapNuiResult(await nuiPost("clearProfileData", {
      username: user
    }));
  }

  async function fivemDeleteAccount(user) {
    return unwrapNuiResult(await nuiPost("deleteAccount", {
      username: user
    }));
  }

  async function fivemGetAccounts() {
    return unwrapNuiResult(await nuiPost("getAccounts", {}));
  }

  /* =========================
     PUBLIC API
  ========================= */

  function register(username, password, passwordRepeat) {
    if (isFiveM()) {
      return fivemRegister(username, password, passwordRepeat);
    }
    return localRegister(username, password, passwordRepeat);
  }

  function login(username, password) {
    if (isFiveM()) {
      return fivemLogin(username, password);
    }
    return localLogin(username, password);
  }

  function logout() {
    if (isFiveM()) {
      return fivemLogout();
    }
    return localLogout();
  }

  function getSession() {
    if (isFiveM()) {
      return fivemGetSession();
    }
    return localGetSession();
  }

  function getProfile(user) {
    if (isFiveM()) {
      return fivemGetProfile(user);
    }
    return localGetProfile(user);
  }

  function saveStatus(user, status) {
    if (isFiveM()) {
      return fivemSaveStatus(user, status);
    }
    return localSaveStatus(user, status);
  }

  function saveTheme(user, theme) {
    if (isFiveM()) {
      return fivemSaveTheme(user, theme);
    }
    return localSaveTheme(user, theme);
  }

  function getTheme(user) {
    if (isFiveM()) {
      return fivemGetTheme(user);
    }
    return localGetTheme(user);
  }

  function setAvatar(user, dataUrl) {
    if (isFiveM()) {
      return fivemSetAvatar(user, dataUrl);
    }
    return localSetAvatar(user, dataUrl);
  }

  function getAvatar(user) {
    if (isFiveM()) {
      return fivemGetAvatar(user);
    }
    return localGetAvatar(user);
  }

  function setCover(user, dataUrl) {
    if (isFiveM()) {
      return fivemSetCover(user, dataUrl);
    }
    return localSetCover(user, dataUrl);
  }

  function getCover(user) {
    if (isFiveM()) {
      return fivemGetCover(user);
    }
    return localGetCover(user);
  }

  function getFriends(user) {
    if (isFiveM()) {
      return fivemGetFriends(user);
    }
    return localGetFriends(user);
  }

  function setFriends(user, list) {
    if (isFiveM()) {
      return fivemSetFriends(user, list);
    }
    return localSetFriends(user, list);
  }

  function clearProfileData(user) {
    if (isFiveM()) {
      return fivemClearProfileData(user);
    }
    return localClearProfileData(user);
  }

  function deleteAccount(user) {
    if (isFiveM()) {
      return fivemDeleteAccount(user);
    }
    return localDeleteAccount(user);
  }

  function getAccounts() {
    if (isFiveM()) {
      return fivemGetAccounts();
    }

    return ok(
      Heavenly.storage && Heavenly.storage.getAccounts
        ? Heavenly.storage.getAccounts().map(function (account) {
            return account.username;
          })
        : []
    );
  }

  return {
    register: register,
    login: login,
    logout: logout,
    getSession: getSession,
    getProfile: getProfile,
    saveStatus: saveStatus,
    saveTheme: saveTheme,
    getTheme: getTheme,
    setAvatar: setAvatar,
    getAvatar: getAvatar,
    setCover: setCover,
    getCover: getCover,
    getFriends: getFriends,
    setFriends: setFriends,
    clearProfileData: clearProfileData,
    deleteAccount: deleteAccount,
    getAccounts: getAccounts
  };
})();

// html/js/screens/auth.js
window.Heavenly = window.Heavenly || {};

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

window.setFeedback = function (msg, ok) {
  var el = getEl("feedback");
  if (!el) return;

  el.innerText = msg;
  el.style.color = ok === false ? "tomato" : "lime";

  setTimeout(function () {
    if (el.innerText === msg) {
      el.innerText = "";
    }
  }, 2200);
};

window.showLoginLogo = function () {
  var logo = getEl("loginLogo");
  if (logo) logo.style.display = "block";
};

window.hideLoginLogo = function () {
  var logo = getEl("loginLogo");
  if (logo) logo.style.display = "none";
};

function completeLogin(username, message) {
  if (!Heavenly.state) Heavenly.state = {};
  Heavenly.state.currentUser = username;
  Heavenly.state.viewedProfileUser = null;

  closePopup();
  setFeedback(message || "Login erfolgreich", true);

  if (Heavenly.ui && Heavenly.ui.showScreen) {
    Heavenly.ui.showScreen("homeScreen");
  }

  try {
    if (typeof showHome === "function") {
      showHome(username);
    }
  } catch (err) {
    console.error("showHome failed:", err);
  }

  hideLoginLogo();
}

window.doRegisterLocal = async function (username, pass1, pass2) {
  if (!username || !pass1) {
    setFeedback("Bitte Username und Passwort eingeben", false);
    return;
  }

  if (pass1 !== pass2) {
    setFeedback("Passwörter stimmen nicht überein", false);
    return;
  }

  if (!Heavenly.api || !Heavenly.api.register) {
    setFeedback("API nicht geladen", false);
    return;
  }

  try {
    var result = await Heavenly.api.register(username, pass1, pass2);

    if (!result || !result.ok) {
      setFeedback(result && result.message ? result.message : "Register fehlgeschlagen", false);
      return;
    }

    var msg =
      result.data && result.data.message
        ? result.data.message
        : "Account erfolgreich erstellt";

    setFeedback(msg, true);
    closePopup();
  } catch (err) {
    console.error("register failed:", err);
    setFeedback("Register fehlgeschlagen", false);
  }
};

window.doLoginLocal = async function (username, password) {
  if (!username || !password) {
    setFeedback("Bitte Username und Passwort eingeben", false);
    return;
  }

  if (!Heavenly.api || !Heavenly.api.login) {
    setFeedback("API nicht geladen", false);
    return;
  }

  try {
    var result = await Heavenly.api.login(username, password);

    if (!result || !result.ok) {
      setFeedback(result && result.message ? result.message : "Login fehlgeschlagen", false);
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
  } catch (err) {
    console.error("login failed:", err);
    setFeedback("Login fehlgeschlagen", false);
  }
};

window.doRegister = function () {
  var regUser = getEl("regUser");
  var regPass = getEl("regPass");
  var regPass2 = getEl("regPass2");

  var username = regUser ? regUser.value.trim() : "";
  var pass1 = regPass ? regPass.value : "";
  var pass2 = regPass2 ? regPass2.value : "";

  window.doRegisterLocal(username, pass1, pass2);
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
  } catch (err) {
    console.error("logout failed:", err);
  }

  if (Heavenly.state) {
    Heavenly.state.currentUser = null;
    Heavenly.state.viewedProfileUser = null;
  }

  closePopup();

  if (typeof closeDMs === "function") closeDMs();
  if (typeof closeImageViewer === "function") closeImageViewer();
  if (typeof closeProfileMenu === "function") closeProfileMenu();
  if (typeof closeFriendRequests === "function") closeFriendRequests();
  if (typeof closeRemoveFriendPopup === "function") closeRemoveFriendPopup();
  if (typeof closeGlobalSearchPopup === "function") closeGlobalSearchPopup();

  if (Heavenly.ui && Heavenly.ui.showScreen) {
    Heavenly.ui.showScreen("loginScreen");
  }

  showLoginLogo();
};

window.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closePopup();
  }
});

// html/js/core/overlays.js
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

// html/js/screens/profile.js
window.Heavenly = window.Heavenly || {};

(function () {
  /* =========================
     BASIS
  ========================= */

  function getEl(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function getViewedUser() {
    if (Heavenly && Heavenly.state && Heavenly.state.viewedProfileUser) {
      return Heavenly.state.viewedProfileUser;
    }
    return getCurrentUser();
  }

  function isOwnProfile() {
    return getViewedUser() === getCurrentUser();
  }

  function getInitials(name) {
    if (Heavenly && Heavenly.util && Heavenly.util.initials) {
      return Heavenly.util.initials(name);
    }
    return String(name || "?").charAt(0).toUpperCase();
  }

  function getPlaceholderDataUrl(type) {
    var text = type === "cover" ? "Kopfzeile" : "Profilbild";

    var svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c3aed" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000000" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="white" font-size="64" font-family="Arial" opacity="0.85">${text}</text>
</svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return "rgba(255,255,255," + alpha + ")";

    var clean = String(hex).replace("#", "");

    if (clean.length === 3) {
      clean = clean.split("").map(function (c) {
        return c + c;
      }).join("");
    }

    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);

    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function readFileAsDataUrl(file, onDone) {
    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {
      if (typeof onDone === "function") {
        onDone(e.target.result);
      }
    };

    reader.onerror = function () {
      if (typeof window.setFeedback === "function") {
        window.setFeedback("Bild konnte nicht gelesen werden", false);
      }
    };

    reader.readAsDataURL(file);
  }

  /* =========================
     API HELPERS
  ========================= */

  async function getProfileData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getProfile) {
      return null;
    }

    var result = await Heavenly.api.getProfile(user);
    if (!result || !result.ok || !result.data) {
      return null;
    }

    return result.data;
  }

  async function getUserSettings(user) {
    var profile = await getProfileData(user);
    return profile && profile.settings ? profile.settings : {};
  }

  async function getThemeSettings(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getTheme) {
      return {};
    }

    var result = await Heavenly.api.getTheme(user);
    if (!result || !result.ok) {
      return {};
    }

    return result.data || {};
  }

  async function setThemeSettings(user, theme) {
    if (!user || !Heavenly.api || !Heavenly.api.saveTheme) return;
    await Heavenly.api.saveTheme(user, theme || {});
  }

  async function getAvatarData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getAvatar) {
      return null;
    }

    var result = await Heavenly.api.getAvatar(user);
    return result && result.ok ? (result.data || null) : null;
  }

  async function getCoverData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getCover) {
      return null;
    }

    var result = await Heavenly.api.getCover(user);
    return result && result.ok ? (result.data || null) : null;
  }

  async function saveAvatarData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setAvatar) return;
    await Heavenly.api.setAvatar(user, dataUrl);
  }

  async function saveCoverData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setCover) return;
    await Heavenly.api.setCover(user, dataUrl);
  }

  async function saveStatusText(user, text) {
    if (!user || !Heavenly.api || !Heavenly.api.saveStatus) return;
    await Heavenly.api.saveStatus(user, text || "");
  }

  /* =========================
     THEME
  ========================= */

  async function applyHomeProfileTheme() {
    var currentUser = getCurrentUser();
    if (!currentUser) return;

    var currentTheme = await getThemeSettings(currentUser);
    var viewedUser = getViewedUser();
    var viewedTheme = viewedUser ? await getThemeSettings(viewedUser) : {};

    var homeBoxColor = currentTheme.boxColor || "#8b5cf6";
    var homePanelColor = currentTheme.panelColor || "#4b0010";
    var homeTextColor = currentTheme.textColor || "#ffffff";
    var homeFontFamily = currentTheme.fontFamily || "Arial, sans-serif";
    var homeBg = currentTheme.homeBg || "";

    var profileBoxColor = viewedTheme.boxColor || homeBoxColor;
    var profilePanelColor = viewedTheme.panelColor || homePanelColor;
    var profileTextColor = viewedTheme.textColor || homeTextColor;
    var profileBg = viewedTheme.profileBg || "";

    var homeBorderColor = hexToRgba(homeBoxColor, 0.75);
    var homeBoxBg = hexToRgba(homePanelColor, 0.72);

    var profileBorderColor = hexToRgba(profileBoxColor, 0.75);
    var profileBoxBg = hexToRgba(profilePanelColor, 0.72);

    document.body.style.fontFamily = homeFontFamily;

    var homeScreen = getEl("homeScreen");
    if (homeScreen) {
      homeScreen.style.backgroundImage = homeBg ? 'url("' + homeBg + '")' : "";
      homeScreen.style.backgroundSize = homeBg ? "cover" : "";
      homeScreen.style.backgroundPosition = homeBg ? "center" : "";
      homeScreen.style.backgroundRepeat = homeBg ? "no-repeat" : "";
      homeScreen.style.color = homeTextColor;
    }

    var profileScreen = getEl("profileScreen");
    if (profileScreen) {
      profileScreen.style.backgroundImage = profileBg ? 'url("' + profileBg + '")' : "";
      profileScreen.style.backgroundSize = profileBg ? "cover" : "";
      profileScreen.style.backgroundPosition = profileBg ? "center" : "";
      profileScreen.style.backgroundRepeat = profileBg ? "no-repeat" : "";
      profileScreen.style.color = profileTextColor;
    }

    document.querySelectorAll(
      ".homeHeader, .feedBox, .usersBox, .feedItem, .fortuneBox, .clockBox, .searchInput, .globalSearch"
    ).forEach(function (el) {
      el.style.background = homeBoxBg;
      el.style.borderColor = homeBorderColor;
      el.style.color = homeTextColor;
    });

    document.querySelectorAll(
      ".profileCard, .profileStatus"
    ).forEach(function (el) {
      el.style.background = profileBoxBg;
      el.style.borderColor = profileBorderColor;
      el.style.color = profileTextColor;
    });

    document.querySelectorAll(
      "#homeScreen, #homeScreen h1, #homeScreen h2, #homeScreen h3, #homeScreen h4, #homeScreen p, #homeScreen .friendName, #homeScreen .friendStatus, #homeScreen .clockTime, #homeScreen .clockDate"
    ).forEach(function (el) {
      el.style.color = homeTextColor;
    });

    document.querySelectorAll(
      "#profileScreen, #profileScreen h1, #profileScreen h2, #profileScreen h3, #profileScreen h4, #profileScreen p, #profileScreen .profileNameBig, #profileScreen .profileSubSmall, #profileScreen .profileStatus"
    ).forEach(function (el) {
      el.style.color = profileTextColor;
    });

    document.querySelectorAll("#homeScreen input, #homeScreen select").forEach(function (el) {
      el.style.color = homeTextColor;
      el.style.borderColor = homeBorderColor;
      el.style.background = homeBoxBg;
    });

    document.querySelectorAll("#profileScreen input, #profileScreen select").forEach(function (el) {
      el.style.color = profileTextColor;
      el.style.borderColor = profileBorderColor;
      el.style.background = profileBoxBg;
    });
  }

  /* =========================
     PROFIL UI
  ========================= */

  async function applyProfileIdentity() {
    var user = getViewedUser();
    if (!user) return;

    var settings = await getUserSettings(user);

    var nameBig = getEl("profileNameBig");
    if (nameBig) {
      nameBig.innerText = user;
    }

    var statusEl = getEl("profileStatus");
    if (statusEl) {
      statusEl.innerText = settings.status || "✨ Willkommen in meinem Heavenly Profil";
    }

    var picText = getEl("profilePicText");
    if (picText) {
      picText.innerText = getInitials(user);
    }
  }

  async function applyAvatarImage() {
    var user = getViewedUser();
    if (!user) return;

    var avatarData = await getAvatarData(user);
    var profilePic = getEl("profilePic");
    var picText = getEl("profilePicText");

    if (!profilePic) return;

    if (avatarData) {
      profilePic.style.backgroundImage = 'url("' + avatarData + '")';
      profilePic.style.backgroundSize = "cover";
      profilePic.style.backgroundPosition = "center";
      profilePic.style.backgroundRepeat = "no-repeat";

      if (picText) {
        picText.style.display = "none";
      }
    } else {
      profilePic.style.backgroundImage = "";
      profilePic.style.backgroundSize = "";
      profilePic.style.backgroundPosition = "";
      profilePic.style.backgroundRepeat = "";

      if (picText) {
        picText.style.display = "block";
      }
    }
  }

  async function applyCoverImage() {
    var user = getViewedUser();
    if (!user) return;

    var coverBox = getEl("coverBox");
    if (!coverBox) return;

    var coverData = await getCoverData(user);
    var src = coverData || getPlaceholderDataUrl("cover");

    coverBox.style.backgroundImage = 'url("' + src + '")';
    coverBox.style.backgroundSize = "cover";
    coverBox.style.backgroundPosition = "center";
    coverBox.style.backgroundRepeat = "no-repeat";
  }

  async function applyProfileImages() {
    await applyProfileIdentity();
    await applyAvatarImage();
    await applyCoverImage();
    await applyHomeProfileTheme();
  }

  /* =========================
     UPLOADS
  ========================= */

  function initProfileUploads() {
    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");

    if (avatarInput && !avatarInput.dataset.bound) {
      avatarInput.dataset.bound = "1";

      avatarInput.addEventListener("change", function () {
        var user = getCurrentUser();
        var file = avatarInput.files && avatarInput.files[0];

        if (!user || !file) return;

        readFileAsDataUrl(file, async function (dataUrl) {
          await saveAvatarData(user, dataUrl);
          await applyProfileImages();

          if (typeof window.setFeedback === "function") {
            window.setFeedback("Profilbild aktualisiert", true);
          }
        });

        avatarInput.value = "";
      });
    }

    if (coverInput && !coverInput.dataset.bound) {
      coverInput.dataset.bound = "1";

      coverInput.addEventListener("change", function () {
        var user = getCurrentUser();
        var file = coverInput.files && coverInput.files[0];

        if (!user || !file) return;

        readFileAsDataUrl(file, async function (dataUrl) {
          await saveCoverData(user, dataUrl);
          await applyProfileImages();

          if (typeof window.setFeedback === "function") {
            window.setFeedback("Titelbild aktualisiert", true);
          }
        });

        coverInput.value = "";
      });
    }
  }

  /* =========================
     MENÜ / POPUPS
  ========================= */

  function closeProfileMenu() {
    var menu = getEl("profileMenu");
    if (menu && Heavenly.overlay && Heavenly.overlay.close) {
      Heavenly.overlay.close(menu, "open");
    }
  }

  function closeStatusPopup() {
    var popup = getEl("statusPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeHomeProfilePopup() {
    var popup = getEl("homeProfilePopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeDeleteAccountPopup() {
    var popup = getEl("deleteAccountPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeForeignProfileMenu() {
    var menu = getEl("foreignProfileMenu");
    if (menu) {
      menu.classList.remove("open");
    }
  }

  function updateProfileActionVisibility() {
    var ownGear = document.querySelector(".coverGear");
    var foreignActions = getEl("foreignProfileActions");

    if (ownGear) {
      ownGear.style.display = isOwnProfile() ? "block" : "none";
    }

    if (foreignActions) {
      foreignActions.style.display = isOwnProfile() ? "none" : "block";
    }

    closeForeignProfileMenu();
  }

  async function openHomeProfilePopup() {
    var user = getCurrentUser();
    if (!user) return;

    var theme = await getThemeSettings(user);

    var hpBoxColor = getEl("hpBoxColor");
    var hpPanelColor = getEl("hpPanelColor");
    var hpTextColor = getEl("hpTextColor");
    var hpFontFamily = getEl("hpFontFamily");
    var hpHomeBg = getEl("hpHomeBg");
    var hpProfileBg = getEl("hpProfileBg");
    var popup = getEl("homeProfilePopup");

    if (hpBoxColor) hpBoxColor.value = theme.boxColor || "#8b5cf6";
    if (hpPanelColor) hpPanelColor.value = theme.panelColor || "#4b0010";
    if (hpTextColor) hpTextColor.value = theme.textColor || "#ffffff";
    if (hpFontFamily) hpFontFamily.value = theme.fontFamily || "Arial, sans-serif";
    if (hpHomeBg) hpHomeBg.value = theme.homeBg || "";
    if (hpProfileBg) hpProfileBg.value = theme.profileBg || "";

    if (popup) {
      popup.classList.add("active");
    }
  }

  async function openStatusPopup() {
    var user = getCurrentUser();
    if (!user) return;

    var settings = await getUserSettings(user);
    var statusPopup = getEl("statusPopup");
    var statusInput = getEl("statusInput");

    if (statusInput) {
      statusInput.value = settings.status || "";
    }

    if (statusPopup) {
      statusPopup.classList.add("active");
    }
  }

  function openDeleteAccountPopup() {
    var popup = getEl("deleteAccountPopup");
    if (popup) {
      popup.classList.add("active");
    }
  }

  async function saveHomeProfileSettings() {
    var user = getCurrentUser();
    if (!user) return;

    var theme = {
      boxColor: getEl("hpBoxColor") ? getEl("hpBoxColor").value : "#8b5cf6",
      panelColor: getEl("hpPanelColor") ? getEl("hpPanelColor").value : "#4b0010",
      textColor: getEl("hpTextColor") ? getEl("hpTextColor").value : "#ffffff",
      fontFamily: getEl("hpFontFamily") ? getEl("hpFontFamily").value : "Arial, sans-serif",
      homeBg: getEl("hpHomeBg") ? getEl("hpHomeBg").value.trim() : "",
      profileBg: getEl("hpProfileBg") ? getEl("hpProfileBg").value.trim() : ""
    };

    await setThemeSettings(user, theme);
    await applyHomeProfileTheme();
    closeHomeProfilePopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Home & Profile gespeichert", true);
    }
  }

  async function resetHomeProfileSettings() {
    var user = getCurrentUser();
    if (!user) return;

    await setThemeSettings(user, {
      boxColor: "#8b5cf6",
      panelColor: "#4b0010",
      textColor: "#ffffff",
      fontFamily: "Arial, sans-serif",
      homeBg: "",
      profileBg: ""
    });

    await applyHomeProfileTheme();
    closeHomeProfilePopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Home & Profile zurückgesetzt", true);
    }
  }

  async function saveStatus() {
    var user = getCurrentUser();
    if (!user) return;

    var input = getEl("statusInput");
    var text = input ? input.value.trim() : "";

    await saveStatusText(user, text);
    await applyProfileImages();
    closeStatusPopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Status aktualisiert", true);
    }
  }

  async function confirmDeleteAccount() {
    var user = getCurrentUser();
    if (!user || !Heavenly.api || !Heavenly.api.deleteAccount) return;

    closeDeleteAccountPopup();
    closeProfileMenu();
    closeForeignProfileMenu();
    closeImageViewer();
    closeStatusPopup();
    closeHomeProfilePopup();

    try {
      var result = await Heavenly.api.deleteAccount(user);

      if (!result || !result.ok) {
        if (typeof window.setFeedback === "function") {
          window.setFeedback(result && result.message ? result.message : "Konto konnte nicht gelöscht werden", false);
        }
        return;
      }

      if (Heavenly.state) {
        Heavenly.state.currentUser = null;
        Heavenly.state.viewedProfileUser = null;
      }

      if (typeof window.closeDMs === "function") window.closeDMs();
      if (typeof window.closeFriendRequests === "function") window.closeFriendRequests();
      if (typeof window.closeRemoveFriendPopup === "function") window.closeRemoveFriendPopup();
      if (typeof window.closeGlobalSearchPopup === "function") window.closeGlobalSearchPopup();

      var loginLogo = getEl("loginLogo");
      if (loginLogo) {
        loginLogo.style.display = "block";
      }

      if (Heavenly.ui && Heavenly.ui.showScreen) {
        Heavenly.ui.showScreen("loginScreen");
      }

      if (typeof window.setFeedback === "function") {
        window.setFeedback("Konto wurde gelöscht", true);
      }
    } catch (err) {
      console.error("delete account failed:", err);
      if (typeof window.setFeedback === "function") {
        window.setFeedback("Konto konnte nicht gelöscht werden", false);
      }
    }
  }

  /* =========================
     IMAGE VIEWER
  ========================= */

  async function openImageViewer(type) {
    var user = getViewedUser();
    if (!user) return;

    var viewer = getEl("imageViewer");
    var img = getEl("imageViewerImg");

    if (!viewer || !img) return;

    var data = null;

    if (type === "avatar") {
      data = await getAvatarData(user);
    }

    if (type === "cover") {
      data = await getCoverData(user);
    }

    if (!data) {
      data = getPlaceholderDataUrl(type);
    }

    img.src = data;

    if (Heavenly.overlay && Heavenly.overlay.open) {
      Heavenly.overlay.open(viewer, "open");
    }
  }

  function closeImageViewer() {
    var viewer = getEl("imageViewer");
    var img = getEl("imageViewerImg");

    if (!viewer || !img) return;
    if (!viewer.classList.contains("open")) return;

    if (Heavenly.overlay && Heavenly.overlay.close) {
      Heavenly.overlay.close(viewer, "open");
    }

    setTimeout(function () {
      img.src = "";
    }, 200);
  }

async function removeFriendFromViewedUser() {
  var currentUser = getCurrentUser();
  var viewedUser = getViewedUser();

  closeForeignProfileMenu();

  if (!currentUser || !viewedUser) return;
  if (!Heavenly.api) return;

  var userFriends = [];
  var otherFriends = [];

  if (Heavenly.api.getFriends) {
    var res1 = await Heavenly.api.getFriends(currentUser);
    if (res1 && res1.ok) userFriends = res1.data || [];

    var res2 = await Heavenly.api.getFriends(viewedUser);
    if (res2 && res2.ok) otherFriends = res2.data || [];
  }

  userFriends = userFriends.filter(function(name){
    return String(name).toLowerCase() !== String(viewedUser).toLowerCase();
  });

  otherFriends = otherFriends.filter(function(name){
    return String(name).toLowerCase() !== String(currentUser).toLowerCase();
  });

  if (Heavenly.api.setFriends) {
    await Heavenly.api.setFriends(currentUser, userFriends);
    await Heavenly.api.setFriends(viewedUser, otherFriends);
  }

  if (typeof window.setFeedback === "function") {
    window.setFeedback(viewedUser + " entfernt", true);
  }
}

  /* =========================
     WINDOW EXPORTS
  ========================= */

  window.applyProfileImages = applyProfileImages;
  window.applyHomeProfileTheme = applyHomeProfileTheme;
  window.closeProfileMenu = closeProfileMenu;
  window.closeStatusPopup = closeStatusPopup;
  window.closeHomeProfilePopup = closeHomeProfilePopup;
  window.closeDeleteAccountPopup = closeDeleteAccountPopup;
  window.saveStatus = saveStatus;
  window.saveHomeProfileSettings = saveHomeProfileSettings;
  window.resetHomeProfileSettings = resetHomeProfileSettings;
  window.openImageViewer = openImageViewer;
  window.closeImageViewer = closeImageViewer;
  window.confirmDeleteAccount = confirmDeleteAccount;

  window.openProfile = async function () {
    var user = getCurrentUser();
    if (!user) return;

    if (!Heavenly.state) Heavenly.state = {};
    Heavenly.state.viewedProfileUser = user;

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("profileScreen");
    }

    initProfileUploads();
    await applyProfileImages();
    closeProfileMenu();
    updateProfileActionVisibility();
  };

  window.openUserProfile = async function (username) {
    if (!username) return;

    if (!Heavenly.state) Heavenly.state = {};
    Heavenly.state.viewedProfileUser = username;

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("profileScreen");
    }

    initProfileUploads();
    await applyProfileImages();
    closeProfileMenu();
    updateProfileActionVisibility();
  };

  window.closeProfile = function () {
    closeProfileMenu();
    closeForeignProfileMenu();
    closeImageViewer();
    closeStatusPopup();
    closeHomeProfilePopup();
    closeDeleteAccountPopup();

    if (Heavenly.state) {
      Heavenly.state.viewedProfileUser = null;
    }

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("homeScreen");
    }
  };

  window.toggleProfileMenu = function () {
    var menu = getEl("profileMenu");
    if (!menu || !Heavenly.overlay) return;

    if (menu.classList.contains("open")) {
      Heavenly.overlay.close(menu, "open");
    } else {
      Heavenly.overlay.open(menu, "open");
    }
  };

  window.toggleForeignProfileMenu = function () {
    var menu = getEl("foreignProfileMenu");
    if (!menu) return;
    menu.classList.toggle("open");
  };

  window.openProfileSection = async function (section) {
    closeProfileMenu();

    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");

    if (section === "homeProfile") {
      await openHomeProfilePopup();
      return;
    }

    if (section === "avatar") {
      if (avatarInput && isOwnProfile()) avatarInput.click();
      return;
    }

    if (section === "cover") {
      if (coverInput && isOwnProfile()) coverInput.click();
      return;
    }

    if (section === "status") {
      if (isOwnProfile()) {
        await openStatusPopup();
      }
      return;
    }

    if (section === "deleteAccount") {
      if (isOwnProfile()) {
        openDeleteAccountPopup();
      }
      return;
    }

    if (typeof window.setFeedback === "function") {
      if (section === "privacy") {
        window.setFeedback("Privatsphäre/Blockieren (kommt gleich)", true);
      }
    }
  };

  window.sendFriendRequestToViewedUser = function () {
    var currentUser = getCurrentUser();
    var viewedUser = getViewedUser();

    closeForeignProfileMenu();

    if (!currentUser || !viewedUser || currentUser === viewedUser) return;
    if (!Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(viewedUser) || {};
    var requests = Array.isArray(settings.friendRequests) ? settings.friendRequests : [];

    if (!requests.includes(currentUser)) {
      requests.push(currentUser);
      settings.friendRequests = requests;
      Heavenly.storage.setSettings(viewedUser, settings);
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Freundesanfrage gesendet", true);
    }
  };

  window.blockViewedUser = function () {
    var currentUser = getCurrentUser();
    var viewedUser = getViewedUser();

    closeForeignProfileMenu();

    if (!currentUser || !viewedUser || currentUser === viewedUser) return;
    if (!Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(currentUser) || {};
    var blocked = Array.isArray(settings.blockedUsers) ? settings.blockedUsers : [];

    if (!blocked.includes(viewedUser)) {
      blocked.push(viewedUser);
      settings.blockedUsers = blocked;
      Heavenly.storage.setSettings(currentUser, settings);
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback(viewedUser + " blockiert", true);
    }
  };

  document.addEventListener("click", function (e) {
    var menu = getEl("profileMenu");
    var gearWrap = document.querySelector(".gearWrap");

    if (menu && gearWrap && menu.classList.contains("open") && !gearWrap.contains(e.target)) {
      closeProfileMenu();
    }

    var foreignActions = getEl("foreignProfileActions");
    var foreignMenu = getEl("foreignProfileMenu");

    if (foreignMenu && foreignActions && foreignMenu.classList.contains("open") && !foreignActions.contains(e.target)) {
      closeForeignProfileMenu();
    }
  });
})();

// html/js/screens/home.js
window.Heavenly = window.Heavenly || {};

var pendingRemoveFriendName = null;

function getEl(id) {
  return document.getElementById(id);
}

function getCurrentUser() {
  return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
}

function getInitials(name) {
  if (Heavenly && Heavenly.util && Heavenly.util.initials) {
    return Heavenly.util.initials(name);
  }

  return String(name || "?").charAt(0).toUpperCase();
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function getFriendRequests(user) {
  if (!user || !Heavenly.storage) return [];
  var settings = Heavenly.storage.getSettings(user) || {};
  return Array.isArray(settings.friendRequests) ? settings.friendRequests : [];
}

function setFriendRequests(user, list) {
  if (!user || !Heavenly.storage) return;
  var settings = Heavenly.storage.getSettings(user) || {};
  settings.friendRequests = Array.isArray(list) ? list : [];
  Heavenly.storage.setSettings(user, settings);
}

function updateFriendRequestDot() {
  var user = getCurrentUser();
  var dot = getEl("friendRequestDot");
  if (!user || !dot) return;

  var requests = getFriendRequests(user);

  if (requests.length > 0) {
    dot.classList.add("active");
  } else {
    dot.classList.remove("active");
  }
}

function openProfilePreview(name) {
  if (typeof window.openUserProfile === "function") {
    window.openUserProfile(name);
    closeGlobalSearchPopup();
    closeFriendRequests();
    return;
  }

  if (typeof setFeedback === "function") {
    setFeedback("Profil von " + name + " konnte nicht geöffnet werden", false);
  }
}

window.showHome = function (username) {
  var elChip = getEl("userChipAvatar");

  if (elChip) {
    elChip.innerText = getInitials(username);
  }

  if (typeof window.applyHomeProfileTheme === "function") {
    window.applyHomeProfileTheme();
  }

  if (Heavenly.fortune && Heavenly.fortune.init) {
    Heavenly.fortune.init();
  }

  if (Heavenly.clock && Heavenly.clock.start) {
    Heavenly.clock.start();
  }

  updateFriendRequestDot();

  try {
    renderFriends();
  } catch (err) {
    console.error("renderFriends failed", err);
  }
};

window.renderFriends = async function () {
  var list = getEl("friendsList");
  var user = getCurrentUser();

  if (!list || !user) return;

  var query = (getEl("friendSearch") ? getEl("friendSearch").value : "")
    .trim()
    .toLowerCase();

  list.innerHTML = "";

  var friends = [];

  if (Heavenly.api && Heavenly.api.getFriends) {
    var result = await Heavenly.api.getFriends(user);
    if (result && result.ok && Array.isArray(result.data)) {
      friends = result.data;
    }
  }

  var filtered = friends.filter(function (name) {
    return String(name).toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="feedItem">Keine Freunde gefunden.</div>';
    return;
  }

  filtered.forEach(function (name) {
    var item = document.createElement("div");
    item.className = "friendItem";

    var initials = String(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(function (word) {
        return word[0].toUpperCase();
      })
      .join("");

    var avatar = document.createElement("div");
    avatar.className = "friendAvatar friendClickable";
    avatar.innerText = initials || String(name).charAt(0).toUpperCase();
    avatar.onclick = function () {
      openProfilePreview(name);
    };

    var meta = document.createElement("div");
    meta.className = "friendMeta friendClickable";
    meta.onclick = function () {
      openProfilePreview(name);
    };

    var friendName = document.createElement("div");
    friendName.className = "friendName";
    friendName.innerText = name;

    var friendStatus = document.createElement("div");
    friendStatus.className = "friendStatus";
    friendStatus.innerText = "Freund";

    var removeBtn = document.createElement("button");
    removeBtn.className = "friendActionBtn";
    removeBtn.type = "button";
    removeBtn.title = "Freund entfernen";
    removeBtn.innerHTML = "✖";
    removeBtn.onclick = function () {
      openRemoveFriendPopup(name);
    };

    meta.appendChild(friendName);
    meta.appendChild(friendStatus);

    item.appendChild(avatar);
    item.appendChild(meta);
    item.appendChild(removeBtn);

    list.appendChild(item);
  });
};

window.addDemoFriends = async function () {
  var user = getCurrentUser();
  if (!user) return;

  if (Heavenly.api && Heavenly.api.setFriends) {
    await Heavenly.api.setFriends(user, ["Max", "Sophie", "Luca", "Nina", "Jayden"]);
  }

  renderFriends();
};

window.addDemoFriendRequests = function () {
  var user = getCurrentUser();
  if (!user) return;

  setFriendRequests(user, ["Mila Hart", "Noah Blake", "Sophie Winter"]);
  updateFriendRequestDot();
};

window.openFriendRequests = function () {
  var popup = getEl("friendRequestsPopup");
  if (!popup) return;

  renderFriendRequests();
  popup.classList.add("active");
};

window.closeFriendRequests = function () {
  var popup = getEl("friendRequestsPopup");
  if (!popup) return;

  popup.classList.remove("active");
};

window.renderFriendRequests = function () {
  var user = getCurrentUser();
  var list = getEl("friendRequestsList");
  if (!user || !list) return;

  var requests = getFriendRequests(user);
  list.innerHTML = "";

  if (requests.length === 0) {
    list.innerHTML = '<div class="feedItem">Keine offenen Anfragen.</div>';
    updateFriendRequestDot();
    return;
  }

  requests.forEach(function (name) {
    var item = document.createElement("div");
    item.className = "requestItem";

    var avatar = document.createElement("div");
    avatar.className = "requestAvatar";
    avatar.innerText = getInitials(name);
    avatar.title = "Profil öffnen";
    avatar.onclick = function () {
      openProfilePreview(name);
    };

    var label = document.createElement("div");
    label.className = "requestName";
    label.innerText = name;
    label.title = "Profil öffnen";
    label.onclick = function () {
      openProfilePreview(name);
    };

    var actions = document.createElement("div");
    actions.className = "requestActions";

    var acceptBtn = document.createElement("button");
    acceptBtn.className = "requestIconBtn";
    acceptBtn.type = "button";
    acceptBtn.innerHTML = "✔";
    acceptBtn.title = "Annehmen";
    acceptBtn.onclick = function () {
      acceptFriendRequest(name);
    };

    var declineBtn = document.createElement("button");
    declineBtn.className = "requestIconBtn";
    declineBtn.type = "button";
    declineBtn.innerHTML = "✖";
    declineBtn.title = "Ablehnen";
    declineBtn.onclick = function () {
      declineFriendRequest(name);
    };

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);

    item.appendChild(avatar);
    item.appendChild(label);
    item.appendChild(actions);

    list.appendChild(item);
  });

  updateFriendRequestDot();
};

window.acceptFriendRequest = async function (name) {
  var user = getCurrentUser();
  if (!user || !name) return;

  var requests = getFriendRequests(user).filter(function (entry) {
    return normalizeName(entry) !== normalizeName(name);
  });

  setFriendRequests(user, requests);

  var userFriends = [];
  var otherFriends = [];

  if (Heavenly.api && Heavenly.api.getFriends) {
    var resultUser = await Heavenly.api.getFriends(user);
    if (resultUser && resultUser.ok && Array.isArray(resultUser.data)) {
      userFriends = resultUser.data;
    }

    var resultOther = await Heavenly.api.getFriends(name);
    if (resultOther && resultOther.ok && Array.isArray(resultOther.data)) {
      otherFriends = resultOther.data;
    }
  }

  if (!userFriends.some(function (entry) { return normalizeName(entry) === normalizeName(name); })) {
    userFriends.push(name);
  }

  if (!otherFriends.some(function (entry) { return normalizeName(entry) === normalizeName(user); })) {
    otherFriends.push(user);
  }

  if (Heavenly.api && Heavenly.api.setFriends) {
    await Heavenly.api.setFriends(user, userFriends);
    await Heavenly.api.setFriends(name, otherFriends);
  }

  renderFriendRequests();
  renderFriends();
  updateFriendRequestDot();

  if (typeof setFeedback === "function") {
    setFeedback(name + " wurde hinzugefügt", true);
  }
};

window.declineFriendRequest = function (name) {
  var user = getCurrentUser();
  if (!user) return;

  var requests = getFriendRequests(user).filter(function (entry) {
    return normalizeName(entry) !== normalizeName(name);
  });

  setFriendRequests(user, requests);
  renderFriendRequests();
  updateFriendRequestDot();

  if (typeof setFeedback === "function") {
    setFeedback("Anfrage abgelehnt", true);
  }
};

window.openRemoveFriendPopup = function (name) {
  pendingRemoveFriendName = name;

  var popup = getEl("removeFriendPopup");
  var text = getEl("removeFriendText");

  if (text) {
    text.innerText = 'Möchtest du "' + name + '" wirklich aus deiner Freundesliste entfernen?';
  }

  if (popup) {
    popup.classList.add("active");
  }
};

window.closeRemoveFriendPopup = function () {
  pendingRemoveFriendName = null;

  var popup = getEl("removeFriendPopup");
  if (popup) {
    popup.classList.remove("active");
  }
};

window.confirmRemoveFriend = async function () {
  var user = getCurrentUser();
  if (!user || !pendingRemoveFriendName) return;

  var friends = [];
  var otherFriends = [];

  if (Heavenly.api && Heavenly.api.getFriends) {
    var result = await Heavenly.api.getFriends(user);
    if (result && result.ok && Array.isArray(result.data)) {
      friends = result.data;
    }

    var otherResult = await Heavenly.api.getFriends(pendingRemoveFriendName);
    if (otherResult && otherResult.ok && Array.isArray(otherResult.data)) {
      otherFriends = otherResult.data;
    }
  }

  friends = friends.filter(function (entry) {
    return normalizeName(entry) !== normalizeName(pendingRemoveFriendName);
  });

  otherFriends = otherFriends.filter(function (entry) {
    return normalizeName(entry) !== normalizeName(user);
  });

  if (Heavenly.api && Heavenly.api.setFriends) {
    await Heavenly.api.setFriends(user, friends);
    await Heavenly.api.setFriends(pendingRemoveFriendName, otherFriends);
  }

  var removedName = pendingRemoveFriendName;
  closeRemoveFriendPopup();
  renderFriends();

  if (typeof setFeedback === "function") {
    setFeedback(removedName + " entfernt", true);
  }
};

window.openGlobalSearchPopup = function () {
  var popup = getEl("globalSearchPopup");
  if (popup) {
    popup.classList.add("active");
  }
};

window.closeGlobalSearchPopup = function () {
  var popup = getEl("globalSearchPopup");
  if (popup) {
    popup.classList.remove("active");
  }
};

window.onGlobalSearch = async function () {
  var user = getCurrentUser();
  var query = getEl("globalSearch") ? getEl("globalSearch").value.trim().toLowerCase() : "";
  var list = getEl("globalSearchResults");

  if (!list) return query;

  if (!query) {
    closeGlobalSearchPopup();
    list.innerHTML = "";
    return query;
  }

  var accounts = [];

  if (Heavenly.api && Heavenly.api.getAccounts) {
    try {
      var accountsResult = await Heavenly.api.getAccounts();
      if (accountsResult && accountsResult.ok && Array.isArray(accountsResult.data)) {
        accounts = accountsResult.data;
      }
    } catch (err) {
      console.warn("Account search load failed", err);
    }
  }

  if (accounts.length === 0 && Heavenly.storage && Heavenly.storage.getAccounts) {
    accounts = Heavenly.storage.getAccounts().map(function (acc) {
      return acc.username;
    });
  }

  var matches = accounts
    .filter(function (name) {
      if (!name) return false;
      if (user && String(name).toLowerCase() === String(user).toLowerCase()) return false;

      var lower = String(name).toLowerCase();
      var parts = lower.split(" ").filter(Boolean);

      if (lower.startsWith(query)) return true;

      return parts.some(function (part) {
        return part.startsWith(query);
      });
    });

  list.innerHTML = "";

  if (matches.length === 0) {
    list.innerHTML = '<div class="feedItem">Keine Profile gefunden.</div>';
    openGlobalSearchPopup();
    return query;
  }

  for (var i = 0; i < matches.length; i++) {
    var name = matches[i];

    var item = document.createElement("div");
    item.className = "searchResultItem";
    item.onclick = (function (username) {
      return function () {
        openProfilePreview(username);
      };
    })(name);

    var avatar = document.createElement("div");
    avatar.className = "searchResultAvatar";

    var avatarData = null;
    if (Heavenly.api && Heavenly.api.getAvatar) {
      try {
        var avatarResult = await Heavenly.api.getAvatar(name);
        if (avatarResult && avatarResult.ok) {
          avatarData = avatarResult.data || null;
        }
      } catch (err) {
        console.warn("Avatar search load failed", err);
      }
    }

    if (avatarData) {
      avatar.style.backgroundImage = 'url("' + avatarData + '")';
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.style.backgroundRepeat = "no-repeat";
      avatar.innerText = "";
    } else {
      avatar.innerText = getInitials(name);
    }

    var label = document.createElement("div");
    label.className = "searchResultName";
    label.innerText = name;

    item.appendChild(avatar);
    item.appendChild(label);

    list.appendChild(item);
  }

  openGlobalSearchPopup();
  return query;
};

window.openDMs = function () {
  var panel = getEl("dmPanel");
  if (panel) {
    panel.classList.add("active");
  }
};

window.closeDMs = function () {
  var panel = getEl("dmPanel");
  if (panel) {
    panel.classList.remove("active");
  }
};

window.openNews = function () {
  if (typeof setFeedback === "function") {
    setFeedback("News kommt gleich 😊", true);
  }
};

// html/js/components/fortune_list.js
window.Heavenly = window.Heavenly || {};

Heavenly.fortunes = [
  "Große Dinge beginnen oft mit kleinen Schritten.",
  "Manchmal ist Nichtstun die beste Entscheidung.",
  "Mut öffnet Türen, die Angst verschließt.",
  "Ruhe bringt Klarheit.",
  "Heute ist ein guter Tag für neue Ideen.",
  "Geduld ist eine leise Form von Stärke.",
  "Kleine Fortschritte sind immer noch Fortschritt.",
  "Jede Reise beginnt mit einem ersten Schritt.",
  "Nicht alles muss sofort Sinn ergeben.",
  "Auch ein langsamer Weg bringt dich voran.",
  "Frieden beginnt oft im Kleinen.",
  "Fokus schlägt Hektik.",
  "Manchmal ist Pause auch Fortschritt.",
  "Glück findet oft die Mutigen.",
  "Vertraue darauf, dass du wachsen wirst.",
  "Gute Dinge brauchen manchmal Zeit.",
  "Hinter jeder Wolke wartet wieder Licht.",
  "Manche Antworten kommen erst mit Ruhe.",
  "Dein Tempo ist trotzdem Fortschritt.",
  "Heute darf leicht sein."
];

// html/js/components/fortune.js
window.Heavenly = window.Heavenly || {};
Heavenly.fortune = Heavenly.fortune || {};

(function(){
  const STORAGE_KEY = "heavenlyFortune";
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  function getBox(){
    return document.getElementById("fortuneBox");
  }

  function getTextEl(){
    return document.getElementById("fortuneText");
  }

  function getViewport(){
    return document.querySelector(".fortuneViewport");
  }

  function getList(){
    return Array.isArray(Heavenly.fortunes) ? Heavenly.fortunes : [];
  }

  function readStored(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Fortune lesen fehlgeschlagen", err);
      return null;
    }
  }

  function writeStored(data){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(err){
      console.warn("Fortune speichern fehlgeschlagen", err);
    }
  }

  function pickRandomFortune(previousText = ""){
    const list = getList();

    if(list.length === 0){
      return "✨ Heute wartet etwas Gutes auf dich.";
    }

    if(list.length === 1){
      return list[0];
    }

    let text = list[Math.floor(Math.random() * list.length)];
    let tries = 0;

    while(text === previousText && tries < 10){
      text = list[Math.floor(Math.random() * list.length)];
      tries++;
    }

    return text;
  }

  function applyTicker(){
    const textEl = getTextEl();
    const viewport = getViewport();
    if(!textEl || !viewport) return;

    textEl.classList.remove("is-scrolling");
    textEl.style.removeProperty("--scroll-distance");

    const overflow = textEl.scrollWidth - viewport.clientWidth;

    if(overflow > 8){
      textEl.style.setProperty("--scroll-distance", `${overflow}px`);
      textEl.classList.add("is-scrolling");
    }
  }

  function setText(text){
    const box = getBox();
    const textEl = getTextEl();
    if(!box || !textEl) return;

    textEl.classList.remove("is-scrolling");
    textEl.style.removeProperty("--scroll-distance");
    textEl.textContent = text;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyTicker();
      });
    });
  }

  function refresh(force = false){
    const saved = readStored();
    const now = Date.now();

    if(!force && saved && saved.text && saved.time && (now - saved.time) < TWO_HOURS){
      setText(saved.text);
      return;
    }

    const text = pickRandomFortune(saved?.text || "");

    writeStored({
      text: text,
      time: now
    });

    setText(text);
  }

  function init(){
    const box = getBox();
    if(!box) return;
    refresh(false);
  }

  Heavenly.fortune.init = init;
  Heavenly.fortune.refresh = refresh;

  window.addEventListener("resize", applyTicker);
})();

// html/js/components/clock.js
window.Heavenly = window.Heavenly || {};
Heavenly.clock = Heavenly.clock || {};

(function(){
  let timer = null;

  Heavenly.clock.settings = Heavenly.clock.settings || {
    mode: "local", // "local" | "server"
    serverOffsetMs: 0
  };

  function pad(n){
    return String(n).padStart(2, "0");
  }

  function getNow(){
    if(Heavenly.clock.settings.mode === "server"){
      return new Date(Date.now() + Heavenly.clock.settings.serverOffsetMs);
    }
    return new Date();
  }

  function render(){
    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");
    if(!timeEl || !dateEl) return;

    const now = getNow();

    timeEl.textContent =
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    dateEl.textContent =
      `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  }

  function start(){
    stop();
    render();
    timer = setInterval(render, 1000);
  }

  function stop(){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
  }

  function setMode(mode){
    Heavenly.clock.settings.mode = (mode === "server") ? "server" : "local";
    render();
  }

  function setServerTime(serverTimestampMs){
    if(typeof serverTimestampMs !== "number") return;
    Heavenly.clock.settings.serverOffsetMs = serverTimestampMs - Date.now();
    render();
  }

  Heavenly.clock.start = start;
  Heavenly.clock.stop = stop;
  Heavenly.clock.setMode = setMode;
  Heavenly.clock.setServerTime = setServerTime;

  window.addEventListener("message", function(event){
    const data = event.data;
    if(!data || data.action !== "heavenly:setClock") return;

    if(data.mode){
      Heavenly.clock.setMode(data.mode);
    }

    if(typeof data.serverTime === "number"){
      Heavenly.clock.setServerTime(data.serverTime);
    }
  });
})();

// html/js/core/main.js
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

