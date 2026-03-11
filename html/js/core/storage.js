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