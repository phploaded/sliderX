(function (window) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before slidex.js.");
  }

  window.SliderX.registerAnimation("slidex", {
    mode: "strip",
    getTrackOffset: function (index) {
      return "translate3d(" + (-index * 100) + "%, 0, 0)";
    }
  });
})(window);
