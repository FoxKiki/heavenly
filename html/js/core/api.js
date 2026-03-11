window.Heavenly = window.Heavenly || {};

Heavenly.api = (function () {
  function isFiveM() {
    return !!(Heavenly.env && Heavenly.env.isFiveM && Heavenly.env.isFiveM());
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

  function fivemRegister(username, password, passwordRepeat) {
    return nuiPost("register", {
      username: username,
      password: password,
      passwordRepeat: passwordRepeat
    });
  }

  function fivemLogin(username, password) {
    return nuiPost("login", {
      username: username,
      password: password
    });
  }

  function fivemLogout() {
    return nuiPost("logout", {});
  }

  function fivemGetSession() {
    return nuiPost("getSession", {});
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

  function fivemSaveStatus(user, status) {
    return nuiPost("saveStatus", {
      username: user,
      status: status
    });
  }

  function fivemSaveTheme(user, theme) {
    return nuiPost("saveTheme", {
      username: user,
      theme: theme || {}
    });
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

  function fivemSetAvatar(user, dataUrl) {
    return nuiPost("setAvatar", {
      username: user,
      avatar: dataUrl
    });
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

  function fivemSetCover(user, dataUrl) {
    return nuiPost("setCover", {
      username: user,
      cover: dataUrl
    });
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

  function fivemGetFriends(user) {
    return nuiPost("getFriends", {
      username: user
    });
  }

  function fivemSetFriends(user, list) {
    return nuiPost("setFriends", {
      username: user,
      friends: list || []
    });
  }

  function fivemClearProfileData(user) {
    return nuiPost("clearProfileData", {
      username: user
    });
  }

  function fivemDeleteAccount(user) {
    return nuiPost("deleteAccount", {
      username: user
    });
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
    deleteAccount: deleteAccount
  };
})();