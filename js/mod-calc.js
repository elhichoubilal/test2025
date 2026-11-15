/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-calc.js   (ربط الحاسبة «EUR assurance — Desktop»)
   الحاسبة تبقى برنامجاً مستقلاً في مجلد calc/ وتُعرض هنا داخل إطار، بالدخول نفسه.
   • «احسب السعر» من بطاقة الزبون أو الجلسة يفتحها وبياناته جاهزة.
   • عند حفظ عملية فيها، يُعلَّم الزبون «تم التجديد» في لائحة التجديد (بالبوليصة ثم اللوحة).
   بيانات الحاسبة (العمليات، الصندوق، الأسعار) تبقى في قاعدتها ولا تُنقل.
══════════════════════════════════════════════════════════ */
'use strict';

var Calc = { frame: null, ready: false, pending: null, pendingPage: null, tracker: null, curPage: null };

function calcHost() {
  var h = $('calc-host');
  if (!h) {
    h = document.createElement('div'); h.id = 'calc-host'; h.className = 'calc-host';
    h.innerHTML = '<div class="chips calc-strip" id="calc-strip"></div><iframe id="calc-frame" src="calc/index.html" title="Calculatrice"></iframe>'
      + '<button class="btn pri calc-back hide" id="calc-back" data-act="calc-back"></button>';
    $('app').appendChild(h); Calc.frame = $('calc-frame'); Calc.ready = false;
  }
  return h;
}
function calcSend(m) { try { if (Calc.frame && Calc.frame.contentWindow) Calc.frame.contentWindow.postMessage(m, '*'); } catch (e) { } }
function calcBackBtn() { var b = $('calc-back'); if (!b) return; b.classList.toggle('hide', !Session.on); b.textContent = '↩ ' + L('الرجوع إلى جلسة الاتصال', 'Retour à la session'); }
/* v4.2 — الدمج: كل صفحة من الحاسبة صارت قسماً في قائمة RenewPro (المحرك والحساب لا يُمسّان).
   [معرّف القسم في RenewPro، اسم الصفحة داخل الحاسبة، أيقونة، [عربي، فرنسي]، للمدير فقط] */
var CALC_PAGES = [
  ['calc',       'calc',     '🧮', ['حساب جديد', 'Nouveau calcul']],
  ['c-renewals', 'renewals', '⏳', ['متابعة التجديدات', 'Suivi renouv.']],
  ['c-hist',     'hist',     '📋', ['السجل', 'Historique']],
  ['c-caisse',   'caisse',   '🗄️', ['الصندوق', 'Caisse']],
  ['c-clients',  'clients',  '👥', ['زبناء الحاسبة', 'Clients calc.']],
  ['c-dash',     'dash',     '📊', ['لوحة الحاسبة', 'Tableau calc.']],
  ['c-stats',    'stats',    '📈', ['الإحصاء', 'Statistiques']],
  ['c-journal',  'journal',  '📒', ['اليوميات', 'Journal']],
  ['c-reports',  'reports',  '🧾', ['التقارير', 'Rapports']],
  ['c-archives', 'archives', '🗂️', ['أرشيف الحاسبة', 'Archives calc.']],
  ['c-prices',   'prices',   '💰', ['الأسعار', 'Prix'], 1],
  ['c-pdftpl',   'pdftpl',   '🧷', ['قوالب PDF', 'Modèles PDF'], 1],
  ['c-sync',     'sync',     '🔄', ['مستخدمو الحاسبة', 'Utilisateurs calc.'], 1]
];
function calcModOf(page) { var p = CALC_PAGES.filter(function (x) { return x[1] === page; })[0]; return p ? p[0] : 'calc'; }
function calcPageOf(id) { var p = CALC_PAGES.filter(function (x) { return x[0] === id; })[0]; return p ? p[1] : null; }
function isCalcMod(id) { return !!calcPageOf(id); }
/* الانتقال داخل الحاسبة فقط حين تتغيّر الصفحة (إعادة رسم RenewPro لا تُعيد رسم صفحة الحاسبة) */
function calcNav(page) { if (!page) return; if (Calc.ready) { if (Calc.curPage !== page) { Calc.curPage = page; calcSend({ type: 'rp-nav', page: page }); } } else Calc.pendingPage = page; }
function calcStripHTML() {
  return CALC_PAGES.filter(function (p) { return App.visibleMods().some(function (m) { return m.id === p[0]; }); }).map(function (p) {
    return '<button class="chip' + (App.page === p[0] ? ' on' : '') + '" data-act="nav" data-id="' + p[0] + '">' + p[2] + ' ' + esc(L(p[3][0], p[3][1])) + '</button>'; }).join('');
}
function renderCalcMod(el) {
  el.innerHTML = ''; var h = calcHost(); h.classList.add('on'); calcBackBtn();
  var s = $('calc-strip'); if (s) s.innerHTML = calcStripHTML();
  calcNav(calcPageOf(App.page) || 'calc');
}
App.on('page', function (id) { var h = $('calc-host'); if (h) h.classList.toggle('on', isCalcMod(id)); });
/* الوضع الليلي يصل إلى الحاسبة أيضاً */
(function () { var f = App.setTheme; App.setTheme = function (t) { f.apply(App, arguments); calcSend({ type: 'rp-theme', theme: Local.get('theme', 'light') }); }; })();
App.on('lang', function () { calcSend({ type: 'rp-lang', lang: App.lang }); });
App.on('logout', function () { var h = $('calc-host'); if (h) h.remove(); Calc.frame = null; Calc.ready = false; Calc.pending = null; Calc.tracker = null; Calc.curPage = null; });
/* تُحمَّل الحاسبة في الخلفية بعد الدخول: هكذا تصل عمليات الأجهزة الأخرى وتنبيهات مهلة الأيام دون فتح قسمها */
App.on('login', function () { setTimeout(function () { if (App.user && App.visibleMods().some(function (m) { return m.id === 'calc'; })) calcHost(); }, 4000); });
/* من الصفحة الرئيسية إلى صفحة معيّنة داخل الحاسبة */
App.on('go.calc', function (page) { if (!page) return; var id = calcModOf(page); if (App.page !== id && App.mod(id)) App.go(id); else calcNav(page); });
/* بطاقة «متابعة التجديدات» في الصفحة الرئيسية: من تجاوز المهلة ولم يؤدِّ */
App.hook('dash.cards', function () { var t = Calc.tracker; if (!t || !t.total || !App.can('calc')) return [];
  return [{ ic: '⏳', label: L('ملزمون بالأداء (+8 أيام)', 'À payer (+8 jours)'), value: t.urgent, cls: t.urgent ? 'red' : '', go: 'c-renewals', mod: 'c-renewals',
    sub: L('تنبيه: ' + t.warn + ' · قيد الانتظار: ' + t.total, 'alerte : ' + t.warn + ' · en attente : ' + t.total) }]; });

