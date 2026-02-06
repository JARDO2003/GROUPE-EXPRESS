import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// ===== GESTION DES NOUVEAUX PLATS DEPUIS FIREBASE =====
let newDishesLoaded = false;

// Charger les nouveaux plats depuis Firebase
function loadNewDishesFromFirebase() {
    try {
        const newDishesQuery = query(
            collection(db, 'nouveaux_plats'),
            where('active', '==', true)
        );
        
        onSnapshot(newDishesQuery, (snapshot) => {
            const newDishes = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                newDishes.push({
                    id: doc.id,
                    ...data
                });
            });
            
            console.log(`✅ ${newDishes.length} nouveaux plats chargés depuis Firebase`);
            
            displayNewDishes(newDishes);
        }, (error) => {
            console.error('❌ Erreur lors du chargement des nouveaux plats:', error);
        });
    } catch (error) {
        console.error('❌ Erreur Firebase nouveaux plats:', error);
    }
}

// Afficher les nouveaux plats sur la page
function displayNewDishes(dishes) {
    const section = document.getElementById('new-dishes-section');
    const grid = document.getElementById('new-dishes-grid');
    
    if (!section || !grid) {
        console.error('Section nouveaux plats non trouvée');
        return;
    }
    
    if (dishes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    // Afficher la section
    section.style.display = 'block';
    
    // Générer le HTML des plats
    grid.innerHTML = dishes.map(dish => {
        const imageUrl = dish.imageUrl || 'image/placeholder.jpg';
        const dishName = dish.name || 'Nouveau plat';
        const dishDesc = dish.description || 'Découvrez notre nouvelle création';
        const dishPrice = dish.price || 0;
        const dishCategory = dish.category || 'I';
        
        return `
            <div class="dish-card-modern">
                <div class="dish-image-wrapper">
                    <img src="${imageUrl}" alt="${dishName}" class="dish-image-modern" 
                         onerror="this.src='image/placeholder.jpg'">
                    <div class="dish-overlay">
                        <button class="quick-add-btn" onclick="promptAddToCart('${dishName.replace(/'/g, "\\'")}', ${dishPrice}, '${dishCategory}')">
                            Ajouter rapidement
                        </button>
                    </div>
                </div>
                <div class="dish-content-modern">
                    <h4 class="dish-name-modern">${dishName}</h4>
                    <p class="dish-desc-modern">${dishDesc}</p>
                    <div class="dish-footer-modern">
                        <span class="dish-price-modern">${dishPrice} FCFA</span>
                        <button class="add-cart-btn-modern" onclick="promptAddToCart('${dishName.replace(/'/g, "\\'")}', ${dishPrice}, '${dishCategory}')">
                            <span>🛒</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Animation d'apparition
    if (!newDishesLoaded) {
        section.style.animation = 'slideUp 0.6s ease-out';
        newDishesLoaded = true;
    }
}

// Ajouter l'animation CSS pour l'apparition
const styleElement = document.createElement('style');
styleElement.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(styleElement);

// ===== VARIABLES GLOBALES =====
let cart = [];
let total = 0;
let customerOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
let currentAdIndex = 0;
let adsAutoPlay = true;
let adsInterval;
let pendingCartItem = null;
let pendingOrderData = null;
let deferredPrompt = null;

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
    { type: 'Rouge', icon: '🔴', desc: 'Tchèpe  rouge traditionnelle' },
    { type: 'Jaune', icon: '🟡', desc: 'Tchèpe jaune délicate' }
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

// ===== GESTION DU PANIER =====
function addToCart(name, price, category, quantity = 1) {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ name, price, category, quantity });
    }
    
    updateCart();
    updateCartBadge();
    showNotificationStatus(`✅ ${name} ajouté (x${quantity})`, '#28a745');
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartItems || !cartTotal) return;
    
    total = 0;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <p>Votre panier est vide</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${item.price} FCFA × ${item.quantity} = ${itemTotal} FCFA</div>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">🗑️</button>
                </div>
            `;
        }).join('');
    }
    
    cartTotal.textContent = `Total: ${total} FCFA`;
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (itemCount > 0) {
        badge.textContent = itemCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
    updateCartBadge();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

// ===== MODAL QUANTITÉ PERSONNALISÉ =====
function promptAddToCart(name, price, category) {
    const quantityModal = document.getElementById('quantity-modal');
    const titleElem = document.getElementById('quantity-modal-title');
    const subtitleElem = document.getElementById('quantity-modal-subtitle');
    const inputElem = document.getElementById('quantity-input');
    const errorElem = document.getElementById('quantity-error');
    
    if (!quantityModal || !titleElem || !subtitleElem || !inputElem || !errorElem) {
        console.error('Éléments du modal quantité non trouvés');
        addToCart(name, price, category, 1);
        return;
    }
    
    pendingCartItem = { name, price, category };
    
    titleElem.textContent = name;
    subtitleElem.textContent = `Prix: ${price} FCFA`;
    inputElem.value = 1;
    errorElem.classList.remove('show');
    errorElem.style.display = 'none';
    
    quantityModal.classList.add('show');
    inputElem.focus();
}

function closeQuantityModal() {
    const quantityModal = document.getElementById('quantity-modal');
    if (quantityModal) {
        quantityModal.classList.remove('show');
    }
    pendingCartItem = null;
}

function confirmQuantity() {
    const quantityInput = document.getElementById('quantity-input');
    const errorDiv = document.getElementById('quantity-error');
    
    if (!quantityInput || !errorDiv) {
        console.error('Éléments du modal non trouvés');
        return;
    }
    
    const quantity = parseInt(quantityInput.value, 10);
    
    if (!quantity || quantity < 1) {
        errorDiv.textContent = '❌ Veuillez entrer une quantité valide (minimum 1)';
        errorDiv.style.display = 'block';
        errorDiv.classList.add('show');
        quantityInput.focus();
        return;
    }
    
    if (quantity > 50) {
        errorDiv.textContent = '❌ Quantité maximale: 50';
        errorDiv.style.display = 'block';
        errorDiv.classList.add('show');
        quantityInput.focus();
        return;
    }
    
    if (pendingCartItem) {
        addToCart(
            pendingCartItem.name, 
            pendingCartItem.price, 
            pendingCartItem.category, 
            quantity
        );
        closeQuantityModal();
    }
}

// ===== MODAL INFORMATIONS CLIENT =====
function openCustomerModal() {
    const customerModal = document.getElementById('customer-modal');
    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('customer-whatsapp');
    const establishmentSelect = document.getElementById('customer-establishment');
    
    if (!customerModal || !nameInput || !whatsappInput || !establishmentSelect) {
        console.error('Éléments du modal client non trouvés');
        return;
    }
    
    nameInput.value = '';
    whatsappInput.value = '';
    establishmentSelect.value = '';
    
    document.getElementById('name-error').classList.remove('show');
    document.getElementById('whatsapp-error').classList.remove('show');
    document.getElementById('establishment-error').classList.remove('show');
    
    customerModal.classList.add('show');
    nameInput.focus();
}

function closeCustomerModal() {
    const customerModal = document.getElementById('customer-modal');
    if (customerModal) {
        customerModal.classList.remove('show');
    }
    pendingOrderData = null;
}

function confirmCustomerInfo() {
    const nameInput = document.getElementById('customer-name');
    const whatsappInput = document.getElementById('customer-whatsapp');
    const establishmentSelect = document.getElementById('customer-establishment');
    
    const customerName = nameInput.value.trim();
    const whatsappNumber = whatsappInput.value.trim();
    const establishment = establishmentSelect.value;
    
    let hasError = false;
    
    // Validation nom
    if (!customerName || customerName.length < 2) {
        document.getElementById('name-error').textContent = '❌ Veuillez entrer votre nom complet';
        document.getElementById('name-error').style.display = 'block';
        document.getElementById('name-error').classList.add('show');
        hasError = true;
    } else {
        document.getElementById('name-error').classList.remove('show');
        document.getElementById('name-error').style.display = 'none';
    }
    
    // Validation WhatsApp
    const cleanNumber = whatsappNumber.replace(/\s+/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
        document.getElementById('whatsapp-error').textContent = '❌ Numéro WhatsApp invalide (minimum 8 chiffres)';
        document.getElementById('whatsapp-error').style.display = 'block';
        document.getElementById('whatsapp-error').classList.add('show');
        hasError = true;
    } else {
        document.getElementById('whatsapp-error').classList.remove('show');
        document.getElementById('whatsapp-error').style.display = 'none';
    }
    
    // Validation établissement
    if (!establishment) {
        document.getElementById('establishment-error').textContent = '❌ Veuillez sélectionner votre établissement';
        document.getElementById('establishment-error').style.display = 'block';
        document.getElementById('establishment-error').classList.add('show');
        hasError = true;
    } else {
        document.getElementById('establishment-error').classList.remove('show');
        document.getElementById('establishment-error').style.display = 'none';
    }
    
    if (hasError) {
        return;
    }
    
    // Tout est valide, procéder à l'envoi
    closeCustomerModal();
    processOrder(customerName, cleanNumber, establishment);
}

// ===== SÉLECTION RIZ =====
function selectRice(riceName) {
    currentSelection.type = 'rice';
    currentSelection.baseName = riceName;
    
    const modal = document.getElementById('selection-modal');
    const title = document.getElementById('selection-modal-title');
    const subtitle = document.getElementById('selection-modal-subtitle');
    const options = document.getElementById('selection-options');
    
    title.textContent = riceName;
    subtitle.textContent = 'Choisissez votre format';
    
    options.innerHTML = riceOptions.map(opt => `
        <div class="selection-option" onclick="addRiceToCart('${riceName}', '${opt.format}', ${opt.price})">
            <div class="selection-option-info">
                <div class="selection-option-icon">${opt.icon}</div>
                <div class="selection-option-details">
                    <h4>${opt.format}</h4>
                    <p>${opt.desc}</p>
                </div>
            </div>
            <div class="selection-option-price">${opt.price} FCFA</div>
        </div>
    `).join('');
    
    modal.classList.add('show');
}

function addRiceToCart(riceName, format, price) {
    const fullName = `${riceName} (${format})`;
    closeSelectionModal();
    promptAddToCart(fullName, price, 'B');
}

// ===== SÉLECTION TCHÈPE =====
function selectTchep(tchepName, basePrice) {
    currentSelection.type = 'tchep';
    currentSelection.baseName = tchepName;
    currentSelection.basePrice = basePrice;
    
    const modal = document.getElementById('selection-modal');
    const title = document.getElementById('selection-modal-title');
    const subtitle = document.getElementById('selection-modal-subtitle');
    const options = document.getElementById('selection-options');
    
    title.textContent = tchepName;
    subtitle.textContent = 'Choisissez le type de tchep';
    
    options.innerHTML = tchepTypes.map(type => `
        <div class="selection-option" onclick="addTchepToCart('${tchepName}', '${type.type}', ${basePrice})">
            <div class="selection-option-info">
                <div class="selection-option-icon">${type.icon}</div>
                <div class="selection-option-details">
                    <h4>tchep ${type.type}</h4>
                    <p>${type.desc}</p>
                </div>
            </div>
            <div class="selection-option-price">${basePrice} FCFA</div>
        </div>
    `).join('');
    
    modal.classList.add('show');
}

function addTchepToCart(tchepName, type, price) {
    const fullName = `${tchepName} (${type})`;
    closeSelectionModal();
    promptAddToCart(fullName, price, 'C');
}

// ===== SÉLECTION PORC =====
function selectPorc(price, format) {
    currentSelection.type = 'porc';
    currentSelection.basePrice = price;
    currentSelection.format = format;
    
    const modal = document.getElementById('selection-modal');
    const title = document.getElementById('selection-modal-title');
    const subtitle = document.getElementById('selection-modal-subtitle');
    const options = document.getElementById('selection-options');
    
    title.textContent = `Porc au four (${format})`;
    subtitle.textContent = 'Choisissez la préparation';
    
    options.innerHTML = porcPreparations.map(prep => `
        <div class="selection-option" onclick="addPorcToCart('${prep.type}', ${price}, '${format}')">
            <div class="selection-option-info">
                <div class="selection-option-icon">${prep.icon}</div>
                <div class="selection-option-details">
                    <h4>${prep.type}</h4>
                    <p>${prep.desc}</p>
                </div>
            </div>
            <div class="selection-option-price">${price} FCFA</div>
        </div>
    `).join('');
    
    modal.classList.add('show');
}

function addPorcToCart(type, price, format) {
    const fullName = `Porc au four ${type} (${format})`;
    closeSelectionModal();
    promptAddToCart(fullName, price, 'D');
}

// ===== SÉLECTION ATTIÉKÉ =====
function selectAttiekePoisson() {
    const options = [
        { name: 'Petit', price: 1000, icon: '🍽️', desc: '1 personne' },
        { name: 'Moyen', price: 1500, icon: '🍛', desc: '1-2 personnes' },
        { name: 'Grand', price: 2000, icon: '🥘', desc: '2-3 personnes' }
    ];
    showAttiekeModal('Attiékè poisson alloko + Condiment', options, 'E');
}

function selectAttiekePouletAlloko() {
    const options = [
        { name: 'Petit', price: 1500, icon: '🍽️', desc: '1 personne' },
        { name: 'Moyen', price: 2000, icon: '🍛', desc: '1-2 personnes' },
        { name: 'Grand', price: 2500, icon: '🥘', desc: '2-3 personnes' }
    ];
    showAttiekeModal('Attiékè poulet alloko + Condiment', options, 'E');
}

function selectAttiekePoulet() {
    const options = [
        { name: 'Petit', price: 1000, icon: '🍽️', desc: '1 personne' },
        { name: 'Moyen', price: 1500, icon: '🍛', desc: '1-2 personnes' },
        { name: 'Grand', price: 2000, icon: '🥘', desc: '2-3 personnes' }
    ];
    showAttiekeModal('Attiékè poulet + Condiment', options, 'E');
}

function selectGarba() {
    const options = [
        { name: 'Petit', price: 500, icon: '🍽️', desc: 'Format simple' },
        { name: 'Moyen', price: 1000, icon: '🍛', desc: 'Format standard' },
        { name: 'Grand', price: 1500, icon: '🥘', desc: 'Format généreux' }
    ];
    showAttiekeModal('Spécialité Garba', options, 'E');
}

function showAttiekeModal(dishName, options, category) {
    const modal = document.getElementById('selection-modal');
    const title = document.getElementById('selection-modal-title');
    const subtitle = document.getElementById('selection-modal-subtitle');
    const optionsDiv = document.getElementById('selection-options');
    
    title.textContent = dishName;
    subtitle.textContent = 'Choisissez votre format';
    
    optionsDiv.innerHTML = options.map(opt => `
        <div class="selection-option" onclick="addAttiekeToCart('${dishName}', '${opt.name}', ${opt.price}, '${category}')">
            <div class="selection-option-info">
                <div class="selection-option-icon">${opt.icon}</div>
                <div class="selection-option-details">
                    <h4>${opt.name}</h4>
                    <p>${opt.desc}</p>
                </div>
            </div>
            <div class="selection-option-price">${opt.price} FCFA</div>
        </div>
    `).join('');
    
    modal.classList.add('show');
}

function addAttiekeToCart(dishName, format, price, category) {
    const fullName = `${dishName} (${format})`;
    closeSelectionModal();
    promptAddToCart(fullName, price, category);
}

function closeSelectionModal() {
    const modal = document.getElementById('selection-modal');
    if (modal) modal.classList.remove('show');
}

// ===== AFFICHER ALERT PERSONNALISÉE =====
function showCustomAlert(type, title, code, message, details) {
    const modal = document.getElementById('custom-alert-modal');
    const icon = document.getElementById('custom-alert-icon');
    const titleElem = document.getElementById('custom-alert-title');
    const codeElem = document.getElementById('custom-alert-code');
    const messageElem = document.getElementById('custom-alert-message');
    const detailsElem = document.getElementById('custom-alert-details');
    
    if (!modal || !icon || !titleElem || !codeElem || !messageElem || !detailsElem) {
        console.error('Éléments du modal non trouvés');
        return;
    }
    
    // Icône selon le type
    if (type === 'success') {
        icon.textContent = '✅';
        icon.className = 'custom-alert-icon';
        titleElem.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        titleElem.style.webkitBackgroundClip = 'text';
        titleElem.style.webkitTextFillColor = 'transparent';
        titleElem.style.backgroundClip = 'text';
    } else if (type === 'error') {
        icon.textContent = '❌';
        icon.className = 'custom-alert-icon error';
        titleElem.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        titleElem.style.webkitBackgroundClip = 'text';
        titleElem.style.webkitTextFillColor = 'transparent';
        titleElem.style.backgroundClip = 'text';
    }
    
    // Contenu
    titleElem.innerHTML = title;
    messageElem.innerHTML = message;
    
    // Code de commande
    if (code) {
        codeElem.textContent = code;
        codeElem.style.display = 'inline-block';
    } else {
        codeElem.style.display = 'none';
    }
    
    // Détails
    if (type === 'success') {
        detailsElem.innerHTML = `
            <div class="alert-detail-item">
                <span class="detail-icon">📍</span>
                <span class="detail-text">Stand GROUPE EXPRESS - Rez-de-chaussée</span>
            </div>
            <div class="alert-detail-item">
                <span class="detail-icon">💬</span>
                <span class="detail-text">Confirmation envoyée sur WhatsApp</span>
            </div>
            <div class="alert-detail-item">
                <span class="detail-icon">⏰</span>
                <span class="detail-text">Heure de retrait : 12H00</span>
            </div>
            <div class="alert-detail-item">
                <span class="detail-icon">💰</span>
                <span class="detail-text">Total à payer : ${total} FCFA</span>
            </div>
        `;
    } else {
        detailsElem.innerHTML = `
            <div class="alert-detail-item">
                <span class="detail-icon">📞</span>
                <span class="detail-text">Service client : 05 64 06 10 04</span>
            </div>
            <div class="alert-detail-item">
                <span class="detail-icon">💬</span>
                <span class="detail-text">WhatsApp disponible 24/7</span>
            </div>
        `;
    }
    
    // Afficher le modal
    modal.classList.add('show');
    
    // Jouer un son de succès (optionnel)
    if (type === 'success') {
        playSuccessSound();
    }
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Son de succès (optionnel)
function playSuccessSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVaru8K1aGAg+ltryxHMnBSh+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp7yvLajTkHG2u87OihUREKTqfg8bhkGwU1jNXzz3wvBCp8yvPajjoHGmu87+eZThENT6vl8bNeFgo9ltzzxnUnBSh9zPPaizsIGGS67OihUREMTqfg8bhkGwU2jNXzz30vBCp8yPPajjoIGmy97OehUBELTqfg8bhkGwU2jNXzz30vBCp8yPPajzoHG227');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch(e) {
        console.log('Son non disponible');
    }
}

// ===== GESTION COMMANDES =====
function toggleOrders() {
    const modal = document.getElementById('orders-modal');
    if (modal) modal.classList.toggle('show');
}

function updateOrdersList() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!customerOrders || !Array.isArray(customerOrders) || customerOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <h3>Aucune commande</h3>
                <p>Vos commandes apparaîtront ici</p>
            </div>
        `;
        return;
    }
    
    const ordersToDisplay = [...customerOrders].reverse();
    
    ordersList.innerHTML = ordersToDisplay.map(order => {
        const code = order.code || 'N/A';
        const timestamp = order.timestamp || new Date().toISOString();
        const items = order.items || [];
        const orderTotal = order.total || 0;
        
        return `
            <div style="background: var(--background); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>${code}</strong>
                    <span>${new Date(timestamp).toLocaleDateString()}</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--on-surface-light);">
                    ${items.length} article(s) - ${orderTotal} FCFA
                </div>
            </div>
        `;
    }).join('');
}

function clearOrders() {
    if (customerOrders.length === 0) {
        showCustomAlert(
            'error',
            'Historique vide',
            '',
            'Votre historique de commandes est déjà vide.',
            ''
        );
        return;
    }
    
    const confirmModal = document.createElement('div');
    confirmModal.className = 'custom-alert-modal show';
    confirmModal.innerHTML = `
        <div class="custom-alert-content">
            <div class="custom-alert-icon" style="background: linear-gradient(135deg, #ffc107, #ff9800);">
                ⚠️
            </div>
            <h2 class="custom-alert-title" style="background: linear-gradient(135deg, #ffc107, #ff9800); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Vider l'historique</h2>
            <div class="custom-alert-message" style="margin-bottom: 2rem;">Voulez-vous vraiment supprimer toutes vos commandes ?</div>
            <div style="display: flex; gap: 1rem;">
                <button class="custom-alert-btn" style="background: linear-gradient(135deg, #6c757d, #5a6268);" onclick="this.closest('.custom-alert-modal').remove()">
                    ❌ Annuler
                </button>
                <button class="custom-alert-btn" onclick="confirmClearOrders(this)">
                    ✅ Confirmer
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
}

