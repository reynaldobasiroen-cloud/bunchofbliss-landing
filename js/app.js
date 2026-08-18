/* ============================================================
   BUNCH OF BLISS — LANDING PAGE LOGIC V2
   Events: PageView → ViewContent → LeadFormStart → Lead → WhatsAppClick
   Lead → Supabase (non-blocking) → redirect WhatsApp dengan konteks
   Lead payload: campaign, adset, ad, utm_*, landing_page,
                 relationship, budget, occasion, required_date
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.BOB_CONFIG || {};
  var CAMPAIGN = window.BOB_CAMPAIGN || { id: 'unknown', wa: 'Halo Bunch of Bliss, saya {nama}.' };

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

  /* ---------- Event: WhatsAppClick ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (a) track('WhatsAppClick', { campaign: CAMPAIGN.id });
  });

  /* ---------- Sticky CTA (muncul setelah hero terlewat) ---------- */
  function watchSticky() {
    var bar = document.getElementById('sticky-bar');
    var hero = document.querySelector('.hero');
    if (!bar || !hero) return;
    var shown = false;
    var onScroll = function () {
      var past = window.scrollY > hero.offsetHeight * 0.7;
      if (past !== shown) {
        shown = past;
        bar.classList.toggle('visible', past);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Form submit ---------- */
  function setupForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;
    watchFormStart(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var getVal = function (id) { return (form.querySelector(id) || {}).value || ''; };
      var getRadio = function (n) {
        return (form.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
      };

      var name = getVal('#nama');
      var phone = getVal('#wa');
      var email = getVal('#email');
      var recipient = getRadio('untuk');
      var budget = getRadio('budget');
      var occasion = getRadio('occasion');       // hanya campaign bingung
      var requiredDate = getVal('#tanggal');     // hanya campaign birthday
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
      if (form.querySelector('input[name="occasion"]') && !occasion) return showErr('Pilih dulu momennya apa');
      if (form.querySelector('#tanggal') && !requiredDate) return showErr('Isi tanggal dibutuhkan-nya ya');
      if (!consent) return showErr('Centang persetujuan pemrosesan data dulu ya');

      errEl.style.display = 'none';
      var btn = form.querySelector('.btn-submit');
      btn.disabled = true;
      btn.textContent = 'MEMBUKA WHATSAPP…';

      /* --- Lead event ke Meta --- */
      track('Lead', { campaign: CAMPAIGN.id, budget: budget, relationship: recipient });

      /* --- Simpan ke database (TIDAK memblokir redirect WA) --- */
      var attr = getAttribution();
      var lead = {
        name: name.trim(),
        phone: '+62' + digits.replace(/^0/, '').replace(/^62/, ''),
        email: email.trim(),
        campaign: CAMPAIGN.id,
        relationship: recipient,
        budget: budget,
        occasion: occasion,
        required_date: requiredDate,
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
      var waText = CAMPAIGN.wa
        .replace('{nama}', name.trim())
        .replace('{untuk}', recipient.toLowerCase())
        .replace('{budget}', budget)
        .replace('{occasion}', occasion || '')
        .replace('{tanggal}', requiredDate || '');
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
    watchSticky();
    setupForm();
  });
})();
