window.Heavenly = window.Heavenly || {};
Heavenly.env = Heavenly.env || {};

Heavenly.env.isLbTablet = function () {
  return typeof window.fetchNui === "function" && typeof window.resourceName === "string";
};

Heavenly.env.isFiveM = function () {
  return Heavenly.env.isLbTablet() || typeof window.GetParentResourceName === "function";
};

Heavenly.env.getResourceName = function () {
  if (Heavenly.env.isLbTablet()) {
    return window.resourceName;
  }

  if (!Heavenly.env.isFiveM()) {
    return null;
  }

  return window.GetParentResourceName();
};