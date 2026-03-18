(function (window, $) {
  var TILE_COLS = 4;
  var TILE_ROWS = 3;
  var TILE_DEPTH = 30;
  var TILE_PRESETS = [
    { zIndex: 0, rotateX: 360, rotateY: 180, rotateZ: -360, halfScale: 0.5, halfLeft: 0.7, halfTop: 0.7, delay: 0.36 },
    { zIndex: 1, rotateX: -360, rotateY: 180, rotateZ: 360, halfScale: 0.5, halfLeft: 0.2, halfTop: 0.4, delay: 0.81 },
    { zIndex: 1, rotateX: 360, rotateY: -180, rotateZ: -360, halfScale: 0.5, halfLeft: -0.2, halfTop: 0.4, delay: 0.45 },
    { zIndex: 0, rotateX: -360, rotateY: -180, rotateZ: 360, halfScale: 0.5, halfLeft: -0.7, halfTop: 0.7, delay: 0.63 },
    { zIndex: 1, rotateX: -360, rotateY: -180, rotateZ: 360, halfScale: 0.5, halfLeft: 0.7, halfTop: 0, delay: 0.54 },
    { zIndex: 2, rotateX: 360, rotateY: 180, rotateZ: -360, halfScale: 0.5, halfLeft: 0.2, halfTop: 0, delay: 0.38 },
    { zIndex: 2, rotateX: 360, rotateY: -180, rotateZ: -360, halfScale: 0.5, halfLeft: -0.2, halfTop: 0, delay: 0 },
    { zIndex: 1, rotateX: -360, rotateY: 180, rotateZ: 360, halfScale: 0.5, halfLeft: -0.7, halfTop: 0, delay: 0.72 },
    { zIndex: 0, rotateX: -360, rotateY: 180, rotateZ: 360, halfScale: 0.5, halfLeft: 0.7, halfTop: -0.7, delay: 1 },
    { zIndex: 1, rotateX: -360, rotateY: -180, rotateZ: 360, halfScale: 0.5, halfLeft: 0.2, halfTop: -0.4, delay: 0.7 },
    { zIndex: 1, rotateX: 360, rotateY: 180, rotateZ: -360, halfScale: 0.5, halfLeft: -0.2, halfTop: -0.4, delay: 0.57 },
    { zIndex: 0, rotateX: 360, rotateY: -180, rotateZ: -360, halfScale: 0.5, halfLeft: -0.7, halfTop: -0.7, delay: 0.9 }
  ];
  var FALLBACK_EDGE_COLOR = "rgb(70, 58, 62)";

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before tiles.js.");
  }

  function parseImageUrl(value) {
    var match = /url\((['"]?)([^'")]+)\1\)/.exec(String(value || ""));
    return match ? match[2] : "";
  }

  function bucketColorChannel(channel) {
    return Math.max(0, Math.min(255, Math.round(channel / 12) * 12));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clearTimer(instance, key) {
    if (!instance[key]) {
      return;
    }

    window.clearTimeout(instance[key]);
    instance[key] = null;
  }

  function cancelFrame(instance) {
    if (!instance._tilesFrameId) {
      return;
    }

    window.cancelAnimationFrame(instance._tilesFrameId);
    instance._tilesFrameId = null;
  }

  function ensureStage(instance) {
    if (instance.$tilesStage && instance.$tilesStage.length) {
      return instance.$tilesStage;
    }

    instance.$tilesStage = instance.$viewport.children(".sliderx__tiles-stage");

    if (!instance.$tilesStage.length) {
      instance.$tilesStage = $('<div class="sliderx__tiles-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    return instance.$tilesStage;
  }

  function clearStage(instance) {
    if (!instance.$tilesStage || !instance.$tilesStage.length) {
      return;
    }

    instance.$tilesStage.empty();
    instance._tilesItems = [];
  }

  function clearState(instance) {
    clearTimer(instance, "_tilesCleanupTimer");
    cancelFrame(instance);

    if (instance.$tilesStage && instance.$tilesStage.length) {
      instance.$tilesStage.removeAttr("style");
    }

    instance.$root.removeAttr("data-tiles-phase");
    instance.$root.removeAttr("data-tiles-content");
    instance.$root.removeAttr("data-tiles-direction");
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

  function buildGridColors(image, cols, rows) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d", { willReadFrequently: true });
    var colors = [];
    var cellWidth;
    var cellHeight;
    var rowIndex;
    var columnIndex;

    if (!context || !image.naturalWidth || !image.naturalHeight) {
      return [];
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    cellWidth = canvas.width / cols;
    cellHeight = canvas.height / rows;

    for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (columnIndex = 0; columnIndex < cols; columnIndex += 1) {
        var left = Math.floor(columnIndex * cellWidth);
        var top = Math.floor(rowIndex * cellHeight);
        var width = Math.max(1, Math.round(cellWidth));
        var height = Math.max(1, Math.round(cellHeight));
        var imageData;
        var redTotal = 0;
        var greenTotal = 0;
        var blueTotal = 0;
        var pixelCount = 0;
        var pixelIndex;

        try {
          imageData = context.getImageData(left, top, width, height).data;
        } catch (error) {
          return [];
        }

        for (pixelIndex = 0; pixelIndex < imageData.length; pixelIndex += 4) {
          if (imageData[pixelIndex + 3] < 128) {
            continue;
          }

          redTotal += imageData[pixelIndex];
          greenTotal += imageData[pixelIndex + 1];
          blueTotal += imageData[pixelIndex + 2];
          pixelCount += 1;
        }

        if (!pixelCount) {
          colors.push(FALLBACK_EDGE_COLOR);
          continue;
        }

        colors.push(
          "rgb(" + [
            bucketColorChannel(redTotal / pixelCount),
            bucketColorChannel(greenTotal / pixelCount),
            bucketColorChannel(blueTotal / pixelCount)
          ].join(", ") + ")"
        );
      }
    }

    return colors;
  }

  function cacheGridColors(instance, url, cols, rows) {
    var cacheKey = [url, cols, rows].join("|");
    var image;

    if (!url || instance._tilesColorCache[cacheKey] || instance._tilesColorLoading[cacheKey]) {
      return;
    }

    instance._tilesColorLoading[cacheKey] = true;
    image = new window.Image();
    image.onload = function () {
      instance._tilesColorCache[cacheKey] = buildGridColors(image, cols, rows);
      delete instance._tilesColorLoading[cacheKey];
    };
    image.onerror = function () {
      instance._tilesColorCache[cacheKey] = [];
      delete instance._tilesColorLoading[cacheKey];
    };
    image.src = url;
  }

  function primeInstance(instance) {
    if (instance._tilesPrimed) {
      return;
    }

    instance._tilesPrimed = true;
    instance._tilesColorCache = {};
    instance._tilesColorLoading = {};
    instance._tilesItems = [];
    ensureStage(instance);

    instance.$slides.each(function () {
      cacheGridColors(instance, getSlideImageUrl($(this)), TILE_COLS, TILE_ROWS);
    });
  }

  function createFace(className, imageUrl, options) {
    var $face = $('<div class="sliderx__tile-face ' + className + '"></div>');
    var $image = $('<img class="sliderx__tile-image" alt="">');

    $image.attr("src", imageUrl);
    $image.css({
      left: (-options.left) + "px",
      top: (-options.top) + "px",
      width: options.viewportWidth + "px",
      height: options.viewportHeight + "px"
    });
    $face.append($image);
    return $face;
  }

  function applyEdgeStyles($edge, width, height, color, transformValue) {
    $edge.css({
      width: width + "px",
      height: height + "px",
      background: color,
      transform: transformValue
    });
  }

  function buildTile(instance, options) {
    var $wrapper = $('<div class="sliderx__tile-wrapper"></div>');
    var $card = $('<div class="sliderx__tile-card"></div>');
    var $front = createFace("is-front", options.previousImageUrl, options);
    var $back = createFace("is-back", options.targetImageUrl, options);
    var $topEdge = $('<div class="sliderx__tile-edge is-top"></div>');
    var $bottomEdge = $('<div class="sliderx__tile-edge is-bottom"></div>');
    var $leftEdge = $('<div class="sliderx__tile-edge is-left"></div>');
    var $rightEdge = $('<div class="sliderx__tile-edge is-right"></div>');

    $wrapper.attr({
      "data-tile-index": options.tileIndex,
      "data-tile-row": options.rowIndex,
      "data-tile-col": options.columnIndex
    });
    $wrapper.css({
      left: options.left + "px",
      width: options.width + "px",
      height: options.height + "px",
      top: options.top + "px",
      zIndex: options.zIndex
    });

    $card.css({
      width: options.width + "px",
      height: options.height + "px",
      left: 0,
      top: 0,
      transform: "scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) translate3d(0px, 0px, 0px)"
    });

    $front.css({
      width: options.width + "px",
      height: options.height + "px",
      transform: "translate3d(0px, 0px, 0px)"
    });
    $back.css({
      width: options.width + "px",
      height: options.height + "px",
      transform: "rotateY(180deg) translate3d(0px, 0px, " + options.depth + "px)"
    });
    $back.css("backfaceVisibility", "hidden");

    applyEdgeStyles(
      $topEdge,
      options.width,
      options.depth,
      options.edgeColor,
      "rotateX(90deg) translate3d(0px, " + ((-options.depth) / 2) + "px, " + (options.depth / 2) + "px)"
    );
    applyEdgeStyles(
      $bottomEdge,
      options.width,
      options.depth,
      options.edgeColor,
      "rotateX(90deg) translate3d(0px, " + ((-options.depth) / 2) + "px, " + (-options.height + (options.depth / 2)) + "px)"
    );
    applyEdgeStyles(
      $leftEdge,
      options.depth,
      options.height,
      options.edgeColor,
      "rotateY(90deg) translate3d(" + (options.depth / 2) + "px, 0px, " + ((-options.depth) / 2) + "px)"
    );
    applyEdgeStyles(
      $rightEdge,
      options.depth,
      options.height,
      options.edgeColor,
      "rotateY(90deg) translate3d(" + (options.depth / 2) + "px, 0px, " + (options.width - (options.depth / 2)) + "px)"
    );

    $card.append($front, $back, $leftEdge, $rightEdge, $topEdge, $bottomEdge);
    $wrapper.append($card);
    instance.$tilesStage.append($wrapper);

    return {
      wrapper: $wrapper,
      part: $card,
      back: $back
    };
  }

  function easeInBack(value) {
    var overshoot = 1.70158;
    return value * value * (((overshoot + 1) * value) - overshoot);
  }

  function easeOutBack(value) {
    var overshoot = 1.70158;
    var nextValue = value - 1;
    return (nextValue * nextValue * (((overshoot + 1) * nextValue) + overshoot)) + 1;
  }

  function easeInBackQ(value) {
    var squared = value * value;
    return squared * ((4 * value * squared) - (8 * squared) + (8 * value) - 3);
  }

  function easeOutBackQ(value) {
    var squared = value * value;
    return (4 * squared * value * squared) - (12 * squared * squared) + (16 * squared * value) - (13 * squared) + (6 * value);
  }

  function easeInBackQ2(value) {
    var squared = value * value;
    return squared * ((1.5 * value * squared) - (2.5 * squared) + (5 * value) - 3);
  }

  function easeOutBackQ2(value) {
    var squared = value * value;
    return (1.5 * squared * value * squared) - (5 * squared * squared) + (10 * squared * value) - (12 * squared) + (6.5 * value);
  }

  function interpolateScalar(beginValue, endValue, progress, propertyName) {
    if (propertyName === "scale" || propertyName === "rotateX" || propertyName === "rotateY" || propertyName === "rotateZ") {
      return beginValue + ((endValue - beginValue) * progress.rotation);
    }

    if (propertyName === "left" || propertyName === "top") {
      return beginValue + ((endValue - beginValue) * progress.position);
    }

    return beginValue + ((endValue - beginValue) * progress.general);
  }

  function interpolateArray(beginValue, endValue, progress) {
    return [
      beginValue[0] + ((endValue[0] - beginValue[0]) * progress.general),
      beginValue[1] + ((endValue[1] - beginValue[1]) * progress.general),
      beginValue[2] + ((endValue[2] - beginValue[2]) * progress.general)
    ];
  }

  function getProgressSet(localProgress) {
    var normalized = clamp(localProgress, 0, 1);
    var halfProgress;

    if (normalized <= 0.5) {
      halfProgress = normalized * 2;
      return {
        from: "begin",
        to: "half",
        general: easeInBack(halfProgress),
        rotation: easeInBackQ(halfProgress),
        position: easeInBackQ2(halfProgress)
      };
    }

    halfProgress = (normalized - 0.5) * 2;
    return {
      from: "half",
      to: "end",
      general: easeOutBack(halfProgress),
      rotation: easeOutBackQ(halfProgress),
      position: easeOutBackQ2(halfProgress)
    };
  }

  function applyTileFrame(tile, localProgress) {
    var progress = getProgressSet(localProgress);
    var beginState = tile.animate[progress.from];
    var endState = tile.animate[progress.to];
    var wrapperLeft = interpolateScalar(beginState.left, endState.left, progress, "left");
    var wrapperTop = interpolateScalar(beginState.top, endState.top, progress, "top");
    var scaleValue = interpolateScalar(beginState.scale, endState.scale, progress, "scale");
    var rotateX = interpolateScalar(beginState.rotateX, endState.rotateX, progress, "rotateX");
    var rotateY = interpolateScalar(beginState.rotateY, endState.rotateY, progress, "rotateY");
    var rotateZ = interpolateScalar(beginState.rotateZ, endState.rotateZ, progress, "rotateZ");
    var translateValue = interpolateArray(beginState.translate3d, endState.translate3d, progress);
    var transformValue = [
      "scale(" + scaleValue.toFixed(3) + ")",
      "rotateX(" + rotateX.toFixed(3) + "deg)",
      "rotateY(" + rotateY.toFixed(3) + "deg)",
      "rotateZ(" + rotateZ.toFixed(3) + "deg)",
      "translate3d(" + translateValue[0].toFixed(3) + "px, " + translateValue[1].toFixed(3) + "px, " + translateValue[2].toFixed(3) + "px)"
    ].join(" ");

    tile.wrapper.css("transform", "translate3d(" + wrapperLeft.toFixed(3) + "px, " + wrapperTop.toFixed(3) + "px, 0px)");
    tile.part.css("transform", transformValue);
    tile.back.css("backfaceVisibility", localProgress <= 0.5 ? "hidden" : "visible");
  }

  function startTileAnimation(instance, tiles, totalDuration, contentRevealAt) {
    var startTime = window.performance.now();

    function renderFrame(now) {
      var elapsed = now - startTime;
      var reachedEnd = elapsed >= totalDuration;
      var tileIndex;

      if (elapsed >= totalDuration * 0.58) {
        instance.$root.attr("data-tiles-phase", "settle");
      }

      if (elapsed >= contentRevealAt) {
        instance.$root.attr("data-tiles-content", "visible");
      }

      for (tileIndex = 0; tileIndex < tiles.length; tileIndex += 1) {
        var tile = tiles[tileIndex];
        var localProgress = tile.animate.duration
          ? clamp((elapsed - tile.animate.delay) / tile.animate.duration, 0, 1)
          : 1;

        applyTileFrame(tile, localProgress);
      }

      if (reachedEnd) {
        instance._tilesFrameId = null;
        return;
      }

      instance._tilesFrameId = window.requestAnimationFrame(renderFrame);
    }

    cancelFrame(instance);
    instance._tilesFrameId = window.requestAnimationFrame(renderFrame);
  }

  function applyTilesState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var direction = payload && payload.direction === "prev" ? "prev" : "next";
    var directionFactor = direction === "prev" ? -1 : 1;
    var $previousSlide = instance.$slides.eq(previousIndex);
    var $targetSlide = instance.$slides.eq(targetIndex);
    var previousImageUrl = getSlideImageUrl($previousSlide);
    var targetImageUrl = getSlideImageUrl($targetSlide);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var tileWidth = viewportWidth / TILE_COLS;
    var tileHeight = viewportHeight / TILE_ROWS;
    var delaySpan = Math.min(1000, Math.round(instance.options.animationDuration * 0.4));
    var tileDuration = Math.round(instance.options.animationDuration * 0.6);
    var cacheKey = [previousImageUrl, TILE_COLS, TILE_ROWS].join("|");
    var edgeColors;
    var tiles = [];
    var maxDelay = 0;
    var rowIndex;
    var columnIndex;

    clearState(instance);
    ensureStage(instance);
    clearStage(instance);
    cacheGridColors(instance, previousImageUrl, TILE_COLS, TILE_ROWS);

    edgeColors = instance._tilesColorCache[cacheKey] || [];
    instance.$root.attr("data-tiles-phase", "scatter");
    instance.$root.attr("data-tiles-content", "hidden");
    instance.$root.attr("data-tiles-direction", direction);
    instance.$tilesStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    for (rowIndex = 0; rowIndex < TILE_ROWS; rowIndex += 1) {
      for (columnIndex = 0; columnIndex < TILE_COLS; columnIndex += 1) {
        var tileIndex = (rowIndex * TILE_COLS) + columnIndex;
        var preset = TILE_PRESETS[tileIndex];
        var left = columnIndex * tileWidth;
        var top = rowIndex * tileHeight;
        var width = columnIndex === TILE_COLS - 1 ? viewportWidth - (tileWidth * columnIndex) : tileWidth;
        var height = rowIndex === TILE_ROWS - 1 ? viewportHeight - (tileHeight * rowIndex) : tileHeight;
        var delay = Math.round(preset.delay * delaySpan);
        var builtTile = buildTile(instance, {
          tileIndex: tileIndex,
          rowIndex: rowIndex,
          columnIndex: columnIndex,
          left: left,
          top: top,
          width: width,
          height: height,
          viewportWidth: viewportWidth,
          viewportHeight: viewportHeight,
          previousImageUrl: previousImageUrl,
          targetImageUrl: targetImageUrl,
          edgeColor: edgeColors[tileIndex] || FALLBACK_EDGE_COLOR,
          zIndex: preset.zIndex,
          depth: TILE_DEPTH
        });

        builtTile.animate = {
          delay: delay,
          duration: tileDuration,
          begin: {
            left: 0,
            top: 0,
            scale: 1,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            translate3d: [0, 0, 0]
          },
          half: {
            left: preset.halfLeft * width * directionFactor,
            top: preset.halfTop * height,
            scale: preset.halfScale,
            rotateX: preset.rotateX / 2,
            rotateY: (preset.rotateY * directionFactor) / 2,
            rotateZ: preset.rotateZ / 2,
            translate3d: [0, 0, TILE_DEPTH * 0.5]
          },
          end: {
            left: 0,
            top: 0,
            scale: 1,
            rotateX: preset.rotateX,
            rotateY: preset.rotateY * directionFactor,
            rotateZ: preset.rotateZ,
            translate3d: [0, 0, TILE_DEPTH]
          }
        };

        maxDelay = Math.max(maxDelay, delay);
        tiles.push(builtTile);
      }
    }

    instance._tilesItems = tiles;

    startTileAnimation(
      instance,
      tiles,
      maxDelay + tileDuration,
      Math.round((maxDelay + tileDuration) * 0.96)
    );

    instance._tilesCleanupTimer = window.setTimeout(function () {
      clearStage(instance);
      clearState(instance);
    }, maxDelay + tileDuration + 120);
  }

  window.SliderX.registerAnimation("tiles", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearStage(instance);
      clearState(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyTilesState(instance, payload || {});
    }
  });
})(window, window.jQuery);