function confirmClearOrders(btn) {
    customerOrders = [];
    localStorage.setItem('customerOrders', '[]');
    updateOrdersList();
    
    const confirmModal = btn.closest('.custom-alert-modal');
    if (confirmModal) {
        confirmModal.remove();
    }
    
    showCustomAlert(
        'success',
        'Historique vidé',
        '',
        'Toutes vos commandes ont été supprimées avec succès.',
        ''
    );
}

// ===== TRAITEMENT COMMANDE =====
function processOrder(customerName, whatsappNumber, establishment) {
    const orderData = {
        customerName,
        whatsappNumber,
        establishment,
        items: cart,
        total,
        timestamp: new Date().toISOString()
    };
    
    submitOrder(orderData).then(code => {
        if (code) {
            customerOrders.push({ ...orderData, code });
            localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
            
            cart = [];
            total = 0;
            updateCart();
            updateCartBadge();
            toggleCart();
            
            showCustomAlert(
                'success',
                'Commande confirmée !',
                code,
                `Merci <strong>${customerName}</strong> ! Votre commande a été enregistrée avec succès.`,
                'Merci de bien vouloir passer à notre stand à <strong>12H00</strong> pour le retrait de votre commande.'
            );
            
            updateOrdersList();
        } else {
            showCustomAlert(
                'error',
                'Erreur de commande',
                '',
                'Une erreur est survenue lors de l\'envoi de votre commande.',
                'Veuillez réessayer ou contactez notre service client au 05 64 06 10 04.'
            );
        }
    });
}
async function submitOrder(orderData) {
    try {
        // 1. Enregistrement dans Firebase
        const docRef = await addDoc(collection(db, 'orders'), {
            ...orderData,
            status: 'En attente',
            createdAt: new Date().toISOString()
        });
        
        // 2. Génération du code de commande unique
        const orderCode = `#GEC${docRef.id.substring(0, 6).toUpperCase()}`;
        
        console.log('✅ Commande soumise avec succès:', orderCode);
        
        return orderCode;
        
    } catch (error) {
        console.error('❌ Erreur lors de la soumission de la commande:', error);
        
        // Afficher une erreur utilisateur
        showNotificationStatus(
            '❌ Erreur lors de l\'envoi. Veuillez réessayer.',
            '#dc3545'
        );
        
        return null;
    }
}


