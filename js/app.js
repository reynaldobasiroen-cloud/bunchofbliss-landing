/* ============================================================
   BUNCH OF BLISS — LANDING PAGE LOGIC V7
   Tanpa form: klik WA langsung (button .wa-direct)
   Events: PageView → ViewContent → WhatsAppClick
   Sticky CTA: tampil hanya saat bagian WA belum terlihat
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.BOB_CONFIG || {};
  var CAMPAIGN = window.BOB_CAMPAIGN || { id: 'unknown' };

  /* ---------- Meta Pixel (pola resmi Meta) ---------- */
  function initPixel() {
    if (!CFG.PIXEL_ID) return;
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.PIXEL_ID);
    window.fbq('track', 'PageView', { campaign: CAMPAIGN.id });
  }

  function track(ev, data) {
    if (window.fbq) {
      try { window.fbq('track', ev, data || {}); } catch (e) { /* jangan ganggu UX */ }
    }
    if (window.console && CFG.DEBUG) console.log('[fbq]', ev, data);
  }

  /* ---------- Event: ViewContent saat section produk terlihat ---------- */
  var productSeen = false;
  function watchProducts() {
    var el = document.getElementById('produk');
    if (!el || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !productSeen) {
          productSeen = true;
          track('ViewContent', { content_name: CAMPAIGN.id + '_products' });
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(el);
  }

  /* ---------- Event: WhatsAppClick saat tombol WA diklik ---------- */
  function watchDirectWA() {
    var btns = document.querySelectorAll('.wa-direct');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        track('WhatsAppClick', { campaign: CAMPAIGN.id });
      });
    }
  }

  /* ---------- Sticky CTA: tampil setelah hero, hilang saat bagian WA terlihat ---------- */
  function watchSticky() {
    var bar = document.getElementById('sticky-bar');
    var hero = document.querySelector('.hero');
    var waSection = document.getElementById('form');
    if (!bar || !hero) return;

    var waVisible = false;
    function update() {
      var pastHero = window.scrollY > hero.offsetHeight * 0.7;
      bar.classList.toggle('visible', pastHero && !waVisible);
    }
    window.addEventListener('scroll', update, { passive: true });

    if (waSection && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          waVisible = e.isIntersecting;
          update();
        });
      }, { threshold: 0.05 });
      obs.observe(waSection);
    }
    update();
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initPixel();
    watchProducts();
    watchSticky();
    watchDirectWA();
  });
})();
