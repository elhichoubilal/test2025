/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-lock.js   (🔒 القفل الصامت — اختياري، من الإعدادات، لهاد الجهاز فقط)
   • متوقف بالأصل. ملي كيتشعل: إلا دازت N دقايق بلا حركة (ولا Ctrl+L) ← البرنامج كيرجع للرئيسية
     وكيبان مفتوح عادي، ولكن حتى ضغطة ولا كتابة ولا سكرول ما كتخدم. بلا رسالة وبلا خانة.
   • باش يتحل: كتكتب الكود (6 أرقام) بالكلافيي وصافي ← كيرجعك للصفحة اللي كنتي فيها.
   • F5 ما كيحلّوش. 5 ديال الغلطات ← خروج من الحساب (خاص الدخول العادي).
   • الخروج اليدوي وانت مقفول: Ctrl+Shift+Q.
   • الكود كيتحفظ مشفّر (SHA-256 + ملح) فهاد الجهاز فقط. الدخول العادي ما تمسّش.
══════════════════════════════════════════════════════════ */
'use strict';
var Lock7 = { K: 'rp7_lock', KL: 'rp7_locked', on: false, buf: '', bufT: null, fails: 0, last: Date.now(), page: null, ov: null, setup: null };
function lk7Cfg() { try { return JSON.parse(localStorage.getItem(Lock7.K) || 'null') || {}; } catch (e) { return {}; } }
function lk7Save(c) { try { localStorage.setItem(Lock7.K, JSON.stringify(c)); } catch (e) { } }
function lk7Hash(pin, salt) {
  var s = String(salt) + ':' + String(pin);
  if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Promise.resolve('f' + (h >>> 0).toString(16));
}
/* اختصار القفل: Ctrl+Shift+L (Chrome كياخد Ctrl+L لخانة الرابط ما كيخليهاش للصفحة) — وكنقبلو حتى Ctrl+L إلا وصلات */
function lk7Key(e) { var k = (e.key || '').toLowerCase(); return (e.ctrlKey || e.metaKey) && !e.altKey && (k === 'l' || e.code === 'KeyL'); }
function lk7Active() { var c = lk7Cfg(); return !!(c.on && c.h); }

