/* ══════════════════════════════════════════════════════════
   RenewPro v5 — calc-store.js   (بيانات الحاسبة فقاعدة RenewPro الوحيدة: Firestore)
   الحاسبة كانت كتخدم بقاعدة بوحدها (Realtime Database). فـ v5 كتولي فمجموعة «calc» ديال Firestore،
   بنفس الدخول ونفس القواعد ونفس النسخ الاحتياطية ديال باقي البرنامج.
   • كل مفتاح (السجل، الصندوق، الزبناء…) = رأس «calc/<المفتاح>» + قطع JSON (≤ 250 ألف حرف) معنونة بمحتواها:
     القطع اللي ما تبدلاتش ما كتتعاودش تتكتب (السجل الجديد كيتزاد فالأول → غير القطعة الأولى كتتبدل).
   • الحفظ بالدمج الثلاثي (نفس منطق الحاسبة الأصلي) داخل معاملة Firestore: ما كتضيعش عملية إلا حفظو جوج أجهزة فنفس الوقت.
   • الحاسبة (داخل الإطار) كتعيط لهاد الملف بنصوص JSON فقط (بلا كائنات من نافذة أخرى).
   • النقل من القاعدة القديمة: مرة وحدة، المدير، بقراءة Realtime Database (REST) — القديمة ما كتتمسش.
══════════════════════════════════════════════════════════ */
'use strict';