// ===== HORAIRES DE COMMANDE =====
function checkOrderingHours() {
    const now = new Date();
    const hours = now.getHours();
    const alert = document.getElementById('time-alert');
    
    if (!alert) return;
    
    if (hours >= 10 && hours < 18) {
        alert.style.display = 'block';
        alert.classList.remove('warning');
        alert.classList.add('urgent');
        alert.textContent = '⛔ Les commandes sont fermées. Revenez entre 18h00 et 10h00.';
    } else {
        alert.style.display = 'none';
    }
}

// ===== GESTION FORMULAIRE COMMANDE =====
document.getElementById('order-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (cart.length === 0) {
        showCustomAlert(
            'error',
            'Panier vide',
            '',
            'Votre panier est vide. Ajoutez des articles avant de commander.',
            ''
        );
        return;
    }
    
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 10 && hours < 18) {
        showCustomAlert(
            'error',
            'Commandes fermées',
            '',
            'Les commandes sont actuellement fermées.',
            'Revenez entre 18h00 et 10h00 pour passer commande.'
        );
        return;
    }
    
    openCustomerModal();
});

// ===== PUBLICITÉS =====
function startAdsAutoPlay() {
    clearInterval(adsInterval);
    adsInterval = setInterval(() => {
        if (adsAutoPlay) slideAds('next');
    }, 5000);
}

