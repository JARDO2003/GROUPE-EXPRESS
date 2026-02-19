self.addEventListener('push', (event) => {
    const data = event.data.json();
    
    const options = {
        body: data.message || '',
        icon: 'https://groupe-express.vercel.app/GE.jpg',
        badge: 'https://groupe-express.vercel.app/GE.jpg',
        vibrate: [200, 100, 200],
        data: {
            url: 'https://groupe-express.vercel.app/shopping.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'GROUPE EXPRESS', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
