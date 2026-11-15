/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-pdf-quick.js   (📄 عملية سريعة من PDF · 7.8)
   PDF ديال الشهادة/البوليصة فأي صفحة ← نافذة فالوسط: المعلومات + شحال عطا + الباقي + طريقة الدفع
   ← «تأكيد» (نفس valider ديال الحاسبة: نفس الرقم، نفس السجل، نفس الربط مع التجديد) ← الوصل / Pièce / WhatsApp.
   داخل «عملية جديدة»: كيبقى بحال قبل (كيعمّر الفورم). الشكل ديال «عملية جديدة» ما تبدلش.
══════════════════════════════════════════════════════════ */
'use strict';
var Q7 = { open: false, done: null, file: '' };
(function () {
  var full = pdf7ToCalc;
  pdf7ToCalc = function (file) {
    if (App.page === 'calc') return full(file);                    /* 7.8.1: حتى فـ «عملية جديدة» كتطلع النافذة (غير الشاشة القديمة بحال قبل) */
    if (!pdf7Can('calc')) { toast(L('ما عندكش الإذن ديال الحاسبة', 'Pas d\'accès à la calculatrice'), 'err'); return; }
    var tries = 0;
    toast('📄 ' + L('كنقرا ', 'Lecture de ') + file.name + ' …');
    (function put() {
      var w = Calc.frame && Calc.frame.contentWindow, d = null;
      try { d = w && w.document; } catch (e) { d = null; }
      var inp = d && d.getElementById('client-pdf-file'), st = d && d.getElementById('client-pdf-status');
      if (!Calc.ready || !inp || !st || typeof w.setClientMode !== 'function') { if (++tries < 80) setTimeout(put, 150); else toast(L('الحاسبة ما تحلاتش، عاود', 'Calculatrice non prête, réessayez'), 'err'); return; }
      try {
        if (!w.pdfjsLib && window.pdfjsLib) w.pdfjsLib = window.pdfjsLib;
        N7.done = null; Q7.done = null; Q7.file = file.name;
        if (typeof n7Clear === 'function') n7Clear(w);                 /* عملية جديدة نقية (بحال من بعد valider) */
        st.innerHTML = '';
        w.setClientMode('pdf');
        var dt = new w.DataTransfer(); dt.items.add(file); inp.files = dt.files;
        inp.dispatchEvent(new w.Event('change', { bubbles: true }));
        var t0 = Date.now();
        (function wait() {
          var s = st.textContent || '';
          if (/✅|⚠️|❌/.test(s)) { Q7.err = /❌/.test(s) ? s : ''; q7Dur(w); var dc = q7Doc(w); if (dc && dc.price < 0 && !n7v(w, 'paid')) { n7set(w, 'paid', String(dc.price)); try { w.doCalc(true); } catch (e) { } } q7Open(); return; }
          if (Date.now() - t0 < 20000) setTimeout(wait, 150); else { Q7.err = L('القراءة طوّلات', 'Lecture trop longue'); q7Open(); }
        })();
      } catch (e) { console.error(e); toast(L('تعذّر تمرير الملف للحاسبة', 'Transfert vers la calculatrice impossible'), 'err'); }
    })();
  };
})();

