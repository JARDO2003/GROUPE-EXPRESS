importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Gestion des messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Message reçu en arrière-plan:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: payload.data?.tag || 'default',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Ouvrir'
            },
            {
                action: 'close',
                title: 'Fermer'
            }
        ],
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const notificationData = event.notification.data;
    const action = event.action;
    
    if (action === 'close') {
        return;
    }
    
    // Ouvrir ou focus la page index.html
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const urlToOpen = notificationData?.link || '/index.html';
            
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Installation du service worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installé');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activé');
    event.waitUntil(clients.claim());
});
