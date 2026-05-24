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

    ['cart-badge', 'fab-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });

    const cct = document.getElementById('cart-count-text');
    if (cct) cct.textContent = count > 0 ? `${count} article(s) dans le panier` : 'Votre commande';

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
    ['inp-name','inp-phone'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const et = document.getElementById('inp-etab'); if (et) et.value = '';
    ['err-name','err-phone','err-etab'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    openModal('customer-modal');
}

// =============================================================
// =================== NOTIFICATIONS ===========================
// =============================================================

// ─── ANCIEN CODE (commenté pour référence) ───────────────────
/*
// AVANT : L'utilisateur devait cliquer sur le bouton 🔔 FAB
// pour accorder la permission de notification MANUELLEMENT.
// Le bouton appelait requestNotificationPermission() et demandait
// le consentement explicite via Notification.requestPermission().
//
// async function requestNotificationPermission() {
//     if (!('Notification' in window)) {
//         showToast('❌ Notifications non supportées sur ce navigateur', 'error');
//         return;
//     }
//     if (!('serviceWorker' in navigator)) {
//         showToast('❌ Service Worker non supporté', 'error');
//         return;
//     }
//     try {
//         const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
//         await navigator.serviceWorker.ready;
//         const perm = await Notification.requestPermission(); // <-- demande manuelle
//         if (perm !== 'granted') {
//             showToast('🔕 Notifications refusées', 'warn');
//             return;
//         }
//         try {
//             const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
//             if (token) {
//                 fcmToken = token;
//                 localStorage.setItem('fcmToken', token);
//                 await addDoc(collection(db, 'fcm_tokens'), { token, createdAt: new Date().toISOString(), userAgent: navigator.userAgent.substring(0, 100) });
//                 showToast('🔔 Notifications activées !', 'success');
//             }
//         } catch(tokenErr) {
//             showToast('🔔 Notifications locales activées', 'success');
//         }
//     } catch(e) {
//         showToast('🔔 Activé (mode basique)', 'success');
//     }
// }
//
// Dans submitOrder(), la notification n'était envoyée que
// si fcmToken existait déjà (donc si l'user avait cliqué 🔔).
// if (fcmToken) { sendOrderNotification(name, code, orderData.total, fcmToken); }
*/

// ─── NOUVEAU CODE ─────────────────────────────────────────────
// Désormais : dès que l'utilisateur passe une commande,
// on lui demande silencieusement la permission (si pas encore accordée)
// PUIS on envoie immédiatement la notification de confirmation.
// Le bouton 🔔 FAB n'est plus nécessaire mais reste pour compatibilité.

async function ensureNotificationReady() {
    // Déjà prêt
    if (Notification.permission === 'granted' && fcmToken) return true;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

    try {
        // Enregistrer le SW avec le bon fichier qui gère FCM + logo GE
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // Demander la permission si pas encore accordée
        // (Le navigateur n'affiche le popup que si l'état est 'default')
        if (Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return false;
        }

        // Obtenir le token FCM
        if (!fcmToken) {
            try {
                const token = await messaging.getToken({
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: reg
                });
                if (token) {
                    fcmToken = token;
                    localStorage.setItem('fcmToken', token);
                    // Sauvegarder en Firestore pour les notifications admin
                    try {
                        await addDoc(collection(db, 'fcm_tokens'), {
                            token,
                            createdAt: new Date().toISOString(),
                            userAgent: navigator.userAgent.substring(0, 100)
                        });
                    } catch(fe) { console.log('Token save:', fe.message); }
                    // Mettre à jour l'icône FAB
                    const btn = document.getElementById('fab-notif');
                    if (btn) { btn.textContent = '🔔'; btn.style.background = '#2E7D32'; btn.style.color = 'white'; }
                }
            } catch(te) {
                console.log('FCM token error (localhost?):', te.message);
                // Sur localhost, le token FCM ne marche pas mais les notifs locales oui
                return Notification.permission === 'granted';
            }
        }
        return true;
    } catch(e) {
        console.error('SW/Notification setup error:', e);
        return false;
    }
}

// Notification de confirmation de commande avec logo Groupe Express
async function sendOrderNotification(name, code, amount) {
    try {
        if (Notification.permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;

        // Notification riche via Service Worker (logo + actions)
        await reg.showNotification('✅ Commande confirmée — Groupe Express', {
            body: `Bonjour ${name} ! Commande ${code} (${amount} FCFA) enregistrée. Retrait à 12h00 au rez-de-chaussée 🍽️`,
            icon: '/image/GE.jpg',          // Logo Groupe Express
            badge: '/image/GE.jpg',         // Icône badge (Android)
            image: '/image/at.jpg',          // Image riche optionnelle
            tag: 'order-' + code,
            data: { url: '/', code },
            actions: [
                { action: 'view', title: '📦 Mes commandes' },
                { action: 'dismiss', title: '✕ Fermer' }
            ],
            requireInteraction: true,        // Reste visible jusqu'au clic
            vibrate: [200, 100, 300, 100, 200],
            silent: false,
            timestamp: Date.now()
        });

        // Si FCM token dispo, la Cloud Function notifie aussi en background
    } catch(e) {
        console.error('Notification error:', e);
    }
}

// Bouton FAB 🔔 — reste fonctionnel pour activer manuellement
async function requestNotificationPermission() {
    const ready = await ensureNotificationReady();
    if (ready) {
        showToast('🔔 Notifications déjà activées !', 'success');
        const btn = document.getElementById('fab-notif');
        if (btn) { btn.textContent = '🔔'; btn.style.background = '#2E7D32'; btn.style.color = 'white'; }
    } else {
        showToast('❌ Notifications non disponibles sur ce navigateur', 'error');
    }
}

// =============================================================

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
        // ✅ NOUVEAU : Activer les notifications automatiquement à la commande
        // (remplace l'ancien système de consentement manuel)
        await ensureNotificationReady();

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

        // Sauvegarder localement
        customerOrders.push({ ...orderData, code, timestamp: new Date().toISOString() });
        localStorage.setItem('ge_orders', JSON.stringify(customerOrders));

        // Vider le panier
        cart = [];
        total = 0;
        updateCartUI();

        // Afficher le succès
        closeModal('customer-modal');
        document.getElementById('success-code').textContent = code;
        document.getElementById('success-name').textContent = name;
        document.getElementById('success-total').textContent = `Total payé : ${orderData.total} FCFA`;
        openModal('success-modal');

        // ✅ NOUVEAU : Envoyer la notification immédiatement sans condition de fcmToken préalable
        // L'ancien code faisait : if (fcmToken) { sendOrderNotification(...) }
        // Le nouveau envoie toujours (ensureNotificationReady a déjà obtenu la permission)
        await sendOrderNotification(name, code, orderData.total);

    } catch (e) {
        console.error('Order error:', e);
        showToast('❌ Erreur lors de l\'envoi. Réessayez.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✅ Valider ma commande'; }
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

// ===== PWA INSTALLATION =====
let deferredPrompt = null;

function isRunningStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
}

function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isAndroidChrome() {
    return /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent);
}

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('fab-install');
    if (btn) {
        btn.style.background = 'linear-gradient(135deg, #FF5722, #FF8C42)';
        btn.title = 'Installer l\'app — disponible !';
    }
});

