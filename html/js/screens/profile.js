window.Heavenly = window.Heavenly || {};

(function () {
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

  function isOwnProfile() {
    return getViewedUser() === getCurrentUser();
  }

  function getInitials(name) {
    if (Heavenly && Heavenly.util && Heavenly.util.initials) {
      return Heavenly.util.initials(name);
    }

    return String(name || "?").charAt(0).toUpperCase();
  }

  function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
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

  function readFileAsDataUrl(file, onDone) {
    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (event) {
      if (typeof onDone === "function") {
        onDone(event.target.result);
      }
    };

    reader.onerror = function () {
      if (typeof window.setFeedback === "function") {
        window.setFeedback("Bild konnte nicht gelesen werden", false);
      }
    };

    reader.readAsDataURL(file);
  }

  async function getProfileData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getProfile) {
      return null;
    }

    var result = await Heavenly.api.getProfile(user);
    if (!result || !result.ok || !result.data) {
      return null;
    }

    return result.data;
  }

  async function getUserSettings(user) {
    var profile = await getProfileData(user);
    return profile && profile.settings ? profile.settings : {};
  }

  async function getThemeSettings(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getTheme) {
      return {};
    }

    var result = await Heavenly.api.getTheme(user);
    if (!result || !result.ok) {
      return {};
    }

    return result.data || {};
  }

  async function setThemeSettings(user, theme) {
    if (!user || !Heavenly.api || !Heavenly.api.saveTheme) return;
    await Heavenly.api.saveTheme(user, theme || {});
  }

  async function getAvatarData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getAvatar) {
      return null;
    }

    var result = await Heavenly.api.getAvatar(user);
    return result && result.ok ? (result.data || null) : null;
  }

  async function getCoverData(user) {
    if (!user || !Heavenly.api || !Heavenly.api.getCover) {
      return null;
    }

    var result = await Heavenly.api.getCover(user);
    return result && result.ok ? (result.data || null) : null;
  }

  async function saveAvatarData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setAvatar) return;
    await Heavenly.api.setAvatar(user, dataUrl);
  }

  async function saveCoverData(user, dataUrl) {
    if (!user || !Heavenly.api || !Heavenly.api.setCover) return;
    await Heavenly.api.setCover(user, dataUrl);
  }

  async function saveStatusText(user, text) {
    if (!user || !Heavenly.api || !Heavenly.api.saveStatus) return;
    await Heavenly.api.saveStatus(user, text || "");
  }

  async function applyHomeProfileTheme() {
    var currentUser = getCurrentUser();
    if (!currentUser) return;

    var currentTheme = await getThemeSettings(currentUser);
    var viewedUser = getViewedUser();
    var viewedTheme = viewedUser ? await getThemeSettings(viewedUser) : {};

    var homeBoxColor = currentTheme.boxColor || "#8b5cf6";
    var homePanelColor = currentTheme.panelColor || "#4b0010";
    var homeTextColor = currentTheme.textColor || "#ffffff";
    var homeFontFamily = currentTheme.fontFamily || "Arial, sans-serif";
    var homeBg = currentTheme.homeBg || "";

    var profileBoxColor = viewedTheme.boxColor || homeBoxColor;
    var profilePanelColor = viewedTheme.panelColor || homePanelColor;
    var profileTextColor = viewedTheme.textColor || homeTextColor;
    var profileBg = viewedTheme.profileBg || "";

    var homeBorderColor = hexToRgba(homeBoxColor, 0.75);
    var homeBoxBg = hexToRgba(homePanelColor, 0.72);

    var profileBorderColor = hexToRgba(profileBoxColor, 0.75);
    var profileBoxBg = hexToRgba(profilePanelColor, 0.72);

    document.body.style.fontFamily = homeFontFamily;

    var homeScreen = getEl("homeScreen");
    if (homeScreen) {
      homeScreen.style.backgroundImage = homeBg ? 'url("' + homeBg + '")' : "";
      homeScreen.style.backgroundSize = homeBg ? "cover" : "";
      homeScreen.style.backgroundPosition = homeBg ? "center" : "";
      homeScreen.style.backgroundRepeat = homeBg ? "no-repeat" : "";
      homeScreen.style.color = homeTextColor;
    }

    var profileScreen = getEl("profileScreen");
    if (profileScreen) {
      profileScreen.style.backgroundImage = profileBg ? 'url("' + profileBg + '")' : "";
      profileScreen.style.backgroundSize = profileBg ? "cover" : "";
      profileScreen.style.backgroundPosition = profileBg ? "center" : "";
      profileScreen.style.backgroundRepeat = profileBg ? "no-repeat" : "";
      profileScreen.style.color = profileTextColor;
    }

    document.querySelectorAll(
      ".homeHeader, .feedBox, .usersBox, .feedItem, .fortuneBox, .clockBox, .searchInput, .globalSearch"
    ).forEach(function (element) {
      element.style.background = homeBoxBg;
      element.style.borderColor = homeBorderColor;
      element.style.color = homeTextColor;
    });

    document.querySelectorAll(".profileCard, .profileStatus").forEach(function (element) {
      element.style.background = profileBoxBg;
      element.style.borderColor = profileBorderColor;
      element.style.color = profileTextColor;
    });

    document.querySelectorAll(
      "#homeScreen, #homeScreen h1, #homeScreen h2, #homeScreen h3, #homeScreen h4, #homeScreen p, #homeScreen .friendName, #homeScreen .friendStatus, #homeScreen .clockTime, #homeScreen .clockDate"
    ).forEach(function (element) {
      element.style.color = homeTextColor;
    });

    document.querySelectorAll(
      "#profileScreen, #profileScreen h1, #profileScreen h2, #profileScreen h3, #profileScreen h4, #profileScreen p, #profileScreen .profileNameBig, #profileScreen .profileSubSmall, #profileScreen .profileStatus"
    ).forEach(function (element) {
      element.style.color = profileTextColor;
    });

    document.querySelectorAll("#homeScreen input, #homeScreen select").forEach(function (element) {
      element.style.color = homeTextColor;
      element.style.borderColor = homeBorderColor;
      element.style.background = homeBoxBg;
    });

    document.querySelectorAll("#profileScreen input, #profileScreen select").forEach(function (element) {
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
    await applyProfileIdentity();
    await applyAvatarImage();
    await applyCoverImage();
    await applyHomeProfileTheme();
  }

  function initProfileUploads() {
    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");

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
        });

        coverInput.value = "";
      });
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

    for (var index = 0; index < blockedUsers.length; index++) {
      var username = blockedUsers[index];

      var item = document.createElement("div");
      item.className = "requestItem";

      var avatar = document.createElement("div");
      avatar.className = "requestAvatar";
      avatar.title = "Profil öffnen";

      var avatarData = null;
      if (Heavenly.api && Heavenly.api.getAvatar) {
        try {
          var avatarResult = await Heavenly.api.getAvatar(username);
          if (avatarResult && avatarResult.ok) {
            avatarData = avatarResult.data || null;
          }
        } catch (error) {
          console.warn("Blocklist avatar load failed", error);
        }
      }

      if (avatarData) {
        avatar.style.backgroundImage = 'url("' + avatarData + '")';
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.style.backgroundRepeat = "no-repeat";
        avatar.innerText = "";
      } else {
        avatar.innerText = getInitials(username);
      }

      avatar.onclick = (function (name) {
        return function () {
          window.openUserProfile(name);
          closeBlocklistPopup();
        };
      })(username);

      var label = document.createElement("div");
      label.className = "requestName";
      label.innerText = username;
      label.title = "Profil öffnen";
      label.onclick = (function (name) {
        return function () {
          window.openUserProfile(name);
          closeBlocklistPopup();
        };
      })(username);

      var actions = document.createElement("div");
      actions.className = "requestActions";

      var unblockBtn = document.createElement("button");
      unblockBtn.className = "requestIconBtn";
      unblockBtn.type = "button";
      unblockBtn.title = "Entblocken";
      unblockBtn.innerHTML = "↺";
      unblockBtn.onclick = (function (name) {
        return function () {
          window.unblockUser(name);
        };
      })(username);

      actions.appendChild(unblockBtn);

      item.appendChild(avatar);
      item.appendChild(label);
      item.appendChild(actions);

      list.appendChild(item);
    }
  }

  function openBlocklistPopup() {
    var popup = getEl("blocklistPopup");
    if (!popup) return;

    renderBlocklist();
    popup.classList.add("active");
  }

  function closeBlocklistPopup() {
    var popup = getEl("blocklistPopup");
    if (!popup) return;

    popup.classList.remove("active");
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

  function closeDeleteAccountPopup() {
    var popup = getEl("deleteAccountPopup");
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
    var ownGear = document.querySelector(".coverGear");
    var foreignActions = getEl("foreignProfileActions");

    if (ownGear) {
      ownGear.style.display = isOwnProfile() ? "block" : "none";
    }

    if (foreignActions) {
      foreignActions.style.display = isOwnProfile() ? "none" : "block";
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
    var hpProfileBg = getEl("hpProfileBg");
    var popup = getEl("homeProfilePopup");

    if (hpBoxColor) hpBoxColor.value = theme.boxColor || "#8b5cf6";
    if (hpPanelColor) hpPanelColor.value = theme.panelColor || "#4b0010";
    if (hpTextColor) hpTextColor.value = theme.textColor || "#ffffff";
    if (hpFontFamily) hpFontFamily.value = theme.fontFamily || "Arial, sans-serif";
    if (hpHomeBg) hpHomeBg.value = theme.homeBg || "";
    if (hpProfileBg) hpProfileBg.value = theme.profileBg || "";

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

  async function saveHomeProfileSettings() {
    var user = getCurrentUser();
    if (!user) return;

    var theme = {
      boxColor: getEl("hpBoxColor") ? getEl("hpBoxColor").value : "#8b5cf6",
      panelColor: getEl("hpPanelColor") ? getEl("hpPanelColor").value : "#4b0010",
      textColor: getEl("hpTextColor") ? getEl("hpTextColor").value : "#ffffff",
      fontFamily: getEl("hpFontFamily") ? getEl("hpFontFamily").value : "Arial, sans-serif",
      homeBg: getEl("hpHomeBg") ? getEl("hpHomeBg").value.trim() : "",
      profileBg: getEl("hpProfileBg") ? getEl("hpProfileBg").value.trim() : ""
    };

    await setThemeSettings(user, theme);
    await applyHomeProfileTheme();
    closeHomeProfilePopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Home & Profile gespeichert", true);
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
      window.setFeedback("Home & Profile zurückgesetzt", true);
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
    if (!Heavenly.api) return;

    var userFriends = [];
    var otherFriends = [];

    if (Heavenly.api.getFriends) {
      var resultOne = await Heavenly.api.getFriends(currentUser);
      if (resultOne && resultOne.ok) {
        userFriends = resultOne.data || [];
      }

      var resultTwo = await Heavenly.api.getFriends(viewedUser);
      if (resultTwo && resultTwo.ok) {
        otherFriends = resultTwo.data || [];
      }
    }

    userFriends = userFriends.filter(function (name) {
      return String(name).toLowerCase() !== String(viewedUser).toLowerCase();
    });

    otherFriends = otherFriends.filter(function (name) {
      return String(name).toLowerCase() !== String(currentUser).toLowerCase();
    });

    if (Heavenly.api.setFriends) {
      await Heavenly.api.setFriends(currentUser, userFriends);
      await Heavenly.api.setFriends(viewedUser, otherFriends);
    }

    if (typeof window.setFeedback === "function") {
      window.setFeedback(viewedUser + " entfernt", true);
    }
  }

  window.applyProfileImages = applyProfileImages;
  window.applyHomeProfileTheme = applyHomeProfileTheme;
  window.closeBlocklistPopup = closeBlocklistPopup;
  window.renderBlocklist = renderBlocklist;
  window.closeProfileMenu = closeProfileMenu;
  window.closeStatusPopup = closeStatusPopup;
  window.closeHomeProfilePopup = closeHomeProfilePopup;
  window.closeDeleteAccountPopup = closeDeleteAccountPopup;
  window.saveStatus = saveStatus;
  window.saveHomeProfileSettings = saveHomeProfileSettings;
  window.resetHomeProfileSettings = resetHomeProfileSettings;
  window.openImageViewer = openImageViewer;
  window.closeImageViewer = closeImageViewer;
  window.confirmDeleteAccount = confirmDeleteAccount;
  window.removeFriendFromViewedUser = removeFriendFromViewedUser;

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
    closeDeleteAccountPopup();
    closeBlocklistPopup();

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

  window.openProfileSection = async function (section) {
    closeProfileMenu();

    var avatarInput = getEl("avatarUploadInput");
    var coverInput = getEl("coverUploadInput");

    if (section === "homeProfile") {
      await openHomeProfilePopup();
      return;
    }

    if (section === "avatar") {
      if (avatarInput && isOwnProfile()) {
        avatarInput.click();
      }
      return;
    }

    if (section === "cover") {
      if (coverInput && isOwnProfile()) {
        coverInput.click();
      }
      return;
    }

    if (section === "status") {
      if (isOwnProfile()) {
        await openStatusPopup();
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

    if (Heavenly.api && Heavenly.api.getFriends && Heavenly.api.setFriends) {
      var currentFriendsResult = await Heavenly.api.getFriends(currentUser);
      var viewedFriendsResult = await Heavenly.api.getFriends(viewedUser);

      var currentFriends = currentFriendsResult && currentFriendsResult.ok && Array.isArray(currentFriendsResult.data)
        ? currentFriendsResult.data
        : [];

      var viewedFriends = viewedFriendsResult && viewedFriendsResult.ok && Array.isArray(viewedFriendsResult.data)
        ? viewedFriendsResult.data
        : [];

      currentFriends = currentFriends.filter(function (entry) {
        return normalizeName(entry) !== normalizeName(viewedUser);
      });

      viewedFriends = viewedFriends.filter(function (entry) {
        return normalizeName(entry) !== normalizeName(currentUser);
      });

      await Heavenly.api.setFriends(currentUser, currentFriends);
      await Heavenly.api.setFriends(viewedUser, viewedFriends);
    }

    var currentSettings = Heavenly.storage.getSettings(currentUser) || {};
    var viewedSettings = Heavenly.storage.getSettings(viewedUser) || {};

    var currentRequests = Array.isArray(currentSettings.friendRequests) ? currentSettings.friendRequests : [];
    var viewedRequests = Array.isArray(viewedSettings.friendRequests) ? viewedSettings.friendRequests : [];

    currentSettings.friendRequests = currentRequests.filter(function (entry) {
      return normalizeName(entry) !== normalizeName(viewedUser);
    });

    viewedSettings.friendRequests = viewedRequests.filter(function (entry) {
      return normalizeName(entry) !== normalizeName(currentUser);
    });

    Heavenly.storage.setSettings(currentUser, currentSettings);
    Heavenly.storage.setSettings(viewedUser, viewedSettings);

    if (typeof window.setFeedback === "function") {
      window.setFeedback(viewedUser + " blockiert", true);
    }

    if (Heavenly.ui && Heavenly.ui.showScreen) {
      Heavenly.ui.showScreen("homeScreen");
    }

    if (Heavenly.state) {
      Heavenly.state.viewedProfileUser = null;
    }

    if (typeof window.renderFriends === "function") {
      window.renderFriends();
    }

    if (typeof window.renderFriendRequests === "function") {
      window.renderFriendRequests();
    }

    if (typeof window.onGlobalSearch === "function") {
      window.onGlobalSearch();
    }
  };

  window.unblockUser = function (username) {
    var currentUser = getCurrentUser();
    if (!currentUser || !username) return;

    var blocked = getBlockedUsers(currentUser).filter(function (entry) {
      return normalizeName(entry) !== normalizeName(username);
    });

    setBlockedUsers(currentUser, blocked);
    renderBlocklist();

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
    var gearWrap = document.querySelector(".gearWrap");

    if (menu && gearWrap && menu.classList.contains("open") && !gearWrap.contains(event.target)) {
      closeProfileMenu();
    }

    var foreignActions = getEl("foreignProfileActions");
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
})();