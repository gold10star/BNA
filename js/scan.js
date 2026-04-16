// ── scan.js — Image Upload, Compression, API Call ──

// Size thresholds
const SIZE_WARN_BYTES   = 3 * 1024 * 1024;  // 3 MB — show optimize notice
const SIZE_AUTO_QUALITY = 0.60;              // extra compression quality for large files
const ORIENT_WARN_RATIO = 1.6;              // width/height > this = likely landscape (wrong)

function handleFile(file) {
  if (!file) return;

  const isLarge    = file.size > SIZE_WARN_BYTES;
  const maxPx      = window.innerWidth < 768 ? 800 : 1000;
  const quality    = isLarge ? SIZE_AUTO_QUALITY : 0.72;

  // Show optimizing notice if large
  if (isLarge) showToast('Large image detected — auto-optimizing...', '');

  compressImage(file, maxPx, quality).then(({ base64, mime, width, height }) => {
    imageBase64 = base64; imageMime = mime;

    const previewImg = document.getElementById('previewImg');
    previewImg.src = `data:${mime};base64,${base64}`;
    document.getElementById('previewName').textContent =
      file.name + (isLarge ? ' · Auto-optimized' : '');

    // Orientation check: landscape image is almost always wrong for a receipt
    const ratio = width / height;
    const orientWarn = document.getElementById('orientWarn');
    if (ratio > ORIENT_WARN_RATIO) {
      orientWarn.style.display = 'flex';
    } else {
      orientWarn.style.display = 'none';
    }

    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('previewRow').classList.add('show');
    hide('resultWrap'); hide('resetBar'); hide('errorBox');
    document.getElementById('invalidBox').classList.remove('show');
    document.getElementById('balancesCard').classList.remove('show');
  });
}

// Trigger file picker for retake (re-uses same hidden input)
function retakePhoto() {
  const fi = document.getElementById('fileInput');
  fi.value = '';
  fi.click();
}

function compressImage(file, maxSize, quality) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else        { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', width: img.width, height: img.height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function scanReceipt() {
  if (!imageBase64) { showError('Please upload a receipt image first.'); return; }
  show('processing'); hide('resultWrap'); hide('resetBar'); hide('errorBox');
  document.getElementById('balancesCard').classList.remove('show');
  document.getElementById('scanBtn').disabled = true;

  const steps = ['Detecting machine type...','Reading denominations...','Extracting values...','Almost done...'];
  let si = 0;
  const stepEl = document.getElementById('procStep');
  const timer = setInterval(() => { si=(si+1)%steps.length; stepEl.textContent=steps[si]; }, 900);

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, imageMime })
    });
    clearInterval(timer);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Image too large or server error (' + res.status + '). Try a clearer photo.');
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 422 && data.error === 'invalid_receipt') {
        throw new Error('__INVALID_RECEIPT__' + (data.reason || ''));
      }
      if (res.status === 429 || JSON.stringify(data).toLowerCase().includes('rate')) throw new Error('Rate limit. Please wait 60 seconds and retry.');
      throw new Error(data.error || 'Server error ' + res.status);
    }
    pendingData = data;
    hide('processing');
    ['load100','load500','load200'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    var errEl = document.getElementById('loadingError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('loadingModal').classList.add('show');
    document.getElementById('load100').focus();
  } catch (err) {
    clearInterval(timer);
    hide('processing');
    if (err.message.startsWith('__INVALID_RECEIPT__')) {
      const reason = err.message.replace('__INVALID_RECEIPT__', '') || 'This does not appear to be a valid Host Total receipt.';
      showInvalidReceiptError(reason);
    } else {
      showError('⚠ ' + (err.message || 'Unknown error'));
    }
    document.getElementById('scanBtn').disabled = false;
  }
}

function confirmLoading() {
  const v100 = document.getElementById('load100').value.trim();
  const v500 = document.getElementById('load500').value.trim();
  const v200 = document.getElementById('load200').value.trim();
  const errEl = document.getElementById('loadingError');

  if (v100 === '' || v500 === '' || v200 === '') {
    if (errEl) errEl.style.display = 'block';
    return;
  }
  if (errEl) errEl.style.display = 'none';

  pendingLoading = {
    l100: parseInt(v100) || 0,
    l500: parseInt(v500) || 0,
    l200: parseInt(v200) || 0
  };
  document.getElementById('loadingModal').classList.remove('show');
  renderResult(pendingData, pendingLoading);
}
