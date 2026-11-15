/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-calc-hist.js   (B1: «سجل العمليات» صفحة أصلية)
   نفس السجل ديال الحاسبة (HIST)، نفس الصلاحيات (المدير كيشوف الكل، الموظف غير ديالو)،
   نفس الأفعال: 💰 خلّص (لم يدفع) · ✏️ تعديل · 🖨️ الوصل · 🧾 Pièce · 🗑️ حذف (المدير).
   الحفظ ديما عبر المحرك (svH) ← الدمج والربط مع التجديد كيبقاو بحال قبل.
══════════════════════════════════════════════════════════ */
'use strict';
var H7 = { f: 'today', day: '', q: '', agent: '', ins: '', cie: '', limit: 150 };
CE7.native['c-hist'] = true;

function h7Source(w) {
  w.ldH(); var cur = w.CUR || {};
  return cur.isAdmin ? w.HIST : w.HIST.filter(function (h) { return h.user === cur.n; });
}
function h7Filter(list) {
  var now = new Date(), today = ce7DMY(now), q = H7.q.toLowerCase().trim();
  return list.filter(function (h) {
    if (q && [h.client, h.plate, h.num, h.user, h.ins, h.police, h.phone, h.attest].join(' ').toLowerCase().indexOf(q) < 0) return false;
    if (H7.agent && h.user !== H7.agent) return false;
    if (H7.ins && h.ins !== H7.ins) return false;
    if (!h7CieOk(h)) return false;
    if (H7.f === 'today') return h.date === today;
    if (H7.f === 'unpaid') return !!h.unpaid;
    if (H7.f === 'date') return h.date === H7.day;
    var d = ce7Date(h.date); if (!d) return H7.f === 'all';
    if (H7.f === 'week') return (now - d) / 86400000 <= 7;
    if (H7.f === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}
/* 7.17: الشركة ديال العملية (بلا خانة جديدة):
   CAT = TPV (فيها Taxi) · البوليصة C…/CF… · الوصف «CAT …» · الدفع المباشر «⚡ [CAT]» ؛ Ristourne = المبلغ بالسالب ؛ الباقي Wafa */
function h7Cie(h) {
  var p = String(h.police || '').trim().toUpperCase(), ins = String(h.ins || '');
  if (h.directPay) return /\[CAT\]/.test(ins) ? 'cat' : /\[WAFA\]/i.test(ins) ? 'wafa' : '';
  if (h.tarif === 'tpv' || /^C[A-Z]?\d{4}\//.test(p) || /^CAT\b|\bTPV\b/.test(ins)) return 'cat';
  return 'wafa';
}
function h7Rist(h) { return ce7Num(h.paid) < 0 || ce7Num(h.off) < 0; }
function h7CieOk(h) { return !H7.cie || (H7.cie === 'rist' ? h7Rist(h) : h7Cie(h) === H7.cie); }
function h7Badge(h) { var c = h7Cie(h); return (c ? '<span class="h7-cie ' + c + '">' + (c === 'cat' ? 'CAT' : 'Wafa') + '</span>' : '') + (h7Rist(h) ? '<span class="h7-cie rist">Ristourne</span>' : ''); }
function h7PM(h) { return h.payMode === 'cheque' ? ['📄', L('شيك', 'Chèque')] : h.payMode === 'tpe' ? ['💳', 'TPE'] : ['💵', L('كاش', 'Espèces')]; }

function h7Tabs(src) {
  var o = H7.cie, tab = function (k, lbl) { H7.cie = k; var l = h7Filter(src), n = l.length, sum = l.reduce(function (s, h) { return s + (h.unpaid ? 0 : ce7Num(h.paid)); }, 0); H7.cie = o;
    return '<button class="h7-tab ' + (k || 'all') + (o === k ? ' on' : '') + '" data-act="h7-cie" data-v="' + k + '"><span>' + lbl + '</span><b>' + n + '</b><small class="ltr">' + moneyH(sum, 1) + '</small></button>'; };
  return '<div class="h7-tabs">' + tab('', L('الكل', 'Tout')) + tab('wafa', 'Wafa') + tab('cat', 'CAT') + tab('rist', 'Ristourne') + '</div>';
}
function renderHist7(el) {
  var w = ce7();
  if (!w) { el.innerHTML = '<div class="page"><div class="empty">⏳ ' + L('كنحلّو الحاسبة…', 'Chargement de la calculatrice…') + '</div></div>'; ce7Wait(function () { if (App.page === 'c-hist') App.render(); }); return; }
  var src = h7Source(w), list = h7Filter(src), adm = !!(w.CUR && w.CUR.isAdmin), today = ce7DMY(new Date());
  var agents = [], types = []; src.forEach(function (h) { if (h.user && agents.indexOf(h.user) < 0) agents.push(h.user); if (h.ins && types.indexOf(h.ins) < 0) types.push(h.ins); });
  agents.sort(); types.sort();
  var cnt = function (f) { var o = H7.f, d = H7.day; H7.f = f; var n = h7Filter(src).length; H7.f = o; H7.day = d; return n; };
  var paid = list.reduce(function (s, h) { return s + (h.unpaid ? 0 : ce7Num(h.paid)); }, 0), due = list.reduce(function (s, h) { return s + ce7Num(h.off); }, 0);
  var unp = list.filter(function (h) { return h.unpaid; }), unpSum = unp.reduce(function (s, h) { return s + Math.abs(ce7Num(h.diff) || ce7Num(h.off)); }, 0);
  var chip = function (f, lbl) { return '<button class="chip' + (H7.f === f ? ' on' : '') + '" data-act="h7-f" data-f="' + f + '">' + lbl + ' <b>' + cnt(f) + '</b></button>'; };
  var dateIso = H7.f === 'date' && H7.day ? H7.day.split('/').reverse().join('-') : '';

  /* السطور، مجموعين باليوم */
  var shown = list.slice(0, H7.limit), groups = [], by = {};
  shown.forEach(function (h) { var d = h.date || '—'; if (!by[d]) { by[d] = []; groups.push(d); } by[d].push(h); });
  var desk = isDesktop();
  var acts = function (h) { var i = w.HIST.indexOf(h);
    return (h.unpaid ? '<button class="ib h7-pay" data-act="h7-pay" data-i="' + i + '" title="' + L('خلّص', 'Payer') + '">💰</button>' : '')
      + '<button class="ib" data-act="c360-open" data-name="' + esc(h.client || '') + '" data-phone="' + esc(h.phone || '') + '" data-police="' + esc(h.police || '') + '" data-plate="' + esc(h.plate || h.matricule || '') + '" title="' + L('ملف الزبون 360°', 'Fiche client 360°') + '">🌐</button>'
      + '<button class="ib" data-act="h7-edit" data-i="' + i + '" title="' + L('تعديل', 'Modifier') + '">✏️</button>'
      + '<button class="ib" data-act="h7-rec" data-i="' + i + '" title="' + L('الوصل', 'Reçu') + '">🖨️</button>'
      + '<button class="ib" data-act="h7-piece" data-i="' + i + '" title="Pièce de recette">🧾</button>'
      + '<button class="ib" data-act="h7-fac" data-i="' + i + '" title="Facture">📑</button>'
      + (adm ? '<button class="ib h7-del" data-act="h7-del" data-i="' + i + '" title="' + L('حذف', 'Supprimer') + '">🗑️</button>' : ''); };
  var diffH = function (h) { var d = ce7Num(h.diff); return '<span class="h7-diff ' + (d > 0 ? 'pos' : d < 0 ? 'neg' : '') + '">' + (d > 0 ? '↩ ' : d < 0 ? '⚠ ' : '✓ ') + moneyH(Math.abs(d)) + '</span>'; };
  var stH = function (h) { return h.unpaid ? '<span class="dc amber">⏳ ' + L('لم يدفع', 'Non payé') + '</span>' : h.paidDate ? '<span class="dc ok">💰 ' + esc(h.paidDate) + '</span>' : ''; };
  var body = !list.length ? '<div class="empty">📋 ' + L('ما كاين حتى عملية', 'Aucune opération') + '</div>'
    : groups.map(function (d) {
      var rows = by[d], tot = rows.reduce(function (s, h) { return s + (h.unpaid ? 0 : ce7Num(h.paid)); }, 0);
      var head = '<div class="h7-dd"><b>' + esc(d === today ? L('اليوم', 'Aujourd\'hui') + ' · ' + d : d) + '</b><span>' + rows.length + ' ' + L('عملية', 'opér.') + ' · ' + moneyH(tot, 1) + '</span></div>';
      if (desk) return head + '<div class="tbl-wrap"><table class="tbl h7-tbl"><thead><tr><th>N°</th><th>' + L('الساعة', 'Heure') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('اللوحة', 'Immat.') + '</th><th>' + L('النوع', 'Type') + '</th><th>' + L('الأداء', 'Paiement') + '</th><th>' + L('المدفوع / الرسمي', 'Payé / officiel') + '</th><th>' + L('الفرق', 'Écart') + '</th>' + (adm ? '<th>' + L('الموظف', 'Agent') + '</th>' : '') + '<th></th></tr></thead><tbody>'
        + rows.map(function (h) { var pm = h7PM(h);
          return '<tr' + (h.unpaid ? ' class="h7-unp"' : '') + '><td class="ltr"><b>' + esc(h.num) + '</b></td><td class="ltr">' + esc(h.time || '') + '</td><td><b>' + esc(h.client || '—') + '</b> ' + h7Badge(h) + stH(h) + '</td><td class="ltr">' + esc(h.plate || '') + '</td>'
            + '<td>' + esc(h.ins || '') + '</td><td>' + pm[0] + ' ' + pm[1] + '</td><td class="ltr"><b>' + money(ce7Num(h.paid)) + '</b> <span class="muted">/ ' + money(ce7Num(h.off)) + '</span></td><td>' + diffH(h) + '</td>'
            + (adm ? '<td>' + esc(h.user || '') + '</td>' : '') + '<td class="t-acts">' + acts(h) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      return head + '<div class="rows">' + rows.map(function (h) { var pm = h7PM(h);
        return '<div class="row h7-row' + (h.unpaid ? ' h7-unp' : '') + '"><div class="row-main"><div class="row-name">' + esc(h.client || '—') + ' ' + h7Badge(h) + stH(h) + '</div>'
          + '<div class="row-sub"><span class="ltr">' + esc(h.num) + '</span> · ' + esc(h.time || '') + (h.plate ? ' · ' + ltr(h.plate) : '') + ' · ' + esc(h.ins || '') + ' · ' + pm[0] + '</div></div>'
          + '<div class="row-side"><b class="ltr">' + money(ce7Num(h.paid)) + '</b></div><div class="row-acts">' + acts(h) + '</div></div>'; }).join('') + '</div>';
    }).join('')
    + (list.length > shown.length ? '<button class="btn wide" data-act="h7-more">▼ ' + L('عرض المزيد', 'Afficher plus') + ' (' + (list.length - shown.length) + ')</button>' : '');

  el.innerHTML = '<div class="page h7p">'
    + '<div class="bar h7-bar"><div class="search"><span>🔍</span><input id="h7-q" data-inp="h7-q" autocomplete="off" placeholder="' + L('الزبون، اللوحة، الرقم، البوليصة…', 'Client, immat., N°, police…') + '" value="' + esc(H7.q) + '"></div></div>'
    + h7Tabs(src)
    + '<div class="chips h7-chips">' + chip('today', L('اليوم', 'Aujourd\'hui')) + chip('week', L('7 أيام', '7 jours')) + chip('month', L('هاد الشهر', 'Ce mois')) + chip('all', L('الكل', 'Tout')) + chip('unpaid', '⏳ ' + L('لم يدفع', 'Non payés'))
      + '<label class="chip h7-dpick' + (H7.f === 'date' ? ' on' : '') + '">📅 <input type="date" data-inp="h7-date" value="' + dateIso + '"></label></div>'
    + '<div class="h7-fil">' + (adm && agents.length > 1 ? '<select class="inp" data-inp="h7-agent"><option value="">👤 ' + L('كل الموظفين', 'Tous agents') + '</option>' + agents.map(function (a) { return '<option' + (a === H7.agent ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select>' : '')
      + (types.length > 1 ? '<select class="inp" data-inp="h7-ins"><option value="">🛡️ ' + L('كل الأنواع', 'Tous types') + '</option>' + types.map(function (t) { return '<option' + (t === H7.ins ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' : '') + '</div>'
    + '<div class="acts2 h7-acts"><button class="btn pri" data-act="fab7">➕ ' + L('عملية جديدة', 'Nouvelle opération') + '</button><button class="btn" data-act="fac8-list">📑 ' + L('أرشيف الفواتير', 'Factures') + '</button><button class="btn" data-act="h7-xls">📥 Excel</button><label class="btn h7-bord">📊 ' + L('البوردورو', 'Bordereau') + '<input type="file" accept=".xlsx,.xls" data-inp="h7-bord" hidden></label></div>'
    + '<div class="h7-sum"><span><b>' + list.length + '</b> ' + L('عملية', 'opérations') + '</span><span>' + L('المقبوض', 'Encaissé') + ' <b>' + moneyH(paid, 1) + '</b></span><span>' + L('الرسمي', 'Officiel') + ' <b>' + moneyH(due, 1) + '</b></span>'
      + (unp.length ? '<span class="amber-t">⏳ ' + unp.length + ' · ' + moneyH(unpSum, 1) + '</span>' : '') + '</div>'
    + body + '</div>';
}
App.input('h7-q', debounce(function (el) { H7.q = el.value; H7.limit = 150; var p = el.selectionStart; App.render(); var i = $('h7-q'); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (e) { } } }, 200));
App.input('h7-bord', function (el) { var f = el.files && el.files[0]; el.value = ''; if (f && typeof Bord8 !== 'undefined') Bord8.open(f); });
App.act('h7-cie', function (el) { H7.cie = el.dataset.v; H7.limit = 150; App.render(); });
App.act('h7-f', function (el) { H7.f = el.dataset.f; H7.limit = 150; App.render(); });
App.input('h7-date', function (el) { if (!el.value) { H7.f = 'today'; } else { H7.f = 'date'; H7.day = el.value.split('-').reverse().join('/'); } App.render(); });
App.input('h7-agent', function (el) { H7.agent = el.value; App.render(); });
App.input('h7-ins', function (el) { H7.ins = el.value; App.render(); });
App.act('h7-more', function () { H7.limit += 300; App.render(); });

function h7Get(el) { var w = ce7(), i = +el.dataset.i; return w && w.HIST[i] ? { w: w, h: w.HIST[i], i: i } : null; }
App.act('h7-rec', function (el) { var x = h7Get(el); if (!x) return; x.w.buildRecFromHist(x.h); ce7Overlay(['receipt']); });
App.act('h7-piece', function (el) { var x = h7Get(el); if (!x) return; x.w.buildPieceReceiptFromHist(x.h); ce7Overlay(['receipt-piece']); });
App.act('h7-pay', function (el) { var x = h7Get(el); if (!x) return; x.w.payUnpaid(x.w.upKey(x.h)); App.go('calc'); });
App.act('h7-del', function (el) {
  var x = h7Get(el); if (!x || !(x.w.CUR && x.w.CUR.isAdmin)) return;
  if (!confirm(L('حذف العملية ', 'Supprimer l\'opération ') + x.h.num + ' — ' + (x.h.client || '') + ' ؟')) return;
  x.w.HIST.splice(x.i, 1); x.w.svH(); if (x.w.updateQuickStats) try { x.w.updateQuickStats(); } catch (e) { }
  toast('🗑️ ' + L('تحذفات', 'Supprimée')); App.render();
});
/* ✏️ التعديل: نفس الخانات ونفس القواعد ديال الحاسبة (saveHistEdit) */
var H7_EDIT = [['client', 'الزبون', 'Client'], ['police', 'البوليصة', 'Police'], ['attest', 'الشهادة', 'Attestation'], ['plate', 'اللوحة', 'Immatriculation'], ['marque', 'الماركة', 'Marque'], ['phone', 'الهاتف', 'Téléphone'], ['ins', 'النوع', 'Type'], ['paid', 'المدفوع (DH)', 'Payé (DH)'], ['off', 'الرسمي (DH)', 'Officiel (DH)']];
App.act('h7-edit', function (el) {
  var x = h7Get(el); if (!x) return; var h = x.h;
  var v = { client: h.client, police: h.police || h.num, attest: h.attest, plate: h.plate || h.matricule, marque: h.marque, phone: h.phone, ins: h.ins, paid: h.paid || 0, off: h.off || 0 };
  Modal.open(Modal.head('✏️ ' + esc(h.num) + ' — ' + esc(h.client || ''))
    + '<div class="form h7-form">' + H7_EDIT.map(function (f) { var num = f[0] === 'paid' || f[0] === 'off';
      return '<label class="f"><span>' + L(f[1], f[2]) + '</span><input id="h7e-' + f[0] + '"' + (num ? ' type="number" step="0.01" inputmode="decimal"' : '') + (/police|attest|plate|phone/.test(f[0]) ? ' dir="ltr"' : '') + ' value="' + esc(v[f[0]] == null ? '' : v[f[0]]) + '"></label>'; }).join('') + '</div>'
    + '<button class="btn pri wide" data-act="h7-save" data-i="' + x.i + '" data-num="' + esc(h.num) + '">💾 ' + L('حفظ التعديلات', 'Enregistrer') + '</button>', 'small');
});
App.act('h7-save', function (el) {
  var x = h7Get(el); if (!x || x.h.num !== el.dataset.num) { toast(L('السجل تبدّل، عاود حل العملية', 'Historique modifié, rouvrez l\'opération'), 'err'); Modal.close(); return; }
  var h = x.h, g = function (k) { var e = $('h7e-' + k); return e ? e.value.trim() : ''; };
  h.client = g('client') || h.client; h.police = g('police'); h.attest = g('attest'); h.plate = g('plate'); h.matricule = h.plate; h.marque = g('marque'); h.phone = g('phone');
  var np = parseFloat(g('paid')), no = parseFloat(g('off'));
  if (!isNaN(np)) h.paid = np; if (!isNaN(no)) h.off = no; if (!isNaN(np) && !isNaN(no)) h.diff = Math.round((np - no) * 100) / 100;
  if (g('ins')) h.ins = g('ins');
  x.w.svH(); Modal.close(); toast('💾 ' + L('تحفظ', 'Enregistré')); App.render();
});
App.act('h7-xls', function () {
  var w = ce7(); if (!w) return; var list = h7Filter(h7Source(w));
  if (!list.length) { toast(L('ما كاين والو', 'Rien à exporter'), 'err'); return; }
  var rows = list.map(function (h) { return { 'N°': h.num, Date: h.date, Heure: h.time || '', Client: h.client || '', Immatriculation: h.plate || '', Police: h.police || '', Attestation: h.attest || '', Type: h.ins || '',
    Paiement: h.payMode || 'cash', 'Payé': ce7Num(h.paid), Officiel: ce7Num(h.off), 'Écart': ce7Num(h.diff), 'Non payé': h.unpaid ? 'oui' : '', Agent: h.user || '', Compagnie: h7Cie(h) === 'cat' ? 'CAT' : h7Cie(h) ? 'Wafa' : '', Ristourne: h7Rist(h) ? 'oui' : '' }; });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Historique');
  XLSX.writeFile(wb, 'historique_' + todayISO() + '.xlsx');
});
(function () { var m = App.mod('c-hist'); if (m) m.render = renderHist7; })();
/* نفس الشكل الجديد: العنوان + البحث + الفلاتر */
if (typeof LAY7 !== 'undefined') LAY7['c-hist'] = { search: '.h7-bar > .search', row: ['.h7-chips'], fil: ['.h7-fil'], acts: ['.h7-acts'] };
App.on('login', function () { var m = App.mod('c-hist'); if (m && m.render !== renderHist7 && !m._lay7) m.render = renderHist7; });
