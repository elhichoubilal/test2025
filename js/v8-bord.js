/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v8-bord.js   (📥 7.17: البوردورو ← سجل الحاسبة)
   البوردورو ديال الشركة (Excel: POLICE · Nature Evenement · CLIENT · DATE_EFFET · PRIME_TOTAL …) = العمليات بالأرقام ديال الشركة.
   كل سطر كيتقارن مع السجل (الشهادة، ولا البوليصة + التاريخ، ولا الماتريكول + التاريخ — ماشي بالسمية):
     ✅ كاين ومطابق · ⚠️ كاين والثمن مختلف · ⏳ كاين ومازال «لم يدفع» · ❌ ما كاينش ← كيتزاد كـ «⏳ لم يدفع» (نفس الشكل ديال markUnpaid)
   والخلاص من بعد بـ 💰 فالسجل (بحال أي «لم يدفع»). بلا Collection جديدة وبلا خانات جديدة.
   «متابعة التجديدات» بالبوردورو باقية كيف كانت (اختيار ثاني فالنافذة).
══════════════════════════════════════════════════════════ */
'use strict';
var Bord8 = { rows: null, file: '', sel: {} };
(function () {
  var J = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  function col(row, names) {
    var keys = Object.keys(row), nk = keys.map(function (k) { return String(k).toUpperCase().replace(/[\s_]/g, ''); });
    for (var i = 0; i < names.length; i++) { var n = names[i].toUpperCase().replace(/[\s_]/g, ''), j = nk.indexOf(n); if (j >= 0 && row[keys[j]] !== '' && row[keys[j]] != null) return row[keys[j]]; }
    return '';
  }
  function numV(v) { if (typeof v === 'number') return v; var s = String(v || '').replace(/\s| /g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
  function dmy(v) {
    if (v instanceof Date && !isNaN(v)) return ('0' + v.getDate()).slice(-2) + '/' + ('0' + (v.getMonth() + 1)).slice(-2) + '/' + v.getFullYear();
    var m = String(v || '').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); return m ? ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3] : '';
  }
  function iso(d) { var m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function nPol(p) { var m = String(p || '').replace(/\s/g, '').match(/^(\d{1,3})\/0*(\d+)$/); return m ? m[1] + '/' + m[2] : String(p || '').replace(/\s/g, '').toUpperCase(); }
  function nAtt(a) { return String(a || '').replace(/\D/g, '').replace(/^0+/, ''); }
  function nPlate(p) { return String(p || '').toUpperCase().replace(/[\s\-_.]/g, ''); }
  function dayN(d) { var x = ce7Date(d); return x ? Math.round(x.getTime() / 864e5) : null; }

  /* القراية */
  function parse(buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
    var json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    return json.map(function (r, i) {
      var police = String(col(r, ['POLICE'])).trim();
      if (!/^\d{1,3}\s*\/\s*\d+$/.test(police) && !/^C[A-Z]?\d{4}\/\d+$/i.test(police)) return null;   /* سطور المجموع وغيرها */
      var attD = String(col(r, ['NUMEROATTESTATION'])).trim(), attP = String(col(r, ['NUMEROATTESTATION_PROVISOIRE'])).trim();
      return { i: i, police: police.replace(/\s/g, ''), nature: String(col(r, ['Nature Evenement', 'NATURE'])).trim(), client: String(col(r, ['CLIENT'])).trim(),
        ds: dmy(col(r, ['DATE_EFFET'])), de: dmy(col(r, ['DATE_ECHEANCE'])), emis: dmy(col(r, ['DATE_EMISSION'])),
        prime: numV(col(r, ['PRIME_TOTAL', 'PRIME TOTALE'])), net: numV(col(r, ['NET_A_PAYE'])), attest: attD || attP, plate: String(col(r, ['IMMATDEF', 'IMMAPRO', 'MATRICULE'])).trim(),
        marque: String(col(r, ['MARQUE'])).trim(), phone: String(col(r, ['TELEPHONE'])).trim(), quit: String(col(r, ['NUM_QUITTANCE'])).trim() };
    }).filter(Boolean);
  }
  /* المقارنة مع السجل (ماشي بالسمية) */
  function match(r, H) {
    var a = nAtt(r.attest), p = nPol(r.police), pl = nPlate(r.plate), e = dayN(r.emis), ds = iso(r.ds);
    var near = function (h, k) { var d = dayN(h.date); return e != null && d != null && Math.abs(d - e) <= k; };
    var c = null;
    if (a.length >= 6) c = H.filter(function (h) { return nAtt(h.attest) === a; })[0];
    if (!c) c = H.filter(function (h) { return nPol(h.police) === p && (h.ds === ds || near(h, 10)); })[0];
    if (!c && pl.length >= 5) c = H.filter(function (h) { return nPlate(h.plate) === pl && (h.ds === ds || near(h, 3)); })[0];
    return c || null;
  }
  function status(r, h) {
    if (!h) return 'miss';
    if (h.unpaid) return 'unp';
    return Math.abs(ce7Num(h.off) - r.prime) >= 1 ? 'diff' : 'ok';
  }
  function analyse() {
    var H = J('eurv102_h', []);
    Bord8.rows.forEach(function (r) { r.h = match(r, H); r.st = status(r, r.h); });
  }

  /* النافذة */
  var ST = { ok: ['✅', 'مطابق', 'Conforme'], diff: ['⚠️', 'الثمن مختلف', 'Prix différent'], unp: ['⏳', 'لم يدفع', 'Non payé'], miss: ['❌', 'ما كاينش فالسجل', 'Absent de l\'historique'] };
  function html() {
    var R = Bord8.rows, by = function (s) { return R.filter(function (r) { return r.st === s; }); }, miss = by('miss'), sel = miss.filter(function (r) { return Bord8.sel[r.i]; });
    var tot = R.reduce(function (s, r) { return s + r.prime; }, 0), days = []; R.forEach(function (r) { if (r.emis && days.indexOf(r.emis) < 0) days.push(r.emis); });
    var row = function (r) {
      var s = ST[r.st], h = r.h;
      return '<tr class="b8-' + r.st + '">'
        + '<td>' + (r.st === 'miss' ? '<input type="checkbox" data-inp="b8-sel" data-i="' + r.i + '"' + (Bord8.sel[r.i] ? ' checked' : '') + '>' : '') + '</td>'
        + '<td><span class="b8-st">' + s[0] + ' ' + L(s[1], s[2]) + '</span>' + (h ? '<small class="ltr">' + esc(h.num) + '</small>' : '') + '</td>'
        + '<td><b>' + esc(r.client) + '</b><small>' + esc(r.nature) + '</small></td>'
        + '<td class="ltr">' + esc(r.police) + '<small>' + esc(r.plate || '—') + '</small></td>'
        + '<td class="ltr">' + esc(r.ds) + '<small>→ ' + esc(r.de) + '</small></td>'
        + '<td class="ltr num"><b>' + money(r.prime) + '</b>' + (r.st === 'diff' ? '<small class="red-t">' + L('فالسجل: ', 'Hist. : ') + money(ce7Num(h.off)) + '</small>' : '') + '</td></tr>';
    };
    return Modal.head('📥 ' + L('البوردورو ← سجل الحاسبة', 'Bordereau → historique'))
      + '<div class="b8">'
      + '<div class="b8-file">📎 <span class="ltr">' + esc(Bord8.file) + '</span> · ' + R.length + ' ' + L('عملية', 'opérations') + ' · ' + moneyH(tot, 1) + (days.length ? ' · <span class="ltr">' + esc(days.join(', ')) + '</span>' : '') + '</div>'
      + '<div class="b8-sum">' + ['ok', 'diff', 'unp', 'miss'].map(function (k) { return '<span class="b8-k b8-' + k + '">' + ST[k][0] + ' ' + L(ST[k][1], ST[k][2]) + ' <b>' + by(k).length + '</b></span>'; }).join('') + '</div>'
      + '<div class="tbl-wrap b8-tw"><table class="tbl b8-tbl"><thead><tr><th>' + (miss.length ? '<input type="checkbox" data-inp="b8-all"' + (sel.length === miss.length ? ' checked' : '') + ' title="' + L('الكل', 'Tout') + '">' : '') + '</th><th>' + L('الحالة', 'État') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('البوليصة', 'Police') + '</th><th>' + L('المدة', 'Période') + '</th><th>Prime totale</th></tr></thead><tbody>'
      + ['miss', 'diff', 'unp', 'ok'].map(function (k) { return by(k).map(row).join(''); }).join('') + '</tbody></table></div>'
      + (miss.length ? '<div class="hint">' + L('العمليات اللي ما كايناش كيتزادو للسجل كـ «⏳ لم يدفع» بالثمن ديال الشركة، والخلاص من بعد بـ 💰 فالسجل.', 'Les opérations absentes sont ajoutées comme « ⏳ Non payé » au prix de la compagnie ; l\'encaissement se fait ensuite avec 💰 dans l\'historique.') + '</div>' : '<div class="box ok-t">✅ ' + L('كاع العمليات كاينين فالسجل.', 'Toutes les opérations sont dans l\'historique.') + '</div>')
      + '<div class="b8-acts">' + (miss.length ? '<button class="btn pri" data-act="b8-add"' + (sel.length ? '' : ' disabled') + '>➕ ' + L('زيد ', 'Ajouter ') + sel.length + L(' للسجل', ' à l\'historique') + '</button>' : '')
      + '<button class="btn" data-act="b8-close">✕ ' + L('سدّ', 'Fermer') + '</button></div></div>';
  }
  function show() { Modal.open(html(), 'b8m'); }
  App.input('b8-sel', function (el) { Bord8.sel[+el.dataset.i] = el.checked; show(); });
  App.input('b8-all', function (el) { Bord8.rows.forEach(function (r) { if (r.st === 'miss') Bord8.sel[r.i] = el.checked; }); show(); });
  App.act('b8-close', function () { Bord8.rows = null; Modal.close(); });

  /* الزيادة: نفس الشكل ديال markUnpaid */
  App.act('b8-add', function () {
    var w = ce7(); if (!w) { toast(L('الحاسبة ما تحلاتش، عاود', 'Calculatrice non prête'), 'err'); return; }
    analyse();                                                      /* عاود قارن (يمكن تبدّل السجل) */
    var add = Bord8.rows.filter(function (r) { return r.st === 'miss' && Bord8.sel[r.i]; }); if (!add.length) { show(); return; }
    var c = w.CUR || {}, now = new Date(), t = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    var H = J('eurv102_h', []), made = [];
    add.forEach(function (r) {
      var h = { num: Store8.nextNum(), date: r.emis || ce7DMY(now), time: t, user: c.n || (App.user && App.user.name) || '', av: c.av || '', client: r.client, plate: r.plate, police: r.police, attest: r.attest, usage: 'Personnel', tarif: 'wafa',
        ins: r.nature + (r.marque ? ' · ' + r.marque : ''), location: '', ds: iso(r.ds), de: iso(r.de), paid: 0, off: r.prime, diff: -r.prime, payMode: 'unpaid', payRef: '', unpaid: true };
      H.unshift(h); made.push(h);
    });
    Store8.save('history', H);
    made.forEach(function (h) { try { Ops.saveClient(h.client, h.plate, h.ins, h.de); } catch (e) { } try { if (typeof calcApplyOp === 'function') calcApplyOp(Ops.toOp(h, Date.now()), true); } catch (e) { console.error(e); } });
    if (w.HIST !== undefined) w.HIST = H;
    try { if (typeof w.rhSweep === 'function') w.rhSweep(); } catch (e) { }
    toast('✅ ' + made.length + L(' عملية تزادت للسجل (⏳ لم يدفع)', ' opération(s) ajoutée(s) (⏳ non payé)'));
    Bord8.sel = {}; analyse(); show();
  });

  Bord8.open = function (file) {
    file.arrayBuffer().then(function (buf) {
      var R = []; try { R = parse(buf); } catch (e) { console.error(e); }
      if (!R.length) { toast(L('ما لقيتش عمليات فهاد البوردورو', 'Aucune opération dans ce bordereau'), 'err'); return; }
      Bord8.rows = R; Bord8.file = file.name; Bord8.sel = {}; analyse();
      R.forEach(function (r) { if (r.st === 'miss' && r.prime) Bord8.sel[r.i] = true; });   /* Prime 0 ما كتتزادش بوحدها */
      show();
    });
  };
  Bord8._t = { parse: parse, match: match, nPol: nPol, nAtt: nAtt };

  /* البوردورو: فين؟ (السجل جديد، والمتابعة بحال قبل) */
  if (typeof xl7ToBord === 'function') {
    var toTracker = xl7ToBord;
    xl7ToBord = function (file) {
      Bord8.pendingFile = file;
      Modal.open(Modal.head('📊 ' + esc(file.name))
        + '<div class="box">' + L('هادا بوردورو ديال الشركة. شنو نديرو بيه؟', 'Bordereau de la compagnie. Que faire ?') + '</div>'
        + '<div class="menu">'
        + (pdf7Can('calc') ? '<button class="menu-i" data-act="b8-go" data-k="hist">📥 ' + L('العمليات ← سجل الحاسبة (مقارنة + زيادة اللي ناقص)', 'Opérations → historique (comparer + ajouter)') + '</button>' : '')
        + '<button class="menu-i" data-act="b8-go" data-k="track">🔁 ' + L('متابعة التجديدات (بحال قبل)', 'Suivi des renouvellements (comme avant)') + '</button>'
        + '</div>', 'small');
    };
    App.act('b8-go', function (el) { var f = Bord8.pendingFile; Bord8.pendingFile = null; Modal.close(); if (!f) return; if (el.dataset.k === 'hist') Bord8.open(f); else toTracker(f); });
  }
})();
