/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-renew.js   (⏳ متابعة التجديدات · صفحة أصلية · المرحلة 4)
   نفس البيانات (eurv102_renewals ↔ Firestore calc/renewals) ونفس الدوال ديال الحفظ (svRenewals)،
   نفس الاستيراد (rtHandleFile / rtConfirmImport مع الربط مع السجل والبوردورو)، نفس «للحساب» (payRenewal → عملية جديدة).
   الشكل الجديد: مجموعات حسب الاستعجال (ملزمين ≥8 أيام · قراب 2–7 · جداد) + «أدّاو»، أزرار واضحة: 💰 للحساب · ✓ أدّى · 📞 · 💬 · ⋯
══════════════════════════════════════════════════════════ */
'use strict';
var R8 = { q: '', type: 'all', showDone: false, doneN: 30 };
CE7.native['c-renewals'] = true;
function r8List() { try { return JSON.parse(localStorage.getItem('eurv102_renewals') || '[]') || []; } catch (e) { return []; } }
function r8Days(iso) { if (!iso) return 0; var s = new Date(iso + 'T00:00:00'), n = new Date(), a = new Date(s.getFullYear(), s.getMonth(), s.getDate()), b = new Date(n.getFullYear(), n.getMonth(), n.getDate()); return Math.round((b - a) / 864e5); }
var R8_TYPES = { renew: ['تجديد', 'Renouvellement'], prorog: ['تمديد', 'Prorogation'], new: ['عقد جديد', 'Affaire nouvelle'], cancel: ['فسخ', 'Résiliation'] };
function r8T(k) { var t = R8_TYPES[k]; return t ? L(t[0], t[1]) : (k || ''); }
function r8Save(fn) { var l = r8List(), r = fn(l) || l; Store8.save('renewals', r); var w = null; try { w = Calc.frame && Calc.frame.contentWindow; } catch (e) { } if (w && w.RT_CLIENTS !== undefined) w.RT_CLIENTS = r; App.render(); }  /* 7.15: مباشرة (Store8) */
function r8Today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function r8Uid() { return 'rt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function r8Phone(c) {
  if (c.phone) return String(c.phone);
  try { var w = ce7(), r = w && w.rpPhone ? w.rpPhone(c.police, c.matricule) : null; return r && r.p1 ? String(r.p1) : ''; } catch (e) { return ''; }
}
function r8Wa(p) { var wa = String(p || '').replace(/[^0-9]/g, ''); if (wa.charAt(0) === '0') wa = '212' + wa.slice(1); return wa; }
function r8Att(c) { return !c.attest ? ['none', L('بلا شهادة', 'Sans attestation')] : c.attestType === 'prov' ? ['prov', L('شهادة مؤقتة', 'Attestation provisoire')] : ['def', L('شهادة نهائية', 'Attestation définitive')]; }
function r8Row(c, done) {
  var ph = r8Phone(c), lvl = done ? 'done' : c.days >= 8 ? 'urgent' : c.days >= 2 ? 'warn' : 'ok', a = r8Att(c);
  var days = done ? '✓ ' + esc(c.doneDate || '') : c.days === 0 ? L('اليوم', 'Auj.') : c.days + ' ' + L('يوم', 'j');
  return '<div class="r8-r ' + lvl + '"><i class="r8-dot ' + a[0] + '" title="' + esc(a[1]) + '"></i>'
    + '<div class="r8-m"><b>' + esc(c.name || '—') + '</b><small>' + [c.police ? '📋 <span class="ltr">' + esc(c.police) + '</span>' : '', c.matricule ? '🚘 <span class="ltr">' + esc(c.matricule) + '</span>' : '', c.marque ? esc(c.marque) : '', c.attest ? '<span class="ltr">' + esc(c.attest) + '</span>' : ''].filter(Boolean).join(' · ') + '</small></div>'
    + '<span class="r8-ty">' + esc(r8T(c.type)) + '</span><span class="r8-d ' + lvl + '">' + days + '</span><b class="r8-p ltr">' + (c.price > 0 ? money(c.price) : '—') + '</b>'
    + '<span class="r8-a">' + (done ? '<button class="btn sm" data-act="r8-undo" data-id="' + esc(c.id) + '">↩ ' + L('رجّع', 'Annuler') + '</button>'
      : '<button class="btn sm pri" data-act="r8-pay" data-id="' + esc(c.id) + '">💰 ' + L('للحساب', 'Encaisser') + '</button><button class="btn sm r8-ok" data-act="r8-done" data-id="' + esc(c.id) + '" title="' + L('أدّى', 'Payé') + '">✓</button>')
      + (ph ? '<a class="btn sm ic" href="tel:' + esc(ph) + '" title="' + esc(ph) + '">📞</a><a class="btn sm ic" href="https://wa.me/' + r8Wa(ph) + '" target="_blank" rel="noopener">💬</a>' : '')
      + '<button class="btn sm ic" data-act="r8-more" data-id="' + esc(c.id) + '">⋯</button></span></div>';
}
function renderRenew8(el) {
  var w = ce7(); if (!w) return c8Wait(el, 'c-renewals');
  try { if (typeof w.rhSweep === 'function') w.rhSweep(); } catch (e) { }
  var all = r8List(), q = R8.q.trim().toLowerCase();
  var match = function (c) { return (R8.type === 'all' || c.type === R8.type) && (!q || [c.name, c.police, c.matricule, c.phone, c.attest, c.marque].join(' ').toLowerCase().indexOf(q) >= 0); };
  var act = all.filter(function (c) { return c.status !== 'done'; }).map(function (c) { return Object.assign({}, c, { days: r8Days(c.requestDate || c.dateISO) }); }).sort(function (a, b) { return b.days - a.days; });
  var done = all.filter(function (c) { return c.status === 'done'; }).sort(function (a, b) { return String(b.doneDate || '').localeCompare(String(a.doneDate || '')); });
  var u = act.filter(function (c) { return c.days >= 8; }), wn = act.filter(function (c) { return c.days >= 2 && c.days < 8; }), ok = act.filter(function (c) { return c.days < 2; });
  var sum = act.reduce(function (s, c) { return s + (parseFloat(c.price) || 0); }, 0), mon = new Date().toISOString().slice(0, 7), doneM = done.filter(function (c) { return String(c.doneDate || '').slice(0, 7) === mon; }).length;
  var grp = function (cls, t, sub, list) { var l = list.filter(match); return l.length ? '<section class="sec-box r8-g ' + cls + '"><div class="sec-bh"><b>' + t + '</b><small>' + sub + '</small><span class="sp"></span><small>' + l.length + '</small></div><div class="r8-l">' + l.map(function (c) { return r8Row(c, false); }).join('') + '</div></section>' : ''; };
  var types = ['all', 'renew', 'prorog', 'new', 'cancel'].map(function (k) { var n = k === 'all' ? act.length : act.filter(function (c) { return c.type === k; }).length; if (k !== 'all' && !n) return ''; return '<button class="ctl7-tab' + (R8.type === k ? ' on' : '') + '" data-act="r8-type" data-v="' + k + '">' + (k === 'all' ? L('الكل', 'Tous') : esc(r8T(k))) + ' <b>' + n + '</b></button>'; }).join('');
  var pend = w.RT_PENDING ? '<div class="box r8-pend">📥 ' + L('استيراد كيتسنا التأكيد: ', 'Import en attente : ') + '<b>' + esc(w.RT_PENDING.fileName || '') + '</b> <button class="btn sm pri" data-act="r8-imp-open">' + L('كمّل', 'Continuer') + '</button></div>' : '';
  var dl = done.filter(match);
  el.innerHTML = '<div class="page sec7 c8 r8">'
    + c8Hd('⏳', L('متابعة التجديدات', 'Suivi des renouvellements'), L('اللي طلبو التأمين وباقي ما خلصوش', 'Demandes en attente de paiement'),
      '<div class="c8-hr"><button class="btn pri" data-act="r8-imp">📥 ' + L('استيراد Excel', 'Importer Excel') + '</button><button class="btn" data-act="r8-add">➕ ' + L('زبون', 'Client') + '</button><button class="btn ic" data-act="r8-menu">⋯</button></div>')
    + pend
    + '<div class="sec-kpis">' + secCard('warn', u.length ? 'err' : 'off', L('ملزمين بالأداء', 'À payer (8 j+)'), u.length, L('8 أيام ولا كثر', '8 jours ou plus'))
      + secCard('bell', wn.length ? 'warn' : 'off', L('قراب', 'Bientôt'), wn.length, L('من 2 حتى 7 أيام', '2 à 7 jours'))
      + secCard('users', 'blue', L('كيتسناو', 'En attente'), act.length, L('المجموع: ', 'Total : ') + '<span class="ltr">' + money(sum) + '</span> DH')
      + secCard('ok', 'ok', L('أدّاو هاد الشهر', 'Payés ce mois'), doneM, L('الكل: ', 'Total : ') + done.length) + '</div>'
    + '<div class="r8-bar"><label class="search r8-s"><input type="search" data-inp="r8-q" value="' + esc(R8.q) + '" placeholder="' + L('قلّب: سمية، بوليصة، ماتريكول، هاتف…', 'Nom, police, immat., tél…') + '"></label><div class="ctl7-tabs r8-tt">' + types + '</div></div>'
    + (act.length ? grp('urgent', '🔴 ' + L('ملزمين بالأداء', 'À payer'), L('8 أيام ولا كثر', '8 jours et plus'), u) + grp('warn', '🟠 ' + L('قراب', 'Bientôt'), L('من 2 حتى 7 أيام', '2 à 7 jours'), wn) + grp('ok', '🟢 ' + L('جداد', 'Récents'), L('أقل من يومين', 'moins de 2 jours'), ok)
      : '<section class="sec-box"><div class="empty">✅ ' + L('حتى واحد ما كيتسنا. استورد ملف Excel ديال الطلبات ولا زيد زبون.', 'Personne en attente. Importez un fichier Excel ou ajoutez un client.') + '</div></section>')
    + (done.length ? '<section class="sec-box r8-g done"><button class="r8-dh" data-act="r8-done-t"><b>✅ ' + L('أدّاو', 'Payés') + ' (' + dl.length + ')</b><span class="sp"></span><i>' + (R8.showDone ? '▾' : '▸') + '</i></button>'
      + (R8.showDone ? '<div class="r8-l">' + dl.slice(0, R8.doneN).map(function (c) { return r8Row(c, true); }).join('') + '</div>' + (dl.length > R8.doneN ? '<button class="sec-more c" data-act="r8-done-more">' + L('زيد', 'Plus') + ' (' + (dl.length - R8.doneN) + ')</button>' : '') : '') + '</section>' : '')
    + '<div class="r8-leg"><span><i class="r8-dot def"></i>' + L('شهادة نهائية', 'Définitive') + '</span><span><i class="r8-dot prov"></i>' + L('مؤقتة', 'Provisoire') + '</span><span><i class="r8-dot none"></i>' + L('بلا شهادة', 'Sans') + '</span></div>'
    + '</div>';
}
App.input('r8-q', debounce(function (el) { R8.q = el.value; App.render(); var i = document.querySelector('[data-inp="r8-q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250));
App.act('r8-type', function (el) { R8.type = el.dataset.v; App.render(); });
App.act('r8-done-t', function () { R8.showDone = !R8.showDone; App.render(); });
App.act('r8-done-more', function () { R8.doneN += 50; App.render(); });
App.act('r8-done', function (el) { var id = el.dataset.id; r8Save(function (l) { return l.map(function (c) { return c.id === id ? Object.assign({}, c, { status: 'done', doneDate: r8Today() }) : c; }); }); toast('✓ ' + L('تنقل لـ «أدّاو»', 'Marqué payé')); });
App.act('r8-undo', function (el) { var id = el.dataset.id; r8Save(function (l) { return l.map(function (c) { return c.id === id ? Object.assign({}, c, { status: 'active', doneDate: null }) : c; }); }); });
App.act('r8-pay', function (el) {
  var w = ce7(); if (!w) return; w.payRenewal(el.dataset.id);
  setTimeout(function () { App.go('c-new7'); }, 350); [900, 1600].forEach(function (t) { setTimeout(function () { if (App.page === 'c-new7') App.render(); }, t); });
});
/* ⋯ ← تعديل · حذف */
App.act('r8-more', function (el) {
  var c = r8List().filter(function (x) { return x.id === el.dataset.id; })[0]; if (!c) return;
  Modal.open(Modal.head(esc(c.name || '—')) + '<div class="menu"><button class="menu-i" data-act="r8-edit" data-id="' + esc(c.id) + '">✏️ ' + L('تعديل', 'Modifier') + '</button>'
    + '<button class="menu-i red-t" data-act="r8-del" data-id="' + esc(c.id) + '">🗑️ ' + L('حذف', 'Supprimer') + '</button></div>', 'small');
});
App.act('r8-del', function (el) { if (!confirm(L('نمسحو هاد الزبون من المتابعة؟', 'Supprimer ce client ?'))) return; var id = el.dataset.id; Modal.close(); r8Save(function (l) { return l.filter(function (c) { return c.id !== id; }); }); });
function r8Form(c) {
  c = c || {}; var f = function (k, lbl, ltr, type) { return '<label class="f"><span>' + lbl + '</span><input id="r8-' + k + '"' + (type ? ' type="' + type + '"' : '') + (ltr ? ' dir="ltr"' : '') + ' value="' + esc(c[k] != null ? c[k] : '') + '"></label>'; };
  return '<div class="q7"><div class="q7-g">' + f('name', L('الاسم *', 'Nom *')) + f('phone', L('الهاتف', 'Téléphone'), 1) + f('police', L('البوليصة', 'Police'), 1) + f('matricule', L('الماتريكول', 'Immatriculation'), 1)
    + f('attest', L('الشهادة', 'Attestation'), 1) + '<label class="f"><span>' + L('نوع الشهادة', 'Type attestation') + '</span><select id="r8-attestType" class="inp"><option value="def"' + (c.attestType !== 'prov' ? ' selected' : '') + '>' + L('نهائية', 'Définitive') + '</option><option value="prov"' + (c.attestType === 'prov' ? ' selected' : '') + '>' + L('مؤقتة', 'Provisoire') + '</option></select></label>'
    + f('marque', L('الماركة', 'Marque')) + f('price', L('الثمن', 'Prix'), 1, 'number')
    + '<label class="f"><span>' + L('النوع', 'Type') + '</span><select id="r8-type" class="inp">' + Object.keys(R8_TYPES).map(function (k) { return '<option value="' + k + '"' + ((c.type || 'renew') === k ? ' selected' : '') + '>' + esc(r8T(k)) + '</option>'; }).join('') + '</select></label>'
    + f('requestDate', L('تاريخ الطلب', 'Date demande'), 1, 'date') + '</div></div>';
}
function r8Read() { var v = function (k) { return (($('r8-' + k) || {}).value || '').trim(); }; return { name: v('name'), phone: v('phone'), police: v('police'), matricule: v('matricule'), attest: v('attest'), attestType: v('attest') ? v('attestType') : '', marque: v('marque'), price: parseFloat(v('price')) || 0, type: v('type') || 'renew', requestDate: v('requestDate') }; }
App.act('r8-add', function () { Modal.open(Modal.head('➕ ' + L('زبون جديد فالمتابعة', 'Nouveau client')) + r8Form({ requestDate: r8Today(), type: 'renew' }) + '<button class="btn pri wide" data-act="r8-add-ok">✓ ' + L('زيد', 'Ajouter') + '</button>', 'small q7m'); setTimeout(function () { var i = $('r8-name'); if (i) i.focus(); }, 50); });
App.act('r8-add-ok', function () { var d = r8Read(); if (!d.name) { toast(L('الاسم مطلوب', 'Nom requis'), 'err'); return; } if (!d.requestDate) d.requestDate = r8Today(); if (!d.attest) d.attestType = 'def'; Modal.close(); r8Save(function (l) { l.unshift(Object.assign({ id: r8Uid() }, d, { status: 'active', doneDate: null })); return l; }); });
App.act('r8-edit', function (el) { var c = r8List().filter(function (x) { return x.id === el.dataset.id; })[0]; if (!c) return; Modal.open(Modal.head('✏️ ' + L('تعديل', 'Modifier')) + r8Form(c) + '<button class="btn pri wide" data-act="r8-edit-ok" data-id="' + esc(c.id) + '">✓ ' + L('حفظ', 'Enregistrer') + '</button>', 'small q7m'); });
App.act('r8-edit-ok', function (el) { var d = r8Read(), id = el.dataset.id; if (!d.name) { toast(L('الاسم مطلوب', 'Nom requis'), 'err'); return; } Modal.close(); r8Save(function (l) { return l.map(function (c) { return c.id === id ? Object.assign({}, c, d, { requestDate: d.requestDate || c.requestDate }) : c; }); }); });
/* ⋯ ديال الصفحة: Excel · حذف الكل */
App.act('r8-menu', function () {
  Modal.open(Modal.head(L('المتابعة', 'Suivi')) + '<div class="menu"><button class="menu-i" data-act="r8-xls">📤 ' + L('تصدير Excel', 'Exporter Excel') + '</button>'
    + '<button class="menu-i" data-act="r8-delall" data-s="done">🗑️ ' + L('حذف «أدّاو» كاملين', 'Supprimer les payés') + '</button><button class="menu-i red-t" data-act="r8-delall" data-s="active">🗑️ ' + L('حذف اللي كيتسناو كاملين', 'Supprimer les en attente') + '</button></div>', 'small');
});
App.act('r8-xls', function () { Modal.close(); if (typeof XLSX === 'undefined') { toast('Excel…', 'err'); return; } var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r8List().map(function (c) { return { Nom: c.name, Telephone: c.phone || '', Police: c.police || '', Attestation: c.attest || '', Type_att: c.attestType || '', Matricule: c.matricule || '', Marque: c.marque || '', Prix: c.price || 0, Type: r8T(c.type), Date_demande: c.requestDate || '', Statut: c.status === 'done' ? 'Payé' : 'En attente', Date_paiement: c.doneDate || '' }; })), 'Suivi'); XLSX.writeFile(wb, 'suivi-renouvellements-' + todayISO() + '.xlsx'); });
App.act('r8-delall', function (el) { Modal.close(); var st = el.dataset.s; if (!confirm(st === 'active' ? L('حذف اللي كيتسناو كاملين؟', 'Supprimer EN ATTENTE ?') : L('حذف «أدّاو» كاملين؟', 'Supprimer PAYÉS ?'))) return; r8Save(function (l) { return l.filter(function (c) { return st === 'active' ? c.status === 'done' : c.status !== 'done'; }); }); });
/* 📥 الاستيراد: نفس rtHandleFile (قراية Excel، النكرار، الربط مع السجل) ← معاينة فنافذة ← rtConfirmImport */
App.act('r8-imp', function () { var i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xls,.csv'; i.onchange = function () { if (i.files[0]) r8Import(i.files[0]); }; i.click(); });
function r8Import(file) {
  var w = ce7(); if (!w) { toast(L('الحاسبة ما تحلاتش، عاود', 'Calculatrice non prête'), 'err'); return; }
  if (!w.XLSX && window.XLSX) w.XLSX = window.XLSX;
  w.RT_PENDING = null; w.rtHandleFile(file); var n = 0;
  (function wait() { if (w.RT_PENDING) { App.render(); App.acts['r8-imp-open'](); return; } var e = w.document.getElementById('rt-import-err'); if (e && e.style.display === 'block' && e.textContent) { toast(e.textContent, 'err'); e.style.display = 'none'; return; } if (++n < 60) setTimeout(wait, 100); })();
}
App.act('r8-imp-open', function () {
  var w = ce7(); if (!w || !w.RT_PENDING) return; var P = w.RT_PENDING;
  try { if (typeof w.rhMarkPending === 'function') w.rhMarkPending(); } catch (e) { }
  var keys = ['renew', 'prorog', 'new', 'cancel'], sel = P.rows.filter(function (r) { return w.RT_CHECKED.has(r.id) && !r.isDup; }).length;
  Modal.open(Modal.head('📥 ' + esc(P.fileName || '')) + '<div class="r8-imp">'
    + '<div class="r8-ik">' + keys.map(function (k) { var c = P.rows.filter(function (r) { return r.typeKey === k; }).length; return c ? '<button class="c7' + (w.RT_ACTIVE_TYPES.has(k) ? ' on' : '') + '" data-act="r8-imp-type" data-k="' + k + '">' + esc(r8T(k)) + ' <b>' + c + '</b></button>' : ''; }).join('') + '</div>'
    + '<div class="r8-il">' + P.rows.map(function (r) { var on = w.RT_CHECKED.has(r.id);
      return '<label class="r8-ir' + (r.isDup ? ' dup' : '') + '"><input type="checkbox" data-inp="r8-imp-row" data-id="' + esc(r.id) + '"' + (on ? ' checked' : '') + (r.isDup || r.inHist ? ' disabled' : '') + '><span><b>' + esc(r.name) + '</b><small>' + esc(r8T(r.typeKey)) + (r.police ? ' · <span class="ltr">' + esc(r.police) + '</span>' : '') + (r.matricule ? ' · <span class="ltr">' + esc(r.matricule) + '</span>' : '') + (r.price ? ' · <span class="ltr">' + money(r.price) + '</span>' : '')
        + (r.isDup ? ' · <em class="amber-t">' + L('موجود ديجا', 'déjà présent') + '</em>' : '') + (r.inHist ? ' · <em class="ok-t">✅ ' + L('ديجا فالسجل (غادي يتزاد «أدّى»)', 'déjà à l\'historique') + '</em>' : '') + '</small></span></label>'; }).join('') + '</div>'
    + '<div class="q7-acts"><button class="btn pri q7-go" data-act="r8-imp-ok">✓ ' + L('زيد ', 'Ajouter ') + sel + '</button><button class="btn" data-act="r8-imp-cancel">' + L('إلغاء', 'Annuler') + '</button></div></div>', 'wide');
});
App.act('r8-imp-type', function (el) { var w = ce7(); w.rtToggleTypeFilter(el.dataset.k); App.acts['r8-imp-open'](); });
App.input('r8-imp-row', function (el) { var w = ce7(); w.rtToggleRow(el.dataset.id); App.acts['r8-imp-open'](); });
App.act('r8-imp-ok', function () { var w = ce7(); Modal.close(); w.rtConfirmImport(); App.render(); toast('📥 ' + L('تزادو', 'Ajoutés')); });
App.act('r8-imp-cancel', function () { var w = ce7(); Modal.close(); w.rtCancelImport(); App.render(); });
/* الملفات اللي كتجي من البرا (التلويح / Excel ديال البوردورو) كتدوز من هنا */
if (typeof xl7ToBord === 'function') xl7ToBord = function (file) { App.go('c-renewals'); setTimeout(function () { r8Import(file); }, 200); };
(function () { var put = function () { var m = App.mod('c-renewals'); if (m && m.render !== renderRenew8) m.render = renderRenew8; }; put(); App.on('login', put); })();
(function () { var last = ''; setInterval(function () { if (App.page !== 'c-renewals' || !App.user || Modal.isOpen()) return; var s = ''; try { s = localStorage.getItem('eurv102_renewals') || ''; s = s.length + s.slice(0, 80); } catch (e) { } if (s !== last) { var f = !last; last = s; if (!f && !(document.activeElement && document.activeElement.matches('input'))) App.render(); } }, 3000); })();
