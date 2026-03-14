window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
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

  function getCommentAvatar(comment) {
    if (comment.authorAvatar) {
      return '<img class="postCommentAvatar" src="' + escapeHtml(comment.authorAvatar) + '" alt="">';
    }

    return '<div class="postCommentAvatar fallback">' +
      escapeHtml(String(comment.authorDisplayName || "?").charAt(0).toUpperCase()) +
      '</div>';
  }

  function renderComment(postId, comment, options) {
    options = options || {};
    var feedType = options.feedType || "home";
    var ownerOption = options.profileOwner
      ? "'" + String(options.profileOwner).replace(/'/g, "\\'") + "'"
      : "null";
    var likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0;

    return [
      '<div class="postComment">',
      getCommentAvatar(comment),
      '<div class="postCommentBody">',
      '<div class="postCommentAuthor">' + escapeHtml(comment.authorDisplayName || "Unbekannt") + '</div>',
      '<div class="postCommentText">' + formatText(comment.text) + '</div>',
      '<div class="postCommentActions">',
      '<button type="button" class="postCommentLikeBtn" onclick="Heavenly.posts.actions.toggleCommentLike(\'' + postId + '\', \'' + comment.id + '\', \'' + feedType + '\', { profileOwner: ' + ownerOption + ' })">❤ ' + likeCount + '</button>',
      '</div>',
      '</div>',
      '</div>'
    ].join("");
  }

  function renderComments(postId, comments, options) {
    comments = Array.isArray(comments) ? comments : [];

    if (!comments.length) {
      return '<div class="postNoComments">Noch keine Kommentare</div>';
    }

    return comments.map(function (comment) {
      return renderComment(postId, comment, options);
    }).join("");
  }

  Heavenly.posts.commentRender = {
    renderComment: renderComment,
    renderComments: renderComments
  };
})();
