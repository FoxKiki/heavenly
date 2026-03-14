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

    async function submitComment(postId, inputId, feedType, options) {
    var input = document.getElementById(inputId);
    if (!input) return;

    if (feedType === "profile") {
      var profileOwner = options && options.profileOwner ? options.profileOwner : null;

      if (profileOwner && typeof window.canCurrentUserViewProfilePosts === "function") {
        var allowed = await window.canCurrentUserViewProfilePosts(profileOwner);

        if (!allowed) {
          if (typeof window.setFeedback === "function") {
            window.setFeedback("Nur Freunde können auf diesem Profil kommentieren.", false);
          }
          return;
        }
      }
    }

    var text = String(input.value || "").trim();
    var images = [];

    if (
      Heavenly.posts &&
      Heavenly.posts.render &&
      typeof Heavenly.posts.render.ensureCommentComposerState === "function"
    ) {
      images = Heavenly.posts.render.ensureCommentComposerState(inputId).images.slice();
    }

    var comment = Heavenly.posts.store.addComment(postId, text, images);
    if (!comment) return;

    if (
      Heavenly.posts &&
      Heavenly.posts.render &&
      typeof Heavenly.posts.render.resetCommentComposer === "function"
    ) {
      Heavenly.posts.render.resetCommentComposer(inputId);
    } else {
      input.value = "";
      input.style.height = "auto";
    }

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
