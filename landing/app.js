/* ════════════════════════════════════════════════════
   LANCE v2 app.js — vanilla translations of:
   Magic UI (MIT): particles, meteors, marquee, number-ticker,
     text-reveal, flickering-grid, shimmer/border-beam (CSS only)
   Motion Primitives: blur entrance, stagger, magnetic
   ════════════════════════════════════════════════════ */
'use strict';

/* ── DATA ── */
const FEATURES = [
  { title: 'Win work', desc: 'Proposals and contracts that look professional and convert.', list: ['Proposals with scope warnings', 'Contract builder', 'Win rate tracking'], span: 'b-3', vis: 'win' },
  { title: 'Run projects', desc: 'Milestones, time tracking and one-click flows in one loop.', list: ['Project milestones', 'One-click timer', 'Unbilled alerts'], span: 'b-3', vis: 'run' },
  { title: 'Get paid', desc: 'Sharp invoices that chase themselves so you don\u2019t have to.', list: ['PDF + DOCX invoices', 'Recurring billing', 'Automated follow-ups', 'Late-fee dunning'], span: 'b-2', vis: 'paid' },
  { title: 'Local & private', desc: 'Your data stays on your machine. Fast, offline-first, zero lock-in.', list: ['No cloud, no accounts', 'Works fully offline', 'Instant load'], span: 'b-2', vis: 'local' },
  { title: 'Know your numbers', desc: 'Revenue, pipeline and client performance without a spreadsheet.', list: ['Finance overview', 'Client insights', 'Custom metrics per craft'], span: 'b-2', vis: 'nums' },
];

/* scoped mini-app palettes for live theme previews */
const MOCK_THEMES = {
  default:  { bg: '#FFFFFF', sf: '#F8F7F3', t1: '#181716', t2: '#68675F', line: '#E3E2DB', actx: '#08150E' },
  studio:   { bg: '#FFFFFF', sf: '#FDFAF5', t1: '#2C1810', t2: '#7A6255', line: '#E8E0D0', actx: '#FFFFFF' },
  terminal: { bg: '#161B22', sf: '#0D1117', t1: '#E6EDF3', t2: '#8B949E', line: '#30363D', actx: '#0D1117' },
  craft:    { bg: '#FFFFFF', sf: '#FAFAF8', t1: '#1A1A18', t2: '#6B6860', line: '#E8E6E0', actx: '#FFFFFF' },
  motion:   { bg: '#FFFFFF', sf: '#FAFAFE', t1: '#1A1530', t2: '#6B6585', line: '#E4E0F4', actx: '#FFFFFF' },
  lens:     { bg: '#2A2520', sf: '#1C1814', t1: '#F5F0E8', t2: '#B0A898', line: '#3D3630', actx: '#1C1814' },
  scale:    { bg: '#FFFFFF', sf: '#F8F9FC', t1: '#0F172A', t2: '#5B6478', line: '#E0E4EE', actx: '#FFFFFF' },
};

const THEMES_PREVIEW = {
  default:  { name: 'Default',   desc: 'Balanced and modern. Works for every kind of freelancer.', frame: 't-default',  body: 'Clean and professional' },
  studio:   { name: 'Studio',    desc: 'Sienna accents on warm cream. Inspired by print.',          frame: 't-studio',   body: 'Warm and editorial, for designers' },
  terminal: { name: 'Terminal',  desc: 'GitHub-dark base with terminal green.',                     frame: 't-terminal', body: 'Dark and sharp, for developers' },
  craft:    { name: 'Craft',     desc: 'Slate blue accents on near-white. Generous spacing.',      frame: 't-craft',    body: 'Quiet and readable, for writers' },
  motion:   { name: 'Motion',    desc: 'Electric violet on cool white. High energy.',              frame: 't-motion',   body: 'High-energy motion, for animators' },
  lens:     { name: 'Lens',      desc: 'Amber gold on deep shadow. Darkroom mood.',                frame: 't-lens',     body: 'Dark and cinematic, for photographers' },
  scale:    { name: 'Scale',     desc: 'Deep navy on cool grey. Boardroom-ready.',                 frame: 't-scale',    body: 'Precise and commanding, for consultants' },
};

