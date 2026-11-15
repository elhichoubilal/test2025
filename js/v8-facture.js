/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v8-facture.js   (📑 7.17: الفاتورة)
   كتحل معمرة من العملية (+ التفصيل ديال الكيتانص إلا تقرا الـ PDF ديال Wafa فهاد الجلسة) + معلومات الوكالة.
   كلشي قابل للتعديل (كتضغط على النص)، ➕ سطر، ✕ سطر، المجموع والمبلغ بالحروف كيتحسبو بوحدهم ← 🖨️ Imprimer / PDF.
   الرقم: FA-YYYY-0001… عداد بحال رقم الوصل (eurv102_fac ↔ calc/counters/facture)، كيتاخد غير ملي كتطبع.
   RC / IF / Patente (التحت ديال الورقة) كيتفكرهم البرنامج فهاد الجهاز. ما كيتحفظ والو فالعملية (بلا خانة جديدة).
══════════════════════════════════════════════════════════ */
'use strict';
var Fac8 = (function () {
  var fr = null, mem = {}, KEY = 'eurv102_fac', FOOT = 'rp7_fac_foot', LIST_KEY = 'eurv102_fac_list', curH = null, qStr = '';
  var J = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function fmt(v) { return (Math.round((+v || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dmy(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
  function cur() { var n = parseInt(localStorage.getItem(KEY) || '0', 10); return isNaN(n) ? 0 : n; }
  function label(n) { return 'FA-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0'); }
  function peek() { return label(cur() + 1); }
  function take() { var n = cur() + 1; try { localStorage.setItem(KEY, String(n)); } catch (e) { } try { Store8.pushCounter(KEY, 'facture'); } catch (e) { } return label(n); }
  var PM = { cash: 'Espèces', especes: 'Espèces', cheque: 'Chèque', chq: 'Chèque', tpe: 'TPE', cb: 'TPE', virement: 'Virement', vir: 'Virement', unpaid: '' };

  function getList() { var l = J(LIST_KEY, []); return Array.isArray(l) ? l : []; }
  function saveList(l) {
    if (typeof Store8 !== 'undefined' && Store8.save) Store8.save('factures', l);
    else try { localStorage.setItem(LIST_KEY, JSON.stringify(l)); } catch (e) { }
  }
  function saveDoc(doc) {
    if (!doc || !doc.facNum) return;
    var list = getList(), id = doc.id || doc.facNum;
    doc.id = id;
    doc.updatedAt = new Date().toISOString();
    doc.by = (typeof App !== 'undefined' && App.user && App.user.name) || '';
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if ((list[i].id || list[i].facNum) === id) { idx = i; break; } }
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], doc);
    else list.unshift(doc);
    saveList(list);
    if (typeof toast === 'function') toast('💾 ' + L('حُفظت الفاتورة في الأرشيف: ', 'Facture archivée : ') + doc.facNum);
  }

  function lineRow(d, net, tax, tot) {
    var c = function (v) { return v == null || v === '' ? '—' : typeof v === 'string' && isNaN(parseFloat(v)) ? v : fmt(v); };
    return '<tr><td contenteditable="true">' + E(d) + '</td><td class="n" contenteditable="true">' + E(c(net)) + '</td><td class="n" contenteditable="true">' + E(c(tax)) + '</td><td class="n" contenteditable="true">' + E(c(tot)) + '</td><td class="nx"><button class="x" onclick="this.closest(\'tr\').remove();calc()">✕</button></td></tr>';
  }
  function html(h) {
    var ci = J('eurv102_ci', {}) || {}, d = mem[h.num] || {}, today = h._facDate || new Date().toLocaleDateString('fr-FR');
    var initNum = h._facNum || peek(), isSaved = !!h._facNum;
    var lines = (h._facLines && h._facLines.length) ? h._facLines.map(function (x) { return lineRow(x.d, x.net, x.tax, x.tot); }).join('')
      : (d.lines && d.lines.length) ? d.lines.map(function (x) { return lineRow(x.d, x.net, x.tax, x.tot); }).join('')
      : lineRow('Assurance automobile' + (h.ins ? ' · ' + String(h.ins).replace(/^⚡\s*(\[(CAT|Wafa)\]\s*)?/i, '') : ''), null, null, +h.off || 0);
    var agAddr = [ci.addr, ci.addr2, ci.city].filter(Boolean).join(' · ');
    var foot = h._facFoot || localStorage.getItem(FOOT) || [ci.name || 'AGENCE', 'ICE ' + (ci.ice || '—'), 'RC —', 'IF —', 'Patente —'].join(' · ');
    var pay = h._facPay != null ? h._facPay : (h.unpaid ? '' : [PM[String(h.payMode || '').toLowerCase()] != null ? PM[String(h.payMode).toLowerCase()] : (h.payMode || ''), h.paidDate || h.date].filter(Boolean).join(' · '));
    var veh = [h.plate, d.marque || h.marque].filter(Boolean).join(' · ');
    var cliHtml = h._facCliHtml || ('<b>' + E(h.client || '') + '</b><br>ICE : <br>Adresse : ');
    var ctrHtml = h._facCtrHtml || ((h.police ? 'Police : ' + E(h.police) + '<br>' : '') + (veh ? 'Véhicule : ' + E(veh) + '<br>' : '') + (h.ds || h.de ? 'Période : ' + E(dmy(h.ds)) + ' → ' + E(dmy(h.de)) : ''));
    return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facture</title><style>'
      + '*{box-sizing:border-box}body{margin:0;background:#E9EDF1;font-family:"IBM Plex Sans","DejaVu Sans",Arial,sans-serif;color:#111;padding:16px}'
      + '.bar{max-width:794px;margin:0 auto 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bar button{border:1px solid #CBD5D3;background:#fff;border-radius:9px;padding:9px 14px;font:600 14px Arial;cursor:pointer}.bar .pri{background:#0F766E;color:#fff;border-color:#0F766E}.bar .cl{margin-inline-start:auto}.bar span{font:13px Arial;color:#555}'
      + '.p{max-width:794px;min-height:1050px;background:#fff;margin:0 auto;padding:46px 52px 90px;box-shadow:0 4px 18px rgba(0,0,0,.12);position:relative}'
      + '.hd{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:3px solid #0F766E;padding-bottom:14px}.ag b{font-size:20px;color:#0F766E}.ag div{font-size:12px;color:#444;line-height:1.6}'
      + '.ti{text-align:right;flex:none}.ti h1{margin:0;font-size:26px;letter-spacing:1px}.ti div{font-size:13px;margin-top:4px}'
      + '.two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:22px 0}.bx{border:1px solid #CBD5D3;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7}.bx h3{margin:0 0 6px;font-size:12px;color:#0F766E;text-transform:uppercase;letter-spacing:.5px}'
      + 'table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0F766E;color:#fff;text-align:left;padding:8px;font-weight:600}td{border-bottom:1px solid #E1E8E6;padding:8px}td.n,th.n{text-align:right;white-space:nowrap}td.nx{width:26px;padding:0}'
      + '.tot{width:320px;max-width:100%;margin:16px 0 0 auto;font-size:14px}.tot div{display:flex;justify-content:space-between;padding:8px 12px;background:#0F766E;color:#fff;font-weight:700;border-radius:6px;font-size:16px}'
      + '.let{margin-top:16px;font-size:12.5px;font-style:italic;color:#333}.pay{margin-top:14px;font-size:13px}.sig{display:flex;justify-content:flex-end;margin-top:40px}.sig div{width:240px;height:90px;border:1px dashed #9AA;border-radius:8px;text-align:center;padding-top:8px;font-size:12px;color:#555}'
      + '.ft{position:absolute;bottom:26px;left:52px;right:52px;border-top:1px solid #CBD5D3;padding-top:8px;font-size:10.5px;color:#666;text-align:center;line-height:1.6}'
      + '[contenteditable]{outline:none;border-radius:3px}[contenteditable]:hover{background:#FFF7E0}[contenteditable]:focus{background:#FFF3C4;box-shadow:0 0 0 2px #FBBF24}'
      + '.x{border:0;background:none;color:#B91C1C;cursor:pointer;font-size:14px;visibility:hidden}tr:hover .x{visibility:visible}'
      + '.tw{overflow-x:auto}@media (max-width:700px){table{font-size:12px}th,td{padding:6px 5px}body{padding:8px}.p{padding:22px 16px 90px;min-height:0}.two{grid-template-columns:1fr}.hd{flex-direction:column}.ti{text-align:left}.ft{left:16px;right:16px}.x{visibility:visible}}'
      + '@page{size:A4;margin:10mm}@media print{.bar,.x{display:none!important}body{background:#fff;padding:0}.p{box-shadow:none;max-width:none;min-height:270mm;padding:0 0 70px}.ft{left:0;right:0;bottom:0}[contenteditable]{background:none!important;box-shadow:none!important}}'
      + '</style></head><body>'
      + '<div class="bar"><button class="pri" onclick="go()">🖨️ Imprimer / PDF</button><button onclick="saveOnly()">💾 Enregistrer</button><button onclick="addRow()">➕ Ligne</button><button onclick="parent.Fac8.hide();parent.Fac8.listModal()">🗂️ Archives (' + getList().length + ')</button><span>Cliquez sur un texte pour le modifier.</span><button class="cl" onclick="parent.Fac8.hide()">✕ Fermer</button></div>'
      + '<div class="p">'
      + '<div class="hd"><div class="ag" contenteditable="true"><b>' + E(ci.name || 'AGENCE') + '</b><div>Agent / Intermédiaire d\'assurance' + (agAddr ? '<br>' + E(agAddr) : '') + '<br>' + [ci.phone ? 'Tél : ' + E(ci.phone) : '', ci.ice ? 'ICE : ' + E(ci.ice) : ''].filter(Boolean).join(' · ') + '</div></div>'
      + '<div class="ti"><h1>FACTURE</h1><div>N° <b id="num" contenteditable="true">' + E(initNum) + '</b></div><div>Date : <span id="fdate" contenteditable="true">' + E(today) + '</span></div></div></div>'
      + '<div class="two"><div class="bx"><h3>Client</h3><div id="fcli" contenteditable="true">' + cliHtml + '</div></div>'
      + '<div class="bx"><h3>Contrat</h3><div id="fctr" contenteditable="true">' + ctrHtml + '</div></div></div>'
      + '<div class="tw"><table id="t"><thead><tr><th>Désignation</th><th class="n">Prime nette</th><th class="n">Taxes et frais</th><th class="n">Total</th><th></th></tr></thead><tbody>' + lines + '</tbody></table></div>'
      + '<div class="tot"><div><span>Net à payer</span><span id="net">0,00 DH</span></div></div>'
      + '<div class="let" contenteditable="true">Arrêtée la présente facture à la somme de : <span id="lettres"></span>.</div>'
      + (pay ? '<div class="pay" id="fpay" contenteditable="true">Règlement : ' + E(pay) + '</div>' : '<div class="pay" id="fpay" contenteditable="true">Règlement : </div>')
      + '<div class="sig"><div>Cachet et signature</div></div>'
      + '<div class="ft" id="ft" contenteditable="true">' + E(foot) + '</div>'
      + '</div><script>'
      + 'function n(t){t=String(t).replace(/\\s|\\u00a0/g,"").replace(",",".");var v=parseFloat(t);return isNaN(v)?0:v}'
      + 'function f(v){return v.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}'
      + 'var U=["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"],D=["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];'
      + 'function w99(x){if(x<20)return U[x];var d=Math.floor(x/10),u=x%10;if(d===7||d===9)return D[d]+(d===7&&u===1?"-et-":"-")+U[10+u];return D[d]+(u===1&&d!==8?"-et-un":u?"-"+U[u]:(d===8?"s":""))}'
      + 'function w999(x){var c=Math.floor(x/100),r=x%100,s="";if(c)s=(c>1?U[c]+" cent":"cent")+(r?"":(c>1?"s":""));if(r)s+=(s?" ":"")+w99(r);return s}'
      + 'function words(v){var neg=v<0;v=Math.abs(v);var e=Math.floor(v+1e-9),c=Math.round((v-e)*100),s="";var mi=Math.floor(e/1e6),m=Math.floor(e%1e6/1000),r=e%1000;if(mi)s=w999(mi)+" million"+(mi>1?"s":"");if(m)s+=(s?" ":"")+(m>1?w999(m)+" ":"")+"mille";if(r)s+=(s?" ":"")+w999(r);if(!s)s="zéro";return (neg?"moins ":"")+s+" dirhams"+(c?" et "+w99(c)+" centimes":"")}'
      + 'function calc(){var t=0;document.querySelectorAll("#t tbody tr").forEach(function(r){var c=r.cells;if(c.length>=4)t+=n(c[3].innerText)});t=Math.round(t*100)/100;document.getElementById("net").textContent=f(t)+" DH";document.getElementById("lettres").textContent=words(t);return t}'
      + 'function addRow(){var tb=document.querySelector("#t tbody"),tr=document.createElement("tr");tr.innerHTML=' + JSON.stringify(lineRow('Nouvelle ligne', null, null, 0)).replace(/<\/tr>|<tr>/g, '') + ';tb.appendChild(tr);tr.cells[0].focus();var r=document.createRange();r.selectNodeContents(tr.cells[0]);var g=getSelection();g.removeAllRanges();g.addRange(r)}'
      + 'var PEEK=' + JSON.stringify(initNum) + ',TAKEN=' + (isSaved ? 'true' : 'false') + ',OPNUM=' + JSON.stringify(h.num || '') + ',POLICE=' + JSON.stringify(h.police || '') + ',PLATE=' + JSON.stringify(h.plate || '') + ';'
      + 'function snap(){var e=document.getElementById("num");if(!TAKEN&&e.textContent.trim()===PEEK){e.textContent=parent.Fac8.take();}TAKEN=true;var rows=[];document.querySelectorAll("#t tbody tr").forEach(function(r){var c=r.cells;if(c.length>=4)rows.push({d:c[0].innerText.trim(),net:n(c[1].innerText),tax:n(c[2].innerText),tot:n(c[3].innerText)})});var clEl=document.getElementById("fcli"),bEl=clEl&&clEl.querySelector("b");try{parent.Fac8.saveFoot(document.getElementById("ft").innerText)}catch(x){}try{parent.Fac8.saveDoc({id:e.textContent.trim(),facNum:e.textContent.trim(),opNum:OPNUM,date:(document.getElementById("fdate")||{}).innerText||"",client:(bEl?bEl.innerText:(clEl?clEl.innerText.split("\\n")[0]:"")).trim(),police:POLICE,plate:PLATE,total:calc(),lines:rows,cliHtml:clEl?clEl.innerHTML:"",ctrHtml:(document.getElementById("fctr")||{}).innerHTML||"",pay:((document.getElementById("fpay")||{}).innerText||"").replace(/^Règlement\\s*:\\s*/i,""),foot:(document.getElementById("ft")||{}).innerText||""})}catch(x){}}'
      + 'function saveOnly(){snap()}'
      + 'function go(){snap();setTimeout(function(){window.print()},50)}'
      + 'document.addEventListener("input",function(e){if(e.target.closest&&e.target.closest("#t"))calc()});document.addEventListener("keydown",function(e){if(e.key==="Escape")parent.Fac8.hide()});calc();'
      + '<\/script></body></html>';
  }
  function open(h) {
    if (!h) return;
    curH = h;
    if (!fr) { fr = document.createElement('iframe'); fr.className = 'p8-frame fac8-frame'; fr.setAttribute('title', 'facture'); document.body.appendChild(fr); }
    fr.srcdoc = html(h); fr.classList.add('on'); document.body.classList.add('p8-open');
  }
  function hide() { if (fr) fr.classList.remove('on'); document.body.classList.remove('p8-open'); }
  function listModal() {
    var list = getList(), q = qStr.toLowerCase().trim(), adm = !!(typeof App !== 'undefined' && App.user && App.user.admin);
    var shown = !q ? list : list.filter(function (f) { return [f.facNum, f.client, f.police, f.plate, f.opNum, f.date].join(' ').toLowerCase().indexOf(q) >= 0; });
    var sum = shown.reduce(function (s, f) { return s + (+f.total || 0); }, 0);
    var body = !shown.length ? '<div class="empty">📑 ' + L('لا توجد فواتير محفوظة في الأرشيف بعد', 'Aucune facture archivée') + '</div>'
      : '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>N° Facture</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الزبون', 'Client') + '</th><th>' + L('البوليصة / اللوحة', 'Police / Immat.') + '</th><th>' + L('المبلغ', 'Total') + '</th><th></th></tr></thead><tbody>'
        + shown.slice(0, 200).map(function (f) {
            var id = esc(f.id || f.facNum);
            return '<tr><td class="ltr"><b>' + esc(f.facNum || '') + '</b>' + (f.opNum ? '<br><small class="muted">' + esc(f.opNum) + '</small>' : '') + '</td>'
              + '<td class="ltr">' + esc(f.date || '') + '</td><td><b>' + esc(f.client || '—') + '</b></td>'
              + '<td class="ltr">' + esc([f.police, f.plate].filter(Boolean).join(' · ') || '—') + '</td>'
              + '<td class="ltr"><b>' + money(+f.total || 0) + ' DH</b></td>'
              + '<td class="t-acts"><button class="ib" data-act="fac8-reopen" data-id="' + id + '" title="' + L('فتح / طباعة / تعديل', 'Ouvrir / Imprimer') + '">🖨️</button>'
              + (adm ? '<button class="ib" data-act="fac8-del" data-id="' + id + '" title="' + L('حذف', 'Supprimer') + '">🗑️</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
    Modal.open(Modal.head('📑 ' + L('أرشيف وسجل الفواتير', 'Registre des Factures') + ' (' + shown.length + ')')
      + '<div class="bar" style="gap:8px;margin-bottom:10px"><div class="search" style="flex:1"><span>🔍</span><input id="fac8-q" data-inp="fac8-q" placeholder="' + L('بحث برقم الفاتورة، الزبون، البوليصة…', 'Rechercher N° facture, client, police…') + '" value="' + esc(qStr) + '"></div>'
      + '<button class="btn" data-act="fac8-xls">📥 Excel</button></div>'
      + '<div class="h7-sum" style="margin-bottom:10px"><span><b>' + shown.length + '</b> ' + L('فاتورة', 'factures') + '</span><span>' + L('المجموع: ', 'Total : ') + '<b class="ltr">' + moneyH(sum, 1) + '</b></span></div>'
      + body, 'wide');
  }
  return {
    open: open, hide: hide, take: take, peek: peek, saveDoc: saveDoc, getList: getList, saveList: saveList, listModal: listModal,
    setQ: function (v) { qStr = v; },
    remember: function (num, d) { if (num && d) mem[num] = { lines: d.lines || [], marque: d.marque || '' }; },
    saveFoot: function (t) { t = String(t || '').trim(); if (t) try { localStorage.setItem(FOOT, t); } catch (e) { } },
    _html: html
  };
})();
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('.fac8-frame.on')) Fac8.hide(); });
/* الأزرار: السجل · «عملية جديدة» · النافذة ديال الـ PDF · أرشيف الفواتير */
App.act('h7-fac', function (el) { var x = h7Get(el); if (x) Fac8.open(Print8.find(x.h.num) || x.h); });
App.act('n7-fac', function () { var h = typeof p8Last === 'function' ? p8Last() : null; if (h) Fac8.open(h); });
App.act('q7-fac', function () { Modal.close(); App.acts['n7-fac'](); });
App.act('fac8-list', function () { Fac8.listModal(); });
App.input('fac8-q', debounce(function (el) { var p = el.selectionStart; Fac8.setQ(el.value); Fac8.listModal(); var i = $('fac8-q'); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (e) { } } }, 200));
App.act('fac8-reopen', function (el) {
  var id = el.dataset.id, f = Fac8.getList().filter(function (x) { return (x.id || x.facNum) === id; })[0];
  if (!f) return;
  Modal.close();
  Fac8.open({
    num: f.opNum || f.facNum, client: f.client, police: f.police, plate: f.plate, off: f.total,
    _facNum: f.facNum, _facDate: f.date, _facLines: f.lines, _facCliHtml: f.cliHtml, _facCtrHtml: f.ctrHtml, _facPay: f.pay, _facFoot: f.foot
  });
});
App.act('fac8-del', function (el) {
  if (!App.user || !App.user.admin) return;
  var id = el.dataset.id;
  if (!confirm(L('حذف الفاتورة ' + id + ' من الأرشيف؟', 'Supprimer la facture ' + id + ' ?'))) return;
  Fac8.saveList(Fac8.getList().filter(function (x) { return (x.id || x.facNum) !== id; }));
  Fac8.listModal();
});
App.act('fac8-xls', function () {
  var list = Fac8.getList();
  if (!list.length || typeof XLSX === 'undefined') { toast(L('لا توجد فواتير للتصدير', 'Aucune facture à exporter'), 'err'); return; }
  var rows = list.map(function (f) { return { 'N° Facture': f.facNum, Date: f.date || '', Client: f.client || '', Police: f.police || '', Immatriculation: f.plate || '', 'N° Opération': f.opNum || '', Total: +f.total || 0, Règlement: f.pay || '', Agent: f.by || '' }; });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Factures');
  XLSX.writeFile(wb, 'factures_' + todayISO() + '.xlsx');
});
