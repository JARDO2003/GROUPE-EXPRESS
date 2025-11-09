// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
});

const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('Message en arrière-plan:', payload);
    
    const notificationTitle = payload.notification?.title || 'GROUPE EXPRESS';
    const notificationOptions = {
        body: payload.notification?.body || 'Nouvelle notification',
        icon: 'image/GE.jpg',
        badge: 'image/u.png'
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