/* الزبون المطابق لعملية الحاسبة: البوليصة أولاً (ثم اللوحة للحسم)، وإلا اللوحة إن كانت لزبون واحد */
function calcFindContact(op) {
  var list = Contacts.list.filter(function (c) { return !c.deleted; }), kp = kPolTail(op.police), kl = kPlate(op.plate), hit = [];
  var pre = String(op.police || '').indexOf('/') >= 0 ? String(op.police).split('/')[0].trim() : '';
  if (kp) { hit = list.filter(function (c) { if (kPolTail(c.police) !== kp) return false;
      var cp = String(c.police || '').indexOf('/') >= 0 ? String(c.police).split('/')[0].trim() : String(c.cat || '').trim();
      return !pre || !cp || pre === cp; });                       // البادئة (cat) تحسم إن وُجدت في الجهتين
    if (hit.length > 1 && kl) { var n = hit.filter(function (c) { return kPlate(c.plate) === kl; }); if (n.length) hit = n; } }
  if (!hit.length && kl) { hit = list.filter(function (c) { return kPlate(c.plate) === kl; }); if (hit.length > 1) hit = []; }
  return hit.length === 1 ? hit[0] : (hit.length > 1 ? hit.filter(function (c) { return !c.renewed; })[0] || null : null);
}
function calcApplyOp(op, fresh) {
  if (!op || !op.id || op.tarif === 'direct') return;
  if (!op.police && !op.plate) { if (fresh) toast(L('حُفظت العملية — لم تُربط بلائحة التجديد (لا بوليصة ولا لوحة)', 'Opération enregistrée — non liée (ni police ni immat.)')); return; }
  var c = calcFindContact(op);
  if (!c) { if (fresh) toast(L('حُفظت العملية — الزبون ليس في لائحة التجديد', 'Opération enregistrée — client absent de la liste')); return; }
  if (c.renewed || c.renewOpId === op.id || (c.renewIgnore || []).indexOf(op.id) >= 0 || (!fresh && c.noAuto)) return;
  /* عمليات قديمة (سُجّلت قبل تحميل هذه اللائحة) لا تُعلّم أحداً */
  if (!fresh && (op.ts || 0) < (Date.parse(c.created || '') || 0)) return;
  Contacts.update(c.id, { renewed: true, followup: false, renewedAt: new Date(op.ts || Date.now()).toISOString(), renewedBy: op.user || App.user.name, renewedVia: 'calc',
    renewOpId: op.id, renewOpNum: op.num || '', renewAmount: op.due || '',
    renewalLog: FB.FV.arrayUnion({ date: op.date || todayISO(), oldExpiry: c.dateE || '', newExpiry: op.de || '', user: op.user || App.user.name, op: op.num || '' }) });
  if (Session.on) Session.handled(c.id);
  toast('✅ ' + (c.name || '') + ' — ' + L('تم التجديد (من الحاسبة)', 'renouvelé (calculatrice)'));
}
window.addEventListener('message', function (e) {
  if (!Calc.frame || e.source !== Calc.frame.contentWindow || !App.user) return;
  var m = e.data || {};
  if (m.type === 'eurpro-ready') { Calc.ready = true;
    Calc.curPage = Calc.pendingPage || (isCalcMod(App.page) ? calcPageOf(App.page) : null);
    calcSend({ type: 'rp-user', user: { email: App.user.email, name: App.user.name, admin: App.user.admin, lang: App.lang, theme: Local.get('theme', 'light') }, prefill: Calc.pending, page: Calc.curPage }); Calc.pending = null; Calc.pendingPage = null; }
  /* انتقال من داخل الحاسبة (مثلاً زر 🔄 في المتابعة يفتح «حساب جديد»): القائمة تتبعه */
  else if (m.type === 'eurpro-page') { Calc.curPage = m.page; var id = calcModOf(m.page);
    if (isCalcMod(App.page) && App.page !== id && App.mod(id)) { App.page = id; Local.set('page', id); App.renderNav(); var s = $('calc-strip'); if (s) s.innerHTML = calcStripHTML(); } }
  else if (m.type === 'eurpro-tracker') { Calc.tracker = m.data || null; App.refresh(); }
  else if (m.type === 'eurpro-op') calcApplyOp(m.op, true);
  else if (m.type === 'eurpro-ops') (m.ops || []).forEach(function (o) { calcApplyOp(o, false); });
  else if (m.type === 'eurpro-issued') calcApplyIssued(m.items || []);
});

