// Wires the games into the page: the hero player, the example worlds and the Roman Port demo.
import { hub, View } from './engine.js';
import { WORLDS } from './worlds.js';
import { Hud, Trailer } from './hud.js';
import { BRANDS, TRAILERS } from './trailers.js';

const reduce = hub.reduce;
const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
document.documentElement.classList.add('games');

/* ======================= players: a partner game playing its trailer =======================
   The hero plays one brand on a loop. The worlds section plays whichever example tab is chosen. */
function player(el, { tabs = [], onShow = null, ambient = false } = {}) {
  const keys = el.dataset.player.split(' ');
  const playArea = el.closest('.hero-play');
  const pauseBtn = el.parentElement.querySelector('[data-pause]');
  const games = {};
  let cur = null, phase = 'idle', phaseT = 0, want = keys[0];
  const mark = key => {
    el.dataset.brand = key;
    tabs.forEach(t => { const on = t.dataset.key === key; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (onShow) onShow(key);
  };
  const view = new View(el, { maxDpr: 3, onUpdate: t => step(t) });
  if (!view.ok) {
    // no WebGL: show a still of each game instead
    el.classList.add('nogl'); if (pauseBtn) pauseBtn.hidden = true;
    const still = key => { el.style.setProperty('--poster', `url(/img/game/poster-${key}.webp)`); mark(key); };
    tabs.forEach(t => t.addEventListener('click', () => { if (!t.dataset.frame) still(t.dataset.key); }));
    still(keys[0]);
    return;
  }

  function game(key) {
    if (!games[key]) {
      const b = BRANDS[key], world = WORLDS[b.world]();
      const root = document.createElement('div');
      el.appendChild(root);
      root.hidden = true;
      const hud = new Hud(root, b);
      const spec = TRAILERS[b.world](world, view);
      const tr = new Trailer({ world, hud, ...spec, onLoop: () => leave() });
      games[key] = { key, world, hud, tr, root, spec };
    }
    return games[key];
  }
  let first = true;
  function show(key) {
    const g = game(key);
    if (cur && cur !== g) { cur.hud.clear(); cur.root.hidden = true; }
    cur = g; want = key;
    mark(key);
    g.root.hidden = false;
    g.world.camOverride = null; g.world.snapCam();
    view.setWorld(g.world);
    el.classList.add('ready');
    if (ambient) return still(g);
    if (reduce || view.paused) return poster(g);
    g.hud.clear();
    if (first) { first = false; g.world.finish(); phase = 'build'; phaseT = view.t - .6; }
    else { g.world.build(); phase = 'build'; phaseT = view.t; }
    // build the next tab's world while this one plays
    const next = keys[(keys.indexOf(key) + 1) % keys.length];
    if (next !== key) idle(() => game(next));
  }
  // jump straight to a finished moment (reduced motion, or a tab chosen while paused)
  function poster(g) {
    g.world.finish(); g.root.classList.add('instant');
    g.tr.start(view.t);
    const dt = 1 / 30;
    for (let s = 0; s < g.spec.poster; s += dt) { view.t += dt; g.world.step(view.t, dt); g.tr.update(view.t); }
    phase = 'held';
    hub.drawStill(view);
    requestAnimationFrame(() => requestAnimationFrame(() => g.root.classList.remove('instant')));
  }
  // phones: a calm, finished world that drifts slowly, showing only the brand and the mission,
  // so the hero does not compete with the real demo below it
  function still(g) {
    g.tr.seek(1, view.t);
    if (BRANDS[g.key].world === 'pond') g.world.setState('wild', true);
    g.world.cam = { ...g.world.cam, sway: .22 };
    g.world.finish();
    phase = 'held';
    view.refresh();
  }
  // at the end of a play-through, take the world down and build it again
  function leave() { phase = 'out'; phaseT = view.t; cur.hud.clear(); cur.world.unbuild(); }
  function step(t) {
    if (!cur) return;
    if (phase === 'build' && t - phaseT > 1.25) { phase = 'play'; cur.tr.start(t); if (playArea) playArea.classList.add('noted'); }
    else if (phase === 'play') cur.tr.update(t);
    else if (phase === 'out' && t - phaseT > .85) show(want);
  }
  tabs.forEach((t, i) => {
    // a tab with data-frame shows the real club app in a frame instead (handled by the worlds section)
    t.addEventListener('click', () => { if (t.dataset.frame) return; if (t.dataset.key !== cur.key) show(t.dataset.key); else mark(t.dataset.key); });
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); n.click();
    });
  });
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      const p = !view.paused;
      view.pause(p);
      el.classList.toggle('paused', p);
      pauseBtn.setAttribute('aria-pressed', String(p));
      pauseBtn.querySelector('use').setAttribute('href', p ? '#i-play' : '#i-pause');
      pauseBtn.querySelector('.sr').textContent = p ? 'Play the game preview' : 'Pause the game preview';
    });
    if (reduce) pauseBtn.hidden = true;
  }
  show(keys[0]);
  return { pause: p => { if (!pauseBtn || pauseBtn.getAttribute('aria-pressed') !== 'true') view.pause(p); } };
}

