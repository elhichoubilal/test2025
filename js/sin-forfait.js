/* ══════════════════════════════════════════════════════════
   RenewPro v6.7 — sin-forfait.js   (📝 «Accord sur indemnisation forfaitaire» — WAFA)
   زر فملف الحادثة (حدا 📧 طلب الخبرة) → نافذة: الخانات معمرة من الملف + معاينة حية ديال الورقة.
   التحميل: 📄 PDF (pdf-lib محلي) ولا 📝 Word (.docx حقيقي، كيتبنى هنا بلا مكتبة).
   الشكل: «النموذج 3 بلا ألوان» اللي اختار صاحب البرنامج (28/10). نفس النص فالثلاثة (SF_DOC).
   • المبلغ إجباري، وكيتحفظ فالملف (forfait، ماشي فالسجل الأصلي) + ملاحظة. الـ CIN ما كتتحفظش.
   • خانة خاوية (السمية، الـ CIN) = نقط «……» باش تتكتب باليد.
══════════════════════════════════════════════════════════ */
'use strict';

var SfCur = null;
var SF_PLACE = 'Ksar Sghir, le ';                 // 28/10: «Ksar Sghir 28/10/2026» (ماشي Casablanca)
var SF_DOTS = '……………………………', SF_DOTS_S = '…………………';
var SF_DOC = {
  title: 'ACCORD SUR INDEMNISATION FORFAITAIRE',
  rows: [['N° du sinistre', 'sin'], ['N° police', 'pol'], ['Immatriculation du véhicule', 'imm'], ['Date sinistre', 'dsin'], ['Montant forfait confirmé par l’expert', 'mt']],
  /* الفقرة الأولى: أجزاء [نص، عريض؟] */
  p1: function (v) { return [['Je soussigné (M./Mme.) ', 0], [v.nom || SF_DOTS, !!v.nom], [' titulaire de la CIN N° ', 0], [v.cin || SF_DOTS_S, !!v.cin], [' Déclare donner par la présente mon accord pour l\'indemnisation forfaitaire, suite au sinistre susmentionné.', 0]]; },
  h2: 'Je reconnais avoir pris connaissance de ce qui suit :',
  bullets: ['le montant du forfait est basé sur l\'évaluation des dommages effectuée par l\'expert.',
    'L\'indemnité qui me sera versée par la compagnie est basée sur le montant du forfait proposé par l\'expert, et calculée tenant compte d’autres éléments, notamment le taux de responsabilité du client, la franchise prévue dans le contrat tenant compte du nombre de sinistres enregistrés, et l’éventuelle vétusté à déduire.'],
  p3: 'Je m\'engage à procéder aux réparations des dégâts identifiés par l’expert, et à ne pas déclarer d\'autres sinistres se rapportant à ces mêmes dommages, sauf si après réparation, un autre accident est survenu, portant sur les mêmes points de chocs. Dans ce cas, la compagnie exigera les pièces prouvant que le véhicule a bien été réparé suite à cette indemnisation forfaitaire (facture du garage et photos après réparation). A défaut, elle ne peut que classer sans suite la nouvelle demande d’indemnisation en question.',
  boxT: 'POUR UN REGLEMENT RAPIDE PAR MAD WAFACASH', boxS: 'MERCI DE CONTACTER LA PLATEFORME AU 0522545554',
  sig1: 'Signature Assuré,', sig1s: 'précédé par la mention « lu et approuvé » :', sig2: 'Expert'
};
function sfVal(v, k) { return k === 'mt' ? (v.mt ? v.mt + ' DH' : '') : (v[k] || ''); }
function sfLib() { return window.PDFLib ? Promise.resolve() : sinLoad('js/vendor/pdf-lib.min.js'); }
function sfBtn(r) { return '<button class="btn wide sin-mailbtn" data-act="sf-open" data-id="' + esc(r.id) + '">📝 Accord forfait (WAFA)' + (r.forfait ? ' <small class="muted">· ' + money(r.forfait) + ' DH</small>' : '') + '</button>'; }
(function () { if (typeof sinMailBtn !== 'function') return; var orig = sinMailBtn; sinMailBtn = function (r) { return orig(r) + sfBtn(r); }; })();

/* ───────── النافذة: الخانات + المعاينة ───────── */
var SF_FIELDS = [['sf-date', 'Ksar Sghir'], ['sf-sin', 'N° du sinistre'], ['sf-pol', 'N° police'], ['sf-imm', 'Immatriculation'], ['sf-dsin', 'Date sinistre'],
  ['sf-mt', 'Montant forfait (DH) *'], ['sf-nom', 'Je soussigné (M./Mme.)'], ['sf-cin', 'CIN N°']];
