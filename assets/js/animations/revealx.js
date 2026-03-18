(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before revealx.js.");
  }

  window.SliderX.registerAnimation("revealx", {
    mode: "layered"
  });
})(window);
