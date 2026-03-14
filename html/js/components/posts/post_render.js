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

  function renderPost(post, options) {
    options = options || {};

    var currentUser = getCurrentUser();
    var currentUsername = currentUser ? String(currentUser.username || currentUser || "").toLowerCase() : "";
    var isLiked = Array.isArray(post.likes) && post.likes.indexOf(currentUsername) >= 0;
    var commentInputId = "commentInput_" + post.id;
    var feedType = options.feedType || post.feedType;
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";

    var avatar = post.authorAvatar
      ? '<img class="postAvatar" src="' + escapeHtml(post.authorAvatar) + '" alt="">'
      : '<div class="postAvatar fallback">' +
          escapeHtml(String(post.authorDisplayName || "?").charAt(0).toUpperCase()) +
        '</div>';

    return [
      '<article class="postCard">',
      '<div class="postHeader">',
      avatar,
      '<div class="postHeaderMeta">',
      '<div class="postAuthor">' + escapeHtml(post.authorDisplayName || "Unbekannt") + '</div>',
      '<div class="postDate">' + escapeHtml(formatDate(post.createdAt)) + '</div>',
      '</div>',
      '</div>',

      '<div class="postText">' + formatText(post.text) + '</div>',
      renderImages(post.images),

      '<div class="postActionsRow">',
      '<button type="button" class="postActionBtn' + (isLiked ? ' active' : '') + '" onclick="Heavenly.posts.actions.toggleLike(\'' + post.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">',
      '❤ ' + (Array.isArray(post.likes) ? post.likes.length : 0),
      '</button>',
      '<button type="button" class="postActionBtn staticBtn">',
      '💬 ' + (Array.isArray(post.comments) ? post.comments.length : 0),
      '</button>',
      '</div>',

      '<div class="postCommentsWrap">',
      Heavenly.posts.commentRender.renderComments(post.comments),
      '</div>',

      '<div class="postCommentForm">',
      '<input id="' + commentInputId + '" class="postCommentInput" type="text" placeholder="Kommentieren...">',
      '<button type="button" class="postCommentSend" onclick="Heavenly.posts.actions.submitComment(\'' + post.id + '\', \'' + commentInputId + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">',
      'Senden',
      '</button>',
      '</div>',
      '</article>'
    ].join("");
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
  }

  Heavenly.posts.render = {
    renderPost: renderPost,
    renderFeed: renderFeed
  };
})();
