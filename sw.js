/* RenewPro 7 — عامل الخدمة
   الشبكة أولاً دائماً (فأي تحديث ترفعه يظهر فوراً)، والنسخة المحفوظة فقط عند انقطاع الإنترنت.
   مجلد calc/ له عامله الخاص ولا يُمسّ هنا. */
const CACHE = 'renewpro-v7-36';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf('renewpro-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== location.origin || u.pathname.indexOf('/calc/') >= 0) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('./index.html'); }); }));
});
