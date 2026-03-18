(function (window, $) {
  var CIRCLE_BASES = [
    { fallback: "#bbbbbb", x: 0.1, y: 0.3, radius: 0.18 },
    { fallback: "#b3b3b3", x: 0.9, y: 0.8, radius: 0.15 },
    { fallback: "#b6b6b6", x: 0.68, y: 0.4, radius: 0.2 },
    { fallback: "#b9b9b9", x: 0.25, y: 0.4, radius: 0.15 },
    { fallback: "#cccccc", x: 0.11, y: 0.7, radius: 0.15 },
    { fallback: "#c3c3c3", x: 0.18, y: 0.1, radius: 0.15 },
    { fallback: "#c6c6c6", x: 0.4, y: 0.2, radius: 0.15 },
    { fallback: "#c9c9c9", x: 0.55, y: -0.04, radius: 0.18 },
    { fallback: "#d3d3d3", x: 0, y: 0.95, radius: 0.13 },
    { fallback: "#d6d6d6", x: 0.5, y: 0.8, radius: 0.22 },
    { fallback: "#d9d9d9", x: 0.9, y: 0.1, radius: 0.18 },
    { fallback: "#eeeeee", x: 0.3, y: 0.9, radius: 0.18 },
    { fallback: "#e3e3e3", x: 0.93, y: 0.5, radius: 0.14 },
    { fallback: "#e6e6e6", x: 0.7, y: 0.9, radius: 0.15 }
  ];
  var VARIANTS = [
    {
      name: "settle",
      points: [
        [0.1, 0.3, 0, 1],
        [0.9, 0.8, 0.15, 0.85],
        [0.68, 0.4, 0, 0.9],
        [0.25, 0.4, 0.21, 0.79],
        [0.11, 0.7, 0.3, 0.7],
        [0.18, 0.1, 0.45, 0.55],
        [0.4, 0.2, 0, 0.75],
        [0.55, -0.04, 0.48, 0.52],
        [0, 0.95, 0.21, 0.79],
        [0.5, 0.8, 0.1, 0.9],
        [0.9, 0.1, 0.25, 0.75],
        [0.3, 0.9, 0.18, 0.82],
        [0.93, 0.5, 0.4, 0.6],
        [0.7, 0.9, 0.13, 0.87]
      ]
    },
    {
      name: "top-left",
      points: [
        [-0.3, -0.2, 0.06, 1],
        [-0.1, -0.3, 0.12, 1],
        [-0.2, -0.5, 0, 1],
        [-0.1, -0.3, 0.24, 1],
        [-0.3, -0.4, 0.4, 1],
        [-0.5, -0.1, 0.76, 1],
        [-0.2, -0.1, 0.62, 1],
        [-0.3, -0.3, 0.48, 1],
        [-0.4, -0.1, 0.05, 1],
        [-0.5, -0.2, 0.6, 1],
        [-0.3, -0.25, 0.75, 1],
        [-0.1, -0.4, 0.3, 1],
        [-0.2, -0.35, 0.95, 1],
        [-0.15, -0.25, 0.2, 1]
      ]
    },
    {
      name: "bottom-right",
      points: [
        [1.3, 1.2, 0.06, 1],
        [1.1, 1.3, 0.12, 1],
        [1.2, 1.5, 0, 1],
        [1.1, 1.3, 0.24, 1],
        [1.3, 1.4, 0.4, 1],
        [1.5, 1.1, 0.76, 1],
        [1.2, 1.1, 0.62, 1],
        [1.3, 1.3, 0.48, 1],
        [1.4, 1.1, 0.05, 1],
        [1.5, 1.2, 0.6, 1],
        [1.3, 1.25, 0.75, 1],
        [1.1, 1.4, 0.3, 1],
        [1.2, 1.35, 0.95, 1],
        [1.15, 1.25, 0.2, 1]
      ]
    },
    {
      name: "bottom-band",
      points: [
        [0.1, 1.3, 0, 1],
        [0.9, 1.34, 0.15, 0.85],
        [0.68, 1.23, 0, 0.9],
        [0.25, 1.5, 0.21, 0.79],
        [0.11, 1.2, 0.3, 0.7],
        [0.18, 1.4, 0.16, 0.84],
        [0.4, 1.17, 0, 0.75],
        [0.55, 1.2, 0, 0.52],
        [0, 1.5, 0.21, 0.79],
        [0.5, 1.45, 0, 0.9],
        [0.9, 1.34, 0.25, 0.75],
        [0.3, 1.6, 0.18, 0.82],
        [0.93, 1.2, 0.09, 0.91],
        [0.7, 1.15, 0.13, 0.87]
      ]
    },
    {
      name: "top-band",
      points: [
        [0.1, -0.3, 0, 1],
        [0.9, -0.34, 0.15, 0.85],
        [0.68, -0.23, 0, 0.9],
        [0.25, -0.5, 0.21, 0.79],
        [0.11, -0.2, 0.3, 0.7],
        [0.18, -0.4, 0.16, 0.84],
        [0.4, -0.17, 0, 0.75],
        [0.55, -0.2, 0, 0.52],
        [0, -0.5, 0.21, 0.79],
        [0.5, -0.45, 0, 0.9],
        [0.9, -0.34, 0.25, 0.75],
        [0.3, -0.6, 0.18, 0.82],
        [0.93, -0.2, 0.09, 0.91],
        [0.7, -0.15, 0.13, 0.87]
      ]
    },
    {
      name: "crosswind",
      points: [
        [-0.2, -0.1, 0, 1],
        [1.3, 1.1, 0.15, 0.85],
        [0.48, 1.4, 0, 0.9],
        [1.2, 1.6, 0.21, 0.79],
        [1.11, -0.15, 0.3, 0.7],
        [0.28, 1.3, 0.16, 0.84],
        [-0.1, -0.4, 0, 0.75],
        [0.15, 1.3, 0, 0.52],
        [-0.5, 0.85, 0.21, 0.79],
        [-0.2, 0.7, 0, 0.9],
        [1.4, 0.2, 0.25, 0.75],
        [1.1, 1.5, 0.18, 0.82],
        [-0.43, -0.2, 0.09, 0.91],
        [0.7, 1.5, 0.13, 0.87]
      ]
    }
  ];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before circles.js.");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseImageUrl(value) {
    var match = /url\((['"]?)([^'")]+)\1\)/.exec(String(value || ""));
    return match ? match[2] : "";
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function getImageUrl($slide) {
    return parseImageUrl(getSlideImageValue($slide));
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearFrame(instance) {
    if (!instance._circlesFrameId) {
      return;
    }

    window.cancelAnimationFrame(instance._circlesFrameId);
    instance._circlesFrameId = null;
  }

  function ensureStage(instance) {
    var $stage;
    var $canvas;

    if (instance.$circlesStage && instance.$circlesStage.length) {
      return instance.$circlesStage;
    }

    $stage = instance.$viewport.children(".sliderx__circles-stage");

    if (!$stage.length) {
      $stage = $('<div class="sliderx__circles-stage" aria-hidden="true"><canvas class="sliderx__circles-canvas"></canvas></div>').appendTo(instance.$viewport);
    }

    $canvas = $stage.children(".sliderx__circles-canvas");
    instance.$circlesStage = $stage;
    instance.$circlesCanvas = $canvas;
    instance._circlesCanvasElement = $canvas[0];
    instance._circlesContext = instance._circlesCanvasElement.getContext("2d", { willReadFrequently: true });
    return $stage;
  }

  function resetCanvas(instance) {
    var canvas = instance._circlesCanvasElement;
    var context = instance._circlesContext;

    if (!canvas || !context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas(instance, width, height) {
    var canvas = instance._circlesCanvasElement;
    var dpr = window.devicePixelRatio || 1;

    if (!canvas) {
      return;
    }

    instance._circlesViewportWidth = width;
    instance._circlesViewportHeight = height;
    instance._circlesDpr = dpr;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  function getImageEntry(instance, url) {
    var entry;
    var image;

    if (!url) {
      return null;
    }

    if (instance._circlesImageCache[url]) {
      return instance._circlesImageCache[url];
    }

    entry = {
      url: url,
      image: null,
      loaded: false,
      errored: false,
      samples: null
    };
    image = new window.Image();
    image.decoding = "async";
    image.onload = function () {
      entry.loaded = true;
    };
    image.onerror = function () {
      entry.errored = true;
    };
    image.src = url;
    entry.image = image;
    entry.loaded = image.complete && image.naturalWidth > 0;
    instance._circlesImageCache[url] = entry;
    return entry;
  }

  function sampleDominantColor(context, x, y, size) {
    var imageData;
    var colors = {};
    var winner = "";
    var winnerCount = 0;
    var index;

    try {
      imageData = context.getImageData(x, y, size, size).data;
    } catch (error) {
      return null;
    }

    for (index = 0; index < imageData.length; index += 4) {
      if (imageData[index + 3] < 48) {
        continue;
      }

      var key = imageData[index] + "," + imageData[index + 1] + "," + imageData[index + 2];
      colors[key] = (colors[key] || 0) + 1;

      if (colors[key] > winnerCount) {
        winner = key;
        winnerCount = colors[key];
      }
    }

    if (!winner) {
      return null;
    }

    return "rgb(" + winner + ")";
  }

  function getCircleColors(entry) {
    var canvas;
    var context;

    if (!entry || entry.samples) {
      return entry && entry.samples ? entry.samples : CIRCLE_BASES.map(function (base) {
        return base.fallback;
      });
    }

    if (!entry.loaded || entry.errored || !entry.image || !entry.image.naturalWidth || !entry.image.naturalHeight) {
      return CIRCLE_BASES.map(function (base) {
        return base.fallback;
      });
    }

    canvas = document.createElement("canvas");
    canvas.width = entry.image.naturalWidth;
    canvas.height = entry.image.naturalHeight;
    context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return CIRCLE_BASES.map(function (base) {
        return base.fallback;
      });
    }

    context.drawImage(entry.image, 0, 0, canvas.width, canvas.height);
    entry.samples = CIRCLE_BASES.map(function (base) {
      var sampleX = clamp(Math.round(Math.abs(base.x) * canvas.width), 0, Math.max(0, canvas.width - 2));
      var sampleY = clamp(Math.round(Math.abs(base.y) * canvas.height), 0, Math.max(0, canvas.height - 2));
      return sampleDominantColor(context, sampleX, sampleY, 2) || base.fallback;
    });
    return entry.samples;
  }

  function easeOutBackCubic(value) {
    var squared = value * value;
    return clamp(
      (-1.5 * squared * value * squared)
      + (2 * squared * squared)
      + (4 * squared * value)
      - (9 * squared)
      + (5.5 * value),
      0,
      1.4
    );
  }

  function drawCircles(instance, progress, variant, colors) {
    var context = instance._circlesContext;
    var width = instance._circlesViewportWidth || 1;
    var height = instance._circlesViewportHeight || 1;
    var dpr = instance._circlesDpr || 1;
    var radiusScale = width;
    var index;

    if (!context) {
      return;
    }

    if (width / height <= 1.8 && width / height > 0.7) {
      radiusScale *= 2;
    } else if (width / height <= 0.7) {
      radiusScale = 2 * height;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, instance._circlesCanvasElement.width, instance._circlesCanvasElement.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (index = 0; index < variant.points.length; index += 1) {
      var origin = variant.points[index];
      var base = CIRCLE_BASES[index];
      var stretch = 2 - origin[3];
      var offset = origin[2] * (1 - progress);
      var value = clamp((progress * stretch) - offset, 0, 1);
      var eased = easeOutBackCubic(value);
      var centerX = (origin[0] + ((base.x - origin[0]) * eased)) * width;
      var centerY = (origin[1] + ((base.y - origin[1]) * eased)) * height;
      var radius = base.radius * eased * radiusScale;

      if (radius <= 0.5) {
        continue;
      }

      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
      context.fillStyle = colors[index] || base.fallback;
      context.fill();
    }
  }

  function clearState(instance) {
    clearTimer(instance, "_circlesCleanupTimer");
    clearFrame(instance);
    resetCanvas(instance);

    if (instance.$circlesStage && instance.$circlesStage.length) {
      instance.$circlesStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-circles-phase");
    instance.$root.removeAttr("data-circles-content");
    instance.$root.removeAttr("data-circles-cover");
    instance.$root.removeAttr("data-circles-reveal");
    instance.$root.removeAttr("data-circles-source");
  }

  function primeInstance(instance) {
    if (instance._circlesPrimed) {
      return;
    }

    instance._circlesPrimed = true;
    instance._circlesImageCache = {};
    ensureStage(instance);
    instance.$slides.each(function () {
      getImageEntry(instance, getImageUrl($(this)));
    });
  }

  function getVariantPair(instance) {
    var index = typeof instance._circlesVariantIndex === "number" ? instance._circlesVariantIndex : 0;
    var cover = VARIANTS[index % VARIANTS.length];
    var reveal = VARIANTS[(index + 2) % VARIANTS.length];

    instance._circlesVariantIndex = index + 1;
    return {
      cover: cover,
      reveal: reveal
    };
  }

  function startAnimation(instance, cover, reveal, colors) {
    var totalDuration = instance.options.animationDuration;
    var halfDuration = Math.max(180, totalDuration / 2);
    var contentRevealAt = Math.round(totalDuration * 0.84);
    var startTime = null;

    function step(timestamp) {
      var elapsed;
      var progress;

      if (!startTime) {
        startTime = timestamp;
      }

      elapsed = timestamp - startTime;

      if (elapsed < halfDuration) {
        instance.$root.attr("data-circles-phase", "cover");
        instance.$root.attr("data-circles-content", "hidden");
        progress = clamp(elapsed / halfDuration, 0, 1);
        drawCircles(instance, progress, cover, colors);
        instance._circlesFrameId = window.requestAnimationFrame(step);
        return;
      }

      if (elapsed < totalDuration) {
        instance.$root.attr("data-circles-phase", "reveal");
        if (elapsed >= contentRevealAt) {
          instance.$root.attr("data-circles-content", "visible");
        }

        progress = clamp(1 - ((elapsed - halfDuration) / Math.max(1, totalDuration - halfDuration)), 0, 1);
        drawCircles(instance, progress, reveal, colors);
        instance._circlesFrameId = window.requestAnimationFrame(step);
        return;
      }

      clearFrame(instance);
      resetCanvas(instance);
    }

    instance._circlesFrameId = window.requestAnimationFrame(step);
  }

  function applyCirclesState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var previousSlide = instance.$slides.eq(previousIndex);
    var targetSlide = instance.$slides.eq(targetIndex);
    var previousEntry;
    var targetEntry;
    var pair;
    var sourceEntry;
    var colors;
    var viewportWidth;
    var viewportHeight;

    primeInstance(instance);
    previousEntry = getImageEntry(instance, getImageUrl(previousSlide));
    targetEntry = getImageEntry(instance, getImageUrl(targetSlide));
    pair = getVariantPair(instance);
    sourceEntry = pair.cover.name === "settle" ? targetEntry : previousEntry;
    colors = getCircleColors(sourceEntry);
    viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;

    clearState(instance);
    resizeCanvas(instance, viewportWidth, viewportHeight);

    instance.$circlesStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });
    instance.$root.attr("data-circles-phase", "cover");
    instance.$root.attr("data-circles-content", "hidden");
    instance.$root.attr("data-circles-cover", pair.cover.name);
    instance.$root.attr("data-circles-reveal", pair.reveal.name);
    instance.$root.attr("data-circles-source", sourceEntry === targetEntry ? "target" : "previous");

    startAnimation(instance, pair.cover, pair.reveal, colors);

    instance._circlesCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 100);
  }

  window.SliderX.registerAnimation("circles", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyCirclesState(instance, payload || {});
    }
  });
})(window, window.jQuery);
