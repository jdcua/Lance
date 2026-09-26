/* AUTO-GENERATED countdown — include after app.js or ignore. */
(function () {
  var cfg = window.LANCE_LAUNCH; if (!cfg || !cfg.date) return;
  var badge = document.querySelector('.hero-badge .mono');
  if ((cfg.mode === 'countdown' || cfg.mode === 'tease') && badge) {
    var t = new Date(cfg.date + 'T09:00:00-04:00').getTime();
    if (isNaN(t)) return;
    var el = document.createElement('span');
    el.className = 'mono'; el.id = 'launchCountdown'; el.style.marginLeft = '8px';
    badge.appendChild(el);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var d = Math.max(0, t - Date.now());
      var days = Math.floor(d / 864e5), h = Math.floor(d / 36e5) % 24, m = Math.floor(d / 6e4) % 60;
      el.textContent = '· T-' + days + 'd ' + pad(h) + 'h ' + pad(m) + 'm';
    };
    tick(); setInterval(tick, 30000);
  }
})();