const THEME_VARS = {
  default:  { colors: { '--green': '#1EC98A', '--green-h': '#18B47C', '--green-dim': 'rgba(30,201,138,.10)', '--green-rgb': '30,201,138', '--d-bg': '#0A0A0B', '--d-s1': '#131315', '--d-s2': '#1A1A1D', '--d-bd': 'rgba(255,255,255,.08)', '--d-t1': '#FAFAF8', '--d-t2': '#A1A1AA', '--d-t3': '#5B5B62', '--l-bg': '#F7F6F2', '--l-s1': '#FFFFFF', '--l-bd': '#E4E2DB', '--l-t1': '#141412', '--l-t2': '#62625C' }, hFont: "'Space Grotesk',sans-serif", bFont: "'Inter',sans-serif", mFont: "'JetBrains Mono',monospace", fonts: null },
  studio:   { colors: { '--green': '#C4622D', '--green-h': '#A84E22', '--green-dim': 'rgba(196,98,45,.10)', '--green-rgb': '196,98,45', '--d-bg': '#2C1810', '--d-s1': '#3A2015', '--d-s2': '#48281A', '--d-bd': '#5A3522', '--d-t1': '#FDFAF5', '--d-t2': '#C4A99A', '--d-t3': '#7A6255', '--l-bg': '#FDFAF5', '--l-s1': '#FFFFFF', '--l-bd': '#E8E0D0', '--l-t1': '#2C1810', '--l-t2': '#7A6255' }, hFont: "'Playfair Display',serif", bFont: "'Source Serif 4',serif", mFont: "'JetBrains Mono',monospace", fonts: 'playfair-display:400,500,600|source-serif-4:400,500' },
  terminal: { colors: { '--green': '#3FB950', '--green-h': '#2EA043', '--green-dim': 'rgba(63,185,80,.10)', '--green-rgb': '63,185,80', '--d-bg': '#0D1117', '--d-s1': '#161B22', '--d-s2': '#21262D', '--d-bd': '#30363D', '--d-t1': '#E6EDF3', '--d-t2': '#8B949E', '--d-t3': '#484F58', '--l-bg': '#161B22', '--l-s1': '#21262D', '--l-bd': '#30363D', '--l-t1': '#E6EDF3', '--l-t2': '#8B949E' }, hFont: "'JetBrains Mono',monospace", bFont: "'JetBrains Mono',monospace", mFont: "'JetBrains Mono',monospace", fonts: 'jetbrains-mono:400,500' },
  craft:    { colors: { '--green': '#4A7FA5', '--green-h': '#3A6A8C', '--green-dim': 'rgba(74,127,165,.10)', '--green-rgb': '74,127,165', '--d-bg': '#1A1A18', '--d-s1': '#242420', '--d-s2': '#2E2E28', '--d-bd': '#3C3C36', '--d-t1': '#FAFAF8', '--d-t2': '#A8A59E', '--d-t3': '#6B6860', '--l-bg': '#FAFAF8', '--l-s1': '#FFFFFF', '--l-bd': '#E8E6E0', '--l-t1': '#1A1A18', '--l-t2': '#6B6860' }, hFont: "'Lora',serif", bFont: "'Source Sans 3',sans-serif", mFont: "'JetBrains Mono',monospace", fonts: 'lora:400,500,600|source-sans-3:400,500' },
  motion:   { colors: { '--green': '#8B5CF6', '--green-h': '#7C3AED', '--green-dim': 'rgba(139,92,246,.10)', '--green-rgb': '139,92,246', '--d-bg': '#1A1530', '--d-s1': '#241F3D', '--d-s2': '#2E2848', '--d-bd': '#3D3560', '--d-t1': '#FAFAFE', '--d-t2': '#A09AB5', '--d-t3': '#6B6585', '--l-bg': '#FAFAFE', '--l-s1': '#FFFFFF', '--l-bd': '#E4E0F4', '--l-t1': '#1A1530', '--l-t2': '#6B6585' }, hFont: "'Space Grotesk',sans-serif", bFont: "'Inter',sans-serif", mFont: "'JetBrains Mono',monospace", fonts: 'space-grotesk:500,600,700|inter:400,500' },
  lens:     { colors: { '--green': '#D97706', '--green-h': '#B45309', '--green-dim': 'rgba(217,119,6,.12)', '--green-rgb': '217,119,6', '--d-bg': '#1C1814', '--d-s1': '#2A2520', '--d-s2': '#322D27', '--d-bd': '#3D3630', '--d-t1': '#F5F0E8', '--d-t2': '#B0A898', '--d-t3': '#6B6560', '--l-bg': '#2A2520', '--l-s1': '#322D27', '--l-bd': '#3D3630', '--l-t1': '#F5F0E8', '--l-t2': '#B0A898' }, hFont: "'Cormorant Garamond',serif", bFont: "'Inter',sans-serif", mFont: "'JetBrains Mono',monospace", fonts: 'cormorant-garamond:400,500,600|inter:400,500' },
  scale:    { colors: { '--green': '#1E40AF', '--green-h': '#1E3A8A', '--green-dim': 'rgba(30,64,175,.10)', '--green-rgb': '30,64,175', '--d-bg': '#0F172A', '--d-s1': '#1A2440', '--d-s2': '#243054', '--d-bd': '#33406A', '--d-t1': '#F8F9FC', '--d-t2': '#94A0B8', '--d-t3': '#5B6478', '--l-bg': '#F8F9FC', '--l-s1': '#FFFFFF', '--l-bd': '#E0E4EE', '--l-t1': '#0F172A', '--l-t2': '#5B6478' }, hFont: "'Space Grotesk',sans-serif", bFont: "'Inter',sans-serif", mFont: "'JetBrains Mono',monospace", fonts: 'inter:400,500,600' },
};

