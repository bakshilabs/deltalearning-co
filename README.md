# Delta Learning

The website for [deltaopslearning.com](https://deltaopslearning.com): safe, game-based AI learning for organisations that work with children.

A static site with no build step and no third-party requests. Fonts and libraries are self-hosted, and there are no cookies, analytics or trackers.

## Files

- `index.html`: the homepage (single page, anchored sections)
- `css/site.css`: page styles. Display type is Bricolage Grotesque, text is Inter, and the brand colours are the DeltaOps navy and the blue to green gradient.
- `css/game.css`: the game windows and their on-screen interface (HUD). Everything inside a game uses Inter.
- `js/site.js`: page behaviour (nav, mobile menu, scroll progress, reveals)
- `js/game/engine.js`: a small voxel engine on three.js. One WebGL renderer draws every game window on the page, with soft shadows, baked ambient occlusion and a block-by-block build animation.
- `js/game/worlds.js`: the five worlds: a pond habitat, a rover on Mars, an island expedition, Roman Londinium and Eco Town
- `js/game/hud.js` and `js/game/trailers.js`: the game interface and the scripted play-throughs for the four fictional partner brands
- `js/game/main.js`: wires the hero player, the tabbed example worlds and the playable Eco Town demo
- `js/vendor/three.module.min.js`: three.js r160 (MIT)
- `img/game/`: stills of each world, used as placeholders while the 3D loads and as a fallback without WebGL
- `img/photo/`: generated photography (1600 and 800 wide), not used on the current homepage
- `img/og.jpg`: the social sharing image (1200 × 630)
- `404.html`: catches old links such as `/deck/` and `/kids/`
- `assets/`: the logo, the favicon mark and fonts

## Run locally

```sh
python3 -m http.server
```

Then open http://localhost:8000. The site uses root-relative image paths, so serve it from the repository root.

## Writing rules

- British English. No em dashes.
- Only claim what the product does today. The prototypes have no live AI model and no child accounts, and they keep progress in the browser. They are tested in desktop Chrome and Safari. Anything else is described as a design goal.
- The four partner brands (Eco AI Explorer, AI Inventor Lab, Mission AI, AI Time Traveller) are fictional and labelled as such.
- Name no customer or partner without written permission, and do not name third-party games on the site.

## Publishing

GitHub Pages serves `main` at https://deltaopslearning.com (see `CNAME`). Pushing to `main` deploys in about a minute.

The previous site (the AI Lab landing page) is kept on the `archive/ai-lab-landing` branch and the `archive-ai-lab-landing-2026-10-10` tag.
