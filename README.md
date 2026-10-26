# xx-VIRUS-xx.github.io

Personal portfolio of Prabhat Saxena: https://latenightstack.com/ (also served at https://xx-virus-xx.github.io/)

A static site with no build step: `index.html`, `css/styles.css` and `js/main.js`. Motion uses GSAP + ScrollTrigger (cdnjs) and Lenis smooth scrolling (jsDelivr), loaded from CDNs; if they fail to load, or the visitor prefers reduced motion, the page falls back to a plain readable document. The hero is a full-viewport looping video (`media/hero.mp4`, about 2 MB, a 3D shard animation rendered from HTML with HyperFrames). Dark theme only.

## Landing intro

On the first visit per browser session the home page plays `media/intro.webm` (with an `intro.mp4` fallback, about 0.4 MB, 6 seconds, trimmed and recompressed from a screen recording) under a full-screen overlay. It has a Skip button, closes on Escape, on a click of the real "Enter" hit-area laid over the video's last frame, or automatically 1 second after the end. It never shows with reduced motion, and a watchdog closes it if the video cannot start. `/?intro` replays it.

## Visitor marks (guestbook)

Visitors can leave a mark: a name, a drawn signature and a short message, plus an ink print generated from the signature (art, not a real fingerprint). It is offered as an optional step in the intro and from the nav. Entries are stored as `pending` in a Cloudflare D1 database and appear on the site only after approval, in the Visitors section and as small prints in the margins on wide screens, each labelled as a visitor's mark and not my work.

- API: `functions/api/guestbook.js` (Cloudflare Pages Function, binding `DB`). Schema: `db/schema.sql`.
- Abuse controls: approve-first moderation, origin check, honeypot, minimum time on the pad, 3 posts per IP-hash per hour, a cap on pending entries, strict size and shape limits on the drawing, links rejected, names and messages shown as plain text only.
- Privacy: stores name, message, the drawing and a daily-salted hash of the IP (rate limiting only). No biometric data. Removal on request.
- Moderate with `./scripts/guestbook.sh pending | approve <id>|all | reject <id> | delete <id>`.
- The feature hides itself where the API does not exist (for example the GitHub Pages copy).

## Blog

`blog/` holds system-design write-ups and one satirical dialogue (static HTML with inline SVG architecture diagrams, styled by `css/blog.css`). They are written generically and do not name any employer or client.

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