// hero: one partner game on a loop
const heroEl = document.querySelector('.hero [data-player]');
if (heroEl) player(heroEl, { ambient: matchMedia('(max-width: 640px)').matches });

// worlds: three example partners in one component, built when it comes near the screen
const worldsEl = document.querySelector('[data-worlds]');
if (worldsEl) {
  const tabs = [...worldsEl.querySelectorAll('[role="tab"]')];
  const panel = worldsEl.querySelector('[role="tabpanel"]');
  const copies = [...worldsEl.querySelectorAll('[data-copy]')];
  const gw = worldsEl.querySelector('[data-player]');
  const frameBox = worldsEl.querySelector('.ws-frame');
  const frame = frameBox && frameBox.querySelector('iframe');
  let ctl = null;
  const showCopy = key => {
    copies.forEach(c => c.classList.toggle('on', c.dataset.copy === key));
    panel.setAttribute('aria-labelledby', 'ws-t-' + key);
  };
  // the Museum and Game Lab tabs play a real mission from the club app, in a frame
  const capText = worldsEl.querySelector('.gw-cap > span');
  const capPause = worldsEl.querySelector('.gw-cap [data-pause]');
  const capWas = capText ? capText.textContent : '';
  // while the Game Lab frame shows, the pause button pauses the frame
  let frameHeld = false, viewIcon = null;
  const setIcon = (held, what) => {
    capPause.setAttribute('aria-pressed', String(held));
    capPause.querySelector('use').setAttribute('href', held ? '#i-play' : '#i-pause');
    capPause.querySelector('.sr').textContent = (held ? 'Play ' : 'Pause ') + what;
  };
  if (capPause) capPause.addEventListener('click', e => {
    if (!frameBox || frameBox.hidden) return;
    e.stopImmediatePropagation();
    frameHeld = !frameHeld;
    setIcon(frameHeld, 'the lab preview');
    if (frame.contentWindow) frame.contentWindow.postMessage(frameHeld ? 'pause' : 'play', location.origin);
  }, true);
  const hideFrame = () => {
    if (!frameBox || frameBox.hidden) return;
    frameBox.hidden = true; gw.hidden = false;
    if (capText) capText.textContent = capWas;
    if (capPause && viewIcon) { setIcon(viewIcon.held, 'the game preview'); viewIcon = null; }
    if (frame.contentWindow) frame.contentWindow.postMessage('pause', location.origin);
    if (ctl) ctl.pause(false);
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    if (!t.dataset.frame) { hideFrame(); return; }
    tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    showCopy(t.dataset.key);
    if (frame.getAttribute('src') !== t.dataset.frame) { frame.src = t.dataset.frame; frame.title = t.dataset.title || frame.title; }
    else if (frame.contentWindow) frame.contentWindow.postMessage('play', location.origin);
    frameBox.hidden = false; gw.hidden = true;
    if (capText) capText.textContent = t.dataset.cap || capWas;
    if (capPause && !viewIcon) { viewIcon = { held: capPause.getAttribute('aria-pressed') === 'true' }; frameHeld = false; setIcon(false, 'the lab preview'); }
    if (ctl) ctl.pause(true);
  }));
  const start = () => { ctl = player(gw, { tabs, onShow: showCopy }); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); idle(start); } }, { rootMargin: '500px 0px' });
    io.observe(worldsEl);
  } else start();
}

