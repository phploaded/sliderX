(function (window, $) {
  var LINE_SAMPLES = [
    { fallback: "rgb(187, 187, 187)", x: 0.1, y: 0.3 },
    { fallback: "rgb(179, 179, 179)", x: 0.9, y: 0.8 },
    { fallback: "rgb(182, 182, 182)", x: 0.68, y: 0.4 },
    { fallback: "rgb(185, 185, 185)", x: 0.25, y: 0.4 },
    { fallback: "rgb(204, 204, 204)", x: 0.11, y: 0.7 },
    { fallback: "rgb(195, 195, 195)", x: 0.18, y: 0.1 },
    { fallback: "rgb(198, 198, 198)", x: 0.4, y: 0.2 },
    { fallback: "rgb(201, 201, 201)", x: 0.55, y: 0.04 },
    { fallback: "rgb(211, 211, 211)", x: 0.0, y: 0.95 },
    { fallback: "rgb(214, 214, 214)", x: 0.5, y: 0.8 },
    { fallback: "rgb(217, 217, 217)", x: 0.9, y: 0.1 }
  ];
  var LINE_PROFILES = [
    { name: "arch", delays: [0.5, 0.4, 0.3, 0.2, 0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5] },
    { name: "reverse-arch", delays: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1, 0] },
    { name: "ramp-up", delays: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5] },
    { name: "ramp-down", delays: [0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0] },
    { name: "scatter", delays: [0.7, 0.3, 0, 0.1, 0.5, 0.3, 0.4, 0.1, 0.6, 0.2, 0] }
  ];
  var LINE_MODES = [
    { name: "from-top" },
    { name: "from-bottom" },
    { name: "width-from-center" },
    { name: "height-from-center" },
    { name: "fill-half-fill-full" }
  ];
  var LINE_EASINGS = [
    { name: "ease-out-expo" },
    { name: "ease-out-cubic" },
    { name: "ease-out-back-cubic" },
    { name: "ease-out-back" }
  ];
  var LINE_ROTATIONS = [90, -90, 45, -45, 0, 180];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before lines.js.");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseImageUrl(value) {
    var match = /url\((['"]?)([^'")]+)\1\)/.exec(String(value || ""));
    return match ? match[2] : "";
  }

  function rgbWithAlpha(color, alpha) {
    var channels = String(color || "").match(/\d+/g);

    if (!channels || channels.length < 3) {
      return color;
    }

    return "rgba(" + channels.slice(0, 3).join(", ") + ", " + clamp(alpha, 0, 1) + ")";
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearFrame(instance) {
    if (!instance._linesFrameId) {
      return;
    }

    window.cancelAnimationFrame(instance._linesFrameId);
    instance._linesFrameId = null;
  }

  function ensureStage(instance) {
    var $stage;
    var $canvas;

    if (instance.$linesStage && instance.$linesStage.length) {
      return instance.$linesStage;
    }

    $stage = instance.$viewport.children(".sliderx__lines-stage");

    if (!$stage.length) {
      $stage = $('<div class="sliderx__lines-stage" aria-hidden="true"><canvas class="sliderx__lines-canvas"></canvas></div>').appendTo(instance.$viewport);
    }

    $canvas = $stage.children(".sliderx__lines-canvas");
    instance.$linesStage = $stage;
    instance.$linesCanvas = $canvas;
    instance._linesCanvasElement = $canvas[0];
    instance._linesContext = instance._linesCanvasElement.getContext("2d");

    return instance.$linesStage;
  }

  function resetCanvas(instance) {
    var canvas = instance._linesCanvasElement;
    var context = instance._linesContext;

    if (!canvas || !context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas(instance, width, height) {
    var canvas = instance._linesCanvasElement;
    var dpr = window.devicePixelRatio || 1;

    if (!canvas) {
      return;
    }

    instance._linesViewportWidth = width;
    instance._linesViewportHeight = height;
    instance._linesDpr = dpr;

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

    if (instance._linesImageCache[url]) {
      return instance._linesImageCache[url];
    }

    entry = {
      url: url,
      image: null,
      loaded: false,
      errored: false,
      colors: null
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
    instance._linesImageCache[url] = entry;
    return entry;
  }

  function sampleAverageColor(context, x, y, size) {
    var imageData;
    var red = 0;
    var green = 0;
    var blue = 0;
    var alphaCount = 0;
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

      red += imageData[index];
      green += imageData[index + 1];
      blue += imageData[index + 2];
      alphaCount += 1;
    }

    if (!alphaCount) {
      return null;
    }

    return "rgb(" + [
      Math.round(red / alphaCount),
      Math.round(green / alphaCount),
      Math.round(blue / alphaCount)
    ].join(", ") + ")";
  }

  function getLineColors(entry) {
    var canvas;
    var context;

    if (!entry || entry.colors) {
      return entry && entry.colors ? entry.colors : LINE_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    if (!entry.loaded || entry.errored || !entry.image || !entry.image.naturalWidth || !entry.image.naturalHeight) {
      return LINE_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    canvas = document.createElement("canvas");
    canvas.width = entry.image.naturalWidth;
    canvas.height = entry.image.naturalHeight;
    context = canvas.getContext("2d");

    if (!context) {
      return LINE_SAMPLES.map(function (sample) {
        return sample.fallback;
      });
    }

    context.drawImage(entry.image, 0, 0, canvas.width, canvas.height);
    entry.colors = LINE_SAMPLES.map(function (sample) {
      var sampleX = clamp(Math.round(sample.x * canvas.width), 0, Math.max(0, canvas.width - 4));
      var sampleY = clamp(Math.round(sample.y * canvas.height), 0, Math.max(0, canvas.height - 4));

      return sampleAverageColor(context, sampleX, sampleY, 4) || sample.fallback;
    });

    return entry.colors;
  }

  function getVariant(instance) {
    var variantIndex = typeof instance._linesVariantIndex === "number" ? instance._linesVariantIndex : 0;
    var variant = {
      coverProfile: LINE_PROFILES[variantIndex % LINE_PROFILES.length],
      revealProfile: LINE_PROFILES[(variantIndex + 2) % LINE_PROFILES.length],
      coverMode: LINE_MODES[variantIndex % LINE_MODES.length],
      revealMode: LINE_MODES[(variantIndex + 1) % LINE_MODES.length],
      coverEasing: LINE_EASINGS[variantIndex % LINE_EASINGS.length],
      revealEasing: LINE_EASINGS[(variantIndex + 1) % LINE_EASINGS.length],
      rotation: LINE_ROTATIONS[variantIndex % LINE_ROTATIONS.length]
    };

    instance._linesVariantIndex = variantIndex + 1;
    return variant;
  }

  function getBounds(width, height, rotation) {
    var absoluteRotation = Math.abs(rotation);
    var diagonal;

    if (absoluteRotation === 45) {
      diagonal = Math.sqrt((width * width) + (height * height));
      return {
        width: diagonal,
        height: diagonal
      };
    }

    if (absoluteRotation === 90) {
      return {
        width: height,
        height: width
      };
    }

    return {
      width: width,
      height: height
    };
  }

  function applyEasing(name, progress) {
    var value = clamp(progress, 0, 1);
    var shifted;
    var squared;

    if (name === "ease-out-expo") {
      return value === 1 ? 1 : 1 - Math.pow(2, -10 * value);
    }

    if (name === "ease-out-cubic") {
      return 1 - Math.pow(1 - value, 3);
    }

    if (name === "ease-out-back-cubic") {
      squared = value * value;
      return clamp(
        (-1.5 * squared * value * squared)
        + (2 * squared * squared)
        + (4 * squared * value)
        - (9 * squared)
        + (5.5 * value),
        0,
        1.25
      );
    }

    shifted = value - 1;
    return clamp((shifted * shifted * ((2.70158 * shifted) + 1.70158)) + 1, 0, 1.25);
  }

  function normalizeLineProgress(profileValue, drawProgress) {
    return clamp(drawProgress - (profileValue * (1 - drawProgress)), 0, 1);
  }

  function getModeProgress(modeName, easingName, progress) {
    if (modeName === "fill-half-fill-full") {
      if (progress < 0.5) {
        return 0.5 * applyEasing(easingName, progress / 0.5);
      }

      return clamp(0.5 + ((progress - 0.5) / 0.5) * 0.5, 0, 1);
    }

    return clamp(applyEasing(easingName, progress), 0, 1.25);
  }

  function getRect(modeName, stageWidth, stageHeight, lineIndex, lineCount, progress) {
    var lineWidth = Math.ceil(0.5 + (stageWidth / lineCount));
    var baseX = (lineCount - lineIndex - 1) * (stageWidth / lineCount);
    var widthValue = lineWidth;
    var heightValue = stageHeight;
    var x = baseX;
    var y = 0;

    if (modeName === "from-top") {
      y = (-1.5 * stageHeight) * (1 - progress);
      return { x: x, y: y, width: widthValue, height: heightValue };
    }

    if (modeName === "from-bottom") {
      y = (1.5 * stageHeight) * (1 - progress);
      return { x: x, y: y, width: widthValue, height: heightValue };
    }

    if (modeName === "width-from-center") {
      widthValue = lineWidth * progress;
      x = baseX + ((lineWidth - widthValue) / 2);
      return { x: x, y: y, width: widthValue, height: heightValue };
    }

    heightValue = stageHeight * progress;
    y = (stageHeight - heightValue) / 2;
    return { x: x, y: y, width: widthValue, height: heightValue };
  }

  function drawPhase(instance, variant, colors, phaseName, phaseProgress) {
    var context = instance._linesContext;
    var viewportWidth = instance._linesViewportWidth || 1;
    var viewportHeight = instance._linesViewportHeight || 1;
    var dpr = instance._linesDpr || 1;
    var phase = phaseName === "cover"
      ? {
        mode: variant.coverMode.name,
        easing: variant.coverEasing.name,
        profile: variant.coverProfile.delays,
        drawProgress: clamp(phaseProgress, 0, 1),
        useAlpha: true
      }
      : {
        mode: variant.revealMode.name,
        easing: variant.revealEasing.name,
        profile: variant.revealProfile.delays,
        drawProgress: 1 - clamp(phaseProgress, 0, 1),
        useAlpha: false
      };
    var bounds = getBounds(viewportWidth, viewportHeight, variant.rotation);
    var lineIndex;
    var localProgress;
    var modeProgress;
    var rect;
    var color;

    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, instance._linesCanvasElement.width, instance._linesCanvasElement.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.save();
    context.translate(viewportWidth / 2, viewportHeight / 2);
    context.rotate((variant.rotation * Math.PI) / 180);
    context.translate(-(bounds.width / 2), -(bounds.height / 2));

    for (lineIndex = 0; lineIndex < LINE_SAMPLES.length; lineIndex += 1) {
      localProgress = normalizeLineProgress(phase.profile[lineIndex], phase.drawProgress);
      modeProgress = getModeProgress(phase.mode, phase.easing, localProgress);
      rect = getRect(phase.mode, bounds.width, bounds.height, lineIndex, LINE_SAMPLES.length, modeProgress);
      color = colors[lineIndex] || LINE_SAMPLES[lineIndex].fallback;

      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      context.fillStyle = phase.useAlpha ? rgbWithAlpha(color, Math.min(phase.drawProgress + 0.1, 1)) : color;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    context.restore();
  }

  function clearState(instance) {
    clearTimer(instance, "_linesCleanupTimer");
    clearFrame(instance);
    resetCanvas(instance);

    if (instance.$linesStage && instance.$linesStage.length) {
      instance.$linesStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-lines-phase");
    instance.$root.removeAttr("data-lines-content");
    instance.$root.removeAttr("data-lines-cover");
    instance.$root.removeAttr("data-lines-reveal");
    instance.$root.removeAttr("data-lines-rotation");
    instance.$root.removeAttr("data-lines-cover-profile");
    instance.$root.removeAttr("data-lines-reveal-profile");
    instance.$root.removeAttr("data-lines-cover-easing");
    instance.$root.removeAttr("data-lines-reveal-easing");
  }

  function startAnimation(instance, variant, colors) {
    var totalDuration = instance.options.animationDuration;
    var halfDuration = Math.max(120, totalDuration * 0.5);
    var startTime = null;

    function step(timestamp) {
      var elapsed;
      var phaseProgress;

      if (!startTime) {
        startTime = timestamp;
      }

      elapsed = timestamp - startTime;

      if (elapsed < halfDuration) {
        instance.$root.attr("data-lines-phase", "cover");
        instance.$root.attr("data-lines-content", "hidden");
        phaseProgress = elapsed / halfDuration;
        drawPhase(instance, variant, colors, "cover", phaseProgress);
        instance._linesFrameId = window.requestAnimationFrame(step);
        return;
      }

      if (elapsed < totalDuration) {
        instance.$root.attr("data-lines-phase", "reveal");
        instance.$root.attr("data-lines-content", "visible");
        phaseProgress = (elapsed - halfDuration) / Math.max(1, totalDuration - halfDuration);
        drawPhase(instance, variant, colors, "reveal", phaseProgress);
        instance._linesFrameId = window.requestAnimationFrame(step);
        return;
      }

      clearFrame(instance);
      resetCanvas(instance);
    }

    instance._linesFrameId = window.requestAnimationFrame(step);
  }

  function primeInstance(instance) {
    if (instance._linesPrimed) {
      return;
    }

    instance._linesPrimed = true;
    instance._linesImageCache = {};
    ensureStage(instance);
    instance.$slides.each(function () {
      getImageEntry(instance, parseImageUrl(getSlideImageValue($(this))));
    });
  }

  function applyLinesState(instance, payload) {
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var targetSlide = instance.$slides.eq(targetIndex);
    var imageEntry;
    var colors;
    var variant;
    var viewportWidth;
    var viewportHeight;

    primeInstance(instance);
    imageEntry = getImageEntry(instance, parseImageUrl(getSlideImageValue(targetSlide)));
    colors = getLineColors(imageEntry);
    variant = getVariant(instance);
    viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;

    clearState(instance);
    resizeCanvas(instance, viewportWidth, viewportHeight);

    instance.$linesStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });
    instance.$root.attr("data-lines-cover", variant.coverMode.name);
    instance.$root.attr("data-lines-reveal", variant.revealMode.name);
    instance.$root.attr("data-lines-rotation", String(variant.rotation));
    instance.$root.attr("data-lines-cover-profile", variant.coverProfile.name);
    instance.$root.attr("data-lines-reveal-profile", variant.revealProfile.name);
    instance.$root.attr("data-lines-cover-easing", variant.coverEasing.name);
    instance.$root.attr("data-lines-reveal-easing", variant.revealEasing.name);
    instance.$root.attr("data-lines-phase", "cover");
    instance.$root.attr("data-lines-content", "hidden");

    startAnimation(instance, variant, colors);

    instance._linesCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, instance.options.animationDuration + 90);
  }

  window.SliderX.registerAnimation("lines", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyLinesState(instance, payload || {});
    }
  });
})(window, window.jQuery);
