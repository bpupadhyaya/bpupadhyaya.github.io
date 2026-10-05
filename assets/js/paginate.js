/* Reusable pagination. Mark a list container data-paginate="<name>" (optional data-paginate-label="Apps");
   its items are the children marked data-paginate-item, or all element children if none are marked.
   Without JS every item stays visible. State lives in the URL: ?<name>=<page> (page 1 omitted), one param per section.
   Page budget: PAGE_BUDGET items per page shared by the paginated sections present on the page,
   i.e. floor(PAGE_BUDGET / number of [data-paginate] containers) per section (10+10 with two, 20 with one).
   Search: one box (inserted above the first paginated section) filters ALL items of every section live; ?q=term joins the page params.
   Each item's search text = its visible text + img alt text + platform words (+ optional data-search), normalised once on load. */
(function () {
  'use strict';
  var PAGE_BUDGET = 20;
  var containers = Array.prototype.slice.call(document.querySelectorAll('[data-paginate]'));
  if (!containers.length) return;
  var perPage = Math.max(1, Math.floor(PAGE_BUDGET / containers.length));
  function norm(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  var query = '';
  var secs = containers.map(function (el) {
    var name = el.getAttribute('data-paginate');
    var marked = el.querySelectorAll(':scope > [data-paginate-item]');
    var items = Array.prototype.slice.call(marked.length ? marked : el.children);
    var label = el.getAttribute('data-paginate-label') || (name.charAt(0).toUpperCase() + name.slice(1));
    var idx = items.map(function (it) {
      var t = it.textContent + ' ' + (it.getAttribute('data-search') || '');
      Array.prototype.forEach.call(it.querySelectorAll('img[alt]'), function (im) { t += ' ' + im.alt; });
      var hrefs = Array.prototype.map.call(it.querySelectorAll('a[href]'), function (a) { return a.href; }).join(' ');
      if (/apps\.apple\.com/.test(hrefs)) t += ' ios iphone ipad app store';
      if (/play\.google\.com/.test(hrefs)) t += ' android google play';
      if (it.classList.contains('game-tile')) t += ' game standalone';
      return norm(t);
    });
    return { name: name, el: el, all: items, idx: idx, items: items, label: label, pages: 1, page: 1, pagers: [], status: null, note: null };
  });

  function applyFilter() {
    var words = norm(query).split(' ').filter(Boolean);
    secs.forEach(function (s) {
      s.items = s.all.filter(function (it, i) { return words.every(function (w) { return s.idx[i].indexOf(w) !== -1; }); });
      s.pages = Math.max(1, Math.ceil(s.items.length / perPage));
    });
  }
  function clamp(s, n) { n = parseInt(n, 10); return isNaN(n) ? 1 : Math.min(s.pages, Math.max(1, n)); }
  function readUrl() {
    var q = new URLSearchParams(location.search);
    query = (q.get('q') || '').slice(0, 200);
    applyFilter();
    secs.forEach(function (s) { s.page = clamp(s, q.get(s.name)); });
    if (box) box.value = query;
  }
  function urlFor(overrides) {
    var q = new URLSearchParams(location.search);
    secs.forEach(function (s) {
      var p = overrides && overrides[s.name] ? overrides[s.name] : s.page;
      if (p > 1) q.set(s.name, p); else q.delete(s.name);
    });
    if (query.trim()) q.set('q', query); else q.delete('q');
    var qs = q.toString();
    return location.pathname + (qs ? '?' + qs : '');
  }
  function pageItems(s) {
    var out = [1];
    for (var i = s.page - 1; i <= s.page + 1; i++) if (i > 1 && i < s.pages) out.push(i);
    if (s.pages > 1) out.push(s.pages);
    var res = [], last = 0;
    out.forEach(function (p) { if (p - last > 1) res.push(p - last === 2 ? last + 1 : 0); res.push(p); last = p; });
    return res;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function link(s, p, text, cls, aria) {
    var a = el('a', 'pager-btn' + (cls ? ' ' + cls : ''), text);
    a.href = urlFor(Object.fromEntries([[s.name, p]]));
    a.setAttribute('data-page', p);
    if (aria) a.setAttribute('aria-label', aria);
    return a;
  }
  function buildPager(s) {
    var nav = el('nav', 'pager');
    nav.setAttribute('aria-label', s.label + ' pages');
    var cap = el('div', 'pager-caption');
    cap.setAttribute('aria-live', 'polite');
    var from = (s.page - 1) * perPage + 1, to = Math.min(s.items.length, s.page * perPage);
    cap.textContent = s.label + ' ' + from + '-' + to + ' of ' + s.items.length;
    var ul = el('ul', 'pager-list');
    function li(node) { var l = el('li'); l.appendChild(node); ul.appendChild(l); }
    if (s.page > 1) li(link(s, s.page - 1, '‹ Prev', 'pager-step', 'Previous page of ' + s.label.toLowerCase()));
    else { var d = el('span', 'pager-btn pager-step disabled', '‹ Prev'); d.setAttribute('aria-disabled', 'true'); li(d); }
    pageItems(s).forEach(function (p) {
      if (!p) { var g = el('span', 'pager-gap', '…'); g.setAttribute('aria-hidden', 'true'); li(g); return; }
      var a = link(s, p, String(p), p === s.page ? 'current' : '', 'Page ' + p);
      if (p === s.page) a.setAttribute('aria-current', 'page');
      li(a);
    });
    if (s.page < s.pages) li(link(s, s.page + 1, 'Next ›', 'pager-step', 'Next page of ' + s.label.toLowerCase()));
    else { var d2 = el('span', 'pager-btn pager-step disabled', 'Next ›'); d2.setAttribute('aria-disabled', 'true'); li(d2); }
    nav.appendChild(cap); nav.appendChild(ul);
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-page]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      go(s, parseInt(a.getAttribute('data-page'), 10), nav === s.pagers[1] ? 1 : 0);
    });
    return nav;
  }
  function render(s) {
    var lo = (s.page - 1) * perPage, hi = s.page * perPage;
    var show = {};
    s.items.slice(lo, hi).forEach(function (it) { show[s.all.indexOf(it)] = 1; });
    s.all.forEach(function (it, i) { var h = !show[i]; if (it.hidden !== h) it.hidden = h; });
    renderStatus(s);
    s.pagers.forEach(function (p) { if (p.parentNode) p.parentNode.removeChild(p); });
    s.pagers = [];
    if (s.pages < 2) return;
    s.pagers = [buildPager(s), buildPager(s)];
    s.pagers[0].classList.add('pager-top'); s.pagers[1].classList.add('pager-bottom');
    s.pagers[0].id = 'pager-' + s.name;
    s.el.parentNode.insertBefore(s.pagers[0], s.el);
    s.el.parentNode.insertBefore(s.pagers[1], s.el.nextSibling);
  }
  function renderStatus(s) {
    if (!s.status) {
      s.status = el('p', 'search-status');
      s.el.parentNode.insertBefore(s.status, s.el);
    }
    var q = query.trim(), n = s.items.length, none = secs.every(function (x) { return !x.items.length; });
    var lw = s.label.toLowerCase();
    s.status.hidden = !q || (!n && none);
    s.status.textContent = !q ? '' : n ? s.label + ': ' + n + ' of ' + s.all.length + ' match \u201c' + q + '\u201d (all pages)' : 'No ' + lw + ' match \u201c' + q + '\u201d (searched all ' + s.all.length + ').';
    s.el.hidden = !n && !!q;
  }
  function renderAll() {
    secs.forEach(render);
    var q = query.trim(), none = secs.every(function (x) { return !x.items.length; });
    if (clearBtn) clearBtn.hidden = !q;
    if (msg) {
      msg.textContent = q && none ? 'Nothing matches \u201c' + q + '\u201d. ' : '';
      if (q && none) { var c = el('a', 'search-clear-link', 'Clear search'); c.href = urlFor({}); c.addEventListener('click', function (e) { e.preventDefault(); setQuery('', true); box.focus(); }); msg.appendChild(c); }
    }
    if (live) { var tot = secs.reduce(function (a, x) { return a + x.items.length; }, 0); live.textContent = q ? tot + (tot === 1 ? ' result' : ' results') : ''; }
  }
  function setQuery(v, push) {
    query = v; if (box) box.value = v;
    applyFilter();
    secs.forEach(function (s) { s.page = 1; });
    history.replaceState(null, '', urlFor());
    renderAll();
  }
  function scrollToSection(s, smooth) {
    var t = s.pagers[0] || s.el;
    t.scrollIntoView({ behavior: smooth === false ? 'auto' : undefined, block: 'start' });
  }
  function go(s, p, whichPager) {
    p = clamp(s, p);
    if (p === s.page) return;
    s.page = p;
    history.pushState(null, '', urlFor());
    renderAll();
    scrollToSection(s);
    var cur = s.pagers[whichPager] && s.pagers[whichPager].querySelector('[aria-current]');
    if (cur) cur.focus({ preventScroll: true });
  }
  function revealHash(scroll) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var t = document.getElementById(id);
    if (!t) return;
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      if (s.el === t || !s.el.contains(t)) continue;
      var item = s.all.filter(function (it) { return it === t || it.contains(t); })[0];
      if (!item) continue;
      if (s.items.indexOf(item) === -1) { query = ''; if (box) box.value = ''; applyFilter(); }
      var p = Math.floor(s.items.indexOf(item) / perPage) + 1;
      if (p !== s.page || !query) { s.page = p; history.replaceState(null, '', urlFor() + location.hash); renderAll(); }
      if (scroll) item.scrollIntoView({ block: 'start' });
      return;
    }
  }

  var box = null, clearBtn = null, msg = null, live = null, help = null;
  (function buildSearch() {
    var host = secs[0].el.closest('section') || secs[0].el.parentNode;
    var wrap = el('div', 'site-search');
    wrap.setAttribute('role', 'search');
    var row = el('div', 'site-search-row');
    box = el('input', 'site-search-input');
    box.type = 'text'; box.id = 'site-search-q'; box.autocomplete = 'off'; box.spellcheck = false;
    box.setAttribute('aria-label', 'Search all apps and games, not just this page'); box.setAttribute('inputmode', 'search'); box.setAttribute('enterkeyhint', 'search');
    box.placeholder = 'Search all apps and games\u2026';
    clearBtn = el('button', 'site-search-clear', '\u00d7');
    clearBtn.type = 'button'; clearBtn.setAttribute('aria-label', 'Clear search'); clearBtn.hidden = true;
    row.appendChild(box); row.appendChild(clearBtn);
    help = el('p', 'site-search-help');
    help.textContent = 'Searching ' + secs.map(function (x) { return 'all ' + x.all.length + ' ' + x.label.toLowerCase(); }).join(' and ') + ' (not just this page)';
    msg = el('p', 'site-search-msg');
    live = el('div', 'visually-hidden'); live.setAttribute('aria-live', 'polite');
    wrap.appendChild(row); wrap.appendChild(help); wrap.appendChild(msg); wrap.appendChild(live);
    host.parentNode.insertBefore(wrap, host);
    var timer;
    box.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { setQuery(box.value, false); }, 60); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.value) { e.preventDefault(); clearTimeout(timer); setQuery('', false); } });
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(timer); setQuery(box.value, false); } });
    clearBtn.addEventListener('click', function () { clearTimeout(timer); setQuery('', false); box.focus(); });
  })();
  readUrl();
  renderAll();
  revealHash(true);
  window.addEventListener('hashchange', function () { revealHash(true); });
  window.addEventListener('popstate', function () { readUrl(); renderAll(); revealHash(false); });
})();
