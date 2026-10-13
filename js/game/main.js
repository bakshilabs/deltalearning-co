// Wires the games into the page: the hero player, the example worlds and the Eco Town demo.
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
  const view = new View(el, { maxDpr: 2, onUpdate: t => step(t) });
  if (!view.ok) {
    // no WebGL: show a still of each game instead
    el.classList.add('nogl'); if (pauseBtn) pauseBtn.hidden = true;
    const still = key => { el.style.setProperty('--poster', `url(/img/game/poster-${key}.webp)`); mark(key); };
    tabs.forEach(t => t.addEventListener('click', () => still(t.dataset.key)));
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
    t.addEventListener('click', () => { if (t.dataset.key !== cur.key) show(t.dataset.key); });
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
  const start = () => player(worldsEl.querySelector('[data-player]'), {
    tabs,
    onShow: key => {
      copies.forEach(c => c.classList.toggle('on', c.dataset.copy === key));
      panel.setAttribute('aria-labelledby', 'ws-t-' + key);
    }
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); idle(start); } }, { rootMargin: '500px 0px' });
    io.observe(worldsEl);
  } else start();
}

/* ======================= the Eco Town demo ======================= */
const SOLAR = [0, 0, 0, 0, 0, 0, 2, 10, 22, 36, 48, 58, 64, 66, 62, 54, 42, 28, 12, 2, 0, 0, 0, 0];
const WIND = [36, 38, 38, 37, 36, 35, 36, 30, 27, 25, 24, 24, 25, 26, 26, 24, 20, 16, 9, 6, 6, 44, 40, 38];
const DEMAND = [26, 24, 23, 23, 24, 28, 36, 40, 44, 38, 36, 36, 38, 37, 36, 38, 42, 44, 58, 64, 60, 42, 34, 30];
const PLANS = [
  { key: 'A', card: 'Keep the lights on all night', gasNight: 20, gas: true,
    says: 'Easy: the gas plant can run every night, so the lights will never go out.',
    tag: 'AI guessed', assumed: 'You did not say how, so it runs the gas plant every night.',
    effect: r => `Gas every night, so ${r.co2} kg of CO₂ a day`,
    tradeoff: 'Every home has light all night. The town now burns gas every evening, even when the wind could do the job.',
    facil: 'You asked for the lights to stay on. Did you say how? What could you add to your card?',
    power: '6 turbines, solar on 20 roofs, and gas every night' },
  { key: 'B', card: 'Use only wind and sun, nothing else',
    says: 'I used only the turbines and the solar panels, like you said. Nothing stores spare power for later.',
    tag: 'AI guessed', assumed: 'No battery, because you did not ask for one.',
    effect: r => `The wind drops in the evening, so the lights go out from ${r.outFrom} to ${r.outTo}`,
    tradeoff: 'No gas at all, but homes go dark just as families get home.',
    facil: 'The town is clean. So why are people unhappy at 19:00? What could store the midday sun?',
    power: '6 turbines and solar on 20 roofs' },
  { key: 'C', card: 'Add a battery, and keep gas under 10% of the power', cap: 80, gas: true,
    says: 'I added a battery to store spare power from the middle of the day. The gas plant only runs if the battery runs out, and never for more than 10% of the power.',
    tag: 'AI guessed', assumed: 'A medium battery, 80 kWh. You set the gas limit, so it keeps to it.',
    effect: r => `A battery keeps the lights on all night, with gas at ${r.gasPct}%`,
    tradeoff: 'The lights stay on and your limit is kept. The battery costs money and needs mined metals.',
    facil: 'The AI chose the battery size. Would a bigger one be better? How would you test it fairly?',
    power: '6 turbines, solar on 20 roofs and an 80 kWh battery' }
];
function simulate(p) {
  const hours = []; let charge = 0, gasT = 0, total = 0; const shortH = [];
  for (let h = 0; h < 24; h++) {
    const d = DEMAND[h], base = p.gasNight && (h >= 18 || h <= 6) ? p.gasNight : 0; let rem = d - base;
    const s = Math.min(SOLAR[h], rem); rem -= s;
    const w = Math.min(WIND[h], rem); rem -= w;
    const spare = SOLAR[h] - s + WIND[h] - w; let bat = 0, chg = 0;
    if (p.cap) {
      if (rem > 0 && charge > 0) { bat = Math.min(charge, rem); charge -= bat; rem -= bat; }
      else if (spare > 0 && charge < p.cap) { chg = Math.min(p.cap - charge, spare); charge += chg; }
    }
    const gas = base + (p.gas ? rem : 0), short = p.gas ? 0 : rem;
    gasT += gas; total += d; if (short > 0) shortH.push(h);
    hours.push({ d, sun: s, wind: w, bat, charge: chg, gas, short, windRaw: WIND[h], level: p.cap ? charge / p.cap : 0 });
  }
  const hh = n => (n < 10 ? '0' : '') + n + ':00';
  return {
    hours, gasPct: Math.round(gasT / total * 100), co2: Math.round(gasT * .4),
    people: 100 - shortH.length * 4, planet: Math.round(98 - gasT / total * 100 * 1.25 - (p.cap ? 2 : 0)), blackout: shortH.length,
    outFrom: shortH.length ? hh(shortH[0]) : '', outTo: shortH.length ? hh(shortH[shortH.length - 1] + 1) : ''
  };
}
const RESULTS = PLANS.map(simulate);

