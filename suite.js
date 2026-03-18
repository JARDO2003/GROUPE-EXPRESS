import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// FCM Compat
firebase.initializeApp({
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
});

const messaging = firebase.messaging();
const VAPID_KEY = "BGL6IVuJSbQjI69fot6FvfGEBmq1t4_hPP1Dhx_KYiIEFCrOLjtYFWjID_MlteNgJtm7FFbdIfBygdRi_IF-qng";

// ===== STATE =====
let cart = [];
let total = 0;
let pendingItem = null;
let pendingQty = 1;
let customerOrders = JSON.parse(localStorage.getItem('ge_orders') || '[]');
let fcmToken = localStorage.getItem('fcmToken') || null;

// Rice options
const riceOpts = [
    { name: 'Petit', price: 500, icon: '🍚', desc: 'Format individuel' },
    { name: 'Moyen', price: 1000, icon: '🥘', desc: 'Pour 1-2 personnes' },
    { name: 'Grand', price: 1500, icon: '🍲', desc: 'Pour 2-3 personnes' },
    { name: 'XXL', price: 2000, icon: '🥣', desc: 'Pour la famille' }
];

const tchepTypes = [
    { name: 'Rouge', icon: '🔴', desc: 'Tchèpe rouge traditionnel' },
    { name: 'Jaune', icon: '🟡', desc: 'Tchèpe jaune délicat' }
];

const porcPreps = [
    { name: 'Sauté', icon: '🔥', desc: 'Sauté revenu à la perfection' },
    { name: 'Grillé', icon: '🍖', desc: 'Grillé croustillant' },
    { name: 'Soupe', icon: '🍜', desc: 'En soupe savoureuse' }
];

// ===== CART =====
function addToCart(name, price, category, qty = 1) {
    const existing = cart.find(i => i.name === name);
    if (existing) existing.qty += qty;
    else cart.push({ name, price, category, qty });
    updateCartUI();
    showToast(`✅ ${name} ajouté (×${qty})`);
}

function updateCartUI() {
    total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);

    // Badge
    ['cart-badge', 'fab-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });

    // Cart count text
    const cct = document.getElementById('cart-count-text');
    if (cct) cct.textContent = count > 0 ? `${count} article(s) dans le panier` : 'Votre commande';

    // Cart list
    const list = document.getElementById('cart-items-list');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = `<div class="empty-cart"><div class="icon">🛒</div><p>Votre panier est vide.<br>Commencez à commander !</p></div>`;
    } else {
        list.innerHTML = cart.map((item, i) => `
            <div class="cart-item-row">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price} FCFA × ${item.qty} = ${item.price * item.qty} FCFA</div>
                </div>
                <button class="cart-remove" onclick="window._removeFromCart(${i})">🗑️</button>
            </div>
        `).join('');
    }

    const ct = document.getElementById('cart-total');
    if (ct) ct.innerHTML = `<span>Total</span><span>${total} FCFA</span>`;
}

window._removeFromCart = function(i) {
    cart.splice(i, 1);
    updateCartUI();
};

// ===== MODALS =====
function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
window.closeModal = closeModal;

function toggleCart() {
    document.getElementById('cart-modal')?.classList.toggle('show');
}

function toggleOrders() {
    renderOrders();
    openModal('orders-modal');
}

// ===== SELECTION MODAL =====
function showSelectionModal(title, subtitle, options) {
    document.getElementById('sel-title').textContent = title;
    document.getElementById('sel-subtitle').textContent = subtitle;
    document.getElementById('sel-options').innerHTML = options.map(o => `
        <div class="option-item" onclick="${o.onclick}">
            <div class="option-item-left">
                <div class="option-emoji">${o.icon}</div>
                <div>
                    <h4>${o.label}</h4>
                    <p>${o.desc}</p>
                </div>
            </div>
            <div class="option-price">${o.price} FCFA</div>
        </div>
    `).join('');
    openModal('selection-modal');
}

