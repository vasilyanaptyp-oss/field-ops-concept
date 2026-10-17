(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- sample data: 18 wells on 4 batteries ---------- */
  var wells = [];
  for (var i = 1; i <= 18; i++) {
    var b = i <= 5 ? 1 : i <= 10 ? 2 : i <= 14 ? 3 : 4;
    var seed = (i * 37) % 23;
    wells.push({ id: 'W-' + String(i).padStart(2, '0'), battery: b, oil: 28 + seed, gas: 140 + seed * 4, water: 40 + (seed * 3) % 35,
                 tp: 120 + (seed * 2) % 40, cp: 82 + seed % 25, down: i === 12 ? 6 : i === 3 ? 1.5 : 0, status: i === 12 ? 'err' : 'ok' });
  }
  var cur = 6;                 // W-07
  var online = true, pending = 0;

  /* ---------- tablet ---------- */
  var fields = $$('.field');
  var limits = { tubing: [120, 160], casing: [80, 110] };
  function val(key) { return parseFloat($('.field[data-key="' + key + '"] output').textContent); }
  function setVal(key, v) { $('.field[data-key="' + key + '"] output').textContent = String(Math.round(v * 10) / 10); }
  function check() {
    var down = val('down');
    $('#reasons').hidden = !(down > 0);
    var bad = false;
    Object.keys(limits).forEach(function (k) {
      var v = val(k), f = $('.field[data-key="' + k + '"]'), out = v < limits[k][0] || v > limits[k][1];
      f.classList.toggle('alert', out); if (out) bad = true;
    });
    $('#warn').hidden = !bad;
  }
  fields.forEach(function (f) {
    var step = parseFloat(f.dataset.step), out = $('output', f);
    $('.minus', f).addEventListener('click', function () { out.textContent = String(Math.max(0, Math.round((parseFloat(out.textContent) - step) * 10) / 10)); check(); });
    $('.plus', f).addEventListener('click', function () { out.textContent = String(Math.round((parseFloat(out.textContent) + step) * 10) / 10); check(); });
  });
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () { $$('.chip').forEach(function (x) { x.setAttribute('aria-checked', x === c ? 'true' : 'false'); }); });
  });
  function loadWell() {
    var w = wells[cur];
    $('#wellName').textContent = w.id + ' · Battery ' + w.battery;
    $('#wellPos').textContent = (cur + 1) + ' / ' + wells.length;
    setVal('oil', w.oil); setVal('gas', w.gas); setVal('water', w.water); setVal('tubing', w.tp); setVal('casing', w.cp); setVal('down', w.down);
    ['oil', 'gas', 'water'].forEach(function (k) { $('.field[data-key="' + k + '"] .hint').textContent = 'Yesterday ' + w[k]; });
    $$('.chip').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
    check();
  }
  $('#prevWell').addEventListener('click', function () { cur = (cur + wells.length - 1) % wells.length; loadWell(); });
  $('#nextWell').addEventListener('click', function () { cur = (cur + 1) % wells.length; loadWell(); });

  function syncUi() {
    var btn = $('#syncBtn');
    btn.classList.toggle('off', !online);
    $('#syncText').textContent = online ? 'Online · all synced' : 'Offline · ' + pending + ' waiting';
    $('#offBanner').hidden = online;
    $('#offCount').textContent = pending + (pending === 1 ? ' entry' : ' entries');
  }
  $('#syncBtn').addEventListener('click', function () {
    online = !online;
    if (online && pending) {
      wells.forEach(function (w) { if (w.status === 'pend') w.status = 'ok'; });
      pending = 0; renderTable();
    }
    syncUi();
  });
  $('#saveBtn').addEventListener('click', function () {
    var w = wells[cur];
    w.oil = val('oil'); w.gas = val('gas'); w.water = val('water'); w.tp = val('tubing'); w.cp = val('casing'); w.down = val('down');
    w.status = online ? 'ok' : 'pend'; w.fresh = true;
    if (!online) pending++;
    renderTable(); syncUi();
    cur = (cur + 1) % wells.length; loadWell();
  });
  $('#photoBtn').addEventListener('click', function () { $('#photoBtn').textContent = 'Photo attached ✓'; });

  /* ---------- office ---------- */
  var filter = 'all';
  function renderTable() {
    var rows = wells.filter(function (w) { return filter === 'all' || String(w.battery) === filter; });
    var label = { ok: 'Synced', pend: 'Pending', err: 'Pump down' };
    $('#tbl tbody').innerHTML = rows.map(function (w) {
      return '<tr' + (w.fresh ? ' class="fresh"' : '') + '><td>' + w.id + '</td><td>Battery ' + w.battery + '</td><td class="n">' + w.oil + '</td><td class="n">' + w.gas +
        '</td><td class="n">' + w.water + '</td><td class="n">' + w.tp + '</td><td class="n">' + w.cp + '</td><td class="n">' + w.down +
        '</td><td><span class="schip ' + w.status + '">' + label[w.status] + '</span></td></tr>';
    }).join('');
    var sum = function (k) { return rows.reduce(function (a, w) { return a + w[k]; }, 0); };
    $('#kOil').textContent = Math.round(sum('oil')); $('#kGas').textContent = Math.round(sum('gas'));
    $('#kWater').textContent = Math.round(sum('water')); $('#kDown').textContent = sum('down');
  }
  $$('.fchip').forEach(function (c) {
    c.addEventListener('click', function () {
      filter = c.dataset.b; $$('.fchip').forEach(function (x) { x.classList.toggle('is-on', x === c); }); renderTable();
    });
  });
  $('#exportBtn').addEventListener('click', function () {
    var head = 'Well,Battery,Oil bbl,Gas mcf,Water bbl,Tubing psi,Casing psi,Downtime h\n';
    var body = wells.map(function (w) { return [w.id, w.battery, w.oil, w.gas, w.water, w.tp, w.cp, w.down].join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
    a.download = 'production-today.csv'; a.click();
  });

  loadWell(); renderTable(); syncUi();
})();
