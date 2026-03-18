(function (window, $) {
  var INDICATOR_TYPES = ["none", "circles", "squares", "underscores", "pill"];
  var BUTTON_POSITIONS = ["top", "center", "bottom"];
  var DEFAULT_ANIMATION = "instant";
  var animationRegistry = window.SliderX && window.SliderX.animations ? window.SliderX.animations : {};

  var defaults = {
    startIndex: 0,
    indicatorType: "circles",
    indicatorChrome: true,
    navInside: false,
    buttonsInside: false,
    buttonsPosition: "center",
    animation: DEFAULT_ANIMATION,
    animationDuration: 820,
    autoPlay: false,
    interval: 6500,
    pauseOnHover: true
  };

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function sanitizeValue(value, allowed, fallback) {
    var normalized = (value || "").toString().trim().toLowerCase();

    if (allowed.indexOf(normalized) === -1) {
      return fallback;
    }

    return normalized;
  }

  function normalizeAnimationName(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function getRegisteredAnimationNames() {
    return Object.keys(animationRegistry);
  }

  function hasRegisteredAnimation(name) {
    return hasOwn(animationRegistry, normalizeAnimationName(name));
  }

  function getFallbackAnimationName(preferred) {
    var availableAnimations = getRegisteredAnimationNames();
    var preferredName = normalizeAnimationName(preferred);

    if (preferredName && hasRegisteredAnimation(preferredName)) {
      return preferredName;
    }

    if (hasRegisteredAnimation(DEFAULT_ANIMATION)) {
      return DEFAULT_ANIMATION;
    }

    if (availableAnimations.length) {
      return availableAnimations[0];
    }

    return DEFAULT_ANIMATION;
  }

  function sanitizeAnimation(value, fallback) {
    var normalized = normalizeAnimationName(value);

    if (normalized && hasRegisteredAnimation(normalized)) {
      return normalized;
    }

    return getFallbackAnimationName(fallback);
  }

  function getAnimationDefinition(name, fallback) {
    var animationName = sanitizeAnimation(name, fallback);

    if (hasRegisteredAnimation(animationName)) {
      return animationRegistry[animationName];
    }

    return {
      name: DEFAULT_ANIMATION,
      mode: "instant"
    };
  }

  function toInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  function toBoolean(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }
    }

    if (value == null) {
      return fallback;
    }

    return Boolean(value);
  }

  function normalizeIndex(index, total) {
    if (!total) {
      return 0;
    }

    return ((index % total) + total) % total;
  }

  function normalizeButtonPosition(value, fallback) {
    var normalized = (value || "").toString().trim().toLowerCase();

    if (normalized === "middle") {
      normalized = "center";
    }

    if (BUTTON_POSITIONS.indexOf(normalized) === -1) {
      return fallback;
    }

    return normalized;
  }

  function isStripAnimation(animation) {
    return getAnimationDefinition(animation, defaults.animation).mode === "strip";
  }

  function isLayeredAnimation(animation) {
    return getAnimationDefinition(animation, defaults.animation).mode === "layered";
  }

  function getTrackOffset(index, animation) {
    var definition = getAnimationDefinition(animation, defaults.animation);

    if (typeof definition.getTrackOffset === "function") {
      return definition.getTrackOffset(index);
    }

    return "translate3d(" + (-index * 100) + "%, 0, 0)";
  }

  function normalizeBackgroundValue(backgroundValue) {
    return String(backgroundValue).replace(/url\((['"]?)([^'")]+)\1\)/g, function (match, quote, url) {
      var trimmed = (url || "").trim();

      if (!trimmed || /^(?:[a-z]+:|\/|#)/i.test(trimmed)) {
        return 'url("' + trimmed + '")';
      }

      try {
        return 'url("' + new window.URL(trimmed, window.location.href).href + '")';
      } catch (error) {
        return match;
      }
    });
  }

  function extractPrimaryBackgroundImage(backgroundValue) {
    var matches = [];
    var normalizedBackground = normalizeBackgroundValue(backgroundValue);

    normalizedBackground.replace(/url\((['"]?)([^'")]+)\1\)/g, function (match, quote, url) {
      matches.push((url || "").trim());
      return match;
    });

    if (!matches.length) {
      return normalizedBackground;
    }

    return 'url("' + matches[matches.length - 1] + '")';
  }

  function runAnimationHook(instance, hookName, payload) {
    var definition = getAnimationDefinition(instance.options.animation, defaults.animation);

    if (typeof definition[hookName] === "function") {
      definition[hookName](instance, payload || {});
    }
  }

  function SliderX(element, options) {
    this.$root = $(element);
    this.options = $.extend({}, defaults, this.$root.data(), options);
    this.$slides = this.$root.find(".sliderx__slide");
    this.total = this.$slides.length;
    this.currentIndex = 0;
    this.autoTimer = null;
    this.animationTimer = null;
    this.isAnimating = false;

    if (!this.total) {
      return;
    }

    this.init();
  }

  SliderX.animations = animationRegistry;

  SliderX.registerAnimation = function (name, definition) {
    var animationName = normalizeAnimationName(name || (definition && definition.name));
    var nextDefinition;

    if (!animationName) {
      return;
    }

    nextDefinition = $.extend({
      name: animationName,
      mode: "instant"
    }, definition);
    nextDefinition.name = animationName;
    animationRegistry[animationName] = nextDefinition;
  };

  SliderX.getAnimation = function (name, fallback) {
    return getAnimationDefinition(name, fallback);
  };

  SliderX.getAnimationNames = function () {
    return getRegisteredAnimationNames();
  };

  SliderX.prototype.init = function () {
    this.cacheDom();
    this.prepareOptions(false, this.options);
    this.applyControlPlacement();
    this.prepareSlides();
    this.buildIndicators();
    this.bindEvents();
    this.renderCurrentState(false);
    runAnimationHook(this, "onActivate", {
      previousAnimation: null,
      nextAnimation: this.options.animation
    });
    this.startAutoPlay();
  };

  SliderX.prototype.cacheDom = function () {
    this.$viewport = this.$root.find(".sliderx__viewport");
    this.$bgStage = this.$root.find(".sliderx__bg-stage");
    this.$bgBase = this.$root.find(".sliderx__bg-base");
    this.$contentStage = this.$root.find(".sliderx__content-stage");
    this.$controls = this.$root.find(".sliderx__controls");
    this.$nav = this.$root.find(".sliderx__nav");
    this.$prev = this.$root.find(".sliderx__button.is-prev");
    this.$next = this.$root.find(".sliderx__button.is-next");
    this.$bgTrack = this.$root.find(".sliderx__bg-track");

    if (!this.$viewport.length) {
      this.$viewport = this.$root;
    }

    if (!this.$bgStage.length) {
      this.$bgStage = $('<div class="sliderx__bg-stage"></div>').prependTo(this.$viewport);
    }

    if (!this.$bgBase.length) {
      this.$bgBase = $('<div class="sliderx__bg-base"></div>').appendTo(this.$bgStage);
    }

    if (!this.$contentStage.length) {
      this.$contentStage = $('<div class="sliderx__content-stage"></div>').appendTo(this.$viewport);
      this.$slides.appendTo(this.$contentStage);
    }

    if (!this.$bgTrack.length) {
      this.$bgTrack = $('<div class="sliderx__bg-track" aria-hidden="true"></div>').appendTo(this.$bgStage);
    }

    if (!this.$nav.length) {
      this.$nav = $('<div class="sliderx__nav"></div>').appendTo(this.$root);
    }
  };

  SliderX.prototype.prepareOptions = function (preserveIndex, newOptions) {
    var hasStartIndex = newOptions && hasOwn(newOptions, "startIndex");
    var nextIndex = preserveIndex && !hasStartIndex
      ? this.currentIndex
      : toInt(this.options.startIndex, defaults.startIndex);

    this.options.indicatorType = sanitizeValue(this.options.indicatorType, INDICATOR_TYPES, defaults.indicatorType);
    this.options.indicatorChrome = toBoolean(this.options.indicatorChrome, defaults.indicatorChrome);
    this.options.navInside = toBoolean(this.options.navInside, defaults.navInside);
    this.options.buttonsInside = toBoolean(this.options.buttonsInside, defaults.buttonsInside);
    this.options.buttonsPosition = normalizeButtonPosition(this.options.buttonsPosition, defaults.buttonsPosition);
    this.options.animation = sanitizeAnimation(this.options.animation, this.options.animation || defaults.animation);
    this.options.animationDuration = Math.max(250, toInt(this.options.animationDuration, defaults.animationDuration));
    this.options.interval = Math.max(2500, toInt(this.options.interval, defaults.interval));
    this.options.pauseOnHover = toBoolean(this.options.pauseOnHover, defaults.pauseOnHover);
    this.options.autoPlay = toBoolean(this.options.autoPlay, defaults.autoPlay);
    this.currentIndex = normalizeIndex(nextIndex, this.total);

    this.$root.attr("data-indicator-type", this.options.indicatorType);
    this.$root.attr("data-indicator-chrome", this.options.indicatorChrome ? "on" : "off");
    this.$root.attr("data-nav-placement", this.options.navInside ? "inside" : "outside");
    this.$root.attr("data-button-placement", this.options.buttonsInside ? "inside" : "outside");
    this.$root.attr("data-button-position", this.options.buttonsPosition);
    this.$root.attr("data-animation", this.options.animation);
    this.$root[0].style.setProperty("--sliderx-animation-duration", this.options.animationDuration + "ms");
  };

  SliderX.prototype.applyControlPlacement = function () {
    var hasExternalControls;

    if (!this.$controls.length) {
      return;
    }

    this.$root.attr("data-nav-placement", this.options.navInside ? "inside" : "outside");
    this.$root.attr("data-button-placement", this.options.buttonsInside ? "inside" : "outside");
    this.$root.attr("data-button-position", this.options.buttonsPosition);

    if (this.$prev.length) {
      this.$prev.detach();
    }

    if (this.$nav.length) {
      this.$nav.detach();
    }

    if (this.$next.length) {
      this.$next.detach();
    }

    if (this.options.buttonsInside) {
      if (this.$prev.length) {
        this.$viewport.append(this.$prev);
      }

      if (this.$next.length) {
        this.$viewport.append(this.$next);
      }
    } else {
      if (this.$prev.length) {
        this.$controls.append(this.$prev);
      }

      if (this.$next.length) {
        this.$controls.append(this.$next);
      }
    }

    if (this.options.navInside) {
      if (this.$nav.length) {
        this.$viewport.append(this.$nav);
      }
    } else if (this.$nav.length) {
      if (this.$prev.length && !this.options.buttonsInside) {
        this.$nav.insertAfter(this.$prev);
      } else {
        this.$controls.prepend(this.$nav);
      }
    }

    hasExternalControls = this.$controls.find("> .sliderx__button, > .sliderx__nav").length > 0;

    if (hasExternalControls) {
      this.$controls.removeAttr("hidden");
      return;
    }

    this.$controls.attr("hidden", "hidden");
  };

  SliderX.prototype.prepareSlides = function () {
    var self = this;

    this.$slides.each(function (index) {
      var background = self.getBackground(index);
      var slideImage = extractPrimaryBackgroundImage(background);

      $(this).attr({
        "data-slide-index": index,
        "aria-hidden": "true"
      }).css({
        "--sliderx-slide-bg": background,
        "--sliderx-slide-image": slideImage
      });
    });

    this.$bgTrack.empty();

    this.$slides.each(function (index) {
      var background = self.getBackground(index);
      var slideImage = extractPrimaryBackgroundImage(background);
      var $panel = $('<div class="sliderx__bg-panel"></div>');

      $panel.attr("data-slide-index", index);
      $panel.css({
        "--sliderx-panel-bg": background,
        "--sliderx-panel-image": slideImage
      });
      self.applyBackground($panel, background);
      self.$bgTrack.append($panel);
    });
  };

  SliderX.prototype.buildIndicators = function () {
    var index;
    var $indicator;

    this.$nav.empty();

    if (this.total < 2 || this.options.indicatorType === "none") {
      this.$nav.attr("hidden", "hidden");
      return;
    }

    this.$nav.removeAttr("hidden");

    for (index = 0; index < this.total; index += 1) {
      $indicator = $('<button class="sliderx__indicator" type="button"></button>');
      $indicator.attr({
        "data-slide-index": index,
        "aria-label": "Go to slide " + (index + 1)
      });
      this.$nav.append($indicator);
    }
  };

  SliderX.prototype.bindEvents = function () {
    var self = this;

    if (this.$prev.length) {
      this.$prev.on("click.sliderX", function () {
        self.prev();
      });
    }

    if (this.$next.length) {
      this.$next.on("click.sliderX", function () {
        self.next();
      });
    }

    this.$nav.on("click.sliderX", ".sliderx__indicator", function () {
      self.goTo(toInt($(this).attr("data-slide-index"), self.currentIndex));
    });

    this.$root.on("mouseenter.sliderX", function () {
      if (self.options.pauseOnHover) {
        self.stopAutoPlay();
      }
    });

    this.$root.on("mouseleave.sliderX", function () {
      if (self.options.pauseOnHover) {
        self.startAutoPlay();
      }
    });
  };

  SliderX.prototype.getBackground = function (index) {
    return normalizeBackgroundValue(
      this.$slides.eq(index).attr("data-bg") || "linear-gradient(135deg, #0e1424 0%, #253f6d 100%)"
    );
  };

  SliderX.prototype.applyBackground = function ($target, backgroundValue) {
    $target.css("background-image", backgroundValue);
  };

  SliderX.prototype.updateIndicators = function () {
    var $indicators = this.$nav.find(".sliderx__indicator");

    if (!$indicators.length) {
      return;
    }

    $indicators.removeClass("is-active").removeAttr("aria-current");
    $indicators.eq(this.currentIndex).addClass("is-active").attr("aria-current", "true");
  };

  SliderX.prototype.clearAnimationTimer = function () {
    if (!this.animationTimer) {
      return;
    }

    window.clearTimeout(this.animationTimer);
    this.animationTimer = null;
  };

  SliderX.prototype.syncStripPosition = function (animate) {
    var transitionValue = animate
      ? "transform " + this.options.animationDuration + "ms cubic-bezier(0.22, 0.61, 0.36, 1)"
      : "none";
    var transformValue = getTrackOffset(this.currentIndex, this.options.animation);

    this.$bgTrack.css({
      transition: transitionValue,
      transform: transformValue
    });

    this.$contentStage.css({
      transition: transitionValue,
      transform: transformValue
    });
  };

  SliderX.prototype.animateLayered = function (previousIndex, targetIndex) {
    var direction = arguments.length > 2 && arguments[2] ? arguments[2] : "next";
    var $panels = this.$bgTrack.children(".sliderx__bg-panel");
    var $previousPanel = $panels.eq(previousIndex);
    var $targetPanel = $panels.eq(targetIndex);
    var $previousSlide = this.$slides.eq(previousIndex);
    var $targetSlide = this.$slides.eq(targetIndex);

    this.$contentStage.css({
      transition: "none",
      transform: ""
    });

    this.$bgTrack.css({
      transition: "none",
      transform: ""
    });

    this.$root.attr("data-animation-direction", direction);
    this.$slides.removeClass("is-active is-entering is-leaving").attr("aria-hidden", "true");
    $panels.removeClass("is-active is-entering is-leaving");

    $previousSlide.addClass("is-active is-leaving").attr("aria-hidden", "false");
    $targetSlide.addClass("is-entering").attr("aria-hidden", "false");
    $previousPanel.addClass("is-active is-leaving");
    $targetPanel.addClass("is-entering");

    this.updateIndicators();

    void this.$viewport[0].offsetWidth;
    this.$root.addClass("is-animating");
  };

  SliderX.prototype.renderCurrentState = function (animate) {
    var $active = this.$slides.eq(this.currentIndex);
    var $activePanel = this.$bgTrack.children(".sliderx__bg-panel").eq(this.currentIndex);

    this.$slides.removeClass("is-active is-entering is-leaving").attr("aria-hidden", "true");
    this.$bgTrack.children(".sliderx__bg-panel").removeClass("is-active is-entering is-leaving");
    this.$root.removeAttr("data-animation-direction");
    $active.addClass("is-active").attr("aria-hidden", "false");

    if (isStripAnimation(this.options.animation)) {
      this.syncStripPosition(Boolean(animate));
    } else if (isLayeredAnimation(this.options.animation)) {
      this.$bgTrack.css({
        transition: "none",
        transform: ""
      });

      this.$contentStage.css({
        transition: "none",
        transform: ""
      });

      $activePanel.addClass("is-active");
    } else {
      this.$bgTrack.css({
        transition: "none",
        transform: getTrackOffset(this.currentIndex, DEFAULT_ANIMATION)
      });

      this.$contentStage.css({
        transition: "none",
        transform: ""
      });

      this.applyBackground(this.$bgBase, this.getBackground(this.currentIndex));
    }

    this.updateIndicators();
  };

  SliderX.prototype.finishAnimation = function () {
    this.clearAnimationTimer();
    this.isAnimating = false;
    this.$root.removeClass("is-animating");
    this.startAutoPlay();
  };

  SliderX.prototype.startAutoPlay = function () {
    var self = this;

    if (!this.options.autoPlay || this.total < 2 || this.autoTimer || this.isAnimating) {
      return;
    }

    this.autoTimer = window.setInterval(function () {
      self.next();
    }, this.options.interval);
  };

  SliderX.prototype.stopAutoPlay = function () {
    if (!this.autoTimer) {
      return;
    }

    window.clearInterval(this.autoTimer);
    this.autoTimer = null;
  };

  SliderX.prototype.goTo = function (index, directionHint) {
    var previousIndex = this.currentIndex;
    var targetIndex = normalizeIndex(index, this.total);
    var direction = directionHint || (targetIndex < this.currentIndex ? "prev" : "next");
    var self = this;

    if (this.total < 2 || this.isAnimating || targetIndex === this.currentIndex) {
      return;
    }

    this.stopAutoPlay();
    this.clearAnimationTimer();
    this.currentIndex = targetIndex;
    runAnimationHook(this, "onBeforeTransition", {
      previousIndex: previousIndex,
      targetIndex: targetIndex,
      direction: direction
    });

    if (isLayeredAnimation(this.options.animation)) {
      this.isAnimating = true;
      this.animateLayered(previousIndex, targetIndex, direction);
      this.animationTimer = window.setTimeout(function () {
        self.renderCurrentState(false);
        self.finishAnimation();
      }, this.options.animationDuration + 40);
      return;
    }

    if (isStripAnimation(this.options.animation)) {
      this.isAnimating = true;
      this.$root.addClass("is-animating");
      this.renderCurrentState(true);
      this.animationTimer = window.setTimeout(function () {
        self.finishAnimation();
      }, this.options.animationDuration + 40);
      return;
    }

    this.renderCurrentState(false);
    this.startAutoPlay();
  };

  SliderX.prototype.next = function () {
    this.goTo(this.currentIndex + 1, "next");
  };

  SliderX.prototype.prev = function () {
    this.goTo(this.currentIndex - 1, "prev");
  };

  SliderX.prototype.setIndicatorType = function (indicatorType) {
    this.options.indicatorType = sanitizeValue(indicatorType, INDICATOR_TYPES, defaults.indicatorType);
    this.$root.attr("data-indicator-type", this.options.indicatorType);
    this.buildIndicators();
    this.updateIndicators();
  };

  SliderX.prototype.setIndicatorChrome = function (indicatorChrome) {
    this.options.indicatorChrome = toBoolean(indicatorChrome, defaults.indicatorChrome);
    this.$root.attr("data-indicator-chrome", this.options.indicatorChrome ? "on" : "off");
  };

  SliderX.prototype.setNavInside = function (navInside) {
    this.options.navInside = toBoolean(navInside, defaults.navInside);
    this.applyControlPlacement();
  };

  SliderX.prototype.setButtonsInside = function (buttonsInside) {
    this.options.buttonsInside = toBoolean(buttonsInside, defaults.buttonsInside);
    this.applyControlPlacement();
  };

  SliderX.prototype.setButtonsPosition = function (buttonsPosition) {
    this.options.buttonsPosition = normalizeButtonPosition(buttonsPosition, defaults.buttonsPosition);
    this.applyControlPlacement();
  };

  SliderX.prototype.setAnimation = function (animation) {
    var previousAnimation = this.options.animation;

    this.options.animation = sanitizeAnimation(animation, this.options.animation || defaults.animation);
    this.$root.attr("data-animation", this.options.animation);
    runAnimationHook(this, "onActivate", {
      previousAnimation: previousAnimation,
      nextAnimation: this.options.animation
    });
    this.renderCurrentState(false);
  };

  SliderX.prototype.setAnimationDuration = function (animationDuration) {
    this.options.animationDuration = Math.max(250, toInt(animationDuration, defaults.animationDuration));
    this.$root[0].style.setProperty("--sliderx-animation-duration", this.options.animationDuration + "ms");
    this.renderCurrentState(false);
  };

  SliderX.prototype.updateOptions = function (newOptions) {
    var previousAnimation = this.options.animation;

    this.stopAutoPlay();
    this.clearAnimationTimer();
    this.isAnimating = false;
    this.$root.removeClass("is-animating");
    this.options = $.extend({}, this.options, newOptions);
    this.prepareOptions(true, newOptions);
    this.applyControlPlacement();
    this.prepareSlides();
    this.buildIndicators();
    this.renderCurrentState(false);
    runAnimationHook(this, "onActivate", {
      previousAnimation: previousAnimation,
      nextAnimation: this.options.animation
    });
    this.startAutoPlay();
  };

  SliderX.prototype.destroy = function () {
    this.stopAutoPlay();
    this.clearAnimationTimer();
    this.isAnimating = false;
    this.$root.removeClass("is-animating");
    this.$root.off(".sliderX");
    this.$nav.off(".sliderX");
    this.$prev.off(".sliderX");
    this.$next.off(".sliderX");
    this.$slides.removeClass("is-active").removeAttr("aria-hidden");
    this.$root.removeData("sliderX");
  };

  $.fn.sliderX = function (option) {
    var args = Array.prototype.slice.call(arguments, 1);

    return this.each(function () {
      var instance = $.data(this, "sliderX");

      if (!instance && typeof option !== "string") {
        instance = new SliderX(this, option);
        $.data(this, "sliderX", instance);
        return;
      }

      if (!instance || typeof option !== "string") {
        return;
      }

      if (typeof instance[option] === "function") {
        instance[option].apply(instance, args);
      }
    });
  };

  $.fn.sliderX.registerAnimation = SliderX.registerAnimation;
  $.fn.sliderX.getAnimations = SliderX.getAnimationNames;
  window.SliderX = SliderX;
})(window, jQuery);