// ===== RICE =====
function selectRice(name) {
    showSelectionModal(name, 'Choisissez votre format', riceOpts.map(o => ({
        icon: o.icon, label: o.name, desc: o.desc, price: o.price,
        onclick: `closeModal('selection-modal');promptAddToCart('${name} (${o.name})', ${o.price}, 'B')`
    })));
}

// ===== TCHEP =====
function selectTchep(name, price) {
    showSelectionModal(name, 'Choisissez le type', tchepTypes.map(t => ({
        icon: t.icon, label: `Tchèpe ${t.name}`, desc: t.desc, price,
        onclick: `closeModal('selection-modal');promptAddToCart('${name} (${t.name})', ${price}, 'C')`
    })));
}

// ===== PORC =====
function selectPorc(price, format) {
    showSelectionModal(`Porc au four (${format})`, 'Choisissez la préparation', porcPreps.map(p => ({
        icon: p.icon, label: p.name, desc: p.desc, price,
        onclick: `closeModal('selection-modal');promptAddToCart('Porc au four ${p.name} (${format})', ${price}, 'D')`
    })));
}

// ===== ATTIÉKÈ =====
function selectAttiekePoisson() {
    const opts = [
        { name:'Petit', price:1000, icon:'🍽️', desc:'1 personne' },
        { name:'Moyen', price:1500, icon:'🍛', desc:'1-2 personnes' },
        { name:'Grand', price:2000, icon:'🥘', desc:'2-3 personnes' }
    ];
    showSelectionModal('Attiékè poisson alloko + Condiment', 'Choisissez votre format', opts.map(o => ({
        icon: o.icon, label: o.name, desc: o.desc, price: o.price,
        onclick: `closeModal('selection-modal');promptAddToCart('Attiékè poisson alloko (${o.name})', ${o.price}, 'E')`
    })));
}

function selectAttiekePouletAlloko() {
    const opts = [
        { name:'Petit', price:1500, icon:'🍽️', desc:'1 personne' },
        { name:'Moyen', price:2000, icon:'🍛', desc:'1-2 personnes' },
        { name:'Grand', price:2500, icon:'🥘', desc:'2-3 personnes' }
    ];
    showSelectionModal('Attiékè poulet alloko + Condiment', 'Choisissez votre format', opts.map(o => ({
        icon: o.icon, label: o.name, desc: o.desc, price: o.price,
        onclick: `closeModal('selection-modal');promptAddToCart('Attiékè poulet alloko (${o.name})', ${o.price}, 'E')`
    })));
}

function selectAttiekePoulet() {
    const opts = [
        { name:'Petit', price:1000, icon:'🍽️', desc:'1 personne' },
        { name:'Moyen', price:1500, icon:'🍛', desc:'1-2 personnes' },
        { name:'Grand', price:2000, icon:'🥘', desc:'2-3 personnes' }
    ];
    showSelectionModal('Attiékè poulet + Condiment', 'Choisissez votre format', opts.map(o => ({
        icon: o.icon, label: o.name, desc: o.desc, price: o.price,
        onclick: `closeModal('selection-modal');promptAddToCart('Attiékè poulet (${o.name})', ${o.price}, 'E')`
    })));
}

function selectGarba() {
    const opts = [
        { name:'Petit', price:500, icon:'🍽️', desc:'Format simple' },
        { name:'Moyen', price:1000, icon:'🍛', desc:'Format standard' },
        { name:'Grand', price:1500, icon:'🥘', desc:'Format généreux' }
    ];
    showSelectionModal('Spécialité Garba', 'Choisissez votre format', opts.map(o => ({
        icon: o.icon, label: o.name, desc: o.desc, price: o.price,
        onclick: `closeModal('selection-modal');promptAddToCart('Garba (${o.name})', ${o.price}, 'E')`
    })));
}

// ===== QTY MODAL =====
function promptAddToCart(name, price, category) {
    pendingItem = { name, price, category };
    pendingQty = 1;
    document.getElementById('qty-title').textContent = name;
    document.getElementById('qty-subtitle').textContent = `Prix unitaire : ${price} FCFA`;
    document.getElementById('qty-display').textContent = '1';
    document.getElementById('qty-error').style.display = 'none';
    openModal('qty-modal');
}