const SHOW_STEPS = [
  { eyebrow: 'Proposals & Contracts', title: 'Win work before your competition.', body: 'Write proposals with scope warnings built in. Track your win rate across every client. Know exactly what\u2019s working.', pane: 0, header: 'Proposals' },
  { eyebrow: 'Time Tracking', title: 'Track time without leaving your flow.', body: 'One-click timers tied to every project. Unbilled hours always visible. Never lose a billable minute again.', pane: 1, header: 'Time' },
  { eyebrow: 'Invoicing', title: 'Get paid. On time, every time.', body: 'Invoices that look sharp and follow up automatically. Late payments get nudged, so you don\u2019t have to.', pane: 2, header: 'Invoices' },
  { eyebrow: 'Insights', title: 'Know your numbers cold.', body: 'Revenue, pipeline, win rate, client performance — all visible without a spreadsheet.', pane: 3, header: 'Insights' },
  { eyebrow: 'Local-First', title: 'Your data. Your machine.', body: 'Business records stay local. No accounts, no cloud lock-in. Lance works completely offline.', pane: 4, header: 'Privacy' },
];

const MQ_WORDS = ['WIN WORK', 'RUN PROJECTS', 'GET PAID', 'LOCAL FIRST', '100% OFFLINE', 'YOUR DATA', 'FREE FOREVER', 'NO CLOUD', 'KEYBOARD FIRST', '41 CRAFTS'];

/* ── helpers ── */
const $ = (id) => document.getElementById(id);
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function accentRGB() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--green-rgb').trim();
  return /^\d+,\d+,\d+$/.test(v) ? v : '30,201,138';
}
const onScreen = (el, cb, opt) => {
  const o = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { cb(e.target); o.unobserve(e.target); } });
  }, opt || { threshold: 0.2 });
  o.observe(el);
};

/* ── THEME SYSTEM ── */
const loadedFonts = {};
function applyTheme(id) {
  const t = THEME_VARS[id];
  if (!t) return;
  const root = document.documentElement;
  Object.entries(t.colors).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--font-d', t.hFont);
  root.style.setProperty('--font-b', t.bFont);
  root.style.setProperty('--font-m', t.mFont);
  document.body.style.fontFamily = t.bFont;
  document.querySelectorAll('.hero-hl,.sec-title,.nav-brand,.b-title,.anno-title,.price-name,.price-val,.mock-title,.mstat-v,.show-title,.stat-v,.hstat-val,.theme-frame h4').forEach((el) => { el.style.fontFamily = t.hFont; });
  document.querySelectorAll('.mono,.kicker,.mrow-m,.chip,.mock-badge,.mock-url,.mstat-l,.anno-eyebrow,.show-btn,.theme-note,.price-note,.price-badge,.dl-ver,.dl-sub,.dl-sysreq,.footer-copy,.ai-note,.m-item,.hstat-lbl,.stat-l').forEach((el) => { el.style.fontFamily = t.mFont; });
  document.querySelectorAll('.theme-tab').forEach((x) => x.classList.toggle('active', x.dataset.theme === id));
  document.querySelectorAll('.theme-preview').forEach((p) => p.classList.toggle('active', p.id === 'tp-' + id));
  if (t.fonts && !loadedFonts[id]) {
    // Theme fonts are self-hosted (landing/fonts.css): mark loaded, no CDN.
    loadedFonts[id] = true;
  }
  try { localStorage.setItem('lance-theme', id); } catch (e) { /* private mode */ }
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('lance-theme'); } catch (e) { /* noop */ }
  applyTheme(saved && THEME_VARS[saved] ? saved : 'default');
})();

/* ── blur-in entrances ── */
(function () {
  const els = document.querySelectorAll('.blur-in');
  if (RM) { els.forEach((e) => e.classList.add('in')); return; }
  const o = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach((e) => o.observe(e));
})();

/* ── nav + progress ── */
(function () {
  const nav = $('nav');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $('sbar').style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('hamburger').addEventListener('click', () => $('navLinks').classList.toggle('open'));
  document.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => $('navLinks').classList.remove('open')));
})();

