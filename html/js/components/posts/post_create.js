window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function submitPost(config) {
    config = config || {};

    var input = document.getElementById(config.inputId);
    if (!input) {
      console.warn("Post input not found:", config.inputId);
      return;
    }

    var currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn("No current user for posting");
      return;
    }

    var text = String(input.value || "").trim();
    if (!text) return;

    var created = Heavenly.posts.store.createPost({
      author: currentUser,
      text: text,
      feedType: config.feedType || "home",
      profileOwner: config.profileOwner || null,
      visibility: config.visibility || "public",
      images: []
    });

    if (!created) {
      console.warn("Post was not created");
      return;
    }

    input.value = "";

    if (config.feedType === "profile") {
      if (Heavenly.screens && typeof Heavenly.screens.renderProfileFeed === "function") {
        Heavenly.screens.renderProfileFeed({
          profileOwner: config.profileOwner
        });
      }
      return;
    }

    if (Heavenly.screens && typeof Heavenly.screens.renderHomeFeed === "function") {
      Heavenly.screens.renderHomeFeed();
    }
  }

  Heavenly.posts.create = {
    submitPost: submitPost
  };
})();
