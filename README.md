# xx-VIRUS-xx.github.io

Personal portfolio of Prabhat Saxena: https://xx-virus-xx.github.io/

A plain static site with no build step and no dependencies: `index.html`, `css/styles.css` and `js/main.js`. The hero is a full-viewport looping background video (`media/hero.mp4`, about 1.4 MB, rendered from HTML and GSAP with HyperFrames) that autoplays muted, pauses when the tab is hidden and stays on its poster frame when the visitor prefers reduced motion. Colours follow the visitor's light or dark setting.

## Run locally

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

## Content

- Experience and skills come from my resume; the figures in the Experience section are resume figures.
- Research results are copied from the results documents in the linked repositories, including the caveats.
- Certifications link to their Credly pages and Credly shows each badge's current status.

## Deploy

GitHub Pages serves the `main` branch from the repository root. Pushing to `main` redeploys.
