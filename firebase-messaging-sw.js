// ================================================================
// firebase-messaging-sw.js — Service Worker Groupe Express
// Gère les notifications push FCM en background + logo GE
// ================================================================

importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Configuration Firebase
firebase.initializeApp({
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
});

const messaging = firebase.messaging();

// ================================================================
// NOTIFICATION EN BACKGROUND (app fermée ou en arrière-plan)
// FCM appelle automatiquement cette fonction quand un message arrive
// ================================================================
messaging.onBackgroundMessage(payload => {
    console.log('[SW] Message en background reçu :', payload);

    const { title, body, icon, image } = payload.notification || {};
    const data = payload.data || {};

    // Options enrichies avec logo Groupe Express
    const notificationOptions = {
        body: body || 'Vous avez un nouveau message de Groupe Express 🍽️',
        icon: icon || '/image/GE.jpg',          // Logo GE (carré 192×192 idéalement)
        badge: '/image/GE.jpg',                  // Petite icône barre de statut Android
        image: image || '/image/at.jpg',         // Image grande (optionnelle)
        tag: data.tag || 'ge-notification-' + Date.now(),
        data: {
            url: data.url || '/',
            code: data.code || '',
            type: data.type || 'general'
        },
        actions: getActions(data.type),
        requireInteraction: data.type === 'order',  // Commandes restent jusqu'au clic
        vibrate: [200, 100, 300, 100, 200],
        silent: false,
        timestamp: Date.now(),
        dir: 'ltr',
        lang: 'fr'
    };

    return self.registration.showNotification(
        title || '🍽️ Groupe Express',
        notificationOptions
    );
});

// Actions selon le type de notification
function getActions(type) {
    switch(type) {
        case 'order':
            return [
                { action: 'view_order', title: '📦 Voir ma commande' },
                { action: 'dismiss', title: '✕ Fermer' }
            ];
        case 'promo':
            return [
                { action: 'view_menu', title: '🍽️ Voir le menu' },
                { action: 'dismiss', title: '✕ Plus tard' }
            ];
        case 'ready':
            return [
                { action: 'confirm', title: '✅ J\'arrive !' },
                { action: 'dismiss', title: '✕ Fermer' }
            ];
        default:
            return [
                { action: 'open', title: '🔗 Ouvrir' },
                { action: 'dismiss', title: '✕ Fermer' }
            ];
    }
}

// ================================================================
// CLIC SUR LA NOTIFICATION
// ================================================================
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification cliquée :', event.action, event.notification.data);

    event.notification.close();

    const data = event.notification.data || {};
    let targetUrl = data.url || '/';

    // Redirection selon l'action
    if (event.action === 'view_order' || event.action === 'open') {
        targetUrl = data.url || '/';
    } else if (event.action === 'view_menu') {
        targetUrl = '/#menu-start';
    } else if (event.action === 'confirm' || event.action === 'dismiss') {
        return; // Juste fermer
    } else {
        // Clic sur le corps de la notification
        targetUrl = data.url || '/';
    }

    // Ouvrir ou focus sur l'onglet existant
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Chercher un onglet déjà ouvert
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    // Envoyer un message au client pour ouvrir la bonne page
                    client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl, data });
                    return;
                }
            }
            // Aucun onglet ouvert → ouvrir une nouvelle fenêtre
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ================================================================
// FERMETURE DE NOTIFICATION (tracking optionnel)
// ================================================================
self.addEventListener('notificationclose', event => {
    console.log('[SW] Notification fermée :', event.notification.tag);
});

// ================================================================
// INSTALLATION & ACTIVATION DU SW
// ================================================================
self.addEventListener('install', event => {
    console.log('[SW] Groupe Express SW installé');
    self.skipWaiting(); // Activer immédiatement sans attendre
});

self.addEventListener('activate', event => {
    console.log('[SW] Groupe Express SW activé');
    event.waitUntil(clients.claim()); // Prendre le contrôle immédiatement
});

// ================================================================
// ÉCOUTER LES MESSAGES DU CLIENT (page → SW)
// ================================================================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon, tag, data, requireInteraction } = event.data;
        self.registration.showNotification(title || '🍽️ Groupe Express', {
            body: body || '',
            icon: icon || '/image/GE.jpg',
            badge: '/image/GE.jpg',
            tag: tag || 'ge-' + Date.now(),
            data: data || {},
            requireInteraction: requireInteraction || false,
            vibrate: [200, 100, 200],
            actions: getActions(data?.type)
        });
    }
});

console.log('[SW] firebase-messaging-sw.js — Groupe Express v2.0 chargé');
