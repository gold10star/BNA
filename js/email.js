// ── email.js — EmailJS Email Report ──
const EMAILJS_SERVICE_ID  = 'service_kyev49k';
const EMAILJS_TEMPLATE_ID = 'template_xasnp3k';
const EMAILJS_PUBLIC_KEY  = 'IqwlU87YnfYCbtkEk';

function buildSubject() {
  const atmId    = pendingData ? (pendingData.atm_id || '') : '';
  const machType = currentMachineType || 'BNA';
  const dateRaw  = document.getElementById('resultDate').textContent || '';
  const datePart = dateRaw.replace(/^.*[-\u2014]\s*/, '').trim();
  const dateSafe = datePart.replace(/\//g, '-');
  return 'ATM-BNA Reconciliation | ' + atmId + ' | ' + machType + ' | ' + dateSafe;
}

function openEmailModal() {
  if (!balancesCalculated) {
    showToast('Please enter Switch & GL balances and Calculate Differences before emailing.', 'error');
    return;
  }
  document.getElementById('emailSubject').value      = buildSubject();
  document.getElementById('emailTo').value           = '';
  document.getElementById('emailStatus').textContent = '';
  document.getElementById('emailModal').classList.add('show');
  document.getElementById('emailTo').focus();
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('show');
}

function buildEmailBody(receiptImageUrl) {
  const isBNA    = currentMachineType === 'BNA';
  const machType = currentMachineType || 'BNA';
  const dateRaw  = document.getElementById('resultDate').textContent || '';
  const datePart = dateRaw.replace(/^.*[-\u2014]\s*/, '').trim();
  const atmId    = pendingData ? (pendingData.atm_id || '') : '';
  const refNo    = pendingData ? (pendingData.ref_no  || '') : '';
  const phy      = currentBroughtBack;
  const sw       = lastSwitchBal || 0;
  const gl       = lastGLBal     || 0;
  const pvg      = phy - gl;
  const pvs      = phy - sw;
  const rows     = collectTableRows();

  // ── Compute totals ──
  var tO=0, tDep=0, tDis=0, tRem=0, tEx=0, tSh=0, tL=0;
  rows.forEach(function(r) {
    var d = r.denom || 1;
    tO   += (r.opening   ||0) * d;
    tDep += (r.deposited ||0) * d;
    tDis += (r.dispensed ||0) * d;
    tRem += (r.remaining ||0) * d;
    tEx  += (r.excess    ||0) * d;
    tSh  += (r.short     ||0) * d;
    tL   += (r.loading   ||0) * d;
  });

  const th  = 'font-family:Courier New,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#888888;text-align:right;padding:8px 10px;background:#1e2120;border-bottom:2px solid #2a2d2a;white-space:nowrap';
  const thL = th + ';text-align:left';
  const td  = 'font-family:Courier New,monospace;font-size:12px;text-align:right;padding:7px 10px;border-bottom:1px solid #2a2d2a;color:#e2e8e2';
  const tdL = td + ';text-align:left;color:#4db8ff;font-weight:600';
  const tft = 'font-family:Courier New,monospace;font-size:12px;text-align:right;padding:8px 10px;color:#e2e8e2;background:#1e2120;border-top:2px solid #2a2d2a;font-weight:600';
  const tftL= tft + ';text-align:left;color:#5a6060;font-size:10px;letter-spacing:0.08em;text-transform:uppercase';

  // ── Header columns ──
  let hCols = '<th style="' + thL + '">Denom</th>';
  hCols    += '<th style="' + th  + '">Opening</th>';
  if (isBNA) hCols += '<th style="' + th + '">Deposited</th>';
  hCols    += '<th style="' + th + '">Dispensed</th>';
  hCols    += '<th style="' + th + '">Remaining</th>';
  hCols    += '<th style="' + th + ';color:#00c896">Excess</th>';
  hCols    += '<th style="' + th + ';color:#f0a500">Short</th>';
  hCols    += '<th style="' + th + '">Loading</th>';

  // ── Data rows ──
  let bodyRows = '';
  rows.forEach(function(r, i) {
    var bg   = i % 2 === 0 ? '#141614' : '#161916';
    var cols = '<td style="' + tdL + ';background:' + bg + '">&#8377;' + r.denom + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + '">' + fmt(r.opening||0)   + '</td>';
    if (isBNA) cols += '<td style="' + td + ';background:' + bg + '">' + fmt(r.deposited||0) + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + '">' + fmt(r.dispensed||0) + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + '">' + fmt(r.remaining||0) + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + ';color:#00c896">' + fmt(r.excess||0) + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + ';color:#f0a500">' + fmt(r.short||0)  + '</td>';
    cols    += '<td style="' + td  + ';background:' + bg + '">' + fmt(r.loading||0)   + '</td>';
    bodyRows += '<tr>' + cols + '</tr>';
  });

  // ── Totals row ──
  let totRow = '<tr>';
  totRow += '<td style="' + tftL + '">Totals</td>';
  totRow += '<td style="' + tft  + '">' + fmt(tO)   + '</td>';
  if (isBNA) totRow += '<td style="' + tft + '">' + fmt(tDep) + '</td>';
  totRow += '<td style="' + tft  + '">' + fmt(tDis) + '</td>';
  totRow += '<td style="' + tft  + '">' + fmt(tRem) + '</td>';
  totRow += '<td style="' + tft  + ';color:#00c896">' + fmt(tEx) + '</td>';
  totRow += '<td style="' + tft  + ';color:#f0a500">' + fmt(tSh) + '</td>';
  totRow += '<td style="' + tft  + '">' + fmt(tL)   + '</td>';
  totRow += '</tr>';

  // ── Traffic light colors ──
  var pvgLabel  = pvg === 0 ? 'Tallied' : pvg > 0 ? 'Excess' : 'Short';
  var pvsLabel  = pvs === 0 ? 'Tallied' : pvs > 0 ? 'Excess' : 'Short';
  var pvgColor  = pvg === 0 ? '#00c896' : pvg > 0 ? '#f0a500' : '#ff5555';
  var pvsColor  = pvs === 0 ? '#00c896' : pvs > 0 ? '#f0a500' : '#ff5555';
  var pvgBorder = pvg === 0 ? '#1a5c32' : pvg > 0 ? '#5c3d1a' : '#5c1a1a';
  var pvsBorder = pvs === 0 ? '#1a5c32' : pvs > 0 ? '#5c3d1a' : '#5c1a1a';
  var pvgSign   = pvg >= 0 ? '+' : '-';
  var pvsSign   = pvs >= 0 ? '+' : '-';

  // ── Build full HTML ──
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#0c0e0d">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0e0d"><tr>' +
    '<td align="center" style="padding:24px 12px">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#141614;border-radius:10px;border:1px solid #2a2d2a">' +

    // HEADER
    '<tr><td style="padding:20px 24px 16px;border-bottom:1px solid #2a2d2a;text-align:center">' +
      '<div style="font-size:15px;font-weight:700;letter-spacing:0.06em;color:#00c896;font-family:Courier New,monospace">ATM/BNA AUTO RECONCILIATION APP</div>' +
      '<div style="font-size:11px;color:#5a6060;margin-top:6px;font-family:Courier New,monospace">' +
        'ATM: ' + atmId + ' &nbsp;&#183;&nbsp; REF: ' + refNo + ' &nbsp;&#183;&nbsp; ' + machType + ' &#8212; ' + datePart +
      '</div>' +
    '</td></tr>' +

    // CASSETTE TABLE with totals row
    '<tr><td style="padding:16px 24px 8px">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#5a6060;margin-bottom:8px;font-family:Courier New,monospace">Cassette Detail</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #2a2d2a">' +
        '<thead><tr>' + hCols + '</tr></thead>' +
        '<tbody>' + bodyRows + '</tbody>' +
        '<tfoot>' + totRow + '</tfoot>' +
      '</table>' +
    '</td></tr>' +

    // RECEIPT IMAGE (left) + BALANCE SUMMARY (right) — side by side
    '<tr><td style="padding:14px 24px 6px;border-top:1px solid #2a2d2a">' +
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#5a6060;margin-bottom:10px;font-family:Courier New,monospace">Balance Summary</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +

        // LEFT: Receipt image
        (receiptImageUrl ? (
          '<td width="120" valign="top" style="padding-right:12px">' +
            '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#5a6060;margin-bottom:6px;font-family:Courier New,monospace">Receipt</div>' +
            '<img src="' + receiptImageUrl + '" width="108" style="width:108px;height:220px;object-fit:contain;border-radius:6px;border:1px solid #2a2d2a;display:block;background:#0c0e0d" alt="Host Total Receipt">' +
          '</td>'
        ) : '') +

        // RIGHT: Balance boxes stacked
        '<td valign="top">' +

          // Row 1: Physical | GL | Switch
          '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px"><tr>' +
            '<td width="32%" valign="top" style="padding-right:4px">' +
              '<div style="background:#1c1f1c;border:1px solid #1a5c32;border-radius:8px;padding:10px 12px">' +
                '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:3px;font-family:Courier New,monospace">Physical</div>' +
                '<div style="font-size:13px;font-weight:700;color:#00c896;font-family:Courier New,monospace">&#8377;' + fmt(phy) + '</div>' +
                '<div style="display:inline-block;font-size:9px;color:#00c896;background:#1a5c32;padding:2px 6px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">Actual</div>' +
              '</div>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="32%" valign="top" style="padding-right:4px">' +
              '<div style="background:#1c1f1c;border:1px solid #1a4a5c;border-radius:8px;padding:10px 12px">' +
                '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:3px;font-family:Courier New,monospace">GL Balance</div>' +
                '<div style="font-size:13px;font-weight:700;color:#4db8ff;font-family:Courier New,monospace">&#8377;' + fmt(gl) + '</div>' +
                '<div style="display:inline-block;font-size:9px;color:#4db8ff;background:#1a4a5c;padding:2px 6px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">GL</div>' +
              '</div>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="32%" valign="top">' +
              '<div style="background:#1c1f1c;border:1px solid #4a3a1a;border-radius:8px;padding:10px 12px">' +
                '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:3px;font-family:Courier New,monospace">Switch Bal</div>' +
                '<div style="font-size:13px;font-weight:700;color:#f0a500;font-family:Courier New,monospace">&#8377;' + fmt(sw) + '</div>' +
                '<div style="display:inline-block;font-size:9px;color:#f0a500;background:#4a3a1a;padding:2px 6px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">Switch</div>' +
              '</div>' +
            '</td>' +
          '</tr></table>' +

          // Row 2: Phys vs GL | Phys vs Switch
          '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td width="49%" valign="top" style="padding-right:4px">' +
              '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid ' + pvgBorder + ';border-radius:8px"><tr>' +
                '<td style="padding:10px 12px">' +
                  '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:3px;font-family:Courier New,monospace">Physical vs GL</div>' +
                  '<div style="font-size:15px;font-weight:700;color:' + pvgColor + ';font-family:Courier New,monospace">' + pvgSign + '&#8377;' + fmt(Math.abs(pvg)) + '</div>' +
                  '<div style="display:inline-block;font-size:9px;color:' + pvgColor + ';background:' + pvgBorder + ';padding:2px 6px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">' + pvgLabel + '</div>' +
                '</td></tr>' +
              '</table>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="49%" valign="top">' +
              '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1f1c;border:1px solid ' + pvsBorder + ';border-radius:8px"><tr>' +
                '<td style="padding:10px 12px">' +
                  '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:3px;font-family:Courier New,monospace">Physical vs Switch</div>' +
                  '<div style="font-size:15px;font-weight:700;color:' + pvsColor + ';font-family:Courier New,monospace">' + pvsSign + '&#8377;' + fmt(Math.abs(pvs)) + '</div>' +
                  '<div style="display:inline-block;font-size:9px;color:' + pvsColor + ';background:' + pvsBorder + ';padding:2px 6px;border-radius:4px;margin-top:4px;font-weight:600;font-family:Courier New,monospace">' + pvsLabel + '</div>' +
                '</td></tr>' +
              '</table>' +
            '</td>' +
          '</tr></table>' +

        '</td>' + // end RIGHT column
      '</tr></table>' +
    '</td></tr>' +

    // FOOTER
    '<tr><td style="padding:12px 24px;border-top:1px solid #2a2d2a;text-align:center">' +
      '<div style="font-size:10px;color:#3a4040;font-family:Courier New,monospace">Generated by ATM/BNA Auto Reconciliation App</div>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

// ── compressForEmail: resize to max 600px wide, quality 0.55 ──
function compressForEmail() {
  return new Promise(function(resolve) {
    if (!imageBase64) { resolve(null); return; }
    var img = new Image();
    img.onload = function() {
      var maxW = 600, w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.55);
      resolve(dataUrl.split(',')[1]); // return base64 only
    };
    img.onerror = function() { resolve(imageBase64); }; // fallback to original
    img.src = 'data:' + imageMime + ';base64,' + imageBase64;
  });
}

// ── uploadReceiptImage: compress then upload via Vercel API ──
async function uploadReceiptImage() {
  if (!imageBase64) return null;
  try {
    // Compress to ~600px wide, quality 0.55 before uploading
    var compressed = await compressForEmail();
    if (!compressed) return null;

    var res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: compressed, imageMime: 'image/jpeg' })
    });
    var json = await res.json();
    if (res.ok && json.url) {
      console.log('[Upload] Receipt image URL:', json.url);
      return json.url;
    }
    console.warn('[Upload] Failed:', json.error);
    return null;
  } catch (e) {
    console.warn('[Upload] Exception:', e.message);
    return null;
  }
}

