(function (window, $) {
  var HYPNO_SAMPLES = [
    { fallback: "#bbbbbb", x: 0.5, y: 0.5 },
    { fallback: "#b3b3b3", x: 0.2, y: 0.2 },
    { fallback: "#b6b6b6", x: 0.5, y: 0.2 },
    { fallback: "#b9b9b9", x: 0.8, y: 0.2 },
    { fallback: "#cccccc", x: 0.2, y: 0.8 },
    { fallback: "#c3c3c3", x: 0.5, y: 0.8 },
    { fallback: "#c6c6c6", x: 0.8, y: 0.8 }
  ];
  var COVER_VARIANTS = [
    {
      name: "grow-out",
      points: [
        [0.5, 0.5, 0.7, 0.15],
        [0.5, 0.5, 0.6, 0.3],
        [0.5, 0.5, 0.5, 0.45],
        [0.5, 0.5, 0.4, 0.6],
        [0.5, 0.5, 0.3, 0.75],
        [0.5, 0.5, 0.2, 0.9],
        [0.5, 0.5, 0.1, 1]
      ]
    },
    {
      name: "grow-in",
      points: [
        [0.5, 0.5, 0.7, 1],
        [0.5, 0.5, 0.6, 0.9],
        [0.5, 0.5, 0.5, 0.75],
        [0.5, 0.5, 0.4, 0.6],
        [0.5, 0.5, 0.3, 0.45],
        [0.5, 0.5, 0.2, 0.3],
        [0.5, 0.5, 0.1, 0.15]
      ]
    }
  ];
  var REVEAL_VARIANTS = [
    {
      name: "collapse-out",
      points: [
        [0.5, 0.5, 0, 1],
        [0.5, 0.5, 0, 0.9],
        [0.5, 0.5, 0, 0.75],
        [0.5, 0.5, 0, 0.6],
        [0.5, 0.5, 0, 0.45],
        [0.5, 0.5, 0, 0.3],
        [0.5, 0.5, 0, 0.15]
      ]
    },
    {
      name: "collapse-in",
      points: [
        [0.5, 0.5, 0, 0.15],
        [0.5, 0.5, 0, 0.3],
        [0.5, 0.5, 0, 0.45],
        [0.5, 0.5, 0, 0.6],
        [0.5, 0.5, 0, 0.75],
        [0.5, 0.5, 0, 0.9],
        [0.5, 0.5, 0, 1]
      ]
    },
    {
      name: "drop-out",
      points: [
        [0.5, 7.5, 0.7, 0.75],
        [0.5, 7.5, 0.6, 0.15],
        [0.5, 7.5, 0.5, 1],
        [0.5, 7.5, 0.4, 0.3],
        [0.5, 7.5, 0.3, 0.45],
        [0.5, 7.5, 0.2, 0.6],
        [0.5, 7.5, 0.1, 0.9]
      ]
    },
    {
      name: "drop-in",
      points: [
        [0.5, 7.5, 0.7, 1],
        [0.5, 7.5, 0.6, 0.9],
        [0.5, 7.5, 0.5, 0.75],
        [0.5, 7.5, 0.4, 0.6],
        [0.5, 7.5, 0.3, 0.45],
        [0.5, 7.5, 0.2, 0.3],
        [0.5, 7.5, 0.1, 0.15]
      ]
    }
  ];
  var EASINGS = [
    { name: "back", fn: easeOutBack },
    { name: "back-cubic", fn: easeOutBackCubic },
    { name: "cubic", fn: easeOutCubic },
    { name: "expo", fn: easeOutExpo }
  ];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before hypno.js.");
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
    if (!instance._hypnoFrameId) {
      return;
    }

    window.cancelAnimationFrame(instance._hypnoFrameId);
    instance._hypnoFrameId = null;
  }

  function ensureStage(instance) {
    var $stage;
    var $canvas;

    if (instance.$hypnoStage && instance.$hypnoStage.length) {
      return instance.$hypnoStage;
    }

    $stage = instance.$viewport.children(".sliderx__hypno-stage");

    if (!$stage.length) {
      $stage = $('<div class="sliderx__hypno-stage" aria-hidden="true"><canvas class="sliderx__hypno-canvas"></canvas></div>').appendTo(instance.$viewport);
    }

    $canvas = $stage.children(".sliderx__hypno-canvas");
    instance.$hypnoStage = $stage;
    instance.$hypnoCanvas = $canvas;
    instance._hypnoCanvasElement = $canvas[0];
    instance._hypnoContext = instance._hypnoCanvasElement.getContext("2d", { willReadFrequently: true });
    return $stage;
  }

  function resetCanvas(instance) {
    var canvas = instance._hypnoCanvasElement;
    var context = instance._hypnoContext;

    if (!canvas || !context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas(instance, width, height) {
    var canvas = instance._hypnoCanvasElement;
    var dpr = window.devicePixelRatio || 1;

    if (!canvas) {
      return;
    }

    instance._hypnoViewportWidth = width;
    instance._hypnoViewportHeight = height;
    instance._hypnoDpr = dpr;
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

    if (instance._hypnoImageCache[url]) {
      return instance._hypnoImageCache[url];
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
    instance._hypnoImageCache[url] = entry;
    return entry;
  }

  function sampleDominantColor(context, left, top, size) {
    var imageData;
    var colors = {};
    var winner = "";
    var winnerCount = 0;
    var index;

    try {
      imageData = context.getImageData(left, top, size, size).data;
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

  function getBubbleColors(entry) {
    var canvas;
    var context;

    if (!entry || entry.samples) {
      return entry && entry.samples ? entry.samples : HYPNO_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    if (!entry.loaded || entry.errored || !entry.image || !entry.image.naturalWidth || !entry.image.naturalHeight) {
      return HYPNO_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    canvas = document.createElement("canvas");
    canvas.width = entry.image.naturalWidth;
    canvas.height = entry.image.naturalHeight;
    context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return HYPNO_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    context.drawImage(entry.image, 0, 0, canvas.width, canvas.height);
    entry.samples = HYPNO_SAMPLES.map(function (sample) {
      var sampleX = clamp(Math.round(sample.x * canvas.width), 0, Math.max(0, canvas.width - 2));
      var sampleY = clamp(Math.round(sample.y * canvas.height), 0, Math.max(0, canvas.height - 2));
      return sampleDominantColor(context, sampleX, sampleY, 2) || sample.fallback;
    });
    return entry.samples;
  }

  function easeOutBack(unused, value, start, delta, duration, overshoot) {
    var nextOvershoot = overshoot;

    if (typeof nextOvershoot === "undefined") {
      nextOvershoot = 1.70158;
    }

    return delta * (((value = value / duration - 1) * value * (((nextOvershoot + 1) * value) + nextOvershoot)) + 1) + start;
  }

  function easeOutBackCubic(unused, value, start, delta, duration) {
    var progress = value / duration;
    var squared = progress * progress;
    return start + (delta * ((((-1.5 * squared * progress) * squared) + (2 * squared * squared) + (4 * squared * progress) - (9 * squared) + (5.5 * progress))));
  }

  function easeOutCubic(unused, value, start, delta, duration) {
    return delta * (((value = value / duration - 1) * value * value) + 1) + start;
  }

  function easeOutExpo(unused, value, start, delta, duration) {
    if (value === duration) {
      return start + delta;
    }

    return (delta * (-Math.pow(2, (-10 * value) / duration) + 1)) + start;
  }

  function getScale(width, height) {
    var ratio = width / height;
    var scale = width;

    if (ratio <= 1.8 && ratio > 0.7) {
      scale *= 2;
    } else if (ratio <= 0.7) {
      scale = 2 * height;
    }

    return scale;
  }

  function drawBubbles(instance, normalizedProgress, points, targetPoints, easing, colors) {
    var context = instance._hypnoContext;
    var width = instance._hypnoViewportWidth || 1;
    var height = instance._hypnoViewportHeight || 1;
    var dpr = instance._hypnoDpr || 1;
    var scale = getScale(width, height);
    var index;

    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, instance._hypnoCanvasElement.width, instance._hypnoCanvasElement.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (index = 0; index < points.length; index += 1) {
      var point = points[index];
      var easedProgress = clamp(normalizedProgress - (point[3] * (1 - normalizedProgress)), 0, 1);
      var endPoint = targetPoints ? targetPoints[index] : null;
      var radius;
      var centerX;
      var centerY;

      if (easing && typeof easing.fn === "function") {
        easedProgress = easing.fn(1, easedProgress, 0, 1, 1, 1);
      }

      radius = point[2] * easedProgress * scale;

      if (endPoint) {
        radius = (point[2] + ((endPoint[2] - point[2]) * easedProgress)) * scale;
      }

      radius = Math.max(0, radius);
      centerX = (point[0] + (((endPoint ? endPoint[0] : 0.5) - point[0]) * easedProgress)) * width;
      centerY = (point[1] + (((endPoint ? endPoint[1] : 0.5) - point[1]) * easedProgress)) * height;

      if (radius <= 0.5) {
        continue;
      }

      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
      context.fillStyle = colors[index] || HYPNO_SAMPLES[index].fallback;
      context.fill();
    }
  }

  function clearState(instance) {
    clearTimer(instance, "_hypnoCleanupTimer");
    clearFrame(instance);
    resetCanvas(instance);

    if (instance.$hypnoStage && instance.$hypnoStage.length) {
      instance.$hypnoStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-hypno-phase");
    instance.$root.removeAttr("data-hypno-content");
    instance.$root.removeAttr("data-hypno-cover");
    instance.$root.removeAttr("data-hypno-reveal");
    instance.$root.removeAttr("data-hypno-easing");
    instance.$root.removeAttr("data-hypno-source");
  }

  function primeInstance(instance) {
    if (instance._hypnoPrimed) {
      return;
    }

    instance._hypnoPrimed = true;
    instance._hypnoImageCache = {};
    ensureStage(instance);
    instance.$slides.each(function () {
      getImageEntry(instance, getImageUrl($(this)));
    });
  }

  function getVariantSet(instance) {
    var index = typeof instance._hypnoVariantIndex === "number" ? instance._hypnoVariantIndex : 0;
    var set = {
      cover: COVER_VARIANTS[index % COVER_VARIANTS.length],
      reveal: REVEAL_VARIANTS[index % REVEAL_VARIANTS.length],
      easing: EASINGS[index % EASINGS.length]
    };

    instance._hypnoVariantIndex = index + 1;
    return set;
  }

  function startAnimation(instance, set, colors) {
    var totalDuration = instance.options.animationDuration;
    var halfDuration = Math.max(180, totalDuration / 2);
    var contentRevealAt = Math.round(totalDuration * 0.82);
    var startTime = null;

    function step(timestamp) {
      var elapsed;
      var progress;

      if (!startTime) {
        startTime = timestamp;
      }

      elapsed = timestamp - startTime;

      if (elapsed < halfDuration) {
        instance.$root.attr("data-hypno-phase", "cover");
        instance.$root.attr("data-hypno-content", "hidden");
        progress = clamp(elapsed / halfDuration, 0, 1);
        drawBubbles(instance, progress, set.cover.points, null, set.easing, colors);
        instance._hypnoFrameId = window.requestAnimationFrame(step);
        return;
      }

      if (elapsed < totalDuration) {
        instance.$root.attr("data-hypno-phase", "reveal");

        if (elapsed >= contentRevealAt) {
          instance.$root.attr("data-hypno-content", "visible");
        }

        progress = clamp((elapsed - halfDuration) / Math.max(1, totalDuration - halfDuration), 0, 1);
        drawBubbles(instance, 1 - progress, set.reveal.points, set.cover.points, set.easing, colors);
        instance._hypnoFrameId = window.requestAnimationFrame(step);
        return;
      }

      clearFrame(instance);
      resetCanvas(instance);
    }

    instance._hypnoFrameId = window.requestAnimationFrame(step);
  }

  function applyHypnoState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var previousSlide = instance.$slides.eq(previousIndex);
    var previousEntry;
    var colors;
    var set;
    var viewportWidth;
    var viewportHeight;

    primeInstance(instance);
    previousEntry = getImageEntry(instance, getImageUrl(previousSlide));
    colors = getBubbleColors(previousEntry);
    set = getVariantSet(instance);
    viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;

    clearState(instance);
    resizeCanvas(instance, viewportWidth, viewportHeight);

    instance.$hypnoStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });
    instance.$root.attr("data-hypno-phase", "cover");
    instance.$root.attr("data-hypno-content", "hidden");
    instance.$root.attr("data-hypno-cover", set.cover.name);
    instance.$root.attr("data-hypno-reveal", set.reveal.name);
    instance.$root.attr("data-hypno-easing", set.easing.name);
    instance.$root.attr("data-hypno-source", "previous");

    startAnimation(instance, set, colors);

    instance._hypnoCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 100);
  }

  window.SliderX.registerAnimation("hypno", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyHypnoState(instance, payload || {});
    }
  });
})(window, window.jQuery);
