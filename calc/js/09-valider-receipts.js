/* ═══ EUR assurance — 09-valider-receipts.js ═══
   تأكيد العملية، الوصل، وصل القبض (Pièce de recette)
   (مقتطع من app.js الأصلي، الأسطر 1031–1247، بالترتيب نفسه) */
function valider(){
if(!LAST.paid){alert(LANG==='fr'?"Calculez d'abord":'احسب أولاً');return;}
var clientEl=document.getElementById('client');
if(!clientEl.value.trim()){clientEl.style.borderColor='var(--red)';clientEl.focus();setTimeout(function(){clientEl.style.borderColor='';},3000);return;}
ldH();
var num=nextN(),client=clientEl.value.trim(),plate=document.getElementById('plate').value;
var ds=document.getElementById('date-s').value,de=document.getElementById('date-e').value;
var policeNum=document.getElementById('police-num').value.trim();
var attestNum=(document.getElementById('attest-num')||{value:''}).value.trim();
var loc=(document.getElementById('location')||{value:''}).value.trim();
HIST.unshift({num,date:new Date().toLocaleDateString('fr-FR'),time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),user:CUR.n,av:CUR.av,client,plate,police:policeNum,attest:attestNum,usage:USAGE,tarif:TARIF,ins:getDesc(),location:loc,ds,de,paid:LAST.paid,off:LAST.off,diff:LAST.diff,payMode:PAY_MODE,payRef:getPayRef()});
svH();
saveClient(client,plate,getDesc(),de);
clearDraft();
document.getElementById('h-rec').textContent=curN();
document.getElementById('val-btn').style.display='none';
var sd=LAST.diff;
document.getElementById('val-num').textContent='✅ N° '+num+(LANG==='fr'?' — Validé!':' — تم التأكيد!');
document.getElementById('val-info').textContent=client+' — '+fmt(Math.abs(sd))+' DH '+(sd>0?(LANG==='fr'?'remboursé':'مُرجَع'):sd<0?(LANG==='fr'?'dû':'مديون'):(LANG==='fr'?'soldé':'مطابق'))+(typeof rtAutoDone==='function'?rtAutoDone():'');
document.getElementById('valok').style.display='block';
updateQuickStats();renderDashboard();
setTimeout(function(){
['client','plate','paid','cheque-num','tpe-ref','police-num','attest-num'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
if(document.getElementById('location'))document.getElementById('location').value='';
setPayMode('cash');setUsage('Personnel');setTarif('wafa');document.getElementById('resbox').className='resbox';
document.getElementById('action-area').style.display='none';document.getElementById('valok').style.display='none';document.getElementById('warn-box').style.display='none';
['m-paid','m-diff'].forEach(function(id){document.getElementById(id).textContent='—';document.getElementById(id).className='sc-val';});
LAST={paid:0,off:0,diff:0};
},3500);
}

