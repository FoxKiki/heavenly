window.Heavenly = window.Heavenly || {};

(function () {
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

    var requests = getFriendRequests(user);

        requests = requests.filter(function (name) {
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
      window.closeGlobalSearchPopup();
      window.closeFriendRequests();
      return;
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil von " + name + " konnte nicht geöffnet werden", false);
    }
  }

window.showHome = async function (username) {
  var chip = getEl("userChipAvatar");

  if (chip) {
    chip.innerText = getInitials(username);
    chip.style.backgroundImage = "";
    chip.style.backgroundSize = "";
    chip.style.backgroundPosition = "";
    chip.style.backgroundRepeat = "";
  }

  if (Heavenly.api && Heavenly.api.getAvatar && chip) {
    try {
      var avatarResult = await Heavenly.api.getAvatar(username);

      if (avatarResult && avatarResult.ok && avatarResult.data) {
        chip.innerText = "";
        chip.style.backgroundImage = 'url("' + avatarResult.data + '")';
        chip.style.backgroundSize = "cover";
        chip.style.backgroundPosition = "center";
        chip.style.backgroundRepeat = "no-repeat";
      }
    } catch (error) {
      console.warn("Home avatar load failed", error);
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
    await window.renderFriends();
  } catch (error) {
    console.error("renderFriends failed", error);
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
    if (isBlocked(user, name)) {
      return false;
    }

    return String(name).toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="feedItem">Keine Freunde gefunden.</div>';
    return;
  }

  for (var index = 0; index < filtered.length; index++) {
    var name = filtered[index];

    var item = document.createElement("div");
    item.className = "friendItem";

    var avatar = document.createElement("div");
    avatar.className = "friendAvatar friendClickable";
    avatar.innerText = getInitials(name);
    avatar.onclick = (function (username) {
      return function () {
        openProfilePreview(username);
      };
    })(name);

    if (Heavenly.api && Heavenly.api.getAvatar) {
      try {
        var avatarResult = await Heavenly.api.getAvatar(name);

        if (avatarResult && avatarResult.ok && avatarResult.data) {
          avatar.innerText = "";
          avatar.style.backgroundImage = 'url("' + avatarResult.data + '")';
          avatar.style.backgroundSize = "cover";
          avatar.style.backgroundPosition = "center";
          avatar.style.backgroundRepeat = "no-repeat";
        }
      } catch (error) {
        console.warn("Friend avatar load failed", error);
      }
    }

    var meta = document.createElement("div");
    meta.className = "friendMeta friendClickable";
    meta.onclick = (function (username) {
      return function () {
        openProfilePreview(username);
      };
    })(name);

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
    removeBtn.onclick = (function (username) {
      return function () {
        window.openRemoveFriendPopup(username);
      };
    })(name);

    meta.appendChild(friendName);
    meta.appendChild(friendStatus);

    item.appendChild(avatar);
    item.appendChild(meta);
    item.appendChild(removeBtn);

    list.appendChild(item);
  }
};
   
  window.addDemoFriends = async function () {
    var user = getCurrentUser();
    if (!user) return;

    if (Heavenly.api && Heavenly.api.setFriends) {
      await Heavenly.api.setFriends(user, ["Max", "Sophie", "Luca", "Nina", "Jayden"]);
    }

    window.renderFriends();
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

    var requests = getFriendRequests(user);

    requests = requests.filter(function (name) {
      return !isBlocked(user, name);
    });

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

    window.renderFriendRequests();
    window.renderFriends();
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

    var removedName = pendingRemoveFriendName;
    window.closeRemoveFriendPopup();
    window.renderFriends();

    if (typeof window.setFeedback === "function") {
      window.setFeedback(removedName + " entfernt", true);
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
      window.closeGlobalSearchPopup();
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
      } catch (error) {
        console.warn("Account search load failed", error);
      }
    }

    if (accounts.length === 0 && Heavenly.storage && Heavenly.storage.getAccounts) {
      accounts = Heavenly.storage.getAccounts().map(function (account) {
        return account.username;
      });
    }

    var matches = accounts.filter(function (name) {
      if (!name) return false;
      if (user && String(name).toLowerCase() === String(user).toLowerCase()) return false;
      if (user && isBlocked(user, name)) return false;

      var lower = String(name).toLowerCase();
      var parts = lower.split(" ").filter(Boolean);

      if (lower.startsWith(query)) {
        return true;
      }

      return parts.some(function (part) {
        return part.startsWith(query);
      });
    });

    list.innerHTML = "";

    if (matches.length === 0) {
      list.innerHTML = '<div class="feedItem">Keine Profile gefunden.</div>';
      window.openGlobalSearchPopup();
      return query;
    }

    for (var index = 0; index < matches.length; index++) {
      var name = matches[index];

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
        } catch (error) {
          console.warn("Avatar search load failed", error);
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

    window.openGlobalSearchPopup();
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
    if (typeof window.setFeedback === "function") {
      window.setFeedback("News kommt gleich 😊", true);
    }
  };
})();