App.act('sf-open', function (el) {
  var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return;
  var val = function (id, def) { var e = $(id); return e ? sinTidy(e.value) : (def || ''); };          // اللي مكتوب فالشاشة (حتى إلا ما تحفظش)
  var plate = val('sf-x-plate', r.plate); if (!plate && typeof smPlateOf === 'function') plate = smPlateOf({ police: val('sf-police', r.police) }).v || '';
  var d = new Date(), init = { 'sf-date': pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(), 'sf-sin': val('sf-refCie', r.refCie) || val('sf-advSinistre', r.advSinistre),
    'sf-pol': val('sf-police', r.police), 'sf-imm': plate, 'sf-dsin': val('sf-dateSin', r.dateSin), 'sf-mt': r.forfait ? String(r.forfait).replace('.', ',') : '', 'sf-nom': val('sf-assure', r.assure), 'sf-cin': '' };
  SfCur = { r: r };
  Modal.open(Modal.head('📝 Accord sur indemnisation forfaitaire — ' + esc(r.ordre || r.assure || ''))
    + '<div class="sf-wrap"><div class="sf-form sfm-' + sfModel() + '">' + sfModelHTML()
      + SF_FIELDS.map(function (f) { return '<label class="f"><span>' + f[1] + (f[0] === 'sf-cin' ? ' <small class="muted">' + L('(اختياري، ما كتتحفظش)', '(facultatif)') + '</small>' : '') + '</span><input id="' + f[0] + '" dir="ltr" autocomplete="off" data-inp="sf-upd" value="' + esc(init[f[0]] || '') + '"' + (f[0] === 'sf-mt' ? ' inputmode="decimal"' : '') + '></label>'; }).join('')
      + '<div class="hint">' + L('الخانة الخاوية كتبقى بالنقط فالورقة باش تتكتب باليد.', 'Un champ vide reste en pointillés.') + '</div>'
      + '<div class="acts2"><button class="btn pri" data-act="sf-pdf">📄 PDF</button><button class="btn" data-act="sf-docx">📝 Word</button></div>'
      + '<button class="btn wide" data-act="sf-back">' + L('رجوع للملف', 'Retour au dossier') + '</button>'
    + '</div><div class="sf-prev-wrap"><div class="sf-page" id="sf-prev"></div></div></div>', 'wide sf-modal');
  sfPreview();
  setTimeout(function () { var m = $('sf-mt'); if (m && !m.value && window.matchMedia('(pointer: fine)').matches) m.focus(); }, 60);
});
App.act('sf-back', function () { var r = SfCur && Sin.rows.filter(function (x) { return x.id === SfCur.r.id; })[0]; if (r) sinOpen(r); });
App.input('sf-upd', function () { sfPreview(); });
function sfVals() {
  var g = function (id) { var e = $(id); return e ? sinTidy(e.value) : ''; }, n = num(g('sf-mt'));
  return { date: g('sf-date'), sin: g('sf-sin'), pol: g('sf-pol'), imm: g('sf-imm').toUpperCase(), dsin: sinTidyDate(g('sf-dsin')), n: n, mt: n ? money(n).replace(/ /g, ' ') : '',
    nom: g('sf-nom').toUpperCase(), cin: g('sf-cin').toUpperCase() };
}
/* المعاينة: نفس الورقة بـ HTML */
function sfPreview() { if (sfModel() === 'exp') return sfPreviewExp();
  var box = $('sf-prev'); if (!box) return; var v = sfVals();
  box.innerHTML = '<div class="sf-date">' + esc(SF_PLACE) + esc(v.date || SF_DOTS_S) + '</div>'
    + '<div class="sf-title">' + SF_DOC.title + '</div><div class="sf-rule"></div>'
    + '<table class="sf-tbl">' + SF_DOC.rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td' + (r[1] === 'mt' ? ' class="sf-mt"' : '') + '>' + esc(sfVal(v, r[1])) + '</td></tr>'; }).join('') + '</table>'
    + '<p>' + SF_DOC.p1(v).map(function (s) { return s[1] ? '<b>' + esc(s[0]) + '</b>' : esc(s[0]); }).join('') + '</p>'
    + '<p><b>' + esc(SF_DOC.h2) + '</b></p><ul class="sf-dash">' + SF_DOC.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>'
    + '<p>' + esc(SF_DOC.p3) + '</p>'
    + '<div class="sf-box"><b>' + esc(SF_DOC.boxT) + '</b><br><b>' + esc(SF_DOC.boxS) + '</b></div>'
    + '<div class="sf-sigs"><div><b>' + esc(SF_DOC.sig1) + '</b><small>' + esc(SF_DOC.sig1s) + '</small><span></span></div><div><b>' + esc(SF_DOC.sig2) + '</b><small>&nbsp;</small><span></span></div></div>';
}

