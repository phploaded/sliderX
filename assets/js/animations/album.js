(function (window, $) {
  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before album.js.");
  }

  function ensureStage(instance) {
    var $stage;

    if (instance.$albumStage && instance.$albumStage.length) {
      return instance.$albumStage;
    }

    $stage = instance.$viewport.children(".sliderx__album-stage");

    if (!$stage.length) {
      $stage = $(
        '<div class="sliderx__album-stage" aria-hidden="true">'
        + '<div class="sliderx__album-static-current"></div>'
        + '<div class="sliderx__album-static-target"></div>'
        + '<div class="sliderx__album-leaf is-outgoing"></div>'
        + '<div class="sliderx__album-leaf is-incoming"></div>'
        + '<div class="sliderx__album-spine"></div>'
        + '</div>'
      ).appendTo(instance.$viewport);
    }

    instance.$albumStage = $stage;
    instance.$albumStaticCurrent = $stage.children(".sliderx__album-static-current");
    instance.$albumStaticTarget = $stage.children(".sliderx__album-static-target");
    instance.$albumOutgoing = $stage.children(".sliderx__album-leaf.is-outgoing");
    instance.$albumIncoming = $stage.children(".sliderx__album-leaf.is-incoming");
    instance.$albumSpine = $stage.children(".sliderx__album-spine");

    return instance.$albumStage;
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearState(instance) {
    clearTimer(instance, "_albumCleanupTimer");
    clearTimer(instance, "_albumPhaseTimer");

    if (instance.$albumStage && instance.$albumStage.length) {
      instance.$albumStage.removeAttr("style");
      instance.$albumStaticCurrent.removeAttr("style");
      instance.$albumStaticTarget.removeAttr("style");
      instance.$albumOutgoing.removeAttr("style");
      instance.$albumIncoming.removeAttr("style");
      instance.$albumSpine.removeAttr("style");
    }

    instance.$root.removeAttr("data-album-phase");
    instance.$root.removeAttr("data-album-side");
    instance.$root.removeAttr("data-album-content");
    instance.$root[0].style.removeProperty("--sliderx-album-perspective");
  }

  function primeInstance(instance) {
    if (instance._albumPrimed) {
      return;
    }

    instance._albumPrimed = true;
    ensureStage(instance);
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function applyAlbumState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var direction = payload && payload.direction === "prev" ? "prev" : "next";
    var side = direction === "prev" ? "left" : "right";
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var previousImage = getSlideImageValue(instance.$slides.eq(previousIndex));
    var targetImage = getSlideImageValue(instance.$slides.eq(targetIndex));
    var depth = Math.max(140, Math.round(viewportWidth * 0.22));

    primeInstance(instance);
    clearState(instance);

    instance.$root[0].style.setProperty("--sliderx-album-perspective", Math.round(viewportWidth * 2.2) + "px");
    instance.$root.attr("data-album-phase", "out");
    instance.$root.attr("data-album-side", side);
    instance.$root.attr("data-album-content", "hidden");

    instance.$albumStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px",
      "--sliderx-album-depth": depth + "px"
    });
    instance.$albumStaticCurrent.css("backgroundImage", previousImage);
    instance.$albumStaticTarget.css("backgroundImage", targetImage);
    instance.$albumOutgoing.css("backgroundImage", previousImage);
    instance.$albumIncoming.css("backgroundImage", targetImage);

    instance._albumPhaseTimer = window.setTimeout(function () {
      instance.$root.attr("data-album-phase", "in");
    }, Math.round(instance.options.animationDuration * 0.5));

    instance._albumCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 90);
  }

  window.SliderX.registerAnimation("album", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      applyAlbumState(instance, payload || {});
    }
  });
})(window, window.jQuery);
