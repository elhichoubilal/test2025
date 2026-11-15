/* ══════════════════════════════════════════════════════════
   RenewPro v6.1 — mod-sin-mail.js   (📧 طلب الخبرة من ملف الحادثة)
   • الخبير كيتختار وحدو من لائحة الخبراء (js/sin-experts-data.js، ولا اللائحة اللي حمّلها المدير):
       1) السمية المكتوبة فالتصريح (Nom Expert)، والمدينة ديال الوكالة (TANGER) كتغلب؛
       2) وإلا ما كايناش: الرقم الأخير ديال الماتريكول (الجزء الأول: 262«7»-B-1) حسب «Derniers chiffres immatriculation».
       إلا ما تطابقوش جوج الطرق: كيبان تنبيه وأنت كتختار.
     «EXPERTISE A DISTANCE» (LAADA) ما كيتختارش وحدو: غير يدوي.
   • Gmail كيتحل معمّر من حساب الوكالة (eur.assurance2@gmail.com) بالعنوان والنص ديالك؛ الكونستا كتزيدها أنت.
   • كتتزاد ملاحظة فالملف «📧 تصيفط طلب الخبرة لـ …».
══════════════════════════════════════════════════════════ */
'use strict';

var SinMail = { cur: null };
var SIN_MAIL_DEF = {
  from: 'eur.assurance2@gmail.com',
  city: 'TANGER',
  subj: "demande d'expertise {assure} matricule {matricule}",
  body: 'Bonjour,\n\nVeuillez trouver ci-joint le constat .\nN tel client {tel}\n\ncordialement'
};
function smGet(k) { return Meta.get('expMail_' + k, '') || SIN_MAIL_DEF[k]; }
function smExperts() { var l = Meta.get('experts', null); return (l && l.length) ? l : (typeof SIN_EXPERTS_DEFAULT !== 'undefined' ? SIN_EXPERTS_DEFAULT : []); }
function smFold(s) { return sinFold(String(s || '')).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
/* القاعدة ديال الخبير: الأرقام اللي عندو */
function smRule(e) {
  var r = smFold(e.rule + ' ' + (e.rule2 || ''));
  if (/DISTANCE/.test(r)) return { remote: true, digits: [] };
  if (/EXCLUSIVITE/.test(r)) return { digits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
  if (/\bIMPAIRS?\b/.test(r)) return { digits: [1, 3, 5, 7, 9] };
  if (/\bPAIRS?\b/.test(r)) return { digits: [0, 2, 4, 6, 8] };
  var m = r.replace(/^.*IMMATRICULATION/, ''), d = (m.match(/\d/g) || []).map(Number);
  return { digits: d };
}
function smInCity(e, city) { var c = smFold(city); return !!c && (smFold(e.ville).indexOf(c) >= 0 || smFold(e.zone + ' ' + (e.zone2 || '')).split(' ').indexOf(c) >= 0); }
/* الرقم الأخير ديال الجزء الأول ديال الماتريكول (2627-B-1 → 7) */
function smPlateDigit(p) { var m = String(p || '').match(/\d+/); return m ? +m[0].slice(-1) : null; }
var SM_STOP = { EXPERT: 1, EXPERTS: 1, EXPERTISE: 1, BUREAU: 1, CABINET: 1, CBT: 1, ING: 1, INGENIERIE: 1, ET: 1, DE: 1, D: 1, SARL: 1, SARLAU: 1, STE: 1, TANGER: 1, CASABLANCA: 1, RABAT: 1, TETOUAN: 1, LA: 1, LE: 1, AUTO: 1 };
function smWords(s) { return smFold(s).split(' ').filter(function (w) { return w.length >= 3 && !SM_STOP[w]; }); }
function smByName(txt, city) {
  var ws = smWords(txt); if (!ws.length) return null;
  var best = null, bs = 0;
  smExperts().forEach(function (e) {
    var hay = smWords(e.cab + ' ' + e.exp + ' ' + (e.emails || []).join(' ').replace(/[@._]/g, ' ')), sc = 0;
    ws.forEach(function (w) { if (hay.some(function (h) { return h === w || (w.length >= 5 && (h.indexOf(w) === 0 || w.indexOf(h) === 0) && Math.min(h.length, w.length) >= 4); })) sc += 2; });
    if (!sc) return;
    if (smInCity(e, city)) sc += 3;
    if (smRule(e).remote) sc -= 2;
    if (sc > bs) { bs = sc; best = e; }
  });
  return bs >= 4 ? best : null;
}
function smByPlate(plate, city) {
  var d = smPlateDigit(plate); if (d === null) return null;
  return smExperts().filter(function (e) { var r = smRule(e); return !r.remote && smInCity(e, city) && r.digits.indexOf(d) >= 0 && (e.emails || []).length; })[0] || null;
}
/* v6.5: الخبير معين من الشركة (CAT…): كنقلبو غير بالسمية (وبالمدينة اللي فيها)، بلا قاعدة الماتريكول */
function smLev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; for (var j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; } return d[a.length][b.length]; }
function smByDesig(txt) {
  var ws = smWords(txt), all = smFold(txt).split(' '); if (!ws.length) return null;
  var best = null, bs = 0, tie = false;
  smExperts().forEach(function (e) {
    var hay = smWords(e.cab + ' ' + e.exp + ' ' + (e.emails || []).join(' ').replace(/[@._]/g, ' ')), sc = 0;
    ws.forEach(function (w) { if (hay.some(function (h) { return h === w || (w.length >= 6 && smLev(h, w) <= 2); })) sc += 2; });
    if (!sc) return;
    if (all.some(function (w) { return w.length >= 4 && smInCity(e, w); })) sc += 3;
    if (sc > bs) { bs = sc; best = e; tie = false; } else if (sc === bs) tie = true;
  });
  return bs >= 2 && !tie ? best : null;
}
function smChoose(info) {
  if (info.expBy && info.expert) return { e: smByDesig(info.expert), how: 'desig' };
  var city = smGet('city'), a = info.expert ? smByName(info.expert, city) : null, b = smByPlate(info.plate, city);
  if (a && b && a !== b) return { e: a, how: 'pdf', alt: b, conflict: true };
  if (a) return { e: a, how: 'pdf', agree: !!b };
  if (b) return { e: b, how: 'plate' };
  return { e: null };
}
/* الماتريكول: من الملف، وإلا من التجديد/الديون/الحاسبة بالبوليصة */
function smPlateOf(r) {
  if (r.plate) return { v: r.plate, src: '' };
  var t = kPolTail(r.police); if (!t) return { v: '', src: '' };
  var c = Contacts.list.filter(function (x) { return !x.deleted && kPolTail(polFull(x)) === t && x.plate; })[0]; if (c) return { v: c.plate, src: L('لائحة التجديد', 'liste') };
  if (typeof Debts !== 'undefined' && Debts.rows) { var d = Debts.rows.filter(function (x) { return kPolTail(x.police) === t && x.plate; })[0]; if (d) return { v: d.plate, src: L('الديون', 'dettes') }; }
  if (typeof Archive !== 'undefined' && Archive.all) { var a = Archive.all.filter(function (x) { return x.c && kPolTail(x.c.police) === t && x.c.plate; })[0]; if (a) return { v: a.c.plate, src: L('الأرشيف', 'archives') }; }
  return { v: '', src: '' };
}
function smFill(tpl, v) { return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ''; }); }
function smExpLabel(e) { return e.cab + (e.exp ? ' — ' + e.exp : ''); }

