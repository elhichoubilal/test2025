/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-ops.js   (💾 المرحلة 5ب: الحفظ بالمحرك الجديد)
   valider / markUnpaid / validerDirect / validerUnpaid ولاو فالبرنامج (منقولين حرفياً، نفس الشكل ونفس الخانات):
   الرقم (Store8.nextNum، نفس العداد) → العملية (Eng.entry) → السجل (Store8.save) → زبناء الحاسبة (saveClient)
   → المسودة → المتابعة (RT_PAY_ID + rhSweep) → لائحة التجديد ديال RenewPro (calcApplyOp) → تخوية الفورم.
   الحالة ديال الفورم مازال فخانات الإطار (PDF، «احسب السعر»، Encaisser… كيعمروها) حتى المرحلة 5ج.
══════════════════════════════════════════════════════════ */
'use strict';
var Ops = (function () {
  var J = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  function now() { var n = new Date(); return { d: n.toLocaleDateString('fr-FR'), t: n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), n: n }; }
  function frIso(d) { var m = String(d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; }
  function tsOf(h) { var iso = frIso(h.date); if (!iso) return 0; var t = new Date(iso + 'T' + (/^\d{1,2}:\d{2}/.test(h.time || '') ? ('0' + h.time).slice(-5) : '12:00') + ':00'); return isNaN(t) ? 0 : t.getTime(); }
  /* نفس toOp ديال calc/embed.js */
  function toOp(h, ts) {
    return { id: String(h.num) + '@' + (h.date || '') + ' ' + (h.time || ''), num: h.num, ts: ts || tsOf(h), date: frIso(h.date), client: h.client || '', plate: h.plate || '',
      police: h.police || '', attest: h.attest || '', ds: h.ds || '', de: h.de || '', tarif: h.directPay ? 'direct' : (h.tarif || 'wafa'), desc: h.ins || '', due: h.off, paid: h.paid, diff: h.diff, user: h.user || '' };
  }
  function fv(w, id) { var e = w.document.getElementById(id); return e ? e.value : ''; }
  function stateOf(w) { var s = n8St(w); s.client = fv(w, 'client'); s.plate = fv(w, 'plate'); s.police = fv(w, 'police-num'); s.attest = fv(w, 'attest-num'); s.location = fv(w, 'location'); s.de = fv(w, 'date-e'); return s; }
  function saveHist(h) { var H = J('eurv102_h', []); H.unshift(h); Store8.save('history', H); return H; }
  /* saveClient (12-clients-direct-export.js) */
  function saveClient(name, plate, ins, de) {
    if (!name || name === '—') return; var C = J('eurv102_c', []), i = C.findIndex(function (x) { return x.n === name && x.p === plate; });
    var e = { n: name, p: plate || '', t: ins || '', de: de || '', upd: new Date().toISOString().slice(0, 10) }; if (i >= 0) C[i] = e; else C.unshift(e); Store8.save('clients', C);
  }
  /* rtAutoDone (16-renewals-tracker.js) */
  function rtAutoDone(w) {
    var id = w.RT_PAY_ID; w.RT_PAY_ID = null; if (!id) return '';
    var R = J('eurv102_renewals', []), c = R.filter(function (x) { return x.id === id; })[0]; if (!c || c.status === 'done') return '';
    R = R.map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'done', doneDate: w.rtToday() }) : x; }); Store8.save('renewals', R); if (w.RT_CLIENTS !== undefined) w.RT_CLIENTS = R;
    return L(' · ✓ تنقل فالمتابعة لـ «أدّاو»', ' · ✓ suivi : payé');
  }
  function after(w, H, h, fresh) {
    if (w.HIST !== undefined) w.HIST = H;                         /* الإطار (إلا كان) كيبقى متوافق */
    try { if (typeof w.rhSweep === 'function') { var n = w.rhSweep(); if (n) toast('✅ ' + n + L(' زبون فالمتابعة → أدّاو', ' client(s) du suivi → payés')); } } catch (e) { }
    try { if (fresh && typeof calcApplyOp === 'function') calcApplyOp(toOp(h, Date.now()), true); } catch (e) { console.error(e); }
    try { localStorage.removeItem('eurv102_draft_' + (w.CUR || {}).n); } catch (e) { }
    reset(w);
  }
  /* تخوية الفورم (بحال الـ setTimeout ديال valider و upResetForm) */
  function reset(w) {
    try {
      if (typeof n7Clear === 'function') n7Clear(w);
      var pt = w.document.getElementById('prev-tog'); if (pt && pt.checked) { pt.checked = false; w.togPrev(); }
      if (w.INSTALL_SHOWN) w.toggleInstallView();
      if (w.DIRECT_MODE) w.toggleDirect();
      w.LAST = { paid: 0, off: 0, diff: 0 }; if (w.UNPAID_PAY) w.UNPAID_PAY = null; w.RT_PAY_ID = null; w.DIRECT_CIE = '';
      var hr = w.document.getElementById('h-rec'); if (hr && w.curN) hr.textContent = w.curN();
      if (w.upBar) w.upBar(); if (w.updateQuickStats) w.updateQuickStats();
    } catch (e) { console.error(e); }
  }
  /* 7.17: الوصف من الوثيقة (CAT / Avenant) إلا مازال نفس الثمن ديالها — نفس الخانة ins، بلا خانة جديدة */
  function docDesc(w, s, h) {
    var d = w.PDF_DOC; if (!d || !s.man || d.price == null || Math.abs((parseFloat(s.manPrice) || 0) - d.price) >= 0.005) return h;
    if (d.desc) h.ins = d.desc;
    if (typeof Fac8 !== 'undefined') Fac8.remember(h.num, d);      /* التفصيل ديال الكيتانص للفاتورة (فالذاكرة، بلا خانة جديدة) */
    return h;
  }
  function ctx(w, num) { var c = w.CUR || {}; return { num: num, user: c.n || (App.user && App.user.name) || '', av: c.av || '' }; }

  /* ✓ التأكيد (valider، ولا validerUnpaid إلا كنا كنخلصو «لم يدفع») */
  function valider(w) {
    var s = stateOf(w), c = Eng.compare(s);
    if (!String(s.client).trim()) return { err: L('كتب اسم الزبون', 'Nom du client requis'), focus: 'client' };
    if (!c.cmp) return { err: L('اختار التأمين باش يبان الثمن', 'Choisissez l\'assurance') };
    if (!c.paid) return { err: L('كتب المبلغ اللي عطا (ولا «لم يدفع»)', 'Saisissez le montant (ou « Non payé »)'), focus: 'paid' };
    if (w.UNPAID_PAY && w.UNPAID_PAY.k) return payUnpaid(w, s, c);
    var num = Store8.nextNum(), h = docDesc(w, s, Eng.entry(s, ctx(w, num))), H = saveHist(h);
    saveClient(h.client, h.plate, h.ins, h.de);
    var info = rtAutoDone(w); after(w, H, h, true);
    return { h: h, info: info };
  }
  function payUnpaid(w, s, c) {
    var H = J('eurv102_h', []), k = w.UNPAID_PAY.k, i = typeof w.upFind === 'function' ? (w.HIST = H, w.upFind(k)) : -1;
    if (i < 0) { w.UNPAID_PAY = null; return { err: L('ما لقيتش العملية فالسجل', 'Opération introuvable') }; }
    var h = H[i], t = now();
    h.paid = c.paid; h.diff = c.diff; h.payMode = s.payMode; h.payRef = Eng.payRef(s);
    h.unpaid = false; h.paidDate = t.d; h.paidTime = t.t; h.paidBy = (w.CUR || {}).n;
    Store8.save('history', H); w.UNPAID_PAY = false;
    after(w, H, h, false);
    return { h: h, info: '', paidOld: true };
  }
  /* ⏳ لم يدفع (markUnpaid) */
  function unpaid(w) {
    var s = stateOf(w), c = Eng.compare(s);
    if (!String(s.client).trim()) return { err: L('كتب اسم الزبون', 'Nom du client requis'), focus: 'client' };
    if (!c.cmp) return { err: L('اختار التأمين باش يبان الثمن الرسمي أولاً', 'Choisissez d\'abord l\'assurance') };
    if (w.UNPAID_PAY) return { err: L('هاد العملية ديجا «لم يدفع». دخل المبلغ وأكد باش تخلصها.', 'Opération déjà impayée : saisissez le montant puis validez.') };
    if (!confirm(L('تسجيل «لم يدفع»: ', 'Enregistrer comme impayé : ') + String(s.client).trim() + ' — ' + money(c.eff) + ' DH ?')) return { cancel: true };
    var num = Store8.nextNum(), t = now(), e = docDesc(w, s, Eng.entry(s, ctx(w, num)));
    var h = { num: num, date: t.d, time: t.t, user: e.user, av: e.av, client: e.client, plate: e.plate, police: e.police, attest: e.attest, usage: e.usage, tarif: e.tarif, ins: e.ins, location: e.location, ds: e.ds, de: e.de,
      paid: 0, off: c.cmp, diff: -c.eff, payMode: 'unpaid', payRef: '', unpaid: true };
    var H = saveHist(h); saveClient(h.client, h.plate, h.ins, h.de);
    var info = rtAutoDone(w); after(w, H, h, true);
    return { h: h, info: info };
  }
  /* ⚡ الدفع المباشر (validerDirect) */
  function direct(w) {
    var client = String(fv(w, 'client')).trim() || '—', plate = String(fv(w, 'plate')).trim(), desc = String(fv(w, 'direct-desc')).trim() || L('دفع مباشر', 'Paiement direct'), amt = parseFloat(fv(w, 'direct-amount')) || 0;
    if (!amt) return { err: L('دخل المبلغ', 'Entrez le montant') };
    if (client === '—' || !client) return { err: L('دخل اسم الزبون', 'Entrez le nom client'), focus: 'client' };
    if (w.DIRECT_CIE !== 'wafa' && w.DIRECT_CIE !== 'cat') return { err: L('اختار الشركة: Wafa ولا CAT', 'Choisissez la compagnie : Wafa ou CAT') };
    var num = Store8.nextNum(), t = now(), c = w.CUR || {};
    var h = { num: num, date: t.d, time: t.t, user: c.n, av: c.av, client: client, plate: plate, ins: '⚡ ' + (w.DIRECT_CIE === 'cat' ? '[CAT] ' : '[Wafa] ') + desc, ds: '', de: '', paid: amt, off: amt, diff: 0, payMode: w.PAY_MODE, directPay: true };
    var H = saveHist(h); after(w, H, h, false);
    return { h: h, info: '' };
  }
  return { valider: valider, unpaid: unpaid, direct: direct, toOp: toOp, saveClient: saveClient, reset: reset };
})();
