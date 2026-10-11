(function () {
  'use strict';
  var root = document.documentElement;
  var box = document.getElementById('intro');
  if (!box || !root.classList.contains('intro-on')) return;

  var video = box.querySelector('video');
  var enter = box.querySelector('.intro-enter');
  var skip = box.querySelector('.intro-skip');
  var done = false, ready = false, auto = 0, watchdog = 0;

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(auto); clearTimeout(watchdog);
    try { sessionStorage.setItem('intro', '1'); } catch (e) {}
    box.classList.add('leave');
    video.pause();
    window.__introActive = false;
    window.dispatchEvent(new Event('introdone'));
    setTimeout(function () {
      root.classList.remove('intro-on');
      var main = document.getElementById('main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }, 650);
  }

  function arm() {
    if (ready) return;
    ready = true;
    enter.disabled = false;
    clearTimeout(auto);
    auto = setTimeout(finish, 1000);
  }

  skip.addEventListener('click', finish);
  enter.addEventListener('click', finish);
  document.addEventListener('keydown', function (e) {
    if (done) return;
    if (e.key === 'Escape' || ((e.key === 'Enter' || e.key === ' ') && ready && document.activeElement !== skip)) { e.preventDefault(); finish(); }
  });

  // If the video cannot start (autoplay blocked, slow network, decode error) never hold the page hostage.
  watchdog = setTimeout(finish, 4500);
  video.addEventListener('playing', function () { clearTimeout(watchdog); }, { once: true });
  video.addEventListener('error', finish);
  video.addEventListener('timeupdate', function () { if (video.currentTime >= 6.0) arm(); });
  video.addEventListener('ended', arm);

  var p = video.play();
  if (p && p.catch) p.catch(finish);
})();
