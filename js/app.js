/* ============================================================
   BUNCH OF BLISS — LANDING PAGE LOGIC V5
   Form ringan: Nama + WhatsApp + Email (+ consent)
   Kualifikasi (untuk siapa/budget/tanggal) digali CS di chat.
   Events: PageView → ViewContent → LeadFormStart → Lead → WhatsAppClick
   Lead → Supabase (non-blocking) → redirect WhatsApp dengan konteks
   Sticky CTA: tampil hanya ketika form TIDAK terlihat
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.BOB_CONFIG || {};
  var CAMPAIGN = window.BOB_CAMPAIGN || { id: 'unknown', wa: 'Halo Bunch of Bliss, saya {nama}.' };

  /* ---------- Meta Pixel (aman jika belum ada Pixel ID) ---------- */
  function initPixel() {
    if (!CFG.PIXEL_ID) return;
    // Pola resmi Meta: fbq.queue (BUKAN fbq.q — kalau salah, fbevents.js crash)
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

  /* ---------- Event: LeadFormStart (sekali) ---------- */
  var formStarted = false;
  function watchFormStart(form) {
    var mark = function () {
      if (formStarted) return;
      formStarted = true;
      track('LeadFormStart', { campaign: CAMPAIGN.id });
      form.removeEventListener('focusin', mark);
      form.removeEventListener('click', mark);
    };
    form.addEventListener('focusin', mark);
    form.addEventListener('click', mark);
  }

  /* ---------- Sticky CTA: hanya saat (1) lewat hero DAN (2) form tidak terlihat ---------- */
  function watchSticky() {
    var bar = document.getElementById('sticky-bar');
    var hero = document.querySelector('.hero');
    var formSection = document.getElementById('form');
    if (!bar || !hero) return;

    var formVisible = false;
    function update() {
      var pastHero = window.scrollY > hero.offsetHeight * 0.7;
      bar.classList.toggle('visible', pastHero && !formVisible);
    }
    window.addEventListener('scroll', update, { passive: true });

    if (formSection && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          formVisible = e.isIntersecting;
          update();
        });
      }, { threshold: 0.05 });
      obs.observe(formSection);
    }
    update();
  }

  /* ---------- Form submit ---------- */
  function setupForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;
    watchFormStart(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (form.querySelector('#nama') || {}).value || '';
      var phone = (form.querySelector('#wa') || {}).value || '';
      var email = (form.querySelector('#email') || {}).value || '';
      var consent = (form.querySelector('#consent') || {}).checked;
      var errEl = form.querySelector('.form-error');

      function showErr(msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }

      var digits = phone.replace(/\D/g, '');
      if (!name.trim()) return showErr('Isi nama kamu dulu ya 🙂');
      if (digits.length < 9) return showErr('Nomor WhatsApp-nya belum valid — cek lagi ya');
      if (!/^\S+@\S+\.\S+$/.test(email)) return showErr('Email-nya belum valid — cek lagi ya');
      if (!consent) return showErr('Centang persetujuan pemrosesan data dulu ya');

      errEl.style.display = 'none';
      var btn = form.querySelector('.btn-submit');
      btn.disabled = true;
      btn.textContent = 'MEMBUKA WHATSAPP…';

      /* --- Lead event ke Meta (hanya saat submit valid) --- */
      track('Lead', { campaign: CAMPAIGN.id });

      /* --- Simpan ke database (TIDAK memblokir redirect WA) --- */
      var attr = getAttribution();
      var lead = {
        name: name.trim(),
        phone: '+62' + digits.replace(/^0/, '').replace(/^62/, ''),
        email: email.trim(),
        campaign: CAMPAIGN.id,
        status: 'NEW',
        fbp: getCookie('_fbp') || '',
        fbc: getCookie('_fbc') || '',
        fbclid: attr.fbclid,
        utm_source: attr.utm_source, utm_medium: attr.utm_medium,
        utm_campaign: attr.utm_campaign, utm_content: attr.utm_content,
        utm_term: attr.utm_term, adset: attr.adset, ad: attr.ad,
        creative: attr.creative, landing_page: attr.landing_page
      };
      saveLead(lead);

      /* --- Redirect WhatsApp dengan konteks --- */
      var waText = CAMPAIGN.wa.replace('{nama}', name.trim());
      var url = 'https://wa.me/' + CFG.WA_NUMBER + '?text=' + encodeURIComponent(waText);

      track('WhatsAppClick', { campaign: CAMPAIGN.id });

      var successEl = form.querySelector('.form-success');
      if (successEl) {
        successEl.style.display = 'block';
        successEl.querySelector('.wa-link').href = url;
      }
      form.style.display = 'none';
      window.open(url, '_blank');
    });
  }

  function saveLead(lead) {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return; // database belum siap — skip diam-diam
    fetch(CFG.SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CFG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CFG.SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(lead)
    }).catch(function () { /* network error — lead tetap lanjut ke WA */ });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initPixel();
    watchProducts();
    watchSticky();
    setupForm();
  });
})();
