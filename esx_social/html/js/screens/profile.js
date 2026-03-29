window.Heavenly = window.Heavenly || {};
Heavenly.screens = Heavenly.screens || {};
Heavenly.cache = Heavenly.cache || {};
Heavenly.cache.avatars = Heavenly.cache.avatars || {};
Heavenly.cache.profiles = Heavenly.cache.profiles || {};
Heavenly.cache.themes = Heavenly.cache.themes || {};
Heavenly.cache.friends = Heavenly.cache.friends || {};

(function () {
  var THEME_KEY_PREFIX = "heavenly_theme_";
  var profileClockMirrorTimer = null;

  function getEl(id) {
    return document.getElementById(id);
  }

  function getCurrentUser() {
    return Heavenly && Heavenly.state ? Heavenly.state.currentUser : null;
  }

  function getViewedUser() {
    if (Heavenly && Heavenly.state && Heavenly.state.viewedProfileUser) {
      return Heavenly.state.viewedProfileUser;
    }

    return getCurrentUser();
  }

  function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function isOwnProfile() {
    return normalizeName(getViewedUser()) === normalizeName(getCurrentUser());
  }

  function getInitials(name) {
    if (Heavenly && Heavenly.util && Heavenly.util.initials) {
      return Heavenly.util.initials(name);
    }

    return String(name || "?").charAt(0).toUpperCase();
  }

  function getBlockedUsers(user) {
    if (!user || !Heavenly.storage) return [];

    var settings = Heavenly.storage.getSettings(user) || {};
    return Array.isArray(settings.blockedUsers) ? settings.blockedUsers : [];
  }

  function setBlockedUsers(user, list) {
    if (!user || !Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(user) || {};
    settings.blockedUsers = Array.isArray(list) ? list : [];
    Heavenly.storage.setSettings(user, settings);
  }

  function syncProfileClockMirror() {
    var homeTime = getEl("clockTime");
    var homeDate = getEl("clockDate");
    var profileTime = getEl("clockTimeProfile");
    var profileDate = getEl("clockDateProfile");

    if (homeTime && profileTime) {
      profileTime.innerText = homeTime.innerText || "--:--:--";
    }

    if (homeDate && profileDate) {
      profileDate.innerText = homeDate.innerText || "--.--.----";
    }
  }

  function startProfileClockMirror() {
    syncProfileClockMirror();

    if (profileClockMirrorTimer) {
      clearInterval(profileClockMirrorTimer);
    }

    profileClockMirrorTimer = setInterval(syncProfileClockMirror, 500);
  }

  function stopProfileClockMirror() {
    if (profileClockMirrorTimer) {
      clearInterval(profileClockMirrorTimer);
      profileClockMirrorTimer = null;
    }
  }

  function getPlaceholderDataUrl(type) {
    var text = type === "cover" ? "Kopfzeile" : "Profilbild";

    var svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c3aed" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000000" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="white" font-size="64" font-family="Arial" opacity="0.85">${text}</text>
</svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function hexToRgba(hex, alpha) {
    if (!hex) {
      return "rgba(255,255,255," + alpha + ")";
    }

    var clean = String(hex).replace("#", "");

    if (clean.length === 3) {
      clean = clean.split("").map(function (char) {
        return char + char;
      }).join("");
    }

    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);

    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function readFileAsDataUrl(file, onDone, options) {
    if (!file) return;

    options = options || {};

    var maxWidth = options.maxWidth || 1280;
    var maxHeight = options.maxHeight || 1280;
    var outputType = options.outputType || "image/jpeg";
    var qualitySteps = options.qualitySteps || [0.82, 0.72, 0.62, 0.52];
    var maxDataUrlLength = options.maxDataUrlLength || 900000;

    function finish(result) {
      if (typeof onDone === "function") {
        onDone(result);
      }
    }

    function fallbackRead() {
      var fallbackReader = new FileReader();

      fallbackReader.onload = function (event) {
        finish(event.target.result);
      };

      fallbackReader.onerror = function () {
        if (typeof window.setFeedback === "function") {
          window.setFeedback("Bild konnte nicht gelesen werden", false);
        }
      };

      fallbackReader.readAsDataURL(file);
    }

    if (!file.type || file.type.indexOf("image/") !== 0) {
      fallbackRead();
      return;
    }

    var reader = new FileReader();

    reader.onload = function (event) {
      var img = new Image();

      img.onload = function () {
        try {
          var width = img.naturalWidth || img.width;
          var height = img.naturalHeight || img.height;

          if (!width || !height) {
            finish(event.target.result);
            return;
          }

          var scale = Math.min(maxWidth / width, maxHeight / height, 1);
          var targetWidth = Math.max(1, Math.round(width * scale));
          var targetHeight = Math.max(1, Math.round(height * scale));

          var canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          var context = canvas.getContext("2d");
          if (!context) {
            finish(event.target.result);
            return;
          }

          context.drawImage(img, 0, 0, targetWidth, targetHeight);

          var result = "";

          for (var i = 0; i < qualitySteps.length; i++) {
            result = canvas.toDataURL(outputType, qualitySteps[i]);

            if (result.length <= maxDataUrlLength) {
              finish(result);
              return;
            }
          }

          result = canvas.toDataURL(outputType, qualitySteps[qualitySteps.length - 1] || 0.5);
          finish(result);
        } catch (error) {
          console.warn("image optimize failed", error);
          finish(event.target.result);
        }
      };

      img.onerror = function () {
        finish(event.target.result);
      };

      img.src = event.target.result;
    };

    reader.onerror = function () {
      if (typeof window.setFeedback === "function") {
        window.setFeedback("Bild konnte nicht gelesen werden", false);
      }
    };

    reader.readAsDataURL(file);
  }

  function getThemeCacheKey(user) {
    return THEME_KEY_PREFIX + String(user || "");
  }

  function getAvatarCacheKey(user) {
    return normalizeName(user);
  }

  function getProfileCacheKey(user) {
    return normalizeName(user);
  }

  function getFriendsCacheKey(user) {
    return normalizeName(user);
  }

  function getThemeMemoryCacheKey(user) {
    return String(user || "");
  }

  function loadThemeFallback(user) {
    try {
      var raw = localStorage.getItem(getThemeCacheKey(user));
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveThemeFallback(user, theme) {
    try {
      localStorage.setItem(getThemeCacheKey(user), JSON.stringify(theme || {}));
    } catch (error) {
      try {
        var reducedTheme = Object.assign({}, theme || {});
        reducedTheme.profileBg = "";
        localStorage.setItem(getThemeCacheKey(user), JSON.stringify(reducedTheme));
      } catch (nestedError) {}
    }
  }

  function normalizeThemeImageUrl(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";

    if (/^data:image\//i.test(raw)) {
      return raw;
    }

    if (/^blob:/i.test(raw)) {
      return raw;
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    if (/^\/\//.test(raw)) {
      return "https:" + raw;
    }

    if (/^(?:nui|https?):\/\//i.test(raw)) {
      return raw;
    }

    if (/^(?:html\/)?assets\//i.test(raw) || raw.charAt(0) === "/") {
      return raw;
    }

    return "";
  }

  function triggerFileDialog(input) {
    if (!input) return false;

    var hadHiddenAttr = input.hasAttribute("hidden");
    var previousDisplay = input.style.display;
    var previousPosition = input.style.position;
    var previousLeft = input.style.left;
    var previousTop = input.style.top;
    var previousOpacity = input.style.opacity;
    var previousPointerEvents = input.style.pointerEvents;

    try {
      if (hadHiddenAttr) {
        input.removeAttribute("hidden");
      }

      input.style.display = "block";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.style.top = "0";
      input.style.opacity = "0";
      input.style.pointerEvents = "none";
      input.click();
      return true;
    } catch (error) {
      console.warn("file dialog open failed", error);
      return false;
    } finally {
      if (hadHiddenAttr) {
        input.setAttribute("hidden", "");
      }

      input.style.display = previousDisplay;
      input.style.position = previousPosition;
      input.style.left = previousLeft;
      input.style.top = previousTop;
      input.style.opacity = previousOpacity;
      input.style.pointerEvents = previousPointerEvents;
    }
  }

  function updateProfileBackgroundField(value) {
    var hpProfileBg = getEl("hpProfileBg");
    var hpProfileBgName = getEl("hpProfileBgName");
    var normalizedValue = normalizeThemeImageUrl(value);

    if (hpProfileBg) {
      hpProfileBg.value = normalizedValue;
    }

    if (hpProfileBgName) {
      hpProfileBgName.value = normalizedValue ? "Bild ausgewählt" : "Kein Bild ausgewählt";
    }
  }

  function updateProfileEditorBackgroundField(value) {
    var peProfileBg = getEl("peProfileBg");
    var peProfileBgName = getEl("peProfileBgName");
    var normalizedValue = normalizeThemeImageUrl(value);

    if (peProfileBg) {
      peProfileBg.value = normalizedValue;
    }

    if (peProfileBgName) {
      peProfileBgName.value = normalizedValue ? "Bild ausgewählt" : "Kein Bild ausgewählt";
    }
  }

  function initHomeProfilePopupBindings() {
    var fileInput = getEl("hpProfileBgFile");
    if (!fileInput || fileInput.dataset.bound === "1") return;

    fileInput.dataset.bound = "1";

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      readFileAsDataUrl(file, function (dataUrl) {
        updateProfileBackgroundField(dataUrl);

        if (typeof window.setFeedback === "function") {
          window.setFeedback("Profil-Hintergrundbild ausgewählt", true);
        }
      }, {
        maxWidth: 1280,
        maxHeight: 720,
        outputType: "image/jpeg",
        qualitySteps: [0.78, 0.68, 0.58, 0.48],
        maxDataUrlLength: 700000
      });

      fileInput.value = "";
    });
  }

  function initProfileEditorPopupBindings() {
    var fileInput = getEl("peProfileBgFile");
    if (!fileInput || fileInput.dataset.bound === "1") return;

    fileInput.dataset.bound = "1";

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      readFileAsDataUrl(file, function (dataUrl) {
        updateProfileEditorBackgroundField(dataUrl);

        if (typeof window.setFeedback === "function") {
          window.setFeedback("Profil-Hintergrundbild ausgewählt", true);
        }
      }, {
        maxWidth: 1280,
        maxHeight: 720,
        outputType: "image/jpeg",
        qualitySteps: [0.78, 0.68, 0.58, 0.48],
        maxDataUrlLength: 700000
      });

      fileInput.value = "";
    });
  }

  async function getProfileData(user) {
    var key = getProfileCacheKey(user);
    if (!key) return null;

    if (Heavenly.cache.profiles[key] !== undefined) {
      return Heavenly.cache.profiles[key];
    }

    if (!user || !Heavenly.api || !Heavenly.api.getProfile) {
      Heavenly.cache.profiles[key] = null;
      return null;
    }

    try {
      var result = await Heavenly.api.getProfile(user);
      Heavenly.cache.profiles[key] = result && result.ok && result.data ? result.data : null;
      return Heavenly.cache.profiles[key];
    } catch (error) {
      Heavenly.cache.profiles[key] = null;
      return null;
    }
  }

  async function getUserSettings(user) {
    var localSettings = Heavenly.storage && Heavenly.storage.getSettings
      ? (Heavenly.storage.getSettings(user) || {})
      : {};

    var profile = await getProfileData(user);
    var apiSettings = profile && profile.settings ? profile.settings : {};

    return Object.assign({}, apiSettings, localSettings);
  }

  async function getThemeSettings(user) {
    var key = getThemeMemoryCacheKey(user);
    var fallbackTheme = loadThemeFallback(user);

    if (Heavenly.cache.themes[key] !== undefined) {
      return Object.assign({}, fallbackTheme, Heavenly.cache.themes[key] || {});
    }

    if (!user || !Heavenly.api || !Heavenly.api.getTheme) {
      Heavenly.cache.themes[key] = fallbackTheme;
      return fallbackTheme;
    }

    try {
      var result = await Heavenly.api.getTheme(user);
      if (result && result.ok && result.data) {
        saveThemeFallback(user, result.data || {});
        Heavenly.cache.themes[key] = result.data || {};
        return Object.assign({}, fallbackTheme, result.data || {});
      }
    } catch (error) {
      console.warn("getTheme fallback used", error);
    }

    Heavenly.cache.themes[key] = fallbackTheme;
    return fallbackTheme;
  }

  async function setThemeSettings(user, theme) {
    if (!user) return;

    saveThemeFallback(user, theme || {});
    Heavenly.cache.themes[getThemeMemoryCacheKey(user)] = theme || {};

    if (!Heavenly.api || !Heavenly.api.saveTheme) return;

    try {
      await Heavenly.api.saveTheme(user, theme || {});
    } catch (error) {
      console.warn("saveTheme fallback used", error);
    }
  }

  async function getAvatarData(user) {
    var key = getAvatarCacheKey(user);
    if (!key) return null;

    if (Heavenly.cache.avatars[key] !== undefined) {
      return Heavenly.cache.avatars[key] || null;
    }

    if (!user || !Heavenly.api || !Heavenly.api.getAvatar) {
      Heavenly.cache.avatars[key] = "";
      return null;
    }

    try {
      var result = await Heavenly.api.getAvatar(user);
      Heavenly.cache.avatars[key] = result && result.ok ? (result.data || "") : "";
      return Heavenly.cache.avatars[key] || null;
    } catch (error) {
      Heavenly.cache.avatars[key] = "";
      return null;
    }
  }

  async function getCoverData(user) {
    var profile = await getProfileData(user);
    if (profile && profile.coverData) {
      return profile.coverData;
    }

    if (!user || !Heavenly.api || !Heavenly.api.getCover) {
      return null;
    }

    try {
      var result = await Heavenly.api.getCover(user);
      return result && result.ok ? (result.data || null) : null;
    } catch (error) {
      return null;
    }
  }

  async function saveAvatarData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setAvatar) return;
    Heavenly.cache.avatars[getAvatarCacheKey(user)] = dataUrl || "";
    await Heavenly.api.setAvatar(user, dataUrl);
  }

  async function saveCoverData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setCover) return;
    await Heavenly.api.setCover(user, dataUrl);
  }

  async function saveStatusText(user, text) {
    if (!user || !Heavenly.api || !Heavenly.api.saveStatus) return;
    var key = getProfileCacheKey(user);
    if (Heavenly.cache.profiles[key] && Heavenly.cache.profiles[key].settings) {
      Heavenly.cache.profiles[key].settings.status = text || "";
    }
    await Heavenly.api.saveStatus(user, text || "");
  }

  function getRelationshipData(settings) {
    var relationship = settings && settings.relationship ? settings.relationship : {};
    return {
      status: relationship.status || "",
      partner: relationship.partner || ""
    };
  }

  function formatRelationshipStatus(value) {
    if (value === "single") return "Single";
    if (value === "in_relationship") return "In einer Beziehung";
    if (value === "married") return "Verheiratet";
    if (value === "complicated") return "Es ist kompliziert";
    return "Keine Angabe";
  }

  function getInfoBoxData(settings) {
    return {
      birthday: settings && settings.birthday ? settings.birthday : "",
      job: settings && settings.job ? settings.job : "",
      about: settings && settings.about ? settings.about : ""
    };
  }

  function applyProfilePopupLabels() {
    var popup = getEl("homeProfilePopup");
    if (popup) {
      var title = popup.querySelector("h2");
      if (title) {
        title.innerText = "Profile";
      }
    }

    var menu = getEl("profileMenu");
    if (menu) {
      var firstButton = menu.querySelector("button");
      if (firstButton) {
        firstButton.innerText = "Profile";
      }
    }

    var hpHomeBg = getEl("hpHomeBg");
    if (hpHomeBg) {
      hpHomeBg.style.display = "none";
    }

    var hpProfileBg = getEl("hpProfileBg");
    if (hpProfileBg && hpProfileBg.parentElement) {
      var labelText = hpProfileBg.parentElement.querySelector("span");
      if (labelText) {
        labelText.innerText = "Profil Hintergrundbild";
      }
    }
  }

  async function getFriendListOf(user) {
    var key = getFriendsCacheKey(user);
    if (!key) return [];

    if (Heavenly.cache.friends[key] !== undefined) {
      return Heavenly.cache.friends[key];
    }

    if (!user || !Heavenly.api || !Heavenly.api.getFriends) {
      Heavenly.cache.friends[key] = [];
      return [];
    }

    try {
      var result = await Heavenly.api.getFriends(user);
      if (result && result.ok && Array.isArray(result.data)) {
        Heavenly.cache.friends[key] = result.data;
        return result.data;
      }
    } catch (error) {
      console.warn("Friend visibility check failed", error);
    }

    Heavenly.cache.friends[key] = [];
    return [];
  }

  async function canCurrentUserViewProfilePosts(profileOwner) {
    var currentUser = getCurrentUser();
    if (!profileOwner) return false;
    if (!currentUser) return false;
    if (normalizeName(currentUser) === normalizeName(profileOwner)) return true;

    var settings = await getUserSettings(profileOwner);
    var visibility = settings && settings.profileVisibility
      ? settings.profileVisibility
      : "public";

    if (visibility !== "friends") {
      return true;
    }

    var friends = await getFriendListOf(profileOwner);

    return friends.some(function (name) {
      return normalizeName(name) === normalizeName(currentUser);
    });
  }

  async function preloadAvatars(usernames) {
    var unique = {};
    var tasks = [];

    (usernames || []).forEach(function (name) {
      var key = getAvatarCacheKey(name);
      if (!key || unique[key]) return;
      unique[key] = true;

      if (Heavenly.cache.avatars[key] === undefined) {
        tasks.push(getAvatarData(name));
      }
    });

    if (tasks.length) {
      await Promise.all(tasks);
    }
  }

  async function enrichPostsWithAvatars(posts) {
    posts = Array.isArray(posts) ? posts : [];

    var usernames = [];
    posts.forEach(function (post) {
      if (post && post.authorUsername) {
        usernames.push(post.authorUsername);
      }

      (Array.isArray(post.comments) ? post.comments : []).forEach(function (comment) {
        if (comment && comment.authorUsername) {
          usernames.push(comment.authorUsername);
        }
      });
    });

    await preloadAvatars(usernames);

    return posts.map(function (post) {
      var nextPost = Object.assign({}, post);

      if (!nextPost.authorAvatar) {
        nextPost.authorAvatar = Heavenly.cache.avatars[getAvatarCacheKey(nextPost.authorUsername)] || "";
      }

      nextPost.comments = (Array.isArray(post.comments) ? post.comments : []).map(function (comment) {
        var nextComment = Object.assign({}, comment);

        if (!nextComment.authorAvatar) {
          nextComment.authorAvatar = Heavenly.cache.avatars[getAvatarCacheKey(nextComment.authorUsername)] || "";
        }

        return nextComment;
      });

      return nextPost;
    });
  }

  async function renderProfileFeed(options) {
    if (!Heavenly.posts || !Heavenly.posts.store || !Heavenly.posts.render) return;

    var viewedUser = getViewedUser();
    if (!viewedUser) return;

    var profileOwner = (options && options.profileOwner) || viewedUser;
    var canView = await canCurrentUserViewProfilePosts(profileOwner);

    var container = getEl("profileFeedPosts");
    var creator = getEl("profilePostCreator");
    var heading = getEl("profileFeedHeading");

    if (!canView) {
      if (heading) {
        heading.style.display = "none";
        heading.innerText = "";
      }

      if (container) {
        container.innerHTML = '<div class="profilePrivateImageWrap"><img class="profilePrivateImage" src="assets/logos/heavenlyprivat.png" alt="Privates Profil" /></div>';
      }

      if (creator) {
        creator.style.display = isOwnProfile() ? "flex" : "none";
      }

      return;
    }

    var posts = await Heavenly.posts.store.getFeedPosts("profile", {
      profileOwner: profileOwner
    });

    posts = await enrichPostsWithAvatars(posts);

    Heavenly.posts.render.renderFeed("profileFeedPosts", posts, {
      feedType: "profile",
      profileOwner: profileOwner
    });
  }

  Heavenly.screens.renderProfileFeed = renderProfileFeed;
  window.renderProfileFeed = renderProfileFeed;

  window.submitProfilePost = function () {
    var viewedUser = getViewedUser();
    if (!viewedUser || !Heavenly.posts || !Heavenly.posts.create) return;

    Heavenly.posts.create.submitPost({
      inputId: "profilePostInput",
      feedType: "profile",
      profileOwner: viewedUser
    });
  };

  async function applyRelationshipInfo() {
    var user = getViewedUser();
    if (!user) return;
    var canView = await canCurrentUserViewProfilePosts(user);

    var settings = await getUserSettings(user);
    var relationship = getRelationshipData(settings);

    var statusRow = getEl("relationshipStatusText")
      ? getEl("relationshipStatusText").closest(".profileInfoItem")
      : null;
    var statusText = getEl("relationshipStatusText");
    var partnerRow = getEl("relationshipPartnerRow");
    var partnerBtn = getEl("relationshipPartnerBtn");

    if (!canView) {
      if (statusRow) {
        statusRow.style.display = "none";
      }

      if (statusText) {
        statusText.innerText = "";
      }

      if (partnerRow) {
        partnerRow.style.display = "none";
      }

      if (partnerBtn) {
        partnerBtn.innerText = "";
      }

      return;
    }

    if (statusText) {
      if (statusRow) {
        statusRow.style.display = "flex";
      }

      statusText.innerText = formatRelationshipStatus(relationship.status);
    }

    if (partnerRow && partnerBtn) {
      if (relationship.partner && relationship.partner.trim()) {
        partnerRow.style.display = "flex";
        partnerBtn.innerText = relationship.partner.trim();
      } else {
        partnerRow.style.display = "none";
        partnerBtn.innerText = "Profil öffnen";
      }
    }
  }

  async function applyInfoBoxDetails() {
    var user = getViewedUser();
    if (!user) return;
    var canView = await canCurrentUserViewProfilePosts(user);

    var settings = await getUserSettings(user);
    var info = getInfoBoxData(settings);

    var birthdayRow = getEl("birthdayRow");
    var birthdayText = getEl("birthdayText");
    var jobRow = getEl("jobRow");
    var jobText = getEl("jobText");
    var aboutRow = getEl("aboutRow");
    var aboutText = getEl("aboutText");

    if (!canView) {
      if (birthdayRow) birthdayRow.style.display = "none";
      if (birthdayText) birthdayText.innerText = "";
      if (jobRow) jobRow.style.display = "none";
      if (jobText) jobText.innerText = "";
      if (aboutRow) aboutRow.style.display = "none";
      if (aboutText) aboutText.innerText = "";
      return;
    }

    if (birthdayRow && birthdayText) {
      if (info.birthday && info.birthday.trim()) {
        birthdayRow.style.display = "flex";
        birthdayText.innerText = info.birthday.trim();
      } else {
        birthdayRow.style.display = "none";
        birthdayText.innerText = "";
      }
    }

    if (jobRow && jobText) {
      if (info.job && info.job.trim()) {
        jobRow.style.display = "flex";
        jobText.innerText = info.job.trim();
      } else {
        jobRow.style.display = "none";
        jobText.innerText = "";
      }
    }

    if (aboutRow && aboutText) {
      if (info.about && info.about.trim()) {
        aboutRow.style.display = "flex";
        aboutText.innerText = info.about.trim();
      } else {
        aboutRow.style.display = "none";
        aboutText.innerText = "";
      }
    }
  }

  async function applyProfileFeedHeading() {
    var user = getViewedUser();
    var heading = getEl("profileFeedHeading");
    if (!user || !heading) return;

    var canView = await canCurrentUserViewProfilePosts(user);
    if (!canView) {
      heading.style.display = "none";
      heading.innerText = "";
      return;
    }

    var settings = await getUserSettings(user);
    var customTitle = settings && settings.profileFeedTitle
      ? String(settings.profileFeedTitle).trim()
      : "";

    if (customTitle) {
      heading.style.display = "block";
      heading.innerText = customTitle;
    } else {
      heading.style.display = "none";
      heading.innerText = "";
    }
  }

  async function openInfoBoxPopup() {
    var user = getCurrentUser();
    if (!user || !Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(user) || {};
    var relationship = getRelationshipData(settings);
    var info = getInfoBoxData(settings);

    var popup = getEl("infoBoxPopup");
    var relationshipStatus = getEl("infoRelationshipStatus");
    var relationshipPartner = getEl("infoRelationshipPartner");
    var birthday = getEl("infoBirthday");
    var job = getEl("infoJob");
    var about = getEl("infoAbout");
    var profileFeedTitle = getEl("infoProfileFeedTitle");
    var profileVisibility = getEl("infoProfileVisibility");

    if (relationshipStatus) relationshipStatus.value = relationship.status || "";
    if (relationshipPartner) relationshipPartner.value = relationship.partner || "";
    if (birthday) birthday.value = info.birthday || "";
    if (job) job.value = info.job || "";
    if (about) about.value = info.about || "";
    if (profileFeedTitle) profileFeedTitle.value = settings.profileFeedTitle || "";
    if (profileVisibility) profileVisibility.value = settings.profileVisibility || "public";

    if (popup) {
      popup.classList.add("active");
    }
  }

  function closeInfoBoxPopup() {
    var popup = getEl("infoBoxPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  async function saveInfoBoxSettings() {
    var user = getCurrentUser();
    if (!user || !Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(user) || {};

    settings.relationship = {
      status: getEl("infoRelationshipStatus") ? getEl("infoRelationshipStatus").value : "",
      partner: getEl("infoRelationshipPartner") ? getEl("infoRelationshipPartner").value.trim() : ""
    };

    settings.birthday = getEl("infoBirthday") ? getEl("infoBirthday").value.trim() : "";
    settings.job = getEl("infoJob") ? getEl("infoJob").value.trim() : "";
    settings.about = getEl("infoAbout") ? getEl("infoAbout").value.trim() : "";
    settings.profileFeedTitle = getEl("infoProfileFeedTitle")
      ? getEl("infoProfileFeedTitle").value.trim()
      : "";
    settings.profileVisibility = getEl("infoProfileVisibility")
      ? getEl("infoProfileVisibility").value
      : "public";

    Heavenly.storage.setSettings(user, settings);

    var profileKey = getProfileCacheKey(user);
    if (Heavenly.cache.profiles[profileKey] && Heavenly.cache.profiles[profileKey].settings) {
      Heavenly.cache.profiles[profileKey].settings = Object.assign(
        {},
        Heavenly.cache.profiles[profileKey].settings,
        settings
      );
    }

    await applyProfileImages();
    closeInfoBoxPopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Infobox gespeichert", true);
    }
  }

  async function applyHomeProfileTheme() {
    var currentUser = getCurrentUser();
    if (!currentUser) return;

    var viewedUser = getViewedUser();
    var viewedTheme = viewedUser ? await getThemeSettings(viewedUser) : {};

    var profileBoxColor = viewedTheme.boxColor || "#8b5cf6";
    var profilePanelColor = viewedTheme.panelColor || "#4b0010";
    var profileTextColor = viewedTheme.textColor || "#ffffff";
    var profileBg = normalizeThemeImageUrl(viewedTheme.profileBg || "");

    var profileBorderColor = hexToRgba(profileBoxColor, 0.75);
    var profileBoxBg = hexToRgba(profilePanelColor, 0.72);

    document.body.style.backgroundColor = "black";

    var homeScreen = getEl("homeScreen");
    if (homeScreen) {
      homeScreen.style.backgroundColor = "";
      homeScreen.style.color = "";
      homeScreen.style.backgroundImage = "";
      homeScreen.style.backgroundSize = "";
      homeScreen.style.backgroundPosition = "";
      homeScreen.style.backgroundRepeat = "";
    }

    var profileScreen = getEl("profileScreen");
    if (profileScreen) {
      profileScreen.style.backgroundColor = "transparent";
      profileScreen.style.backgroundImage = profileBg ? 'url("' + profileBg + '")' : "";
      profileScreen.style.backgroundSize = profileBg ? "cover" : "";
      profileScreen.style.backgroundPosition = profileBg ? "center" : "";
      profileScreen.style.backgroundRepeat = profileBg ? "no-repeat" : "";
      profileScreen.style.color = profileTextColor;
    }

    var profileContent = document.querySelector(".profileContent");
    if (profileContent) {
      profileContent.style.backgroundImage = "";
      profileContent.style.backgroundSize = "";
      profileContent.style.backgroundPosition = "";
      profileContent.style.backgroundRepeat = "";
      profileContent.style.borderRadius = "";
      profileContent.style.padding = "";
    }

    document.querySelectorAll(".profileInfoBox, .profileMainBox, .profileStatus, .coverBox").forEach(function (element) {
      element.style.borderColor = profileBorderColor;
      element.style.color = profileTextColor;
    });

    document.querySelectorAll(".profileInfoBox, .profileMainBox, .profileStatus").forEach(function (element) {
      element.style.background = profileBoxBg;
    });

    document.querySelectorAll(".profileInfoBtn, .profileInlineBtn, .profileLinkBtn, .profileInfoItem").forEach(function (element) {
      element.style.borderColor = profileBorderColor;
      element.style.color = profileTextColor;
    });

    document.querySelectorAll(
      "#profileScreen, #profileScreen h1, #profileScreen h2, #profileScreen h3, #profileScreen h4, #profileScreen p, #profileScreen .profileNameBig, #profileScreen .profileSubSmall, #profileScreen .profileStatus"
    ).forEach(function (element) {
      element.style.color = profileTextColor;
    });

    document.querySelectorAll("#profileScreen input, #profileScreen select, #profileScreen textarea").forEach(function (element) {
      element.style.color = profileTextColor;
      element.style.borderColor = profileBorderColor;
      element.style.background = profileBoxBg;
    });
  }

  async function applyProfileIdentity() {
    var user = getViewedUser();
    if (!user) return;

    var settings = await getUserSettings(user);

    var nameBig = getEl("profileNameBig");
    if (nameBig) {
      nameBig.innerText = user;
    }

    var statusEl = getEl("profileStatus");
    if (statusEl) {
      statusEl.innerText = settings.status || "✨ Willkommen in meinem Heavenly Profil";
    }

    var picText = getEl("profilePicText");
    if (picText) {
      picText.innerText = getInitials(user);
    }
  }

  async function applyAvatarImage() {
    var user = getViewedUser();
    if (!user) return;

    var avatarData = await getAvatarData(user);
    var profilePic = getEl("profilePic");
    var picText = getEl("profilePicText");

    if (!profilePic) return;

    if (avatarData) {
      profilePic.style.backgroundImage = 'url("' + avatarData + '")';
      profilePic.style.backgroundSize = "cover";
      profilePic.style.backgroundPosition = "center";
      profilePic.style.backgroundRepeat = "no-repeat";

      if (picText) {
        picText.style.display = "none";
      }
    } else {
      profilePic.style.backgroundImage = "";
      profilePic.style.backgroundSize = "";
      profilePic.style.backgroundPosition = "";
      profilePic.style.backgroundRepeat = "";

      if (picText) {
        picText.style.display = "block";
      }
    }
  }

  async function applyCoverImage() {
    var user = getViewedUser();
    if (!user) return;

    var coverBox = getEl("coverBox");
    if (!coverBox) return;

    var coverData = await getCoverData(user);
    var src = coverData || getPlaceholderDataUrl("cover");

    coverBox.style.backgroundImage = 'url("' + src + '")';
    coverBox.style.backgroundSize = "cover";
    coverBox.style.backgroundPosition = "center";
    coverBox.style.backgroundRepeat = "no-repeat";
  }

  async function applyProfileImages() {
    applyProfilePopupLabels();

    await Promise.all([
      applyProfileIdentity(),
      applyAvatarImage(),
      applyCoverImage(),
      applyRelationshipInfo(),
      applyInfoBoxDetails(),
      applyHomeProfileTheme(),
      applyProfileFeedHeading()
    ]);

    syncProfileClockMirror();
    await renderProfileFeed();

    if (Heavenly.posts && Heavenly.posts.create && Heavenly.posts.create.initAllComposers) {
      Heavenly.posts.create.initAllComposers();
    }
  }

  function initProfileUploads() {
    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");
    var profileBgInput = getEl("profileBgUploadInput");

    if (avatarInput && !avatarInput.dataset.bound) {
      avatarInput.dataset.bound = "1";

      avatarInput.addEventListener("change", function () {
        var user = getCurrentUser();
        var file = avatarInput.files && avatarInput.files[0];

        if (!user || !file) return;

        readFileAsDataUrl(file, async function (dataUrl) {
          await saveAvatarData(user, dataUrl);
          await applyProfileImages();

          if (typeof window.setFeedback === "function") {
            window.setFeedback("Profilbild aktualisiert", true);
          }
        }, {
          maxWidth: 320,
          maxHeight: 320,
          outputType: "image/jpeg",
          qualitySteps: [0.8, 0.7, 0.6, 0.5],
          maxDataUrlLength: 180000
        });

        avatarInput.value = "";
      });
    }

    if (coverInput && !coverInput.dataset.bound) {
      coverInput.dataset.bound = "1";

      coverInput.addEventListener("change", function () {
        var user = getCurrentUser();
        var file = coverInput.files && coverInput.files[0];

        if (!user || !file) return;

        readFileAsDataUrl(file, async function (dataUrl) {
          await saveCoverData(user, dataUrl);
          await applyProfileImages();

          if (typeof window.setFeedback === "function") {
            window.setFeedback("Titelbild aktualisiert", true);
          }
        }, {
          maxWidth: 1280,
          maxHeight: 720,
          outputType: "image/jpeg",
          qualitySteps: [0.8, 0.7, 0.6, 0.5],
          maxDataUrlLength: 650000
        });

        coverInput.value = "";
      });
    }

    if (profileBgInput && !profileBgInput.dataset.bound) {
      profileBgInput.dataset.bound = "1";

      profileBgInput.addEventListener("change", function () {
        var user = getCurrentUser();
        var file = profileBgInput.files && profileBgInput.files[0];

        if (!user || !file) return;

        readFileAsDataUrl(file, async function (dataUrl) {
          var theme = await getThemeSettings(user);

          await setThemeSettings(user, Object.assign({}, theme || {}, {
            profileBg: dataUrl
          }));
          await applyProfileImages();

          if (typeof window.setFeedback === "function") {
            window.setFeedback("Profil-Hintergrund aktualisiert", true);
          }
        }, {
          maxWidth: 1280,
          maxHeight: 720,
          outputType: "image/jpeg",
          qualitySteps: [0.78, 0.68, 0.58, 0.48],
          maxDataUrlLength: 700000
        });

        profileBgInput.value = "";
      });
    }
  }

  async function removeFriendConnection(userA, userB) {
    if (!userA || !userB || !Heavenly.api) return;

    var friendsA = [];
    var friendsB = [];

    if (Heavenly.api.getFriends) {
      var resultA = await Heavenly.api.getFriends(userA);
      if (resultA && resultA.ok && Array.isArray(resultA.data)) {
        friendsA = resultA.data;
      }

      var resultB = await Heavenly.api.getFriends(userB);
      if (resultB && resultB.ok && Array.isArray(resultB.data)) {
        friendsB = resultB.data;
      }
    }

    friendsA = friendsA.filter(function (entry) {
      return normalizeName(entry) !== normalizeName(userB);
    });

    friendsB = friendsB.filter(function (entry) {
      return normalizeName(entry) !== normalizeName(userA);
    });

    Heavenly.cache.friends[getFriendsCacheKey(userA)] = friendsA;
    Heavenly.cache.friends[getFriendsCacheKey(userB)] = friendsB;

    if (Heavenly.api.setFriends) {
      await Heavenly.api.setFriends(userA, friendsA);
      await Heavenly.api.setFriends(userB, friendsB);
    }
  }

  async function renderBlocklist() {
    var currentUser = getCurrentUser();
    var list = getEl("blocklistItems");

    if (!currentUser || !list) return;

    var blockedUsers = getBlockedUsers(currentUser);
    list.innerHTML = "";

    if (blockedUsers.length === 0) {
      list.innerHTML = '<div class="feedItem">Niemand ist blockiert.</div>';
      return;
    }

    await preloadAvatars(blockedUsers);

    var fragment = document.createDocumentFragment();

    blockedUsers.forEach(function (username) {
      var item = document.createElement("div");
      item.className = "friendItem";

      var avatar = document.createElement("div");
      avatar.className = "friendAvatar friendClickable";
      avatar.innerText = getInitials(username);
      avatar.title = "Profil öffnen";

      var avatarData = Heavenly.cache.avatars[getAvatarCacheKey(username)] || "";
      if (avatarData) {
        avatar.innerText = "";
        avatar.style.backgroundImage = 'url("' + avatarData + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.style.backgroundRepeat = "no-repeat";
      }

      avatar.onclick = function () {
        closeBlocklistPopup();
        if (typeof window.openUserProfile === "function") {
          window.openUserProfile(username);
        }
      };

      var meta = document.createElement("div");
      meta.className = "friendMeta friendClickable";
      meta.onclick = function () {
        closeBlocklistPopup();
        if (typeof window.openUserProfile === "function") {
          window.openUserProfile(username);
        }
      };

      var nameEl = document.createElement("div");
      nameEl.className = "friendName";
      nameEl.innerText = username;

      var statusEl = document.createElement("div");
      statusEl.className = "friendStatus";
      statusEl.innerText = "Blockiert";

      meta.appendChild(nameEl);
      meta.appendChild(statusEl);

      var unblockBtn = document.createElement("button");
      unblockBtn.className = "friendActionBtn";
      unblockBtn.type = "button";
      unblockBtn.title = "Entblocken";
      unblockBtn.innerText = "↺";
      unblockBtn.onclick = function () {
        window.unblockUser(username);
      };

      item.appendChild(avatar);
      item.appendChild(meta);
      item.appendChild(unblockBtn);

      fragment.appendChild(item);
    });

    list.appendChild(fragment);
  }

  function openBlocklistPopup() {
    var popup = getEl("blocklistPopup");
    if (!popup) return;

    renderBlocklist();
    popup.classList.add("active");
  }

  function closeBlocklistPopup() {
    var popup = getEl("blocklistPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeProfileMenu() {
    var menu = getEl("profileMenu");
    if (menu && Heavenly.overlay && Heavenly.overlay.close) {
      Heavenly.overlay.close(menu, "open");
    }
  }

  function closeStatusPopup() {
    var popup = getEl("statusPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeHomeProfilePopup() {
    var popup = getEl("homeProfilePopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeInfoBoxPopupSafe() {
    var popup = getEl("infoBoxPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeDeleteAccountPopup() {
    var popup = getEl("deleteAccountPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeProfileEditorPopup() {
    var popup = getEl("profileEditorPopup");
    if (popup) {
      popup.classList.remove("active");
    }
  }

  function closeForeignProfileMenu() {
    var menu = getEl("foreignProfileMenu");
    if (menu) {
      menu.classList.remove("open");
    }
  }

  function updateProfileActionVisibility() {
    var ownSettingsBtn = getEl("profileSettingsBtn");
    var quickActions = getEl("profileQuickActions");
    var infoActions = document.querySelector(".profileInfoActions");
    var sidebarActions = getEl("profileSidebarActions");
    var sidebarBlocklistBtn = getEl("profileSidebarBlocklistBtn");
    var foreignActionsBox = getEl("foreignProfileActionsBox");
    var profilePostCreator = getEl("profilePostCreator");

    applyProfilePopupLabels();

    if (ownSettingsBtn) {
      ownSettingsBtn.style.display = isOwnProfile() ? "block" : "none";
      ownSettingsBtn.innerText = "Profil bearbeiten";
    }

    if (quickActions) {
      quickActions.style.display = isOwnProfile() ? "grid" : "none";
    }

    if (infoActions) {
      infoActions.style.display = isOwnProfile() ? "none" : "none";
    }

    if (sidebarActions) {
      sidebarActions.style.display = isOwnProfile() ? "flex" : "none";
    }

    if (sidebarBlocklistBtn) {
      sidebarBlocklistBtn.style.display = isOwnProfile() ? "flex" : "none";
    }

    if (foreignActionsBox) {
      foreignActionsBox.style.display = isOwnProfile() ? "none" : "flex";
    }

    if (profilePostCreator) {
      profilePostCreator.style.display = isOwnProfile() ? "flex" : "none";
    }

    closeForeignProfileMenu();
  }

  async function openHomeProfilePopup() {
    var user = getCurrentUser();
    if (!user) return;

    var theme = await getThemeSettings(user);

    var hpBoxColor = getEl("hpBoxColor");
    var hpPanelColor = getEl("hpPanelColor");
    var hpTextColor = getEl("hpTextColor");
    var hpFontFamily = getEl("hpFontFamily");
    var hpHomeBg = getEl("hpHomeBg");
    var popup = getEl("homeProfilePopup");

    applyProfilePopupLabels();
    initHomeProfilePopupBindings();

    if (hpBoxColor) hpBoxColor.value = theme.boxColor || "#8b5cf6";
    if (hpPanelColor) hpPanelColor.value = theme.panelColor || "#4b0010";
    if (hpTextColor) hpTextColor.value = theme.textColor || "#ffffff";
    if (hpFontFamily) hpFontFamily.value = theme.fontFamily || "Arial, sans-serif";
    if (hpHomeBg) hpHomeBg.value = "";
    updateProfileBackgroundField(theme.profileBg || "");

    if (popup) {
      popup.classList.add("active");
    }
  }

  async function openProfileEditorPopup() {
    var user = getCurrentUser();
    if (!user) return;

    var settings = await getUserSettings(user);
    var theme = await getThemeSettings(user);
    var relationship = getRelationshipData(settings);
    var info = getInfoBoxData(settings);
    var popup = getEl("profileEditorPopup");

    initProfileEditorPopupBindings();

    var statusInput = getEl("peStatusInput");
    var profileFeedTitle = getEl("peProfileFeedTitle");
    var about = getEl("peAbout");
    var relationshipStatus = getEl("peRelationshipStatus");
    var relationshipPartner = getEl("peRelationshipPartner");
    var birthday = getEl("peBirthday");
    var job = getEl("peJob");
    var profileVisibility = getEl("peProfileVisibility");
    var boxColor = getEl("peBoxColor");
    var panelColor = getEl("pePanelColor");
    var textColor = getEl("peTextColor");
    var fontFamily = getEl("peFontFamily");
    var editorSections = popup ? popup.querySelectorAll(".profileEditorSection") : [];
    var editorBgField = getEl("peProfileBgName");

    if (editorSections && editorSections[0]) {
      editorSections[0].style.display = "none";
    }

    if (editorBgField && editorBgField.parentElement) {
      editorBgField.parentElement.style.display = "none";
    }

    if (statusInput) statusInput.value = settings.status || "";
    if (profileFeedTitle) profileFeedTitle.value = settings.profileFeedTitle || "";
    if (about) about.value = info.about || "";
    if (relationshipStatus) relationshipStatus.value = relationship.status || "";
    if (relationshipPartner) relationshipPartner.value = relationship.partner || "";
    if (birthday) birthday.value = info.birthday || "";
    if (job) job.value = info.job || "";
    if (profileVisibility) profileVisibility.value = settings.profileVisibility || "public";
    if (boxColor) boxColor.value = theme.boxColor || "#8b5cf6";
    if (panelColor) panelColor.value = theme.panelColor || "#4b0010";
    if (textColor) textColor.value = theme.textColor || "#ffffff";
    if (fontFamily) fontFamily.value = theme.fontFamily || "Arial, sans-serif";

    if (popup) {
      popup.classList.add("active");
    }
  }

  async function openStatusPopup() {
    var user = getCurrentUser();
    if (!user) return;

    var settings = await getUserSettings(user);
    var statusPopup = getEl("statusPopup");
    var statusInput = getEl("statusInput");

    if (statusInput) {
      statusInput.value = settings.status || "";
    }

    if (statusPopup) {
      statusPopup.classList.add("active");
    }
  }

  function openDeleteAccountPopup() {
    var popup = getEl("deleteAccountPopup");
    if (popup) {
      popup.classList.add("active");
    }
  }

  function openRelationshipPartnerProfile() {
    var partnerBtn = getEl("relationshipPartnerBtn");
    if (!partnerBtn) return;

    var partnerName = partnerBtn.innerText.trim();
    if (!partnerName) return;

    if (typeof window.openUserProfile === "function") {
      window.openUserProfile(partnerName);
    }
  }

  async function saveHomeProfileSettings() {
    var user = getCurrentUser();
    if (!user) return;

    var rawProfileBg = getEl("hpProfileBg") ? getEl("hpProfileBg").value.trim() : "";
    var normalizedProfileBg = normalizeThemeImageUrl(rawProfileBg);

    updateProfileBackgroundField(normalizedProfileBg);

    var theme = {
      boxColor: getEl("hpBoxColor") ? getEl("hpBoxColor").value : "#8b5cf6",
      panelColor: getEl("hpPanelColor") ? getEl("hpPanelColor").value : "#4b0010",
      textColor: getEl("hpTextColor") ? getEl("hpTextColor").value : "#ffffff",
      fontFamily: getEl("hpFontFamily") ? getEl("hpFontFamily").value : "Arial, sans-serif",
      homeBg: "",
      profileBg: normalizedProfileBg
    };

    await setThemeSettings(user, theme);
    await applyHomeProfileTheme();
    closeHomeProfilePopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback(
        normalizedProfileBg || !rawProfileBg
          ? "Profil-Design gespeichert"
          : "Hintergrundbild benötigt eine vollständige Bild-URL",
        !!(normalizedProfileBg || !rawProfileBg)
      );
    }
  }

  async function saveProfileEditorSettings() {
    var user = getCurrentUser();
    if (!user || !Heavenly.storage) return;
    var existingTheme = await getThemeSettings(user);

    var settings = Heavenly.storage.getSettings(user) || {};
    settings.relationship = {
      status: getEl("peRelationshipStatus") ? getEl("peRelationshipStatus").value : "",
      partner: getEl("peRelationshipPartner") ? getEl("peRelationshipPartner").value.trim() : ""
    };
    settings.birthday = getEl("peBirthday") ? getEl("peBirthday").value.trim() : "";
    settings.job = getEl("peJob") ? getEl("peJob").value.trim() : "";
    settings.about = getEl("peAbout") ? getEl("peAbout").value.trim() : "";
    settings.profileFeedTitle = getEl("peProfileFeedTitle")
      ? getEl("peProfileFeedTitle").value.trim()
      : "";
    settings.profileVisibility = getEl("peProfileVisibility")
      ? getEl("peProfileVisibility").value
      : "public";

    Heavenly.storage.setSettings(user, settings);

    var profileKey = getProfileCacheKey(user);
    if (Heavenly.cache.profiles[profileKey] && Heavenly.cache.profiles[profileKey].settings) {
      Heavenly.cache.profiles[profileKey].settings = Object.assign(
        {},
        Heavenly.cache.profiles[profileKey].settings,
        settings
      );
    }

    var normalizedProfileBg = normalizeThemeImageUrl(
      existingTheme && existingTheme.profileBg ? existingTheme.profileBg : ""
    );

    var theme = {
      boxColor: getEl("peBoxColor") ? getEl("peBoxColor").value : "#8b5cf6",
      panelColor: getEl("pePanelColor") ? getEl("pePanelColor").value : "#4b0010",
      textColor: getEl("peTextColor") ? getEl("peTextColor").value : "#ffffff",
      fontFamily: getEl("peFontFamily") ? getEl("peFontFamily").value : "Arial, sans-serif",
      homeBg: "",
      profileBg: normalizedProfileBg
    };

    await saveStatusText(user, getEl("peStatusInput") ? getEl("peStatusInput").value.trim() : "");
    await setThemeSettings(user, theme);
    await applyProfileImages();
    closeProfileEditorPopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil gespeichert", true);
    }
  }

  async function resetHomeProfileSettings() {
    var user = getCurrentUser();
    if (!user) return;

    await setThemeSettings(user, {
      boxColor: "#8b5cf6",
      panelColor: "#4b0010",
      textColor: "#ffffff",
      fontFamily: "Arial, sans-serif",
      homeBg: "",
      profileBg: ""
    });

    await applyHomeProfileTheme();
    closeHomeProfilePopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil-Design zurückgesetzt", true);
    }
  }

  function resetProfileEditorDesign() {
    var boxColor = getEl("peBoxColor");
    var panelColor = getEl("pePanelColor");
    var textColor = getEl("peTextColor");
    var fontFamily = getEl("peFontFamily");

    if (boxColor) boxColor.value = "#8b5cf6";
    if (panelColor) panelColor.value = "#4b0010";
    if (textColor) textColor.value = "#ffffff";
    if (fontFamily) fontFamily.value = "Arial, sans-serif";

    updateProfileEditorBackgroundField("");

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Design im Editor zurückgesetzt", true);
    }
  }

  async function saveStatus() {
    var user = getCurrentUser();
    if (!user) return;

    var input = getEl("statusInput");
    var text = input ? input.value.trim() : "";

    await saveStatusText(user, text);
    await applyProfileImages();
    closeStatusPopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Status aktualisiert", true);
    }
  }

  async function confirmDeleteAccount() {
    var user = getCurrentUser();
    if (!user || !Heavenly.api || !Heavenly.api.deleteAccount) return;

    closeDeleteAccountPopup();
    closeProfileMenu();
    closeForeignProfileMenu();
    closeImageViewer();
    closeStatusPopup();
    closeHomeProfilePopup();
    closeProfileEditorPopup();
    closeInfoBoxPopupSafe();
    closeBlocklistPopup();

    try {
      var result = await Heavenly.api.deleteAccount(user);

      if (!result || !result.ok) {
        if (typeof window.setFeedback === "function") {
          window.setFeedback(
            result && result.message ? result.message : "Konto konnte nicht gelöscht werden",
            false
          );
        }
        return;
      }

      if (Heavenly.state) {
        Heavenly.state.currentUser = null;
        Heavenly.state.viewedProfileUser = null;
      }

      if (typeof window.closeDMs === "function") window.closeDMs();
      if (typeof window.closeFriendRequests === "function") window.closeFriendRequests();
      if (typeof window.closeRemoveFriendPopup === "function") window.closeRemoveFriendPopup();
      if (typeof window.closeGlobalSearchPopup === "function") window.closeGlobalSearchPopup();

      var loginLogo = getEl("loginLogo");
      if (loginLogo) {
        loginLogo.style.display = "block";
      }

      if (Heavenly.ui && Heavenly.ui.showScreen) {
        Heavenly.ui.showScreen("loginScreen");
      }

      if (typeof window.setFeedback === "function") {
        window.setFeedback("Konto wurde gelöscht", true);
      }
    } catch (error) {
      console.error("delete account failed:", error);

      if (typeof window.setFeedback === "function") {
        window.setFeedback("Konto konnte nicht gelöscht werden", false);
      }
    }
  }

  async function openImageViewer(type) {
    var user = getViewedUser();
    if (!user) return;

    var viewer = getEl("imageViewer");
    var img = getEl("imageViewerImg");

    if (!viewer || !img) return;

    var data = null;

    if (type === "avatar") {
      data = await getAvatarData(user);
    }

    if (type === "cover") {
      data = await getCoverData(user);
    }

    if (!data) {
      data = getPlaceholderDataUrl(type);
    }

    img.src = data;

    if (Heavenly.overlay && Heavenly.overlay.open) {
      Heavenly.overlay.open(viewer, "open");
    }
  }

  function closeImageViewer() {
    var viewer = getEl("imageViewer");
    var img = getEl("imageViewerImg");

    if (!viewer || !img) return;
    if (!viewer.classList.contains("open")) return;

    if (Heavenly.overlay && Heavenly.overlay.close) {
      Heavenly.overlay.close(viewer, "open");
    }

    setTimeout(function () {
      img.src = "";
    }, 200);
  }

  async function removeFriendFromViewedUser() {
    var currentUser = getCurrentUser();
    var viewedUser = getViewedUser();

    closeForeignProfileMenu();

    if (!currentUser || !viewedUser) return;

    await removeFriendConnection(currentUser, viewedUser);

    if (typeof window.setFeedback === "function") {
      window.setFeedback(viewedUser + " entfernt", true);
    }
  }

  window.applyProfileImages = applyProfileImages;
  window.applyHomeProfileTheme = applyHomeProfileTheme;
  window.openBlocklistPopup = openBlocklistPopup;
  window.closeBlocklistPopup = closeBlocklistPopup;
  window.renderBlocklist = renderBlocklist;
  window.closeProfileMenu = closeProfileMenu;
  window.closeStatusPopup = closeStatusPopup;
  window.closeHomeProfilePopup = closeHomeProfilePopup;
  window.closeProfileEditorPopup = closeProfileEditorPopup;
  window.closeDeleteAccountPopup = closeDeleteAccountPopup;
  window.closeInfoBoxPopup = closeInfoBoxPopup;
  window.saveStatus = saveStatus;
  window.saveHomeProfileSettings = saveHomeProfileSettings;
  window.saveProfileEditorSettings = saveProfileEditorSettings;
  window.resetHomeProfileSettings = resetHomeProfileSettings;
  window.resetProfileEditorDesign = resetProfileEditorDesign;
  window.openImageViewer = openImageViewer;
  window.closeImageViewer = closeImageViewer;
  window.confirmDeleteAccount = confirmDeleteAccount;
  window.removeFriendFromViewedUser = removeFriendFromViewedUser;
  window.openRelationshipPartnerProfile = openRelationshipPartnerProfile;
  window.openInfoBoxPopup = openInfoBoxPopup;
  window.openProfileEditorPopup = openProfileEditorPopup;
  window.saveInfoBoxSettings = saveInfoBoxSettings;
  window.canCurrentUserViewProfilePosts = canCurrentUserViewProfilePosts;

  window.openProfile = async function () {
    var user = getCurrentUser();
    if (!user) return;

    if (!Heavenly.state) {
      Heavenly.state = {};
    }

    Heavenly.state.viewedProfileUser = user;

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("profileScreen");
    }

    initProfileUploads();
    startProfileClockMirror();
    await applyProfileImages();
    closeProfileMenu();
    updateProfileActionVisibility();
  };

  window.openUserProfile = async function (username) {
    if (!username) return;

    if (!Heavenly.state) {
      Heavenly.state = {};
    }

    Heavenly.state.viewedProfileUser = username;

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("profileScreen");
    }

    initProfileUploads();
    startProfileClockMirror();
    await applyProfileImages();
    closeProfileMenu();
    updateProfileActionVisibility();
  };

  window.closeProfile = function () {
    closeProfileMenu();
    closeForeignProfileMenu();
    closeImageViewer();
    closeStatusPopup();
    closeHomeProfilePopup();
    closeProfileEditorPopup();
    closeInfoBoxPopupSafe();
    closeDeleteAccountPopup();
    closeBlocklistPopup();
    stopProfileClockMirror();

    if (Heavenly.state) {
      Heavenly.state.viewedProfileUser = null;
    }

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("homeScreen");
    }
  };

  window.toggleProfileMenu = function () {
    var menu = getEl("profileMenu");
    if (!menu || !Heavenly.overlay) return;

    if (menu.classList.contains("open")) {
      Heavenly.overlay.close(menu, "open");
    } else {
      Heavenly.overlay.open(menu, "open");
    }
  };

  window.toggleForeignProfileMenu = function () {
    var menu = getEl("foreignProfileMenu");
    if (!menu) return;

    menu.classList.toggle("open");
  };

  window.chooseProfileBackgroundFile = function () {
    initHomeProfilePopupBindings();

    var fileInput = getEl("hpProfileBgFile");
    if (!fileInput) return;

    if (!triggerFileDialog(fileInput) && typeof window.setFeedback === "function") {
      window.setFeedback("Hintergrundbild-Auswahl konnte nicht geöffnet werden", false);
    }
  };

  window.clearProfileBackgroundFile = function () {
    updateProfileBackgroundField("");

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil-Hintergrundbild entfernt", true);
    }
  };

  window.chooseProfileEditorBackgroundFile = function () {
    initProfileEditorPopupBindings();

    var fileInput = getEl("peProfileBgFile");
    if (!fileInput) return;

    if (!triggerFileDialog(fileInput) && typeof window.setFeedback === "function") {
      window.setFeedback("Hintergrundbild-Auswahl konnte nicht geöffnet werden", false);
    }
  };

  window.clearProfileEditorBackgroundFile = function () {
    updateProfileEditorBackgroundField("");

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Profil-Hintergrundbild entfernt", true);
    }
  };

  window.openProfileSection = async function (section) {
    closeProfileMenu();

    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");

    if (section === "homeProfile") {
      await openProfileEditorPopup();
      return;
    }

    if (section === "avatar") {
      if (avatarInput && isOwnProfile()) {
        if (!triggerFileDialog(avatarInput) && typeof window.setFeedback === "function") {
          window.setFeedback("Profilbild-Auswahl konnte nicht geöffnet werden", false);
        }
      }
      return;
    }

    if (section === "cover") {
      if (coverInput && isOwnProfile()) {
        if (!triggerFileDialog(coverInput) && typeof window.setFeedback === "function") {
          window.setFeedback("Titelbild-Auswahl konnte nicht geöffnet werden", false);
        }
      }
      return;
    }

    if (section === "profileBg") {
      var profileBgInput = getEl("profileBgUploadInput");

      if (profileBgInput && isOwnProfile()) {
        if (!triggerFileDialog(profileBgInput) && typeof window.setFeedback === "function") {
          window.setFeedback("Hintergrundbild-Auswahl konnte nicht geöffnet werden", false);
        }
      }
      return;
    }

    if (section === "status") {
      if (isOwnProfile()) {
        await openProfileEditorPopup();
      }
      return;
    }

    if (section === "infoBox") {
      if (isOwnProfile()) {
        await openProfileEditorPopup();
      }
      return;
    }

    if (section === "blocklist") {
      if (isOwnProfile()) {
        openBlocklistPopup();
      }
      return;
    }

    if (section === "deleteAccount") {
      if (isOwnProfile()) {
        openDeleteAccountPopup();
      }
      return;
    }
  };

  window.sendFriendRequestToViewedUser = function () {
    var currentUser = getCurrentUser();
    var viewedUser = getViewedUser();

    closeForeignProfileMenu();

    if (!currentUser || !viewedUser || currentUser === viewedUser) return;
    if (!Heavenly.storage) return;

    var settings = Heavenly.storage.getSettings(viewedUser) || {};
    var requests = Array.isArray(settings.friendRequests) ? settings.friendRequests : [];

    if (!requests.includes(currentUser)) {
      requests.push(currentUser);
      settings.friendRequests = requests;
      Heavenly.storage.setSettings(viewedUser, settings);
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Freundesanfrage gesendet", true);
    }
  };

  window.blockViewedUser = async function () {
    var currentUser = getCurrentUser();
    var viewedUser = getViewedUser();

    closeForeignProfileMenu();

    if (!currentUser || !viewedUser || currentUser === viewedUser) return;
    if (!Heavenly.storage) return;

    var blocked = getBlockedUsers(currentUser);

    if (!blocked.some(function (entry) {
      return normalizeName(entry) === normalizeName(viewedUser);
    })) {
      blocked.push(viewedUser);
      setBlockedUsers(currentUser, blocked);
    }

    await removeFriendConnection(currentUser, viewedUser);

    if (typeof window.renderFriends === "function") {
      await window.renderFriends();
    }

    if (typeof window.renderFriendRequests === "function") {
      window.renderFriendRequests();
    }

    if (typeof window.onGlobalSearch === "function") {
      window.onGlobalSearch();
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback(viewedUser + " blockiert", true);
    }
  };

  window.unblockUser = async function (username) {
    var currentUser = getCurrentUser();
    if (!currentUser || !username) return;

    var blocked = getBlockedUsers(currentUser).filter(function (entry) {
      return normalizeName(entry) !== normalizeName(username);
    });

    setBlockedUsers(currentUser, blocked);
    await renderBlocklist();

    if (typeof window.setFeedback === "function") {
      window.setFeedback(username + " entblockt", true);
    }

    if (typeof window.onGlobalSearch === "function") {
      window.onGlobalSearch();
    }

    if (typeof window.renderFriends === "function") {
      window.renderFriends();
    }

    if (typeof window.renderFriendRequests === "function") {
      window.renderFriendRequests();
    }
  };

  document.addEventListener("click", function (event) {
    var menu = getEl("profileMenu");
    var gearWrap = document.querySelector(".profileSettingsWrap");

    if (menu && gearWrap && menu.classList.contains("open") && !gearWrap.contains(event.target)) {
      closeProfileMenu();
    }

    var foreignActions = getEl("foreignProfileActionsBox");
    var foreignMenu = getEl("foreignProfileMenu");

    if (
      foreignMenu &&
      foreignActions &&
      foreignMenu.classList.contains("open") &&
      !foreignActions.contains(event.target)
    ) {
      closeForeignProfileMenu();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    initHomeProfilePopupBindings();
    applyProfilePopupLabels();
    syncProfileClockMirror();
  });

  setTimeout(function () {
    initHomeProfilePopupBindings();
    applyProfilePopupLabels();
    syncProfileClockMirror();
  }, 0);
})();
