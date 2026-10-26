(function () {
  'use strict';

  // Visitor marks: a drawn signature plus a generated "ink print" (art made from the signature, not a real
  // fingerprint). Entries are saved as pending and only shown after approval.
  var API = '/api/guestbook';
  var PAD_W = 600, PAD_H = 240;
  var MAX_STROKES = 12, MAX_PTS_STROKE = 400, MAX_PTS_TOTAL = 1800;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INKS = ['#8b7bff', '#3de8b0', '#ff6aa2', '#f1b84a', '#5cc8ff'];

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- deterministic helpers ----
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  var clipId = 0;
  // A loop-and-whorl style print: warped concentric ridges with small gaps, clipped to a fingertip oval.
  function printSVG(seed) {
    var r = rng(seed), N = 96, id = 'gbc' + (clipId++);
    var cx = 50 + (r() - 0.5) * 6, cy = 50 + (r() - 0.5) * 6;
    var rings = 15 + Math.floor(r() * 6);
    var a1 = 0.10 + r() * 0.10, a2 = 0.04 + r() * 0.06, a3 = 0.02 + r() * 0.04;
    var p1 = r() * 6.283, p2 = r() * 6.283, p3 = r() * 6.283;
    var squash = 0.86 + r() * 0.14, drift = (r() - 0.5) * 10;
    var d = '';
    for (var k = 1; k <= rings; k++) {
      var t = k / rings, base = k * (46 / rings), pen = false;
      for (var i = 0; i <= N; i++) {
        var th = i / N * 6.2832;
        var w = 1 + t * (a1 * Math.sin(2 * th + p1) + a2 * Math.sin(3 * th + p2) + a3 * Math.sin(5 * th + p3));
        var x = cx + base * w * Math.cos(th) * (1 - 0.12 * t);
        var y = cy + base * w * Math.sin(th) * squash + t * drift;
        if (r() < 0.035) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        pen = true;
      }
    }
    var ink = INKS[seed % INKS.length];
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><ellipse cx="50" cy="52" rx="40" ry="47"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="1.5" stroke-linecap="round"/></g></svg>';
  }
  function inkOf(seed) { return INKS[seed % INKS.length]; }

  function signatureSVG(strokes) {
    var d = '';
    for (var s = 0; s < strokes.length; s++) {
      for (var i = 0; i < strokes[s].length; i++) d += (i ? 'L' : 'M') + strokes[s][i][0] + ' ' + strokes[s][i][1];
    }
    return '<svg viewBox="0 0 ' + PAD_W + ' ' + PAD_H + '" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---- state ----
  var entries = [];
  var mine = null;
  try { mine = JSON.parse(lsGet('gb:mine') || 'null'); } catch (e) { mine = null; }
  var available = false;

  // ---- DOM building (names and messages always go in through textContent) ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function card(entry, pending) {
    var c = el('article', 'gb-card' + (pending ? ' is-pending' : ''));
    c.style.setProperty('--ink', inkOf(entry.seed));
    var p = el('div', 'gb-print'); p.innerHTML = printSVG(entry.seed); c.appendChild(p);
    var body = el('div', 'gb-body');
    var sig = el('div', 'gb-sig'); sig.innerHTML = signatureSVG(entry.strokes); body.appendChild(sig);
    body.appendChild(el('p', 'gb-name', entry.name));
    if (entry.message) body.appendChild(el('p', 'gb-msg', entry.message));
    body.appendChild(el('p', 'gb-label', pending ? 'Yours. Only you can see this until it is approved.' : "A visitor's mark. Not part of Prabhat's work."));
    c.appendChild(body);
    return c;
  }

  function allEntries() {
    var list = entries.slice();
    if (mine && !list.some(function (e) { return e.id === mine.id; })) list.unshift(mine);
    return list;
  }

  function renderWall() {
    var wall = $('#wall'), section = $('#visitors');
    if (!wall || !section) return;
    wall.textContent = '';
    var list = allEntries();
    list.forEach(function (e) { wall.appendChild(card(e, mine && e.id === mine.id && !entries.some(function (x) { return x.id === e.id; }))); });
    section.hidden = !available;
    var empty = $('#wall-empty');
    if (empty) empty.hidden = list.length > 0;
  }

  // ---- marks in the margins (wide screens only) ----
  var MIN_GUTTER = 120, CONTAINER = 1080;
  function renderMargins() {
    var layer = $('#marks-layer'), pill = $('#marks-pill');
    if (!layer) return;
    layer.textContent = '';
    var gutter = (window.innerWidth - CONTAINER) / 2;
    var list = allEntries();
    var on = available && gutter >= MIN_GUTTER && list.length && lsGet('gb:hide') !== '1';
    if (pill) pill.hidden = !(available && gutter >= MIN_GUTTER && list.length);
    var hid = lsGet('gb:hide') === '1', hb = $('#marks-hide'), sb = $('#marks-show');
    if (hb) hb.hidden = hid;
    if (sb) sb.hidden = !hid;
    if (!on) return;
    var H = Math.max(document.documentElement.scrollHeight, 2000);
    layer.style.height = H + 'px';
    var hero = $('.hero'), top = Math.max(180, (hero ? hero.offsetHeight : 0) + 60);
    var show = list.slice(0, 24), span = H - top - 360, band = span / show.length;
    show.forEach(function (e, i) {
      var r = rng(e.seed ^ 0x9e3779b9);
      var left = i % 2 === 0, size = 54 + Math.floor(r() * 26);
      var y = top + i * band + r() * band * 0.6;
      var room = Math.max(0, gutter - size - 28);
      var x = 14 + r() * room;
      var m = el('div', 'mark ' + (left ? 'is-left' : 'is-right'));
      m.style.top = Math.round(y) + 'px';
      m.style[left ? 'left' : 'right'] = Math.round(x) + 'px';
      m.style.width = m.style.height = size + 'px';
      m.style.setProperty('--ink', inkOf(e.seed));
      m.style.setProperty('--rot', Math.round(r() * 36 - 18) + 'deg');
      var print = el('div', 'mark-print'); print.innerHTML = printSVG(e.seed); m.appendChild(print);
      var pending = mine && e.id === mine.id && !entries.some(function (x) { return x.id === e.id; });
      m.appendChild(card(e, pending));
      layer.appendChild(m);
    });
  }

  // ---- dialog ----
  var dlg, pad, ctx, strokes = [], current = null, openedAt = 0, submitted = false, resolver = null;

  function totalPoints() { return strokes.reduce(function (n, s) { return n + s.length; }, 0); }

  function canonical() { return JSON.stringify(strokes) + '|' + ($('#gb-name').value || '').trim(); }

  function redraw() {
    ctx.clearRect(0, 0, pad.width, pad.height);
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(pad).color || '#eef3f0';
    strokes.forEach(function (s) {
      ctx.beginPath();
      s.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * 2, p[1] * 2); else ctx.moveTo(p[0] * 2, p[1] * 2); });
      ctx.stroke();
    });
  }

  function updatePreview() {
    var holder = $('#gb-preview');
    var ready = strokes.length > 0;
    holder.hidden = !ready;
    $('#gb-submit').disabled = !ready;
    if (!ready) { holder.querySelector('.gb-print').textContent = ''; return; }
    var seed = fnv(canonical());
    var box = holder.querySelector('.gb-print');
    box.innerHTML = printSVG(seed);
    box.style.setProperty('--ink', inkOf(seed));
    if (!reduce) { box.classList.remove('stamp'); void box.offsetWidth; box.classList.add('stamp'); }
    holder.dataset.seed = String(seed);
  }

  function pos(e) {
    var rect = pad.getBoundingClientRect();
    return [Math.round((e.clientX - rect.left) * PAD_W / rect.width), Math.round((e.clientY - rect.top) * PAD_H / rect.height)];
  }

  function bindPad() {
    pad.addEventListener('pointerdown', function (e) {
      if (strokes.length >= MAX_STROKES || totalPoints() >= MAX_PTS_TOTAL) { setMsg('That is plenty. Press Undo to change it.'); return; }
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      current = [pos(e)];
      strokes.push(current);
      redraw();
    });
    pad.addEventListener('pointermove', function (e) {
      if (!current) return;
      var p = pos(e), last = current[current.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
      if (current.length >= MAX_PTS_STROKE || totalPoints() >= MAX_PTS_TOTAL) return;
      current.push(p);
      redraw();
    });
    function end() {
      if (!current) return;
      if (current.length < 2) strokes.pop();
      current = null;
      redraw(); updatePreview();
    }
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  function setMsg(text, bad) {
    var m = $('#gb-msg'); m.textContent = text || ''; m.classList.toggle('is-bad', !!bad);
  }

  function reset() {
    strokes = []; current = null; submitted = false;
    $('#gb-form').hidden = false; $('#gb-done').hidden = true;
    $('#gb-name').value = ''; $('#gb-message').value = ''; $('#gb-consent').checked = false; $('#gb-website').value = '';
    $('#gb-count').textContent = '0 / 140';
    setMsg('');
    redraw(); updatePreview();
  }

  function open() {
    if (!available || !dlg) return Promise.resolve('cancelled');
    reset();
    openedAt = Date.now();
    return new Promise(function (resolve) {
      resolver = resolve;
      lockPage(true);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      setTimeout(function () { var n = $('#gb-name'); if (n) n.focus({ preventScroll: true }); }, 30);
    });
  }

  // While the dialog is open the page behind it must not scroll. Smooth-scroll libraries listen for the wheel on the
  // window, so wheel events that start outside the dialog are stopped before they get there. Events inside the dialog
  // are left alone (it has data-lenis-prevent, so it scrolls natively). The page itself is not locked or restyled,
  // which avoids the layout jump that overflow:hidden causes with pinned sections.
  function blockOutsideWheel(e) {
    if (!dlg || !dlg.open) return;
    // The backdrop reports the dialog itself as the target, so test the pointer position as well.
    var r = dlg.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { e.preventDefault(); e.stopPropagation(); }
  }
  function lockPage(on) {
    var fn = on ? 'addEventListener' : 'removeEventListener';
    document[fn]('wheel', blockOutsideWheel, { capture: true, passive: false });
  }

  function onClose() {
    lockPage(false);
    var r = resolver; resolver = null;
    if (r) r(submitted ? 'submitted' : 'cancelled');
  }

  function submit(ev) {
    ev.preventDefault();
    var name = $('#gb-name').value.trim(), message = $('#gb-message').value.trim();
    if (!name) { setMsg('Please add your name.', true); $('#gb-name').focus(); return; }
    if (!strokes.length) { setMsg('Please draw a signature.', true); return; }
    if (!$('#gb-consent').checked) { setMsg('Please tick the box to agree.', true); return; }
    var seed = fnv(canonical());
    var btn = $('#gb-submit'); btn.disabled = true; setMsg('Saving...');
    fetch(API, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name, message: message, strokes: strokes, seed: seed, consent: true,
        seconds: (Date.now() - openedAt) / 1000, website: $('#gb-website').value })
    }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok || !r.j.ok) { btn.disabled = false; setMsg((r.j && r.j.error) || 'Could not save that. Please try again.', true); return; }
        mine = { id: r.j.id, name: name, message: message, strokes: strokes.map(function (s) { return s.slice(); }), seed: seed };
        lsSet('gb:mine', JSON.stringify(mine)); lsSet('gb:signed', '1');
        submitted = true;
        var prev = $('#gb-done-print'); prev.innerHTML = printSVG(seed); prev.style.setProperty('--ink', inkOf(seed));
        $('#gb-form').hidden = true; $('#gb-done').hidden = false;
        renderWall(); renderMargins(); syncButtons();
        var cta = $('#gb-cta'); if (cta) cta.hidden = true;
        setTimeout(function () { if (dlg.open) dlg.close(); }, reduce ? 1800 : 2600);
      })
      .catch(function () { btn.disabled = false; setMsg('Could not reach the server. Please try again.', true); });
  }

  function countText() {
    var n = entries.length;
    return n ? 'Join ' + (n >= 80 ? '80+' : n) + ' visitor' + (n > 1 ? 's' : '') + ' who left one' : 'Be the first visitor to sign';
  }

  function syncButtons() {
    var signed = lsGet('gb:signed') === '1';
    $$('[data-gb-open]').forEach(function (b) { b.hidden = !available; });
    $$('[data-gb-show]').forEach(function (b) { b.hidden = !available; });
    $$('[data-gb-unsigned]').forEach(function (b) { b.hidden = !available || signed; });
    $$('[data-gb-intro]').forEach(function (b) { b.hidden = !available || signed; });
    $$('[data-gb-count]').forEach(function (b) { b.textContent = countText(); });
    var seed = entries.length ? entries[0].seed : 424242;
    $$('.gb-cta-print').forEach(function (h) { h.innerHTML = printSVG(seed); h.style.setProperty('--ink', inkOf(seed)); });
  }

  // A floating invitation that appears after a short delay or once the visitor has scrolled a little.
  function setupCta() {
    var cta = $('#gb-cta');
    if (!cta || !available || lsGet('gb:signed') === '1') return;
    try { if (sessionStorage.getItem('gb:cta-closed') === '1') return; } catch (e) {}
    var shown = false;
    function show() {
      if (shown || document.documentElement.classList.contains('intro-on') || (dlg && dlg.open)) return;
      shown = true; cta.hidden = false;
      requestAnimationFrame(function () { cta.classList.add('in'); });
      window.removeEventListener('scroll', onScroll);
    }
    function onScroll() { if (window.scrollY > 320) show(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    var tries = 0, t = setInterval(function () {
      tries++;
      if (!document.documentElement.classList.contains('intro-on') && tries >= 8) { clearInterval(t); show(); }
      if (tries > 60) clearInterval(t);
    }, 1000);
    var x = $('#gb-cta-x');
    if (x) x.addEventListener('click', function () {
      cta.classList.remove('in'); setTimeout(function () { cta.hidden = true; }, 300);
      try { sessionStorage.setItem('gb:cta-closed', '1'); } catch (e) {}
    });
    cta.addEventListener('click', function (e) { if (e.target.closest('.gb-cta-main')) cta.classList.remove('in'); });
  }

  function init() {
    dlg = $('#gb-dialog');
    if (!dlg) return;
    pad = $('#gb-pad'); ctx = pad.getContext('2d');
    pad.width = PAD_W * 2; pad.height = PAD_H * 2;
    bindPad();
    $('#gb-undo').addEventListener('click', function () { strokes.pop(); redraw(); updatePreview(); });
    $('#gb-clear').addEventListener('click', function () { strokes = []; redraw(); updatePreview(); });
    $('#gb-name').addEventListener('input', updatePreview);
    $('#gb-message').addEventListener('input', function () { $('#gb-count').textContent = this.value.length + ' / 140'; });
    $('#gb-form').addEventListener('submit', submit);
    $('#gb-cancel').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', onClose);
    $$('[data-gb-open]').forEach(function (b) { b.addEventListener('click', function () { open(); }); });
    var hide = $('#marks-hide');
    if (hide) hide.addEventListener('click', function () { lsSet('gb:hide', '1'); renderMargins(); });
    var show = $('#marks-show');
    if (show) show.addEventListener('click', function () { lsSet('gb:hide', '0'); renderMargins(); });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(renderMargins, 200); });
    window.addEventListener('load', function () { setTimeout(renderMargins, 400); });

    fetch(API, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) {
        if (j.unavailable) return;
        available = true;
        entries = (j.entries || []).filter(function (e) { return e && Array.isArray(e.strokes) && typeof e.seed === 'number'; });
        window.dispatchEvent(new Event('guestbook:ready'));
        syncButtons(); renderWall(); renderMargins(); setupCta();
      })
      .catch(function () { /* no backend here (for example the GitHub Pages copy): the feature stays hidden */ });
  }

  window.Guestbook = { open: open, isAvailable: function () { return available; }, printSVG: printSVG };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