/* ───── القفل ───── */
function lk7Lock() {
  if (Lock7.on || !App.user || !lk7Active()) return;
  Lock7.on = true; Lock7.buf = ''; Lock7.fails = 0;
  try { localStorage.setItem(Lock7.KL, '1'); } catch (e) { }
  Lock7.page = App.page;
  try { Modal.close(); } catch (e) { } try { if (typeof Sheet !== 'undefined' && Sheet.isOpen && Sheet.isOpen()) Sheet.close(); } catch (e) { }
  try { var s = $('session'); if (s) s.classList.remove('on'); } catch (e) { }
  if (App.page !== 'dash') App.go('dash');
  try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { }
  if (!Lock7.ov) { Lock7.ov = document.createElement('div'); Lock7.ov.className = 'lk7-ov'; Lock7.ov.setAttribute('aria-hidden', 'true'); document.body.appendChild(Lock7.ov); }
  Lock7.ov.style.display = 'block';
}
function lk7Unlock() {
  Lock7.on = false; Lock7.buf = ''; Lock7.fails = 0; Lock7.last = Date.now();
  try { localStorage.removeItem(Lock7.KL); } catch (e) { }
  if (Lock7.ov) Lock7.ov.style.display = 'none';
  if (Lock7.page && Lock7.page !== 'dash') App.go(Lock7.page);
}
function lk7Try() {
  var c = lk7Cfg(), pin = Lock7.buf; Lock7.buf = '';
  lk7Hash(pin, c.s).then(function (h) {
    if (h === c.h) { lk7Unlock(); return; }
    if (++Lock7.fails >= 5) { try { localStorage.removeItem(Lock7.KL); } catch (e) { } Lock7.on = false; if (Lock7.ov) Lock7.ov.style.display = 'none'; FB.logout(); }
  });
}
/* وهو مقفول: كلشي كيتبلوكا. الأرقام كتتجمّع بلا ما تبان */
window.addEventListener('keydown', function (e) {
  if (!Lock7.on) {
    if (lk7Key(e) && lk7Active() && App.user) { e.preventDefault(); lk7Lock(); }
    return;
  }
  e.preventDefault(); e.stopImmediatePropagation();
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key || '').toLowerCase() === 'q') { try { localStorage.removeItem(Lock7.KL); } catch (x) { } Lock7.on = false; if (Lock7.ov) Lock7.ov.style.display = 'none'; FB.logout(); return; }
  if (/^[0-9]$/.test(e.key)) {
    Lock7.buf += e.key; clearTimeout(Lock7.bufT); Lock7.bufT = setTimeout(function () { Lock7.buf = ''; }, 4000);
    if (Lock7.buf.length >= 6) lk7Try();
  } else if (e.key === 'Backspace') Lock7.buf = Lock7.buf.slice(0, -1);
}, true);
['keyup', 'keypress', 'input', 'paste', 'wheel', 'touchmove', 'contextmenu', 'dragstart', 'drop'].forEach(function (t) {
  window.addEventListener(t, function (e) { if (Lock7.on) { e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, passive: false });
});
['mousedown', 'click', 'dblclick', 'pointerdown', 'touchstart', 'focusin'].forEach(function (t) {
  window.addEventListener(t, function (e) { if (Lock7.on) { e.preventDefault(); e.stopImmediatePropagation(); if (t === 'focusin' && e.target && e.target.blur) e.target.blur(); } }, true);
});
/* الحركة ← كتعاود الحساب */
function lk7Act() { if (!Lock7.on) Lock7.last = Date.now(); }
['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart', 'scroll'].forEach(function (t) { window.addEventListener(t, lk7Act, { capture: true, passive: true }); });
/* حتى الحركة داخل الحاسبة (الإطار) */
setInterval(function () {
  try { var w = Calc.frame && Calc.frame.contentWindow; if (w && !w.__lk7) { w.__lk7 = 1; ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart'].forEach(function (t) { w.addEventListener(t, lk7Act, { capture: true, passive: true }); });
      w.addEventListener('keydown', function (e) { if (lk7Key(e) && lk7Active() && App.user) { e.preventDefault(); lk7Lock(); } }, true); } } catch (e) { }
  var c = lk7Cfg();
  if (!Lock7.on && App.user && c.on && c.h && Date.now() - Lock7.last >= (c.m || 5) * 60000) lk7Lock();
}, 5000);
/* F5 ولا دخول جديد وهو مقفول ← كيبقى مقفول */
App.on('login', function () { Lock7.last = Date.now(); var l = false; try { l = localStorage.getItem(Lock7.KL) === '1'; } catch (e) { } if (l && lk7Active()) setTimeout(lk7Lock, 300); });
App.on('logout', function () { Lock7.on = false; if (Lock7.ov) Lock7.ov.style.display = 'none'; });   /* علامة «مقفول» كتبقى: الدخول الجاي كيبدا مقفول (إلا الخروج بـ Ctrl+Shift+Q ولا 5 غلطات) */

/* ───── 🎛️ لوحة التحكم ← «🔒 القفل»: الكود + التعليمات + التعديل ───── */
function lk7PanelHTML() {
  var c = lk7Cfg(), on = !!(c.on && c.h), m = c.m || 5, st = Lock7.setup;
  var mins = [5, 10, 15].map(function (x) { return '<button class="chip' + (m === x ? ' on' : '') + '" data-act="lk7-min" data-m="' + x + '">' + x + ' ' + L('دقيقة', 'min') + '</button>'; }).join('');
  var lbl = !st ? '' : st.k === 'off' ? L('دخّل الكود الحالي باش تطفيه', 'Code actuel pour désactiver') : st.step === 1 ? L('عاود الكود الجديد (تأكيد)', 'Confirmez le nouveau code') : st.k === 'change' && !st.ok ? L('الكود الحالي', 'Code actuel') : L('كود جديد: 6 أرقام', 'Nouveau code : 6 chiffres');
  return '<div class="card lk7-card"><div class="card-t">🔒 ' + L('القفل الصامت', 'Verrouillage silencieux') + ' <small class="muted">· ' + L('هاد الجهاز فقط', 'cet appareil seulement') + '</small></div>'
    + '<div class="lk7-row"><span class="lk7-st ' + (on ? 'on' : '') + '">' + (on ? '🟢 ' + L('مشعول', 'Activé') : '⚪ ' + L('متوقف', 'Désactivé')) + '</span><span class="sp"></span>'
      + (on ? '<button class="btn" data-act="lk7-now">🔒 ' + L('اقفل دابا', 'Verrouiller maintenant') + '</button><button class="btn" data-act="lk7-start" data-k="change">✏️ ' + L('بدّل الكود', 'Changer le code') + '</button><button class="btn danger" data-act="lk7-start" data-k="off">' + L('طفيه', 'Désactiver') + '</button>'
        : '<button class="btn pri" data-act="lk7-start" data-k="on">🔒 ' + L('شعلو', 'Activer') + '</button>') + '</div>'
    + (st ? '<div class="lk7-set"><div class="lbl">' + esc(lbl) + '</div><div class="lk7-in"><input id="lk7-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" dir="ltr" placeholder="••••••"><button class="btn pri" data-act="lk7-next">' + L('تأكيد', 'Valider') + '</button><button class="btn" data-act="lk7-cancel">✕</button></div></div>' : '')
    + '<div class="lbl">' + L('كيتقفل بوحدو من بعد (بلا حركة)', 'Verrouillage auto après (sans activité)') + '</div><div class="chips wrap">' + mins + '</div>'
    + '</div>'
    + '<div class="card lk7-help"><div class="card-t">📘 ' + L('التعليمات', 'Mode d\'emploi') + '</div><ol>'
      + '<li>' + L('<b>التشغيل:</b> «شعلو» ← كتب كود ديال 6 أرقام ← عاودو للتأكيد. الكود كيتحفظ مشفّر فهاد الحاسوب بوحدو.', '<b>Activer :</b> « Activer » → code à 6 chiffres → confirmer. Le code est chiffré sur cet ordinateur.') + '</li>'
      + '<li>' + L('<b>القفل:</b> بوحدو من بعد الوقت اللي اخترتي بلا ما تحرك الفأرة ولا تكتب، ولا بيدك: زر 🔒 فوق (حدا السمية ديالك)، ولا <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>، ولا «اقفل دابا».', '<b>Verrouillage :</b> automatique après le délai choisi, ou manuel : bouton 🔒 en haut, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> ou « Verrouiller maintenant ».') + '</li>'
      + '<li>' + L('<b>ملي يكون مقفول:</b> البرنامج كيرجع للرئيسية وكيبان مفتوح، ولكن حتى ضغطة ولا كتابة ما كتخدم. ما كتبان حتى رسالة.', '<b>Verrouillé :</b> retour à l\'accueil, l\'écran reste affiché mais rien ne fonctionne, sans aucun message.') + '</li>'
      + '<li>' + L('<b>الحلان:</b> كتب الكود (6 أرقام) بالكلافيي نيشان، بلا ما تضغط فحتى بلاصة. كيرجعك للصفحة اللي كنتي فيها.', '<b>Déverrouiller :</b> tapez le code (6 chiffres) au clavier, sans cliquer. Retour à la page précédente.') + '</li>'
      + '<li>' + L('<b>F5</b> ما كيحلّوش. <b>5 غلطات</b> فالكود ← خروج من الحساب.', '<b>F5</b> ne déverrouille pas. <b>5 erreurs</b> → déconnexion.') + '</li>'
      + '<li>' + L('<b>نسيتي الكود؟</b> <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> ← خروج، ومن بعد الدخول العادي (البريد وكلمة السر)، ومن هنا «بدّل الكود».', '<b>Code oublié ?</b> <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> → déconnexion, puis connexion normale, puis « Changer le code ».') + '</li>'
      + '<li>' + L('<b>التبديل ولا الإيقاف</b> كيطلب الكود الحالي، باش حتى واحد آخر ما يطفيه.', '<b>Modifier / désactiver</b> demande le code actuel.') + '</li>'
      + '<li>' + L('<b>نصيحة:</b> ملي كتخرج من البيرو بزاف، <kbd>⊞ Win</kbd>+<kbd>L</kbd> كيقفل الحاسوب كامل (ويندوز). القفل الصامت مزيان للخرجات الصغار.', '<b>Astuce :</b> pour une longue absence, <kbd>⊞ Win</kbd>+<kbd>L</kbd> verrouille tout Windows.') + '</li>'
    + '</ol></div>';
}
/* تبويب جديد فـ 🎛️ لوحة التحكم */
if (typeof CTL_TABS !== 'undefined' && !CTL_TABS.some(function (t) { return t[0] === 'lock'; })) CTL_TABS.splice(1, 0, ['lock', '🔒', ['القفل', 'Verrouillage']]);
App.on('login', function () {
  var m = App.mod('control'); if (!m || m._lk7) return; m._lk7 = 1;
  var r = m.render; m.render = function (el) { r.apply(this, arguments); if (typeof Ctl !== 'undefined' && Ctl.tab === 'lock') { var b = $('ctl-body'); if (b) b.innerHTML = lk7PanelHTML(); } };
});
App.act('lk7-now', function () { lk7Lock(); });
App.act('lk7-start', function (el) { Lock7.setup = { k: el.dataset.k, step: 0, ok: false }; App.render(); setTimeout(function () { var i = $('lk7-pin'); if (i) i.focus(); }, 50); });
App.act('lk7-cancel', function () { Lock7.setup = null; App.render(); });
App.act('lk7-min', function (el) { var c = lk7Cfg(); c.m = +el.dataset.m; lk7Save(c); App.render(); });
App.act('lk7-next', function () {
  var st = Lock7.setup, i = $('lk7-pin'), v = i ? i.value.trim() : '', c = lk7Cfg(); if (!st) return;
  if (!/^\d{6}$/.test(v)) { toast(L('الكود خاصو 6 أرقام', 'Le code doit faire 6 chiffres'), 'err'); return; }
  var again = function () { App.render(); setTimeout(function () { var x = $('lk7-pin'); if (x) x.focus(); }, 50); };
  if (st.k === 'off' || (st.k === 'change' && !st.ok)) {
    lk7Hash(v, c.s).then(function (h) {
      if (h !== c.h) { toast(L('الكود غالط', 'Code incorrect'), 'err'); return; }
      if (st.k === 'off') { lk7Save({ m: c.m || 5 }); Lock7.setup = null; toast('🔓 ' + L('القفل تطفى', 'Verrouillage désactivé')); App.render(); return; }
      st.ok = true; again();
    }); return;
  }
  if (st.step === 0) { st.first = v; st.step = 1; again(); return; }
  if (v !== st.first) { toast(L('الكودين ماشي بحال بحال، عاود', 'Les codes ne correspondent pas'), 'err'); st.step = 0; st.first = ''; again(); return; }
  var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  lk7Hash(v, salt).then(function (h) { lk7Save({ on: true, h: h, s: salt, m: c.m || 5 }); Lock7.setup = null; Lock7.last = Date.now(); toast('🔒 ' + L('القفل الصامت مشعول', 'Verrouillage activé')); App.render(); });
});
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'lk7-pin') { e.preventDefault(); App.acts['lk7-next'](); } });

/* زر 🔒 فالشريط العلوي (كيبان غير إلا القفل مشعول): ضغطة وحدة ← مقفول */
function lk7Btn() {
  var top = document.querySelector('.top'), b = $('lk7-btn'); if (!top) return;
  if (!b) { b = document.createElement('button'); b.id = 'lk7-btn'; b.className = 'top-b'; b.type = 'button'; b.setAttribute('data-act', 'lk7-now'); b.title = 'Ctrl+Shift+L'; b.textContent = '🔒';
    var u = $('uchip'); top.insertBefore(b, u || null); }
  b.style.display = App.user && lk7Active() ? '' : 'none';
}
App.on('login', lk7Btn); App.on('refresh', lk7Btn); App.on('page', lk7Btn);