/* ───────── 📞 أرقام الخبير (v6.2) ─────────
   الخانات TEL وG S M فيها بزاف ديال الأرقام لاصقين ("0539 35 31 31 0536 36 58 18") وأحياناً سمية المسؤول:
   كنفرقوهم رقم برقم (10 أرقام كيبداو بـ 0). فالتليفون كيعيط، فالحاسوب كينسخ الرقم. */
function smPhones(e) {
  var out = [], seen = {};
  [e.gsm, e.tel].forEach(function (s) {
    s = String(s || ''); var buf = '', who = (s.match(/^[^\d]*[A-Za-zÀ-ÿ][^\d]*/) || [''])[0].replace(/[\s:.-]+$/, '').trim();
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (/\d/.test(ch)) { buf += ch; if (buf.length === 10) { if (buf.charAt(0) === '0' && !seen[buf]) { seen[buf] = 1; out.push({ n: buf, mob: /^0[67]/.test(buf), who: who }); } buf = ''; } }
      else if (/[A-Za-zÀ-ÿ]/.test(ch)) buf = '';
    }
  });
  return out.sort(function (a, b) { return (b.mob ? 1 : 0) - (a.mob ? 1 : 0); });   // البورطابل الأول
}
function smFmt(n) { return n.slice(0, 4) + ' ' + n.slice(4, 6) + ' ' + n.slice(6, 8) + ' ' + n.slice(8); }
function smPhoneHTML(e) {
  var ps = smPhones(e); if (!ps.length) return '<small class="muted">' + L('ما كاينش رقم فاللائحة', 'Pas de numéro dans la liste') + '</small>';
  var who = ps.filter(function (p) { return p.who; })[0];
  return '<div class="sm-phs">' + ps.map(function (p) {
      return '<a class="btn sm call" href="' + telHref(p.n) + '" data-copy="' + p.n + '">' + (p.mob ? '📱 ' : '☎️ ') + ltr(smFmt(p.n)) + '</a>'
        + (p.mob ? '<a class="btn sm wa" target="_blank" rel="noopener" href="' + waUrl(p.n, '') + '">💬</a>' : '');
    }).join('') + '</div>' + (who ? '<small class="muted">👤 ' + esc(who.who) + '</small>' : '');
}
/* فالحاسوب: الضغط على الرقم ولا الإيميل كينسخو (tel: ما كيخدمش)؛ فالتليفون كيعيط عادي */
document.addEventListener('click', function (ev) {
  var a = ev.target && ev.target.closest && ev.target.closest('a[data-copy]'); if (!a) return;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine && /^tel:/.test(a.getAttribute('href') || '')) return;
  ev.preventDefault(); var t = a.dataset.copy;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('📋 ' + t + ' ' + L('تنسخ', 'copié')); }, function () { prompt(L('انسخ:', 'Copier :'), t); });
});
/* الأرقام ديال الخبراء المختارين فنافذة الطلب */
function smSelPhonesHTML() {
  var c = SinMail.cur; if (!c) return ''; var seen = [], list = [];
  Object.keys(c.sel).forEach(function (m) { var e = c.sel[m]; if (e && seen.indexOf(e) < 0) { seen.push(e); list.push(e); } });
  if (!list.length) return '';
  return '<div class="sm-phbox">' + list.map(function (e) { return '<div class="sm-ph1"><b>📞 ' + esc(e.cab) + '</b>' + smPhoneHTML(e) + '</div>'; }).join('') + '</div>';
}
function smRefreshSel() { var w = $('sm-rcps'); if (w) { var x = ($('sm-extra') || {}).value; w.innerHTML = smRecipientsHTML(); if (x) $('sm-extra').value = x; } var p = $('sm-ph'); if (p) p.innerHTML = smSelPhonesHTML(); smPreview(); }

