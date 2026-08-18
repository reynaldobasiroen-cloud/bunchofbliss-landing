/* ============================================================
   BUNCH OF BLISS — CONFIG V1
   Edit di sini aja — nggak perlu sentuh HTML.
   ============================================================ */

window.BOB_CONFIG = {
  // WhatsApp Business (format internasional tanpa +)
  WA_NUMBER: '628992289427',

  // Supabase — DIISI SETELAH DATABASE DIBUAT
  SUPABASE_URL: '',            // contoh: https://xxxx.supabase.co
  SUPABASE_ANON_KEY: '',       // anon key (aman untuk frontend)

  // Meta Pixel — DIISI SETELAH PIXEL DIBUAT DI EVENTS MANAGER
  PIXEL_ID: '',                // contoh: '1234567890123456'

  // CDN foto produk (sumber: website Bunch of Bliss di Zyro)
  CDN: 'https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=800/AGB66ZV18NI3a6Or/',

  // Foto produk (nama file asli dari website)
  PHOTOS: {
    heroAnniversary: 'img-20241028-wa0079-YrDlbwGvR9IEMlEB.jpg',
    heroBirthday:    'img_20241112_133926-m5KwQpjXDxTZLxGV.jpg',
    heroBingung:     'img-20241028-wa0050-m2Wp9GJQP9uqbBw3.jpg',
    gallery: [
      'img-20241028-wa0050-m2Wp9GJQP9uqbBw3.jpg',
      'img_20241112_133926-m5KwQpjXDxTZLxGV.jpg',
      'img-20241028-wa0079-YrDlbwGvR9IEMlEB.jpg',
      'img_20241029_162043_200-AzGe3DDwDru28XNg.jpg',
      'img-20241028-wa0032-Y4LVxpajn0HyXjJL.jpg',
      'img-20241028-wa0012-m2WpalLL3Ei4pyK2.jpg'
    ],
    bucket300:  'img-20241028-wa0012-m2WpalLL3Ei4pyK2.jpg',
    bucket500:  'img_20240930_154220-AGB6yzG85QfJwZE9.jpg',
    bucket1m:   'img-20241028-wa0079-YrDlbwGvR9IEMlEB.jpg',
    bucketPlus: 'img_20241112_133926-m5KwQpjXDxTZLxGV.jpg'
  }
};
