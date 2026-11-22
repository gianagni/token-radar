// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, the filters, a per-protocol detail view with the model's own
// inputs and the protocol's farm plan, and the Live view of protocols that already trade.
// No network: every byte it shows is in data.js. The page recomputes a row from the snapshot
// figures and checks the number board.json carries, so the page's code and the board's data
// are visibly the same arithmetic.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var model = DATA.model;
  var state = { q: '', category: 'all', scope: 'all', sort: 'implied', selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // The model in one function: the same arithmetic main.ts runs, recomputed here from the
  // row's own figures. A row whose recomputed value is more than $1 off its board value is
  // flagged in its detail view; the $1 is the rank tie-break's step-down.
  function impliedOf(row) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var breadth = Math.min(Math.max(row.chains.length - 1, 0), model.chain_max_steps);
    var chainMult = 1 + model.chain_step * breadth;
    return Math.max(1, Math.round(row.tvl_usd * row.multiple * growthMult * maturity * chainMult));
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('cat')) state.category = params.get('cat');
    if (params.get('scope')) state.scope = params.get('scope');
    if (params.get('sort')) state.sort = params.get('sort');
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('cat', state.category);
    if (state.scope !== 'all') params.set('scope', state.scope);
    if (state.sort !== 'implied') params.set('sort', state.sort);
    if (state.selected) params.set('p', state.selected);
    var h = params.toString();
    history.replaceState(null, '', h ? '#' + h : window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = DATA.rows.filter(function (r) {
      if (state.scope === 'watchlist' && !r.watchlist) return false;
      if (state.scope === 'early' && r.watchlist) return false;
      if (state.category !== 'all' && (r.category || '(none)') !== state.category) return false;
      if (q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var dir = -1;
    var key = state.sort;
    rows.sort(function (a, b) {
      var av, bv;
      if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? -1 : a.age_days; bv = b.age_days === null ? -1 : b.age_days; }
      else if (key === 'name') { return a.name.localeCompare(b.name); }
      else if (key === 'rank') { return a.rank - b.rank; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      return (bv - av) * (dir < 0 ? 1 : -1) || a.rank - b.rank;
    });
    return rows;
  }

  function rowHtml(r) {
    var badge = r.watchlist
      ? '<span class="badge">WATCHLIST</span>'
      : '<span class="badge early">EARLY</span>';
    var pct = fmtPct(r.change_7d);
    var pctCls = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'up' : 'down');
    var chains = r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '');
    return '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="selected"' : '') + '>' +
      '<td class="rank">' + r.rank + '</td>' +
      '<td><span class="name">' + esc(r.name) + '</span>' + badge + '</td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td class="chains">' + esc(chains || '—') + '</td>' +
      '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
      '<td class="num ' + pctCls + '">' + pct + '</td>' +
      '<td class="num"><strong>' + fmtUsd(r.implied_value_usd) + '</strong></td>' +
      '<td class="num">' + fmtAge(r.age_days) + '</td></tr>';
  }

  function renderBoard() {
    var rows = filteredRows();
    document.getElementById('rows').innerHTML = rows.map(rowHtml).join('');
    document.getElementById('count').textContent = rows.length + ' of ' + DATA.rows.length + ' protocols shown';
    document.querySelectorAll('#rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.getAttribute('data-slug'), true); });
    });
  }

  function renderDetail() {
    var section = document.getElementById('detail');
    var row = DATA.rows.find(function (r) { return r.slug === state.selected; });
    if (!row) { section.hidden = true; return; }
    section.hidden = false;
    document.getElementById('detail-title').textContent = '#' + row.rank + ' ' + row.name +
      ' — implied value ' + fmtUsd(row.implied_value_usd);
    var facts = [
      ['Status', 'Records no token (no market cap, CoinGecko id or symbol in the snapshot)'],
      ['Category', row.category || 'none named'],
      ['Chains', row.chains.join(', ') || 'none named'],
      ['TVL', fmtUsd(row.tvl_usd)],
      ['7-day TVL change', fmtPct(row.change_7d)],
      ['Listed', row.listed_at || 'unknown'],
      ['Age', fmtAge(row.age_days)],
      ['Scope', row.watchlist ? 'On the snapshot watchlist ($50M+ TVL)' : 'Early find below the watchlist floor'],
    ];
    document.getElementById('detail-facts').innerHTML = facts.map(function (f) {
      return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>';
    }).join('');
    var recomputed = impliedOf(row);
    var check = Math.abs(recomputed - row.implied_value_usd) <= 1
      ? 'recomputes to ' + fmtUsd(recomputed) + ' — matches the board'
      : 'recomputes to ' + fmtUsd(recomputed) + ' — differs from the board';
    var multipleNote = row.comparables > 0
      ? 'median mcap/TVL of ' + row.comparables + ' token-bearing ' + (row.category || '') + ' protocols'
      : 'snapshot-wide median (fewer than 4 comparables in this category)';
    var modelRows = [
      ['TVL', fmtUsd(row.tvl_usd)],
      ['Multiple', row.multiple.toFixed(3) + '× — ' + multipleNote],
      ['Growth ×', row.growth_multiplier.toFixed(3) + ' (7d ' + fmtPct(row.change_7d) + ')'],
      ['Maturity ×', row.maturity_multiplier.toFixed(3) + ' (age ' + fmtAge(row.age_days) + ')'],
      ['Chains ×', row.chain_multiplier.toFixed(3) + ' (' + row.chains.length + ' chains)'],
      ['Implied value', fmtUsd(row.implied_value_usd) + ' — ' + check],
    ];
    document.getElementById('detail-model').innerHTML = modelRows.map(function (f) {
      return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>';
    }).join('');
    document.getElementById('detail-steps').innerHTML = row.farm_steps.map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
  }

  function renderLive() {
    document.getElementById('live-rows').innerHTML = DATA.live.map(function (p) {
      var pct = fmtPct(p.change_7d);
      var pctCls = p.change_7d === null ? '' : (p.change_7d >= 0 ? 'up' : 'down');
      return '<tr><td><span class="name">' + esc(p.name) + '</span></td>' +
        '<td>' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + fmtUsd(p.tvl_usd) + '</td>' +
        '<td class="num"><strong>' + fmtUsd(p.mcap_usd) + '</strong></td>' +
        '<td class="num ' + pctCls + '">' + pct + '</td></tr>';
    }).join('');
  }

  function select(slug, scroll) {
    state.selected = slug;
    writeHash();
    renderBoard();
    renderDetail();
    if (scroll) document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    readHash();
    var cats = {};
    DATA.rows.forEach(function (r) { cats[r.category || '(none)'] = true; });
    var catSel = document.getElementById('cat');
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      catSel.appendChild(o);
    });
    document.getElementById('stats').innerHTML =
      '<div><dt>Ranked</dt><dd>' + DATA.board_size + '</dd></div>' +
      '<div><dt>Watchlist</dt><dd>' + DATA.watchlist_size + '</dd></div>' +
      '<div><dt>Early finds</dt><dd>' + DATA.early_size + '</dd></div>' +
      '<div><dt>Already trading</dt><dd>' + DATA.live_size + '</dd></div>';
    document.getElementById('asof').textContent = DATA.as_of;
    var q = document.getElementById('q');
    q.value = state.q;
    catSel.value = state.category;
    document.getElementById('scope').value = state.scope;
    document.getElementById('sort').value = state.sort;
    q.addEventListener('input', function () { state.q = q.value; writeHash(); renderBoard(); });
    catSel.addEventListener('change', function () { state.category = catSel.value; writeHash(); renderBoard(); });
    document.getElementById('scope').addEventListener('change', function (e) { state.scope = e.target.value; writeHash(); renderBoard(); });
    document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; writeHash(); renderBoard(); });
    document.querySelectorAll('#board-table thead th').forEach(function (th) {
      th.addEventListener('click', function () {
        var s = th.getAttribute('data-sort');
        if (s) { state.sort = s; document.getElementById('sort').value = s; writeHash(); renderBoard(); }
      });
    });
    renderBoard();
    renderDetail();
    renderLive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
