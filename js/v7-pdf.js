/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-pdf.js   (PDF الذكي)
   تلوّح PDF فأي صفحة (ولا تختارو بزر «📄 PDF»)، والبرنامج كيعرف شنو هو:
     • Attestation / Police / Quittance / Carte  ← «عملية جديدة» فالحاسبة، والخانات معمّرة
     • Requête d'expertise CAT / Déclaration d'accident  ← الحوادث (بحال قبل)
     • ما عرفوش  ← كيسولك فين يمشي
   ملفات Excel كتبقى بحال قبل: كتمشي للقسم ديال الصفحة المفتوحة.
══════════════════════════════════════════════════════════ */
'use strict';
var Pdf7 = { pending: null };

function pdf7Can(where) { return App.visibleMods().some(function (m) { return m.id === where; }); }
function pdf7Text(file) {
  if (typeof sinReadPdf !== 'function') return Promise.resolve('');
  return sinReadPdf(file).then(function (items) { return items.join(' ').replace(/\s+/g, ' '); });
}
/* القرار من الكلمات اللي فالورقة. الحوادث كتتشاف الأولى (فيها حتى هي «police») */
function pdf7Kind(txt) {
  var t = String(txt || '');
  if (t.replace(/\s/g, '').length < 30) return 'scan';
  if (/d[ée]claration\s+d.accident|requ[êe]te\s+d.expertise|demande\s+d.expertise|r[ée]f[ée]rence\s+sinistre|d[ée]claration\s+de\s+sinistre|constat\s+amiable/i.test(t)) return 'sin';
  if (/n[°o]\s*de\s*l.attestation|attestation\s+d.assurance|attestation|quittance|conditions\s+particuli|avis\s+d.[ée]ch[ée]ance|carte\s+(?:internationale|verte|frontiere|frontière)|\bCF20\d{2}\/\d{3,}/i.test(t)) return 'calc';
  if (/\bCF?\d{4}\/\d{4,8}\b/.test(t) && /EUR-?ASSURANCE|R\.Covid|r[ée]duction\s+saharienne/i.test(t)) return 'calc';   /* 7.17: شهادة CAT / Carte frontière (بلا كلمات) */
  if (/AVENANT\s+D.ASSURANCE|AVENANT\s+DE\s+R[ÉE]SILIATION/i.test(t)) return 'calc';
  return '';
}
var PDF7_NAME = { calc: ['عملية جديدة (الحاسبة)', 'Nouvelle opération (calculatrice)'], sin: ['الحوادث', 'Sinistres'] };

/* الحاسبة: كنمشيو لـ«عملية جديدة» وكنعطيو الملف لخانة «استيراد من PDF» ديالها */
function pdf7ToCalc(file) {
  if (!pdf7Can('calc')) { toast(L('ما عندكش الإذن ديال الحاسبة', 'Pas d\'accès à la calculatrice'), 'err'); return; }
  var stay = true;                                       // 7.3.0: كنمشيو ديما للشاشة الجديدة «عملية جديدة»
  if (App.page !== 'c-new7') App.go('c-new7');
  var tries = 0;
  (function put() {
    var w = Calc.frame && Calc.frame.contentWindow, d = null;
    try { d = w && w.document; } catch (e) { d = null; }
    var inp = d && d.getElementById('client-pdf-file');
    if (!Calc.ready || !inp || typeof w.setClientMode !== 'function') { if (++tries < 80) setTimeout(put, 150); else toast(L('الحاسبة ما تحلاتش، عاود', 'Calculatrice non prête, réessayez'), 'err'); return; }
    try {
      if (!w.pdfjsLib && window.pdfjsLib) w.pdfjsLib = window.pdfjsLib;   // نفس المكتبة اللي قرينا بها، ما نعاودوش نحمّلوها
      w.setClientMode('pdf');
      var dt = new w.DataTransfer(); dt.items.add(file); inp.files = dt.files;
      inp.dispatchEvent(new w.Event('change', { bubbles: true }));
      toast('📄 ' + L('كنقرا ', 'Lecture de ') + file.name + ' …');
      if (stay) [1500, 3000, 5000].forEach(function (t) { setTimeout(function () { if (App.page === 'c-new7') App.render(); }, t); });
    } catch (e) { console.error(e); toast(L('تعذّر تمرير الملف للحاسبة', 'Transfert vers la calculatrice impossible'), 'err'); }
  })();
}
function pdf7ToSin(file) {
  if (!pdf7Can('sin')) { toast(L('ما عندكش الإذن ديال الحوادث', 'Pas d\'accès aux sinistres'), 'err'); return; }
  if (App.page !== 'sin') App.go('sin');
  setTimeout(function () { Pdf7.sinInp({ files: [file], value: '', dataset: {} }); }, 60);
}
function pdf7Route(file, kind) { Modal.close(); if (kind === 'calc') pdf7ToCalc(file); else pdf7ToSin(file); }

