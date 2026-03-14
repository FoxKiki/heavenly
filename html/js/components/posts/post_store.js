window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};

(function () {
  var STORAGE_KEY = "heavenly_posts";

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function loadRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("Post load failed", error);
      return [];
    }
  }

  function saveRaw(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureArray(posts)));
    } catch (error) {
      console.warn("Post save failed", error);
    }
  }

  function getAuthorData(user) {
    if (typeof user === "string") {
      return {
        username: user,
        displayName: user,
        avatar: ""
      };
    }

    user = user || getCurrentUser() || {};

    return {
      username: user.username || user.name || "unknown",
      displayName: user.displayName || user.name || user.username || "Unknown",
      avatar: user.avatar || user.profilePicture || user.profileImage || ""
    };
  }

  function extractMentions(text) {
    var matches = String(text || "").match(/@([a-zA-Z0-9_]+)/g) || [];
    var seen = {};
    var result = [];

    matches.forEach(function (tag) {
      var username = normalizeName(tag.slice(1));
      if (!username || seen[username]) return;
      seen[username] = true;
      result.push(username);
    });

    return result;
  }

  function getPosts() {
    return ensureArray(loadRaw()).map(function (post) {
      return {
        id: post.id || makeId("post"),
        feedType: post.feedType === "profile" ? "profile" : "home",
        profileOwner: post.profileOwner || null,
        authorUsername: post.authorUsername || "unknown",
        authorDisplayName: post.authorDisplayName || post.authorUsername || "Unknown",
        authorAvatar: post.authorAvatar || "",
        text: String(post.text || ""),
        images: ensureArray(post.images),
        mentions: ensureArray(post.mentions),
        likes: ensureArray(post.likes),
        comments: ensureArray(post.comments).map(function (comment) {
          return {
            id: comment.id || makeId("comment"),
            authorUsername: comment.authorUsername || "unknown",
            authorDisplayName: comment.authorDisplayName || comment.authorUsername || "Unknown",
            authorAvatar: comment.authorAvatar || "",
            text: String(comment.text || ""),
            images: ensureArray(comment.images),
            mentions: ensureArray(comment.mentions),
            likes: ensureArray(comment.likes),
            createdAt: comment.createdAt || Date.now()
          };
        }),
        visibility: post.visibility || "public",
        createdAt: post.createdAt || Date.now()
      };
    });
  }

  function savePosts(posts) {
    saveRaw(posts);
  }

  function createPost(data) {
    data = data || {};

    var currentUser = getCurrentUser();
    var author = getAuthorData(data.author || currentUser);
    var text = String(data.text || "").trim();

    if (!text && !ensureArray(data.images).length) {
      return null;
    }

    var posts = getPosts();

    var newPost = {
      id: makeId("post"),
      feedType: data.feedType === "profile" ? "profile" : "home",
      profileOwner: data.profileOwner || null,
      authorUsername: author.username,
      authorDisplayName: author.displayName,
      authorAvatar: author.avatar,
      text: text,
      images: ensureArray(data.images),
      mentions: extractMentions(text),
      likes: [],
      comments: [],
      visibility: data.visibility || "public",
      createdAt: Date.now()
    };

    posts.unshift(newPost);
    savePosts(posts);

    return newPost;
  }

  function updatePost(postId, updater) {
    var posts = getPosts();
    var changedPost = null;

    var nextPosts = posts.map(function (post) {
      if (post.id !== postId) return post;
      changedPost = typeof updater === "function" ? updater(post) : post;
      return changedPost;
    });

    savePosts(nextPosts);
    return changedPost;
  }

  function deletePost(postId) {
    var posts = getPosts().filter(function (post) {
      return post.id !== postId;
    });

    savePosts(posts);
  }

  function editPost(postId, text) {
    var content = String(text || "").trim();
    if (!content) return null;

    return updatePost(postId, function (post) {
      post.text = content;
      post.mentions = extractMentions(content);
      return post;
    });
  }

  function toggleLike(postId, username) {
    var activeUser = username || getCurrentUser();
    var userKey = normalizeName(
      typeof activeUser === "string"
        ? activeUser
        : (activeUser && (activeUser.username || activeUser.name))
    );

    if (!userKey) return null;

    return updatePost(postId, function (post) {
      var likes = ensureArray(post.likes).slice();
      var index = likes.indexOf(userKey);

      if (index >= 0) {
        likes.splice(index, 1);
      } else {
        likes.push(userKey);
      }

      post.likes = likes;
      return post;
    });
  }

  function addComment(postId, text, images) {
    var currentUser = getCurrentUser();
    if (!currentUser) return null;

    var content = String(text || "").trim();
    var media = ensureArray(images);

    if (!content && !media.length) return null;

    var author = getAuthorData(currentUser);

    return updatePost(postId, function (post) {
      var comments = ensureArray(post.comments).slice();

      comments.push({
        id: makeId("comment"),
        authorUsername: author.username,
        authorDisplayName: author.displayName,
        authorAvatar: author.avatar,
        text: content,
        images: media,
        mentions: extractMentions(content),
        likes: [],
        createdAt: Date.now()
      });

      post.comments = comments;
      return post;
    });
  }

  function editComment(postId, commentId, text) {
    var content = String(text || "").trim();
    if (!content) return null;

    return updatePost(postId, function (post) {
      post.comments = ensureArray(post.comments).map(function (comment) {
        if (comment.id !== commentId) return comment;

        comment.text = content;
        comment.mentions = extractMentions(content);
        return comment;
      });

      return post;
    });
  }

  function deleteComment(postId, commentId) {
    return updatePost(postId, function (post) {
      post.comments = ensureArray(post.comments).filter(function (comment) {
        return comment.id !== commentId;
      });

      return post;
    });
  }

  function toggleCommentLike(postId, commentId, username) {
    var activeUser = username || getCurrentUser();
    var userKey = normalizeName(
      typeof activeUser === "string"
        ? activeUser
        : (activeUser && (activeUser.username || activeUser.name))
    );

    if (!userKey) return null;

    return updatePost(postId, function (post) {
      post.comments = ensureArray(post.comments).map(function (comment) {
        if (comment.id !== commentId) return comment;

        var likes = ensureArray(comment.likes).slice();
        var index = likes.indexOf(userKey);

        if (index >= 0) {
          likes.splice(index, 1);
        } else {
          likes.push(userKey);
        }

        comment.likes = likes;
        return comment;
      });

      return post;
    });
  }

  function getFeedPosts(feedType, options) {
    options = options || {};
    var posts = getPosts();

    return posts.filter(function (post) {
      if (post.feedType !== feedType) return false;

      if (feedType === "profile") {
        return normalizeName(post.profileOwner) === normalizeName(options.profileOwner);
      }

      return true;
    });
  }

  Heavenly.posts.store = {
    getPosts: getPosts,
    savePosts: savePosts,
    createPost: createPost,
    editPost: editPost,
    deletePost: deletePost,
    toggleLike: toggleLike,
    addComment: addComment,
    editComment: editComment,
    deleteComment: deleteComment,
    toggleCommentLike: toggleCommentLike,
    getFeedPosts: getFeedPosts,
    extractMentions: extractMentions
  };
})();