/* ======================= the Roman Port demo ======================= */
// Three instruction cards for one question about Roman London. Each card makes the AI helper
// claim different things; the evidence check shows which claims the finds back up.
const PLANS = [
  { key: 'A', card: 'Show what Romans ate', scene: 'feast', focus: 'feast',
    tag: 'AI guessed', assumed: 'You did not say which Romans, so it planned a rich family’s feast.',
    claims: [['Roast peacock for dinner', 'bad', 'Only the very rich ate this', 'feast'], ['Dormice cooked in honey', 'bad', 'A rare treat for the rich', 'feast'], ['Oysters from the river', 'good', 'Oyster shells found by the river', 'oysters'], ['Bread from a bakery', 'unknown', 'Not checked', 'bakery']],
    effect: 'The feast looks exciting, but a traveller stepping off a boat would never have eaten like this.',
    tradeoff: 'Only one of the four claims fits the traveller. The AI guessed which Romans you meant.',
    facil: 'Who in Londinium ate like this? Who did not? What could you add to your card?',
    acc: 30, ev: 25 },
  { key: 'B', card: 'Make the traveller’s meal exciting', scene: 'modern', focus: 'tomatoes',
    tag: 'AI guessed', assumed: 'You asked for exciting, so it added foods that only reached Britain much later.',
    claims: [['Tomato and basil stew', 'bad', 'Tomatoes came from the Americas over 1,000 years later', 'tomatoes'], ['Potatoes with the fish', 'bad', 'Potatoes also came from the Americas, much later', 'potatoes'], ['A cup of hot chocolate', 'bad', 'Chocolate reached Britain over 1,200 years later', 'chocolate'], ['Olive oil on the bread', 'good', 'Olive oil jars from Spain found at the wharf', 'amphorae']],
    effect: 'Three of the four foods on the table did not exist in Roman Britain.',
    tradeoff: 'The meal is exciting, but most of it is made up. Exciting is not the same as true.',
    facil: 'You asked for exciting. Did you ask for true? How could you check each food?',
    acc: 15, ev: 25 },
  { key: 'C', card: 'Find what a dock worker ate, and show the evidence', scene: 'evidence', focus: 'wharf',
    tag: 'AI guessed', assumed: 'You did not say how many finds to check, so it stopped at three.',
    claims: [['Bread from the bakery', 'good', 'A bread oven found near the forum', 'bakery'], ['Olive oil from Spain', 'good', 'Olive oil jars found at the wharf', 'amphorae'], ['Oysters from the river', 'good', 'Oyster shells found by the river', 'oysters'], ['Wine with water', 'unknown', 'Not checked yet', 'ship']],
    effect: 'Three finds from the ground back up the dock worker’s meal.',
    tradeoff: 'The meal is plainer, but every part of it is backed up by something found in the ground.',
    facil: 'The AI stopped at three finds. What would a fourth one tell you?',
    acc: 90, ev: 75 }
];
const MARK = { good: '✓', bad: '✗', unknown: '?' };

