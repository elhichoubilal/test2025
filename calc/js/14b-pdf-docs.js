/* ═══ EUR assurance — 14b-pdf-docs.js (7.17) ═══
   تحليل الوثائق اللي ما كانتش كتتقرا مزيان:
     • شهادة CAT (طاكسي، تريبورتور…)  : البوليصة C2011/… ، الماتريكول 04642-A -41 ، السعر = آخر رقم فسطر الأثمنة (ماشي العام)
     • Carte frontière CAT              : البوليصة CF2026/… ، الأيام (10 j) ، الماتريكول الأجنبي
     • Avenant de résiliation (Wafa)    : Ristourne بالسالب (-508,35) ، البوليصة «8 / 0200955994» ، الشهادة المرجوعة
   ما كناخدو حتى رقم من التحت ديال الورقة (capital، RC، IF، الهاتف…).
   النتيجة كتمشي فنفس الخانات ديال الفورم، والوصف (ins) كيتعطى للحفظ فـ PDF_DOC (بلا خانة جديدة). */
var PDF_DOC = null;
var PDF_KW_TYPES = ['GRAND TAXI', 'PETIT TAXI', 'TAXI', 'TRIPORTEUR', 'CAMIONS', 'CAMION', 'CYCLOMOTEUR', 'MOTOCYCLE', 'MOTO', 'AUTOCAR', 'AUTOBUS', 'TRACTEUR', 'REMORQUE', 'TOURISME', 'VOITURE'];
function pdfNum(s) { var n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; }
function pdfIso(dmy) { var m = String(dmy || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
function pdfPlateMa(s) { var m = String(s).match(/^\s*(\d{1,6})\s*-\s*([A-Z؀-ۿ]{1,2})\s*-\s*(\d{1,2})\s*$/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
function pdfDays(ds, de) { if (!ds || !de) return 0; var a = new Date(ds), b = new Date(de); return isNaN(a) || isNaN(b) ? 0 : Math.round((b - a) / 864e5); }
function pdfDurLbl(days, inclusive) {
  var d = inclusive ? days + 1 : days;
  if (d >= 363 && d <= 367) return '1an'; if (d >= 179 && d <= 185) return '6mois'; if (d >= 88 && d <= 93) return '3mois'; if (d >= 27 && d <= 32) return '1mois';
  return d > 0 ? d + 'j' : '';
}
/* الاسم: كيتكرر فالشهادة (2 ولا 3 مرات)، حروف كبار بلا أرقام */
function pdfRepeatedName(items) {
  var cnt = {}, top = {};
  items.forEach(function (i) {
    var t = String(i.str).replace(/\s+/g, ' ').trim();
    if (!/^[A-ZÀ-Ÿ'.\- ]+$/.test(t) || /\d/.test(t)) return;
    var w = t.split(' ').filter(Boolean); if (w.length < 2 || w.length > 7) return;
    if (PDF_KW_TYPES.indexOf(t) >= 0 || /ASSURANCE|CHAUFFEUR|R[ÉE]DUCTION|TOP MOTO|C\.I/.test(t)) return;
    cnt[t] = (cnt[t] || 0) + 1; top[t] = Math.max(top[t] || -1e9, i.y);
  });
  var best = Object.keys(cnt).filter(function (k) { return cnt[k] >= 2; }).sort(function (a, b) { return (cnt[b] - cnt[a]) || (top[b] - top[a]); });
  return best[0] || '';
}
/* السطر ديال الأثمنة: آخر سطر فيه 3 أرقام بالفاصلة ولا كثر ← آخر رقم بالفاصلة هو المبلغ */
function pdfPriceLine(lines) {
  var best = null;
  lines.forEach(function (l) {
    if (/capital|RC\s*:|IF\s*:|T[èe]l|Fax|ICE/i.test(l.text)) return;
    var c = l.text.split(' ').filter(function (t) { return /^-?\d[\d.]*,\d{1,2}$/.test(t); });
    if (c.length >= 3) best = c;
  });
  return best ? pdfNum(best[best.length - 1]) : null;
}

function pdfRefine(items, lines, f) {
  PDF_DOC = null; f = f || {};
  var full = lines.map(function (l) { return l.text; }).join('\n');
  var footer = /capital|Attijariwafa|RC\s*:\s*\d|IF\s*:/i;
  var footNums = lines.filter(function (l) { return footer.test(l.text); }).map(function (l) { return l.text; }).join(' ');

  /* ── Avenant (Wafa) ── */
  if (/AVENANT/i.test(full) && /Police\s*N[°o]/i.test(full)) {
    var mp = full.match(/Police\s*N[°o]\s*:?\s*(\d{1,2})\s*\/\s*(\d{6,})/i); if (mp) f.police = mp[1] + '/' + mp[2];
    var ma = full.match(/Attestation\s+restitu[ée]e\s+N[°o]\s*:?\s*(\d{5,})/i); if (ma) f.attest = ma[1];
    var mc = full.match(/Assur[ée]\s*:\s*([A-ZÀ-Ÿ'.\- ]{3,60})/); if (mc) f.client = mc[1].trim();
    var mm = full.match(/Matricule\s*:\s*(\d{1,6}\s*-\s*[A-Z؀-ۿ]{1,2}\s*-\s*\d{1,2})/); if (mm) f.plate = pdfPlateMa(mm[1]);
    var mper = full.match(/P[ée]riode\s*:?\s*Du\s*(\d{2}\/\d{2}\/\d{4})\s*Au\s*(\d{2}\/\d{2}\/\d{4})/i); if (mper) { f.ds = pdfIso(mper[1]); f.de = pdfIso(mper[2]); }
    var res = /AVENANT\s+DE\s+R[ÉE]SILIATION/i.test(full);
    var amt = null, mr = full.match(/ristourn[ée]\s+[àa]\s+l.assur[ée]\s+la\s+somme\s+de\s+(-?\s*[\d\s.]*\d,\d{1,2})/i);
    if (mr) { amt = pdfNum(mr[1]); if (amt > 0) amt = -amt; }
    if (amt == null) {                                       /* «Total Quittance»: الرقم بوحدو فسطر من بعد الجدول */
      var after = false; lines.forEach(function (l) { if (/Total\s+Quittance/i.test(l.text)) after = true; else if (after && amt == null && /^-?\d[\d\s.]*,\d{2}$/.test(l.text.trim()) && !footer.test(l.text)) amt = pdfNum(l.text); });
    }
    f.price = amt;
    var kindLbl = res ? 'Avenant de résiliation' : 'Avenant';
    PDF_DOC = { kind: res ? 'wafa-res' : 'wafa-av', cie: 'Wafa', label: kindLbl + (amt < 0 ? ' · Ristourne' : ''), desc: kindLbl + (amt != null ? ' (' + (amt < 0 ? 'Ristourne' : 'Avenant') + ')' : ''), price: amt };
    return f;
  }

  /* ── CAT: البوليصة C2011/… ولا CF2026/… ── */
  var pol = full.match(/\b(C[A-Z]?\d{4}\/\d{4,8})\b/);
  if (pol && (/EUR-?ASSURANCE/i.test(full) || /R\.Covid|r[ée]duction\s+saharienne/i.test(full))) {
    var isCF = /^CF/.test(pol[1]);
    f.police = pol[1];
    var line = lines.filter(function (l) { return l.text.indexOf(pol[1]) >= 0; })[0];
    if (line) { var a = line.text.split(' ').filter(function (t) { return /^\d{7,10}$/.test(t); })[0]; if (a) f.attest = a; }
    var dts = []; (full.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []).forEach(function (d) { if (dts.indexOf(d) < 0) dts.push(d); });
    if (dts[0]) f.ds = pdfIso(dts[0]); if (dts[1]) f.de = pdfIso(dts[1]);
    var nm = pdfRepeatedName(items); if (nm) f.client = nm;
    var pl = ''; items.some(function (i) { pl = pdfPlateMa(i.str); return !!pl; });
    if (!pl) { var fp = items.map(function (i) { return String(i.str).trim(); }).filter(function (t) { return /^[A-Z]{1,2}\d{3,5}[A-Z]{2,3}$/.test(t); });
      pl = fp.filter(function (t) { return !/^R\d/.test(t); })[0] || fp[0] || ''; }   /* R… = المقطورة (remorque) */
    if (pl) f.plate = pl;
    var price = pdfPriceLine(lines); if (price != null && price > 0) f.price = price;
    var vt = ''; PDF_KW_TYPES.some(function (k) { if (new RegExp('(^|\\n|\\s)' + k + '(\\s|$)').test(full)) { vt = k; return true; } return false; });
    var days = pdfDays(f.ds, f.de), dur = isCF ? (days > 0 ? days + 'j' : '') : pdfDurLbl(days, true);
    var kindLbl2 = isCF ? 'Carte frontière' : 'Attestation';
    PDF_DOC = { kind: isCF ? 'cat-cf' : 'cat-att', cie: 'CAT', label: kindLbl2 + (vt ? ' · ' + vt : '') + (dur ? ' · ' + dur : ''),
      desc: 'CAT ' + (isCF ? 'CF ' : '') + (vt ? vt.charAt(0) + vt.slice(1).toLowerCase() + ' ' : '') + dur, price: f.price, days: days, vtype: vt };
    PDF_DOC.desc = PDF_DOC.desc.replace(/\s+/g, ' ').trim();
    return f;
  }

  /* ── الباقي (Wafa بحال قبل) ── */
  /* 7.17: Wafa — النوع (Prorogation…)، Puissance، Energie، Usage ← الوصف كيكون صحيح (الثمن ديما من الوثيقة) */
  var mn = full.match(/Conditions\s+Particuli[èe]res\s*:\s*([A-Za-zÀ-ÿ]+(?:\s+[a-zà-ÿ]+){0,2})/), mcv = full.match(/Puissance\s*:\s*(\d{1,2})\b/),
      mf = full.match(/Energie\s*:\s*(Diesel|Gasoil|Essence|Hybride|[ÉE]lectrique)/i), mu = full.match(/Usage\s*:\s*([A-Za-zÀ-ÿ]+)/);
  if (mn || mcv) {
    var mde = full.match(/Date\s+d.effet\s*:\s*(\d{2}\/\d{2}\/\d{4})/i), mex = full.match(/Expiration\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (mde) f.ds = pdfIso(mde[1]); if (mex) f.de = pdfIso(mex[1]);                 /* ماشي «du 11 septembre 2014» ديال النص القانوني */
    var mat = full.match(/\bAttestation\s*:\s*(\d{6,})/); if (mat && !f.attest) f.attest = mat[1];
    if (mcv) f.cv = +mcv[1]; if (mf) f.fuel = /essence/i.test(mf[1]) ? 'e' : /diesel|gasoil/i.test(mf[1]) ? 'd' : ''; if (mu) f.usage = mu[1];
    /* الشكل الجديد: الوصف من الوثيقة (Puissance · Energie · المدة) — الحاسبة ما كتتبدلش (الـ CV والوقود فيها يدويين) */
    var wd = { '1mois': '1M', '3mois': '3M', '6mois': '6M', '1an': '1an' }[pdfDurLbl(pdfDays(f.ds, f.de), true)] || '';
    var wdesc = f.cv && f.fuel && wd ? f.cv + 'CV ' + (f.fuel === 'e' ? 'Ess' : 'Die') + ' ' + wd : null;
    /* التفصيل ديال الكيتانص (للفاتورة): Garantie + 7 أرقام (nette, taxes, acc cie, acc int, timbre, CNPAC, TTC) — غير إلا المجموع مضبوط */
    var flines = [];
    lines.forEach(function (l) {
      var tk = l.text.split(' '), nums = [];
      while (tk.length && /^-?\d+,\d{2}$/.test(tk[tk.length - 1])) nums.unshift(pdfNum(tk.pop()));
      var lbl = tk.join(' ').trim();
      if (nums.length !== 7 || !/^[A-Za-zÀ-ÿ'’ ]{3,60}$/.test(lbl)) return;
      var sum = nums[0] + nums[1] + nums[2] + nums[3] + nums[4] + nums[5];
      if (Math.abs(sum - nums[6]) > 0.02 || !nums[6]) return;
      flines.push({ d: lbl, net: nums[0], tax: Math.round((nums[6] - nums[0]) * 100) / 100, tot: nums[6] });   /* taxes + accessoires + timbre + CNPAC */
    });
    var mev = full.match(/prime\s+EVCAT\s+soit\s+(\d[\d\s]*,\d{2})/i); if (flines.length && mev && !flines.some(function (x) { return Math.abs(x.tot - pdfNum(mev[1])) < 0.01; })) flines.push({ d: 'Prime EVCAT (TTC)', net: null, tax: null, tot: pdfNum(mev[1]) });
    if (flines.length && f.price != null && Math.abs(flines.reduce(function (s, x) { return s + x.tot; }, 0) - f.price) > 0.05) flines = [];   /* ما كيتطابقش مع Net à régler ← بلا تفصيل */
    var mmq = full.match(/Marque\s*:\s*([A-Z0-9-]{2,}(?:\s[A-Z0-9-]{2,}(?=\s|$))?)/);
    PDF_DOC = { kind: 'wafa', cie: 'Wafa', label: (mn ? mn[1].trim() : 'Attestation') + (wdesc ? ' · ' + wdesc : ''), desc: wdesc, price: f.price != null ? f.price : null, lines: flines, marque: mmq ? mmq[1] : '' };
  }
  if (f.police) { var pw = String(f.police).match(/^(\d{1,2})\s*\/\s*(\d{6,})/); if (pw) f.police = pw[1] + '/' + pw[2]; }   /* «8/0172675290 VEHICULE…» ← 8/0172675290 */
  /* ما كناخدوش ثمن جا من التحت ديال الورقة */
  if (f.price != null && footNums) {
    var ps = String(f.price).replace('.', ','), pi = String(Math.round(f.price));
    if (footNums.indexOf(ps) >= 0 || new RegExp('\\b0*' + pi + '\\b').test(footNums)) delete f.price;
  }
  return f;
}

