window.Heavenly = window.Heavenly || {};

Heavenly.storage = (function () {
  const PREFIX = "heavenly";

  function normUser(user) {
    return String(user || "").trim().toLowerCase();
  }

  function key(user, thing) {
    const normalizedUser = normUser(user);
    return normalizedUser ? `${PREFIX}_${thing}_${normalizedUser}` : `${PREFIX}_${thing}`;
  }

  function readJSON(storageKey, fallback) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(storageKey, value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

  function getAccounts() {
    return readJSON(key(null, "accounts"), []);
  }

  function setAccounts(list) {
    writeJSON(key(null, "accounts"), list);
  }

  function getSession() {
    return readJSON(key(null, "session"), null);
  }

  function setSession(obj) {
    writeJSON(key(null, "session"), obj);
  }

  function clearSession() {
    localStorage.removeItem(key(null, "session"));
  }

  function getFriends(user) {
    return readJSON(key(user, "friends"), []);
  }

  function setFriends(user, list) {
    writeJSON(key(user, "friends"), list);
  }

  function getAvatar(user) {
    try {
      return localStorage.getItem(key(user, "avatar"));
    } catch {
      return null;
    }
  }

  function setAvatar(user, dataUrl) {
    if (!dataUrl) {
      localStorage.removeItem(key(user, "avatar"));
      return;
    }

    localStorage.setItem(key(user, "avatar"), dataUrl);
  }

  function getCover(user) {
    try {
      return localStorage.getItem(key(user, "cover"));
    } catch {
      return null;
    }
  }

  function setCover(user, dataUrl) {
    if (!dataUrl) {
      localStorage.removeItem(key(user, "cover"));
      return;
    }

    localStorage.setItem(key(user, "cover"), dataUrl);
  }

  function getSettings(user) {
    return readJSON(key(user, "settings"), {});
  }

  function setSettings(user, obj) {
    writeJSON(key(user, "settings"), obj || {});
  }

  function deleteUser(user) {
    const normalized = normUser(user);
    if (!normalized) return;

    const accounts = getAccounts().filter(function (account) {
      return normUser(account && account.username) !== normalized;
    });

    setAccounts(accounts);

    localStorage.removeItem(key(user, "friends"));
    localStorage.removeItem(key(user, "avatar"));
    localStorage.removeItem(key(user, "cover"));
    localStorage.removeItem(key(user, "settings"));
  }

  return {
    key: key,
    getAccounts: getAccounts,
    setAccounts: setAccounts,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    getFriends: getFriends,
    setFriends: setFriends,
    getAvatar: getAvatar,
    setAvatar: setAvatar,
    getCover: getCover,
    setCover: setCover,
    getSettings: getSettings,
    setSettings: setSettings,
    deleteUser: deleteUser
  };
})();