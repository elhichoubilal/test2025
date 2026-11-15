/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-calc-new.js   (B3 تجريبي: «عملية جديدة ✨» صفحة أصلية)
   الشاشة الجديدة كتعاون المحرك ديال الحاسبة: كل ضغطة هنا = نفس الدالة ديال الحاسبة
   (setTarif, setType, setDur, setBM, setPayMode, valider, markUnpaid…). الثمن كيتقرا من getOff()،
   والحفظ كيدوز من valider() ← نفس الأرقام، نفس السجل، نفس الربط مع التجديد. ما كاين حتى حساب جديد.
   الشاشة القديمة «عملية جديدة» باقة كيف ما هي حتى تقول «رسمية».
   ما مدعومش هنا (كيدوز للشاشة القديمة بزر): TPV، Autre، التقسيط، الدفع المباشر، الباقي السابق، الوصل اليدوي.
══════════════════════════════════════════════════════════ */
'use strict';
var N7 = { q: '', sugOpen: false, done: null };
CE7.native['c-new7'] = true;

/* 7.5: أيقونات خفيفة (SVG) للاختيارات */
var N7P = {
  car: '<path d="M5 13l1.6-4.4A2 2 0 0 1 8.5 7.3h7a2 2 0 0 1 1.9 1.3L19 13"/><rect x="3" y="13" width="18" height="5" rx="1.5"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5L10 10h5l3.5 6.5M14 6h3l1 4M9 13h6"/>',
  van: '<path d="M2 16V8a2 2 0 0 1 2-2h10v10M14 9h4.5l3.5 4v3h-8"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="17.5" cy="17" r="1.8"/>',
  truck: '<rect x="2" y="5" width="12" height="11" rx="1"/><path d="M14 9h4l3 3.5V16h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 8h6"/><path d="M14 11h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  taxi: '<path d="M9 4h6l1 3M5 13l1.6-4.4A2 2 0 0 1 8.5 7.3h7a2 2 0 0 1 1.9 1.3L19 13"/><rect x="3" y="13" width="18" height="5" rx="1.5"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v2.5M16 18v2.5"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
  cheque: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 10h7M6 14h4M15 14h3"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  pen: '<path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-2.8-1.2M12 6.5V8M12 16v1.5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  rec: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  id: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h4M6 14h7M16 10h2"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
  check: '<path d="M5 12l5 5 9-10"/>'
};
function n7I(k, c) { return '<svg class="n7i' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (N7P[k] || '') + '</svg>'; }