/* ───────── الزر فملف الحادثة ───────── */
function sinMailBtn(r) { return '<button class="btn wide sin-mailbtn" data-act="sm-open" data-id="' + esc(r.id) + '">📧 ' + L('طلب الخبرة (Gmail)', 'Demande d\'expertise (Gmail)') + (r.expSentAt ? ' <small class="muted">· ' + L('تصيفط ', 'envoyée ') + fmtDT(r.expSentAt) + '</small>' : '') + '</button>'
  + (r.expSentAt ? '<a class="btn wide sin-mailbtn" target="_blank" rel="noopener" href="' + esc(smConvUrl(r)) + '" data-act="sm-conv" data-id="' + esc(r.id) + '">💬 ' + L('المحادثة مع الخبير (Gmail)', 'Conversation avec l\'expert (Gmail)') + '</a>' : ''); }
/* v6.5: Gmail ما كيقدرش يحل «Répondre» من رابط → كنحلو المحادثة ديال هاد الملف (بالعنوان اللي تصيفط بيه)، وأنت كتضغط «Répondre» */
function smConvUrl(r) {
  var q = r.expSubj ? 'subject:"' + r.expSubj.replace(/"/g, ' ') + '"' : '"demande d\'expertise" "' + String(r.assure || '').replace(/"/g, ' ') + '"';
  return 'https://mail.google.com/mail/u/' + encodeURIComponent(smGet('from')) + '/#search/' + encodeURIComponent(q);
}
App.act('sm-conv', function (el) {
  var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return;
  var t = '💬 ' + L('تحلات المحادثة مع الخبير فـ Gmail', 'Conversation avec l\'expert ouverte dans Gmail'), last = (r.notes || [])[(r.notes || []).length - 1];
  if (last && last.t === t && String(last.at).slice(0, 10) === new Date().toISOString().slice(0, 10)) return;   // مرة فالنهار
  var n = { t: t, by: App.user.name, at: new Date().toISOString() };
  Sin.col().doc(r.id).update({ notes: FB.FV.arrayUnion(n), upd: n.at, updBy: App.user.name }).catch(syncErr);
});
App.act('sm-open', function (el) {
  var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return;
  /* إلا كان شي تعديل فالخانات وما تحفظش: ناخدو القيم من الشاشة */
  var val = function (id, def) { var e = $(id); return e ? sinTidy(e.value) : def; };
  var info = { id: r.id, assure: val('sf-assure', r.assure), police: val('sf-police', r.police), dossier: val('sf-dossier', r.dossier), refCie: val('sf-refCie', r.refCie), dateSin: val('sf-dateSin', r.dateSin),
    plate: val('sf-x-plate', r.plate), tel: val('sf-x-tel', r.tel), expert: val('sf-x-expert', r.expert), expBy: val('sf-x-expBy', r.expBy) };
  var ps = info.plate ? { src: L('الملف', 'dossier') } : smPlateOf(info); if (!info.plate) info.plate = ps.v;
  var ph = info.tel ? { p1: info.tel, src: 'sin' } : sinPhone(info); if (!info.tel) info.tel = ph.p1 || '';
  var ch = smChoose(info);
  SinMail.cur = { r: r, info: info, sel: {}, ch: ch };
  if (ch.e) (ch.e.emails || []).forEach(function (m) { SinMail.cur.sel[m] = ch.e; });
  smDialog(ps, ph);
  /* v6.5: الماتريكول ولا الهاتف ما بانوش؟ كنتسناو الأرشيف (كيتشارجا مرة وحدة) ونعاودو نقلبو */
  var cur = SinMail.cur;
  if ((!info.plate || !info.tel) && typeof Archive !== 'undefined' && Archive.loadAll && !Archive.all && Archive.heads && Archive.heads.length) {
    Archive.loadAll().then(function () {
      if (SinMail.cur !== cur) return; if (typeof PF !== 'undefined') PF.idx = null;
      var pe = $('sm-plate'), te = $('sm-tel'), got = [];
      if (pe && !sinTidy(pe.value)) { var p2 = smPlateOf(Object.assign({}, info, { plate: '' })); if (p2.v) { pe.value = p2.v; cur.info.plate = p2.v; got.push('🚘');
        if (!cur.info.expert && !Object.keys(cur.sel).length) { var b = smByPlate(p2.v, smGet('city')); if (b) (b.emails || []).forEach(function (m) { cur.sel[m] = b; }); } } }
      if (te && !sinTidy(te.value)) { var h2 = sinPhone(Object.assign({}, info, { tel: '' })); if (h2.p1) { te.value = h2.p1; cur.info.tel = h2.p1; got.push('📞'); } }
      if (got.length) { smRefreshSel(); toast(got.join(' ') + ' ' + L('لقيتهم فالأرشيف', 'trouvés dans les archives')); }
    }).catch(function () { });
  }
});
function smRecipientsHTML() {
  var c = SinMail.cur, city = smGet('city'), list = smExperts().filter(function (e) { return (e.emails || []).length; });
  var local = list.filter(function (e) { return smInCity(e, city); }), others = list.filter(function (e) { return !smInCity(e, city); });
  var chip = function (e) { var on = (e.emails || []).some(function (m) { return c.sel[m]; }), r = smRule(e);
    return '<button class="sm-rcp' + (on ? ' on' : '') + '" data-act="sm-tog" data-code="' + esc(String(e.code) + '|' + e.cab) + '">' + (on ? '☑️' : '⬜') + ' <b>' + esc(e.cab) + '</b>'
      + '<small>' + esc(e.exp || '') + ' · ' + (r.remote ? L('بالمسافة', 'à distance') : r.digits.length === 10 ? L('حصري', 'exclusif') : L('أرقام: ', 'chiffres : ') + r.digits.join('-')) + '</small><small class="ltr">' + esc((e.emails || []).join(' · ')) + '</small></button>'; };
  return '<div class="sm-rcps">' + local.map(chip).join('') + '</div>'
    + '<details class="sm-more"><summary>' + L('خبراء مدن أخرى', 'Experts d\'autres villes') + ' (' + others.length + ')</summary><div class="sm-rcps">' + others.map(chip).join('') + '</div></details>'
    + '<div class="sm-add"><input id="sm-extra" class="inp" dir="ltr" placeholder="' + L('إيميل آخر (اختياري)', 'Autre e-mail (facultatif)') + '"></div>';
}
function smDialog(ps, ph) {
  var c = SinMail.cur, i = c.info, ch = c.ch, d = smPlateDigit(i.plate);
  var why = ch.e ? (ch.how === 'desig' ? '🏢 ' + L('معين من ', 'désigné par ') + esc(i.expBy) : ch.how === 'pdf' ? '🧾 ' + L('من التصريح', 'd\'après la déclaration') + (ch.agree ? ' ✅ ' + L('ومطابق للماتريكول', 'et conforme au matricule') : '') : '🚘 ' + L('حسب آخر رقم فالماتريكول (', 'd\'après le dernier chiffre du matricule (') + d + ')') : '';
  Modal.open(Modal.head('📧 ' + L('طلب الخبرة — ', 'Demande d\'expertise — ') + esc(i.dossier || i.assure || ''))
    + '<div class="lbl">1. ' + L('المعلومات', 'Informations') + '</div>'
    + '<div class="sin-grid sm-grid">'
      + '<label class="f"><span>Assuré</span><input id="sm-assure" dir="ltr" data-inp="sm-upd" value="' + esc(i.assure) + '"></label>'
      + '<label class="f"><span>Matricule</span><input id="sm-plate" dir="ltr" data-inp="sm-plate" value="' + esc(i.plate) + '">' + (ps && ps.src ? '<small class="muted">🔎 ' + esc(ps.src) + '</small>' : (!i.plate ? '<small class="amber-t">' + L('ما لقيتوش — كتبو', 'introuvable — saisissez-le') + '</small>' : '')) + '</label>'
      + '<label class="f"><span>Tél. client</span><input id="sm-tel" dir="ltr" data-inp="sm-upd" value="' + esc(i.tel) + '">' + (ph && ph.p1 ? '<small class="muted">📞 ' + esc(ph.src === 'sin' ? L('التصريح', 'déclaration') : (typeof pfSrcLabel === 'function' ? pfSrcLabel(ph.src) : '')) + '</small>' : '') + '</label>'
    + '</div>'
    + '<div class="lbl">2. ' + L('الخبير', 'Expert') + (i.expert ? ' <small class="muted">· ' + L('فالتصريح: ', 'déclaration : ') + esc(i.expert) + '</small>' : '') + '</div>'
    + (ch.e ? '<div class="box sm">🧑‍🔧 <b>' + esc(smExpLabel(ch.e)) + '</b> — ' + why + '</div>'
        : ch.how === 'desig' ? '<div class="box amber sm">🏢 ' + esc(i.expBy) + L(' عينات «', ' a désigné « ') + esc(i.expert) + L('»، وما لقيتوش فلائحة الخبراء: اختارو ولا كتب الإيميل ديالو.', ' », introuvable dans la liste : choisissez-le ou saisissez son e-mail.') + '</div>'
        : '<div class="box amber sm">' + L('ما قدرتش نختار الخبير وحدي: اختار من اللائحة.', 'Expert non déterminé : choisissez dans la liste.') + '</div>')
    + (ch.conflict ? '<div class="box red sm">⚠️ ' + L('التصريح كيقول «', 'La déclaration indique « ') + esc(smExpLabel(ch.e)) + L('»، ولكن الماتريكول (', ' », mais le matricule (') + d + L(') كيعطي «', ') donne « ') + esc(smExpLabel(ch.alt)) + '». ' + L('تأكد قبل ما تصيفط.', 'Vérifiez avant d\'envoyer.') + '</div>' : '')
    + '<div id="sm-rcps">' + smRecipientsHTML() + '</div>'
    + '<div id="sm-ph">' + smSelPhonesHTML() + '</div>'
    + '<div class="lbl">3. ' + L('الإيميل', 'E-mail') + ' <small class="muted">· ' + L('من ', 'depuis ') + esc(smGet('from')) + '</small></div>'
    + '<div class="sm-prev" id="sm-prev"></div>'
    + '<details class="sm-more"><summary>✏️ ' + L('بدّل العنوان والنص (كيتحفظو للمرات الجاية)', 'Modifier l\'objet et le texte (mémorisés)') + '</summary>'
      + '<label class="f"><span>Objet</span><input id="sm-subj" dir="ltr" data-inp="sm-upd" value="' + esc(smGet('subj')) + '"></label>'
      + '<label class="f"><span>Texte</span><textarea id="sm-body" dir="ltr" rows="6" data-inp="sm-upd">' + esc(smGet('body')) + '</textarea></label>'
      + '<div class="hint">{assure} {matricule} {tel} {dossier} {ref} {police} {date}</div></details>'
    + '<div class="acts2"><button class="btn pri" data-act="sm-send">📨 ' + L('حل Gmail معمّر', 'Ouvrir Gmail') + '</button><button class="btn" data-act="sm-copy">📋 ' + L('نسخ', 'Copier') + '</button></div>'
    + '<div class="hint">📎 ' + L('Gmail كيتحل معمّر: زيد الكونستا وضغط «Envoyer». البرنامج كيكتب ملاحظة فالملف.', 'Gmail s\'ouvre prérempli : joignez le constat et envoyez. Une note est ajoutée au dossier.') + '</div>', 'wide');
  smPreview();
}
function smVals() {
  var c = SinMail.cur, i = c.info, g = function (id, d) { var e = $(id); return e ? sinTidy(e.value) : d; };
  return { assure: g('sm-assure', i.assure), matricule: g('sm-plate', i.plate), tel: g('sm-tel', i.tel), dossier: i.dossier || '', ref: i.refCie || '', police: i.police || '', date: i.dateSin || '' };
}
function smTo() { var c = SinMail.cur, to = Object.keys(c.sel).filter(function (m) { return c.sel[m]; }), x = ($('sm-extra') || {}).value || '';
  x.split(/[\s,;]+/).forEach(function (m) { if (/.+@.+\..+/.test(m) && to.indexOf(m) < 0) to.push(m.toLowerCase()); }); return to; }
