window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  var commentComposerState = {};
  var delegatedRoots = {};

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatText(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/(@[a-zA-Z0-9_]+)/g, '<span class="postMention">$1</span>');
    safe = safe.replace(/\n/g, "<br>");
    return safe;
  }

  function formatDate(timestamp) {
    try {
      return new Date(timestamp).toLocaleString("de-DE");
    } catch (error) {
      return "";
    }
  }

  function encodeText(value) {
    return encodeURIComponent(String(value || ""));
  }

  function ensureCommentComposerState(inputId) {
    if (!commentComposerState[inputId]) {
      commentComposerState[inputId] = {
        images: []
      };
    }

    return commentComposerState[inputId];
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

  function autoResizeTextarea(textarea, maxHeight) {
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight || 150) + "px";
  }

  function focusCommentInput(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    input.focus();

    if (typeof input.selectionStart === "number" && typeof input.selectionEnd === "number") {
      var end = String(input.value || "").length;
      input.selectionStart = end;
      input.selectionEnd = end;
    }
  }

  function renderCommentPreview(inputId) {
    var state = ensureCommentComposerState(inputId);
    var preview = document.getElementById(inputId + "_preview");
    if (!preview) return;

    preview.innerHTML = "";

    if (!state.images.length) {
      preview.style.display = "none";
      return;
    }

    preview.style.display = "flex";

    state.images.forEach(function (src, index) {
      var item = document.createElement("div");
      item.className = "commentComposerPreviewItem";

      var img = document.createElement("img");
      img.className = "commentComposerPreviewImage";
      img.src = src;
      img.alt = "Kommentar Bild";
      img.loading = "lazy";

      var removeBtn = document.createElement("button");
      removeBtn.className = "commentComposerPreviewRemove";
      removeBtn.type = "button";
      removeBtn.innerText = "✕";
      removeBtn.onclick = function () {
        state.images.splice(index, 1);
        renderCommentPreview(inputId);
        focusCommentInput(inputId);
      };

      item.appendChild(img);
      item.appendChild(removeBtn);
      preview.appendChild(item);
    });
  }

  async function addFilesToCommentComposer(inputId, files) {
    var state = ensureCommentComposerState(inputId);
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;

    for (var i = 0; i < list.length; i++) {
      var file = list[i];

      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        continue;
      }

      try {
        var dataUrl = await readFileAsDataUrl(file);
        state.images.push(dataUrl);
      } catch (error) {
        console.error("Comment image read failed", error);
      }
    }

    renderCommentPreview(inputId);
  }

  function resetCommentComposer(inputId) {
    var input = document.getElementById(inputId);
    var state = ensureCommentComposerState(inputId);

    if (input) {
      input.value = "";
      autoResizeTextarea(input, 150);
    }

    state.images = [];
    renderCommentPreview(inputId);
  }

  function closePostMenus() {
    document.querySelectorAll(".postMenu.open").forEach(function (menu) {
      menu.classList.remove("open");
    });

    document.querySelectorAll(".postMenuBtn.active").forEach(function (btn) {
      btn.classList.remove("active");
    });
  }

  function togglePostMenu(postId, event) {
    if (event) {
      event.stopPropagation();
    }

    var menu = document.getElementById("postMenu_" + postId);
    var btn = document.getElementById("postMenuBtn_" + postId);
    if (!menu || !btn) return;

    var shouldOpen = !menu.classList.contains("open");
    closePostMenus();

    if (shouldOpen) {
      menu.classList.add("open");
      btn.classList.add("active");
    }
  }

  function renderImages(images) {
    images = Array.isArray(images) ? images : [];

    if (!images.length) return "";

    return [
      '<div class="postImages">',
      images.map(function (src) {
        return '<img class="postImage" src="' + escapeHtml(src) + '" alt="Post Bild" loading="lazy">';
      }).join(""),
      '</div>'
    ].join("");
  }

  function getAvatarMarkup(post) {
    if (post.authorAvatar) {
      return '<img class="postAvatar" src="' + escapeHtml(post.authorAvatar) + '" alt="" loading="lazy">';
    }

    return [
      '<div class="postAvatar fallback">',
      escapeHtml(String(post.authorDisplayName || post.authorUsername || "?").charAt(0).toUpperCase()),
      '</div>'
    ].join("");
  }

  function getLikeCount(post) {
    return Array.isArray(post.likes) ? post.likes.length : 0;
  }

  function getCommentCount(post) {
    return Array.isArray(post.comments) ? post.comments.length : 0;
  }

  function isCurrentUserLike(post) {
    var currentUser = getCurrentUser();
    var currentUsername = currentUser
      ? String(currentUser.username || currentUser.name || currentUser || "").toLowerCase()
      : "";

    return Array.isArray(post.likes) && post.likes.indexOf(currentUsername) >= 0;
  }

  function isOwnPost(post) {
    var currentUser = getCurrentUser();
    var currentUsername = currentUser
      ? String(currentUser.username || currentUser.name || currentUser || "").toLowerCase()
      : "";

    return currentUsername && currentUsername === String(post.authorUsername || "").toLowerCase();
  }

  function renderHeader(post, feedType, ownerOption) {
    var ownPost = isOwnPost(post);
    var menuMarkup = "";

    if (ownPost) {
      menuMarkup = [
        '<div class="postMenuWrap">',
        '<button type="button" class="postMenuBtn" id="postMenuBtn_' + post.id + '" onclick="Heavenly.posts.render.togglePostMenu(\'' + post.id + '\', event)">⋯</button>',
        '<div class="postMenu" id="postMenu_' + post.id + '">',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.render.handleEditClick(\'' + post.id + '\', \'' + encodeText(post.text || "") + '\', \'' + feedType + '\', ' + ownerOption + ')">Bearbeiten</button>',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.render.handleDeleteClick(\'' + post.id + '\', \'' + feedType + '\', ' + ownerOption + ')">Löschen</button>',
        '</div>',
        '</div>'
      ].join("");
    }

    return [
      '<div class="postHeader">',
      getAvatarMarkup(post),
      '<div class="postHeaderMeta">',
      '<div class="postAuthor">' + escapeHtml(post.authorDisplayName || post.authorUsername || "Unbekannt") + '</div>',
      '<div class="postDate">' + escapeHtml(formatDate(post.createdAt)) + '</div>',
      '</div>',
      menuMarkup,
      '</div>'
    ].join("");
  }

  function renderPost(post, options) {
    options = options || {};

    var feedType = options.feedType || post.feedType || "home";
    var isLiked = isCurrentUserLike(post);
    var commentInputId = "commentInput_" + post.id;
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";

    return [
      '<article class="postCard" data-post-id="' + escapeHtml(post.id) + '">',
      renderHeader(post, feedType, ownerOption),
      '<div class="postText">' + formatText(post.text) + '</div>',
      renderImages(post.images),

      '<div class="postActionsRow">',
      '<button type="button" class="postActionBtn' + (isLiked ? ' active' : '') + '" onclick="Heavenly.posts.actions.toggleLike(\'' + post.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">',
      '❤ ' + getLikeCount(post),
      '</button>',
      '<button type="button" class="postActionBtn staticBtn">💬 ' + getCommentCount(post) + '</button>',
      '</div>',

      '<div class="postCommentsWrap">',
      Heavenly.posts.commentRender.renderComments(post.id, post.comments, {
        feedType: feedType,
        profileOwner: options.profileOwner
      }),
      '</div>',

      '<div class="postCommentComposer" data-comment-input="' + commentInputId + '">',
      '<div class="postCommentTools">',
      '<button type="button" class="dmToolBtn commentImageBtn" data-comment-image-btn="' + commentInputId + '" title="Bild antworten">🖼</button>',
      '<button type="button" class="dmToolBtn commentEmojiBtn" data-comment-emoji-btn="' + commentInputId + '" title="Emoji / Emotes">😊</button>',
      '</div>',
      '<input id="' + commentInputId + '_imageInput" type="file" accept="image/*" multiple hidden>',
      '<div id="' + commentInputId + '_preview" class="commentComposerPreview" style="display:none;"></div>',
      '<div class="postCommentForm">',
      '<textarea id="' + commentInputId + '" class="postCommentInput" placeholder="Kommentieren..." rows="1"></textarea>',
      '<button type="button" class="postCommentSend" onclick="Heavenly.posts.actions.submitComment(\'' + post.id + '\', \'' + commentInputId + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">Senden</button>',
      '</div>',
      '</div>',
      '</article>'
    ].join("");
  }

  function bindCommentComposer(container) {
    var root = container || document;

    root.querySelectorAll(".postCommentComposer").forEach(function (composer) {
      if (composer.dataset.boundComposer === "1") return;
      composer.dataset.boundComposer = "1";

      var inputId = composer.getAttribute("data-comment-input");
      if (!inputId) return;

      var textarea = composer.querySelector("#" + inputId);
      var imageBtn = composer.querySelector('[data-comment-image-btn="' + inputId + '"]');
      var emojiBtn = composer.querySelector('[data-comment-emoji-btn="' + inputId + '"]');
      var imageInput = composer.querySelector("#" + inputId + "_imageInput");

      if (textarea && !textarea.dataset.boundResize) {
        textarea.dataset.boundResize = "1";

        textarea.addEventListener("input", function () {
          autoResizeTextarea(textarea, 150);
        });

        textarea.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            var sendBtn = composer.querySelector(".postCommentSend");
            if (sendBtn) {
              sendBtn.click();
            }
          }
        });

        textarea.addEventListener("paste", async function (event) {
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
            if (!file) continue;

            event.preventDefault();
            await addFilesToCommentComposer(inputId, [file]);
            focusCommentInput(inputId);
            return;
          }
        });

        autoResizeTextarea(textarea, 150);
      }

      if (imageBtn && !imageBtn.dataset.boundClick) {
        imageBtn.dataset.boundClick = "1";
        imageBtn.addEventListener("click", function () {
          if (imageInput) {
            imageInput.click();
          }
        });
      }

      if (emojiBtn && !emojiBtn.dataset.boundClick) {
        emojiBtn.dataset.boundClick = "1";
        emojiBtn.addEventListener("click", function () {
          if (typeof window.openEmojiPicker === "function") {
            window.openEmojiPicker(inputId, {
              mode: "comment",
              onEmoteSelect: function (emote) {
                if (!emote || !emote.src) return;

                var state = ensureCommentComposerState(inputId);
                state.images.push(emote.src);
                renderCommentPreview(inputId);
                focusCommentInput(inputId);
              }
            });
          }
        });
      }

      if (imageInput && !imageInput.dataset.boundChange) {
        imageInput.dataset.boundChange = "1";
        imageInput.addEventListener("change", async function () {
          var files = imageInput.files;

          if (files && files.length) {
            await addFilesToCommentComposer(inputId, files);
          }

          imageInput.value = "";
          focusCommentInput(inputId);
        });
      }

      renderCommentPreview(inputId);
    });
  }

  function bindPostImageViewer(container) {
    var root = container || document;
    var rootKey = root.id || "document";

    if (delegatedRoots[rootKey]) return;
    delegatedRoots[rootKey] = true;

    root.addEventListener("click", function (event) {
      var img = event.target.closest(".postImage, .postCommentImage");
      if (!img) return;

      var viewer = document.getElementById("imageViewer");
      var viewerImg = document.getElementById("imageViewerImg");

      if (!viewer || !viewerImg) return;

      viewerImg.src = img.src;

      if (window.Heavenly && Heavenly.overlay && Heavenly.overlay.open) {
        Heavenly.overlay.open(viewer, "open");
      } else {
        viewer.classList.add("open");
      }
    });
  }

  function renderFeed(containerId, posts, options) {
    var container = document.getElementById(containerId);
    if (!container) return;

    posts = Array.isArray(posts) ? posts : [];

    if (!posts.length) {
      container.innerHTML = '<div class="postEmptyState">Noch keine Beiträge vorhanden.</div>';
      return;
    }

    container.innerHTML = posts.map(function (post) {
      return renderPost(post, options);
    }).join("");

    bindCommentComposer(container);
    bindPostImageViewer(container);
    closePostMenus();
  }

  async function openPostConfirm(titleText, bodyText) {
    if (typeof window.openDmConfirm === "function") {
      return await window.openDmConfirm(titleText, bodyText);
    }

    console.warn("openDmConfirm fehlt noch.");
    return false;
  }

  async function openPostPrompt(titleText, initialValue) {
    if (typeof window.openDmPrompt === "function") {
      return await window.openDmPrompt(titleText, initialValue);
    }

    console.warn("openDmPrompt fehlt noch.");
    return null;
  }

  async function handleEditClick(postId, encodedText, feedType, profileOwner) {
    closePostMenus();

    if (!Heavenly.posts || !Heavenly.posts.actions || typeof Heavenly.posts.actions.editPost !== "function") {
      return;
    }

    var decoded = decodeURIComponent(encodedText || "");
    var nextText = await openPostPrompt("Beitrag bearbeiten", decoded);

    if (nextText === null) return;

    nextText = String(nextText).trim();
    if (!nextText) return;

    Heavenly.posts.actions.editPost(postId, nextText, feedType, {
      profileOwner: profileOwner || null
    });
  }

  async function handleDeleteClick(postId, feedType, profileOwner) {
    closePostMenus();

    if (!Heavenly.posts || !Heavenly.posts.actions || typeof Heavenly.posts.actions.deletePost !== "function") {
      return;
    }

    var confirmed = await openPostConfirm(
      "Beitrag löschen",
      "Möchtest du diesen Beitrag wirklich löschen?"
    );

    if (!confirmed) return;

    Heavenly.posts.actions.deletePost(postId, feedType, {
      profileOwner: profileOwner || null
    });
  }

  Heavenly.posts.render = {
    renderPost: renderPost,
    renderFeed: renderFeed,
    handleEditClick: handleEditClick,
    handleDeleteClick: handleDeleteClick,
    togglePostMenu: togglePostMenu,
    closePostMenus: closePostMenus,
    resetCommentComposer: resetCommentComposer,
    ensureCommentComposerState: ensureCommentComposerState
  };

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".postMenuWrap")) {
      closePostMenus();
    }
  });
})();