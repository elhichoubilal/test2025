/* ═══ EUR assurance — 17-unpaid.js ═══  (v5)
   «⏳ لم يدفع»: الزبون خدا التأمين وما خلصش.
   • فـ«حساب جديد»: زر «لم يدفع» → العملية كتتسجل فالسجل بالثمن الرسمي، المدفوع 0، وعليها unpaid:true.
     الصندوق ديال داك النهار ما كيحسبهاش (payMode = 'unpaid').
   • فالصندوق: خانة «أخذوا التأمين ولم يدفعوا» (كاع اللي باقين، ماشي غير اليوم) مع زر «💰 دفع».
   • «💰 دفع» → الحاسبة معمّرة (بحال متابعة التجديدات) → VALIDER كيبدل نفس العملية (ما كتتزادش عملية جديدة):
     paid، diff، payMode، paidDate = نهار الدفع → الفلوس كتدخل لصندوق نهار الدفع.
   محرك الأثمنة ما كيتمسش: كنقراو غير getCompareOff / getEffOff / getDesc بحال valider. */

var UNPAID_PAY = null;   // العملية اللي كنخلصوها دابا: {num, date}

function upKey(h) { return String(h.num) + '|' + String(h.date || ''); }
function upFind(k) { ldH(); for (var i = 0; i < HIST.length; i++) if (upKey(HIST[i]) === k) return i; return -1; }
function upList() { ldH(); return HIST.filter(function (h) { return h.unpaid; }); }
function upDays(h) {
  var m = String(h.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return '';
  var d = new Date(+m[3], +m[2] - 1, +m[1]), t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((t - d) / 86400000);
}
function upT(ar, fr) { return LANG === 'fr' ? fr : ar; }

/* ── 1. تسجيل «لم يدفع» ── */
function markUnpaid() {
  var clientEl = document.getElementById('client');
  if (!clientEl.value.trim()) { clientEl.style.borderColor = 'var(--red)'; clientEl.focus(); setTimeout(function () { clientEl.style.borderColor = ''; }, 3000); return; }
  var off = getCompareOff();
  if (!off) { alert(upT('اختار التأمين باش يبان الثمن الرسمي أولاً', 'Choisissez d\'abord l\'assurance (prix officiel)')); return; }
  if (UNPAID_PAY) { alert(upT('هاد العملية ديجا «لم يدفع». دخل المبلغ وضغط VALIDER باش تخلصها.', 'Opération déjà impayée : saisissez le montant puis VALIDER.')); return; }
  var eff = getEffOff();
  if (!confirm(upT('تسجيل «لم يدفع»: ', 'Enregistrer comme impayé : ') + clientEl.value.trim() + ' — ' + fmt(eff) + ' DH ?')) return;
  ldH();
  var num = nextN(), client = clientEl.value.trim(), plate = document.getElementById('plate').value;
  var ds = document.getElementById('date-s').value, de = document.getElementById('date-e').value;
  var policeNum = document.getElementById('police-num').value.trim();
  var attestNum = (document.getElementById('attest-num') || { value: '' }).value.trim();
  var loc = (document.getElementById('location') || { value: '' }).value.trim();
  var now = new Date();
  HIST.unshift({ num: num, date: now.toLocaleDateString('fr-FR'), time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), user: CUR.n, av: CUR.av,
    client: client, plate: plate, police: policeNum, attest: attestNum, usage: USAGE, tarif: TARIF, ins: getDesc(), location: loc, ds: ds, de: de,
    paid: 0, off: off, diff: -eff, payMode: 'unpaid', payRef: '', unpaid: true });
  svH();
  saveClient(client, plate, getDesc(), de);
  clearDraft();
  document.getElementById('h-rec').textContent = curN();
  var info = (typeof rtAutoDone === 'function' ? rtAutoDone() : '');
  upFlash('⏳ N° ' + num + upT(' — تسجّلات «لم يدفع»', ' — enregistrée impayée'), client + ' — ' + fmt(eff) + ' DH ' + upT('باقي عليه', 'reste dû') + info);
  updateQuickStats(); renderDashboard();
  setTimeout(upResetForm, 3500);
}
function upFlash(title, info) {
  document.getElementById('val-num').textContent = title;
  document.getElementById('val-info').textContent = info;
  document.getElementById('valok').style.display = 'block';
}
function upResetForm() {
  ['client', 'plate', 'paid', 'cheque-num', 'tpe-ref', 'police-num', 'attest-num'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  if (document.getElementById('location')) document.getElementById('location').value = '';
  var tog = document.getElementById('man-tog'); if (tog && tog.checked && UNPAID_PAY === false) { tog.checked = false; if (typeof togMan === 'function') togMan(); }
  setPayMode('cash'); setUsage('Personnel'); setTarif('wafa'); document.getElementById('resbox').className = 'resbox';
  document.getElementById('action-area').style.display = 'none'; document.getElementById('valok').style.display = 'none'; document.getElementById('warn-box').style.display = 'none';
  ['m-paid', 'm-diff'].forEach(function (id) { document.getElementById(id).textContent = '—'; document.getElementById(id).className = 'sc-val'; });
  LAST = { paid: 0, off: 0, diff: 0 };
  if (UNPAID_PAY === false) UNPAID_PAY = null;
  upBar();
}

/* ── 2. الدفع: نرجعو للحاسبة معمّرين ── */
function payUnpaid(k) {
  var i = upFind(k); if (i < 0) return;
  var h = HIST[i];
  UNPAID_PAY = { k: k, num: h.num };
  RT_PAY_ID = null;
  navTo('calc');
  setTimeout(function () {
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; };
    set('client', h.client); set('plate', h.plate); set('police-num', h.police); set('attest-num', h.attest); set('paid', '');
    var tog = document.getElementById('man-tog');
    if (tog && !tog.checked) { tog.checked = true; if (typeof togMan === 'function') togMan(); }
    var pr = document.getElementById('man-price'); if (pr) { pr.value = Math.round((-h.diff || h.off) * 100) / 100; if (typeof updMan === 'function') updMan(); }
    document.getElementById('h-rec').textContent = h.num;
    upBar();
    var p = document.getElementById('paid'); if (p) p.focus();
    window.scrollTo(0, 0);
  }, 200);
}
function cancelUnpaidPay() {
  UNPAID_PAY = false; upResetForm();
  document.getElementById('h-rec').textContent = curN();
}
/* VALIDER ملي كنخلصو عملية «لم يدفع»: كنبدلو نفس العملية */
function validerUnpaid() {
  if (!LAST.paid) { alert(LANG === 'fr' ? "Calculez d'abord" : 'احسب أولاً'); return; }
  var i = upFind(UNPAID_PAY.k); if (i < 0) { alert(upT('ما لقيتش العملية فالسجل', 'Opération introuvable')); UNPAID_PAY = null; upBar(); return; }
  var h = HIST[i], now = new Date();
  h.paid = LAST.paid; h.diff = LAST.diff; h.payMode = PAY_MODE; h.payRef = getPayRef();
  h.unpaid = false; h.paidDate = now.toLocaleDateString('fr-FR'); h.paidTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); h.paidBy = CUR.n;
  svH();
  var sd = LAST.diff;
  document.getElementById('val-btn').style.display = 'none';
  upFlash('💰 N° ' + h.num + upT(' — تخلّصات', ' — payée'), h.client + ' — ' + fmt(Math.abs(sd)) + ' DH ' + (sd > 0 ? upT('مُرجَع', 'remboursé') : sd < 0 ? upT('مديون', 'dû') : upT('مطابق', 'soldé')));
  UNPAID_PAY = false;
  updateQuickStats(); renderDashboard();
  /* الوصل: نفس رقم العملية حتى يتمسح الفورم */
  setTimeout(function () { upResetForm(); document.getElementById('h-rec').textContent = curN(); }, 3500);
}

