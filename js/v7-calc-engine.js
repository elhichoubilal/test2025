/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-calc-engine.js   (التسليم B: الحاسبة داخل البرنامج)
   الفكرة: الشاشات ديال الحاسبة كيتكتبو من جديد كصفحات عادية فـ RenewPro (بلا إطار، بالشكل الجديد).
   «المحرك» (الأثمنة، الأرقام، الوصولات، الحفظ والدمج، الربط مع التجديد) كيبقى نفس الكود المجرّب
   ديال calc/ كيخدم فالخلفية (الإطار مخبّي)، والصفحات الجديدة كتقرا منو وكتعيط ليه.
   ⇒ نفس البيانات 100%، والنسخة القديمة 6.7.1 كتبقى خدامة معاها.
══════════════════════════════════════════════════════════ */
'use strict';
var CE7 = { native: {} };                                   // الصفحات اللي ولات أصلية: { 'c-hist': true, … }
/* المحرك: نافذة الحاسبة (إلا كانت واجدة) */
function ce7() {
  try { var w = Calc.frame && Calc.frame.contentWindow; return Calc.ready && w && w.HIST !== undefined && w.CUR && w.CUR.n ? w : null; } catch (e) { return null; }
}
/* كنتسناو المحرك (كيتحمّل فالخلفية بعد الدخول) */
function ce7Wait(fn) {
  if (ce7()) { fn(ce7()); return; }
  if (typeof calcHost === 'function') calcHost();
  var n = 0, t = setInterval(function () { var w = ce7(); if (w || ++n > 100) { clearInterval(t); if (w) fn(w); } }, 150);
}
/* الصفحة الأصلية ما كتحلّش الإطار */
App.on('page', function (id) { if (CE7.native[id]) { var h = $('calc-host'); if (h) h.classList.remove('on'); } });

/* ملي كيبان شي وصل ولا Pièce فالمحرك: كنبيّنو الإطار فوق الصفحة، وكنخبيوه ملي يتسد */
function ce7Overlay(ids) {
  var h = $('calc-host'), w = ce7(); if (!h || !w) return;
  h.classList.add('over7'); document.body.classList.add('ce7-over');
  var els = ids.map(function (id) { return w.document.getElementById(id); }).filter(Boolean);
  var done = function () { h.classList.remove('over7'); document.body.classList.remove('ce7-over'); if (obs) obs.disconnect(); };
  var obs = new w.MutationObserver(function () { if (!els.some(function (e) { return e.classList.contains('show'); })) done(); });
  els.forEach(function (e) { obs.observe(e, { attributes: true, attributeFilter: ['class'] }); });
  setTimeout(function () { if (!els.some(function (e) { return e.classList.contains('show'); })) done(); }, 400);
}
/* تبدّل السجل (هاد الجهاز ولا جهاز آخر): كنعاودو نرسمو الصفحة الأصلية المفتوحة */
(function () {
  var last = '';
  setInterval(function () {
    if (!CE7.native[App.page] || !App.user) return;
    var s = ''; try { var v = localStorage.getItem('eurv102_h') || ''; s = v.length + ':' + v.slice(0, 300); } catch (e) { }
    if (s !== last) { var first = !last; last = s; if (!first) App.refresh(); }
  }, 1500);
})();
function ce7DMY(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
function ce7Date(s) { var m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function ce7Num(v) { var n = +v; return isFinite(n) ? n : 0; }
