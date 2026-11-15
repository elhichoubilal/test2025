/* ═══ EUR assurance — 13-pdf-templates.js ═══
   قوالب PDF: رفع القالب، المعايرة، التعبئة
   (مقتطع من app.js الأصلي، الأسطر 1570–1822، بالترتيب نفسه) */
// ══════════════════════════════════════════════════════════
// PDF TEMPLATES — upload a blank policy/attestation PDF, click to
// position the client / police / attestation / duration fields,
// then auto-fill + download a completed PDF for any operation.
// ══════════════════════════════════════════════════════════
function ldPdfTpl(){try{PDF_TEMPLATES=JSON.parse(localStorage.getItem('eurv102_pdftpl')||'[]');}catch(e){PDF_TEMPLATES=[];}ACTIVE_TPL_ID=localStorage.getItem('eurv102_pdftpl_active')||null;}
function svPdfTpl(){localStorage.setItem('eurv102_pdftpl',JSON.stringify(PDF_TEMPLATES));if(window.fbSet)window.fbSet('pdfTemplates',PDF_TEMPLATES);}

function renderPdfTplPage(){
ldPdfTpl();
var box=document.getElementById('tpl-list');
if(!PDF_TEMPLATES.length){
box.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3);font-size:.82rem">'+(LANG==='fr'?'Aucun modèle importé pour le moment':'لا توجد قوالب بعد')+'</div>';
}else{
var html='';
PDF_TEMPLATES.forEach(function(t){
var isActive=t.id===ACTIVE_TPL_ID;
var nFields=Object.keys(t.fields||{}).length;
html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid '+(isActive?'var(--gold-d)':'var(--border)')+';border-radius:10px;margin-bottom:8px;background:'+(isActive?'var(--gold-bg)':'transparent')+'">';
html+='<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(t.name)+'</div><div style="font-size:.68rem;color:var(--text3)">'+(t.numPages||1)+' '+(LANG==='fr'?'page(s)':'صفحة')+' · '+nFields+'/4 '+(LANG==='fr'?'champs réglés':'حقول محددة')+'</div></div>';
html+='<button type="button" class="hfbtn" onclick="openTplCalibration(\''+t.id+'\')" title="'+(LANG==='fr'?'Positionner les champs':'تحديد الحقول')+'">🎯</button>';
html+='<button type="button" class="hfbtn'+(isActive?' on':'')+'" onclick="selectActiveTpl(\''+t.id+'\')">'+(isActive?'✅':(LANG==='fr'?'Activer':'تفعيل'))+'</button>';
html+='<button type="button" class="hfbtn" style="color:var(--red)" onclick="deleteTpl(\''+t.id+'\')">🗑️</button>';
html+='</div>';
});
box.innerHTML=html;
}
fillTplSelect();
}

function fillTplSelect(){
var sel=document.getElementById('tpl-select');if(!sel)return;
ldPdfTpl();
if(!PDF_TEMPLATES.length){sel.innerHTML='<option value="">'+(LANG==='fr'?'Aucun modèle PDF':'لا يوجد قالب PDF')+'</option>';return;}
sel.innerHTML=PDF_TEMPLATES.map(function(t){return '<option value="'+t.id+'"'+(t.id===ACTIVE_TPL_ID?' selected':'')+'>'+escHtml(t.name)+'</option>';}).join('');
}

function onTplFileSelected(inp){
var file=inp.files&&inp.files[0];if(!file)return;
if(file.type!=='application/pdf'){alert(LANG==='fr'?'Veuillez choisir un fichier PDF':'الرجاء اختيار ملف PDF');return;}
var reader=new FileReader();
reader.onload=function(){
var tpl={id:'tpl'+Date.now(),name:file.name.replace(/\.pdf$/i,''),base64:reader.result,fields:{},numPages:1};
ldPdfTpl();
PDF_TEMPLATES.push(tpl);
if(!ACTIVE_TPL_ID){ACTIVE_TPL_ID=tpl.id;localStorage.setItem('eurv102_pdftpl_active',tpl.id);}
svPdfTpl();
renderPdfTplPage();
openTplCalibration(tpl.id);
inp.value='';
};
reader.readAsDataURL(file);
}

function selectActiveTpl(id){ACTIVE_TPL_ID=id;localStorage.setItem('eurv102_pdftpl_active',id);renderPdfTplPage();}

function deleteTpl(id){
if(!confirm(LANG==='fr'?'Supprimer ce modèle ?':'حذف هذا القالب؟'))return;
ldPdfTpl();
PDF_TEMPLATES=PDF_TEMPLATES.filter(function(t){return t.id!==id;});
if(ACTIVE_TPL_ID===id){ACTIVE_TPL_ID=PDF_TEMPLATES.length?PDF_TEMPLATES[0].id:null;localStorage.setItem('eurv102_pdftpl_active',ACTIVE_TPL_ID||'');}
svPdfTpl();
renderPdfTplPage();
}