/* البوردورو المستورد في «متابعة التجديدات»: عقود صدرت فعلاً → أصحابها جدّدوا، فلا يُتصل بهم */
function calcApplyIssued(items) {
  var ops = [], names = [];
  items.forEach(function (it) {
    if (it.type === 'cancel') return;
    var c = calcFindContact({ police: it.police, plate: it.plate }); if (!c || c.renewed || c.noAuto) return;
    ops.push({ ref: Contacts.col().doc(c.id), upd: { renewed: true, followup: false, renewedAt: new Date().toISOString(), renewedBy: App.user.name, renewedVia: 'bordereau',
      renewAmount: it.price || '', renewalLog: FB.FV.arrayUnion({ date: it.date || todayISO(), oldExpiry: c.dateE || '', newExpiry: '', user: App.user.name, op: 'bordereau' }) } });
    names.push(c.name);
  });
  if (!ops.length) { toast(L('البوردورو: لا أحد منهم في لائحة التجديد', 'Bordereau : aucun client dans la liste')); return; }
  FB.batches(ops).then(function () { toast('✅ ' + L('عُلّم ' + ops.length + ' زبون «تم التجديد» (من البوردورو)', ops.length + ' clients marqués renouvelés (bordereau)')); }).catch(syncErr);
}

/* «احسب السعر»: يفتح الحاسبة وبيانات الزبون جاهزة */
App.act('calc-open', function (el) {
  var c = Contacts.get(el.dataset.id); if (!c) return;
  var d = { client: c.name || '', phone: c.phone || '', plate: c.plate || '', police: polFull(c), attest: c.att || '', ds: parseISO(c.dateE) ? c.dateE : '' };
  if (Session.on) $('session').classList.remove('on');       // الجلسة تبقى محفوظة، نرجع إليها بزر
  if (Sheet.isOpen()) Sheet.close();
  Modal.close();
  if (Calc.ready) { App.go('calc'); Calc.curPage = 'calc'; calcSend({ type: 'rp-prefill', data: d }); } else { Calc.pending = d; App.go('calc'); }
});
App.act('calc-back', function () { App.go('renew'); if (Session.on) { $('session').classList.add('on'); Session.render(); } });

function calcBtn(c) { if (!App.can('calc')) return ''; return '<button class="btn wide calc-btn" data-act="calc-open" data-id="' + esc(c.id) + '">🧮 ' + L('احسب السعر في الحاسبة', 'Calculer la prime') + '</button>'; }
App.hook('contact.blocks', function (c) {
  if (c.renewed && c.renewedVia === 'bordereau') return '<div class="dbox ok">✅ ' + L('جُدّد — ورد في البوردورو', 'Renouvelé — figure au bordereau') + (c.renewAmount ? ' · ' + moneyH(c.renewAmount, 1) : '') + (c.renewedAt ? ' · ' + relTime(c.renewedAt) : '') + '</div>';
  if (c.renewed && c.renewedVia === 'calc') return '<div class="dbox ok">✅ ' + L('جُدّد عبر الحاسبة', 'Renouvelé via la calculatrice') + (c.renewOpNum ? ' · ' + ltr(c.renewOpNum) : '') + (c.renewAmount ? ' · ' + moneyH(c.renewAmount, 1) : '') + (c.renewedAt ? ' · ' + relTime(c.renewedAt) : '') + '</div>';
  return c.renewed ? '' : calcBtn(c);
});
App.hook('session.blocks', function (c) { return calcBtn(c); });

CALC_PAGES.forEach(function (p, i) {
  App.register({ id: p[0], icon: p[2], title: p[3], order: 25 + i * 0.01, render: renderCalcMod, admin: !!p[4], perm: p[4] ? null : 'calc', group: 'calc', groupIcon: '🧮', groupTitle: ['الحاسبة', 'Calculatrice'] });
});