function smSubj() { return smFill(($('sm-subj') || {}).value || smGet('subj'), smVals()); }
function smBody() { return smFill(($('sm-body') || {}).value || smGet('body'), smVals()); }
function smPreview() { var p = $('sm-prev'); if (!p) return; var to = smTo();
  p.innerHTML = '<div class="sm-to">À : ' + (to.length ? esc(to.join(', ')) : '<span style="color:#b3261e">' + L('اختار الخبير', 'choisissez l\'expert') + '</span>') + '</div><div class="sm-su">' + esc(smSubj()) + '</div><div class="sm-bd">' + esc(smBody()) + '</div>'; }
App.input('sm-upd', function () { smPreview(); });
App.input('sm-plate', function (el) {                                     // الماتريكول تبدل → نعاودو نختارو الخبير إلا ما كانش من التصريح
  var c = SinMail.cur; if (!c) return; c.info.plate = sinTidy(el.value);
  if (!c.info.expert) { var b = smByPlate(c.info.plate, smGet('city')); c.sel = {}; if (b) (b.emails || []).forEach(function (m) { c.sel[m] = b; }); smRefreshSel(); return; }
  smPreview();
});
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'sm-extra') smPreview(); });
App.act('sm-tog', function (el) {
  var c = SinMail.cur; if (!c) return; var k = el.dataset.code, e = smExperts().filter(function (x) { return String(x.code) + '|' + x.cab === k; })[0]; if (!e) return;
  var on = (e.emails || []).some(function (m) { return c.sel[m]; });
  (e.emails || []).forEach(function (m) { if (on) delete c.sel[m]; else c.sel[m] = e; });
  smRefreshSel();
});
App.act('sm-copy', function () { var t = 'À: ' + smTo().join(', ') + '\nObjet: ' + smSubj() + '\n\n' + smBody();
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('📋 ' + L('تنسخ', 'Copié')); }, function () { toast(L('ما قدرتش ننسخ', 'Copie impossible'), 'err'); }); });
App.act('sm-send', function () {
  var c = SinMail.cur; if (!c) return; var to = smTo();
  if (!to.length) { toast(L('اختار الخبير ولا كتب إيميل', 'Choisissez un destinataire'), 'err'); return; }
  var v = smVals(), su = ($('sm-subj') || {}).value, bd = ($('sm-body') || {}).value;
  /* العنوان والنص كيتحفظو إلا تبدلو */
  var up = {}; if (su && su !== smGet('subj')) up.expMail_subj = su; if (bd && bd !== smGet('body')) up.expMail_body = bd; if (Object.keys(up).length && App.user.admin) Meta.save(up);
  var url = 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(smGet('from')) + '&view=cm&fs=1&to=' + encodeURIComponent(to.join(','))
    + '&su=' + encodeURIComponent(smSubj()) + '&body=' + encodeURIComponent(smBody());
  window.open(url, '_blank');
  var names = []; Object.keys(c.sel).forEach(function (m) { var e = c.sel[m]; if (e && names.indexOf(e.cab) < 0) names.push(e.cab); });
  var n = { t: '📧 ' + L('تصيفط طلب الخبرة لـ ', 'Demande d\'expertise envoyée à ') + (names.length ? names.join('، ') : to.join(', ')) + ' (' + to.join(', ') + ')', by: App.user.name, at: new Date().toISOString() };
  var patch = { notes: FB.FV.arrayUnion(n), expSentAt: n.at, expTo: to.join(','), expSubj: smSubj(), upd: n.at, updBy: App.user.name };
  if (!c.r.plate && v.matricule) patch.plate = v.matricule; if (!c.r.tel && v.tel) patch.tel = v.tel;
  if (!c.r.expert && names.length) patch.expert = names.join(', ');
  Sin.col().doc(c.r.id).update(patch).catch(syncErr);
  Modal.close(); SinMail.cur = null;
  toast('📧 ' + L('تحل Gmail — زيد الكونستا وصيفط', 'Gmail ouvert — joignez le constat'));
});

