(function (window) {
  var SHIFT_DIRECTIONS = ["left", "right", "down", "up"];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before shift.js.");
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearState(instance) {
    clearTimer(instance, "_shiftCleanupTimer");
    instance.$root.removeAttr("data-shift-direction");
  }

  function primeInstance(instance) {
    if (typeof instance._shiftDirectionIndex !== "number") {
      instance._shiftDirectionIndex = 0;
    }
  }

  function getNextDirection(instance) {
    var direction = SHIFT_DIRECTIONS[instance._shiftDirectionIndex % SHIFT_DIRECTIONS.length];
    instance._shiftDirectionIndex = (instance._shiftDirectionIndex + 1) % SHIFT_DIRECTIONS.length;
    return direction;
  }

  window.SliderX.registerAnimation("shift", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance) {
      var direction;

      primeInstance(instance);
      clearState(instance);
      direction = getNextDirection(instance);
      instance.$root.attr("data-shift-direction", direction);
      instance._shiftCleanupTimer = window.setTimeout(function () {
        clearState(instance);
      }, instance.options.animationDuration + 90);
    }
  });
})(window);
