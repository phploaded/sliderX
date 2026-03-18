(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before slidez.js.");
  }

  window.SliderX.registerAnimation("slidez", {
    mode: "layered"
  });
})(window);
