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
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-exp]').forEach(function (node) {
      var expId = node.getAttribute('data-exp');
      var v = new URLSearchParams(location.search).get('ab_' + expId) || bucket(expId);
      node.setAttribute('data-exp-variant', v);
      if (v !== 'A') {
        var frag = document.querySelector('[data-exp-fragment="' + expId + ':' + v + '"]');
        if (frag) {
          try {
            var data = JSON.parse(frag.textContent);
            if (data.heroBtnLabel) {
              var btn = document.getElementById('heroBtnLabel');
              if (btn) btn.textContent = data.heroBtnLabel;
            }
            if (data.h1) {
              var h1 = document.querySelector('.hero-hl');
              if (h1) h1.setAttribute('data-variant-h1', data.h1);
            }
          } catch (e) {}
        }
      }
      if (expId === 'hero-cta') {
        ['heroBtn', 'dl-mac', 'dl-win', 'dl-linux'].forEach(function (id) {
          var b = document.getElementById(id);
          if (b && !b.dataset.expWired) { b.dataset.expWired = '1';
            b.addEventListener('click', function () { beacon(expId, v, 'dl-click'); }, { once: true }); }
        });
      }
    });
  });
})();