window.addEventListener('appinstalled', () => {
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
    if (isRunningStandalone()) {
        showToast('✅ Vous utilisez déjà l\'application installée !', 'success');
        return;
    }
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(r => {
            if (r.outcome === 'accepted') showToast('✅ Application installée !', 'success');
            else showToast('Installation annulée', 'warn');
            deferredPrompt = null;
        });
        return;
    }
    showInstallInstructions();
}

function showInstallInstructions() {
    const body = document.getElementById('install-modal-body');
    let content = '';
    if (isIOS()) {
        content = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:50px;margin-bottom:8px">🍎</div>
            <p style="font-size:14px;color:#666;line-height:1.6">Sur iPhone/iPad, suivez ces étapes dans <strong>Safari</strong> :</p>
        </div>
        <div class="install-step"><div class="install-step-num">1</div><div class="install-step-text"><strong>Appuyez sur le bouton Partager</strong><p>L'icône ⎙ en bas de Safari</p></div></div>
        <div class="install-step"><div class="install-step-num">2</div><div class="install-step-text"><strong>Défiler et appuyer sur</strong><p>"Sur l'écran d'accueil" ➕</p></div></div>
        <div class="install-step"><div class="install-step-num">3</div><div class="install-step-text"><strong>Appuyer sur "Ajouter"</strong><p>L'icône Groupe Express apparaîtra !</p></div></div>`;
    } else {
        content = `
        <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:50px;margin-bottom:8px">📲</div>
            <p style="font-size:14px;color:#666;line-height:1.6">Menu ⋮ → "Ajouter à l'écran d'accueil"</p>
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
            grid.innerHTML = dishes.map(d => {
                const safeName = (d.name||'Nouveau plat').replace(/'/g, "\\'");
                const price = d.price || 0;
                const cat = d.category || 'I';
                const img = d.imageUrl || '';
                return `
                <div class="dish-card">
                    <div class="dish-image-wrap"
                        onclick="openDishPreview(this)"
                        data-img="${img}"
                        data-name="${d.name||'Nouveau plat'}"
                        data-desc="${d.description||'Découvrez notre nouvelle création'}"
                        data-price="${price} FCFA"
                        data-badge="🆕 Nouveau"
                        data-action="promptAddToCart('${safeName}', ${price}, '${cat}')">
                        <img src="${img}" alt="${d.name||''}" class="dish-image"
                            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23F5EDE3%22 width=%22200%22 height=%22200%22/><text y=%22110%22 x=%22100%22 text-anchor=%22middle%22 font-size=%2250%22>🆕</text></svg>'">
                        <span class="dish-new-tag">🆕 Nouveau</span>
                    </div>
                    <div class="dish-body">
                        <div class="dish-name">${d.name||'Nouveau plat'}</div>
                        <div class="dish-desc">${d.description||''}</div>
                        <div class="dish-footer">
                            <span class="dish-price">${price} FCFA</span>
                            <button class="add-btn" onclick="promptAddToCart('${safeName}', ${price}, '${cat}')">+</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        });
    } catch(e) { console.error('Firebase dishes error:', e); }
}

