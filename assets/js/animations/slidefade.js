(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before slidefade.js.");
  }

  window.SliderX.registerAnimation("slidefade", {
    mode: "layered"
  });
})(window);
