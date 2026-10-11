# xx-VIRUS-xx.github.io

Personal portfolio of Prabhat Saxena: https://xx-virus-xx.github.io/

A static site with no build step: `index.html`, `css/styles.css` and `js/main.js`. Motion uses GSAP + ScrollTrigger (cdnjs) and Lenis smooth scrolling (jsDelivr), loaded from CDNs; if they fail to load, or the visitor prefers reduced motion, the page falls back to a plain readable document. The hero is a full-viewport looping video (`media/hero.mp4`, about 2 MB, a 3D shard animation rendered from HTML with HyperFrames). Dark theme only.

## Blog

`blog/` holds four system-design write-ups (static HTML with inline SVG architecture diagrams, styled by `css/blog.css`). They are written generically and do not name any employer or client.

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
