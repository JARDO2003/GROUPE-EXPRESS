 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
    import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
        authDomain: "livraison-c8498.firebaseapp.com",
        projectId: "livraison-c8498",
        storageBucket: "livraison-c8498.firebasestorage.app",
        messagingSenderId: "403240604780",
        appId: "1:403240604780:web:77d84ad03d68bdaddfb449",
        measurementId: "G-5YF89BZ5RY"
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // ===== CONFIGURATION FCM =====
    const firebaseConfigCompat = {
        apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
        authDomain: "livraison-c8498.firebaseapp.com",
        projectId: "livraison-c8498",
        storageBucket: "livraison-c8498.firebasestorage.app",
        messagingSenderId: "403240604780",
        appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
    };

    firebase.initializeApp(firebaseConfigCompat);
    const messaging = firebase.messaging();

    // VAPID Key
    const VAPID_KEY = "BGL6IVuJSbQjI69fot6FvfGEBmq1t4_hPP1Dhx_KYiIEFCrOLjtYFWjID_MlteNgJtm7FFbdIfBygdRi_IF-qng";

    let notificationInterval = null;
// Fonction pour demander la permission de notification
window.requestNotificationPermission = async function() {
    try {
        // Vérifier d'abord l'état actuel de la permission
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'denied') {
            // Permission bloquée - montrer les instructions
            showPermissionBlockedInstructions();
            return;
        }
        
        if (currentPermission === 'granted') {
            // Permission déjà accordée - obtenir le token directement
            try {
                const token = await messaging.getToken({ vapidKey: VAPID_KEY });
                console.log('FCM Token:', token);
                
                localStorage.setItem('fcmToken', token);
                localStorage.setItem('notificationsEnabled', 'true');
                updateNotificationButton(true);
                startPeriodicNotifications();
                showNotificationStatus('✅ Notifications activées!', '#28a745');
            } catch (tokenError) {
                console.error('Erreur token:', tokenError);
                showNotificationStatus('❌ Erreur d\'activation', '#dc3545');
            }
            return;
        }
        
        // Demander la permission (seulement si 'default')
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Permission accordée');
            
            try {
                // Obtenir le token FCM
                const token = await messaging.getToken({ vapidKey: VAPID_KEY });
                console.log('FCM Token:', token);
                
                // Sauvegarder le token localement
                localStorage.setItem('fcmToken', token);
                localStorage.setItem('notificationsEnabled', 'true');
                
                // Mettre à jour l'interface
                updateNotificationButton(true);
                
                // Démarrer les notifications périodiques
                startPeriodicNotifications();
                
                // Message de confirmation
                showNotificationStatus('✅ Notifications activées!', '#28a745');
            } catch (tokenError) {
                console.error('Erreur token:', tokenError);
                showNotificationStatus('❌ Erreur d\'activation', '#dc3545');
            }
            
        } else if (permission === 'denied') {
            console.log('Permission refusée');
            showPermissionBlockedInstructions();
            localStorage.setItem('notificationsEnabled', 'false');
            updateNotificationButton(false);
            stopPeriodicNotifications();
        } else {
            // Permission ignorée (dismissed)
            console.log('Permission ignorée');
            showNotificationStatus('⚠️ Permission non accordée', '#ff9800');
            localStorage.setItem('notificationsEnabled', 'false');
            updateNotificationButton(false);
        }
    } catch (error) {
        console.error('Erreur permission:', error);
        
        if (error.code === 'messaging/permission-blocked') {
            showPermissionBlockedInstructions();
        } else {
            showNotificationStatus('❌ Erreur: ' + error.message, '#dc3545');
        }
    }
};

