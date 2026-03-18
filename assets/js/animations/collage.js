(function (window, $) {
  var MIN_SCALE = 0.42;
  var MAX_SCALE = 0.78;
  var MIN_ANGLE = -65;
  var MAX_ANGLE = 65;
  var BLUR_RADIUS = 18;
  var SETTLE_START = 0.76;
  var CONTENT_REVEAL = 0.88;

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before collage.js.");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, progress) {
    return start + ((end - start) * progress);
  }

  function easeInOutQuad(progress) {
    if (progress < 0.5) {
      return 2 * progress * progress;
    }

    return 1 - (Math.pow(-2 * progress + 2, 2) / 2);
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

  function hashString(value) {
    var hash = 2166136261;
    var index;

    for (index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function createRandom(seed) {
    var state = seed >>> 0;

    return function () {
      state += 0x6D2B79F5;
      var next = Math.imul(state ^ (state >>> 15), 1 | state);
      next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function clearFrame(instance) {
    if (!instance._collageFrameId) {
      return;
    }

    window.cancelAnimationFrame(instance._collageFrameId);
    instance._collageFrameId = null;
  }

  function ensureStage(instance) {
    var $stage;
    var $canvas;

    if (instance.$collageStage && instance.$collageStage.length) {
      return instance.$collageStage;
    }

    $stage = instance.$viewport.children(".sliderx__collage-stage");

    if (!$stage.length) {
      $stage = $('<div class="sliderx__collage-stage" aria-hidden="true"><canvas class="sliderx__collage-canvas"></canvas></div>').appendTo(instance.$viewport);
    }

    $canvas = $stage.children(".sliderx__collage-canvas");
    instance.$collageStage = $stage;
    instance.$collageCanvas = $canvas;
    instance._collageCanvasElement = $canvas[0];
    instance._collageContext = instance._collageCanvasElement.getContext("2d");
    return instance.$collageStage;
  }

  function resetCanvas(instance) {
    var canvas = instance._collageCanvasElement;
    var context = instance._collageContext;

    if (!canvas || !context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas(instance, width, height) {
    var canvas = instance._collageCanvasElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25);

    if (!canvas) {
      return;
    }

    instance._collageViewportWidth = width;
    instance._collageViewportHeight = height;
    instance._collageDpr = dpr;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  function createRenderCanvas(width, height) {
    var canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function getImageEntry(instance, url) {
    var entry;
    var image;

    if (!url) {
      return null;
    }

    if (instance._collageImageCache[url]) {
      return instance._collageImageCache[url];
    }

    entry = {
      url: url,
      image: null,
      loaded: false,
      errored: false
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
    instance._collageImageCache[url] = entry;
    return entry;
  }

  function buildBlurredCanvas(entry, width, height, expansion, overlayAlpha, overlayColor) {
    var canvas;
    var context;

    if (!entry || !entry.loaded || entry.errored || !entry.image) {
      return null;
    }

    canvas = createRenderCanvas(width, height);
    context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.save();

    if ("filter" in context) {
      context.filter = "blur(" + BLUR_RADIUS + "px) saturate(0.72) brightness(0.82)";
    }

    context.drawImage(
      entry.image,
      (-width * expansion) / 2,
      (-height * expansion) / 2,
      width * (1 + expansion),
      height * (1 + expansion)
    );

    if ("filter" in context) {
      context.filter = "none";
    }

    if (overlayAlpha > 0) {
      context.globalAlpha = overlayAlpha;
      context.fillStyle = overlayColor;
      context.fillRect(0, 0, width, height);
    }

    context.restore();
    return canvas;
  }

  function drawBackdrop(instance, canvas) {
    var context = instance._collageContext;
    var width = instance._collageViewportWidth || 1;
    var height = instance._collageViewportHeight || 1;

    if (!context || !canvas) {
      return;
    }

    context.drawImage(canvas, 0, 0, width, height);
  }

  function buildSceneCaches(entry, width, height) {
    var fieldScale = 2.4;

    return {
      backdropCanvas: buildBlurredCanvas(entry, width, height, 0.24, 0.18, "#1b1918"),
      fieldCanvas: buildBlurredCanvas(entry, width * fieldScale, height * fieldScale, 0, 0, "#000000")
    };
  }

  function drawCard(context, descriptor, emphasisScale, alpha) {
    var entry = descriptor.entry;
    var width = descriptor.width;
    var height = descriptor.height;

    if (!entry || !entry.loaded || entry.errored || !entry.image || alpha <= 0) {
      return;
    }

    context.save();
    context.globalAlpha = alpha;
    context.translate(descriptor.x + (width / 2), descriptor.y + (height / 2));
    context.rotate((descriptor.angle * Math.PI) / 180);
    context.scale(descriptor.scale * emphasisScale, descriptor.scale * emphasisScale);
    context.translate(-width / 2, -height / 2);
    context.drawImage(entry.image, 0, 0, width, height);
    context.restore();
  }

  function buildDescriptors(instance, viewportWidth, viewportHeight) {
    var descriptors = [];
    var positions = [];
    var descriptorCount = Math.max(instance.total, 4);
    var columnWidth = viewportWidth / (Math.sqrt(descriptorCount) + 1);
    var rowHeight = viewportHeight / (Math.sqrt(descriptorCount) + 1);
    var columnCount = Math.max(1, Math.floor(viewportWidth / columnWidth));
    var random = createRandom(hashString("collage:" + viewportWidth + "x" + viewportHeight + ":" + descriptorCount));
    var left = 0;
    var top = 0;
    var index;

    for (index = 0; index < descriptorCount; index += 1) {
      if ((left + columnWidth) > ((columnWidth * columnCount) + 0.5)) {
        top += rowHeight;
        left = 0;
      }

      positions.push({
        x: left,
        y: top,
        width: columnWidth,
        height: rowHeight
      });
      left += columnWidth;
    }

    for (index = positions.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(random() * (index + 1));
      var swap = positions[index];
      positions[index] = positions[swapIndex];
      positions[swapIndex] = swap;
    }

    for (index = 0; index < descriptorCount; index += 1) {
      descriptors.push({
        x: positions[index].x,
        y: positions[index].y,
        width: positions[index].width,
        height: positions[index].height,
        angle: lerp(MIN_ANGLE, MAX_ANGLE, random()),
        scale: lerp(MIN_SCALE, MAX_SCALE, random()),
        entry: getImageEntry(instance, getImageUrl(instance.$slides.eq(index % instance.total)))
      });
    }

    return descriptors;
  }

  function getFocusState(descriptor, viewportWidth, viewportHeight) {
    var centerX = descriptor.x + (descriptor.width / 2);
    var centerY = descriptor.y + (descriptor.height / 2);
    var focusScale = Math.max(
      viewportWidth / Math.max(1, descriptor.width * descriptor.scale),
      viewportHeight / Math.max(1, descriptor.height * descriptor.scale)
    );

    return {
      centerX: centerX,
      centerY: centerY,
      scale: clamp(focusScale, 1.35, 5.5),
      angle: descriptor.angle
    };
  }

  function renderFrame(instance, scene) {
    var context = instance._collageContext;
    var width = instance._collageViewportWidth || 1;
    var height = instance._collageViewportHeight || 1;
    var dpr = instance._collageDpr || 1;
    var rawProgress = clamp(scene.progress, 0, 1);
    var currentDescriptor = scene.descriptors[scene.previousIndex];
    var targetDescriptor = scene.descriptors[scene.targetIndex];
    var edgeStrength = easeInOutQuad(Math.abs(1 - (2 * rawProgress)));
    var easedProgress = easeInOutQuad(rawProgress);
    var cardWidth = currentDescriptor.width;
    var cardHeight = currentDescriptor.height;
    var baseScale = lerp(width / Math.max(1, currentDescriptor.width), width / Math.max(1, targetDescriptor.width), easedProgress);
    var compensationScale = lerp(1 / currentDescriptor.scale, 1 / targetDescriptor.scale, easedProgress);
    var focusScale = lerp(0.5, compensationScale, edgeStrength);
    var angle = lerp(currentDescriptor.angle, targetDescriptor.angle, easedProgress);
    var focusX = lerp(currentDescriptor.x, targetDescriptor.x, easedProgress);
    var focusY = lerp(currentDescriptor.y, targetDescriptor.y, easedProgress);
    var nonFocusAlpha = lerp(0.04, 0.16, edgeStrength);
    var currentOverlayAlpha = 0;
    var targetOverlayAlpha = 0;
    var backdropCanvas = scene.backdropCanvas;
    var fieldCanvas = scene.fieldCanvas;
    var index;

    if (rawProgress < 0.35) {
      currentOverlayAlpha = 1;
    } else if (rawProgress < 0.6) {
      currentOverlayAlpha = 1 - easeInOutQuad((rawProgress - 0.35) / 0.25);
    }

    if (rawProgress > 0.62) {
      targetOverlayAlpha = easeInOutQuad((rawProgress - 0.62) / 0.38);
    }

    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, instance._collageCanvasElement.width, instance._collageCanvasElement.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBackdrop(instance, backdropCanvas);

    if (fieldCanvas) {
      context.save();
      context.translate(focusX + (0.5 * cardWidth), focusY + (0.5 * cardHeight));
      context.rotate((-angle * Math.PI) / 180);
      context.scale(compensationScale, compensationScale);
      context.translate(-(focusX + (0.5 * cardWidth)), -(focusY + (0.5 * cardHeight)));
      context.transform(compensationScale, 0, 0, compensationScale, -focusX * compensationScale, -focusY * compensationScale);
      context.globalAlpha = 0.52;
      context.drawImage(
        fieldCanvas,
        (-fieldCanvas.width + width) / 2,
        (-fieldCanvas.height + height) / 2,
        fieldCanvas.width,
        fieldCanvas.height
      );

      context.restore();
    }

    context.save();
    context.transform(baseScale, 0, 0, baseScale, -focusX * baseScale, -focusY * baseScale);
    context.translate(focusX + (0.5 * cardWidth), focusY + (0.5 * cardHeight));
    context.rotate((-angle * Math.PI) / 180);
    context.scale(focusScale, focusScale);
    context.translate(-(focusX + (0.5 * cardWidth)), -(focusY + (0.5 * cardHeight)));

    for (index = 0; index < scene.descriptors.length; index += 1) {
      if (index === scene.previousIndex || index === scene.targetIndex) {
        continue;
      }

      drawCard(context, scene.descriptors[index], 1, nonFocusAlpha);
    }

    drawCard(context, currentDescriptor, 1, Math.max(nonFocusAlpha, currentOverlayAlpha));
    drawCard(context, targetDescriptor, 1, targetOverlayAlpha);
    context.restore();
  }

  function clearState(instance) {
    clearTimer(instance, "_collageCleanupTimer");
    clearFrame(instance);
    resetCanvas(instance);

    if (instance.$collageStage && instance.$collageStage.length) {
      instance.$collageStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-collage-phase");
    instance.$root.removeAttr("data-collage-content");
    instance.$root.removeAttr("data-collage-current");
    instance.$root.removeAttr("data-collage-target");
    instance.$root.removeAttr("data-collage-progress");
    instance.$root.removeAttr("data-collage-card-count");
    instance.$root.removeAttr("data-collage-render");
    instance.$root.removeAttr("data-collage-backdrop");
  }

  function primeInstance(instance) {
    if (instance._collagePrimed) {
      return;
    }

    instance._collagePrimed = true;
    instance._collageImageCache = {};
    ensureStage(instance);

    instance.$slides.each(function () {
      getImageEntry(instance, getImageUrl($(this)));
    });
  }

  function startAnimation(instance, scene) {
    var duration = instance.options.animationDuration;
    var startTime = null;

    function step(timestamp) {
      var elapsed;
      var progress;

      if (!startTime) {
        startTime = timestamp;
      }

      elapsed = timestamp - startTime;
      progress = clamp(elapsed / duration, 0, 1);
      scene.progress = progress;

      instance.$root.attr("data-collage-phase", progress < SETTLE_START ? "travel" : "settle");
      instance.$root.attr("data-collage-content", progress < CONTENT_REVEAL ? "hidden" : "visible");
      instance.$root.attr("data-collage-progress", progress.toFixed(3));
      renderFrame(instance, scene);

      if (progress < 1) {
        instance._collageFrameId = window.requestAnimationFrame(step);
        return;
      }

      clearFrame(instance);
    }

    instance._collageFrameId = window.requestAnimationFrame(step);
  }

  function applyCollageState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var descriptors;
    var backdropIndex;
    var backdropEntry;
    var sceneCaches;

    primeInstance(instance);
    clearState(instance);
    resizeCanvas(instance, viewportWidth, viewportHeight);

    instance.$collageStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    descriptors = buildDescriptors(instance, viewportWidth, viewportHeight);
    backdropIndex = (targetIndex + 1) % instance.total;

    if (backdropIndex === previousIndex || backdropIndex === targetIndex) {
      backdropIndex = (backdropIndex + 1) % instance.total;
    }

    backdropEntry = getImageEntry(instance, getImageUrl(instance.$slides.eq(backdropIndex)));
    sceneCaches = buildSceneCaches(backdropEntry, viewportWidth, viewportHeight);

    instance.$root.attr("data-collage-phase", "travel");
    instance.$root.attr("data-collage-content", "hidden");
    instance.$root.attr("data-collage-current", String(previousIndex));
    instance.$root.attr("data-collage-target", String(targetIndex));
    instance.$root.attr("data-collage-progress", "0.000");
    instance.$root.attr("data-collage-card-count", String(descriptors.length));
    instance.$root.attr("data-collage-render", "canvas");
    instance.$root.attr("data-collage-backdrop", "blurred");

    startAnimation(instance, {
      progress: 0,
      previousIndex: previousIndex,
      targetIndex: targetIndex,
      descriptors: descriptors,
      backdropEntry: backdropEntry,
      backdropCanvas: sceneCaches.backdropCanvas,
      fieldCanvas: sceneCaches.fieldCanvas
    });

    instance._collageCleanupTimer = window.setTimeout(function () {
      clearState(instance);
    }, durationWithPadding(instance.options.animationDuration));
  }

  function durationWithPadding(duration) {
    return duration + 140;
  }

  window.SliderX.registerAnimation("collage", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      applyCollageState(instance, payload || {});
    }
  });
})(window, window.jQuery);
