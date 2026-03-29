window.Heavenly = window.Heavenly || {};
Heavenly.posts = Heavenly.posts || {};
Heavenly.posts.feedPaging = Heavenly.posts.feedPaging || {};

(function () {
  var STORAGE_KEY = "heavenly_posts";
  var INITIAL_BATCH = 10;
  var LOAD_BATCH = 10;
  var cachedPosts = [];

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function isFiveM() {
    return !!(Heavenly && Heavenly.env && Heavenly.env.isFiveM && Heavenly.env.isFiveM());
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

  function clonePost(post) {
    return {
      id: post.id,
      feedType: post.feedType,
      profileOwner: post.profileOwner || null,
      authorUsername: post.authorUsername || "unknown",
      authorDisplayName: post.authorDisplayName || post.authorUsername || "Unknown",
      authorAvatar: post.authorAvatar || "",
      text: String(post.text || ""),
      images: ensureArray(post.images).slice(),
      mentions: ensureArray(post.mentions).slice(),
      likes: ensureArray(post.likes).slice(),
      comments: ensureArray(post.comments).map(function (comment) {
        return {
          id: comment.id,
          authorUsername: comment.authorUsername || "unknown",
          authorDisplayName: comment.authorDisplayName || comment.authorUsername || "Unknown",
          authorAvatar: comment.authorAvatar || "",
          text: String(comment.text || ""),
          images: ensureArray(comment.images).slice(),
          mentions: ensureArray(comment.mentions).slice(),
          likes: ensureArray(comment.likes).slice(),
          createdAt: comment.createdAt || Date.now(),
          updatedAt: comment.updatedAt || comment.createdAt || Date.now()
        };
      }),
      visibility: post.visibility || "public",
      createdAt: post.createdAt || Date.now(),
      updatedAt: post.updatedAt || post.createdAt || Date.now()
    };
  }

  function normalizePosts(posts) {
    return ensureArray(posts).map(function (post) {
      return clonePost({
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
        comments: ensureArray(post.comments),
        visibility: post.visibility || "public",
        createdAt: post.createdAt || Date.now(),
        updatedAt: post.updatedAt || post.createdAt || Date.now()
      });
    });
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

  function getPagingKey(feedType, options) {
    options = options || {};

    if (feedType === "profile") {
      return "profile:" + normalizeName(options.profileOwner || "");
    }

    return "home";
  }

  function ensurePaging(feedType, options) {
    var key = getPagingKey(feedType, options);

    if (!Heavenly.posts.feedPaging[key]) {
      Heavenly.posts.feedPaging[key] = {
        visibleCount: INITIAL_BATCH
      };
    }

    return Heavenly.posts.feedPaging[key];
  }

  function resetFeedPaging(feedType, options) {
    var key = getPagingKey(feedType, options);
    Heavenly.posts.feedPaging[key] = {
      visibleCount: INITIAL_BATCH
    };
  }

  function getVisibleCount(feedType, options) {
    return ensurePaging(feedType, options).visibleCount;
  }

  function growFeedVisibleCount(feedType, options) {
    var paging = ensurePaging(feedType, options);
    paging.visibleCount += LOAD_BATCH;
    return paging.visibleCount;
  }

  function getPostsSync() {
    return normalizePosts(cachedPosts);
  }

  function savePosts(posts) {
    cachedPosts = normalizePosts(posts);

    if (!isFiveM()) {
      saveRaw(cachedPosts);
    }
  }

  async function syncRemotePosts(feedType, options) {
    if (!Heavenly.api || typeof Heavenly.api.getPosts !== "function") {
      return [];
    }

    var result = await Heavenly.api.getPosts(feedType, options && options.profileOwner);
    var items = result && result.ok && result.data && Array.isArray(result.data.items)
      ? result.data.items
      : [];

    var normalized = normalizePosts(items);
    var otherPosts = cachedPosts.filter(function (post) {
      if (feedType === "profile") {
        return !(post.feedType === "profile" && normalizeName(post.profileOwner) === normalizeName(options && options.profileOwner));
      }

      return post.feedType !== "home";
    });

    cachedPosts = otherPosts.concat(normalized);
    return normalized;
  }

  async function getPosts() {
    if (isFiveM()) {
      return getPostsSync();
    }

    cachedPosts = normalizePosts(loadRaw());
    return getPostsSync();
  }

  async function createPost(data) {
    data = data || {};

    var currentUser = getCurrentUser();
    var author = getAuthorData(data.author || currentUser);
    var text = String(data.text || "").trim();
    var images = ensureArray(data.images);

    if (!text && !images.length) {
      return null;
    }

    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.createPost !== "function") {
        return null;
      }

      var result = await Heavenly.api.createPost({
        feedType: data.feedType === "profile" ? "profile" : "home",
        profileOwner: data.profileOwner || null,
        text: text,
        visibility: data.visibility || "public",
        images: images
      });

      if (!result || !result.ok) {
        if (typeof window.setFeedback === "function") {
          window.setFeedback(result && result.message ? result.message : "Beitrag konnte nicht erstellt werden", false);
        }
        return null;
      }

      return result.data || { id: null };
    }

    var posts = await getPosts();
    var newPost = {
      id: makeId("post"),
      feedType: data.feedType === "profile" ? "profile" : "home",
      profileOwner: data.profileOwner || null,
      authorUsername: author.username,
      authorDisplayName: author.displayName,
      authorAvatar: author.avatar,
      text: text,
      images: images,
      mentions: extractMentions(text),
      likes: [],
      comments: [],
      visibility: data.visibility || "public",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    posts.unshift(newPost);
    savePosts(posts);
    return clonePost(newPost);
  }

  async function editPost(postId, text) {
    var content = String(text || "").trim();
    if (!content) return null;

    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.editPost !== "function") {
        return null;
      }

      var result = await Heavenly.api.editPost(postId, content);
      return result && result.ok ? (result.data || { id: postId }) : null;
    }

    var posts = await getPosts();
    var changedPost = null;

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;
      post.text = content;
      post.mentions = extractMentions(content);
      post.updatedAt = Date.now();
      changedPost = post;
      return post;
    });

    savePosts(posts);
    return changedPost;
  }

  async function deletePost(postId) {
    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.deletePost !== "function") {
        return null;
      }

      var result = await Heavenly.api.deletePost(postId);
      return result && result.ok ? (result.data || { id: postId }) : null;
    }

    var posts = (await getPosts()).filter(function (post) {
      return post.id !== postId;
    });

    savePosts(posts);
    return { id: postId, deleted: true };
  }

  async function toggleLike(postId, username) {
    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.togglePostLike !== "function") {
        return null;
      }

      var result = await Heavenly.api.togglePostLike(postId);
      return result && result.ok ? (result.data || { id: postId }) : null;
    }

    var activeUser = username || getCurrentUser();
    var userKey = normalizeName(
      typeof activeUser === "string"
        ? activeUser
        : (activeUser && (activeUser.username || activeUser.name))
    );

    if (!userKey) return null;

    var posts = await getPosts();
    var changedPost = null;

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;

      var likes = ensureArray(post.likes).slice();
      var index = likes.indexOf(userKey);

      if (index >= 0) {
        likes.splice(index, 1);
      } else {
        likes.push(userKey);
      }

      post.likes = likes;
      changedPost = post;
      return post;
    });

    savePosts(posts);
    return changedPost;
  }

  async function addComment(postId, text, images) {
    var currentUser = getCurrentUser();
    if (!currentUser) return null;

    var content = String(text || "").trim();
    var media = ensureArray(images);

    if (!content && !media.length) return null;

    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.addComment !== "function") {
        return null;
      }

      var result = await Heavenly.api.addComment(postId, {
        text: content,
        images: media
      });

      return result && result.ok ? (result.data || { postId: postId }) : null;
    }

    var author = getAuthorData(currentUser);
    var posts = await getPosts();
    var changedComment = null;

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;

      var comment = {
        id: makeId("comment"),
        authorUsername: author.username,
        authorDisplayName: author.displayName,
        authorAvatar: author.avatar,
        text: content,
        images: media,
        mentions: extractMentions(content),
        likes: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      post.comments = ensureArray(post.comments).concat([comment]);
      changedComment = comment;
      return post;
    });

    savePosts(posts);
    return changedComment;
  }

  async function editComment(postId, commentId, text) {
    var content = String(text || "").trim();
    if (!content) return null;

    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.editComment !== "function") {
        return null;
      }

      var result = await Heavenly.api.editComment(postId, commentId, content);
      return result && result.ok ? (result.data || { id: commentId }) : null;
    }

    var posts = await getPosts();
    var changedComment = null;

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;

      post.comments = ensureArray(post.comments).map(function (comment) {
        if (comment.id !== commentId) return comment;

        comment.text = content;
        comment.mentions = extractMentions(content);
        comment.updatedAt = Date.now();
        changedComment = comment;
        return comment;
      });

      return post;
    });

    savePosts(posts);
    return changedComment;
  }

  async function deleteComment(postId, commentId) {
    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.deleteComment !== "function") {
        return null;
      }

      var result = await Heavenly.api.deleteComment(postId, commentId);
      return result && result.ok ? (result.data || { id: commentId }) : null;
    }

    var posts = await getPosts();

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;
      post.comments = ensureArray(post.comments).filter(function (comment) {
        return comment.id !== commentId;
      });
      return post;
    });

    savePosts(posts);
    return { id: commentId, deleted: true };
  }

  async function toggleCommentLike(postId, commentId, username) {
    if (isFiveM()) {
      if (!Heavenly.api || typeof Heavenly.api.toggleCommentLike !== "function") {
        return null;
      }

      var result = await Heavenly.api.toggleCommentLike(postId, commentId);
      return result && result.ok ? (result.data || { id: commentId }) : null;
    }

    var activeUser = username || getCurrentUser();
    var userKey = normalizeName(
      typeof activeUser === "string"
        ? activeUser
        : (activeUser && (activeUser.username || activeUser.name))
    );

    if (!userKey) return null;

    var posts = await getPosts();
    var changedComment = null;

    posts = posts.map(function (post) {
      if (post.id !== postId) return post;

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
        changedComment = comment;
        return comment;
      });

      return post;
    });

    savePosts(posts);
    return changedComment;
  }

  async function getFeedPosts(feedType, options) {
    options = options || {};

    if (isFiveM()) {
      return syncRemotePosts(feedType, options);
    }

    var posts = await getPosts();
    return posts.filter(function (post) {
      if (post.feedType !== feedType) return false;

      if (feedType === "profile") {
        return normalizeName(post.profileOwner) === normalizeName(options.profileOwner);
      }

      return true;
    });
  }

  function getVisibleFeedPosts(feedType, options) {
    var allPosts = cachedPosts.filter(function (post) {
      if (post.feedType !== feedType) return false;

      if (feedType === "profile") {
        return normalizeName(post.profileOwner) === normalizeName(options && options.profileOwner);
      }

      return true;
    });

    var visibleCount = getVisibleCount(feedType, options);
    return allPosts.slice(0, visibleCount);
  }

  function hasMoreFeedPosts(feedType, options) {
    var allPosts = cachedPosts.filter(function (post) {
      if (post.feedType !== feedType) return false;

      if (feedType === "profile") {
        return normalizeName(post.profileOwner) === normalizeName(options && options.profileOwner);
      }

      return true;
    });

    return getVisibleCount(feedType, options) < allPosts.length;
  }

  function loadMoreFeedPosts(feedType, options) {
    if (!hasMoreFeedPosts(feedType, options)) {
      return false;
    }

    growFeedVisibleCount(feedType, options);
    return true;
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
    getVisibleFeedPosts: getVisibleFeedPosts,
    hasMoreFeedPosts: hasMoreFeedPosts,
    loadMoreFeedPosts: loadMoreFeedPosts,
    resetFeedPaging: resetFeedPaging,
    extractMentions: extractMentions
  };

  if (!isFiveM()) {
    cachedPosts = normalizePosts(loadRaw());
  }
})();
