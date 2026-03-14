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

  async function applyRelationshipInfo() {
    var user = getViewedUser();
    if (!user) return;

    var settings = await getUserSettings(user);
    var relationship = getRelationshipData(settings);

    var statusText = getEl("relationshipStatusText");
    var partnerRow = getEl("relationshipPartnerRow");
    var partnerBtn = getEl("relationshipPartnerBtn");

    if (statusText) {
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

    var settings = await getUserSettings(user);
    var info = getInfoBoxData(settings);

    var birthdayRow = getEl("birthdayRow");
    var birthdayText = getEl("birthdayText");
    var jobRow = getEl("jobRow");
    var jobText = getEl("jobText");
    var aboutRow = getEl("aboutRow");
    var aboutText = getEl("aboutText");

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

    if (relationshipStatus) relationshipStatus.value = relationship.status || "";
    if (relationshipPartner) relationshipPartner.value = relationship.partner || "";
    if (birthday) birthday.value = info.birthday || "";
    if (job) job.value = info.job || "";
    if (about) about.value = info.about || "";

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

    Heavenly.storage.setSettings(user, settings);

    await applyProfileImages();
    closeInfoBoxPopup();

    if (typeof window.setFeedback === "function") {
      window.setFeedback("Infobox gespeichert", true);
    }
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
      ".homeHeader, .feedBox, .usersBox, .feedItem, .fortuneBox, .clockBox, .searchInput, .globalSearch, .homeSwitchBtn, .dmSidebar, .chatPanel, .dmSidebarItem, .activeChatInput"
    ).forEach(function (element) {
      element.style.background = homeBoxBg;
      element.style.borderColor = homeBorderColor;
      element.style.color = homeTextColor;
    });

    document.querySelectorAll(".profileInfoBox, .profileMainBox, .profileStatus").forEach(function (element) {
      element.style.background = profileBoxBg;
      element.style.borderColor = profileBorderColor;
      element.style.color = profileTextColor;
    });

    document.querySelectorAll(".profileInfoBtn, .profileInlineBtn, .profileLinkBtn, .profileInfoItem").forEach(function (element) {
      element.style.borderColor = profileBorderColor;
      element.style.color = profileTextColor;
    });

    document.querySelectorAll(
      "#homeScreen, #homeScreen h1, #homeScreen h2, #homeScreen h3, #homeScreen h4, #homeScreen p, #homeScreen .friendName, #homeScreen .friendStatus, #homeScreen .clockTime, #homeScreen .clockDate, #homeScreen .dmSidebarName, #homeScreen .dmSidebarPreview, #homeScreen .activeChatName"
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
    await applyRelationshipInfo();
    await applyInfoBoxDetails();
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

    for (var index = 0; index < blockedUsers.length; index++) {
      var username = blockedUsers[index];

      var item = document.createElement("div");
      item.className = "friendItem";

      var avatar = document.createElement("div");
      avatar.className = "friendAvatar friendClickable";
      avatar.innerText = getInitials(username);
      avatar.title = "Profil öffnen";

      if (Heavenly.api && Heavenly.api.getAvatar) {
        try {
          var avatarResult = await Heavenly.api.getAvatar(username);
          if (avatarResult && avatarResult.ok && avatarResult.data) {
            avatar.innerText = "";
            avatar.style.backgroundImage = 'url("' + avatarResult.data + '")';
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.backgroundRepeat = "no-repeat";
          }
        } catch (error) {
          console.warn("Blocklist avatar load failed", error);
        }
      }

      avatar.onclick = (function (name) {
        return function () {
          closeBlocklistPopup();
          if (typeof window.openUserProfile === "function") {
            window.openUserProfile(name);
          }
        };
      })(username);

      var meta = document.createElement("div");
      meta.className = "friendMeta friendClickable";
      meta.onclick = (function (name) {
        return function () {
          closeBlocklistPopup();
          if (typeof window.openUserProfile === "function") {
            window.openUserProfile(name);
          }
        };
      })(username);

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
      unblockBtn.onclick = (function (name) {
        return function () {
          window.unblockUser(name);
        };
      })(username);

      item.appendChild(avatar);
      item.appendChild(meta);
      item.appendChild(unblockBtn);

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

  function closeForeignProfileMenu() {
    var menu = getEl("foreignProfileMenu");
    if (menu) {
      menu.classList.remove("open");
    }
  }

  function updateProfileActionVisibility() {
    var ownSettingsBtn = getEl("profileSettingsBtn");
    var ownDmBtn = getEl("profileDmBtn");
    var foreignActionsBox = getEl("foreignProfileActionsBox");

    if (ownSettingsBtn) {
      ownSettingsBtn.style.display = isOwnProfile() ? "block" : "none";
    }

    if (ownDmBtn) {
      ownDmBtn.innerText = isOwnProfile() ? "Öffnen" : "Nachricht";
      ownDmBtn.style.display = "inline-flex";
    }

    if (foreignActionsBox) {
      foreignActionsBox.style.display = isOwnProfile() ? "none" : "flex";
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
  window.closeBlocklistPopup = closeBlocklistPopup;
  window.renderBlocklist = renderBlocklist;
  window.closeProfileMenu = closeProfileMenu;
  window.closeStatusPopup = closeStatusPopup;
  window.closeHomeProfilePopup = closeHomeProfilePopup;
  window.closeDeleteAccountPopup = closeDeleteAccountPopup;
  window.closeInfoBoxPopup = closeInfoBoxPopup;
  window.saveStatus = saveStatus;
  window.saveHomeProfileSettings = saveHomeProfileSettings;
  window.resetHomeProfileSettings = resetHomeProfileSettings;
  window.openImageViewer = openImageViewer;
  window.closeImageViewer = closeImageViewer;
  window.confirmDeleteAccount = confirmDeleteAccount;
  window.removeFriendFromViewedUser = removeFriendFromViewedUser;
  window.openRelationshipPartnerProfile = openRelationshipPartnerProfile;
  window.openInfoBoxPopup = openInfoBoxPopup;
  window.saveInfoBoxSettings = saveInfoBoxSettings;

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
    closeInfoBoxPopupSafe();
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

    if (section === "infoBox") {
      if (isOwnProfile()) {
        await openInfoBoxPopup();
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
})();