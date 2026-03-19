$(function () {
  var $slider = $("#sliderx-showcase");
  var $form = $("#demo-controls");
  var $rangeValues = $form.find("[data-value-for]");
  var $summaryIndicator = $(".js-summary-indicator");
  var $summaryNav = $(".js-summary-nav");
  var $summaryButtons = $(".js-summary-buttons");
  var $summaryAnimation = $(".js-summary-animation");
  var $code = $(".js-demo-code");
  var applyTimer = null;
  var animationDurationPresets = {
    swipe: 1000,
    shift: 900,
    collage: 1100,
    hypno: 1000,
    open: 700,
    circles: 1100,
    tiles: 1100,
    cubeover: 900
  };
  var animationLabels = {
    instant: "Instant",
    slidex: "slidex",
    slidey: "slidey",
    slidez: "slidez",
    slidefade: "slidefade",
    shift: "shift",
    swipe: "swipe",
    lines: "lines",
    circles: "circles",
    collage: "collage",
    hypno: "hypno",
    tiles: "tiles",
    thumbs: "thumbs",
    album: "album",
    squares: "squares",
    slices: "slices",
    blast: "blast",
    open: "open",
    curtains: "curtains",
    cubeover: "cubeover",
    parallax: "parallax",
    revealx: "revealx",
    revealy: "revealy"
  };

  var defaults = {
    indicatorType: "underscores",
    indicatorChrome: "false",
    navInside: "true",
    buttonsInside: "true",
    buttonsPosition: "center",
    animation: "cubeover",
    animationDuration: "1000",
    autoPlay: "true",
    pauseOnHover: "true",
    interval: "4000"
  };

  function toBoolean(value) {
    return value === true || value === "true";
  }

  function getAvailableAnimations() {
    if (window.sliderXResolvedAssets && Array.isArray(window.sliderXResolvedAssets.animations) && window.sliderXResolvedAssets.animations.length) {
      return window.sliderXResolvedAssets.animations.slice();
    }

    if (window.SliderX && typeof window.SliderX.getAnimationNames === "function") {
      return window.SliderX.getAnimationNames();
    }

    return [defaults.animation];
  }

  function syncAnimationOptions() {
    var availableAnimations = getAvailableAnimations();
    var $animationField = $form.find("[name='animation']");
    var defaultAnimation = availableAnimations.indexOf(defaults.animation) === -1
      ? availableAnimations[0]
      : defaults.animation;

    $animationField.empty();

    availableAnimations.forEach(function (animationName) {
      $("<option></option>")
        .val(animationName)
        .text(animationLabels[animationName] || animationName)
        .appendTo($animationField);
    });

    defaults.animation = defaultAnimation;
  }

  function setFormDefaults() {
    Object.keys(defaults).forEach(function (key) {
      $form.find("[name='" + key + "']").val(defaults[key]);
    });
  }

  function readState() {
    var formData = new FormData($form[0]);

    return {
      indicatorType: formData.get("indicatorType"),
      indicatorChrome: toBoolean(formData.get("indicatorChrome")),
      navInside: toBoolean(formData.get("navInside")),
      buttonsInside: toBoolean(formData.get("buttonsInside")),
      buttonsPosition: formData.get("buttonsPosition"),
      animation: formData.get("animation"),
      animationDuration: parseInt(formData.get("animationDuration"), 10),
      autoPlay: toBoolean(formData.get("autoPlay")),
      pauseOnHover: toBoolean(formData.get("pauseOnHover")),
      interval: parseInt(formData.get("interval"), 10)
    };
  }

  function updateRangeValues(state) {
    $rangeValues.each(function () {
      var $value = $(this);
      var key = $value.attr("data-value-for");

      $value.text(state[key] + "ms");
    });
  }

  function updateDependentFields(state) {
    $form.find("[name='buttonsPosition']").closest(".demo-field").toggleClass("is-muted", !state.buttonsInside);
    $form.find("[name='animationDuration']").closest(".demo-field").toggleClass("is-muted", state.animation === "instant");
    $form.find("[name='interval']").closest(".demo-field").toggleClass("is-muted", !state.autoPlay);
    $form.find("[name='pauseOnHover']").closest(".demo-field").toggleClass("is-muted", !state.autoPlay);
  }

  function buildPluginOptions(state) {
    return {
      indicatorType: state.indicatorType,
      indicatorChrome: state.indicatorChrome,
      navInside: state.navInside,
      buttonsInside: state.buttonsInside,
      buttonsPosition: state.buttonsPosition,
      animation: state.animation,
      animationDuration: state.animationDuration,
      autoPlay: state.autoPlay,
      interval: state.interval,
      pauseOnHover: state.pauseOnHover
    };
  }

  function applyAnimationPreset(animationName) {
    var presetDuration = animationDurationPresets[animationName] || 800;
    var $durationField = $form.find("[name='animationDuration']");
    $durationField.val(String(presetDuration));
  }

  function updateSummary(state) {
    $summaryIndicator.text(state.indicatorType + " / " + (state.indicatorChrome ? "framed" : "plain"));
    $summaryNav.text(state.navInside ? "inside" : "outside");
    $summaryButtons.text((state.buttonsInside ? "inside" : "outside") + " / " + state.buttonsPosition);
    $summaryAnimation.text(state.animation);
  }

  function updateCode(state) {
    var lines = [
      '$("#sliderx-showcase").sliderX({',
      '  indicatorType: "' + state.indicatorType + '",',
      "  indicatorChrome: " + state.indicatorChrome + ",",
      "  navInside: " + state.navInside + ",",
      "  buttonsInside: " + state.buttonsInside + ",",
      '  buttonsPosition: "' + state.buttonsPosition + '",',
      '  animation: "' + state.animation + '",',
      "  animationDuration: " + state.animationDuration + ",",
      "  autoPlay: " + state.autoPlay + ",",
      "  interval: " + state.interval + ",",
      "  pauseOnHover: " + state.pauseOnHover,
      "});"
    ];

    $code
      .removeClass("hljs")
      .text(lines.join("\n"));

    if (window.hljs && typeof window.hljs.highlightElement === "function" && $code.length) {
      window.hljs.highlightElement($code[0]);
    }
  }

  function applyState() {
    var state = readState();
    var instance = $slider.data("sliderX");

    updateRangeValues(state);
    updateDependentFields(state);

    if (!instance) {
      $slider.sliderX(buildPluginOptions(state));
    } else {
      $slider.sliderX("updateOptions", buildPluginOptions(state));
    }

    updateSummary(state);
    updateCode(state);
  }

  function scheduleApply() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyState, 120);
  }

  $form.on("input change", "select, input", function (event) {
    if (event.type === "input" && this.tagName.toLowerCase() === "select") {
      return;
    }

    if (this.name === "animation" && event.type === "change") {
      applyAnimationPreset(this.value);
    }

    scheduleApply();
  });

  $(".demo-lab__actions").on("click", ".demo-action", function () {
    var action = $(this).attr("data-demo-action");
    var slideIndex = parseInt($(this).attr("data-slide-index"), 10);

    if (action === "reset") {
      setFormDefaults();
      applyState();
      return;
    }

    if (action === "prev") {
      $slider.sliderX("prev");
      return;
    }

    if (action === "next") {
      $slider.sliderX("next");
      return;
    }

    if (action === "slide" && !Number.isNaN(slideIndex)) {
      $slider.sliderX("goTo", slideIndex);
    }
  });

  syncAnimationOptions();
  setFormDefaults();
  if (window.hljs && typeof window.hljs.highlightAll === "function") {
    window.hljs.highlightAll();
  }
  applyState();
});
