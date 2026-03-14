window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  function rerenderFeed(feedType, options) {
    if (feedType === "profile") {
      if (Heavenly.screens && typeof Heavenly.screens.renderProfileFeed === "function") {
        Heavenly.screens.renderProfileFeed(options || {});
      }
      return;
    }

    if (Heavenly.screens && typeof Heavenly.screens.renderHomeFeed === "function") {
      Heavenly.screens.renderHomeFeed();
    }
  }

  function toggleLike(postId, feedType, options) {
    if (!Heavenly.posts || !Heavenly.posts.store) return;

    Heavenly.posts.store.toggleLike(postId);
    rerenderFeed(feedType, options);
  }

  function toggleCommentLike(postId, commentId, feedType, options) {
    if (!Heavenly.posts || !Heavenly.posts.store) return;

    Heavenly.posts.store.toggleCommentLike(postId, commentId);
    rerenderFeed(feedType, options);
  }

  function submitComment(postId, inputId, feedType, options) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var text = String(input.value || "").trim();
    if (!text) return;

    var comment = Heavenly.posts.store.addComment(postId, text);
    if (!comment) return;

    input.value = "";
    input.style.height = "auto";
    rerenderFeed(feedType, options);
  }

  function editPost(postId, nextText, feedType, options) {
    if (!Heavenly.posts || !Heavenly.posts.store) return;
    if (nextText === null || nextText === undefined) return;

    nextText = String(nextText).trim();
    if (!nextText) return;

    Heavenly.posts.store.editPost(postId, nextText);
    rerenderFeed(feedType, options);
  }

  function deletePost(postId, feedType, options) {
    if (!Heavenly.posts || !Heavenly.posts.store) return;

    Heavenly.posts.store.deletePost(postId);
    rerenderFeed(feedType, options);
  }

  Heavenly.posts.actions = {
    toggleLike: toggleLike,
    toggleCommentLike: toggleCommentLike,
    submitComment: submitComment,
    editPost: editPost,
    deletePost: deletePost
  };
})();