function slideAds(direction) {
    const totalAds = 3;
    currentAdIndex = direction === 'next' 
        ? (currentAdIndex + 1) % totalAds 
        : (currentAdIndex - 1 + totalAds) % totalAds;
    
    const slider = document.getElementById('ads-slider');
    if (slider) {
        slider.style.transform = `translateX(-${currentAdIndex * (100 / 6)}%)`;
    }
    
    updateScrollDots();
}

function updateScrollDots() {
    const dots = document.querySelectorAll('.scroll-dot');
    dots.forEach((dot, index) => {
        if (index === currentAdIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// ===== NOTIFICATIONS =====
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Les notifications ne sont pas supportées par votre navigateur');
        return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            messaging.getToken({ vapidKey: VAPID_KEY })
                .then(token => {
                    console.log('Token FCM:', token);
                    localStorage.setItem('fcmToken', token);
                    localStorage.setItem('notificationsEnabled', 'true');
                    checkNotificationPermissionStatus();
                    showNotificationStatus('🔔 Notifications activées avec succès', '#28a745');
                })
                .catch(err => {
                    console.error('Erreur lors de l\'obtention du token:', err);
                    showNotificationStatus('❌ Erreur d\'activation des notifications', '#dc3545');
                });
        } else {
            showNotificationStatus('🔕 Notifications refusées', '#ffc107');
        }
    });
}

