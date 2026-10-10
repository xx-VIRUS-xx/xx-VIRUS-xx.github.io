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

  // Nav turns solid once the hero is scrolled past; under reduced motion the hero video stays on its poster.
  var nav = document.querySelector('.nav.over');
  function navState() { if (nav) nav.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6); }
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  var video = document.querySelector('.hero-video');
  if (video) {
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    else { var pl = video.play(); if (pl && pl.catch) pl.catch(function () {}); }
    document.addEventListener('visibilitychange', function () { if (!reduceMotion) { document.hidden ? video.pause() : video.play().catch(function () {}); } });
  }
})();
