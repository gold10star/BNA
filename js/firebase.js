// ── firebase.js — Firebase Firestore Cloud Storage ──
// Replace the firebaseConfig below with YOUR Firebase project config.
// Steps:
//   1. Go to https://console.firebase.google.com → Create project
//   2. Add a Web app → copy the firebaseConfig object
//   3. In Firestore Database → Create database (start in test mode for dev)
//   4. Paste your config below

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAArmMmGwfsPcU5aCYscMXEEd2EUF3f8GY",
  authDomain:        "atm-bna-reconciliation.firebaseapp.com",
  projectId:         "atm-bna-reconciliation",
  storageBucket:     "atm-bna-reconciliation.firebasestorage.app",
  messagingSenderId: "496674320706",
  appId:             "1:496674320706:web:ab38fdc52d5581c49818db"
};

var db = null;
var firebaseReady = false;

function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.info('[Firebase] Not configured — using localStorage only.');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    firebaseReady = true;
    console.info('[Firebase] Connected.');
  } catch (e) {
    console.warn('[Firebase] Init failed:', e.message);
  }
}

// ── Save record to Firestore ──
// Collection: "reconciliations"
// Document ID: userEmail_atmId_refNo (safe slug)
async function saveToFirestore(record) {
  if (!firebaseReady || !db) return false;
  try {
    var docId = (record.atm_id + '_' + record.ref_no)
      .replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    var colRef = db.collection('reconciliations')
      .doc(record.userEmail.replace(/[^a-z0-9]/gi,'_'))
      .collection('records');
    await colRef.doc(docId).set(record);
    return true;
  } catch (e) {
    console.warn('[Firebase] Save failed:', e.message);
    return false;
  }
}

// ── Load all records from Firestore ──
async function loadFromFirestore(userEmail) {
  if (!firebaseReady || !db) return null;
  try {
    var colRef = db.collection('reconciliations')
      .doc(userEmail.replace(/[^a-z0-9]/gi,'_'))
      .collection('records');
    var snap = await colRef.orderBy('savedAt', 'desc').limit(100).get();
    return snap.docs.map(function(d) { return d.data(); });
  } catch (e) {
    console.warn('[Firebase] Load failed:', e.message);
    return null;
  }
}

// ── Delete a record from Firestore ──
async function deleteFromFirestore(userEmail, atmId, refNo) {
  if (!firebaseReady || !db) return false;
  try {
    var docId = (atmId + '_' + refNo)
      .replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    await db.collection('reconciliations')
      .doc(userEmail.replace(/[^a-z0-9]/gi,'_'))
      .collection('records')
      .doc(docId).delete();
    return true;
  } catch (e) {
    console.warn('[Firebase] Delete failed:', e.message);
    return false;
  }
}

// ── Show cloud sync status in UI ──
function setCloudStatus(msg, color) {
  var el = document.getElementById('cloudStatus');
  if (!el) return;
  el.style.display = 'flex';
  el.style.color   = color || 'var(--muted)';
  el.textContent   = msg;
}

// Init on load
window.addEventListener('load', initFirebase);
