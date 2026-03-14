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

    return safe;
  }

  function renderComment(comment) {
    var avatar = comment.authorAvatar
      ? '<img class="postCommentAvatar" src="' + comment.authorAvatar + '" alt="">'
      : '<div class="postCommentAvatar fallback">' +
          escapeHtml(String(comment.authorDisplayName || "?").charAt(0).toUpperCase()) +
        "</div>";

    return [
      '<div class="postComment">',
      avatar,
      '<div class="postCommentBody">',
      '<div class="postCommentAuthor">' + escapeHtml(comment.authorDisplayName) + "</div>",
      '<div class="postCommentText">' + formatText(comment.text) + "</div>",
      "</div>",
      "</div>"
    ].join("");
  }

  function renderComments(comments) {
    comments = Array.isArray(comments) ? comments : [];

    if (!comments.length) {
      return '<div class="postNoComments">Noch keine Kommentare</div>';
    }

    return comments.map(renderComment).join("");
  }

  Heavenly.posts.commentRender = {
    renderComment: renderComment,
    renderComments: renderComments
  };
})();