function fillReceipt(client,plate,police,ins,ds,de,paid,off,diff,payMode,payRef,num,date,user,av){
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
document.getElementById('r-ci-name').textContent=ci.name||'EUR assurance';
document.getElementById('r-num').textContent='N° '+num;
document.getElementById('r-date').textContent=date;
document.getElementById('r-user').textContent=(av||'👤')+' '+user;
document.getElementById('r-client').textContent=client||'—';
document.getElementById('r-csign').textContent=client&&client!=='—'?client:'';
document.getElementById('r-ins').textContent=ins||'—';
document.getElementById('r-paid').textContent=fmt(paid)+' DH';
document.getElementById('r-off').textContent=fmt(off)+' DH';
document.getElementById('r-paymode').textContent=payMode==='cheque'?'📄 Chèque':payMode==='tpe'?'💳 TPE':'💵 '+(LANG==='fr'?'Espèces':'نقداً');
var rrow=document.getElementById('r-payref-row');if(payRef){rrow.style.display='flex';document.getElementById('r-payref').textContent=payRef;}else rrow.style.display='none';
var pr=document.getElementById('r-pr');if(plate){pr.style.display='flex';document.getElementById('r-plate').textContent=plate;}else pr.style.display='none';
var polr=document.getElementById('r-polr');if(police){polr.style.display='flex';document.getElementById('r-police').textContent=police;}else polr.style.display='none';
var dr=document.getElementById('r-dr');if(ds){dr.style.display='flex';document.getElementById('r-dates').textContent=fmtD(ds)+' → '+fmtD(de);}else dr.style.display='none';
var tv=document.getElementById('r-tv');tv.textContent=fmt(Math.abs(diff))+' DH';
if(diff>0){tv.className='rctv pos';document.getElementById('r-tl').textContent='↩️ '+(LANG==='fr'?'Montant remboursé':'المبلغ المُرجَع');}
else if(diff<0){tv.className='rctv neg2';document.getElementById('r-tl').textContent='⚠️ '+(LANG==='fr'?'Solde restant dû':'المبلغ المديون');}
else{tv.className='rctv';document.getElementById('r-tl').textContent='✅ '+(LANG==='fr'?'Compte soldé':'الحساب مطابق');tv.textContent='0.00 DH';}
var ci2=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
document.getElementById('r-footer').textContent=(ci2.name||'EUR assurance')+(ci2.phone?' · '+ci2.phone:'')+(ci2.addr?' · '+ci2.addr:'');
}
function buildRec(){
if(!LAST.paid){alert(LANG==='fr'?"Calculez d'abord":'احسب أولاً');return false;}
var num=document.getElementById('h-rec').textContent||curN();
fillReceipt(document.getElementById('client').value,document.getElementById('plate').value,document.getElementById('police-num').value,getDesc(),document.getElementById('date-s').value,document.getElementById('date-e').value,LAST.paid,LAST.off,LAST.diff,PAY_MODE,getPayRef(),num,new Date().toLocaleDateString('fr-FR')+' '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),CUR.n,CUR.av);
return true;
}
function buildRecFromHist(h){fillReceipt(h.client,h.plate,h.police,h.ins,h.ds,h.de,h.paid,h.off,h.diff,h.payMode,h.payRef,h.num,h.date+(h.time?' '+h.time:''),h.user,h.av);document.getElementById('receipt').classList.add('show');}
function doPrint(size){var s=document.getElementById('print-sty');if(!s){s=document.createElement('style');s.id='print-sty';document.head.appendChild(s);}s.textContent=size==='80mm'?'@page{size:80mm auto;margin:3mm;}':size==='a4'?'@page{size:A4 portrait;margin:10mm;}':'@page{size:A5 portrait;margin:8mm;}';document.querySelector('#receipt .print-size-row').style.display='none';setTimeout(function(){window.print();setTimeout(function(){document.querySelector('#receipt .print-size-row').style.display='flex';},500);},150);}