function checkNotificationPermissionStatus() {
    const statusDiv = document.getElementById('notification-status');
    if (!statusDiv) return;
    
    if (Notification.permission === 'granted') {
        statusDiv.style.display = 'none';
    } else {
        statusDiv.style.display = 'flex';
        statusDiv.textContent = 'OFF';
        statusDiv.style.background = '#dc3545';
    }
}

function showNotificationStatus(message, color) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 9999;
        background: ${color}; color: white; padding: 1rem 1.5rem;
        border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        font-weight: 600; animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== INSTALLATION PWA =====
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installStatus = document.getElementById('install-status');
    if (installStatus) {
        installStatus.style.display = 'none';
    }
});

function triggerInstallPrompt() {
    if (!deferredPrompt) {
        showNotificationStatus('📱 Application déjà installée ou non disponible', '#ffc107');
        return;
    }
    
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Installation acceptée');
            showNotificationStatus('✅ Application installée avec succès', '#28a745');
            
            const installStatus = document.getElementById('install-status');
            if (installStatus) {
                installStatus.style.display = 'flex';
            }
        } else {
            console.log('Installation refusée');
        }
        deferredPrompt = null;
    });
}

window.addEventListener('appinstalled', () => {
    console.log('PWA installée');
    deferredPrompt = null;
    
    const installStatus = document.getElementById('install-status');
    if (installStatus) {
        installStatus.style.display = 'flex';
    }
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkOrderingHours();
    updateCart();
    updateCartBadge();
    updateOrdersList();
    startAdsAutoPlay();
    checkNotificationPermissionStatus();
    
    // NOUVEAU: Charger les nouveaux plats depuis Firebase
    loadNewDishesFromFirebase();
    
    // Vérifier les horaires toutes les minutes
    setInterval(checkOrderingHours, 60000);
    
    // Écouter les messages FCM en arrière-plan
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message reçu du Service Worker:', event.data);
            
            if (event.data && event.data.type === 'NEW_ORDER') {
                showNotificationStatus('📦 Nouvelle commande reçue !', '#28a745');
            }
        });
    }
});