var MERGE_KEY = {
  history:   function(h){ return [h.num, h.date, h.time, h.user].join('|'); },
  cashMoves: function(m){ return m.id != null ? 'id:' + m.id : [m.date, m.time, m.type, m.amount, m.reason || m.note || '', m.person || '', m.user].join('|'); },
  clients:   function(c){ return [c.n, c.p].join('|'); },
  renewals:  function(c){ return 'id:' + c.id; },
  cash:      function(c){ return c.date != null ? 'd:' + c.date : JSON.stringify(c); },
  users:     function(u){ return 'n:' + u.n; },
  factures:  function(f){ return 'f:' + (f.id || f.num); }
};
var FRONT = { history: 1, cashMoves: 1, renewals: 1, factures: 1 };          // لوائح الأحدث فيها أولاً
function toArr(v){ if(Array.isArray(v)) return v.filter(function(x){ return x != null; }); if(v && typeof v === 'object') return Object.keys(v).map(function(k){ return v[k]; }).filter(function(x){ return x != null; }); return []; }
/* صيغة موحّدة للمقارنة: مفاتيح مرتّبة، بلا قيم فارغة (السحابة تحذفها) */
function canon(x){
  if(Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
  if(x && typeof x === 'object') return '{' + Object.keys(x).sort().filter(function(k){ var v = x[k]; return !(v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)); }).map(function(k){ return k + ':' + canon(x[k]); }).join(',') + '}';
  return JSON.stringify(x);
}
function indexBy(key, arr){ var f = MERGE_KEY[key], m = {}, order = []; arr.forEach(function(x){ var id; try{ id = String(f(x)); }catch(e){ id = canon(x); } while(m[id] !== undefined) id += '#'; m[id] = x; order.push(id); }); return { m: m, order: order }; }
function merge3(key, base, local, server){
  var B = indexBy(key, base), Lc = indexBy(key, local), S = indexBy(key, server), out = [], add = [];
  Lc.order.forEach(function(id){
    var l = Lc.m[id], inB = B.m[id] !== undefined, inS = S.m[id] !== undefined;
    if(inB && !inS){ if(canon(l) !== canon(B.m[id])) out.push(l); return; }        // حُذف من جهاز آخر (يبقى فقط إن عُدّل هنا)
    out.push(inB && inS && canon(l) === canon(B.m[id]) ? S.m[id] : l);            // لم يُلمس هنا → نسخة السحابة
  });
  S.order.forEach(function(id){ if(B.m[id] === undefined && Lc.m[id] === undefined) add.push(S.m[id]); });   // أضافه جهاز آخر
  var res = FRONT[key] ? add.concat(out) : out.concat(add);
  if(key === 'history' && add.length){                              // السجل: الأحدث أولاً بعد الدمج
    var ts = function(h){ var m = String(h.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + ('0' + m[2]).slice(-2) + ('0' + m[1]).slice(-2) + ' ' + String(h.time || '') : ''; };
    res = res.map(function(h, i){ return { h: h, i: i, t: ts(h) }; }).sort(function(a, b){ return a.t < b.t ? 1 : a.t > b.t ? -1 : a.i - b.i; }).map(function(x){ return x.h; });
  }
  return res;
}

var CalcStore = { PIECE: 250000, subs: [], meta: null, metaUnsub: null, metaWaiters: [] };
CalcStore.KEYS = ['history', 'users', 'clients', 'cash', 'cashMoves', 'autreTarifs', 'pdfTemplates', 'renewals', 'factures', 'prices', 'agencyInfo', 'counters/rec', 'counters/piece', 'counters/facture'];
CalcStore.col = function () { return FB.db.collection('calc'); };
CalcStore.id = function (key) { return String(key).replace(/\//g, '__'); };
function csHash(s) { var h1 = 0x811c9dc5, h2 = 0x1505; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (h2 * 33 + c) | 0; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36); }
/* تقطيع من الآخر: الزيادة فالأول ما كتبدلش القطع القديمة */
CalcStore.split = function (json) {
  var out = [], end = json.length, P = CalcStore.PIECE;
  while (end > 0) { var st = Math.max(0, end - P); out.unshift(json.slice(st, end)); end = st; }
  if (!out.length) out.push('');
  return out;
};
CalcStore.assemble = function (head, pieces) {
  if (!head || !head.ids) return null;
  var parts = []; for (var i = 0; i < head.ids.length; i++) { var p = pieces[head.ids[i]]; if (p == null) return undefined; parts.push(p); }
  return parts.join('');
};
/* كتابة قيمة (نص JSON) داخل معاملة. cur = {head, pieces} المقروءة فنفس المعاملة */
CalcStore.writeTx = function (tx, key, json, cur) {
  var col = CalcStore.col(), base = CalcStore.id(key), parts = CalcStore.split(json), ids = [], have = {};
  ((cur.head && cur.head.ids) || []).forEach(function (id) { have[id] = 1; });
  parts.forEach(function (p) { var id = base + '~' + csHash(p); if (ids.indexOf(id) >= 0) id += '_' + ids.length; ids.push(id);
    if (!have[id]) tx.set(col.doc(id), { k: 'piece', key: key, j: p }); });
  Object.keys(have).forEach(function (id) { if (ids.indexOf(id) < 0) tx.delete(col.doc(id)); });
  tx.set(col.doc(base), { k: 'head', key: key, ids: ids, len: json.length, at: new Date().toISOString(), by: (App.user && App.user.name) || '' });
};
CalcStore.readTx = function (tx, key) {
  var col = CalcStore.col();
  return tx.get(col.doc(CalcStore.id(key))).then(function (h) {
    var head = h.exists ? h.data() : null, pieces = {};
    if (!head || !head.ids) return { head: null, pieces: pieces, json: null };
    return Promise.all(head.ids.map(function (id) { return tx.get(col.doc(id)).then(function (d) { pieces[id] = d.exists ? d.data().j : null; }); }))
      .then(function () { var j = CalcStore.assemble(head, pieces); return { head: head, pieces: pieces, json: j == null ? null : j }; });
  });
};
CalcStore.set = function (key, json) {
  return FB.db.runTransaction(function (tx) { return CalcStore.readTx(tx, key).then(function (cur) { if (cur.json !== json) CalcStore.writeTx(tx, key, json, cur); }); });
};
/* حفظ لائحة بالدمج الثلاثي: base = آخر نسخة سحابية عرفها هاد الجهاز، local = اللائحة عندو دابا */
CalcStore.setMerged = function (key, baseJson, localJson) {
  var hasBase = !!(baseJson && baseJson !== '[]' && baseJson !== 'null');
  var base = hasBase ? toArr(JSON.parse(baseJson)) : [], local = toArr(JSON.parse(localJson || '[]'));
  return FB.db.runTransaction(function (tx) {
    return CalcStore.readTx(tx, key).then(function (cur) {
      var server = cur.json ? toArr(JSON.parse(cur.json)) : [];
      var effBase = hasBase ? base : server;
      var json = JSON.stringify(merge3(key, effBase, local, server));
      if (json !== cur.json) CalcStore.writeTx(tx, key, json, cur);
      return json;
    });
  });
};
CalcStore.get = function (key) {
  return CalcStore.col().where('key', '==', key).get().then(function (snap) {
    var head = null, pieces = {}; snap.forEach(function (d) { var x = d.data(); if (x.k === 'head') head = x; else pieces[d.id] = x.j; });
    var j = CalcStore.assemble(head, pieces); return j == null ? null : j;
  });
};
/* متابعة مفتاح: cb(نص JSON) كل ما تبدل (ومرة فالأول إلا كان موجود) */
CalcStore.listen = function (key, cb, win) {
  var head = null, pieces = {}, last = null;
  var un = CalcStore.col().where('key', '==', key).onSnapshot(function (snap) {
    snap.docChanges().forEach(function (ch) { var x = ch.doc.data() || {};
      if (ch.type === 'removed') { if (x.k === 'head') head = null; else delete pieces[ch.doc.id]; return; }
      if (x.k === 'head') head = x; else pieces[ch.doc.id] = x.j; });
    var j = CalcStore.assemble(head, pieces);
    if (j == null || j === last) return;                          // ناقصة شي قطعة (كتوصل من بعد) ولا ما تبدل والو
    last = j; try { cb(j); } catch (e) { console.warn('calc listen', key, e); }
  }, function (e) { console.warn('calc listen', key, e); });
  var s = { un: un, win: win || null }; CalcStore.subs.push(s);
  return function () { try { un(); } catch (e) { } var i = CalcStore.subs.indexOf(s); if (i >= 0) CalcStore.subs.splice(i, 1); };
};
/* الإطار تسد ولا تعاود تشارجا: نوقفو المتابعات ديالو */
CalcStore.offAll = function (win) { CalcStore.subs.slice().forEach(function (s) { if (!win || s.win === win) { try { s.un(); } catch (e) { } CalcStore.subs.splice(CalcStore.subs.indexOf(s), 1); } }); };

/* ───────── حالة النقل (calc/_meta) ───────── */
CalcStore.watchMeta = function () {
  if (CalcStore.metaUnsub || !FB.db) return;
  CalcStore.metaUnsub = CalcStore.col().doc('_meta').onSnapshot({ includeMetadataChanges: true }, function (d) {
    /* v6.0.2: «ما كاينش» من ذاكرة الجهاز (cache) ما كنثيقوش فيه — كنتسناو جواب السيرفر (وإلا المدير يعاود ينقل بالغلط) */
    if (!d.exists && d.metadata && d.metadata.fromCache) { CalcStore.metaFromCache = true; return; }
    CalcStore.metaFromCache = false;
    CalcStore.meta = d.exists ? d.data() : { none: true };
    var w = CalcStore.metaWaiters; CalcStore.metaWaiters = [];
    if (CalcStore.meta.migratedAt) w.forEach(function (f) { try { f(); } catch (e) { } }); else CalcStore.metaWaiters = w;
    App.refresh();
  }, function (e) { CalcStore.meta = { denied: true, err: String((e && e.code) || e) }; console.warn('calc meta', e); App.refresh(); });
};
/* إعادة الاتصال (زر فالحاسبة): نوقفو ونعاودو نتبعو حالة النقل */
CalcStore.recheck = function () {
  if (CalcStore.metaUnsub) { try { CalcStore.metaUnsub(); } catch (e) { } }
  CalcStore.metaUnsub = null; CalcStore.meta = null; CalcStore.watchMeta();
  setTimeout(CalcStore.autoMigrate, 2500);
};
/* السبب ديال الانتظار، بكلام واضح (كيبان ملي تضغط على النقطة فالحاسبة) */
CalcStore.reason = function () {
  var m = CalcStore.meta;
  if (!App.user) return L('ما داخلش بحساب', 'Pas connecté');
  if (!m) return CalcStore.metaFromCache ? L('ما كاينش اتصال بالسيرفر (الأنترنت؟)', 'Serveur injoignable (Internet ?)') : L('كنتسناو جواب القاعدة…', 'En attente de la base…');
  if (m.denied) return L('القاعدة رفضات القراءة (قواعد Firestore؟): ', 'Lecture refusée (règles Firestore ?) : ') + (m.err || '');
  if (CalcStore.busy) return L('النقل خدام دابا: ', 'Transfert en cours : ') + (CalcStore.prog || '');
  if (m.none) return App.user.admin ? L('النقل باقي ما تدارش', 'Transfert pas encore fait') + (CalcStore.err ? ' — ' + CalcStore.err : '') : L('النقل باقي ما تدارش: خاص المدير يدخل', 'Transfert pas fait : l\'admin doit se connecter');
  if (m.migratedAt) return L('متصل', 'Connecté');
  return '';
};
CalcStore.whenReady = function (fn) { if (CalcStore.meta && CalcStore.meta.migratedAt) fn(); else CalcStore.metaWaiters.push(fn); };
App.on('login', function () { CalcStore.watchMeta(); setTimeout(CalcStore.autoMigrate, 1500); });
App.on('logout', function () { if (CalcStore.metaUnsub) { try { CalcStore.metaUnsub(); } catch (e) { } } CalcStore.metaUnsub = null; CalcStore.meta = null; CalcStore.offAll(); });

/* ───────── النقل من Realtime Database (القاعدة القديمة ديال الحاسبة) ───────── */
var CALC_ARR = { history: 1, users: 1, clients: 1, cash: 1, cashMoves: 1, renewals: 1 };
function csSummary(data) {
  var s = {}; CalcStore.KEYS.forEach(function (k) { var v = data[k];
    s[k] = v == null ? 0 : CALC_ARR[k] ? toArr(v).length : typeof v === 'object' ? Object.keys(v).length : String(v); });
  return s;
}
CalcStore.readOld = function () {
  return FB.auth.currentUser.getIdToken().then(function (tok) {
    return fetch(RTDB_URL + '/eurdesktop.json?auth=' + encodeURIComponent(tok)).then(function (r) {
      if (!r.ok) throw new Error('RTDB ' + r.status); return r.json(); });
  }).then(function (root) {
    root = root || {}; var data = {};
    CalcStore.KEYS.forEach(function (k) { var p = k.split('/'), v = root; p.forEach(function (x) { v = v == null ? null : v[x]; }); if (v != null) data[k] = CALC_ARR[k] ? toArr(v) : v; });
    return data;
  });
};
CalcStore.migrate = function (onProg) {
  if (!App.user || !App.user.admin) return Promise.reject(new Error('admin'));
  var data, keys;
  return CalcStore.readOld().then(function (d) {
    data = d; keys = Object.keys(data); var i = 0;
    var next = function () {
      if (i >= keys.length) return Promise.resolve();
      var k = keys[i++]; if (onProg) onProg(i, keys.length, k);
      return CalcStore.set(k, JSON.stringify(data[k])).then(next);
    };
    return next();
  }).then(function () {
    /* تحقق: كنعاودو نقراو من الجديدة ونقارنو حرف بحرف */
    return Promise.all(keys.map(function (k) { return CalcStore.get(k).then(function (j) { return j === JSON.stringify(data[k]) ? null : k; }); }));
  }).then(function (bad) {
    bad = bad.filter(Boolean);
    if (bad.length) throw new Error(L('ما تطابقوش: ', 'Différences : ') + bad.join(', '));
    var sum = csSummary(data);
    return CalcStore.col().doc('_meta').set({ migratedAt: new Date().toISOString(), by: App.user.name, from: 'rtdb', summary: sum }).then(function () { return sum; });
  });
};
/* المدير: أول مرة كيدخل لـ v5 والنقل باقي ما تدار → كيتدار وحدو */
CalcStore.autoMigrate = function () {
  if (!App.user || !App.user.admin || !CalcStore.meta || CalcStore.meta.migratedAt || CalcStore.meta.denied || CalcStore.busy) {
    if (App.user && App.user.admin && !CalcStore.meta) setTimeout(CalcStore.autoMigrate, 1500);
    return;
  }
  /* v6.0.2 حماية: قبل أي نقل، نتأكدو من السيرفر. إلا كانت بيانات الحاسبة ديجا فالقاعدة الجديدة (السجل موجود)،
     ما كنعاودوش ننقلو من القديمة (كانت غادي تكتب فوق العمليات الجديدة) — غير كنرجعو علامة النقل. */
  CalcStore.busy = true;
  var col = CalcStore.col();
  Promise.all([col.doc('_meta').get({ source: 'server' }), col.doc('history').get({ source: 'server' })]).then(function (r) {
    if (r[0].exists) { CalcStore.busy = false; CalcStore.recheck(); return; }
    if (r[1].exists) {
      return col.doc('_meta').set({ migratedAt: new Date().toISOString(), by: App.user.name, from: 'recovered' }).then(function () { CalcStore.busy = false; toast('🧮 ' + L('رجعات علامة النقل (البيانات ديجا فالقاعدة)', 'Marque de transfert restaurée')); });
    }
    CalcStore.busy = false; CalcStore.migrateNow();
  }).catch(function (e) { CalcStore.busy = false; CalcStore.err = String((e && e.message) || e); console.warn('calc check', e); App.refresh(); });
};
CalcStore.migrateNow = function () {
  if (CalcStore.busy) return;
  CalcStore.busy = true; toast('🧮 ' + L('جارٍ نقل بيانات الحاسبة للقاعدة الوحيدة…', 'Transfert des données de la calculatrice…'));
  CalcStore.migrate(function (i, n) { CalcStore.prog = i + '/' + n; App.refresh(); }).then(function (sum) {
    CalcStore.busy = false; CalcStore.prog = '';
    toast('✅ ' + L('تنقلات بيانات الحاسبة: ', 'Données calculatrice transférées : ') + L('السجل ', 'historique ') + sum.history + ' · ' + L('الزبناء ', 'clients ') + sum.clients);
  }).catch(function (e) { CalcStore.busy = false; CalcStore.err = String((e && e.message) || e); console.warn('calc migrate', e); toast('⚠️ ' + L('تعذّر نقل بيانات الحاسبة: ', 'Transfert impossible : ') + CalcStore.err, 'err'); App.refresh(); });
};
App.act('cs-remigrate', function () {
  if (!App.user.admin) return;
  if (!confirm(L('غادي نعاود ننقل بيانات الحاسبة من القاعدة القديمة (Realtime Database) ونكتبها فوق اللي فالجديدة.\nأي عملية تسجلات فـ v5 من بعد النقل الأول غادي تضيع.\n\nمتابعة؟',
    'Re-transférer depuis l\'ancienne base et écraser la nouvelle ?\nLes opérations saisies dans la v5 depuis seront perdues.'))) return;
  CalcStore.busy = true; App.refresh();
  CalcStore.migrate(function (i, n) { CalcStore.prog = i + '/' + n; App.refresh(); }).then(function () { CalcStore.busy = false; CalcStore.prog = ''; toast('✅ ' + L('تعاود النقل', 'Transfert refait')); App.refresh(); })
    .catch(function (e) { CalcStore.busy = false; CalcStore.err = String((e && e.message) || e); toast('⚠️ ' + CalcStore.err, 'err'); App.refresh(); });
});
/* بطاقة فالإعدادات */
App.hook('settings.blocks', function () {
  if (!App.user.admin) return '';
  var m = CalcStore.meta || {}, s = m.summary || {};
  return '<div class="card"><div class="card-t">🧮 ' + L('بيانات الحاسبة (v5: القاعدة الوحيدة)', 'Données calculatrice (v5 : base unique)') + '</div>'
    + (m.denied ? '<div class="box red">⚠️ ' + L('مرفوض: انشر قواعد Firestore الجديدة (فيها calc).', 'Refusé : publiez les nouvelles règles Firestore (calc).') + '</div>' : '')
    + (CalcStore.busy ? '<div class="box">⏳ ' + L('جارٍ النقل… ', 'Transfert… ') + (CalcStore.prog || '') + '</div>'
      : m.migratedAt ? '<div class="box">✅ ' + L('تنقلات نهار ', 'Transférées le ') + fmtDT(m.migratedAt) + ' · ' + esc(m.by || '') + '<br><small>'
          + L('السجل: ', 'Historique : ') + (s.history || 0) + ' · ' + L('الزبناء: ', 'Clients : ') + (s.clients || 0) + ' · ' + L('الصندوق: ', 'Caisse : ') + (s.cash || 0) + ' / ' + (s.cashMoves || 0)
          + ' · ' + L('متابعة التجديدات: ', 'Suivi : ') + (s.renewals || 0) + ' · ' + L('المستخدمون: ', 'Utilisateurs : ') + (s.users || 0) + ' · ' + L('قوالب PDF: ', 'Modèles PDF : ') + (s.pdfTemplates || 0) + '</small></div>'
      : '<div class="box amber">' + L('باقي ما تنقلاتش. كتنقل وحدها ملي كيدخل المدير.', 'Pas encore transférées. Le transfert se fait à la connexion de l\'admin.') + (CalcStore.err ? '<br>⚠️ ' + esc(CalcStore.err) : '') + '</div>')
    + (m.migratedAt && !CalcStore.busy ? '<button class="btn wide" data-act="cs-remigrate">↩️ ' + L('عاود النقل من القاعدة القديمة (كيكتب فوق الجديدة)', 'Refaire le transfert (écrase la nouvelle)') + '</button>' : '')
    + '<div class="hint">' + L('القاعدة القديمة (Realtime Database) ما كتتمسش: كتبقى كاحتياط. ملي تتأكد بلي كلشي مزيان فـ v5، تقدر تسدها.', 'L\'ancienne base n\'est pas modifiée (secours).') + '</div></div>';
});
