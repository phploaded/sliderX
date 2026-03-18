(function (window, $) {
  var BLAST_COLS = 9;
  var BLAST_ROWS = 3;

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before blast.js.");
  }

  function ensureStage(instance) {
    if (instance.$blastStage && instance.$blastStage.length) {
      return instance.$blastStage;
    }

    instance.$blastStage = instance.$root.children(".sliderx__blast-stage");

    if (!instance.$blastStage.length) {
      instance.$blastStage = $('<div class="sliderx__blast-stage" aria-hidden="true"></div>').appendTo(instance.$root);
    }

    return instance.$blastStage;
  }

  function ensureLayer(instance, className) {
    var container = className === "sliderx__blast-outgoing"
      ? ensureStage(instance)
      : ensureFrame(instance);
    var $layer = container.children("." + className);

    if ($layer.length) {
      return $layer;
    }

    return $("<div></div>").addClass(className).appendTo(container);
  }

  function ensureFrame(instance) {
    if (instance.$blastFrame && instance.$blastFrame.length) {
      return instance.$blastFrame;
    }

    instance.$blastFrame = instance.$blastStage.children(".sliderx__blast-frame");

    if (!instance.$blastFrame.length) {
      instance.$blastFrame = $('<div class="sliderx__blast-frame" aria-hidden="true"></div>').appendTo(instance.$blastStage);
    }

    return instance.$blastFrame;
  }

  function clearCleanupTimer(instance) {
    if (!instance._blastCleanupTimer) {
      return;
    }

    window.clearTimeout(instance._blastCleanupTimer);
    instance._blastCleanupTimer = null;
  }

  function clearStage(instance) {
    if (!instance.$blastStage || !instance.$blastStage.length) {
      return;
    }

    instance.$blastStage.empty();
  }

  function primeInstance(instance) {
    if (instance._blastPrimed) {
      return;
    }

    instance._blastPrimed = true;
    ensureStage(instance);
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function getViewportOffset(instance) {
    var viewportRect = instance.$viewport[0].getBoundingClientRect();
    var rootRect = instance.$root[0].getBoundingClientRect();

    return {
      left: viewportRect.left - rootRect.left,
      top: viewportRect.top - rootRect.top
    };
  }

  function buildTile(options) {
    var $tile = $('<div class="sliderx__blast-tile"></div>').addClass(options.tileClass);
    var $pane = $('<div class="sliderx__blast-pane"></div>');

    $tile.attr({
      "data-blast-col": options.columnIndex,
      "data-blast-row": options.rowIndex
    });
    $tile.css({
      left: options.left + "px",
      top: options.top + "px",
      width: options.width + "px",
      height: options.height + "px",
      zIndex: options.zIndex
    });
    $tile[0].style.setProperty("--sliderx-blast-delay", options.delay + "ms");
    $tile[0].style.setProperty("--sliderx-blast-burst-x", options.burstX + "px");
    $tile[0].style.setProperty("--sliderx-blast-burst-y", options.burstY + "px");
    $tile[0].style.setProperty("--sliderx-blast-center-x", options.centerX + "px");
    $tile[0].style.setProperty("--sliderx-blast-center-y", options.centerY + "px");

    $pane.css({
      left: -options.left + "px",
      top: -options.top + "px",
      width: options.viewportWidth + "px",
      height: options.viewportHeight + "px",
      backgroundImage: options.imageValue
    });
    $tile.append($pane);
    return $tile;
  }

  function getColumnDistance(columnIndex, cols) {
    return Math.abs((((cols % 2 ? 1 : 0) + ((cols - (cols % 2)) / 2)) - columnIndex) / cols);
  }

  function getBurstOffset(columnIndex, rowIndex, left, top, viewportWidth, viewportHeight) {
    var spread = 6.4;
    var targetLeft = ((spread * viewportWidth / BLAST_COLS) * columnIndex) - ((viewportWidth * spread) / 2.06);
    var targetTop = ((spread * viewportHeight / BLAST_ROWS) * rowIndex) - ((viewportHeight * spread) / 2.06);

    return {
      x: targetLeft - left,
      y: targetTop - top
    };
  }

  function applyBlastState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var $previousSlide = instance.$slides.eq(previousIndex);
    var $targetSlide = instance.$slides.eq(targetIndex);
    var previousImage = getSlideImageValue($previousSlide);
    var targetImage = getSlideImageValue($targetSlide);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var viewportOffset = getViewportOffset(instance);
    var tileWidth = viewportWidth / BLAST_COLS;
    var tileHeight = viewportHeight / BLAST_ROWS;
    var duration = instance.options.animationDuration;
    var $blurLayer;
    var $outgoingLayer;
    var $incomingLayer;
    var rowIndex;
    var columnIndex;

    clearCleanupTimer(instance);
    ensureStage(instance);
    clearStage(instance);

    instance.$blastStage.css({
      left: viewportOffset.left + "px",
      top: viewportOffset.top + "px",
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    ensureFrame(instance);
    $blurLayer = ensureLayer(instance, "sliderx__blast-blur");
    $outgoingLayer = ensureLayer(instance, "sliderx__blast-outgoing");
    $incomingLayer = ensureLayer(instance, "sliderx__blast-incoming");

    $blurLayer.css("backgroundImage", previousImage);

    for (rowIndex = 0; rowIndex < BLAST_ROWS; rowIndex += 1) {
      for (columnIndex = 0; columnIndex < BLAST_COLS; columnIndex += 1) {
        var left = columnIndex * tileWidth;
        var top = rowIndex * tileHeight;
        var width = columnIndex === BLAST_COLS - 1 ? viewportWidth - (tileWidth * columnIndex) : tileWidth;
        var height = rowIndex === BLAST_ROWS - 1 ? viewportHeight - (tileHeight * rowIndex) : tileHeight;
        var columnDistance = getColumnDistance(columnIndex, BLAST_COLS);
        var burstOffset = getBurstOffset(columnIndex, rowIndex, left, top, viewportWidth, viewportHeight);
        var startOffsetX = (viewportWidth / 2) - (left + (width / 2));
        var startOffsetY = (viewportHeight / 2) - (top + (height / 2));
        var outgoingDelay = Math.round((0.4 * duration) * ((45 * columnDistance) + (4 * rowIndex)) / (BLAST_COLS * BLAST_ROWS));
        var incomingDelay = Math.round((0.4 * duration) + ((0.3 * duration) * ((35 * columnDistance) + (4 * rowIndex)) / (BLAST_COLS * BLAST_ROWS)));
        var zIndex = Math.ceil(100 - (100 * columnDistance));

        $outgoingLayer.append(buildTile({
          tileClass: "is-outgoing",
          imageValue: previousImage,
          columnIndex: columnIndex,
          rowIndex: rowIndex,
          left: left,
          top: top,
          width: width,
          height: height,
          viewportWidth: viewportWidth,
          viewportHeight: viewportHeight,
          delay: outgoingDelay,
          burstX: burstOffset.x,
          burstY: burstOffset.y,
          centerX: startOffsetX,
          centerY: startOffsetY,
          zIndex: zIndex
        }));

        $incomingLayer.append(buildTile({
          tileClass: "is-incoming",
          imageValue: targetImage,
          columnIndex: columnIndex,
          rowIndex: rowIndex,
          left: left,
          top: top,
          width: width,
          height: height,
          viewportWidth: viewportWidth,
          viewportHeight: viewportHeight,
          delay: incomingDelay,
          burstX: burstOffset.x,
          burstY: burstOffset.y,
          centerX: startOffsetX,
          centerY: startOffsetY,
          zIndex: zIndex
        }));
      }
    }

    instance._blastCleanupTimer = window.setTimeout(function () {
      clearStage(instance);
      clearCleanupTimer(instance);
    }, duration + 220);
  }

  window.SliderX.registerAnimation("blast", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearCleanupTimer(instance);
      clearStage(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applyBlastState(instance, payload || {});
    }
  });
})(window, window.jQuery);
