/* AUTO-GENERATED A/B activator — anonymous, first-party only. */
(function () {
  function isBot() { return /bot|crawl|spider|slurp|mediapartners/i.test(navigator.userAgent || ''); }
  function bucket(expId) {
    try {
      var m = document.cookie.match(new RegExp('lance_ab_' + expId + '=(A|B|C)'));
      if (m) return m[1];
      if (isBot()) return 'A';
      var v = Math.random() < 0.5 ? 'A' : 'B';
      document.cookie = 'lance_ab_' + expId + '=' + v + ';max-age=2592000;path=/;SameSite=Lax';
      return v;
    } catch (e) { return 'A'; }
  }
  function beacon(exp, variant, goal) {
    try {
      fetch('/api/exp-hit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exp: exp, variant: variant, goal: goal }), keepalive: true });
    } catch (e) { /* beacon is best-effort; page works without it */ }
  }
  function frag(expId, v) {
    var el = document.querySelector('[data-exp-fragment="' + expId + ':' + v + '"]');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var qs = new URLSearchParams(location.search);
  function activate(expId, apply) {
    var v = qs.get('ab_' + expId) || bucket(expId);
    document.documentElement.setAttribute('data-exp-' + expId, v);
    if (v !== 'A') {
      var data = frag(expId, v);
      if (data) apply(data, v);
    }
    beacon(expId, v, 'view');
    return v;
  }
  // hero-cta: button label + download-click goal on all download CTAs
  var ctaV = activate('hero-cta', function (data) {
    var btn = document.getElementById('heroBtnLabel');
    if (btn && data.heroBtnLabel) btn.textContent = data.heroBtnLabel;
  });
  ['heroBtn', 'dl-mac', 'dl-win', 'dl-linux'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { beacon('hero-cta', ctaV, 'dl-click'); }, { once: true });
  });
  // hero-h1: swap headline lines pre-paint
  activate('hero-h1', function (data) {
    var h1 = document.querySelector('.hero-hl');
    if (h1 && data.h1) h1.innerHTML = '<span class="hl-line"><span>' + data.h1 + '</span></span>';
  });
  // pricing-order: reorder cards per variant (ids: freeCard/proCard/lifetimeCard)
  activate('pricing-order', function (data) {
    var grid = document.querySelector('.pricing-grid');
    if (!grid || !data.order) return;
    var ids = { free: 'freeCard', pro: 'proCard', lifetime: 'lifetimeCard' };
    data.order.forEach(function (key) {
      var el = document.getElementById(ids[key]);
      if (el) grid.appendChild(el);
    });
    if (data.ribbon) {
      var life = document.querySelector('#lifetimeCard .price-badge');
      if (life) life.textContent = data.ribbon;
    }
  });
  // trial-cta goal: pro trial + lifetime buttons
  var poV = document.documentElement.getAttribute('data-exp-pricing-order') || 'A';
  document.querySelectorAll('#proCard .shimmer, #lifetimeCard .ghost-btn').forEach(function (b) {
    b.addEventListener('click', function () { beacon('pricing-order', poV, 'trial-cta'); }, { once: true });
  });
})();