/* شريط فوق الحساب ملي كنخلصو عملية قديمة */
function upBar() {
  var bar = document.getElementById('up-bar'); if (!bar) return;
  if (UNPAID_PAY && UNPAID_PAY.k) {
    var i = upFind(UNPAID_PAY.k), h = i >= 0 ? HIST[i] : null;
    bar.innerHTML = '💰 ' + upT('دفع عملية «لم يدفع»: ', 'Paiement de l\'impayé : ') + '<b>N° ' + escHtml(UNPAID_PAY.num) + '</b>' + (h ? ' — ' + escHtml(h.client) + ' (' + escHtml(h.date) + ')' : '')
      + ' <button type="button" class="up-x" onclick="cancelUnpaidPay()">✕ ' + upT('إلغاء', 'Annuler') + '</button>';
    bar.style.display = 'block';
  } else bar.style.display = 'none';
  var b = document.getElementById('unpaid-btn'); if (b) b.style.display = (UNPAID_PAY && UNPAID_PAY.k) ? 'none' : '';
}

/* ── 3. الصندوق: خانة اللي ما خلصوش ── */
function unpaidBoxHtml() {
  var L = upList();
  if (!L.length) return '';
  var tot = L.reduce(function (s, h) { return s + Math.abs(h.diff || h.off || 0); }, 0);
  return '<div class="up-box"><div class="up-h">⏳ ' + upT('أخذوا التأمين ولم يدفعوا', 'Assurance prise, non payée') + ' <b>(' + L.length + ')</b><span>' + fmt(tot) + ' DH</span></div>'
    + L.map(function (h) { var d = upDays(h);
      return '<div class="up-row"><div class="up-m"><b>' + escHtml(h.client) + '</b>' + (h.plate ? ' <span class="up-pl">' + escHtml(h.plate) + '</span>' : '')
        + '<small>N° ' + escHtml(h.num) + ' · ' + escHtml(h.date) + (d !== '' ? ' · ' + (d === 0 ? upT('اليوم', "aujourd'hui") : d + upT(' يوم', ' j')) : '') + (h.user ? ' · ' + escHtml(h.user) : '') + '</small></div>'
        + '<div class="up-a"><b>' + fmt(Math.abs(h.diff || h.off || 0)) + '</b><button type="button" class="up-pay" onclick="payUnpaid(\'' + escHtml(upKey(h)).replace(/'/g, '&#39;') + '\')">💰 ' + upT('دفع', 'Payer') + '</button></div></div>'; }).join('')
    + '</div>';
}
(function () {
  /* الصندوق: الفلوس ديال عملية خلصات من بعد كتدخل لنهار الدفع */
  window.getCashOpsForDate = function (dateStr) {
    ldH();
    return HIST.filter(function (h) { return h.payMode === 'cash' && (h.paidDate ? h.paidDate === dateStr : h.date === dateStr); });
  };
  var rc = window.renderCaissePage;
  if (typeof rc === 'function') window.renderCaissePage = function () {
    var r = rc.apply(this, arguments);
    var b = document.getElementById('caisse-body'), html = unpaidBoxHtml();
    if (b && html) { var bar = b.querySelector('.cdb-note') || b.querySelector('.caisse-datebar'); var w = document.createElement('div'); w.innerHTML = html;
      if (bar && bar.nextSibling) b.insertBefore(w.firstChild, bar.nextSibling); else b.insertBefore(w.firstChild, b.firstChild); }
    return r;
  };
})();

/* ── الأزرار والتوصيل ── */
/* زر VALIDER كيتربط فـ window.onload (15-nav-pwa-init) → كنعاودو نربطوه من بعدو */
window.addEventListener('load', function () {
  var vb = document.getElementById('val-btn');
  if (vb) vb.onclick = function () { if (UNPAID_PAY && UNPAID_PAY.k) validerUnpaid(); else window.valider(); };
});
document.addEventListener('DOMContentLoaded', function () {
  var cb = document.getElementById('calc-btn');
  if (cb && !document.getElementById('unpaid-btn')) {
    var u = document.createElement('button'); u.type = 'button'; u.id = 'unpaid-btn'; u.className = 'unpaid-btn';
    u.innerHTML = '⏳ <span data-ar>لم يدفع — أخذ التأمين بلا خلاص</span><span data-fr>Non payé — assurance prise sans paiement</span>';
    u.onclick = markUnpaid; cb.parentNode.insertBefore(u, cb.nextSibling);
    var bar = document.createElement('div'); bar.id = 'up-bar'; bar.className = 'up-bar'; bar.style.display = 'none';
    cb.parentNode.insertBefore(bar, cb);
  }
  /* إلا تمسح الزبون يدوياً: نخرجو من وضع الدفع */
  var cl = document.getElementById('client');
  if (cl) cl.addEventListener('input', function () { if (UNPAID_PAY && UNPAID_PAY.k && !cl.value.trim()) cancelUnpaidPay(); });
  var st = document.createElement('style');
  st.textContent = '.unpaid-btn{width:100%;margin-top:7px;padding:11px;border-radius:12px;border:1.5px dashed #d97706;background:rgba(245,158,11,.08);color:#b45309;font:700 .9rem Tajawal,sans-serif;cursor:pointer}'
    + '.up-bar{margin:0 0 8px;padding:9px 11px;border-radius:11px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.4);font-size:.85rem}.up-bar .up-x{margin-inline-start:6px;border:0;background:none;color:var(--red);font-weight:700;cursor:pointer}'
    + '.up-box{margin:10px 0;border:1.5px solid rgba(245,158,11,.45);border-radius:14px;background:rgba(245,158,11,.06);overflow:hidden}'
    + '.up-h{display:flex;gap:8px;align-items:center;padding:10px 12px;font-weight:800;border-bottom:1px solid rgba(245,158,11,.3)}.up-h span{margin-inline-start:auto;color:#b45309;font-family:Inter,sans-serif}'
    + '.up-row{display:flex;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border)}.up-row:last-child{border-bottom:0}'
    + '.up-m{flex:1;min-width:0}.up-m small{display:block;color:var(--text3);font-size:.75rem}.up-pl{direction:ltr;unicode-bidi:isolate;color:var(--text2);font-size:.8rem}'
    + '.up-a{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.up-a b{color:#b45309;font-family:Inter,sans-serif}'
    + '.up-pay{border:0;border-radius:9px;padding:5px 10px;background:#059669;color:#fff;font:700 .8rem Tajawal,sans-serif;cursor:pointer}'
    + '.hrow-unpaid{display:inline-block;padding:1px 7px;border-radius:99px;background:rgba(245,158,11,.15);color:#b45309;font-size:.72rem;font-weight:800;margin-inline-start:4px}'
    + '.hrow-paidlater{display:inline-block;padding:1px 7px;border-radius:99px;background:rgba(16,185,129,.12);color:#059669;font-size:.72rem;font-weight:700;margin-inline-start:4px}';
  document.head.appendChild(st);
});