function demo() {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const flow = [...document.querySelectorAll('[data-flow] li')];
  const cards = [...root.querySelectorAll('[data-card]')], cardWrap = $('.cards');
  const res = $('[data-result]'), outc = $('[data-outcome]'), pathBox = $('[data-path]'), pathList = $('[data-path-list]');
  const found = $('[data-clock]'), status = $('[data-status]'), list = $('[data-claims]');
  const gameEl = $('[data-demo-game]'), chartEmpty = $('[data-chart-empty]');
  const world = WORLDS.rome();
  const view = new View(gameEl, { maxDpr: 3 });
  if (view.ok) { view.setWorld(world); gameEl.classList.add('ready'); } else gameEl.classList.add('nogl');
  waiting(); if (chartEmpty) chartEmpty.hidden = true;
  const CAM = { feast: { target: world.anchors.feast, dist: 46, el: .78, az: .5, oy: .02 }, wharf: { target: world.anchors.wharf, dist: 48, el: .74, az: .62, oy: .02 }, tomatoes: { target: world.anchors.tomatoes, dist: 44, el: .78, az: .55, oy: .02 } };
  const look = a => ({ target: world.anchors[a], dist: 34, el: .74, az: .58, oy: .04 });
  let tried = [], cur = -1, timers = [];
  const phone = () => matchMedia('(max-width: 640px)').matches;
  const later = (fn, ms) => timers.push(setTimeout(fn, reduce ? 0 : ms));

  // the page shows four steps: the response counts as part of the choice, the outcome as part of rethinking
  const setFlow = stepName => {
    const i = ['mission', 'decision', 'decision', 'consequence', 'iterate', 'iterate'][['mission', 'decision', 'response', 'consequence', 'iterate', 'outcome'].indexOf(stepName)];
    const k0 = ['mission', 'decision', 'consequence', 'iterate'].indexOf(i);
    flow.forEach((li, k) => { li.classList.toggle('on', k === k0); li.classList.toggle('done', k < k0); });
  };
  setFlow('mission');

  function claimsOf(p, upto) {
    list.innerHTML = '';
    p.claims.forEach(([text, verdict, why], k) => {
      const li = document.createElement('li');
      li.className = k < upto ? 'shown ' + verdict : '';
      li.innerHTML = '<span></span><b></b><small></small>';
      li.children[0].textContent = k < upto ? MARK[verdict] : '';
      li.children[1].textContent = text; li.children[2].textContent = k < upto ? why : 'Checking…';
      list.appendChild(li);
    });
  }
  // before a card is picked, four waiting rows show where the AI's claims will be checked
  function waiting() {
    list.innerHTML = '';
    ['What the traveller ate', 'Where the food came from', 'Who cooked it', 'What it cost'].forEach(text => {
      const li = document.createElement('li'); li.className = 'wait';
      li.innerHTML = '<span>?</span><b></b><small>Pick a card to start</small>';
      li.children[1].textContent = text; list.appendChild(li);
    });
  }
  function setFound(n) { found.textContent = `${n}/4`; }
  function meter(name, v) {
    $(`[data-m="${name}"]`).textContent = v;
    const b = $(`[data-bar="${name}"]`); b.style.setProperty('--v', v / 100); b.classList.toggle('low', v < 60);
  }
  function choose(k) {
    timers.forEach(clearTimeout); timers = [];
    cur = k; const p = PLANS[k];
    cards.forEach((c, j) => c.setAttribute('aria-pressed', String(j === k)));
    cardWrap.classList.add('busy'); outc.hidden = true; res.hidden = true;
    if (phone()) {
      const top = gameEl.getBoundingClientRect().top, navH = 80;
      if (top < navH || top > innerHeight * .4) scrollBy({ top: top - navH, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (chartEmpty) chartEmpty.hidden = true;
    setFlow('decision');
    $('[data-pick]').textContent = 'The AI helper is planning the meal…';
    world.clearMarks(); world.setState(p.scene); world.camOverride = CAM[p.focus]; view.refresh(20);
    status.textContent = { feast: 'The AI planned a rich family’s feast', modern: 'The AI added exciting foods', evidence: 'The AI is digging for finds' }[p.scene];
    status.className = 'dm-status' + (p.scene === 'evidence' ? '' : ' warn'); status.hidden = false;
    setFound(0); claimsOf(p, 0);
    later(() => setFlow('response'), 350);
    // claims are checked one at a time
    p.claims.forEach((c, j) => later(() => {
      claimsOf(p, j + 1);
      setFound(p.claims.slice(0, j + 1).filter(x => x[1] === 'good').length);
      status.textContent = `${c[0]}: ${c[1] === 'good' ? 'backed up' : c[1] === 'bad' ? 'not true' : 'not checked'}`;
      status.className = 'dm-status' + (c[1] === 'bad' ? ' bad' : c[1] === 'unknown' ? ' warn' : '');
      world.camOverride = look(c[3]); world.mark(c[3], c[1]); view.refresh(20);
    }, 1600 + j * 1300));
    later(() => { world.camOverride = CAM[p.focus]; view.refresh(20); done(k); }, 1600 + p.claims.length * 1300 + 400);
  }
  function done(k) {
    const p = PLANS[k];
    $('[data-tag]').textContent = p.tag;
    $('[data-assumed]').textContent = p.assumed;
    $('[data-effect]').textContent = p.effect;
    $('[data-tradeoff]').textContent = p.tradeoff;
    $('[data-facil]').textContent = '“' + p.facil + '”';
    meter('acc', p.acc); meter('ev', p.ev);
    res.hidden = false; cardWrap.classList.remove('busy');
    $('[data-pick]').textContent = 'Read what the AI guessed, then try another card.';
    setFlow('consequence');
    later(() => setFlow('iterate'), 1400);
    if (!tried.includes(k)) tried.push(k);
    cards[k].classList.add('tried');
    pathList.innerHTML = '';
    tried.forEach(j => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span></span><em></em>';
      li.children[0].textContent = PLANS[j].key; li.children[1].textContent = PLANS[j].card;
      li.children[2].textContent = `Accuracy ${PLANS[j].acc} · Evidence ${PLANS[j].ev}`;
      pathList.appendChild(li);
    });
    pathBox.hidden = false;
    if (phone()) res.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  cards.forEach((c, k) => c.addEventListener('click', () => choose(k)));
  $('[data-again]').addEventListener('click', () => {
    res.hidden = true; cards.forEach(c => c.setAttribute('aria-pressed', 'false'));
    $('[data-pick]').textContent = 'Try another card to see what the AI claims this time.';
    setFlow('iterate'); cards[0].focus();
  });
  $('[data-keep]').addEventListener('click', () => {
    const p = PLANS[cur];
    res.hidden = true;
    $('[data-outcome-title]').textContent = 'A traveller’s first meal in Londinium';
    const backed = p.claims.filter(c => c[1] === 'good').map(c => c[0].toLowerCase());
    const rows = [['Your card', p.card], ['Backed up by finds', backed.length ? backed.join(', ') : 'Nothing'], ['Made up or wrong', String(p.claims.filter(c => c[1] === 'bad').length)], ['Scores', `Accuracy ${p.acc} · Evidence ${p.ev}`]];
    const dl = $('[data-outcome-list]'); dl.innerHTML = '';
    rows.forEach(([a, b]) => { const d = document.createElement('div'); d.innerHTML = '<dt></dt><dd></dd>'; d.children[0].textContent = a; d.children[1].textContent = b; dl.appendChild(d); });
    outc.hidden = false; setFlow('outcome');
    $('[data-pick]').textContent = 'You kept this diary page. In a full session, the child explains their choice.';
  });
  $('[data-restart]').addEventListener('click', () => {
    timers.forEach(clearTimeout); timers = [];
    tried = []; cur = -1;
    outc.hidden = true; pathBox.hidden = true; res.hidden = true; status.hidden = true;
    cards.forEach(c => { c.setAttribute('aria-pressed', 'false'); c.classList.remove('tried'); });
    waiting(); setFound(0);
    world.clearMarks(); world.setState('start'); world.camOverride = null; view.refresh(20);
    $('[data-pick]').textContent = 'Pick a card to tell the AI helper what to find out.';
    setFlow('mission');
  });
  setFound(0);
}
demo();
