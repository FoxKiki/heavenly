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

  function getEl(id) {
    return document.getElementById(id);
  }

  function closeMediaPicker() {
    var picker = getEl("heavenlyMediaPicker");
    if (picker) {
      picker.remove();
    }
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

  function createTabButton(label, isActive, onClick) {
    var btn = document.createElement("button");
    btn.className = "heavenlyMediaTab" + (isActive ? " active" : "");
    btn.type = "button";
    btn.innerText = label;

    btn.onclick = function (event) {
      event.stopPropagation();
      onClick();
    };

    return btn;
  }

  function createAssetPreview(src, altText) {
    var preview = document.createElement("img");
    preview.className = "heavenlyAssetPreview";
    preview.src = src;
    preview.alt = altText || "Media";
    preview.loading = "lazy";

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

    insertIntoInput((pickerContext && pickerContext.inputId) || "dmMessageInput", " " + (emote.label || emote.id || "") + " ");
    closeMediaPicker();
  }

  function renderEmojiTab(body) {
    var emojis = (Heavenly.media && Heavenly.media.emojis) || [];

    body.innerHTML = "";

    if (!emojis.length) {
      var empty = document.createElement("div");
      empty.className = "heavenlyMediaPickerEmpty";
      empty.innerText = "Noch keine Emojis hinterlegt.";
      body.appendChild(empty);
      return;
    }

    emojis.forEach(function (emoji) {
      var btn = document.createElement("button");
      btn.className = "heavenlyEmojiBtn";
      btn.type = "button";
      btn.innerText = emoji;

      btn.onclick = function (event) {
        event.stopPropagation();
        handleEmojiSelect(emoji);
      };

      body.appendChild(btn);
    });
  }

  function renderEmoteTab(body) {
    var emotes = (Heavenly.media && Heavenly.media.emotes) || [];

    body.innerHTML = "";

    if (!emotes.length) {
      var empty = document.createElement("div");
      empty.className = "heavenlyMediaPickerEmpty";
      empty.innerText = "Noch keine Emotes hinterlegt.";
      body.appendChild(empty);
      return;
    }

    emotes.forEach(function (emote) {
      var btn = document.createElement("button");
      btn.className = "heavenlyAssetBtn";
      btn.type = "button";
      btn.title = emote.label || emote.id || "Emote";

      var preview = createAssetPreview(
        emote.src,
        emote.label || emote.id || "Emote"
      );

      var label = document.createElement("div");
      label.className = "heavenlyAssetLabel";
      label.innerText = emote.label || emote.id || "Emote";

      btn.appendChild(preview);
      btn.appendChild(label);

      btn.onclick = function (event) {
        event.stopPropagation();
        handleEmoteSelect(emote);
      };

      body.appendChild(btn);
    });
  }

  function buildPicker(initialTab) {
    closeMediaPicker();

    var picker = document.createElement("div");
    picker.id = "heavenlyMediaPicker";
    picker.className = "heavenlyMediaPicker";

    picker.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    var tabs = document.createElement("div");
    tabs.className = "heavenlyMediaTabs";

    var body = document.createElement("div");
    body.className = "heavenlyMediaPickerBody";

    var closeBtn = document.createElement("button");
    closeBtn.className = "heavenlyMediaPickerClose";
    closeBtn.type = "button";
    closeBtn.innerText = "✕";
    closeBtn.onclick = function (event) {
      event.stopPropagation();
      closeMediaPicker();
    };

    function renderTab(tabName) {
      tabs.innerHTML = "";

      tabs.appendChild(
        createTabButton("😊 Emoji", tabName === "emoji", function () {
          renderTab("emoji");
        })
      );

      tabs.appendChild(
        createTabButton("🦊 Emotes", tabName === "emote", function () {
          renderTab("emote");
        })
      );

      tabs.appendChild(closeBtn);

      picker.dataset.activeTab = tabName;
      lastMediaTab = tabName;

      if (tabName === "emoji") {
        renderEmojiTab(body);
        return;
      }

      if (tabName === "emote") {
        renderEmoteTab(body);
      }
    }

    picker.appendChild(tabs);
    picker.appendChild(body);

    document.body.appendChild(picker);
    renderTab(initialTab || lastMediaTab || "emoji");
  }

  function openPicker(tabName, context) {
    var existing = getEl("heavenlyMediaPicker");

    pickerContext = Object.assign({
      mode: "dm",
      inputId: "dmMessageInput",
      onEmojiSelect: null,
      onEmoteSelect: null
    }, context || {});

    ignoreNextOutsideClick = true;

    if (existing) {
      var activeTab = existing.dataset.activeTab || "";

      if (activeTab === tabName) {
        closeMediaPicker();
        return;
      }

      existing.remove();
    }

    buildPicker(tabName);
  }

  document.addEventListener("click", function (event) {
    var picker = getEl("heavenlyMediaPicker");
    if (!picker) return;

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
