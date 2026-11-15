/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-sec.js   (🛡️ مركز الأمان والنظام · 7.6)
   كلشي من بيانات حقيقية:
   • الأحداث (دخول، خروج، محاولة فاشلة، القفل، نسخة، استعادة، إنهاء جلسة) ← «logs» (kind:'sec')
     رقم المستند مقلوب بالوقت ⇒ where(kind=='sec') كيرجع الأحدث الأول بلا index جديد.
   • الجلسات ← collection جديدة «sessions» (كل جهاز سطر، كيتحدّث كل دقيقتين). «إنهاء» = علامة kick
     كيقراها البرنامج عند الموظف ← كيخرج. (القطع الحقيقي ديال الحساب: Firebase Console / Cloud Functions)
   • المحاولات الفاشلة: القواعد كتمنع الكتابة قبل الدخول ⇒ كتتحفظ فالجهاز وكتتصيفط مع أول دخول ناجح منو.
   • ما كنعرضوش IP (المتصفح ما كيعرفوش بلا خدمة خارجية).
══════════════════════════════════════════════════════════ */
'use strict';
var Sec = { ev: [], evReady: false, evUnsub: null, ses: [], sesUnsub: null, mySes: null, ping: null, pinging: false,
  v: { q: '', r: 'all', day: '', pg: 0, sq: '', sk: 'all' }, BEAT: 120000, ACTIVE: 5 * 60000 };
var SEC_FAILQ = 'rp7_failq';

/* ───────── الجهاز ───────── */
function secDev() { var d = Local.get('devId', ''); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); Local.set('devId', d); } return d; }
function secUA() {
  var u = navigator.userAgent || '', b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Navigateur';
  var o = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iOS' : /Mac OS/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '';
  return { b: b, o: o, m: /Mobi|Android|iPhone/.test(u) };
}
function secUid() { return FB.auth && FB.auth.currentUser ? FB.auth.currentUser.uid : ''; }

/* ───────── الأحداث ───────── */
function secEvId() { return 'S' + (9999999999999 - Date.now()) + Math.random().toString(36).slice(2, 6); }
function secLog(ev, msg, extra, asUser) {
  if (!FB.db) return Promise.resolve();
  var ua = secUA(), d = { at: new Date().toISOString(), kind: 'sec', ev: ev, msg: String(msg || '').slice(0, 300), ver: App.version,
    user: asUser || (App.user ? App.user.name : ''), email: App.user ? App.user.email : '', dev: secDev(), ua: ua.b + (ua.o ? ' · ' + ua.o : '') + (ua.m ? ' · mobile' : '') };
  if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
  return FB.db.collection('logs').doc(secEvId()).set(d).catch(function () { });
}
Sec.startEv = function () {
  if (Sec.evUnsub || !FB.db || !App.user || !App.user.admin) return;
  Sec.evUnsub = FB.db.collection('logs').where('kind', '==', 'sec').limit(400).onSnapshot(function (s) {
    Sec.ev = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    Sec.evReady = true; Sec.evDenied = false; if (App.page === 'sec') App.refresh();
  }, function () { Sec.evDenied = true; Sec.evReady = true; if (App.page === 'sec') App.refresh(); });
};

/* الدخول: كنفرّقو بين دخول بالكلمة (كيتسجل) وإعادة فتح الصفحة (ما كيتسجلش) */
(function () {
  var o = FB.login;
  FB.login = function (email, pw) {
    return o(email, pw).then(function (r) { try { sessionStorage.setItem('rp7_jl', '1'); } catch (e) { } return r; }, function (err) {
      var c = (err && err.code) || '';
      if (/wrong-password|invalid-credential|user-not-found|invalid-email|too-many-requests|user-disabled/.test(c)) {
        try { var q = JSON.parse(localStorage.getItem(SEC_FAILQ) || '[]'); q.push({ at: new Date().toISOString(), email: String(email || '').slice(0, 80), code: c.replace('auth/', '') }); localStorage.setItem(SEC_FAILQ, JSON.stringify(q.slice(-30))); } catch (e) { }
      }
      throw err;
    });
  };
  var ol = FB.logout;
  FB.logout = function () {
    var args = arguments, done = false, go = function () { if (done) return; done = true; secEnd(); return ol.apply(FB, args); };
    if (!App.user || Sec.noLogLogout) return go();
    var p = secLog('logout', Sec.reason || '');
    return new Promise(function (res) { var t = setTimeout(function () { res(go()); }, 1500); p.then(function () { clearTimeout(t); res(go()); }); });
  };
})();
App.on('login', function () {
  setTimeout(function () {
    if (!App.user) return;
    var jl = false; try { jl = sessionStorage.getItem('rp7_jl') === '1'; sessionStorage.removeItem('rp7_jl'); } catch (e) { }
    if (jl) secLog('login', '');
    var q = []; try { q = JSON.parse(localStorage.getItem(SEC_FAILQ) || '[]'); localStorage.removeItem(SEC_FAILQ); } catch (e) { }
    q.forEach(function (f) { secLog('fail', f.code || '', { at: f.at, tried: f.email }, '—'); });
    secBeat(true); Sec.startEv();
  }, 1200);
});