function openTplCalibration(id){
TPL_CALIB_ID=id;
ldPdfTpl();
var tpl=PDF_TEMPLATES.find(function(t){return t.id===id;});
if(!tpl)return;
document.getElementById('tpl-calib-card').style.display='block';
document.getElementById('tpl-calib-name').textContent=tpl.name;
document.getElementById('tpl-page-num').value=1;
setTplFieldMode('client');
renderTplCanvas();
document.getElementById('tpl-calib-card').scrollIntoView({behavior:'smooth',block:'start'});
}

function setTplFieldMode(f){
TPL_FIELD_MODE=f;
['client','police','attest','duration'].forEach(function(k){
var b=document.getElementById('tplfm-'+k);if(b)b.classList.toggle('on',k===f);
});
}

function renderTplCanvas(){
var tpl=PDF_TEMPLATES.find(function(t){return t.id===TPL_CALIB_ID;});
if(!tpl)return;
ensurePdfJs().then(function(){
var pageNum=parseInt(document.getElementById('tpl-page-num').value)||1;
pdfjsLib.getDocument({url:tpl.base64}).promise.then(function(pdf){
tpl.numPages=pdf.numPages;
if(pageNum>pdf.numPages)pageNum=pdf.numPages;
return pdf.getPage(pageNum);
}).then(function(page){
var scale=1.3;
var viewport=page.getViewport({scale:scale});
var canvas=document.getElementById('tpl-canvas');
canvas.width=viewport.width;canvas.height=viewport.height;
TPL_CANVAS_SCALE=scale;
var ctx=canvas.getContext('2d');
page.render({canvasContext:ctx,viewport:viewport}).promise.then(function(){
drawTplMarkers(tpl,pageNum);
});
canvas.onclick=function(e){
if(!TPL_FIELD_MODE){alert(LANG==='fr'?"Choisissez un champ d'abord (Client, Police...)":'اختر حقلاً أولاً (الاسم، البوليصة...)');return;}
var rect=canvas.getBoundingClientRect();
var cx=(e.clientX-rect.left)*(canvas.width/rect.width);
var cy=(e.clientY-rect.top)*(canvas.height/rect.height);
var pdfX=cx/TPL_CANVAS_SCALE;
var pdfY=(canvas.height-cy)/TPL_CANVAS_SCALE;
tpl.fields=tpl.fields||{};
tpl.fields[TPL_FIELD_MODE]={page:pageNum-1,x:Math.round(pdfX),y:Math.round(pdfY),size:11};
svPdfTpl();
drawTplMarkers(tpl,pageNum);
};
});
});
}

function drawTplMarkers(tpl,pageNum){
var canvas=document.getElementById('tpl-canvas');
var ctx=canvas.getContext('2d');
var labels={client:'👤 Client',police:'🔢 Police',attest:'📜 Attest.',duration:'🗓️ Durée'};
var colors={client:'#2563eb',police:'#0a8a5f',attest:'#7c3aed',duration:'#d97706'};
Object.keys(tpl.fields||{}).forEach(function(k){
var f=tpl.fields[k];
if(f.page!==pageNum-1)return;
var cx=f.x*TPL_CANVAS_SCALE;
var cy=canvas.height-(f.y*TPL_CANVAS_SCALE);
ctx.fillStyle=colors[k]||'#000';
ctx.beginPath();ctx.arc(cx,cy,5,0,2*Math.PI);ctx.fill();
ctx.font='bold 11px sans-serif';
ctx.fillStyle='#fff';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.6)';
ctx.strokeText(labels[k]||k,cx+8,cy-6);
ctx.fillText(labels[k]||k,cx+8,cy-6);
});
}

// Renders text to an offscreen canvas (correctly shapes/joins Arabic
// via the browser's own text engine) then returns it as a PNG data URL.
function textToImageData(text,opts){
opts=opts||{};
var fontSize=opts.size||44;
var isAr=/[\u0600-\u06FF]/.test(text);
var fontFamily=isAr?"'Tajawal',Arial,sans-serif":"'Inter',Arial,sans-serif";
var measure=document.createElement('canvas').getContext('2d');
measure.font=fontSize+'px '+fontFamily;
var textWidth=Math.ceil(measure.measureText(text).width)+16;
var canvas=document.createElement('canvas');
canvas.width=textWidth;canvas.height=Math.ceil(fontSize*1.5);
var ctx=canvas.getContext('2d');
ctx.font=fontSize+'px '+fontFamily;
ctx.fillStyle=opts.color||'#000';
ctx.textBaseline='top';
ctx.direction=isAr?'rtl':'ltr';
ctx.textAlign=isAr?'right':'left';
ctx.fillText(text,isAr?canvas.width-8:8,4);
return {dataUrl:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height};
}

