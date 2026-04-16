// ── ui.js — Rendering, Tables, Print, Toasts, Modals ──

function fmt(n) { return Number(n).toLocaleString('en-IN'); }
function fmtDate(s) {
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return String(d.getDate()).padStart(2,'0') + '/' +
           String(d.getMonth()+1).padStart(2,'0') + '/' +
           String(d.getFullYear()).slice(-2);
  } catch { return s; }
}
function show(id) { document.getElementById(id).classList.add('show'); }
function hide(id) { document.getElementById(id).classList.remove('show'); }

function showError(m) {
  const e = document.getElementById('errorBox');
  e.textContent = m; e.classList.add('show');
}

function showInvalidReceiptError(reason) {
  document.getElementById('invalidReason').textContent = reason;
  document.getElementById('invalidBox').classList.add('show');
  imageBase64 = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadZone').style.display = '';
  document.getElementById('previewRow').classList.remove('show');
  document.getElementById('invalidBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showToast(msg, type) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-family:var(--mono);font-size:12px;padding:10px 20px;border-radius:8px;z-index:9999;transition:opacity 0.3s;pointer-events:none;white-space:nowrap';
    document.body.appendChild(toast);
  }
  if (type === 'success') toast.style.borderColor = 'var(--accent)';
  else if (type === 'error') toast.style.borderColor = 'var(--danger)';
  else toast.style.borderColor = 'var(--border2)';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

function toggleInst() {
  const b = document.getElementById('instBody'), a = document.getElementById('instArrow');
  const o = b.classList.toggle('open'); a.classList.toggle('open', o);
}

// ── READ-ONLY cell ──
function roCell(val) {
  return '<span class="ro-val" style="display:inline-block;min-width:30px;padding:1px 2px">' + val + '</span>';
}

// ── EDITABLE Brought Back cell ──
function bbCell(val, denom) {
  return '<span class="editable bb-editable" contenteditable="true" data-field="bb" data-denom="' + denom + '" oninput="onBBInput(this)" placeholder="0">' + val + '</span>';
}

// ── Called on every Brought Back keystroke ──
function onBBInput(el) {
  const row = el.closest('tr');
  recalcRow(row);
  recalcTotals();
  recalcPhysicalBalance();
}

// ── Recalculate one row's Excess and Short from Remaining vs Brought Back ──
function recalcRow(row) {
  const isBNA   = row.dataset.machine === 'BNA';
  const roSpans = row.querySelectorAll('.ro-val:not(.cell-excess):not(.cell-short)');

  // Remaining index among ro-val spans (excluding excess/short cells):
  // BNA: opening(0), dep(1), dis(2), rem(3), loading(4)
  // ATM: opening(0), dis(1), rem(2), loading(3)
  const remIdx = isBNA ? 3 : 2;
  const rem = parseInt((roSpans[remIdx]?.innerText || '0').replace(/,/g,'')) || 0;

  const bbEl  = row.querySelector('[data-field="bb"]');
  const bb    = parseInt((bbEl?.innerText || bbEl?.textContent || '0').replace(/,/g,'')) || 0;

  const diff   = bb - rem;
  const excess = diff > 0 ? diff : 0;
  const short  = diff < 0 ? -diff : 0;

  const exEl = row.querySelector('.cell-excess');
  const shEl = row.querySelector('.cell-short');
  if (exEl) exEl.textContent = fmt(excess);
  if (shEl) shEl.textContent = fmt(short);
}

// ── renderResult ──
// Columns: Denom | Opening | [Deposited BNA] | Dispensed | Remaining | Brought Back✎ | Excess | Short | Loading
// Physical Balance = sum(Brought Back × denom)
function renderResult(data, loading) {
  const mt = (data.machine_type || 'BNA').toUpperCase();
  currentMachineType = mt;
  const isBNA = mt === 'BNA';

  const dateStr = mt + ' \u2014 ' + fmtDate(data.date || '');
  const refStr  = 'ATM: ' + (data.atm_id || '\u2014') + ' \u00b7 REF: ' + (data.ref_no || '\u2014');
  document.getElementById('resultDate').textContent = dateStr;
  document.getElementById('resultRef').textContent  = refStr;
  document.getElementById('printMeta').textContent  = refStr + ' \u00b7 ' + dateStr;
  document.getElementById('printImg').src = document.getElementById('previewImg').src;

  if (isBNA) {
    const t2 = data.type2||{}, t3 = data.type3||{}, t4 = data.type4||{};
    const rows = [
      { label:'₹100', denom:100, opening:t2.loaded||0, dep:t2.deposited||0, dis:t2.dispensed||0, rem:t2.remaining||0, loading:loading.l100 },
      { label:'₹500', denom:500, opening:t3.loaded||0, dep:t3.deposited||0, dis:t3.dispensed||0, rem:t3.remaining||0, loading:loading.l500 },
      { label:'₹200', denom:200, opening:t4.loaded||0, dep:t4.deposited||0, dis:t4.dispensed||0, rem:t4.remaining||0, loading:loading.l200 }
    ];

    document.getElementById('tableHead').innerHTML =
      '<tr>' +
      '<th>Denom</th><th>Opening</th><th>Deposited</th><th>Dispensed</th><th>Remaining</th>' +
      '<th style="color:#4db8ff">Brought Back \u270e</th>' +
      '<th style="color:var(--accent)">Excess</th>' +
      '<th style="color:var(--warn)">Short</th>' +
      '<th>Loading</th>' +
      '</tr>';

    document.getElementById('tableBody').innerHTML = rows.map(r =>
      '<tr data-denom="' + r.denom + '" data-machine="BNA">' +
      '<td>' + r.label + '</td>' +
      '<td>' + roCell(r.opening)  + '</td>' +
      '<td>' + roCell(r.dep)      + '</td>' +
      '<td>' + roCell(r.dis)      + '</td>' +
      '<td>' + roCell(r.rem)      + '</td>' +
      '<td class="bb-col">' + bbCell(0, r.denom) + '</td>' +
      '<td><span class="cell-excess ro-val" style="color:var(--accent)">0</span></td>' +
      '<td><span class="cell-short ro-val" style="color:var(--warn)">' + fmt(r.rem) + '</span></td>' +
      '<td>' + roCell(r.loading)  + '</td>' +
      '</tr>'
    ).join('');

    const tO   = rows.reduce((s,r)=>s+r.opening*r.denom,0);
    const tD   = rows.reduce((s,r)=>s+r.dep*r.denom,0);
    const tDi  = rows.reduce((s,r)=>s+r.dis*r.denom,0);
    const tR   = rows.reduce((s,r)=>s+r.rem*r.denom,0);
    const tL   = rows.reduce((s,r)=>s+r.loading*r.denom,0);

    document.getElementById('tableFoot').innerHTML =
      '<tr class="total-row">' +
      '<td>Totals</td>' +
      '<td id="tOpening">' + fmt(tO)  + '</td>' +
      '<td id="tDep">'     + fmt(tD)  + '</td>' +
      '<td id="tDis">'     + fmt(tDi) + '</td>' +
      '<td id="tRem">'     + fmt(tR)  + '</td>' +
      '<td id="tBB">0</td>' +
      '<td id="tEx">0</td>' +
      '<td id="tShort">0</td>' +
      '<td id="tLoading">' + fmt(tL)  + '</td>' +
      '</tr>';

  } else {
    const t1=data.type1||{}, t2=data.type2||{}, t3=data.type3||{}, t4=data.type4||{};
    const rows = [
      { label:'₹100', denom:100, opening:t1.loaded||0, dis:t1.dispensed||0, rem:t1.remaining||0, loading:loading.l100 },
      { label:'₹500', denom:500, opening:(t2.loaded||0)+(t4.loaded||0), dis:(t2.dispensed||0)+(t4.dispensed||0), rem:(t2.remaining||0)+(t4.remaining||0), loading:loading.l500 },
      { label:'₹200', denom:200, opening:t3.loaded||0, dis:t3.dispensed||0, rem:t3.remaining||0, loading:loading.l200 }
    ];

    document.getElementById('tableHead').innerHTML =
      '<tr>' +
      '<th>Denom</th><th>Opening</th><th>Dispensed</th><th>Remaining</th>' +
      '<th style="color:#4db8ff">Brought Back \u270e</th>' +
      '<th style="color:var(--accent)">Excess</th>' +
      '<th style="color:var(--warn)">Short</th>' +
      '<th>Loading</th>' +
      '</tr>';

    document.getElementById('tableBody').innerHTML = rows.map(r =>
      '<tr data-denom="' + r.denom + '" data-machine="ATM">' +
      '<td>' + r.label + '</td>' +
      '<td>' + roCell(r.opening) + '</td>' +
      '<td>' + roCell(r.dis)     + '</td>' +
      '<td>' + roCell(r.rem)     + '</td>' +
      '<td class="bb-col">' + bbCell(0, r.denom) + '</td>' +
      '<td><span class="cell-excess ro-val" style="color:var(--accent)">0</span></td>' +
      '<td><span class="cell-short ro-val" style="color:var(--warn)">' + fmt(r.rem) + '</span></td>' +
      '<td>' + roCell(r.loading) + '</td>' +
      '</tr>'
    ).join('');

    const tO  = rows.reduce((s,r)=>s+r.opening*r.denom,0);
    const tDi = rows.reduce((s,r)=>s+r.dis*r.denom,0);
    const tR  = rows.reduce((s,r)=>s+r.rem*r.denom,0);
    const tL  = rows.reduce((s,r)=>s+r.loading*r.denom,0);

    document.getElementById('tableFoot').innerHTML =
      '<tr class="total-row">' +
      '<td>Totals</td>' +
      '<td id="tOpening">' + fmt(tO)  + '</td>' +
      '<td id="tDis">'     + fmt(tDi) + '</td>' +
      '<td id="tRem">'     + fmt(tR)  + '</td>' +
      '<td id="tBB">0</td>' +
      '<td id="tEx">0</td>' +
      '<td id="tShort">0</td>' +
      '<td id="tLoading">' + fmt(tL)  + '</td>' +
      '</tr>';
  }

  show('resultWrap'); show('resetBar');
  document.getElementById('balancesCard').classList.add('show');
  document.getElementById('scanBtn').disabled = false;
  balancesCalculated = false;
  updateActionButtons();
  recalcPhysicalBalance();
  document.getElementById('resultWrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── recalcTotals ──
function recalcTotals() {
  const isBNA = currentMachineType === 'BNA';
  let tO=0, tDep=0, tDis=0, tRem=0, tBB=0, tEx=0, tSh=0, tL=0;

  document.querySelectorAll('#tableBody tr').forEach(row => {
    const d       = parseInt(row.dataset.denom) || 1;
    const roSpans = row.querySelectorAll('.ro-val:not(.cell-excess):not(.cell-short)');
    const bbEl    = row.querySelector('[data-field="bb"]');
    const exEl    = row.querySelector('.cell-excess');
    const shEl    = row.querySelector('.cell-short');

    tBB += (parseInt((bbEl?.innerText || bbEl?.textContent || '0').replace(/,/g,'')) || 0) * d;
    tEx += (parseInt((exEl?.innerText || exEl?.textContent || '0').replace(/,/g,'')) || 0) * d;
    tSh += (parseInt((shEl?.innerText || shEl?.textContent || '0').replace(/,/g,'')) || 0) * d;

    if (isBNA) {
      tO   += (parseInt((roSpans[0]?.innerText||'0').replace(/,/g,''))||0) * d;
      tDep += (parseInt((roSpans[1]?.innerText||'0').replace(/,/g,''))||0) * d;
      tDis += (parseInt((roSpans[2]?.innerText||'0').replace(/,/g,''))||0) * d;
      tRem += (parseInt((roSpans[3]?.innerText||'0').replace(/,/g,''))||0) * d;
      tL   += (parseInt((roSpans[4]?.innerText||'0').replace(/,/g,''))||0) * d;
    } else {
      tO   += (parseInt((roSpans[0]?.innerText||'0').replace(/,/g,''))||0) * d;
      tDis += (parseInt((roSpans[1]?.innerText||'0').replace(/,/g,''))||0) * d;
      tRem += (parseInt((roSpans[2]?.innerText||'0').replace(/,/g,''))||0) * d;
      tL   += (parseInt((roSpans[3]?.innerText||'0').replace(/,/g,''))||0) * d;
    }
  });

  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
  safe('tOpening', tO);
  safe('tDis', tDis);
  safe('tRem', tRem);
  safe('tBB',  tBB);
  safe('tEx',  tEx);
  safe('tShort', tSh);
  safe('tLoading', tL);
  if (isBNA) safe('tDep', tDep);
}

// ── recalcPhysicalBalance ──
function recalcPhysicalBalance() {
  let tBB = 0, tEx = 0, tSh = 0;
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const d    = parseInt(row.dataset.denom) || 1;
    const bbEl = row.querySelector('[data-field="bb"]');
    const exEl = row.querySelector('.cell-excess');
    const shEl = row.querySelector('.cell-short');
    tBB += (parseInt((bbEl?.innerText || bbEl?.textContent || '0').replace(/,/g,'')) || 0) * d;
    tEx += (parseInt((exEl?.innerText || exEl?.textContent || '0').replace(/,/g,'')) || 0) * d;
    tSh += (parseInt((shEl?.innerText || shEl?.textContent || '0').replace(/,/g,'')) || 0) * d;
  });

  currentBroughtBack = tBB;

  document.getElementById('bbCalc').innerHTML = '';

  document.getElementById('bbValue').textContent = '\u20b9' + fmt(tBB);

  let note = '';
  if (tBB === 0)               note = 'Enter Brought Back amounts above \u2191';
  else if (tEx > 0 && tSh > 0) note = 'Excess \u20b9' + fmt(tEx) + ' \u00b7 Short \u20b9' + fmt(tSh);
  else if (tEx > 0)             note = 'Excess \u20b9' + fmt(tEx) + ' detected';
  else if (tSh > 0)             note = 'Short \u20b9'  + fmt(tSh) + ' detected';
  else                          note = 'All cassettes tallied \u2713';
  document.getElementById('bbNote').textContent = note;
}

// recalculate() — called by Recalculate button
function recalculate() {
  document.querySelectorAll('#tableBody tr').forEach(row => recalcRow(row));
  recalcTotals();
  recalcPhysicalBalance();
}
function autoRecalc(el) { recalculate(); }

// ── calcBalances ──
function calcBalances() {
  const sw  = parseInt(document.getElementById('switchBal').value) || 0;
  const gl  = parseInt(document.getElementById('glBal').value)     || 0;
  const phy = currentBroughtBack;
  if (!sw && !gl) { showToast('Please enter Switch and GL balances.', 'error'); return; }
  if (!phy)       { showToast('Please enter Brought Back amounts first.', 'error'); return; }
  const pvg = phy - gl, pvs = phy - sw;
  const grid = document.getElementById('trafficGrid');
  grid.style.display = 'flex'; grid.innerHTML = '';
  grid.appendChild(mkTraffic('Brought Back',       phy, 'Actual', true));
  grid.appendChild(mkTraffic('Physical vs GL',     pvg, pvg===0?'Tallied':pvg>0?'Excess':'Short'));
  grid.appendChild(mkTraffic('Physical vs Switch', pvs, pvs===0?'Tallied':pvs>0?'Excess':'Short'));
  lastSwitchBal = sw; lastGLBal = gl;
  balancesCalculated = true;
  updateActionButtons();
}

function mkTraffic(label, value, badge, neutral=false) {
  const div = document.createElement('div');
  const cls = neutral ? 'green' : value===0?'green':value>0?'amber':'red';
  div.className = 'traffic-item ' + cls;
  const sign = (!neutral && value!==0) ? (value>0?'+':'-') : '';
  div.innerHTML = '<div class="traffic-label">' + label + '</div>' +
    '<div style="display:flex;align-items:center;gap:10px">' +
    '<div class="traffic-value">' + sign + '\u20b9' + fmt(Math.abs(value)) + '</div>' +
    '<div class="traffic-badge">' + badge + '</div></div>';
  return div;
}

function updateActionButtons() {
  const saveBtn  = document.getElementById('saveBtn');
  const emailBtn = document.getElementById('emailBtn');
  if (saveBtn)  saveBtn.disabled  = !balancesCalculated || saveBtn.dataset.saved === 'true';
  if (emailBtn) emailBtn.disabled = !balancesCalculated;
}

// ── collectTableRows: for saving to history ──
function collectTableRows() {
  const isBNA = currentMachineType === 'BNA';
  const rows = [];
  document.querySelectorAll('#tableBody tr').forEach(row => {
    const denom   = parseInt(row.dataset.denom) || 1;
    const roSpans = row.querySelectorAll('.ro-val:not(.cell-excess):not(.cell-short)');
    const bbEl    = row.querySelector('[data-field="bb"]');
    const exEl    = row.querySelector('.cell-excess');
    const shEl    = row.querySelector('.cell-short');

    const bb = parseInt((bbEl?.innerText || bbEl?.textContent || '0').replace(/,/g,'')) || 0;
    const ex = parseInt((exEl?.innerText || exEl?.textContent || '0').replace(/,/g,'')) || 0;
    const sh = parseInt((shEl?.innerText || shEl?.textContent || '0').replace(/,/g,'')) || 0;

    let r = { denom, broughtBack: bb, excess: ex, short: sh };
    if (isBNA) {
      r.opening   = parseInt((roSpans[0]?.innerText||'0').replace(/,/g,''))||0;
      r.deposited = parseInt((roSpans[1]?.innerText||'0').replace(/,/g,''))||0;
      r.dispensed = parseInt((roSpans[2]?.innerText||'0').replace(/,/g,''))||0;
      r.remaining = parseInt((roSpans[3]?.innerText||'0').replace(/,/g,''))||0;
      r.loading   = parseInt((roSpans[4]?.innerText||'0').replace(/,/g,''))||0;
    } else {
      r.opening   = parseInt((roSpans[0]?.innerText||'0').replace(/,/g,''))||0;
      r.dispensed = parseInt((roSpans[1]?.innerText||'0').replace(/,/g,''))||0;
      r.remaining = parseInt((roSpans[2]?.innerText||'0').replace(/,/g,''))||0;
      r.loading   = parseInt((roSpans[3]?.innerText||'0').replace(/,/g,''))||0;
    }
    rows.push(r);
  });
  return rows;
}

// ── Print ──
function doPrint() {
  const isBNA = currentMachineType === 'BNA';
  let html = '<div class="print-result">';
  html += '<div class="print-result-header">';
  html += '<div class="print-date">' + document.getElementById('resultDate').textContent + '</div>';
  html += '<div class="print-ref">'  + document.getElementById('resultRef').textContent  + '</div>';
  html += '</div>';
  html += '<table><thead>' + document.getElementById('tableHead').innerHTML + '</thead>';
  html += '<tbody>' + document.getElementById('tableBody').innerHTML + '</tbody>';
  html += '<tfoot>' + document.getElementById('tableFoot').innerHTML + '</tfoot></table>';
  html += '<div class="print-balance">';
  html += '<div class="print-balance-label">Physical Balance</div>';
  html += '<div class="print-balance-value">\u20b9' + fmt(currentBroughtBack) + '</div>';
  html += '<div class="print-balance-note">' + document.getElementById('bbNote').textContent + '</div>';
  html += '</div></div>';
  const tGrid = document.getElementById('trafficGrid');
  if (tGrid.style.display !== 'none' && tGrid.children.length > 0) {
    html += '<div class="print-traffic">';
    Array.from(tGrid.children).forEach(item => {
      const label = item.querySelector('.traffic-label')?.textContent || '';
      const value = item.querySelector('.traffic-value')?.textContent || '';
      const badge = item.querySelector('.traffic-badge')?.textContent || '';
      const cls   = item.classList.contains('green') ? 'badge-green' : item.classList.contains('red') ? 'badge-red' : 'badge-amber';
      html += '<div class="print-traffic-item"><div class="print-traffic-label">' + label + '</div><div class="print-traffic-value">' + value + '</div><div class="print-traffic-badge ' + cls + '">' + badge + '</div></div>';
    });
    html += '</div>';
  }
  document.getElementById('printData').innerHTML = html;
  document.getElementById('printOnly').style.display = 'block';
  window.print();
  setTimeout(() => {
    document.getElementById('printOnly').style.display = 'none';
    document.getElementById('printData').innerHTML = '';
  }, 1500);
}

// ── History record read-only modal ──
function openHistoryRecordModal(record) {
  const isBNA = (record.machine_type || 'BNA').toUpperCase() === 'BNA';
  const rows  = record.tableRows || [];
  const sw = record.switchBalance || 0, gl = record.glBalance || 0, phy = record.physicalBalance || 0;

  let tableHTML = '<table class="reg-table" style="min-width:320px"><thead><tr>';
  tableHTML += '<th style="text-align:left">Denom</th>';
  tableHTML += '<th>Opening</th>';
  if (isBNA) tableHTML += '<th>Deposited</th>';
  tableHTML += '<th>Dispensed</th><th>Remaining</th>';
  tableHTML += '<th style="color:#4db8ff">Brought Back</th>';
  tableHTML += '<th>Excess</th><th>Short</th><th>Loading</th>';
  tableHTML += '</tr></thead><tbody>';

  let tO=0, tDep=0, tDis=0, tRem=0, tBB=0, tEx=0, tSh=0, tL=0;

  rows.forEach(r => {
    const d = r.denom || 1;
    tO   += (r.opening    ||0)*d;
    tDis += (r.dispensed  ||0)*d;
    tRem += (r.remaining  ||0)*d;
    tBB  += (r.broughtBack||0)*d;
    tEx  += (r.excess     ||0)*d;
    tSh  += (r.short      ||0)*d;
    tL   += (r.loading    ||0)*d;
    if (isBNA) tDep += (r.deposited||0)*d;

    tableHTML += '<tr>';
    tableHTML += '<td style="text-align:left;color:var(--accent2);font-weight:600">\u20b9' + r.denom + '</td>';
    tableHTML += '<td style="text-align:right">' + fmt(r.opening||0) + '</td>';
    if (isBNA) tableHTML += '<td style="text-align:right">' + fmt(r.deposited||0) + '</td>';
    tableHTML += '<td style="text-align:right">' + fmt(r.dispensed||0) + '</td>';
    tableHTML += '<td style="text-align:right">' + fmt(r.remaining||0) + '</td>';
    tableHTML += '<td style="text-align:right;color:#4db8ff">'        + fmt(r.broughtBack||0) + '</td>';
    tableHTML += '<td style="text-align:right;color:var(--accent)">'  + fmt(r.excess||0)      + '</td>';
    tableHTML += '<td style="text-align:right;color:var(--warn)">'    + fmt(r.short||0)        + '</td>';
    tableHTML += '<td style="text-align:right">'                      + fmt(r.loading||0)      + '</td>';
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody><tfoot><tr class="total-row">';
  tableHTML += '<td>Totals</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tO)   + '</td>';
  if (isBNA) tableHTML += '<td style="text-align:right">' + fmt(tDep) + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tDis) + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tRem) + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tBB)  + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tEx)  + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tSh)  + '</td>';
  tableHTML += '<td style="text-align:right">' + fmt(tL)   + '</td>';
  tableHTML += '</tr></tfoot></table>';

  const pvg = phy - gl, pvs = phy - sw;
  let trafficHTML = '';
  if (sw || gl) {
    const mkT = (label, value, badge, neutral=false) => {
      const cls  = neutral ? 'green' : value===0?'green':value>0?'amber':'red';
      const sign = (!neutral && value!==0) ? (value>0?'+':'-') : '';
      return '<div class="traffic-item ' + cls + '" style="margin-bottom:8px">' +
        '<div class="traffic-label">' + label + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="traffic-value">' + sign + '\u20b9' + fmt(Math.abs(value)) + '</div>' +
        '<div class="traffic-badge">' + badge + '</div></div></div>';
    };
    trafficHTML = '<div style="margin-top:16px">' +
      mkT('Brought Back',       phy, 'Actual', true) +
      mkT('Physical vs GL',     pvg, pvg===0?'Tallied':pvg>0?'Excess':'Short') +
      mkT('Physical vs Switch', pvs, pvs===0?'Tallied':pvs>0?'Excess':'Short') +
      '</div>';
  }

  const modal = document.getElementById('historyRecordModal');
  modal.querySelector('.hrm-date').textContent  = record.date + ' \u00b7 ' + (record.machine_type || 'BNA');
  modal.querySelector('.hrm-ref').textContent   = record.ref || '';
  modal.querySelector('.hrm-phy').textContent   = '\u20b9' + fmt(phy);
  modal.querySelector('.hrm-table').innerHTML   = tableHTML;
  modal.querySelector('.hrm-traffic').innerHTML = trafficHTML;
  modal.classList.add('show');
}

function closeHistoryRecordModal() {
  document.getElementById('historyRecordModal').classList.remove('show');
}
