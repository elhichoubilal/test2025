/* ═══ EUR assurance — 14-pdf-client-import.js ═══
   استخراج بيانات الزبون من ملف PDF
   (مقتطع من app.js الأصلي، الأسطر 1823–2011، بالترتيب نفسه) */
// ══════════════════════════════════════════════════════════
// CLIENT CARD — import from PDF: extract text from an uploaded
// attestation/police/quittance PDF and auto-fill the client fields
// (best-effort, based on common French insurance-document labels).
// ══════════════════════════════════════════════════════════
function setClientMode(m){
document.getElementById('cm-manual').classList.toggle('on',m==='manual');
document.getElementById('cm-pdf').classList.toggle('on',m==='pdf');
document.getElementById('client-pdf-import').style.display=m==='pdf'?'block':'none';
}

var FR_MONTHS={'janvier':1,'février':2,'fevrier':2,'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,'decembre':12};

function frDateToISO(day,monthName,year){
var mo=FR_MONTHS[String(monthName).toLowerCase()];
if(!mo)return null;
return year+'-'+String(mo).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
function ddmmyyyyToISO(s){var p=s.split('/');return p.length===3?(p[2]+'-'+p[1]+'-'+p[0]):null;}

// Groups a page's raw text items into visual "lines" using their actual
// (x,y) position on the page — real-world insurance PDFs often store a
// label and its value as separate text runs that are FAR APART in the
// underlying content stream (so naive text search misses them) but sit
// right next to / just below each other visually. Clustering by position
// recovers that real layout.
function buildPageLines(items){
var pts=items.filter(function(i){return i.str.trim().length;});
var lines=[];
var tol=4;
pts.forEach(function(p){
var line=null;
for(var i=0;i<lines.length;i++){if(Math.abs(lines[i].y-p.y)<=tol){line=lines[i];break;}}
if(!line){line={y:p.y,items:[]};lines.push(line);}
line.items.push(p);
});
lines.forEach(function(l){l.items.sort(function(a,b){return a.x-b.x;});l.text=l.items.map(function(i){return i.str;}).join(' ').replace(/\s+/g,' ').trim();});
lines.sort(function(a,b){return b.y-a.y;});
return lines;
}

// Finds a label on some line, then returns whatever comes right after it
// on that same visual line, or — if the label sits alone (common in
// "stamp-box" style layouts) — the very next line below it.
function findValueForLabel(lines,labelRe,valueRe,maxLookahead){
maxLookahead=maxLookahead||2;
for(var i=0;i<lines.length;i++){
var m=lines[i].text.match(labelRe);
if(!m)continue;
var rest=lines[i].text.slice(m.index+m[0].length).trim();
if(rest&&(!valueRe||valueRe.test(rest)))return rest;
for(var k=1;k<=maxLookahead;k++){
var nx=lines[i+k];
if(!nx)break;
var cand=nx.text.trim();
if(cand&&(!valueRe||valueRe.test(cand)))return cand;
}
}
return null;
}

// Best-effort field extraction — tuned on real Wafa Assurance
// attestation/police/quittance layouts. Other companies' documents may
// use different labels or positions and won't all be recognized; any
// field not found simply stays empty for manual entry.
function extractInsuranceFieldsFromLines(lines){
var out={};
out.attest=findValueForLabel(lines,/N°\s*de l'attestation\s*:/i,/^[0-9]{4,}$/)||findValueForLabel(lines,/\bAttestation\s*:/i,/^[0-9]{4,}$/);
out.police=findValueForLabel(lines,/N°\s*de la police\s*:/i,/^[0-9][0-9\/\-]{3,}/)||findValueForLabel(lines,/Numéro de police\s*:/i,/^[0-9][0-9\/\-]{3,}/)||findValueForLabel(lines,/\bPolice\s*:/i,/^[0-9][0-9\/\-]{3,}/);
out.client=findValueForLabel(lines,/\bNom\s*:/i,/^[A-Za-zÀ-ÿ' -]{3,60}$/)||findValueForLabel(lines,/Assuré\s*:/i,/^[A-Za-zÀ-ÿ' -]{3,60}$/)||findValueForLabel(lines,/Souscripteur\s*:/i,/^[A-Za-zÀ-ÿ' -]{3,60}$/);
var priceStr=findValueForLabel(lines,/Net\s*[àa]\s*r[ée]gler\*?/i,/^[\d][\d\s.,]*$/)||findValueForLabel(lines,/TOTAL\s*[ÀA]\s*PAYER/i,/^[\d][\d\s.,]*$/);
if(priceStr){var num=parseFloat(priceStr.replace(/\s/g,'').replace(',','.'));if(!isNaN(num)&&num>0)out.price=num;}
var fullText=lines.map(function(l){return l.text;}).join('\n');
var mDuNum=fullText.match(/\bdu\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
var mAuNum=fullText.match(/\bau\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
if(mDuNum)out.ds=ddmmyyyyToISO(mDuNum[1]);
if(mAuNum)out.de=ddmmyyyyToISO(mAuNum[1]);
if(!out.ds){var mDu=fullText.match(/\bDu\s*:?[^\d]{0,15}(\d{1,2})\s+([a-zéûA-ZÉÛ]+)\s+(\d{4})/i);if(mDu){var iso=frDateToISO(mDu[1],mDu[2],mDu[3]);if(iso)out.ds=iso;}}
if(!out.de){var mAu=fullText.match(/\bAu\s*:?[^\d]{0,15}(\d{1,2})\s+([a-zéûA-ZÉÛ]+)\s+(\d{4})/i);if(mAu){var iso2=frDateToISO(mAu[1],mAu[2],mAu[3]);if(iso2)out.de=iso2;}}
/* اللوحة: صيغة مغربية 12345-A-6 أو WW */
var mPl=fullText.match(/\b(\d{1,6}-[A-Z]-\d{1,2}|WW\d{4,6})\b/);if(mPl)out.plate=mPl[1];
return out;
}

// ── قالب داخلي (بدون تسميات نصية — العناوين جزء من صورة خلفية ثابتة) ──
// مبني ومُتحقَّق منه على نموذج "eurassurance" الحقيقي: يستخرج بالاعتماد
// على شكل القيمة وموضعها بدل التسمية، لأن التسميات هنا غير قابلة للقراءة.
var KNOWN_WORDS2=['EUR-ASSURANCE','EURASSURANCE','CAMIONS','CAMION','VOITURE','MOTO','MALI','OUI','NON','DEUX','TROIS','QUATRE'];
var BRANDS2=['VOLVO','DACIA','RENAULT','MERCEDES','TOYOTA','HYUNDAI','KIA','PEUGEOT','FIAT','FORD','NISSAN','ISUZU','MAN','IVECO','SCANIA','MITSUBISHI','SUZUKI'];
var MONTHS_FR2=['JANVIER','FÉVRIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE','DECEMBRE'];

function extractTemplate2Fields(items,lines){
var out={};
var fullText=lines.map(function(l){return l.text;}).join('\n');
var mPolice=fullText.match(/\b([A-Z]{1,4}\d{2,4}\/\d{3,8})\b/);
if(mPolice)out.police=mPolice[1];
if(out.police){
for(var i=0;i<lines.length;i++){
if(lines[i].text.indexOf(out.police)!==-1){
var toks=lines[i].text.split(' ');
for(var j=0;j<toks.length;j++){if(/^\d{7,10}$/.test(toks[j])){out.attest=toks[j];break;}}
break;
}
}
}
var dateMatches=fullText.match(/\b\d{2}\/\d{2}\/\d{4}\b/g)||[];
var uniqDates=[];dateMatches.forEach(function(d){if(uniqDates.indexOf(d)<0)uniqDates.push(d);});
if(uniqDates[0])out.ds=ddmmyyyyToISO(uniqDates[0]);
if(uniqDates[1])out.de=ddmmyyyyToISO(uniqDates[1]);
/* اللوحة تجاور الماركة (فوقها أو تحتها) — نجرّب كل مواضع الماركة لا الأول فقط */
var plateRe=/^[A-Z]{1,3}\d{2,6}[A-Z]{0,3}$/;
items.filter(function(i){return BRANDS2.indexOf(i.str.toUpperCase())!==-1;}).forEach(function(brandItem){
if(out.plate)return;
var cands=items.filter(function(p){var dy=Math.abs(brandItem.y-p.y);return Math.abs(p.x-brandItem.x)<=15&&dy>1&&dy<=40&&plateRe.test(p.str.trim())&&!/^\d+$/.test(p.str.trim());});
cands.sort(function(a,b){return Math.abs(brandItem.y-a.y)-Math.abs(brandItem.y-b.y);});
if(cands[0])out.plate=cands[0].str.trim();
});
if(!out.plate){var mFp=fullText.match(/\b([A-Z]{2}\d{3}[A-Z]{2})\b/);if(mFp)out.plate=mFp[1];}
for(var i=0;i<lines.length;i++){
var t=lines[i].text.trim();
if(!t||t===out.police||/\d/.test(t)||/\//.test(t))continue;
var words=t.split(' ').filter(Boolean);
if(words.length<2||words.length>4)continue;
var isKeyword=words.some(function(w){return KNOWN_WORDS2.indexOf(w.toUpperCase())!==-1||BRANDS2.indexOf(w.toUpperCase())!==-1||MONTHS_FR2.indexOf(w.toUpperCase())!==-1;});
if(isKeyword)continue;
if(!/^[A-ZÀ-Ÿ' -]+$/.test(t))continue;
out.client=t;break;
}
var bestLine=null;
lines.forEach(function(l){
var nums=l.text.split(' ').filter(function(t){return /^-?[\d.,]+$/.test(t)&&/\d/.test(t);});
if(nums.length>=4)bestLine=l;
});
if(bestLine){
var nums=bestLine.text.split(' ').filter(function(t){return /^-?[\d.,]+$/.test(t)&&/\d/.test(t);});
var num=parseFloat(nums[nums.length-1].replace(/\s/g,'').replace(',','.'));
if(!isNaN(num)&&num>0)out.price=num;
}
return out;
}

function onClientPdfSelected(inp){
var file=inp.files&&inp.files[0];if(!file)return;
var statusEl=document.getElementById('client-pdf-status');
statusEl.innerHTML='⏳ '+(LANG==='fr'?'Extraction en cours...':'جارٍ الاستخراج...');
ensurePdfJs().then(function(){
var reader=new FileReader();
reader.onload=function(){
pdfjsLib.getDocument({data:new Uint8Array(reader.result)}).promise.then(function(pdf){
var pagePromises=[];
for(var i=1;i<=pdf.numPages;i++){
pagePromises.push(pdf.getPage(i).then(function(page){
return page.getTextContent().then(function(tc){
return tc.items.map(function(it){return {str:it.str,x:it.transform[4],y:it.transform[5]};});
});
}));
}
return Promise.all(pagePromises);
}).then(function(pagesItems){
var allItems=[],allLines=[];
pagesItems.forEach(function(items){allItems=allItems.concat(items);allLines=allLines.concat(buildPageLines(items));});
var f=extractInsuranceFieldsFromLines(allLines);
var f2=extractTemplate2Fields(allItems,allLines);
['client','police','attest','ds','de','price','plate'].forEach(function(k){if(!f[k]&&f2[k])f[k]=f2[k];});
if(typeof pdfRefine==='function')f=pdfRefine(allItems,allLines,f);
applyExtractedClientFields(f);
var found=[];
if(f.client)found.push(LANG==='fr'?'Nom':'الاسم');
if(f.police)found.push(LANG==='fr'?'Police':'البوليصة');
if(f.attest)found.push(LANG==='fr'?'Attestation':'الشهادة');
if(f.ds||f.de)found.push(LANG==='fr'?'Dates':'التواريخ');
if(f.price)found.push(LANG==='fr'?'Prix':'السعر');
if(typeof PDF_DOC!=='undefined'&&PDF_DOC)found.unshift(PDF_DOC.label);
if(f.plate)found.push(LANG==='fr'?'Immat.':'اللوحة');
statusEl.innerHTML=found.length?('✅ '+(LANG==='fr'?'Champs importés: ':'الحقول المستوردة: ')+found.join('، ')):('⚠️ '+(LANG==='fr'?"Aucun champ reconnu dans ce PDF — remplissez manuellement":'لم يتم التعرف على أي حقل في هذا الملف — يُرجى الملء يدوياً'));
setClientMode('manual');
}).catch(function(e){console.error(e);statusEl.textContent='❌ '+e.message;});
};
reader.readAsArrayBuffer(file);
}).catch(function(e){console.error(e);statusEl.textContent='❌ '+e.message;});
}

function applyExtractedClientFields(f){
if(f.client)document.getElementById('client').value=f.client;
if(f.plate)document.getElementById('plate').value=f.plate;
if(f.police)document.getElementById('police-num').value=f.police;
if(f.attest){var ae=document.getElementById('attest-num');if(ae)ae.value=f.attest;}
if(f.ds){document.getElementById('date-s').value=f.ds;calcEnd();}
if(f.de)document.getElementById('date-e').value=f.de;
if(f.price){
var mt=document.getElementById('man-tog');
if(mt){mt.checked=true;togMan();document.getElementById('man-price').value=f.price;updMan();}
}
}


