// ── main.js — App Init, Auth, Event Listeners, Flow Control ──

// ── Global State ──
var imageBase64 = '', imageMime = 'image/jpeg';
var pendingData = null, currentMachineType = 'BNA', currentBroughtBack = 0;
var pendingLoading = { l100:0, l500:0, l200:0 };
var pendingBroughtBack = { bb100:0, bb500:0, bb200:0 };
var currentUser = null, authGatePurpose = null;
var balancesCalculated = false;
var lastSwitchBal = 0, lastGLBal = 0;

// ── Auth ──
function handleGoogleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  currentUser = { name: payload.name, email: payload.email, picture: payload.picture };
  sessionStorage.setItem('guser', JSON.stringify(currentUser));
  localStorage.setItem('guser', JSON.stringify(currentUser));
  updateAuthUI();
  closeAuthGate();
  if (authGatePurpose === 'save')    { authGatePurpose = null; saveRecord(); }
  else if (authGatePurpose === 'history') { authGatePurpose = null; openHistory(); }
}

function triggerGoogleLogin(purpose) {
  authGatePurpose = purpose || 'header';
  if (purpose === 'save') {
    document.getElementById('authGateTitle').textContent = '💾 Sign in to Save';
    document.getElementById('authGateSub').textContent   = 'Sign in with Google to save this record. You can always skip this and just print.';
  } else if (purpose === 'history') {
    document.getElementById('authGateTitle').textContent = '📋 Sign in to View History';
    document.getElementById('authGateSub').textContent   = 'History is tied to your Google account.';
  } else {
    document.getElementById('authGateTitle').textContent = 'Sign in';
    document.getElementById('authGateSub').textContent   = 'Sign in with your Google account to continue.';
  }
  document.getElementById('authGateModal').classList.add('show');
}

function closeAuthGate() { document.getElementById('authGateModal').classList.remove('show'); }

function logout() {
  currentUser = null;
  sessionStorage.removeItem('guser');
  localStorage.removeItem('guser');
  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = !!currentUser;
  document.getElementById('authLoggedOut').style.display = loggedIn ? 'none' : 'block';
  const loggedInEl = document.getElementById('authLoggedIn');
  loggedInEl.style.display = loggedIn ? 'flex' : 'none';
  document.getElementById('historyBtn').style.display   = loggedIn ? 'inline-block' : 'none';
  document.getElementById('exportBtn').style.display    = loggedIn ? 'inline-block' : 'none';
  if (loggedIn) {
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').src = currentUser.picture || '';
  }
}

function checkSession() {
  const stored = localStorage.getItem('guser') || sessionStorage.getItem('guser');
  if (stored) { currentUser = JSON.parse(stored); updateAuthUI(); }
}

// ── Drag & Drop ──
function initDragDrop() {
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

// ── Reset ──
function resetAll() {
  imageBase64 = ''; pendingData = null; currentBroughtBack = 0;
  balancesCalculated = false; lastSwitchBal = 0; lastGLBal = 0;
  document.getElementById('fileInput').value = '';
  const fc = document.getElementById('fileInputCamera');
  if (fc) fc.value = '';
  document.getElementById('uploadZone').style.display = '';
  document.getElementById('previewRow').classList.remove('show');
  ['switchBal','glBal'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('trafficGrid').style.display = 'none';
  document.getElementById('balancesCard').classList.remove('show');
  const saveBtn    = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  saveBtn.disabled = false; saveBtn.textContent = '💾 Save Record';
  saveBtn.dataset.saved = '';
  saveStatus.textContent = 'Save this record to your history';
  saveStatus.classList.remove('saved');
  updateActionButtons();
  hide('resultWrap'); hide('resetBar'); hide('errorBox'); hide('processing');
  document.getElementById('invalidBox').classList.remove('show');
  document.getElementById('scanBtn').disabled = false;
  window.scrollTo({ top:0, behavior:'smooth' });
}

// ── Init ──
window.addEventListener('load', function() {
  checkSession();
  initDragDrop();
  updateActionButtons();
});
