/* ============================================================
   BUNCH OF BLISS — LANDING PAGE LOGIC V9
   Tanpa form: klik WA langsung.
   Tracking ganda:
     - Meta Pixel: PageView → ViewContent → Contact
     - Supabase: log klik WA ke tabel bob_leads (status WA_CLICK)
       => angka klik WA yang 100% akurat, independen dari Meta
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

  /* ---------- UTM + Meta click params ---------- */
  function getAttribution() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || '',
      utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_content: p.get('utm_content') || '',
      utm_term: p.get('utm_term') || '',
      adset: p.get('utm_adset') || '',
      ad: p.get('utm_ad') || '',
      creative: p.get('utm_creative') || '',
      fbclid: p.get('fbclid') || '',
      landing_page: window.location.pathname.split('/').pop() || ''
    };
  }

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
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

  /* ---------- Klik WA: track Contact (Meta) + log ke Supabase ---------- */
  function watchDirectWA() {
    var btns = document.querySelectorAll('.wa-direct');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        track('Contact', { campaign: CAMPAIGN.id });
        saveClick();
      });
    }
  }

  function saveClick() {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var attr = getAttribution();
    var row = {
      name: '',
      phone: '',
      email: '',
      campaign: CAMPAIGN.id,
      status: 'WA_CLICK',
      landing_page: attr.landing_page,
      utm_source: attr.utm_source, utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign, utm_content: attr.utm_content, utm_term: attr.utm_term,
      adset: attr.adset, ad: attr.ad, creative: attr.creative, fbclid: attr.fbclid,
      fbp: getCookie('_fbp') || '', fbc: getCookie('_fbc') || ''
    };
    fetch(CFG.SUPABASE_URL + '/rest/v1/bob_leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CFG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CFG.SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(function () { /* network error — jangan ganggu UX */ });
  }

  /* ---------- Sticky CTA ---------- */
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