/* ───────── 📄 PDF (نفس التصميم، أسود وأبيض) ───────── */
function sfPdf(v) {
  if (sfModel() === 'exp') return sfPdfExp(v);
  var P = window.PDFLib;
  return P.PDFDocument.create().then(function (doc) {
    return Promise.all([P.StandardFonts.Helvetica, P.StandardFonts.HelveticaBold, P.StandardFonts.HelveticaOblique].map(function (f) { return doc.embedFont(f); })).then(function (F) {
      var R = F[0], B = F[1], I = F[2], Hh = 841.92, Ww = 595.44, pg = doc.addPage([Ww, Hh]), k = P.rgb(0, 0, 0), g = P.rgb(0.25, 0.25, 0.25);
      var clean = function (t) { return String(t || '').replace(/[^\x20-\x7E -ÿ–—•…’“”€]/g, ''); };
      var T = function (t, x, y, s, f, c) { pg.drawText(clean(t), { x: x, y: Hh - y, size: s, font: f || R, color: c || k }); };
      /* سطور بخطوط مختلطة: أجزاء [نص، خط] */
      var flow = function (parts, x, y, w, s, lh) {
        var toks = []; parts.forEach(function (p) { clean(p[0]).split(/(\s+)/).forEach(function (t) { if (t) toks.push([t, p[1]]); }); });
        /* سطر مضبوط من الجوج جهات (justify)، والسطر الأخير عادي */
        var line = [], lw = 0, out = function (last) {
          var nat = line.reduce(function (a, t) { return a + t[1].widthOfTextAtSize(t[0], s); }, 0), sp = line.filter(function (t) { return /^\s+$/.test(t[0]); }).length;
          var extra = (!last && sp) ? (w - nat) / sp : 0, xx = x;
          line.forEach(function (t) { var sw = /^\s+$/.test(t[0]); if (!sw) T(t[0], xx, y, s, t[1]); xx += t[1].widthOfTextAtSize(t[0], s) + (sw ? extra : 0); });
          y += lh; line = []; lw = 0; };
        toks.forEach(function (t) { var tw = t[1].widthOfTextAtSize(t[0], s); if (/^\s+$/.test(t[0]) && !line.length) return; if (lw + tw > w && line.length) { while (line.length && /^\s+$/.test(line[line.length - 1][0])) line.pop(); out(false); if (/^\s+$/.test(t[0])) return; } line.push(t); lw += tw; });
        if (line.length) out(true); return y;
      };
      var M = 56, W = Ww - 2 * M, y;
      var dt = SF_PLACE + (v.date || SF_DOTS_S); T(dt, Ww - M - I.widthOfTextAtSize(clean(dt), 10), 58, 10, I, g);
      T(SF_DOC.title, M, 100, 16, B);
      pg.drawLine({ start: { x: M, y: Hh - 110 }, end: { x: M + 70, y: Hh - 110 }, thickness: 2, color: k });
      y = 132; var lw = 190, rh = 30;
      SF_DOC.rows.forEach(function (r) { var val = sfVal(v, r[1]), big = r[1] === 'mt';
        pg.drawRectangle({ x: M, y: Hh - y - rh, width: lw, height: rh, borderColor: k, borderWidth: 0.7 });
        pg.drawRectangle({ x: M + lw, y: Hh - y - rh, width: W - lw, height: rh, borderColor: k, borderWidth: 0.7 });
        T(r[0], M + 10, y + 19, 9.5, R, g); if (val) T(val, M + lw + 12, y + 19.5, big ? 12 : 11, B); y += rh; });
      y += 30;
      y = flow(SF_DOC.p1(v).map(function (p) { return [p[0], p[1] ? B : R]; }), M, y, W, 10, 15) + 8;
      T(SF_DOC.h2, M, y, 10, B); y += 18;
      SF_DOC.bullets.forEach(function (b) { T('-', M + 10, y, 10); y = flow([[b, R]], M + 20, y, W - 20, 10, 15); }); y += 8;
      y = flow([[SF_DOC.p3, R]], M, y, W, 10, 15) + 18;
      pg.drawRectangle({ x: M, y: Hh - y - 42, width: W, height: 42, borderColor: k, borderWidth: 0.8 });
      T(SF_DOC.boxT, M + 14, y + 17, 10, B); T(SF_DOC.boxS, M + 14, y + 32, 10, B); y += 80;
      var bw = (W - 20) / 2;
      [[SF_DOC.sig1, SF_DOC.sig1s], [SF_DOC.sig2, '']].forEach(function (s, i) { var x = M + i * (bw + 20);
        T(s[0], x, y, 10, B); if (s[1]) T(s[1], x, y + 13, 8.5, I, g); pg.drawRectangle({ x: x, y: Hh - y - 100, width: bw, height: 78, borderColor: k, borderWidth: 0.7 }); });
      doc.setTitle('Accord sur indemnisation forfaitaire'); doc.setCreator('RenewPro');
      return doc.save();
    });
  });
}

