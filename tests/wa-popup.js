const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(5000);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), o={};
   const opened=[]; let fake=null; window.open=function(u,n,f){ fake={closed:false,focus(){}}; opened.push([u,n,f]); return fake; };
   const c=Contacts.list.find(x=>x.phone&&!x.deleted&&!x.phone2); o.hasC=!!c; if(!c) return o;
   const nCalls=()=>((Contacts.get(c.id).callHistory)||[]).length; const n0=nCalls();
   sendMsg(c,'wa','مرحبا TEST','تذكير التجديد');
   o.url=opened[0][0].slice(0,60); o.name=opened[0][1]; o.popup=/popup=yes/.test(opened[0][2]||'');
   o.banner=!!document.getElementById('wa7-ban'); o.noLogYet=nCalls()===n0;
   fake.closed=true; await S(900); o.asked=document.getElementById('wa7-q').classList.contains('on');
   o.qText=document.querySelector('#wa7-q .wa7-t').textContent;
   App.acts['wa7-yes'](); await S(500); o.logged=nCalls()===n0+1; const last=Contacts.get(c.id).callHistory.slice(-1)[0]; o.lastRes=last.result+'|'+last.note;
   o.qClosed=!document.getElementById('wa7-q').classList.contains('on');
   /* ✗ */
   sendMsg(c,'wa','x','l'); fake.closed=true; await S(900); App.acts['wa7-no'](); await S(300); o.noNotLogged=nCalls()===n0+1;
   /* 🔁 */
   const k=opened.length; sendMsg(c,'wa','y','l'); fake.closed=true; await S(900); App.acts['wa7-again'](); o.again=opened.length===k+2 && /text=y/.test(opened[k+1][0]); o.pendingAfterAgain=!!WA._P();
   fake.closed=true; await S(900); App.acts['wa7-no'](); await S(200);
   /* focus return without closing popup */
   sendMsg(c,'wa','z','l'); window.dispatchEvent(new Event('blur')); await S(1300); window.dispatchEvent(new Event('focus')); await S(400); o.focusAsk=document.getElementById('wa7-q').classList.contains('on'); App.acts['wa7-no'](); await S(200);
   /* plain link (no client) → popup, no question */
   const a=document.createElement('a'); a.href='https://wa.me/212600000000'; a.target='_blank'; a.textContent='x'; document.body.appendChild(a); const k2=opened.length; a.click(); await S(100);
   o.linkOpen=opened.length===k2+1 && /web\.whatsapp\.com\/send\?phone=212600000000/.test(opened[k2][0]); o.linkNoQ=!WA._P(); a.remove();
   /* link inside contact sheet → question + log */
   Sheet.open(c.id); await S(300); const a2=document.createElement('a'); a2.href='https://wa.me/212611111111'; $('sheet-body').appendChild(a2); a2.click(); await S(50);
   o.sheetQ=!!WA._P() && WA._P().o.cid===c.id; fake.closed=true; await S(900); App.acts['wa7-yes'](); await S(400); o.sheetLogged=nCalls()===n0+2; Sheet.close();
   o.debtOverride=/WA\.open/.test(String(debtSend)); o.bulkOverride=/WA|sendMsg\(c, 'wa'/.test(String(App.acts['b-send']));
   o.sms = (function(){ let hr=null; try{ /* sms path untouched */ return /sendMsg0/.test(String(sendMsg)); }catch(e){return e.message} })();
   o.ver=App.version;
   return o; });
 console.log(JSON.stringify(r,null,1)); console.log(errs.join('|')||'noerr'); await p.screenshot({path:'wa716.png'}); await b.close(); })();
