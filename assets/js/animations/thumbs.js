(function (window, $) {
  var THUMB_SLOTS = [
    { x: 0.03, y: 0.05, w: 0.15, h: 0.18, r: -8 },
    { x: 0.21, y: 0.06, w: 0.13, h: 0.16, r: -4 },
    { x: 0.42, y: 0.04, w: 0.12, h: 0.15, r: -2 },
    { x: 0.68, y: 0.05, w: 0.15, h: 0.18, r: 5 },
    { x: 0.84, y: 0.09, w: 0.12, h: 0.15, r: 8 },
    { x: 0.02, y: 0.3, w: 0.14, h: 0.17, r: -7 },
    { x: 0.84, y: 0.31, w: 0.14, h: 0.17, r: 7 },
    { x: 0.03, y: 0.58, w: 0.15, h: 0.18, r: -5 },
    { x: 0.83, y: 0.58, w: 0.15, h: 0.18, r: 5 },
    { x: 0.08, y: 0.79, w: 0.14, h: 0.16, r: -6 },
    { x: 0.28, y: 0.81, w: 0.13, h: 0.15, r: 4 },
    { x: 0.47, y: 0.82, w: 0.12, h: 0.14, r: 2 },
    { x: 0.64, y: 0.8, w: 0.13, h: 0.15, r: -4 },
    { x: 0.8, y: 0.77, w: 0.15, h: 0.17, r: 6 }
  ];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before thumbs.js.");
  }

  function ensureStage(instance) {
    if (instance.$thumbsStage && instance.$thumbsStage.length) {
      return instance.$thumbsStage;
    }

    instance.$thumbsStage = instance.$viewport.children(".sliderx__thumbs-stage");

    if (!instance.$thumbsStage.length) {
      instance.$thumbsStage = $('<div class="sliderx__thumbs-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    return instance.$thumbsStage;
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearState(instance) {
    clearTimer(instance, "_thumbsCleanupTimer");
    clearTimer(instance, "_thumbsSwapTimer");
    clearTimer(instance, "_thumbsSettleTimer");

    if (instance.$thumbsStage && instance.$thumbsStage.length) {
      instance.$thumbsStage.empty();
    }

    instance.$root.removeAttr("data-thumbs-phase");
    instance.$root.removeAttr("data-thumbs-target-slot");
    instance.$root.removeAttr("data-thumbs-content");
  }

  function primeInstance(instance) {
    if (instance._thumbsPrimed) {
      return;
    }

    instance._thumbsPrimed = true;
    ensureStage(instance);
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function getFocusLayout(viewportWidth, viewportHeight) {
    var width = viewportWidth * 0.62;
    var height = viewportHeight * 0.72;

    return {
      width: width,
      height: height,
      x: (viewportWidth - width) / 2,
      y: (viewportHeight - height) / 2,
      rotate: 0
    };
  }

  function getFullLayout(viewportWidth, viewportHeight) {
    return {
      width: viewportWidth,
      height: viewportHeight,
      x: 0,
      y: 0,
      rotate: 0
    };
  }

  function getThumbLayout(slot, viewportWidth, viewportHeight) {
    return {
      width: viewportWidth * slot.w,
      height: viewportHeight * slot.h,
      x: viewportWidth * slot.x,
      y: viewportHeight * slot.y,
      rotate: slot.r
    };
  }

  function buildCard(instance, options) {
    var $card = $('<div class="sliderx__thumb-card"></div>').addClass(options.roleClass);
    var $photo = $('<div class="sliderx__thumb-photo"></div>');

    $card.attr({
      "data-thumb-slot": options.slotIndex,
      "data-thumb-role": options.roleName,
      "data-thumb-slide-index": options.slideIndex
    });
    $card.css({
      "--sliderx-thumb-x": options.thumb.x + "px",
      "--sliderx-thumb-y": options.thumb.y + "px",
      "--sliderx-thumb-width": options.thumb.width + "px",
      "--sliderx-thumb-height": options.thumb.height + "px",
      "--sliderx-thumb-rotate": options.thumb.rotate + "deg",
      "--sliderx-focus-x": options.focus.x + "px",
      "--sliderx-focus-y": options.focus.y + "px",
      "--sliderx-focus-width": options.focus.width + "px",
      "--sliderx-focus-height": options.focus.height + "px",
      "--sliderx-focus-rotate": options.focus.rotate + "deg",
      "--sliderx-full-x": options.full.x + "px",
      "--sliderx-full-y": options.full.y + "px",
      "--sliderx-full-width": options.full.width + "px",
      "--sliderx-full-height": options.full.height + "px",
      "--sliderx-full-rotate": options.full.rotate + "deg"
    });

    $photo.css("backgroundImage", options.imageValue);
    $card.append($photo);
    instance.$thumbsStage.append($card);
  }

  function applyThumbsState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var focusLayout = getFocusLayout(viewportWidth, viewportHeight);
    var fullLayout = getFullLayout(viewportWidth, viewportHeight);
    var previousSlotIndex;
    var targetSlotIndex;
    var fillerIndex = 0;
    var slotIndex;

    primeInstance(instance);
    clearState(instance);

    if (typeof instance._thumbsTargetSlotIndex !== "number") {
      instance._thumbsTargetSlotIndex = 0;
    }

    targetSlotIndex = instance._thumbsTargetSlotIndex % THUMB_SLOTS.length;
    previousSlotIndex = (targetSlotIndex + Math.floor(THUMB_SLOTS.length / 2)) % THUMB_SLOTS.length;
    instance._thumbsTargetSlotIndex += 1;

    instance.$thumbsStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    instance.$root.attr("data-thumbs-phase", "collapse");
    instance.$root.attr("data-thumbs-target-slot", targetSlotIndex);
    instance.$root.attr("data-thumbs-content", "hidden");

    for (slotIndex = 0; slotIndex < THUMB_SLOTS.length; slotIndex += 1) {
      var thumbLayout = getThumbLayout(THUMB_SLOTS[slotIndex], viewportWidth, viewportHeight);
      var slideIndex;
      var roleName = "static";
      var roleClass = "is-static";

      if (slotIndex === previousSlotIndex) {
        slideIndex = previousIndex;
        roleName = "previous";
        roleClass = "is-previous-focus";
      } else if (slotIndex === targetSlotIndex) {
        slideIndex = targetIndex;
        roleName = "target";
        roleClass = "is-target-focus";
      } else {
        slideIndex = fillerIndex % instance.total;

        while (slideIndex === previousIndex || slideIndex === targetIndex) {
          fillerIndex += 1;
          slideIndex = fillerIndex % instance.total;
        }

        fillerIndex += 1;
      }

      buildCard(instance, {
        slotIndex: slotIndex,
        roleName: roleName,
        roleClass: roleClass,
        slideIndex: slideIndex,
        imageValue: getSlideImageValue(instance.$slides.eq(slideIndex)),
        thumb: thumbLayout,
        focus: focusLayout,
        full: fullLayout
      });
    }

    instance._thumbsSwapTimer = window.setTimeout(function () {
      instance.$root.attr("data-thumbs-phase", "swap");
    }, Math.round(instance.options.animationDuration * 0.24));

    instance._thumbsSettleTimer = window.setTimeout(function () {
      instance.$root.attr("data-thumbs-phase", "settle");
    }, Math.round(instance.options.animationDuration * 0.6));

    instance._thumbsCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 90);
  }

  window.SliderX.registerAnimation("thumbs", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      applyThumbsState(instance, payload || {});
    }
  });
})(window, window.jQuery);