/* ───────── الإعدادات: الخبراء + الحساب اللي كيصيفط ───────── */
App.hook('settings.blocks', function () {
  if (!App.user.admin) return '';
  var l = smExperts(), city = smGet('city'), loc = l.filter(function (e) { return smInCity(e, city); });
  return '<div class="card"><div class="card-t">🧑‍🔧 ' + L('الخبراء وطلب الخبرة', 'Experts et demandes d\'expertise') + '</div>'
    + '<div class="grid2"><label class="f"><span>' + L('الحساب اللي كيصيفط (Gmail)', 'Compte d\'envoi (Gmail)') + '</span><input id="sm-from" class="inp" dir="ltr" value="' + esc(smGet('from')) + '"></label>'
    + '<label class="f"><span>' + L('مدينة الوكالة (لاختيار الخبير)', 'Ville de l\'agence') + '</span><input id="sm-city" class="inp" dir="ltr" value="' + esc(city) + '"></label></div>'
    + '<button class="btn sm" data-act="sm-save-cfg">💾 ' + L('حفظ', 'Enregistrer') + '</button>'
    + '<div class="lbl">' + L('خبراء ', 'Experts de ') + esc(city) + ' (' + loc.length + ' / ' + l.length + ')</div>'
    + '<div class="lines">' + loc.map(function (e) { var r = smRule(e); return '<div class="line"><div><b>' + esc(e.cab) + '</b><small>' + esc(e.exp || '') + ' · ' + (r.remote ? L('بالمسافة (يدوي فقط)', 'à distance (manuel)') : L('أرقام: ', 'chiffres : ') + r.digits.join('-')) + '</small><small class="ltr">' + esc((e.emails || []).join(' · ')) + '</small></div></div>'; }).join('') + '</div>'
    + '<div class="acts2"><button class="btn" data-act="sm-dir">📇 ' + L('لائحة الخبراء والأرقام', 'Annuaire des experts') + '</button><button class="btn" data-act="sm-pick">📥 ' + L('تحميل لائحة خبراء جديدة (Excel)', 'Nouvelle liste d\'experts (Excel)') + '</button>'
    + (Meta.get('experts', null) ? '<button class="btn" data-act="sm-reset">↺ ' + L('اللائحة الأصلية', 'Liste d\'origine') + '</button>' : '') + '</div>'
    + '<div class="hint">' + L('نفس الشكل ديال LISTE_DES_EXPERTS_AUTO (CODE، CABINET، EXPERT، VILLE، AFFECTATION، MISSIONNEMENT، … ADRESSE EMAIL).', 'Même format que LISTE_DES_EXPERTS_AUTO.') + '</div></div>';
});
App.act('sm-save-cfg', function () { Meta.save({ expMail_from: sinTidy($('sm-from').value), expMail_city: sinTidy($('sm-city').value).toUpperCase() }); toast('💾 ' + L('تحفظ', 'Enregistré')); App.render(); });
App.act('sm-reset', function () { if (!App.user.admin) return; if (confirm(L('نرجعو للائحة الأصلية؟', 'Revenir à la liste d\'origine ?'))) { Meta.save({ experts: null }); App.render(); } });

