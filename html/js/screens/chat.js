window.Heavenly = window.Heavenly || {};

(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function getInitials(name) {
    if (Heavenly && Heavenly.util && Heavenly.util.initials) {
      return Heavenly.util.initials(name);
    }

    return String(name || "?").charAt(0).toUpperCase();
  }

  function getChatId(userA, userB) {
    return [normalizeName(userA), normalizeName(userB)].sort().join(":");
  }

  function getGlobalChatStore() {
    try {
      var raw = localStorage.getItem("heavenly_chats_global");
      if (!raw) return {};

      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Global chat store load failed", error);
      return {};
    }
  }

  function saveGlobalChatStore(chats) {
    try {
      localStorage.setItem("heavenly_chats_global", JSON.stringify(chats || {}));
    } catch (error) {
      console.warn("Global chat store save failed", error);
    }
  }

  function userHasAccessToChat(chatId, currentUser) {
    if (!chatId || !currentUser) return false;

    var parts = String(chatId).split(":");
    if (parts.length !== 2) return false;

    var current = normalizeName(currentUser);
    return parts[0] === current || parts[1] === current;
  }

  function getChatStore() {
    var currentUser = getCurrentUser();
    var globalChats = getGlobalChatStore();
    var filtered = {};

    Object.keys(globalChats).forEach(function (chatId) {
      if (userHasAccessToChat(chatId, currentUser)) {
        filtered[chatId] = Array.isArray(globalChats[chatId]) ? globalChats[chatId] : [];
      }
    });

    return filtered;
  }

  function getChatMessages(chatId) {
    var currentUser = getCurrentUser();
    if (!userHasAccessToChat(chatId, currentUser)) {
      return [];
    }

    var chats = getGlobalChatStore();
    return Array.isArray(chats[chatId]) ? chats[chatId] : [];
  }

  function ensureChat(userA, userB) {
    var chatId = getChatId(userA, userB);
    var chats = getGlobalChatStore();

    if (!Array.isArray(chats[chatId])) {
      chats[chatId] = [];
      saveGlobalChatStore(chats);
    }

    return chatId;
  }

  function saveMessage(chatId, message) {
    var chats = getGlobalChatStore();

    if (!Array.isArray(chats[chatId])) {
      chats[chatId] = [];
    }

    chats[chatId].push(message);
    saveGlobalChatStore(chats);
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";

    var date = new Date(timestamp);
    var hours = String(date.getHours()).padStart(2, "0");
    var minutes = String(date.getMinutes()).padStart(2, "0");

    return hours + ":" + minutes;
  }

  async function getFriends() {
    var user = getCurrentUser();
    if (!user || !Heavenly.api || !Heavenly.api.getFriends) return [];

    try {
      var result = await Heavenly.api.getFriends(user);
      if (result && result.ok && Array.isArray(result.data)) {
        return result.data.filter(function (name) {
          return normalizeName(name) !== normalizeName(user);
        });
      }
    } catch (error) {
      console.warn("Friend load failed", error);
    }

    return [];
  }

  async function getUserStatus(name) {
    if (!name || !Heavenly.api || !Heavenly.api.getProfile) return "";

    try {
      var result = await Heavenly.api.getProfile(name);
      if (result && result.ok && result.data && result.data.settings) {
        return result.data.settings.status || "";
      }
    } catch (error) {
      console.warn("Status load failed", error);
    }

    return "";
  }

  async function getAvatarUrl(name) {
    if (!name || !Heavenly.api || !Heavenly.api.getAvatar) return "";

    try {
      var result = await Heavenly.api.getAvatar(name);
      if (result && result.ok && result.data) {
        return result.data;
      }
    } catch (error) {
      console.warn("Avatar load failed", error);
    }

    return "";
  }

  async function getConversationUsers() {
    var currentUser = getCurrentUser();
    if (!currentUser) return [];

    var chats = getChatStore();
    var names = [];

    Object.keys(chats).forEach(function (chatId) {
      var messages = chats[chatId];
      if (!Array.isArray(messages) || messages.length === 0) {
        return;
      }

      var parts = String(chatId).split(":");
      if (parts.length !== 2) return;

      var other = parts[0] === normalizeName(currentUser) ? parts[1] : parts[0];

      if (
        other &&
        normalizeName(other) !== normalizeName(currentUser) &&
        !names.some(function (entry) {
          return normalizeName(entry) === normalizeName(other);
        })
      ) {
        names.push(other);
      }
    });

    return names;
  }

  async function renderDmFriendsList() {
    var list = getEl("dmFriendsList");
    if (!list) return;

    var friends = await getFriends();
    list.innerHTML = "";

    if (friends.length === 0) {
      list.innerHTML = '<div class="dmListEmpty">Noch keine Freunde.</div>';
      return;
    }

    for (var i = 0; i < friends.length; i++) {
      var name = friends[i];

      var item = document.createElement("button");
      item.className = "dmMiniFriendItem";
      item.type = "button";
      item.onclick = (function (username) {
        return function () {
          window.openChatWithUser(username);
        };
      })(name);

      var avatar = document.createElement("div");
      avatar.className = "dmMiniFriendAvatar";
      avatar.innerText = getInitials(name);

      var avatarUrl = await getAvatarUrl(name);
      if (avatarUrl) {
        avatar.innerText = "";
        avatar.style.backgroundImage = 'url("' + avatarUrl + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.style.backgroundRepeat = "no-repeat";
      }

      var meta = document.createElement("div");
      meta.className = "dmMiniFriendMeta";

      var label = document.createElement("div");
      label.className = "dmMiniFriendName";
      label.innerText = name;

      var status = document.createElement("div");
      status.className = "dmMiniFriendStatus";
      status.innerText = "Freund";

      var profileStatus = await getUserStatus(name);
      if (profileStatus && profileStatus.trim()) {
        status.innerText = profileStatus.trim();
      }

      meta.appendChild(label);
      meta.appendChild(status);

      item.appendChild(avatar);
      item.appendChild(meta);

      list.appendChild(item);
    }
  }

  async function renderDmConversations() {
    var list = getEl("dmConversationsList");
    var currentUser = getCurrentUser();

    if (!list || !currentUser) return;

    var users = await getConversationUsers();
    list.innerHTML = "";

    if (users.length === 0) {
      list.innerHTML = '<div class="dmListEmpty">Noch keine Nachrichten.</div>';
      return;
    }

    var rows = [];

    for (var i = 0; i < users.length; i++) {
      var username = users[i];
      var chatId = getChatId(currentUser, username);
      var messages = getChatMessages(chatId);
      var lastMessage = messages.length ? messages[messages.length - 1] : null;

      rows.push({
        username: username,
        chatId: chatId,
        lastMessage: lastMessage,
        lastTime: lastMessage ? lastMessage.time : 0
      });
    }

    rows.sort(function (a, b) {
      return b.lastTime - a.lastTime;
    });

    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];

      var item = document.createElement("button");
      item.className = "dmConversationItem";
      item.type = "button";

      if (
        Heavenly.state &&
        Heavenly.state.activeChat &&
        Heavenly.state.activeChat === row.chatId
      ) {
        item.classList.add("active");
      }

      item.onclick = (function (username) {
        return function () {
          window.openChatWithUser(username);
        };
      })(row.username);

      var avatar = document.createElement("div");
      avatar.className = "dmConversationAvatar";
      avatar.innerText = getInitials(row.username);

      var avatarUrl = await getAvatarUrl(row.username);
      if (avatarUrl) {
        avatar.innerText = "";
        avatar.style.backgroundImage = 'url("' + avatarUrl + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.style.backgroundRepeat = "no-repeat";
      }

      var meta = document.createElement("div");
      meta.className = "dmConversationMeta";

      var top = document.createElement("div");
      top.className = "dmConversationTop";

      var name = document.createElement("div");
      name.className = "dmConversationName";
      name.innerText = row.username;

      var time = document.createElement("div");
      time.className = "dmConversationTime";
      time.innerText = row.lastMessage ? formatTime(row.lastMessage.time) : "";

      top.appendChild(name);
      top.appendChild(time);

      var preview = document.createElement("div");
      preview.className = "dmConversationPreview";

      if (row.lastMessage) {
        var prefix = normalizeName(row.lastMessage.from) === normalizeName(currentUser) ? "Du: " : "";
        preview.innerText = prefix + row.lastMessage.text;
      } else {
        preview.innerText = "Noch keine Nachrichten";
      }

      meta.appendChild(top);
      meta.appendChild(preview);

      item.appendChild(avatar);
      item.appendChild(meta);

      list.appendChild(item);
    }
  }

  async function renderActiveChat() {
    var nameEl = getEl("dmActiveChatName");
    var messagesEl = getEl("dmActiveMessages");
    var emptyEl = getEl("dmActiveEmpty");
    var composer = getEl("dmComposer");
    var input = getEl("dmMessageInput");

    if (!nameEl || !messagesEl || !emptyEl || !composer) return;

    var activeChatUser = Heavenly.state ? Heavenly.state.activeChatUser : null;
    var activeChat = Heavenly.state ? Heavenly.state.activeChat : null;
    var currentUser = getCurrentUser();

    messagesEl.innerHTML = "";

    if (!activeChatUser || !activeChat || !currentUser) {
      nameEl.innerText = "Nachrichten";
      emptyEl.style.display = "flex";
      composer.style.display = "none";
      return;
    }

    nameEl.innerText = activeChatUser;
    emptyEl.style.display = "none";
    composer.style.display = "block";

    var messages = getChatMessages(activeChat);

    if (messages.length === 0) {
      messagesEl.innerHTML = '<div class="dmChatHint">Schreib deine erste Nachricht ✨</div>';
      if (input) {
        input.focus();
      }
      return;
    }

    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      var isOwn = normalizeName(msg.from) === normalizeName(currentUser);

      var row = document.createElement("div");
      row.className = "dmMessageRow";
      if (isOwn) {
        row.classList.add("own");
      }

      var bubble = document.createElement("div");
      bubble.className = "dmMessageBubble";
      if (isOwn) {
        bubble.classList.add("own");
      }

      var meta = document.createElement("div");
      meta.className = "dmMessageMeta";
      meta.innerText = msg.from + " • " + formatTime(msg.time);

      var text = document.createElement("div");
      text.className = "dmMessageText";
      text.innerText = msg.text;

      bubble.appendChild(meta);
      bubble.appendChild(text);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (input) {
      input.focus();
    }
  }

  async function refreshDmPanel() {
    await renderDmFriendsList();
    await renderDmConversations();
    await renderActiveChat();
  }

  window.openDmOverlay = async function () {
    var panel = getEl("dmPanel");
    if (!panel) return;

    panel.classList.add("active");
    await refreshDmPanel();
  };

  window.closeDmOverlay = function () {
    var panel = getEl("dmPanel");
    if (!panel) return;

    panel.classList.remove("active");
  };

  window.openChatWithUser = async function (username) {
    var currentUser = getCurrentUser();
    if (!currentUser || !username) return;
    if (normalizeName(currentUser) === normalizeName(username)) return;

    if (!Heavenly.state) {
      Heavenly.state = {};
    }

    Heavenly.state.activeChatUser = username;
    Heavenly.state.activeChat = ensureChat(currentUser, username);

    await window.openDmOverlay();
  };

  window.openChatFromProfile = async function () {
    var currentUser = getCurrentUser();
    var viewedUser = Heavenly && Heavenly.state ? Heavenly.state.viewedProfileUser : null;

    if (!currentUser) return;

    if (!viewedUser || normalizeName(viewedUser) === normalizeName(currentUser)) {
      await window.openDmOverlay();
      return;
    }

    await window.openChatWithUser(viewedUser);
  };

  window.sendActiveMessage = async function () {
    var currentUser = getCurrentUser();
    var input = getEl("dmMessageInput");
    var activeChat = Heavenly.state ? Heavenly.state.activeChat : null;
    var activeChatUser = Heavenly.state ? Heavenly.state.activeChatUser : null;

    if (!currentUser || !input || !activeChat || !activeChatUser) return;

    var text = input.value.trim();
    if (!text) return;

    saveMessage(activeChat, {
      from: currentUser,
      to: activeChatUser,
      text: text,
      time: Date.now()
    });

    input.value = "";
    await refreshDmPanel();
  };

  window.openDmMedia = function (type) {
    if (typeof window.setFeedback !== "function") return;

    if (type === "image") {
      window.setFeedback("Bildversand kommt als Nächstes 😊", true);
      return;
    }

    if (type === "gif") {
      window.setFeedback("GIFs kommen als Nächstes 😊", true);
      return;
    }

    if (type === "emoji") {
      window.setFeedback("Emotes kommen als Nächstes 😊", true);
    }
  };

  document.addEventListener("keydown", function (event) {
    var input = getEl("dmMessageInput");
    if (!input) return;
    if (document.activeElement !== input) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      window.sendActiveMessage();
    }
  });
})();