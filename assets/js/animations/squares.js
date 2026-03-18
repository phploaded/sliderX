(function (window, $) {
  var SQUARE_COLS = 7;
  var SQUARE_ROWS = 5;
  var SQUARE_PATTERNS = ["random", "swirl", "rain", "straight", "snakev", "rainv"];

  if (!window.SliderX || typeof window.SliderX.registerAnimation !== "function") {
    throw new Error("SliderX core must load before squares.js.");
  }

  function ensureStage(instance) {
    if (instance.$squaresStage && instance.$squaresStage.length) {
      return instance.$squaresStage;
    }

    instance.$squaresStage = instance.$viewport.children(".sliderx__squares-stage");

    if (!instance.$squaresStage.length) {
      instance.$squaresStage = $('<div class="sliderx__squares-stage" aria-hidden="true"></div>').appendTo(instance.$viewport);
    }

    return instance.$squaresStage;
  }

  function clearCleanupTimer(instance) {
    if (!instance._squaresCleanupTimer) {
      return;
    }

    window.clearTimeout(instance._squaresCleanupTimer);
    instance._squaresCleanupTimer = null;
  }

  function clearStage(instance) {
    if (!instance.$squaresStage || !instance.$squaresStage.length) {
      return;
    }

    instance.$squaresStage.empty();
  }

  function primeInstance(instance) {
    if (instance._squaresPrimed) {
      return;
    }

    instance._squaresPrimed = true;
    ensureStage(instance);
  }

  function getSlideImageValue($slide) {
    return (
      $slide[0].style.getPropertyValue("--sliderx-slide-image")
      || window.getComputedStyle($slide[0]).getPropertyValue("--sliderx-slide-image")
    ).trim();
  }

  function getIndex(rowIndex, columnIndex, cols) {
    return (rowIndex * cols) + columnIndex;
  }

  function buildBaseOrder(cols, rows) {
    var order = [];
    var rowIndex;
    var columnIndex;

    for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (columnIndex = 0; columnIndex < cols; columnIndex += 1) {
        order.push(getIndex(rowIndex, columnIndex, cols));
      }
    }

    return order;
  }

  function buildColumnOrder(cols, rows) {
    var order = [];
    var rowIndex;
    var columnIndex;

    for (columnIndex = 0; columnIndex < cols; columnIndex += 1) {
      for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        order.push(getIndex(rowIndex, columnIndex, cols));
      }
    }

    return order;
  }

  function buildSnakeOrder(cols, rows) {
    var order = [];
    var rowIndex;
    var columnIndex;

    for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      if (rowIndex % 2 === 0) {
        for (columnIndex = 0; columnIndex < cols; columnIndex += 1) {
          order.push(getIndex(rowIndex, columnIndex, cols));
        }
      } else {
        for (columnIndex = cols - 1; columnIndex >= 0; columnIndex -= 1) {
          order.push(getIndex(rowIndex, columnIndex, cols));
        }
      }
    }

    return order;
  }

  function buildRainOrder(cols, rows) {
    var order = [];
    var diagonal;

    for (diagonal = 0; diagonal < cols + rows - 1; diagonal += 1) {
      var rowStart = Math.max(0, diagonal - (cols - 1));
      var rowEnd = Math.min(rows - 1, diagonal);
      var rowIndex;

      for (rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
        var columnIndex = diagonal - rowIndex;
        order.push(getIndex(rowIndex, columnIndex, cols));
      }
    }

    return order;
  }

  function buildSpiralOrder(cols, rows) {
    var order = [];
    var top = 0;
    var bottom = rows - 1;
    var left = 0;
    var right = cols - 1;
    var columnIndex;
    var rowIndex;

    while (left <= right && top <= bottom) {
      for (columnIndex = left; columnIndex <= right; columnIndex += 1) {
        order.push(getIndex(top, columnIndex, cols));
      }
      top += 1;

      for (rowIndex = top; rowIndex <= bottom; rowIndex += 1) {
        order.push(getIndex(rowIndex, right, cols));
      }
      right -= 1;

      if (top <= bottom) {
        for (columnIndex = right; columnIndex >= left; columnIndex -= 1) {
          order.push(getIndex(bottom, columnIndex, cols));
        }
        bottom -= 1;
      }

      if (left <= right) {
        for (rowIndex = bottom; rowIndex >= top; rowIndex -= 1) {
          order.push(getIndex(rowIndex, left, cols));
        }
        left += 1;
      }
    }

    return order;
  }

  function shuffleOrder(values) {
    var order = values.slice();
    var index;

    for (index = order.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(window.Math.random() * (index + 1));
      var current = order[index];
      order[index] = order[swapIndex];
      order[swapIndex] = current;
    }

    return order;
  }

  function getPatternOrder(patternName, cols, rows) {
    var base = buildBaseOrder(cols, rows);

    if (patternName === "swirl") {
      return buildSpiralOrder(cols, rows);
    }

    if (patternName === "rain") {
      return buildRainOrder(cols, rows);
    }

    if (patternName === "snakev") {
      return buildSnakeOrder(cols, rows);
    }

    if (patternName === "rainv") {
      return buildColumnOrder(cols, rows);
    }

    if (patternName === "random") {
      return shuffleOrder(base);
    }

    return base;
  }

  function buildSquare(instance, options) {
    var $square = $('<div class="sliderx__square"></div>');
    var $pane = $('<div class="sliderx__square-pane"></div>');

    $square.attr({
      "data-square-index": options.squareIndex,
      "data-square-row": options.rowIndex,
      "data-square-col": options.columnIndex
    });
    $square.css({
      left: options.left + "px",
      top: options.top + "px",
      width: options.width + "px",
      height: options.height + "px"
    });
    $square[0].style.setProperty("--sliderx-square-delay", options.delay + "ms");

    $pane.css({
      left: -options.left + "px",
      top: -options.top + "px",
      width: options.viewportWidth + "px",
      height: options.viewportHeight + "px",
      backgroundImage: options.imageValue
    });
    $square.append($pane);
    instance.$squaresStage.append($square);
  }

  function applySquaresState(instance, payload) {
    var previousIndex = payload && typeof payload.previousIndex === "number" ? payload.previousIndex : instance.currentIndex;
    var targetIndex = payload && typeof payload.targetIndex === "number" ? payload.targetIndex : instance.currentIndex;
    var $targetSlide = instance.$slides.eq(targetIndex);
    var imageValue = getSlideImageValue($targetSlide);
    var viewportWidth = instance.$viewport[0].clientWidth || instance.$root[0].clientWidth || 1;
    var viewportHeight = instance.$viewport[0].clientHeight || instance.$root[0].clientHeight || 1;
    var squareWidth = viewportWidth / SQUARE_COLS;
    var squareHeight = viewportHeight / SQUARE_ROWS;
    var totalSquares = SQUARE_COLS * SQUARE_ROWS;
    var delayStep = instance.options.animationDuration / totalSquares;
    var patternIndex;
    var patternName;
    var order;
    var rowIndex;
    var columnIndex;

    clearCleanupTimer(instance);
    ensureStage(instance);
    clearStage(instance);

    if (typeof instance._squaresPatternIndex !== "number") {
      instance._squaresPatternIndex = 0;
    }

    patternIndex = instance._squaresPatternIndex % SQUARE_PATTERNS.length;
    patternName = SQUARE_PATTERNS[patternIndex];
    order = getPatternOrder(patternName, SQUARE_COLS, SQUARE_ROWS);

    if (instance._squaresPatternIndex % 2 === 1) {
      order.reverse();
      patternName += "-reverse";
    }

    instance._squaresPatternIndex += 1;
    instance.$root.attr("data-squares-pattern", patternName);
    instance.$root.attr("data-squares-source", previousIndex + "-" + targetIndex);
    instance.$squaresStage.css({
      width: viewportWidth + "px",
      height: viewportHeight + "px"
    });

    for (rowIndex = 0; rowIndex < SQUARE_ROWS; rowIndex += 1) {
      for (columnIndex = 0; columnIndex < SQUARE_COLS; columnIndex += 1) {
        var squareIndex = getIndex(rowIndex, columnIndex, SQUARE_COLS);
        var orderIndex = order.indexOf(squareIndex);
        var left = columnIndex * squareWidth;
        var top = rowIndex * squareHeight;
        var width = columnIndex === SQUARE_COLS - 1 ? viewportWidth - (squareWidth * columnIndex) : squareWidth;
        var height = rowIndex === SQUARE_ROWS - 1 ? viewportHeight - (squareHeight * rowIndex) : squareHeight;

        buildSquare(instance, {
          squareIndex: squareIndex,
          rowIndex: rowIndex,
          columnIndex: columnIndex,
          left: left,
          top: top,
          width: width,
          height: height,
          viewportWidth: viewportWidth,
          viewportHeight: viewportHeight,
          imageValue: imageValue,
          delay: Math.round(orderIndex * delayStep)
        });
      }
    }

    instance._squaresCleanupTimer = window.setTimeout(function () {
      clearStage(instance);
      clearCleanupTimer(instance);
    }, instance.options.animationDuration + 120);
  }

  window.SliderX.registerAnimation("squares", {
    mode: "layered",
    onActivate: function (instance) {
      primeInstance(instance);
      clearCleanupTimer(instance);
      clearStage(instance);
    },
    onBeforeTransition: function (instance, payload) {
      primeInstance(instance);
      applySquaresState(instance, payload || {});
    }
  });
})(window, window.jQuery);
