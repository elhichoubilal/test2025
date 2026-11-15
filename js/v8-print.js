/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-print.js   (🖨️ المرحلة 5ج: الوصل والـ Pièce بلا الحاسبة القديمة)
   print8.html = الوصل والـ Pièce منقولين حرفياً (نفس CSS ونفس الدوال) ← كيتحل فنافذة فوق البرنامج ملي كتطبع.
══════════════════════════════════════════════════════════ */
'use strict';
var Print8 = (function () {
  var fr = null, ready = null;
  function load() {
    if (ready) return ready;
    ready = new Promise(function (res) {
      fr = document.createElement('iframe'); fr.id = 'print8'; fr.src = 'print8.html?v=' + encodeURIComponent(App.version); fr.setAttribute('title', 'print');
      fr.className = 'p8-frame'; fr.onload = function () { res(fr.contentWindow); }; document.body.appendChild(fr);
    });
    return ready;
  }
  function prep(w) { try { w.p8Lang(App.lang); w.CUR = { n: App.user ? App.user.name : '', av: '', isAdmin: !!(App.user && App.user.admin) }; } catch (e) { } return w; }
  function show() { if (fr) fr.classList.add('on'); document.body.classList.add('p8-open'); }
  function hide() { if (fr) fr.classList.remove('on'); document.body.classList.remove('p8-open'); }
  function hist() { try { return JSON.parse(localStorage.getItem('eurv102_h') || '[]') || []; } catch (e) { return []; } }
  /* رقم الـ Pièce كيتحفظ فالعملية (مرة وحدة، ما كيتبدلش) */
  function persistPiece(h) { var H = hist(), x = H.filter(function (o) { return o.num === h.num && o.date === h.date && (o.time || '') === (h.time || ''); })[0] || H.filter(function (o) { return o.num === h.num; })[0]; if (!x || x.pieceNum) return; x.pieceNum = h.pieceNum; Store8.save('history', H); try { var w = Calc.frame && Calc.frame.contentWindow; if (w && w.HIST !== undefined) w.HIST = H; } catch (e) { } }
  function find(num) { return hist().filter(function (o) { return o.num === num; })[0] || null; }
  return {
    load: load, hide: hide, persistPiece: persistPiece, find: find,
    rec: function (h) { return load().then(function (w) { prep(w).buildRecFromHist(h); show(); }); },
    piece: function (h) { return load().then(function (w) { prep(w); w.__curH = h; w.buildPieceReceiptFromHist(h); show(); }); },
    wa: function (h) { return load().then(function (w) { prep(w).buildRecFromHist(h); w.document.getElementById('receipt').classList.remove('show'); if (typeof WA !== 'undefined') WA.open('', w.buildShareTxt(), {}); else w.shareWA(); }); },
    manual: function (o) { return load().then(function (w) { prep(w); var n = w.getPieceNum(); if (n === null) return; o.pieceNum = n; w.renderPieceReceipt(o); show(); }); }
  };
})();
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('p8-open')) Print8.hide(); });
App.on('login', function () { setTimeout(function () { Print8.load(); }, 2500); });      /* كيتحضّر فالخلفية باش الطبع يكون فوري */

/* الأزرار: «عملية جديدة» · النافذة · السجل */
function p8Last() { return N7.done ? Print8.find(N7.done.num) : null; }
App.act('n7-rec', function () { var h = p8Last(); if (h) Print8.rec(h); });
App.act('n7-piece', function () { var h = p8Last(); if (h) Print8.piece(h); });
App.act('n7-wa', function () { var h = p8Last(); if (h) Print8.wa(h); });
App.act('h7-rec', function (el) { var x = h7Get(el); if (x) Print8.rec(x.h); });
App.act('h7-piece', function (el) { var x = h7Get(el); if (x) Print8.piece(x.h); });
/* وصل يدوي (بلا حساب): نفس buildPieceReceiptManual */
App.act('n7-pmgo', function () {
  var w = ce7(); if (!w) return; var v = function (id) { var e = w.document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
  var off = parseFloat(v('pm-off')) || 0, paid = parseFloat(v('pm-paid')) || 0, client = v('client');
  if (!off) { toast(L('أدخل السعر الرسمي (Prime Totale)', 'Entrez la Prime Totale'), 'err'); return; }
  if (!client) { toast(L('أدخل اسم الزبون', 'Entrez le nom du client'), 'err'); var c = $('n7-client'); if (c) c.focus(); return; }
  var n = new Date();
  Print8.manual({ police: v('police-num'), attest: v('attest-num'), usage: w.USAGE, ds: v('date-s'), de: v('date-e'), client: client, off: off, paid: paid,
    dateHeure: n.toLocaleDateString('fr-FR') + ' à ' + n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
});
