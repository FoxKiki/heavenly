window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
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

  function renderImages(images) {
    images = Array.isArray(images) ? images : [];

    if (!images.length) return "";

    return [
      '<div class="postImages">',
      images.map(function (src) {
        return '<img class="postImage" src="' + escapeHtml(src) + '" alt="Post Bild">';
      }).join(""),
      '</div>'
    ].join("");
  }

  function getAvatarMarkup(post) {
    if (post.authorAvatar) {
      return '<img class="postAvatar" src="' + escapeHtml(post.authorAvatar) + '" alt="">';
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

  function renderHeader(post) {
    return [
      '<div class="postHeader">',
      getAvatarMarkup(post),
      '<div class="postHeaderMeta">',
      '<div class="postAuthor">' + escapeHtml(post.authorDisplayName || post.authorUsername || "Unbekannt") + '</div>',
      '<div class="postDate">' + escapeHtml(formatDate(post.createdAt)) + '</div>',
      '</div>',
      '</div>'
    ].join("");
  }

  function renderPost(post, options) {
    options = options || {};

    var feedType = options.feedType || post.feedType || "home";
    var isLiked = isCurrentUserLike(post);
    var ownPost = isOwnPost(post);
    var commentInputId = "commentInput_" + post.id;
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";

    var postMenu = ownPost ? [
      '<div class="postOwnerActions">',
      '<button type="button" class="postOwnerBtn" onclick="Heavenly.posts.render.handleEditClick(\'' + post.id + '\', \'' + encodeText(post.text || "") + '\', \'' + feedType + '\', ' + ownerOption + ')">Bearbeiten</button>',
      '<button type="button" class="postOwnerBtn" onclick="Heavenly.posts.render.handleDeleteClick(\'' + post.id + '\', \'' + feedType + '\', ' + ownerOption + ')">Löschen</button>',
      '</div>'
    ].join("") : "";

    return [
      '<article class="postCard">',
      renderHeader(post),
      postMenu,
      '<div class="postText">' + formatText(post.text) + '</div>',
      renderImages(post.images),

      '<div class="postActionsRow">',
      '<button type="button" class="postActionBtn' + (isLiked ? ' active' : '') + '" onclick="Heavenly.posts.actions.toggleLike(\'' + post.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">',
      '❤ ' + getLikeCount(post),
      '</button>',
      '<button type="button" class="postActionBtn staticBtn">',
      '💬 ' + getCommentCount(post),
      '</button>',
      '</div>',

      '<div class="postCommentsWrap">',
      Heavenly.posts.commentRender.renderComments(post.id, post.comments, {
        feedType: feedType,
        profileOwner: options.profileOwner
      }),
      '</div>',

      '<div class="postCommentForm">',
      '<textarea id="' + commentInputId + '" class="postCommentInput" placeholder="Kommentieren..." rows="1"></textarea>',
      '<button type="button" class="postCommentSend" onclick="Heavenly.posts.actions.submitComment(\'' + post.id + '\', \'' + commentInputId + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">',
      'Senden',
      '</button>',
      '</div>',
      '</article>'
    ].join("");
  }

  function autoResizeCommentInputs(container) {
    var root = container || document;

    root.querySelectorAll(".postCommentInput").forEach(function (textarea) {
      function resize() {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
      }

      if (!textarea.dataset.boundResize) {
        textarea.dataset.boundResize = "1";

        textarea.addEventListener("input", resize);

        textarea.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            var sendBtn = textarea.parentNode
              ? textarea.parentNode.querySelector(".postCommentSend")
              : null;

            if (sendBtn) {
              sendBtn.click();
            }
          }
        });
      }

      resize();
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

    autoResizeCommentInputs(container);
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
    autoResizeCommentInputs: autoResizeCommentInputs
  };
})();
