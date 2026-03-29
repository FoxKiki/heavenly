window.Heavenly = window.Heavenly || {};

(function () {
  function removeKeys(keys) {
    keys.forEach(function (key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {}
    });
  }

  function resetHeavenlyPreviewData() {
    var keysToRemove = [];

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;

        if (
          key.indexOf("heavenly_") === 0 ||
          key === "heavenly_posts" ||
          key === "heavenly_news_posts" ||
          key === "heavenly_chats_global" ||
          key === "heavenlyFortune"
        ) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {}

    removeKeys(keysToRemove);
    return true;
  }

  window.resetHeavenlyPreviewData = resetHeavenlyPreviewData;
  Heavenly.dev = Heavenly.dev || {};
  Heavenly.dev.resetPreviewData = resetHeavenlyPreviewData;
})();
