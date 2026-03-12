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

      var response = await fetch("https://" + resourceName + "/" + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
      });

      var data = await response.json().catch(function () {
        return { ok: false, message: "Ungültige Server-Antwort" };
      });

      if (data && data.ok === false) {
        return fail(data.message || "Serverfehler");
      }

      return {
        ok: true,
        data: data
      };
    } catch (error) {
      return fail(endpoint + " fehlgeschlagen");
    }
  }

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
    var exists = accounts.find(function (account) {
      return String(account.username).toLowerCase() === String(username).toLowerCase();
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
    var account = accounts.find(function (entry) {
      return entry.username === username;
    });

    if (!account) {
      return fail("Account existiert nicht");
    }

    if (account.password !== password) {
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
    if (!user) {
      return fail("Kein Benutzer");
    }

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
    if (!user) {
      return fail("Kein Benutzer");
    }

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
    if (!user) {
      return fail("Kein Benutzer");
    }

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
    if (!user) {
      return fail("Kein Benutzer");
    }

    var settings = Heavenly.storage && Heavenly.storage.getSettings
      ? Heavenly.storage.getSettings(user)
      : {};

    settings = settings || {};

    return ok(settings.homeProfileTheme || {});
  }

  function localSetAvatar(user, dataUrl) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    if (Heavenly.storage && Heavenly.storage.setAvatar) {
      Heavenly.storage.setAvatar(user, dataUrl);
    }

    return ok({ avatar: dataUrl || null });
  }

  function localGetAvatar(user) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    var avatar = Heavenly.storage && Heavenly.storage.getAvatar
      ? Heavenly.storage.getAvatar(user)
      : null;

    return ok(avatar);
  }

  function localSetCover(user, dataUrl) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    if (Heavenly.storage && Heavenly.storage.setCover) {
      Heavenly.storage.setCover(user, dataUrl);
    }

    return ok({ cover: dataUrl || null });
  }

  function localGetCover(user) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    var cover = Heavenly.storage && Heavenly.storage.getCover
      ? Heavenly.storage.getCover(user)
      : null;

    return ok(cover);
  }

  function localGetFriends(user) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    var friends = Heavenly.storage && Heavenly.storage.getFriends
      ? Heavenly.storage.getFriends(user)
      : [];

    return ok(friends || []);
  }

  function localSetFriends(user, list) {
    if (!user) {
      return fail("Kein Benutzer");
    }

    if (Heavenly.storage && Heavenly.storage.setFriends) {
      Heavenly.storage.setFriends(user, list || []);
    }

    return ok(list || []);
  }

  function localClearProfileData(user) {
    if (!user) {
      return fail("Kein Benutzer");
    }

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
    if (!user) {
      return fail("Kein Benutzer");
    }

    if (!Heavenly.storage) {
      return fail("Storage nicht geladen");
    }

    var normalized = String(user).trim().toLowerCase();
    var accounts = Heavenly.storage.getAccounts ? Heavenly.storage.getAccounts() : [];

    accounts.forEach(function (account) {
      var username = account && account.username ? account.username : "";
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

  function register(username, password, passwordRepeat) {
    return isFiveM()
      ? fivemRegister(username, password, passwordRepeat)
      : localRegister(username, password, passwordRepeat);
  }

  function login(username, password) {
    return isFiveM()
      ? fivemLogin(username, password)
      : localLogin(username, password);
  }

  function logout() {
    return isFiveM()
      ? fivemLogout()
      : localLogout();
  }

  function getSession() {
    return isFiveM()
      ? fivemGetSession()
      : localGetSession();
  }

  function getProfile(user) {
    return isFiveM()
      ? fivemGetProfile(user)
      : localGetProfile(user);
  }

  function saveStatus(user, status) {
    return isFiveM()
      ? fivemSaveStatus(user, status)
      : localSaveStatus(user, status);
  }

  function saveTheme(user, theme) {
    return isFiveM()
      ? fivemSaveTheme(user, theme)
      : localSaveTheme(user, theme);
  }

  function getTheme(user) {
    return isFiveM()
      ? fivemGetTheme(user)
      : localGetTheme(user);
  }

  function setAvatar(user, dataUrl) {
    return isFiveM()
      ? fivemSetAvatar(user, dataUrl)
      : localSetAvatar(user, dataUrl);
  }

  function getAvatar(user) {
    return isFiveM()
      ? fivemGetAvatar(user)
      : localGetAvatar(user);
  }

  function setCover(user, dataUrl) {
    return isFiveM()
      ? fivemSetCover(user, dataUrl)
      : localSetCover(user, dataUrl);
  }

  function getCover(user) {
    return isFiveM()
      ? fivemGetCover(user)
      : localGetCover(user);
  }

  function getFriends(user) {
    return isFiveM()
      ? fivemGetFriends(user)
      : localGetFriends(user);
  }

  function setFriends(user, list) {
    return isFiveM()
      ? fivemSetFriends(user, list)
      : localSetFriends(user, list);
  }

  function clearProfileData(user) {
    return isFiveM()
      ? fivemClearProfileData(user)
      : localClearProfileData(user);
  }

  function deleteAccount(user) {
    return isFiveM()
      ? fivemDeleteAccount(user)
      : localDeleteAccount(user);
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