/* ───────── الجلسات (sessions/{uid_dev}) ───────── */
function secSesRef() { var u = secUid(); return u ? FB.db.collection('sessions').doc(u + '_' + secDev()) : null; }
function secBeat(first) {
  var r = secSesRef(); if (!r || !App.user) return;
  var ua = secUA(), now = new Date().toISOString(), d = { uid: secUid(), email: App.user.email, name: App.user.name, dev: secDev(), b: ua.b, o: ua.o, m: ua.m, last: now, page: App.page || '', ver: App.version };
  if (first) {
    /* إلا كانت علامة «إنهاء» كتسنا (مثلاً كان بلا نت): كنطبقوها قبل ما نبداو */
    r.get().then(function (s) { var x = s && s.exists ? s.data() : null; if (x && x.kick) { secKicked(x.kick); return; } d.start = now; r.set(d, { merge: true }).catch(function () { Sec.sesDenied = true; }); }, function () { Sec.sesDenied = true; });
  } else r.set(d, { merge: true }).catch(function () { Sec.sesDenied = true; });
  if (first && !Sec.mySes) Sec.mySes = r.onSnapshot(function (s) { var x = s && s.exists ? s.data() : null; if (x && x.kick) secKicked(x.kick); }, function () { });
}
function secKicked(k) {
  if (Sec.kicking) return; Sec.kicking = true;
  secLog('kicked', L('الجلسة تسدّات من طرف ', 'Session fermée par ') + (k.by || ''));
  toast('🚪 ' + L('المدير سدّ هاد الجلسة', 'Session fermée par le gérant'), 'err');
  Sec.noLogLogout = true; setTimeout(function () { FB.logout(); Sec.noLogLogout = false; Sec.kicking = false; }, 1500);
}
function secEnd() {
  if (Sec.mySes) { try { Sec.mySes(); } catch (e) { } Sec.mySes = null; }
  var r = secSesRef(); if (r) r.delete().catch(function () { });
  if (Sec.sesUnsub) { try { Sec.sesUnsub(); } catch (e) { } Sec.sesUnsub = null; }
  if (Sec.evUnsub) { try { Sec.evUnsub(); } catch (e) { } Sec.evUnsub = null; }
  Sec.ev = []; Sec.evReady = false; Sec.ses = [];
}
setInterval(function () { if (App.user && !document.hidden) secBeat(false); }, Sec.BEAT);
document.addEventListener('visibilitychange', function () { if (!document.hidden && App.user) secBeat(false); });
Sec.startSes = function () {
  if (Sec.sesUnsub || !FB.db || !App.user || !App.user.admin) return;
  Sec.sesUnsub = FB.db.collection('sessions').onSnapshot(function (s) {
    Sec.ses = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); Sec.sesDenied = false; if (App.page === 'sec') App.refresh();
  }, function () { Sec.sesDenied = true; if (App.page === 'sec') App.refresh(); });
};
function secLive(s) { return Date.now() - (Date.parse(s.last) || 0) < Sec.ACTIVE; }
App.act('sec-kick', function (el) {
  var s = Sec.ses.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!s) return;
  Modal.open(Modal.head('🚪 ' + L('إنهاء الجلسة', 'Fermer la session'))
    + '<p>' + L('غادي يتخرج <b>' + esc(s.name || s.email) + '</b> من ' + esc(s.b + ' · ' + s.o) + ' فأقل من دقيقة (ملي يكون البرنامج محلول عندو).', 'Déconnecter <b>' + esc(s.name || s.email) + '</b> (' + esc(s.b + ' · ' + s.o) + ').') + '</p>'
    + '<div class="box">' + L('⚠️ هادا كيسد البرنامج عندو، ولكن ما كيبدلش كلمة السر. إلا كتشك فشي حساب: بدّل الكلمة ديالو ولا وقفو من Firebase Console ← Authentication.', '⚠️ Ferme l\'app chez lui, sans changer le mot de passe. En cas de doute : Firebase Console → Authentication.') + '</div>'
    + '<div class="acts2"><button class="btn red" data-act="sec-kick-ok" data-id="' + esc(s.id) + '">' + L('سدّ الجلسة', 'Fermer') + '</button><button class="btn" data-act="m-close">' + L('إلغاء', 'Annuler') + '</button></div>', 'small');
});
App.act('m-close', function () { Modal.close(); });
App.act('sec-kick-ok', function (el) {
  var s = Sec.ses.filter(function (x) { return x.id === el.dataset.id; })[0]; Modal.close(); if (!s) return;
  FB.db.collection('sessions').doc(s.id).set({ kick: { at: new Date().toISOString(), by: App.user.name } }, { merge: true })
    .then(function () { secLog('kick', (s.name || s.email) + ' · ' + s.b + ' ' + s.o); toast('🚪 ' + L('تصيفطات علامة الإنهاء', 'Fermeture envoyée')); })
    .catch(function (e) { toast(FB.errText ? FB.errText(e) : String(e), 'err'); });
});

/* ───────── القفل: أي تبديل فالإعدادات كيتسجل ───────── */
['lk7-next', 'lk7-min', 'lk7-start', 'lk7-now'].forEach(function (a) {
  var o = App.acts[a]; if (!o) return;
  App.act(a, function (el, e) {
    var b = JSON.stringify(typeof lk7Cfg === 'function' ? lk7Cfg() : {}), r = o(el, e);
    setTimeout(function () { var c = typeof lk7Cfg === 'function' ? lk7Cfg() : {}, n = JSON.stringify(c); if (n === b) return;
      var bo = JSON.parse(b || '{}'), msg = !bo.on && c.on ? L('تشعل', 'activé') : bo.on && !c.on ? L('تطفى', 'désactivé') : bo.h !== c.h ? L('تبدّل الكود', 'code changé') : bo.m !== c.m ? L('الوقت: ', 'délai : ') + c.m + ' min' : L('تبدّل', 'modifié');
      secLog('lock', msg); }, 300);
    return r;
  });
});

