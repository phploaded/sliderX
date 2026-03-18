(function (window, $) {
  var CURTAIN_COLUMNS = 10;
  var CURTAIN_PATTERNS = [
    { flow: "forward", rotation: 180 },
    { flow: "reverse", rotation: -180 },
    { flow: "forward", rotation: -180 },
    { flow: "reverse", rotation: 180 }
  ];
  var FALLBACK_EDGE_COLOR = "rgb(54, 61, 72)";

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before curtains.js.");
  }

  function parseImageUrl(value) {
    var match = /url\((['"]?)([^'")]+)\1\)/.exec(String(value || ""));
    return match ? match[2] : "";
  }

  function bucketColorChannel(channel) {
    return Math.max(0, Math.min(255, Math.round(channel / 16) * 16));
  }

  function buildAverageStripColors(image, columns) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var sampleWidth = columns * 4;
    var sampleHeight = 24;
    var colors = [];
    var columnIndex;

    if (!context) {
      return [];
    }

    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    try {
      for (columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        var imageData = context.getImageData(columnIndex * 4, 0, 4, sampleHeight).data;
        var alphaTotal = 0;
        var redTotal = 0;
        var greenTotal = 0;
        var blueTotal = 0;
        var pixelIndex;

        for (pixelIndex = 0; pixelIndex < imageData.length; pixelIndex += 4) {
          var alpha = imageData[pixelIndex + 3];

          if (alpha < 160) {
            continue;
          }

          alphaTotal += 1;
          redTotal += imageData[pixelIndex];
          greenTotal += imageData[pixelIndex + 1];
          blueTotal += imageData[pixelIndex + 2];
        }

        if (!alphaTotal) {
          colors.push(FALLBACK_EDGE_COLOR);
          continue;
        }

        colors.push(
          "rgb(" + [
            bucketColorChannel(redTotal / alphaTotal),
            bucketColorChannel(greenTotal / alphaTotal),
            bucketColorChannel(blueTotal / alphaTotal)
          ].join(", ") + ")"
        );
      }
    } catch (error) {
      return [];
    }

    return colors;
  }

  function ensureStage(instance) {
    if (instance.$curtainsStage && instance.$curtainsStage.length) {
      return instance.$curtainsStage;
    }

    instance.$curtainsStage = instance.$viewport.children(".sliderx__curtains-stage");

    if (!instance.$curtainsStage.length) {
      instance.$curtainsStage = $('<div class="sliderx__curtains-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    return instance.$curtainsStage;
  }

  function clearCleanupTimer(instance) {
    if (!instance._curtainsCleanupTimer) {
      return;
    }

    window.clearTimeout(instance._curtainsCleanupTimer);
    instance._curtainsCleanupTimer = null;
  }

  function clearStage(instance) {
    if (instance.$curtainsStage && instance.$curtainsStage.length) {
      instance.$curtainsStage.empty();
    }
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function getSlideImageUrl($slide) {
    return parseImageUrl(getSlideImageValue($slide));
  }

  function cloneSlide($slide) {
    return $slide
      .clone()
      .removeClass("is-active is-entering is-leaving")
      .removeAttr("aria-hidden");
  }

  function cacheStripColors(instance, url, columns) {
    var cacheKey = [url, columns].join("|");
    var image;

    if (!url || instance._curtainsStripColorCache[cacheKey] || instance._curtainsStripColorLoading[cacheKey]) {
      return;
    }

    instance._curtainsStripColorLoading[cacheKey] = true;
    image = new window.Image();
    image.onload = function () {
      instance._curtainsStripColorCache[cacheKey] = buildAverageStripColors(image, columns);
      delete instance._curtainsStripColorLoading[cacheKey];
    };
    image.onerror = function () {
      instance._curtainsStripColorCache[cacheKey] = [];
      delete instance._curtainsStripColorLoading[cacheKey];
    };
    image.src = url;
  }

  function primeInstance(instance) {
    if (instance._curtainsPrimed) {
      return;
    }

    instance._curtainsPrimed = true;
    instance._curtainsStripColorCache = {};
    instance._curtainsStripColorLoading = {};
    ensureStage(instance);

    instance.$slides.each(function () {
      var url = getSlideImageUrl($(this));
      cacheStripColors(instance, url, CURTAIN_COLUMNS);
    });
  }

  function buildFace($slide, imageValue, viewportWidth, height, offset, faceClass) {
    var $face = $('<div class="sliderx__curtain-face"></div>').addClass(faceClass);
    var $pane = $('<div class="sliderx__curtain-pane"></div>');
    var $clone = cloneSlide($slide);

    $pane.css({
      left: -offset + "px",
      width: viewportWidth + "px",
      height: height + "px",
      backgroundImage: imageValue
    });
    $pane.append($clone);
    $face.append($pane);
    return $face;
  }

  function buildStrip(instance, options) {
    var $strip = $('<div class="sliderx__curtain-strip"></div>');
    var $part = $('<div class="sliderx__curtain-part"></div>');
    var $leftEdge = $('<div class="sliderx__curtain-edge is-left"></div>');
    var $rightEdge = $('<div class="sliderx__curtain-edge is-right"></div>');

    $strip.attr("data-strip-index", options.columnIndex);
    $strip.css({
      left: options.left + "px",
      width: options.width + "px",
      height: options.height + "px"
    });
    $strip[0].style.setProperty("--sliderx-curtain-delay", options.delay + "ms");
    $strip[0].style.setProperty("--sliderx-curtain-rotation", options.rotation + "deg");
    $strip[0].style.setProperty("--sliderx-curtain-depth", options.depth + "px");

    $leftEdge.css("backgroundColor", options.edgeColor);
    $rightEdge.css("backgroundColor", options.edgeColor);

    $part.append(
      buildFace(options.$previousSlide, options.previousImage, options.viewportWidth, options.height, options.left, "is-front"),
      buildFace(options.$targetSlide, options.targetImage, options.viewportWidth, options.height, options.left, "is-back"),
      $leftEdge,
      $rightEdge
    );

    $strip.append($part);
    instance.$curtainsStage.append($strip);
  }

  function applyCurtainsState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var $previousSlide = instance.$slides.eq(previousIndex);
    var $targetSlide = instance.$slides.eq(targetIndex);
    var previousImage = getSlideImageValue($previousSlide);
    var targetImage = getSlideImageValue($targetSlide);
    var previousImageUrl = getSlideImageUrl($previousSlide);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var columnWidth = viewportWidth / CURTAIN_COLUMNS;
    var depth = Math.max(4, Math.round(Math.min(columnWidth * 0.18, 12)));
    var delaySpan = instance.options.animationDuration * 0.4;
    var cacheKey = [previousImageUrl, CURTAIN_COLUMNS].join("|");
    var edgeColors = instance._curtainsStripColorCache[cacheKey] || [];
    var pattern;
    var patternIndex;
    var columnIndex;

    clearCleanupTimer(instance);
    ensureStage(instance);
    clearStage(instance);
    cacheStripColors(instance, previousImageUrl, CURTAIN_COLUMNS);

    if (typeof instance._curtainsPatternIndex !== "number") {
      instance._curtainsPatternIndex = 0;
    }

    patternIndex = instance._curtainsPatternIndex % CURTAIN_PATTERNS.length;
    pattern = CURTAIN_PATTERNS[patternIndex];
    instance._curtainsPatternIndex += 1;

    instance.$root.attr("data-curtains-flow", pattern.flow);
    instance.$root.attr("data-curtains-spin", pattern.rotation > 0 ? "positive" : "negative");
    instance.$root[0].style.setProperty("--sliderx-curtains-depth", depth + "px");
    instance.$curtainsStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    for (columnIndex = 0; columnIndex < CURTAIN_COLUMNS; columnIndex += 1) {
      var orderedIndex = pattern.flow === "forward" ? columnIndex : CURTAIN_COLUMNS - 1 - columnIndex;
      var delay = CURTAIN_COLUMNS > 1 ? Math.round((orderedIndex / (CURTAIN_COLUMNS - 1)) * delaySpan) : 0;

      buildStrip(instance, {
        columnIndex: columnIndex,
        left: columnIndex * columnWidth,
        width: columnIndex === CURTAIN_COLUMNS - 1 ? viewportWidth - (columnWidth * columnIndex) : columnWidth,
        height: viewportHeight,
        delay: delay,
        rotation: pattern.rotation,
        depth: depth,
        edgeColor: edgeColors[columnIndex] || FALLBACK_EDGE_COLOR,
        viewportWidth: viewportWidth,
        previousImage: previousImage,
        targetImage: targetImage,
        $previousSlide: $previousSlide,
        $targetSlide: $targetSlide
      });
    }

    instance._curtainsCleanupTimer = window.setTimeout(function () {
      clearStage(instance);
      clearCleanupTimer(instance);
    }, instance.options.animationDuration + 120);
  }

  window.SliderX.registerAnimation("curtains", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearCleanupTimer(instance);
      clearStage(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyCurtainsState(instance, payload || {});
    }
  });
})(window, window.jQuery);
