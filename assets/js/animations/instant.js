(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before instant.js.");
  }

  window.SliderX.registerAnimation("instant", {
    mode: "instant"
  });
})(window);