/* ───────── 📇 لائحة الخبراء (صفحة الحوادث) ───────── */
var SmDir = { q: '' };
function smDirCard(e) {
  var r = smRule(e);
  return '<div class="sm-dcard"><div class="sm-dh"><b>' + esc(e.cab) + '</b>' + (e.exp ? ' <span class="muted">— ' + esc(e.exp) + '</span>' : '') + '</div>'
    + '<small class="muted">📍 ' + esc(e.ville || '') + (e.zone ? ' · ' + esc(e.zone) : '') + ' · ' + (r.remote ? L('بالمسافة', 'à distance') : r.digits.length === 10 ? L('حصري', 'exclusif') : L('أرقام الماتريكول: ', 'chiffres : ') + r.digits.join('-')) + '</small>'
    + smPhoneHTML(e)
    + ((e.emails || []).length ? '<div class="sm-phs">' + e.emails.map(function (m) { return '<a class="btn sm" href="mailto:' + esc(m) + '" data-copy="' + esc(m) + '">✉️ ' + ltr(m) + '</a>'; }).join('') + '</div>' : '')
    + (e.adr ? '<small class="muted">🏢 ' + esc(e.adr) + '</small>' : '') + '</div>';
}
function smDirList() {
  var q = smFold(SmDir.q), qd = String(SmDir.q || '').replace(/\D/g, ''), city = smGet('city'), l = smExperts();
  if (q) l = l.filter(function (e) {
    if (qd.length >= 4 && /^[\d\s.]+$/.test(SmDir.q)) return smPhones(e).some(function (p) { return p.n.indexOf(qd) >= 0; });
    return smFold([e.cab, e.exp, e.ville, e.zone, e.zone2, (e.emails || []).join(' ')].join(' ')).indexOf(q) >= 0;
  });
  var loc = l.filter(function (e) { return smInCity(e, city); }), oth = l.filter(function (e) { return !smInCity(e, city); });
  if (!l.length) return '<div class="muted sm" style="padding:10px">' + L('ما كاين حتى خبير بهاد البحث', 'Aucun expert trouvé') + '</div>';
  return (loc.length ? '<div class="lbl">' + esc(city) + ' (' + loc.length + ')</div>' + loc.map(smDirCard).join('') : '')
    + (oth.length ? '<div class="lbl">' + L('مدن أخرى', 'Autres villes') + ' (' + oth.length + ')</div>' + oth.map(smDirCard).join('') : '');
}
App.act('sm-dir', function () {
  var at = Meta.get('expertsAt', ''), by = Meta.get('expertsBy', '');
  Modal.open(Modal.head('📇 ' + L('الخبراء', 'Experts') + ' <small class="muted">(' + smExperts().length + ')</small>')
    + '<input id="sm-dq" class="inp" data-inp="sm-dq" placeholder="🔎 ' + L('بحث: الاسم، المدينة، الإيميل ولا الرقم', 'Recherche : nom, ville, e-mail ou numéro') + '" value="' + esc(SmDir.q) + '">'
    + '<div id="sm-dl" class="sm-dl">' + smDirList() + '</div>'
    + '<div class="hint">' + (Meta.get('experts', null) ? L('اللائحة تحمّلات ', 'Liste importée ') + (at ? fmtDT(at) : '') + (by ? ' — ' + esc(by) : '') : L('اللائحة الأصلية (LISTE_DES_EXPERTS_AUTO 01/07/2025)', 'Liste d\'origine (01/07/2025)')) + '</div>'
    + (App.canUp() ? '<div class="acts2"><button class="btn" data-act="sm-pick">📥 ' + L('تحميل لائحة جديدة (Excel)', 'Nouvelle liste (Excel)') + '</button></div>' : ''), 'wide');
  setTimeout(function () { var i = $('sm-dq'); if (i && window.matchMedia('(pointer: fine)').matches) i.focus(); }, 50);
});
App.input('sm-dq', function (el) { SmDir.q = el.value; var d = $('sm-dl'); if (d) d.innerHTML = smDirList(); });

