window.Heavenly = window.Heavenly || {};

Heavenly.close = async function () {
  if (Heavenly.env && Heavenly.env.closeApp && Heavenly.env.closeApp()) {
    return;
  }

  if (Heavenly.env && Heavenly.env.isFiveM && Heavenly.env.isFiveM()) {
    try {
      var resourceName = Heavenly.env.getResourceName
        ? Heavenly.env.getResourceName()
        : null;

      if (resourceName) {
        await fetch("https://" + resourceName + "/closeUi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
      }
    } catch (error) {
      console.warn("closeUi failed", error);
    }
  }

  if (Heavenly.ui && Heavenly.ui.showScreen) {
    Heavenly.ui.showScreen("loginScreen");
  }
};