function demo() {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const flow = [...document.querySelectorAll('[data-flow] li')];
  const cards = [...root.querySelectorAll('[data-card]')], cardWrap = $('.cards');
  const res = $('[data-result]'), outc = $('[data-outcome]'), pathBox = $('[data-path]'), pathList = $('[data-path-list]');
  const clock = $('[data-clock]'), status = $('[data-status]'), range = $('[data-hour]'), chart = $('[data-chart]');
  const gameEl = $('[data-demo-game]'), howto = $('[data-howto]'), chartEmpty = $('[data-chart-empty]'), paths = $('[data-paths]');
  const world = WORLDS.town();
  const view = new View(gameEl, { maxDpr: 2 });
  if (view.ok) { view.setWorld(world); gameEl.classList.add('ready'); } else gameEl.classList.add('nogl');
  let tried = [], cur = -1, sweep = 0;
  const phone = () => getComputedStyle($('.chart')).display === 'none';

  // the page shows four steps: the response counts as part of the choice, the outcome as part of rethinking
  const setFlow = stepName => {
    const i = ['mission', 'decision', 'decision', 'consequence', 'iterate', 'iterate'][['mission', 'decision', 'response', 'consequence', 'iterate', 'outcome'].indexOf(stepName)];
    const k0 = ['mission', 'decision', 'consequence', 'iterate'].indexOf(i);
    flow.forEach((li, k) => { li.classList.toggle('on', k === k0); li.classList.toggle('done', k < k0); });
  };
  setFlow('mission');

  // chart: 24 stacked bars and a dashed demand line
  const NS = 'http://www.w3.org/2000/svg', CW = 480, CH = 120, SL = CW / 24, BW = 13, SC = (CH - 8) / 70;
  const el = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  chart.innerHTML = '<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="4" fill="#FF5D5D"/></pattern></defs>';
  const gBars = el('g', {}), gLine = el('g', {}); chart.append(gBars, gLine);
  const bars = Array.from({ length: 24 }, () => { const g = el('g', {}); gBars.appendChild(g); return g; });
  gLine.appendChild(el('polyline', { points: DEMAND.map((d, h) => `${h * SL + SL / 2},${CH - d * SC}`).join(' '), fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
  const head = el('line', { x1: 0, x2: 0, y1: 0, y2: CH, stroke: '#16FFC6', 'stroke-width': 2, opacity: 0 }); gLine.appendChild(head);
  const COLS = { sun: '#F7C04A', wind: '#6CBDFB', bat: '#16FFC6', gas: '#F7928A' };
  const drawBars = (r, upto) => bars.forEach((g, h) => {
    g.innerHTML = '';
    if (!r) { const v = DEMAND[h] * SC; g.appendChild(el('rect', { x: h * SL + (SL - BW) / 2, y: CH - v, width: BW, height: v, fill: 'rgba(255,255,255,.08)', rx: 1.5 })); return; }
    if (h > upto) return;
    const x = h * SL + (SL - BW) / 2, q = r.hours[h]; let y = CH;
    for (const k of ['sun', 'wind', 'bat', 'gas']) { const v = q[k] * SC; if (v <= .2) continue; y -= v; g.appendChild(el('rect', { x, y, width: BW, height: v, fill: COLS[k], rx: 1.5 })); }
    if (q.short > 0) { const v = q.short * SC; y -= v; g.appendChild(el('rect', { x: x + .75, y: y + .75, width: BW - 1.5, height: v - 1.5, fill: 'url(#hatch)', stroke: '#FF5D5D', 'stroke-width': 1.5, rx: 1.5 })); }
  });

  function setHour(hf) {
    const h = Math.floor(hf) % 24, r = cur >= 0 ? RESULTS[cur] : null, q = r ? r.hours[h] : null;
    clock.textContent = (h < 10 ? '0' : '') + h + ':00';
    head.setAttribute('x1', h * SL + SL / 2); head.setAttribute('x2', h * SL + SL / 2); head.setAttribute('opacity', r ? 1 : 0);
    world.setHour(hf);
    if (!q) { world.setPower({ lit: 1, gas: 0, bat: 0, level: 0, blackout: 0, wind: WIND[h] }); status.hidden = true; view.refresh(); return; }
    world.setPower({ lit: 1, gas: q.gas > 0 ? 1 : 0, bat: q.bat > 0 ? -1 : q.charge > 0 ? 1 : 0, level: q.level, blackout: q.short > 0 ? 1 : 0, wind: q.windRaw });
    let txt, cls = '';
    if (q.short > 0) { txt = 'Blackout: not enough power'; cls = 'bad'; }
    else if (q.gas > 0) { txt = 'Gas plant running'; cls = 'warn'; }
    else if (q.bat > 0) txt = 'Battery keeping the lights on';
    else if (q.charge > 0) txt = 'Battery charging from spare power';
    else txt = h >= 19 || h < 6 ? 'Lights on' : 'Enough power';
    status.textContent = txt; status.className = 'dm-status' + (cls ? ' ' + cls : ''); status.hidden = false;
    view.refresh();
  }
  function meter(name, v) {
    $(`[data-m="${name}"]`).textContent = v;
    const b = $(`[data-bar="${name}"]`); b.style.setProperty('--v', v / 100); b.classList.toggle('low', v < 60);
  }
  function choose(k) {
    cur = k; const r = RESULTS[k];
    cards.forEach((c, j) => c.setAttribute('aria-pressed', String(j === k)));
    cardWrap.classList.add('busy'); outc.hidden = true; res.hidden = true;
    if (phone()) {
      const top = gameEl.getBoundingClientRect().top, navH = 80;
      if (top < navH || top > innerHeight * .4) scrollBy({ top: top - navH, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (howto) howto.hidden = true; if (chartEmpty) chartEmpty.hidden = true; if (paths) paths.hidden = true;
    setFlow('decision');
    $('[data-pick]').textContent = 'Running a test day with your card…';
    range.disabled = true;
    cancelAnimationFrame(sweep);
    setTimeout(() => setFlow('response'), reduce ? 0 : 350);
    let t0 = null; const dur = reduce ? 0 : 2800;
    const tick = ts => {
      if (t0 === null) t0 = ts;
      const q = dur ? Math.min(1, (ts - t0) / dur) : 1, hf = q * 19;
      drawBars(r, Math.floor(hf)); setHour(hf);
      if (q < 1) { sweep = requestAnimationFrame(tick); return; }
      drawBars(r, 23); setHour(19); done(k);
    };
    sweep = requestAnimationFrame(tick);
  }
  function done(k) {
    const p = PLANS[k], r = RESULTS[k];
    $('[data-tag]').textContent = p.tag;
    $('[data-assumed]').textContent = p.assumed;
    $('[data-effect]').textContent = p.effect(r);
    $('[data-tradeoff]').textContent = p.tradeoff;
    $('[data-facil]').textContent = '“' + p.facil + '”';
    meter('people', r.people); meter('planet', r.planet);
    res.hidden = false; cardWrap.classList.remove('busy');
    range.disabled = false; range.value = 19;
    // phones hide the chart and its slider, so point them at the next step instead
    $('[data-pick]').textContent = phone() ? 'Read what the AI guessed, then try another card.' : 'Drag the time slider to see any hour of the test day.';
    setFlow('consequence');
    setTimeout(() => setFlow('iterate'), reduce ? 0 : 1400);
    if (!tried.includes(k)) tried.push(k);
    cards[k].classList.add('tried');
    pathList.innerHTML = '';
    tried.forEach(j => {
      const li = document.createElement('li'), r2 = RESULTS[j];
      li.innerHTML = '<span></span><span></span><em></em>';
      li.children[0].textContent = PLANS[j].key; li.children[1].textContent = PLANS[j].card;
      li.children[2].textContent = `People ${r2.people} · Planet ${r2.planet}`;
      pathList.appendChild(li);
    });
    pathBox.hidden = false;
    if (phone()) res.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  cards.forEach((c, k) => c.addEventListener('click', () => choose(k)));
  range.addEventListener('input', () => setHour(+range.value));
  $('[data-again]').addEventListener('click', () => {
    res.hidden = true; cards.forEach(c => c.setAttribute('aria-pressed', 'false'));
    $('[data-pick]').textContent = 'Pick another card. Different choices create different outcomes.';
    setFlow('iterate'); cards[0].focus();
  });
  $('[data-keep]').addEventListener('click', () => {
    const p = PLANS[cur], r = RESULTS[cur];
    res.hidden = true;
    $('[data-outcome-title]').textContent = 'Your town on the windy hill';
    const rows = [['Power', p.power], ['Lights', r.blackout ? `Out from ${r.outFrom} to ${r.outTo}` : 'On all day and night'], ['Gas', r.gasPct ? r.gasPct + '% of the power' : 'None'], ['CO₂ a day', r.co2 + ' kg'], ['Scores', `People ${r.people} · Planet ${r.planet}`]];
    const dl = $('[data-outcome-list]'); dl.innerHTML = '';
    rows.forEach(([a, b]) => { const d = document.createElement('div'); d.innerHTML = '<dt></dt><dd></dd>'; d.children[0].textContent = a; d.children[1].textContent = b; dl.appendChild(d); });
    outc.hidden = false; setFlow('outcome');
    $('[data-pick]').textContent = 'Plan kept. In a full session, the child explains why.';
  });
  $('[data-restart]').addEventListener('click', () => {
    tried = []; cur = -1;
    outc.hidden = true; pathBox.hidden = true; res.hidden = true;
    cards.forEach(c => { c.setAttribute('aria-pressed', 'false'); c.classList.remove('tried'); });
    drawBars(null); range.disabled = true; range.value = 18; setHour(18);
    if (howto) howto.hidden = false; if (chartEmpty) chartEmpty.hidden = false; if (paths) paths.hidden = false;
    $('[data-pick]').textContent = 'Pick a card to tell the AI helper what to do.';
    setFlow('mission');
  });
  drawBars(null); setHour(18);
}
demo();
