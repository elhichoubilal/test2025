/* ═══ RenewPro 7 — 20-v7-compact.js ═══
   متابعة التجديدات: الأرقام فسطر واحد، و«استيراد البوردورو» و«إضافة يدوياً» مسدودين حتى تضغط عليهم.
   إلا كان استيراد كيتسنا التأكيد (ولا خطأ)، الصندوق ديالو كيتحل بوحدو. */
function rt7Toggle(id, force){
var el=document.getElementById(id);if(!el)return;
var on=force===undefined?!el.classList.contains('open'):!!force;
el.classList.toggle('open',on);
var b=document.getElementById(id==='rt7-imp'?'rt7-b-imp':'rt7-b-add');if(b)b.classList.toggle('on',on);
if(on&&id==='rt7-add'){var n=document.getElementById('rt-f-name');if(n)setTimeout(function(){try{n.focus();}catch(e){}},30);}
}
(function(){
if(typeof renderRenewalsPage!=='function')return;
var orig=renderRenewalsPage;
renderRenewalsPage=function(){
var r=orig.apply(this,arguments);
var err=document.getElementById('rt-import-err');
if((typeof RT_PENDING!=='undefined'&&RT_PENDING)||(err&&err.style.display!=='none'))rt7Toggle('rt7-imp',true);
return r;
};
document.addEventListener('change',function(e){if(e.target&&e.target.id==='rt-file-input')rt7Toggle('rt7-imp',true);},true);
})();

/* v7.0.3 — الحاسوب: البحث + الأرقام + الفترة فالشريط العلوي (سطر واحد)، والأزرار فالشريط العلوي ديال RenewPro.
   الهاتف: 🔍 و ⋯ فوق، الأرقام سطر واحد كيتسحب، الفترة مسدودة (▾)، وكل زبون سطرين + 📞 (التفاصيل بالضغط). */
var RT7={built:false};
function rt7Wide(){return window.innerWidth>=900;}
function rt7Build(){
if(RT7.built)return true;
var slot=document.getElementById('tb-slot'),q=document.getElementById('rt-search'),bar=document.querySelector('.rt7-bar'),fb=document.getElementById('rt-date-filter');
if(!slot||!q||!bar)return false;
var ch=document.createElement('div');ch.id='rt7-chips';ch.className='rt7-chips';
Array.prototype.slice.call(bar.querySelectorAll('.rt7-c')).forEach(function(c){ch.appendChild(c);});
var ac=document.createElement('div');ac.id='rt7-acts';ac.className='rt7-acts';
['rt7-b-imp','rt7-b-add','rt7-b-xls'].forEach(function(id){var b=document.getElementById(id);if(b)ac.appendChild(b);});
var tg=document.createElement('div');tg.id='rt7-tg';tg.className='rt7-tg';
tg.innerHTML='<button type="button" class="rt7-ib" id="rt7-tq" onclick="rt7Tog(\'q\')" aria-label="search">&#x1F50D;</button><button type="button" class="rt7-ib" id="rt7-ta" onclick="rt7Tog(\'a\')" aria-label="more">&#x22EF;</button>';
var ft=document.createElement('button');ft.type='button';ft.id='rt7-ft';ft.className='rt7-ft';ft.setAttribute('onclick',"rt7Tog('f')");
RT7.el={slot:slot,q:q,bar:bar,fb:fb,ch:ch,ac:ac,tg:tg,ft:ft};RT7.open={};RT7.built=true;return true;
}
function rt7Tog(k){RT7.open[k]=!RT7.open[k];rt7Lay();if(k==='q'&&RT7.open.q){try{RT7.el.q.focus();}catch(e){}}}
function rt7Lay(){
if(!rt7Build())return;
var E=RT7.el,pg=document.getElementById('page-renewals'),on=pg&&pg.classList.contains('active'),wide=rt7Wide(),fr=(typeof LANG!=='undefined'&&LANG==='fr');
E.slot.style.display=on?'':'none';
var P=window.parent,took=false;
if(on&&wide&&P&&P!==window&&typeof P.rpTopActs==='function'){
took=P.rpTopActs([{id:'rt7-b-imp',html:'&#x1F4E4; '+(fr?'Importer bordereau':'استيراد البوردورو')},{id:'rt7-b-add',html:'&#x2795; '+(fr?'Ajouter':'إضافة يدوياً')},{id:'rt7-b-xls',html:'&#x1F4E5; Excel'}]);
}
document.body.classList.toggle('rt7-wide',wide);document.body.classList.toggle('rt7-phone',!wide);
if(wide){
E.slot.appendChild(E.q);E.slot.appendChild(E.ch);if(E.fb)E.slot.appendChild(E.fb);
E.bar.appendChild(E.ac);E.bar.style.display=took?'none':'';E.q.classList.remove('rt7-hide');
if(E.tg.parentNode)E.tg.parentNode.removeChild(E.tg);if(E.ft.parentNode)E.ft.parentNode.removeChild(E.ft);
if(E.fb)E.fb.classList.remove('rt7-hide');
}else{
E.slot.appendChild(E.tg);E.bar.style.display='';
var hasQ=!!E.q.value;E.q.classList.toggle('rt7-hide',!(RT7.open.q||hasQ));document.getElementById('rt7-tq').classList.toggle('on',!!(RT7.open.q||hasQ));
document.getElementById('rt7-ta').classList.toggle('on',!!RT7.open.a);
E.bar.innerHTML='';E.bar.appendChild(E.ac);E.bar.appendChild(E.q);E.bar.appendChild(E.ch);E.bar.appendChild(E.ft);if(E.fb)E.bar.appendChild(E.fb);
E.ac.classList.toggle('rt7-hide',!RT7.open.a);
E.ft.textContent=(RT7.open.f?'▴ ':'▾ ')+(fr?'Période':'الفترة');E.ft.classList.toggle('on',!!RT7.open.f);
if(E.fb)E.fb.classList.toggle('rt7-hide',!RT7.open.f);
}
}
window.rt7Lay=rt7Lay;
/* الهاتف: الضغط على الزبون كيحل/يسد التفاصيل والأزرار */
document.addEventListener('click',function(e){
if(rt7Wide())return;var r=e.target.closest&&e.target.closest('.rc-row');if(!r||e.target.closest('a,button,input,select'))return;
r.classList.toggle('open');
});
document.addEventListener('DOMContentLoaded',function(){
rt7Lay();
var pg=document.getElementById('page-renewals');
if(pg&&window.MutationObserver)new MutationObserver(rt7Lay).observe(pg,{attributes:true,attributeFilter:['class']});
var was=rt7Wide();window.addEventListener('resize',function(){var w=rt7Wide();if(w!==was){was=w;rt7Lay();}});
});