function pdf7Handle(file) {
  if (!file) return;
  toast('📄 ' + L('كنشوف شنو هاد الملف…', 'Analyse du PDF…'));
  pdf7Text(file).then(pdf7Kind, function () { return ''; }).then(function (kind) {
    if (kind === 'scan') { toast(L('هاد PDF صورة (scan) بلا كتابة، ما يتقراش. عمّر يدوياً.', 'PDF scanné sans texte : saisie manuelle.'), 'err'); return; }
    if (!kind && App.page === 'sin' && pdf7Can('sin')) kind = 'sin';     // فصفحة الحوادث: بحال قبل
    if (kind && pdf7Can(kind)) { toast('📄 ' + esc(file.name) + ' → ' + L(PDF7_NAME[kind][0], PDF7_NAME[kind][1])); pdf7Route(file, kind); return; }
    Pdf7.pending = file;                                    // ما عرفناهش: كنسوّلو
    var b = function (k, ic) { return pdf7Can(k) ? '<button class="menu-i" data-act="pdf7-to" data-k="' + k + '">' + ic + ' ' + esc(L(PDF7_NAME[k][0], PDF7_NAME[k][1])) + '</button>' : ''; };
    Modal.open(Modal.head('📄 ' + esc(file.name))
      + '<div class="box">' + L('ما عرفتش نوع هاد الملف. فين نحلّو؟', 'Type de document non reconnu. Où l\'ouvrir ?') + '</div>'
      + '<div class="menu">' + b('calc', '🧮') + b('sin', '🚗') + '</div>', 'small');
  });
}
App.act('pdf7-to', function (el) { var f = Pdf7.pending; Pdf7.pending = null; if (f) pdf7Route(f, el.dataset.k); });

/* زر «📄 PDF» (الرئيسية): نفس الخدمة من غير تلويح — مزيان للهاتف */
App.act('pdf7-pick', function () { var f = $('file-in'); f.value = ''; f.accept = 'application/pdf,.pdf'; f.dataset.inp = 'pdf7-file'; f.click(); });
App.input('pdf7-file', function (el) { var f = el.files && el.files[0]; $('file-in').accept = '.xlsx,.xls,.csv'; if (f) pdf7Handle(f); });

/* «📄 PDF» فصفحة الحوادث: إلا كان Attestation كيمشي للحاسبة، والباقي بحال قبل */
(function () {
  Pdf7.sinInp = App.inputs['sin-pdf'] || function () { };
  App.input('sin-pdf', function (el) {
    var file = el.files && el.files[0]; if (!file) return;
    pdf7Text(file).then(pdf7Kind, function () { return ''; }).then(function (kind) {
      if (kind === 'calc' && pdf7Can('calc')) { toast('📄 ' + L('هادي Attestation → الحاسبة', 'Attestation → calculatrice')); pdf7ToCalc(file); }
      else pdf7ToSin(file);                                   /* 7.8.1: زر PDF ديال «الحوادث» كيدوز حتى هو من النافذة */
    });
  });
})();

/* التلويح: كل صفحة كتقبل PDF. Excel كيبقى للقسم ديال الصفحة */
(function () {
  if (typeof dropTarget !== 'function') return;
  var orig = dropTarget;
  var PDF_LBL = ['PDF: Attestation ← الحاسبة · حادثة ← الحوادث', 'PDF : attestation → calculatrice · sinistre → sinistres'];
  dropTarget = function () {
    var t = orig(), pdf = App.user && (pdf7Can('calc') || pdf7Can('sin'));
    if (!pdf) return t;
    var lbl = t && t.inp !== 'sin-pdf' ? [t.label[0] + ' · ' + PDF_LBL[0], t.label[1] + ' · ' + PDF_LBL[1]] : PDF_LBL;
    return { inp: 'drop7', multi: !!(t && t.multi), ext: null, label: lbl };
  };
  App.input('drop7', function (el) {
    var files = Array.prototype.slice.call(el.files || []), pdfs = files.filter(function (f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; });
    if (pdfs.length) { pdf7Handle(pdfs[0]); return; }
    var t = orig(); if (!t || t.inp === 'sin-pdf') { toast(L('هاد الصفحة كتقبل غير PDF', 'Cette page n\'accepte que des PDF'), 'err'); return; }
    files = files.filter(function (f) { return !t.ext || t.ext.test(f.name); });
    if (!files.length) { toast(L('نوع الملف غير مناسب لهذا القسم', 'Type de fichier non adapté'), 'err'); return; }
    App.inputs[t.inp]({ files: t.multi ? files : files.slice(0, 1), value: '', dataset: {} });
  });
})();
