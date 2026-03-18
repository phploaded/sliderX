(function (window, $) {
  var SIDE_CLONES = 2;
  var OFFSET_STEP = 90;
  var SIDE_ROTATION = 60;
  var CENTER_SCALE = 0.8;
  var SIDE_SCALE = 0.7;
  var HIDDEN_SCALE = 0.62;

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before swipe.js.");
  }

  function ensureStage(instance) {
    var $stage;

    if (instance.$swipeStage && instance.$swipeStage.length) {
      return instance.$swipeStage;
    }

    $stage = instance.$viewport.children(".sliderx__swipe-stage");

    if (!$stage.length) {
      $stage = $('<div class="sliderx__swipe-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    instance.$swipeStage = $stage;
    return $stage;
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function buildCardClone($slide, sourceIndex, slotIndex) {
    var slideImage = getSlideImageValue($slide);
    var $clone = $('<div class="sliderx__swipe-card"></div>');

    $clone.attr("aria-hidden", "true");
    $clone.attr("data-source-index", String(sourceIndex));
    $clone.attr("data-swipe-slot", String(slotIndex));
    $clone.css("--sliderx-swipe-card-image", slideImage);

    return $clone;
  }

  function rebuildStage(instance) {
    var total = instance.total;
    var slotIndex = 0;
    var prependIndex;
    var appendIndex;

    ensureStage(instance);
    instance.$swipeStage.empty();

    for (prependIndex = total - SIDE_CLONES; prependIndex < total; prependIndex += 1) {
      instance.$swipeStage.append(buildCardClone(instance.$slides.eq(prependIndex), prependIndex, slotIndex));
      slotIndex += 1;
    }

    instance.$slides.each(function (sourceIndex) {
      instance.$swipeStage.append(buildCardClone($(this), sourceIndex, slotIndex));
      slotIndex += 1;
    });

    for (appendIndex = 0; appendIndex < SIDE_CLONES; appendIndex += 1) {
      instance.$swipeStage.append(buildCardClone(instance.$slides.eq(appendIndex), appendIndex, slotIndex));
      slotIndex += 1;
    }

    instance.$swipeCards = instance.$swipeStage.children(".sliderx__swipe-card");
    instance._swipeSlideCount = total;
  }

  function primeInstance(instance) {
    if (instance._swipePrimed && instance._swipeSlideCount === instance.total) {
      return;
    }

    instance._swipePrimed = true;
    rebuildStage(instance);
  }

  function getAnchorForIndex(index) {
    return SIDE_CLONES + index;
  }

  function getTargetAnchor(previousIndex, targetIndex, direction, total) {
    if (direction === "next" && previousIndex === total - 1 && targetIndex === 0) {
      return SIDE_CLONES + total;
    }

    if (direction === "prev" && previousIndex === 0 && targetIndex === total - 1) {
      return SIDE_CLONES - 1;
    }

    return SIDE_CLONES + targetIndex;
  }

  function getCardState(relative) {
    var distance = Math.abs(relative);
    var sign = relative === 0 ? 0 : (relative > 0 ? 1 : -1);
    var scale = distance === 0 ? CENTER_SCALE : SIDE_SCALE;
    var offset = relative * OFFSET_STEP;
    var rotate = sign === 0 ? 0 : sign * -SIDE_ROTATION;
    var opacity = distance <= SIDE_CLONES ? 1 : 0;
    var visibility = distance <= SIDE_CLONES ? "visible" : "hidden";
    var zIndex = Math.max(1, 30 - distance * 6);
    var filter = "brightness(1)";

    if (distance > SIDE_CLONES) {
      scale = HIDDEN_SCALE;
      offset = sign * (OFFSET_STEP * (SIDE_CLONES + 1));
      rotate = sign === 0 ? 0 : sign * -SIDE_ROTATION;
      zIndex = 1;
      filter = "brightness(0.58)";
    } else if (distance === 1) {
      filter = "brightness(0.86)";
    } else if (distance === 2) {
      filter = "brightness(0.72)";
    }

    return {
      opacity: opacity,
      visibility: visibility,
      zIndex: zIndex,
      filter: filter,
      transform: "scale(" + scale + ") translate3d(" + offset + "%, 0, 0) rotateY(" + rotate + "deg)"
    };
  }

  function applyCardState($card, relative, duration) {
    var state = getCardState(relative);
    var element = $card[0];

    element.style.transition = duration
      ? "transform " + duration + "ms cubic-bezier(0.77, 0, 0.175, 1), opacity " + Math.max(180, Math.round(duration * 0.35)) + "ms ease"
      : "none";
    element.style.visibility = state.visibility;
    element.style.opacity = String(state.opacity);
    element.style.zIndex = String(state.zIndex);
    element.style.filter = state.filter;
    element.style.transform = state.transform;
  }

  function layoutStage(instance, anchor, duration) {
    instance.$swipeCards.each(function (slotIndex) {
      applyCardState($(this), slotIndex - anchor, duration);
    });
  }

  function clearState(instance) {
    clearTimer(instance, "_swipeAnimateTimer");
    clearTimer(instance, "_swipeCleanupTimer");

    if (instance.$swipeStage && instance.$swipeStage.length) {
      instance.$swipeStage.removeAttr("style");
    }

    if (instance.$swipeCards && instance.$swipeCards.length) {
      instance.$swipeCards.each(function () {
        this.style.transition = "";
        this.style.visibility = "";
        this.style.opacity = "";
        this.style.zIndex = "";
        this.style.filter = "";
        this.style.transform = "";
      });
    }

    instance.$root.removeAttr("data-swipe-direction");
    instance.$root.removeAttr("data-swipe-from-anchor");
    instance.$root.removeAttr("data-swipe-to-anchor");
  }

  function applySwipeState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var direction = payload && payload.direction === "prev" ? "prev" : "next";
    var fromAnchor = getAnchorForIndex(previousIndex);
    var toAnchor = getTargetAnchor(previousIndex, targetIndex, direction, instance.total);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;

    primeInstance(instance);
    clearState(instance);

    instance.$swipeStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    instance.$root.attr("data-swipe-direction", direction);
    instance.$root.attr("data-swipe-from-anchor", String(fromAnchor));
    instance.$root.attr("data-swipe-to-anchor", String(toAnchor));

    layoutStage(instance, fromAnchor, 0);

    instance._swipeAnimateTimer = window.setTimeout(function () {
      layoutStage(instance, toAnchor, instance.options.animationDuration);
    }, 20);

    instance._swipeCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 90);
  }

  window.SliderX.registerAnimation("swipe", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      applySwipeState(instance, payload || {});
    }
  });
})(window, window.jQuery);
