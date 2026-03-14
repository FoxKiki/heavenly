window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  function rerenderFeed(feedType, options) {
    if (feedType === "profile") {
      if (Heavenly.screens && typeof Heavenly.screens.renderProfileFeed === "function") {
        Heavenly.screens.renderProfileFeed(options);
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

  function submitComment(postId, inputId, feedType, options) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var text = input.value || "";
    var comment = Heavenly.posts.store.addComment(postId, text);

    if (!comment) return;

    input.value = "";
    rerenderFeed(feedType, options);
  }

  Heavenly.posts.actions = {
    toggleLike: toggleLike,
    submitComment: submitComment
  };
})();