/* 7.17: الوثيقة اللي تقرات (CAT / Avenant) — غير إلا مازال الثمن ديالها فالفورم */
function q7Doc(w) {
  var d = w && w.PDF_DOC; if (!d || d.price == null) return null;
  var man = (w.document.getElementById('man-tog') || {}).checked, p = parseFloat(n7v(w, 'man-price'));
  return man && Math.abs((p || 0) - d.price) < 0.005 ? d : null;   /* Wafa: desc = null ← الوصف من الحاسبة (Puissance/Energie تعمّرو) */
}
/* 7.8: المدة من التواريخ ديال الـ PDF (باش الوصف ديال العملية يكون صحيح: 3M ماشي 6M) */
function q7Dur(w) {
  Q7.durOk = false; Q7.days = 0;
  try {
    var ds = n7v(w, 'date-s'), de = n7v(w, 'date-e'); if (!ds || !de || n7v(w, 'tarif') !== 'wafa') return;
    var days = Math.round((new Date(de) - new Date(ds)) / 864e5) + 1; Q7.days = days;
    var m = days >= 27 && days <= 32 ? 1 : days >= 88 && days <= 93 ? 3 : days >= 179 && days <= 185 ? 6 : days >= 363 && days <= 367 ? 12 : 0;
    if (!m) return;
    if (+n7v(w, 'dur') !== m) w.setDur(m);
    n7set(w, 'date-e', de);                                   /* التاريخ ديال الـ PDF هو المرجع */
    try { w.updMan(); } catch (e) { }
    Q7.durOk = true;
  } catch (e) { console.error(e); }
}
function q7Diff(w) {
  var paid = parseFloat(n7v(w, 'paid')) || 0, eff = n7Eff(w), d = paid - eff;
  return { paid: paid, eff: eff, d: d, k: !paid ? '' : d > 0.004 ? 'pos' : d < -0.004 ? 'neg' : 'zero',
    l: !paid ? L('الباقي', 'Reste') : d > 0.004 ? '↩ ' + L('نرجعو ليه', 'À rendre') : d < -0.004 ? '⚠ ' + L('باقي عليه', 'Reste dû') : '✓ ' + L('مطابق', 'Soldé') };
}
function q7Html() {
  var w = ce7(); if (!w) return '';
  var x = Q7.done;
  if (x) return Modal.head('📄 ' + L('عملية من PDF', 'Opération depuis PDF'))
    + '<div class="q7-ok"><b>✅ N° ' + esc(x.num) + '</b><span>' + esc(x.client) + '</span><em>' + esc(x.msg) + '</em></div>'
    + '<div class="q7-acts"><button class="btn pri" data-act="q7-rec">🖨️ ' + L('الوصل', 'Reçu') + '</button><button class="btn" data-act="q7-piece">🧾 Pièce</button><button class="btn" data-act="q7-fac">📑 Facture</button><button class="btn" data-act="q7-wa">📱 WhatsApp</button></div>'
    + '<button class="btn wide" data-act="q7-close">✕ ' + L('سدّ', 'Fermer') + '</button>';
  var off = n7Off(w), q = q7Diff(w), pm = w.PAY_MODE || 'cash';
  var doc = q7Doc(w), rist = !!(doc && doc.price < 0);                                /* 7.17: CAT / Avenant (Ristourne) */
  var fld = function (id, lbl, ltr, ph) { return '<label class="f"><span>' + lbl + '</span><input data-inp="q7-in" data-e="' + id + '"' + (ltr ? ' dir="ltr"' : '') + ' value="' + esc(n7v(w, id)) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (n7v(w, id) ? '' : ' class="q7-miss"') + ' autocomplete="off"></label>'; };
  return Modal.head('📄 ' + L('عملية من PDF', 'Opération depuis PDF'))
    + '<div class="q7">'
    + (Q7.err ? '<div class="box red">' + esc(Q7.err) + '</div>' : '')
    + '<div class="q7-file">📎 <span class="ltr">' + esc(Q7.file) + '</span></div>'
    + (typeof n7DebtBanner === 'function' ? n7DebtBanner(w) : '')
    + '<div class="q7-g">' + fld('client', L('الزبون', 'Client')) + fld('plate', L('الماتريكول', 'Immatriculation'), 1, 'A-12345') + fld('police-num', L('البوليصة', 'Police'), 1) + fld('attest-num', L('الشهادة', 'Attestation'), 1) + '</div>'
    + '<div class="q7-dt"><span>📅</span><b class="ltr">' + n7DMY(n7v(w, 'date-s')) + ' → ' + n7DMY(n7v(w, 'date-e')) + '</b></div>'
    + (doc ? '<div class="q7-doc ' + (doc.cie === 'CAT' ? 'cat' : 'wafa') + (rist ? ' rist' : '') + '"><b>' + esc(doc.cie) + '</b><span>' + esc(doc.label) + '</span></div>' : '')
    + (doc && doc.desc ? '' : '<div class="q7-ins' + (Q7.durOk ? '' : ' warn') + '"><span>🛡️ ' + L('التأمين', 'Assurance') + '</span><b>' + esc(n7Desc(w) || '—') + '</b>'
      + (Q7.durOk ? '' : '<small>' + L('⚠️ ما عرفتش المدة من التواريخ' + (Q7.days ? ' (' + Q7.days + ' يوم)' : '') + ': تأكد', '⚠️ Durée non reconnue : vérifiez') + '</small>')
      + '<button class="link" data-act="q7-full">' + L('بدّل', 'Modifier') + '</button></div>')
    + '<div class="q7-pr' + (off ? '' : ' miss') + '"><span>' + L('السعر (من الـ PDF)', 'Prix (PDF)') + '</span><b class="ltr">' + (off ? money(off) + ' DH' : '⚠️ ' + L('ما لقيتش الثمن', 'Prix introuvable')) + '</b></div>'
    + (off ? '' : '<div class="hint">' + L('ضغط «✏️ فتح كامل» واختار التأمين، ولا كتب الثمن يدوياً تما.', 'Ouvrez l\'écran complet pour choisir l\'assurance ou saisir le prix.') + '</div>')
    + '<div class="q7-pay"><label class="q7-in"><span>' + (rist ? L('شحال رجعتي ليه؟ (بالسالب)', 'Montant rendu (négatif)') : L('شحال عطا؟', 'Montant reçu')) + '</span><input id="q7-paid" dir="ltr" type="number" step="0.01" inputmode="decimal" data-inp="q7-paid" value="' + esc(n7v(w, 'paid')) + '" placeholder="0"></label>'
      + '<div class="q7-k ' + q.k + '" id="q7-dk"><span id="q7-dl">' + q.l + '</span><b id="q7-df" class="ltr">' + (q.paid ? money(Math.abs(q.d)) : '—') + '</b></div></div>'
    + '<div class="q7-pm">' + [['cash', '💵', L('نقداً', 'Espèces')], ['cheque', '📄', 'Chèque'], ['tpe', '💳', 'TPE']].map(function (p) { return '<button class="c7 w' + (pm === p[0] ? ' on' : '') + '" data-act="q7-pm" data-v="' + p[0] + '">' + p[1] + ' ' + p[2] + '</button>'; }).join('') + '</div>'
    + (pm === 'cheque' ? fld('cheque-num', L('رقم الشيك', 'N° chèque'), 1) : pm === 'tpe' ? fld('tpe-ref', L('مرجع TPE', 'Réf. TPE'), 1) : '')
    + '<div class="q7-acts"><button class="btn pri q7-go" data-act="q7-ok"' + (off ? '' : ' disabled') + '>✓ ' + L('تأكيد', 'Valider') + '</button><button class="btn q7-unp" data-act="q7-unpaid"' + (off ? '' : ' disabled') + '>⏳ ' + L('لم يدفع', 'Non payé') + '</button><button class="btn" data-act="q7-full">✏️ ' + L('فتح كامل', 'Écran complet') + '</button></div>'
    + '</div>';
}
function q7Open() { Q7.open = true; Modal.open(q7Html(), 'small q7m'); setTimeout(function () { var p = $('q7-paid'); if (p) p.focus(); }, 60); }
function q7Re() { var m = document.querySelector('.q7m') || document.querySelector('.modal'); Modal.open(q7Html(), 'small q7m'); }
App.input('q7-in', function (el) { var w = ce7(); if (!w) return; var v = el.dataset.e === 'plate' ? el.value.toUpperCase() : el.value; if (v !== el.value) { var p = el.selectionStart; el.value = v; try { el.setSelectionRange(p, p); } catch (e) { } } n7set(w, el.dataset.e, v); el.classList.toggle('q7-miss', !v); });
App.input('q7-paid', function (el) {
  var w = ce7(); if (!w) return; n7set(w, 'paid', el.value); try { w.autoCalc(); } catch (e) { }
  var q = q7Diff(w); if ($('q7-dl')) $('q7-dl').textContent = q.l; if ($('q7-df')) $('q7-df').textContent = q.paid ? money(Math.abs(q.d)) : '—'; if ($('q7-dk')) $('q7-dk').className = 'q7-k ' + q.k;
});
App.act('q7-pm', function (el) { var w = ce7(); if (!w) return; w.setPayMode(el.dataset.v); q7Re(); });
App.act('q7-ok', function () {
  var w = ce7(); if (!w) return; if (n7Off(w) && !n8Guard(w)) return;
  n8Run(function (w2) { return Ops.valider(w2); }, 'q7-', function () { Q7.done = N7.done; q7Re(); App.refresh(); });
});
App.act('q7-unpaid', function () {
  var w = ce7(); if (!w) return; if (n7Off(w) && !n8Guard(w)) return;
  n8Run(function (w2) { return Ops.unpaid(w2); }, 'q7-', function () { Q7.done = N7.done; q7Re(); App.refresh(); });
});
function q7After(w, before) {
  if (w.HIST.length <= before) { q7Re(); return; }
  var h = w.HIST[0], d = +h.diff || 0;
  Q7.done = N7.done = { num: h.num, client: h.client, msg: h.unpaid ? '⏳ ' + L('لم يدفع · باقي عليه ', 'Non payé · reste ') + money(Math.abs(d)) + ' DH' : (d > 0 ? '↩ ' + L('رجّع ليه ', 'Rendre ') : d < 0 ? '⚠ ' + L('باقي عليه ', 'Reste dû ') : '✓ ' + L('مطابق ', 'Soldé ')) + money(Math.abs(d)) + ' DH' };
  q7Re(); App.refresh();
}
App.act('q7-rec', function () { Modal.close(); App.acts['n7-rec'](); });
App.act('q7-piece', function () { Modal.close(); App.acts['n7-piece'](); });
App.act('q7-wa', function () { App.acts['n7-wa'](); });
App.act('q7-close', function () { Q7.done = null; Modal.close(); });
App.act('q7-full', function () { Modal.close(); if (App.page === 'c-new7') App.render(); else App.go('c-new7'); });
/* Entrée فالمبلغ = تأكيد */
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'q7-paid') { e.preventDefault(); App.acts['q7-ok'](); } });
