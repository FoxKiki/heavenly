window.Heavenly = window.Heavenly || {};

(function () {
  var ignoreNextOutsideClick = false;
  var lastMediaTab = "emoji";
  var pickerContext = {
    mode: "dm",
    inputId: "dmMessageInput",
    onEmojiSelect: null,
    onEmoteSelect: null
  };

  var pickerRefs = {
    root: null,
    tabs: null,
    body: null,
    closeBtn: null
  };

  function getEl(id) {
    return document.getElementById(id);
  }

  function getPicker() {
    if (pickerRefs.root && document.body.contains(pickerRefs.root)) {
      return pickerRefs.root;
    }

    pickerRefs.root = null;
    pickerRefs.tabs = null;
    pickerRefs.body = null;
    pickerRefs.closeBtn = null;
    return null;
  }

  function hidePicker() {
    var picker = getPicker();
    if (!picker) return;

    picker.style.display = "none";
    picker.dataset.activeTab = "";
  }

  function closeMediaPicker() {
    hidePicker();
  }

  function focusInputById(inputId) {
    var input = getEl(inputId);
    if (!input) return null;

    input.focus();

    if (typeof input.selectionStart === "number" && typeof input.selectionEnd === "number") {
      var end = input.value ? input.value.length : 0;
      input.selectionStart = end;
      input.selectionEnd = end;
    }

    return input;
  }

  function insertIntoInput(inputId, value) {
    var input = focusInputById(inputId);
    if (!input) return;

    var currentValue = String(input.value || "");
    var insertValue = String(value || "");

    if (typeof input.selectionStart === "number" && typeof input.selectionEnd === "number") {
      var start = input.selectionStart;
      var end = input.selectionEnd;

      input.value = currentValue.slice(0, start) + insertValue + currentValue.slice(end);

      var nextPos = start + insertValue.length;
      input.selectionStart = nextPos;
      input.selectionEnd = nextPos;
    } else {
      input.value = currentValue + insertValue;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function sendDmEmote(emote) {
    if (!emote) return;

    if (typeof window.sendActiveEmote === "function") {
      window.sendActiveEmote(emote);
    }

    closeMediaPicker();
  }

  function createTabButton(label, tabName, isActive) {
    var btn = document.createElement("button");
    btn.className = "heavenlyMediaTab" + (isActive ? " active" : "");
    btn.type = "button";
    btn.innerText = label;
    btn.dataset.mediaTab = tabName;
    return btn;
  }

  function createAssetPreview(src, altText) {
    var preview = document.createElement("img");
    preview.className = "heavenlyAssetPreview";
    preview.src = src;
    preview.alt = altText || "Media";
    preview.loading = "lazy";
    preview.decoding = "async";

    preview.onerror = function () {
      preview.style.display = "none";
    };

    return preview;
  }

  function handleEmojiSelect(emoji) {
    if (pickerContext && typeof pickerContext.onEmojiSelect === "function") {
      pickerContext.onEmojiSelect(emoji);
      closeMediaPicker();
      return;
    }

    insertIntoInput((pickerContext && pickerContext.inputId) || "dmMessageInput", emoji);
    closeMediaPicker();
  }

  function handleEmoteSelect(emote) {
    if (pickerContext && typeof pickerContext.onEmoteSelect === "function") {
      pickerContext.onEmoteSelect(emote);
      closeMediaPicker();
      return;
    }

    if (pickerContext && pickerContext.mode === "dm") {
      sendDmEmote(emote);
      return;
    }

    insertIntoInput(
      (pickerContext && pickerContext.inputId) || "dmMessageInput",
      " " + (emote.label || emote.id || "") + " "
    );
    closeMediaPicker();
  }

  function clearBody() {
    if (!pickerRefs.body) return;
    pickerRefs.body.innerHTML = "";
  }

  function renderEmojiTab() {
    var body = pickerRefs.body;
    var emojis = (Heavenly.media && Heavenly.media.emojis) || [];

    if (!body) return;
    clearBody();

    if (!emojis.length) {
      var empty = document.createElement("div");
      empty.className = "heavenlyMediaPickerEmpty";
      empty.innerText = "Noch keine Emojis hinterlegt.";
      body.appendChild(empty);
      return;
    }

    var fragment = document.createDocumentFragment();

    emojis.forEach(function (emoji) {
      var btn = document.createElement("button");
      btn.className = "heavenlyEmojiBtn";
      btn.type = "button";
      btn.innerText = emoji;
      btn.dataset.emojiValue = emoji;
      fragment.appendChild(btn);
    });

    body.appendChild(fragment);
  }

  function renderEmoteTab() {
    var body = pickerRefs.body;
    var emotes = (Heavenly.media && Heavenly.media.emotes) || [];

    if (!body) return;
    clearBody();

    if (!emotes.length) {
      var empty = document.createElement("div");
      empty.className = "heavenlyMediaPickerEmpty";
      empty.innerText = "Noch keine Emotes hinterlegt.";
      body.appendChild(empty);
      return;
    }

    var fragment = document.createDocumentFragment();

    emotes.forEach(function (emote, index) {
      var btn = document.createElement("button");
      btn.className = "heavenlyAssetBtn";
      btn.type = "button";
      btn.title = emote.label || emote.id || "Emote";
      btn.dataset.emoteIndex = String(index);

      var preview = createAssetPreview(
        emote.src,
        emote.label || emote.id || "Emote"
      );

      var label = document.createElement("div");
      label.className = "heavenlyAssetLabel";
      label.innerText = emote.label || emote.id || "Emote";

      btn.appendChild(preview);
      btn.appendChild(label);
      fragment.appendChild(btn);
    });

    body.appendChild(fragment);
  }

  function renderTabs(tabName) {
    if (!pickerRefs.tabs || !pickerRefs.closeBtn) return;

    pickerRefs.tabs.innerHTML = "";
    pickerRefs.tabs.appendChild(createTabButton("😊 Emoji", "emoji", tabName === "emoji"));
    pickerRefs.tabs.appendChild(createTabButton("🦊 Emotes", "emote", tabName === "emote"));
    pickerRefs.tabs.appendChild(pickerRefs.closeBtn);
  }

  function renderTab(tabName) {
    var picker = getPicker();
    if (!picker) return;

    renderTabs(tabName);

    picker.dataset.activeTab = tabName;
    lastMediaTab = tabName;

    if (tabName === "emoji") {
      renderEmojiTab();
      return;
    }

    renderEmoteTab();
  }

  function ensurePickerBuilt() {
    var picker = getPicker();
    if (picker) {
      return picker;
    }

    picker = document.createElement("div");
    picker.id = "heavenlyMediaPicker";
    picker.className = "heavenlyMediaPicker";
    picker.style.display = "none";

    var tabs = document.createElement("div");
    tabs.className = "heavenlyMediaTabs";

    var body = document.createElement("div");
    body.className = "heavenlyMediaPickerBody";

    var closeBtn = document.createElement("button");
    closeBtn.className = "heavenlyMediaPickerClose";
    closeBtn.type = "button";
    closeBtn.innerText = "✕";

    picker.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMediaPicker();
    });

    tabs.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-media-tab]");
      if (!btn) return;

      event.stopPropagation();
      renderTab(btn.dataset.mediaTab);
    });

    body.addEventListener("click", function (event) {
      var emojiBtn = event.target.closest("[data-emoji-value]");
      if (emojiBtn) {
        event.stopPropagation();
        handleEmojiSelect(emojiBtn.dataset.emojiValue);
        return;
      }

      var emoteBtn = event.target.closest("[data-emote-index]");
      if (emoteBtn) {
        event.stopPropagation();

        var emotes = (Heavenly.media && Heavenly.media.emotes) || [];
        var index = Number(emoteBtn.dataset.emoteIndex);
        var emote = emotes[index];

        if (emote) {
          handleEmoteSelect(emote);
        }
      }
    });

    picker.appendChild(tabs);
    picker.appendChild(body);
    document.body.appendChild(picker);

    pickerRefs.root = picker;
    pickerRefs.tabs = tabs;
    pickerRefs.body = body;
    pickerRefs.closeBtn = closeBtn;

    return picker;
  }

  function openPicker(tabName, context) {
    var picker = ensurePickerBuilt();

    pickerContext = Object.assign({
      mode: "dm",
      inputId: "dmMessageInput",
      onEmojiSelect: null,
      onEmoteSelect: null
    }, context || {});

    ignoreNextOutsideClick = true;

    var activeTab = picker.dataset.activeTab || "";

    if (picker.style.display !== "none" && activeTab === tabName) {
      closeMediaPicker();
      return;
    }

    picker.style.display = "flex";
    renderTab(tabName || lastMediaTab || "emoji");
  }

  document.addEventListener("click", function (event) {
    var picker = getPicker();
    if (!picker || picker.style.display === "none") return;

    if (ignoreNextOutsideClick) {
      ignoreNextOutsideClick = false;
      return;
    }

    var clickedInsidePicker = picker.contains(event.target);
    var clickedToolBtn = !!event.target.closest(".dmToolBtn");

    if (!clickedInsidePicker && !clickedToolBtn) {
      closeMediaPicker();
    }
  });

  window.openEmojiPicker = function (inputId, options) {
    openPicker("emoji", Object.assign({}, options || {}, {
      inputId: inputId || "dmMessageInput"
    }));
  };

  window.openEmotePicker = function (inputId, options) {
    openPicker("emote", Object.assign({}, options || {}, {
      inputId: inputId || "dmMessageInput"
    }));
  };

  window.closeMediaPicker = closeMediaPicker;
})();