// ===== PROMO SLIDER =====
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
    document.querySelectorAll('.promo-dot').forEach((d, j) => d.classList.toggle('active', j === promoIdx));
}

function startSlider() {
    clearInterval(promoAuto);
    promoAuto = setInterval(() => goSlide(promoIdx + 1), 5000);
}

function initSliderTouch() {
    const track = document.querySelector('.promo-track');
    if (!track) return;
    let startX = 0, startY = 0, isDragging = false, hasMoved = false;

    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; isDragging = true; hasMoved = false; clearInterval(promoAuto); }, { passive: true });
    track.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy)) { hasMoved = true; const slides = document.getElementById('promo-slides'); if (slides) { slides.style.transition = 'none'; slides.style.transform = `translateX(calc(-${promoIdx * 100}% + ${dx}px))`; } }
    }, { passive: true });
    track.addEventListener('touchend', e => {
        if (!isDragging) return; isDragging = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (hasMoved && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) goSlide(dx < 0 ? promoIdx + 1 : promoIdx - 1);
        else { const slides = document.getElementById('promo-slides'); if (slides) { slides.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)'; slides.style.transform = `translateX(-${promoIdx * 100}%)`; } }
        startSlider();
    }, { passive: true });

    track.addEventListener('mousedown', e => { startX = e.clientX; isDragging = true; hasMoved = false; clearInterval(promoAuto); track.style.cursor = 'grabbing'; });
    track.addEventListener('mousemove', e => { if (!isDragging) return; const dx = e.clientX - startX; if (Math.abs(dx) > 5) hasMoved = true; const slides = document.getElementById('promo-slides'); if (slides) { slides.style.transition = 'none'; slides.style.transform = `translateX(calc(-${promoIdx * 100}% + ${dx}px))`; } });
    const endDrag = e => { if (!isDragging) return; isDragging = false; track.style.cursor = 'grab'; const dx = (e.clientX ?? startX) - startX; if (hasMoved && Math.abs(dx) > 40) goSlide(dx < 0 ? promoIdx + 1 : promoIdx - 1); else { const slides = document.getElementById('promo-slides'); if (slides) { slides.style.transition = 'transform 0.42s cubic-bezier(.4,0,.2,1)'; slides.style.transform = `translateX(-${promoIdx * 100}%)`; } } startSlider(); };
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

// ===== DISH PREVIEW =====
function openDishPreview(el) {
    const d = el.dataset;
    const img = document.getElementById('preview-img');
    img.src = d.img; img.alt = d.name || '';
    document.getElementById('preview-name').textContent = d.name || '';
    document.getElementById('preview-desc').textContent = d.desc || '';
    document.getElementById('preview-price').textContent = d.price || '';
    const badge = document.getElementById('preview-badge');
    if (d.badge) { badge.textContent = d.badge; badge.style.display = 'inline-block'; }
    else { badge.textContent = ''; badge.style.display = 'none'; }
    const btn = document.getElementById('preview-order-btn');
    btn.onclick = () => { closeModal('dish-preview-modal'); setTimeout(() => { eval(d.action); }, 150); };
    openModal('dish-preview-modal');
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
window.openDishPreview = openDishPreview;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkHours();
    updateCartUI();
    loadNewDishes();
    startSlider();
    setInterval(checkHours, 60000);
    initSliderTouch();

    // Enregistrer le Service Worker FCM (avec logo GE)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
            .then(reg => {
                console.log('✅ SW registered:', reg.scope);
                // Vérifier si permission déjà accordée au chargement
                if (Notification.permission === 'granted') {
                    const btn = document.getElementById('fab-notif');
                    if (btn) { btn.textContent = '🔔'; btn.style.background = '#2E7D32'; btn.style.color = 'white'; }
                }
            })
            .catch(e => console.log('SW registration failed:', e));
    }

    // Écouter les messages FCM en foreground
    try {
        messaging.onMessage(payload => {
            console.log('FCM foreground message:', payload);
            const { title, body } = payload.notification || {};
            if (title) showToast(`🔔 ${title}: ${body}`);
        });
    } catch(e) {}
});

