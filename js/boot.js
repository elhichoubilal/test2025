/* ══════════════════════════════════════════════════════════
   RenewPro 2 — boot.js   (الإقلاع: الدخول، إظهار التطبيق، حالة المزامنة)
══════════════════════════════════════════════════════════ */
'use strict';
(function () {
  App.lang = Local.get('lang', 'ar') === 'fr' ? 'fr' : 'ar';
  document.documentElement.lang = App.lang; document.documentElement.dir = App.lang === 'fr' ? 'ltr' : 'rtl';
  App.setTheme(Local.get('theme', 'light'));

  function loginTexts() {
    $('lg-sub').textContent = L('تسجيل الدخول', 'Connexion');
    $('lg-email').placeholder = L('البريد الإلكتروني', 'Email'); $('lg-pass').placeholder = L('كلمة السر', 'Mot de passe');
    $('lg-btn').textContent = L('دخول', 'Se connecter');
  }
  function showLogin() { $('splash').classList.add('hide'); $('app').classList.add('hide'); $('login').classList.remove('hide'); $('lg-btn').disabled = false; loginTexts();
    var le = ''; try { le = localStorage.getItem('rp4_last_email') || ''; } catch (x) { }
    if (le && !$('lg-email').value) { $('lg-email').value = le; setTimeout(function () { try { $('lg-pass').focus(); } catch (x) { } }, 50); } }
  function syncDot() {
    var el = $('sync'); if (!el) return;
    var st = Contacts.denied ? 'err' : (!navigator.onLine || Contacts.offline) ? 'off' : Contacts.pending ? 'busy' : 'ok';
    el.className = 'sync ' + st;
    el.title = { ok: L('متزامن', 'Synchronisé'), busy: L('جارٍ الحفظ…', 'Enregistrement…'), off: L('غير متصل — التعديلات تُرسل عند عودة الاتصال', 'Hors ligne'), err: L('المزامنة مرفوضة', 'Synchronisation refusée') }[st];
  }
  function topBar() {
    if (!App.user) return;
    $('uchip').innerHTML = '<span>' + (App.user.admin ? '★ ' : '') + esc(App.user.name) + '</span>';
    var lb = $('lang-b'); if (lb) lb.textContent = App.lang === 'fr' ? 'ع' : 'FR';
    var n = Meta.get('listName', ''), d = Meta.get('listLoadedAt', '');
    $('top-list').innerHTML = n ? '📋 ' + esc(n) + (d ? ' · ' + fmtDT(d).slice(0, 5) : '') : '';
  }

  App.on('login', function () {
    $('splash').classList.add('hide'); $('login').classList.add('hide'); $('app').classList.remove('hide'); $('lg-pass').value = '';
    Contacts.start(); Meta.start(); topBar(); syncDot();
    App.go(Local.get('page', 'dash'));
  });
  App.on('logout', showLogin);
  App.on('sync', syncDot);
  App.on('refresh', function () { topBar(); syncDot(); });
  App.on('lang', function () { loginTexts(); topBar(); });
  App.on('fb-fail', function () {
    showLogin(); $('lg-btn').disabled = true;
    $('lg-err').innerHTML = L('تعذّر الاتصال — تحقّق من الإنترنت ثم ', 'Connexion impossible — vérifiez Internet puis ') + '<a href="#" id="lg-retry">' + L('أعد المحاولة', 'réessayez') + '</a>';
    $('lg-retry').onclick = function (e) { e.preventDefault(); location.reload(); };
  });
  window.addEventListener('online', syncDot); window.addEventListener('offline', syncDot);
  window.addEventListener('resize', debounce(function () { if (App.user) App.render(); }, 200));

  document.addEventListener('DOMContentLoaded', function () {
    loginTexts();
    $('lg-form').addEventListener('submit', function (e) {
      e.preventDefault(); if (!FB.ready) return;
      var em = $('lg-email').value.trim(), pw = $('lg-pass').value, btn = $('lg-btn');
      if (!em || !pw) return;
      btn.disabled = true; btn.textContent = L('جارٍ الدخول…', 'Connexion…'); $('lg-err').textContent = '';
      FB.login(em, pw).catch(function (err) { btn.disabled = false; btn.textContent = L('دخول', 'Se connecter'); $('lg-err').textContent = FB.errText(err); });
    });
    /* إغلاق النافذة بالضغط خارجها */
    $('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') Modal.close(); });
    FB.init();
    /* تثبيت كتطبيق: عامل خدمة بسيط (الشبكة أولاً، والنسخة المحفوظة عند انقطاعها) */
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  });
})();
/* تذكّر آخر بريد دخل به هذا الجهاز: يظهر مكتوباً في خانة الدخول بعد الخروج */
App.on('login', function () { try { if (App.user && App.user.email) localStorage.setItem('rp4_last_email', App.user.email); } catch (x) { } });
