/* ============================================================
   BUNCH OF BLISS — LANDING PAGE LOGIC V1
   Events: PageView → ViewContent → LeadFormStart → Lead → WhatsAppClick
   Lead → Supabase (non-blocking) → redirect WhatsApp dengan konteks
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.BOB_CONFIG || {};
  var CAMPAIGN = window.BOB_CAMPAIGN || { id: 'unknown', label: '', wa: 'Halo Bunch of Bliss, saya {nama}.' };

  /* ---------- Meta Pixel (aman jika belum ada Pixel ID) ---------- */
  function initPixel() {
    if (!CFG.PIXEL_ID) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    window.fbq = window.fbq || function () {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    };
    window._fbq = window._fbq || window.fbq;
    window.fbq('init', CFG.PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function track(ev, data) {
    if (window.fbq) {
      try { window.fbq('track', ev, data || {}); } catch (e) { /* jangan ganggu UX */ }
    }
    if (window.console && CFG.DEBUG) console.log('[fbq]', ev, data);
  }

  /* ---------- UTM + Meta click ID ---------- */
  function getUtm() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || '',
      utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_content: p.get('utm_content') || '',
      utm_term: p.get('utm_term') || ''
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

  /* ---------- Event: LeadFormStart (sekali, saat form pertama disentuh) ---------- */
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

  /* ---------- Event: WhatsAppClick ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (a) track('WhatsAppClick', { campaign: CAMPAIGN.id });
  });

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
      var recipient = (form.querySelector('input[name="untuk"]:checked') || {}).value || '';
      var budget = (form.querySelector('input[name="budget"]:checked') || {}).value || '';
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
      if (!recipient) return showErr('Pilih dulu: bunga ini untuk siapa?');
      if (!budget) return showErr('Pilih dulu perkiraan budget kamu ya');
      if (!consent) return showErr('Centang persetujuan pemrosesan data dulu ya');

      errEl.style.display = 'none';
      var btn = form.querySelector('.btn-submit');
      btn.disabled = true;
      btn.textContent = 'MEMBUKA WHATSAPP…';

      /* --- Lead event ke Meta --- */
      track('Lead', { campaign: CAMPAIGN.id, budget: budget, recipient: recipient });

      /* --- Simpan ke database (TIDAK memblokir redirect WA) --- */
      var utm = getUtm();
      var lead = {
        name: name.trim(),
        phone: '+62' + digits.replace(/^0/, '').replace(/^62/, ''),
        email: email.trim(),
        campaign: CAMPAIGN.id,
        recipient: recipient,
        budget: budget,
        status: 'NEW',
        fbp: getCookie('_fbp') || '',
        fbc: getCookie('_fbc') || '',
        utm_source: utm.utm_source, utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign, utm_content: utm.utm_content
      };

      saveLead(lead);

      /* --- Redirect WhatsApp dengan konteks --- */
      var waText = CAMPAIGN.wa
        .replace('{nama}', name.trim())
        .replace('{untuk}', recipient.toLowerCase())
        .replace('{budget}', budget);
      var url = 'https://wa.me/' + CFG.WA_NUMBER + '?text=' + encodeURIComponent(waText);

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
    setupForm();
  });
})();