// ===== SCROLL INDICATOR =====
const scrollInd = document.getElementById('scroll-indicator');
const scrollThumb = document.getElementById('scroll-thumb');
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const tot = document.body.scrollHeight - window.innerHeight;
    const pct = tot > 0 ? scrolled / tot : 0;
    if (pct > 0.02 && pct < 0.97) { scrollInd?.classList.add('visible'); scrollInd?.classList.remove('hidden'); }
    else { scrollInd?.classList.remove('visible'); scrollInd?.classList.add('hidden'); }
    if (scrollThumb) { scrollThumb.style.height = `${Math.max(8, pct * 60)}px`; scrollThumb.style.top = `${pct * (60 - Math.max(8, pct * 60))}px`; }
}, { passive: true });

// ===== SWIPE HINT PILLS =====
const pillsEl = document.getElementById('nav-pills');
const swipeHint = document.getElementById('swipe-hint');
if (pillsEl && swipeHint) {
    pillsEl.addEventListener('scroll', () => {
        const atEnd = pillsEl.scrollLeft + pillsEl.clientWidth >= pillsEl.scrollWidth - 10;
        swipeHint.classList.toggle('hidden', atEnd);
    }, { passive: true });
}

console.log('✅ GROUPE EXPRESS PWA loaded — Notifications auto à la commande activées');
