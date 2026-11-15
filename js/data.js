/* ══════════════════════════════════════════════════════════
   RenewPro 2 — data.js
   Firebase (الحساب نفسه وقاعدة البيانات نفسها) + مخازن البيانات.

   قواعد المزامنة هنا:
   • كل زبون = مستند مستقل، وكل تعديل يرسل الحقول المتغيّرة فقط
     (موظفان يعدّلان الزبون نفسه لا يمسح أحدهما عمل الآخر).
   • المكالمات تُضاف بـ arrayUnion: لا تضيع مكالمة إذا سجّل اثنان في اللحظة نفسها.
   • لا حذف تلقائي بالمقارنة أبداً: الحذف دائماً بأمر صريح.
══════════════════════════════════════════════════════════ */
'use strict';

var FB_CONFIG = {
  apiKey: "AIzaSyBRSNP9eHhONgW5-GxSwcBWRGUqPD7X5ks",
  authDomain: "renewpro-c857f.firebaseapp.com",
  projectId: "renewpro-c857f",
  storageBucket: "renewpro-c857f.firebasestorage.app",
  messagingSenderId: "30186437259",
  appId: "1:30186437259:web:cc63864178fa6e1354f28e"
};
/* قاعدة الحاسبة (Realtime Database) في نفس المشروع. إن اخترت منطقة غير Belgium عند إنشائها،
   انسخ الرابط الظاهر في أعلى صفحة Realtime Database وضعه هنا. */
var RTDB_URL = 'https://renewpro-c857f-default-rtdb.europe-west1.firebasedatabase.app';
var ADMIN_EMAIL = 'tsptanger20@gmail.com';

var FB = { ready: false, auth: null, db: null, FV: null };

FB.init = function () {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) { App.emit('fb-fail'); return; }
  try {
    firebase.initializeApp(FB_CONFIG);
    FB.auth = firebase.auth(); FB.db = firebase.firestore(); FB.FV = firebase.firestore.FieldValue;
    /* ذاكرة محلية: البرنامج يفتح بسرعة ويتحمّل انقطاع الإنترنت القصير */
    try { var p = FB.db.enablePersistence({ synchronizeTabs: true }); if (p && p.catch) p.catch(function () { }); } catch (e) { }
    FB.ready = true;
    FB.auth.onAuthStateChanged(function (u) {
      if (u && u.email) {
        var em = String(u.email).toLowerCase();
        App.user = { email: em, name: em.split('@')[0], admin: em === ADMIN_EMAIL };
        App.emit('login');
      } else { App.user = null; App.emit('logout'); }
    });
  } catch (e) { console.error(e); App.emit('fb-fail'); }
};
FB.login = function (email, pw) { return FB.auth.signInWithEmailAndPassword(email, pw); };
FB.logout = function () { Contacts.stop(); Meta.stop(); return FB.auth.signOut(); };
FB.errText = function (e) {
  var code = (e && e.code) || '';
  if (code.indexOf('wrong-password') >= 0 || code.indexOf('invalid-credential') >= 0) return L('البريد أو كلمة السر خاطئة', 'Email ou mot de passe incorrect');
  if (code.indexOf('user-not-found') >= 0) return L('الحساب غير موجود', 'Compte introuvable');
  if (code.indexOf('invalid-email') >= 0) return L('بريد غير صحيح', 'Email invalide');
  if (code.indexOf('too-many-requests') >= 0) return L('محاولات كثيرة — انتظر قليلاً', 'Trop de tentatives');
  if (code.indexOf('network') >= 0) return L('لا اتصال بالإنترنت', 'Pas de connexion Internet');
  if (code.indexOf('permission-denied') >= 0) return L('مرفوض — تحقّق من قواعد Firestore', 'Refusé — vérifiez les règles Firestore');
  return (e && e.message) || L('خطأ', 'Erreur');
};
function syncErr(e) { console.warn('sync', e); toast('⚠️ ' + FB.errText(e), 'err'); }

/* تنفيذ عمليات كثيرة على دفعات (حد Firestore = 500 في الدفعة)، بالتتابع، مع تقدّم */
FB.batches = function (ops, onProgress) {
  var i = 0, total = ops.length;
  function next() {
    if (i >= total) return Promise.resolve();
    var b = FB.db.batch(), slice = ops.slice(i, i + 400);
    slice.forEach(function (o) { if (o.del) b.delete(o.ref); else if (o.upd) b.update(o.ref, o.upd); else b.set(o.ref, o.data); });
    return b.commit().then(function () { i += slice.length; if (onProgress) onProgress(i, total); return next(); });
  }
  return next();
};

/* ═════════ الزبناء (لائحة التجديد) — مجموعة contacts ═════════ */
var Contacts = { map: {}, list: [], ready: false, unsub: null, pending: false, offline: false, denied: false, scope: '' };