function changeQty(delta) {
    pendingQty = Math.max(1, Math.min(50, pendingQty + delta));
    document.getElementById('qty-display').textContent = pendingQty;
}

function confirmQty() {
    if (!pendingItem) return;
    addToCart(pendingItem.name, pendingItem.price, pendingItem.category, pendingQty);
    closeModal('qty-modal');
    pendingItem = null;
}

// ===== CHECKOUT =====
function startCheckout() {
    if (cart.length === 0) {
        showToast('🛒 Votre panier est vide', 'error');
        return;
    }
    const now = new Date().getHours();
    if (now >= 10 && now < 18) {
        showToast('⛔ Commandes fermées de 10h à 18h', 'error');
        return;
    }
    closeModal('cart-modal');
    // Reset form
    ['inp-name','inp-phone'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const et = document.getElementById('inp-etab'); if (et) et.value = '';
    ['err-name','err-phone','err-etab'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    openModal('customer-modal');
}

async function submitOrder() {
    const name = document.getElementById('inp-name')?.value.trim() || '';
    const phone = document.getElementById('inp-phone')?.value.trim().replace(/\s+/g,'') || '';
    const etab = document.getElementById('inp-etab')?.value || '';

    let err = false;
    const showErr = (id, msg) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
        err = true;
    };
    const hideErr = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    if (!name || name.length < 2) showErr('err-name', '❌ Entrez votre nom complet'); else hideErr('err-name');
    if (!phone || phone.length < 8) showErr('err-phone', '❌ Numéro invalide (min. 8 chiffres)'); else hideErr('err-phone');
    if (!etab) showErr('err-etab', '❌ Sélectionnez votre établissement'); else hideErr('err-etab');

    if (err) return;

    const btn = document.querySelector('#customer-modal .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi en cours...'; }

    try {
        const orderData = {
            customerName: name,
            whatsappNumber: phone,
            establishment: etab,
            items: cart,
            total,
            fcmToken: fcmToken || null,
            status: 'En attente',
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'orders'), orderData);
        const code = `#GEC${docRef.id.substring(0,6).toUpperCase()}`;

        // Save locally
        customerOrders.push({ ...orderData, code, timestamp: new Date().toISOString() });
        localStorage.setItem('ge_orders', JSON.stringify(customerOrders));

        // Clear cart
        cart = [];
        total = 0;
        updateCartUI();

        // Show success
        closeModal('customer-modal');
        document.getElementById('success-code').textContent = code;
        document.getElementById('success-name').textContent = name;
        document.getElementById('success-total').textContent = `Total payé : ${orderData.total} FCFA`;
        openModal('success-modal');

        // Send push notification via FCM (if token exists)
        if (fcmToken) {
            sendOrderNotification(name, code, orderData.total, fcmToken);
        }

    } catch (e) {
        console.error('Order error:', e);
        showToast('❌ Erreur lors de l\'envoi. Réessayez.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✅ Valider ma commande'; }
    }
}

// =====================================================
// La notification push est envoyée AUTOMATIQUEMENT
// par la Cloud Function "notifyOnNewOrder" dans
// functions/index.js dès qu'une commande est créée
// dans Firestore — même si le client a fermé l'app.
//
// En fallback (si pas de Cloud Function), on utilise
// la notification locale via Service Worker.
// =====================================================
async function sendOrderNotification(name, code, amount, token) {
    try {
        // Notification locale immédiate (fallback)
        if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(`✅ Commande ${code} confirmée !`, {
                body: `Bonjour ${name} ! Votre commande est enregistrée. Retrait à 12h00 au stand Groupe Express 🍽️`,
                icon: '/image/GE.jpg',
                badge: '/image/GE.jpg',
                tag: 'order-' + code,
                data: { url: '/', code },
                actions: [
                    { action: 'view', title: '📦 Voir ma commande' },
                    { action: 'dismiss', title: 'Fermer' }
                ],
                requireInteraction: true,
                vibrate: [200, 100, 300, 100, 200]
            });
        }
        // Note: la Cloud Function envoie aussi automatiquement via FCM
        // dès que la commande apparaît dans Firestore (même hors ligne)
    } catch(e) {
        console.log('Local notification error:', e);
    }
}

