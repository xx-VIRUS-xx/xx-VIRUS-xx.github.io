(function () {
  'use strict';
  var bar = document.querySelector('.progress span');
  var nav = document.querySelector('.nav');
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  var ticking = false;
  function update() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
  if (nav) nav.classList.add('solid');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.prose > h2, .prose > .diagram, .prose > .callout, .prose > .table-wrap');
  els.forEach(function (el) { el.style.opacity = '0'; el.style.transform = 'translateY(24px)'; el.style.transition = 'opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)'; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();
