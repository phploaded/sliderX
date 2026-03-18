(function (window, $) {
  var SLICE_COUNT = 15;
  var SLICE_PATTERNS = [
    { name: "slicedownright", motion: "down", order: "forward" },
    { name: "slicedownleft", motion: "down", order: "reverse" },
    { name: "sliceupright", motion: "up", order: "forward" },
    { name: "sliceupleft", motion: "up", order: "reverse" },
    { name: "sliceupdownright", motion: "alternate", order: "forward" },
    { name: "sliceupdownleft", motion: "alternate", order: "reverse" },
    { name: "fold", motion: "fold", order: "forward" }
  ];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before slices.js.");
  }

  function ensureStage(instance) {
    if (instance.$slicesStage && instance.$slicesStage.length) {
      return instance.$slicesStage;
    }

    instance.$slicesStage = instance.$viewport.children(".sliderx__slices-stage");

    if (!instance.$slicesStage.length) {
      instance.$slicesStage = $('<div class="sliderx__slices-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    return instance.$slicesStage;
  }

  function clearCleanupTimer(instance) {
    if (!instance._slicesCleanupTimer) {
      return;
    }

    window.clearTimeout(instance._slicesCleanupTimer);
    instance._slicesCleanupTimer = null;
  }

  function clearStage(instance) {
    if (instance.$slicesStage && instance.$slicesStage.length) {
      instance.$slicesStage.empty();
    }
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function cloneSlide($slide) {
    return $slide
      .clone()
      .removeClass("is-active is-entering is-leaving")
      .removeAttr("aria-hidden");
  }

  function primeInstance(instance) {
    if (instance._slicesPrimed) {
      return;
    }

    instance._slicesPrimed = true;
    ensureStage(instance);
  }

  function buildSlice(instance, options) {
    var $slice = $('<div class="sliderx__slice"></div>');
    var $pane = $('<div class="sliderx__slice-pane"></div>');
    var $clone = cloneSlide(options.$targetSlide);

    $slice.attr("data-slice-index", options.sliceIndex);
    $slice.css({
      left: options.left + "px",
      width: options.width + "px",
      height: options.height + "px"
    });
    $slice[0].style.setProperty("--sliderx-slice-delay", options.delay + "ms");
    $slice[0].style.setProperty("--sliderx-slice-start-transform", options.startTransform);
    $slice[0].style.setProperty("--sliderx-slice-origin", options.origin);

    $pane.css({
      left: -options.left + "px",
      width: options.viewportWidth + "px",
      height: options.height + "px",
      backgroundImage: options.imageValue
    });
    $pane.append($clone);
    $slice.append($pane);
    instance.$slicesStage.append($slice);
  }

  function getStartTransform(pattern, sliceIndex) {
    if (pattern.motion === "down") {
      return "translate3d(0, -100%, 0)";
    }

    if (pattern.motion === "up") {
      return "translate3d(0, 100%, 0)";
    }

    if (pattern.motion === "alternate") {
      return sliceIndex % 2 ? "translate3d(0, -100%, 0)" : "translate3d(0, 100%, 0)";
    }

    return "scale3d(0.001, 1, 1)";
  }

  function getOrigin(pattern) {
    if (pattern.motion === "fold") {
      return "50% 50%";
    }

    return "50% 50%";
  }

  function applySlicesState(instance, payload) {
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var $targetSlide = instance.$slides.eq(targetIndex);
    var imageValue = getSlideImageValue($targetSlide);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var sliceWidth = viewportWidth / SLICE_COUNT;
    var patternIndex;
    var pattern;
    var sliceIndex;
    var delaySpan = instance.options.animationDuration * 0.45;

    clearCleanupTimer(instance);
    ensureStage(instance);
    clearStage(instance);

    if (typeof instance._slicesPatternIndex !== "number") {
      instance._slicesPatternIndex = 0;
    }

    patternIndex = instance._slicesPatternIndex % SLICE_PATTERNS.length;
    pattern = SLICE_PATTERNS[patternIndex];
    instance._slicesPatternIndex += 1;

    instance.$root.attr("data-slices-pattern", pattern.name);
    instance.$slicesStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    for (sliceIndex = 0; sliceIndex < SLICE_COUNT; sliceIndex += 1) {
      var orderIndex = pattern.order === "forward" ? sliceIndex : SLICE_COUNT - 1 - sliceIndex;
      var delay = SLICE_COUNT > 1 ? Math.round((orderIndex / (SLICE_COUNT - 1)) * delaySpan) : 0;
      var left = sliceIndex * sliceWidth;
      var width = sliceIndex === SLICE_COUNT - 1 ? viewportWidth - (sliceWidth * sliceIndex) : sliceWidth;

      buildSlice(instance, {
        sliceIndex: sliceIndex,
        left: left,
        width: width,
        height: viewportHeight,
        delay: delay,
        startTransform: getStartTransform(pattern, sliceIndex),
        origin: getOrigin(pattern),
        viewportWidth: viewportWidth,
        imageValue: imageValue,
        $targetSlide: $targetSlide
      });
    }

    instance._slicesCleanupTimer = window.setTimeout(function () {
      clearStage(instance);
      clearCleanupTimer(instance);
    }, instance.options.animationDuration + 120);
  }

  window.SliderX.registerAnimation("slices", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearCleanupTimer(instance);
      clearStage(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applySlicesState(instance, payload || {});
    }
  });
})(window, window.jQuery);