/* ───────── النسخ الاحتياطي: تحقق + سجل (rp_meta/settings.backupLog) ───────── */
function secLsJson(k, def) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v != null ? v : def; } catch (e) { return def; } }
function secBackupData() {
  var calc = {
    history: secLsJson('eurv102_h', []),
    clients: secLsJson('eurv102_c', []),
    cash: secLsJson('eurv102_cash', []),
    cashMoves: secLsJson('eurv102_cash_moves', []),
    renewals: secLsJson('eurv102_renewals', []),
    factures: secLsJson('eurv102_fac_list', []),
    autreTarifs: secLsJson('eurv102_autre', []),
    pdfTemplates: secLsJson('eurv102_pdftpl', []),
    agencyInfo: secLsJson('eurv102_ci', {}),
    prices: (typeof Eng !== 'undefined' && Eng.prices) ? Eng.prices() : {}
  };
  return {
    app: 'RenewPro', version: App.version, date: new Date().toISOString(),
    contacts: Contacts.list, settings: Meta.settings, users: Users.map,
    debts: (typeof Debts !== 'undefined') ? Debts.rows : [],
    debtMap: (typeof Debts !== 'undefined') ? Debts.map : {},
    phones: (typeof Phones !== 'undefined') ? Phones.map : {},
    sinistres: (typeof Sin !== 'undefined' && Array.isArray(Sin.rows)) ? Sin.rows : [],
    bank: (typeof Bank !== 'undefined' && Array.isArray(Bank.rows)) ? Bank.rows : [],
    calc: calc
  };
}
App.act('sec-backup', function () {
  if (!App.user.admin) return;
  var data = secBackupData(), txt = JSON.stringify(data), ok = false, n = 0;
  try { var back = JSON.parse(txt); n = back.contacts.length; ok = back.app === 'RenewPro' && n === Contacts.list.length; } catch (e) { ok = false; }
  var rec = { at: new Date().toISOString(), by: App.user.name, n: n, kb: Math.round(txt.length / 1024), ok: ok, ver: App.version };
  if (!ok) { rec.err = L('التحقق فشل', 'Vérification échouée'); Meta.save({ backupLog: [rec].concat(Meta.get('backupLog', []) || []).slice(0, 30) }); secLog('backup', 'ERR'); toast('⚠️ ' + rec.err, 'err'); App.refresh(); return; }
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
  a.download = 'renewpro_sauvegarde_' + todayISO() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  Meta.save({ backupLog: [rec].concat(Meta.get('backupLog', []) || []).slice(0, 30) }); Local.set('lastBackup', Date.now());
  secLog('backup', n + ' ' + L('زبون', 'clients') + ' · ' + (data.calc.history.length || 0) + ' ' + L('عملية', 'opér.') + ' · ' + rec.kb + ' Ko');
  toast('💾 ' + L('النسخة الشاملة تحمّلات وتحقّقات: ', 'Sauvegarde complète téléchargée : ') + n + ' ' + L('زبون', 'clients') + ' · ' + (data.calc.history.length || 0) + ' ' + L('عملية', 'opérations'));
  if (typeof d7Bell === 'function') d7Bell(); App.refresh();
});
/* زر 💾 القديم (الرئيسية) كيدوز من نفس الطريق */
App.act('t-backup', function () { App.acts['sec-backup'](); });

/* ───────── الاستعادة الشاملة: كتزيد غير الناقص فكل الأقسام، ما كتبدل والو ───────── */
App.act('sec-restore', function () {
  if (!App.user.admin) return;
  var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = function () { var f = i.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { secRestorePreview(r.result, f.name); }; r.readAsText(f); };
  i.click();
});
function secNorm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function secRestorePreview(txt, fname) {
  var d; try { d = JSON.parse(txt); } catch (e) { d = null; }
  if (!d || d.app !== 'RenewPro' || !Array.isArray(d.contacts)) { secLog('restore', 'ERR ' + fname); Modal.open(Modal.head('⚠️ ' + L('الملف ماشي نسخة RenewPro', 'Fichier invalide')) + '<p>' + L('الملف خاصو يكون نسخة احتياطية ديال RenewPro (JSON). ما تبدّل والو.', 'Ce n\'est pas une sauvegarde RenewPro. Rien n\'a été modifié.') + '</p>', 'small'); return; }
  var ids = {}, pol = {}, pl = {};
  Contacts.list.forEach(function (c) { ids[c.id] = 1; if (c.police) pol[secNorm(c.police)] = 1; if (c.plate || c.mat) pl[secNorm(c.plate || c.mat)] = 1; });
  var add = [], same = 0, dup = 0, bad = 0;
  d.contacts.forEach(function (c) {
    if (!c || !c.id || typeof c !== 'object') { bad++; return; }
    if (ids[c.id]) { same++; return; }
    var p = c.police ? secNorm(c.police) : '', m = (c.plate || c.mat) ? secNorm(c.plate || c.mat) : '';
    if ((p && pol[p]) || (m && pl[m])) { dup++; return; }
    add.push(c);
  });
  var calcD = d.calc || {};
  var curH = secLsJson('eurv102_h', []), hKeys = {};
  curH.forEach(function (h) { hKeys[[h.num, h.date, h.time, h.user].join('|')] = 1; });
  var addH = (Array.isArray(calcD.history) ? calcD.history : []).filter(function (h) { return h && h.num && !hKeys[[h.num, h.date, h.time, h.user].join('|')]; });
  var curF = secLsJson('eurv102_fac_list', []), fKeys = {};
  curF.forEach(function (f) { fKeys[f.id || f.num] = 1; });
  var addF = (Array.isArray(calcD.factures) ? calcD.factures : []).filter(function (f) { return f && (f.id || f.num) && !fKeys[f.id || f.num]; });
  var curSinIds = {}; if (typeof Sin !== 'undefined' && Array.isArray(Sin.rows)) Sin.rows.forEach(function (s) { curSinIds[s.id] = 1; });
  var addSin = (Array.isArray(d.sinistres) ? d.sinistres : []).filter(function (s) { return s && s.id && !curSinIds[s.id]; });
  var totalAdd = add.length + addH.length + addF.length + addSin.length;
  Sec.pending = { add: add, addH: addH, addF: addF, addSin: addSin, fname: fname, date: d.date };
  Modal.open(Modal.head('♻️ ' + L('استعادة نسخة شاملة', 'Restaurer une sauvegarde complète'))
    + '<div class="sec-rs"><div><span>' + L('الملف', 'Fichier') + '</span><b class="ltr">' + esc(fname) + '</b></div><div><span>' + L('تاريخ النسخة', 'Date') + '</span><b>' + esc(d.date ? fmtDT(d.date) : '—') + '</b></div>'
    + '<div><span>' + L('الزبناء الناقصين (التجديد)', 'Clients manquants') + '</span><b>' + add.length + ' / ' + d.contacts.length + '</b></div>'
    + '<div><span>' + L('عمليات الحاسبة الناقصة', 'Opérations calc. manquantes') + '</span><b>' + addH.length + ' / ' + ((calcD.history && calcD.history.length) || 0) + '</b></div>'
    + '<div><span>' + L('ملفات الحوادث الناقصة', 'Sinistres manquants') + '</span><b>' + addSin.length + ' / ' + ((d.sinistres && d.sinistres.length) || 0) + '</b></div>'
    + '<div><span>' + L('الفواتير المؤرشفة الناقصة', 'Factures manquantes') + '</span><b>' + addF.length + ' / ' + ((calcD.factures && calcD.factures.length) || 0) + '</b></div>'
    + '<div class="tot"><span>' + L('مجموع العناصر الجديدة للدمج', 'Total à restaurer') + '</span><b>' + totalAdd + '</b></div></div>'
    + '<div class="box">' + L('⚠️ الاستعادة ذكية وآمنة: كتزيد غير العناصر الناقصة فقط، وما كتبدل ولا كتمسح أي سطر موجود دابا.', '⚠️ Seuls les éléments manquants sont ajoutés. Aucune donnée existante n\'est écrasée.') + '</div>'
    + (totalAdd ? '<label class="chk"><input type="checkbox" id="sec-rs-ok"><span>' + L('فهمت، استرجع ' + totalAdd + ' عنصر ناقص', 'Je confirme la restauration de ' + totalAdd + ' éléments') + '</span></label>'
      + '<button class="btn pri wide" data-act="sec-restore-go">♻️ ' + L('استعادة العناصر الناقصة', 'Restaurer') + '</button>' : '<div class="empty">✅ ' + L('كل البيانات متطابقة — ما كاين حتى عنصر ناقص', 'Tout est déjà à jour') + '</div>'), 'small');
}
App.act('sec-restore-go', function () {
  var p = Sec.pending; if (!p) return;
  var totalAdd = p.add.length + (p.addH ? p.addH.length : 0) + (p.addF ? p.addF.length : 0) + (p.addSin ? p.addSin.length : 0);
  if (!totalAdd) return;
  if (!($('sec-rs-ok') || {}).checked) { toast(L('أكد بالعلامة الأول', 'Cochez la confirmation'), 'err'); return; }
  Modal.close();
  var ops = p.add.map(function (c) { var x = Object.assign({}, c); delete x.id; return { ref: Contacts.col().doc(c.id), data: x }; });
  if (p.addSin && p.addSin.length && typeof Sin !== 'undefined' && Sin.col) {
    p.addSin.forEach(function (s) { var x = Object.assign({}, s); delete x.id; ops.push({ ref: Sin.col().doc(s.id), data: x }); });
  }
  if (p.addH && p.addH.length && typeof Store8 !== 'undefined') {
    var mergedH = p.addH.concat(secLsJson('eurv102_h', []));
    Store8.save('history', mergedH);
  }
  if (p.addF && p.addF.length && typeof Store8 !== 'undefined') {
    var mergedF = p.addF.concat(secLsJson('eurv102_fac_list', []));
    Store8.save('factures', mergedF);
  }
  (ops.length ? FB.batches(ops) : Promise.resolve()).then(function () {
    secLog('restore', totalAdd + ' ' + L('عنصر من ', 'éléments depuis ') + p.fname);
    Meta.save({ restoreLog: [{ at: new Date().toISOString(), by: App.user.name, n: totalAdd, f: p.fname }].concat(Meta.get('restoreLog', []) || []).slice(0, 20) });
    toast('♻️ ' + L('تسترجعات بنجاح: ', 'Restaurés : ') + totalAdd); Sec.pending = null; App.refresh();
  }).catch(function (e) { secLog('restore', 'ERR ' + ((e && e.message) || e)); toast(FB.errText ? FB.errText(e) : String(e), 'err'); });
});