/* ── Magic PARTICLES (vanilla translation) ── */
(function () {
  const canvas = $('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const QTY = 90, STATICITY = 50, EASE = 50;
  let W = 0, H = 0, circles = [], mx = 0, my = 0, running = false, raf = 0;
  const rgb = () => accentRGB().split(',').map((n) => parseInt(n.trim(), 10));

  function circleParams() {
    return {
      x: Math.random() * W, y: Math.random() * H, tx: 0, ty: 0,
      size: Math.floor(Math.random() * 2) + 0.6, alpha: 0,
      targetAlpha: Math.random() * 0.6 + 0.1,
      dx: (Math.random() - 0.5) * 0.15, dy: (Math.random() - 0.5) * 0.15,
      magnetism: 0.1 + Math.random() * 4,
    };
  }
  function size() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    circles = [];
    for (let i = 0; i < QTY; i++) circles.push(circleParams());
    if (RM) paint();
  }
  function paint() {
    const [r, g, b] = rgb();
    ctx.clearRect(0, 0, W, H);
    circles.forEach((c, i) => {
      const edge = Math.min(c.x + c.tx - c.size, W - c.x - c.tx - c.size, c.y + c.ty - c.size, H - c.y - c.ty - c.size);
      const remap = Math.max(0, Math.min(1, edge / 20));
      c.alpha = remap > 1 ? Math.min(c.alpha + 0.02, c.targetAlpha) : c.targetAlpha * remap;
      c.x += c.dx; c.y += c.dy;
      c.tx += (mx / (STATICITY / c.magnetism) - c.tx) / EASE;
      c.ty += (my / (STATICITY / c.magnetism) - c.ty) / EASE;
      ctx.beginPath();
      ctx.arc(c.x + c.tx, c.y + c.ty, c.size, 0, 6.29);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + c.alpha.toFixed(3) + ')';
      ctx.fill();
      if (c.x < -5 || c.x > W + 5 || c.y < -5 || c.y > H + 5) { circles[i] = circleParams(); }
    });
  }
  function loop() {
    if (!running) return;
    paint();
    raf = requestAnimationFrame(loop);
  }
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - W / 2, y = e.clientY - r.top - H / 2;
    if (x < W / 2 && x > -W / 2 && y < H / 2 && y > -H / 2) { mx = x; my = y; }
  });
  size();
  window.addEventListener('resize', () => { size(); });
  new IntersectionObserver((es) => {
    running = es[0].isIntersecting;
    if (running && !RM) { cancelAnimationFrame(raf); loop(); }
    if (running && RM) paint();
  }).observe(hero);
})();

/* ── Magic METEORS ── */
function meteorShower(id, n) {
  const host = $(id);
  if (!host || RM) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'meteor';
    s.style.left = 'calc(0% + ' + Math.floor(Math.random() * window.innerWidth) + 'px)';
    s.style.animationDelay = (Math.random() * 4 + 0.2).toFixed(2) + 's';
    s.style.animationDuration = Math.floor(Math.random() * 8 + 3) + 's';
    host.appendChild(s);
  }
}
meteorShower('meteors', 14);
meteorShower('dlMeteors', 18);

/* ── hero mockup: tab cycle + tilt + magnetic ── */
(function () {
  const PANES = ['proposals', 'contracts', 'projects', 'time', 'invoices'];
  const BADGES = { proposals: '3 active', contracts: '2 active', projects: '5 total', time: '9.3h this week', invoices: '$6.7k owed' };
  let idx = 0;
  function show(p) {
    document.querySelectorAll('.ms-item').forEach((el) => el.classList.toggle('active', el.dataset.pane === p));
    PANES.forEach((k) => $('mock-' + k).classList.toggle('active', k === p));
    const label = p.charAt(0).toUpperCase() + p.slice(1);
    $('mockTitle').textContent = label;
    $('mockBadge').textContent = BADGES[p] || '';
  }
  document.querySelectorAll('.ms-item').forEach((el) => el.addEventListener('click', () => { idx = PANES.indexOf(el.dataset.pane); show(el.dataset.pane); }));
  document.querySelectorAll('.ms-item').forEach((el) => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); idx = PANES.indexOf(el.dataset.pane); show(el.dataset.pane); }
    });
  });
  // ?static=1 freezes pane cycling for deterministic promo screenshots.
  const STATIC = new URLSearchParams(location.search).has('static');
  if (!RM && !STATIC) setInterval(() => { idx = (idx + 1) % PANES.length; show(PANES[idx]); }, 3600);

  // tilt toward cursor
  const vis = $('heroVisual'), tilt = $('mockTilt');
  if (vis && tilt && !RM && matchMedia('(pointer:fine)').matches) {
    vis.addEventListener('pointermove', (e) => {
      const r = vis.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = 'perspective(1400px) rotateY(' + (-7 + cx * 10) + 'deg) rotateX(' + (3 - cy * 8) + 'deg)';
    });
    vis.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  // magnetic pull (Motion magnetic, vanilla)
  if (!RM && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.08).toFixed(1) + 'px,' + (y * 0.15).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
})();

