// ========================================
// GROUPE EXPRESS - SERVICE WORKER COMPLET
// ========================================

// Version du cache
const CACHE_VERSION = 'v1.0.0';

// Noms des caches
const STATIC_CACHE = `groupe-express-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `groupe-express-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `groupe-express-images-${CACHE_VERSION}`;

// Ressources statiques à précharger
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/main.js',
  '/image/u.png'
];

// Ressources à ne jamais mettre en cache
const NEVER_CACHE = [
  'firebase',
  'firestore.googleapis.com',
  'gstatic.com',
  'chrome-extension',
  'analytics',
  '/api/'
];

// Vérifie si une URL peut être mise en cache
function canCache(url) {
  return !NEVER_CACHE.some(pattern => url.includes(pattern));
}

// ========================================
// INSTALLATION
// ========================================
self.addEventListener('install', event => {
  console.log('[SW] Installation du Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Mise en cache des fichiers statiques...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Erreur lors de l\'installation :', err))
  );
});

// ========================================
// ACTIVATION
// ========================================
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(key)) {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ========================================
// FETCH : Interception des requêtes
// ========================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas gérer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Exclure les URLs à ne pas cacher
  if (!canCache(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // 🔹 1. IMAGES : Stratégie Cache First
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return new Response(
            `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#f5f5f5"/>
              <text x="50%" y="50%" dy=".3em" text-anchor="middle" fill="#aaa" font-size="12">Image</text>
            </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // 🔹 2. DOCUMENTS HTML : Stratégie Network First
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(res => res || caches.match('/index.html')))
    );
    return;
  }

  // 🔹 3. Autres fichiers : Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(err => {
          console.warn('[SW] Fetch échoué:', err);
          if (request.destination === 'document') return caches.match('/index.html');
        });
    })
  );
});

// ========================================
// MESSAGES ENTRE CLIENTS ET SW
// ========================================
self.addEventListener('message', event => {
  console.log('[SW] Message reçu:', event.data);

  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(name => {
        if (name.startsWith('groupe-express-')) return caches.delete(name);
      })))
    );
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// ========================================
// SYNCHRONISATION ARRIÈRE-PLAN
// ========================================
self.addEventListener('sync', event => {
  console.log('[SW] Sync:', event.tag);
  if (event.tag === 'sync-orders') event.waitUntil(syncPendingOrders());
});

async function syncPendingOrders() {
  console.log('[SW] Synchronisation des commandes en attente...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('[SW] Synchronisation terminée ✅');
}

// ========================================
// NOTIFICATIONS PUSH
// ========================================
self.addEventListener('push', event => {
  console.log('[SW] Notification push reçue');
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'GROUPE EXPRESS', body: event.data.text() };
  }

  const title = data.title || 'GROUPE EXPRESS';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/image/u.png',
    badge: '/image/u.png',
    vibrate: [200, 100, 200],
    tag: 'groupe-express-notif',
    data: { url: data.url || '/', date: Date.now() },
    actions: [
      { action: 'open', title: 'Ouvrir', icon: '/image/u.png' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ========================================
// CLIC SUR NOTIFICATION
// ========================================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientsArr => {
        for (const client of clientsArr) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});

// ========================================
// GESTION DES ERREURS
// ========================================
self.addEventListener('error', e => console.error('[SW] Erreur globale:', e.error));
self.addEventListener('unhandledrejection', e => console.error('[SW] Promesse non gérée:', e.reason));

console.log('[SW] Service Worker chargé ✔️ - Version', CACHE_VERSION);
