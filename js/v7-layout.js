/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-layout.js   (نفس الشكل فجميع الأقسام)
   الحاسوب: أزرار القسم فالشريط العلوي، والعنوان + البحث + الأرقام + الفلاتر فسطر واحد
            (إلا ما دخلوش كيطيحو للسطر الثاني بوحدهم).
   الهاتف:  العنوان + 🔍 + ⋯ · الأرقام سطر واحد كيتسحب · الفلاتر مسدودين (▾) · الأزرار فـ⋯.
   كنحرّكو غير العناصر اللي رسمها القسم (نفس الـid ونفس الأزرار)، ما كنبدّلو حتى منطق.
   الوصفة: search = خانة البحث · row = الأرقام والفلاتر · fil = الفلاتر الثانوية (كيتسدّو فالهاتف)
           acts = أزرار القسم · head = حاجة كتمشي حدا العنوان · drop = عناوين قديمة كتختفي · after = كيتحط تحت
══════════════════════════════════════════════════════════ */
'use strict';
var LAY7 = {
  renew: { search: '#r-shell > .bar > .search', row: ['#r-chips'], acts: ['#r-shell > .bar'] },
  debts: { search: '#d-shell > .bar > .search', row: ['#d-chips'], fil: ['#d-top'], acts: ['#d-shell > .bar', '.d-tools'] },
  sin: { search: '.sin-filt > .search', row: ['#sin-chips'], fil: ['.sin-filt'], acts: ['.sin-acts'], drop: ['.sin-title'] },
  bank: { search: '.bk-tools > .search', row: ['.bk-accs', '.bk-accs + .hint + .chips'], fil: ['.bk-tools'], acts: ['.bk-acts'], drop: ['.sin-title'], after: ['.bk-accs + .hint'] },
  tasks: { head: ['.tk-nav'], row: ['.tk-page > .chips'], acts: ['.tk-bar'] },
  files: { search: '.card > .search', row: ['.card > .chips'], drop: ['.card:first-child > .card-t'] },
  archive: { drop: ['.card:first-child > .card-t'], search: '.page > .bar > .search', acts: ['.page > .bar'] },
  phones: { drop: ['.card:first-child > .card-t'] },
  prod: { drop: ['.card:first-child > .card-t'] },
  logs: { row: ['.lg7 > .chips'], acts: ['.log7-acts'] }
};
var Lay7 = { open: {} };                                  // حالة 🔍 / ▾ / ⋯ ديال كل قسم فالهاتف

var IC7L = {
  q: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
};

/* الشريط العلوي: أزرار القسم الحالي (الحاسوب فقط) */
function topActs7(nodes) {
  var slot = $('top-acts'); if (!slot) return;
  slot.innerHTML = ''; (nodes || []).forEach(function (n) { slot.appendChild(n); });
  slot.classList.toggle('on', !!slot.children.length);
}
App.on('page', function () { topActs7([]); });

