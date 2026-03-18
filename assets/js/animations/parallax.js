(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before parallax.js.");
  }

  window.SliderX.registerAnimation("parallax", {
    mode: "layered"
  });
})(window);
