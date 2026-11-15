/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-xl.js   (Excel الذكي)
   تلوّح Excel فأي صفحة، والبرنامج كيقرا الأعمدة وكيعرف لأشمن قسم:
     البوردورو (DATE_EMISSION + Nature Evenement)  ← متابعة التجديدات (الحاسبة)
     Relevé du compte / جدول الخزينة               ← البنك
     لائحة الخبراء (CABINET)                        ← دليل الخبراء
     سجل الحوادث (Numéro d'ordre)                   ← الحوادث
     TERME AUTO / Téléchargement / Termes           ← ملفات الإنتاج
     ملف العمليات (Solde)                           ← الديون
     لائحة التجديد ديال الشركة                       ← التجديد
     ما عرفوش                                       ← كيسولك
   كل قسم كيبقى يعرض المعاينة والتأكيد ديالو قبل ما يبدّل شي حاجة (بحال قبل).
══════════════════════════════════════════════════════════ */
'use strict';
var XL7 = {
  bord: { ar: 'متابعة التجديدات (البوردورو)', fr: 'Suivi renouv. (bordereau)', mod: 'c-renewals' },
  bank: { ar: 'البنك', fr: 'Banque', mod: 'bank', inp: 'bk-file', can: function () { return typeof bankCan === 'function' && bankCan(); } },
  exp: { ar: 'دليل الخبراء', fr: 'Annuaire des experts', mod: 'sin', can: function () { return App.canUp(); } },
  sin: { ar: 'سجل الحوادث', fr: 'Registre des sinistres', mod: 'sin', inp: 'sin-xls', can: function () { return App.canUp(); } },
  prod: { ar: 'ملفات الإنتاج', fr: 'Fichiers de production', mod: 'prod', inp: 'p-file' },
  debts: { ar: 'الديون (ملف العمليات)', fr: 'Dettes (opérations)', mod: 'debts', inp: 'd-file', can: function () { return App.canUp(); } },
  renew: { ar: 'لائحة التجديد', fr: 'Liste de renouvellement', mod: 'renew', inp: 'r-file', can: function () { return App.canUp(); } },
  phones: { ar: 'قاعدة الأرقام', fr: 'Répertoire', mod: 'phones', inp: 'pb-file' },
  notes: { ar: 'استيراد ملاحظات', fr: 'Import de notes', mod: 'dash', inp: 't-notes-file', can: function () { return App.canUp(); } }
};
var Xl7 = { pending: null };
function xl7Ok(k) { var t = XL7[k]; if (!t) return false; var vis = App.visibleMods().some(function (m) { return m.id === t.mod; }); return vis && (!t.can || t.can()); }
function xl7IsXl(f) { return /\.(xlsx|xls|xlsm|csv)$/i.test(f.name || ''); }

/* القرار من الأعمدة (أول 15 سطر، كاع الأوراق للخزينة) */
function xl7Kind(buf) {
  var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  var top = rows.slice(0, 15), H = top.map(function (r) { return (r || []).map(normH); });
  var any = function (k) { return H.some(function (h) { return h.indexOf(k) >= 0; }); };
  var txt = top.map(function (r) { return (r || []).join(' '); }).join(' ');
  if (any('dateemission') && (any('natureevenement') || any('natureevennement')) && any('client')) return 'bord';
  if (/relev[ée]\s+du\s+compte/i.test(txt)) return 'bank';
  if (typeof bkParseTreso === 'function') { try { if (bkParseTreso(wb)) return 'bank'; } catch (e) { } }
  if (H.some(function (h) { return h.indexOf('cabinet') >= 0; }) && any('ville')) return 'exp';
  if (/num[ée]ro\s+d.ordre/i.test(txt)) return 'sin';
  if (typeof prodDetect === 'function' && prodDetect(rows)) return 'prod';
  if (H.some(function (h) { return h.indexOf('solde') >= 0 || h.indexOf('resteapayer') >= 0; })) return 'debts';
  if (typeof parseRenewFile === 'function') { try { var p = parseRenewFile(buf); if (p && p.cols && p.cols.name && p.cols.dateE && p.rows && p.rows.length) return 'renew'; } catch (e) { } }
  return '';
}

/* البوردورو: كندخلو لمتابعة التجديدات وكنعطيو الملف للخانة ديالها */
function xl7ToBord(file) {
  App.go('c-renewals'); var tries = 0;
  (function put() {
    var w = Calc.frame && Calc.frame.contentWindow, d = null; try { d = w && w.document; } catch (e) { }
    var inp = d && d.getElementById('rt-file-input'), pg = d && d.getElementById('page-renewals');
    if (!Calc.ready || !inp || !pg || !pg.classList.contains('active')) { if (++tries < 80) setTimeout(put, 150); else toast(L('الحاسبة ما تحلاتش، عاود', 'Calculatrice non prête'), 'err'); return; }
    try { var dt = new w.DataTransfer(); dt.items.add(file); inp.files = dt.files; inp.dispatchEvent(new w.Event('change', { bubbles: true })); }
    catch (e) { console.error(e); toast(L('تعذّر تمرير الملف', 'Transfert impossible'), 'err'); }
  })();
}
function xl7Route(file, k) {
  Modal.close(); var t = XL7[k];
  if (!xl7Ok(k)) { toast(L('ما عندكش الإذن ديال «' + t.ar + '»', 'Pas d\'accès : ' + t.fr), 'err'); return; }
  toast('📊 ' + file.name + ' → ' + L(t.ar, t.fr));
  if (k === 'bord') { xl7ToBord(file); return; }
  if (App.page !== t.mod) App.go(t.mod);
  setTimeout(function () {
    if (k === 'exp') { if (typeof smImport === 'function') smImport(file); return; }
    var fn = App.inputs[t.inp]; if (fn) fn({ files: [file], value: '', dataset: {} });
  }, 80);
}
function xl7Handle(file) {
  if (!file) return;
  toast('📊 ' + L('كنشوف شنو هاد الملف…', 'Analyse du fichier…'));
  file.arrayBuffer().then(function (buf) { var k = ''; try { k = xl7Kind(buf); } catch (e) { console.error(e); } return k; }, function () { return ''; }).then(function (k) {
    if (!k) k = { dash: 'notes', phones: 'phones', prod: 'prod' }[App.page] || '';      // ما عرفناهش: صفحة عندها التحميل ديالها
    if (k && xl7Ok(k)) { xl7Route(file, k); return; }
    Xl7.pending = file;
    var opts = ['renew', 'bord', 'debts', 'prod', 'phones', 'bank', 'sin', 'exp', 'notes'].filter(xl7Ok);
    if (!opts.length) { toast(L('ما عندكش الإذن تحمّل الملفات', 'Pas d\'accès à l\'import'), 'err'); return; }
    Modal.open(Modal.head('📊 ' + esc(file.name))
      + '<div class="box">' + (k ? L('هاد الملف ديال «' + XL7[k].ar + '» وما عندكش الإذن. ولا اختار:', 'Ce fichier est « ' + XL7[k].fr + ' » (sans accès). Ou choisissez :') : L('ما عرفتش نوع هاد الملف. فين نحمّلو؟', 'Type non reconnu. Où l\'importer ?')) + '</div>'
      + '<div class="menu">' + opts.map(function (o) { return '<button class="menu-i" data-act="xl7-to" data-k="' + o + '">' + esc(L(XL7[o].ar, XL7[o].fr)) + '</button>'; }).join('') + '</div>', 'small');
  });
}
App.act('xl7-to', function (el) { var f = Xl7.pending; Xl7.pending = null; if (f) xl7Route(f, el.dataset.k); });

/* التلويح: Excel فأي صفحة ← الذكي. PDF كيبقى عند v7-pdf.js */
(function () {
  var prev = App.inputs['drop7'];
  if (typeof dropTarget === 'function') {
    var o = dropTarget, LBL = ['Excel ← القسم ديالو · PDF ← الحاسبة / الحوادث', 'Excel → sa section · PDF → calculatrice / sinistres'];
    dropTarget = function () { var t = o(); if (t) { if (t.inp === 'drop7') t.label = LBL; return t; } return App.user ? { inp: 'drop7', multi: true, ext: null, label: LBL } : null; };
  }
  App.input('drop7', function (el) {
    var files = Array.prototype.slice.call(el.files || []), xl = files.filter(xl7IsXl);
    var pdf = files.filter(function (f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; });
    if (!pdf.length && xl.length) {
      /* ملفات الإنتاج وقاعدة الأرقام كيقبلو بزاف ديال الملفات مرة وحدة فالصفحة ديالهم */
      if (xl.length > 1 && (App.page === 'prod' || App.page === 'phones')) { App.inputs[App.page === 'prod' ? 'p-file' : 'pb-file']({ files: xl, value: '', dataset: {} }); return; }
      xl7Handle(xl[0]); return;
    }
    if (prev) prev(el);
  });
})();
