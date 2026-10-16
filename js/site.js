/* DeltaOps Learning · page behaviour that is not part of the games:
   nav, scroll progress, mobile menu and reveals. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- nav: solid on scroll, progress bar, scroll spy ---------- */
  var nav = $('.nav'), bar = $('.progress'), links = $$('.links a[href^="#"]:not(.menu-cta)');
  var spy = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 20);
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    var mid = y + innerHeight * .35, cur = -1;
    spy.forEach(function (s, i) { if (s && s.offsetTop <= mid && s.offsetTop + s.offsetHeight > mid) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var btn = $('.menu-btn'), menu = $('#menu');
  function setMenu(open) { btn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('open', open); }
  btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); btn.focus(); } });

  /* ---------- reveals ---------- */
  $$('[data-stagger]').forEach(function (g) { $$('.reveal', g).forEach(function (el, i) { el.style.setProperty('--d', (i % 6) * .07 + 's'); }); });
  var revealEls = $$('.reveal');
  if (!hasIO || reduce) revealEls.forEach(function (el) { el.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }
})();

/* ---------- clubs: the format toggle, the live window and the post gallery ---------- */
(function () {
  'use strict';
  var plan = document.querySelector('[data-club-plan]');
  if (plan) {
    var tabs = [].slice.call(plan.querySelectorAll('[role="tab"]'));
    var pick = function (t) {
      tabs.forEach(function (b) {
        var on = b === t;
        b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n);
      });
    });
  }
  // the live window loads the real missions only when it comes near the screen, and pauses off it
  var live = document.querySelector('[data-club-live]');
  var frame = live && live.querySelector('iframe');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (frame && 'IntersectionObserver' in window) {
    var loaded = false;
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on && !loaded) { loaded = true; frame.src = frame.getAttribute('data-src'); }
      else if (loaded && frame.contentWindow && !(on && held)) frame.contentWindow.postMessage(on ? 'play' : 'pause', location.origin);
    }, { rootMargin: '200px 0px' }).observe(live);
  } else if (frame) frame.src = frame.getAttribute('data-src');
  if (reduce && live) live.classList.add('still');
  // a pause control for the live window (it also pauses itself off screen)
  var pause = document.querySelector('[data-club-pause]'), held = false;
  if (pause && frame) pause.addEventListener('click', function () {
    held = !held;
    pause.setAttribute('aria-pressed', String(held));
    pause.querySelector('use').setAttribute('href', held ? '#i-play' : '#i-pause');
    pause.querySelector('.sr').textContent = held ? 'Play the live missions' : 'Pause the live missions';
    if (frame.contentWindow) frame.contentWindow.postMessage(held ? 'pause' : 'play', location.origin);
  });
  // the format card is open on wide screens and folded on phones
  // folded detail (the mission list, the track record) is open on wide screens and folded on phones
  if (matchMedia('(max-width: 640px)').matches) [].forEach.call(document.querySelectorAll('details[data-fold]'), function (d) { d.open = false; });
})();
