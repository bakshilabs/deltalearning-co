/* Delta Learning · page behaviour that is not part of the games:
   nav, scroll progress, mobile menu, reveals, the level map, the loop spotlight and the hub wires. */
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

  /* ---------- the level map fills in once ---------- */
  var levels = $('[data-levels]');
  if (levels) {
    if (!hasIO || reduce) levels.classList.add('on');
    else new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { levels.classList.add('on'); o.disconnect(); } }, { threshold: .4 }).observe(levels);
  }

  /* ---------- spotlight that walks the learning loop ---------- */
  var loopd = $('[data-loopd]');
  if (loopd && !reduce) {
    var steps = $$('li', loopd), k = 0, timer = 0, vis = false;
    var go = function () { steps.forEach(function (s, i) { s.classList.toggle('on', i === k); }); k = (k + 1) % steps.length; };
    var run = function () { if (!timer) { go(); timer = setInterval(go, 1700); } };
    var stop = function () { clearInterval(timer); timer = 0; };
    if (hasIO) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) run(); else stop(); }).observe(loopd);
    loopd.addEventListener('mouseenter', stop); loopd.addEventListener('mouseleave', function () { if (vis) run(); });
  }

  /* ---------- hub wires: each partner experience runs on the same engine ---------- */
  var hub = $('[data-hub]');
  function wires() {
    if (!hub) return;
    var svg = $('.wires', hub);
    if (getComputedStyle(svg).display === 'none') return;
    var box = hub.getBoundingClientRect(), core = $('.core', hub).getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.innerHTML = '<defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stop-color="#59C7FC"/><stop offset="1" stop-color="#16FFC6"/></linearGradient></defs>';
    var cx = core.left + core.width / 2 - box.left, cy = core.top + core.height / 2 - box.top;
    $$('.world', hub).forEach(function (w, i) {
      var r = w.getBoundingClientRect(), left = r.left + r.width / 2 < cx + box.left;
      var x = (left ? r.right : r.left) - box.left, y = r.top + r.height / 2 - box.top;
      var ex = left ? core.left - box.left : core.right - box.left, mx = (x + ex) / 2;
      var d = 'M' + x + ' ' + y + ' C' + mx + ' ' + y + ' ' + mx + ' ' + cy + ' ' + ex + ' ' + cy;
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('class', 'wire'); svg.appendChild(p);
      var f = p.cloneNode(); f.setAttribute('class', 'flowline'); f.style.animationDelay = (-i * .8) + 's'; svg.appendChild(f);
    });
  }
  if (hub) {
    wires();
    if ('ResizeObserver' in window) new ResizeObserver(wires).observe(hub);
    if (document.fonts) document.fonts.ready.then(wires);
  }
})();