/* ── Magic MARQUEE content ── */
(function () {
  const html = MQ_WORDS.map((w) => '<span class="m-item">' + w + '<span class="m-dot">◆</span></span>').join('');
  $('mqRow1').innerHTML = html;
  $('mqRow1b').innerHTML = html;
  const html2 = [...MQ_WORDS].reverse().map((w) => '<span class="m-item">' + w + '<span class="m-dot">◆</span></span>').join('');
  $('mqRow2').innerHTML = html2;
  $('mqRow2b').innerHTML = html2;
})();

/* ── scroll-velocity marquee (Magic scroll-based-velocity, WAAPI rate) ── */
(function () {
  if (RM) return;
  const rows = [...document.querySelectorAll('.mq-row')];
  if (!rows.length) return;
  let lastY = window.scrollY, boost = 0, ticking = false;
  function setRate(r) {
    rows.forEach((el) => {
      try { el.getAnimations().forEach((a) => { a.playbackRate = r; }); } catch (e) { /* noop */ }
    });
  }
  function tick() {
    const y = window.scrollY;
    boost += (y - lastY) * 0.004;
    lastY = y;
    boost *= 0.93;
    if (Math.abs(boost) > 0.02) {
      setRate(1 + Math.min(3.5, Math.abs(boost) * 2.5));
      requestAnimationFrame(tick);
    } else {
      setRate(1);
      ticking = false;
    }
  }
  document.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; lastY = window.scrollY; requestAnimationFrame(tick); }
  }, { passive: true });
})();

/* ── cursor spotlight ── */
(function () {
  const g = $('cursorGlow');
  if (!g || RM || !matchMedia('(pointer:fine)').matches) { if (g) g.style.display = 'none'; return; }
  let x = -500, y = -500, tx = x, ty = y, live = false;
  function loop() {
    if (!live) return;
    x += (tx - x) * 0.12; y += (ty - y) * 0.12;
    g.style.transform = 'translate(' + (x - 180).toFixed(1) + 'px,' + (y - 180).toFixed(1) + 'px)';
    if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) requestAnimationFrame(loop);
    else live = false;
  }
  document.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!live) { live = true; loop(); }
  }, { passive: true });
})();

function bentoVis(kind) {
  if (kind === 'win') return '<div class="bvis"><div class="wv-row"><span>Brand Refresh · Acme</span><em>WON $12k</em></div><div class="wv-bar"><i style="--w:72%"></i></div><div class="wv-meta">72% win rate · 13 proposals</div></div>';
  if (kind === 'run') return '<div class="bvis"><div class="tmr-ring"><svg viewBox="0 0 60 60"><circle class="bgc" cx="30" cy="30" r="26"/><circle class="fgc" cx="30" cy="30" r="26"/></svg><div class="tmr-t"><span class="js-tick" data-base="8072">2:14:32</span><small><span class="rec"></span>Acme rebrand · billing</small></div></div></div>';
  if (kind === 'paid') return '<div class="bvis"><div class="ib-row"><span class="t">PAID</span><div class="ib-track"><i class="ib-g" style="--w:100%"></i></div><span class="a">$4.5k</span></div><div class="ib-row"><span class="t">OWED</span><div class="ib-track"><i class="ib-g" style="--w:62%"></i></div><span class="a">$6.7k</span></div><div class="ib-row"><span class="t">LATE</span><div class="ib-track"><i class="ib-r" style="--w:28%"></i></div><span class="a">$2.2k</span></div></div>';
  if (kind === 'local') return '<div class="bvis"><div class="sec-shield"><span class="orb2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><div><b>100% on-device</b><small>0 cloud · 0 trackers · offline</small></div></div></div>';
  return '<div class="bvis"><svg class="spark-big" viewBox="0 0 200 56" preserveAspectRatio="none"><polyline points="0,46 25,42 50,44 75,34 100,36 125,26 150,28 175,14 200,10"/></svg><span class="delta-pill">+22% vs last month</span></div>';
}

/* ── bento build + spotlight ── */
(function () {
  const icons = [
    '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h7"/><path d="M9 12h7"/><path d="M9 16h5"/>',
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
  ];
  const host = $('bento');
  FEATURES.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'bcard blur-in ' + f.span;
    d.style.setProperty('--d', (i * 90) + 'ms');
    d.innerHTML = '<div class="b-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icons[i % icons.length] + '</svg></div>'
      + '<div class="b-title">' + f.title + '</div><p class="b-desc">' + f.desc + '</p>'
      + bentoVis(f.vis)
      + '<ul class="b-list">' + f.list.map((l) => '<li>' + l + '</li>').join('') + '</ul>';
    host.appendChild(d);
    const o = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); o.disconnect(); } });
    }, { threshold: 0.15 });
    o.observe(d);
  });
  document.querySelector('.bento-sec').addEventListener('pointermove', (e) => {
    const card = e.target.closest ? e.target.closest('.bcard') : null;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
})();