// ── sendEmail ──
async function sendEmail() {
  var to       = document.getElementById('emailTo').value.trim();
  var subject  = document.getElementById('emailSubject').value.trim();
  var statusEl = document.getElementById('emailStatus');

  if (!to || !to.includes('@')) {
    statusEl.textContent = '⚠ Enter a valid email address.';
    statusEl.style.color = 'var(--warn)';
    return;
  }

  var sendBtn = document.getElementById('emailSendBtn');
  sendBtn.disabled = true;
  statusEl.textContent = 'Uploading receipt image...';
  statusEl.style.color = 'var(--muted)';

  try {
    // Step 1: Upload receipt image to imgBB to get a public URL
    var receiptUrl = await uploadReceiptImage();

    // Step 2: Build email HTML with the hosted image URL
    statusEl.textContent = 'Sending email...';
    var htmlBody = buildEmailBody(receiptUrl);

    // Step 3: Send via EmailJS REST API
    var response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email:     to,
          subject:      subject,
          message_html: htmlBody
        }
      })
    });

    if (response.status === 200) {
      statusEl.textContent = receiptUrl ? '✓ Email sent with receipt photo!' : '✓ Email sent (image upload skipped)';
      statusEl.style.color = 'var(--accent)';
      showToast('Email sent!', 'success');
      setTimeout(closeEmailModal, 1800);
    } else {
      var errText = await response.text();
      throw new Error(errText || 'Send failed (status ' + response.status + ')');
    }
  } catch (err) {
    statusEl.textContent = '✗ Failed: ' + (err.message || 'Unknown error');
    statusEl.style.color = 'var(--danger)';
  } finally {
    sendBtn.disabled = false;
  }
}
