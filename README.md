# sliderX

sliderX is a modular jQuery slider demo with a shared core, pluggable animation packs, and a lightweight asset loader that only includes the styles and scripts you declare.

## Contents

- `index.html` - demo page and asset manifest
- `assets/css/jquery.sliderx.css` - shared slider layout, controls, and indicators
- `assets/css/animations/*.css` - one stylesheet per animation
- `assets/js/jquery.sliderx.js` - core plugin and animation registry
- `assets/js/animations/*.js` - one registrar per animation
- `assets/js/sliderx.asset-loader.js` - loads the requested CSS and JS files
- `assets/js/demo.js` - demo setup and live controls
- `assets/images/01.jpg` to `05.jpg` - sample slides used by the demo

## Live Demo

Open the project through XAMPP or any local web server and visit:

```text
http://localhost/SLIDER/
```

The demo currently defaults to the `cubeover` animation.

## Quick Start

1. Serve the project root from a local web server.
2. Open `index.html` in the browser through that server.
3. Edit the slide markup and `window.sliderXAssetConfig` in `index.html` to change the demo setup.

```html
<script>
  window.sliderXAssetConfig = {
    animations: {
      instant: true,
      slidex: true,
      slidey: true,
      slidez: true,
      shift: true,
      swipe: true,
      lines: true,
      circles: true,
      collage: true,
      hypno: true,
      tiles: true,
      thumbs: true,
      album: true,
      squares: true,
      slices: true,
      blast: true,
      open: true,
      curtains: true,
      cubeover: true,
      parallax: true,
      revealx: true,
      revealy: true
    },
    extraStyles: ["assets/css/demo.css"],
    extraScripts: ["assets/js/demo.js"]
  };
</script>
```

## Demo Options

| Option | Values | Purpose |
| --- | --- | --- |
| `indicatorType` | `none`, `circles`, `squares`, `underscores`, `pill` | Chooses the indicator style |
| `indicatorChrome` | `true` / `false` | Shows or hides the indicator frame |
| `navInside` | `true` / `false` | Places indicators inside the viewport |
| `buttonsInside` | `true` / `false` | Places prev/next buttons inside the viewport |
| `buttonsPosition` | `top`, `center`, `middle`, `bottom` | Sets the vertical button position |
| `animation` | Any loaded animation name | Selects the transition effect |
| `animationDuration` | Milliseconds | Sets the transition time for animated modes |
| `autoPlay` | `true` / `false` | Enables automatic rotation |
| `interval` | Milliseconds | Sets the autoplay delay |
| `pauseOnHover` | `true` / `false` | Pauses autoplay while hovering |

## Available Animations

- `instant`
- `slidex`
- `slidey`
- `slidez`
- `slidefade`
- `shift`
- `swipe`
- `lines`
- `circles`
- `collage`
- `hypno`
- `tiles`
- `thumbs`
- `album`
- `squares`
- `slices`
- `blast`
- `open`
- `curtains`
- `cubeover`
- `parallax`
- `revealx`
- `revealy`

## Notes

- `data-bg` should contain a valid CSS `background-image` value.
- The demo slide images are named `01.jpg` through `05.jpg`.
- The asset loader only includes the animations listed in `window.sliderXAssetConfig`.

