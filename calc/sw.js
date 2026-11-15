/* ══════════════════════════════════════════════════════════
Service Worker — EUR assurance — Desktop
يخزّن هيكل التطبيق (App Shell) للعمل بدون إنترنت والتثبيت كتطبيق.
لا يتدخل في طلبات Firebase (اتصالات خارجية) — فقط ملفات نفس الموقع.
══════════════════════════════════════════════════════════ */
const CACHE_NAME = 'eur-desktop-v7-8';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/01-base.js',
  './js/02-caisse.js',
  './js/03-archives-journal-reports.js',
  './js/04-dashboard.js',
  './js/05-utils-prices-numbering.js',
  './js/06-installments.js',
  './js/07-login-lang-lock.js',
  './js/08-tarif-calc.js',
  './js/09-valider-receipts.js',
  './js/10-history.js',
  './js/11-stats-users.js',
  './js/12-clients-direct-export.js',
  './js/13-pdf-templates.js',
  './js/14-pdf-client-import.js',
  './js/14b-pdf-docs.js',
  './js/15-nav-pwa-init.js',
  './js/16-renewals-tracker.js',
  './js/17-unpaid.js',
  './js/18-phones.js',
  './js/19-rt-histlink.js',
  './js/20-v7-compact.js',
  './embed.js',
  './date-fix.js',
  './mobile-fix.css',
  './firebase-sync.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // نتعامل فقط مع طلبات GET من نفس الأصل (الملفات المحلية) — أي شيء آخر (Firebase, Fonts) يمر مباشرة للشبكة
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () {
        return cached; // لا يوجد إنترنت — استخدم النسخة المخزّنة إن وُجدت
      });
      // أولوية للكاش لسرعة الفتح، مع تحديث بالخلفية من الشبكة
      return cached || networkFetch;
    })
  );
});