/* ───────── اختبار Firestore (قراءة حقيقية من السيرفر) ───────── */
function secPing() {
  if (Sec.pinging || !FB.db) return; Sec.pinging = true; var t = performance.now();
  var to = setTimeout(function () { Sec.ping = { ok: false, err: 'timeout', at: Date.now() }; Sec.pinging = false; if (App.page === 'sec') App.refresh(); }, 8000);
  FB.db.collection('rp_meta').doc('settings').get({ source: 'server' }).then(function () {
    clearTimeout(to); Sec.ping = { ok: true, ms: Math.round(performance.now() - t), at: Date.now() };
  }, function (e) { clearTimeout(to); Sec.ping = { ok: false, err: (e && e.code) || 'err', at: Date.now() }; }).then(function () { Sec.pinging = false; if (App.page === 'sec') App.refresh(); });
}
App.act('sec-ping', function () { secPing(); App.refresh(); });

/* ───────── الصفحة (7.7: بحال النموذج، بالبيانات الحقيقية) ───────── */
var SEC_EV = { login: ['ok', 'دخول ناجح', 'Connexion', 'ok'], fail: ['x', 'محاولة فاشلة', 'Échec', 'bad'], logout: ['out', 'خروج', 'Déconnexion', ''],
  lock: ['lock', 'إعدادات القفل', 'Verrouillage', ''], backup: ['cloud', 'نسخة احتياطية', 'Sauvegarde', ''], restore: ['rest', 'استعادة', 'Restauration', 'warn'],
  kick: ['x', 'إنهاء جلسة', 'Session fermée', 'warn'], kicked: ['x', 'جلسة تسدّات', 'Session fermée', 'warn'] };
var SEC_P = {
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  fire: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/><path d="M6 14a6 6 0 0 0 12 0"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M17 6l3 3M14 9l2 2"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  chev: '<path d="M15 6l-6 6 6 6"/>', ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>', rest: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sheets: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>', sync: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>', pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h0M16 11h0M8 15h2M12 15h0M16 15v3M8 18h4"/>', folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'
};
function secI(k, c) { return '<svg class="si' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SEC_P[k] || '') + '</svg>'; }
function secPill(k, t, ic) { return '<span class="sec-p ' + k + '">' + (ic ? secI(ic) : '') + t + '</span>'; }
function secCard(ic, cls, t, v, s, vic) { return '<div class="sec-k"><div class="sec-kt"><span>' + t + '</span><b class="' + cls + '">' + v + (vic ? secI(vic, 'vi') : '') + '</b><small>' + s + '</small></div><i class="sec-ki ' + cls + '">' + secI(ic) + '</i></div>'; }
function secBox(ic, t, inner, ex, cls) { return '<section class="sec-box ' + (cls || '') + '"><div class="sec-bh"><i>' + secI(ic) + '</i><b>' + t + '</b><span class="sp"></span>' + (ex || '') + '</div>' + inner + '</section>'; }
function secAll(act) { return '<button class="sec-more" data-act="' + act + '">' + L('عرض الكل', 'Voir tout') + ' ←</button>'; }