// ===== ORDERS =====
function renderOrders() {
    const el = document.getElementById('orders-list-content');
    if (!el) return;
    if (!customerOrders.length) {
        el.innerHTML = `<div class="empty-cart"><div class="icon">📦</div><p>Aucune commande pour l'instant</p></div>`;
        return;
    }
    el.innerHTML = [...customerOrders].reverse().map(o => `
        <div class="order-history-item">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="code">${o.code || 'N/A'}</span>
                <span class="date">${new Date(o.timestamp || o.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="summary">${(o.items||[]).length} article(s) — ${o.total||0} FCFA — ${o.establishment||''}</div>
        </div>
    `).join('');
}

function clearOrders() {
    if (confirm('Vider tout l\'historique ?')) {
        customerOrders = [];
        localStorage.setItem('ge_orders', '[]');
        renderOrders();
        showToast('🗑️ Historique vidé');
    }
}

// ===== NOTIFICATIONS — Vraie logique FCM =====
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('❌ Notifications non supportées sur ce navigateur', 'error');
        return;
    }
    if (!('serviceWorker' in navigator)) {
        showToast('❌ Service Worker non supporté', 'error');
        return;
    }

    try {
        // 1. Enregistrer le SW
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // 2. Demander la permission
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            showToast('🔕 Notifications refusées', 'warn');
            return;
        }

        // 3. Obtenir le token FCM
        try {
            const token = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: reg
            });
            if (token) {
                fcmToken = token;
                localStorage.setItem('fcmToken', token);
                // Sauvegarder le token dans Firestore
                try {
                    await addDoc(collection(db, 'fcm_tokens'), {
                        token,
                        createdAt: new Date().toISOString(),
                        userAgent: navigator.userAgent.substring(0, 100)
                    });
                } catch(fe) { console.log('Token Firestore save:', fe.message); }
                showToast('🔔 Notifications activées ! Vous recevrez vos confirmations de commande.', 'success');
                // Mettre à jour l'icône FAB
                const btn = document.getElementById('fab-notif');
                if (btn) { btn.textContent = '🔔'; btn.style.background = '#2E7D32'; btn.style.color = 'white'; }
            }
        } catch(tokenErr) {
            console.error('FCM token error:', tokenErr);
            // Sur localhost/file:// le token FCM ne fonctionne pas mais la permission locale oui
            showToast('🔔 Notifications locales activées', 'success');
        }
    } catch(e) {
        console.error('SW registration error:', e);
        showToast('🔔 Activé (mode basique)', 'success');
    }
}

// ===== PWA INSTALLATION — LOGIQUE INTELLIGENTE =====
let deferredPrompt = null;
let pwaInstalled = false;

// Détecte si déjà installée (standalone mode)
function isRunningStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
}

// Détecte iOS
function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

// Détecte Android Chrome
function isAndroidChrome() {
    return /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent);
}

// Écoute le prompt natif Chrome/Android
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Montre le FAB avec une animation d'attention
    const btn = document.getElementById('fab-install');
    if (btn) {
        btn.style.animation = 'none';
        btn.style.background = 'linear-gradient(135deg, #FF5722, #FF8C42)';
        btn.title = 'Installer l\'app — disponible !';
    }
});

window.addEventListener('appinstalled', () => {
    pwaInstalled = true;
    deferredPrompt = null;
    const btn = document.getElementById('fab-install');
    if (btn) {
        btn.textContent = '✅';
        btn.title = 'Application installée !';
        setTimeout(() => { if (btn) btn.style.display = 'none'; }, 3000);
    }
    showToast('✅ Application installée avec succès !', 'success');
});

