// ── email.js — EmailJS Email Report ──
const EMAILJS_SERVICE_ID  = 'service_kyev49k';
const EMAILJS_TEMPLATE_ID = 'template_xasnp3k';
const EMAILJS_PUBLIC_KEY  = 'IqwlU87YnfYCbtkEk';

function openEmailModal() {
  if (!balancesCalculated) {
    showToast('Please enter Switch & GL balances and Calculate Differences before emailing.', 'error');
    return;
  }
  const atmId    = pendingData ? (pendingData.atm_id || '') : '';
  const machType = currentMachineType || 'BNA';
  const dateRaw  = document.getElementById('resultDate').textContent || '';
  const datePart = dateRaw.replace(/^.*?—\s*/, '').trim().replace(/\//g, '-');
  // Clean subject — use pipe separator, no special chars
  const subject  = 'ATM-BNA Reconciliation | ' + atmId + ' | ' + machType + ' | ' + datePart;
  document.getElementById('emailSubject').value = subject;
  document.getElementById('emailTo').value      = '';
  document.getElementById('emailStatus').textContent = '';
  document.getElementById('emailModal').classList.add('show');
  document.getElementById('emailTo').focus();
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('show');
}

function buildEmailBody(receiptImgUrl) {
  const isBNA    = currentMachineType === 'BNA';
  const machType = currentMachineType || 'BNA';
  const dateRaw  = document.getElementById('resultDate').textContent || '';
  const datePart = dateRaw.replace(/^.*?—\s*/, '').trim().replace(/\//g, '-');
  const atmId    = pendingData ? (pendingData.atm_id || '') : '';
  const refText  = document.getElementById('resultRef').textContent;
  const emailTitle = 'ATM/BNA AUTO RECONCILIATION APP';
  const subTitle   = 'ATM: ' + atmId + '  ·  REF: ' + (pendingData ? pendingData.ref_no : '') + '  ·  ' + machType + ' — ' + datePart;
  const phy      = currentBroughtBack;
  const pvg      = phy - (lastGLBal     || 0);
  const pvs      = phy - (lastSwitchBal || 0);
  const rows     = collectTableRows();

  const thStyle  = 'font-family:Courier New,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#888888;text-align:right;padding:8px 10px;background:#1e2120;border-bottom:2px solid #2a2d2a;white-space:nowrap';
  const thStyleL = thStyle + ';text-align:left';

  let headerCols = '<th style="' + thStyleL + '">Denom</th>';
  headerCols    += '<th style="' + thStyle + '">Opening</th>';
  if (isBNA) headerCols += '<th style="' + thStyle + '">Deposited</th>';
  headerCols    += '<th style="' + thStyle + '">Dispensed</th>';
  headerCols    += '<th style="' + thStyle + '">Remaining</th>';
  headerCols    += '<th style="' + thStyle + ';color:#4db8ff">Brought Back</th>';
  headerCols    += '<th style="' + thStyle + ';color:#00c896">Excess</th>';
  headerCols    += '<th style="' + thStyle + ';color:#f0a500">Short</th>';
  headerCols    += '<th style="' + thStyle + '">Loading</th>';

  const tdStyle  = 'font-family:Courier New,monospace;font-size:11px;text-align:right;padding:7px 10px;border-bottom:1px solid #2a2d2a;color:#e2e8e2';
  const tdStyleL = tdStyle + ';text-align:left;color:#4db8ff;font-weight:600';

  let tableRows = '';
  let tO=0,tDep=0,tDis=0,tRem=0,tBB=0,tEx=0,tSh=0,tL=0;

  rows.forEach(function(r, i) {
    var bg = i % 2 === 0 ? '#141614' : '#161916';
    tO   += (r.opening    ||0)*r.denom;
    tDep += (r.deposited  ||0)*r.denom;
    tDis += (r.dispensed  ||0)*r.denom;
    tRem += (r.remaining  ||0)*r.denom;
    tBB  += (r.broughtBack||0)*r.denom;
    tEx  += (r.excess     ||0)*r.denom;
    tSh  += (r.short      ||0)*r.denom;
    tL   += (r.loading    ||0)*r.denom;
    var cols = '<td style="' + tdStyleL + ';background:' + bg + '">&#8377;' + r.denom + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + '">' + fmt(r.opening||0) + '</td>';
    if (isBNA) cols += '<td style="' + tdStyle + ';background:' + bg + '">' + fmt(r.deposited||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + '">' + fmt(r.dispensed||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + '">' + fmt(r.remaining||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + ';color:#4db8ff">' + fmt(r.broughtBack||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + ';color:#00c896">' + fmt(r.excess||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + ';color:#f0a500">' + fmt(r.short||0) + '</td>';
    cols += '<td style="' + tdStyle + ';background:' + bg + '">' + fmt(r.loading||0) + '</td>';
    tableRows += '<tr>' + cols + '</tr>';
  });

  // Totals row
  var totStyle = tdStyle + ';font-weight:700;background:#1e2120;border-top:2px solid #2a2d2a';
  var totCols = '<td style="' + totStyle + ';text-align:left;color:#5a6060;font-size:9px;text-transform:uppercase;letter-spacing:0.08em">Totals</td>';
  totCols += '<td style="' + totStyle + '">' + fmt(tO) + '</td>';
  if (isBNA) totCols += '<td style="' + totStyle + '">' + fmt(tDep) + '</td>';
  totCols += '<td style="' + totStyle + '">' + fmt(tDis) + '</td>';
  totCols += '<td style="' + totStyle + '">' + fmt(tRem) + '</td>';
  totCols += '<td style="' + totStyle + ';color:#4db8ff">' + fmt(tBB) + '</td>';
  totCols += '<td style="' + totStyle + ';color:#00c896">' + fmt(tEx) + '</td>';
  totCols += '<td style="' + totStyle + ';color:#f0a500">' + fmt(tSh) + '</td>';
  totCols += '<td style="' + totStyle + '">' + fmt(tL) + '</td>';
  tableRows += '<tr>' + totCols + '</tr>';

  var pvgLabel  = pvg === 0 ? 'Tallied' : pvg > 0 ? 'Excess' : 'Short';
  var pvsLabel  = pvs === 0 ? 'Tallied' : pvs > 0 ? 'Excess' : 'Short';
  var pvgColor  = pvg === 0 ? '#00c896' : pvg > 0 ? '#f0a500' : '#ff5555';
  var pvsColor  = pvs === 0 ? '#00c896' : pvs > 0 ? '#f0a500' : '#ff5555';
  var pvgBorder = pvg === 0 ? '#1a5c32' : pvg > 0 ? '#5c3d1a' : '#5c1a1a';
  var pvsBorder = pvs === 0 ? '#1a5c32' : pvs > 0 ? '#5c3d1a' : '#5c1a1a';
  var pvgSign   = pvg >= 0 ? '+' : '-';
  var pvsSign   = pvs >= 0 ? '+' : '-';

  // Image cell
  var imgCell = receiptImgUrl
    ? '<img src="' + receiptImgUrl + '" alt="Receipt" width="160" style="display:block;border-radius:6px;border:1px solid #2a2d2a;max-width:160px">'
    : '<div style="width:160px;height:100px;background:#1c1f1c;border:1px solid #2a2d2a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:Courier New,monospace;font-size:10px;color:#3a4040">No image</div>';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#0c0e0d">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0e0d"><tr>' +
    '<td align="center" style="padding:24px 12px">' +
    '<table width="660" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;width:100%;background:#141614;border-radius:10px;border:1px solid #2a2d2a">' +

    // Header
    '<tr><td colspan="2" style="padding:18px 24px 14px;border-bottom:1px solid #2a2d2a;text-align:center">' +
    '<div style="font-size:13px;font-weight:700;color:#00c896;font-family:Courier New,monospace;letter-spacing:0.1em">' + emailTitle + '</div>' +
    '<div style="font-size:10px;color:#5a6060;margin-top:5px;font-family:Courier New,monospace">' + subTitle + '</div>' +
    '</td></tr>' +

    // Cassette table - full width
    '<tr><td colspan="2" style="padding:16px 24px 8px">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#5a6060;margin-bottom:8px;font-family:Courier New,monospace">Cassette Detail</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #2a2d2a">' +
    '<thead><tr>' + headerCols + '</tr></thead>' +
    '<tbody>' + tableRows + '</tbody>' +
    '</table></td></tr>' +

    // Balance Summary header
    '<tr><td colspan="2" style="padding:14px 24px 8px;border-top:1px solid #2a2d2a">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#5a6060;font-family:Courier New,monospace">Balance Summary</div>' +
    '</td></tr>' +

    // Two column: image left, balances right
    '<tr>' +
    '<td valign="top" style="padding:0 12px 20px 24px;width:180px">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#5a6060;margin-bottom:8px;font-family:Courier New,monospace">Receipt</div>' +
    imgCell +
    '</td>' +
    '<td valign="top" style="padding:0 24px 20px 12px">' +

    // Physical balance
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;background:#1c1f1c;border:1px solid #1a5c32;border-radius:8px"><tr>' +
    '<td style="padding:10px 14px">' +
    '<div style="font-size:9px;text-transform:uppercase;color:#888;font-family:Courier New,monospace">Physical</div>' +
    '<div style="font-size:20px;font-weight:700;color:#00c896;font-family:Courier New,monospace">&#8377;' + fmt(phy) + '</div>' +
    '<div style="font-size:9px;color:#1a5c32;background:#0a1f14;display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;font-family:Courier New,monospace">Actual</div>' +
    '</td></tr></table>' +

    // GL and Switch side by side
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px"><tr>' +
    '<td width="48%" style="padding-right:5px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid #2a2d2a;border-radius:8px"><tr><td style="padding:8px 12px">' +
    '<div style="font-size:9px;text-transform:uppercase;color:#888;font-family:Courier New,monospace">GL Balance</div>' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8e2;font-family:Courier New,monospace">&#8377;' + fmt(lastGLBal||0) + '</div>' +
    '<div style="font-size:9px;color:#4db8ff;background:#0a1a2e;display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;font-family:Courier New,monospace">GL</div>' +
    '</td></tr></table></td>' +
    '<td width="4%"></td>' +
    '<td width="48%" style="padding-left:5px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid #2a2d2a;border-radius:8px"><tr><td style="padding:8px 12px">' +
    '<div style="font-size:9px;text-transform:uppercase;color:#888;font-family:Courier New,monospace">Switch Bal</div>' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8e2;font-family:Courier New,monospace">&#8377;' + fmt(lastSwitchBal||0) + '</div>' +
    '<div style="font-size:9px;color:#f0a500;background:#1f160a;display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;font-family:Courier New,monospace">Switch</div>' +
    '</td></tr></table></td>' +
    '</tr></table>' +

    // Physical vs GL and Switch side by side
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td width="48%" style="padding-right:5px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid ' + pvgBorder + ';border-radius:8px"><tr><td style="padding:8px 12px">' +
    '<div style="font-size:9px;text-transform:uppercase;color:#888;font-family:Courier New,monospace">Physical vs GL</div>' +
    '<div style="font-size:16px;font-weight:700;color:' + pvgColor + ';font-family:Courier New,monospace">' + pvgSign + '&#8377;' + fmt(Math.abs(pvg)) + '</div>' +
    '<div style="font-size:9px;color:' + pvgColor + ';background:' + pvgBorder + ';display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">' + pvgLabel + '</div>' +
    '</td></tr></table></td>' +
    '<td width="4%"></td>' +
    '<td width="48%" style="padding-left:5px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid ' + pvsBorder + ';border-radius:8px"><tr><td style="padding:8px 12px">' +
    '<div style="font-size:9px;text-transform:uppercase;color:#888;font-family:Courier New,monospace">Physical vs Switch</div>' +
    '<div style="font-size:16px;font-weight:700;color:' + pvsColor + ';font-family:Courier New,monospace">' + pvsSign + '&#8377;' + fmt(Math.abs(pvs)) + '</div>' +
    '<div style="font-size:9px;color:' + pvsColor + ';background:' + pvsBorder + ';display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">' + pvsLabel + '</div>' +
    '</td></tr></table></td>' +
    '</tr></table>' +

    '</td></tr>' +

    // Footer
    '<tr><td colspan="2" style="padding:12px 24px;border-top:1px solid #2a2d2a;text-align:center">' +
    '<div style="font-size:10px;color:#3a4040;font-family:Courier New,monospace">Generated by ATM/BNA Auto Reconciliation App</div>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

async function sendEmail() {
  var to       = document.getElementById('emailTo').value.trim();
  var subject  = document.getElementById('emailSubject').value.trim();
  var statusEl = document.getElementById('emailStatus');

  if (!to || !to.includes('@')) {
    statusEl.textContent = '\u26a0 Enter a valid email address.';
    statusEl.style.color = 'var(--warn)';
    return;
  }

  var sendBtn = document.getElementById('emailSendBtn');
  sendBtn.disabled = true;
  statusEl.textContent = 'Uploading receipt image...';
  statusEl.style.color = 'var(--muted)';

  // Upload receipt image to imgBB — no expiration (permanent)
  var receiptImgUrl = '';
  try {
    if (imageBase64) {
      var upResp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageBase64, imageMime: imageMime })
      });
      if (upResp.ok) {
        var upData = await upResp.json();
        receiptImgUrl = upData.url || '';
        window._lastReceiptImgUrl = receiptImgUrl; // store for history save
      }
    }
  } catch(e) {
    console.warn('Image upload failed:', e);
  }

  statusEl.textContent = 'Sending email...';

  try {
    var body = buildEmailBody(receiptImgUrl);
    var payload = {
      service_id:  EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id:     EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email:     to,
        subject:      subject,
        message_html: body
      }
    };
    var resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      statusEl.textContent = '\u2713 Email sent successfully!';
      statusEl.style.color = 'var(--accent)';
      showToast('Email sent!', 'success');
      setTimeout(closeEmailModal, 1800);
    } else {
      const txt = await resp.text();
      throw new Error(txt || 'Send failed (' + resp.status + ')');
    }
  } catch (err) {
    statusEl.textContent = '\u2717 Failed: ' + (err && (err.text || err.message) || 'Unknown error');
    statusEl.style.color = 'var(--danger)';
  } finally {
    sendBtn.disabled = false;
  }
}
