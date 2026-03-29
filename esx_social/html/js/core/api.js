window.Heavenly = window.Heavenly || {};

Heavenly.api = (function () {
  var LOCAL_NEWS_KEY = "heavenly_news_posts";

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

  function getLocalNewsPosts() {
    try {
      var raw = localStorage.getItem(LOCAL_NEWS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function setLocalNewsPosts(items) {
    try {
      localStorage.setItem(LOCAL_NEWS_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (error) {}
  }

  function getLocalNewsPermissions() {
    var session = Heavenly.storage && Heavenly.storage.getSession
      ? Heavenly.storage.getSession()
      : null;

    return {
      canCreate: true,
      canManageAll: true,
      sessionUsername: session && session.username ? session.username : ""
    };
  }

  function localGetNews() {
    var permissions = getLocalNewsPermissions();
    var items = getLocalNewsPosts().map(function (item) {
      var authorUsername = item && item.authorUsername ? item.authorUsername : "Unbekannt";
      var isAuthor = permissions.sessionUsername
        && String(authorUsername).toLowerCase() === String(permissions.sessionUsername).toLowerCase();

      return Object.assign({}, item, {
        canEdit: isAuthor || permissions.canManageAll,
        canDelete: isAuthor || permissions.canManageAll
      });
    });

    return ok({
      items: items,
      permissions: permissions
    });
  }

  function localCreateNews(payload) {
    var permissions = getLocalNewsPermissions();
    if (!permissions.canCreate) {
      return fail("Keine Berechtigung");
    }

    var session = Heavenly.storage && Heavenly.storage.getSession
      ? Heavenly.storage.getSession()
      : null;
    var username = session && session.username ? session.username : "Unbekannt";
    var items = getLocalNewsPosts();
    var id = Date.now();

    items.unshift({
      id: id,
      authorUsername: username,
      title: String(payload && payload.title || "").trim(),
      content: String(payload && payload.content || "").trim(),
      category: String(payload && payload.category || "Allgemein").trim() || "Allgemein",
      media: Array.isArray(payload && payload.media) ? payload.media.slice(0, 6) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setLocalNewsPosts(items);
    return ok({ id: id });
  }

  function localUpdateNews(id, payload) {
    var permissions = getLocalNewsPermissions();
    var items = getLocalNewsPosts();
    var sessionUsername = String(permissions.sessionUsername || "").toLowerCase();
    var changed = false;

    items = items.map(function (item) {
      if (!item || Number(item.id) !== Number(id)) {
        return item;
      }

      var isAuthor = String(item.authorUsername || "").toLowerCase() === sessionUsername;
      if (!isAuthor && !permissions.canManageAll) {
        return item;
      }

      changed = true;
      return Object.assign({}, item, {
        title: String(payload && payload.title || "").trim(),
        content: String(payload && payload.content || "").trim(),
        category: String(payload && payload.category || "Allgemein").trim() || "Allgemein",
        media: Array.isArray(payload && payload.media) ? payload.media.slice(0, 6) : [],
        updatedAt: new Date().toISOString()
      });
    });

    if (!changed) {
      return fail("News nicht gefunden oder keine Berechtigung");
    }

    setLocalNewsPosts(items);
    return ok({ id: id, updated: true });
  }

  function localDeleteNews(id) {
    var permissions = getLocalNewsPermissions();
    var sessionUsername = String(permissions.sessionUsername || "").toLowerCase();
    var items = getLocalNewsPosts();
    var nextItems = [];
    var changed = false;

    items.forEach(function (item) {
      var isTarget = item && Number(item.id) === Number(id);
      var isAuthor = isTarget && String(item.authorUsername || "").toLowerCase() === sessionUsername;

      if (isTarget && (isAuthor || permissions.canManageAll)) {
        changed = true;
        return;
      }

      nextItems.push(item);
    });

    if (!changed) {
      return fail("News nicht gefunden oder keine Berechtigung");
    }

    setLocalNewsPosts(nextItems);
    return ok({ id: id, deleted: true });
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

  async function fivemGetNews() {
    return unwrapNuiResult(await nuiPost("getNews", {}));
  }

  async function fivemCreateNews(payload) {
    return unwrapNuiResult(await nuiPost("createNews", payload || {}));
  }

  async function fivemUpdateNews(id, payload) {
    return unwrapNuiResult(await nuiPost("updateNews", Object.assign({}, payload || {}, {
      id: id
    })));
  }

  async function fivemDeleteNews(id) {
    return unwrapNuiResult(await nuiPost("deleteNews", {
      id: id
    }));
  }

  async function fivemGetPosts(feedType, profileOwner) {
    return unwrapNuiResult(await nuiPost("getPosts", {
      feedType: feedType,
      profileOwner: profileOwner || null
    }));
  }

  async function fivemCreatePost(payload) {
    return unwrapNuiResult(await nuiPost("createPost", payload || {}));
  }

  async function fivemEditPost(postId, text) {
    return unwrapNuiResult(await nuiPost("editPost", {
      postId: postId,
      text: text
    }));
  }

  async function fivemDeletePost(postId) {
    return unwrapNuiResult(await nuiPost("deletePost", {
      postId: postId
    }));
  }

  async function fivemTogglePostLike(postId) {
    return unwrapNuiResult(await nuiPost("togglePostLike", {
      postId: postId
    }));
  }

  async function fivemAddComment(postId, payload) {
    return unwrapNuiResult(await nuiPost("addComment", Object.assign({}, payload || {}, {
      postId: postId
    })));
  }

  async function fivemEditComment(postId, commentId, text) {
    return unwrapNuiResult(await nuiPost("editComment", {
      postId: postId,
      commentId: commentId,
      text: text
    }));
  }

  async function fivemDeleteComment(postId, commentId) {
    return unwrapNuiResult(await nuiPost("deleteComment", {
      postId: postId,
      commentId: commentId
    }));
  }

  async function fivemToggleCommentLike(postId, commentId) {
    return unwrapNuiResult(await nuiPost("toggleCommentLike", {
      postId: postId,
      commentId: commentId
    }));
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

  function getNews() {
    return isFiveM()
      ? fivemGetNews()
      : localGetNews();
  }

  function createNews(payload) {
    return isFiveM()
      ? fivemCreateNews(payload)
      : localCreateNews(payload);
  }

  function updateNews(id, payload) {
    return isFiveM()
      ? fivemUpdateNews(id, payload)
      : localUpdateNews(id, payload);
  }

  function deleteNews(id) {
    return isFiveM()
      ? fivemDeleteNews(id)
      : localDeleteNews(id);
  }

  function getPosts(feedType, profileOwner) {
    return isFiveM()
      ? fivemGetPosts(feedType, profileOwner)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function createPost(payload) {
    return isFiveM()
      ? fivemCreatePost(payload)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function editPost(postId, text) {
    return isFiveM()
      ? fivemEditPost(postId, text)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function deletePost(postId) {
    return isFiveM()
      ? fivemDeletePost(postId)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function togglePostLike(postId) {
    return isFiveM()
      ? fivemTogglePostLike(postId)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function addComment(postId, payload) {
    return isFiveM()
      ? fivemAddComment(postId, payload)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function editComment(postId, commentId, text) {
    return isFiveM()
      ? fivemEditComment(postId, commentId, text)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function deleteComment(postId, commentId) {
    return isFiveM()
      ? fivemDeleteComment(postId, commentId)
      : fail("Posts API nur im FiveM-Modus verfügbar");
  }

  function toggleCommentLike(postId, commentId) {
    return isFiveM()
      ? fivemToggleCommentLike(postId, commentId)
      : fail("Posts API nur im FiveM-Modus verfügbar");
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
    getAccounts: getAccounts,
    getNews: getNews,
    createNews: createNews,
    updateNews: updateNews,
    deleteNews: deleteNews,
    getPosts: getPosts,
    createPost: createPost,
    editPost: editPost,
    deletePost: deletePost,
    togglePostLike: togglePostLike,
    addComment: addComment,
    editComment: editComment,
    deleteComment: deleteComment,
    toggleCommentLike: toggleCommentLike
  };
})();