/* 7.5: الرأس — العنوان + الخطوات (مؤشر فقط، الصفحة وحدة) + المسودة */
function n7StepState(w) {
  var off = n7Off(w), paid = parseFloat(n7v(w, 'paid')) || 0;
  return [!!(off || w.DIRECT_MODE), !!n7v(w, 'client').trim(), !!(n7v(w, 'plate').trim() && n7v(w, 'date-s')), paid !== 0 && !isNaN(paid)];
}
var N7_STEPS = [['التأمين', 'Assurance'], ['الزبون', 'Client'], ['المركبة والتاريخ', 'Véhicule et dates'], ['الدفع', 'Paiement']];
function n7StepsHTML(w) {
  var st = n7StepState(w), cur = st.indexOf(false);
  return '<div class="n7-steps" id="n7-steps">' + N7_STEPS.map(function (t, i) {
    return '<button class="n7-st' + (st[i] ? ' ok' : '') + (i === cur ? ' cur' : '') + '" data-act="n7-step" data-i="' + i + '"><i>' + (st[i] ? n7I('check') : (i + 1)) + '</i><span>' + esc(L(t[0], t[1])) + '</span></button>' + (i < 3 ? '<span class="n7-stl' + (st[i] ? ' ok' : '') + '"></span>' : '');
  }).join('') + '</div>';
}
function n7StepsUpd() { var w = ce7(), e = $('n7-steps'); if (!w || !e) return; e.outerHTML = n7StepsHTML(w); }
App.act('n7-step', function (el) {
  var i = +el.dataset.i, f = [null, 'n7-client', 'n7-plate', 'n7-paid'][i];
  if (i === 0) { var c = document.querySelector('.n7-cards .n7-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (i === 2) { var p = $('n7-plate'); if (p && p.value.trim()) f = null; if (!f) { var ds = document.querySelector('.n7-ds'); if (ds) { ds.focus(); return; } } }
  var e = $(f); if (e) { e.focus(); e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});
function n7Head(w, qs) {
  var nd = n7Drafts().length, num = (w.document.getElementById('h-rec') || {}).textContent || '';
  return '<div class="n7-hd"><span class="n7-hic">' + n7I('plus') + '</span><div class="n7-ht"><h1>' + L('عملية جديدة', 'Nouvelle opération') + '</h1><small>' + L('تسجيل عقد جديد أو تجديد عقد موجود', 'Nouveau contrat ou renouvellement')
    + (num ? ' · <b class="ltr">N° ' + esc(num) + '</b>' : '') + (qs.t ? ' · ' + L('اليوم: ', 'Auj. : ') + '<b>' + esc(qs.t) + '</b>' : '') + '</small></div>'
    + n7StepsHTML(w)
    + '<div class="n7-hb">'
    + (n7DevisList().length ? '<button class="btn n7-drb" data-act="n7-devis-list">📋 ' + L('عروض الأسعار', 'Devis') + ' <b>' + n7DevisList().length + '</b></button>' : '')
    + (nd ? '<button class="btn n7-drb" data-act="n7-drafts">' + n7I('folder') + L('المسودات', 'Brouillons') + ' <b>' + nd + '</b></button>' : '')
    + '<button class="btn n7-drb" data-act="n7-draft">' + n7I('save') + L('تخزين كمسودة', 'Enregistrer en brouillon') + '</button></div></div>';
}

/* المسودات: فهاد الجهاز فقط (localStorage)، ما كتمسّ حتى عملية حقيقية */
var N7_DF = ['client', 'plate', 'location', 'date-s', 'police-num', 'attest-num', 'paid', 'cheque-num', 'tpe-ref', 'man-price'];
function n7Drafts() { var a = Local.get('n7_drafts', []); return Array.isArray(a) ? a : []; }
App.act('n7-draft', function () {
  var w = ce7(); if (!w) return;
  if (!n7v(w, 'client').trim() && !n7v(w, 'plate').trim()) { toast(L('كتب على الأقل الاسم ولا الماتريكول', 'Saisissez au moins le nom ou l\'immatriculation'), 'err'); return; }
  var d = { id: Date.now(), at: Date.now(), by: App.user ? App.user.name : '', f: {},
    tarif: n7v(w, 'tarif'), type: n7v(w, 'ins-type'), fuel: n7v(w, 'fuel'), cv: n7v(w, 'cv'), ccv: n7v(w, 'comm-cv'), moto: n7v(w, 'moto-cat'), cam: n7v(w, 'cam-ton'),
    dur: +n7v(w, 'dur') || 0, bm: w.BM, usage: w.USAGE, pm: w.PAY_MODE, man: !!(w.document.getElementById('man-tog') || {}).checked, off: n7Off(w) };
  N7_DF.forEach(function (k) { d.f[k] = n7v(w, k); });
  var a = n7Drafts(); a.unshift(d); Local.set('n7_drafts', a.slice(0, 20));
  n7Clear(w); toast('💾 ' + L('تحفظات المسودة. الخانات خاويين للزبون الجاي.', 'Brouillon enregistré. Formulaire vidé.'), 'ok'); App.render();
});
function n7Clear(w) {
  N7_DF.forEach(function (k) { n7set(w, k, ''); });
  try { var mt = w.document.getElementById('man-tog'); if (mt && mt.checked) { mt.checked = false; w.togMan(); } } catch (e) { }
  try { w.setPayMode('cash'); w.setUsage('Personnel'); w.setTarif('wafa'); } catch (e) { }
  try { var t = new Date(); n7set(w, 'date-s', t.toISOString().slice(0, 10)); w.calcEnd(); } catch (e) { }
  try { w.clearDraft(); } catch (e) { }
  w.PDF_DOC = null;                                        /* 7.17: الوثيقة اللي تقرات (CAT / Avenant) */
}
App.act('n7-drafts', function () {
  var a = n7Drafts();
  Modal.open(Modal.head(L('المسودات (هاد الجهاز)', 'Brouillons (cet appareil)'))
    + (a.length ? '<div class="n7-dl">' + a.map(function (d) { return '<div class="n7-dr"><div><b>' + esc(d.f.client || '—') + '</b> <small class="ltr">' + esc(d.f.plate || '') + '</small><small>' + esc(fmtDT(d.at)) + (d.off ? ' · ' + money(d.off) + ' DH' : '') + (d.by ? ' · ' + esc(d.by) : '') + '</small></div><span class="sp"></span>'
        + '<button class="btn sm pri" data-act="n7-dopen" data-id="' + d.id + '">' + L('كمّل', 'Reprendre') + '</button><button class="btn sm ic" data-act="n7-ddel" data-id="' + d.id + '" title="' + L('حذف', 'Supprimer') + '">✕</button></div>'; }).join('') + '</div>'
      : '<div class="empty">' + L('ما كاين حتى مسودة', 'Aucun brouillon') + '</div>'), 'small');
});
App.act('n7-ddel', function (el) { Local.set('n7_drafts', n7Drafts().filter(function (d) { return String(d.id) !== el.dataset.id; })); App.acts['n7-drafts'](); App.render(); });
App.act('n7-dopen', function (el) {
  var w = ce7(), d = n7Drafts().filter(function (x) { return String(x.id) === el.dataset.id; })[0]; if (!w || !d) return;
  N7.done = null;
  try {
    w.setTarif(d.tarif || 'wafa');
    if ((d.tarif || 'wafa') === 'wafa') {
      if (d.type) w.setType(d.type);
      if (d.type === 'voiture') { if (d.fuel) w.setFuel(d.fuel); if (d.cv) { var vals = Array.prototype.map.call(w.document.querySelectorAll('#cv-grid [data-v]'), function (b) { return parseInt(b.dataset.v); }); w.setCVVal('cv-grid', 'cv', parseInt(d.cv), vals); } }
      if (d.type === 'commercial' && d.ccv) { var v2 = Array.prototype.map.call(w.document.querySelectorAll('#comm-cv-grid [data-v]'), function (b) { return parseInt(b.dataset.v); }); w.setCVVal('comm-cv-grid', 'comm-cv', parseInt(d.ccv), v2); }
      if (d.type === 'moto' && d.moto) w.setMotoCat(d.moto);
      if (d.type === 'camion' && d.cam) w.setCamTon(d.cam);
      if (d.dur) w.setDur(d.dur);
      if (d.bm) w.setBM(d.bm);
    }
    if (d.usage) w.setUsage(d.usage);
    if (d.pm) w.setPayMode(d.pm);
    N7_DF.forEach(function (k) { if (k !== 'man-price') n7set(w, k, d.f[k] || ''); });
    if (d.man) { var mt = w.document.getElementById('man-tog'); if (mt && !mt.checked) { mt.checked = true; w.togMan(); } n7set(w, 'man-price', d.f['man-price'] || ''); w.updMan(); }
    if (d.f['date-s']) w.calcEnd();
    try { w.fillP(); } catch (e) { }
    if (d.f.paid) { try { w.autoCalc(); } catch (e) { } }
  } catch (e) { console.error(e); toast(String(e.message || e), 'err'); }
  Local.set('n7_drafts', n7Drafts().filter(function (x) { return x.id !== d.id; }));
  Modal.close(); App.render();
  if (d.off && Math.abs(n7Off(w) - d.off) > 0.01) toast(L('⚠ الثمن تبدّل من نهار المسودة: ', '⚠ Le prix a changé : ') + money(d.off) + ' → ' + money(n7Off(w)), 'err');
});

function n7v(w, id) { var e = w.document.getElementById(id); return e ? e.value : ''; }
function n7set(w, id, v) { var e = w.document.getElementById(id); if (e) e.value = v; }
/* 7.10 (المرحلة 2): الحساب كيجي من المحرك الجديد (Eng). الحالة كتتقرا من خانات الحاسبة باش كل الطرق اللي كتعمرها
   (PDF، «احسب السعر» من بطاقة الزبون، «Encaisser» من المتابعة، المسودات) تبقى خدامة. قبل أي حفظ: n8Guard كيقارن الجديد مع القديم. */
function n8St(w) {
  var d = w.document, v = function (id) { var e = d.getElementById(id); return e ? e.value : ''; };
  return { tarif: v('tarif') || 'wafa', type: v('ins-type'), cv: v('cv'), fuel: v('fuel'), commCv: v('comm-cv'), motoCat: v('moto-cat'), camTon: v('cam-ton'), dur: v('dur'), bm: w.BM,
    tpvType: v('tpv-type'), tpvDur: v('tpv-dur'), taxiDur: v('taxi-dur'), taxiMethod: v('taxi-method'), taxiHt: v('taxi-ht'), taxiTax: v('taxi-tax'), taxiHt2: v('taxi-ht2'),
    autreCat: v('autre-cat'), autreDur: v('autre-dur'), man: !!(d.getElementById('man-tog') || {}).checked, manPrice: v('man-price'), ds: v('date-s'),
    instShown: !!w.INSTALL_SHOWN, instSel: w.INSTALL_SELECTED, prevBal: w.PREV_BAL || 0, paid: v('paid'), usage: w.USAGE, payMode: w.PAY_MODE, chequeNum: v('cheque-num'), tpeRef: v('tpe-ref') };
}
function n7Off(w) { try { return Eng.off(n8St(w)); } catch (e) { return 0; } }
function n7Eff(w) { try { return Eng.compare(n8St(w)).eff; } catch (e) { return n7Off(w); } }
function n7Desc(w) { try { return Eng.desc(n8St(w)); } catch (e) { return ''; } }
/* الحارس: إلا كان شي فرق بين المحرك الجديد والقديم ← ما كيتحفظ والو، وكيتسجل فـ 🐞 */
function n8Guard(w) {
  try {
    var s = n8St(w), c = Eng.compare(s), bad = [];
    if (Math.abs((+w.getOff() || 0) - Eng.off(s)) > 1e-9) bad.push('off ' + w.getOff() + '≠' + Eng.off(s));
    if (w.getDesc() !== Eng.desc(s)) bad.push('desc ' + w.getDesc() + '≠' + Eng.desc(s));
    if (Math.abs((+w.getEffOff() || 0) - c.eff) > 1e-9) bad.push('eff ' + w.getEffOff() + '≠' + c.eff);
    if (!bad.length) return true;
    if (typeof logAdd === 'function') logAdd('auto', '[engine] ' + bad.join(' · '), JSON.stringify(s).slice(0, 1200));
    toast('⛔ ' + L('فرق فالحساب بين المحرك الجديد والقديم: ما تحفظ والو. تسجل فـ 🐞', 'Écart de calcul entre moteurs : rien enregistré (voir 🐞)'), 'err');
    return false;
  } catch (e) { return true; }
}
function n7DMY(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : '—'; }

/* الزبناء المقترحين: السجل ديال الحاسبة (آخر عملية) + لائحة التجديد */
function n7Sug(w, q) {
  q = String(q || '').toLowerCase().trim(); if (q.length < 2) return [];
  var out = [], seen = {};
  (w.HIST || []).forEach(function (h) {
    if (out.length >= 6) return;
    var key = (h.client || '') + '|' + (h.plate || ''); if (seen[key]) return;
    if ([h.client, h.plate, h.police, h.phone].join(' ').toLowerCase().indexOf(q) < 0) return;
    seen[key] = 1; out.push({ n: h.client, p: h.plate, pol: h.police, att: h.attest, tel: h.phone, last: h.date, ins: h.ins, src: L('السجل', 'historique') });
  });
  if (typeof renewBase === 'function') renewBase().forEach(function (c) {
    if (out.length >= 8) return;
    var key = (c.name || '') + '|' + (c.plate || ''); if (seen[key]) return;
    if ([c.name, c.plate, c.police, c.phone].join(' ').toLowerCase().indexOf(q) < 0) return;
    seen[key] = 1; out.push({ n: c.name, p: c.plate, pol: typeof polFull === 'function' ? polFull(c) : c.police, att: c.att, tel: c.phone, last: c.dateE ? fmtD(c.dateE) : '', src: L('التجديد', 'renouv.') });
  });
  return out;
}

/* المرآة: أزرار كيبنيهم المحرك بوحدو (TPV، الطاكسي، Autre…) ← كنعاودو نرسموهم وكنضغطو على نفس الزر ديالو */
function n7Txt(b) { var s = b.querySelector(App.lang === 'fr' ? '[data-fr]' : '[data-ar]'); if (s) { var ic = (b.firstChild && b.firstChild.nodeType === 3) ? b.firstChild.textContent.trim() : ''; return ((ic ? ic + ' ' : '') + s.textContent).trim(); } return b.textContent.trim(); }
function n7Mirror(w, sel) {
  var c = w.document.querySelector(sel); if (!c) return [];
  return Array.prototype.map.call(c.querySelectorAll('button'), function (b, i) { return { i: i, t: n7Txt(b), on: /\bon\b/.test(b.className) }; });
}
function n7Shown(w, id) { var e = w.document.getElementById(id); if (!e) return false; for (var x = e; x && x !== w.document.body; x = x.parentElement) { if (x.style && x.style.display === 'none') return false; } return true; }
function renderNew7(el) {
  var w = ce7();
  if (!w) { el.innerHTML = '<div class="page"><div class="empty">⏳ ' + L('كنحلّو الحاسبة…', 'Chargement de la calculatrice…') + '</div></div>'; ce7Wait(function () { if (App.page === 'c-new7') App.render(); }); return; }
  var d = w.document, tarif = n7v(w, 'tarif') || 'wafa', type = n7v(w, 'ins-type') || 'voiture', fuel = n7v(w, 'fuel'), dur = +n7v(w, 'dur') || 6;
  var man = !!(d.getElementById('man-tog') || {}).checked, off = n7Off(w), paid = parseFloat(n7v(w, 'paid')) || 0, eff = n7Eff(w), diff = paid ? paid - eff : 0;
  var ch = function (on, act, attrs, label, cls) { return '<button class="c7' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" data-act="' + act + '" ' + (attrs || '') + '>' + label + '</button>'; };
  var mir = function (sel, cls) { return n7Mirror(w, sel).map(function (b) { return ch(b.on, 'n7-mir', 'data-s="' + esc(sel) + '" data-i="' + b.i + '"', esc(b.t), cls); }).join(''); };
  var cvVals = function (gid) { return Array.prototype.map.call(d.querySelectorAll('#' + gid + ' [data-v]'), function (b) { return b.dataset.v; }); };
  var blk = function (lbl, inner) { return inner ? '<div class="n7-blk"><span class="n7-lbl">' + lbl + '</span><div class="n7-ch">' + inner + '</div></div>' : ''; };
  var sug = N7.sugOpen ? n7Sug(w, n7v(w, 'client')) : [];
  var qs = (function () { var t = d.getElementById('qs-total'), r = d.getElementById('qs-ref'); return { t: t ? t.textContent : '', r: r ? r.textContent : '' }; })();
  var fv = function (id, lbl, ltrF, ph, extra) { return '<label class="f' + (extra || '') + '"><span>' + lbl + '</span><input id="n7-' + id + '" data-inp="n7-in" data-e="' + id + '"' + (ltrF ? ' dir="ltr"' : '') + ' value="' + esc(n7v(w, id)) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off"></label>'; };

  /* ── بطاقة «بيانات التأمين» (نفس الترتيب ديال الحاسبة) ── */
  var ins = blk(L('نوع التعرفة', 'Tarif'), ch(tarif === 'wafa', 'n7-tarif', 'data-v="wafa"', 'Wafa', 'w') + ch(tarif === 'tpv', 'n7-tarif', 'data-v="tpv"', 'TPV', 'w') + ch(tarif === 'autre', 'n7-tarif', 'data-v="autre"', 'Autre', 'w'));
  if (tarif === 'wafa') {
    ins += blk(L('نوع المركبة', 'Véhicule'), [['voiture', 'car', L('سيارة', 'Voiture')], ['moto', 'moto', L('دراجة', 'Moto')], ['commercial', 'van', L('تجاري', 'Commercial')], ['camion', 'truck', L('شاحنة', 'Camion')]].map(function (x) { return ch(type === x[0], 'n7-type', 'data-v="' + x[0] + '"', n7I(x[1], 'lg') + x[2], 'w tall'); }).join(''));
    if (type === 'voiture') ins += blk(L('الوقود', 'Carburant'), ch(fuel === 'e', 'n7-fuel', 'data-v="e"', n7I('fuel') + L('بنزين', 'Essence'), 'w') + ch(fuel === 'd', 'n7-fuel', 'data-v="d"', n7I('drop') + L('ديزل', 'Diesel'), 'w'))
      + blk('PUISSANCE FISCALE (CV)', cvVals('cv-grid').map(function (v) { return ch(String(n7v(w, 'cv')) === v, 'n7-cv', 'data-g="cv-grid" data-i="cv" data-v="' + v + '"', v, 'cv'); }).join(''));
    else if (type === 'commercial') ins += blk('CV', cvVals('comm-cv-grid').map(function (v) { return ch(String(n7v(w, 'comm-cv')) === v, 'n7-cv', 'data-g="comm-cv-grid" data-i="comm-cv" data-v="' + v + '"', v, 'cv'); }).join(''));
    else if (type === 'moto') ins += blk(L('الفئة', 'Catégorie'), [['le50', '≤50 CC'], ['mid', '51—125 CC'], ['ge126', '126+ CC']].map(function (x) { return ch(n7v(w, 'moto-cat') === x[0], 'n7-moto', 'data-v="' + x[0] + '"', x[1], 'w'); }).join(''));
    else if (type === 'camion') ins += blk(L('الحمولة', 'Tonnage'), [['t35', '−3.5 T'], ['t12', '12 T'], ['t14', '14 T']].map(function (x) { return ch(n7v(w, 'cam-ton') === x[0], 'n7-cam', 'data-v="' + x[0] + '"', x[1], 'w'); }).join(''));
    ins += blk(L('مدة التأمين', 'Durée'), [[1, L('1 شهر', '1 mois')], [3, L('3 أشهر', '3 mois')], [6, L('6 أشهر', '6 mois')], [12, L('1 سنة', '1 an')]].map(function (x) { return ch(dur === x[0], 'n7-dur', 'data-v="' + x[0] + '"', n7I('cal') + x[1], 'w'); }).join(''))
      + n7Inst(w);
  }
  if (tarif === 'tpv') {
    ins = blk(L('نوع التعرفة', 'Tarif'), ch(false, 'n7-tarif', 'data-v="wafa"', 'Wafa', 'w') + ch(true, 'n7-tarif', 'data-v="tpv"', 'TPV', 'w') + ch(false, 'n7-tarif', 'data-v="autre"', 'Autre', 'w'))
      + blk(L('النوع', 'Type'), ['camion', 'remorque', 'tourisme', 'taxi'].map(function (x) { var b = d.getElementById('tpvt-' + x); return b ? ch(/\bon\b/.test(b.className), 'n7-tpvt', 'data-v="' + x + '"', esc(b.textContent.trim()), 'w') : ''; }).join(''));
    if (n7v(w, 'tpv-type') === 'taxi') {
      ins += blk(L('الطريقة', 'Méthode'), ['taxim-1', 'taxim-2'].map(function (id, i) { var b = d.getElementById(id); return b ? ch(/\bon\b/.test(b.className), 'n7-click', 'data-id="' + id + '"', esc(n7Txt(b)), 'w') : ''; }).join(''))
        + blk(L('المدة', 'Durée'), ['taxid-3m', 'taxid-6m', 'taxid-1a'].map(function (id) { var b = d.getElementById(id); return b ? ch(/\bon\b/.test(b.className), 'n7-click', 'data-id="' + id + '"', esc(n7Txt(b)), 'w') : ''; }).join(''))
        + '<div class="n7-g2">' + (n7Shown(w, 'taxi-ht') ? fv('taxi-ht', 'HT', 1, '', ' n7-fp') + fv('taxi-tax', L('الضريبة', 'Taxe'), 1, '', ' n7-fp') : '') + (n7Shown(w, 'taxi-ht2') ? fv('taxi-ht2', 'HT', 1, '', ' n7-fp') : '') + '</div>';
    } else ins += blk(L('المدة', 'Durée'), mir('#tpv-dur-grid', 'w'));
  } else if (tarif === 'autre') {
    ins += n7Shown(w, 'autre-empty-msg') ? '<div class="box">' + L('ما كاين حتى فئة «Autre». زيدها من «الأسعار».', 'Aucune catégorie « Autre ».') + '</div>'
      : blk(L('الفئة', 'Catégorie'), mir('#autre-cat-grid', 'w')) + blk(L('المدة', 'Durée'), mir('#autre-dur-grid', 'w'));
  }
  ins += '<div class="n7-price"><span>' + n7I('coin', 'pr') + L('السعر الرسمي', 'Prix officiel') + '</span><b class="ltr">' + (off ? 'DH ' + money(off) : '—') + '</b></div>';
  if (tarif === 'wafa') ins += blk(L('البونوس / ماليس', 'Bonus / Malus'), [['none', '➖ ' + L('بدون', 'Sans')], ['bonus', '✅ −10%'], ['m20', '⚠️ +20%'], ['m30', '🔴 +30%']].map(function (x) { return ch(w.BM === x[0], 'n7-bm', 'data-v="' + x[0] + '"', x[1], 'w'); }).join(''));
  ins += '<div class="n7-manrow"><label class="n7-man"><input type="checkbox" data-inp="n7-mantog"' + (man ? ' checked' : '') + '> ✏️ ' + L('سعر يدوي', 'Prix manuel') + '</label>'
    + (man ? '<input class="inp n7-manp" dir="ltr" type="number" step="0.01" inputmode="decimal" data-inp="n7-manp" value="' + esc(n7v(w, 'man-price')) + '" placeholder="DH">' : '') + '</div>';

  /* ── بطاقة «الزبون والدفع» ── */
  var cli = '<div class="n7-ch n7-mode">' + ch(true, 'n7-noop', '', n7I('pen') + L('يدوي', 'Manuel'), 'w') + ch(false, 'pdf7-pick', '', n7I('pdf') + L('استيراد من PDF', 'Importer PDF'), 'w') + '</div>'
    + '<div id="n7-debt-alert">' + (typeof n7DebtBanner === 'function' ? n7DebtBanner(w) : '') + '</div>'
    + '<div class="n7-g2"><div class="n7-cl">' + fv('client', n7I('user') + L('اسم الزبون *', 'Nom du client *'), '', 'Nom…')
      + (sug.length ? '<div class="n7-sug">' + sug.map(function (s, i) { return '<button data-act="n7-pick" data-i="' + i + '"><b>' + esc(s.n || '—') + '</b><small class="ltr">' + esc([s.p, s.pol, s.tel].filter(Boolean).join(' · ')) + '</small><span class="sp"></span><em>' + esc(s.src) + (s.last ? ' · ' + esc(s.last) : '') + '</em></button>'; }).join('') + '</div>' : '') + '</div>'
      + fv('plate', n7I('id') + L('رقم اللوحة', 'Immatriculation'), 1, 'A-12345') + '</div>'
    + fv('location', n7I('pin') + L('المكان', 'Lieu'), '', L('اختياري', 'optionnel'))
    + '<div class="n7-g2"><label class="f"><span>' + n7I('cal') + L('تاريخ البداية', 'Début') + '</span><input type="date" class="n7-ds" data-inp="n7-ds" value="' + esc(n7v(w, 'date-s')) + '"></label>'
      + '<label class="f"><span>' + n7I('cal') + L('تاريخ الانتهاء', 'Fin') + '</span><input class="n7-de" dir="ltr" readonly value="' + n7DMY(n7v(w, 'date-e')) + '"></label></div>'
    + '<div class="n7-g2">' + fv('police-num', n7I('doc') + L('رقم البوليصة (اختياري)', 'N° police (optionnel)'), 1) + fv('attest-num', n7I('award') + L('رقم الشهادة (اختياري)', 'N° attestation (optionnel)'), 1) + '</div>'
    + blk(L('الاستعمال', 'Usage'), [['Personnel', L('شخصي', 'Personnel'), 'user'], ['Taxi', 'Taxi', 'taxi'], ['Transport Commercial', L('نقل', 'Transport'), 'bus']].map(function (x) { return ch(w.USAGE === x[0], 'n7-usage', 'data-v="' + x[0] + '"', n7I(x[2]) + x[1], 'w'); }).join(''))
    + blk(L('طريقة الدفع', 'Paiement'), ch(w.PAY_MODE === 'cash', 'n7-pm', 'data-v="cash"', n7I('cash') + L('نقداً', 'Espèces'), 'w') + ch(w.PAY_MODE === 'cheque', 'n7-pm', 'data-v="cheque"', n7I('cheque') + 'Chèque', 'w') + ch(w.PAY_MODE === 'tpe', 'n7-pm', 'data-v="tpe"', n7I('card') + 'TPE', 'w'))
    + (w.PAY_MODE === 'cheque' ? fv('cheque-num', L('رقم الشيك', 'N° chèque'), 1) : '') + (w.PAY_MODE === 'tpe' ? fv('tpe-ref', L('مرجع TPE', 'Réf. TPE'), 1) : '');

  var done = N7.done, k = !paid ? '' : diff > 0.004 ? 'pos' : diff < -0.004 ? 'neg' : 'zero';
  el.innerHTML = '<div class="page n7 n7b">'
    + (done ? '<div class="n7-done"><b>✅ N° ' + esc(done.num) + ' — ' + esc(done.client) + '</b><span>' + esc(done.msg) + '</span><span class="sp"></span>'
        + '<button class="btn sm" data-act="n7-rec">🖨️ ' + L('الوصل', 'Reçu') + '</button><button class="btn sm" data-act="n7-piece">🧾 Pièce</button><button class="btn sm" data-act="n7-fac">📑 Facture</button><button class="btn sm" data-act="n7-wa">📱 WhatsApp</button></div>'
      : '')
    + n7Head(w, qs)
    + '<div class="n7-cards">'
      + '<section class="n7-card"><div class="n7-ch-h"><i>' + n7I('shield') + '</i>' + L('بيانات التأمين', 'Assurance') + '</div><div class="n7-cb">' + ins + '</div></section>'
      + '<div class="n7-col"><section class="n7-card"><div class="n7-ch-h"><i>' + n7I('user') + '</i>' + L('الزبون والدفع', 'Client et paiement') + '</div><div class="n7-cb">' + cli + '</div></section>' + n7Extras(w) + '</div>'
    + '</div>'
    + '<div class="n7-bar"><div class="n7-sum"><b>' + esc(n7v(w, 'client') || '—') + (n7v(w, 'plate') ? ' · ' + esc(n7v(w, 'plate')) : '') + '</b><span><span class="ltr">' + n7DMY(n7v(w, 'date-s')) + ' → ' + n7DMY(n7v(w, 'date-e')) + '</span> · ' + esc(n7Desc(w)) + '</span></div>'
      + '<span class="sp"></span>'
      + '<div class="n7-k"><span>' + L('الرسمي', 'Officiel') + '</span><b id="n7-off">' + (off ? money(off) : '—') + '</b></div>'
      + '<label class="n7-k n7-kin"><span>' + L('عطا', 'Reçu') + '</span><input id="n7-paid" dir="ltr" type="number" step="0.01" inputmode="decimal" data-inp="n7-paid" value="' + esc(n7v(w, 'paid')) + '" placeholder="0"></label>'
      + '<div class="n7-k ' + k + '" id="n7-dk"><span id="n7-dl">' + (!paid ? L('الفرق', 'Écart') : diff > 0.004 ? '↩ ' + L('نرجعو ليه', 'À rendre') : diff < -0.004 ? '⚠ ' + L('باقي عليه', 'Reste dû') : '✓ ' + L('مطابق', 'Soldé')) + '</span><b id="n7-df">' + (paid ? money(Math.abs(diff)) : '—') + '</b></div>'
      + '<button class="btn" data-act="n7-devis" title="' + L('إنشاء عرض سعر للزبون بلا تسجيل في الصندوق', 'Créer un devis sans enregistrer en caisse') + '">📋 ' + L('عرض سعر', 'Devis') + '</button>'
      + '<button class="btn n7-unp" data-act="n7-unpaid" title="' + L('أخذ التأمين بلا خلاص', 'Assurance sans paiement') + '">⏳ ' + L('لم يدفع', 'Non payé') + '</button>'
      + '<button class="btn ic n7-more" data-act="n7-more" title="' + L('المزيد', 'Plus') + '">⋯</button>'
      + '<button class="btn pri n7-ok" data-act="n7-ok">✓ ' + (w.DIRECT_MODE ? L('تأكيد الدفع المباشر', 'Valider paiement direct') : L('تأكيد العملية', 'Valider')) + '</button></div>'
    + '<div class="n7-foot">© ' + new Date().getFullYear() + ' ' + L('جميع الحقوق محفوظة', 'Tous droits réservés') + ' — بلال الهيشو</div>'
  + '</div>';
}


/* 📅 التقسيط (Wafa، 3/6/12 شهر): نفس الجدول ديال الحاسبة (toggleInstallView / selectInstallment) */
function n7Inst(w) {
  var cnt = (w.INSTALL_COUNTS || {})[+n7v(w, 'dur')]; if (!cnt) return '';
  if (!w.INSTALL_SHOWN) return '<button class="n7-inst" data-act="n7-inst">' + n7I('cal') + '<span>' + L('الزبون بغا التقسيط؟', 'Le client veut échelonner ?') + '</span><span class="n7-sw"><b></b></span></button>';
  var ins = Eng.install(n8St(w)) || { pcts: [], amounts: [] }, pcts = ins.pcts || w.equalSplitPcts(cnt), amts = ins.amounts || [], d = w.document;
  return '<div class="n7-instbox"><div class="n7-insth"><b>📅 ' + L('جدول التقسيط', 'Échéancier') + '</b><span class="sp"></span><button class="link" data-act="n7-inst">✕ ' + L('إخفاء', 'Masquer') + '</button></div>'
    + pcts.map(function (p, i) { var on = w.INSTALL_SELECTED === i;
      return '<button class="n7-irow' + (on ? ' on' : '') + '" data-act="n7-isel" data-i="' + i + '"><span>' + (on ? '✅ ' : '') + L('القسط ' + (i + 1), 'Versement ' + (i + 1)) + ' (' + p + '%)</span><b class="ltr">' + (amts[i] != null ? money(amts[i]) + ' DH' : '—') + '</b></button>'; }).join('')
    + '<div class="n7-ifoot">' + L('فيه رسم التقسيط: ', 'Frais d\'échelonnement : ') + '<b class="ltr">' + (ins.feeTotal != null ? money(ins.feeTotal) + ' (' + (ins.count - 1) + '×' + money(ins.fee) + ')' : '—') + ' DH</b> · ' + L('المجموع: ', 'Total : ') + '<b class="ltr">' + (ins.total != null ? money(ins.total) : '—') + ' DH</b></div>'
    + '<div class="hint">' + L('اختار القسط اللي غادي يخلّص دابا: الفرق التحت كيتحسب عليه.', 'Choisissez le versement payé maintenant : l\'écart est calculé dessus.') + '</div></div>';
}
App.act('n7-inst', n7Do(function (w) { w.toggleInstallView(); }));
App.act('n7-isel', n7Do(function (w, el) { w.selectInstallment(+el.dataset.i); }));

/* ── تحت «الزبون والدفع»: دفع مباشر · باقي سابق · وصل يدوي (نفس الدوال ديال الحاسبة) ── */
function n7Extras(w) {
  var d = w.document, prevOn = !!(d.getElementById('prev-tog') || {}).checked, dirOn = !!w.DIRECT_MODE;
  var pmOn = (d.getElementById('piece-manual-sw') || { classList: { contains: function () { return false; } } }).classList.contains('on');
  var inp = function (id, lbl, num) { return '<label class="f"><span>' + lbl + '</span><input data-inp="n7-xin" data-e="' + id + '"' + (num ? ' dir="ltr" type="number" step="0.01" inputmode="decimal"' : '') + ' value="' + esc(n7v(w, id)) + '"></label>'; };
  var row = function (k, ic, lbl, on, body) {
    return '<div class="n7-x' + (on ? ' on' : '') + '"><button class="n7-xh" data-act="n7-x" data-k="' + k + '"><span class="n7-sw' + (on ? ' on' : '') + '"><b></b></span><span class="n7-xl">' + ic + ' ' + lbl + '</span></button>' + (on ? '<div class="n7-xb">' + body + '</div>' : '') + '</div>';
  };
  var pb = (d.getElementById('prev-bal-val') || {}).textContent || '—';
  return '<div class="n7-xs">'
    + row('direct', n7I('bolt'), L('دفع مباشر', 'Paiement direct'), dirOn, '<div class="n7-g2">' + inp('direct-desc', L('الوصف', 'Description')) + inp('direct-amount', L('المبلغ (DH)', 'Montant (DH)'), 1) + '</div>'
        + '<div class="n7-cie"><span>' + L('الشركة:', 'Compagnie :') + '</span>' + [['wafa', 'Wafa'], ['cat', 'CAT']].map(function (c) { return '<button class="c7' + (w.DIRECT_CIE === c[0] ? ' on' : '') + '" data-act="n7-dcie" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>'
        + '<div class="hint">' + L('كيتسجل فالسجل بلا حساب ثمن (الرسمي = المبلغ). كتأكدو بالزر الأخضر التحت.', 'Enregistré sans calcul (officiel = montant). Validez avec le bouton vert.') + '</div>')
    + row('prev', n7I('hist'), L('باقي سابق', 'Solde précédent'), prevOn, '<div class="n7-g2">' + inp('prev-off', L('الرسمي ديال المرة اللي فاتت', 'Officiel précédent'), 1) + inp('prev-paid', L('شنو عطا المرة اللي فاتت', 'Payé précédent'), 1) + '</div>'
        + '<div class="n7-pb">' + L('الرصيد: ', 'Solde : ') + '<b id="n7-pb">' + esc(pb) + '</b></div>')
    + row('pm', n7I('rec'), L('وصل يدوي (بلا حساب)', 'Reçu manuel (sans calcul)'), pmOn, '<div class="n7-g2">' + inp('pm-off', 'Prime Totale (DH)', 1) + inp('pm-paid', L('المدفوع (DH)', 'Payé (DH)'), 1) + '</div>'
        + '<button class="btn wide" data-act="n7-pmgo">🧾 ' + L('طبع Pièce de recette', 'Imprimer la pièce de recette') + '</button>')
    + '</div>';
}
/* 7.17: الدفع المباشر ← Wafa ولا CAT (كيتكتب فالوصف: «⚡ [CAT] …»، بلا خانة جديدة) */
App.act('n7-dcie', function (el) { var w = ce7(); if (!w) return; w.DIRECT_CIE = el.dataset.v; App.render(); });
App.act('n7-x', n7Do(function (w, el) {
  var k = el.dataset.k;
  if (k === 'direct') w.toggleDirect();
  else if (k === 'prev') { var t = w.document.getElementById('prev-tog'); t.checked = !t.checked; w.togPrev(); }
  else if (k === 'pm') w.togglePieceManual();
}));
App.input('n7-xin', function (el) {
  var w = ce7(); if (!w) return; var id = el.dataset.e; n7set(w, id, el.value);
  if (id === 'prev-off' || id === 'prev-paid') { try { w.calcPrev(); } catch (e) { } var b = $('n7-pb'); if (b) b.textContent = (w.document.getElementById('prev-bal-val') || {}).textContent || '—'; var p = $('n7-paid'); if (p) App.inputs['n7-paid'](p); }
});
App.act('n7-pmgo', function () { var w = ce7(); if (!w) return; w.buildPieceReceiptManual(); if (w.document.getElementById('receipt-piece').classList.contains('show')) ce7Overlay(['receipt-piece']); });

/* الضغطات ← نفس الدوال ديال الحاسبة */
function n7Do(fn) { return function (el) { var w = ce7(); if (!w) return; N7.done = null; try { fn(w, el); } catch (e) { console.error(e); toast(String(e.message || e), 'err'); } App.render(); }; }
App.act('n7-tarif', n7Do(function (w, el) { w.setTarif(el.dataset.v); }));
App.act('n7-type', n7Do(function (w, el) { w.setType(el.dataset.v); }));
App.act('n7-fuel', n7Do(function (w, el) { w.setFuel(el.dataset.v); }));
App.act('n7-cv', n7Do(function (w, el) { var vals = Array.prototype.map.call(w.document.querySelectorAll('#' + el.dataset.g + ' [data-v]'), function (b) { return parseInt(b.dataset.v); }); w.setCVVal(el.dataset.g, el.dataset.i, parseInt(el.dataset.v), vals); }));
App.act('n7-moto', n7Do(function (w, el) { w.setMotoCat(el.dataset.v); }));
App.act('n7-cam', n7Do(function (w, el) { w.setCamTon(el.dataset.v); }));
App.act('n7-dur', n7Do(function (w, el) { w.setDur(+el.dataset.v); }));
App.act('n7-bm', n7Do(function (w, el) { w.setBM(el.dataset.v); }));
App.act('n7-usage', n7Do(function (w, el) { w.setUsage(el.dataset.v); }));
App.act('n7-pm', n7Do(function (w, el) { w.setPayMode(el.dataset.v); }));
App.act('n7-amt', n7Do(function (w, el) { n7set(w, 'paid', el.dataset.v); w.autoCalc(); }));
App.input('n7-ds', function (el) { var w = ce7(); if (!w) return; n7set(w, 'date-s', el.value); w.calcEnd(); App.render(); });
App.input('n7-mantog', function (el) { var w = ce7(); if (!w) return; var t = w.document.getElementById('man-tog'); t.checked = el.checked; w.togMan(); App.render(); });
/* الخانات النصية: كنكتبو فالمحرك بلا ما نعاودو نرسمو (باش ما يطيرش الكتابة) */
App.input('n7-in', function (el) {
  var w = ce7(); if (!w) return; var id = el.dataset.e, v = id === 'plate' ? el.value.toUpperCase() : el.value;
  if (id === 'plate' && v !== el.value) { var p = el.selectionStart; el.value = v; try { el.setSelectionRange(p, p); } catch (e) { } }
  n7set(w, id, v); try { w.saveDraft(); } catch (e) { }
  if (/^taxi-/.test(id)) { try { w.fillP(); } catch (e) { } var o = $('n7-off'), off = n7Off(w); if (o) o.textContent = off ? money(off) : '—'; var pr = document.querySelector('.n7-price b'); if (pr) pr.textContent = off ? 'DH ' + money(off) : '—'; }
  if (id === 'client') { var was = N7.sugOpen, now = v.trim().length >= 2; N7.sugOpen = now; var s = n7Sug(w, v), box = document.querySelector('.n7-sug');
    if (now && s.length) { var html = s.map(function (x, i) { return '<button data-act="n7-pick" data-i="' + i + '"><b>' + esc(x.n || '—') + '</b><small class="ltr">' + esc([x.p, x.pol, x.tel].filter(Boolean).join(' · ')) + '</small><span class="sp"></span><em>' + esc(x.src) + (x.last ? ' · ' + esc(x.last) : '') + '</em></button>'; }).join('');
      if (box) box.innerHTML = html; else { var d = document.createElement('div'); d.className = 'n7-sug'; d.innerHTML = html; el.closest('.n7-cl').appendChild(d); } }
    else if (box) box.remove(); }
  var sb = document.querySelector('.n7-sum b'); if (sb) sb.textContent = (n7v(w, 'client') || '—') + (n7v(w, 'plate') ? ' · ' + n7v(w, 'plate') : '');
  if (id === 'client' || id === 'plate' || id === 'police-num') { var dbEl = $('n7-debt-alert'); if (dbEl && typeof n7DebtBanner === 'function') dbEl.innerHTML = n7DebtBanner(w); }

  n7StepsUpd();
});
App.act('n7-pick', function (el) {
  var w = ce7(); if (!w) return; var s = n7Sug(w, n7v(w, 'client'))[+el.dataset.i]; if (!s) return;
  n7set(w, 'client', s.n || ''); n7set(w, 'plate', String(s.p || '').toUpperCase()); n7set(w, 'police-num', s.pol || ''); n7set(w, 'attest-num', s.att || '');
  try { w.saveDraft(); } catch (e) { }
  N7.sugOpen = false; App.render();
});
/* المبلغ: الفرق كيتحسب مع الكتابة (ما بقاش «احسب الفرق») */
App.input('n7-paid', function (el) {
  var w = ce7(); if (!w) return; n7set(w, 'paid', el.value); try { w.autoCalc(); } catch (e) { }
  var paid = parseFloat(el.value) || 0, eff = n7Eff(w), diff = paid - eff, k = $('n7-dk');
  if ($('n7-pd')) $('n7-pd').textContent = paid ? money(paid) : '—';
  if ($('n7-df')) $('n7-df').textContent = paid ? money(Math.abs(diff)) : '—';
  if ($('n7-dl')) $('n7-dl').textContent = !paid ? L('الفرق', 'Écart') : diff > 0.004 ? '↩ ' + L('نرجعو ليه', 'À rendre') : diff < -0.004 ? '⚠ ' + L('باقي عليه', 'Reste dû') : '✓ ' + L('مطابق', 'Soldé');
  if (k) k.className = 'n7-k ' + (!paid ? '' : diff > 0.004 ? 'pos' : diff < -0.004 ? 'neg' : 'zero');

  n7StepsUpd();
});
App.input('n7-manp', debounce(function (el) { var w = ce7(); if (!w) return; n7set(w, 'man-price', el.value); w.updMan(); App.render(); var i = document.querySelector('.n7-manp'); if (i) { i.focus(); var n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) { } } }, 400));

/* ✓ التأكيد: valider() ديال الحاسبة (نفس الرقم، نفس السجل) */
/* 7.14 (المرحلة 5ب): الحفظ بالمحرك الجديد (Ops). الحارس كيبقى قبل (مقارنة مع القديم) ما دام الإطار كاين. */
function n8Msg(r) { var h = r.h, d = +h.diff || 0; return r.paidOld ? '💰 ' + L('تخلّصات · ', 'payée · ') + (d > 0 ? '↩ ' + L('رجّع ليه ', 'Rendre ') : d < 0 ? '⚠ ' + L('باقي عليه ', 'Reste dû ') : '✓ ' + L('مطابق ', 'Soldé ')) + money(Math.abs(d)) + ' DH'
  : h.unpaid ? '⏳ ' + L('لم يدفع · باقي عليه ', 'Non payé · reste ') + money(Math.abs(d)) + ' DH' : (d > 0 ? '↩ ' + L('رجّع ليه ', 'Rendre ') : d < 0 ? '⚠ ' + L('باقي عليه ', 'Reste dû ') : '✓ ' + L('مطابق ', 'Soldé ')) + money(Math.abs(d)) + ' DH' + (r.info || ''); }
function n8Run(fn, focusPrefix, done) {
  var w = ce7(); if (!w) return; var r;
  try { r = fn(w); } catch (e) { console.error(e); toast(String(e.message || e), 'err'); return; }
  if (!r || r.cancel) return;
  if (r.err) { toast(r.err, 'err'); var f = r.focus && $(focusPrefix + (r.focus === 'paid' ? 'paid' : 'client')); if (f) f.focus(); return; }
  N7.done = { num: r.h.num, client: r.h.client, msg: n8Msg(r) };
  done(r);
}
App.act('n7-ok', function () {
  var w = ce7(); if (!w) return;
  if (!w.DIRECT_MODE && n7Off(w) && !n8Guard(w)) return;
  n8Run(function (w2) { return w2.DIRECT_MODE ? Ops.direct(w2) : Ops.valider(w2); }, 'n7-', function () { App.render(); });
});
App.act('n7-unpaid', function () {
  var w = ce7(); if (!w) return; if (n7Off(w) && !n8Guard(w)) return;
  n8Run(function (w2) { return Ops.unpaid(w2); }, 'n7-', function () { App.render(); });
});
function n7After(w, before) {
  if (w.HIST.length <= before) { App.render(); return; }
  var h = w.HIST[0], d = +h.diff || 0;
  N7.done = { num: h.num, client: h.client, msg: h.unpaid ? '⏳ ' + L('لم يدفع · باقي عليه ', 'Non payé · reste ') + money(Math.abs(d)) + ' DH' : (d > 0 ? '↩ ' + L('رجّع ليه ', 'Rendre ') : d < 0 ? '⚠ ' + L('باقي عليه ', 'Reste dû ') : '✓ ' + L('مطابق ', 'Soldé ')) + money(Math.abs(d)) + ' DH' };
  App.render();
  /* المحرك كيخوي الخانات من بعد 3.5 ثانية: كنعاودو نرسمو باش تبان خاوية */
  setTimeout(function () { if (App.page === 'c-new7') App.render(); }, 3700);
}
function n7Last() { var w = ce7(); if (!w || !N7.done) return null; w.ldH(); var h = w.HIST.filter(function (x) { return x.num === N7.done.num; })[0]; return h ? { w: w, h: h } : null; }
App.act('n7-rec', function () { var x = n7Last(); if (!x) return; x.w.buildRecFromHist(x.h); ce7Overlay(['receipt']); });
App.act('n7-piece', function () { var x = n7Last(); if (!x) return; x.w.buildPieceReceiptFromHist(x.h); ce7Overlay(['receipt-piece']); });
App.act('n7-wa', function () { var x = n7Last(); if (!x) return; x.w.buildRecFromHist(x.h); try { x.w.shareWA(); } catch (e) { ce7Overlay(['receipt']); } });
App.act('n7-old', function () { Modal.close(); App.go('calc'); });
App.act('n7-noop', function () { });
App.act('n7-mir', n7Do(function (w, el) { var c = w.document.querySelector(el.dataset.s), b = c && c.querySelectorAll('button')[+el.dataset.i]; if (b) b.click(); }));
App.act('n7-tpvt', n7Do(function (w, el) { w.setTpvType(el.dataset.v); }));
App.act('n7-click', n7Do(function (w, el) { var b = w.document.getElementById(el.dataset.id); if (b) b.click(); }));
App.act('n7-more', function () {
  Modal.open(Modal.head(L('المزيد', 'Plus'))
    + '<div class="menu">' + '<button class="menu-i" data-act="n7-old">↩ ' + L('الشاشة القديمة', 'Ancien écran') + '</button></div>', 'small');
});

/* Entrée فخانة المبلغ = تأكيد */
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && App.page === 'c-new7' && e.target && e.target.id === 'n7-paid') { e.preventDefault(); App.acts['n7-ok'](); } });

App.register({ id: 'c-new7', perm: 'calc', icon: '🧮', title: ['عملية جديدة', 'Nouvelle opération'], order: 25.001, render: renderNew7 });
/* 7.3.0: الشاشة الجديدة هي «عملية جديدة». القديمة كتبقى غير بزر «↩ الشاشة القديمة» (ماشي فالقائمة) */
App.on('login', function () {
  var o = App.mod('calc'); if (o) { o.nav = false; o.title = ['عملية جديدة (الشاشة القديمة)', 'Nouvelle opération (ancien écran)']; }
  var n = App.mod('c-new7'); if (n) n.title = ['عملية جديدة', 'Nouvelle opération'];
  if (typeof TITLE7 !== 'undefined') { TITLE7.calc = ['عملية جديدة (القديمة)', 'Ancien écran']; TITLE7['c-new7'] = ['عملية جديدة', 'Nouvelle opération']; }
});
/* «احسب السعر» من بطاقة الزبون: كتعمّر الحاسبة بحال قبل، ومن بعد كتحل الشاشة الجديدة */
(function () { var o = App.acts['calc-open']; if (!o) return; App.act('calc-open', function (el, e) { o(el, e); setTimeout(function () { App.go('c-new7'); }, 350); [900, 1800].forEach(function (t) { setTimeout(function () { if (App.page === 'c-new7') App.render(); }, t); }); }); })();
if (typeof NAV7 !== 'undefined') { var g7 = NAV7.filter(function (g) { return g.k === 'day'; })[0]; if (g7 && g7.ids.indexOf('c-new7') < 0) g7.ids.splice(g7.ids.indexOf('calc'), 0, 'c-new7'); }
if (typeof IC7 !== 'undefined') IC7['c-new7'] = IC7.calc;

/* ══════════════════════════════════════════════════════════
   🌐 بطاقة الزبون الشاملة 360° + تنبيه الديون والأقساط غير المؤداة داخل الحاسبة
══════════════════════════════════════════════════════════ */
function c360NormName(s) {
  return String(s || '').toUpperCase().replace(/\b(STE|SOCIETE|SARL|Mr|MME|MLLE|ASSURANCE)\b/g, '').replace(/[^A-Z0-9\u0600-\u06FF]/g, '');
}
function c360NormPhone(s) {
  var d = String(s || '').replace(/\D+/g, '');
  if (d.indexOf('212') === 0 && d.length >= 11) d = '0' + d.slice(3);
  return d.length >= 9 ? d.slice(-9) : '';
}
function client360Data(q) {
  q = q || {};
  var cRef = q.id && typeof Contacts !== 'undefined' ? Contacts.get(q.id) : null;
  var name = String((cRef && cRef.name) || q.name || '').trim();
  var phone = String((cRef && cRef.phone) || q.phone || '').trim();
  var phone2 = String((cRef && cRef.phone2) || '').trim();
  var police = String((cRef && (typeof polFull === 'function' ? polFull(cRef) : cRef.police)) || q.police || '').trim();
  var plate = String((cRef && cRef.plate) || q.plate || '').trim();
  var group = String((cRef && cRef.group) || '').trim();

  var nName = c360NormName(name), nPh1 = c360NormPhone(phone), nPh2 = c360NormPhone(phone2);
  var nPol = kPolTail(police), nPl = kPlate(plate);
  if (!nName && !nPh1 && !nPol && !nPl) return null;

  var matchAny = function (oName, oPh1, oPh2, oPol, oPl, oGrp) {
    if (nPl && oPl && kPlate(oPl) === nPl) return true;
    if (nPol && oPol && kPolTail(oPol) === nPol) return true;
    if (nPh1 && ((oPh1 && c360NormPhone(oPh1) === nPh1) || (oPh2 && c360NormPhone(oPh2) === nPh1))) return true;
    if (nPh2 && ((oPh1 && c360NormPhone(oPh1) === nPh2) || (oPh2 && c360NormPhone(oPh2) === nPh2))) return true;
    if (group && oGrp && kAl(group).length >= 3 && kAl(oGrp) === kAl(group)) return true;
    if (nName.length >= 4 && oName) {
      var on = c360NormName(oName);
      if (on === nName || (on.length >= 6 && nName.length >= 6 && (on.indexOf(nName) >= 0 || nName.indexOf(on) >= 0))) return true;
    }
    return false;
  };

  /* 1) عقود التجديد والأسطول */
  var contracts = (typeof Contacts !== 'undefined' && Array.isArray(Contacts.list)) ? Contacts.list.filter(function (c) {
    return !c.deleted && matchAny(c.name, c.phone, c.phone2, typeof polFull === 'function' ? polFull(c) : c.police, c.plate, c.group);
  }) : [];
  contracts.forEach(function (c) {
    if (!phone && c.phone) { phone = c.phone; nPh1 = c360NormPhone(phone); }
    if (!name && c.name) { name = c.name; nName = c360NormName(name); }
  });

  /* 2) الديون المفتوحة في قسم الديون */
  var debts = [];
  if (typeof Debts !== 'undefined' && Array.isArray(Debts.rows)) {
    var cPols = {}; contracts.forEach(function (c) { var pt = kPolTail(c.police); if (pt) cPols[pt] = 1; });
    debts = Debts.rows.filter(function (d) {
      var rest = typeof dRest === 'function' ? dRest(d) : ((+d.solde || 0) - (+d.avance || 0));
      if (rest <= 0.005) return false;
      var pt = kPolTail(d.police);
      if (pt && (pt === nPol || cPols[pt])) return true;
      return matchAny(d.assure, d.phone, '', d.police, '', d.group);
    });
  }
  var debtTotal = debts.reduce(function (s, d) { return s + (typeof dRest === 'function' ? dRest(d) : ((+d.solde || 0) - (+d.avance || 0))); }, 0);

  /* 3) سجل عمليات الحاسبة (HIST) والعمليات غير المؤداة */
  var histAll = []; try { histAll = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || []; } catch (e) { histAll = []; }
  var ops = histAll.filter(function (h) { return h && matchAny(h.client, h.phone, '', h.police, h.plate || h.matricule, ''); });
  var unpaidOps = ops.filter(function (h) { return h.unpaid || (+h.diff < -0.5); });
  var unpaidSum = unpaidOps.reduce(function (s, h) { return s + (h.unpaid ? (+h.off || Math.abs(+h.diff || 0)) : Math.abs(+h.diff || 0)); }, 0);

  /* 4) متابعة التجديدات في الحاسبة (renewals) */
  var rtAll = []; try { rtAll = JSON.parse(localStorage.getItem('eurv102_renewals') || '[]') || []; } catch (e) { rtAll = []; }
  var rtPend = rtAll.filter(function (r) { return r && r.status !== 'done' && matchAny(r.name, r.phone, '', r.police, r.matricule, ''); });
  var rtSum = rtPend.reduce(function (s, r) { return s + (+r.price || 0); }, 0);

  /* 5) ملفات الحوادث (Sinistres) */
  var sins = (typeof Sin !== 'undefined' && Array.isArray(Sin.rows)) ? Sin.rows.filter(function (s) {
    return matchAny(s.assure, s.tel, '', s.police, s.plate, '');
  }) : [];

  return {
    name: name || L('زبون', 'Client'), phone: phone, police: police, plate: plate,
    contracts: contracts, debts: debts, debtTotal: Math.round(debtTotal * 100) / 100,
    ops: ops, unpaidOps: unpaidOps, unpaidSum: Math.round(unpaidSum * 100) / 100,
    rtPend: rtPend, rtSum: Math.round(rtSum * 100) / 100, sins: sins
  };
}

function n7DebtBanner(w) {
  if (!w) return '';
  var cl = n7v(w, 'client'), pl = n7v(w, 'plate'), pol = n7v(w, 'police-num');
  if (cl.trim().length < 3 && pl.trim().length < 3 && pol.trim().length < 4) return '';
  var d = client360Data({ name: cl, plate: pl, police: pol });
  if (!d) return '';
  var hasAlert = d.debtTotal > 0 || d.unpaidOps.length > 0 || d.rtPend.length > 0;
  var hasInfo = d.contracts.length > 1 || d.sins.length > 0 || d.ops.length > 0;
  if (!hasAlert && !hasInfo) return '';
  var parts = [];
  if (d.debtTotal > 0) parts.push('💰 ' + L('دين مسجل: ', 'Dette : ') + '<b>' + money(d.debtTotal) + ' DH</b> (' + d.debts.length + ')');
  if (d.unpaidOps.length) parts.push('⏳ ' + L('عمليات بالحاسبة غير مؤداة: ', 'Opérations non soldées : ') + '<b>' + money(d.unpaidSum) + ' DH</b> (' + d.unpaidOps.length + ')');
  if (d.rtPend.length) parts.push('📋 ' + L('شهادات في المتابعة: ', 'Suivi attestations : ') + '<b>' + d.rtPend.length + '</b>' + (d.rtSum ? ' (' + money(d.rtSum) + ' DH)' : ''));
  if (d.contracts.length > 1) parts.push('🚘 ' + L('أسطول: ', 'Flotte : ') + '<b>' + d.contracts.length + ' ' + L('مركبات', 'véhicules') + '</b>');
  if (d.sins.length) parts.push('🚗 ' + L('حوادث: ', 'Sinistres : ') + '<b>' + d.sins.length + '</b>');
  var totDue = Math.round((d.debtTotal + d.unpaidSum) * 100) / 100;
  return '<div class="box ' + (hasAlert ? 'red' : 'amber') + '" style="margin:6px 0;padding:8px 10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px">'
    + '<div style="flex:1;min-width:180px"><b>' + (hasAlert ? '⚠️ ' + L('تنبيه ذمة الزبون', 'Alerte solde client') : 'ℹ️ ' + L('معلومات الزبون', 'Infos client')) + ' — ' + esc(d.name) + '</b>'
    + '<div style="font-size:12.5px;margin-top:2px">' + parts.join(' · ') + '</div></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
    + (totDue > 0 ? '<button type="button" class="btn sm" data-act="n7-use-debt" data-amt="' + totDue + '">➕ ' + L('إدراج في باقي سابق', 'Inclure solde préc.') + '</button>' : '')
    + '<button type="button" class="btn sm pri" data-act="c360-open" data-name="' + esc(cl) + '" data-plate="' + esc(pl) + '" data-police="' + esc(pol) + '">🌐 ' + L('ملف 360°', 'Fiche 360°') + '</button>'
    + '</div></div>';
}

App.act('n7-use-debt', function (el) {
  var w = ce7(); if (!w) return;
  var amt = parseFloat(el.dataset.amt) || 0; if (!amt) return;
  var t = w.document.getElementById('prev-tog');
  if (t && !t.checked) { t.checked = true; try { w.togPrev(); } catch (e) { } }
  n7set(w, 'prev-off', String(amt)); n7set(w, 'prev-paid', '0');
  try { w.calcPrev(); } catch (e) { }
  toast('➕ ' + L('أُدرج الدين في «باقي سابق»: ', 'Solde précédent ajouté : ') + money(amt) + ' DH');
  App.render();
});

var C360_LAST = null;
App.act('c360-open', function (el) {
  var d = client360Data({ id: el.dataset.id, name: el.dataset.name, phone: el.dataset.phone, police: el.dataset.police, plate: el.dataset.plate });
  if (!d) { toast(L('لا توجد بيانات كافية للزبون', 'Données client insuffisantes'), 'err'); return; }
  C360_LAST = d;
  var totDue = Math.round((d.debtTotal + d.unpaidSum) * 100) / 100;
  var h = Modal.head('🌐 ' + L('ملف الزبون الشامل 360° — ', 'Fiche Client 360° — ') + esc(d.name))
    + '<div class="chips wrap" style="margin-bottom:10px">'
      + (d.phone ? '<span class="dc ok">📞 ' + ltr(d.phone) + '</span>' : '')
      + '<span class="dc">🚘 ' + d.contracts.length + ' ' + L('عقود', 'contrats') + '</span>'
      + '<span class="dc ' + (totDue > 0 ? 'red' : 'ok') + '">💰 ' + L('الديون والباقي: ', 'Reste dû : ') + moneyH(totDue, 1) + '</span>'
      + '<span class="dc">🧮 ' + d.ops.length + ' ' + L('عمليات بالحاسبة', 'opérations calc.') + '</span>'
      + '<span class="dc ' + (d.sins.length ? 'amber' : '') + '">🚗 ' + d.sins.length + ' ' + L('حوادث', 'sinistres') + '</span>'
    + '</div>';

  /* زر واتساب مجمّع للأسطول إذا كان عند الزبون أكثر من مركبة */
  if (d.contracts.length > 1 && d.phone) {
    h += '<button class="btn wa wide" style="margin-bottom:10px" data-act="c360-wa-fleet">💬 ' + L('إرسال رسالة واتساب مجمّعة لكل مركبات الزبون (' + d.contracts.length + ')', 'WhatsApp groupé pour la flotte (' + d.contracts.length + ' véhicules)') + '</button>';
  }

  /* 1. الديون والعمليات غير المؤداة */
  if (d.debts.length || d.unpaidOps.length || d.rtPend.length) {
    h += '<div class="card" style="border-color:var(--red);margin-bottom:10px"><div class="card-t">⚠️ ' + L('الديون والعمليات غير المؤداة', 'Dettes et opérations non payées') + '</div>';
    d.debts.forEach(function (x) {
      var r = typeof dRest === 'function' ? dRest(x) : ((+x.solde || 0) - (+x.avance || 0));
      h += '<div class="kv"><span>📋 ' + esc(x.assure || '') + ' · ' + ltr(x.police || '') + (x.dateE ? ' · ' + fmtD(x.dateE) : '') + '</span><b class="red-t ltr">' + moneyH(r, 1) + '</b></div>';
    });
    d.unpaidOps.forEach(function (x) {
      var r = x.unpaid ? (+x.off || Math.abs(+x.diff || 0)) : Math.abs(+x.diff || 0);
      h += '<div class="kv"><span>🧮 ' + esc(x.num || '') + ' · ' + esc(x.date || '') + ' · ' + ltr(x.plate || '') + ' (' + (x.unpaid ? L('لم يدفع', 'Non payé') : L('فرق ناقص', 'Écart')) + ')</span><b class="amber-t ltr">' + moneyH(r, 1) + '</b></div>';
    });
    d.rtPend.forEach(function (x) {
      h += '<div class="kv"><span>⏳ ' + L('متابعة شهادة: ', 'Suivi : ') + ltr(x.matricule || x.police || '') + ' · ' + esc(x.requestDate || '') + '</span><b class="ltr">' + moneyH(+x.price || 0, 1) + '</b></div>';
    });
    h += '</div>';
  }

  /* 2. عقود ومركبات الزبون */
  h += '<div class="card" style="margin-bottom:10px"><div class="card-t">🚘 ' + L('العقود والمركبات المسجلة', 'Contrats et véhicules') + ' (' + d.contracts.length + ')</div>'
    + (d.contracts.length ? d.contracts.map(function (c) {
        return '<div class="kv"><span><b>' + esc(c.marque || c.vehType || L('مركبة', 'Véhicule')) + '</b> · ' + (c.plate ? ltr(c.plate) : '—') + ' · ' + (c.police ? ltr(typeof polFull === 'function' ? polFull(c) : c.police) : '') + '</span>'
          + '<b>' + (c.dateE ? fmtD(c.dateE) + ' ' : '') + (typeof daysChip === 'function' ? daysChip(c) : '') + '</b></div>';
      }).join('') : '<div class="muted sm">' + L('لا توجد عقود في لائحة التجديد الحالية', 'Aucun contrat dans la liste actuelle') + '</div>')
    + '</div>';

  /* 3. سجل العمليات بالحاسبة */
  h += '<div class="card" style="margin-bottom:10px"><div class="card-t">🧮 ' + L('آخر العمليات بالحاسبة', 'Dernières opérations calculatrice') + ' (' + d.ops.length + ')</div>'
    + (d.ops.length ? d.ops.slice(0, 12).map(function (x) {
        return '<div class="kv"><span><b class="ltr">' + esc(x.num || '') + '</b> · ' + esc(x.date || '') + (x.plate ? ' · ' + ltr(x.plate) : '') + ' · ' + esc(x.ins || '') + '</span>'
          + '<b class="ltr">' + money(+x.paid || 0) + ' / ' + money(+x.off || 0) + ' DH</b></div>';
      }).join('') : '<div class="muted sm">' + L('لا توجد عمليات مسجلة', 'Aucune opération') + '</div>')
    + '</div>';

  /* 4. ملفات الحوادث */
  h += '<div class="card"><div class="card-t">🚗 ' + L('سجل الحوادث', 'Sinistres') + ' (' + d.sins.length + ')</div>'
    + (d.sins.length ? d.sins.map(function (s) {
        return '<div class="kv"><span><b>N° ' + esc(s.ordre || s.dossier || '') + '</b> · ' + esc(s.dateSin || '') + ' · ' + esc(s.advCie || '') + ' (' + esc(s.statut || 'en_cours') + ')</span>'
          + '<b>' + esc(s.obs || (s.regMontant ? s.regMontant + ' DH' : '—')) + '</b></div>';
      }).join('') : '<div class="muted sm">' + L('لا توجد حوادث مسجلة لهذا الزبون', 'Aucun sinistre enregistré') + '</div>')
    + '</div>';

  Modal.open(h, 'wide');
});

App.act('c360-wa-fleet', function () {
  var d = C360_LAST; if (!d || !d.phone || !d.contracts.length) return;
  var fr = msgLang() === 'fr';
  var lines = d.contracts.map(function (c, i) {
    return (i + 1) + '. ' + (c.marque || c.vehType || (fr ? 'Véhicule' : 'مركبة')) + ' [' + (c.plate || '—') + '] — ' + (fr ? 'Police : ' : 'البوليصة: ') + (typeof polFull === 'function' ? polFull(c) : (c.police || '—')) + ' — ' + (fr ? 'Échéance : ' : 'الانتهاء: ') + (c.dateE ? fmtD(c.dateE) : '—') + (c.prime ? ' (' + money(c.prime) + ' DH)' : '');
  }).join('\n');
  var totPrime = d.contracts.reduce(function (s, c) { return s + (+c.prime || 0); }, 0);
  var msg = fr
    ? 'Bonjour ' + d.name + ',\nVoici le récapitulatif d\'échéance de votre flotte d\'assurance (' + d.contracts.length + ' véhicules) :\n\n' + lines + (totPrime ? '\n\nTotal estimé : ' + money(totPrime) + ' DH' : '') + '\n\nMerci de nous contacter pour procéder au renouvellement.'
    : 'السلام عليكم ' + d.name + '،\nنوافيكم ببيان عقود تأمين مركباتكم (' + d.contracts.length + ' مركبات) :\n\n' + lines + (totPrime ? '\n\nالمجموع التقديري: ' + money(totPrime) + ' درهم' : '') + '\n\nمرجو التواصل معنا لتجديد العقود في الوقت المناسب. شكراً لثقتكم.';
  if (typeof WA !== 'undefined' && WA.open) WA.open(d.phone, msg, { title: d.name + ' (' + d.contracts.length + ')' });
});

/* ══════════════════════════════════════════════════════════
   📋 مُنشئ عروض الأسعار (Devis d'Assurance PDF / WhatsApp)
══════════════════════════════════════════════════════════ */
function n7DevisList() {
  var a = Local.get('n7_devis_list', []);
  return Array.isArray(a) ? a : [];
}
function n7CalcDurs(w) {
  var st = n8St(w), curDur = +n7v(w, 'dur') || 12;
  var durs = [1, 3, 6, 12], prices = {};
  durs.forEach(function (d) {
    var copy = {};
    for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k)) copy[k] = st[k];
    copy.dur = d;
    try {
      var res = Eng.price(copy);
      prices[d] = res && res.ok ? res.price : 0;
    } catch (e) { prices[d] = 0; }
  });
  var curPrice = prices[curDur] || n7Off(w) || 0;
  return { curDur: curDur, curPrice: curPrice, prices: prices };
}
function n7DevisCurrent(w) {
  var calc = n7CalcDurs(w);
  var tar = n7v(w, 'tarif') === 'cat' ? 'CAT Assurance' : 'Wafa Assurance';
  return {
    id: 'DEV-' + Date.now(),
    at: Date.now(),
    date: fmtD(todayISO()),
    by: App.user ? App.user.name : '',
    client: n7v(w, 'client').trim() || L('زبون محتمل', 'Client prospect'),
    phone: '',
    plate: n7v(w, 'plate').trim(),
    tarif: n7v(w, 'tarif'),
    tarifLbl: tar,
    type: n7v(w, 'ins-type'),
    fuel: n7v(w, 'fuel'),
    cv: n7v(w, 'cv'),
    ccv: n7v(w, 'comm-cv'),
    moto: n7v(w, 'moto-cat'),
    cam: n7v(w, 'cam-ton'),
    dur: calc.curDur,
    bm: w.BM,
    usage: w.USAGE,
    desc: n7Desc(w),
    off: calc.curPrice,
    prices: calc.prices
  };
}
var N7_DEVIS_CUR = null;

App.act('n7-devis', function () {
  var w = ce7(); if (!w) return;
  var dv = n7DevisCurrent(w);
  N7_DEVIS_CUR = dv;
  var durLbl = function (m) { return m === 12 ? L('سنة واحدة (12 شهر)', '1 An (12 mois)') : m + ' ' + L('أشهر', 'mois'); };
  var h = Modal.head('📋 ' + L('عرض سعر التأمين (Devis)', 'Devis d\'Assurance'))
    + '<div class="card" style="margin-bottom:10px">'
      + '<div class="kv"><span>👤 ' + L('الزبون', 'Client') + '</span><b>' + esc(dv.client) + (dv.plate ? ' · <span class="ltr">' + esc(dv.plate) + '</span>' : '') + '</b></div>'
      + '<div class="kv"><span>🛡️ ' + L('التغطية والمواصفات', 'Formule') + '</span><b>' + esc(dv.tarifLbl) + ' · ' + esc(dv.desc) + '</b></div>'
      + '<div class="kv"><span>📅 ' + L('المدة المختارة', 'Durée sélectionnée') + '</span><b class="ltr" style="font-size:16px;color:var(--pri)">' + money(dv.off) + ' DH (' + durLbl(dv.dur) + ')</b></div>'
    + '</div>'
    + '<div class="card" style="margin-bottom:10px"><div class="card-t">📊 ' + L('مقارنة الأسعار حسب المدة', 'Comparatif par durée') + '</div>'
      + '<div class="sec-tw"><table class="sec-t"><thead><tr><th>' + L('المدة', 'Durée') + '</th><th>' + L('السعر الرسمي', 'Prime TTC') + '</th></tr></thead><tbody>'
      + [1, 3, 6, 12].map(function (m) {
          var p = dv.prices[m] || 0;
          return '<tr' + (m === dv.dur ? ' style="background:rgba(37,99,235,.08)"' : '') + '><td><b>' + durLbl(m) + '</b></td><td class="ltr"><b>' + (p ? money(p) + ' DH' : '—') + '</b></td></tr>';
        }).join('')
      + '</tbody></table></div></div>'
    + '<div class="acts2" style="flex-wrap:wrap">'
      + '<button class="btn pri" data-act="n7-devis-print">🖨️ ' + L('طباعة / PDF', 'Imprimer / PDF') + '</button>'
      + '<button class="btn wa" data-act="n7-devis-wa">💬 ' + L('إرسال عبر واتساب', 'Envoyer WhatsApp') + '</button>'
      + '<button class="btn" data-act="n7-devis-save">💾 ' + L('حفظ في عروض الأسعار', 'Sauvegarder le devis') + '</button>'
    + '</div>';
  Modal.open(h, 'small');
});

App.act('n7-devis-save', function () {
  if (!N7_DEVIS_CUR) return;
  var list = n7DevisList();
  list.unshift(N7_DEVIS_CUR);
  Local.set('n7_devis_list', list.slice(0, 40));
  toast('💾 ' + L('تم حفظ عرض السعر بدون تسجيل في الصندوق', 'Devis sauvegardé (sans impact caisse)'));
  Modal.close();
  App.render();
});

App.act('n7-devis-wa', function () {
  var dv = N7_DEVIS_CUR; if (!dv) return;
  var fr = msgLang() === 'fr';
  var lines = [1, 3, 6, 12].filter(function (m) { return dv.prices[m] > 0; }).map(function (m) {
    return '• ' + (m === 12 ? (fr ? '1 An' : 'سنة كاملة') : m + (fr ? ' mois' : ' أشهر')) + ' : *' + money(dv.prices[m]) + ' DH*';
  }).join('\n');
  var msg = fr
    ? '📋 *DEVIS D\'ASSURANCE AUTO*\nClient : ' + dv.client + (dv.plate ? ' (' + dv.plate + ')' : '') + '\nCompagnie : ' + dv.tarifLbl + '\nFormule : ' + dv.desc + '\n\n*Tarifs estimatifs :*\n' + lines + '\n\nDevis valable 7 jours. À votre disposition pour souscrire.'
    : '📋 *عرض سعر تأمين المركبة (Devis)*\nالزبون: ' + dv.client + (dv.plate ? ' (' + dv.plate + ')' : '') + '\nالشركة: ' + dv.tarifLbl + '\nالمواصفات: ' + dv.desc + '\n\n*الأسعار المقترحة حسب المدة:*\n' + lines + '\n\nالعرض صالح لمدة 7 أيام. مرحباً بكم لتأكيد العقد في أي وقت.';
  var ph = dv.phone || '';
  if (!ph && typeof Contacts !== 'undefined' && Array.isArray(Contacts.list)) {
    var m = Contacts.list.filter(function (c) { return !c.deleted && ((dv.plate && kPlate(c.plate) === kPlate(dv.plate)) || (c.name && c360NormName(c.name) === c360NormName(dv.client))); })[0];
    if (m && m.phone) ph = m.phone;
  }
  if (!ph) ph = prompt(L('أدخل رقم واتساب الزبون:', 'Numéro WhatsApp du client :'), '') || '';
  if (ph.trim() && typeof WA !== 'undefined' && WA.open) { Modal.close(); WA.open(ph.trim(), msg, { title: 'Devis — ' + dv.client }); }
});

App.act('n7-devis-print', function () {
  var dv = N7_DEVIS_CUR; if (!dv) return;
  var rows = [1, 3, 6, 12].map(function (m) {
    var p = dv.prices[m] || 0;
    return '<tr' + (m === dv.dur ? ' style="background:#eff6ff;font-weight:700"' : '') + '><td>' + (m === 12 ? '1 An (12 mois)' : m + ' mois') + '</td><td style="text-align:right">' + (p ? money(p) + ' DH' : '—') + '</td></tr>';
  }).join('');
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Devis - ' + esc(dv.client) + '</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111;max-width:720px;margin:auto}h1{margin:0 0 4px;font-size:22px;color:#1e3a8a}small{color:#666}.box{border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin:14px 0}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left}th{background:#f8fafc}.foot{margin-top:24px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:center"><div><h1>DEVIS D\'ASSURANCE</h1><small>Offre indicative sans engagement</small></div><div style="text-align:right"><b>' + esc(dv.id) + '</b><br><small>Date : ' + esc(dv.date) + '</small></div></div>'
    + '<div class="box"><b>Client :</b> ' + esc(dv.client) + (dv.plate ? ' &nbsp;|&nbsp; <b>Immat. :</b> ' + esc(dv.plate) : '') + '<br><b>Compagnie :</b> ' + esc(dv.tarifLbl) + ' &nbsp;|&nbsp; <b>Formule :</b> ' + esc(dv.desc) + '</div>'
    + '<table><thead><tr><th>Durée de garantie</th><th style="text-align:right">Prime Totale TTC</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="foot">Devis valable 7 jours sous réserve de vérification des pièces du véhicule. Établi par : ' + esc(dv.by || 'Agence') + '.</div>'
    + '<script>window.onload=function(){window.print();};</script></body></html>';
  var win = window.open('', '_blank');
  if (win) { win.document.open(); win.document.write(html); win.document.close(); }
});

App.act('n7-devis-list', function () {
  var list = n7DevisList();
  var h = Modal.head('📋 ' + L('عروض الأسعار المحفوظة', 'Devis sauvegardés') + ' (' + list.length + ')')
    + (list.length ? '<div class="sec-tw" style="max-height:55vh;overflow:auto"><table class="sec-t"><thead><tr><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('المواصفات', 'Formule') + '</th><th>' + L('السعر', 'Prix') + '</th><th></th></tr></thead><tbody>'
      + list.map(function (d, i) {
          return '<tr><td class="ltr">' + esc(d.date) + '</td><td><b>' + esc(d.client) + '</b>' + (d.plate ? ' <small class="ltr">' + esc(d.plate) + '</small>' : '') + '</td><td>' + esc(d.tarifLbl + ' · ' + d.desc) + '</td><td class="ltr"><b>' + money(d.off) + ' DH</b></td>'
            + '<td style="white-space:nowrap"><button class="btn sm pri" data-act="n7-devis-load" data-i="' + i + '">↩ ' + L('فتح', 'Charger') + '</button> <button class="btn sm red-o" data-act="n7-devis-del" data-i="' + i + '">✕</button></td></tr>';
        }).join('')
      + '</tbody></table></div>'
      : '<div class="empty">📋 ' + L('لا توجد عروض أسعار محفوظة', 'Aucun devis sauvegardé') + '</div>');
  Modal.open(h, 'wide');
});

App.act('n7-devis-load', function (el) {
  var list = n7DevisList(), d = list[+el.dataset.i], w = ce7();
  if (!d || !w) return;
  try {
    if (d.tarif) w.setTarif(d.tarif);
    if (d.type) w.setType(d.type);
    if (d.fuel) w.setFuel(d.fuel);
    if (d.dur) w.setDur(d.dur);
    if (d.bm) w.setBM(d.bm);
    if (d.usage) w.setUsage(d.usage);
    n7set(w, 'client', d.client || '');
    n7set(w, 'plate', d.plate || '');
    if (d.cv) n7set(w, 'cv', d.cv);
    if (d.ccv) n7set(w, 'comm-cv', d.ccv);
    if (d.moto) n7set(w, 'moto-cat', d.moto);
    if (d.cam) n7set(w, 'cam-ton', d.cam);
    try { w.fillP(); } catch (e) { }
  } catch (e) { }
  Modal.close();
  toast('↩ ' + L('تم تحميل عرض السعر في الحاسبة', 'Devis chargé dans la calculatrice'));
  App.render();
});

App.act('n7-devis-del', function (el) {
  var list = n7DevisList();
  list.splice(+el.dataset.i, 1);
  Local.set('n7_devis_list', list);
  App.acts['n7-devis-list']();
  App.render();
});
