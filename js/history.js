// ── history.js — Save, Load, Delete with Firebase + localStorage fallback ──

function getHistoryKey() {
  if (!currentUser) return null;
  return 'bna_history_' + currentUser.email.replace(/[^a-z0-9]/gi,'_');
}

async function saveRecord() {
  if (!currentUser) { triggerGoogleLogin('save'); return; }
  if (!pendingData)  { showToast('No scan data to save.', 'error'); return; }

  if (!balancesCalculated) {
    showToast('Please enter Switch & GL balances and click Calculate Differences before saving.', 'error');
    document.getElementById('switchBal').scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  var key      = getHistoryKey();
  var existing = JSON.parse(localStorage.getItem(key) || '[]');
  var atmId    = pendingData.atm_id || '';
  var refNo    = pendingData.ref_no || '';

  // Duplicate detection
  var dupIdx = existing.findIndex(function(r) { return r.atm_id === atmId && r.ref_no === refNo; });
  if (dupIdx !== -1) {
    if (!confirm('This receipt (ATM: ' + atmId + ' · REF: ' + refNo + ') is already saved. Replace it?')) return;
    existing.splice(dupIdx, 1);
  }

  var tableRows = collectTableRows();
  var isBNA = currentMachineType === 'BNA';
  var tRem = 0, tEx = 0, tSh = 0;
  tableRows.forEach(function(r) {
    tRem += r.remaining * r.denom;
    tEx  += (r.excess||0) * r.denom;
    tSh  += (r.short||0)  * r.denom;
  });
  var phy = tRem + tEx - tSh;
  var pvg = phy - (lastGLBal     || 0);
  var pvs = phy - (lastSwitchBal || 0);

  var record = {
    id:           Date.now(),
    savedAt:      new Date().toISOString(),
    receiptImgUrl: window._lastReceiptImgUrl || '',
    userEmail:    currentUser.email,
    machine_type: currentMachineType,
    atm_id:       atmId,
    ref_no:       refNo,
    date:         document.getElementById('resultDate').textContent,
    ref:          document.getElementById('resultRef').textContent,
    physicalBalance: phy,
    switchBalance:   lastSwitchBal || 0,
    glBalance:       lastGLBal     || 0,
    physVsGL:        pvg,
    physVsSwitch:    pvs,
    tableRows,
    rawData: pendingData
  };

  // Save to localStorage
  existing.unshift(record);
  if (existing.length > 100) existing.pop();
  localStorage.setItem(key, JSON.stringify(existing));

  // Save to Firebase silently (no pre-save status shown)
  if (firebaseReady) {
    saveToFirestore(record); // fire and forget — no status message
  }

  var saveStatus = document.getElementById('saveStatus');
  var saveBtn    = document.getElementById('saveBtn');
  var cloudEl    = document.getElementById('cloudStatus');
  if (cloudEl) cloudEl.style.display = 'none'; // hide cloud status entirely
  saveStatus.textContent = '✓ Record saved successfully';
  saveStatus.classList.add('saved');
  saveBtn.disabled = true;
  saveBtn.textContent = '✓ Saved';
  saveBtn.dataset.saved = 'true';
  showToast('Record saved successfully!', 'success');
}

async function openHistory() {
  if (!currentUser) { triggerGoogleLogin('history'); return; }
  await renderHistory();
  document.getElementById('historyModal').classList.add('show');
}

function closeHistory() {
  document.getElementById('historyModal').classList.remove('show');
}

async function renderHistory() {
  var body = document.getElementById('historyBody');
  body.innerHTML = '<div class="history-empty" style="padding:30px 20px">Loading...</div>';

  var records = null;

  // Try Firebase first
  if (firebaseReady && currentUser) {
    records = await loadFromFirestore(currentUser.email);
  }

  // Fallback to localStorage
  if (!records) {
    var key = getHistoryKey();
    records = JSON.parse(localStorage.getItem(key) || '[]');
  } else {
    // Sync cloud records back to localStorage for offline use
    var key = getHistoryKey();
    localStorage.setItem(key, JSON.stringify(records));
  }

  if (!records.length) {
    body.innerHTML = '<div class="history-empty">No saved records yet.<br><span style="color:var(--muted);font-size:10px">Scan a receipt, calculate differences, and tap 💾 Save.</span></div>';
    return;
  }

  body.innerHTML = '<div class="history-hint">Click on a record to view details</div>' +
    records.map(function(r) {
      var pvg = r.physVsGL !== undefined ? r.physVsGL : '';
      var pvs = r.physVsSwitch !== undefined ? r.physVsSwitch : '';
      var pvgClass = pvg === 0 ? 'green' : pvg > 0 ? 'amber' : 'red';
      var pvsClass = pvs === 0 ? 'green' : pvs > 0 ? 'amber' : 'red';
      var savedAt  = r.savedAt ? new Date(r.savedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '';
      var rSafe    = JSON.stringify(r).replace(/"/g,'&quot;');
      return '<div class="history-item" onclick=\'openHistoryRecordModal(' + rSafe + ')\'>' +
        '<div class="history-item-top">' +
        '<div class="history-item-date">' + r.date + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
        '<span class="history-item-type ' + (r.machine_type||'BNA').toLowerCase() + '">' + (r.machine_type||'BNA') + '</span>' +
        '<button class="history-item-del" onclick="deleteRecord(event,' + r.id + ')" title="Delete">🗑</button>' +
        '</div></div>' +
        '<div class="history-item-ref">' + (r.ref||'') + '</div>' +
        '<div class="history-item-bal">Physical: <strong>₹' + fmt(r.physicalBalance) + '</strong></div>' +
        (pvg !== '' ? '<div class="history-item-diffs">' +
          '<span class="hist-diff ' + pvgClass + '">GL: ' + (pvg>=0?'+':'') + '₹' + fmt(Math.abs(pvg)) + '</span>' +
          '<span class="hist-diff ' + pvsClass + '">SW: ' + (pvs>=0?'+':'') + '₹' + fmt(Math.abs(pvs)) + '</span>' +
          '</div>' : '') +
        (savedAt ? '<div class="history-item-saved">Saved ' + savedAt + (firebaseReady ? ' · ☁ Cloud' : ' · 💾 Local') + '</div>' : '') +
        '</div>';
    }).join('');
}

async function deleteRecord(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this record?')) return;
  var key     = getHistoryKey();
  var records = JSON.parse(localStorage.getItem(key) || '[]');
  var target  = records.find(function(x) { return x.id === id; });
  var updated = records.filter(function(x) { return x.id !== id; });
  localStorage.setItem(key, JSON.stringify(updated));

  if (firebaseReady && target) {
    await deleteFromFirestore(currentUser.email, target.atm_id, target.ref_no);
  }
  await renderHistory();
  showToast('Record deleted.', '');
}

// ── Export to Excel via SheetJS ──
function exportToExcel() {
  if (!currentUser) { triggerGoogleLogin('history'); return; }
  var key     = getHistoryKey();
  var records = JSON.parse(localStorage.getItem(key) || '[]');
  if (!records.length) { showToast('No records to export.', 'error'); return; }
  if (typeof XLSX === 'undefined') { showToast('SheetJS not loaded. Please retry.', 'error'); return; }

  var rows = [['Date','Machine','ATM ID','REF No','Physical Balance','Switch Balance','GL Balance','Phys vs GL','Phys vs Switch','Status GL','Status Switch','Saved At']];
  records.forEach(function(r) {
    var pvg = r.physVsGL !== undefined ? r.physVsGL : '';
    var pvs = r.physVsSwitch !== undefined ? r.physVsSwitch : '';    rows.push([
      r.date || '', r.machine_type || '', r.atm_id || '', r.ref_no || '',
      r.physicalBalance || 0,
      r.switchBalance   || 0,
      r.glBalance       || 0,
      pvg,
      pvs,
      pvg === '' ? '' : (pvg === 0 ? 'Tallied' : pvg > 0 ? 'Excess' : 'Short'),
      pvs === '' ? '' : (pvs === 0 ? 'Tallied' : pvs > 0 ? 'Excess' : 'Short'),
      r.savedAt ? new Date(r.savedAt).toLocaleString('en-IN') : ''
    ]);
  });

  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map(function() { return { wch: 20 }; });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation History');
  XLSX.writeFile(wb, 'ATM_BNA_Reconciliation_History.xlsx');
  showToast('Excel exported!', 'success');
}
