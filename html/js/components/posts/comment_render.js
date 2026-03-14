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
    return escapeHtml(text).replace(/\n/g, "<br>");
  }

  function encodeText(value) {
    return encodeURIComponent(String(value || ""));
  }

  function isOwnComment(comment) {
    var currentUser = getCurrentUser();
    var currentUsername = currentUser
      ? String(currentUser.username || currentUser.name || currentUser || "").toLowerCase()
      : "";

    return currentUsername && currentUsername === String(comment.authorUsername || "").toLowerCase();
  }

  function getAvatarMarkup(comment) {
    if (comment.authorAvatar) {
      return '<img class="postCommentAvatar" src="' + escapeHtml(comment.authorAvatar) + '" alt="">';
    }

    return [
      '<div class="postCommentAvatar fallback">',
      escapeHtml(String(comment.authorDisplayName || comment.authorUsername || "?").charAt(0).toUpperCase()),
      '</div>'
    ].join("");
  }

  function renderCommentImages(images) {
    images = Array.isArray(images) ? images : [];

    if (!images.length) return "";

    return [
      '<div class="postCommentImages">',
      images.map(function (src) {
        return '<img class="postCommentImage" src="' + escapeHtml(src) + '" alt="Kommentar Bild">';
      }).join(""),
      '</div>'
    ].join("");
  }

  function closeCommentMenus() {
    document.querySelectorAll(".commentMenu.open").forEach(function (menu) {
      menu.classList.remove("open");
    });

    document.querySelectorAll(".commentMenuBtn.active").forEach(function (btn) {
      btn.classList.remove("active");
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

    if (shouldOpen) {
      menu.classList.add("open");
      btn.classList.add("active");
    }
  }

  async function handleEditComment(postId, commentId, encodedText, feedType, profileOwner) {
    closeCommentMenus();

    if (!window.openDmPrompt) return;
    if (!Heavenly.posts || !Heavenly.posts.store) return;

    var decoded = decodeURIComponent(encodedText || "");
    var nextText = await window.openDmPrompt("Kommentar bearbeiten", decoded);

    if (nextText === null) return;

    nextText = String(nextText).trim();
    if (!nextText) return;

    if (typeof Heavenly.posts.store.editComment === "function") {
      Heavenly.posts.store.editComment(postId, commentId, nextText);
    }

    if (feedType === "profile") {
      if (Heavenly.screens && Heavenly.screens.renderProfileFeed) {
        Heavenly.screens.renderProfileFeed({
          profileOwner: profileOwner || null
        });
      }
    } else {
      if (Heavenly.screens && Heavenly.screens.renderHomeFeed) {
        Heavenly.screens.renderHomeFeed();
      }
    }
  }

  async function handleDeleteComment(postId, commentId, feedType, profileOwner) {
    closeCommentMenus();

    if (!window.openDmConfirm) return;
    if (!Heavenly.posts || !Heavenly.posts.store) return;

    var confirmed = await window.openDmConfirm(
      "Kommentar löschen",
      "Möchtest du diesen Kommentar wirklich löschen?"
    );

    if (!confirmed) return;

    if (typeof Heavenly.posts.store.deleteComment === "function") {
      Heavenly.posts.store.deleteComment(postId, commentId);
    }

    if (feedType === "profile") {
      if (Heavenly.screens && Heavenly.screens.renderProfileFeed) {
        Heavenly.screens.renderProfileFeed({
          profileOwner: profileOwner || null
        });
      }
    } else {
      if (Heavenly.screens && Heavenly.screens.renderHomeFeed) {
        Heavenly.screens.renderHomeFeed();
      }
    }
  }

  function renderComments(postId, comments, options) {
    comments = Array.isArray(comments) ? comments : [];
    options = options || {};

    if (!comments.length) {
      return '<div class="postNoComments">Noch keine Kommentare</div>';
    }

    var feedType = options.feedType || "home";
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";

    return comments.map(function (comment) {
      var ownComment = isOwnComment(comment);
      var likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0;

      var menuMarkup = ownComment ? [
        '<div class="commentMenuWrap">',
        '<button type="button" class="commentMenuBtn" id="commentMenuBtn_' + comment.id + '" onclick="Heavenly.posts.commentRender.toggleCommentMenu(\'' + comment.id + '\', event)">⋯</button>',
        '<div class="commentMenu" id="commentMenu_' + comment.id + '">',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.commentRender.handleEditComment(\'' + postId + '\', \'' + comment.id + '\', \'' + encodeText(comment.text || "") + '\', \'' + feedType + '\', ' + ownerOption + ')">Bearbeiten</button>',
        '<button type="button" onclick="event.stopPropagation(); Heavenly.posts.commentRender.handleDeleteComment(\'' + postId + '\', \'' + comment.id + '\', \'' + feedType + '\', ' + ownerOption + ')">Löschen</button>',
        '</div>',
        '</div>'
      ].join("") : "";

      return [
        '<div class="postComment">',
        getAvatarMarkup(comment),
        '<div class="postCommentBody">',
        '<div class="postCommentHeaderRow">',
        '<div class="postCommentHeaderMeta">',
        '<div class="postCommentAuthor">' + escapeHtml(comment.authorDisplayName || comment.authorUsername || "Unbekannt") + '</div>',
        '</div>',
        menuMarkup,
        '</div>',
        comment.text ? '<div class="postCommentText">' + formatText(comment.text) + '</div>' : '',
        renderCommentImages(comment.images),
        '<div class="postCommentActions">',
        '<button type="button" class="postCommentBtn" onclick="Heavenly.posts.actions.toggleCommentLike(\'' + postId + '\', \'' + comment.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">❤ ' + likeCount + '</button>',
        '</div>',
        '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  Heavenly.posts.commentRender = {
    renderComments: renderComments,
    toggleCommentMenu: toggleCommentMenu,
    closeCommentMenus: closeCommentMenus,
    handleEditComment: handleEditComment,
    handleDeleteComment: handleDeleteComment
  };

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".commentMenuWrap")) {
      closeCommentMenus();
    }
  });
})();
