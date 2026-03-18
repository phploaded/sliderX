(function (window, $) {
  var CUBE_SIDES = ["left", "right", "down", "up"];
  var FALLBACK_SIDE_COLOR = "rgb(54, 61, 72)";

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before cubeover.js.");
  }

  function parseImageUrl(value) {
    var match = /url\((['"]?)([^'")]+)\1\)/.exec(String(value || ""));
    return match ? match[2] : "";
  }

  function bucketColorChannel(channel) {
    return Math.max(0, Math.min(255, Math.round(channel / 16) * 16));
  }

  function getDominantColor(image) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var size = 24;
    var data;
    var index;
    var key;
    var counts = {};
    var dominantKey = "";
    var dominantCount = 0;
    var fallbackKey = "";

    if (!context) {
      return FALLBACK_SIDE_COLOR;
    }

    canvas.width = size;
    canvas.height = size;
    context.drawImage(image, 0, 0, size, size);

    try {
      data = context.getImageData(0, 0, size, size).data;
    } catch (error) {
      return FALLBACK_SIDE_COLOR;
    }

    for (index = 0; index < data.length; index += 4) {
      var alpha = data[index + 3];
      var red = data[index];
      var green = data[index + 1];
      var blue = data[index + 2];

      if (alpha < 160) {
        continue;
      }

      key = [
        bucketColorChannel(red),
        bucketColorChannel(green),
        bucketColorChannel(blue)
      ].join(",");

      if (!fallbackKey) {
        fallbackKey = key;
      }

      if (
        (red < 18 && green < 18 && blue < 18)
        || (red > 245 && green > 245 && blue > 245)
      ) {
        continue;
      }

      counts[key] = (counts[key] || 0) + 1;

      if (counts[key] > dominantCount) {
        dominantKey = key;
        dominantCount = counts[key];
      }
    }

    key = dominantKey || fallbackKey;

    if (!key) {
      return FALLBACK_SIDE_COLOR;
    }

    return "rgb(" + key + ")";
  }

  function ensureCubeSide(instance) {
    if (instance.$cubeOverSide && instance.$cubeOverSide.length) {
      return instance.$cubeOverSide;
    }

    instance.$cubeOverSide = instance.$bgStage.children(".sliderx__cube-side");

    if (!instance.$cubeOverSide.length) {
      instance.$cubeOverSide = $('<div class="sliderx__cube-side" aria-hidden="true"></div>').appendTo(instance.$bgStage);
    }

    return instance.$cubeOverSide;
  }

  function getSlideImageUrl($slide) {
    return parseImageUrl(
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    );
  }

  function cacheSideColor(instance, url) {
    var image;

    if (!url || instance._cubeOverColorCache[url] || instance._cubeOverLoading[url]) {
      return;
    }

    instance._cubeOverLoading[url] = true;
    image = new window.Image();
    image.onload = function () {
      instance._cubeOverColorCache[url] = getDominantColor(image);
      delete instance._cubeOverLoading[url];

      if (instance._cubeOverPendingColorUrl === url) {
        instance.$root[0].style.setProperty("--sliderx-cube-side-color", instance._cubeOverColorCache[url]);
      }
    };
    image.onerror = function () {
      instance._cubeOverColorCache[url] = FALLBACK_SIDE_COLOR;
      delete instance._cubeOverLoading[url];
    };
    image.src = url;
  }

  function primeInstance(instance) {
    if (instance._cubeOverPrimed) {
      return;
    }

    instance._cubeOverPrimed = true;
    instance._cubeOverColorCache = {};
    instance._cubeOverLoading = {};
    ensureCubeSide(instance);

    instance.$slides.each(function () {
      var url = getSlideImageUrl($(this));
      cacheSideColor(instance, url);
    });
  }

  function applyCubeState(instance, targetIndex) {
    var side;
    var width;
    var height;
    var depth;
    var targetSlide = instance.$slides.eq(targetIndex);
    var imageUrl = getSlideImageUrl(targetSlide);
    var sideColor;

    if (typeof instance._cubeOverSideIndex !== "number") {
      instance._cubeOverSideIndex = 0;
    }

    side = CUBE_SIDES[instance._cubeOverSideIndex];
    instance._cubeOverSideIndex = (instance._cubeOverSideIndex + 1) % CUBE_SIDES.length;

    width = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    height = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    depth = side === "left" || side === "right" ? width / 2 : height / 2;
    sideColor = imageUrl ? (instance._cubeOverColorCache[imageUrl] || FALLBACK_SIDE_COLOR) : FALLBACK_SIDE_COLOR;

    instance._cubeOverPendingColorUrl = imageUrl;
    cacheSideColor(instance, imageUrl);
    ensureCubeSide(instance);
    instance.$root.attr("data-cubeover-side", side);
    instance.$root[0].style.setProperty("--sliderx-cube-depth", depth + "px");
    instance.$root[0].style.setProperty("--sliderx-cube-origin-depth", "-" + depth + "px");
    instance.$root[0].style.setProperty("--sliderx-cube-side-color", sideColor);
  }

  window.SliderX.registerAnimation("cubeover", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyCubeState(instance, payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex);
    }
  });
})(window, window.jQuery);
