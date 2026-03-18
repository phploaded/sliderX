(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before slidey.js.");
  }

  window.SliderX.registerAnimation("slidey", {
    mode: "strip",
    getTrackOffset: function (index) {
      return "translate3d(0, " + (-index * 100) + "%, 0)";
    }
  });
})(window);