// ===== EXPOSITION GLOBALE DES FONCTIONS =====
window.db = db;
window.addToCart = addToCart;
window.updateCart = updateCart;
window.updateCartBadge = updateCartBadge;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.promptAddToCart = promptAddToCart;
window.closeQuantityModal = closeQuantityModal;
window.confirmQuantity = confirmQuantity;
window.openCustomerModal = openCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.confirmCustomerInfo = confirmCustomerInfo;
window.selectRice = selectRice;
window.addRiceToCart = addRiceToCart;
window.selectTchep = selectTchep;
window.addTchepToCart = addTchepToCart;
window.selectPorc = selectPorc;
window.addPorcToCart = addPorcToCart;
window.selectAttiekePoisson = selectAttiekePoisson;
window.selectAttiekePouletAlloko = selectAttiekePouletAlloko;
window.selectAttiekePoulet = selectAttiekePoulet;
window.selectGarba = selectGarba;
window.addAttiekeToCart = addAttiekeToCart;
window.closeSelectionModal = closeSelectionModal;
window.showCustomAlert = showCustomAlert;
window.closeCustomAlert = closeCustomAlert;
window.toggleOrders = toggleOrders;
window.clearOrders = clearOrders;
window.confirmClearOrders = confirmClearOrders;
window.processOrder = processOrder;
window.submitOrder = submitOrder;
window.slideAds = slideAds;
window.requestNotificationPermission = requestNotificationPermission;
window.triggerInstallPrompt = triggerInstallPrompt;

console.log('✅ Script chargé avec succès');