/* ══════════════════════════════════════════════════════════
PIÈCE DE RECETTE — reçu officiel dupliqué (client + agence)
══════════════════════════════════════════════════════════ */
function pf(label,value){return'<span class="pf-label">'+label+' :</span> <span class="pf-val">'+value+'</span>';}
function pieceCopyHtml(ci,pieceNum,police,usage,attest,ds,de,client,off,paid,reliquat,city,dateHeure){
var addrLine=ci.addr2?escHtml(ci.addr2)+(ci.ice?'  - ICE':''):'';
var html='<div class="piece-copy">';
/* ── Header: company block (left) + title/number block (right) ── */
html+='<div class="piece-head">';
html+='<div class="piece-head-l">';
html+='<div class="piece-co">'+escHtml(ci.name||'EUR-ASSURANCES SARL')+'</div>';
if(addrLine)html+='<div class="piece-addr">'+addrLine+'</div>';
if(ci.ice)html+='<div class="piece-addr">'+escHtml(ci.ice)+'</div>';
if(ci.phone)html+='<div class="piece-tel">Tél :  '+escHtml(ci.phone)+'</div>';
if(city)html+='<div class="piece-ville">'+escHtml(city)+'</div>';
html+='</div>';
html+='<div class="piece-head-r">';
html+='<div class="piece-tt">PIECE DE RECETTE</div>';
html+='<div class="piece-num">'+pieceNum+'</div>';
html+='</div>';
html+='</div>';
/* ── Fields grid ── */
html+='<div class="piece-frow"><div class="pf-cell wide">'+pf('Police N°',escHtml(police||'-'))+'</div><div class="pf-cell piece-usage-cell" style="display:none">'+pf('Usage',escHtml(usage||''))+'</div><div class="pf-cell">'+(attest?pf('Attestation',escHtml(attest)):'')+'</div></div>';
if(ds)html+='<div class="piece-frow"><div class="pf-cell wide">'+pf('Période de garantie du',fmtD(ds))+'</div><div class="pf-cell"></div><div class="pf-cell">'+pf('Au',fmtD(de))+'</div></div>';
html+='<div class="piece-frow"><div class="pf-cell wide">'+pf('Assuré',escHtml(client||'-'))+'</div></div>';
html+='<div class="piece-frow"><div class="pf-cell wide">'+pf('Prime Totale',fmt(off))+'</div></div>';
html+='<div class="piece-frow"><div class="pf-cell wide">'+pf('Espèces',fmt(paid))+'</div><div class="pf-cell"></div><div class="pf-cell">'+pf('Reliquat',fmt(reliquat))+'</div></div>';
html+='<div class="piece-foot">Fait à '+(city?escHtml(city)+', ':'')+'le '+dateHeure+'</div>';
html+='</div>';
return html;
}
function renderPieceReceipt(opts){
LAST_PIECE_NUM=opts.pieceNum;
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
var city=ci.city||'';
/* Espèces = المبلغ الفعلي المستلم، لكن مقفول عند حد Prime Totale (ما يطلع أكتر من السعر الرسمي حتى لو دفع أكتر).
Reliquat = الباقي المستحق على الزبون فقط إذا دفع أقل من السعر الرسمي (وإلا 0). */
var especes=Math.round(Math.min(opts.paid,opts.off)*100)/100;
var reliquat=Math.max(0,Math.round((opts.off-opts.paid)*100)/100);
var copy=pieceCopyHtml(ci,opts.pieceNum,opts.police,opts.usage,opts.attest,opts.ds,opts.de,opts.client,opts.off,especes,reliquat,city,opts.dateHeure);
document.getElementById('piece-wrap').innerHTML=copy+'<div class="piece-sep"></div>'+copy;
document.getElementById('receipt-piece').classList.add('show');
}

function togglePieceUsage(){
  var cells=document.querySelectorAll('.piece-usage-cell');
  if(!cells.length)return;
  var btn=document.getElementById('piece-usage-toggle-btn');
  var isHidden=(cells[0].style.display==='none'||cells[0].style.display==='');
  // Actually check computed visibility
  var showing=cells[0].offsetParent!==null&&cells[0].style.display!=='none';
  if(showing){
    cells.forEach(function(c){c.style.display='none';});
    if(btn){btn.classList.remove('on');}
  } else {
    cells.forEach(function(c){c.style.display='';});
    if(btn){btn.classList.add('on');}
  }
}
function buildPieceReceipt(){
if(!LAST.paid){alert(LANG==='fr'?"Calculez d'abord":'احسب أولاً');return;}
var num=getPieceNum();
if(num===null)return;
var now=new Date();
var dateHeure=now.toLocaleDateString('fr-FR')+' à '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
renderPieceReceipt({
pieceNum:num,
police:document.getElementById('police-num').value.trim(),
attest:(document.getElementById('attest-num')||{value:''}).value.trim(),
usage:USAGE,
ds:document.getElementById('date-s').value,
de:document.getElementById('date-e').value,
client:document.getElementById('client').value.trim(),
off:LAST.off,paid:LAST.paid,
dateHeure:dateHeure
});
}
function buildPieceReceiptFromHist(h){
/* رقم ثابت لكل عملية: يُخصَّص مرة واحدة فقط ويُحفظ داخل السجل نفسه، ولا يتغير بعدها */
if(!h.pieceNum){
h.pieceNum=nextPieceNum();
svH();
}
var dateHeure=h.date+(h.time?' à '+h.time:'');
renderPieceReceipt({
pieceNum:h.pieceNum,police:h.police,attest:h.attest,usage:h.usage||'Personnel',
ds:h.ds,de:h.de,client:h.client,off:h.off,paid:h.paid,dateHeure:dateHeure
});
}

