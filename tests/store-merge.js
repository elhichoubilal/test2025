const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), cloud=k=>CalcStore.get(k).then(j=>JSON.parse(j||'[]')), t=Cash.today();
   const base = JSON.stringify(await cloud('history'));                        // آخر نسخة شافها هاد الجهاز
   const theirs = JSON.parse(base); theirs.unshift({num:'EUR-2026-9002',date:t,time:'10:01',user:'them',client:'THEIRS',paid:1,off:1,diff:0,payMode:'cash',ins:'x'});
   await CalcStore.set('history', JSON.stringify(theirs));                    // جهاز آخر كتب
   Store8._S.lastRemote.history = base;                                         // هاد الجهاز مازال ما وصلوش الخبر
   const mine = JSON.parse(base); mine.unshift({num:'EUR-2026-9001',date:t,time:'10:00',user:'me',client:'MINE',paid:1,off:1,diff:0,payMode:'cash',ins:'x'});
   await Store8.set('history', mine); await S(500);
   const M = await cloud('history'); return ['MINE','THEIRS'].map(n=>n+':'+!!M.find(h=>h.client===n)).join(',') + ' total ' + M.length + ' (base ' + JSON.parse(base).length + ')'; });
 console.log(r, errs.join('|')||'noerr'); await b.close(); })();
