/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-cash.js   (💵 الحاسبة الجديدة · المرحلة 3: الصندوق · اليوميات · التقارير)
   • الحساب (Cash): دوال نقية كتقرا نفس البيانات (eurv102_h / eurv102_cash / eurv102_cash_moves ↔ Firestore calc/*)
     ومنقولة حرفياً من 02-caisse.js و03-archives-journal-reports.js (نفس الأرقام بالضبط — كاينة تجربة مقارنة).
   • الكتابة (فتح، حركة، حذف حركة، جرد، إغلاق) كتدوز من نفس الدوال القديمة (نفس الحفظ والمزامنة) حتى المرحلة 5.
   • الصفحات: «الصندوق» و«اليوميات» و«التقارير» ولاو أصليين (بلا الإطار).
══════════════════════════════════════════════════════════ */
'use strict';
var Cash = (function () {
  var J = function (k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } };
  var hist = function () { return J('eurv102_h'); }, sessions = function () { return J('eurv102_cash'); }, moves = function () { return J('eurv102_cash_moves'); };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  function today() { return new Date().toLocaleDateString('fr-FR'); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('fr-FR'); }
  function frToISO(f) { if (!f) return ''; var p = f.split('/'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : ''; }
  function isoToFr(i) { if (!i) return ''; var p = i.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function session(t) { return sessions().filter(function (s) { return s.date === t; })[0] || null; }
  function allOps(t) { return hist().filter(function (h) { return h.date === t; }); }
  function cashOps(t) { return hist().filter(function (h) { return h.date === t && h.payMode === 'cash'; }); }
  function revenue(t) { return cashOps(t).reduce(function (s, h) { return s + (h.off || 0); }, 0); }
  function dayMoves(t) { return moves().filter(function (m) { return m.date === t; }); }
  function movesNet(t) { return dayMoves(t).reduce(function (s, m) { return s + (m.type === 'in' ? m.amount : -m.amount); }, 0); }
  function expected(t) { var s = session(t), ob = (s && s.openBal != null) ? s.openBal : 0; return r2(ob + revenue(t) + movesNet(t)); }
  function day(t) {
    var s = session(t), ops = allOps(t), co = cashOps(t), exp = expected(t);
    return { t: t, s: s, ops: ops, cashOps: co, totalPaid: ops.reduce(function (a, h) { return a + (h.paid || 0); }, 0), totalRefund: ops.reduce(function (a, h) { return a + (h.paid > h.off ? h.paid - h.off : 0); }, 0),
      moves: dayMoves(t), movesNet: movesNet(t), revenue: revenue(t), expected: exp, diff: s && s.counted != null ? r2(s.counted - exp) : null };
  }
  /* اليوميات: نفس الترتيب ونفس الرصيد المتراكم */
  function journal() {
    var rows = [];
    hist().forEach(function (h) { rows.push({ sortKey: h.date.split('/').reverse().join('') + (h.time || '00:00'), date: h.date, kind: 'op', num: h.num || '', who: h.client || '', credit: h.off || 0, debit: 0 }); });
    sessions().forEach(function (s) { if (s.openBal != null) rows.push({ sortKey: s.date.split('/').reverse().join('') + '00:00', date: s.date, kind: 'open', credit: 0, debit: 0, isOpen: true, amt: s.openBal }); });
    moves().forEach(function (m) { var o = m.type === 'out'; rows.push({ sortKey: m.date.split('/').reverse().join('') + (m.time || '00:00'), date: m.date, kind: o ? 'out' : 'in', who: m.person || '', reason: m.reason || '', credit: o ? 0 : m.amount, debit: o ? m.amount : 0 }); });
    rows.sort(function (a, b) { return a.sortKey.localeCompare(b.sortKey); });
    var bal = 0; rows.forEach(function (r) { if (r.isOpen) bal = r.amt; else bal += r.credit - r.debit; r.bal = bal; });
    return rows;
  }
  /* التقارير: نفس الفترات ونفس المجاميع */
  function inRange(ds, from, to) {
    var p = String(ds || '').split('/'); if (p.length !== 3) return false;
    var d = new Date(+p[2], +p[1] - 1, +p[0], 12, 0, 0);
    return d >= from && d <= to;
  }
  function report(per, now) {
    now = now || new Date(); var from, to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (per === 'day') from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    else if (per === 'week') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0); }
    else if (per === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    else from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    var ops = hist().filter(function (h) { return inRange(h.date, from, to); }), cl = {}, byAg = {};
    ops.forEach(function (h) {
      cl[h.client] = 1;
      var ag = h.user || '—';
      if (!byAg[ag]) byAg[ag] = { name: ag, ops: 0, paid: 0, off: 0, unp: 0 };
      byAg[ag].ops++;
      byAg[ag].paid += (h.unpaid ? 0 : (+h.paid || 0));
      byAg[ag].off += (+h.off || 0);
      if (h.unpaid) byAg[ag].unp++;
    });
    var off = ops.reduce(function (a, h) { return a + (h.off || 0); }, 0);
    var agents = Object.keys(byAg).map(function (k) { return byAg[k]; }).sort(function (a, b) { return b.paid - a.paid; });
    return { ops: ops, n: ops.length, clients: Object.keys(cl).length, off: off, paid: ops.reduce(function (a, h) { return a + (h.paid || 0); }, 0), refund: ops.reduce(function (a, h) { return a + (h.diff || 0); }, 0), net: off, agents: agents, from: from, to: to };
  }
  return { today: today, yesterday: yesterday, frToISO: frToISO, isoToFr: isoToFr, session: session, allOps: allOps, cashOps: cashOps, revenue: revenue, dayMoves: dayMoves, movesNet: movesNet, expected: expected, day: day, journal: journal, report: report };
})();

/* ───────── 🗄️ الصندوق ───────── */
var C8 = { t: null, jm: '', rp: 'day' };
CE7.native['c-caisse'] = true; CE7.native['c-journal'] = true; CE7.native['c-reports'] = true;
function c8Fmt(n) { return money(Math.abs(n || 0)); }
function c8Wait(el, id) { el.innerHTML = '<div class="page"><div class="empty">⏳ ' + L('كنحلّو الحاسبة…', 'Chargement…') + '</div></div>'; ce7Wait(function () { if (App.page === id) App.render(); }); }
function c8Hd(ic, t, sub, right) { return '<div class="sec-hd"><span class="sec-hic c8-hic">' + ic + '</span><div><h1>' + t + '</h1><small>' + sub + '</small></div><span class="sp"></span>' + (right || '') + '</div>'; }
function renderCaisse8(el) {
  var w = ce7(); if (!w) return c8Wait(el, 'c-caisse');
  var adm = !!(w.CUR && w.CUR.isAdmin), t = C8.t || Cash.today(), isToday = t === Cash.today(), future = Cash.frToISO(t) > Cash.frToISO(Cash.today());
  var D = Cash.day(t), s = D.s, closed = !!(s && s.closed), can = !future && !closed && (isToday || adm), opened = !!(s && s.openBal != null);
  var st = closed ? secPill('mute big', '🔒 ' + L('اليوم مسدود', 'Journée clôturée')) : opened ? secPill('ok big', L('الصندوق محلول', 'Caisse ouverte'), 'ok') : secPill('warn big', L('ما تحلّش', 'Non ouverte'), 'warn');
  var dateBar = '<div class="c8-dates"><button class="ctl7-tab' + (isToday ? ' on' : '') + '" data-act="c8-day" data-d="t">' + L('اليوم', 'Aujourd\'hui') + '</button><button class="ctl7-tab' + (t === Cash.yesterday() ? ' on' : '') + '" data-act="c8-day" data-d="y">' + L('البارح', 'Hier') + '</button>'
    + '<input type="date" class="inp c8-pick" data-inp="c8-pick" value="' + Cash.frToISO(t) + '" max="' + Cash.frToISO(Cash.today()) + '"><span class="sp"></span>'
    + '<button class="btn sm" data-act="c8-chq-open">📄 ' + L('دفتر الشيكات', 'Suivi Chèques') + '</button>'
    + (opened ? '<button class="btn sm wa" data-act="c8-wa-sum">📲 ' + L('ملخص الصندوق (واتساب)', 'Résumé WhatsApp') + '</button>' : '') + '</div>';
  var head = c8Hd('🗄️', L('الصندوق', 'Caisse'), (isToday ? L('اليوم · ', 'Aujourd\'hui · ') : '') + t + (can ? '' : closed ? '' : ' · ' + L('للقراية فقط', 'lecture seule')), st) + dateBar;
  if (!opened) {
    el.innerHTML = '<div class="page sec7 c8">' + head + (can ? '<section class="sec-box c8-open"><div class="c8-oi">🗄️</div><b>' + L('فتح الصندوق', 'Ouverture de caisse') + '</b><small>' + L('دخل رصيد البداية باش يبدا النهار', 'Saisissez le solde de départ') + '</small>'
      + '<div class="c8-orow"><input id="c8-open" class="inp" type="number" step="0.01" inputmode="decimal" dir="ltr" placeholder="0.00"><button class="btn pri" data-act="c8-open">✓ ' + L('فتح', 'Ouvrir') + '</button></div></section>'
      : '<div class="box">' + (future ? L('نهار جاي: ما متاحش.', 'Jour futur — non disponible.') : L('الصندوق ما تحلّش هاد النهار.', 'Caisse non ouverte ce jour.') + (adm ? '' : ' ' + L('التعديل للمدير.', 'Modification réservée à l\'admin.'))) + '</div>') + '</div>';
    return;
  }
  var kp = '<div class="sec-kpis">' + secCard('down', 'blue', L('رصيد الافتتاح', 'Solde d\'ouverture'), c8Fmt(s.openBal), s.openedBy ? L('حلّو ', 'par ') + esc(s.openedBy) : '')
    + secCard('ok', 'ok', L('المقبوض كاش', 'Encaissé (espèces)'), c8Fmt(D.revenue), D.cashOps.length + ' ' + L('عملية كاش', 'op. espèces'))
    + secCard('sync', D.movesNet < 0 ? 'err' : 'ok', L('حركات الصندوق', 'Mouvements'), (D.movesNet < 0 ? '− ' : '+ ') + c8Fmt(D.movesNet), D.moves.length + ' ' + L('حركة', 'mouvement(s)'))
    + secCard('cloud', 'fire', L('الرصيد المتوقع', 'Solde attendu'), c8Fmt(D.expected), L('الافتتاح + الكاش + الحركات', 'ouverture + espèces + mouvements')) + '</div>';
  var mini = '<div class="c8-mini"><span>' + L('العمليات', 'Opérations') + ' <b>' + D.ops.length + '</b></span><span>' + L('المدفوع الكلي', 'Total payé') + ' <b class="ltr">' + c8Fmt(D.totalPaid) + '</b></span><span>' + L('المُرجَع', 'Remboursé') + ' <b class="ltr">' + c8Fmt(D.totalRefund) + '</b></span>'
    + '<button class="sec-more" data-act="c8-ops">' + L('عمليات هاد النهار', 'Opérations du jour') + ' ←</button></div>';
  var mv = (can ? '<div class="c8-mf"><div class="c8-mt"><button class="c7 w' + (C8.mt !== 'in' ? ' on' : '') + '" data-act="c8-mt" data-v="out">➖ ' + L('خروج (سلفة / مصروف)', 'Sortie (avance / dépense)') + '</button><button class="c7 w' + (C8.mt === 'in' ? ' on' : '') + '" data-act="c8-mt" data-v="in">➕ ' + L('دخول (استرجاع)', 'Entrée (remboursement)') + '</button></div>'
      + '<div class="c8-mr"><input id="c8-mamt" class="inp" type="number" step="0.01" inputmode="decimal" dir="ltr" placeholder="' + L('المبلغ DH', 'Montant DH') + '"><input id="c8-mper" class="inp" placeholder="' + L('الاسم (اختياري)', 'Nom (optionnel)') + '"></div>'
      + '<input id="c8-mrea" class="inp" placeholder="' + L('السبب: سلفة، شراء لوازم…', 'Motif : avance, fournitures…') + '"><button class="btn pri wide" data-act="c8-move">➕ ' + L('زيد الحركة', 'Ajouter') + '</button></div>' : '')
    + (D.moves.length ? '<div class="c8-ml">' + D.moves.map(function (m) { var o = m.type === 'out';
        return '<div class="c8-m ' + (o ? 'out' : 'in') + '"><i>' + (o ? '➖' : '➕') + '</i><span><b>' + esc((m.person ? m.person + ' — ' : '') + (m.reason || L('بلا سبب', 'Sans motif'))) + '</b><small class="ltr">' + esc(m.time || '') + (m.user ? ' · ' + esc(m.user) : '') + '</small></span><b class="ltr">' + (o ? '−' : '+') + c8Fmt(m.amount) + '</b>'
          + (can && adm ? '<button class="btn sm ic red-o" data-act="c8-mdel" data-id="' + esc(m.id) + '">✕</button>' : '') + '</div>'; }).join('') + '</div>' : '<div class="empty">' + L('ما كاين حتى حركة', 'Aucun mouvement') + '</div>');
  var d = D.diff, inv = '<div class="c8-iv"><span>' + L('المبلغ المتوقع', 'Montant attendu') + '</span><b class="ltr">' + c8Fmt(D.expected) + ' DH</b></div>'
    + (can ? '<div class="c8-iv"><span>' + L('المبلغ الموجود', 'Montant compté') + '</span><input id="c8-count" class="inp" type="number" step="0.01" inputmode="decimal" dir="ltr" value="' + (s.counted != null ? esc(s.counted) : '') + '" placeholder="0.00"></div><button class="btn wide" data-act="c8-count">🧮 ' + L('جرد', 'Faire le compte') + '</button>'
      : '<div class="c8-iv"><span>' + L('المبلغ الموجود', 'Montant compté') + '</span><b class="ltr">' + c8Fmt(s.counted || 0) + ' DH</b></div>')
    + (d != null ? '<div class="c8-st ' + (Math.abs(d) < 0.01 ? 'ok' : d > 0 ? 'over' : 'short') + '">' + (Math.abs(d) < 0.01 ? '✅ ' + L('مطابق', 'Caisse conforme') : d > 0 ? '🔵 ' + L('فائض: +', 'Excédent : +') + c8Fmt(d) + ' DH' : '🔴 ' + L('عجز: −', 'Déficit : −') + c8Fmt(d) + ' DH') + '</div>' : '')
    + (can ? '<button class="btn wide c8-close" data-act="c8-close"' + (adm ? '' : ' disabled') + '>🔒 ' + L('إغلاق اليوم', 'Clôturer la journée') + (adm ? '' : ' (' + L('للمدير', 'admin') + ')') + '</button>' : '');
  el.innerHTML = '<div class="page sec7 c8">' + head + kp + mini
    + '<div class="c8-g">' + secBox('sync', L('حركات الصندوق', 'Mouvements de caisse'), mv) + secBox('doc', L('جرد الصندوق', 'Inventaire de caisse'), inv) + '</div></div>';
}
App.act('c8-day', function (el) { C8.t = el.dataset.d === 'y' ? Cash.yesterday() : Cash.today(); App.render(); });
App.input('c8-pick', function (el) { var f = Cash.isoToFr(el.value); if (f) { C8.t = f; App.render(); } });
App.act('c8-mt', function (el) { C8.mt = el.dataset.v; document.querySelectorAll('[data-act="c8-mt"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === C8.mt); }); });
function c8Do(fn) { var w = ce7(); if (!w) return; try { fn(w, C8.t || Cash.today()); } catch (e) { console.error(e); toast(String(e.message || e), 'err'); } App.render(); }
App.act('c8-open', function () { var v = parseFloat(($('c8-open') || {}).value); if (isNaN(v) || v < 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; } c8Do(function (w, t) { w.openCaisse(v, t); }); });
App.act('c8-move', function () {
  var a = parseFloat(($('c8-mamt') || {}).value), per = (($('c8-mper') || {}).value || '').trim(), rea = (($('c8-mrea') || {}).value || '').trim();
  if (isNaN(a) || a <= 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; }
  if (!rea && !per) { toast(L('كتب السبب ولا الاسم', 'Motif ou nom requis'), 'err'); return; }
  c8Do(function (w, t) { w.addCashMove(C8.mt === 'in' ? 'in' : 'out', a, rea, per, false, false, t); }); toast('💸 ' + L('تزادت الحركة', 'Mouvement ajouté'));
});
App.act('c8-mdel', function (el) { if (!confirm(L('نمسحو هاد الحركة؟', 'Supprimer ce mouvement ?'))) return; c8Do(function (w) { w.deleteCashMove(el.dataset.id); }); });
App.act('c8-count', function () { var v = parseFloat(($('c8-count') || {}).value); if (isNaN(v) || v < 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; } c8Do(function (w, t) { w.doInventory(v, t); }); });
App.act('c8-close', function () { var w = ce7(); if (!w || !(w.CUR && w.CUR.isAdmin)) return; if (!confirm(L('نسدّو اليوم نهائياً؟', 'Clôturer définitivement la journée ?'))) return; c8Do(function (w2, t) { w2.closeCaisseDay(t); }); });
App.act('c8-ops', function () { if (typeof H7 !== 'undefined') { var t = C8.t || Cash.today(); if (t === Cash.today()) H7.f = 'today'; else { H7.f = 'date'; H7.day = t; } H7.q = ''; } App.go('c-hist'); });

/* ───────── 📒 اليوميات ───────── */
function renderJournal8(el) {
  var w = ce7(); if (!w) return c8Wait(el, 'c-journal');
  var all = Cash.journal(), months = []; all.forEach(function (r) { var m = r.date.slice(3); if (months.indexOf(m) < 0) months.push(m); }); months.reverse();
  var cur = C8.jm || months[0] || ''; var rows = all.filter(function (r) { return !cur || r.date.slice(3) === cur; }).reverse();
  var lbl = function (r) { return r.kind === 'op' ? L('عملية ', 'Opération ') + r.num + ' — ' + r.who : r.kind === 'open' ? L('فتح الصندوق', 'Ouverture de caisse') : (r.kind === 'out' ? L('خروج', 'Sortie') : L('دخول', 'Entrée')) + (r.who ? ' — ' + r.who : '') + (r.reason ? ' (' + r.reason + ')' : ''); };
  var cr = rows.reduce(function (a, r) { return a + r.credit; }, 0), db = rows.reduce(function (a, r) { return a + r.debit; }, 0);
  el.innerHTML = '<div class="page sec7 c8">' + c8Hd('📒', L('اليوميات', 'Journal'), L('كل العمليات والحركات بالرصيد المتراكم (الأحدث فوق)', 'Opérations et mouvements avec solde cumulé'),
      '<div class="c8-hr"><select class="inp c8-sel" data-inp="c8-jm">' + months.map(function (m) { return '<option' + (m === cur ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select><button class="btn" data-act="c8-jxls">Excel</button></div>')
    + '<div class="c8-mini"><span>' + L('الأسطر', 'Lignes') + ' <b>' + rows.length + '</b></span><span>' + L('دائن', 'Crédit') + ' <b class="ltr ok-t">+' + c8Fmt(cr) + '</b></span><span>' + L('مدين', 'Débit') + ' <b class="ltr red-t">−' + c8Fmt(db) + '</b></span></div>'
    + '<section class="sec-box">' + (rows.length ? '<div class="sec-tw"><table class="sec-t c8-jt"><thead><tr><th>' + L('التاريخ', 'Date') + '</th><th>' + L('البيان', 'Libellé') + '</th><th>' + L('دائن', 'Crédit') + '</th><th>' + L('مدين', 'Débit') + '</th><th>' + L('الرصيد', 'Solde') + '</th></tr></thead><tbody>'
      + rows.slice(0, 400).map(function (r) { return '<tr' + (r.isOpen ? ' class="c8-jo"' : '') + '><td class="ltr">' + esc(r.date) + '</td><td>' + esc(lbl(r)) + '</td><td class="ltr ok-t">' + (r.credit ? '+' + c8Fmt(r.credit) : '—') + '</td><td class="ltr red-t">' + (r.debit ? '−' + c8Fmt(r.debit) : '—') + '</td><td class="ltr"><b>' + c8Fmt(r.bal) + '</b></td></tr>'; }).join('')
      + '</tbody></table></div>' : '<div class="empty">' + L('ما كاين حتى معطى', 'Aucune donnée') + '</div>') + '</section></div>';
}
App.input('c8-jm', function (el) { C8.jm = el.value; App.render(); });
App.act('c8-jxls', function () {
  if (typeof XLSX === 'undefined') { toast('Excel…', 'err'); return; }
  var rows = Cash.journal(), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(function (r) { return { Date: r.date, Libelle: r.kind === 'op' ? 'Opération ' + r.num + ' — ' + r.who : r.kind === 'open' ? 'Ouverture de caisse' : (r.kind === 'out' ? 'Sortie' : 'Entrée') + (r.who ? ' — ' + r.who : '') + (r.reason ? ' (' + r.reason + ')' : ''), Credit: r.credit || 0, Debit: r.debit || 0, Solde: Math.round(r.bal * 100) / 100 }; })), 'Journal');
  XLSX.writeFile(wb, 'journal-' + todayISO() + '.xlsx');
});

/* ───────── 🧾 التقارير ───────── */
function renderReports8(el) {
  var w = ce7(); if (!w) return c8Wait(el, 'c-reports');
  var R = Cash.report(C8.rp);
  var tabs = [['day', L('اليوم', 'Jour')], ['week', L('السيمانة', 'Semaine')], ['month', L('الشهر', 'Mois')], ['year', L('العام', 'Année')]].map(function (p) { return '<button class="ctl7-tab' + (C8.rp === p[0] ? ' on' : '') + '" data-act="c8-rp" data-v="' + p[0] + '">' + p[1] + '</button>'; }).join('');
  var agRows = (R.agents || []).map(function (a) {
    var calls = 0, renews = 0;
    if (typeof Contacts !== 'undefined' && Array.isArray(Contacts.list)) {
      Contacts.list.forEach(function (c) {
        if (c.deleted) return;
        (c.callHistory || []).forEach(function (ch) { var d = new Date(ch.date); if (!isNaN(d) && d >= R.from && d <= R.to && ch.user === a.name) calls++; });
        if (c.renewed && c.renewedAt) { var rd = new Date(c.renewedAt); if (!isNaN(rd) && rd >= R.from && rd <= R.to && (c.renewedBy === a.name || c.agent === a.name)) renews++; }
      });
    }
    return '<tr><td><b>👤 ' + esc(a.name) + '</b></td><td class="ltr"><b>' + a.ops + '</b>' + (a.unp ? ' <small class="amber-t">(⏳' + a.unp + ')</small>' : '') + '</td><td class="ltr ok-t"><b>' + c8Fmt(a.paid) + ' DH</b></td><td class="ltr">' + c8Fmt(a.off) + ' DH</td><td class="ltr">' + calls + '</td><td class="ltr">' + renews + '</td></tr>';
  }).join('');
  var agSec = agRows ? '<section class="sec-box" style="margin-bottom:14px"><div class="sec-bh"><b>📊 ' + L('مردودية الموظفين خلال الفترة', 'Performance par agent sur la période') + '</b></div>'
    + '<div class="sec-tw"><table class="sec-t"><thead><tr><th>' + L('الموظف', 'Agent') + '</th><th>' + L('العمليات', 'Opérations') + '</th><th>' + L('المقبوض (DH)', 'Encaissé (DH)') + '</th><th>' + L('الرسمي (DH)', 'Officiel (DH)') + '</th><th>📞 ' + L('الاتصالات/واتساب', 'Appels/WA') + '</th><th>🔄 ' + L('عقود مجددة', 'Renouvelés') + '</th></tr></thead><tbody>' + agRows + '</tbody></table></div></section>' : '';
  el.innerHTML = '<div class="page sec7 c8">' + c8Hd('🧾', L('التقارير', 'Rapports'), L('الأرقام ديال الفترة (من سجل العمليات)', 'Chiffres de la période (historique)'), '<div class="c8-hr"><button class="btn" data-act="c8-csv">📤 CSV</button><button class="btn" data-act="c8-rxls">Excel</button></div>')
    + '<div class="ctl7-tabs c8-tabs">' + tabs + '</div>'
    + '<div class="sec-kpis">' + secCard('doc', 'blue', L('عدد العمليات', 'Opérations'), R.n, L('عدد الزبناء: ', 'Clients : ') + R.clients)
      + secCard('fire', 'fire', L('مجموع الأسعار الرسمية', 'Total prix officiels'), c8Fmt(R.off), 'DH')
      + secCard('ok', 'ok', L('مجموع المدفوعات', 'Total payé'), c8Fmt(R.paid), 'DH')
      + secCard('rest', R.refund < 0 ? 'err' : 'warn', L('مجموع الفروق', 'Total écarts'), (R.refund < 0 ? '− ' : '') + c8Fmt(R.refund), L('المرجعات ناقص الباقي على الزبناء', 'remboursé moins reste dû')) + '</div>'
    + agSec
    + '<section class="sec-box"><div class="sec-bh"><b>' + L('صافي المداخيل (السعر الرسمي)', 'Revenu net (prix officiel)') + '</b><span class="sp"></span><b class="ltr c8-net">' + c8Fmt(R.net) + ' DH</b></div>'
    + (R.ops.length ? '<div class="sec-tw"><table class="sec-t"><thead><tr><th>N°</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('التأمين', 'Assurance') + '</th><th>' + L('المدفوع', 'Payé') + '</th><th>' + L('الرسمي', 'Officiel') + '</th><th>' + L('الفرق', 'Écart') + '</th></tr></thead><tbody>'
      + R.ops.slice(0, 300).map(function (h) { return '<tr><td class="ltr">' + esc(h.num || '') + '</td><td class="ltr">' + esc(h.date + ' ' + (h.time || '')) + '</td><td>' + esc(h.client || '') + '</td><td>' + esc(h.ins || '') + '</td><td class="ltr">' + c8Fmt(h.paid) + '</td><td class="ltr">' + c8Fmt(h.off) + '</td><td class="ltr ' + (h.diff > 0 ? 'ok-t' : h.diff < 0 ? 'red-t' : '') + '">' + (h.diff < 0 ? '−' : '') + c8Fmt(h.diff) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="empty">' + L('ما كاين حتى عملية فهاد الفترة', 'Aucune opération') + '</div>') + '</section></div>';
}
App.act('c8-rp', function (el) { C8.rp = el.dataset.v; App.render(); });
App.act('c8-csv', function () {
  var R = Cash.report(C8.rp); if (!R.ops.length) { toast(L('ما كاين والو', 'Aucune donnée'), 'err'); return; }
  var rows = ['N°;Date;Heure;Agent;Client;Immat;Assurance;Paye;Officiel;Ecart']; R.ops.forEach(function (h) { rows.push([h.num, h.date, h.time || '', h.user, h.client, h.plate || '', h.ins, (+h.paid || 0).toFixed(2), (+h.off || 0).toFixed(2), (+h.diff || 0).toFixed(2)].join(';')); });
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'rapport-' + C8.rp + '-' + todayISO() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
});
App.act('c8-rxls', function () { if (typeof XLSX === 'undefined') { toast('Excel…', 'err'); return; } var R = Cash.report(C8.rp), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(R.ops.map(function (h) { return { 'N°': h.num, Date: h.date, Heure: h.time || '', Agent: h.user, Client: h.client, Immat: h.plate || '', Assurance: h.ins, Paye: +h.paid || 0, Officiel: +h.off || 0, Ecart: +h.diff || 0 }; })), 'Rapport'); XLSX.writeFile(wb, 'rapport-' + C8.rp + '-' + todayISO() + '.xlsx'); });

/* الربط: الصفحات الثلاثة ولاو أصليين */
(function () { var map = { 'c-caisse': renderCaisse8, 'c-journal': renderJournal8, 'c-reports': renderReports8 };
  var put = function () { Object.keys(map).forEach(function (id) { var m = App.mod(id); if (m && m.render !== map[id]) m.render = map[id]; }); };
  put(); App.on('login', put); })();
/* البيانات تبدلات (جهاز آخر ولا الحاسبة) ← كنعاودو نرسمو */
(function () { var last = ''; setInterval(function () { if (!App.user || !CE7.native[App.page] || ['c-caisse', 'c-journal', 'c-reports'].indexOf(App.page) < 0) return; var sg = ''; try { sg = (localStorage.getItem('eurv102_cash') || '').length + ':' + (localStorage.getItem('eurv102_cash_moves') || '').length + ':' + (localStorage.getItem('eurv102_h') || '').length; } catch (e) { } if (sg !== last) { var f = !last; last = sg; if (!f && !document.activeElement.matches('input')) App.render(); } }, 3000); })();
/* 7.13: الصفحات القديمة اللي اتفقنا ما نحتاجوهمش ما بقاوش فالقائمة (البيانات ما تمساتش، وكيبقاو فالبحث) */
App.on('login', function () { ['c-dash', 'c-stats', 'c-clients', 'c-archives', 'c-sync'].forEach(function (id) { var m = App.mod(id); if (m) m.nav = false; }); setTimeout(function () { if (App.renderNav) App.renderNav(); }, 50); });

/* ═════ 7.15 (المرحلة 5ج): الكتابة ديال الصندوق ولات فالبرنامج (Store8)، منقولة حرفياً من 02-caisse.js ═════ */
var CashW = (function () {
  var J = function (k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } };
  var me = function () { var w = ce7(); return (w && w.CUR && w.CUR.n) || (App.user && App.user.name) || ''; };
  var sync = function (key, v) { Store8.save(key, v); var w = null; try { w = Calc.frame && Calc.frame.contentWindow; } catch (e) { } if (w) { if (key === 'cash' && w.CASH !== undefined) w.CASH = v; if (key === 'cashMoves' && w.CASH_MOVES !== undefined) w.CASH_MOVES = v; } };
  function getOrCreate(C, t) { var s = C.filter(function (x) { return x.date === t; })[0]; if (!s) { s = { date: t, openBal: null, openedBy: null, openedAt: null, counted: null, countedAt: null, countedBy: null, closed: false, closedBy: null, closedAt: null }; C.unshift(s); } return s; }
  return {
    open: function (amount, t) { var C = J('eurv102_cash'), s = getOrCreate(C, t || Cash.today()); s.openBal = amount; s.openedBy = me(); s.openedAt = new Date().toLocaleString('fr-FR'); sync('cash', C); return s; },
    inventory: function (amt, t) { var C = J('eurv102_cash'), s = getOrCreate(C, t || Cash.today()); s.counted = amt; s.countedAt = new Date().toLocaleString('fr-FR'); s.countedBy = me(); sync('cash', C); return s; },
    close: function (t) { var d = t || Cash.today(), bal = Cash.expected(d), C = J('eurv102_cash'), s = getOrCreate(C, d); s.closed = true; s.closedBy = me(); s.closedAt = new Date().toLocaleString('fr-FR'); if (s.counted == null) s.counted = bal; sync('cash', C); return s; },
    addMove: function (type, amount, reason, person, t) { var M = J('eurv102_cash_moves'), n = new Date();
      var m = { id: 'M' + Date.now(), date: t || Cash.today(), time: n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), type: type, amount: Math.abs(amount), reason: reason || '', person: person || '', isEmployee: false, isClient: false, user: me(), createdAt: n.toISOString() };
      M.unshift(m); sync('cashMoves', M); return m; },
    delMove: function (id) { sync('cashMoves', J('eurv102_cash_moves').filter(function (m) { return m.id !== id; })); }
  };
})();
c8Do = function (fn) { try { fn(null, C8.t || Cash.today()); } catch (e) { console.error(e); toast(String(e.message || e), 'err'); } App.render(); };
App.act('c8-open', function () { var v = parseFloat(($('c8-open') || {}).value); if (isNaN(v) || v < 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; } c8Do(function (w, t) { CashW.open(v, t); }); });
App.act('c8-move', function () {
  var a = parseFloat(($('c8-mamt') || {}).value), per = (($('c8-mper') || {}).value || '').trim(), rea = (($('c8-mrea') || {}).value || '').trim();
  if (isNaN(a) || a <= 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; }
  if (!rea && !per) { toast(L('كتب السبب ولا الاسم', 'Motif ou nom requis'), 'err'); return; }
  c8Do(function (w, t) { CashW.addMove(C8.mt === 'in' ? 'in' : 'out', a, rea, per, t); }); toast('💸 ' + L('تزادت الحركة', 'Mouvement ajouté'));
});
App.act('c8-mdel', function (el) { if (!confirm(L('نمسحو هاد الحركة؟', 'Supprimer ce mouvement ?'))) return; c8Do(function () { CashW.delMove(el.dataset.id); }); });
App.act('c8-count', function () { var v = parseFloat(($('c8-count') || {}).value); if (isNaN(v) || v < 0) { toast(L('مبلغ غير صحيح', 'Montant invalide'), 'err'); return; } c8Do(function (w, t) { CashW.inventory(v, t); }); });
App.act('c8-close', function () { if (!App.user.admin) return; if (!confirm(L('نسدّو اليوم نهائياً؟', 'Clôturer définitivement la journée ?'))) return; c8Do(function (w, t) { CashW.close(t); }); });
App.act('c8-wa-sum', function () {
  var t = C8.t || Cash.today(), D = Cash.day(t), s = D.s || {};
  var chq = D.ops.filter(function (h) { return !h.unpaid && h.payMode === 'cheque'; }), chqSum = chq.reduce(function (a, h) { return a + (+h.paid || 0); }, 0);
  var tpe = D.ops.filter(function (h) { return !h.unpaid && h.payMode === 'tpe'; }), tpeSum = tpe.reduce(function (a, h) { return a + (+h.paid || 0); }, 0);
  var unp = D.ops.filter(function (h) { return h.unpaid; }), unpSum = unp.reduce(function (a, h) { return a + (+h.off || Math.abs(+h.diff || 0)); }, 0);
  var wafaSum = 0, catSum = 0;
  D.ops.forEach(function (h) {
    if (h.unpaid) return;
    var c = typeof h7Cie === 'function' ? h7Cie(h) : 'wafa';
    if (c === 'cat') catSum += (+h.paid || 0); else wafaSum += (+h.paid || 0);
  });
  var diffTxt = D.diff == null ? L('لم يتم الجرد بعد', 'Non compté') : Math.abs(D.diff) < 0.01 ? '✅ ' + L('مطابق (0.00 DH)', 'Conforme (0.00 DH)') : (D.diff > 0 ? '🔵 +' + c8Fmt(D.diff) + ' DH' : '🔴 −' + c8Fmt(D.diff) + ' DH');
  var msg = '🗄️ *' + L('ملخص الصندوق اليومي — ', 'Rapport de Caisse — ') + t + '*\n'
    + '━━━━━━━━━━━━━━━━━━\n'
    + '🔹 ' + L('رصيد الافتتاح: ', 'Solde d\'ouverture : ') + c8Fmt(s.openBal || 0) + ' DH\n'
    + '💵 ' + L('المقبوض نقداً (كاش): ', 'Encaissé espèces : ') + c8Fmt(D.revenue) + ' DH (' + D.cashOps.length + ')\n'
    + (chq.length ? '📄 ' + L('الشيكات: ', 'Chèques : ') + c8Fmt(chqSum) + ' DH (' + chq.length + ')\n' : '')
    + (tpe.length ? '💳 TPE : ' + c8Fmt(tpeSum) + ' DH (' + tpe.length + ')\n' : '')
    + '🔄 ' + L('حركات الصندوق: ', 'Mouvements : ') + (D.movesNet < 0 ? '−' : '+') + c8Fmt(D.movesNet) + ' DH (' + D.moves.length + ')\n'
    + '━━━━━━━━━━━━━━━━━━\n'
    + '🎯 *' + L('الرصيد المتوقع: ', 'Solde attendu : ') + c8Fmt(D.expected) + ' DH*\n'
    + (s.counted != null ? '🧮 ' + L('المبلغ الموجود: ', 'Montant compté : ') + c8Fmt(s.counted) + ' DH\n' : '')
    + '⚖️ ' + L('حالة الجرد: ', 'Écart : ') + diffTxt + '\n'
    + '━━━━━━━━━━━━━━━━━━\n'
    + '📊 ' + L('إجمالي العمليات: ', 'Total opérations : ') + D.ops.length + ' (Wafa: ' + c8Fmt(wafaSum) + ' DH · CAT: ' + c8Fmt(catSum) + ' DH)\n'
    + (unp.length ? '⏳ ' + L('عمليات غير مؤداة: ', 'Non payés : ') + unp.length + ' (' + c8Fmt(unpSum) + ' DH)\n' : '')
    + (s.closed ? '🔒 ' + L('اليوم مغلق (من طرف ', 'Clôturé par ') + (s.closedBy || '—') + ')' : '🟢 ' + L('الصندوق مفتوح', 'Caisse ouverte'));
  var ci = {}; try { ci = JSON.parse(localStorage.getItem('eurv102_ci') || '{}') || {}; } catch (e) { }
  if (typeof WA !== 'undefined' && WA.open && ci.phone) {
    WA.open(ci.phone, msg, { title: L('ملخص الصندوق — ', 'Résumé caisse — ') + t });
  } else {
    Modal.open(Modal.head('📲 ' + L('ملخص الصندوق (واتساب) — ', 'Résumé Caisse — ') + esc(t))
      + '<textarea id="c8-wa-txt" rows="12" style="width:100%;font-family:inherit">' + esc(msg) + '</textarea>'
      + '<div class="acts2" style="margin-top:8px"><button class="btn pri" data-act="c8-wa-copy">📋 ' + L('نسخ الملخص', 'Copier') + '</button>'
      + '<button class="btn wa" data-act="c8-wa-send">💬 ' + L('إرسال عبر واتساب', 'Envoyer via WhatsApp') + '</button></div>', 'small');
  }
});
App.act('c8-wa-copy', function () {
  var t = ($('c8-wa-txt') || {}).value || '';
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('📋 ' + L('نُسخ الملخص', 'Résumé copié')); });
});
App.act('c8-wa-send', function () {
  var t = ($('c8-wa-txt') || {}).value || '';
  var ph = prompt(L('أدخل رقم واتساب المدير:', 'Numéro WhatsApp du gérant :'), '') || '';
  if (ph.trim() && typeof WA !== 'undefined' && WA.open) { Modal.close(); WA.open(ph.trim(), t, { title: L('ملخص الصندوق', 'Résumé Caisse') }); }
});

/* ══════════════════════════════════════════════════════════
   📄 دفتر تتبّع الشيكات والكمبيالات (Suivi des Chèques & Effets)
══════════════════════════════════════════════════════════ */
var Chq8 = {
  f: 'all', q: '',
  getMeta: function () {
    var m = (typeof Meta !== 'undefined' && Meta.get) ? Meta.get('chequesMeta', null) : null;
    if (m && typeof m === 'object') return m;
    try { return JSON.parse(localStorage.getItem('rp8_cheques_meta') || '{}') || {}; } catch (e) { return {}; }
  },
  setMeta: function (num, patch) {
    if (!num) return;
    var all = Chq8.getMeta(), cur = all[num] || {};
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) cur[k] = patch[k];
    cur.updatedAt = new Date().toISOString();
    cur.updatedBy = App.user ? App.user.name : '';
    all[num] = cur;
    try { localStorage.setItem('rp8_cheques_meta', JSON.stringify(all)); } catch (e) { }
    if (typeof Meta !== 'undefined' && Meta.set) Meta.set('chequesMeta', all);
  },
  list: function () {
    var hist = []; try { hist = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || []; } catch (e) { hist = []; }
    var meta = Chq8.getMeta(), td = todayISO();
    return hist.filter(function (h) { return h && !h.unpaid && h.payMode === 'cheque'; }).map(function (h) {
      var m = meta[h.num] || {};
      var dIso = (h.date && h.date.length === 10) ? (h.date.slice(6, 10) + '-' + h.date.slice(3, 5) + '-' + h.date.slice(0, 2)) : '';
      var st = m.st || 'portefeuille';
      var ech = m.ech || dIso || td;
      var due = (st === 'portefeuille') && ech && ech <= td;
      return {
        num: h.num, date: h.date || '', dIso: dIso, client: h.client || '—', plate: h.plate || '',
        police: h.police || '', ins: h.ins || '', amount: +h.paid || +h.off || 0,
        chequeNum: h.chequeNum || m.chequeNum || '', bank: m.bank || '',
        st: st, ech: ech, due: due, note: m.note || '', user: h.user || ''
      };
    });
  },
  alerts: function () {
    var all = Chq8.list();
    return {
      impaye: all.filter(function (x) { return x.st === 'impaye'; }).length,
      due: all.filter(function (x) { return x.due; }).length,
      portefeuille: all.filter(function (x) { return x.st === 'portefeuille'; }).length
    };
  },
  openModal: function () {
    var all = Chq8.list(), q = (Chq8.q || '').trim().toLowerCase();
    var sumBy = function (fn) { return all.filter(fn).reduce(function (s, x) { return s + x.amount; }, 0); };
    var nPort = all.filter(function (x) { return x.st === 'portefeuille'; }).length, sPort = sumBy(function (x) { return x.st === 'portefeuille'; });
    var nDep = all.filter(function (x) { return x.st === 'depose'; }).length, sDep = sumBy(function (x) { return x.st === 'depose'; });
    var nEnc = all.filter(function (x) { return x.st === 'encaisse'; }).length, sEnc = sumBy(function (x) { return x.st === 'encaisse'; });
    var nImp = all.filter(function (x) { return x.st === 'impaye'; }).length, sImp = sumBy(function (x) { return x.st === 'impaye'; });
    var nDue = all.filter(function (x) { return x.due; }).length;

    var rows = all.filter(function (x) {
      if (Chq8.f === 'due' && !x.due) return false;
      else if (Chq8.f !== 'all' && Chq8.f !== 'due' && x.st !== Chq8.f) return false;
      if (q && (x.client + ' ' + x.chequeNum + ' ' + x.plate + ' ' + x.num + ' ' + x.amount).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    var stBadge = function (st) {
      return st === 'encaisse' ? 'ok' : st === 'impaye' ? 'red' : st === 'depose' ? 'blue' : 'amber';
    };
    var h = Modal.head('📄 ' + L('دفتر تتبّع الشيكات والكمبيالات', 'Suivi des Chèques & Effets') + ' (' + all.length + ')')
      + '<div class="chips wrap" style="margin-bottom:10px">'
        + '<button class="chip' + (Chq8.f === 'all' ? ' on' : '') + '" data-act="c8-chq-f" data-f="all">' + L('الكل', 'Tous') + ' <b>' + all.length + '</b></button>'
        + '<button class="chip' + (Chq8.f === 'portefeuille' ? ' on' : '') + '" data-act="c8-chq-f" data-f="portefeuille">📥 ' + L('في المحفظة', 'En portefeuille') + ' <b>' + nPort + '</b> (' + c8Fmt(sPort) + ' DH)</button>'
        + '<button class="chip' + (Chq8.f === 'due' ? ' on' : '') + '" data-act="c8-chq-f" data-f="due">⏰ ' + L('حان موعد إيداعها', 'À déposer') + ' <b>' + nDue + '</b></button>'
        + '<button class="chip' + (Chq8.f === 'depose' ? ' on' : '') + '" data-act="c8-chq-f" data-f="depose">🏦 ' + L('مودع بالبنك', 'Déposé') + ' <b>' + nDep + '</b> (' + c8Fmt(sDep) + ' DH)</button>'
        + '<button class="chip' + (Chq8.f === 'encaisse' ? ' on' : '') + '" data-act="c8-chq-f" data-f="encaisse">✅ ' + L('مصروف (Encaissé)', 'Encaissé') + ' <b>' + nEnc + '</b> (' + c8Fmt(sEnc) + ' DH)</button>'
        + '<button class="chip' + (Chq8.f === 'impaye' ? ' on' : '') + '" data-act="c8-chq-f" data-f="impaye">⚠️ ' + L('راجع بدون رصيد (Impayé)', 'Impayé') + ' <b>' + nImp + '</b>' + (sImp ? ' (' + c8Fmt(sImp) + ' DH)' : '') + '</button>'
      + '</div>'
      + '<div class="bar" style="margin-bottom:10px">'
        + '<div class="search" style="flex:1"><span>🔍</span><input id="c8-chq-q" data-inp="c8-chq-q" value="' + esc(Chq8.q) + '" placeholder="' + L('بحث بالاسم، رقم الشيك، الماتريكول أو المبلغ…', 'Rechercher par client, N° chèque, immat. ou montant…') + '"></div>'
        + (all.length ? '<button class="btn green sm" data-act="c8-chq-xls">📤 Excel</button>' : '')
      + '</div>'
      + (rows.length ? '<div class="sec-tw" style="max-height:58vh;overflow:auto"><table class="sec-t"><thead><tr>'
          + '<th>N°</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('رقم الشيك', 'N° Chèque') + '</th><th>' + L('المبلغ', 'Montant') + '</th><th>' + L('تاريخ الاستحقاق', 'Échéance') + '</th><th>' + L('الحالة', 'Statut') + '</th>'
        + '</tr></thead><tbody>'
        + rows.map(function (r) {
            return '<tr class="' + (r.st === 'impaye' ? 'red-r' : r.due ? 'amber-r' : '') + '">'
              + '<td class="ltr"><b>' + esc(r.num) + '</b></td>'
              + '<td class="ltr">' + esc(r.date) + '</td>'
              + '<td><b>' + esc(r.client) + '</b>' + (r.plate ? ' <small class="ltr">· ' + esc(r.plate) + '</small>' : '') + '</td>'
              + '<td class="ltr">' + esc(r.chequeNum || '—') + '</td>'
              + '<td class="ltr"><b>' + c8Fmt(r.amount) + ' DH</b></td>'
              + '<td><input type="date" class="inp sm" style="width:132px" data-inp="c8-chq-ech" data-num="' + esc(r.num) + '" value="' + esc(r.ech) + '"></td>'
              + '<td><select class="inp sm dc ' + stBadge(r.st) + '" data-inp="c8-chq-st" data-num="' + esc(r.num) + '">'
                + '<option value="portefeuille"' + (r.st === 'portefeuille' ? ' selected' : '') + '>📥 ' + L('في المحفظة', 'En portefeuille') + '</option>'
                + '<option value="depose"' + (r.st === 'depose' ? ' selected' : '') + '>🏦 ' + L('مودع بالبنك', 'Déposé') + '</option>'
                + '<option value="encaisse"' + (r.st === 'encaisse' ? ' selected' : '') + '>✅ ' + L('مصروف', 'Encaissé') + '</option>'
                + '<option value="impaye"' + (r.st === 'impaye' ? ' selected' : '') + '>⚠️ ' + L('راجع Impayé', 'Impayé') + '</option>'
              + '</select></td></tr>';
          }).join('')
        + '</tbody></table></div>'
        : '<div class="empty">📄 ' + L('لا توجد شيكات مطابقة للفلتر الحالي', 'Aucun chèque trouvé') + '</div>');
    Modal.open(h, 'wide');
  }
};
window.Chq8 = Chq8;
App.act('c8-chq-open', function () { Chq8.openModal(); });
App.act('c8-chq-f', function (el) { Chq8.f = el.dataset.f || 'all'; Chq8.openModal(); });
App.input('c8-chq-q', debounce(function (el) { Chq8.q = el.value || ''; Chq8.openModal(); var inp = $('c8-chq-q'); if (inp) { inp.focus(); var l = inp.value.length; try { inp.setSelectionRange(l, l); } catch (e) { } } }, 220));
App.input('c8-chq-st', function (el) { Chq8.setMeta(el.dataset.num, { st: el.value }); toast('✓ ' + L('تحدّثت حالة الشيك', 'Statut du chèque mis à jour')); Chq8.openModal(); });
App.input('c8-chq-ech', function (el) { Chq8.setMeta(el.dataset.num, { ech: el.value }); toast('📅 ' + L('تحدّث تاريخ الاستحقاق', 'Échéance mise à jour')); });
App.act('c8-chq-xls', function () {
  if (typeof XLSX === 'undefined') { toast('Excel…', 'err'); return; }
  var list = Chq8.list(); if (!list.length) return;
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.map(function (r) {
    return { 'N° Op': r.num, Date: r.date, Client: r.client, Immatriculation: r.plate, 'N° Chèque': r.chequeNum, 'Montant (DH)': r.amount, Echeance: r.ech, Statut: r.st, Agent: r.user };
  })), 'Cheques');
  XLSX.writeFile(wb, 'suivi-cheques-' + todayISO() + '.xlsx');
});
