(function () {
  'use strict';

  document.documentElement.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Reveal sections as they come into view. Anything at or above the reveal line is shown,
  // so a section can never stay hidden after a fast scroll, a jump to an anchor or a resize.
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function revealCheck() {
    var line = window.innerHeight * 0.9;
    pending = pending.filter(function (el) {
      if (reduceMotion || el.getBoundingClientRect().top < line) {
        el.classList.add('in');
        return false;
      }
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; revealCheck(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', revealCheck);
  revealCheck();

  // Hero: a drifting knowledge graph. Nodes link to nearby nodes and react to the pointer.
  var canvas = document.getElementById('graph');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var nodes = [];
  var width = 0, height = 0, dpr = 1;
  var pointer = { x: -9999, y: -9999 };
  var running = false, raf = 0;

  function color(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(90, Math.max(28, (width * height) / 16000)));
    while (nodes.length < target) {
      nodes.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: 1.4 + Math.random() * 1.8
      });
    }
    nodes.length = target;
  }

  function draw() {
    var accent = color('--accent', '#5eead4');
    var link = 140;
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (!reduceMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;
        var dx = a.x - pointer.x, dy = a.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { var f = (14000 - d2) / 14000 * 0.9; a.x += dx * f * 0.02; a.y += dy * f * 0.02; }
      }
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], ex = a.x - b.x, ey = a.y - b.y, dist = Math.sqrt(ex * ex + ey * ey);
        if (dist < link) {
          ctx.globalAlpha = (1 - dist / link) * 0.45;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = accent;
    for (var k = 0; k < nodes.length; k++) {
      ctx.beginPath(); ctx.arc(nodes[k].x, nodes[k].y, nodes[k].r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize();
  draw();
  window.addEventListener('resize', function () { resize(); draw(); });
  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left; pointer.y = e.clientY - rect.top;
  });
  hero.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting && !document.hidden ? start() : stop();
    }).observe(hero);
  } else { start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
})();