/* ───────── 📥 لائحة جديدة: كنقراوها، كنوريو الفرق، ومن بعد كنحفظو ───────── */
App.act('sm-pick', function () {
  if (!App.canUp()) { toast(L('خاصك صلاحية «📥 تحميل الملفات»', 'Droit « Import de fichiers » requis'), 'err'); return; }
  var f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls';
  f.onchange = function () { if (f.files && f.files[0]) smImport(f.files[0]); }; f.click();
});
function smParseXls(buf) {
  var wb = XLSX.read(new Uint8Array(buf), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  var hi = -1; for (var i = 0; i < Math.min(rows.length, 10); i++) if (rows[i].map(smFold).indexOf('CABINET') >= 0) { hi = i; break; }
  if (hi < 0) throw new Error(L('ما لقيتش العمود CABINET', 'Colonne CABINET introuvable'));
  var H = rows[hi].map(smFold), col = function (n) { return H.findIndex(function (h) { return h.indexOf(n) === 0; }); };
  var C = { code: col('CODE'), cab: col('CABINET'), exp: col('EXPERT'), ville: col('VILLE'), zone: col('AFFECTATION'), rule: col('MISSIONNEMENT'), adr: col('ADRESSE'), tel: col('TEL'), gsm: col('G S M'), mail: col('ADRESSE EMAIL') };
  var out = [], t = function (r, k) { return C[k] >= 0 ? sinTidy(r[C[k]]) : ''; };
  rows.slice(hi + 1).forEach(function (r) {
    if (!t(r, 'cab')) { var p = out[out.length - 1]; if (p) { if (t(r, 'zone')) p.zone2 = t(r, 'zone'); if (t(r, 'rule')) p.rule2 = t(r, 'rule'); if (t(r, 'adr')) p.adr = (p.adr ? p.adr + ' / ' : '') + t(r, 'adr'); if (t(r, 'tel')) p.tel = (p.tel ? p.tel + ' ' : '') + t(r, 'tel'); if (t(r, 'gsm')) p.gsm = (p.gsm ? p.gsm + ' ' : '') + t(r, 'gsm'); } return; }
    var em = (String(C.mail >= 0 ? r[C.mail] : '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(function (m) { return m.toLowerCase(); });
    out.push({ code: t(r, 'code'), cab: t(r, 'cab'), exp: t(r, 'exp'), ville: t(r, 'ville'), zone: t(r, 'zone'), rule: t(r, 'rule'), adr: t(r, 'adr'), tel: t(r, 'tel'), gsm: t(r, 'gsm'), emails: em.filter(function (m, i) { return em.indexOf(m) === i; }) });
  });
  out.forEach(function (o) { if (!o.emails.length) { var s = out.filter(function (x) { return x.code && x.code === o.code && x.emails.length; })[0]; if (s) o.emails = s.emails.slice(); } });
  return out;
}
function smKey(e) { return smFold(e.cab) + '|' + smFold(e.ville); }
var SM_FIELDS = [['tel', '☎️'], ['gsm', '📱'], ['emails', '✉️'], ['rule', '🔢'], ['rule2', '🔢'], ['zone', '📍'], ['zone2', '📍'], ['exp', '👤'], ['adr', '🏢']];
function smDiff(oldL, newL) {
  var om = {}, nm = {}, d = { add: [], del: [], chg: [] };
  oldL.forEach(function (e) { om[smKey(e)] = e; }); newL.forEach(function (e) { nm[smKey(e)] = e; });
  newL.forEach(function (e) { var o = om[smKey(e)]; if (!o) { d.add.push(e); return; }
    var f = SM_FIELDS.filter(function (x) { var a = o[x[0]], b = e[x[0]]; if (x[0] === 'emails') { a = (a || []).join(','); b = (b || []).join(','); } else if (x[0] === 'tel' || x[0] === 'gsm') { a = smPhones({ tel: a }).map(function (p) { return p.n; }).join(); b = smPhones({ tel: b }).map(function (p) { return p.n; }).join(); } return String(a || '') !== String(b || ''); });
    if (f.length) d.chg.push({ e: e, f: f.map(function (x) { return x[1]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }) }); });
  oldL.forEach(function (e) { if (!nm[smKey(e)]) d.del.push(e); });
  return d;
}
function smImport(file) {
  file.arrayBuffer().then(function (buf) {
    var out = smParseXls(buf); if (!out.length) { toast(L('ما لقيت حتى خبير', 'Aucun expert trouvé'), 'err'); return; }
    var d = smDiff(smExperts(), out), city = smGet('city');
    SinMail.pend = out;
    var li = function (arr, fn) { return arr.length ? '<div class="lines">' + arr.map(fn).join('') + '</div>' : ''; };
    var nm = function (e) { return '<b>' + esc(e.cab) + '</b> <small class="muted">' + esc(e.ville || '') + (smInCity(e, city) ? ' ⭐' : '') + '</small>'; };
    var same = !d.add.length && !d.del.length && !d.chg.length;
    Modal.open(Modal.head('📥 ' + L('لائحة الخبراء الجديدة', 'Nouvelle liste d\'experts') + ' <small class="muted">' + esc(file.name) + '</small>')
      + '<div class="sm-diff"><span class="chip">' + out.length + ' ' + L('خبير', 'experts') + '</span><span class="chip green">➕ ' + d.add.length + '</span><span class="chip amber">✏️ ' + d.chg.length + '</span><span class="chip red">➖ ' + d.del.length + '</span></div>'
      + (out.length < smExperts().length / 2 ? '<div class="box red sm">⚠️ ' + L('اللائحة الجديدة صغيرة بزاف على القديمة. تأكد بلي هو الملف الصحيح.', 'La nouvelle liste est beaucoup plus courte. Vérifiez le fichier.') + '</div>' : '')
      + (same ? '<div class="box sm">✅ ' + L('نفس اللائحة، ما تبدل والو.', 'Liste identique, aucun changement.') + '</div>' : '')
      + (d.add.length ? '<div class="lbl">➕ ' + L('جداد', 'Nouveaux') + '</div>' + li(d.add, function (e) { return '<div class="line"><div>' + nm(e) + '</div></div>'; }) : '')
      + (d.chg.length ? '<div class="lbl">✏️ ' + L('تبدلو', 'Modifiés') + ' <small class="muted">(☎️📱 ' + L('الأرقام', 'numéros') + ' · ✉️ ' + L('البريد', 'e-mail') + ' · 🔢 ' + L('أرقام الماتريكول', 'chiffres') + ' · 📍 ' + L('المنطقة', 'zone') + ')</small></div>' + li(d.chg, function (x) { return '<div class="line"><div>' + nm(x.e) + ' <span>' + x.f.join(' ') + '</span></div></div>'; }) : '')
      + (d.del.length ? '<div class="lbl">➖ ' + L('ما بقاوش فاللائحة', 'Retirés') + '</div>' + li(d.del, function (e) { return '<div class="line"><div>' + nm(e) + '</div></div>'; }) : '')
      + '<div class="acts2">' + (same ? '' : '<button class="btn pri" data-act="sm-imp-ok">💾 ' + L('حفظ اللائحة الجديدة', 'Enregistrer la nouvelle liste') + '</button>') + '<button class="btn" data-act="sm-dir">' + L('رجوع', 'Retour') + '</button></div>', 'wide');
  }).catch(function (e) { toast(String(e && e.message || e), 'err'); });
}
App.act('sm-imp-ok', function () {
  var out = SinMail.pend; if (!out || !App.canUp()) return;
  Meta.save({ experts: out, expertsAt: new Date().toISOString(), expertsBy: App.user.name }).then(function () {
    if (Meta.denied) { toast(L('القاعدة رفضات الحفظ', 'Enregistrement refusé'), 'err'); return; }
    SinMail.pend = null; SmDir.q = ''; toast('🧑‍🔧 ' + out.length + L(' خبير تحفظو', ' experts enregistrés'));
    App.acts['sm-dir'](); App.refresh();
  });
});