/* ── Magic FLICKERING-GRID (vanilla translation) ── */
(function () {
  const canvas = $('flicker');
  const sec = document.querySelector('.bento-sec');
  if (!canvas || !sec) return;
  const ctx = canvas.getContext('2d');
  const SQ = 5, GAP = 7, CHANCE = 0.25, MAXO = 0.28;
  let cols = 0, rows = 0, cells = new Float32Array(0), running = false, raf = 0, last = 0;
  function setup() {
    const r = sec.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    cols = Math.ceil(r.width / (SQ + GAP)); rows = Math.ceil(r.height / (SQ + GAP));
    cells = new Float32Array(cols * rows);
    for (let i = 0; i < cells.length; i++) cells[i] = Math.random() * MAXO;
    canvas._dpr = dpr; canvas._w = r.width; canvas._h = r.height;
    if (RM) draw();
  }
  function draw() {
    const dpr = canvas._dpr, rgb = accentRGB();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas._w, canvas._h);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      ctx.fillStyle = 'rgba(' + rgb + ',' + cells[i * rows + j].toFixed(3) + ')';
      ctx.fillRect(i * (SQ + GAP), j * (SQ + GAP), SQ, SQ);
    }
  }
  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.1, (t - last) / 1000 || 0.016);
    last = t;
    for (let i = 0; i < cells.length; i++) {
      if (Math.random() < CHANCE * dt) cells[i] = Math.random() * MAXO;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  setup();
  window.addEventListener('resize', setup);
  new IntersectionObserver((es) => {
    running = es[0].isIntersecting;
    if (running && !RM) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
    if (running && RM) draw();
  }).observe(sec);
})();

