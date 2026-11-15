/* ══════════════════════════════════════════════════════════
   RenewPro v6.5 — sin-cat-req.js   (📄 «Requête d'expertise» ديال CAT)
   نفس الزر «استيراد تصريح PDF» فـ 🚗: إلا كان الملف ورقة CAT (Requête d'expertise + N/REF CAT)،
   كنقراوها هنا؛ وإلا كيمشي للقارئ العادي ديال التصريح (ما تبدل والو فيه).
   • الورقة ديال CAT ما فيهاش ترتيب النص (Reporting Services): كنقراو بالبلاصة (x، y) ديال كل كلمة.
   • الخبير: CAT هي اللي كتعينو → كيتكتب فـ «Expert» و«🏢 Expert désigné par = CAT»،
     وفطلب الخبرة كيتختار بالسمية ديالو، بلا قاعدة الرقم الأخير ديال الماتريكول.
   • إلا كان الملف ديجا كاين (نفس مرجع CAT، ولا نفس البوليصة ونفس تاريخ الحادثة): كنعمرو غير الخانات الخاوية.
══════════════════════════════════════════════════════════ */
'use strict';

function scReadPos(file) {
  return sinPdfJS().then(function () { return file.arrayBuffer(); }).then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; })
    .then(function (pdf) { var out = [], chain = Promise.resolve();
      for (var p = 1; p <= pdf.numPages; p++) (function (p) { chain = chain.then(function () { return pdf.getPage(p); }).then(function (pg) { return pg.getTextContent(); })
        .then(function (c) { c.items.forEach(function (i) { var s = sinTidy(i.str); if (s) out.push({ s: s, x: i.transform[4], y: i.transform[5] - p * 10000 }); }); }); })(p);
      return chain.then(function () { return out; }); });
}
/* الكلمات → سطور (نفس y تقريباً)، من الفوق للتحت، ومن اليسار لليمين */
function scLines(items) {
  var a = items.slice().sort(function (p, q) { return q.y - p.y || p.x - q.x; }), lines = [];
  a.forEach(function (it) { var l = lines[lines.length - 1]; if (l && Math.abs(l.y - it.y) <= 3) l.parts.push(it); else lines.push({ y: it.y, parts: [it] }); });
  lines.forEach(function (l) { l.parts.sort(function (p, q) { return p.x - q.x; }); l.t = l.parts.map(function (p) { return p.s; }).join(' ').replace(/\s+/g, ' ').trim(); l.x = l.parts[0].x; });
  return lines;
}
function scIsCat(lines) { var all = lines.map(function (l) { return l.t; }).join('\n'); return /Requ[eê]te\s+d.?expertise/i.test(all) && /REF\s*CAT/i.test(all); }
var SC_ADDR = /\d|\b(PLACE|RUE|AV|AVENUE|BD|BOULEVARD|IMM|IMMEUBLE|RESIDENCE|RÉSIDENCE|ANGLE|ROUTE|LOT|LOTISSEMENT|QUARTIER|HAY|PASSAGE|ETAGE|ÉTAGE|APPT|BUREAU)\b/i;
function scParse(lines) {
  var all = lines.map(function (l) { return l.t; }).join('\n'), d = { kind: 'cat' };
  var m = all.match(/REF\s*CAT\s*:?\s*(\d{6,})/i); d.refCie = m ? m[1] : '';
  m = all.match(/survenu\s+le\s*(\d{2}\/\d{2}\/\d{4})/i); d.dateSin = m ? m[1] : '';
  m = all.match(/\ble,?\s*(\d{2}\/\d{2}\/\d{4})/i); d.dateLettre = m ? m[1] : '';
  m = all.match(/indemnisation[^:\n]*:\s*([^\n]+)/i); d.formule = m ? sinTidy(m[1]) : '';
  /* الخبير: السطور بين «Requête d'expertise» و«… le, jj/mm/aaaa» */
  var i0 = lines.findIndex(function (l) { return /Requ[eê]te\s+d.?expertise/i.test(l.t); }), i1 = lines.findIndex(function (l, i) { return i > i0 && /\ble,?\s*\d{2}\/\d{2}\/\d{4}/i.test(l.t); });
  var blk = (i0 >= 0 && i1 > i0) ? lines.slice(i0 + 1, i1).map(function (l) { return l.t; }) : [];
  var name = [], adr = [], city = '', seenAdr = false;
  blk.forEach(function (t, k) {
    if (!seenAdr && !SC_ADDR.test(t)) { name.push(t); return; }
    seenAdr = true;
    if (k === blk.length - 1 && !SC_ADDR.test(t) && t.split(' ').length <= 3) city = t; else adr.push(t.replace(/\s*-\s*$/, ''));
  });
  d.expert = name.join(' ').toUpperCase(); d.expertAdr = adr.join(' ').trim(); d.expertCity = city.toUpperCase();
  /* الجدول: Notre Assuré | Adversaire */
  var hi = lines.findIndex(function (l) { return /Adversaire/i.test(l.t); });
  if (hi >= 0) {
    var ph = lines[hi].parts, xo = (ph.filter(function (p) { return /Notre/i.test(p.s); })[0] || ph[0]).x - 12, xa = (ph.filter(function (p) { return /Adversaire/i.test(p.s); })[0] || {}).x - 12;
    lines.slice(hi + 1).forEach(function (l) {
      var lab = sinFold(l.parts.filter(function (p) { return p.x < xo; }).map(function (p) { return p.s; }).join(' ')).toUpperCase();
      var ours = l.parts.filter(function (p) { return p.x >= xo && p.x < xa; }).map(function (p) { return p.s; }).join(' ').trim();
      var adv = l.parts.filter(function (p) { return p.x >= xa; }).map(function (p) { return p.s; }).join(' ').trim();
      var k = /^NOM\b/.test(lab) ? 'nom' : /POLICE/.test(lab) ? 'pol' : /MARQUE/.test(lab) ? 'mq' : /IMMAT/.test(lab) ? 'im' : /COMPAGNIE/.test(lab) ? 'cie' : '';
      if (!k || d['o_' + k] !== undefined) return; d['o_' + k] = ours; d['a_' + k] = adv;
    });
  }
  var plate = function (s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); };
  d.assure = (d.o_nom || '').toUpperCase(); d.police = (d.o_pol || '').replace(/\s+/g, ''); d.marque = d.o_mq || ''; d.plate = plate(d.o_im);
  d.tiers = (d.a_nom || '').toUpperCase(); d.advPolice = (d.a_pol || '').replace(/\s+/g, ''); d.advImmat = plate(d.a_im); d.advCie = d.a_cie ? sinNormCie(d.a_cie) : '';
  return d;
}
function scNote(d) {
  return '📄 Requête d\'expertise CAT N° ' + d.refCie + (d.dateLettre ? ' du ' + d.dateLettre : '') + ' — '
    + L('الخبير المعين: ', 'expert désigné : ') + (d.expert || '?') + (d.expertCity ? ' (' + d.expertCity + ')' : '') + (d.expertAdr ? ' — ' + d.expertAdr : '')
    + (d.formule ? ' — ' + d.formule : '') + (d.tiers ? ' — ' + L('الخصم: ', 'adversaire : ') + d.tiers + (d.advImmat ? ' ' + d.advImmat : '') : '');
}
function scImport(file, d) {
  var dg = sinDigits(d.refCie), kp = kPolTail(d.police);
  var twin = Sin.rows.filter(function (r) { return dg && (sinDigits(r.refCie) === dg || sinDigits(r.advSinistre) === dg); })[0]
    || Sin.rows.filter(function (r) { return kp && kPolTail(r.police) === kp && d.dateSin && sinTidy(r.dateSin) === d.dateSin; })[0];
  var vals = { refCie: d.refCie, police: d.police, assure: d.assure, dateSin: d.dateSin, advCie: d.advCie, advPolice: d.advPolice, cat: 'CAT' };
  var extra = { plate: d.plate, expert: d.expert, expBy: 'CAT' };
  var note = scNote(d), filled = [];
  if (twin) {
    var row = Object.assign({}, twin), diff = '';
    Object.keys(vals).forEach(function (k) { if (vals[k] && (!sinTidy(row[k]) || (k === 'cat' && sinTidy(row[k]) === 'A'))) { row[k] = vals[k]; filled.push(k); } });
    var expOther = twin.expert && d.expert && smFoldSafe(twin.expert) !== smFoldSafe(d.expert);   // خبير آخر فالملف: ما نقولوش بلي CAT عيناتو
    Object.keys(extra).forEach(function (k) { if (extra[k] && !sinTidy(row[k]) && !(k === 'expBy' && expOther)) { row[k] = extra[k]; filled.push('x-' + k); } });
    if (twin.expert && d.expert && smFoldSafe(twin.expert) !== smFoldSafe(d.expert)) diff = ' ⚠️ ' + L('الخبير فالملف «', 'Expert du dossier « ') + twin.expert + L('» ماشي هو اللي عينات CAT. بدّلو إلا بغيتي.', ' » ≠ expert désigné par CAT.');
    sinOpen(row, { fromPdf: filled, note: note + ' — ' + L('الملف ديجا كاين (', 'Dossier existant (') + (twin.ordre || '') + L('): تعمرو غير الخانات الخاوية (بالأخضر). اضغط «حفظ».', ') : seules les cases vides sont remplies. Enregistrez.') + diff });
    return;
  }
  var nr = sinBlank();
  Object.keys(vals).forEach(function (k) { if (vals[k]) { nr[k] = vals[k]; filled.push(k); } });
  Object.keys(extra).forEach(function (k) { if (extra[k]) { nr[k] = extra[k]; filled.push('x-' + k); } });
  sinOpen(nr, { isNew: true, fromPdf: filled, note: note + L('. راجع واضغط «حفظ».', '. Vérifiez puis enregistrez.') });
}
function smFoldSafe(s) { return sinFold(String(s || '')).toUpperCase().replace(/[^A-Z0-9]+/g, ''); }

/* كنلفو على القارئ العادي: ورقة CAT هنا، والباقي كيمشي ليه */
(function () {
  var orig = App.inputs['sin-pdf']; if (!orig) return;
  App.input('sin-pdf', function (el) {
    var file = el.files && el.files[0]; if (!file) return;
    scReadPos(file).then(function (items) {
      var lines = scLines(items);
      if (!scIsCat(lines)) { orig(el); return; }
      var d = scParse(lines);
      if (!d.refCie && !d.police && !d.assure) { orig(el); return; }
      scImport(file, d);
    }).catch(function () { orig(el); });
  });
})();