/* سجل الدخول: الأحدث (5) فالصفحة، والكل (بحث، فلتر، صفحات) فـ «عرض الكل» */
function secLoginRows() {
  var v = Sec.v, lg = Sec.ev.filter(function (e) { return e.ev === 'login' || e.ev === 'fail' || e.ev === 'logout'; });
  if (v.r !== 'all') lg = lg.filter(function (e) { return v.r === 'ok' ? e.ev === 'login' : v.r === 'bad' ? e.ev === 'fail' : e.ev === 'logout'; });
  if (v.q) { var q = v.q.toLowerCase(); lg = lg.filter(function (e) { return (String(e.user) + ' ' + (e.tried || '') + ' ' + (e.email || '')).toLowerCase().indexOf(q) >= 0; }); }
  if (v.day) lg = lg.filter(function (e) { return String(e.at).slice(0, 10) === v.day; });
  return lg;
}
function secLoginTable(rows) {
  return '<div class="sec-tw"><table class="sec-t"><thead><tr><th>' + L('التاريخ والوقت', 'Date et heure') + '</th><th>' + L('المستخدم', 'Utilisateur') + '</th><th>' + L('النتيجة', 'Résultat') + '</th><th>' + L('الجهاز', 'Appareil') + '</th></tr></thead><tbody>'
    + rows.map(function (e) { var t = SEC_EV[e.ev] || ['info', e.ev, e.ev, ''], d = new Date(e.at);
      return '<tr><td class="ltr">' + (isNaN(d) ? '—' : pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' - ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())) + '</td><td>' + esc(e.ev === 'fail' ? (e.tried || L('غير معروف', 'Inconnu')) : (e.user || '—')) + '</td>'
        + '<td>' + secPill(t[3] || 'mute', esc(L(t[1], t[2])), t[0]) + '</td><td class="ltr">' + esc(e.ua || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
}
function secLoginsMain() {
  if (Sec.evDenied) return '<div class="box red">' + L('مرفوض: انشر القواعد الجديدة.', 'Refusé : publiez les règles.') + '</div>';
  if (!Sec.evReady) return '<div class="empty">⏳</div>';
  var all = Sec.ev.filter(function (e) { return e.ev === 'login' || e.ev === 'fail' || e.ev === 'logout'; });
  return all.length ? secLoginTable(all.slice(0, 5)) : '<div class="empty">' + L('ما كاين والو (التسجيل بدا من 7.6)', 'Rien (depuis la 7.6)') + '</div>';
}
App.act('sec-logins', function () {
  var v = Sec.v, lg = secLoginRows(), PG = 12, pages = Math.max(1, Math.ceil(lg.length / PG)); if (v.pg >= pages) v.pg = pages - 1;
  Modal.open(Modal.head(L('سجل محاولات الدخول', 'Historique des connexions') + ' (' + lg.length + ')')
    + '<div class="sec-m"><div class="sec-fil"><input class="inp" placeholder="' + L('قلّب بالاسم…', 'Utilisateur…') + '" data-inp="sec-q" value="' + esc(v.q) + '"><select class="inp" data-inp="sec-r">'
    + [['all', L('الكل', 'Tous')], ['ok', L('ناجح', 'Réussi')], ['bad', L('فاشل', 'Échec')], ['out', L('خروج', 'Sortie')]].map(function (o) { return '<option value="' + o[0] + '"' + (v.r === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select><input class="inp" type="date" data-inp="sec-day" value="' + esc(v.day) + '"></div>'
    + (lg.length ? secLoginTable(lg.slice(v.pg * PG, v.pg * PG + PG)) : '<div class="empty">—</div>')
    + (pages > 1 ? '<div class="sec-pg"><button class="btn sm" data-act="sec-pg" data-d="-1"' + (v.pg ? '' : ' disabled') + '>‹</button><span>' + (v.pg + 1) + ' / ' + pages + '</span><button class="btn sm" data-act="sec-pg" data-d="1"' + (v.pg < pages - 1 ? '' : ' disabled') + '>›</button></div>' : '')
    + '<div class="hint">' + L('IP ما كيبانش: المتصفح ما كيعرفوش. المحاولات الفاشلة كتتصيفط مع أول دخول ناجح من نفس الجهاز.', 'IP non disponible. Les échecs sont envoyés à la prochaine connexion réussie depuis le même appareil.') + '</div></div>', 'wide');
  setTimeout(function () { var i = document.querySelector('.sec-m [data-inp="sec-q"]'); if (i && Sec.v._fq) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); Sec.v._fq = 0; } }, 0);
});
function secRe() { if (document.querySelector('.sec-m')) App.acts['sec-logins'](); else if (document.querySelector('.sec-ms')) App.acts['sec-sys'](); else App.render(); }

/* سجل النظام: الكل فـ «عرض الكل» */
function secWarn(e) { var t = SEC_EV[e.ev]; return !!(t && (t[3] === 'bad' || t[3] === 'warn')); }
App.act('sec-sys', function () {
  var v = Sec.v, sys = Sec.ev.filter(function (e) { return v.sk === 'all' || (v.sk === 'warn' ? secWarn(e) : !secWarn(e)); });
  if (v.sq) { var q = v.sq.toLowerCase(); sys = sys.filter(function (e) { return (e.user + ' ' + e.msg + ' ' + e.ev + ' ' + (e.tried || '')).toLowerCase().indexOf(q) >= 0; }); }
  Modal.open(Modal.head(L('سجل النظام', 'Journal système') + ' (' + sys.length + ')')
    + '<div class="sec-ms"><div class="sec-fil"><input class="inp" placeholder="' + L('قلّب…', 'Rechercher…') + '" data-inp="sec-sq" value="' + esc(v.sq) + '"><select class="inp" data-inp="sec-sk">'
    + [['all', L('الكل', 'Tous')], ['warn', L('تحذيرات', 'Avertissements')], ['info', L('معلومات', 'Infos')]].map(function (o) { return '<option value="' + o[0] + '"' + (v.sk === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select><button class="btn sm" data-act="sec-xls">Excel</button></div>'
    + '<div class="sec-ev">' + (sys.slice(0, 200).map(function (e) { var t = SEC_EV[e.ev] || ['info', e.ev, e.ev, ''];
      return '<div class="' + (t[3] || '') + '">' + secI(t[0]) + '<b>' + esc(L(t[1], t[2])) + '</b><em>' + esc(e.ev === 'fail' ? (e.tried || '') : (e.user || '')) + (e.msg ? ' · ' + esc(e.msg) : '') + '</em><small class="ltr">' + esc(fmtDT(e.at)) + '</small></div>'; }).join('') || '<div class="empty">—</div>') + '</div></div>', 'wide');
});
App.act('sec-bkh', function () {
  var b = Meta.get('backupLog', []) || [], r = Meta.get('restoreLog', []) || [];
  Modal.open(Modal.head(L('سجل النسخ', 'Historique des sauvegardes'))
    + (b.length ? '<div class="sec-bl">' + b.map(function (x) { return '<div><span class="ltr">' + esc(fmtDT(x.at)) + '</span><span>' + esc(x.by || '') + '</span><span>' + (x.n || 0) + ' ' + L('زبون', 'clients') + ' · ' + (x.kb || 0) + ' Ko</span>' + secPill(x.ok ? 'ok' : 'bad', x.ok ? '✓' : '✕ ' + esc(x.err || '')) + '</div>'; }).join('') + '</div>' : '<div class="empty">' + L('ما كاين حتى نسخة مسجلة', 'Aucune sauvegarde enregistrée') + '</div>')
    + (r.length ? '<div class="lbl">' + L('الاستعادات', 'Restaurations') + '</div><div class="sec-bl">' + r.map(function (x) { return '<div><span class="ltr">' + esc(fmtDT(x.at)) + '</span><span>' + esc(x.by || '') + '</span><span>+' + (x.n || 0) + ' · ' + esc(x.f || '') + '</span><span></span></div>'; }).join('') + '</div>' : '')
    + '<div class="hint">' + L('الملف كيتحمّل فالحاسوب (JSON) وكيتحقق قبل. Google Sheets كيدير نسخة أسبوعية فـ Drive.', 'Fichier JSON vérifié avant téléchargement. Google Sheets : copie hebdo dans Drive.') + '</div>', 'small');
});
App.act('sec-lkhelp', function () { var d = document.createElement('div'); d.innerHTML = typeof lk7PanelHTML === 'function' ? lk7PanelHTML() : ''; var h = d.querySelector('.lk7-help'); Modal.open(Modal.head(L('إعدادات إضافية · التعليمات', 'Options avancées · mode d\'emploi')) + '<div class="sec-lkh">' + (h ? h.innerHTML : '') + '</div>', 'small'); });

/* القفل: نفس الدوال ديال v7-lock (lk7-start / lk7-min / lk7-now)، شكل جديد */
function secLockHTML(lc, lockOn) {
  var m = lc.m || 5, setup = '';
  if (typeof Lock7 !== 'undefined' && Lock7.setup) { var d = document.createElement('div'); d.innerHTML = lk7PanelHTML(); var st = d.querySelector('.lk7-set'); setup = st ? st.outerHTML : ''; }
  var row = function (act, k, ic, t, s, dis) { return '<button class="sec-lr" data-act="' + act + '"' + (k ? ' data-k="' + k + '"' : '') + (dis ? ' disabled' : '') + '><i>' + secI(ic) + '</i><span><b>' + t + '</b><small>' + s + '</small></span>' + secI('chev', 'chev') + '</button>'; };
  return '<div class="sec-lt1"><div><b>' + L('القفل التلقائي', 'Verrouillage automatique') + '</b><small>' + L('كيتقفل البرنامج من بعد مدة بلا حركة · هاد الجهاز', 'Après une période d\'inactivité · cet appareil') + '</small></div>'
      + '<button class="sec-sw' + (lockOn ? ' on' : '') + '" data-act="lk7-start" data-k="' + (lockOn ? 'off' : 'on') + '" aria-label="toggle"><b></b></button></div>'
    + setup
    + '<div class="sec-lbl">' + L('مدة عدم النشاط', 'Délai d\'inactivité') + '</div>'
    + '<div class="sec-dur">' + [5, 10, 15].map(function (x) { return '<button class="' + (m === x ? 'on' : '') + '" data-act="lk7-min" data-m="' + x + '">' + (m === x ? secI('ok') : '') + x + ' ' + L(x === 15 ? 'دقيقة' : 'دقائق', 'min') + '</button>'; }).join('') + '</div>'
    + row('lk7-start', lockOn ? 'change' : 'on', 'key', L('تغيير رمز القفل', 'Changer le code'), lockOn ? L('تعيين رمز جديد للقفل الصامت', 'Nouveau code de verrouillage') : L('شعل القفل وحدد الرمز', 'Activer et choisir un code'))
    + row('lk7-now', '', 'lock', L('قفل فوري الآن', 'Verrouiller maintenant'), lockOn ? L('قفل التطبيق يدوياً', 'Verrouiller l\'application') : L('شعل القفل الأول', 'Activez d\'abord le verrouillage'), !lockOn)
    + row('sec-lkhelp', '', 'sliders', L('إعدادات إضافية', 'Options avancées'), L('الاختصارات والتعليمات الكاملة', 'Raccourcis et mode d\'emploi'));
}

function renderSec(el) {
  if (!App.user.admin) { el.innerHTML = '<div class="page"><div class="empty">🔒 ' + L('للمدير فقط', 'Réservé au gérant') + '</div></div>'; return; }
  Sec.startEv(); Sec.startSes(); if (!Sec.ping && !Sec.pinging) secPing();
  var lc = typeof lk7Cfg === 'function' ? lk7Cfg() : {}, lockOn = !!(lc.on && lc.h);
  var off = !navigator.onLine || Contacts.offline, den = Contacts.denied, pg = Sec.ping, ls = Local.get('lastSync', 0);
  var fsSt = den ? ['err', L('مرفوض', 'Refusé')] : off ? ['off', L('غير متصل', 'Hors ligne')] : !pg ? ['busy', L('كنجرّبو…', 'Test…')] : pg.ok ? ['ok', L('متصل', 'Connecté')] : ['err', L('خطأ', 'Erreur')];
  var blog = Meta.get('backupLog', []) || [], lb = typeof d7LastBackup === 'function' ? d7LastBackup() : 0;
  var bAge = lb ? (Date.now() - lb) / 864e5 : null, bSt = !lb ? ['off', L('ما كايناش', 'Aucune')] : bAge > 7 ? ['warn', L('قديمة', 'Ancienne')] : ['ok', L('مكتمل', 'À jour')];
  var live = Sec.ses.filter(secLive), uLive = {}; live.forEach(function (s) { uLive[s.email] = 1; });
  var nUsers = (Users.list ? Users.list().length : 0); if (App.user && !(Users.map || {})[typeof uKey === 'function' ? uKey(App.user.email) : '']) nUsers++;
  var sh = Meta.get('sheetsLast', null), shOn = !!(Meta.get('sheetsUrl', '') || Meta.get('sheetsKey', ''));
  var shSt = !shOn ? ['off', L('غير مهيأ', 'Non configuré')] : !sh ? ['busy', L('ما خدمش', 'Jamais exécuté')] : sh.ok ? ['ok', L('متصل', 'Connecté')] : ['err', L('خطأ', 'Erreur')];
  var syncSt = den ? ['err', L('مرفوضة', 'Refusée')] : off ? ['off', L('متوقفة', 'En pause')] : Contacts.pending ? ['busy', L('كتحفظ…', 'En cours…')] : ['ok', L('متصل', 'Connecté')];
  var allOk = fsSt[0] === 'ok' && syncSt[0] !== 'err' && shSt[0] !== 'err';
  var stIc = function (k) { return k === 'ok' ? 'ok' : k === 'err' ? 'x' : k === 'off' ? 'info' : 'warn'; };

  var kp = '<div class="sec-kpis">'
    + secCard('lock', lockOn ? 'ok' : 'off', L('القفل الصامت', 'Verrouillage silencieux'), lockOn ? L('مفعّل', 'Activé') : L('غير مفعّل', 'Désactivé'), lockOn ? L('القفل بعد: ', 'Après : ') + '<span class="ltr">' + (lc.m || 5) + '</span> ' + L('دقائق', 'min') : L('هاد الجهاز', 'cet appareil'), lockOn ? 'ok' : '')
    + secCard('fire', fsSt[0] === 'ok' ? 'fire' : fsSt[0], 'Firebase / Firestore', fsSt[1], pg && pg.ok ? L('زمن الاستجابة: ', 'Latence : ') + '<span class="ltr">' + pg.ms + ' ms</span>' : pg && !pg.ok ? esc(pg.err) : '…', fsSt[0] === 'ok' ? 'ok' : '')
    + secCard('cloud', bSt[0], L('النسخ الاحتياطي', 'Sauvegarde'), bSt[1], lb ? L('آخر نسخة: ', 'Dernière : ') + '<span class="ltr">' + fmtDT(lb) + '</span>' : L('دير نسخة دابا', 'à faire maintenant'), bSt[0] === 'ok' ? 'ok' : '')
    + secCard('users', 'blue', L('المستخدمون النشطون', 'Utilisateurs actifs'), Sec.sesDenied ? '—' : Object.keys(uLive).length, Sec.sesDenied ? L('خاص القواعد الجديدة', 'Règles à publier') : L('من ', 'sur ') + nUsers + ' ' + L('مستخدمين', 'utilisateurs'))
    + '</div>';

  var svc = [['fire', 'Firebase / Firestore', fsSt, '<button class="sec-test" data-act="sec-ping">' + L('اختبر', 'Tester') + '</button>'], ['sheets', 'Google Sheets', shSt, ''],
    ['sync', L('المزامنة التلقائية', 'Synchronisation'), syncSt, ''], ['bell', L('خدمة الإشعارات', 'Notifications'), ['ok', L('داخلية', 'Interne')], '']];
  var svcH = svc.map(function (s) { return '<div class="sec-sv"><i class="sec-svi ' + s[0] + '">' + secI(s[0]) + '</i><b>' + s[1] + '</b><span class="sp"></span>' + s[3] + secPill(s[2][0], s[2][1], stIc(s[2][0])) + '</div>'; }).join('')
    + (sh && !sh.ok && sh.err ? '<div class="hint red-t">' + esc(sh.err) + '</div>' : '');

  var bkH = '<div class="sec-bk ' + bSt[0] + '"><div><span>' + L('آخر نسخة احتياطية ناجحة', 'Dernière sauvegarde réussie') + '</span><b class="ltr">' + (lb ? (function (d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' - ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); })(new Date(lb)) : '—') + '</b></div><i>' + secI(lb ? 'ok' : 'info') + '</i></div>'
    + '<div class="sec-bka"><button class="btn pri" data-act="sec-backup">' + secI('down') + L('إنشاء نسخة الآن', 'Sauvegarder') + '</button><button class="btn" data-act="sec-restore">' + secI('rest') + L('استعادة نسخة', 'Restaurer') + '</button></div>'
    + (blog.length ? '<button class="sec-more c" data-act="sec-bkh">' + L('سجل النسخ', 'Historique') + ' (' + blog.length + ') ←</button>' : '');

  var errs = (typeof Logs !== 'undefined' ? Logs.rows : []).filter(function (r) { return r.kind === 'auto' || r.kind === 'user'; });
  var warns = Sec.ev.filter(secWarn).length, infos = Sec.ev.length - warns;
  var sysH = '<div class="sec-lt"><button class="sec-lc green" data-act="sec-sk" data-k="info"><span>' + secI('info') + '<b>' + infos + '</b></span><em>' + L('معلومات', 'Infos') + '</em></button>'
    + '<button class="sec-lc amber" data-act="sec-sk" data-k="warn"><span>' + secI('warn') + '<b>' + warns + '</b></span><em>' + L('تحذيرات', 'Alertes') + '</em></button>'
    + '<button class="sec-lc red" data-act="nav" data-id="logs"><span>' + secI('x') + '<b>' + errs.length + '</b></span><em>' + L('أخطاء', 'Erreurs') + '</em></button></div>';

  var me = secUid() + '_' + secDev(), ss = Sec.ses.slice().sort(function (a, b) { return String(b.last).localeCompare(String(a.last)); });
  var sesH = Sec.sesDenied ? '<div class="box">' + L('الجلسات خاصها القواعد الجديدة (sessions). انشرها من 🎛️ لوحة التحكم ← الإعدادات ← القواعد.', 'Publiez les nouvelles règles (sessions).') + '</div>'
    : !ss.length ? '<div class="empty">' + L('ما كاين حتى جلسة', 'Aucune session') + '</div>'
    : '<div class="sec-tw"><table class="sec-t"><thead><tr><th>' + L('الجهاز', 'Appareil') + '</th><th>' + L('المستخدم', 'Utilisateur') + '</th><th>' + L('آخر نشاط', 'Activité') + '</th><th>' + L('بدات', 'Début') + '</th><th>' + L('الإجراء', 'Action') + '</th></tr></thead><tbody>'
      + ss.map(function (s) { var on = secLive(s), mine = s.id === me;
        return '<tr' + (on ? '' : ' class="idle"') + '><td><span class="sec-dev">' + secI(s.m ? 'phone' : 'pc') + esc(s.b + (s.o ? ' - ' + s.o : '')) + '</span></td><td><b>' + esc(s.name || s.email) + '</b>' + (mine ? ' <small class="muted">(' + L('أنت', 'vous') + ')</small>' : '') + '</td>'
          + '<td>' + (s.kick ? secPill('warn', L('كتسدّ…', 'Fermeture…')) : esc(on && Date.now() - Date.parse(s.last) < 150000 ? L('الآن', 'maintenant') : relTime(s.last))) + '</td><td class="ltr">' + esc(s.start ? fmtDT(s.start) : '—') + '</td>'
          + '<td>' + (mine ? '' : '<button class="sec-kick" data-act="sec-kick" data-id="' + esc(s.id) + '">✕ ' + L('إنهاء الجلسة', 'Fermer') + '</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';

  var tips = [L('استخدم رمزاً قوياً للقفل.', 'Code de verrouillage fort.'), L('لا تشارك رمز القفل مع الآخرين.', 'Ne partagez pas le code.'), L('قم بنسخة احتياطية بانتظام.', 'Sauvegardez régulièrement.'), L('راقب محاولات الدخول والجلسات.', 'Surveillez connexions et sessions.')];

  el.innerHTML = '<div class="page sec7">'
    + '<div class="sec-hd"><span class="sec-hic">' + secI('shield') + '</span><div><h1>' + L('مركز الأمان والنظام', 'Sécurité et système') + '</h1><small>' + L('إدارة الحماية، القفل الصامت، الخدمات والنسخ الاحتياطي', 'Protection, verrouillage, services et sauvegardes') + '</small></div><span class="sp"></span>'
      + secPill(allOk ? 'ok big' : 'warn big', allOk ? L('النظام يعمل بشكل طبيعي', 'Système opérationnel') : L('شي خدمة فيها مشكل', 'Un service a un problème'), allOk ? 'ok' : 'warn') + '<span class="sec-ver ltr">v' + esc(App.version) + '</span></div>'
    + kp
    + '<div class="sec-g">'
      + '<div class="sec-c">' + secBox('pulse', L('حالة الخدمات', 'État des services'), svcH) + secBox('cloud', L('النسخ الاحتياطي', 'Sauvegarde'), bkH) + secBox('doc', L('سجل النظام', 'Journal système'), sysH, secAll('sec-sys')) + '</div>'
      + '<div class="sec-w"><div class="sec-w2">'
        + '<div class="sec-c">' + secBox('hist', L('سجل محاولات الدخول', 'Historique des connexions'), secLoginsMain(), secAll('sec-logins')) + secBox('users', L('جلسات المستخدمين النشطة', 'Sessions actives'), sesH, '<small>' + live.length + ' ' + L('نشطة', 'actives') + '</small>') + '</div>'
        + '<div class="sec-c">' + secBox('gear', L('إعدادات القفل والحماية', 'Verrouillage et protection'), secLockHTML(lc, lockOn), '', 'lk') + '</div>'
      + '</div>'
      + '<section class="sec-tipsb"><i>' + secI('info') + '</i><div><b>' + L('نصائح الأمان', 'Conseils de sécurité') + '</b><ul>' + tips.map(function (t) { return '<li>' + secI('ok') + esc(t) + '</li>'; }).join('') + '</ul></div></section>'
      + '</div>'
    + '</div></div>';
}
App.input('sec-q', debounce(function (el) { Sec.v.q = el.value; Sec.v.pg = 0; Sec.v._fq = 1; secRe(); }, 300));
App.input('sec-sq', debounce(function (el) { Sec.v.sq = el.value; secRe(); var i = document.querySelector('[data-inp="sec-sq"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300));
App.input('sec-sk', function (el) { Sec.v.sk = el.value; secRe(); });
App.input('sec-r', function (el) { Sec.v.r = el.value; Sec.v.pg = 0; secRe(); });
App.input('sec-day', function (el) { Sec.v.day = el.value; Sec.v.pg = 0; secRe(); });
App.act('sec-pg', function (el) { Sec.v.pg = Math.max(0, Sec.v.pg + (+el.dataset.d)); secRe(); });
App.act('sec-sk', function (el) { Sec.v.sk = el.dataset.k; App.acts['sec-sys'](); });
App.act('sec-xls', function () {
  if (typeof XLSX === 'undefined') { toast('Excel…', 'err'); return; }
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Sec.ev.map(function (e) { var t = SEC_EV[e.ev]; return { Date: fmtDT(e.at), Evenement: t ? t[2] : e.ev, Utilisateur: e.ev === 'fail' ? e.tried : e.user, Details: e.msg, Appareil: e.ua, Version: e.ver }; })), 'Journal');
  XLSX.writeFile(wb, 'renewpro_securite_' + todayISO() + '.xlsx');
});
App.on('logout', function () { if (Sec.sesUnsub) { try { Sec.sesUnsub(); } catch (e) { } Sec.sesUnsub = null; } });

App.register({ id: 'sec', icon: '🛡️', title: ['مركز الأمان', 'Sécurité'], order: 84.5, render: renderSec, admin: true });
if (typeof NAV7 !== 'undefined') { var g8 = NAV7.filter(function (g) { return g.k === 'adm'; })[0]; if (g8 && g8.ids.indexOf('sec') < 0) g8.ids.splice(1, 0, 'sec'); }
if (typeof IC7 !== 'undefined' && !IC7.sec) IC7.sec = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
if (typeof TITLE7 !== 'undefined') TITLE7.sec = ['مركز الأمان والنظام', 'Sécurité et système'];