function dataURLToBytes(dataUrl){
var base64=dataUrl.split(',')[1];
var binary=atob(base64);
var bytes=new Uint8Array(binary.length);
for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
return bytes;
}

// Draws `text` on a pdf-lib page at PDF coordinates (x,y = bottom-left
// origin), rendered as a crisp raster image so Arabic joins correctly.
function drawTextOnPdfPage(pdfDoc,page,text,x,y,fontSizePt){
text=String(text||'').trim();
if(!text)return Promise.resolve();
var ready=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
return ready.then(function(){
var scaleFactor=4;
var img=textToImageData(text,{size:fontSizePt*scaleFactor});
var pngBytes=dataURLToBytes(img.dataUrl);
return pdfDoc.embedPng(pngBytes).then(function(pngImage){
var wPt=img.width/scaleFactor,hPt=img.height/scaleFactor;
page.drawImage(pngImage,{x:x,y:y-hPt*0.72,width:wPt,height:hPt});
});
});
}

function fmtDurationText(){
var ds=document.getElementById('date-s').value,de=document.getElementById('date-e').value;
if(ds&&de)return fmtD(ds)+' - '+fmtD(de);
return DUR+(LANG==='fr'?' mois':(DUR===1?' شهر':' أشهر'));
}

function generateFromTemplate(){
ldPdfTpl();
var sel=document.getElementById('tpl-select');
var id=sel&&sel.value?sel.value:ACTIVE_TPL_ID;
var tpl=PDF_TEMPLATES.find(function(t){return t.id===id;});
if(!tpl){alert(LANG==='fr'?"Aucun modèle sélectionné — importez-en un depuis 'Modèles PDF'":"لا يوجد قالب محدد — أضف واحداً من صفحة 'قوالب PDF'");return;}
if(!tpl.fields||!Object.keys(tpl.fields).length){alert(LANG==='fr'?"Ce modèle n'a aucun champ positionné — ouvrez-le dans 'Modèles PDF' (🎯)":"لم تُحدَّد أي حقول لهذا القالب — افتحه من 'قوالب PDF' (🎯)");return;}
var values={
client:document.getElementById('client').value||'',
police:document.getElementById('police-num').value||'',
attest:(document.getElementById('attest-num')||{value:''}).value||'',
duration:fmtDurationText()
};
ensurePdfLib().then(function(){
return fetch(tpl.base64).then(function(r){return r.arrayBuffer();}).then(function(buf){
return PDFLib.PDFDocument.load(buf);
}).then(function(pdfDoc){
var pages=pdfDoc.getPages();
var chain=Promise.resolve();
Object.keys(tpl.fields).forEach(function(k){
var f=tpl.fields[k],val=values[k];
if(!val||!pages[f.page])return;
chain=chain.then(function(){return drawTextOnPdfPage(pdfDoc,pages[f.page],val,f.x,f.y,f.size||11);});
});
return chain.then(function(){return pdfDoc.save();});
});
}).then(function(bytes){
var blob=new Blob([bytes],{type:'application/pdf'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download=(tpl.name||'document').replace(/[^\w\u0600-\u06FF-]+/g,'_')+'-'+(values.client||'client').replace(/[^\w\u0600-\u06FF-]+/g,'_')+'.pdf';
document.body.appendChild(a);a.click();document.body.removeChild(a);
}).catch(function(e){console.error(e);alert((LANG==='fr'?'Erreur PDF: ':'خطأ PDF: ')+e.message);});
}

// Download the currently open receipt (وصل) as a real PDF file.
function downloadReceiptPDF(){
var txt=buildShareTxt();
var lines=txt.split('\n');
ensurePdfLib().then(function(){
return PDFLib.PDFDocument.create().then(function(pdfDoc){
var page=pdfDoc.addPage([280,60+lines.length*18]);
var y=page.getHeight()-30;
var chain=Promise.resolve();
lines.forEach(function(line){
var yy=y;
chain=chain.then(function(){return drawTextOnPdfPage(pdfDoc,page,line,20,yy,10);});
y-=18;
});
return chain.then(function(){return pdfDoc.save();});
});
}).then(function(bytes){
var blob=new Blob([bytes],{type:'application/pdf'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
var num=(document.getElementById('r-num').textContent||'recu').replace(/[^a-zA-Z0-9-]/g,'');
a.download='recu-'+num+'.pdf';
document.body.appendChild(a);a.click();document.body.removeChild(a);
}).catch(function(e){console.error(e);alert((LANG==='fr'?'Erreur PDF: ':'خطأ PDF: ')+e.message);});
}

