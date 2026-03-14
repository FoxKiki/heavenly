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

  function createMessageId() {
    return "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function ensureMessageShape(message) {
    var safeMessage = message && typeof message === "object" ? message : {};

    if (!safeMessage.id) {
      safeMessage.id = createMessageId();
    }

    return safeMessage;
  }

  function getGlobalChatStore() {
    try {
      var raw = localStorage.getItem("heavenly_chats_global");
      if (!raw) return {};

      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      Object.keys(parsed).forEach(function (chatId) {
        if (!Array.isArray(parsed[chatId])) {
          parsed[chatId] = [];
          return;
        }

        parsed[chatId] = parsed[chatId].map(function (message) {
          return ensureMessageShape(message);
        });
      });

      return parsed;
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

    chats[chatId].push(ensureMessageShape(message));
    saveGlobalChatStore(chats);
  }

  function updateMessage(chatId, messageId, updater) {
    if (!chatId || !messageId || typeof updater !== "function") return false;

    var chats = getGlobalChatStore();
    var messages = Array.isArray(chats[chatId]) ? chats[chatId] : [];
    var didUpdate = false;

    chats[chatId] = messages.map(function (message) {
      var safeMessage = ensureMessageShape(message);

      if (safeMessage.id !== messageId) {
        return safeMessage;
      }

      didUpdate = true;
      return ensureMessageShape(updater(safeMessage) || safeMessage);
    });

    if (didUpdate) {
      saveGlobalChatStore(chats);
    }

    return didUpdate;
  }

  function deleteMessage(chatId, messageId) {
    if (!chatId || !messageId) return false;

    var chats = getGlobalChatStore();
    var messages = Array.isArray(chats[chatId]) ? chats[chatId] : [];
    var beforeLength = messages.length;

    chats[chatId] = messages
      .map(function (message) {
        return ensureMessageShape(message);
      })
      .filter(function (message) {
        return message.id !== messageId;
      });

    if (chats[chatId].length !== beforeLength) {
      saveGlobalChatStore(chats);
      return true;
    }

    return false;
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";

    var date = new Date(timestamp);
    var hours = String(date.getHours()).padStart(2, "0");
    var minutes = String(date.getMinutes()).padStart(2, "0");

    return hours + ":" + minutes;
  }

  function getMessagePreview(message, currentUser) {
    if (!message) {
      return "Noch keine Nachrichten";
    }

    var prefix =
      normalizeName(message.from) === normalizeName(currentUser)
        ? "Du: "
        : "";

    if (message.type === "image") {
      return prefix + "Bild gesendet";
    }

    if (message.type === "imageLink") {
      return prefix + "Bild/GIF-Link gesendet";
    }

    if (message.type === "emote") {
      return prefix + "Emote gesendet";
    }

    var text = String(message.text || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return prefix + "Nachricht";
    }

    return prefix + text;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      var reader = new FileReader();

      reader.onload = function (event) {
        resolve(event.target.result);
      };

      reader.onerror = function () {
        reject(new Error("File could not be read"));
      };

      reader.readAsDataURL(file);
    });
  }

  function isDirectImageUrl(text) {
    var value = String(text || "").trim();

    if (!value) return false;

    return /^(https?:\/\/.+|\/?.+\.(gif|png|jpe?g|webp))(\?.*)?$/i.test(value);
  }

  function normalizeImageUrl(text) {
    var value = String(text || "").trim();

    if (!value) return "";

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    if (value.charAt(0) === "/") {
      return value;
    }

    return value;
  }

  function isDmInputActive() {
    var input = getEl("dmMessageInput");
    return !!input && document.activeElement === input;
  }

  function closeMessageMenu() {
    var openMenus = document.querySelectorAll(".dmMessageMenu.open");
    var activeButtons = document.querySelectorAll(".dmMessageMenuBtn.active");

    openMenus.forEach(function (menu) {
      menu.classList.remove("open");
    });

    activeButtons.forEach(function (button) {
      button.classList.remove("active");
    });
  }

  function toggleMessageMenu(menu, button) {
    if (!menu || !button) return;

    var shouldOpen = !menu.classList.contains("open");
    closeMessageMenu();

    if (shouldOpen) {
      menu.classList.add("open");
      button.classList.add("active");
    }
  }

  function ensureDmActionModal() {
    var existing = getEl("dmActionModal");
    if (existing) {
      return existing;
    }

    var modal = document.createElement("div");
    modal.id = "dmActionModal";
    modal.className = "popup";

    var box = document.createElement("div");
    box.className = "popup-box dmActionPopupBox";
    box.onclick = function (event) {
      event.stopPropagation();
    };

    var title = document.createElement("h2");
    title.id = "dmActionModalTitle";
    title.innerText = "Aktion";

    var body = document.createElement("div");
    body.id = "dmActionModalBody";
    body.className = "dmActionModalBody";

    var input = document.createElement("textarea");
    input.id = "dmActionModalInput";
    input.className = "dmActionHidden";
    input.rows = 4;

    var actions = document.createElement("div");
    actions.className = "popupActionRow dmActionRow";

    var confirmBtn = document.createElement("button");
    confirmBtn.id = "dmActionModalConfirm";
    confirmBtn.type = "button";
    confirmBtn.innerText = "OK";

    var cancelBtn = document.createElement("button");
    cancelBtn.id = "dmActionModalCancel";
    cancelBtn.type = "button";
    cancelBtn.className = "close";
    cancelBtn.innerText = "Abbrechen";

    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);

    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(input);
    box.appendChild(actions);

    modal.appendChild(box);
    document.body.appendChild(modal);

    modal.addEventListener("click", function () {
      if (typeof modal._resolver === "function") {
        modal._resolver(null);
      }
      closeDmActionModal();
    });

    return modal;
  }

  function closeDmActionModal() {
    var modal = getEl("dmActionModal");
    if (!modal) return;

    modal.classList.remove("active");
    modal._resolver = null;
  }

  function openDmConfirm(titleText, bodyText) {
    return new Promise(function (resolve) {
      var modal = ensureDmActionModal();
      var title = getEl("dmActionModalTitle");
      var body = getEl("dmActionModalBody");
      var input = getEl("dmActionModalInput");
      var confirmBtn = getEl("dmActionModalConfirm");
      var cancelBtn = getEl("dmActionModalCancel");

      title.innerText = titleText || "Bestätigen";
      body.innerText = bodyText || "";
      input.value = "";
      input.classList.add("dmActionHidden");

      modal._resolver = function (value) {
        resolve(value === true);
      };

      function finish(value) {
        var resolver = modal._resolver;
        modal._resolver = null;
        closeDmActionModal();

        if (typeof resolver === "function") {
          resolver(value);
        }
      }

      confirmBtn.innerText = "Löschen";
      cancelBtn.innerText = "Abbrechen";

      confirmBtn.onclick = function (event) {
        event.stopPropagation();
        finish(true);
      };

      cancelBtn.onclick = function (event) {
        event.stopPropagation();
        finish(false);
      };

      modal.classList.add("active");
    });
  }

  function openDmPrompt(titleText, initialValue) {
    return new Promise(function (resolve) {
      var modal = ensureDmActionModal();
      var title = getEl("dmActionModalTitle");
      var body = getEl("dmActionModalBody");
      var input = getEl("dmActionModalInput");
      var confirmBtn = getEl("dmActionModalConfirm");
      var cancelBtn = getEl("dmActionModalCancel");

      title.innerText = titleText || "Bearbeiten";
      body.innerText = "";
      input.classList.remove("dmActionHidden");
      input.value = initialValue || "";

      modal._resolver = function (value) {
        resolve(value);
      };

      function finish(value) {
        var resolver = modal._resolver;
        modal._resolver = null;
        closeDmActionModal();

        if (typeof resolver === "function") {
          resolver(value);
        }
      }

      confirmBtn.innerText = "Speichern";
      cancelBtn.innerText = "Abbrechen";

      confirmBtn.onclick = function (event) {
        event.stopPropagation();
        finish(input.value);
      };

      cancelBtn.onclick = function (event) {
        event.stopPropagation();
        finish(null);
      };

      modal.classList.add("active");

      setTimeout(function () {
        input.focus();
        input.select();
      }, 0);
    });
  }

  async function sendImageFileToActiveChat(file) {
    var currentUser = getCurrentUser();
    var activeChat = Heavenly.state ? Heavenly.state.activeChat : null;
    var activeChatUser = Heavenly.state ? Heavenly.state.activeChatUser : null;

    if (!currentUser || !activeChat || !activeChatUser || !file) {
      return false;
    }

    try {
      var imageData = await readFileAsDataUrl(file);

      saveMessage(activeChat, {
        id: createMessageId(),
        from: currentUser,
        to: activeChatUser,
        type: "image",
        imageData: imageData,
        time: Date.now()
      });

      await refreshDmPanel();
      return true;
    } catch (error) {
      console.error("Image send failed", error);

      if (typeof window.setFeedback === "function") {
        window.setFeedback("Bild konnte nicht gesendet werden", false);
      }

      return false;
    }
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
      preview.innerText = getMessagePreview(row.lastMessage, currentUser);

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
      var msg = ensureMessageShape(messages[i]);
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

      if (isOwn) {
        var actions = document.createElement("div");
        actions.className = "dmMessageActions";

        var menuBtn = document.createElement("button");
        menuBtn.className = "dmMessageMenuBtn";
        menuBtn.type = "button";
        menuBtn.innerText = "⋯";

        var menu = document.createElement("div");
        menu.className = "dmMessageMenu";

        menuBtn.onclick = function (menuEl, buttonEl) {
          return function (event) {
            event.stopPropagation();
            toggleMessageMenu(menuEl, buttonEl);
          };
        }(menu, menuBtn);

        if (msg.type === "text") {
          var editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.innerText = "Bearbeiten";
          editBtn.onclick = function (messageId) {
            return async function (event) {
              event.stopPropagation();
              closeMessageMenu();

              var currentMessages = getChatMessages(activeChat);
              var currentMessage = currentMessages.find(function (entry) {
                return ensureMessageShape(entry).id === messageId;
              });

              if (!currentMessage) return;

              var nextText = await openDmPrompt(
                "Nachricht bearbeiten",
                currentMessage.text || ""
              );

              if (nextText === null) return;

              nextText = String(nextText).trim();
              if (!nextText) return;

              updateMessage(activeChat, messageId, function (message) {
                message.text = nextText;
                message.edited = true;
                message.editedAt = Date.now();
                return message;
              });

              await refreshDmPanel();
            };
          }(msg.id);

          menu.appendChild(editBtn);
        }

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.innerText = "Löschen";
        deleteBtn.onclick = function (messageId) {
          return async function (event) {
            event.stopPropagation();
            closeMessageMenu();

            var confirmed = await openDmConfirm(
              "Nachricht löschen",
              "Möchtest du diese Nachricht wirklich löschen?"
            );

            if (!confirmed) return;

            deleteMessage(activeChat, messageId);
            await refreshDmPanel();
          };
        }(msg.id);

        menu.appendChild(deleteBtn);

        actions.appendChild(menuBtn);
        actions.appendChild(menu);
        bubble.appendChild(actions);
      }

      var meta = document.createElement("div");
      meta.className = "dmMessageMeta";
      meta.innerText = msg.from + " • " + formatTime(msg.time);

      bubble.appendChild(meta);

      if (msg.type === "image" && msg.imageData) {
        var image = document.createElement("img");
        image.className = "dmMessageImage";
        image.src = msg.imageData;
        image.alt = "Gesendetes Bild";
        image.onclick = function () {
          var viewer = getEl("imageViewer");
          var viewerImg = getEl("imageViewerImg");

          if (viewer && viewerImg) {
            viewerImg.src = this.src;
            viewer.classList.add("open");
          }
        };

        bubble.appendChild(image);
      } else if (msg.type === "imageLink" && msg.imageUrl) {
        var linkedImage = document.createElement("img");
        linkedImage.className = "dmMessageGif";
        linkedImage.src = msg.imageUrl;
        linkedImage.alt = "Eingebettetes Bild";

        linkedImage.onclick = function () {
          var viewer = getEl("imageViewer");
          var viewerImg = getEl("imageViewerImg");

          if (viewer && viewerImg) {
            viewerImg.src = this.src;
            viewer.classList.add("open");
          }
        };

        bubble.appendChild(linkedImage);
      } else if (msg.type === "emote" && msg.emoteSrc) {
        var emote = document.createElement("img");
        emote.className = "dmMessageEmote";
        emote.src = msg.emoteSrc;
        emote.alt = msg.emoteId || "Emote";

        bubble.appendChild(emote);
      } else {
        var text = document.createElement("div");
        text.className = "dmMessageText";
        text.innerText = msg.text || "";

        bubble.appendChild(text);

        if (msg.edited) {
          var edited = document.createElement("div");
          edited.className = "dmMessageEdited";
          edited.innerText = "(bearbeitet)";
          bubble.appendChild(edited);
        }
      }

      row.appendChild(bubble);
      messagesEl.appendChild(row);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (input) {
      input.focus();
    }
  }

  async function refreshDmPanel() {
    closeMessageMenu();
    await renderDmFriendsList();
    await renderDmConversations();
    await renderActiveChat();
  }

  function initDmImageUpload() {
    var imageInput = getEl("dmImageInput");
    if (!imageInput || imageInput.dataset.bound) return;

    imageInput.dataset.bound = "1";

    imageInput.addEventListener("change", async function () {
      var file = imageInput.files && imageInput.files[0];

      if (!file) {
        imageInput.value = "";
        return;
      }

      await sendImageFileToActiveChat(file);
      imageInput.value = "";
    });
  }

  window.openDmOverlay = async function () {
    var panel = getEl("dmPanel");
    if (!panel) return;

    initDmImageUpload();
    panel.classList.add("active");
    await refreshDmPanel();
  };

  window.closeDmOverlay = function () {
    closeMessageMenu();
    closeDmActionModal();

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

    var rawText = input.value || "";
    var text = rawText.trim();

    if (!text) return;

    var message = {
      id: createMessageId(),
      from: currentUser,
      to: activeChatUser,
      time: Date.now()
    };

    if (isDirectImageUrl(text)) {
      message.type = "imageLink";
      message.imageUrl = normalizeImageUrl(text);
      message.text = text;
    } else {
      message.type = "text";
      message.text = text;
    }

    saveMessage(activeChat, message);

    input.value = "";
    await refreshDmPanel();
  };

  window.sendActiveEmote = async function (emote) {
    var currentUser = getCurrentUser();
    var activeChat = Heavenly.state ? Heavenly.state.activeChat : null;
    var activeChatUser = Heavenly.state ? Heavenly.state.activeChatUser : null;

    if (!currentUser || !activeChat || !activeChatUser || !emote) return;

    saveMessage(activeChat, {
      id: createMessageId(),
      from: currentUser,
      to: activeChatUser,
      type: "emote",
      emoteId: emote.id || "",
      emoteSrc: emote.src || "",
      time: Date.now()
    });

    await refreshDmPanel();
  };

  window.openDmMedia = function (type) {
    if (type === "image") {
      var imageInput = getEl("dmImageInput");
      if (imageInput) {
        imageInput.click();
      }
      return;
    }

    if (type === "emoji") {
      if (typeof window.openEmojiPicker === "function") {
        window.openEmojiPicker();
      }
      return;
    }

    if (type === "emote") {
      if (typeof window.openEmotePicker === "function") {
        window.openEmotePicker();
      }
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

    if (event.key === "Escape") {
      closeMessageMenu();
      closeDmActionModal();
    }
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".dmMessageActions")) {
      closeMessageMenu();
    }
  });

  document.addEventListener("paste", async function (event) {
    var panel = getEl("dmPanel");
    if (!panel || !panel.classList.contains("active")) return;
    if (!isDmInputActive()) return;

    var clipboardData = event.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (var i = 0; i < clipboardData.items.length; i++) {
      var item = clipboardData.items[i];

      if (!item || item.kind !== "file") {
        continue;
      }

      if (!item.type || item.type.indexOf("image/") !== 0) {
        continue;
      }

      var file = item.getAsFile();
      if (!file) {
        continue;
      }

      event.preventDefault();
      await sendImageFileToActiveChat(file);
      return;
    }
  });

  window.openDmConfirm = openDmConfirm;
  window.openDmPrompt = openDmPrompt;


})();