Contacts.col = function () { return FB.db.collection('contacts'); };
Contacts.get = function (id) { return Contacts.map[id] || null; };
Contacts.rebuild = function () {
  var a = Object.keys(Contacts.map).map(function (k) { return Contacts.map[k]; });
  a.sort(function (x, y) {
    var ox = x.ord != null ? +x.ord : 1e9, oy = y.ord != null ? +y.ord : 1e9;   // ترتيب ملف Excel
    if (ox !== oy) return ox - oy;
    var dx = x.dateE || '9999', dy = y.dateE || '9999'; if (dx !== dy) return dx < dy ? -1 : 1;
    return String(x.name || '').localeCompare(String(y.name || ''));
  });
  Contacts.list = a;
};
/* النطاق: المدير (أو الجميع إن سمح المدير) يحمّل كل اللائحة؛ الموظف يحمّل المسندين إليه فقط */
Contacts.scopeKey = function () { if (!App.user) return ''; return (App.user.admin || Meta.get('agentsSeeAll', false)) ? '*' : 'a:' + App.user.name; };
Contacts.query = function () { var k = Contacts.scopeKey(); return k === '*' ? Contacts.col() : Contacts.col().where('agent', '==', App.user.name); };
/* يُستدعى حين تتغيّر الصلاحية أو الاسم أو إعداد «يرى الكل»: يعيد التحميل بالنطاق الجديد */
Contacts.ensureScope = function () { if (!App.user || !Contacts.unsub) return; if (Contacts.scopeKey() !== Contacts.scope) { var u = Contacts.unsub; Contacts.unsub = null; try { u(); } catch (e) { } Contacts.map = {}; Contacts.list = []; Contacts.start(); } };
Contacts.start = function () {
  if (Contacts.unsub || !FB.db) return;
  Contacts.denied = false; Contacts.scope = Contacts.scopeKey();
  Contacts.unsub = Contacts.query().onSnapshot({ includeMetadataChanges: true }, function (snap) {
    snap.docChanges().forEach(function (ch) {
      if (ch.type === 'removed') delete Contacts.map[ch.doc.id];
      else { var d = ch.doc.data() || {}; d.id = ch.doc.id; Contacts.map[d.id] = d; }
    });
    Contacts.ready = true;
    Contacts.pending = !!(snap.metadata && snap.metadata.hasPendingWrites);
    Contacts.offline = !!(snap.metadata && snap.metadata.fromCache);
    Contacts.rebuild(); App.emit('sync'); App.refresh();
  }, function (e) { Contacts.denied = true; Contacts.ready = true; App.emit('sync'); App.refresh(); syncErr(e); });
};
Contacts.stop = function () { if (Contacts.unsub) { try { Contacts.unsub(); } catch (e) { } } Contacts.unsub = null; Contacts.map = {}; Contacts.list = []; Contacts.ready = false; };
function cleanDoc(o) { var out = {}; for (var k in o) { if (k === 'id' || o[k] === undefined) continue; out[k] = o[k]; } return out; }
/* تعديل: الحقول المتغيّرة فقط */
Contacts.update = function (id, patch) { return Contacts.col().doc(id).update(patch).catch(syncErr); };
Contacts.add = function (obj) { var id = obj.id || uid('c'); return Contacts.col().doc(id).set(cleanDoc(obj)).then(function () { return id; }).catch(syncErr); };
/* إضافة مكالمة دون إعادة كتابة السجل كله */
Contacts.pushCall = function (id, entry, extra) {
  var patch = Object.assign({ callHistory: FB.FV.arrayUnion(entry) }, extra || {});
  return Contacts.update(id, patch);
};
Contacts.unset = function () { return FB.FV.delete(); };

/* ═════════ إعدادات مشتركة وأرشيف — مجموعة rp_meta ═════════
   إن لم تسمح قواعد Firestore بهذه المجموعة تُحفظ الإعدادات على الجهاز فقط. */
var Meta = { settings: {}, unsub: null, denied: false };
Meta.col = function () { return FB.db.collection('rp_meta'); };
Meta.start = function () {
  if (Meta.unsub || !FB.db) return;
  Meta.settings = Local.get('settings', {});
  Meta.unsub = Meta.col().doc('settings').onSnapshot(function (doc) {
    Meta.denied = false;
    if (doc.exists) { Meta.settings = doc.data() || {}; Local.set('settings', Meta.settings); }
    Contacts.ensureScope(); App.refresh();
  }, function (e) { Meta.denied = true; console.warn('rp_meta', e); App.refresh(); });
};
Meta.stop = function () { if (Meta.unsub) { try { Meta.unsub(); } catch (e) { } } Meta.unsub = null; };
Meta.get = function (k, def) { var v = Meta.settings[k]; return (v === undefined || v === null || v === '') ? def : v; };
Meta.save = function (patch) {
  Meta.settings = Object.assign({}, Meta.settings, patch); Local.set('settings', Meta.settings);
  if (Meta.denied) return Promise.resolve();
  return Meta.col().doc('settings').set(patch, { merge: true }).catch(function (e) { Meta.denied = true; console.warn('rp_meta', e); });
};

/* أرشيف لوائح التجديد: رأس صغير + البيانات مضغوطة في قطع (كل قطعة مستند واحد) */
var Arch = {};
Arch.save = function (info, list) {
  var id = Date.now().toString(36), chunks = [], cur = [], size = 0;
  list.forEach(function (c) { var s = JSON.stringify(Object.assign({ id: c.id }, cleanDoc(c)));
    if (size + s.length > 350000 && cur.length) { chunks.push('[' + cur.join(',') + ']'); cur = []; size = 0; }
    cur.push(s); size += s.length + 1; });
  if (cur.length) chunks.push('[' + cur.join(',') + ']');
  var head = { k: 'archh', name: info.name || '', loadedAt: info.loadedAt || '', archivedAt: new Date().toISOString(),
    count: list.length, chunks: chunks.length, by: App.user ? App.user.name : '' };
  var p = Promise.resolve();
  chunks.forEach(function (j, i) { p = p.then(function () { return Meta.col().doc('archc_' + id + '_' + i).set({ k: 'archc', a: id, i: i, j: j }); }); });
  /* الرأس يُكتب آخراً: وجوده يعني أن كل القطع وصلت */
  return p.then(function () { return Meta.col().doc('archh_' + id).set(head); }).then(function () { return id; });
};
