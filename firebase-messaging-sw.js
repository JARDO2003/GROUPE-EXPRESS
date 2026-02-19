importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Message background:', payload);

    self.registration.showNotification(
        payload.notification.title || 'GROUPE EXPRESS',
        {
            body: payload.notification.body || '',
            icon: 'https://groupe-express.vercel.app/GE.jpg',
            badge: 'https://groupe-express.vercel.app/GE.jpg',
            tag: 'fcm-' + Date.now(),
            requireInteraction: true,
            data: payload.data || {}
        }
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('https://groupe-express.vercel.app/shopping.html')
    );
});

self.addEventListener('install', (e) => {
    console.log('[SW] Installe');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[SW] Active');
    e.waitUntil(clients.claim());
});
