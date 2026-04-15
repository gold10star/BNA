// ── sw.js — Service Worker for ATM/BNA Auto Reconciliation PWA ──
const CACHE_NAME = 'bna-recon-v1';

// App shell — files to cache on install for offline use
const APP_SHELL = [
  '/',
  '/index.html',
  '/js/ui.js',
  '/js/scan.js',
  '/js/email.js',
  '/js/main.js',
  '/js/history.js',
  '/js/firebase.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // External CDN resources
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ── Install: cache app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache app shell — ignore failures for external resources
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API calls, cache-first for static assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network-first for API calls (scan, upload, Firebase, EmailJS, Mistral)
  const isApi = url.pathname.startsWith('/api/') ||
                url.hostname.includes('firestore') ||
                url.hostname.includes('googleapis') ||
                url.hostname.includes('emailjs') ||
                url.hostname.includes('mistral') ||
                url.hostname.includes('imgbb') ||
                url.hostname.includes('accounts.google');

  if (isApi) {
    // Network only — never cache API responses
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'You are offline. Please check your connection.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Cache-first for static assets (app shell, fonts, CDN libs)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for static assets
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
