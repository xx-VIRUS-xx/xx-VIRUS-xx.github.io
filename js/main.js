(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  var nav = $('.nav.over');
  var video = $('.hero-video');
  var hero = $('.hero');

  // Hero video: autoplay unless the visitor prefers reduced motion; pause when the tab is hidden.
  if (video) {
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); }
    else { var pl = video.play(); if (pl && pl.catch) pl.catch(function () {}); }
    document.addEventListener('visibilitychange', function () {
      if (reduce) return;
      if (document.hidden) video.pause(); else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }

  // Pointer-driven effects work without any library.
  if (hero && fine && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  $$('[data-tilt]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--gx', (px * 100) + '%');
      el.style.setProperty('--gy', (py * 100) + '%');
      if (reduce || !fine || !window.gsap) return;
      gsap.to(el, { rotationY: (px - 0.5) * 8, rotationX: (0.5 - py) * 8, transformPerspective: 900, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', function () {
      if (window.gsap && !reduce) gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    });
  });

  // Custom cursor + magnetic buttons.
  if (fine && !reduce) {
    var cursor = $('.cursor');
    if (cursor) {
      root.classList.add('has-cursor');
      var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
      window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
        requestAnimationFrame(loop);
      })();
      document.addEventListener('pointerover', function (e) {
        cursor.classList.toggle('hot', !!(e.target.closest && e.target.closest('a, button, [data-magnet]')));
      });
    }
    $$('[data-magnet]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (!window.gsap) return;
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.25, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', function () { if (window.gsap) gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }); });
    });
  }

  function navState() { if (nav) nav.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6); }
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    // Without the animation libraries (offline, blocked, reduced motion) the page is a plain, fully readable document.
    var bar = $('.progress span');
    if (bar && !reduce) window.addEventListener('scroll', function () {
      var m = root.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (m > 0 ? scrollY / m : 0) + ')';
    }, { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling (Lenis) driven by the GSAP ticker so ScrollTrigger stays in sync.
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis; // lets the guestbook dialog pause page scrolling while it is open
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id.length > 1 ? $(id) : null;
        if (id === '#top') { e.preventDefault(); lenis.scrollTo(0); }
        else if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20 }); }
      });
    });
  }

  // Scroll progress bar.
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // Hero: split headline into masked words, then reveal.
  var h1 = $('#hero-title');
  if (h1) {
    var out = [];
    (function walk(node, cls) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.push(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.textContent = part; if (cls) i.className = cls;
            w.appendChild(i); out.push(w);
          });
        } else if (n.nodeType === 1) { walk(n, n.className); }
      });
    })(h1, '');
    h1.textContent = '';
    out.forEach(function (n) { h1.appendChild(n); });
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' }, paused: !!window.__introActive });
    if (window.__introActive) window.addEventListener('introdone', function () { tl.play(0); });
    tl.from('.eyebrow', { y: 20, opacity: 0, duration: 0.8 }, 0.1)
      .from('#hero-title .w > span', { yPercent: 115, duration: 1.1, stagger: 0.06 }, 0.2)
      .from('.lead', { y: 24, opacity: 0, duration: 0.9 }, 0.7)
      .from('.cta .btn', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.85)
      .from('.nav-inner', { y: -24, opacity: 0, duration: 0.9 }, 0.3);
  }

  // Hero parallax: video pushes in and dims, text lifts away.
  if (hero && video) {
    gsap.to(video, { scale: 1.18, yPercent: 8, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true } });
  }

  // Reveal blocks.
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  $$('.kicker, h2.big, .note, .stat, .cert, .skills > div, .job, .links .btn, .mega').forEach(function (el) {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  // About statement: words light up as you scroll through it.
  var st = $('[data-words]');
  if (st) {
    var words = st.textContent.trim().split(/\s+/);
    st.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'word'; s.textContent = w;
      st.appendChild(s); if (i < words.length - 1) st.appendChild(document.createTextNode(' '));
    });
    gsap.fromTo($$('.word', st), { opacity: 0.18 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: st, start: 'top 82%', end: 'bottom 55%', scrub: true } });
  }

  // Counters.
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '';
    var o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v) + suffix; } });
    } });
  });

  // Timeline line draws as you scroll.
  var line = $('.timeline-line span');
  if (line) gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });

  var mm = gsap.matchMedia();

  // Research panels: each one recedes as the next slides over it.
  mm.add('(min-width: 900px)', function () {
    var panels = $$('.panel');
    panels.forEach(function (p, i) {
      if (i === panels.length - 1) return;
      gsap.to(p, { scale: 0.93, opacity: 0.55, ease: 'none', scrollTrigger: { trigger: panels[i + 1], start: 'top 85%', end: 'top 20%', scrub: true } });
    });
  });

  // Projects: pinned horizontal scroll on desktop.
  mm.add('(min-width: 900px)', function () {
    var sec = $('.hs'), pin = $('.hs-pin'), track = $('.hs-track');
    if (!sec || !pin || !track) return;
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 48); };
    gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
  });

  // Ambient colour follows the chapter in view; nav link highlights.
  var ambient = $('.ambient');
  $$('.chapter').forEach(function (sec) {
    var a = sec.style.getPropertyValue('--c1').trim(), b = sec.style.getPropertyValue('--glow').trim() || sec.style.getPropertyValue('--c2').trim();
    var link = $('.nav-links a[href="#' + sec.id + '"]');
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) {
        if (link) link.classList.toggle('active', self.isActive);
        if (self.isActive && ambient) { ambient.style.setProperty('--glow-a', a); ambient.style.setProperty('--glow-b', b); }
      }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
