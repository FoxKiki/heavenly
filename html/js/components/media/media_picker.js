window.Heavenly = window.Heavenly || {};

(function () {
  var ignoreNextOutsideClick = false;

  function getEl(id) {
    return document.getElementById(id);
  }

  function closeMediaPicker() {
    var picker = getEl("heavenlyMediaPicker");
    if (picker) {
      picker.remove();
    }
  }

  function insertIntoDmInput(value) {
    var input = getEl("dmMessageInput");
    if (!input) return;

    input.value = (input.value || "") + value;
    input.focus();
  }

  function sendEmoteMessage(emote) {
    if (!emote) return;

    if (typeof window.sendActiveEmote === "function") {
      window.sendActiveEmote(emote);
    }

    closeMediaPicker();
  }

  function sendGifMessage(gif) {
    if (!gif) return;

    if (typeof window.sendActiveGif === "function") {
      window.sendActiveGif(gif);
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
        insertIntoDmInput(emoji);
        closeMediaPicker();
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
        sendEmoteMessage(emote);
      };

      body.appendChild(btn);
    });
  }

  function renderGifTab(body) {
    var gifs = (Heavenly.media && Heavenly.media.gifs) || [];

    body.innerHTML = "";

    if (!gifs.length) {
      var empty = document.createElement("div");
      empty.className = "heavenlyMediaPickerEmpty";
      empty.innerText = "Noch keine GIFs hinterlegt.";
      body.appendChild(empty);
      return;
    }

    gifs.forEach(function (gif) {
      var btn = document.createElement("button");
      btn.className = "heavenlyAssetBtn";
      btn.type = "button";

      var preview = createAssetPreview(
        gif.src,
        gif.label || gif.id || "GIF"
      );

      var label = document.createElement("div");
      label.className = "heavenlyAssetLabel";
      label.innerText = gif.label || gif.id || "GIF";

      btn.appendChild(preview);
      btn.appendChild(label);

      btn.onclick = function (event) {
        event.stopPropagation();
        sendGifMessage(gif);
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

    var header = document.createElement("div");
    header.className = "heavenlyMediaPickerHeader";

    var title = document.createElement("div");
    title.className = "heavenlyMediaPickerTitle";
    title.innerText = "Medien";

    var closeBtn = document.createElement("button");
    closeBtn.className = "heavenlyMediaPickerClose";
    closeBtn.type = "button";
    closeBtn.innerText = "✕";
    closeBtn.onclick = function (event) {
      event.stopPropagation();
      closeMediaPicker();
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    var tabs = document.createElement("div");
    tabs.className = "heavenlyMediaTabs";

    var body = document.createElement("div");
    body.className = "heavenlyMediaPickerBody";

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

      tabs.appendChild(
        createTabButton("GIF", tabName === "gif", function () {
          renderTab("gif");
        })
      );

      picker.dataset.activeTab = tabName;

      if (tabName === "emoji") {
        renderEmojiTab(body);
        return;
      }

      if (tabName === "emote") {
        renderEmoteTab(body);
        return;
      }

      if (tabName === "gif") {
        renderGifTab(body);
      }
    }

    picker.appendChild(header);
    picker.appendChild(tabs);
    picker.appendChild(body);

    document.body.appendChild(picker);
    renderTab(initialTab || "emoji");
  }

  function toggleMediaPicker(tabName) {
    var existing = getEl("heavenlyMediaPicker");

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

  window.openEmojiPicker = function () {
    toggleMediaPicker("emoji");
  };

  window.openEmotePicker = function () {
    toggleMediaPicker("emote");
  };

  window.openGifPicker = function () {
    toggleMediaPicker("gif");
  };

  window.closeMediaPicker = closeMediaPicker;
})();