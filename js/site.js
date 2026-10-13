/* Delta Learning · page behaviour that is not part of the games:
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