// Fonction pour afficher les instructions quand la permission est bloquée
function showPermissionBlockedInstructions() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 20px; padding: 2rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔔🚫</div>
                    <h2 style="color: #dc3545; margin-bottom: 0.5rem;">Notifications bloquées</h2>
                    <p style="color: #666; font-size: 0.9rem;">Les notifications ont été bloquées par votre navigateur</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem; color: #333;">📱 Comment débloquer :</h3>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #667eea;">Chrome / Edge :</strong>
                        <ol style="margin: 0.5rem 0 0 1.5rem; line-height: 1.8; font-size: 0.9rem;">
                            <li>Cliquez sur l'icône 🔒 ou ⓘ à gauche de l'URL</li>
                            <li>Trouvez "Notifications"</li>
                            <li>Changez de "Bloquer" à "Autoriser"</li>
                            <li>Rafraîchissez la page (F5)</li>
                        </ol>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #667eea;">Firefox :</strong>
                        <ol style="margin: 0.5rem 0 0 1.5rem; line-height: 1.8; font-size: 0.9rem;">
                            <li>Cliquez sur l'icône 🔒 à gauche de l'URL</li>
                            <li>Cliquez sur "Paramètres de connexion" > "Plus d'informations"</li>
                            <li>Allez dans l'onglet "Permissions"</li>
                            <li>Décochez "Utiliser par défaut" pour "Afficher des notifications"</li>
                            <li>Sélectionnez "Autoriser"</li>
                        </ol>
                    </div>
                    
                    <div>
                        <strong style="color: #667eea;">Safari (Mac) :</strong>
                        <ol style="margin: 0.5rem 0 0 1.5rem; line-height: 1.8; font-size: 0.9rem;">
                            <li>Safari > Préférences > Sites web</li>
                            <li>Cliquez sur "Notifications"</li>
                            <li>Trouvez ce site et changez en "Autoriser"</li>
                        </ol>
                    </div>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    J'ai compris
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
// Vérifier l'état des permissions au chargement et afficher le statut
function checkNotificationPermissionStatus() {
    const permission = Notification.permission;
    const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    
    if (permission === 'denied') {
        // Permission bloquée
        updateNotificationButton(false);
        localStorage.setItem('notificationsEnabled', 'false');
        stopPeriodicNotifications();
    } else if (permission === 'granted' && notifEnabled) {
        // Permission accordée et notifications activées
        updateNotificationButton(true);
        startPeriodicNotifications();
    } else {
        // Permission pas encore demandée ou refusée
        updateNotificationButton(false);
    }
}

    // Fonction pour démarrer les notifications périodiques (toutes les 2 secondes)
    function startPeriodicNotifications() {
        // Arrêter l'intervalle existant s'il y en a un
        if (notificationInterval) {
            clearInterval(notificationInterval);
        }

        // Messages de remerciement variés
        const thankYouMessages = [
            "Merci de votre confiance! 🙏",
            "Groupe Express vous remercie! ❤️",
            "Merci pour votre fidélité! 🌟",
            "Nous apprécions votre soutien! 🎉",
            "Un grand merci à vous! 💖",
            "Merci d'être avec nous! 🤝",
            "Votre satisfaction est notre priorité! 😊",
            "Merci pour votre commande! 🍽️"
        ];

        let messageIndex = 0;

        notificationInterval = setInterval(() => {
            // Vérifier que les notifications sont toujours activées
            const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true';
            
            // Vérifier que le document n'est pas visible (utilisateur pas sur la page)
            if (notifEnabled && document.hidden) {
                const message = thankYouMessages[messageIndex % thankYouMessages.length];
                
                // Envoyer la notification
                sendThankYouNotification(message);
                
                messageIndex++;
            }
        }, 2000); // Toutes les 2 secondes
    }

    // Fonction pour arrêter les notifications périodiques
    function stopPeriodicNotifications() {
        if (notificationInterval) {
            clearInterval(notificationInterval);
            notificationInterval = null;
        }
    }

    // Fonction pour envoyer une notification de remerciement
    function sendThankYouNotification(message) {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('GROUPE EXPRESS 🍽️', {
                    body: message,
                    icon: 'image/GE.jpg',
                    badge: 'image/u.png',
                    tag: 'thank-you-notification',
                    requireInteraction: false,
                    vibrate: [200, 100, 200],
                    data: {
                        url: window.location.origin
                    }
                });
            });
        }
    }

    // Mettre à jour le bouton de notification
    function updateNotificationButton(enabled) {
        const status = document.getElementById('notification-status');
        const button = document.querySelector('#notification-button button');
        
        if (enabled) {
            status.style.display = 'none';
            button.style.background = 'linear-gradient(135deg, #28a745, #34ce57)';
            button.innerHTML = '🔔';
        } else {
            status.style.display = 'flex';
            status.textContent = 'OFF';
            button.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
            button.innerHTML = '🔕';
        }
    }

    // Afficher le statut de notification
    function showNotificationStatus(message, color) {
        const statusDiv = document.createElement('div');
        statusDiv.innerHTML = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => statusDiv.remove(), 300);
        }, 3000);
    }

    // Gérer les messages reçus quand l'app est au premier plan
    messaging.onMessage((payload) => {
        console.log('Message reçu:', payload);
        
        if (payload.notification) {
            const notificationTitle = payload.notification.title || 'GROUPE EXPRESS';
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon || 'image/GE.jpg',
                badge: 'image/u.png',
                tag: 'fcm-notification',
                requireInteraction: false
            };
            
            if (Notification.permission === 'granted') {
                new Notification(notificationTitle, notificationOptions);
            }
        }
    });

   // Vérifier l'état des notifications au chargement