/* ───────── 📝 Word (.docx): XML ديال Word + ملف ZIP بلا ضغط (بلا مكتبة) ───────── */
function sfX(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function sfRun(t, o) { o = o || {}; return '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' + (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.c ? '<w:color w:val="' + o.c + '"/>' : '') + '<w:sz w:val="' + Math.round((o.sz || 10) * 2) + '"/></w:rPr><w:t xml:space="preserve">' + sfX(t) + '</w:t></w:r>'; }
function sfPara(runs, o) { o = o || {}; return '<w:p><w:pPr><w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 120 : o.after) + '" w:line="' + (o.line || 300) + '" w:lineRule="auto"/>' + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '') + (o.ind ? '<w:ind w:left="' + o.ind + '" w:hanging="' + (o.hang || 0) + '"/>' : '') + (o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="000000"/></w:pBdr>' : '') + '</w:pPr>' + runs + '</w:p>'; }
function sfBorders(sz) { return ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="' + sz + '" w:space="0" w:color="000000"/>'; }).join(''); }
function sfDocxXml(v) {
  if (sfModel() === 'exp') return sfDocxXmlExp(v);
  var cw = [3400, 6238], cell = function (w, inner, va) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:vAlign w:val="' + (va || 'center') + '"/></w:tcPr>' + inner + '</w:tc>'; };
  var body = sfPara(sfRun(SF_PLACE + (v.date || SF_DOTS_S), { i: true, c: '404040' }), { jc: 'right', after: 360 })
    + sfPara(sfRun(SF_DOC.title, { b: true, sz: 16 }), { after: 280 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>' + sfBorders(6) + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="' + cw[0] + '"/><w:gridCol w:w="' + cw[1] + '"/></w:tblGrid>'
    + SF_DOC.rows.map(function (r) { var big = r[1] === 'mt'; return '<w:tr><w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/></w:trPr>' + cell(cw[0], sfPara(sfRun(r[0], { sz: 9.5, c: '404040' }), { after: 0 })) + cell(cw[1], sfPara(sfRun(sfVal(v, r[1]), { b: true, sz: big ? 12 : 11 }), { after: 0 })) + '</w:tr>'; }).join('')
    + '</w:tbl>'
    + sfPara('', { after: 200 })
    + sfPara(SF_DOC.p1(v).map(function (p) { return sfRun(p[0], { b: !!p[1] }); }).join(''), { jc: 'both', after: 160 })
    + sfPara(sfRun(SF_DOC.h2, { b: true }), { after: 80 })
    + SF_DOC.bullets.map(function (b) { return sfPara(sfRun('-\t') + sfRun(b), { jc: 'both', ind: 400, hang: 200, after: 60 }); }).join('')
    + sfPara(sfRun(SF_DOC.p3), { jc: 'both', before: 120, after: 320 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>' + sfBorders(8) + '</w:tblBorders><w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="220" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr>'
      + cell(9638, sfPara(sfRun(SF_DOC.boxT, { b: true }), { after: 40 }) + sfPara(sfRun(SF_DOC.boxS, { b: true }), { after: 0 })) + '</w:tr></w:tbl>'
    + sfPara('', { after: 360 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4619"/><w:gridCol w:w="400"/><w:gridCol w:w="4619"/></w:tblGrid>'
      + '<w:tr>' + cell(4619, sfPara(sfRun(SF_DOC.sig1, { b: true }), { after: 0 }) + sfPara(sfRun(SF_DOC.sig1s, { i: true, sz: 8.5, c: '404040' }), { after: 0 }), 'bottom') + cell(400, sfPara('', { after: 0 })) + cell(4619, sfPara(sfRun(SF_DOC.sig2, { b: true }), { after: 0 }), 'top') + '</w:tr>'
      + '<w:tr><w:trPr><w:trHeight w:val="1560" w:hRule="exact"/></w:trPr>'
        + '<w:tc><w:tcPr><w:tcW w:w="4619" w:type="dxa"/><w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="6" w:color="000000"/>'; }).join('') + '</w:tcBorders></w:tcPr>' + sfPara('', { after: 0 }) + '</w:tc>'
        + cell(400, sfPara('', { after: 0 }))
        + '<w:tc><w:tcPr><w:tcW w:w="4619" w:type="dxa"/><w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="6" w:color="000000"/>'; }).join('') + '</w:tcBorders></w:tcPr>' + sfPara('', { after: 0 }) + '</w:tc>'
      + '</w:tr></w:tbl>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
}
var SF_CRC = null;
function sfCrc(b) { if (!SF_CRC) { SF_CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; SF_CRC[n] = c >>> 0; } }
  var crc = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) crc = SF_CRC[(crc ^ b[i]) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; }
function sfZip(files) {                                                   // ZIP «stored» (بلا ضغط): كافي لـ Word
  var enc = new TextEncoder(), parts = [], central = [], off = 0;
  var u16 = function (n) { return [n & 255, (n >>> 8) & 255]; }, u32 = function (n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; };
  files.forEach(function (f) {
    var name = enc.encode(f[0]), data = f[1] instanceof Uint8Array ? f[1] : enc.encode(f[1]), crc = sfCrc(data);
    var loc = [].concat([0x50, 0x4b, 3, 4], u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
    parts.push(new Uint8Array(loc), name, data);
    central.push(new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
    off += loc.length + name.length + data.length;
  });
  var cs = central.reduce(function (s, a) { return s + a.length; }, 0);
  return new Blob(parts.concat(central, [new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(files.length), u16(files.length), u32(cs), u32(off), u16(0)))]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function sfDocx(v) {
  var lg = sfModel() === 'exp' ? sfLogo() : null;
  if (lg) {                                                         /* 7.17.2: النموذج 2 باللوغو */
    var ext = /^data:image\/png/.test(lg) ? 'png' : 'jpeg', bin = Uint8Array.from(atob(lg.split(',')[1]), function (c) { return c.charCodeAt(0); });
    return sfZip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="' + ext + '" ContentType="image/' + ext + '"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.' + ext + '"/></Relationships>'],
      ['word/media/logo.' + ext, bin],
      ['word/document.xml', sfDocxXml(v)]
    ]);
  }
  return sfZip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', sfDocxXml(v)]
  ]);
}

/* ───────── التحميل ───────── */
function sfSaveFile(blob, name) {
  var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}
function sfDone(v, kind) {
  var r = SfCur.r, note = { t: '📝 Accord forfait (' + (sfModel() === 'exp' ? 'Expert ' + (sfExp().cab || '') : 'WAFA') + ', ' + kind + '): ' + v.mt + ' DH', by: App.user.name, at: new Date().toISOString() };
  Sin.col().doc(r.id).update({ forfait: v.n, notes: FB.FV.arrayUnion(note), upd: note.at, updBy: App.user.name }).catch(syncErr);
  toast('📝 ' + kind + ' ' + L('واجد', 'prêt'));
}
function sfCheck(v) { if (v.n) return true; toast(L('كتب المبلغ ديال الـ forfait', 'Saisissez le montant du forfait'), 'err'); var m = $('sf-mt'); if (m) m.focus(); return false; }
function sfName(v, ext) { return 'Accord_forfait_' + ((v.sin || (SfCur && SfCur.r.ordre) || '').replace(/[^\w-]+/g, '_') || 'WAFA') + '.' + ext; }
App.act('sf-pdf', function () {
  if (!SfCur) return; var v = sfVals(); if (!sfCheck(v)) return;
  toast('⏳ PDF…');
  sfLib().then(function () { return sfPdf(v); }).then(function (out) { sfSaveFile(new Blob([out], { type: 'application/pdf' }), sfName(v, 'pdf')); sfDone(v, 'PDF'); })
    .catch(function (e) { console.error(e); toast(L('ما قدرتش نصاوب الـ PDF: ', 'PDF impossible : ') + (e && e.message || e), 'err'); });
});
App.act('sf-docx', function () {
  if (!SfCur) return; var v = sfVals(); if (!sfCheck(v)) return;
  try { sfSaveFile(sfDocx(v), sfName(v, 'docx')); sfDone(v, 'Word'); } catch (e) { console.error(e); toast('Word: ' + (e && e.message || e), 'err'); }
});


/* ══════════ 7.17.2 — النموذج 2 (Expert): نفس الشكل ديال «EXPWAFA2202» ديال الخبير ══════════
   الكتابة حرفياً بحال الورقة ديال الخبير. بلا لوغو (غير اسم المكتب كنص). المكتب، Code doc والمدينة كيتبدلو وكيتفكرهم البرنامج فهاد الجهاز. */
var SF_EXP = {
  title: 'ACCORD SUR INDEMNISATION FORFAITAIRE',
  rows: [['N° de sinistre', 'sin'], ['N° police', 'pol'], ['Immatriculation du véhicule', 'imm'], ['Date sinistre', 'dsin'], ['Montant forfait confirmé par l’expert', 'mt']],
  p1: function (v) { return [['Je soussigné (M./Mme.) ', 0], [v.nom || '……………………………..', 1], [' Titulaire de la CIN N°', 0], [v.cin || '………', 1], [' déclare donner par la présente mon accord pour l’indemnisation forfaitaire, suite au sinistre susmentionné.', 0]]; },
  h2: 'Je reconnais avoir pris connaissance de ce qui suit :',
  bullets: ['Le montant du forfait est basé sur l’évaluation des dommages effectuée par l’expert.',
    'L’indemnité qui me sera versé par la compagnie est basée sur le montant du forfait proposé par l’expert, et calculée tenant compte d’autre éléments, notamment le taux de responsabilité du client, la franchise prévue dans le contrat tenant compte du nombre de sinistres enregistrés, et l’éventuelle vétusté à déduire.'],
  p3: 'Je m’engage à procéder aux réparations des dégâts identifiés par l’expert, et à ne pas déclarer d’autres sinistres se rapportant à ces mêmes dommages, sauf si après réparation, un autre accident est survenu, portant sur les mêmes points de chocs.',
  p4: 'Dans ce cas, la compagnie exigera les pièces pouvant que le véhicule a bien été réparé suite à cette indemnisation forfaitaire (facture du garage et photos après réparation). A défaut, elle ne peut que classer sans suite la nouvelle demande d’indemnisation en question.',
  boxT: 'POUR UN REGLEMENT RAPIDE PAR MAD WAFACASH', boxS: 'MERCI DE CONTACTER LA PLATEFORME AU 0522545554',
  sig1: 'Signature Assuré, précédé par la mention <<lu et approuvé >>', sig2: 'Expert'
};
function sfModel() { try { return localStorage.getItem('rp7_sf_model') === 'exp' ? 'exp' : 'wafa'; } catch (e) { return 'wafa'; } }
function sfExp() { var d = { cab: 'SKYEXPERT', code: 'EXPWAFA2202', ville: 'Tanger' }; try { var x = JSON.parse(localStorage.getItem('rp7_sf_exp') || 'null'); if (x) Object.keys(d).forEach(function (k) { if (x[k] != null) d[k] = x[k]; }); } catch (e) { } return d; }
function sfModelHTML() {
  var m = sfModel(), x = sfExp();
  return '<div class="sf-models">' + [['wafa', L('النموذج 1 (Wafa)', 'Modèle 1 (Wafa)')], ['exp', L('النموذج 2 (Expert)', 'Modèle 2 (Expert)')]].map(function (o) { return '<button class="chip' + (m === o[0] ? ' on' : '') + '" data-act="sf-model" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
    + '<div class="sf-expf">' + [['sfx-cab', L('مكتب الخبرة', 'Cabinet d\'expertise'), x.cab], ['sfx-code', 'Code doc', x.code], ['sfx-ville', L('المدينة', 'Ville'), x.ville]].map(function (f) {
      return '<label class="f"><span>' + f[1] + '</span><input id="' + f[0] + '" dir="ltr" autocomplete="off" data-inp="sf-exp" value="' + esc(f[2]) + '"></label>'; }).join('') + '</div>';
}
App.act('sf-model', function (el) {
  try { localStorage.setItem('rp7_sf_model', el.dataset.v); } catch (e) { }
  var f = document.querySelector('.sf-form'); if (f) { f.classList.remove('sfm-wafa', 'sfm-exp'); f.classList.add('sfm-' + el.dataset.v); }
  document.querySelectorAll('[data-act="sf-model"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === el.dataset.v); });
  sfPreview();
});
App.input('sf-exp', function () {
  var g = function (id) { var e = $(id); return e ? sinTidy(e.value) : ''; };
  try { localStorage.setItem('rp7_sf_exp', JSON.stringify({ cab: g('sfx-cab'), code: g('sfx-code'), ville: g('sfx-ville') })); } catch (e) { }
  sfPreview();
});
function sfExpDate(v) { var x = sfExp(); return 'Ville : ' + (x.ville || '……') + ' le ' + (v.date || '…./…./' + new Date().getFullYear()); }
function sfPreviewExp() {
  var box = $('sf-prev'); if (!box) return; var v = sfVals(), x = sfExp(), D = SF_EXP;
  box.innerHTML = '<div class="sfx-hd"><b>' + esc(x.cab) + '</b><div><u>Code doc : ' + esc(x.code) + '</u><br><b>' + esc(sfExpDate(v)) + '</b></div></div>'
    + '<div class="sfx-title">' + D.title + '</div>'
    + '<table class="sf-tbl sfx-tbl">' + D.rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td' + (r[1] === 'mt' ? ' class="sf-mt"' : '') + '>' + esc(sfVal(v, r[1])) + '</td></tr>'; }).join('') + '</table>'
    + '<p class="sfx">' + D.p1(v).map(function (s) { return s[1] ? '<b>' + esc(s[0]) + '</b>' : esc(s[0]); }).join('') + '</p>'
    + '<p class="sfx">' + esc(D.h2) + '</p><ul class="sf-dash sfx">' + D.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>'
    + '<p class="sfx">' + esc(D.p3) + '</p><p class="sfx">' + esc(D.p4) + '</p>'
    + '<div class="sf-box sfx-box"><b>' + esc(D.boxT) + '</b><br><b>' + esc(D.boxS) + '</b></div>'
    + '<div class="sf-sigs sfx-sigs"><div><u>' + esc(D.sig1) + '</u><span></span></div><div><b class="sfx-exp">' + esc(D.sig2) + '</b><span></span></div></div>';
}
function sfPdfExp(v) {
  var P = window.PDFLib, x = sfExp(), D = SF_EXP;
  return P.PDFDocument.create().then(function (doc) {
    return Promise.all([P.StandardFonts.TimesRoman, P.StandardFonts.TimesRomanBold, P.StandardFonts.Helvetica, P.StandardFonts.HelveticaBold].map(function (f) { return doc.embedFont(f); })).then(function (F) {
      var R = F[0], B = F[1], H = F[2], HB = F[3], Hh = 841.92, Ww = 595.32, pg = doc.addPage([Ww, Hh]), k = P.rgb(0, 0, 0);
      var clean = function (t) { return String(t || '').replace(/[^\x20-\x7E -ÿ–—•…’“”€]/g, ''); };
      var T = function (t, xx, y, s, f) { pg.drawText(clean(t), { x: xx, y: Hh - y, size: s, font: f || R, color: k }); };
      var U = function (t, xx, y, s, f) { var w = (f || R).widthOfTextAtSize(clean(t), s); pg.drawLine({ start: { x: xx, y: Hh - y - 1.5 }, end: { x: xx + w, y: Hh - y - 1.5 }, thickness: 0.6, color: k }); };
      var flow = function (parts, xx, y, w, s, lh) {
        var toks = []; parts.forEach(function (p) { clean(p[0]).split(/(\s+)/).forEach(function (t) { if (t) toks.push([t, p[1]]); }); });
        var line = [], lw = 0, out = function () { var xa = xx; line.forEach(function (t) { if (!/^\s+$/.test(t[0])) T(t[0], xa, y, s, t[1]); xa += t[1].widthOfTextAtSize(t[0], s); }); y += lh; line = []; lw = 0; };
        toks.forEach(function (t) { var tw = t[1].widthOfTextAtSize(t[0], s); if (/^\s+$/.test(t[0]) && !line.length) return; if (lw + tw > w && line.length) { while (line.length && /^\s+$/.test(line[line.length - 1][0])) line.pop(); out(); if (/^\s+$/.test(t[0])) return; } line.push(t); lw += tw; });
        if (line.length) out(); return y;
      };
      var M = 70, W = Ww - 2 * M, y;
      T(x.cab, M, 78, 20, HB);
      var cd = 'Code doc : ' + x.code; T(cd, Ww - M - H.widthOfTextAtSize(clean(cd), 9), 72, 9, H); U(cd, Ww - M - H.widthOfTextAtSize(clean(cd), 9), 72, 9, H);
      var vd = sfExpDate(v); T(vd, Ww - M - HB.widthOfTextAtSize(clean(vd), 8.5), 108, 8.5, HB);
      var tw = HB.widthOfTextAtSize(D.title, 15); T(D.title, (Ww - tw) / 2, 140, 15, HB); U(D.title, (Ww - tw) / 2, 140, 15, HB);
      y = 152; var lw = 220, rh = 27;
      D.rows.forEach(function (r) { var val = sfVal(v, r[1]);
        pg.drawRectangle({ x: M - 10, y: Hh - y - rh, width: lw, height: rh, borderColor: k, borderWidth: 0.7 });
        pg.drawRectangle({ x: M - 10 + lw, y: Hh - y - rh, width: W + 20 - lw, height: rh, borderColor: k, borderWidth: 0.7 });
        T(r[0], M - 10 + (lw - H.widthOfTextAtSize(clean(r[0]), 10)) / 2, y + 17, 10, H); if (val) T(val, M - 10 + lw + 12, y + 17.5, 11, HB); y += rh; });
      y += 36;
      y = flow(D.p1(v).map(function (p) { return [p[0], p[1] ? B : R]; }), M, y, W, 11.5, 15) + 8;
      T(D.h2, M, y, 11.5); y += 22;
      D.bullets.forEach(function (b) { T('-', M + 18, y, 11.5); y = flow([[b, R]], M + 36, y, W - 36, 11.5, 15); }); y += 8;
      y = flow([[D.p3, R]], M, y, W, 11.5, 15) + 8;
      y = flow([[D.p4, R]], M, y, W, 11.5, 15) + 4;
      pg.drawRectangle({ x: M - 6, y: Hh - y - 44, width: W + 12, height: 44, borderColor: k, borderWidth: 0.8 });
      T(D.boxT, M, y + 17, 10, HB); U(D.boxT, M, y + 17, 10, HB); T(D.boxS, M, y + 36, 10, HB); U(D.boxS, M, y + 36, 10, HB); y += 76;
      var bw = (W + 12 - 20) / 2;                                          /* المربعات بحال النموذج 1 */
      T(D.sig1, M - 6, y, 8.6, H); U(D.sig1, M - 6, y, 8.6, H); T(D.sig2, M - 6 + bw + 20, y, 10.5, H);
      [0, 1].forEach(function (i) { pg.drawRectangle({ x: M - 6 + i * (bw + 20), y: Hh - y - 92, width: bw, height: 80, borderColor: k, borderWidth: 0.7 }); });
      doc.setTitle('Accord sur indemnisation forfaitaire'); doc.setCreator('RenewPro');
      return doc.save();
    });
  });
}
function sfDocxXmlExp(v) {
  var x = sfExp(), D = SF_EXP, TNR = function (t, o) { o = o || {}; return sfRun(t, o).replace(/w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/, 'w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"'); };
  var U = function (r) { return r.replace('<w:rPr>', '<w:rPr><w:u w:val="single"/>'); };
  var cell = function (w, inner) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' + inner + '</w:tc>'; };
  var body = sfPara(sfRun(x.cab, { b: true, sz: 20 }), { after: 0 })
    + sfPara(U(sfRun('Code doc : ' + x.code, { sz: 9 })), { jc: 'right', after: 160 })
    + sfPara(sfRun(sfExpDate(v), { b: true, sz: 8.5 }), { jc: 'right', after: 200 })
    + sfPara(U(sfRun(D.title, { b: true, sz: 15 })), { jc: 'center', after: 120 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>' + sfBorders(6) + '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3700"/><w:gridCol w:w="5938"/></w:tblGrid>'
    + D.rows.map(function (r) { return '<w:tr><w:trPr><w:trHeight w:val="520" w:hRule="atLeast"/></w:trPr>' + cell(3700, sfPara(sfRun(r[0], { sz: 10 }), { jc: 'center', after: 0 })) + cell(5938, sfPara(sfRun(sfVal(v, r[1]), { b: true, sz: 11 }), { after: 0 })) + '</w:tr>'; }).join('')
    + '</w:tbl>' + sfPara('', { after: 160 })
    + sfPara(D.p1(v).map(function (p) { return TNR(p[0], { b: !!p[1], sz: 11 }); }).join(''), { after: 160 })
    + sfPara(TNR(D.h2, { sz: 11 }), { after: 120 })
    + D.bullets.map(function (b) { return sfPara(TNR('-\t', { sz: 11 }) + TNR(b, { sz: 11 }), { ind: 720, hang: 360, after: 40 }); }).join('')
    + sfPara(TNR(D.p3, { sz: 11 }), { before: 120, after: 120 })
    + sfPara(TNR(D.p4, { sz: 11 }), { after: 80 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>' + sfBorders(6) + '</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr>'
      + cell(9638, sfPara(U(sfRun(D.boxT, { b: true })), { after: 60 }) + sfPara(U(sfRun(D.boxS, { b: true })), { after: 0 })) + '</w:tr></w:tbl>'
    + sfPara('', { after: 200 })
    + '<w:tbl><w:tblPr><w:tblW w:w="9070" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4335"/><w:gridCol w:w="400"/><w:gridCol w:w="4335"/></w:tblGrid>'
      + '<w:tr>' + cell(4335, sfPara(U(sfRun(D.sig1, { sz: 8.5 })), { after: 60 })) + cell(400, sfPara('', { after: 0 })) + cell(4335, sfPara(sfRun(D.sig2, { sz: 10.5 }), { after: 60 })) + '</w:tr>'
      + '<w:tr><w:trPr><w:trHeight w:val="1300" w:hRule="exact"/></w:trPr>'
        + ['a', 'gap', 'b'].map(function (c) { return c === 'gap' ? cell(400, sfPara('', { after: 0 })) : '<w:tc><w:tcPr><w:tcW w:w="4335" w:type="dxa"/><w:tcBorders>' + ['top', 'left', 'bottom', 'right'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="6" w:color="000000"/>'; }).join('') + '</w:tcBorders></w:tcPr>' + sfPara('', { after: 0 }) + '</w:tc>'; }).join('')
      + '</w:tr></w:tbl>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="1418" w:bottom="850" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
}

/* ══════════ 7.17.2 — اللوغو ديال النموذج 2 (كتحطو انت، كيتحفظ فهاد الجهاز) ══════════ */
function sfLogo() { try { return localStorage.getItem('rp7_sf_logo') || ''; } catch (e) { return ''; } }
function sfLogoSize(cb) { var lg = sfLogo(); if (!lg) return cb(null); var im = new Image(); im.onload = function () { cb({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function () { cb(null); }; im.src = lg; }
App.input('sf-logo', function (el) {
  var f = el.files && el.files[0]; el.value = ''; if (!f) return;
  if (!/^image\/(png|jpeg)$/.test(f.type)) { toast(L('اللوغو خاصو يكون PNG ولا JPG', 'Logo : PNG ou JPG'), 'err'); return; }
  if (f.size > 400000) { toast(L('اللوغو كبير بزاف (أقل من 400 KB)', 'Logo trop lourd (< 400 Ko)'), 'err'); return; }
  var rd = new FileReader(); rd.onload = function () { var im = new Image(); im.onload = function () { try { localStorage.setItem('rp7_sf_logo_r', String(im.naturalWidth / im.naturalHeight)); } catch (e) { } }; im.src = rd.result; try { localStorage.setItem('rp7_sf_logo', rd.result); } catch (e) { toast(L('ما قدرتش نحفظ اللوغو', 'Logo non enregistré'), 'err'); return; } sfLogoUI(); sfPreview(); }; rd.readAsDataURL(f);
});
App.act('sf-logo-del', function () { try { localStorage.removeItem('rp7_sf_logo'); localStorage.removeItem('rp7_sf_logo_r'); } catch (e) { } sfLogoUI(); sfPreview(); });
function sfLogoUI() { var b = $('sfx-logo'); if (b) b.innerHTML = sfLogoHTML(); }
function sfLogoHTML() {
  var lg = sfLogo();
  return (lg ? '<img src="' + lg + '" alt="logo"><button class="btn sm" data-act="sf-logo-del">✕ ' + L('حيد اللوغو', 'Retirer') + '</button>' : '<span class="muted">' + L('بلا لوغو (كيبان الاسم)', 'Sans logo (nom affiché)') + '</span>')
    + '<label class="btn sm">🖼️ ' + L(lg ? 'بدّل اللوغو' : 'زيد اللوغو', lg ? 'Changer' : 'Ajouter le logo') + '<input type="file" accept="image/png,image/jpeg" data-inp="sf-logo" hidden></label>';
}
/* اللوغو فالمعاينة والـ PDF والـ Word (بلاصة الاسم) */
(function () {
  var mh = sfModelHTML; sfModelHTML = function () { return mh().replace('<div class="sf-expf">', '<div class="sf-expf"><div class="sfx-logo" id="sfx-logo">' + sfLogoHTML() + '</div>'); };
  var pv = sfPreviewExp; sfPreviewExp = function () { pv(); var lg = sfLogo(), b = document.querySelector('#sf-prev .sfx-hd > b'); if (lg && b) b.outerHTML = '<img class="sfx-img" src="' + lg + '" alt="">'; };
  var pdf = sfPdfExp; sfPdfExp = function (v) {
    var lg = sfLogo(); if (!lg) return pdf(v);
    var x = sfExp(), cab = x.cab; x.cab = '';                                   /* الاسم كيتعوض باللوغو */
    var save = localStorage.getItem('rp7_sf_exp'); try { localStorage.setItem('rp7_sf_exp', JSON.stringify(x)); } catch (e) { }
    var restore = function () { try { if (save == null) localStorage.removeItem('rp7_sf_exp'); else localStorage.setItem('rp7_sf_exp', save); } catch (e) { } };
    return pdf(v).then(function (bytes) {
      restore(); var P = window.PDFLib;
      return P.PDFDocument.load(bytes).then(function (doc) {
        var bin = Uint8Array.from(atob(lg.split(',')[1]), function (c) { return c.charCodeAt(0); });
        return (/^data:image\/png/.test(lg) ? doc.embedPng(bin) : doc.embedJpg(bin)).then(function (img) {
          var pg = doc.getPage(0), w = 190, h = img.height * w / img.width; if (h > 80) { h = 80; w = img.width * h / img.height; }
          pg.drawImage(img, { x: 58, y: 841.92 - 40 - h, width: w, height: h });
          return doc.save();
        });
      });
    }, function (e) { restore(); throw e; });
  };
  var dx = sfDocxXmlExp; sfDocxXmlExp = function (v) {
    var xml = dx(v), lg = sfLogo(); if (!lg) return xml;
    var r = parseFloat(localStorage.getItem('rp7_sf_logo_r')) || 2.5, wpt = Math.min(190, 80 * r), cx = Math.round(wpt * 12700), cy = Math.round(wpt / r * 12700);
    var drawing = '<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="1" name="Logo"/>'
      + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + '<pic:nvPicPr><pic:cNvPr id="1" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
    var i = xml.indexOf('<w:body>') + 8, j = xml.indexOf('</w:p>', i) + 6;               /* الفقرة الأولى (الاسم) ← اللوغو */
    return xml.slice(0, i) + drawing + xml.slice(j);
  };
})();
