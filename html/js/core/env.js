window.Heavenly = window.Heavenly || {};
Heavenly.env = Heavenly.env || {};

Heavenly.env.isFiveM = function () {
  return typeof window.GetParentResourceName === "function";
};

Heavenly.env.getResourceName = function () {
  if (!Heavenly.env.isFiveM()) return null;
  return window.GetParentResourceName();
};