window.addEventListener('load', () => {
    checkNotificationPermissionStatus();
});
    // Gérer la visibilité de la page
    document.addEventListener('visibilitychange', () => {
        const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        
        if (document.hidden && notifEnabled) {
            // Page cachée - les notifications vont s'envoyer
            console.log('Page cachée - notifications actives');
        } else {
            // Page visible - les notifications ne s'envoient pas
            console.log('Page visible - notifications en pause');
        }
    });

    // Basculer les notifications au clic sur le bouton
    document.addEventListener('DOMContentLoaded', () => {
        const notificationButton = document.querySelector('#notification-button button');
        
        notificationButton.addEventListener('click', async () => {
            const notifEnabled = localStorage.getItem('notificationsEnabled') === 'true';
            
            if (notifEnabled) {
                // Désactiver les notifications
                localStorage.setItem('notificationsEnabled', 'false');
                updateNotificationButton(false);
                stopPeriodicNotifications();
                showNotificationStatus('🔕 Notifications désactivées', '#dc3545');
            } else {
                // Demander la permission
                await window.requestNotificationPermission();
            }
        });
    });

    // Exposition des fonctions
    window.db = db;

    window.submitOrder = function(order) {
        const timestamp = Date.now();
        const mainCategory = order.items.length > 0 ? order.items[0].category : 'A';
        const uniqueCode = `#GE${mainCategory}${timestamp.toString().slice(-6)}`;
        
        order.code = uniqueCode;
        order.timestamp = new Date().toISOString();
        order.status = "nouveau";
        order.createdAt = new Date();
        
        return addDoc(collection(db, 'orders'), order)
            .then((docRef) => {
                console.log('Commande envoyée avec succès, ID:', docRef.id);
                return uniqueCode;
            })
            .catch((error) => {
                console.error('Erreur Firebase:', error);
                return false;
            });
    };

    window.db = db;

    // DÉCLARATIONS GLOBALES
    let cart = [];
    let total = 0;
    let customerOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];

    // Données pour les plats de riz
    const riceOptions = [
        { format: 'Petit', price: 500, icon: '🍚', desc: 'Format individuel' },
        { format: 'Moyen', price: 1000, icon: '🥘', desc: 'Pour 1-2 personnes' },
        { format: 'Grand', price: 1500, icon: '🍲', desc: 'Pour 2-3 personnes' },
        { format: 'XXL', price: 2000, icon: '🥣', desc: 'Pour la famille' }
    ];

    // Données pour les préparations de porc
    const porcPreparations = [
        { type: 'Sauté', icon: '🔥', desc: 'Porc sauté revenu à la perfection' },
        { type: 'Grillé', icon: '🍖', desc: 'Porc grillé croustillant' },
        { type: 'Soupe', icon: '🍜', desc: 'Porc en soupe savoureuse' }
    ];

    // Données pour les types de tchèpe
    const tchepTypes = [
        { type: 'Rouge', icon: '🔴', desc: 'Tchèpe sauce rouge traditionnelle' },
        { type: 'Jaune', icon: '🟡', desc: 'Tchèpe sauce jaune délicate' }
    ];

    let currentSelection = {
        type: '',
        baseName: '',
        basePrice: 0,
        format: ''
    };

    const degueTypes = {
        'raisin': {
            name: 'Dêguê raisin',
            prices: {
                'Sachet': 250,
                'Petit bidon': 500,
                'Moyen bidon': 1500,
                'Grand bidon': 3000
            }
        },
        'coco': {
            name: 'Dêguê coco',
            prices: {
                'Sachet': 300,
                'Petit bidon': 600,
                'Moyen bidon': 1600,
                'Grand bidon': 3500
            }
        },
        'simple': {
            name: 'Dêguê simple',
            prices: {
                'Sachet': 200,
                'Petit bidon': 500,
                'Moyen bidon': 1500,
                'Grand bidon': 3000
            }
        },
        'raisin-coco': {
            name: 'Dêguê raisin coco',
            prices: {
                'Sachet': 400,
                'Petit bidon': 700,
                'Moyen bidon': 1700,
                'Grand bidon': 3600
            }
        }
    };

    let currentDegueType = '';
    let currentAdIndex = 0;
    let adsAutoPlay = true;
    let adsInterval;

    // FONCTIONS DE SÉLECTION
    function selectRice(riceName) {
        currentSelection = {
            type: 'rice',
            baseName: riceName,
            basePrice: 0,
            format: ''
        };
        
        document.getElementById('selection-modal-title').textContent = `🍛 ${riceName}`;
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        riceOptions.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité de ${riceName} (${option.format}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`${riceName} (${option.format})`, option.price, 'C', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${option.icon}</div>
                    <div class="selection-option-details">
                        <h4>${option.format}</h4>
                        <p>${option.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${option.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectPorc(price, format) {
        currentSelection = {
            type: 'porc',
            baseName: `Porc au four (${format})`,
            basePrice: price,
            format: format
        };
        
        document.getElementById('selection-modal-title').textContent = `🐷 Porc au four (${format})`;
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre préparation';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        porcPreparations.forEach(prep => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité de Porc ${prep.type} (${format}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Porc ${prep.type} (${format})`, price, 'D', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${prep.icon}</div>
                    <div class="selection-option-details">
                        <h4>${prep.type}</h4>
                        <p>${prep.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectTchep(tchepName, price) {
        currentSelection = {
            type: 'tchep',
            baseName: tchepName,
            basePrice: price,
            format: ''
        };
        
        document.getElementById('selection-modal-title').textContent = `🍚 ${tchepName}`;
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre type';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        tchepTypes.forEach(type => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité de ${tchepName} ${type.type} :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`${tchepName} ${type.type}`, price, 'B', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${type.icon}</div>
                    <div class="selection-option-details">
                        <h4>Tchèpe ${type.type}</h4>
                        <p>${type.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function closeSelectionModal() {
        document.getElementById('selection-modal').classList.remove('show');
        currentSelection = {
            type: '',
            baseName: '',
            basePrice: 0,
            format: ''
        };
    }

    function selectDegue(type) {
        currentDegueType = type;
        const degueData = degueTypes[type];
        
        document.getElementById('degue-modal-title').textContent = `🥛 Choisir votre format de ${degueData.name}`;
        
        const optionsContainer = document.getElementById('degue-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { key: 'Sachet', icon: '📦', desc: 'Format individuel' },
            { key: 'Petit bidon', icon: '🥤', desc: 'Pour 1-2 personnes' },
            { key: 'Moyen bidon', icon: '🪣', desc: 'Pour 3-4 personnes' },
            { key: 'Grand bidon', icon: '🛢️', desc: 'Pour 5+ personnes' }
        ];
        
        formats.forEach(format => {
            const price = degueData.prices[format.key];
            const optionDiv = document.createElement('div');
            optionDiv.className = 'degue-option';
            optionDiv.onclick = () => addDegueToCart(format.key, price);
            optionDiv.innerHTML = `
                <div class="degue-option-info">
                    <div class="degue-option-icon">${format.icon}</div>
                    <div class="degue-option-details">
                        <h4>${format.key}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="degue-option-price">${price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        const modal = document.getElementById('degue-modal');
        modal.classList.add('show');
    }

    function closeDegueModal() {
        const modal = document.getElementById('degue-modal');
        modal.classList.remove('show');
    }

    function addDegueToCart(format, price) {
        const degueData = degueTypes[currentDegueType];
        const qty = prompt(`Quantité de ${degueData.name} (${format}) :`, "1");
        const quantity = parseInt(qty, 10);
        if (!isNaN(quantity) && quantity > 0) {
            addToCart(`${degueData.name} (${format})`, price, 'F', quantity);
            closeDegueModal();
        }
    }

    function checkOrderingHours() {
        const now = new Date();
        const abidjanTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Abidjan"}));
        const hour = abidjanTime.getHours();
        const minutes = abidjanTime.getMinutes();
        
        const timeAlert = document.getElementById('time-alert');
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        const checkoutButton = document.querySelector('.checkout-btn');
        
        timeAlert.classList.remove('urgent', 'warning');
        
        let alertMessage = '';
        let alertClass = '';
        
        if (hour >= 0 && hour < 10) {
            alertMessage = `⚡ URGENT : Commandez AVANT 10H pour un retrait IMMÉDIAT au stand du groupe Express ! Il vous reste ${9 - hour}h${60 - minutes < 10 ? '0' : ''}${60 - minutes}min`;
            alertClass = 'urgent';
            timeAlert.style.display = 'block';
        } 
        else if (hour >= 10) {
            alertMessage = `⚠️ ATTENTION : Les commandes après 10H sont traitées pour DEMAIN - Retrait au stand du groupe Express`;
            alertClass = 'warning';
            timeAlert.style.display = 'block';
        }
        
        timeAlert.innerHTML = alertMessage;
        if (alertClass) {
            timeAlert.classList.add(alertClass);
        }
        
        addToCartButtons.forEach(btn => {
            btn.disabled = false;
            if (btn.textContent.includes('⏰')) {
                btn.innerHTML = '🛒 Ajouter au panier';
            }
        });
        
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = '🎯 Commander maintenant';
        }
    }

    function slideAds(direction) {
        const slider = document.getElementById('ads-slider');
        const adsContainer = document.querySelector('.ads-container');
        const totalAds = 3;
        
        slider.style.animation = 'none';
        adsAutoPlay = false;
        clearInterval(adsInterval);
        
        if (direction === 'next') {
            currentAdIndex = (currentAdIndex + 1) % totalAds;
        } else {
            currentAdIndex = (currentAdIndex - 1 + totalAds) % totalAds;
        }
        
        const containerWidth = adsContainer.offsetWidth;
        const translateX = -(currentAdIndex * containerWidth);
        
        slider.style.transition = 'transform 0.5s ease-in-out';
        slider.style.transform = `translateX(${translateX}px)`;
        
        setTimeout(() => {
            slider.style.animation = 'slideAds 45s infinite linear';
            adsAutoPlay = true;
            startAdsAutoPlay();
        }, 5000);
    }

    function startAdsAutoPlay() {
        if (adsInterval) clearInterval(adsInterval);
        adsInterval = setInterval(() => {
            if (adsAutoPlay) {
                slideAds('next');
            }
        }, 15000);
    }

    function toggleCart() {
        const modal = document.getElementById('cart-modal');
        modal.classList.toggle('show');
    }

    function updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function promptAddToCart(name, price, category) {
        const qty = prompt("Choisir la quantité :", "1");
        const quantity = parseInt(qty, 10);
        if (!isNaN(quantity) && quantity > 0) {
            addToCart(name, price, category, quantity);
        }
    }

    function addToCart(name, price, category, qty = 1) {
        cart.push({ name, price, category, qty });
        updateCart();
        updateCartBadge();
        
        const notification = document.createElement('div');
        notification.innerHTML = `✅ ${qty} ${name} ajouté(s) au panier!`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--gradient);
            color: white;
            padding: 1rem 2rem;
            border-radius: 50px;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            font-weight: 600;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function updateCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        cartItems.innerHTML = '';
        total = 0;
        
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <p>Votre panier est vide</p>
                </div>
            `;
        } else {
            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=E1306C&color=fff&size=40" class="cart-item-image" alt="${item.name}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.qty}x ${item.name}</div>
                        <div class="cart-item-price">${item.price * item.qty} FCFA</div>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
                `;
                cartItems.appendChild(cartItem);
                total += item.price * item.qty;
            });
        }
        cartTotal.textContent = `Total: ${total.toLocaleString()} FCFA`;
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        updateCart();
        updateCartBadge();
    }

    function addCustomerOrderToList(orderCode, order) {
        const summary = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        const entry = {
            code: orderCode,
            summary,
            total: order.total,
            date: new Date().toLocaleString()
        };
        customerOrders.push(entry);
        localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
        updateOrdersList();
    }

    function updateOrdersList() {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';
        
        if (customerOrders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>Aucune commande</h3>
                    <p>Vos commandes apparaîtront ici</p>
                </div>
            `;
        } else {
            customerOrders.slice().reverse().forEach(entry => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'order-item-history';
                orderDiv.style.cssText = `
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                `;
                orderDiv.innerHTML = `
                    <div style="font-weight: 600; color: var(--primary); margin-bottom: 0.5rem;">${entry.code}</div>
                    <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">${entry.summary}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: var(--primary);">${entry.total} FCFA</span>
                        <span style="font-size: 0.75rem; color: var(--on-surface-light);">${entry.date}</span>
                    </div>
                `;
                ordersList.appendChild(orderDiv);
            });
        }
    }

    function toggleOrders() {
        const modal = document.getElementById('orders-modal');
        modal.classList.toggle('show');
        updateOrdersList();
    }

    function clearOrders() {
        if (confirm("Vider l'historique des commandes ?")) {
            customerOrders = [];
            localStorage.removeItem('customerOrders');
            updateOrdersList();
        }
    }

    function selectAttiekeDindon() {
        document.getElementById('selection-modal-title').textContent = '🦃 Attiékè Dindon';
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { name: 'Petit', price: 700, icon: '🍽️', desc: 'Format individuel' },
            { name: 'Moyen', price: 1000, icon: '🥘', desc: 'Pour 1-2 personnes' },
            { name: 'Grand', price: 1500, icon: '🍲', desc: 'Pour 2-3 personnes' },
            { name: 'XXL', price: 2000, icon: '🥣', desc: 'Format familial' }
        ];
        
        formats.forEach(format => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité d'Attiékè Dindon (${format.name}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Attiékè Dindon (${format.name})`, format.price, 'E', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${format.icon}</div>
                    <div class="selection-option-details">
                        <h4>${format.name}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${format.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectAttiekePoisson() {
        document.getElementById('selection-modal-title').textContent = '🐟 Attiékè Poisson Alloko';
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { name: 'Petit', price: 1000, icon: '🍽️', desc: 'Format individuel' },
            { name: 'Moyen', price: 1500, icon: '🥘', desc: 'Pour 1-2 personnes' },
            { name: 'Grand', price: 2000, icon: '🍲', desc: 'Format généreux' }
        ];
        
        formats.forEach(format => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité d'Attiékè Poisson Alloko (${format.name}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Attiékè Poisson Alloko (${format.name})`, format.price, 'E', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${format.icon}</div>
                    <div class="selection-option-details">
                        <h4>${format.name}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${format.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectGarba() {
        document.getElementById('selection-modal-title').textContent = '🥘 Spécialité Garba';
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { name: 'Petit', price: 500, icon: '🍽️', desc: 'Format individuel' },
            { name: 'Moyen', price: 1000, icon: '🥘', desc: 'Pour 1-2 personnes' },
            { name: 'Grand', price: 1500, icon: '🍲', desc: 'Pour 2-3 personnes' },
            { name: 'XXL', price: 2000, icon: '🥣', desc: 'Format familial' }
        ];
        
        formats.forEach(format => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité de Garba (${format.name}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Garba (${format.name})`, format.price, 'E', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${format.icon}</div>
                    <div class="selection-option-details">
                        <h4>${format.name}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${format.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectAttiekePoulet() {
        document.getElementById('selection-modal-title').textContent = '🍗 Attiékè Poulet + Condiment';
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { name: 'Petit', price: 1000, icon: '🍽️', desc: 'Format individuel' },
            { name: 'Moyen', price: 1500, icon: '🥘', desc: 'Pour 1-2 personnes' },
            { name: 'Grand', price: 2000, icon: '🍲', desc: 'Format généreux' }
        ];
        
        formats.forEach(format => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité d'Attiékè Poulet + Condiment (${format.name}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Attiékè Poulet + Condiment (${format.name})`, format.price, 'E', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${format.icon}</div>
                    <div class="selection-option-details">
                        <h4>${format.name}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${format.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    function selectAttiekePouletAlloko() {
        document.getElementById('selection-modal-title').textContent = '🍗🍌 Attiékè Poulet Alloko + Condiment';
        document.getElementById('selection-modal-subtitle').textContent = 'Choisissez votre format';
        
        const optionsContainer = document.getElementById('selection-options');
        optionsContainer.innerHTML = '';
        
        const formats = [
            { name: 'Petit', price: 1500, icon: '🍽️', desc: 'Format individuel' },
            { name: 'Moyen', price: 2000, icon: '🥘', desc: 'Pour 1-2 personnes' },
            { name: 'Grand', price: 2500, icon: '🍲', desc: 'Format généreux' }
        ];
        
        formats.forEach(format => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'selection-option';
            optionDiv.onclick = () => {
                const qty = prompt(`Quantité d'Attiékè Poulet Alloko + Condiment (${format.name}) :`, "1");
                const quantity = parseInt(qty, 10);
                if (!isNaN(quantity) && quantity > 0) {
                    addToCart(`Attiékè Poulet Alloko + Condiment (${format.name})`, format.price, 'E', quantity);
                    closeSelectionModal();
                }
            };
            optionDiv.innerHTML = `
                <div class="selection-option-info">
                    <div class="selection-option-icon">${format.icon}</div>
                    <div class="selection-option-details">
                        <h4>${format.name}</h4>
                        <p>${format.desc}</p>
                    </div>
                </div>
                <div class="selection-option-price">${format.price} FCFA</div>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('selection-modal').classList.add('show');
    }

    // EXPOSITION DES FONCTIONS AU SCOPE GLOBAL
    window.selectRice = selectRice;
    window.selectPorc = selectPorc;
    window.selectTchep = selectTchep;
    window.closeSelectionModal = closeSelectionModal;
    window.selectDegue = selectDegue;
    window.closeDegueModal = closeDegueModal;
    window.addDegueToCart = addDegueToCart;
    window.slideAds = slideAds;
    window.promptAddToCart = promptAddToCart;
    window.removeFromCart = removeFromCart;
    window.toggleOrders = toggleOrders;
    window.clearOrders = clearOrders;
    window.toggleCart = toggleCart;
    window.selectAttiekeDindon = selectAttiekeDindon;
    window.selectAttiekePoisson = selectAttiekePoisson;
    window.selectGarba = selectGarba;
    window.selectAttiekePoulet = selectAttiekePoulet;
    window.selectAttiekePouletAlloko = selectAttiekePouletAlloko;

    // INITIALISATION AU CHARGEMENT
    document.addEventListener('DOMContentLoaded', function() {
        checkOrderingHours();
        setInterval(checkOrderingHours, 60000);
        startAdsAutoPlay();
        updateOrdersList();
    });

    // GESTION FORMULAIRE DE COMMANDE AVEC NOM ET WHATSAPP
    document.getElementById('order-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (cart.length === 0) {
            alert("Votre panier est vide !");
            return;
        }
        
        // Demander le nom
        const customerName = prompt("Entrez votre nom complet :", "");
        if (!customerName || customerName.trim() === "") {
            alert("❌ Veuillez entrer votre nom pour continuer");
            return;
        }
        
        // Demander le WhatsApp
        const whatsappNumber = prompt("Entrez votre numéro WhatsApp :\n(ex: 0712345678 ou +2250712345678)", "");
        if (!whatsappNumber || whatsappNumber.trim() === "") {
            alert("❌ Veuillez entrer votre numéro WhatsApp pour continuer");
            return;
        }
        
        // Validation simple du numéro
        const cleanNumber = whatsappNumber.replace(/\s+/g, '');
        if (cleanNumber.length < 8) {
            alert("❌ Numéro WhatsApp invalide. Veuillez réessayer.");
            return;
        }
        
        // Vérifier la connexion
        if (!navigator.onLine) {
            alert("❌ Pas de connexion internet\n\nVeuillez vérifier votre connexion et réessayer.");
            return;
        }
        
        const now = new Date();
        const abidjanTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Abidjan"}));
        const hour = abidjanTime.getHours();
        
        const loader = document.createElement('div');
        loader.id = 'order-loader';
        loader.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; animation: spin 1s linear infinite;">⏳</div>
                <h3 style="margin-top: 1rem;">Envoi en cours...</h3>
                <p id="loader-status" style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7;">Préparation de votre commande...</p>
            </div>
        `;
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--surface);
            padding: 2rem 3rem;
            border-radius: 20px;
            z-index: 1002;
            box-shadow: var(--shadow-lg);
        `;
        document.body.appendChild(loader);
        
        try {
            const order = {
                customer: {
                    name: customerName.trim(),
                    whatsapp: cleanNumber
                },
                items: [...cart],
                total,
                timestamp: new Date().toISOString(),
                deliveryDate: hour >= 10 ? 'lendemain' : 'aujourdhui'
            };
            
            const orderCode = await window.submitOrder(order);
            
            loader.remove();
            
            if (!orderCode) {
                throw new Error("Code de commande non reçu");
            }
            
            // Sauvegarder localement
            const localOrder = {
                code: orderCode,
                order: order,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('lastSuccessfulOrder', JSON.stringify(localOrder));
            
            // Sauvegarder dans l'historique
            addCustomerOrderToList(orderCode, order);
            
            // Vider le panier
            cart = [];
            updateCart();
            updateCartBadge();
            toggleCart();
            
            // Message de succès avec info de retrait
            const pickupMessage = document.createElement('div');
            let deliveryInfo = '';
            
            if (hour >= 0 && hour < 10) {
                deliveryInfo = `
                    <div style="background: linear-gradient(135deg, #28a745, #34ce57); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1rem;">
                        ✅ <strong>RETRAIT IMMÉDIAT</strong><br><br>
                        Veuillez passer au stand du groupe Express à 12H00<br>
                        pour le retrait de votre commande !<br><br>
                        📍 <strong>RETRAIT AU STAND DU GROUPE EXPRESS À 12H 00</strong>
                    </div>
                `;
            } else {
                deliveryInfo = `
                    <div style="background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1rem;">
                        ⏳ <strong>EN COURS DE TRAITEMENT</strong><br><br>
                        Votre commande sera prête demain<br>
                        Retrait au stand du groupe Express à 12H00<br><br>
                        📍 <strong>RETRAIT AU STAND DU GROUPE EXPRESS À 12H 00</strong>
                    </div>
                `;
            }
            
            pickupMessage.innerHTML = `
                <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.1); border: none; color: #333; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center;">×</button>
                <div style="text-align: center; margin-bottom: 1rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                    <h3>Commande ${orderCode} envoyée !</h3>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">Client: ${customerName}</p>
                    <p style="font-size: 0.85rem; opacity: 0.8;">WhatsApp: ${cleanNumber}</p>
                </div>
                ${deliveryInfo}
                <div style="text-align: center; font-size: 0.875rem; color: var(--on-surface-light);">
                    Merci de votre confiance ! 🙏
                </div>
            `;
            pickupMessage.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface);
                padding: 2rem;
                border-radius: 20px;
                z-index: 1002;
                max-width: 350px;
                box-shadow: var(--shadow-lg);
                border: 2px solid var(--primary);
            `;
            document.body.appendChild(pickupMessage);
            
            setTimeout(() => {
                if (pickupMessage.parentElement) {
                    pickupMessage.remove();
                }
            }, 8000);
            
        } catch (error) {
            const loaderEl = document.getElementById('order-loader');
            if (loaderEl) loaderEl.remove();
            
            console.error('Erreur détaillée:', error);
            
            let errorMessage = "";
            let errorIcon = "❌";
            
            if (!navigator.onLine) {
                errorIcon = "📡";
                errorMessage = "Connexion internet perdue\n\n";
                errorMessage += "• Vérifiez votre connexion WiFi ou données mobiles\n";
                errorMessage += "• Réessayez dans quelques instants\n\n";
                errorMessage += "💡 Votre panier est sauvegardé !";
            } else if (error.message.includes('timeout') || error.message.includes('network')) {
                errorIcon = "⚠️";
                errorMessage = "Connexion trop lente\n\n";
                errorMessage += "• Votre connexion internet est très faible\n";
                errorMessage += "• Rapprochez-vous d'une source WiFi\n";
                errorMessage += "• Ou réessayez avec une meilleure connexion\n\n";
                errorMessage += "💡 Votre panier est sauvegardé !";
            } else {
                errorIcon = "⚠️";
                errorMessage = "Erreur inattendue\n\n";
                errorMessage += "• Fermez et rouvrez l'application\n";
                errorMessage += "• Ou contactez le support: 07 19 98 30 44\n\n";
                errorMessage += "💡 Votre panier est sauvegardé !";
            }
            
            const errorModal = document.createElement('div');
            errorModal.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">${errorIcon}</div>
                    <h3 style="margin-bottom: 1rem; color: #dc3545;">Envoi échoué</h3>
                    <p style="white-space: pre-line; line-height: 1.6; font-size: 0.95rem;">${errorMessage}</p>
                    <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 1.5rem; background: var(--gradient); color: white; border: none; padding: 0.75rem 2rem; border-radius: 25px; cursor: pointer; font-weight: 600;">
                        Compris
                    </button>
                </div>
            `;
            errorModal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface);
                padding: 2rem;
                border-radius: 20px;
                z-index: 1003;
                max-width: 90%;
                width: 400px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(errorModal);
        }
    });

    // Fermer les modals en cliquant à l'extérieur
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal') || 
            e.target.classList.contains('cart-modal') || 
            e.target.classList.contains('degue-modal') ||
            e.target.classList.contains('selection-modal')) {
            e.target.classList.remove('show');
        }
    });

    // GESTION DU SWIPE POUR LES PUBLICITÉS
    let touchStartX = 0;
    let touchEndX = 0;
    let isTouching = false;

    const adsContainer = document.querySelector('.ads-container');
    if (adsContainer) {
        adsContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            isTouching = true;
            const slider = document.getElementById('ads-slider');
            if (slider) {
                slider.classList.add('paused');
            }
            adsAutoPlay = false;
            clearInterval(adsInterval);
        }, { passive: true });

        adsContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            isTouching = false;
            handleSwipe();
            
            setTimeout(() => {
                const slider = document.getElementById('ads-slider');
                if (slider) {
                    slider.classList.remove('paused');
                }
                adsAutoPlay = true;
                startAdsAutoPlay();
            }, 5000);
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        
        if (touchEndX < touchStartX - swipeThreshold) {
            slideAds('next');
        }
        
        if (touchEndX > touchStartX + swipeThreshold) {
            slideAds('prev');
        }
    }

    // Gestion de l'indicateur de scroll
    const navStories = document.querySelector('.nav-stories');
    const scrollHint = document.getElementById('scroll-hint');
    const scrollDots = document.querySelectorAll('.scroll-dot');
    
    if (navStories && scrollHint) {
        let hasScrolled = false;
        
        navStories.addEventListener('scroll', function() {
            if (!hasScrolled && navStories.scrollLeft > 20) {
                hasScrolled = true;
                scrollHint.style.opacity = '0';
                setTimeout(() => {
                    scrollHint.style.display = 'none';
                }, 300);
            }
            
            updateScrollDots();
        });
        
        function updateScrollDots() {
            const scrollPercentage = (navStories.scrollLeft / (navStories.scrollWidth - navStories.clientWidth)) * 100;
            
            scrollDots.forEach((dot, index) => {
                dot.classList.remove('active');
                if (scrollPercentage < 33 && index === 0) {
                    dot.classList.add('active');
                } else if (scrollPercentage >= 33 && scrollPercentage < 66 && index === 1) {
                    dot.classList.add('active');
                } else if (scrollPercentage >= 66 && index === 2) {
                    dot.classList.add('active');
                }
            });
        }
        
        setTimeout(() => {
            if (!hasScrolled) {
                scrollHint.style.transition = 'opacity 0.5s';
                scrollHint.style.opacity = '0.3';
            }
        }, 5000);
    }

// Enregistrement du Service Worker pour PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker enregistré:', registration.scope);
            })
            .catch((error) => {
                console.log('Erreur Service Worker:', error);
            });
    });
}

// Gestion de la bannière d'installation PWA
let deferredPrompt;

// Fonction pour déclencher l'installation
window.triggerInstallPrompt = async function() {
    const installStatus = document.getElementById('install-status');
    const downloadBtn = document.querySelector('#download-button button');
    
    if (deferredPrompt) {
        // Prompt d'installation disponible
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('Installation acceptée');
                showNotificationStatus('✅ Application installée!', '#28a745');
                installStatus.style.display = 'flex';
                downloadBtn.style.background = 'linear-gradient(135deg, #28a745, #34ce57)';
            } else {
                console.log('Installation refusée');
                showNotificationStatus('❌ Installation annulée', '#dc3545');
            }
            deferredPrompt = null;
        } catch (error) {
            console.error('Erreur installation:', error);
            showNotificationStatus('❌ Erreur d\'installation', '#dc3545');
        }
    } else {
        // Pas de prompt disponible - afficher les instructions
        showInstallInstructions();
    }
};

// Fonction pour afficher les instructions d'installation
function showInstallInstructions() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 20px; padding: 2rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📱</div>
                    <h2 style="color: #ff4e00; margin-bottom: 0.5rem;">Installer l'Application</h2>
                    <p style="color: #666; font-size: 0.9rem;">Accédez rapidement à GROUPE EXPRESS</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem; color: #333;">📱 Comment installer :</h3>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #ff4e00;">Chrome / Edge (Android) :</strong>
                        <ol style="margin: 0.5rem 0 0 1.5rem; line-height: 1.8; font-size: 0.9rem;">
                            <li>Cliquez sur le menu ⋮ (en haut à droite)</li>
                            <li>Sélectionnez "Ajouter à l'écran d'accueil"</li>
                            <li>Confirmez l'installation</li>
                        </ol>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: #ff4e00;">Safari (iPhone) :</strong>
                        <ol style="margin: 0.5rem 0 0 1.5rem; line-height: 1.8; font-size: 0.9rem;">
                            <li>Appuyez sur le bouton Partager 📤</li>
                            <li>Faites défiler et sélectionnez "Sur l'écran d'accueil"</li>
                            <li>Appuyez sur "Ajouter"</li>
                        </ol>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #ff4e00, #ff6b9d); color: white; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <strong>✨ Avantages :</strong>
                        <ul style="margin: 0.5rem 0 0 1.5rem; line-height: 1.6; font-size: 0.85rem;">
                            <li>Accès rapide depuis votre écran d'accueil</li>
                            <li>Notifications en temps réel</li>
                            <li>Fonctionne hors ligne</li>
                            <li>Expérience optimisée</li>
                        </ul>
                    </div>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; background: linear-gradient(135deg, #ff4e00, #ff6b9d); color: white; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    J'ai compris
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Prompt d\'installation disponible');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installée avec succès!');
    const installStatus = document.getElementById('install-status');
    const downloadBtn = document.querySelector('#download-button button');
    
    if (installStatus) installStatus.style.display = 'flex';
    if (downloadBtn) downloadBtn.style.background = 'linear-gradient(135deg, #28a745, #34ce57)';
    
    showNotificationStatus('🎉 Application installée avec succès!', '#28a745');
    deferredPrompt = null;
});
