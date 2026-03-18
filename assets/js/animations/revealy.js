(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before revealy.js.");
  }

  window.SliderX.registerAnimation("revealy", {
    mode: "layered"
  });
})(window);
