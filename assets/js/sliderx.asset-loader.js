(function (window, document) {
  var DEFAULT_ANIMATION = "instant";
  var manifest = {
    baseStyles: ["assets/css/jquery.sliderx.css"],
    baseScripts: ["assets/vendor/jquery-3.7.1.min.js", "assets/js/jquery.sliderx.js"],
    animations: {
      instant: {
        css: "assets/css/animations/instant.css",
        js: "assets/js/animations/instant.js"
      },
      slidex: {
        css: "assets/css/animations/slidex.css",
        js: "assets/js/animations/slidex.js"
      },
      slidey: {
        css: "assets/css/animations/slidey.css",
        js: "assets/js/animations/slidey.js"
      },
      slidez: {
        css: "assets/css/animations/slidez.css",
        js: "assets/js/animations/slidez.js"
      },
      slidefade: {
        css: "assets/css/animations/slidefade.css",
        js: "assets/js/animations/slidefade.js"
      },
      shift: {
        css: "assets/css/animations/shift.css",
        js: "assets/js/animations/shift.js"
      },
      swipe: {
        css: "assets/css/animations/swipe.css",
        js: "assets/js/animations/swipe.js"
      },
      lines: {
        css: "assets/css/animations/lines.css",
        js: "assets/js/animations/lines.js"
      },
      circles: {
        css: "assets/css/animations/circles.css",
        js: "assets/js/animations/circles.js"
      },
      collage: {
        css: "assets/css/animations/collage.css",
        js: "assets/js/animations/collage.js"
      },
      hypno: {
        css: "assets/css/animations/hypno.css",
        js: "assets/js/animations/hypno.js"
      },
      tiles: {
        css: "assets/css/animations/tiles.css",
        js: "assets/js/animations/tiles.js"
      },
      thumbs: {
        css: "assets/css/animations/thumbs.css",
        js: "assets/js/animations/thumbs.js"
      },
      album: {
        css: "assets/css/animations/album.css",
        js: "assets/js/animations/album.js"
      },
      squares: {
        css: "assets/css/animations/squares.css",
        js: "assets/js/animations/squares.js"
      },
      slices: {
        css: "assets/css/animations/slices.css",
        js: "assets/js/animations/slices.js"
      },
      blast: {
        css: "assets/css/animations/blast.css",
        js: "assets/js/animations/blast.js"
      },
      open: {
        css: "assets/css/animations/open.css",
        js: "assets/js/animations/open.js"
      },
      curtains: {
        css: "assets/css/animations/curtains.css",
        js: "assets/js/animations/curtains.js"
      },
      cubeover: {
        css: "assets/css/animations/cubeover.css",
        js: "assets/js/animations/cubeover.js"
      },
      parallax: {
        css: "assets/css/animations/parallax.css",
        js: "assets/js/animations/parallax.js"
      },
      revealx: {
        css: "assets/css/animations/revealx.css",
        js: "assets/js/animations/revealx.js"
      },
      revealy: {
        css: "assets/css/animations/revealy.css",
        js: "assets/js/animations/revealy.js"
      }
    }
  };
  var config = window.sliderXAssetConfig || {};

  function normalizeAnimationNames(input) {
    var names;

    if (Array.isArray(input)) {
      names = input.slice();
    } else if (typeof input === "string") {
      names = [input];
    } else if (input && typeof input === "object") {
      names = Object.keys(input).filter(function (key) {
        return Boolean(input[key]);
      });
    } else {
      names = [];
    }

    names = names
      .map(function (name) {
        return (name || "").toString().trim().toLowerCase();
      })
      .filter(Boolean);

    if (!names.length) {
      names.push(DEFAULT_ANIMATION);
    }

    return unique(names);
  }

  function normalizeAssetList(input) {
    if (Array.isArray(input)) {
      return input.filter(Boolean);
    }

    if (typeof input === "string" && input.trim()) {
      return [input.trim()];
    }

    return [];
  }

  function unique(values) {
    var seen = {};

    return values.filter(function (value) {
      var normalized = String(value);

      if (seen[normalized]) {
        return false;
      }

      seen[normalized] = true;
      return true;
    });
  }

  function logError(message, error) {
    if (window.console && typeof window.console.error === "function") {
      window.console.error(message, error || "");
    }
  }

  function logWarning(message, value) {
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn(message, value || "");
    }
  }

  function resolveAssets() {
    var animations = normalizeAnimationNames(config.animations);
    var styles = manifest.baseStyles.slice();
    var scripts = manifest.baseScripts.slice();

    animations.forEach(function (name) {
      var assets = manifest.animations[name];

      if (!assets) {
        logWarning("sliderX asset loader skipped unknown animation:", name);
        return;
      }

      styles.push(assets.css);
      scripts.push(assets.js);
    });

    return {
      animations: animations,
      styles: unique(styles.concat(normalizeAssetList(config.extraStyles))),
      scripts: unique(scripts.concat(normalizeAssetList(config.extraScripts)))
    };
  }

  function appendStyles(styles) {
    var head = document.head || document.getElementsByTagName("head")[0];

    styles.forEach(function (href) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      head.appendChild(link);
    });
  }

  function loadScriptsSequentially(scripts) {
    var head = document.head || document.getElementsByTagName("head")[0];

    return scripts.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (resolve, reject) {
          var script = document.createElement("script");
          script.src = src;
          script.async = false;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error("Failed to load " + src));
          };
          head.appendChild(script);
        });
      });
    }, Promise.resolve());
  }

  function emitReadyEvent() {
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("sliderx:assets-ready", {
        detail: window.sliderXResolvedAssets
      }));
    }
  }

  window.sliderXResolvedAssets = resolveAssets();
  appendStyles(window.sliderXResolvedAssets.styles);
  loadScriptsSequentially(window.sliderXResolvedAssets.scripts)
    .then(function () {
      window.sliderXAssetsReady = true;
      emitReadyEvent();
    })
    .catch(function (error) {
      window.sliderXAssetError = error;
      logError("sliderX asset loader failed.", error);
    });
})(window, document);
