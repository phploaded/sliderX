(function (window, $) {
  var OPEN_SIDES = ["top", "right", "bottom", "left"];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before open.js.");
  }

  function ensureStage(instance) {
    var $stage;

    if (instance.$openStage && instance.$openStage.length) {
      return instance.$openStage;
    }

    $stage = instance.$viewport.children(".sliderx__open-stage");

    if (!$stage.length) {
      $stage = $(
        '<div class="sliderx__open-stage" aria-hidden="true">'
        + '<div class="sliderx__open-underlay"></div>'
        + '<div class="sliderx__open-leaf"></div>'
        + "</div>"
      ).appendTo(instance.$viewport);
    }

    instance.$openStage = $stage;
    instance.$openUnderlay = $stage.children(".sliderx__open-underlay");
    instance.$openLeaf = $stage.children(".sliderx__open-leaf");

    return instance.$openStage;
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearState(instance) {
    clearTimer(instance, "_openCleanupTimer");

    if (instance.$openUnderlay && instance.$openUnderlay.length) {
      instance.$openUnderlay.empty();
    }

    if (instance.$openLeaf && instance.$openLeaf.length) {
      instance.$openLeaf.empty();
    }

    if (instance.$openStage && instance.$openStage.length) {
      instance.$openStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-open-side");
  }

  function primeInstance(instance) {
    if (instance._openPrimed) {
      return;
    }

    instance._openPrimed = true;
    ensureStage(instance);
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function buildCardClone($slide) {
    var slideImage = getSlideImageValue($slide);
    var $clone = $slide.clone();

    $clone.removeClass("is-active is-entering is-leaving");
    $clone.addClass("sliderx__open-card");
    $clone.attr("aria-hidden", "true");
    $clone.css("--sliderx-open-card-image", slideImage);

    return $clone;
  }

  function applyOpenState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var side = OPEN_SIDES[instance._openSideIndex];

    primeInstance(instance);
    clearState(instance);

    instance.$root.attr("data-open-side", side);
    instance.$openUnderlay.append(buildCardClone(instance.$slides.eq(previousIndex)));
    instance.$openLeaf.append(buildCardClone(instance.$slides.eq(targetIndex)));

    instance._openCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 90);

    instance._openSideIndex = (instance._openSideIndex + 1) % OPEN_SIDES.length;
  }

  window.SliderX.registerAnimation("open", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);

      if (typeof instance._openSideIndex !== "number") {
        instance._openSideIndex = 0;
      }
    },
    onBeforeTransition: function (instance, payload) {
      if (typeof instance._openSideIndex !== "number") {
        instance._openSideIndex = 0;
      }

      applyOpenState(instance, payload || {});
    }
  });
})(window, window.jQuery);