function triggerInstallPrompt() {
    // Déjà en mode app installée
    if (isRunningStandalone()) {
        showToast('✅ Vous utilisez déjà l\'application installée !', 'success');
        return;
    }

    // Chrome/Android — prompt natif disponible
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(r => {
            if (r.outcome === 'accepted') {
                showToast('✅ Application installée avec succès !', 'success');
            } else {
                showToast('Installation annulée', 'warn');
            }
            deferredPrompt = null;
        });
        return;
    }

    // Pas de prompt disponible → afficher les instructions manuelles
    showInstallInstructions();
}

function showInstallInstructions() {
    const body = document.getElementById('install-modal-body');
    let content = '';

    if (isIOS()) {
        // Instructions Safari iOS
        content = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:50px;margin-bottom:8px">🍎</div>
            <p style="font-size:14px;color:#666;line-height:1.6">Sur iPhone/iPad, suivez ces étapes dans <strong>Safari</strong> :</p>
        </div>
        <div class="install-step">
            <div class="install-step-num">1</div>
            <div class="install-step-text">
                <strong>Appuyez sur le bouton Partager</strong>
                <p>L'icône <span style="font-size:18px">⎙</span> en bas de Safari</p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">2</div>
            <div class="install-step-text">
                <strong>Défiler et appuyer sur</strong>
                <p>"Sur l'écran d'accueil" <span style="font-size:18px">➕</span></p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">3</div>
            <div class="install-step-text">
                <strong>Appuyer sur "Ajouter"</strong>
                <p>L'icône Groupe Express apparaîtra sur votre écran d'accueil !</p>
            </div>
        </div>
        <div style="background:#FFF5F0;border-radius:12px;padding:14px;margin-top:16px;font-size:13px;color:#888;text-align:center">
            ⚠️ Fonctionne uniquement avec <strong>Safari</strong> — pas avec Chrome sur iOS
        </div>`;
    } else if (isAndroidChrome()) {
        // Android Chrome — prompt non encore déclenché ou refusé
        content = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:50px;margin-bottom:8px">🤖</div>
            <p style="font-size:14px;color:#666;line-height:1.6">Sur Android Chrome, suivez ces étapes :</p>
        </div>
        <div class="install-step">
            <div class="install-step-num">1</div>
            <div class="install-step-text">
                <strong>Appuyer sur le menu ⋮</strong>
                <p>Les 3 points en haut à droite de Chrome</p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">2</div>
            <div class="install-step-text">
                <strong>Sélectionnez "Ajouter à l'écran d'accueil"</strong>
                <p>Ou "Installer l'application" selon votre version</p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">3</div>
            <div class="install-step-text">
                <strong>Confirmer l'installation</strong>
                <p>Groupe Express sera sur votre écran d'accueil 🎉</p>
            </div>
        </div>
        <div style="margin-top:16px">
            <button onclick="window.location.reload()" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--flame);color:white;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit">
                🔄 Recharger la page pour réessayer
            </button>
        </div>`;
    } else {
        // Desktop ou autre navigateur
        content = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:50px;margin-bottom:8px">💻</div>
            <p style="font-size:14px;color:#666;line-height:1.6">Installez l'application depuis votre navigateur :</p>
        </div>
        <div class="install-step">
            <div class="install-step-num">1</div>
            <div class="install-step-text">
                <strong>Chrome / Edge</strong>
                <p>Cliquez sur l'icône d'installation ⬇ dans la barre d'adresse</p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">2</div>
            <div class="install-step-text">
                <strong>Menu du navigateur</strong>
                <p>⋮ → "Installer Groupe Express" ou "Ajouter à l'écran d'accueil"</p>
            </div>
        </div>
        <div class="install-step">
            <div class="install-step-num">3</div>
            <div class="install-step-text">
                <strong>⚠️ Fichier local détecté</strong>
                <p>Pour une installation complète, hébergez le site sur un serveur HTTPS (Firebase Hosting, Netlify...)</p>
            </div>
        </div>
        <div style="background:#FFF3CD;border-radius:12px;padding:14px;margin-top:16px;font-size:13px;color:#856404;line-height:1.5">
            💡 <strong>Note :</strong> L'installation PWA nécessite HTTPS. En local (<code>file://</code>), utilisez <code>localhost</code> ou déployez sur un serveur.
        </div>`;
    }

    if (body) body.innerHTML = content;
    openModal('install-modal');
}

// ===== NEW DISHES FROM FIREBASE =====
function loadNewDishes() {
    try {
        const q = query(collection(db, 'nouveaux_plats'), where('active', '==', true));
        onSnapshot(q, snap => {
            const dishes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sec = document.getElementById('new-dishes-section');
            const grid = document.getElementById('new-dishes-grid');
            const cnt = document.getElementById('new-dishes-count');
            if (!sec || !grid) return;
            if (!dishes.length) { sec.style.display = 'none'; return; }
            sec.style.display = 'block';
            if (cnt) cnt.textContent = `${dishes.length} plat(s)`;
            grid.innerHTML = dishes.map(d => `
                <div class="dish-card">
                    <div class="dish-image-wrap">
                        <img src="${d.imageUrl||''}" alt="${d.name||''}" class="dish-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23F5EDE3%22 width=%22200%22 height=%22200%22/><text y=%22110%22 x=%22100%22 text-anchor=%22middle%22 font-size=%2250%22>🆕</text></svg>'">
                        <span class="dish-new-tag">🆕 Nouveau</span>
                    </div>
                    <div class="dish-body">
                        <div class="dish-name">${d.name||'Nouveau plat'}</div>
                        <div class="dish-desc">${d.description||'Découvrez notre nouvelle création'}</div>
                        <div class="dish-footer">
                            <span class="dish-price">${d.price||0} FCFA</span>
                            <button class="add-btn" onclick="promptAddToCart('${(d.name||'').replace(/'/g,"\\'")}', ${d.price||0}, '${d.category||'I'}')">+</button>
                        </div>
                    </div>
                </div>
            `).join('');
        });
    } catch(e) { console.error('Firebase dishes error:', e); }
}

// ===== PROMO SLIDER — touch/swipe + auto =====
let promoIdx = 0;
let promoAuto;
const TOTAL_SLIDES = 3;

function goSlide(i) {
    promoIdx = (i + TOTAL_SLIDES) % TOTAL_SLIDES;
    const slides = document.getElementById('promo-slides');
    if (slides) {
        slides.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)';
        slides.style.transform = `translateX(-${promoIdx * 100}%)`;
    }
    document.querySelectorAll('.promo-dot').forEach((d, j) => {
        d.classList.toggle('active', j === promoIdx);
    });
}

function startSlider() {
    clearInterval(promoAuto);
    promoAuto = setInterval(() => goSlide(promoIdx + 1), 5000);
}

function initSliderTouch() {
    const track = document.querySelector('.promo-track');
    if (!track) return;

    let startX = 0, startY = 0, isDragging = false, hasMoved = false;

    // TOUCH events (mobile)
    track.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        hasMoved = false;
        clearInterval(promoAuto); // pause auto on touch
    }, { passive: true });

    track.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy)) {
            hasMoved = true;
            // Live drag feedback
            const slides = document.getElementById('promo-slides');
            if (slides) {
                slides.style.transition = 'none';
                slides.style.transform = `translateX(calc(-${promoIdx * 100}% + ${dx}px))`;
            }
        }
    }, { passive: true });

    track.addEventListener('touchend', e => {
        if (!isDragging) return;
        isDragging = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (hasMoved && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            goSlide(dx < 0 ? promoIdx + 1 : promoIdx - 1);
        } else {
            // Snap back
            const slides = document.getElementById('promo-slides');
            if (slides) {
                slides.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)';
                slides.style.transform = `translateX(-${promoIdx * 100}%)`;
            }
        }
        startSlider(); // resume auto
    }, { passive: true });

    // MOUSE events (desktop drag)
    track.addEventListener('mousedown', e => {
        startX = e.clientX;
        isDragging = true;
        hasMoved = false;
        clearInterval(promoAuto);
        track.style.cursor = 'grabbing';
    });

    track.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 5) hasMoved = true;
        const slides = document.getElementById('promo-slides');
        if (slides) {
            slides.style.transition = 'none';
            slides.style.transform = `translateX(calc(-${promoIdx * 100}% + ${dx}px))`;
        }
    });

    const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        track.style.cursor = 'grab';
        const dx = (e.clientX ?? e.changedTouches?.[0]?.clientX ?? startX) - startX;
        if (hasMoved && Math.abs(dx) > 40) {
            goSlide(dx < 0 ? promoIdx + 1 : promoIdx - 1);
        } else {
            const slides = document.getElementById('promo-slides');
            if (slides) {
                slides.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)';
                slides.style.transform = `translateX(-${promoIdx * 100}%)`;
            }
        }
        startSlider();
    };

    track.addEventListener('mouseup', endDrag);
    track.addEventListener('mouseleave', endDrag);
}

// ===== HOURS CHECK =====
function checkHours() {
    const h = new Date().getHours();
    const alert = document.getElementById('time-alert');
    const banner = document.getElementById('status-banner');
    if (h >= 10 && h < 18) {
        if (alert) alert.style.display = 'block';
        if (banner) banner.innerHTML = '🔴 &nbsp;Commandes fermées — Revenez dès 18h00';
    } else {
        if (alert) alert.style.display = 'none';
        if (banner) banner.innerHTML = '🟢 &nbsp;Commandes ouvertes — On prépare pour vous !';
    }
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast';
    const colors = { success: '#1A1A1A', error: '#E74C3C', warn: '#F39C12' };
    t.style.background = colors[type] || colors.success;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== EXPOSE GLOBALS =====
window.toggleCart = toggleCart;
window.toggleOrders = toggleOrders;
window.promptAddToCart = promptAddToCart;
window.changeQty = changeQty;
window.confirmQty = confirmQty;
window.startCheckout = startCheckout;
window.submitOrder = submitOrder;
window.clearOrders = clearOrders;
window.selectRice = selectRice;
window.selectTchep = selectTchep;
window.selectPorc = selectPorc;
window.selectAttiekePoisson = selectAttiekePoisson;
window.selectAttiekePouletAlloko = selectAttiekePouletAlloko;
window.selectAttiekePoulet = selectAttiekePoulet;
window.selectGarba = selectGarba;
window.goSlide = goSlide;
window.requestNotificationPermission = requestNotificationPermission;
window.triggerInstallPrompt = triggerInstallPrompt;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkHours();
    updateCartUI();
    loadNewDishes();
    startSlider();
    setInterval(checkHours, 60000);

    // Init touch swipe on slider
    initSliderTouch();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(e => console.log('SW registration failed:', e));
    }

    // Listen for FCM foreground messages
    try {
        messaging.onMessage(payload => {
            console.log('FCM message received:', payload);
            const { title, body } = payload.notification || {};
            showToast(`🔔 ${title}: ${body}`);
        });
    } catch(e) {}
});
// Scroll indicator
const scrollInd = document.getElementById('scroll-indicator');
const scrollThumb = document.getElementById('scroll-thumb');

window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = total > 0 ? scrolled / total : 0;

    // Montrer seulement si pas tout en bas
    if (pct > 0.02 && pct < 0.97) {
        scrollInd?.classList.add('visible');
        scrollInd?.classList.remove('hidden');
    } else {
        scrollInd?.classList.remove('visible');
        scrollInd?.classList.add('hidden');
    }

    // Positionner le thumb
    if (scrollThumb) {
        scrollThumb.style.height = `${Math.max(8, pct * 60)}px`;
        scrollThumb.style.top = `${pct * (60 - Math.max(8, pct * 60))}px`;
    }
}, { passive: true });

// Swipe hint sur les pills
const pillsEl = document.getElementById('nav-pills');
const swipeHint = document.getElementById('swipe-hint');
if (pillsEl && swipeHint) {
    pillsEl.addEventListener('scroll', () => {
        const atEnd = pillsEl.scrollLeft + pillsEl.clientWidth >= pillsEl.scrollWidth - 10;
        swipeHint.classList.toggle('hidden', atEnd);
    }, { passive: true });
}
console.log('✅ GROUPE EXPRESS PWA loaded');
