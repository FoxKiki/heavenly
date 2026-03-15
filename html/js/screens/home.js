window.Heavenly = window.Heavenly || {};
Heavenly.screens = Heavenly.screens || {};
Heavenly.cache = Heavenly.cache || {};
Heavenly.cache.avatars = Heavenly.cache.avatars || {};
Heavenly.cache.profiles = Heavenly.cache.profiles || {};
Heavenly.cache.accounts = Heavenly.cache.accounts || null;

(function () {
  var pendingRemoveFriendName = null;
  var globalSearchTimer = null;
  var globalSearchRunId = 0;

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

  function getBlockedUsers(user) {
    if (!user || !Heavenly.storage) return [];

    var settings = Heavenly.storage.getSettings(user) || {};
    return Array.isArray(settings.blockedUsers) ? settings.blockedUsers : [];
  }

  function isBlocked(currentUser, otherUser) {
    if (!currentUser || !otherUser) return false;

    return getBlockedUsers(currentUser).some(function (entry) {
      return normalizeName(entry) === normalizeName(otherUser);
    });
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

    var requests = getFriendRequests(user).filter(function (name) {
      return !isBlocked(user, name);
    });

    if (requests.length > 0) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  }

  function openProfilePreview(name) {
    if (typeof window.openUserProfile === "function") {
      window.openUserProfile(name);

      if (typeof window.closeGlobalSearchPopup === "function") {
        window.closeGlobalSearchPopup();
      }

      if (typeof window.closeFriendRequests === "function") {
        window.closeFriendRequests();
      }

      return;
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil von " + name + " konnte nicht geöffnet werden", false);
    }
  }

  function getAvatarCacheKey(username) {
    return normalizeName(username);
  }

  function getProfileCacheKey(username) {
    return normalizeName(username);
  }

  async function getAvatarCached(username) {
    var key = getAvatarCacheKey(username);
    if (!key) return "";

    if (Heavenly.cache.avatars[key] !== undefined) {
      return Heavenly.cache.avatars[key];
    }

    if (!Heavenly.api || !Heavenly.api.getAvatar) {
      Heavenly.cache.avatars[key] = "";
      return "";
    }

    try {
      var result = await Heavenly.api.getAvatar(username);
      Heavenly.cache.avatars[key] = result && result.ok && result.data ? result.data : "";
      return Heavenly.cache.avatars[key];
    } catch (error) {
      Heavenly.cache.avatars[key] = "";
      console.warn("Avatar load failed", error);
      return "";
    }
  }

  async function getProfileCached(username) {
    var key = getProfileCacheKey(username);
    if (!key) return null;

    if (Heavenly.cache.profiles[key] !== undefined) {
      return Heavenly.cache.profiles[key];
    }

    if (!Heavenly.api || !Heavenly.api.getProfile) {
      Heavenly.cache.profiles[key] = null;
      return null;
    }

    try {
      var result = await Heavenly.api.getProfile(username);
      Heavenly.cache.profiles[key] = result && result.ok && result.data ? result.data : null;
      return Heavenly.cache.profiles[key];
    } catch (error) {
      Heavenly.cache.profiles[key] = null;
      console.warn("Profile load failed", error);
      return null;
    }
  }

  async function preloadAvatars(usernames) {
    var unique = {};
    var tasks = [];

    (usernames || []).forEach(function (name) {
      var key = getAvatarCacheKey(name);
      if (!key || unique[key]) return;
      unique[key] = true;

      if (Heavenly.cache.avatars[key] === undefined) {
        tasks.push(getAvatarCached(name));
      }
    });

    if (tasks.length) {
      await Promise.all(tasks);
    }
  }

  async function preloadProfiles(usernames) {
    var unique = {};
    var tasks = [];

    (usernames || []).forEach(function (name) {
      var key = getProfileCacheKey(name);
      if (!key || unique[key]) return;
      unique[key] = true;

      if (Heavenly.cache.profiles[key] === undefined) {
        tasks.push(getProfileCached(name));
      }
    });

    if (tasks.length) {
      await Promise.all(tasks);
    }
  }

  async function getAccountsCached() {
    if (Array.isArray(Heavenly.cache.accounts)) {
      return Heavenly.cache.accounts.slice();
    }

    var accounts = [];

    if (Heavenly.api && Heavenly.api.getAccounts) {
      try {
        var accountsResult = await Heavenly.api.getAccounts();
        if (accountsResult && accountsResult.ok && Array.isArray(accountsResult.data)) {
          accounts = accountsResult.data.slice();
        }
      } catch (error) {
        console.warn("Account search load failed", error);
      }
    }

    if (accounts.length === 0 && Heavenly.storage && Heavenly.storage.getAccounts) {
      accounts = Heavenly.storage.getAccounts().map(function (account) {
        return account.username;
      });
    }

    Heavenly.cache.accounts = accounts.slice();
    return accounts;
  }

  function invalidateUserCaches(username) {
    var avatarKey = getAvatarCacheKey(username);
    var profileKey = getProfileCacheKey(username);

    if (avatarKey) {
      delete Heavenly.cache.avatars[avatarKey];
    }

    if (profileKey) {
      delete Heavenly.cache.profiles[profileKey];
    }
  }

  async function renderHomeFeed() {
    if (!Heavenly.posts || !Heavenly.posts.store || !Heavenly.posts.render) return;

    var posts = Heavenly.posts.store.getFeedPosts("home") || [];
    var usernames = [];

    for (var i = 0; i < posts.length; i++) {
      if (posts[i] && posts[i].authorUsername) {
        usernames.push(posts[i].authorUsername);
      }

      posts[i].comments = Array.isArray(posts[i].comments) ? posts[i].comments : [];

      for (var j = 0; j < posts[i].comments.length; j++) {
        if (posts[i].comments[j] && posts[i].comments[j].authorUsername) {
          usernames.push(posts[i].comments[j].authorUsername);
        }
      }
    }

    await preloadAvatars(usernames);

    for (var a = 0; a < posts.length; a++) {
      if (!posts[a].authorAvatar) {
        posts[a].authorAvatar = Heavenly.cache.avatars[getAvatarCacheKey(posts[a].authorUsername)] || "";
      }

      for (var b = 0; b < posts[a].comments.length; b++) {
        if (!posts[a].comments[b].authorAvatar) {
          posts[a].comments[b].authorAvatar =
            Heavenly.cache.avatars[getAvatarCacheKey(posts[a].comments[b].authorUsername)] || "";
        }
      }
    }

    Heavenly.posts.render.renderFeed("homeFeedPosts", posts, {
      feedType: "home"
    });
  }

  Heavenly.screens.renderHomeFeed = renderHomeFeed;
  window.renderHomeFeed = renderHomeFeed;

  window.showHome = async function (username) {
    var chip = getEl("userChipAvatar");

    if (chip) {
      chip.innerText = getInitials(username);
      chip.style.backgroundImage = "";
      chip.style.backgroundSize = "";
      chip.style.backgroundPosition = "";
      chip.style.backgroundRepeat = "";
    }

    if (chip) {
      var avatar = await getAvatarCached(username);

      if (avatar) {
        chip.innerText = "";
        chip.style.backgroundImage = 'url("' + avatar + '")';
        chip.style.backgroundSize = "cover";
        chip.style.backgroundPosition = "center";
        chip.style.backgroundRepeat = "no-repeat";
      }
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
      await Promise.all([
        typeof window.renderFriends === "function" ? window.renderFriends() : Promise.resolve(),
        renderHomeFeed()
      ]);
    } catch (error) {
      console.error("showHome render failed", error);
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
      try {
        var result = await Heavenly.api.getFriends(user);
        if (result && result.ok && Array.isArray(result.data)) {
          friends = result.data;
        }
      } catch (error) {
        console.warn("Friends load failed", error);
      }
    }

    var filtered = friends.filter(function (name) {
      if (!name) return false;
      if (normalizeName(name) === normalizeName(user)) return false;
      if (isBlocked(user, name)) return false;

      return String(name).toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div class="feedItem">Keine Freunde gefunden.</div>';
      return;
    }

    await Promise.all([
      preloadAvatars(filtered),
      preloadProfiles(filtered)
    ]);

    var fragment = document.createDocumentFragment();

    filtered.forEach(function (name) {
      var item = document.createElement("div");
      item.className = "friendItem";

      var avatar = document.createElement("div");
      avatar.className = "friendAvatar friendClickable";
      avatar.innerText = getInitials(name);
      avatar.onclick = function () {
        openProfilePreview(name);
      };

      var avatarData = Heavenly.cache.avatars[getAvatarCacheKey(name)] || "";
      if (avatarData) {
        avatar.innerText = "";
        avatar.style.backgroundImage = 'url("' + avatarData + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.style.backgroundRepeat = "no-repeat";
      }

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

      var profile = Heavenly.cache.profiles[getProfileCacheKey(name)];
      if (profile && profile.settings && profile.settings.status) {
        friendStatus.innerText = profile.settings.status;
      }

      var removeBtn = document.createElement("button");
      removeBtn.className = "friendActionBtn";
      removeBtn.type = "button";
      removeBtn.title = "Freund entfernen";
      removeBtn.innerHTML = "✖";
      removeBtn.onclick = function () {
        window.openRemoveFriendPopup(name);
      };

      meta.appendChild(friendName);
      meta.appendChild(friendStatus);

      item.appendChild(avatar);
      item.appendChild(meta);
      item.appendChild(removeBtn);

      fragment.appendChild(item);
    });

    list.appendChild(fragment);
  };

  window.addDemoFriends = async function () {
    var user = getCurrentUser();
    if (!user) return;

    if (Heavenly.api && Heavenly.api.setFriends) {
      await Heavenly.api.setFriends(user, ["Max", "Sophie", "Luca", "Nina", "Jayden"]);
    }

    await window.renderFriends();
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

    window.renderFriendRequests();
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

    var requests = getFriendRequests(user).filter(function (name) {
      return !isBlocked(user, name);
    });

    list.innerHTML = "";

    if (requests.length === 0) {
      list.innerHTML = '<div class="feedItem">Keine offenen Anfragen.</div>';
      updateFriendRequestDot();
      return;
    }

    var fragment = document.createDocumentFragment();

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
        window.acceptFriendRequest(name);
      };

      var declineBtn = document.createElement("button");
      declineBtn.className = "requestIconBtn";
      declineBtn.type = "button";
      declineBtn.innerHTML = "✖";
      declineBtn.title = "Ablehnen";
      declineBtn.onclick = function () {
        window.declineFriendRequest(name);
      };

      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);

      item.appendChild(avatar);
      item.appendChild(label);
      item.appendChild(actions);

      fragment.appendChild(item);
    });

    list.appendChild(fragment);
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

    if (!userFriends.some(function (entry) {
      return normalizeName(entry) === normalizeName(name);
    })) {
      userFriends.push(name);
    }

    if (!otherFriends.some(function (entry) {
      return normalizeName(entry) === normalizeName(user);
    })) {
      otherFriends.push(user);
    }

    if (Heavenly.api && Heavenly.api.setFriends) {
      await Heavenly.api.setFriends(user, userFriends);
      await Heavenly.api.setFriends(name, otherFriends);
    }

    invalidateUserCaches(name);

    window.renderFriendRequests();
    await window.renderFriends();
    updateFriendRequestDot();

    if (typeof window.setFeedback === "function") {
      window.setFeedback(name + " wurde hinzugefügt", true);
    }
  };

  window.declineFriendRequest = function (name) {
    var user = getCurrentUser();
    if (!user) return;

    var requests = getFriendRequests(user).filter(function (entry) {
      return normalizeName(entry) !== normalizeName(name);
    });

    setFriendRequests(user, requests);
    window.renderFriendRequests();
    updateFriendRequestDot();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Anfrage abgelehnt", true);
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

    invalidateUserCaches(pendingRemoveFriendName);

    var removedName = pendingRemoveFriendName;
    window.closeRemoveFriendPopup();
    await window.renderFriends();

    if (typeof window.setFeedback === "function") {
      window.setFeedback(removedName + " entfernt", true);
    }
  };

  window.openGlobalSearchPopup = function () {
    var dropdown = getEl("globalSearchDropdown");
    if (dropdown) {
      dropdown.classList.add("open");
    }
  };

  window.closeGlobalSearchPopup = function () {
    var dropdown = getEl("globalSearchDropdown");
    if (dropdown) {
      dropdown.classList.remove("open");
    }
  };

  async function runGlobalSearch(runId, rawQuery) {
    var user = getCurrentUser();
    var list = getEl("globalSearchResults");
    var query = String(rawQuery || "").trim().toLowerCase();

    if (!list) return query;

    if (!query) {
      window.closeGlobalSearchPopup();
      list.innerHTML = "";
      return query;
    }

    var accounts = await getAccountsCached();

    if (runId !== globalSearchRunId) {
      return query;
    }

    var cleanQuery = query.replace(/^#+/, "").trim();

    var userMatches = accounts.filter(function (name) {
      if (!name) return false;
      if (user && String(name).toLowerCase() === String(user).toLowerCase()) return false;
      if (user && isBlocked(user, name)) return false;

      var lower = String(name).toLowerCase();
      var parts = lower.split(" ").filter(Boolean);

      if (lower.includes(query)) return true;
      if (cleanQuery && lower.includes(cleanQuery)) return true;

      return parts.some(function (part) {
        return part.startsWith(query) || (cleanQuery && part.startsWith(cleanQuery));
      });
    }).slice(0, 6);

    await preloadAvatars(userMatches);

    if (runId !== globalSearchRunId) {
      return query;
    }

    list.innerHTML = "";

    if (userMatches.length > 0) {
      var peopleTitle = document.createElement("div");
      peopleTitle.className = "searchSectionTitle";
      peopleTitle.innerText = "Personen";
      list.appendChild(peopleTitle);

      userMatches.forEach(function (name) {
        var item = document.createElement("div");
        item.className = "searchResultItem";
        item.onclick = function () {
          openProfilePreview(name);
          window.closeGlobalSearchPopup();
        };

        var avatar = document.createElement("div");
        avatar.className = "searchResultAvatar";
        avatar.innerText = getInitials(name);

        var avatarData = Heavenly.cache.avatars[getAvatarCacheKey(name)] || "";
        if (avatarData) {
          avatar.innerText = "";
          avatar.style.backgroundImage = 'url("' + avatarData + '")';
          avatar.style.backgroundSize = "cover";
          avatar.style.backgroundPosition = "center";
          avatar.style.backgroundRepeat = "no-repeat";
        }

        var meta = document.createElement("div");
        meta.className = "searchResultMeta";

        var label = document.createElement("div");
        label.className = "searchResultName";
        label.innerText = name;

        var sub = document.createElement("div");
        sub.className = "searchResultSub";
        sub.innerText = "Profil öffnen";

        meta.appendChild(label);
        meta.appendChild(sub);

        item.appendChild(avatar);
        item.appendChild(meta);

        list.appendChild(item);
      });
    }

    if (cleanQuery) {
      var tagTitle = document.createElement("div");
      tagTitle.className = "searchSectionTitle";
      tagTitle.innerText = "Hashtags";
      list.appendChild(tagTitle);

      var tagItem = document.createElement("div");
      tagItem.className = "searchResultItem";
      tagItem.onclick = function () {
        if (typeof window.setFeedback === "function") {
          window.setFeedback("Hashtag-Suche für #" + cleanQuery + " kommt gleich 😊", true);
        }
        window.closeGlobalSearchPopup();
      };

      var tagAvatar = document.createElement("div");
      tagAvatar.className = "searchResultAvatar";
      tagAvatar.innerText = "#";

      var tagMeta = document.createElement("div");
      tagMeta.className = "searchResultMeta";

      var tagName = document.createElement("div");
      tagName.className = "searchResultName";
      tagName.innerText = "#" + cleanQuery;

      var tagSub = document.createElement("div");
      tagSub.className = "searchResultSub";
      tagSub.innerText = "Nach Beiträgen mit diesem Hashtag suchen";

      tagMeta.appendChild(tagName);
      tagMeta.appendChild(tagSub);

      tagItem.appendChild(tagAvatar);
      tagItem.appendChild(tagMeta);

      list.appendChild(tagItem);
    }

    if (cleanQuery) {
      var postTitle = document.createElement("div");
      postTitle.className = "searchSectionTitle";
      postTitle.innerText = "Beiträge";
      list.appendChild(postTitle);

      var postItem = document.createElement("div");
      postItem.className = "searchResultItem";
      postItem.onclick = function () {
        if (typeof window.setFeedback === "function") {
          window.setFeedback('Beitragssuche nach "' + rawQuery + '" kommt gleich 😊', true);
        }
        window.closeGlobalSearchPopup();
      };

      var postAvatar = document.createElement("div");
      postAvatar.className = "searchResultAvatar";
      postAvatar.innerText = "📝";

      var postMeta = document.createElement("div");
      postMeta.className = "searchResultMeta";

      var postName = document.createElement("div");
      postName.className = "searchResultName";
      postName.innerText = rawQuery.startsWith("#")
        ? "Beiträge zu #" + cleanQuery
        : 'Beiträge zu "' + rawQuery + '"';

      var postSub = document.createElement("div");
      postSub.className = "searchResultSub";
      postSub.innerText = "Feed- und Profilbeiträge durchsuchen";

      postMeta.appendChild(postName);
      postMeta.appendChild(postSub);

      postItem.appendChild(postAvatar);
      postItem.appendChild(postMeta);

      list.appendChild(postItem);
    }

    window.openGlobalSearchPopup();
    return query;
  }

  window.onGlobalSearch = function () {
    var input = getEl("globalSearch");
    var rawQuery = input ? input.value : "";

    globalSearchRunId += 1;
    var runId = globalSearchRunId;

    if (globalSearchTimer) {
      clearTimeout(globalSearchTimer);
    }

    globalSearchTimer = setTimeout(function () {
      runGlobalSearch(runId, rawQuery);
    }, 180);

    return String(rawQuery || "").trim().toLowerCase();
  };

  window.openDMs = function () {
    if (typeof window.openDmOverlay === "function") {
      window.openDmOverlay();
      return;
    }

    var panel = getEl("dmPanel");
    if (panel) {
      panel.classList.add("active");
    }
  };

  window.closeDMs = function () {
    if (typeof window.closeDmOverlay === "function") {
      window.closeDmOverlay();
      return;
    }

    var panel = getEl("dmPanel");
    if (panel) {
      panel.classList.remove("active");
    }
  };

  window.openNews = function () {
    if (typeof window.setFeedback === "function") {
      window.setFeedback("News kommt gleich 😊", true);
    }
  };

  document.addEventListener("click", function (event) {
    var wrap = document.querySelector(".globalSearchWrap");
    var dropdown = getEl("globalSearchDropdown");

    if (!wrap || !dropdown) return;

    if (!wrap.contains(event.target)) {
      window.closeGlobalSearchPopup();
    }
  });
})();