/* ── وصل يدوي: إدخال مباشر لـ Prime Totale / Espèces بدون المرور بمحرك حساب التأمين ── */
var PIECE_MANUAL=false;
function togglePieceManual(){
PIECE_MANUAL=!PIECE_MANUAL;
var sw=document.getElementById('piece-manual-sw'),box=document.getElementById('piece-manual-box');
if(sw)sw.classList.toggle('on',PIECE_MANUAL);
if(box)box.classList.toggle('show',PIECE_MANUAL);
}
function buildPieceReceiptManual(){
var off=parseFloat(document.getElementById('pm-off').value)||0;
var paid=parseFloat(document.getElementById('pm-paid').value)||0;
if(!off){alert(LANG==='fr'?'Entrez la Prime Totale':'أدخل السعر الرسمي (Prime Totale)');return;}
var client=document.getElementById('client').value.trim();
if(!client){alert(LANG==='fr'?'Entrez le nom du client':'أدخل اسم الزبون');document.getElementById('client').focus();return;}
var num=getPieceNum();
if(num===null)return;
var now=new Date();
var dateHeure=now.toLocaleDateString('fr-FR')+' à '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
renderPieceReceipt({
pieceNum:num,
police:document.getElementById('police-num').value.trim(),
attest:(document.getElementById('attest-num')||{value:''}).value.trim(),
usage:USAGE,
ds:document.getElementById('date-s').value,
de:document.getElementById('date-e').value,
client:client,
off:off,paid:paid,
dateHeure:dateHeure
});
}
function doPrintPiece(size){var s=document.getElementById('print-sty-piece');if(!s){s=document.createElement('style');s.id='print-sty-piece';document.head.appendChild(s);}s.textContent=size==='80mm'?'@page{size:80mm auto;margin:3mm;}':size==='a4'?'@page{size:A4 portrait;margin:10mm;}':'@page{size:A5 portrait;margin:8mm;}';document.querySelector('#receipt-piece .print-size-row').style.display='none';setTimeout(function(){window.print();setTimeout(function(){document.querySelector('#receipt-piece .print-size-row').style.display='flex';},500);},150);}

// Downloads the official receipt (Pièce de recette) as a PDF — captures
// the actual rendered HTML (via html2canvas) so styling/borders/Arabic
// text come out identical to what's on screen, then wraps it in a PDF.
function downloadPiecePDF(){
var el=document.getElementById('piece-wrap');
if(!el){alert('—');return;}
var row=document.querySelector('#receipt-piece .print-size-row');
Promise.all([ensureHtml2Canvas(),ensurePdfLib()]).then(function(){
row.style.display='none';
return html2canvas(el,{scale:2,backgroundColor:'#ffffff',useCORS:true}).then(function(canvas){
row.style.display='flex';
var imgData=canvas.toDataURL('image/png');
var pxToPt=0.75; // 96dpi px -> pt
var wPt=canvas.width*pxToPt/2,hPt=canvas.height*pxToPt/2; // /2 to undo scale:2
return PDFLib.PDFDocument.create().then(function(pdfDoc){
return pdfDoc.embedPng(imgData).then(function(png){
var page=pdfDoc.addPage([wPt,hPt]);
page.drawImage(png,{x:0,y:0,width:wPt,height:hPt});
return pdfDoc.save();
});
});
});
}).then(function(bytes){
var blob=new Blob([bytes],{type:'application/pdf'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
var num=(LAST_PIECE_NUM||'piece').replace(/[^a-zA-Z0-9-]/g,'');
a.download='piece-'+num+'.pdf';
document.body.appendChild(a);a.click();document.body.removeChild(a);
}).catch(function(e){row.style.display='flex';console.error(e);alert((LANG==='fr'?'Erreur PDF: ':'خطأ PDF: ')+e.message);});
}

