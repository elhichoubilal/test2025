/* ═══ EUR assurance — 01-base.js ═══
   الأساس: المتغيّرات العامة، تحميل مكتبات PDF عند الحاجة، قراءة وحفظ السجل والمستخدمين والزبناء
   (مقتطع من app.js الأصلي، الأسطر 1–46، بالترتيب نفسه) */

/* كلمة سر المدير لا تُكتب في الكود: نحتفظ ببصمتها فقط. لتغييرها: احسب sha256('eur102|'+كلمة_السر) وضع الناتج هنا. */
var APWD_HASH='5cfb528125883cdb3027f6198aada5651403b7d4679b8ccdd71dfd2ea2cca1e3';
/* SHA-256 صغير (للتحقق من كلمة السر دون كتابتها في الكود) */
function sha256Hex(str){
  function rr(n,x){return(x>>>n)|(x<<(32-n));}
  var K=[],H=[],isC={},c=2,i,j;
  while(K.length<64){ if(!isC[c]){ for(i=c*c;i<313;i+=c)isC[i]=1; if(H.length<8)H.push((Math.pow(c,.5)*4294967296)|0); K.push((Math.pow(c,1/3)*4294967296)|0); } c++; }
  var bytes=unescape(encodeURIComponent(str)),len=bytes.length,words=[];
  for(i=0;i<len;i++)words[i>>2]|=bytes.charCodeAt(i)<<(24-(i%4)*8);
  words[len>>2]|=0x80<<(24-(len%4)*8);
  words[(((len+8)>>6)+1)*16-1]=len*8;
  for(i=0;i<words.length;i++)words[i]=words[i]|0;
  for(j=0;j<words.length;j+=16){
    var w=words.slice(j,j+16),a=H[0],b=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for(i=0;i<64;i++){
      if(i>=16){var s0=rr(7,w[i-15])^rr(18,w[i-15])^(w[i-15]>>>3),s1=rr(17,w[i-2])^rr(19,w[i-2])^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
      var t1=(h+(rr(6,e)^rr(11,e)^rr(25,e))+((e&f)^(~e&g))+K[i]+(w[i]|0))|0,t2=((rr(2,a)^rr(13,a)^rr(22,a))+((a&b)^(a&cc)^(b&cc)))|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=cc;cc=b;b=a;a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+cc)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  return H.map(function(x){return('00000000'+(x>>>0).toString(16)).slice(-8);}).join('');
}
function isAdminPwd(v){return sha256Hex('eur102|'+String(v==null?'':v))===APWD_HASH;}
var CUR={n:'',av:'',isAdmin:false};
var BM='none',LANG='ar',PAY_MODE='cash',DUR=6,USAGE='Personnel';
var PDF_TEMPLATES=[],ACTIVE_TPL_ID=null,TPL_CALIB_ID=null,TPL_FIELD_MODE=null,TPL_CANVAS_SCALE=1;

// ── تحميل مؤجَّل لمكتبات PDF الثقيلة: لا تُحمَّل إلا عند الحاجة الفعلية ──
function loadScriptOnce(src){
return new Promise(function(resolve,reject){
if(document.querySelector('script[data-lazy="'+src+'"]')){resolve();return;}
var s=document.createElement('script');
s.src=src;s.dataset.lazy=src;
s.onload=function(){resolve();};
s.onerror=function(){reject(new Error('تعذّر تحميل المكتبة — تحقق من الاتصال بالإنترنت'));};
document.head.appendChild(s);
});
}
function ensurePdfLib(){
return typeof PDFLib!=='undefined'?Promise.resolve():loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
}
function ensurePdfJs(){
if(typeof pdfjsLib!=='undefined')return Promise.resolve();
return loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.min.js').then(function(){
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js';
});
}
function ensureHtml2Canvas(){
return typeof html2canvas!=='undefined'?Promise.resolve():loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
var LAST_PIECE_NUM=null;
var HIST=[],USERS=[],CLIENTS=[];
var LAST={paid:0,off:0,diff:0};
var H_FILTER='today';var H_PICK_DATE='';
var LOCK_TIMER=null,LOCK_MINUTES=30;
var PREV_BAL=0;
var DIRECT_MODE=false;
var SEL_AV='👨';
var deferredPWA=null;

function ldH(){try{HIST=JSON.parse(localStorage.getItem('eurv102_h')||'[]');}catch(e){HIST=[];}}
function ldU(){try{USERS=JSON.parse(localStorage.getItem('eurv102_u')||'[]');}catch(e){USERS=[];}}
function ldC(){try{CLIENTS=JSON.parse(localStorage.getItem('eurv102_c')||'[]');}catch(e){CLIENTS=[];}}
function svH(){localStorage.setItem('eurv102_h',JSON.stringify(HIST));if(window.fbSet)window.fbSet('history',HIST);}
function svU(){localStorage.setItem('eurv102_u',JSON.stringify(USERS));if(window.fbSet)window.fbSet('users',USERS);}
function svC(){localStorage.setItem('eurv102_c',JSON.stringify(CLIENTS));if(window.fbSet)window.fbSet('clients',CLIENTS);}