/* ── Magic TEXT-REVEAL (scroll-linked, vanilla) ── */
(function () {
  const host = $('treveal'), p = $('trevealText');
  if (!host || !p) return;
  const words = p.textContent.trim().split(/\s+/);
  p.textContent = '';
  const fills = [];
  words.forEach((w) => {
    const wrap = document.createElement('span');
    wrap.className = 'w' + ((w === 'machine.' || w === 'watching.') ? ' hl' : '');
    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.textContent = w;
    const fill = document.createElement('span');
    fill.className = 'fill';
    fill.textContent = w;
    wrap.appendChild(ghost);
    wrap.appendChild(fill);
    p.appendChild(wrap);
    fills.push(fill);
  });
  let ticking = false;
  function update() {
    ticking = false;
    const r = host.getBoundingClientRect();
    const total = host.offsetHeight - window.innerHeight;
    const prog = Math.max(0, Math.min(1, -r.top / total));
    const n = fills.length;
    fills.forEach((f, i) => {
      const start = i / n, end = start + 1 / n;
      const o = Math.max(0, Math.min(1, (prog - start) / (end - start)));
      f.style.opacity = o.toFixed(3);
    });
  }
  document.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ── SHOWCASE scroll demo ── */
(function () {
  const outer = $('showcase');
  if (!outer) return;
  outer.style.height = ((SHOW_STEPS.length + 1) * 100) + 'vh';
  const dots = $('showDots');
  SHOW_STEPS.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'sdot' + (i === 0 ? ' on' : '');
    d.setAttribute('aria-label', 'Go to step ' + (i + 1));
    d.addEventListener('click', () => {
      window.scrollTo({ top: outer.offsetTop + i * window.innerHeight + 2, behavior: 'smooth' });
    });
    dots.appendChild(d);
  });
  window.addEventListener('resize', () => {
    outer.style.height = ((SHOW_STEPS.length + 1) * 100) + 'vh';
  });
  let step = 0;
  function apply(i) {
    step = i;
    const s = SHOW_STEPS[i];
    const c = $('annoContent');
    c.classList.add('exit');
    setTimeout(() => {
      $('annoEyebrow').firstChild.textContent = s.eyebrow;
      $('annoStep').textContent = String(i + 1).padStart(2, '0') + ' / 0' + SHOW_STEPS.length;
      $('annoTitle').textContent = s.title;
      $('annoBody').textContent = s.body;
      c.classList.remove('exit');
    }, 180);
    SHOW_STEPS.forEach((_, k) => $('show' + k).classList.toggle('on', k === i));
    document.querySelectorAll('.sdot').forEach((d, k) => d.classList.toggle('on', k === i));
    $('showHeadTitle').textContent = s.header;
  }
  function onScroll() {
    const top = outer.getBoundingClientRect().top;
    const total = outer.offsetHeight - window.innerHeight;
    if (top > window.innerHeight || -top > total) return;
    const prog = Math.max(0, Math.min(1, -top / total));
    const next = Math.min(Math.floor(prog * SHOW_STEPS.length), SHOW_STEPS.length - 1);
    if (next !== step) apply(next);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
})();

/* ── Magic NUMBER-TICKER (easeOutExpo, vanilla) ── */
(function () {
  function tick(el) {
    const target = parseInt(el.dataset.ticker, 10);
    if (RM) { el.textContent = target.toLocaleString('en-US'); return; }
    const dur = 1600, t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  document.querySelectorAll('.ticker').forEach((el) => onScreen(el, () => tick(el), { threshold: 0.5 }));
})();

/* ── themes builder ── */
(function () {
  const tabs = $('themeTabs'), prevs = $('themePreviews');
  Object.entries(THEMES_PREVIEW).forEach(([id, t], i) => {
    const b = document.createElement('button');
    b.className = 'theme-tab' + (i === 0 ? ' active' : '');
    b.dataset.theme = id;
    b.textContent = t.name;
    b.addEventListener('click', () => applyTheme(id));
    tabs.appendChild(b);
    const d = document.createElement('div');
    d.className = 'theme-preview' + (i === 0 ? ' active' : '');
    d.id = 'tp-' + id;
    const tv = THEME_VARS[id], mp = MOCK_THEMES[id];
    const scope = '--tm-bg:' + mp.bg + ';--tm-surface:' + mp.sf + ';--tm-t1:' + mp.t1 + ';--tm-t2:' + mp.t2
      + ';--tm-line:' + mp.line + ';--tm-ac:' + tv.colors['--green'] + ';--tm-ac-tx:' + mp.actx
      + ";--tm-h:" + tv.hFont + ';--tm-b:' + tv.bFont;
    d.innerHTML = '<div class="theme-frame ' + t.frame + '"><div class="tmock" style="' + scope + '">'
      + '<div class="tmock-bar"><i></i><i></i><i></i></div>'
      + '<div class="tmock-body"><div class="tmock-side"><i></i><i class="on"></i><i></i><i></i></div>'
      + '<div class="tmock-main"><div class="tmock-row"><div><b>INV-003</b><small>Acme Corp · $4,500</small></div><em>Sent</em></div>'
      + '<div class="tmock-row"><div><b>Brand Refresh</b><small>Proposal · $12,000</small></div><em>Won</em></div>'
      + '<span class="tmock-cta">+ New invoice</span></div></div></div>'
      + '<h4>' + t.body + '</h4><p>' + t.desc + '</p></div>';
    prevs.appendChild(d);
  });
  $('themeEyebrow').textContent = Object.keys(THEMES_PREVIEW).length + ' themes';
})();

/* ── pricing toggle: monthly / yearly ── */
(function () {
  const mo = $('billMo'), yr = $('billYr'), num = $('proNum'), per = $('proPer'), note = $('proNote');
  if (!mo || !num) return;
  function countTo(to) {
    const from = parseInt(num.textContent, 10) || 0;
    if (RM || from === to) { num.textContent = to; return; }
    const t0 = performance.now(), dur = 550;
    (function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(2, -10 * p);
      num.textContent = Math.round(from + (to - from) * (p === 1 ? 1 : e));
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }
  function set(mode) {
    const yearly = mode === 'yr';
    mo.classList.toggle('on', !yearly);
    yr.classList.toggle('on', yearly);
    mo.setAttribute('aria-selected', String(!yearly));
    yr.setAttribute('aria-selected', String(yearly));
    countTo(yearly ? 99 : 14);
    per.textContent = yearly ? '/yr' : '/mo';
    note.textContent = yearly
      ? 'Billed yearly. Save 41% vs monthly. 30 days free. Checkout opens after you download.'
      : 'Billed monthly. Cancel anytime. 30 days free. Checkout opens after you download.';
  }
  mo.addEventListener('click', () => set('mo'));
  yr.addEventListener('click', () => set('yr'));
})();

/* ── download: stagger + OS detect + release ── */
(function () {
  const ids = ['dl-mac', 'dl-win', 'dl-linux'];
  const grid = document.querySelector('.dl-grid');
  if (grid) {
    onScreen(grid, () => {
      ids.forEach((id, i) => setTimeout(() => $(id).classList.add('vis'), i * 130));
    }, { threshold: 0.2 });
  }
  const ua = navigator.userAgent || '';
  const isMac = /Mac|iPhone|iPad/i.test(ua) && !/Windows/i.test(ua);
  const isWin = /Windows/i.test(ua);
  function hi(id) {
    ids.forEach((d) => $(d).classList.remove('hi'));
    $(id).classList.add('hi');
  }
  // Respect the hero-cta A/B variant: variant B owns the label, OS-detect only owns href/hi.
  const ctaVariant = document.documentElement.getAttribute('data-exp-hero-cta');
  function label(t) { if (ctaVariant !== 'B') $('heroBtnLabel').textContent = t; }
  if (isMac) { label('Download for Mac'); hi('dl-mac'); }
  else if (isWin) { label('Download for Windows'); hi('dl-win'); }
  else { label('Download for Linux'); hi('dl-linux'); }

  (async function () {
    try {
      const res = await fetch('/api/release');
      if (!res.ok) return;
      const rel = await res.json();
      const assets = rel.assets || [];
      const win = assets.find((a) => (a.name || '').endsWith('-setup.exe'));
      const mac = assets.find((a) => (a.name || '').endsWith('.dmg'));
      const lin = assets.find((a) => (a.name || '').endsWith('.AppImage'));
      const btn = $('heroBtn');
      if (isMac && mac) { btn.href = '/api/download/mac'; label('Download for Mac'); }
      else if (isWin && win) { btn.href = '/api/download/win'; label('Download for Windows'); }
      else if (lin) { btn.href = '/api/download/linux'; label('Download for Linux'); }
      if (rel.tag_name) {
        if ($('dlVer')) $('dlVer').textContent = rel.tag_name;
        if ($('heroVer')) $('heroVer').textContent = rel.tag_name;
      }
    } catch (e) { /* fallback links still work */ }
  })();
})();

/* ── FAQ button accordion: single-open + show-more pagination ── */
(function () {
  const list = document.querySelector('.faq-list');
  if (!list) return;
  const items = [...list.querySelectorAll('.faq-item')];
  items.forEach((item) => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      items.forEach((o) => {
        o.classList.remove('is-open');
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  const more = $('faqMore');
  if (more) more.addEventListener('click', () => {
    const open = list.classList.toggle('show-all');
    more.setAttribute('aria-expanded', open ? 'true' : 'false');
    more.textContent = open ? 'Show fewer questions' : 'Show all questions';
  });
})();

/* ── forms ── */
function wireForm(formId, statusId, btnId, btnLabel, payload, url) {
  const form = $(formId);
  if (!form) return;
  const status = $(statusId), btn = $(btnId);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = payload();
    if (typeof data === 'string') {
      status.textContent = data;
      status.className = 'form-status err';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    status.textContent = '';
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '');
      status.textContent = url.includes('issues') ? 'Issue filed. Thanks for reporting it.'
        : url.includes('waitlist') ? "You're on the list. One email when v2 ships." : 'Message sent. Talk soon.';
      status.className = 'form-status ok';
      form.reset();
    } catch (err) {
      status.textContent = (err && err.message) || 'Could not send. Try again in a bit.';
      status.className = 'form-status err';
    } finally {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
  });
}
wireForm('wait-form', 'wl-status', 'wl-submit', 'Notify me', () => {
  const email = $('wl-email').value.trim(), company_hp = $('wl-company').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please add a valid email — one launch email, nothing else.';
  return { email, company_hp };
}, '/api/waitlist');
wireForm('contact-form', 'cf-status', 'cf-submit', 'Send message', () => {
  const name = $('cf-name').value.trim(), email = $('cf-email').value.trim(),
    message = $('cf-message').value.trim(), company_hp = $('cf-company').value;
  if (!name || !email || !message) return 'Please fill in your name, email, and message.';
  return { name, email, message, company_hp };
}, '/api/contact');
wireForm('issue-form', 'ir-status', 'ir-submit', 'Report issue', () => {
  const name = $('ir-name').value.trim(), email = $('ir-email').value.trim(),
    title = $('ir-title').value.trim(), details = $('ir-details').value.trim(),
    company_hp = $('ir-company').value;
  if (!name) return 'Please add your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please add a valid email so we can follow up.';
  if (title.length < 5) return 'The summary needs at least 5 characters.';
  if (details.length < 10) return 'Details need at least 10 characters — steps to reproduce help most.';
  return { name, email, title, details, company_hp };
}, '/api/issues');

/* ── live timers (drift-proof, Date baseline) ── */
(function () {
  const els = [...document.querySelectorAll('.js-tick')];
  if (!els.length || RM) return;
  const t0 = Date.now();
  const fmt = (s) => Math.floor(s / 3600) + ':' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  setInterval(() => {
    const el = Math.floor((Date.now() - t0) / 1000);
    els.forEach((e) => { e.textContent = fmt(parseInt(e.dataset.base, 10) + el); });
  }, 1000);
})();

/* ── easter egg: type LANCE ── */
(function () {
  let seq = '', crazy = false, timer = null;
  document.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    seq = (seq + e.key.toUpperCase()).slice(-5);
    if (seq === 'LANCE' && !crazy) {
      seq = ''; crazy = true;
      $('egg-overlay').classList.add('show');
      meteorShower('meteors', 30);
      timer = setTimeout(() => { crazy = false; $('egg-overlay').classList.remove('show'); }, 2200);
      if (timer === null) clearTimeout(timer);
    }
  });
})();
