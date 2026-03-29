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

  function isOwnComment(comment) {
    var currentUser = getCurrentUser();
    var currentName = currentUser
      ? String(currentUser.username || currentUser.name || currentUser || "").toLowerCase()
      : "";

    return currentName && currentName === String(comment.authorUsername || "").toLowerCase();
  }

  function isCommentLiked(comment) {
    var currentUser = getCurrentUser();
    var currentName = currentUser
      ? String(currentUser.username || currentUser.name || currentUser || "").toLowerCase()
      : "";

    return Array.isArray(comment.likes) && comment.likes.indexOf(currentName) >= 0;
  }

  function getAvatarMarkup(comment) {
    if (comment.authorAvatar) {
      return '<img class="postCommentAvatar" src="' + escapeHtml(comment.authorAvatar) + '" alt="" loading="lazy">';
    }

    return [
      '<div class="postCommentAvatar fallback">',
      escapeHtml(String(comment.authorDisplayName || comment.authorUsername || "?").charAt(0).toUpperCase()),
      "</div>"
    ].join("");
  }

  function renderImages(images) {
    images = Array.isArray(images) ? images : [];

    if (!images.length) return "";

    return [
      '<div class="postCommentImages">',
      images.map(function (src) {
        return '<img class="postCommentImage" src="' + escapeHtml(src) + '" alt="Kommentar Bild" loading="lazy">';
      }).join(""),
      "</div>"
    ].join("");
  }

  function closeCommentMenus() {
    document.querySelectorAll(".commentMenu.open").forEach(function (menu) {
      if (Heavenly.overlay && Heavenly.overlay.close) {
        Heavenly.overlay.close(menu, "open");
      } else {
        menu.classList.remove("open");
      }
    });

    document.querySelectorAll(".commentMenuBtn.active").forEach(function (button) {
      button.classList.remove("active");
    });
  }

  function toggleCommentMenu(commentId, event) {
    if (event) {
      event.stopPropagation();
    }

    var menu = document.getElementById("commentMenu_" + commentId);
    var btn = document.getElementById("commentMenuBtn_" + commentId);
    if (!menu || !btn) return;

    var shouldOpen = !menu.classList.contains("open");
    closeCommentMenus();

    if (!shouldOpen) return;

    if (Heavenly.overlay && Heavenly.overlay.open) {
      Heavenly.overlay.open(menu, "open");
    } else {
      menu.classList.add("open");
    }

    btn.classList.add("active");
  }

  async function handleEditCommentClick(postId, commentId, encodedText, feedType, profileOwner) {
    closeCommentMenus();

    if (!Heavenly.posts || !Heavenly.posts.actions || typeof Heavenly.posts.actions.editComment !== "function") {
      return;
    }

    var nextText = typeof window.openDmPrompt === "function"
      ? await window.openDmPrompt("Kommentar bearbeiten", decodeURIComponent(encodedText || ""))
      : null;

    if (nextText === null) return;

    nextText = String(nextText).trim();
    if (!nextText) return;

    Heavenly.posts.actions.editComment(postId, commentId, nextText, feedType, {
      profileOwner: profileOwner || null
    });
  }

  async function handleDeleteCommentClick(postId, commentId, feedType, profileOwner) {
    closeCommentMenus();

    if (!Heavenly.posts || !Heavenly.posts.actions || typeof Heavenly.posts.actions.deleteComment !== "function") {
      return;
    }

    var confirmed = typeof window.openDmConfirm === "function"
      ? await window.openDmConfirm("Kommentar löschen", "Möchtest du diesen Kommentar wirklich löschen?")
      : false;

    if (!confirmed) return;

    Heavenly.posts.actions.deleteComment(postId, commentId, feedType, {
      profileOwner: profileOwner || null
    });
  }

  function renderComment(postId, comment, options) {
    options = options || {};

    var feedType = options.feedType || "home";
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";
    var ownComment = isOwnComment(comment);
    var liked = isCommentLiked(comment);
    var likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0;
    var menuMarkup = "";

    if (ownComment) {
      menuMarkup = [
        '<div class="commentMenuWrap uiMenuWrap">',
        '<button type="button" class="commentMenuBtn uiMenuBtn" id="commentMenuBtn_' + comment.id + '" onclick="Heavenly.posts.commentRender.toggleCommentMenu(\'' + comment.id + '\', event)">⋯</button>',
        '<div class="commentMenu uiMenu" id="commentMenu_' + comment.id + '">',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.commentRender.handleEditCommentClick(\'' + postId + '\', \'' + comment.id + '\', \'' + encodeText(comment.text || "") + '\', \'' + feedType + '\', ' + ownerOption + ')">Bearbeiten</button>',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.commentRender.handleDeleteCommentClick(\'' + postId + '\', \'' + comment.id + '\', \'' + feedType + '\', ' + ownerOption + ')">Löschen</button>',
        "</div>",
        "</div>"
      ].join("");
    }

    return [
      '<div class="postComment" data-comment-id="' + escapeHtml(comment.id) + '">',
      getAvatarMarkup(comment),
      '<div class="postCommentBody">',
      '<div class="postCommentHeaderRow">',
      '<div class="postCommentHeaderMeta">',
      '<div class="postCommentAuthor">' + escapeHtml(comment.authorDisplayName || comment.authorUsername || "Unbekannt") + "</div>",
      '<div class="postDate">' + escapeHtml(formatDate(comment.createdAt)) + "</div>",
      "</div>",
      menuMarkup,
      "</div>",
      '<div class="postCommentText">' + formatText(comment.text) + "</div>",
      renderImages(comment.images),
      '<div class="postCommentActions">',
      '<button type="button" class="postCommentBtn' + (liked ? " active" : "") + '" onclick="Heavenly.posts.actions.toggleCommentLike(\'' + postId + '\', \'' + comment.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">❤ ' + likeCount + "</button>",
      "</div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function renderComments(postId, comments, options) {
    comments = Array.isArray(comments) ? comments : [];

    if (!comments.length) {
      return '<div class="postNoComments">Noch keine Kommentare.</div>';
    }

    return comments.map(function (comment) {
      return renderComment(postId, comment, options);
    }).join("");
  }

  Heavenly.posts.commentRender = {
    renderComments: renderComments,
    toggleCommentMenu: toggleCommentMenu,
    handleEditCommentClick: handleEditCommentClick,
    handleDeleteCommentClick: handleDeleteCommentClick,
    closeCommentMenus: closeCommentMenus
  };

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".commentMenuWrap")) {
      closeCommentMenus();
    }
  });
})();
