 // suiteshopping.js
console.log('🔰 Express Exchange - Version Corrigée Complète');
 import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
        import { 
            getFirestore, 
            collection, 
            getDocs, 
            addDoc,
            query, 
            orderBy, 
            onSnapshot,
            serverTimestamp
        } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

        const firebaseConfig = {
            apiKey: "AIzaSyDV8s8md1kginP7nohy63XgUR9xNk_p6iE",
            authDomain: "store-ab477.firebaseapp.com",
            databaseURL: "https://store-ab477-default-rtdb.firebaseio.com",
            projectId: "store-ab477",
            storageBucket: "store-ab477.firebasestorage.app",
            messagingSenderId: "109524191191",
            appId: "1:109524191191:web:23f365c1a4712cc094ed92",
            measurementId: "G-86T5K1SG1F"
        };

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);



        let products = [];
        let filteredProducts = [];
        let cart = [];
        let categories = new Set();

        const productsContainer = document.getElementById('productsContainer');
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        const promotionFilter = document.getElementById('promotionFilter');
        const cartSidebar = document.getElementById('cartSidebar');
        const cartCount = document.getElementById('cartCount');
        const totalAmount = document.getElementById('totalAmount');
        const cartItems = document.getElementById('cartItems');
        const cartTotalPrice = document.getElementById('cartTotalPrice');

        async function loadProducts() {
            try {
                const q = query(collection(firestore, 'products'), orderBy('createdAt', 'desc'));
                
                onSnapshot(q, (querySnapshot) => {
                    products = [];
                    categories.clear();
                    
                    querySnapshot.forEach((doc) => {
                        const product = { id: doc.id, ...doc.data() };
                        products.push(product);
                        if (product.category) {
                            categories.add(product.category);
                        }
                    });

                    updateCategoryFilter();
                    filterAndDisplayProducts();
                });
                
            } catch (error) {
                console.error('Erreur lors du chargement des produits:', error);
                productsContainer.innerHTML = '<div class="no-products"><i class="fas fa-exclamation-triangle"></i><br>Erreur lors du chargement des produits</div>';
            }
        }

        function updateCategoryFilter() {
            categoryFilter.innerHTML = '<option value="">Toutes les catégories</option>';
            [...categories].sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }

        function filterAndDisplayProducts() {
            let filtered = [...products];

            const searchTerm = searchInput.value.toLowerCase().trim();
            if (searchTerm) {
                filtered = filtered.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) ||
                    (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                    (product.category && product.category.toLowerCase().includes(searchTerm))
                );
            }

            const categoryValue = categoryFilter.value;
            if (categoryValue) {
                filtered = filtered.filter(product => product.category === categoryValue);
            }

            const promotionValue = promotionFilter.value;
            if (promotionValue === 'true') {
                filtered = filtered.filter(product => product.isPromotion);
            }

            const sortValue = sortFilter.value;
            switch (sortValue) {
                case 'price-low':
                    filtered.sort((a, b) => (a.currentPrice || a.price) - (b.currentPrice || b.price));
                    break;
                case 'price-high':
                    filtered.sort((a, b) => (b.currentPrice || b.price) - (a.currentPrice || a.price));
                    break;
                case 'name':
                    filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
                    break;
                default:
                    filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            }

            filteredProducts = filtered;
            displayProducts(filtered);
        }

        function displayProducts(productsToShow) {
            if (productsToShow.length === 0) {
                productsContainer.innerHTML = '<div class="no-products"><i class="fas fa-search"></i><br>Aucun produit trouvé</div>';
                return;
            }

            const productsHTML = productsToShow.map(product => {
    const hasPromotion = product.isPromotion && product.originalPrice && product.currentPrice && product.originalPrice > product.currentPrice;
    const discount = hasPromotion ? Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100) : 0;
    
    return `
        <div class="product-card" onclick="viewProductModal('${product.id}')">
            ${hasPromotion ? `<div class="promotion-badge">-${discount}%</div>` : ''}
            <div class="product-media">
                ${product.mediaType === 'video' && product.mediaUrl ? 
                    `<video class="product-video" autoplay muted loop playsinline>
                        <source src="${product.mediaUrl}" type="video/mp4">
                    </video>` :
                    `<img src="${product.mediaUrl || 'https://via.placeholder.com/280x250'}" alt="${product.name}" class="product-image">`
                }
            </div>
                        <div class="product-info">
                            <h3 class="product-title">${product.name}</h3>
                            <p class="product-description">${product.description || ''}</p>
                            <div class="price-section">
                                <span class="current-price">${(product.currentPrice || product.price || 0).toLocaleString('fr-FR')} FCFA</span>
                                ${hasPromotion ? 
                                    `<span class="original-price">${product.originalPrice.toLocaleString('fr-FR')} FCFA</span>
                                     <span class="discount">-${discount}%</span>` : ''
                                }
                            </div>
                            <div class="product-actions">
                                <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart('${product.id}')">
                                    <i class="fas fa-cart-plus"></i>
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            productsContainer.innerHTML = `<div class="products-grid">${productsHTML}</div>`;
        }

        window.addToCart = function(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: product.name,
                    price: product.currentPrice || product.price || 0,
                    mediaUrl: product.mediaUrl,
                    quantity: 1
                });
            }

            updateCartDisplay();
            
            const cartButton = document.querySelector('.cart-button');
            cartButton.style.transform = 'scale(1.2)';
            setTimeout(() => {
                cartButton.style.transform = 'scale(1)';
            }, 200);
        };

        window.viewProductModal = function(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const modal = document.getElementById('productModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalDescription = document.getElementById('modalDescription');
            const modalPriceSection = document.getElementById('modalPriceSection');
            const modalMediaContainer = document.getElementById('modalMediaContainer');
            const modalAddToCart = document.getElementById('modalAddToCart');

            modalTitle.textContent = product.name;
            modalDescription.textContent = product.description || 'Aucune description disponible.';

            if (product.mediaType === 'video' && product.mediaUrl) {
                modalMediaContainer.innerHTML = `
                    <video class="modal-media" controls autoplay muted>
                        <source src="${product.mediaUrl}" type="video/mp4">
                        Votre navigateur ne supporte pas les vidéos.
                    </video>
                `;
            } else {
                modalMediaContainer.innerHTML = `
                    <img src="${product.mediaUrl || 'https://via.placeholder.com/800x500'}" 
                         alt="${product.name}" 
                         class="modal-media">
                `;
            }

            const hasPromotion = product.isPromotion && product.originalPrice && product.currentPrice && product.originalPrice > product.currentPrice;
            const discount = hasPromotion ? Math.round(((product.originalPrice - product.currentPrice) / product.originalPrice) * 100) : 0;
            
            if (hasPromotion) {
                modalPriceSection.innerHTML = `
                    <span class="modal-current-price">${product.currentPrice.toLocaleString('fr-FR')} FCFA</span>
                    <span class="modal-original-price">${product.originalPrice.toLocaleString('fr-FR')} FCFA</span>
                    <span class="modal-discount">-${discount}%</span>
                `;
            } else {
                modalPriceSection.innerHTML = `
                    <span class="modal-current-price">${(product.currentPrice || product.price || 0).toLocaleString('fr-FR')} FCFA</span>
                `;
            }

            modalAddToCart.onclick = function() {
                addToCart(productId);
                closeModal();
            };

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        window.closeModal = function(event) {
            if (event && event.target !== event.currentTarget) return;
            
            const modal = document.getElementById('productModal');
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            const videos = modal.querySelectorAll('video');
            videos.forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
        };

        window.toggleCart = function() {
            cartSidebar.classList.toggle('open');
        };

        function updateCartDisplay() {
            const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            cartCount.textContent = itemCount;
            cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
            totalAmount.textContent = `${total.toLocaleString('fr-FR')} FCFA`;
            cartTotalPrice.textContent = `${total.toLocaleString('fr-FR')} FCFA`;

            if (cart.length === 0) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Votre panier est vide</p>
                    </div>
                `;
            } else {
                cartItems.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.mediaUrl || 'https://via.placeholder.com/60'}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-info">
                            <div class="cart-item-title" title="${item.name}">${item.name}</div>
                            <div class="cart-item-price">${item.price.toLocaleString('fr-FR')} FCFA</div>
                            <div class="quantity-controls">
                                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)" title="Diminuer">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="quantity">${item.quantity}</span>
                                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)" title="Augmenter">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="quantity-btn remove" onclick="removeFromCart('${item.id}')" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        window.updateQuantity = function(productId, change) {
            const item = cart.find(item => item.id === productId);
            if (!item) return;

            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                updateCartDisplay();
            }
        };

        window.removeFromCart = function(productId) {
            cart = cart.filter(item => item.id !== productId);
            updateCartDisplay();
        };

        window.checkout = function() {
            if (cart.length === 0) {
                alert('Votre panier est vide !');
                return;
            }

            showOrderForm();
        };

        function showOrderForm() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('deliveryDate').setAttribute('min', today);
            
            const orderFormOverlay = document.getElementById('orderFormOverlay');
            orderFormOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        window.closeOrderForm = function() {
            const orderFormOverlay = document.getElementById('orderFormOverlay');
            orderFormOverlay.classList.remove('active');
            document.body.style.overflow = '';
            document.getElementById('orderForm').reset();
        };

        window.submitOrder = async function(event) {
            event.preventDefault();
            
            const submitBtn = document.getElementById('submitOrderBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

            const lastName = document.getElementById('lastName').value.trim();
            const firstName = document.getElementById('firstName').value.trim();
            const contact = document.getElementById('contact').value.trim();
            const deliveryDate = document.getElementById('deliveryDate').value;
            const address = document.getElementById('address').value.trim();

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const orderData = {
                customerInfo: {
                    lastName,
                    firstName,
                    contact,
                    deliveryDate,
                    address: address || 'Non spécifiée'
                },
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity
                })),
                total,
                status: 'En attente',
                createdAt: serverTimestamp()
            };

            try {
                const docRef = await addDoc(collection(firestore, 'orders'), orderData);
                console.log('Commande enregistrée avec l\'ID:', docRef.id);

                let message = `🛒 *Nouvelle commande Express-Shopping*\n\n`;
                message += `👤 *Client:* ${firstName} ${lastName}\n`;
                message += `📞 *Contact:* ${contact}\n`;
                message += `📅 *Date de livraison souhaitée:* ${new Date(deliveryDate).toLocaleDateString('fr-FR')}\n`;
                message += `📍 *Adresse:* ${address || 'Non spécifiée'}\n\n`;
                message += `📦 *Articles commandés:*\n`;
                
                cart.forEach((item, index) => {
                    message += `${index + 1}. ${item.name}\n`;
                    message += `   • Quantité: ${item.quantity}\n`;
                    message += `   • Prix unitaire: ${item.price.toLocaleString('fr-FR')} FCFA\n`;
                    message += `   • Sous-total: ${(item.price * item.quantity).toLocaleString('fr-FR')} FCFA\n\n`;
                });
                
                message += `💰 *Total: ${total.toLocaleString('fr-FR')} FCFA*\n\n`;
                message += `🆔 Référence commande: ${docRef.id}`;

                
                
                cart = [];
                updateCartDisplay();
                closeOrderForm();
                toggleCart();
                
               
                
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement de la commande:', error);
                alert('Erreur lors de l\'enregistrement de la commande. Veuillez réessayer.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Confirmer la commande';
            }
        };

        searchInput.addEventListener('input', filterAndDisplayProducts);
        categoryFilter.addEventListener('change', filterAndDisplayProducts);
        sortFilter.addEventListener('change', filterAndDisplayProducts);
        promotionFilter.addEventListener('change', filterAndDisplayProducts);

        document.addEventListener('click', function(event) {
            if (cartSidebar.classList.contains('open')) {
                if (!cartSidebar.contains(event.target) && !event.target.closest('.cart-button')) {
                    cartSidebar.classList.remove('open');
                }
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
                closeOrderForm();
            }
        });

        loadProducts();
        updateCartDisplay();

        console.log('Express-Shopping chargé avec succès!');
