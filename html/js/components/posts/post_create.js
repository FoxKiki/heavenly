window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  var composerState = {};

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function ensureComposerState(inputId) {
    if (!composerState[inputId]) {
      composerState[inputId] = { images: [] };
    }

    return composerState[inputId];
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

  function autoResizeTextarea(textarea) {
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + "px";
  }

  function focusComposer(inputId) {
    var input = getEl(inputId);
    if (!input) return;

    input.focus();

    if (typeof input.selectionStart === "number" && typeof input.selectionEnd === "number") {
      var end = String(input.value || "").length;
      input.selectionStart = end;
      input.selectionEnd = end;
    }
  }

  function refreshComposerState(inputId) {
    var input = getEl(inputId);
    if (!input) return;

    var creator = input.closest(".postCreator");
    if (!creator) return;

    var state = ensureComposerState(inputId);
    var hasText = String(input.value || "").trim().length > 0;
    var hasImages = Array.isArray(state.images) && state.images.length > 0;
    var hasFocus = document.activeElement === input;

    creator.classList.toggle("active", hasText || hasImages || hasFocus);
  }

  function renderComposerPreview(inputId) {
    var state = ensureComposerState(inputId);
    var preview = getEl(inputId + "_preview");
    if (!preview) return;

    preview.innerHTML = "";

    if (!state.images.length) {
      preview.style.display = "none";
      refreshComposerState(inputId);
      return;
    }

    preview.style.display = "flex";

    state.images.forEach(function (src, index) {
      var item = document.createElement("div");
      item.className = "postComposerPreviewItem";

      var img = document.createElement("img");
      img.className = "postComposerPreviewImage";
      img.src = src;
      img.alt = "Post Bild";
      img.loading = "lazy";

      var removeBtn = document.createElement("button");
      removeBtn.className = "postComposerPreviewRemove";
      removeBtn.type = "button";
      removeBtn.innerText = "✕";
      removeBtn.onclick = function () {
        state.images.splice(index, 1);
        renderComposerPreview(inputId);
        focusComposer(inputId);
      };

      item.appendChild(img);
      item.appendChild(removeBtn);
      preview.appendChild(item);
    });

    refreshComposerState(inputId);
  }

  function resetComposer(inputId) {
    var input = getEl(inputId);
    var state = ensureComposerState(inputId);

    if (input) {
      input.value = "";
      autoResizeTextarea(input);
    }

    state.images = [];
    renderComposerPreview(inputId);
    refreshComposerState(inputId);
  }

  async function addFilesToComposer(inputId, files) {
    var state = ensureComposerState(inputId);
    var list = Array.prototype.slice.call(files || []);

    for (var i = 0; i < list.length; i++) {
      var file = list[i];

      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        continue;
      }

      try {
        state.images.push(await readFileAsDataUrl(file));
      } catch (error) {
        console.error("Post image read failed", error);
      }
    }

    renderComposerPreview(inputId);
  }

  function buildComposerTools(creator, textarea, inputId, submitBtn) {
    if (creator.querySelector(".postComposerTools")) {
      refreshComposerState(inputId);
      return;
    }

    var tools = document.createElement("div");
    tools.className = "postComposerTools";

    var imageBtn = document.createElement("button");
    imageBtn.className = "dmToolBtn";
    imageBtn.type = "button";
    imageBtn.title = "Bild hinzufügen";
    imageBtn.innerText = "🖼";

    var emojiBtn = document.createElement("button");
    emojiBtn.className = "dmToolBtn";
    emojiBtn.type = "button";
    emojiBtn.title = "Emoji / Emotes";
    emojiBtn.innerText = "😊";

    var hiddenImageInput = document.createElement("input");
    hiddenImageInput.type = "file";
    hiddenImageInput.accept = "image/*";
    hiddenImageInput.multiple = true;
    hiddenImageInput.hidden = true;
    hiddenImageInput.id = inputId + "_imageInput";

    var preview = document.createElement("div");
    preview.className = "postComposerPreview";
    preview.id = inputId + "_preview";
    preview.style.display = "none";

    if (submitBtn) {
      submitBtn.classList.add("postSubmitBtn");
    }

    tools.appendChild(imageBtn);
    tools.appendChild(emojiBtn);
    creator.insertBefore(tools, textarea);
    creator.appendChild(hiddenImageInput);
    creator.appendChild(preview);

    imageBtn.addEventListener("click", function () {
      hiddenImageInput.click();
    });

    emojiBtn.addEventListener("click", function () {
      if (typeof window.openEmojiPicker !== "function") return;

      window.openEmojiPicker(inputId, {
        mode: "post",
        onEmoteSelect: function (emote) {
          if (!emote || !emote.src) return;

          ensureComposerState(inputId).images.push(emote.src);
          renderComposerPreview(inputId);
          focusComposer(inputId);
        }
      });
    });

    hiddenImageInput.addEventListener("change", async function () {
      if (hiddenImageInput.files && hiddenImageInput.files.length) {
        await addFilesToComposer(inputId, hiddenImageInput.files);
      }

      hiddenImageInput.value = "";
      focusComposer(inputId);
      refreshComposerState(inputId);
    });
  }

  function bindTextareaEvents(textarea, inputId) {
    if (!textarea || textarea.dataset.heavenlyComposerBound === "1") {
      return;
    }

    textarea.dataset.heavenlyComposerBound = "1";

    textarea.addEventListener("focus", function () {
      refreshComposerState(inputId);
    });

    textarea.addEventListener("blur", function () {
      setTimeout(function () {
        refreshComposerState(inputId);
      }, 60);
    });

    textarea.addEventListener("input", function () {
      autoResizeTextarea(textarea);
      refreshComposerState(inputId);
    });

    textarea.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey) return;

      event.preventDefault();

      if (inputId === "profilePostInput") {
        if (typeof window.submitProfilePost === "function") {
          window.submitProfilePost();
        }
        return;
      }

      Heavenly.posts.create.submitPost({
        inputId: "homePostInput",
        feedType: "home"
      });
    });

    textarea.addEventListener("paste", async function (event) {
      var clipboardData = event.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      for (var i = 0; i < clipboardData.items.length; i++) {
        var item = clipboardData.items[i];

        if (!item || item.kind !== "file") continue;
        if (!item.type || item.type.indexOf("image/") !== 0) continue;

        var file = item.getAsFile();
        if (!file) continue;

        event.preventDefault();
        await addFilesToComposer(inputId, [file]);
        focusComposer(inputId);
        refreshComposerState(inputId);
        return;
      }
    });

    refreshComposerState(inputId);
  }

  function initComposer(inputId) {
    var existingInput = getEl(inputId);
    var existingTextarea = document.querySelector("textarea#" + inputId);
    var creator = existingInput
      ? existingInput.closest(".postCreator")
      : existingTextarea
        ? existingTextarea.closest(".postCreator")
        : null;

    if (!creator) return;

    var input = existingInput || existingTextarea;
    if (!input) return;

    var textarea = input;

    if (!(input.tagName && input.tagName.toLowerCase() === "textarea")) {
      textarea = document.createElement("textarea");
      textarea.id = input.id;
      textarea.className = "postComposerInput";
      textarea.placeholder = input.placeholder || "Was möchtest du posten?";
      textarea.rows = 1;
      textarea.value = input.value || "";
      input.parentNode.replaceChild(textarea, input);
    } else {
      textarea.classList.add("postComposerInput");
    }

    var submitBtn =
      creator.querySelector(".postSubmitBtn") ||
      creator.querySelector('button[onclick]') ||
      creator.querySelector("button:last-of-type");

    buildComposerTools(creator, textarea, inputId, submitBtn);
    bindTextareaEvents(textarea, inputId);
    autoResizeTextarea(textarea);
    renderComposerPreview(inputId);
    refreshComposerState(inputId);
    creator.dataset.heavenlyComposerReady = "1";
  }

  function submitPost(config) {
    config = config || {};

    var input = getEl(config.inputId);
    if (!input) return;

    var currentUser = getCurrentUser();
    if (!currentUser) return;

    var state = ensureComposerState(config.inputId);
    var text = String(input.value || "").trim();
    var images = Array.isArray(state.images) ? state.images.slice() : [];

    if (!text && !images.length) return;

    var created = Heavenly.posts.store.createPost({
      author: currentUser,
      text: text,
      feedType: config.feedType || "home",
      profileOwner: config.profileOwner || null,
      visibility: config.visibility || "public",
      images: images
    });

    if (!created) return;

    resetComposer(config.inputId);

    if (config.feedType === "profile") {
      if (Heavenly.screens && typeof Heavenly.screens.renderProfileFeed === "function") {
        Heavenly.screens.renderProfileFeed({ profileOwner: config.profileOwner });
      }
      return;
    }

    if (Heavenly.screens && typeof Heavenly.screens.renderHomeFeed === "function") {
      Heavenly.screens.renderHomeFeed();
    }
  }

  function initAllComposers() {
    initComposer("homePostInput");
    initComposer("profilePostInput");
  }

  Heavenly.posts.create = {
    submitPost: submitPost,
    initComposer: initComposer,
    initAllComposers: initAllComposers,
    focusComposer: focusComposer,
    refreshComposerState: refreshComposerState
  };

  document.addEventListener("DOMContentLoaded", function () {
    initAllComposers();
  });

  setTimeout(function () {
    initAllComposers();
  }, 0);
})();