function lay7(id, el) {
  var cfg = LAY7[id], page = el && el.querySelector('.page'); if (!cfg || !page) return;
  if (page.querySelector(':scope > .pg7-hd')) { var sl = $('top-acts'); if (page._acts7 && isDesktop() && sl && !sl.children.length) topActs7(page._acts7); return; }
  var m = App.mod(id); if (!m) return;
  var q1 = function (sel) { try { return page.querySelector(sel); } catch (e) { return null; } };
  var act = document.activeElement, keep = act && page.contains(act) && /INPUT|TEXTAREA/.test(act.tagName) ? { el: act, s: act.selectionStart, e: act.selectionEnd } : null;
  var get = function (list) { return (list || []).map(q1).filter(Boolean); };
  var nS = cfg.search ? get([cfg.search])[0] : null, nHead = get(cfg.head), nRow = get(cfg.row), nFil = get(cfg.fil), nActs = get(cfg.acts), nDrop = get(cfg.drop), nAfter = get(cfg.after);
  var desk = isDesktop(), st = Lay7.open[id] || (Lay7.open[id] = {});
  var title = esc(typeof t7 === 'function' ? t7(m) : L(m.title[0], m.title[1]));
  nDrop.forEach(function (n) { n.classList.add('pg7-gone'); });
  nActs.forEach(function (n) { n.classList.add('pg7-acts'); });
  page.classList.add('pg7');

  var hd = document.createElement('div');
  if (desk) {
    /* سطر واحد: العنوان، البحث، الأرقام، الفلاتر. الأزرار فالشريط العلوي */
    hd.className = 'pg7-hd pg7-one';
    hd.innerHTML = '<h1>' + title + '</h1>';
    if (nS) { nS.classList.add('pg7-q'); hd.appendChild(nS); }
    nHead.concat(nRow, nFil).forEach(function (n) { hd.appendChild(n); });
    page.insertBefore(hd, page.firstChild);
    page._acts7 = nActs; topActs7(nActs);
  } else {
    var qVal = nS && nS.querySelector('input') && nS.querySelector('input').value;
    hd.className = 'pg7-hd pg7-ph';
    hd.innerHTML = '<h1>' + title + '</h1><span class="pg7-sp"></span>'
      + (nS ? '<button class="pg7-ib' + (st.q || qVal ? ' on' : '') + '" data-act="pg7-t" data-k="q" data-id="' + id + '" aria-label="' + L('بحث', 'Recherche') + '">' + IC7L.q + '</button>' : '')
      + (nActs.length ? '<button class="pg7-ib' + (st.a ? ' on' : '') + '" data-act="pg7-t" data-k="a" data-id="' + id + '" aria-label="' + L('المزيد', 'Plus') + '">' + IC7L.more + '</button>' : '');
    nHead.forEach(function (n) { hd.insertBefore(n, hd.querySelector('.pg7-sp')); });
    var box = document.createElement('div'); box.className = 'pg7-box';
    if (nActs.length) { var ab = document.createElement('div'); ab.className = 'pg7-actsbox' + (st.a ? ' open' : ''); nActs.forEach(function (n) { ab.appendChild(n); }); box.appendChild(ab); }
    if (nS) { nS.classList.add('pg7-q'); if (!(st.q || qVal)) nS.classList.add('pg7-hide'); box.appendChild(nS); }
    if (nRow.length) { var rw = document.createElement('div'); rw.className = 'pg7-scroll'; nRow.forEach(function (n) { rw.appendChild(n); }); box.appendChild(rw); }
    if (nFil.length) {
      var ft = document.createElement('button'); ft.className = 'pg7-ftog' + (st.f ? ' on' : ''); ft.setAttribute('data-act', 'pg7-t'); ft.dataset.k = 'f'; ft.dataset.id = id;
      ft.textContent = (st.f ? '▴ ' : '▾ ') + L('الفلاتر', 'Filtres'); box.appendChild(ft);
      var fb = document.createElement('div'); fb.className = 'pg7-fil' + (st.f ? ' open' : ''); nFil.forEach(function (n) { fb.appendChild(n); }); box.appendChild(fb);
    }
    page.insertBefore(box, page.firstChild); page.insertBefore(hd, box);
  }
  var ref = hd.nextSibling && hd.nextSibling.classList && hd.nextSibling.classList.contains('pg7-box') ? hd.nextSibling : hd;
  nAfter.reverse().forEach(function (n) { ref.parentNode.insertBefore(n, ref.nextSibling); });
  if (keep && document.activeElement !== keep.el) { try { keep.el.focus({ preventScroll: true }); keep.el.setSelectionRange(keep.s, keep.e); } catch (e) { } }
}
/* الهاتف: فتح/سدّ 🔍 البحث، ⋯ الأزرار، ▾ الفلاتر (بلا ما نعاودو نرسمو القسم) */
App.act('pg7-t', function (el) {
  var id = el.dataset.id, k = el.dataset.k, st = Lay7.open[id] || (Lay7.open[id] = {}), page = el.closest('.page'); if (!page) return;
  st[k] = !st[k]; el.classList.toggle('on', st[k]);
  if (k === 'q') { var q = page.querySelector('.pg7-q'); if (q) { q.classList.toggle('pg7-hide', !st.q); var i = q.querySelector('input'); if (st.q && i) i.focus(); } }
  if (k === 'a') { var a = page.querySelector('.pg7-actsbox'); if (a) a.classList.toggle('open', st.a); }
  if (k === 'f') { var f = page.querySelector('.pg7-fil'); if (f) f.classList.toggle('open', st.f); el.textContent = (st.f ? '▴ ' : '▾ ') + L('الفلاتر', 'Filtres'); }
});
App.on('login', function () {
  Object.keys(LAY7).forEach(function (id) {
    var m = App.mod(id); if (!m || m._lay7) return; m._lay7 = 1;
    var r = m.render; m.render = function (el) { var out = r.apply(this, arguments); try { lay7(id, el); } catch (e) { console.error('lay7 ' + id, e); } return out; };
  });
});

/* صفحات الحاسبة: الحاسبة كتعطينا الأزرار ديالها (اسم + id)، وحنا كنديرو أزرار فالشريط العلوي كيضغطو عليهم داخلها */
window.rpTopActs = function (list) {
  if (!isDesktop() || typeof isCalcMod !== 'function' || !isCalcMod(App.page)) { topActs7([]); return false; }
  topActs7((list || []).map(function (a) {
    var b = document.createElement('button'); b.className = 'btn pg7-acts1'; b.setAttribute('data-act', 'calc-proxy'); b.dataset.id = a.id; b.innerHTML = a.html; return b; }));
  return !!(list && list.length);
};
App.act('calc-proxy', function (el) {
  var d = null; try { d = Calc.frame.contentDocument; } catch (e) { } var b = d && d.getElementById(el.dataset.id); if (b) b.click();
});
/* رجعتي لصفحة ديال الحاسبة: كنطلبو منها الأزرار ديالها من جديد */
App.on('page', function (id) {
  if (typeof isCalcMod !== 'function' || !isCalcMod(id)) return;
  setTimeout(function () { try { var w = Calc.frame && Calc.frame.contentWindow; if (w && typeof w.rt7Lay === 'function') w.rt7Lay(); } catch (e) { } }, 60);
});
